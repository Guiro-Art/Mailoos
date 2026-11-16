const API_TOKEN_KEY = 'mailoos_api_token';
const API_EXPIRES_KEY = 'mailoos_api_token_exp';

export interface ApiSessionIdentity {
  adminId: string;
  email: string;
  role: string;
  enterpriseId?: string;
}

let inMemoryToken: string | null = null;
let inMemoryExp = 0;
let lastIdentity: ApiSessionIdentity | null = null;
let pendingRefresh: Promise<string | null> | null = null;

function readStoredToken(): { token: string | null; exp: number } {
  if (inMemoryToken && Date.now() < inMemoryExp - 30_000) {
    return { token: inMemoryToken, exp: inMemoryExp };
  }
  try {
    const t = sessionStorage.getItem(API_TOKEN_KEY);
    const e = Number(sessionStorage.getItem(API_EXPIRES_KEY) || '0');
    if (t && e > Date.now() + 30_000) {
      inMemoryToken = t;
      inMemoryExp = e;
      return { token: t, exp: e };
    }
  } catch {
    // ignore storage restrictions
  }
  return { token: null, exp: 0 };
}

function storeToken(token: string, exp: number) {
  inMemoryToken = token;
  inMemoryExp = exp;
  try {
    sessionStorage.setItem(API_TOKEN_KEY, token);
    sessionStorage.setItem(API_EXPIRES_KEY, String(exp));
  } catch {
    // ignore
  }
}

export function clearApiSessionCache() {
  inMemoryToken = null;
  inMemoryExp = 0;
  try {
    sessionStorage.removeItem(API_TOKEN_KEY);
    sessionStorage.removeItem(API_EXPIRES_KEY);
  } catch {
    // ignore
  }
}

export async function ensureApiSession(identity?: ApiSessionIdentity): Promise<string | null> {
  if (identity) {
    lastIdentity = identity;
  }

  const existing = readStoredToken();
  if (existing.token && (!identity || !lastIdentity)) {
    return existing.token;
  }
  if (existing.token && !identity) {
    return existing.token;
  }

  const activeIdentity = identity || lastIdentity;
  if (!activeIdentity?.email || !activeIdentity?.adminId) {
    return null;
  }

  if (pendingRefresh) {
    return pendingRefresh;
  }

  pendingRefresh = (async () => {
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeIdentity),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { token?: string; expiresAt?: number };
      if (data.token && data.expiresAt) {
        storeToken(data.token, data.expiresAt);
        return data.token;
      }
      return null;
    } catch {
      return null;
    } finally {
      pendingRefresh = null;
    }
  })();

  return pendingRefresh;
}

export async function revokeApiSession(): Promise<void> {
  const { token } = readStoredToken();
  clearApiSessionCache();
  lastIdentity = null;
  if (!token) return;
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // ignore network error on logout
  }
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  let token = readStoredToken().token;
  if (!token) {
    token = await ensureApiSession();
  }

  const buildHeaders = (t: string | null) => {
    const headers = new Headers(init.headers || {});
    if (t) {
      headers.set('Authorization', `Bearer ${t}`);
    }
    return headers;
  };

  let res = await fetch(input, { ...init, headers: buildHeaders(token) });

  // Si le serveur a redémarré ou que le jeton a expiré, on renouvelle une fois si une session admin est active
  if (res.status === 401 && lastIdentity) {
    clearApiSessionCache();
    const freshToken = await ensureApiSession(lastIdentity);
    if (freshToken) {
      res = await fetch(input, { ...init, headers: buildHeaders(freshToken) });
    }
  }

  return res;
}
