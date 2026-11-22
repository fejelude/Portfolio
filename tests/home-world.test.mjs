import {test} from 'node:test';
import assert from 'node:assert/strict';
import { buildWorld, STATIONS, copyView, blendView } from '../js/home-world-renderer.mjs';
test('procedural geometry is deterministic, finite and bounded',()=>{
  const a=buildWorld(false),b=buildWorld(false),low=buildWorld(true);
  assert.equal(a.length,3);
  for(let i=0;i<a.length;i++){
    assert.ok(a[i].length>0&&a[i].length%30===0);
    assert.ok(a[i].every(Number.isFinite));
    assert.deepEqual(a[i],b[i]);
  }
  assert.ok(low[0].length<a[0].length);
  assert.ok(a.reduce((n,x)=>n+x.byteLength,0)<12*1024*1024);
});
test('camera interpolation converges without modifying presets',()=>{
  const a=copyView(STATIONS.arrival),b=copyView(STATIONS.roadmap),before=JSON.stringify(STATIONS);
  let d;
  for(let i=0;i<180;i++)d=blendView(a,b,1/60);
  assert.ok(d<.001);
  blendView(a,STATIONS.gallery,1/60,true);
  assert.deepEqual(a,copyView(STATIONS.gallery));
  assert.equal(JSON.stringify(STATIONS),before);
});
test('direct destinations are defined and unique',()=>{
  assert.equal(Object.keys(STATIONS).length,6);
  assert.equal(new Set(Object.values(STATIONS).map(v=>v.link)).size,6);
  for(const s of Object.values(STATIONS))assert.ok(s.radius>0&&s.marker.length===3&&s.target.length===3);
});
