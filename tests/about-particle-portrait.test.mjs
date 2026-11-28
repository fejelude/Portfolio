import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {particleGrid,pulseFalloff} from '../js/about-particle-portrait.mjs';

const read = path => readFileSync(new URL('../'+path, import.meta.url));

test('sampling covers the source aspect ratio and adapts without inventing samples', () => {
  const desktop = particleGrid(700,1120,629);
  const mobile = particleGrid(360,1120,629,true);
  const fallback = particleGrid(360,1120,629,true,true);
  assert.equal(desktop.cols,420);
  assert.ok(mobile.cols < desktop.cols && fallback.cols < mobile.cols);
  assert.ok(Math.abs(desktop.cols / desktop.rows - 1120/629) < .01);
  assert.ok(Math.abs(mobile.cols / mobile.rows - 1120/629) < .02);
  assert.deepEqual(particleGrid(700,32,18), {cols:32,rows:18});
});

test('the wake is local, starts smoothly and settles exactly at its finite lifetime', () => {
  const peak = .66 / 4;
  assert.equal(pulseFalloff(0,0),0);
  assert.equal(pulseFalloff(0,.66),0);
  assert.equal(pulseFalloff(1,peak),0);
  assert.ok(pulseFalloff(.25,peak) > pulseFalloff(.64,peak));
  assert.ok(pulseFalloff(0,.001) < .02);
  assert.ok(pulseFalloff(0,.65) < .0001);
});

test('portrait stays between motto and copy with an accessible image fallback', () => {
  const html = read('index.html').toString();
  const css = read('css/about-particle-portrait.css').toString();
  const block = html.match(/<figure class="about-particle-portrait"[\s\S]*?<\/figure>/)?.[0];
  assert.ok(block);
  assert.ok(html.indexOf('IS MY MOTTO') < html.indexOf(block));
  assert.ok(html.indexOf(block) < html.indexOf('I am a developer focused on love.'));
  assert.match(block, /<figure[^>]*role="img"[^>]*aria-label/);
  assert.match(block, /<img[^>]*width="1120" height="629" alt="" loading="lazy"/);
  assert.match(block, /<canvas[^>]*aria-hidden="true"/);
  assert.match(css, /touch-action: pan-y pinch-zoom/);
  assert.doesNotMatch(css, /gradient|@keyframes/);
});

test('only the optimized WebP derivative ships, with no photographic metadata', () => {
  const asset = read('assets/about/portrait-samples.webp');
  assert.equal(asset.toString('ascii',0,4),'RIFF');
  assert.equal(asset.toString('ascii',8,12),'WEBP');
  assert.ok(asset.length < 45_000);
  const types = [];
  for (let offset = 12; offset < asset.length;) {
    types.push(asset.toString('ascii',offset,offset+4));
    const length = asset.readUInt32LE(offset+4);
    offset += 8 + length + (length % 2);
  }
  assert.deepEqual(types,['VP8 ']);
});

test('movement softens above the knee and fits the overscan for any pulse overlap', async () => {
  const { portraitSurface, limitedTravel } = await import('../js/about-particle-portrait.mjs');
  for (const [width, height, dpr] of [[320,180,1.55], [394,221,2], [700,393,2]]) {
    const size = portraitSurface(width, height, dpr);
    const knee = size.radius * .34;
    assert.equal(limitedTravel(knee, size.radius), knee);
    assert.ok(limitedTravel(knee + 1, size.radius) > knee);
    assert.ok(limitedTravel(100000, size.radius) < size.limit);
    assert.ok(size.bleed - size.limit >= 5);
    assert.equal(size.outputWidth, width + 2 * size.bleed);
    assert.equal(size.outputHeight, height + 2 * size.bleed);
    assert.ok(size.width * size.height <= 960000);
  }
});
