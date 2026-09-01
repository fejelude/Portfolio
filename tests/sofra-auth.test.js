'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { canManageGuild, botInstallUrl } = require('../api/sofra/_auth');

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
