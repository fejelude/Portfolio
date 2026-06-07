const { isAuthorized } = require('./admin-session');
const { readLogs, saveLog } = require('./activity-store');

function getHeader(request, name) {
  const headers = request.headers || {};
  return headers[name] || headers[name.toLowerCase()] || '';
}

function json(response, status, payload) {
  response.setHeader('Cache-Control', 'no-store');
  response.status(status).json(payload);
}

function safeText(value, max = 180) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
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

function getClientIp(request) {
  const forwardedFor = getHeader(request, 'x-forwarded-for');
  if (forwardedFor) return safeText(forwardedFor.split(',')[0], 80);
  return safeText(getHeader(request, 'x-real-ip') || getHeader(request, 'cf-connecting-ip'), 80);
}

function decodeHeader(value) {
  try {
    return decodeURIComponent(value || '');
  } catch (error) {
    return value || '';
  }
}

function getLocation(request) {
  return {
    country: safeText(getHeader(request, 'x-vercel-ip-country'), 80),
    region: safeText(getHeader(request, 'x-vercel-ip-country-region'), 80),
    city: safeText(decodeHeader(getHeader(request, 'x-vercel-ip-city')), 80)
  };
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

function makeLog(request, body) {
  const userAgent = safeText(getHeader(request, 'user-agent') || body.userAgent, 600);
  const parsedAgent = parseUserAgent(userAgent);
  const now = new Date().toISOString();

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: safeText(body.type || 'page_view', 60),
    path: safeText(body.path || '/', 240),
    title: safeText(body.title || '', 160),
    section: safeText(body.section || body.details?.section || '', 80),
    referrer: safeText(body.referrer || getHeader(request, 'referer'), 240),
    sessionId: safeText(body.sessionId || '', 80),
    timestamp: safeText(body.timestamp || now, 40),
    receivedAt: now,
    ip: getClientIp(request),
    location: getLocation(request),
    device: safeText(body.device || parsedAgent.device, 40),
    browser: safeText(parsedAgent.browser, 40),
    os: safeText(parsedAgent.os, 40),
    userAgent,
    viewport: {
      width: Number(body.viewport?.width) || null,
      height: Number(body.viewport?.height) || null
    },
    details: {
      simulation: safeText(body.simulation || body.details?.simulation || '', 80),
      arcadeTheme: safeText(body.arcadeTheme || body.details?.arcadeTheme || '', 80)
    }
  };
}

function summarize(logs, storage) {
  const by = (selector) => logs.reduce((acc, log) => {
    const key = selector(log) || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    source: storage.source,
    persistent: storage.persistent,
    limit: storage.limit,
    warning: storage.warning,
    total: logs.length,
    sessions: new Set(logs.map((log) => log.sessionId).filter(Boolean)).size,
    arcadeEvents: logs.filter((log) => log.section === 'arcade' || log.type.startsWith('arcade_')).length,
    securityEvents: logs.filter((log) => log.section === 'security' || log.type.startsWith('admin_')).length,
    pages: by((log) => log.path),
    devices: by((log) => log.device),
    browsers: by((log) => log.browser),
    operatingSystems: by((log) => log.os),
    countries: by((log) => log.location?.country)
  };
}

module.exports = async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.setHeader('Allow', 'GET, POST, OPTIONS');
    return response.status(204).end();
  }

  if (request.method === 'POST') {
    try {
      const body = readBody(request);
      const log = makeLog(request, body);
      const storage = await saveLog(log);
      return json(response, 201, { ok: true, storage });
    } catch (error) {
      return json(response, 500, { ok: false, error: 'Unable to record activity.' });
    }
  }

  if (request.method === 'GET') {
    if (!isAuthorized(request)) {
      return json(response, 401, { ok: false, error: 'Unauthorized' });
    }

    try {
      const storage = await readLogs();
      const { logs } = storage;
      return json(response, 200, {
        ok: true,
        logs,
        summary: summarize(logs, storage),
        storage: {
          source: storage.source,
          persistent: storage.persistent,
          limit: storage.limit,
          warning: storage.warning
        }
      });
    } catch (error) {
      return json(response, 500, { ok: false, error: 'Unable to load activity logs.' });
    }
  }

  response.setHeader('Allow', 'GET, POST, OPTIONS');
  return json(response, 405, { ok: false, error: 'Method not allowed' });
};
