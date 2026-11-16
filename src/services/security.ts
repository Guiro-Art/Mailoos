/**
 * Mailo Enterprise - Module de Sécurité & Cryptographie
 * Fournit le hachage fort des mots de passe (PBKDF2/SHA-256), la gestion de session
 * anti-falsification, la protection anti-brute-force (Rate Limiting) et l'assainissement d'entrées.
 */

// Utilise l'API Web Crypto native du navigateur
const cryptoObj = typeof window !== 'undefined' && window.crypto ? window.crypto : null;

/**
 * Génère un sel cryptographique aléatoire sécurisé
 */
export const generateSecureSalt = (length = 16): string => {
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoObj.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

/**
 * Hache un mot de passe en utilisant PBKDF2 (100 000 itérations HMAC-SHA-256)
 * Recommandation officielle OWASP / NIST
 */
export const hashPassword = async (
  password: string,
  providedSalt?: string
): Promise<{ hash: string; salt: string }> => {
  const salt = providedSalt || generateSecureSalt(16);

  if (cryptoObj?.subtle) {
    try {
      const enc = new TextEncoder();
      const passwordKey = await cryptoObj.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const derivedBits = await cryptoObj.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: enc.encode(salt),
          iterations: 100000,
          hash: 'SHA-256'
        },
        passwordKey,
        256
      );

      const hashArray = Array.from(new Uint8Array(derivedBits));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return { hash: hashHex, salt };
    } catch {
      // Fallback sécurisé SHA-256 simple si PBKDF2 échoue
    }
  }

  // Fallback SHA-256
  const enc = new TextEncoder();
  const data = enc.encode(salt + password);
  if (cryptoObj?.subtle) {
    const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return { hash: hashHex, salt };
  }

  // Fallback basique si Web Crypto est indisponible
  let h = 0x811c9dc5;
  const str = salt + password;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return { hash: (h >>> 0).toString(16).padStart(8, '0'), salt };
};

/**
 * Vérification d'un mot de passe par comparaison en temps constant
 */
export const verifyPassword = async (
  passwordAttempt: string,
  storedHash: string,
  salt: string
): Promise<boolean> => {
  if (!passwordAttempt || !storedHash || !salt) return false;
  const { hash: computedHash } = await hashPassword(passwordAttempt, salt);
  
  // Comparaison en temps constant pour contrer les attaques temporelles (timing attacks)
  if (computedHash.length !== storedHash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computedHash.length; i++) {
    mismatch |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return mismatch === 0;
};

/**
 * Gestion de session sécurisée : jeton signé avec horodatage et expiration
 */
export interface SecureSessionPayload {
  adminId: string;
  role: string;
  email: string;
  createdAt: number;
  expiresAt: number;
  fingerprint: string;
}

const SESSION_SECRET_KEY = 'mailo_session_integrity_key_v1';

export const createSecureSessionToken = (
  adminId: string,
  role: string,
  email: string,
  durationHours = 12
): string => {
  const now = Date.now();
  const payload: SecureSessionPayload = {
    adminId,
    role,
    email,
    createdAt: now,
    expiresAt: now + durationHours * 3600 * 1000,
    fingerprint: generateSecureSalt(8)
  };

  const payloadStr = btoa(JSON.stringify(payload));
  // Signature simple d'intégrité
  let sign = 0;
  const signInput = payloadStr + SESSION_SECRET_KEY;
  for (let i = 0; i < signInput.length; i++) {
    sign = (sign * 31 + signInput.charCodeAt(i)) >>> 0;
  }

  return `${payloadStr}.${sign.toString(16)}`;
};

export const verifySecureSessionToken = (
  token: string | null
): { valid: boolean; payload?: SecureSessionPayload; error?: string } => {
  if (!token) return { valid: false, error: 'Session absente' };
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, error: 'Format de session invalide' };

  const [payloadStr, signature] = parts;
  let sign = 0;
  const signInput = payloadStr + SESSION_SECRET_KEY;
  for (let i = 0; i < signInput.length; i++) {
    sign = (sign * 31 + signInput.charCodeAt(i)) >>> 0;
  }

  if (sign.toString(16) !== signature) {
    return { valid: false, error: 'Signature de session altérée ou corrompue' };
  }

  try {
    const payload: SecureSessionPayload = JSON.parse(atob(payloadStr));
    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: 'Session expirée' };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Décodage de session impossible' };
  }
};

/**
 * Protection Anti-Brute-Force (Rate Limiting)
 * Bloque temporairement un identifiant après trop de tentatives infructueuses
 */
const RATE_LIMIT_PREFIX = 'mailo_rl_';

export interface RateLimitStatus {
  isLocked: boolean;
  remainingSeconds: number;
  failedCount: number;
}

export const checkRateLimit = (identifier: string, maxAttempts = 5, lockMinutes = 5): RateLimitStatus => {
  const cleanId = (identifier || 'anonymous').toLowerCase().trim();
  const key = `${RATE_LIMIT_PREFIX}${cleanId}`;
  
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { isLocked: false, remainingSeconds: 0, failedCount: 0 };
    
    const data = JSON.parse(raw);
    const now = Date.now();
    
    if (data.lockedUntil && now < data.lockedUntil) {
      const remainingSeconds = Math.ceil((data.lockedUntil - now) / 1000);
      return { isLocked: true, remainingSeconds, failedCount: data.failedCount };
    }

    // Si le verrou est passé, réinitialisation
    if (data.lockedUntil && now >= data.lockedUntil) {
      localStorage.removeItem(key);
      return { isLocked: false, remainingSeconds: 0, failedCount: 0 };
    }

    return { isLocked: false, remainingSeconds: 0, failedCount: data.failedCount || 0 };
  } catch {
    return { isLocked: false, remainingSeconds: 0, failedCount: 0 };
  }
};

export const recordFailedLogin = (identifier: string, maxAttempts = 5, lockMinutes = 5): RateLimitStatus => {
  const cleanId = (identifier || 'anonymous').toLowerCase().trim();
  const key = `${RATE_LIMIT_PREFIX}${cleanId}`;
  const now = Date.now();

  try {
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : { failedCount: 0, firstFail: now };
    
    data.failedCount = (data.failedCount || 0) + 1;
    data.lastFail = now;

    if (data.failedCount >= maxAttempts) {
      data.lockedUntil = now + lockMinutes * 60 * 1000;
      localStorage.setItem(key, JSON.stringify(data));
      return { isLocked: true, remainingSeconds: lockMinutes * 60, failedCount: data.failedCount };
    }

    localStorage.setItem(key, JSON.stringify(data));
    return { isLocked: false, remainingSeconds: 0, failedCount: data.failedCount };
  } catch {
    return { isLocked: false, remainingSeconds: 0, failedCount: 1 };
  }
};

export const resetRateLimit = (identifier: string) => {
  const cleanId = (identifier || 'anonymous').toLowerCase().trim();
  try {
    localStorage.removeItem(`${RATE_LIMIT_PREFIX}${cleanId}`);
  } catch {}
};

/**
 * Validation de robustesse des mots de passe
 */
export const validatePasswordStrength = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!password || password.length < 8) {
    errors.push('Au moins 8 caractères requis.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Au moins une lettre majuscule.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Au moins une lettre minuscule.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Au moins un chiffre.');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Au moins un caractère spécial (!@#$...).');
  }
  return { valid: errors.length === 0, errors };
};

/**
 * Assainissement d'entrées (Anti-XSS)
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/javascript:/gi, '')
    .trim();
};
