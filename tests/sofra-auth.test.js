'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { canManageGuild, botInstallUrl, getBotGuildIds, publicBaseUrl, redirectUri, canonicalLoginUrl } = require('../api/sofra/_auth');
const loginHandler = require('../api/sofra/auth/login');
const callbackHandler = require('../api/sofra/auth/callback');

test('guild management accepts only owner, Administrator, or Manage Server', () => {
  assert.equal(canManageGuild({ owner: true, permissions: '0' }), true);
  assert.equal(canManageGuild({ permissions: String(1n << 3n) }), true);
  assert.equal(canManageGuild({ permissions: String(1n << 5n) }), true);
  assert.equal(canManageGuild({ permissions: String(1n << 10n) }), false);
  assert.equal(canManageGuild({ permissions: 'invalid' }), false);
});

test('installation URL is locked to the authorized guild and official scopes', () => {
  process.env.DISCORD_CLIENT_ID = '123456789012345678';
  process.env.SOFRA_BOT_PERMISSIONS = '42';
  const url = new URL(botInstallUrl('987654321098765432'));
  assert.equal(url.origin, 'https://discord.com');
  assert.equal(url.pathname, '/oauth2/authorize');
  assert.equal(url.searchParams.get('guild_id'), '987654321098765432');
  assert.equal(url.searchParams.get('disable_guild_select'), 'true');
  assert.equal(url.searchParams.get('scope'), 'bot applications.commands');
  assert.equal(url.searchParams.get('permissions'), '42');
});

test('bot installation status is fetched in one guild-list request', async () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.DISCORD_BOT_TOKEN;
  let request;
  process.env.DISCORD_BOT_TOKEN = 'test-token';
  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify([{ id: '123' }, { id: '456' }]),
      headers: { get: () => null }
    };
  };

  try {
    const ids = await getBotGuildIds();
    assert.deepEqual([...ids], ['123', '456']);
    assert.match(request.url, /\/users\/@me\/guilds\?limit=200$/);
    assert.equal(request.options.headers.Authorization, 'Bot test-token');
  } finally {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.DISCORD_BOT_TOKEN;
    else process.env.DISCORD_BOT_TOKEN = originalToken;
  }
});


function responseRecorder() {
  return {
    headers: {},
    getHeader(name) { return this.headers[name]; },
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    redirect(code, location) {
      this.statusCode = code;
      this.location = location;
      return this;
    }
  };
}

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

test('OAuth uses one canonical origin even when the site is opened through a Vercel alias', async () => {
  const originalPublicUrl = process.env.SOFRA_PUBLIC_URL;
  const originalClientId = process.env.DISCORD_CLIENT_ID;
  process.env.SOFRA_PUBLIC_URL = 'https://www.fejelude.xyz/';
  process.env.DISCORD_CLIENT_ID = '123456789012345678';

  try {
    const aliasRequest = {
      method: 'GET',
      headers: {
        host: 'itsmefeje-portfolio.vercel.app',
        'x-forwarded-proto': 'https'
      }
    };
    assert.equal(publicBaseUrl(aliasRequest), 'https://www.fejelude.xyz');
    assert.equal(redirectUri(aliasRequest), 'https://www.fejelude.xyz/api/sofra/auth/callback');
    assert.equal(canonicalLoginUrl(aliasRequest), 'https://www.fejelude.xyz/api/sofra/auth/login');

    const aliasResponse = responseRecorder();
    await loginHandler(aliasRequest, aliasResponse);
    assert.equal(aliasResponse.statusCode, 302);
    assert.equal(aliasResponse.location, 'https://www.fejelude.xyz/api/sofra/auth/login');
    assert.equal(aliasResponse.headers['Set-Cookie'], undefined, 'OAuth state must not be set on the alias host');

    const canonicalRequest = {
      method: 'GET',
      headers: {
        host: 'www.fejelude.xyz',
        'x-forwarded-proto': 'https'
      }
    };
    assert.equal(canonicalLoginUrl(canonicalRequest), null);

    const canonicalResponse = responseRecorder();
    await loginHandler(canonicalRequest, canonicalResponse);
    assert.equal(canonicalResponse.statusCode, 302);
    const authorize = new URL(canonicalResponse.location);
    assert.equal(authorize.origin, 'https://discord.com');
    assert.equal(authorize.pathname, '/oauth2/authorize');
    assert.equal(authorize.searchParams.get('redirect_uri'), 'https://www.fejelude.xyz/api/sofra/auth/callback');
    assert.match(String(canonicalResponse.headers['Set-Cookie']), /sofra_oauth_state=/);
  } finally {
    restoreEnv('SOFRA_PUBLIC_URL', originalPublicUrl);
    restoreEnv('DISCORD_CLIENT_ID', originalClientId);
  }
});

test('OAuth request origin handles forwarded proxy lists consistently', () => {
  const originalPublicUrl = process.env.SOFRA_PUBLIC_URL;
  delete process.env.SOFRA_PUBLIC_URL;

  try {
    const request = {
      headers: {
        'x-forwarded-host': 'www.fejelude.xyz, internal-proxy',
        'x-forwarded-proto': 'https, http'
      }
    };
    assert.equal(publicBaseUrl(request), 'https://www.fejelude.xyz');
    assert.equal(redirectUri(request), 'https://www.fejelude.xyz/api/sofra/auth/callback');
  } finally {
    restoreEnv('SOFRA_PUBLIC_URL', originalPublicUrl);
  }
});

test('Discord access denial returns to the panel with a useful auth result', async () => {
  const originalPublicUrl = process.env.SOFRA_PUBLIC_URL;
  process.env.SOFRA_PUBLIC_URL = 'https://www.fejelude.xyz';

  try {
    const response = responseRecorder();
    await callbackHandler({
      method: 'GET',
      headers: {
        host: 'www.fejelude.xyz',
        cookie: 'sofra_oauth_state=test-state'
      },
      query: {
        error: 'access_denied',
        state: 'test-state'
      }
    }, response);

    assert.equal(response.statusCode, 302);
    assert.equal(response.location, 'https://www.fejelude.xyz/sofra?auth=denied');
    assert.match(String(response.headers['Set-Cookie']), /sofra_oauth_state=/);
    assert.match(String(response.headers['Set-Cookie']), /Max-Age=0/);
  } finally {
    restoreEnv('SOFRA_PUBLIC_URL', originalPublicUrl);
  }
});

test('OAuth callback rejects a state cookie from a different origin/session', async () => {
  const originalPublicUrl = process.env.SOFRA_PUBLIC_URL;
  process.env.SOFRA_PUBLIC_URL = 'https://www.fejelude.xyz';

  try {
    const response = responseRecorder();
    await callbackHandler({
      method: 'GET',
      headers: {
        host: 'www.fejelude.xyz',
        cookie: 'sofra_oauth_state=old-state'
      },
      query: {
        code: 'unused-code',
        state: 'new-state'
      }
    }, response);

    assert.equal(response.statusCode, 302);
    assert.equal(response.location, 'https://www.fejelude.xyz/sofra?auth=invalid_state');
  } finally {
    restoreEnv('SOFRA_PUBLIC_URL', originalPublicUrl);
  }
});
