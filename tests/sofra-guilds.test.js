'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function responseRecorder() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('guild picker still loads when bot installation probes are unavailable', async () => {
  const authPath = require.resolve('../api/sofra/_auth');
  const guildsPath = require.resolve('../api/sofra/guilds');
  const originalAuth = require.cache[authPath];

  require.cache[authPath] = {
    id: authPath,
    filename: authPath,
    loaded: true,
    exports: {
      requireSession: async () => ({ user: { id: '1' }, csrf: 'csrf' }),
      getUserGuilds: async () => [
        { id: '12345678901234567', name: 'Test server', icon: null, iconUrl: null, manageable: true }
      ],
      getBotGuildIds: async () => { throw Object.assign(new Error('Discord unavailable'), { status: 503 }); }
    }
  };
  delete require.cache[guildsPath];

  try {
    const handler = require('../api/sofra/guilds');
    const response = responseRecorder();
    await handler({ method: 'GET' }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.installationStatusAvailable, false);
    assert.equal(response.body.guilds[0].botInstalled, null);
  } finally {
    delete require.cache[guildsPath];
    if (originalAuth) require.cache[authPath] = originalAuth;
    else delete require.cache[authPath];
  }
});
