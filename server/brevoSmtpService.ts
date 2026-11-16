import nodemailer from 'nodemailer';

export interface SmtpEnvVarsState {
  hostSet: boolean;
  portSet: boolean;
  userSet: boolean;
  passSet: boolean;
  hostValid: boolean;
  portValid: boolean;
  passLooksLikeSmtpKey?: boolean;
  passLooksLikeApiKey?: boolean;
}

export interface SmtpConnectionTestResult {
  connected: boolean;
  configured: boolean;
  tested: boolean;
  host: string;
  port: number;
  secure: boolean;
  maskedUser: string | null;
  latencyMs: number | null;
  checkedAt: string;
  envVars: SmtpEnvVarsState;
  message: string;
  errorCode?: string;
}

export interface SmtpSendOptions {
  fromEmail: string;
  fromName: string;
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
}

function cleanEnvValue(val: string | undefined): string {
  if (!val) return '';
  return val.trim().replace(/^['"]+|['"]+$/g, '').trim();
}

function isPlaceholder(val: string): boolean {
  return !val || val.startsWith('MY_BREVO');
}

function maskUser(user: string): string {
  if (!user) return '';
  const atIdx = user.indexOf('@');
  if (atIdx > 2) {
    return `${user.slice(0, 2)}***${user.slice(atIdx)}`;
  }
  if (user.length <= 4) return '***';
  return `${user.slice(0, 2)}***${user.slice(-2)}`;
}

function redactSmtpSecrets(msg: string, user?: string, pass?: string): string {
  let out = msg
    .replace(/xsmtpsib-[a-zA-Z0-9-]+/g, '[SMTP_KEY_REDACTED]')
    .replace(/xkeysib-[a-zA-Z0-9-]+/g, '[API_KEY_REDACTED]');
  if (pass && pass.length > 4) {
    out = out.split(pass).join('[SMTP_PASS_REDACTED]');
  }
  if (user && user.length > 4) {
    out = out.split(user).join(maskUser(user));
  }
  return out;
}

export function resolveBrevoSmtpEnv() {
  const rawHost = cleanEnvValue(process.env.BREVO_SMTP_HOST);
  const rawPort = cleanEnvValue(process.env.BREVO_SMTP_PORT);
  const rawUser = cleanEnvValue(process.env.BREVO_SMTP_USER);
  const rawPass = cleanEnvValue(process.env.BREVO_SMTP_PASS);

  const hostSet = !isPlaceholder(rawHost);
  const hostValid = hostSet && rawHost.includes('.') && !/\s/.test(rawHost);
  const host = hostValid ? rawHost : 'smtp-relay.brevo.com';

  const portSet = !isPlaceholder(rawPort);
  const parsedPort = Number(rawPort);
  const portValid = portSet && Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535;
  const port = portValid ? parsedPort : 587;

  const userSet = !isPlaceholder(rawUser);
  const passSet = !isPlaceholder(rawPass);
  const passLooksLikeSmtpKey = passSet && rawPass.startsWith('xsmtpsib-');
  const passLooksLikeApiKey = passSet && rawPass.startsWith('xkeysib-');

  const configured = userSet && passSet;
  const secure = port === 465;

  return {
    configured,
    host,
    port,
    secure,
    user: userSet ? rawUser : '',
    pass: passSet ? rawPass : '',
    maskedUser: userSet ? maskUser(rawUser) : null,
    envVars: {
      hostSet,
      portSet,
      userSet,
      passSet,
      hostValid,
      portValid,
      passLooksLikeSmtpKey,
      passLooksLikeApiKey,
    } satisfies SmtpEnvVarsState,
  };
}

export function getBrevoSmtpEnvStatus(): SmtpConnectionTestResult {
  const env = resolveBrevoSmtpEnv();
  const missing: string[] = [];
  if (!env.envVars.hostSet || !env.envVars.hostValid) missing.push('BREVO_SMTP_HOST');
  if (!env.envVars.portSet || !env.envVars.portValid) missing.push('BREVO_SMTP_PORT');
  if (!env.envVars.userSet) missing.push('BREVO_SMTP_USER');
  if (!env.envVars.passSet) missing.push('BREVO_SMTP_PASS');

  let message = 'Identifiants SMTP Brevo prêts. Cliquez sur « Tester la connexion SMTP » pour vérifier la poignée de main TLS/AUTH.';
  if (!env.configured) {
    message = `Configuration SMTP incomplète (${missing.join(', ')} manquant ou invalide dans les Secrets serveur).`;
  } else if (!env.envVars.hostValid || !env.envVars.portValid) {
    message = `Identifiants SMTP détectés (repli sur ${env.host}:${env.port}). Vérifiez BREVO_SMTP_HOST et BREVO_SMTP_PORT dans les Secrets.`;
  }

  return {
    connected: false,
    configured: env.configured,
    tested: false,
    host: env.host,
    port: env.port,
    secure: env.secure,
    maskedUser: env.maskedUser,
    latencyMs: null,
    checkedAt: new Date().toISOString(),
    envVars: env.envVars,
    message,
  };
}

/**
 * Teste en direct la connexion TCP, TLS/STARTTLS et l'authentification SMTP auprès de Brevo
 * à l'aide des variables d'environnement BREVO_SMTP_HOST, BREVO_SMTP_PORT, BREVO_SMTP_USER et BREVO_SMTP_PASS.
 */
export async function testBrevoSmtpConnection(): Promise<SmtpConnectionTestResult> {
  const env = resolveBrevoSmtpEnv();
  const checkedAt = new Date().toISOString();

  if (!env.configured) {
    const missing: string[] = [];
    if (!env.envVars.userSet) missing.push('BREVO_SMTP_USER');
    if (!env.envVars.passSet) missing.push('BREVO_SMTP_PASS');
    if (!env.envVars.hostValid) missing.push('BREVO_SMTP_HOST');
    if (!env.envVars.portValid) missing.push('BREVO_SMTP_PORT');

    return {
      connected: false,
      configured: false,
      tested: true,
      host: env.host,
      port: env.port,
      secure: env.secure,
      maskedUser: env.maskedUser,
      latencyMs: null,
      checkedAt,
      envVars: env.envVars,
      errorCode: 'MISSING_SMTP_CREDENTIALS',
      message: `Impossible de tester : veuillez renseigner ${missing.join(', ')} dans les Secrets serveur.`,
    };
  }

  const start = Date.now();
  const transporter = nodemailer.createTransport({
    host: env.host,
    port: env.port,
    secure: env.secure,
    auth: {
      user: env.user,
      pass: env.pass,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });

  try {
    await transporter.verify();
    const latencyMs = Date.now() - start;
    transporter.close();

    return {
      connected: true,
      configured: true,
      tested: true,
      host: env.host,
      port: env.port,
      secure: env.secure,
      maskedUser: env.maskedUser,
      latencyMs,
      checkedAt,
      envVars: env.envVars,
      message: `Connexion SMTP Brevo authentifiée avec succès (${env.host}:${env.port}, ${env.secure ? 'SSL/TLS' : 'STARTTLS'}, ${latencyMs} ms).`,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    transporter.close();
    const errObj = err as { code?: string; responseCode?: number; message?: string };
    const rawMsg = errObj?.message || 'Erreur inconnue lors du test SMTP';
    const safeMsg = redactSmtpSecrets(rawMsg, env.user, env.pass);

    let friendlyMessage = `Échec de connexion SMTP (${env.host}:${env.port}) : ${safeMsg}`;
    if (errObj?.responseCode === 535 || /535|auth/i.test(safeMsg)) {
      if (env.envVars.passLooksLikeApiKey) {
        friendlyMessage = `Clé API (xkeysib-...) détectée dans BREVO_SMTP_PASS : SMTP exige une clé SMTP (xsmtpsib-...) générée dans Brevo > SMTP et API > onglet SMTP.`;
      } else if (!env.envVars.passLooksLikeSmtpKey) {
        friendlyMessage = `Format de BREVO_SMTP_PASS invalide : elle doit commencer par "xsmtpsib-" (onglet SMTP de Brevo, différente de la clé API).`;
      } else {
        friendlyMessage = `Authentification SMTP refusée (535) sur ${env.host}:${env.port}. Générez une nouvelle clé SMTP (xsmtpsib-...) dans Brevo > SMTP et API > onglet SMTP et vérifiez votre login Connexion (${env.maskedUser}).`;
      }
    } else if (errObj?.code === 'ETIMEDOUT' || errObj?.code === 'ECONNREFUSED' || errObj?.code === 'ENOTFOUND') {
      friendlyMessage = `Serveur SMTP ${env.host}:${env.port} injoignable (${errObj.code}). Vérifiez BREVO_SMTP_HOST / BREVO_SMTP_PORT ou utilisez l'API HTTPS Brevo.`;
    }

    return {
      connected: false,
      configured: true,
      tested: true,
      host: env.host,
      port: env.port,
      secure: env.secure,
      maskedUser: env.maskedUser,
      latencyMs,
      checkedAt,
      envVars: env.envVars,
      errorCode: errObj?.code || (errObj?.responseCode ? `SMTP_${errObj.responseCode}` : 'SMTP_VERIFY_FAILED'),
      message: friendlyMessage,
    };
  }
}

export async function sendViaBrevoSmtp(options: SmtpSendOptions): Promise<{ messageId: string | null }> {
  const env = resolveBrevoSmtpEnv();
  if (!env.configured) {
    throw new Error('Identifiants SMTP Brevo non configurés.');
  }

  const transporter = nodemailer.createTransport({
    host: env.host,
    port: env.port,
    secure: env.secure,
    auth: {
      user: env.user,
      pass: env.pass,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
  });

  try {
    const info = await transporter.sendMail({
      from: `"${options.fromName.replace(/"/g, '')}" <${options.fromEmail}>`,
      to: options.to.join(', '),
      ...(options.cc && options.cc.length > 0 ? { cc: options.cc.join(', ') } : {}),
      subject: options.subject,
      text: options.text || ' ',
    });
    return { messageId: info.messageId || null };
  } finally {
    transporter.close();
  }
}
