'use strict';

const crypto = require('node:crypto');

const SESSION_COOKIE = 'sofra_session';
const STATE_COOKIE = 'sofra_oauth_state';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const SESSION_TTL_MILLISECONDS = SESSION_TTL_SECONDS * 1000;
const SESSION_COOKIE_VERSION = 'v1';
const DISCORD_API = 'https://discord.com/api/v10';
const ADMINISTRATOR = 1n << 3n;
const MANAGE_GUILD = 1n << 5n;

function requiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required for Sofra Panel.`);
  return value;
}

function parseCookies(request) {
  const raw = String(request.headers?.cookie || '');
  const out = {};
  for (const pair of raw.split(';')) {
    const index = pair.indexOf('=');
    if (index < 0) continue;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (!key) continue;
    try { out[key] = decodeURIComponent(value); } catch { out[key] = value; }
  }
  return out;
}

function appendSetCookie(response, cookieValue) {
  const existing = response.getHeader('Set-Cookie');
  const values = existing ? (Array.isArray(existing) ? existing : [existing]) : [];
  response.setHeader('Set-Cookie', [...values, cookieValue]);
}

function cookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (process.env.NODE_ENV !== 'development') parts.push('Secure');
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  return parts.join('; ');
}

function setStateCookie(response, state) {
  appendSetCookie(response, cookie(STATE_COOKIE, state, { maxAge: 600 }));
}

function clearStateCookie(response) {
  appendSetCookie(response, cookie(STATE_COOKIE, '', { maxAge: 0 }));
}

function sessionSecret() {
  return requiredEnv('SOFRA_SESSION_SECRET');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sessionEncryptionKey() {
  return crypto.createHash('sha256').update(sessionSecret()).digest();
}

function encodeSessionCookie(session) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sessionEncryptionKey(), iv);
  cipher.setAAD(Buffer.from(`sofra-session:${SESSION_COOKIE_VERSION}`));
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(session), 'utf8')),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return [
    SESSION_COOKIE_VERSION,
    iv.toString('base64url'),
    encrypted.toString('base64url'),
    tag.toString('base64url')
  ].join('.');
}

function decodeSessionCookie(raw) {
  if (!raw) return null;
  const parts = String(raw).split('.');
  if (parts.length !== 4 || parts[0] !== SESSION_COOKIE_VERSION) return null;
  try {
    const iv = Buffer.from(parts[1], 'base64url');
    const encrypted = Buffer.from(parts[2], 'base64url');
    const tag = Buffer.from(parts[3], 'base64url');
    if (iv.length !== 12 || tag.length !== 16 || encrypted.length === 0) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', sessionEncryptionKey(), iv);
    decipher.setAAD(Buffer.from(`sofra-session:${SESSION_COOKIE_VERSION}`));
    decipher.setAuthTag(tag);
    const session = JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8'));
    const createdAt = Number(session?.createdAt || 0);
    if (!Number.isFinite(createdAt) || createdAt <= 0 || Date.now() - createdAt > SESSION_TTL_MILLISECONDS) return null;
    return session;
  } catch {
    return null;
  }
}

function setSessionCookie(response, session) {
  appendSetCookie(response, cookie(SESSION_COOKIE, encodeSessionCookie(session), { maxAge: SESSION_TTL_SECONDS }));
}

function clearSessionCookie(response) {
  appendSetCookie(response, cookie(SESSION_COOKIE, '', { maxAge: 0 }));
}

function configuredPublicBaseUrl() {
  const raw = String(process.env.SOFRA_PUBLIC_URL || '').trim();
  if (!raw) return null;

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('SOFRA_PUBLIC_URL must be an absolute URL such as https://example.com.');
  }

  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('SOFRA_PUBLIC_URL must be a plain HTTP(S) origin without credentials, query parameters, or fragments.');
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    throw new Error('SOFRA_PUBLIC_URL must be an origin only, without a path.');
  }
  if (url.protocol !== 'https:' && process.env.NODE_ENV !== 'development') {
    throw new Error('SOFRA_PUBLIC_URL must use HTTPS outside local development.');
  }

  return url.origin;
}

function requestOrigin(request) {
  const host = String(request.headers?.['x-forwarded-host'] || request.headers?.host || '')
    .split(',')[0]
    .trim();
  const proto = String(request.headers?.['x-forwarded-proto'] || 'https')
    .split(',')[0]
    .trim()
    .toLowerCase();

  if (!host) throw new Error('Unable to determine Sofra Panel public URL.');

  let url;
  try {
    url = new URL(`${proto}://${host}`);
  } catch {
    throw new Error('Unable to determine Sofra Panel public URL.');
  }
  if (!['https:', 'http:'].includes(url.protocol)) {
    throw new Error('Unable to determine Sofra Panel public URL.');
  }

  return url.origin;
}

