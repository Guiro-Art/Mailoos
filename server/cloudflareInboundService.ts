import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseWebConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId: string;
}

export interface InboundEmailInput {
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  subject?: string;
  body?: string;
  source?: 'cloudflare-worker' | 'webhook' | 'test';
}

export interface InboundDeliveryResult {
  delivered: boolean;
  emailId?: string;
  mailboxId?: string;
  mailboxEmail?: string;
  enterpriseId?: string;
  message: string;
}

function loadFirebaseConfig(): FirebaseWebConfig {
  const cfgPath = path.resolve(__dirname, '..', 'firebase-applet-config.json');
  const raw = fs.readFileSync(cfgPath, 'utf8');
  const parsed = JSON.parse(raw) as Partial<FirebaseWebConfig>;
  if (!parsed.projectId || !parsed.apiKey || !parsed.firestoreDatabaseId) {
    throw new Error('Configuration Firestore incomplète.');
  }
  return {
    projectId: parsed.projectId,
    apiKey: parsed.apiKey,
    firestoreDatabaseId: parsed.firestoreDatabaseId,
  };
}

function sanitizeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8).replace(/[^a-z0-9]/gi, '0');
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function formatFrenchTimeNow(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `Aujourd'hui à ${hh}:${mm}`;
}

interface FirestoreMailboxRow {
  id: string;
  email: string;
  enterpriseId: string;
  status: string;
  mailsCount: number;
  unreadCount: number;
}

