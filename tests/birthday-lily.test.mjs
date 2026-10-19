import test from 'node:test';
import assert from 'node:assert/strict';
import { petalAt, pathData } from '../js/birthday-lily.mjs';

test('all six morphing paths stay finite through bud, bloom, swirl and cake',()=>{
  for(let i=0;i<6;i++)for(let t=0;t<=10;t+=.025){
    const p=petalAt(i,t);assert.equal(p.length,26);
    assert.ok(p.every(n=>Number.isFinite(n)&&Math.abs(n)<250));
    assert.equal((pathData(p).match(/C/g)||[]).length,4);
  }
});
test('phase joins are continuous, including the flower-to-cake bundle',()=>{
  for(let i=0;i<6;i++)for(const boundary of [2.2,4,5.25,6.1]){
    const a=petalAt(i,boundary-.0001),b=petalAt(i,boundary+.0001);
    assert.ok(a.every((n,j)=>Math.abs(n-b[j])<.1),`petal ${i}, time ${boundary}`);
  }
});
test('the cake remains formed after the one-time sequence',()=>{
  for(let i=0;i<6;i++)assert.deepEqual(petalAt(i,10),petalAt(i,10000));
});
