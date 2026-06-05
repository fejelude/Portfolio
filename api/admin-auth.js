const crypto = require('crypto');

function getEnvToken() {
  return process.env.ADMIN_ACCESS_TOKEN || '';
}

function readBody(request) {
  if (!request.body) return {};
  if (typeof request.body === 'object' && !Buffer.isBuffer(request.body)) return request.body;
  const raw = String(request.body || '');
  try {
    return JSON.parse(raw);
  } catch (error) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
}

function safeEquals(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getHeader(request, name) {
  const headers = request.headers || {};
  return headers[name] || headers[name.toLowerCase()] || '';
}

function cookieSecureFlag(request) {
  const host = getHeader(request, 'host');
  const isLocal = /^localhost(:\d+)?$/.test(host) || /^127\.0\.0\.1(:\d+)?$/.test(host);
  return isLocal ? '' : '; Secure';
}

function setAdminCookie(request, response, token) {
  response.setHeader('Set-Cookie', [
    `portfolio_admin=${encodeURIComponent(token)}; HttpOnly${cookieSecureFlag(request)}; SameSite=Strict; Path=/; Max-Age=86400`
  ]);
}

function clearAdminCookie(request, response) {
  response.setHeader('Set-Cookie', [
    `portfolio_admin=; HttpOnly${cookieSecureFlag(request)}; SameSite=Strict; Path=/; Max-Age=0`
  ]);
}

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = readBody(request);
  if (body.action === 'logout') {
    clearAdminCookie(request, response);
    return response.redirect(303, '/admin');
  }

  const token = getEnvToken();
  if (!token) {
    return response.redirect(303, '/admin?setup=1');
  }

  if (!safeEquals(body.token, token)) {
    clearAdminCookie(request, response);
    return response.redirect(303, '/admin?error=1');
  }

  setAdminCookie(request, response, token);
  return response.redirect(303, '/admin');
};
