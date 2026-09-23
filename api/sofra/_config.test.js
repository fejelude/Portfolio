'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

const transactions = [];
const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === './_redis' && parent?.filename?.endsWith('/api/sofra/_config.js')) {
    return {
      hgetall: async () => ({}),
      transaction: async (commands) => { transactions.push(commands); return ['OK', 1]; }
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const { DEFAULTS, DIRTY_GUILDS_KEY, sanitizeSection, writeSection } = require('./_config');
Module._load = originalLoad;

test('welcome defaults to Sofra randomized message mode', () => {
  assert.equal(DEFAULTS.welcome.randomMessages, true);
  const fixed = sanitizeSection('welcome', {
    randomMessages: false,
    messageTemplate: 'Hello {user.mention} ♡'
  }, DEFAULTS.welcome);
  assert.equal(fixed.randomMessages, false);
  assert.equal(fixed.messageTemplate, 'Hello {user.mention} ♡');
});

test('automod defaults match Sofra moderate preset', () => {
  const enabled = Object.entries(DEFAULTS.automod.categories)
    .filter(([, value]) => value.enabled)
    .map(([name]) => name)
    .sort();
  assert.deepEqual(enabled, [
    'custom', 'hate', 'insults', 'profanity', 'scam', 'severe_profanity',
    'sexual', 'sexual_harassment', 'threats'
  ]);
  assert.equal(DEFAULTS.automod.categories.toxic.enabled, false);
  assert.equal(DEFAULTS.automod.categories.spam.enabled, false);
});


test('dashboard writes config and dirty notification in one Redis transaction', async () => {
  transactions.length = 0;
  const guildId = '123456789012345678';
  await writeSection(guildId, 'autorole', { enabled: false, roleId: null });
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0][0][0], 'HSET');
  assert.equal(transactions[0][0][1], `sofra:guild:${guildId}:config`);
  assert.deepEqual(transactions[0][1], ['SADD', DIRTY_GUILDS_KEY, guildId]);
});
