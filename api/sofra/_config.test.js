'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === './_redis' && parent?.filename?.endsWith('/api/sofra/_config.js')) {
    return { hgetall: async () => ({}), hset: async () => undefined };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const { DEFAULTS, sanitizeSection } = require('./_config');
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
