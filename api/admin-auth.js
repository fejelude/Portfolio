const {
  clearAdminCookie,
  clearFailedAttempts,
  getAttemptState,
  getHeader,
  isConfigured,
  recordFailedAttempt,
  setAdminCookie,
  verifyPassword
} = require('./admin-session');

const ACTIVITY_KEY = 'portfolio:activity';

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

function safeText(value, max = 180) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function getClientIp(request) {
  const forwardedFor = getHeader(request, 'x-forwarded-for');
  if (forwardedFor) return safeText(forwardedFor.split(',')[0], 80);
  return safeText(getHeader(request, 'x-real-ip') || getHeader(request, 'cf-connecting-ip'), 80);
}

function parseUserAgent(userAgent) {
  const ua = userAgent || '';
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';

  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\//.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/(iPhone|iPad|iPod)/i.test(ua)) os = 'iOS';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  if (/(iPad|Tablet)/i.test(ua)) device = 'Tablet';
  else if (/(Mobile|Android|iPhone|iPod)/i.test(ua)) device = 'Mobile';

  return { browser, os, device };
}

function hasUpstash() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function upstashCommand(command) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });

  if (!response.ok) {
    throw new Error(`Upstash request failed with ${response.status}`);
  }

  return response.json();
}

async function recordSecurityEvent(request, type) {
  const userAgent = safeText(getHeader(request, 'user-agent'), 600);
  const parsedAgent = parseUserAgent(userAgent);
  const now = new Date().toISOString();
  const event = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    path: '/admin',
    title: 'Admin Panel',
    section: 'security',
    referrer: safeText(getHeader(request, 'referer'), 240),
    sessionId: '',
    timestamp: now,
    receivedAt: now,
    ip: getClientIp(request),
    location: {
      country: safeText(getHeader(request, 'x-vercel-ip-country'), 80),
      region: safeText(getHeader(request, 'x-vercel-ip-country-region'), 80),
      city: safeText(getHeader(request, 'x-vercel-ip-city'), 80)
    },
    device: parsedAgent.device,
    browser: parsedAgent.browser,
    os: parsedAgent.os,
    userAgent,
    viewport: { width: null, height: null },
    details: { simulation: '', arcadeTheme: '' }
  };

  if (hasUpstash()) {
    await upstashCommand(['LPUSH', ACTIVITY_KEY, JSON.stringify(event)]);
    await upstashCommand(['LTRIM', ACTIVITY_KEY, 0, 499]);
    return;
  }

  if (!globalThis.__portfolioActivityLogs) globalThis.__portfolioActivityLogs = [];
  globalThis.__portfolioActivityLogs.unshift(event);
  globalThis.__portfolioActivityLogs.length = Math.min(globalThis.__portfolioActivityLogs.length, 500);
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

  if (!isConfigured()) {
    return response.redirect(303, '/admin?setup=1');
  }

  const attempt = getAttemptState(request);
  if (attempt.blocked) {
    await recordSecurityEvent(request, 'admin_cooldown');
    return response.redirect(303, `/admin?cooldown=${Math.ceil(attempt.remainingMs / 1000)}`);
  }

  const password = body.password || body.token || '';
  if (!verifyPassword(password)) {
    recordFailedAttempt(request);
    await recordSecurityEvent(request, 'admin_failed_login');
    clearAdminCookie(request, response);
    return response.redirect(303, '/admin?error=1');
  }

  clearFailedAttempts(request);
  setAdminCookie(request, response);
  await recordSecurityEvent(request, 'admin_login');
  return response.redirect(303, '/admin?unlocked=1');
};
