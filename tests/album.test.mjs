import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { ALBUM } from '../js/album-config.mjs';
import { TrackQueue, timeLabel, crossfadeChannel } from '../js/album-core.mjs';

const tracks = [{ id: 'a', audio: 'a.mp3' }, { id: 'locked', audio: '' }, { id: 'b', audio: 'b.mp3' }, { id: 'c', audio: 'c.mp3' }];
test('sequential playback skips unfinished and failed songs, stops at the end', () => {
  const q = new TrackQueue(tracks);
  assert.equal(q.first(), 'a'); assert.equal(q.next('a'), 'b'); assert.equal(q.next('b'), 'c'); assert.equal(q.next('c'), null);
  assert.equal(q.next('a', new Set(['b'])), 'c'); assert.equal(q.first(new Set(['a','b','c'])), null);
});
test('repeat-one applies to automatic ends; manual Next still advances', () => {
  const q = new TrackQueue(tracks); q.repeat = 'one';
  assert.equal(q.next('b', new Set(), true), 'b'); assert.equal(q.next('b'), 'c');
  assert.equal(q.next('b', new Set(['b']), true), 'c');
});
test('repeat-all wraps and all-failed albums cannot recurse forever', () => {
  const q = new TrackQueue(tracks); q.repeat = 'all';
  assert.equal(q.next('c'), 'a'); assert.equal(q.next('c', new Set(['a','b','c'])), null);
  const single = new TrackQueue([{ id: 'a', audio: 'a.mp3' }]); single.repeat = 'all';
  assert.equal(single.next('a'), 'a'); assert.equal(single.next('a', new Set(['a'])), null);
});
test('shuffle is a permutation, keeps the active track first, and can restore file order', () => {
  const q = new TrackQueue(tracks, () => 0.2); q.setShuffle(true, 'b');
  assert.equal(q.order[0], 'b'); assert.deepEqual([...q.order].sort(), tracks.map(t => t.id).sort());
  q.setShuffle(false, 'b'); assert.deepEqual(q.order, tracks.map(t => t.id));
});
test('previous follows listening history across manual picks and shuffle; history stays bounded', () => {
  const q = new TrackQueue(tracks); for (const id of ['a','c','b']) q.remember(id);
  q.setShuffle(true, 'b'); assert.equal(q.previous('b'), 'c'); q.remember('c'); assert.equal(q.previous('c'), 'a');
  for (let i = 0; i < 1000; i++) q.remember(i%2 ? 'b' : 'c');
  assert.ok(q.history.length <= tracks.length*2);
});
test('one, empty, and 25-song albums keep queue and skip semantics', () => {
  const empty = new TrackQueue([]); assert.equal(empty.first(), null); assert.equal(empty.next(null), null);
  const large = new TrackQueue(Array.from({ length: 25 }, (_, i) => ({ id: String(i), audio: i%2 ? '' : 'sample.mp3' })));
  assert.equal(large.next('22'), '24'); assert.equal(large.next('24'), null);
});
test('crossfade join has no zero padding and consecutive samples at the seam', () => {
  const data = Float32Array.from({ length: 1000 }, (_, i) => 0.6 + Math.sin(i / 19)*0.3);
  const loop = crossfadeChannel(data, 100);
  assert.equal(loop.length, 900); assert.equal(loop[0], data[100]); assert.equal(loop.at(-1), data[99]);
  assert.equal(loop[800], data[900]); assert.ok(loop.every(v => v > 0));
  assert.ok(Math.abs(loop[0]-loop.at(-1)) < 0.016);
});
test('crossfade handles tiny clips, caps overlap, and does not mutate input', () => {
  const input = new Float32Array([.2,.3,.4,.5]); assert.deepEqual(crossfadeChannel(input,99), input);
  const long = Float32Array.from({ length: 100 }, (_, i) => i); const original = long.slice();
  assert.equal(crossfadeChannel(long,1000).length,75); assert.deepEqual(long, original);
});
test('unknown duration never renders NaN; times are stable on long songs', () => {
  assert.equal(timeLabel(undefined),'—:—'); assert.equal(timeLabel(NaN),'—:—');
  assert.equal(timeLabel(Infinity),'—:—'); assert.equal(timeLabel(8.04),'0:08'); assert.equal(timeLabel(3725),'62:05');
});
test('all 18 samples are explicit placeholders with existing audio, fallback and original covers', () => {
  assert.equal(ALBUM.tracks.length,18); assert.equal(new Set(ALBUM.tracks.map(t => t.id)).size,18);
  for (const t of ALBUM.tracks) {
    assert.equal(t.placeholder,true); assert.match(t.title,/Placeholder \d{2}/);
    for (const p of [t.audio,t.fallbackAudio,t.cover]) assert.ok(existsSync(new URL(`..${p}`, import.meta.url)),p);
  }
  for (const p of [ALBUM.backgroundMusic,ALBUM.cover,ALBUM.mediaCover,ALBUM.unlockAudio]) assert.ok(existsSync(new URL(`..${p}`,import.meta.url)));
});
test('only the birthday page links to the album, and both clean/raw routes are noindex', () => {
  for (const name of ['index.html','Gallery.html','Sofra.html','SofraPanel.html','404.html']) {
    assert.doesNotMatch(readFileSync(new URL(`../${name}`,import.meta.url),'utf8'),/sofhias-songs-67/);
  }
  const birthday = readFileSync(new URL('../sofhia-franchesca-16.html',import.meta.url),'utf8');
  assert.equal((birthday.match(/href="\/sofhias-songs-67"/g)||[]).length,1);
  const html = readFileSync(new URL('../sofhias-songs-67.html',import.meta.url),'utf8');
  assert.match(html,/<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(html,/user-scalable|maximum-scale|activity-logger|main\.js|style\.css/);
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  for (const route of ['/sofhias-songs-67','/sofhias-songs-67.html']) {
    assert.ok(vercel.headers.find(h=>h.source===route).headers.some(h=>h.key==='X-Robots-Tag'&&h.value==='noindex, nofollow'));
  }
});
