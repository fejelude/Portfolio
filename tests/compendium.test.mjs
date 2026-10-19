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
test('all fourteen original images and their thumbnails are committed', () => {
  assert.equal(COMPENDIUM_ITEMS.length, 14);
  for (const [index, item] of COMPENDIUM_ITEMS.entries()) {
    if (index < 9) assert.equal(item.template, undefined);
    else assert.equal(item.template, 'red');
    assert.equal(item.caption, '');
    assert.ok(item.full.startsWith('/assets/compendium/full/'));
    assert.ok(item.thumb.startsWith('/assets/compendium/thumbs/'));
    assert.ok(existsSync(new URL('..' + item.full, import.meta.url)), item.full);
    assert.ok(existsSync(new URL('..' + item.thumb, import.meta.url)), item.thumb);
  }
});

test('red card and viewer themes are scoped to the five new screenshots', () => {
  const styles=readFileSync(new URL('../css/compendium.css', import.meta.url),'utf8');
  const controller=readFileSync(new URL('../js/compendium.mjs', import.meta.url),'utf8');
  assert.match(styles,/\.compendium__card--red/);
  assert.match(styles,/\.compendium__frame--red/);
  assert.match(styles,/\.compendium__lightbox--red/);
  assert.match(controller,/item\.template === 'red'/);
});
