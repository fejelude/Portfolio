import {test} from 'node:test';
import assert from 'node:assert/strict';
import { buildWorld, STATIONS, copyView, blendView, COLLECTION, collectibleAt } from '../js/home-world-renderer.mjs';
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

test('both tiers have actual neon signage, facade material and detailed car surfaces',()=>{
  for(const low of [true,false]){
    const [solid,lamps,shuttle]=buildWorld(low),count=new Map();
    for(let i=9;i<solid.length;i+=10)count.set(solid[i],(count.get(solid[i])||0)+1);
    for(const id of [0,2,4,5,6,7,8])assert.ok(count.get(id)>0,'missing material '+id);
    assert.ok(count.get(5)>1000,'neon glyphs and trim missing');
    assert.ok(lamps.length>0&&shuttle.length>0);
  }
});

test('all ten collectibles have unique models, palettes and world geometry in both tiers',()=>{
  assert.equal(COLLECTION.length,10);
  for(const key of ['id','name','world','accent','feature','poster'])assert.equal(new Set(COLLECTION.map(c=>c[key])).size,10);
  assert.equal(collectibleAt(-1),COLLECTION[0]);assert.equal(collectibleAt(10),COLLECTION[0]);
  const signatures=new Set();
  for(const c of COLLECTION){
    const hi=buildWorld(false,c.index),lo=buildWorld(true,c.index),again=buildWorld(false,c.index);
    assert.equal(hi.length,3);assert.equal(lo.length,3);
    for(let n=0;n<3;n++){
      assert.ok(hi[n].length&&lo[n].length&&hi[n].length%30===0&&lo[n].length%30===0);
      assert.ok(hi[n].every(Number.isFinite)&&lo[n].every(Number.isFinite));
      assert.deepEqual(hi[n],again[n]);
    }
    const bytes=arr=>arr.reduce((total,b)=>total+b.byteLength,0);
    assert.ok(bytes(hi)<3*1024*1024);assert.ok(bytes(lo)<bytes(hi));
    // Geometry signature deliberately ignores colors/material IDs.
    let hash=2166136261;
    for(const batch of hi)for(let i=0;i<batch.length;i+=10)for(let k=0;k<3;k++)hash=Math.imul(hash^Math.round(batch[i+k]*1000),16777619);
    signatures.add(hash>>>0);
  }
  assert.equal(signatures.size,10);
});
