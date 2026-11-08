/**
 * Google OAuth2 / GIS ID Token Verification & HMAC Session Manager (`server/auth.js`) — Issue #224
 *
 * Zero external dependencies (uses Node built-in `node:crypto`).
 * Provides:
 *  1. `verifyGoogleIdToken(idToken, options)`:
 *     - Full RS256 JWT verification against Google's public JWKS (`https://www.googleapis.com/oauth2/v3/certs`)
 *       with 1-hour in-memory key caching and injectable `jwksFetcher` / `publicKeys` for offline unit testing.
 *     - Validates `iss` (`https://accounts.google.com` or `accounts.google.com`), `exp`, and `aud` (`GOOGLE_CLIENT_ID`).
 *     - Optional Dev / Test Authentication (`allowDevAuth`) supporting `devProfile` objects, `dev:` tokens,
 *       or local test tokens when `GOOGLE_CLIENT_ID` is not set or `STUPA_ALLOW_DEV_AUTH=1`.
 *  2. `issueSessionToken(user, options)` & `verifySessionToken(token, options)`:
 *     - Stateless HMAC-SHA256 signed session tokens with 30-day default TTL.
 *  3. `extractAuthUser(req, authManager)`:
 *     - Extracts & verifies bearer/header session token from incoming HTTP requests.
 */
import crypto from 'node:crypto';

export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
export const VALID_GOOGLE_ISSUERS = new Set([
  'https://accounts.google.com',
  'accounts.google.com',
]);
export const DEFAULT_SESSION_TTL_MS = 30 * 86400 * 1000; // 30 days
export const DEFAULT_JWKS_TTL_MS = 3600 * 1000; // 1 hour
export const CLOCK_SKEW_MS = 30 * 1000; // 30 seconds

const DEFAULT_RUNTIME_SECRET =
  process.env.STUPA_AUTH_SECRET ||
  `stupa-runtime-secret-${crypto.randomBytes(24).toString('hex')}`;

const FORBIDDEN_IDS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
]);

export function sanitizeUid(raw, fallback = '') {
  if (typeof raw !== 'string' && typeof raw !== 'number') return fallback;
  const cleaned = String(raw)
    .replace(/[^a-zA-Z0-9_:.-]/g, '')
    .trim()
    .slice(0, 64);
  if (!cleaned || FORBIDDEN_IDS.has(cleaned)) return fallback;
  return cleaned;
}

