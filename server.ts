import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import {
  getBrevoSmtpEnvStatus,
  testBrevoSmtpConnection,
  sendViaBrevoSmtp,
} from './server/brevoSmtpService';
import {
  buildCloudflareEmailWorkerScript,
  deliverInboundEmailToFirestore,
} from './server/cloudflareInboundService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DIST_DIR = path.resolve(__dirname, 'dist');
const DIST_INDEX = path.join(DIST_DIR, 'index.html');

// Clé de signature HMAC-SHA256 côté serveur (jamais exposée au client)
const SERVER_SIGNING_KEY =
  process.env.API_SESSION_SECRET?.trim() ||
  process.env.SESSION_SECRET?.trim() ||
  crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_MS = 4 * 60 * 60 * 1000; // 4 heures
const revokedTokenIds = new Map<string, number>(); // jti -> expiresAt

// Rate-limiter en mémoire par fenêtre glissante
interface RateBucket {
  count: number;
  resetAt: number;
}
const rateBuckets = new Map<string, RateBucket>();

// Nettoyage périodique des jetons révoqués et des compteurs expirés
setInterval(() => {
  const now = Date.now();
  for (const [jti, exp] of revokedTokenIds.entries()) {
    if (exp <= now) revokedTokenIds.delete(jti);
  }
  for (const [key, bucket] of rateBuckets.entries()) {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

function getClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function createRateLimiter(bucketPrefix: string, maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${bucketPrefix}:${getClientIp(req)}`;
    const now = Date.now();
    const existing = rateBuckets.get(key);

    if (!existing || existing.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (existing.count >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: 'Trop de requêtes API. Veuillez patienter avant de réessayer.',
        retryAfterSeconds: retryAfterSec,
      });
      return;
    }

    existing.count += 1;
    next();
  };
}

function redactSecrets(text: string): string {
  return text
    .replace(/xkeysib-[a-zA-Z0-9-]+/g, '[BREVO_KEY_REDACTED]')
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[API_KEY_REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [TOKEN_REDACTED]');
}

function stripHeaderControls(value: string): string {
  return value.replace(/[\r\n\0]+/g, ' ').trim();
}

function isConfiguredSecret(val: string | undefined, placeholderPrefix: string): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  if (!trimmed || trimmed.startsWith(placeholderPrefix)) return false;
  return true;
}

function cleanEnvSecret(val: string | undefined): string {
  if (!val) return '';
  return val.trim().replace(/^['"]+|['"]+$/g, '').trim();
}

function getBrevoConfig() {
  const apiKey = cleanEnvSecret(process.env.BREVO_API_KEY);
  const smtpUser = cleanEnvSecret(process.env.BREVO_SMTP_USER);
  const smtpPass = cleanEnvSecret(process.env.BREVO_SMTP_PASS);
  const rawHost = cleanEnvSecret(process.env.BREVO_SMTP_HOST);
  const smtpHost = rawHost.includes('.') && !rawHost.startsWith('MY_BREVO') ? rawHost : 'smtp-relay.brevo.com';
  const parsedPort = Number(cleanEnvSecret(process.env.BREVO_SMTP_PORT));
  const smtpPort = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 587;

  const hasApi = isConfiguredSecret(apiKey, 'MY_BREVO');
  const hasSmtp = isConfiguredSecret(smtpUser, 'MY_BREVO') && isConfiguredSecret(smtpPass, 'MY_BREVO');
  const trimmedApiKey = hasApi ? apiKey : undefined;
  const keyFormatValid = trimmedApiKey ? trimmedApiKey.startsWith('xkeysib-') : false;
  const looksLikeSmtpKey = trimmedApiKey ? trimmedApiKey.startsWith('xsmtpsib-') : false;

  const mode = hasApi ? 'brevo-api' : hasSmtp ? 'brevo-smtp' : 'none';

  return {
    configured: hasApi || hasSmtp,
    mode,
    apiKey: trimmedApiKey,
    keyFormatValid,
    looksLikeSmtpKey,
    smtpHost,
    smtpPort,
    smtpUser: hasSmtp ? smtpUser : undefined,
    smtpPass: hasSmtp ? smtpPass : undefined,
  };
}

function isGeminiConfigured(): boolean {
  return isConfiguredSecret(process.env.GEMINI_API_KEY, 'MY_GEMINI');
}

// --- Signature & vérification HMAC-SHA256 des jetons API ---
interface ApiTokenPayload {
  jti: string;
  adminId: string;
  email: string;
  role: string;
  enterpriseId: string;
  iat: number;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  apiSession?: ApiTokenPayload;
}

function signApiToken(payload: ApiTokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SERVER_SIGNING_KEY).update(body).digest('base64url');
  return `v1.${body}.${sig}`;
}

function verifyApiToken(token: string): ApiTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;

  const [, body, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SERVER_SIGNING_KEY).update(body).digest('base64url');

  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ApiTokenPayload;
    if (!parsed.jti || !parsed.email || !parsed.exp || Date.now() > parsed.exp) {
      return null;
    }
    if (revokedTokenIds.has(parsed.jti)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isTrustedOrigin(req: Request): boolean {
  const secFetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  if (secFetchSite === 'same-origin' || secFetchSite === 'same-site') {
    return true;
  }

  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
  const origin = String(req.headers.origin || '').toLowerCase();
  const referer = String(req.headers.referer || '').toLowerCase();
  const appUrl = String(process.env.APP_URL || '').toLowerCase().replace(/\/$/, '');

  const checkUrl = (rawUrl: string): boolean => {
    if (!rawUrl) return false;
    try {
      const u = new URL(rawUrl);
      const uHost = u.host.toLowerCase();
      if (host && uHost === host) return true;
      if (appUrl && rawUrl.startsWith(appUrl)) return true;
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
      if (u.hostname.endsWith('.run.app')) return true;
      return false;
    } catch {
      return false;
    }
  };

  return checkUrl(origin) || checkUrl(referer);
}

function requireApiAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentification API requise (jeton Bearer manquant).',
      code: 'auth_required',
    });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const verified = verifyApiToken(token);
  if (!verified) {
    res.status(401).json({
      error: 'Jeton API invalide, expiré ou révoqué.',
      code: 'invalid_token',
    });
    return;
  }

  req.apiSession = verified;
  next();
}

// Validation anti-spoofing des domaines expéditeurs
const BLOCKED_CONSUMER_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.fr',
  'hotmail.com',
  'hotmail.fr',
  'outlook.com',
  'live.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
]);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function isAllowedSenderEmail(email: string): boolean {
  if (!isValidEmail(email)) return false;
  const domain = email.trim().toLowerCase().split('@')[1] || '';
  if (!domain || BLOCKED_CONSUMER_DOMAINS.has(domain)) return false;
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain);
}

interface SendMailBody {
  fromEmail?: string;
  fromName?: string;
  to?: string[];
  cc?: string[];
  subject?: string;
  body?: string;
}

interface AiComposeBody {
  purpose?: string;
  recipientName?: string;
  tone?: 'professionnel' | 'amical' | 'formel' | 'urgent';
  language?: 'fr' | 'en';
  context?: string;
  replyToSubject?: string;
  replyToBody?: string;
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  // En-têtes de sécurité HTTP (compatibles iframe AI Studio)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
    }
    next();
  });

  const authLimiter = createRateLimiter('auth', 30, 5 * 60 * 1000);
  const statusLimiter = createRateLimiter('status', 45, 5 * 60 * 1000);
  const sendLimiter = createRateLimiter('send', 20, 15 * 60 * 1000);
  const aiLimiter = createRateLimiter('ai', 30, 10 * 60 * 1000);

  // Healthcheck léger sans données sensibles
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'mailoos-api', protected: true });
  });

  // Émission de jeton de session API signé (HMAC-SHA256) réservée aux origines de confiance
  app.post('/api/auth/session', authLimiter, (req: Request, res: Response) => {
    if (!isTrustedOrigin(req)) {
      res.status(403).json({
        error: 'Origine non autorisée pour ouvrir une session API.',
        code: 'untrusted_origin',
      });
      return;
    }

    const body = (req.body || {}) as {
      adminId?: string;
      email?: string;
      role?: string;
      enterpriseId?: string;
    };

    const adminId = stripHeaderControls(String(body.adminId || '')).slice(0, 128);
    const email = stripHeaderControls(String(body.email || '')).toLowerCase().slice(0, 150);
    const role = stripHeaderControls(String(body.role || 'Administrateur')).slice(0, 64);
    const enterpriseId = stripHeaderControls(String(body.enterpriseId || 'ent-2')).slice(0, 128);

    if (!adminId || !isValidEmail(email)) {
      res.status(400).json({ error: 'Identité administrateur invalide.' });
      return;
    }

    const now = Date.now();
    const payload: ApiTokenPayload = {
      jti: crypto.randomUUID(),
      adminId,
      email,
      role,
      enterpriseId,
      iat: now,
      exp: now + TOKEN_TTL_MS,
    };

    const token = signApiToken(payload);
    res.json({
      token,
      expiresAt: payload.exp,
      tokenType: 'Bearer',
    });
  });

  // Révocation immédiate du jeton API lors de la déconnexion
  app.post('/api/auth/logout', requireApiAuth, (req: AuthenticatedRequest, res: Response) => {
    if (req.apiSession) {
      revokedTokenIds.set(req.apiSession.jti, req.apiSession.exp);
    }
    res.json({ revoked: true });
  });

  // Statut et diagnostic complet du relais Brevo + sécurité API
  app.get('/api/mail/status', requireApiAuth, statusLimiter, async (req: AuthenticatedRequest, res: Response) => {
    const cfg = getBrevoConfig();
    const shouldVerify = req.query.verify === '1' || req.query.verify === 'true';

    let brevoApiValid: boolean | undefined;
    let brevoAccountPlan: string | undefined;
    let mailoosDomainRegistered: boolean | undefined;
    let mailoosDomainAuthenticated: boolean | undefined;
    let brevoDnsRecords: Record<string, { host?: string; type?: string; value?: string; status?: boolean }> | undefined;
    let verifyError: string | undefined;

    if (shouldVerify && cfg.mode === 'brevo-api' && cfg.apiKey) {
      if (!cfg.keyFormatValid) {
        brevoApiValid = false;
        verifyError = cfg.looksLikeSmtpKey
          ? 'Clé SMTP détectée dans BREVO_API_KEY (xsmtpsib-...) : collez-la dans BREVO_SMTP_PASS et mettez une clé API v3 (xkeysib-...) dans BREVO_API_KEY.'
          : 'Format de clé invalide : BREVO_API_KEY doit être une clé API v3 Brevo commençant par "xkeysib-" (sans guillemets ni espaces).';
      } else {
        try {
          const [accRes, domRes, mailoosDomRes] = await Promise.all([
            fetch('https://api.brevo.com/v3/account', {
              headers: { accept: 'application/json', 'api-key': cfg.apiKey },
            }),
            fetch('https://api.brevo.com/v3/senders/domains', {
              headers: { accept: 'application/json', 'api-key': cfg.apiKey },
            }),
            fetch('https://api.brevo.com/v3/senders/domains/mailoos.com', {
              headers: { accept: 'application/json', 'api-key': cfg.apiKey },
            }),
          ]);

          if (accRes.ok) {
            brevoApiValid = true;
            const accJson = (await accRes.json().catch(() => ({}))) as { plan?: Array<{ type?: string }> };
            brevoAccountPlan = accJson.plan?.[0]?.type;
          } else {
            brevoApiValid = false;
            const errJson = (await accRes.json().catch(() => ({}))) as { message?: string; code?: string };
            const rawErr = errJson.message || '';
            const safeDetail = rawErr ? redactSecrets(rawErr) : '';
            if (accRes.status === 401 && /unrecognised ip|authorised_ips/i.test(rawErr)) {
              const ipMatch = rawErr.match(/address\s+([0-9a-fA-F:.]+)/i);
              const detectedIp = ipMatch ? ipMatch[1].replace(/\.+$/, '') : 'du serveur';
              verifyError =
                `Votre clé API Brevo est bonne, mais Brevo bloque la sécurité IP (adresse ${detectedIp}). Ouvrez Brevo > Sécurité > Adresses IP autorisées (https://app.brevo.com/security/authorised_ips) et désactivez la restriction d'IP (ou autorisez ${detectedIp}).`;
            } else if (accRes.status === 401) {
              verifyError =
                `Clé API Brevo rejetée (HTTP 401${safeDetail ? ` : ${safeDetail}` : ''}) : vérifiez que BREVO_API_KEY dans les Secrets contient une nouvelle clé API v3 active (xkeysib-...) puis cliquez sur Apply changes.`;
            } else {
              verifyError = redactSecrets(rawErr || `Erreur API Brevo HTTP ${accRes.status}`);
            }
          }

          if (domRes.ok) {
            const domJson = (await domRes.json().catch(() => ({}))) as {
              domains?: Array<{ domain_name?: string; authenticated?: boolean; verified?: boolean }>;
            };
            const match = domJson.domains?.find(d => d.domain_name?.toLowerCase() === 'mailoos.com');
            mailoosDomainRegistered = Boolean(match);
            mailoosDomainAuthenticated = Boolean(match?.authenticated && match?.verified);
          }

          if (mailoosDomRes.ok) {
            const detail = (await mailoosDomRes.json().catch(() => ({}))) as {
              authenticated?: boolean;
              verified?: boolean;
              dns_records?: Record<string, { host_name?: string; type?: string; value?: string; status?: boolean }>;
            };
            mailoosDomainRegistered = true;
            mailoosDomainAuthenticated = Boolean(detail.authenticated && detail.verified);
            if (detail.dns_records) {
              brevoDnsRecords = {};
              for (const [k, rec] of Object.entries(detail.dns_records)) {
                if (rec && (rec.host_name || rec.value)) {
                  brevoDnsRecords[k] = {
                    host: rec.host_name,
                    type: rec.type,
                    value: rec.value,
                    status: rec.status,
                  };
                }
              }
            }
          }
        } catch (err) {
          brevoApiValid = false;
          verifyError = redactSecrets(err instanceof Error ? err.message : 'Erreur réseau Brevo');
        }
      }
    }

    res.json({
      configured: cfg.configured,
      mode: cfg.mode,
      keyFormatValid: cfg.keyFormatValid,
      smtpHost: cfg.smtpHost,
      smtpPort: cfg.smtpPort,
      dailyQuotaFree: 300,
      spfInclude: 'include:spf.brevo.com',
      apiProtected: true,
      geminiConfigured: isGeminiConfigured(),
      ...(shouldVerify
        ? {
            brevoApiValid,
            brevoAccountPlan,
            mailoosDomainRegistered,
            mailoosDomainAuthenticated,
            brevoDnsRecords,
            verifyError,
          }
        : {}),
    });
  });

  // État des variables d'environnement SMTP Brevo (GET) et test de connexion live (GET ?live=1 ou POST)
  app.get('/api/mail/smtp-test', requireApiAuth, statusLimiter, async (req: AuthenticatedRequest, res: Response) => {
    const live = req.query.live === '1' || req.query.live === 'true';
    const result = live ? await testBrevoSmtpConnection() : getBrevoSmtpEnvStatus();
    res.json(result);
  });

  app.post('/api/mail/smtp-test', requireApiAuth, statusLimiter, async (_req: AuthenticatedRequest, res: Response) => {
    const result = await testBrevoSmtpConnection();
    res.json(result);
  });

  // Enregistrer et vérifier automatiquement un domaine d'envoi dans Brevo (ex: mailoos.com)
  app.post('/api/mail/brevo/authenticate-domain', requireApiAuth, statusLimiter, async (req: AuthenticatedRequest, res: Response) => {
    const domain = stripHeaderControls(String((req.body || {}).domain || 'mailoos.com')).toLowerCase();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) || BLOCKED_CONSUMER_DOMAINS.has(domain)) {
      res.status(400).json({ ok: false, message: 'Nom de domaine invalide ou non autorisé.' });
      return;
    }

    const cfg = getBrevoConfig();
    if (!cfg.apiKey || !cfg.keyFormatValid) {
      res.status(400).json({
        ok: false,
        message: 'BREVO_API_KEY v3 valide (xkeysib-...) requise dans les Secrets pour vérifier le domaine sur Brevo.',
      });
      return;
    }

    try {
      const headers = {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': cfg.apiKey,
      };

      const checkRes = await fetch(`https://api.brevo.com/v3/senders/domains/${encodeURIComponent(domain)}`, { headers });
      let detailJson: {
        authenticated?: boolean;
        verified?: boolean;
        message?: string;
        dns_records?: Record<string, { host_name?: string; type?: string; value?: string; status?: boolean }>;
      } = {};

      if (checkRes.status === 404) {
        const createRes = await fetch('https://api.brevo.com/v3/senders/domains', {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: domain }),
        });
        detailJson = (await createRes.json().catch(() => ({}))) as typeof detailJson;
        if (!createRes.ok) {
          res.status(createRes.status === 401 ? 401 : 502).json({
            ok: false,
            message: redactSecrets(detailJson.message || `Erreur création domaine Brevo HTTP ${createRes.status}`),
          });
          return;
        }
      } else if (checkRes.ok) {
        const authRes = await fetch(
          `https://api.brevo.com/v3/senders/domains/${encodeURIComponent(domain)}/authenticate`,
          { method: 'PUT', headers }
        );
        const authJson = (await authRes.json().catch(() => ({}))) as { message?: string };
        const refreshed = await fetch(`https://api.brevo.com/v3/senders/domains/${encodeURIComponent(domain)}`, { headers });
        detailJson = (await refreshed.json().catch(() => ({}))) as typeof detailJson;
        if (!authRes.ok && !detailJson.dns_records) {
          res.status(authRes.status === 401 ? 401 : 502).json({
            ok: false,
            message: redactSecrets(authJson.message || `Erreur vérification Brevo HTTP ${authRes.status}`),
          });
          return;
        }
      } else {
        const errJson = (await checkRes.json().catch(() => ({}))) as { message?: string };
        res.status(checkRes.status === 401 ? 401 : 502).json({
          ok: false,
          message: redactSecrets(errJson.message || `Erreur Brevo HTTP ${checkRes.status}`),
        });
        return;
      }

      const dnsRecords: Record<string, { host?: string; type?: string; value?: string; status?: boolean }> = {};
      if (detailJson.dns_records) {
        for (const [k, rec] of Object.entries(detailJson.dns_records)) {
          if (rec && (rec.host_name || rec.value)) {
            dnsRecords[k] = {
              host: rec.host_name,
              type: rec.type,
              value: rec.value,
              status: rec.status,
            };
          }
        }
      }

      const authenticated = Boolean(detailJson.authenticated && detailJson.verified);
      res.json({
        ok: true,
        domain,
        authenticated,
        verified: Boolean(detailJson.verified),
        dnsRecords,
        message: authenticated
          ? `Domaine ${domain} entièrement authentifié sur Brevo (DKIM + SPF validés).`
          : `Domaine ${domain} enregistré sur Brevo. Ajoutez les enregistrements DNS affichés dans Cloudflare puis cliquez à nouveau pour valider.`,
      });
    } catch (err) {
      res.status(502).json({
        ok: false,
        message: redactSecrets(err instanceof Error ? err.message : 'Erreur réseau Brevo'),
      });
    }
  });

  // Envoi d'e-mail sécurisé (authentifié, rate-limité, anti-spoofing et anti-injection)
  app.post('/api/mail/send', requireApiAuth, sendLimiter, async (req: AuthenticatedRequest, res: Response) => {
    const payload = (req.body || {}) as SendMailBody;
    const fromEmail = stripHeaderControls(String(payload.fromEmail || '')).toLowerCase();
    const fromName = stripHeaderControls(String(payload.fromName || 'Mailoos')).slice(0, 100);
    const toList = Array.isArray(payload.to)
      ? payload.to.map(s => stripHeaderControls(String(s)).toLowerCase()).filter(isValidEmail).slice(0, 10)
      : [];
    const ccList = Array.isArray(payload.cc)
      ? payload.cc.map(s => stripHeaderControls(String(s)).toLowerCase()).filter(isValidEmail).slice(0, 5)
      : [];
    const subject = stripHeaderControls(String(payload.subject || '(Sans objet)')).slice(0, 250);
    const textBody = String(payload.body || '').slice(0, 50000);

    if (!isAllowedSenderEmail(fromEmail)) {
      res.status(400).json({
        delivered: false,
        reason: 'invalid_sender',
        message: "Adresse e-mail d'expéditeur invalide ou domaine externe non autorisé.",
      });
      return;
    }

    if (toList.length === 0) {
      res.status(400).json({
        delivered: false,
        reason: 'invalid_recipient',
        message: 'Aucun destinataire valide fourni (max 10).',
      });
      return;
    }

    const cfg = getBrevoConfig();
    if (!cfg.configured) {
      res.status(200).json({
        delivered: false,
        reason: 'not_configured',
        message:
          'Relais Brevo non configuré côté serveur (ajoutez BREVO_API_KEY dans les Secrets). Message archivé localement.',
      });
      return;
    }

    let apiErrorMessage: string | undefined;

    try {
      if (cfg.apiKey && cfg.keyFormatValid) {
        const brevoPayload: Record<string, unknown> = {
          sender: { name: fromName || 'Mailoos', email: fromEmail },
          to: toList.map(email => ({ email })),
          subject,
          textContent: textBody || ' ',
        };
        if (ccList.length > 0) {
          brevoPayload.cc = ccList.map(email => ({ email }));
        }

        const apiRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'api-key': cfg.apiKey,
          },
          body: JSON.stringify(brevoPayload),
        });

        const apiData = (await apiRes.json().catch(() => ({}))) as { messageId?: string; message?: string; code?: string };

        if (apiRes.ok) {
          res.json({
            delivered: true,
            provider: 'brevo-api',
            messageId: apiData.messageId || null,
          });
          return;
        }

        apiErrorMessage = redactSecrets(
          apiRes.status === 401
            ? 'Clé BREVO_API_KEY refusée (HTTP 401).'
            : apiData.message || `Erreur Brevo HTTP ${apiRes.status}`
        );
      } else if (cfg.apiKey && !cfg.keyFormatValid) {
        apiErrorMessage = 'BREVO_API_KEY invalide : une clé Brevo v3 commence par "xkeysib-".';
      }

      // Repli automatique sur le relais SMTP Brevo si configuré
      if (cfg.smtpUser && cfg.smtpPass) {
        const info = await sendViaBrevoSmtp({
          fromEmail,
          fromName,
          to: toList,
          cc: ccList,
          subject,
          text: textBody || ' ',
        });

        res.json({
          delivered: true,
          provider: 'brevo-smtp',
          messageId: info.messageId || null,
        });
        return;
      }

      res.status(400).json({
        delivered: false,
        reason: 'brevo_api_error',
        message: apiErrorMessage || 'Clé API Brevo invalide et aucun relais SMTP valide configuré.',
      });
    } catch (err) {
      const smtpErr = redactSecrets(err instanceof Error ? err.message : 'Erreur inconnue lors de la connexion Brevo');
      res.status(502).json({
        delivered: false,
        reason: 'network_error',
        message: apiErrorMessage ? `${apiErrorMessage} | SMTP: ${smtpErr}` : smtpErr,
      });
    }
  });

  // Proxy serveur sécurisé pour l'assistant IA Gemini (la clé GEMINI_API_KEY reste côté serveur)
  app.post('/api/ai/compose', requireApiAuth, aiLimiter, async (req: AuthenticatedRequest, res: Response) => {
    const body = (req.body || {}) as AiComposeBody;
    const purpose = stripHeaderControls(String(body.purpose || '')).slice(0, 500);
    if (!purpose) {
      res.status(400).json({ error: "L'objectif du message est requis." });
      return;
    }

    const tone = body.tone || 'professionnel';
    const langPrompt = body.language === 'en' ? 'en anglais' : 'en français';
    const recipientName = body.recipientName ? stripHeaderControls(String(body.recipientName)).slice(0, 120) : '';
    const context = body.context ? String(body.context).slice(0, 1000) : '';
    const replyToSubject = body.replyToSubject ? stripHeaderControls(String(body.replyToSubject)).slice(0, 200) : '';
    const replyToBody = body.replyToBody ? String(body.replyToBody).slice(0, 2000) : '';

    const geminiKey = isGeminiConfigured() ? process.env.GEMINI_API_KEY!.trim() : '';

    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const prompt = `Tu es l'assistant de rédaction de messagerie professionnelle Mailoos.
Génère un e-mail complet et soigné ${langPrompt}.
Ton : ${tone}
Objectif : ${purpose}
${recipientName ? `Destinataire : ${recipientName}` : ''}
${context ? `Contexte supplémentaire : ${context}` : ''}
${replyToSubject ? `Objet du mail reçu : ${replyToSubject}` : ''}
${replyToBody ? `Message reçu à répondre :\n${replyToBody}` : ''}

Réponds STRICTEMENT avec un objet JSON valide avec les clés "subject" et "body" :
{
  "subject": "Objet clair et percutant",
  "body": "Corps du message avec salutation et formule de politesse"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });

        const parsed = JSON.parse(response.text || '{}') as { subject?: string; body?: string };
        if (parsed.subject && parsed.body) {
          res.json({ subject: parsed.subject, body: parsed.body, provider: 'gemini-server' });
          return;
        }
      } catch (err) {
        console.warn('Server Gemini compose fallback:', redactSecrets(err instanceof Error ? err.message : String(err)));
      }
    }

    const recipient = recipientName || 'Madame, Monsieur';
    if (replyToSubject) {
      res.json({
        subject: replyToSubject.startsWith('Re:') ? replyToSubject : `Re: ${replyToSubject}`,
        body: `Bonjour ${recipient},\n\nMerci pour votre retour. J'ai bien pris note de votre message et je vous confirme que nous traitons votre demande avec la plus grande attention.\n\nNous restons à votre entière disposition pour tout renseignement complémentaire.\n\nBien cordialement,\nL'équipe Mailoos`,
        provider: 'template',
      });
      return;
    }

    res.json({
      subject: purpose.slice(0, 60),
      body: `Bonjour ${recipient},\n\nJe vous contacte concernant : ${purpose}.\n\n${context || 'Nous restons disponibles pour échanger à ce sujet.'}\n\nDans l'attente de votre retour, je vous souhaite une excellente journée.\n\nBien cordialement,\nL'équipe Mailoos`,
      provider: 'template',
    });
  });

  // Génération du script Cloudflare Email Worker pour réception réelle dans Mailoos
  app.get('/api/mail/inbound/worker-script', requireApiAuth, statusLimiter, (req: AuthenticatedRequest, res: Response) => {
    const domain = stripHeaderControls(String(req.query.domain || 'mailoos.com')).toLowerCase() || 'mailoos.com';
    const rawBackup = stripHeaderControls(String(req.query.backupEmail || '')).toLowerCase();
    const backupForwardEmail = isValidEmail(rawBackup) ? rawBackup : '';
    const script = buildCloudflareEmailWorkerScript({ domain, backupForwardEmail });
    res.json({
      ok: true,
      domain,
      backupForwardEmail,
      script,
    });
  });

  // Test en direct du pipeline de réception Mailoos (écriture réelle dans Firestore -> Boîtes mail)
  app.post('/api/mail/inbound/test', requireApiAuth, sendLimiter, async (req: AuthenticatedRequest, res: Response) => {
    const body = (req.body || {}) as { toEmail?: string };
    const toEmail = stripHeaderControls(String(body.toEmail || 'salif.guiro@mailoos.com')).toLowerCase();
    if (!isValidEmail(toEmail)) {
      res.status(400).json({ delivered: false, message: 'Adresse cible invalide.' });
      return;
    }

    try {
      const result = await deliverInboundEmailToFirestore({
        fromEmail: 'salifguiro00@gmail.com',
        fromName: 'Test Réception Externe',
        toEmail,
        subject: 'Confirmation : réception en direct activée dans Mailoos',
        body: `Bonjour,\n\nCeci est un test réel d'arrivée d'e-mail entrant vers ${toEmail}.\n\nSi vous lisez ce message dans Boîtes mail > Boîte de réception, votre base temps réel Mailoos est 100 % prête à recevoir les vrais messages acheminés par votre Cloudflare Email Worker.\n\nCordialement,\nMailoos Cloud Inbound`,
        source: 'test',
      });
      res.status(result.delivered ? 200 : 502).json(result);
    } catch (err) {
      res.status(502).json({
        delivered: false,
        message: redactSecrets(err instanceof Error ? err.message : 'Erreur lors du test de réception'),
      });
    }
  });

  // Endpoint webhook optionnel pour déploiement public avec secret HMAC
  app.post('/api/mail/inbound', sendLimiter, async (req: Request, res: Response) => {
    const expectedSecret =
      cleanEnvSecret(process.env.INBOUND_WEBHOOK_SECRET) ||
      crypto.createHmac('sha256', SERVER_SIGNING_KEY).update('mailoos-inbound-webhook-v1').digest('hex').slice(0, 32);

    const provided = stripHeaderControls(String(req.headers['x-mailoos-webhook-secret'] || ''));
    const expectedBuf = Buffer.from(expectedSecret, 'utf8');
    const providedBuf = Buffer.from(provided, 'utf8');
    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      res.status(401).json({ delivered: false, message: 'Signature webhook invalide.' });
      return;
    }

    const payload = (req.body || {}) as {
      fromEmail?: string;
      fromName?: string;
      toEmail?: string;
      subject?: string;
      body?: string;
    };

    const fromEmail = stripHeaderControls(String(payload.fromEmail || '')).toLowerCase();
    const toEmail = stripHeaderControls(String(payload.toEmail || '')).toLowerCase();
    if (!isValidEmail(fromEmail) || !isValidEmail(toEmail)) {
      res.status(400).json({ delivered: false, message: 'Adresses fromEmail et toEmail valides requises.' });
      return;
    }

    try {
      const result = await deliverInboundEmailToFirestore({
        fromEmail,
        fromName: payload.fromName ? stripHeaderControls(String(payload.fromName)) : undefined,
        toEmail,
        subject: payload.subject ? stripHeaderControls(String(payload.subject)) : '(Sans objet)',
        body: payload.body ? String(payload.body) : '',
        source: 'webhook',
      });
      res.status(result.delivered ? 200 : 502).json(result);
    } catch (err) {
      res.status(502).json({
        delivered: false,
        message: redactSecrets(err instanceof Error ? err.message : 'Erreur réception entrante'),
      });
    }
  });

  // Tout autre endpoint /api/* inconnu retourne 404 JSON (et jamais index.html)
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint API introuvable.' });
  });

  const isDev = process.env.NODE_ENV === 'development' || !fs.existsSync(DIST_INDEX);
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(DIST_DIR));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(DIST_INDEX);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mailoos secure server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start Mailoos server:', err);
  process.exit(1);
});
