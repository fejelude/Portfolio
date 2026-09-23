'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { summarizeRuntime } = require('./_runtime');

test('global heartbeat keeps exact applied hashes live without per-guild polling', () => {
  const value = JSON.stringify({ enabled: true });
  const applied = { welcome: createHash('sha256').update(value).digest('hex') };
  const raw = JSON.stringify({ lastSyncedAt: 1000, applied });

  assert.equal(summarizeRuntime(raw, { welcome: value }, 2000, '1900').sections.welcome, 'applied');
  assert.equal(summarizeRuntime(raw, { welcome: '{"enabled":false}' }, 2000, '1900').sections.welcome, 'pending');
  assert.equal(summarizeRuntime(raw, { welcome: value }, 500000, '499900').state, 'recently-synced');
  assert.equal(summarizeRuntime(raw, { welcome: value }, 500000, '1000').state, 'unknown');
});

test('legacy per-guild heartbeat stays compatible during rollout', () => {
  const value = JSON.stringify({ enabled: true });
  const applied = { welcome: createHash('sha256').update(value).digest('hex') };
  const raw = JSON.stringify({ lastSyncedAt: 1000, applied });
  assert.equal(summarizeRuntime(raw, { welcome: value }, 2000).sections.welcome, 'applied');
  assert.equal(summarizeRuntime('invalid', { welcome: value }, 2000).state, 'unknown');
  assert.equal(summarizeRuntime(raw, { welcome: value }, 500).state, 'unknown');
});