function publicBaseUrl(request) {
  return configuredPublicBaseUrl() || requestOrigin(request);
}

function canonicalLoginUrl(request) {
  const configured = configuredPublicBaseUrl();
  if (!configured) return null;
  const current = requestOrigin(request);
  return current === configured ? null : `${configured}/api/sofra/auth/login`;
}

function redirectUri(request) {
  return `${publicBaseUrl(request)}/api/sofra/auth/callback`;
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function shouldRetryDiscordStatus(status) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function discordFetch(path, options = {}) {
  let lastError = null;
  // A timed-out POST may already have succeeded. Replaying it can duplicate
  // ticket panels or consume an OAuth code twice.
  const retrySafe = ['GET', 'HEAD'].includes(String(options.method || 'GET').toUpperCase());

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${DISCORD_API}${path}`, {
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options.headers || {})
        },
        signal: options.signal || AbortSignal.timeout(12000)
      });
      const text = await response.text();
      let body = null;
      try { body = text ? JSON.parse(text) : null; } catch { body = text; }

      if (response.ok) return body;

      const error = new Error(`Discord API request failed with HTTP ${response.status}.`);
      error.status = response.status;
      error.body = body;
      lastError = error;

      if (!retrySafe || !shouldRetryDiscordStatus(response.status) || attempt === 2) throw error;

      const retryAfterSeconds = Number(body?.retry_after || response.headers.get('retry-after') || 0);
      if (retryAfterSeconds > 2.5) { error.retryAfter = retryAfterSeconds; throw error; }
      const waitMs = retryAfterSeconds > 0
        ? Math.max(250, retryAfterSeconds * 1000)
        : 250 * (attempt + 1);
      await sleep(waitMs);
    } catch (error) {
      lastError = error;
      const status = Number(error?.status || 0);
      const transient = status === 0 || shouldRetryDiscordStatus(status);
      if (!retrySafe || error.retryAfter || !transient || attempt === 2) {
        if (!error.status) error.status = 503;
        throw error;
      }
      await sleep(250 * (attempt + 1));
    }
  }

  if (lastError && !lastError.status) lastError.status = 503;
  throw lastError || new Error('Discord API request failed.');
}

async function exchangeCode(request, code) {
  const form = new URLSearchParams({
    client_id: requiredEnv('DISCORD_CLIENT_ID'),
    client_secret: requiredEnv('DISCORD_CLIENT_SECRET'),
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(request)
  });
  return discordFetch('/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form
  });
}

async function refreshAccessToken(session) {
  const form = new URLSearchParams({
    client_id: requiredEnv('DISCORD_CLIENT_ID'),
    client_secret: requiredEnv('DISCORD_CLIENT_SECRET'),
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken
  });
  const tokens = await discordFetch('/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form
  });
  return {
    ...session,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || session.refreshToken,
    expiresAt: Date.now() + Math.max(60, Number(tokens.expires_in || 3600)) * 1000
  };
}

async function createSession(response, tokens, user) {
  const now = Date.now();
  const session = {
    user: {
      id: user.id,
      username: user.username,
      globalName: user.global_name || user.username,
      avatar: user.avatar || null
    },
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: now + Math.max(60, Number(tokens.expires_in || 3600)) * 1000,
    csrf: randomToken(24),
    createdAt: now,
    lastSeenAt: now
  };
  setSessionCookie(response, session);
  return session;
}

async function loadSession(request, response) {
  const rawCookie = parseCookies(request)[SESSION_COOKIE];
  let session = decodeSessionCookie(rawCookie);
  if (!session?.accessToken || !session?.refreshToken || !session?.user?.id || !session?.csrf) {
    if (response && rawCookie) clearSessionCookie(response);
    return null;
  }

  if (Number(session.expiresAt || 0) <= Date.now() + 90_000) {
    try {
      session = await refreshAccessToken(session);
      session.lastSeenAt = Date.now();
      if (response) setSessionCookie(response, session);
    } catch (error) {
      const status = Number(error?.status || 0);
      if (status === 400 || status === 401) {
        if (response) clearSessionCookie(response);
        return null;
      }
      throw error;
    }
  }

  return session;
}

async function destroySession(_request, response) {
  clearSessionCookie(response);
}

function canManageGuild(guild) {
  if (guild?.owner === true) return true;
  let permissions = 0n;
  try { permissions = BigInt(guild?.permissions || '0'); } catch { return false; }
  return (permissions & ADMINISTRATOR) === ADMINISTRATOR || (permissions & MANAGE_GUILD) === MANAGE_GUILD;
}

function guildIconUrl(guild) {
  if (!guild?.id || !guild?.icon) return null;
  const extension = String(guild.icon).startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${extension}?size=128`;
}

async function getUserGuilds(session, response = null) {
  const fetchGuilds = () => discordFetch('/users/@me/guilds', {
    headers: { Authorization: `Bearer ${session.accessToken}` }
  });

  let guilds;
  try {
    guilds = await fetchGuilds();
  } catch (error) {
    if (Number(error?.status || 0) !== 401 || !session?.refreshToken) throw error;

    const refreshed = await refreshAccessToken(session);
    Object.assign(session, refreshed, { lastSeenAt: Date.now() });
    if (response) setSessionCookie(response, session);
    guilds = await fetchGuilds();
  }

  return guilds.map((guild) => ({
    id: guild.id,
    name: guild.name,
    icon: guild.icon || null,
    iconUrl: guildIconUrl(guild),
    owner: guild.owner === true,
    permissions: String(guild.permissions || '0'),
    manageable: canManageGuild(guild)
  }));
}

async function requireSession(request, response) {
  const session = await loadSession(request, response);
  if (!session) {
    response.status(401).json({ ok: false, error: 'Please sign in with Discord first.' });
    return null;
  }
  return session;
}

async function requireGuildAccess(request, response, guildId) {
  if (!/^\d{17,20}$/.test(String(guildId || ''))) {
    response.status(400).json({ ok: false, error: 'A valid Discord server ID is required.' });
    return null;
  }
  const session = await requireSession(request, response);
  if (!session) return null;
  const guilds = await getUserGuilds(session, response);
  const guild = guilds.find((item) => item.id === guildId && item.manageable);
  if (!guild) {
    response.status(403).json({ ok: false, error: 'You no longer have Manage Server or Administrator permission in this server.' });
    return null;
  }
  return { session, guild };
}

async function isBotInstalled(guildId) {
  try {
    await botFetch(`/guilds/${guildId}`);
    return true;
  } catch (error) {
    if (error.status === 403 || error.status === 404) return false;
    throw error;
  }
}

async function getBotGuildIds() {
  const guilds = await botFetch('/users/@me/guilds?limit=200');
  return new Set(guilds.map((guild) => String(guild.id)));
}

async function requireInstalledGuildAccess(request, response, guildId) {
  const access = await requireGuildAccess(request, response, guildId);
  if (!access) return null;
  if (!await isBotInstalled(guildId)) {
    response.status(409).json({ ok: false, error: 'Sofra is not installed in this server. Add Sofra before opening its configuration.' });
    return null;
  }
  return access;
}

function botInstallUrl(guildId) {
  const authorize = new URL('https://discord.com/oauth2/authorize');
  authorize.searchParams.set('client_id', requiredEnv('DISCORD_CLIENT_ID'));
  authorize.searchParams.set('scope', 'bot applications.commands');
  authorize.searchParams.set('guild_id', guildId);
  authorize.searchParams.set('disable_guild_select', 'true');
  authorize.searchParams.set('permissions', String(process.env.SOFRA_BOT_PERMISSIONS || '0'));
  return authorize.toString();
}

function requireCsrf(request, response, session) {
  const provided = String(request.headers?.['x-sofra-csrf'] || '');
  if (!provided || !safeEqual(provided, session.csrf || '')) {
    response.status(403).json({ ok: false, error: 'Your dashboard session could not be verified. Refresh the page and try again.' });
    return false;
  }
  return true;
}

async function botFetch(path, options = {}) {
  const token = String(process.env.DISCORD_BOT_TOKEN || '').trim();
  if (!token) {
    const error = new Error('DISCORD_BOT_TOKEN is not configured on the website deployment.');
    error.status = 503;
    throw error;
  }
  return discordFetch(path, {
    ...options,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

module.exports = {
  STATE_COOKIE,
  parseCookies,
  setStateCookie,
  clearStateCookie,
  setSessionCookie,
  clearSessionCookie,
  configuredPublicBaseUrl,
  requestOrigin,
  publicBaseUrl,
  canonicalLoginUrl,
  redirectUri,
  randomToken,
  discordFetch,
  exchangeCode,
  createSession,
  loadSession,
  destroySession,
  getUserGuilds,
  canManageGuild,
  requireSession,
  requireGuildAccess,
  requireInstalledGuildAccess,
  requireCsrf,
  botFetch,
  isBotInstalled,
  getBotGuildIds,
  botInstallUrl,
  requiredEnv
};
