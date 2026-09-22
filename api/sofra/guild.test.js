'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// These lightweight source-level guards catch accidental drift in the API
// wiring while the pure Discord permission logic is covered separately.
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'guild.js'), 'utf8');

test('ticket panel uses server-neutral support copy without expiring banners', () => {
  assert.doesNotMatch(source, /TICKET_PANEL_BANNER|Robux|Player Reports/);
  assert.match(source, /Never share passwords or tokens/);
  assert.match(source, /One open ticket per type, per member • Sofra ♡/);
});

test('guild writes resolve actor and bot members before validating settings', () => {
  assert.match(source, /request\.method === 'PUT' \? access\.session\.user\.id : null/);
  assert.match(source, /members\/\$\{botUserId\}/);
  assert.match(source, /members\/\$\{actorId\}/);
  assert.match(source, /validateConfigReferences\(section, next, config\[section\], metadata\)/);
});
