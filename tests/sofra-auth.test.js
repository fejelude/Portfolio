'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { canManageGuild, botInstallUrl, getBotGuildIds } = require('../api/sofra/_auth');

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
