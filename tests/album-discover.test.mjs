import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DISCOVER, songDestination, discoverTracks } from '../js/album-discover-config.mjs';
import { ALBUM } from '../js/album-config.mjs';
import { installSixSeven } from '../js/album-discover.mjs';

test('only the first four ranks are populated and the ranking stays separate from the five recordings', () => {
  assert.deepEqual(DISCOVER.map(slot => slot.rank), [1, 2, 3, 4, 5, 6, 7]);
  for (const slot of DISCOVER.slice(4)) for (const field of ['title', 'artist', 'artwork', 'audio', 'link', 'description']) assert.equal(slot[field], '');
  assert.equal(DISCOVER[0].title, 'Beauty And A Beat');
  assert.equal(DISCOVER[0].artist, 'Justin Bieber ft. Nicki Minaj');
  assert.equal(DISCOVER[0].description, '');
  const ranked = discoverTracks();
  assert.equal(ranked.length, 4); assert.equal(ranked[0].id, 'discover-01');
  assert.equal(ranked[1].title, 'One Less Lonely Girl');
  assert.equal(ranked[1].artist, 'Justin Bieber');
  assert.equal(ranked[1].id, 'discover-02');
  assert.equal(ranked[1].duration, 67.428345);
  assert.equal(ranked[1].note, '');
  assert.equal(ranked[2].id, 'discover-03');
  assert.equal(ranked[2].title, 'Eenie Meenie');
  assert.equal(ranked[2].artist, 'Sean Kingston & Justin Bieber');
  assert.equal(ranked[2].duration, 36.313333);
  assert.equal(ranked[2].note, '');
  assert.equal(ranked[3].id, 'discover-04');
  assert.equal(ranked[3].title, 'Perfect');
  assert.equal(ranked[3].artist, 'Ed Sheeran');
  assert.equal(ranked[3].duration, 54.75);
  assert.equal(ranked[3].note, '');
  assert.equal(ranked[0].duration, 64.27); assert.equal(ranked[0].coverShape, 'square');
  for (const path of ranked.flatMap(t => [t.cover, t.audio, t.fallbackAudio])) assert.ok(readFileSync(new URL('..' + path, import.meta.url)).length > 0);
  assert.deepEqual(ALBUM.tracks.map(t => t.title), ['Love Me', 'Made in Camella', 'Daisies', 'One Less Lonely Girl', 'Photograph']);
  assert.deepEqual(ALBUM.tracks.filter(t => t.deluxe).map(t => t.id), ['song-04']);
  const html = readFileSync(new URL('../sofhias-songs-67.html', import.meta.url), 'utf8');
  assert.ok(html.indexOf('id="tracklist"') < html.indexOf('id="discover-title"'));
  assert.ok(html.indexOf('id="discover-title"') < html.indexOf('class="album__footer"'));
});

test('empty media remains empty and future song destinations cannot execute script', () => {
  assert.equal(songDestination(''), null); assert.equal(songDestination('   '), null);
  assert.equal(songDestination('javascript:alert(1)'), null);
  assert.equal(songDestination('data:text/html,hello'), null);
  assert.equal(songDestination('/assets/example.mp3'), 'https://fejelude.xyz/assets/example.mp3');
  assert.equal(songDestination('https://example.com/song'), 'https://example.com/song');
});

test('6–7 is tap-only, bounded, restartable and cleaned up on hiding/navigation', t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const doc = Object.assign(new EventTarget(), { hidden: false });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'document', previous); else delete globalThis.document; });
  const button = Object.assign(new EventTarget(), { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } });
  const classes = new Set();
  const stage = { hidden: true, getBoundingClientRect() {}, classList: { add: v => classes.add(v), remove: v => classes.delete(v) } };
  const timers = new Map(); let serial = 0;
  const platform = Object.assign(new EventTarget(), { setTimeout(fn, ms) { assert.equal(ms, 3200); timers.set(++serial, fn); return serial; }, clearTimeout(id) { timers.delete(id); } });
  installSixSeven(button, stage, platform);
  assert.equal(timers.size, 0); assert.equal(stage.hidden, true);
  for (let i = 0; i < 10; i++) button.dispatchEvent(new Event('click'));
  assert.equal(timers.size, 1); assert.equal(stage.hidden, false); assert.equal(button.attrs['aria-expanded'], 'true');
  [...timers.values()][0](); assert.equal(timers.size, 0); assert.equal(stage.hidden, true);
  button.dispatchEvent(new Event('click')); doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(timers.size, 0); assert.equal(stage.hidden, true);
  doc.hidden = false; button.dispatchEvent(new Event('click')); platform.dispatchEvent(new Event('pagehide'));
  assert.equal(timers.size, 0); assert.equal(classes.size, 0);
  button.dispatchEvent(new Event('click')); assert.equal(timers.size, 0, 'listeners are removed when leaving the document');
});
