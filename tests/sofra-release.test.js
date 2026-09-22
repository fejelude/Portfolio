'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { discordFetch } = require('../api/sofra/_auth');
const { sanitizeSection, DEFAULTS } = require('../api/sofra/_config');

test('Discord mutation requests are never blindly retried', async () => {
  const original = global.fetch; let calls = 0;
  global.fetch = async () => { calls++; throw new Error('network interruption'); };
  try { await assert.rejects(discordFetch('/channels/123/messages', { method: 'POST' })); assert.equal(calls, 1); }
  finally { global.fetch = original; }
});
test('long Discord rate limits are returned without retrying early', async () => {
  const original = global.fetch; let calls = 0;
  global.fetch = async () => { calls++; return { ok: false, status: 429, text: async () => '{"retry_after":30}', headers: { get: () => null } }; };
  try { await assert.rejects(discordFetch('/guilds/123'), (error) => error.retryAfter === 30); assert.equal(calls, 1); }
  finally { global.fetch = original; }
});
test('dashboard validates new safety settings and keeps defaults opt-in', () => {
  const value = sanitizeSection('automod', { dryRun: true, spamEnabled: true, messageLimit: 1, mentionLimit: 999 }, DEFAULTS.automod);
  assert.equal(value.dryRun, true); assert.equal(value.spamEnabled, true);
  assert.equal(value.messageLimit, 3); assert.equal(value.mentionLimit, 20);
  assert.equal(DEFAULTS.automod.spamEnabled, false);
});
test('public Sofra page and existing dashboard have distinct routes', () => {
  const routes = require('../vercel.json').rewrites;
  assert.equal(routes.find((r) => r.source === '/sofra').destination, '/SofraPanel');
  assert.equal(routes.find((r) => r.source === '/sofra/about').destination, '/Sofra');
  const html = fs.readFileSync(path.join(__dirname, '../SofraPanel.html'), 'utf8');
  assert.match(html, /sofra-panel-core.js" defer/);
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../sofra-panel.js'), 'utf8'), /document\.write/);
});