async function fetchMailboxesFromFirestore(cfg: FirebaseWebConfig): Promise<FirestoreMailboxRow[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents:runQuery?key=${encodeURIComponent(cfg.apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'mailboxes' }],
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Lecture des boîtes Firestore refusée (HTTP ${res.status})`);
  }

  const rows = (await res.json()) as Array<{
    document?: {
      name: string;
      fields?: Record<string, { stringValue?: string; integerValue?: string; doubleValue?: number }>;
    };
  }>;

  const mailboxes: FirestoreMailboxRow[] = [];
  for (const row of rows) {
    const doc = row.document;
    if (!doc?.fields) continue;
    const f = doc.fields;
    const email = (f.email?.stringValue || '').trim().toLowerCase();
    if (!email) continue;
    mailboxes.push({
      id: doc.name.split('/').pop() || f.id?.stringValue || '',
      email,
      enterpriseId: f.enterpriseId?.stringValue || 'ent-2',
      status: f.status?.stringValue || 'active',
      mailsCount: Number(f.mailsCount?.integerValue || f.mailsCount?.doubleValue || 0),
      unreadCount: Number(f.unreadCount?.integerValue || f.unreadCount?.doubleValue || 0),
    });
  }
  return mailboxes;
}

export async function deliverInboundEmailToFirestore(input: InboundEmailInput): Promise<InboundDeliveryResult> {
  const cfg = loadFirebaseConfig();
  const toNormalized = input.toEmail.trim().toLowerCase();
  const fromEmail = input.fromEmail.trim().toLowerCase();
  const fromName = (input.fromName || fromEmail.split('@')[0] || 'Expéditeur externe').trim().slice(0, 110);
  const subject = (input.subject || '(Sans objet)').replace(/[\r\n\0]+/g, ' ').trim().slice(0, 240) || '(Sans objet)';
  const rawBody = (input.body || '').trim();
  const domainPart = toNormalized.split('@')[1] || 'mailoos.com';

  const mailboxes = await fetchMailboxesFromFirestore(cfg);
  if (mailboxes.length === 0) {
    return {
      delivered: false,
      message: 'Aucune boîte mail configurée dans Firestore pour recevoir ce message.',
    };
  }

  // 1. Correspondance exacte sur l'adresse destinataire
  let target = mailboxes.find(m => m.email === toNormalized && m.status === 'active');
  if (!target) {
    target = mailboxes.find(m => m.email === toNormalized);
  }
  // 2. Sinon Catch-all vers la première boîte active du même domaine (ex: contact@mailoos.com -> salif.guiro@mailoos.com)
  let catchAllRouted = false;
  if (!target) {
    target =
      mailboxes.find(m => m.email.endsWith(`@${domainPart}`) && m.status === 'active') ||
      mailboxes.find(m => m.email.endsWith('@mailoos.com') && m.status === 'active') ||
      mailboxes[0];
    catchAllRouted = Boolean(target && target.email !== toNormalized);
  }

  if (!target) {
    return {
      delivered: false,
      message: 'Aucune boîte cible disponible.',
    };
  }

  const finalBody = (
    catchAllRouted
      ? `[Reçu via adresse ${toNormalized}]\n\n${rawBody || '(Message vide)'}`
      : rawBody || '(Message vide)'
  ).slice(0, 9500);

  const emailId = sanitizeDocId('cf_in');
  const timestamp = Date.now();
  const dateLabel = formatFrenchTimeNow();

  const createUrl = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents/emails?documentId=${encodeURIComponent(emailId)}&key=${encodeURIComponent(cfg.apiKey)}`;
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        id: { stringValue: emailId },
        enterpriseId: { stringValue: target.enterpriseId || 'ent-2' },
        mailboxId: { stringValue: target.id },
        mailboxEmail: { stringValue: target.email },
        from: { stringValue: fromEmail },
        fromName: { stringValue: fromName },
        to: { arrayValue: { values: [{ stringValue: toNormalized }] } },
        subject: { stringValue: subject },
        body: { stringValue: finalBody },
        date: { stringValue: dateLabel },
        timestamp: { integerValue: String(timestamp) },
        isRead: { booleanValue: false },
        folder: { stringValue: 'inbox' },
      },
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text().catch(() => '');
    return {
      delivered: false,
      message: `Échec d'enregistrement Firestore (HTTP ${createRes.status}) : ${errText.slice(0, 180)}`,
    };
  }

  // Mise à jour non-bloquante des compteurs de la boîte cible
  try {
    const patchUrl = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents/mailboxes/${encodeURIComponent(target.id)}?updateMask.fieldPaths=mailsCount&updateMask.fieldPaths=unreadCount&key=${encodeURIComponent(cfg.apiKey)}`;
    await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          mailsCount: { integerValue: String(target.mailsCount + 1) },
          unreadCount: { integerValue: String(target.unreadCount + 1) },
        },
      }),
    });
  } catch {
    // Le compteur sera recalculé côté interface si besoin
  }

  return {
    delivered: true,
    emailId,
    mailboxId: target.id,
    mailboxEmail: target.email,
    enterpriseId: target.enterpriseId,
    message: `E-mail entrant livré en direct dans la boîte ${target.email}.`,
  };
}

export function buildCloudflareEmailWorkerScript(options?: {
  backupForwardEmail?: string;
  domain?: string;
}): string {
  const cfg = loadFirebaseConfig();
  const domain = (options?.domain || 'mailoos.com').trim().toLowerCase();
  const backupEmail = (options?.backupForwardEmail || '').trim();

  return `// ============================================================================
// Mailoos - Cloudflare Email Worker (Réception réelle vers Boîtes mail)
// Domaine : ${domain}
// À coller dans Cloudflare > E-mail > Routage des e-mails > Email Workers
// ============================================================================

const FIREBASE_PROJECT_ID = ${JSON.stringify(cfg.projectId)};
const FIRESTORE_DB_ID = ${JSON.stringify(cfg.firestoreDatabaseId)};
const FIREBASE_API_KEY = ${JSON.stringify(cfg.apiKey)};
const BACKUP_GMAIL = ${JSON.stringify(backupEmail)};

function decodeRfc2047(input) {
  if (!input) return '';
  return input.replace(/=\\?([^?]+)\\?([BQ])\\?([^?]+)\\?=/gi, (_, _charset, enc, text) => {
    try {
      if (enc.toUpperCase() === 'B') {
        const bin = atob(text);
        const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
        return new TextDecoder('utf-8').decode(bytes);
      }
      const qp = text.replace(/_/g, ' ');
      return decodeQuotedPrintable(qp);
    } catch {
      return text;
    }
  });
}

function decodeQuotedPrintable(str) {
  const cleaned = str.replace(/=\\r?\\n/g, '');
  const bytes = [];
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '=' && i + 2 < cleaned.length && /^[0-9A-Fa-f]{2}$/.test(cleaned.slice(i + 1, i + 3))) {
      bytes.push(parseInt(cleaned.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(cleaned.charCodeAt(i) & 0xff);
    }
  }
  return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
}

function decodeBodyContent(rawBody, transferEncoding) {
  const enc = (transferEncoding || '').toLowerCase();
  if (enc.includes('base64')) {
    try {
      const compact = rawBody.replace(/\\s+/g, '');
      const bin = atob(compact);
      const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    } catch {
      return rawBody;
    }
  }
  if (enc.includes('quoted-printable')) {
    return decodeQuotedPrintable(rawBody);
  }
  return rawBody;
}

function stripHtml(html) {
  return html
    .replace(/<style[\\s\\S]*?<\\/style>/gi, ' ')
    .replace(/<script[\\s\\S]*?<\\/script>/gi, ' ')
    .replace(/<br\\s*\\/?>/gi, '\\n')
    .replace(/<\\/p>/gi, '\\n\\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\\n{3,}/g, '\\n\\n')
    .trim();
}

function extractHeadersAndBody(rawPart) {
  const sep = rawPart.indexOf('\\r\\n\\r\\n') !== -1 ? '\\r\\n\\r\\n' : '\\n\\n';
  const idx = rawPart.indexOf(sep);
  if (idx === -1) return { headers: '', body: rawPart };
  return {
    headers: rawPart.slice(0, idx),
    body: rawPart.slice(idx + sep.length),
  };
}

function getHeader(headersBlock, name) {
  const unfolded = headersBlock.replace(/\\r?\\n[ \\t]+/g, ' ');
  const re = new RegExp('^' + name + ':\\\\s*(.+)$', 'im');
  const m = unfolded.match(re);
  return m ? m[1].trim() : '';
}

function extractReadableText(rawMime, depth = 0) {
  if (depth > 5) return '';
  const { headers, body } = extractHeadersAndBody(rawMime);
  const contentType = getHeader(headers, 'content-type') || 'text/plain';
  const transferEnc = getHeader(headers, 'content-transfer-encoding');

  if (/multipart\\//i.test(contentType)) {
    const bMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;\\s]+))/i);
    if (bMatch) {
      const boundary = bMatch[1] || bMatch[2];
      const parts = body.split('--' + boundary);
      let htmlFallback = '';
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed || trimmed === '--') continue;
        const result = extractReadableText(trimmed, depth + 1);
        if (result && !result.__isHtml) return result;
        if (result && result.__isHtml && !htmlFallback) htmlFallback = result.text;
      }
      if (htmlFallback) return { text: htmlFallback, __isHtml: false };
    }
  }

  const decoded = decodeBodyContent(body, transferEnc).trim();
  if (/text\\/html/i.test(contentType)) {
    return { text: stripHtml(decoded), __isHtml: true };
  }
  return { text: decoded, __isHtml: false };
}

