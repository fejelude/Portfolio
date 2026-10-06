import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { StoryClock } from '../js/birthday-clock.mjs';
import { FLOWERS, sceneAt } from '../js/birthday-art.mjs';
import { CONFIG } from '../js/birthday-config.mjs';

test('media time stays authoritative across skipped frames and long buffering',()=>{
  const c=new StoryClock();c.start(0);
  assert.equal(c.read(10000,3.5),3.5);
  c.pause(10000,3.5);
  assert.equal(c.read(200000,22),3.5);
  c.start(200000);
  assert.equal(c.read(210000,4.5),4.5);
  assert.equal(c.read(500000,58.99),58.99);
  assert.equal(c.complete,false);
});
test('59.455-second audio ends with a resumable coda and reveals at 60, never 59',()=>{
  const c=new StoryClock();c.start(0);c.read(59000,59.455);c.ended(59000,59.455);
  assert.equal(c.complete,false);
  assert.equal(c.read(59400),59.855);
  c.pause(59400);
  assert.equal(c.read(359400),59.855);
  c.start(359400);
  assert.ok(Math.abs(c.read(359544)-59.999)<1e-9);
  assert.equal(c.complete,false);
  assert.equal(c.read(359545),60);
  assert.equal(c.complete,true);
});
test('silent playback failure retains position and excludes hidden or paused time',()=>{
  const c=new StoryClock();c.start(0);c.read(14000,14);
  c.switchMode('silent',14000,14);
  assert.equal(c.read(22000),22);
  c.pause(22000);
  assert.equal(c.read(200000),22);
  c.start(200000);
  assert.equal(c.read(237999),59.999);
  assert.equal(c.read(238000),60);
});
test('ending while hidden never starts a background coda',()=>{
  const c=new StoryClock();c.start(0);c.pause(59455,59.455);c.ended(59500,59.455);
  assert.equal(c.running,false);
  assert.equal(c.read(360000),59.455);
  c.start(360000);assert.equal(c.read(360545),60);
});
test('repeated replay resets all clock state; late frames retain every final artwork state',()=>{
  const c=new StoryClock();
  for(let i=0;i<10;i++){
    c.start(i*100000);c.switchMode('silent',i*100000,0);c.read(i*100000+60000);
    assert.equal(c.complete,true);c.reset();assert.equal(c.time,0);assert.equal(c.mode,'media');assert.equal(c.running,false);
  }
  const final=sceneAt(1000);
  assert.ok(final.stems.every(p=>p===1));assert.ok(final.flowers.every(p=>p===1));
  for(const key of ['filler','paperBack','paperFront','ribbon','bow','tag','crescendo'])assert.equal(final[key],1);
});
test('all five chapters evolve; wrapping, bow, and final crescendo cannot complete early',()=>{
  assert.ok(sceneAt(2).stems.some(p=>p>0&&p<1));
  assert.ok(sceneAt(31).flowers.some(p=>p<1));
  assert.ok(FLOWERS.length>=16);
  assert.equal(sceneAt(32).paperFront,0);assert.ok(sceneAt(43).paperBack>0&&sceneAt(43).paperBack<1);
  assert.equal(sceneAt(47).bow,0);assert.ok(sceneAt(54).bow>0&&sceneAt(54).bow<1);
  assert.equal(sceneAt(57).crescendo,0);assert.ok(sceneAt(59.9).crescendo>0&&sceneAt(59.9).crescendo<1);
  assert.equal(sceneAt(59.999).complete,false);assert.equal(sceneAt(60).complete,true);
});
test('static route has noindex, accessible zoom, typed real audio, and isolated assets',()=>{
  const html=readFileSync(new URL('../sofhia-franchesca-16.html',import.meta.url),'utf8');
  assert.match(html,/<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(html,/user-scalable|maximum-scale|main\.js|style\.css|activity-logger/);
  assert.match(html,/preload="auto"/);assert.match(html,/type="audio\/mpeg"/);assert.match(html,/<noscript>/);
  assert.match(html,/#static-fallback\{display:flex!important\}/);
  assert.equal(CONFIG.duration,60);assert.deepEqual(CONFIG.stages,[10,32,47,57,60]);
  assert.ok(existsSync(new URL('../assets/birthday/song.mp3',import.meta.url)));
  for(const file of ['index.html','Gallery.html','Sofra.html','SofraPanel.html'])assert.doesNotMatch(readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),/sofhia-franchesca-16/);
  const vercel=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  for(const route of ['/sofhia-franchesca-16','/sofhia-franchesca-16.html'])assert.ok(vercel.headers.find(h=>h.source===route).headers.some(h=>h.key==='X-Robots-Tag'&&h.value==='noindex, nofollow'));
  assert.equal(vercel.cleanUrls,true);
});
