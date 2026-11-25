import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sakuraEnvelope,celestialPresence,gardenBands,gardenScale,makeGarden,particlePose,SPRITES,PALETTE} from '../js/sofra-sakura-vfx.mjs';

test('scroll envelope is symmetric and reaches a full garden',()=>{
 const h=900;
 assert.deepEqual(sakuraEnvelope(.72*h+200,2000,h),sakuraEnvelope(-2000,.22*h-200,h));
 assert.ok(sakuraEnvelope(1.1*h,2000,h).wash>0);
 assert.equal(sakuraEnvelope(2*h,3000,h).wash,0);
 assert.deepEqual(sakuraEnvelope(200,1000,h),{wash:1,petals:1,ornaments:1,hearts:1});
 for(let x=0;x<=1;x+=.01)assert.ok(sakuraEnvelope(200,1000,h,x).wash<=(1-x)**2+1e-12);
 assert.equal(sakuraEnvelope(200,1000,h,celestialPresence(0,1000,h)).wash,0);
});
test('four disjoint canvas bands never draw over the card and fit the pixel budget',()=>{
 for(const [w,h] of [[320,720],[390,844],[1536,960]]){
  for(const box of [{left:15,right:w-15,top:100,bottom:h-100},{left:15,right:w-15,top:-500,bottom:h+200}]){
   const bands=gardenBands(w,h,box);
   const area=bands.reduce((n,b)=>n+b.w*b.h,0);
   assert.ok(area<w*h);
   assert.ok(area*gardenScale(w*h,3)**2<=1150000);
   for(const b of bands)assert.ok(b.x>=0&&b.y>=0&&b.w>=0&&b.h>=0&&b.x+b.w<=w&&b.y+b.h<=h);
   for(let i=0;i<bands.length;i++)for(let j=i+1;j<bands.length;j++){
    const a=bands[i],b=bands[j];
    assert.ok(Math.min(a.x+a.w,b.x+b.w)<=Math.max(a.x,b.x)||Math.min(a.y+a.h,b.y+b.h)<=Math.max(a.y,b.y));
   }
  }
 }
});
test('original sprite palette and deterministic particle population',()=>{
 for(const rows of Object.values(SPRITES))for(const row of rows)for(const key of row)assert.ok(key==='.'||Object.hasOwn(PALETTE,key));
 const p=makeGarden();assert.equal(p.length,112);assert.deepEqual(p,makeGarden());
 assert.ok(['petal','heart','bow','cat','berry','blossom','star','glint'].every(kind=>p.some(x=>x.kind===kind)));
 for(const t of [0,1,30,1000])for(const x of p){
  const pose=particlePose(x,t,100,390,844,{left:18,right:372});
  assert.ok(Object.values(pose).every(Number.isFinite));assert.ok(pose.alpha>=0&&pose.alpha<=1);
 }
});
