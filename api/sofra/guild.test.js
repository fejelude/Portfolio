'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// These lightweight source-level guards catch accidental drift in the API
// wiring while the pure Discord permission logic is covered separately.
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'guild.js'), 'utf8');

test('ticket panel keeps Sofra banner and canonical support copy', () => {
  assert.match(source, /TICKET_PANEL_BANNER/);
  assert.match(source, /1,000–100,000 Robux/);
  assert.match(source, /One open ticket per type, per member • Sofra ♡/);
});

test('guild writes resolve actor and bot members before validating settings', () => {
  assert.match(source, /request\.method === 'PUT' \? access\.session\.user\.id : null/);
  assert.match(source, /members\/\$\{botUserId\}/);
  assert.match(source, /members\/\$\{actorId\}/);
  assert.match(source, /validateConfigReferences\(section, next, config\[section\], metadata\)/);
});
