import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { COMPENDIUM_ITEMS } from '../js/compendium-data.mjs';
const homepage = readFileSync(new URL('../sofhia-franchesca-16.html', import.meta.url), 'utf8');
const gallery = readFileSync(new URL('../compendium.html', import.meta.url), 'utf8');

test('new link follows album without replacing START, album or lily', () => {
  assert.match(homepage, /id="start"/);
  assert.match(homepage, /id="album-entry"/);
  assert.ok(homepage.indexOf('id="album-entry"') < homepage.indexOf('birthday__compendium-entry'));
  assert.match(homepage, /href="\/compendium"/);
  assert.match(homepage, /birthday-album-entry\.mjs/);
  assert.match(homepage, /birthday-lily\.mjs/);
});
test('new gallery has standalone styling, native lightbox and back navigation', () => {
  assert.match(gallery, /<title>Compendium<\/title>/);
  assert.match(gallery, /\/css\/birthday\.css/);
  assert.match(gallery, /href="\/sofhia-franchesca-16"/);
  assert.match(gallery, /<dialog/);
  assert.match(gallery, /aria-label="Close enlarged image"/);
  assert.match(gallery, /noindex, nofollow/);
});
test('the nine provided images and optimized thumbnails are committed before merge', () => {
  assert.equal(COMPENDIUM_ITEMS.length, 9);
  for (const item of COMPENDIUM_ITEMS) {
    assert.equal(item.caption, '');
    assert.ok(item.full.startsWith('/assets/compendium/full/'));
    assert.ok(item.thumb.startsWith('/assets/compendium/thumbs/'));
    assert.ok(existsSync(new URL('..' + item.full, import.meta.url)), item.full);
    assert.ok(existsSync(new URL('..' + item.thumb, import.meta.url)), item.thumb);
  }
});