export function sanitizeEmail(raw, fallback = '') {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw
    .replace(/[\x00-\x1F\x7F<>'"\s]/g, '')
    .toLowerCase()
    .slice(0, 120);
  if (!cleaned || !cleaned.includes('@')) return fallback;
  return cleaned;
}

export function sanitizeDisplayName(raw, fallback = '朝聖行者') {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw
    .replace(/[\x00-\x1F\x7F<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 32);
  return cleaned || fallback;
}

export function sanitizePhotoUrl(raw, fallback = '') {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[\x00-\x1F\x7F<>'"\s]/g, '').trim().slice(0, 512);
  if (!cleaned) return fallback;
  if (
    cleaned.startsWith('https://') ||
    cleaned.startsWith('http://') ||
    cleaned.startsWith('data:image/')
  ) {
    return cleaned;
  }
  return fallback;
}

export function sanitizeUserProfile(raw = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const email = sanitizeEmail(raw.email, '');
  let uid = sanitizeUid(raw.uid || raw.sub, '');
  if (!uid && email) {
    const hash = crypto.createHash('sha256').update(email).digest('hex').slice(0, 20);
    uid = `google_${hash}`;
  }
  if (!uid) return null;

  const emailPrefix = email ? email.split('@')[0] : '';
  const displayName = sanitizeDisplayName(
    raw.displayName || raw.name || emailPrefix,
    '朝聖行者',
  );
  const photoURL = sanitizePhotoUrl(raw.photoURL || raw.picture || '', '');

  return {
    uid,
    email,
    displayName,
    photoURL,
    provider: 'google',
  };
}

export function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input)
    ? input
    : Buffer.from(typeof input === 'string' ? input : JSON.stringify(input), 'utf8');
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function base64UrlDecodeToBuffer(str) {
  if (typeof str !== 'string' || !str) return Buffer.alloc(0);
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  return Buffer.from(padded, 'base64');
}

export function decodeJwtPart(b64Url) {
  try {
    const raw = base64UrlDecodeToBuffer(b64Url).toString('utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

let cachedJwks = {
  keysByKid: new Map(),
  fetchedAt: 0,
};

function jwkToKeyObject(keyInput) {
  if (!keyInput) return null;
  try {
    if (typeof keyInput === 'object' && typeof keyInput.export === 'function') {
      return keyInput;
    }
    if (typeof keyInput === 'string') {
      return crypto.createPublicKey(keyInput);
    }
    if (typeof keyInput === 'object' && keyInput.kty) {
      return crypto.createPublicKey({ key: keyInput, format: 'jwk' });
    }
  } catch {
    return null;
  }
  return null;
}

function buildKeyMapFromInput(publicKeys) {
  const map = new Map();
  if (!publicKeys) return map;

  if (publicKeys instanceof Map) {
    for (const [kid, val] of publicKeys.entries()) {
      const keyObj = jwkToKeyObject(val);
      if (keyObj) map.set(String(kid), keyObj);
    }
    return map;
  }

  const list = Array.isArray(publicKeys)
    ? publicKeys
    : Array.isArray(publicKeys.keys)
      ? publicKeys.keys
      : null;

  if (list) {
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const kid = item.kid ? String(item.kid) : 'default';
      const keyObj = jwkToKeyObject(item);
      if (keyObj) map.set(kid, keyObj);
    }
    return map;
  }

  if (typeof publicKeys === 'object') {
    if (publicKeys.kty) {
      const kid = publicKeys.kid ? String(publicKeys.kid) : 'default';
      const keyObj = jwkToKeyObject(publicKeys);
      if (keyObj) map.set(kid, keyObj);
      return map;
    }
    for (const [kid, val] of Object.entries(publicKeys)) {
      const keyObj = jwkToKeyObject(val);
      if (keyObj) map.set(String(kid), keyObj);
    }
  }

  return map;
}

async function resolveGooglePublicKey(kid, options = {}) {
  const now = Number(options.now) || Date.now();
  const jwksTtlMs = Number(options.jwksTtlMs) || DEFAULT_JWKS_TTL_MS;

  if (options.publicKey) {
    return jwkToKeyObject(options.publicKey);
  }

  if (options.publicKeys) {
    const customMap = buildKeyMapFromInput(options.publicKeys);
    if (kid && customMap.has(kid)) return customMap.get(kid);
    if (customMap.has('default')) return customMap.get('default');
    if (!kid && customMap.size === 1) return customMap.values().next().value;
    return null;
  }

  const fetcher =
    typeof options.jwksFetcher === 'function'
      ? options.jwksFetcher
      : async () => {
          const res = await fetch(GOOGLE_JWKS_URL);
          if (!res.ok) throw new Error(`JWKS HTTP ${res.status}`);
          return res.json();
        };

  const isCacheFresh =
    cachedJwks.keysByKid.size > 0 && now - cachedJwks.fetchedAt < jwksTtlMs;

  if (isCacheFresh) {
    if (kid && cachedJwks.keysByKid.has(kid)) {
      return cachedJwks.keysByKid.get(kid);
    }
    if (!kid && cachedJwks.keysByKid.size === 1) {
      return cachedJwks.keysByKid.values().next().value;
    }
  }

  try {
    const jwksPayload = await fetcher();
    const nextMap = buildKeyMapFromInput(jwksPayload);
    if (nextMap.size > 0) {
      cachedJwks = {
        keysByKid: nextMap,
        fetchedAt: now,
      };
    }
    if (kid && nextMap.has(kid)) return nextMap.get(kid);
    if (nextMap.has('default')) return nextMap.get('default');
    if (!kid && nextMap.size === 1) return nextMap.values().next().value;
  } catch {
    // Fall back to stale cache if available
    if (kid && cachedJwks.keysByKid.has(kid)) {
      return cachedJwks.keysByKid.get(kid);
    }
  }

  return null;
}

function isDevAuthAllowed(options = {}) {
  if (typeof options.allowDevAuth === 'boolean') {
    return options.allowDevAuth;
  }
  if (process.env.STUPA_ALLOW_DEV_AUTH === '1') {
    return true;
  }
  if (process.env.STUPA_ALLOW_DEV_AUTH === '0') {
    return false;
  }
  const clientId = options.googleClientId ?? process.env.GOOGLE_CLIENT_ID ?? '';
  return !clientId;
}

/**
 * Verifies a Google ID Token (RS256 JWT) or dev authentication payload.
 * Returns a sanitized user profile `{ uid, email, displayName, photoURL, provider: 'google' }` or `null`.
 */
export async function verifyGoogleIdToken(idTokenOrInput, options = {}) {
  const allowDev = isDevAuthAllowed(options);
  const now = Number(options.now) || Date.now();
  const googleClientId =
    options.googleClientId !== undefined
      ? options.googleClientId
      : process.env.GOOGLE_CLIENT_ID || '';

  // Support object input `{ idToken, devProfile }` or direct `devProfile` object
  if (idTokenOrInput && typeof idTokenOrInput === 'object') {
    if (typeof idTokenOrInput.idToken === 'string' && idTokenOrInput.idToken.trim()) {
      return verifyGoogleIdToken(idTokenOrInput.idToken.trim(), options);
    }
    if (allowDev) {
      const profileCandidate = idTokenOrInput.devProfile || idTokenOrInput;
      return sanitizeUserProfile(profileCandidate);
    }
    return null;
  }

  if (typeof idTokenOrInput !== 'string') {
    if (allowDev && options.devProfile && typeof options.devProfile === 'object') {
      return sanitizeUserProfile(options.devProfile);
    }
    return null;
  }

  const rawToken = idTokenOrInput.trim();
  if (!rawToken || rawToken.length > 8192) {
    return null;
  }

  // Dev shorthand token: `dev:<uid>:<email>:<displayName>[:<photoURL>]`
  if (rawToken.startsWith('dev:')) {
    if (!allowDev) return null;
    const parts = rawToken.slice(4).split(':');
    const [uid, email, displayName, ...photoRest] = parts;
    return sanitizeUserProfile({
      uid: uid || undefined,
      email: email || `${uid || 'pilgrim'}@stupa.local`,
      displayName: displayName || uid || '朝聖行者',
      photoURL: photoRest.length > 0 ? photoRest.join(':') : '',
    });
  }

  // Standard 3-part JWT: header.payload.signature
  const segments = rawToken.split('.');
  if (segments.length !== 3) {
    return null;
  }

  const [headerB64, payloadB64, sigB64] = segments;
  const header = decodeJwtPart(headerB64);
  const payload = decodeJwtPart(payloadB64);
  if (!header || !payload) {
    return null;
  }

  // Validate issuer
  if (!VALID_GOOGLE_ISSUERS.has(payload.iss)) {
    return null;
  }

  // Validate expiration (`exp` in Unix seconds)
  const expSec = Number(payload.exp);
  if (!Number.isFinite(expSec) || expSec * 1000 <= now - CLOCK_SKEW_MS) {
    return null;
  }

  // Validate not-before (`nbf` in Unix seconds) if present
  if (payload.nbf !== undefined) {
    const nbfSec = Number(payload.nbf);
    if (!Number.isFinite(nbfSec) || nbfSec * 1000 > now + CLOCK_SKEW_MS) {
      return null;
    }
  }

  // Validate audience (`aud`) if `googleClientId` is configured
  if (googleClientId) {
    const audMatch = Array.isArray(payload.aud)
      ? payload.aud.includes(googleClientId)
      : payload.aud === googleClientId;
    if (!audMatch) {
      return null;
    }
  }

  // RS256 verification against Google JWKS / publicKey
  if (header.alg === 'RS256') {
    if (!sigB64) return null;
    const publicKey = await resolveGooglePublicKey(header.kid, options);
    if (!publicKey) return null;

    const signingInput = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');
    const sigBuffer = base64UrlDecodeToBuffer(sigB64);
    try {
      const valid = crypto.verify('RSA-SHA256', signingInput, publicKey, sigBuffer);
      if (!valid) return null;
    } catch {
      return null;
    }

    return sanitizeUserProfile({
      uid: payload.sub || payload.uid,
      email: payload.email,
      displayName: payload.name || payload.given_name,
      photoURL: payload.picture,
    });
  }

  // Dev/Test JWT fallback (`alg === 'HS256'` or `alg === 'none'`) ONLY when allowDevAuth is enabled
  if (allowDev && (header.alg === 'none' || header.alg === 'HS256')) {
    if (header.alg === 'HS256' && options.secret) {
      const expected = crypto
        .createHmac('sha256', String(options.secret))
        .update(`${headerB64}.${payloadB64}`, 'utf8')
        .digest();
      const actual = base64UrlDecodeToBuffer(sigB64);
      if (
        expected.length !== actual.length ||
        !crypto.timingSafeEqual(expected, actual)
      ) {
        return null;
      }
    }
    return sanitizeUserProfile({
      uid: payload.sub || payload.uid,
      email: payload.email,
      displayName: payload.name || payload.displayName,
      photoURL: payload.picture || payload.photoURL,
    });
  }

  return null;
}

/**
 * Issues an HMAC-SHA256 signed session token for a verified user.
 */
export function issueSessionToken(user, options = {}) {
  const cleanUser = sanitizeUserProfile(user);
  if (!cleanUser) {
    throw new Error('Cannot issue session token for invalid user profile');
  }

  const secret = String(
    options.secret || process.env.STUPA_AUTH_SECRET || DEFAULT_RUNTIME_SECRET,
  );
  const now = Number(options.now) || Date.now();
  const ttlMs =
    options.ttlMs !== undefined
      ? Number(options.ttlMs)
      : DEFAULT_SESSION_TTL_MS;
  const exp = now + ttlMs;

  const headerB64 = base64UrlEncode({ alg: 'HS256', typ: 'STUPA-SESSION' });
  const payloadB64 = base64UrlEncode({
    uid: cleanUser.uid,
    email: cleanUser.email,
    displayName: cleanUser.displayName,
    photoURL: cleanUser.photoURL,
    provider: cleanUser.provider || 'google',
    iat: now,
    exp,
  });

  const signingInput = `${headerB64}.${payloadB64}`;
  const sigB64 = base64UrlEncode(
    crypto.createHmac('sha256', secret).update(signingInput, 'utf8').digest(),
  );

  return `${signingInput}.${sigB64}`;
}

/**
 * Verifies an HMAC-SHA256 session token and returns the user payload or `null`.
 */
export function verifySessionToken(token, options = {}) {
  if (typeof token !== 'string') return null;
  const trimmed = token.trim();
  if (!trimmed || trimmed.length > 4096) return null;

  const secret = String(
    options.secret || process.env.STUPA_AUTH_SECRET || DEFAULT_RUNTIME_SECRET,
  );
  const now = Number(options.now) || Date.now();

  const parts = trimmed.split('.');
  let signingInput = '';
  let payloadB64 = '';
  let sigB64 = '';

  if (parts.length === 3) {
    signingInput = `${parts[0]}.${parts[1]}`;
    payloadB64 = parts[1];
    sigB64 = parts[2];
  } else if (parts.length === 2) {
    signingInput = parts[0];
    payloadB64 = parts[0];
    sigB64 = parts[1];
  } else {
    return null;
  }

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(signingInput, 'utf8')
    .digest();
  const actualSig = base64UrlDecodeToBuffer(sigB64);

  if (
    expectedSig.length === 0 ||
    expectedSig.length !== actualSig.length ||
    !crypto.timingSafeEqual(expectedSig, actualSig)
  ) {
    return null;
  }

  const payload = decodeJwtPart(payloadB64);
  if (!payload) return null;

  const expRaw = Number(payload.exp);
  if (!Number.isFinite(expRaw)) return null;
  const expMs = expRaw < 1e11 ? expRaw * 1000 : expRaw;
  if (expMs <= now) {
    return null;
  }

  const cleanUser = sanitizeUserProfile(payload);
  if (!cleanUser) return null;

  return {
    ...cleanUser,
    iat: Number(payload.iat) || now,
    exp: expMs,
  };
}

/**
 * Extracts and verifies the authenticated user from an HTTP request's headers.
 */
export function extractAuthUser(req, authManager = null) {
  if (!req || !req.headers) return null;
  const authHeader =
    req.headers.authorization ||
    req.headers.Authorization ||
    '';
  const sessionHeader =
    req.headers['x-stupa-session'] ||
    req.headers['X-Stupa-Session'] ||
    '';

  let token = '';
  if (typeof authHeader === 'string' && authHeader.trim()) {
    const raw = authHeader.trim();
    token = raw.toLowerCase().startsWith('bearer ')
      ? raw.slice(7).trim()
      : raw;
  } else if (typeof sessionHeader === 'string' && sessionHeader.trim()) {
    token = sessionHeader.trim();
  }

  if (!token) return null;

  const verified = authManager?.verifySessionToken
    ? authManager.verifySessionToken(token)
    : verifySessionToken(token);

  if (!verified) return null;

  return {
    uid: verified.uid,
    email: verified.email,
    displayName: verified.displayName,
    photoURL: verified.photoURL,
    provider: verified.provider || 'google',
  };
}

export function createAuthManager(defaultOptions = {}) {
  const secret =
    defaultOptions.secret ||
    process.env.STUPA_AUTH_SECRET ||
    DEFAULT_RUNTIME_SECRET;
  const ttlMs =
    defaultOptions.ttlMs !== undefined
      ? Number(defaultOptions.ttlMs)
      : DEFAULT_SESSION_TTL_MS;

  const mergedOpts = (overrides = {}) => ({
    ...defaultOptions,
    secret,
    ttlMs,
    ...overrides,
  });

  async function authenticateGoogle({ idToken, devProfile, now } = {}, overrides = {}) {
    const opts = mergedOpts(now !== undefined ? { ...overrides, now } : overrides);
    let user = null;
    if (idToken) {
      user = await verifyGoogleIdToken(idToken, opts);
    } else if (devProfile) {
      user = await verifyGoogleIdToken({ devProfile }, opts);
    }

    if (!user) {
      return {
        ok: false,
        status: 401,
        error: 'invalid-auth-token',
      };
    }

    const sessionToken = issueSessionToken(user, opts);
    const decoded = verifySessionToken(sessionToken, opts);

    return {
      ok: true,
      user,
      sessionToken,
      expiresAt: decoded?.exp || (Number(opts.now) || Date.now()) + opts.ttlMs,
    };
  }

  return {
    verifyGoogleIdToken: (idToken, overrides) =>
      verifyGoogleIdToken(idToken, mergedOpts(overrides)),
    issueSessionToken: (user, overrides) =>
      issueSessionToken(user, mergedOpts(overrides)),
    verifySessionToken: (token, overrides) =>
      verifySessionToken(token, mergedOpts(overrides)),
    extractAuthUser: (req) =>
      extractAuthUser(req, {
        verifySessionToken: (token) => verifySessionToken(token, mergedOpts()),
      }),
    authenticateGoogle,
  };
}