function parseFromHeader(rawFromHeader, fallbackEmail) {
  const decoded = decodeRfc2047(rawFromHeader || '');
  const m = decoded.match(/^"?([^"<]+?)"?\\s*<([^>]+)>/);
  if (m) {
    return { fromName: m[1].trim() || fallbackEmail, fromEmail: m[2].trim().toLowerCase() };
  }
  return { fromName: fallbackEmail.split('@')[0] || fallbackEmail, fromEmail: fallbackEmail.toLowerCase() };
}

export default {
  async email(message, _env, _ctx) {
    const toAddr = (message.to || '').trim().toLowerCase();
    const rawFromHeader = message.headers.get('from') || message.from || '';
    const { fromName, fromEmail } = parseFromHeader(rawFromHeader, message.from || 'inconnu@mail.com');
    const rawSubject = decodeRfc2047(message.headers.get('subject') || '(Sans objet)');
    const subject = rawSubject.replace(/[\\r\\n\\0]+/g, ' ').trim().slice(0, 240) || '(Sans objet)';

    let bodyText = '';
    try {
      const rawText = await new Response(message.raw).text();
      const extracted = extractReadableText(rawText);
      bodyText = (typeof extracted === 'string' ? extracted : extracted?.text || '').trim();
    } catch {
      bodyText = '';
    }

    const baseUrl = \`https://firestore.googleapis.com/v1/projects/\${FIREBASE_PROJECT_ID}/databases/\${FIRESTORE_DB_ID}/documents\`;

    // 1. Trouver la boîte cible dans Mailoos
    let targetMailbox = { id: 'mb-2001', email: 'salif.guiro@${domain}', enterpriseId: 'ent-2', mailsCount: 0, unreadCount: 0 };
    let matchedExact = false;

    try {
      const qRes = await fetch(\`\${baseUrl}:runQuery?key=\${encodeURIComponent(FIREBASE_API_KEY)}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'mailboxes' }] } }),
      });
      if (qRes.ok) {
        const rows = await qRes.json();
        const boxes = rows
          .filter(r => r.document && r.document.fields)
          .map(r => {
            const f = r.document.fields;
            return {
              id: r.document.name.split('/').pop(),
              email: (f.email?.stringValue || '').toLowerCase(),
              enterpriseId: f.enterpriseId?.stringValue || 'ent-2',
              status: f.status?.stringValue || 'active',
              mailsCount: Number(f.mailsCount?.integerValue || f.mailsCount?.doubleValue || 0),
              unreadCount: Number(f.unreadCount?.integerValue || f.unreadCount?.doubleValue || 0),
            };
          });
        const exact = boxes.find(b => b.email === toAddr);
        if (exact) {
          targetMailbox = exact;
          matchedExact = true;
        } else {
          const fallback = boxes.find(b => b.email.endsWith('@${domain}') && b.status === 'active') || boxes[0];
          if (fallback) targetMailbox = fallback;
        }
      }
    } catch {
      // Repli automatique sur la boîte principale
    }

    const finalBody = (
      !matchedExact && targetMailbox.email !== toAddr
        ? \`[Reçu via \${toAddr}]\\n\\n\${bodyText || '(Message vide)'}\`
        : bodyText || '(Message vide)'
    ).slice(0, 9500);

    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const emailId = \`cf_\${Date.now()}_\${Math.random().toString(36).slice(2, 8)}\`;

    // 2. Livrer en temps réel dans la boîte Mailoos (Firestore)
    const createRes = await fetch(
      \`\${baseUrl}/emails?documentId=\${encodeURIComponent(emailId)}&key=\${encodeURIComponent(FIREBASE_API_KEY)}\`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: { stringValue: emailId },
            enterpriseId: { stringValue: targetMailbox.enterpriseId },
            mailboxId: { stringValue: targetMailbox.id },
            mailboxEmail: { stringValue: targetMailbox.email },
            from: { stringValue: fromEmail },
            fromName: { stringValue: fromName.slice(0, 110) },
            to: { arrayValue: { values: [{ stringValue: toAddr }] } },
            subject: { stringValue: subject },
            body: { stringValue: finalBody },
            date: { stringValue: \`Aujourd'hui à \${hh}:\${mm}\` },
            timestamp: { integerValue: String(Date.now()) },
            isRead: { booleanValue: false },
            folder: { stringValue: 'inbox' },
          },
        }),
      }
    );

    if (createRes.ok) {
      await fetch(
        \`\${baseUrl}/mailboxes/\${encodeURIComponent(targetMailbox.id)}?updateMask.fieldPaths=mailsCount&updateMask.fieldPaths=unreadCount&key=\${encodeURIComponent(FIREBASE_API_KEY)}\`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              mailsCount: { integerValue: String(targetMailbox.mailsCount + 1) },
              unreadCount: { integerValue: String(targetMailbox.unreadCount + 1) },
            },
          }),
        }
      ).catch(() => {});
    }

    // 3. Copie de secours optionnelle vers Gmail
    if (BACKUP_GMAIL) {
      try {
        await message.forward(BACKUP_GMAIL);
      } catch {
        // Ne bloque pas la livraison Mailoos si Gmail refuse ou n'est pas validé
      }
    }
  },
};
`;
}
