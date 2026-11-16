import { apiFetch } from './apiAuth';

export interface SmtpEnvVarsState {
  hostSet: boolean;
  portSet: boolean;
  userSet: boolean;
  passSet: boolean;
  hostValid: boolean;
  portValid: boolean;
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

export async function fetchSmtpRelayStatus(): Promise<SmtpConnectionTestResult> {
  try {
    const res = await apiFetch('/api/mail/smtp-test');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as SmtpConnectionTestResult;
  } catch (err) {
    return {
      connected: false,
      configured: false,
      tested: false,
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      maskedUser: null,
      latencyMs: null,
      checkedAt: new Date().toISOString(),
      envVars: {
        hostSet: false,
        portSet: false,
        userSet: false,
        passSet: false,
        hostValid: false,
        portValid: false,
      },
      message: err instanceof Error ? err.message : 'Impossible de consulter le statut SMTP serveur.',
    };
  }
}

export async function testBrevoSmtpRelayConnection(): Promise<SmtpConnectionTestResult> {
  try {
    const res = await apiFetch('/api/mail/smtp-test', { method: 'POST' });
    const data = (await res.json().catch(() => null)) as (SmtpConnectionTestResult & { error?: string }) | null;
    if (data && typeof data.connected === 'boolean') {
      return data;
    }
    throw new Error(data?.error || `HTTP ${res.status}`);
  } catch (err) {
    return {
      connected: false,
      configured: false,
      tested: true,
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      maskedUser: null,
      latencyMs: null,
      checkedAt: new Date().toISOString(),
      envVars: {
        hostSet: false,
        portSet: false,
        userSet: false,
        passSet: false,
        hostValid: false,
        portValid: false,
      },
      errorCode: 'NETWORK_ERROR',
      message: err instanceof Error ? err.message : 'Erreur réseau lors du test de connexion SMTP.',
    };
  }
}
