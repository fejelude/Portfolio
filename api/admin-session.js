const crypto = require('crypto');

const COOKIE_NAME = 'portfolio_admin';
const MAX_AGE_SECONDS = 60 * 60 * 12;
const MAX_FAILURES = 5;
const COOLDOWN_MS = 60 * 1000;

function getHeader(request, name) {
  const headers = request.headers || {};
  return headers[name] || headers[name.toLowerCase()] || '';
}

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((cookies, pair) => {
    const index = pair.indexOf('=');
    if (index === -1) return cookies;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function getAdminPassword() {
  return process.env.ADMIN_ACCESS_PASSWORD || process.env.ADMIN_ACCESS_TOKEN || '';
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || getAdminPassword();
}

function isConfigured() {
  return Boolean(getAdminPassword());
}

function safeEquals(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifyPassword(value) {
  return safeEquals(value, getAdminPassword());
}

function sign(value) {
  return crypto.createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

function createSessionValue() {
  const issuedAt = Date.now();
  const nonce = crypto.randomBytes(16).toString('base64url');
  const payload = `${issuedAt}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

function readSession(request) {
  const cookies = parseCookies(getHeader(request, 'cookie'));
  return cookies[COOKIE_NAME] || '';
}

function isAuthorized(request) {
  const session = readSession(request);
  if (!session || !getSessionSecret()) return false;

  const parts = session.split('.');
  if (parts.length !== 3) return false;

  const payload = `${parts[0]}.${parts[1]}`;
  if (!safeEquals(parts[2], sign(payload))) return false;

  const issuedAt = Number(parts[0]);
  return Number.isFinite(issuedAt) && Date.now() - issuedAt <= MAX_AGE_SECONDS * 1000;
}

function cookieSecureFlag(request) {
  const host = getHeader(request, 'host');
  const isLocal = /^localhost(:\d+)?$/.test(host) || /^127\.0\.0\.1(:\d+)?$/.test(host);
  return isLocal ? '' : '; Secure';
}

function setAdminCookie(request, response) {
  response.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${encodeURIComponent(createSessionValue())}; HttpOnly${cookieSecureFlag(request)}; SameSite=Strict; Path=/; Max-Age=${MAX_AGE_SECONDS}`
  ]);
}

function clearAdminCookie(request, response) {
  response.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=; HttpOnly${cookieSecureFlag(request)}; SameSite=Strict; Path=/; Max-Age=0`
  ]);
}

function failureStore() {
  if (!globalThis.__portfolioAdminFailures) {
    globalThis.__portfolioAdminFailures = new Map();
  }
  return globalThis.__portfolioAdminFailures;
}

function clientKey(request) {
  const forwardedFor = getHeader(request, 'x-forwarded-for');
  return (forwardedFor ? forwardedFor.split(',')[0] : getHeader(request, 'x-real-ip')) || 'unknown';
}

function getAttemptState(request) {
  const key = clientKey(request);
  const item = failureStore().get(key);
  if (!item) return { key, blocked: false, remainingMs: 0 };

  const remainingMs = item.blockedUntil - Date.now();
  if (remainingMs <= 0) {
    failureStore().delete(key);
    return { key, blocked: false, remainingMs: 0 };
  }

  return { key, blocked: true, remainingMs };
}

function recordFailedAttempt(request) {
  const key = clientKey(request);
  const store = failureStore();
  const current = store.get(key) || { count: 0, blockedUntil: 0 };
  const count = current.count + 1;
  store.set(key, {
    count,
    blockedUntil: count >= MAX_FAILURES ? Date.now() + COOLDOWN_MS : 0
  });
}

function clearFailedAttempts(request) {
  failureStore().delete(clientKey(request));
}

module.exports = {
  COOKIE_NAME,
  MAX_AGE_SECONDS,
  getHeader,
  isConfigured,
  verifyPassword,
  isAuthorized,
  setAdminCookie,
  clearAdminCookie,
  getAttemptState,
  recordFailedAttempt,
  clearFailedAttempts
};
