'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// This lightweight source-level guard catches accidental drift between the
// dashboard's ticket panel copy and Sofra's canonical Discord panel while the
// API module remains coupled to Vercel request/Discord helpers.
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'guild.js'), 'utf8');

test('ticket panel keeps Sofra banner and canonical support copy', () => {
  assert.match(source, /TICKET_PANEL_BANNER/);
  assert.match(source, /1,000–100,000 Robux/);
  assert.match(source, /One open ticket per type, per member • Sofra ♡/);
});

test('enabled tickets require at least one ticket type', () => {
  assert.match(source, /Enabled tickets require at least one ticket type/);
});
