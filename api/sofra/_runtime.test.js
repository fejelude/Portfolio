'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { summarizeRuntime } = require('./_runtime');

test('only fresh acknowledgements of the exact configuration are applied', () => {
  const value = JSON.stringify({ enabled: true });
  const applied = { welcome: createHash('sha256').update(value).digest('hex') };
  const raw = JSON.stringify({ lastSyncedAt: 1000, applied });
  assert.equal(summarizeRuntime(raw, { welcome: value }, 2000).sections.welcome, 'applied');
  assert.equal(summarizeRuntime(raw, { welcome: '{"enabled":false}' }, 2000).sections.welcome, 'pending');
  assert.equal(summarizeRuntime(raw, { welcome: value }, 200000).state, 'unknown');
  assert.equal(summarizeRuntime('invalid', { welcome: value }).state, 'unknown');
  assert.equal(summarizeRuntime(raw, { welcome: value }, 500).state, 'unknown');
});
