import assert from 'node:assert/strict';
import test from 'node:test';
import { skyBands, skyEnvelope, skyScale } from '../js/feje-tourbillon-scroll-vfx.mjs';

test('the wash leads the stars, engravings, and meteors into view', () => {
  const sample = gap => skyEnvelope(720 + gap, 1750 + gap, 1000);
  assert.deepEqual(sample(770), {wash:0,field:0,engraving:0,meteor:0});
  assert.ok(sample(500).wash > 0);
  assert.equal(sample(500).field, 0);
  const entry = sample(190);
  assert.ok(entry.wash > entry.field && entry.field > entry.engraving);
  assert.equal(entry.meteor, 0);
  assert.deepEqual(sample(0), {wash:1,field:1,engraving:1,meteor:1});
});

test('the fade is reversible above and below the viewport', () => {
  let last = {wash:1,field:1,engraving:1,meteor:1};
  for (let gap = 0; gap <= 800; gap += 10) {
    const entering = skyEnvelope(720 + gap, 1800 + gap, 1000);
    const leaving = skyEnvelope(-800 - gap, 220 - gap, 1000);
    assert.deepEqual(entering, leaving);
    for (const key of Object.keys(entering)) assert.ok(entering[key] <= last[key]);
    last = entering;
  }
  assert.deepEqual(skyEnvelope(-2350, 240, 844), {wash:1,field:1,engraving:1,meteor:1});
});

test('the backing buffer uses available DPI up to the bounded pixel budget', () => {
  assert.equal(skyScale(320 * 568,2), 2);
  assert.equal(skyScale(390 * 844,1), 1);
  for (const [width,height,dpi] of [[390,844,3],[1440,900,2],[3840,2160,2]]) {
    const scale = skyScale(width * height,dpi);
    assert.ok(Math.floor(width * scale) * Math.floor(height * scale) <= 1_350_000);
    assert.ok(scale <= 2.5);
  }
});

test('render bands surround the article without overlapping or painting inside it', () => {
  assert.deepEqual(skyBands(390,844,{left:24,right:366,top:160,bottom:1050}),[
    {x:0,y:0,width:16,height:844}, {x:374,y:0,width:16,height:844},
    {x:16,y:0,width:358,height:152}, {x:16,y:844,width:358,height:0}
  ]);
  const away = skyBands(390,844,{left:24,right:366,top:1000,bottom:1800});
  assert.equal(away.reduce((area,band)=>area + band.width * band.height,0),390 * 844);
});
