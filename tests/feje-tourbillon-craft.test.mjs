import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {wheelOutline,hairspringPoint,fillHairspring,ribbonIndices,barrelSpiral,rosettePoint,BALANCE_AMPLITUDE,TAU} from '../js/feje-tourbillon-geometry.mjs';
import {MOVEMENT,movementAt} from '../js/feje-tourbillon-mechanism.mjs';
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const radius=p=>Math.hypot(...p);
test('wheel outlines use one tooth per pitch and the shared module',()=>{
 for(const count of [8,12,16,24,36,48,80]){
  const pitch=count*.025/2,profile=wheelOutline(count,pitch);
  near(profile.module,.025);assert.equal(profile.points.length,13*count);
  assert.ok(profile.root<pitch&&profile.tip>pitch);
  for(let i=0;i<count;i++){
   const [x,y]=profile.points[i*13+5];
   near(Math.hypot(x,y),profile.tip);
   near(Math.cos(i*TAU/count-.12*TAU/count),x/profile.tip);
  }
  assert.ok(profile.points.flat().every(Number.isFinite));
 }
 assert.equal(wheelOutline(15,.137,{escape:true}).points.length,105);
 assert.throws(()=>wheelOutline(0,1),RangeError);
});
test('meshing centres use pitch radii; clearance is bounded',()=>{
 for(const [n,m] of [[48,16],[36,12],[80,8]]){
  const a=wheelOutline(n,n*.025/2),b=wheelOutline(m,m*.025/2);
  const centre=(n+m)*.025/2;
  assert.ok(a.tip+b.root<centre);
  assert.ok(b.tip+a.root<centre);
 }
});
test('hairspring ends track collet and fixed stud throughout full nominal amplitude',()=>{
 const fixed=hairspringPoint(1,0);
 for(const angle of [-BALANCE_AMPLITUDE,-1,0,1,BALANCE_AMPLITUDE]){
  const stud=hairspringPoint(1,angle);near(stud[0],fixed[0]);near(stud[2],fixed[2]);
  const inner=hairspringPoint(0,angle);near(inner[0],-.034*Math.cos(angle));near(inner[2],.034*Math.sin(angle));
  let last=0;
  for(let i=0;i<=240;i++){const [x,,z]=hairspringPoint(i/240,angle),r=Math.hypot(x,z);assert.ok(r>last);last=r}
 }
});
test('dynamic ribbon is bounded, indexed and has unit normals at all oscillator phases',()=>{
 const count=241,positions=new Float32Array(count*8*3),normals=new Float32Array(positions.length);
 const indices=ribbonIndices(count);assert.equal(indices.length,(count-1)*24);
 assert.equal(Math.max(...indices),count*8-1);
 for(let step=0;step<=24;step++){
  fillHairspring(positions,normals,count,movementAt(step/120).balance);
  assert.ok(positions.every(Number.isFinite)&&normals.every(Number.isFinite));
  for(let i=0;i<normals.length;i+=3){near(Math.hypot(normals[i],normals[i+1],normals[i+2]),1,1e-6);assert.ok(Math.hypot(positions[i],positions[i+2])<.236)}
 }
});
test('barrel mainspring and dial rosette stay inside their intended bounds',()=>{
 const points=barrelSpiral();assert.equal(points.length,193);
 let last=0;for(const [x,y,z] of points){const r=Math.hypot(x,z);assert.ok(r>last&&r<.324);near(y,.271);last=r}
 const a=rosettePoint(0,100,18,5),b=rosettePoint(1,100,18,5);
 near(a[0],b[0]);near(a[1],b[1]);near(radius(a),105);
});
test('250 degree nominal amplitude retains the existing one minute train ratio',()=>{
 near(movementAt(.1).balance,BALANCE_AMPLITUDE);
 near(movementAt(.3).balance,-BALANCE_AMPLITUDE);
 near(movementAt(60).cage,TAU);near(movementAt(60).escape,TAU*10);
 near(MOVEMENT.beatsPerSecond,5);
});
test('model wires the new solids and finish maps to the live watch',()=>{
 const model=readFileSync(new URL('../js/feje-tourbillon-model.mjs',import.meta.url),'utf8');
 for(const name of ['wheelOutline','fillHairspring','perlageFinish','guillocheFinish','brushedFinish','Anglage bridge body','Exposed coiled mainspring','Ruby impulse pin','Safety roller','Annular ruby hole jewel','flattenRigidGroup','Indexed third pinion'])assert.ok(model.includes(name),name);
 const app=readFileSync(new URL('../js/feje-tourbillon.mjs',import.meta.url),'utf8');
 assert.match(app,/saved===null\?'high'/);
});
