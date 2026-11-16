import { apiFetch } from './apiAuth';

export interface BrevoDnsRecordDetail {
  host?: string;
  type?: string;
  value?: string;
  status?: boolean;
}

export interface BrevoRelayStatus {
  configured: boolean;
  mode: 'brevo-api' | 'brevo-smtp' | 'none';
  keyFormatValid?: boolean;
  smtpHost: string;
  smtpPort: number;
  dailyQuotaFree: number;
  spfInclude: string;
  apiProtected?: boolean;
  geminiConfigured?: boolean;
  brevoApiValid?: boolean;
  brevoAccountPlan?: string;
  mailoosDomainRegistered?: boolean;
  mailoosDomainAuthenticated?: boolean;
  brevoDnsRecords?: Record<string, BrevoDnsRecordDetail>;
  verifyError?: string;
}

export interface BrevoSendPayload {
  fromEmail: string;
  fromName: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
}

export interface BrevoSendResult {
  delivered: boolean;
  provider?: string;
  messageId?: string | null;
  reason?: string;
  message?: string;
}

export async function getBrevoRelayStatus(verify = false): Promise<BrevoRelayStatus> {
  try {
    const res = await apiFetch(verify ? '/api/mail/status?verify=1' : '/api/mail/status');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as BrevoRelayStatus;
  } catch {
    return {
      configured: false,
      mode: 'none',
      smtpHost: 'smtp-relay.brevo.com',
      smtpPort: 587,
      dailyQuotaFree: 300,
      spfInclude: 'include:spf.brevo.com',
      apiProtected: true,
    };
  }
}

export async function sendRealEmailViaBrevo(payload: BrevoSendPayload): Promise<BrevoSendResult> {
  try {
    const res = await apiFetch('/api/mail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as BrevoSendResult & { error?: string };
    if (!res.ok && !data.message && data.error) {
      return {
        delivered: false,
        reason: 'api_error',
        message: data.error,
      };
    }
    return data;
  } catch (err) {
    return {
      delivered: false,
      reason: 'network_error',
      message: err instanceof Error ? err.message : 'Erreur réseau vers le serveur Mailoos',
    };
  }
}

export async function authenticateDomainOnBrevo(domain: string): Promise<{
  ok: boolean;
  authenticated?: boolean;
  dnsRecords?: Record<string, BrevoDnsRecordDetail>;
  message: string;
}> {
  try {
    const res = await apiFetch('/api/mail/brevo/authenticate-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      authenticated?: boolean;
      dnsRecords?: Record<string, BrevoDnsRecordDetail>;
      message?: string;
      error?: string;
    };
    return {
      ok: Boolean(data.ok),
      authenticated: data.authenticated,
      dnsRecords: data.dnsRecords,
      message: data.message || data.error || `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Erreur réseau lors de la vérification Brevo',
    };
  }
}

export async function fetchInboundWorkerScript(
  domain: string,
  backupEmail?: string
): Promise<{ ok: boolean; script?: string; message?: string }> {
  try {
    const params = new URLSearchParams({ domain });
    if (backupEmail?.trim()) {
      params.set('backupEmail', backupEmail.trim());
    }
    const res = await apiFetch(`/api/mail/inbound/worker-script?${params.toString()}`);
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      script?: string;
      error?: string;
    };
    if (!res.ok || !data.script) {
      return { ok: false, message: data.error || `HTTP ${res.status}` };
    }
    return { ok: true, script: data.script };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Erreur lors de la génération du script Cloudflare',
    };
  }
}

export async function testInboundEmailReception(toEmail: string): Promise<{
  delivered: boolean;
  mailboxEmail?: string;
  emailId?: string;
  message: string;
}> {
  try {
    const res = await apiFetch('/api/mail/inbound/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toEmail }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      delivered?: boolean;
      mailboxEmail?: string;
      emailId?: string;
      message?: string;
      error?: string;
    };
    return {
      delivered: Boolean(data.delivered),
      mailboxEmail: data.mailboxEmail,
      emailId: data.emailId,
      message: data.message || data.error || `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      delivered: false,
      message: err instanceof Error ? err.message : 'Erreur réseau lors du test de réception',
    };
  }
}
