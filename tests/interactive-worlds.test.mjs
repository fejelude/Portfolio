import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {IDS,sanitize,earn,getProgress,clearProgress} from '../js/interactive-worlds/progress.mjs';
import {calculate,command} from '../js/interactive-worlds/os.mjs';
import {integrate} from '../js/interactive-worlds/particles.mjs';
import {project} from '../js/interactive-worlds/lab.mjs';
import {mount as room} from '../js/interactive-worlds/room.mjs';
import {mount as tokyo} from '../js/interactive-worlds/tokyo.mjs';
import {mount as universe} from '../js/interactive-worlds/universe.mjs';
import {mount as particles} from '../js/interactive-worlds/particles.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('six static launch routes and lazy imports are complete',()=>{
 const hub=read('interactives.html'),boot=read('js/interactive-worlds/boot.mjs'),css=read('css/interactive-worlds.css');
 assert.equal((hub.match(/data-iw-card=/g)||[]).length,6);
 for(const id of IDS){
  assert.ok(hub.includes('href="/interactives/'+id+'"'));
  assert.ok(hub.includes('data-iw-badge="'+id+'"'));
  const page=read('interactives/'+id+'.html');
  assert.ok(page.includes('data-world="'+id+'"'));
  assert.ok(page.includes('/js/interactive-worlds/boot.mjs'));
  assert.ok(page.includes('href="/interactives"'));
  assert.ok(boot.includes("import('./"+id+".mjs')"));
  assert.match(read('js/interactive-worlds/'+id+'.mjs'),/export function mount\(api\)/);
 }
 assert.match(css,/prefers-reduced-motion:no-preference/);
 assert.match(css,/\.iw-card\[data-visible\]/);
 assert.equal(JSON.parse(read('vercel.json')).cleanUrls,true);
});
test('achievement collection validates ids, persists once, resets and tolerates denied storage',()=>{
 let value=null;const storage={getItem:()=>value,setItem:(_,v)=>value=v,removeItem:()=>value=null};
 assert.deepEqual(sanitize(['os','room','room','bogus']),['room','os']);
 assert.deepEqual(getProgress(storage),[]);
 assert.deepEqual(earn('room',storage),['room']);
 assert.deepEqual(earn('room',storage),['room']);
 for(const id of IDS)earn(id,storage);
 assert.deepEqual(getProgress(storage),IDS);
 clearProgress(storage);assert.deepEqual(getProgress(storage),[]);
 assert.deepEqual(earn('lab',null),['lab']);clearProgress(null);
});
test('FejeOS calculator does arithmetic and never executes source',()=>{
 for(const [input,answer] of [['(12+8)*3',60],['-5+2*4',3],['.5+1.25',1.75],['6/-2',-3],['0.1+0.2',0.3]])assert.equal(calculate(input),answer);
 for(const input of ['1/0','2+','alert(1)','(2+3','2**3','', 'x=9'])assert.throws(()=>calculate(input));
 assert.equal(command('echo <script>'),'<script>');
 assert.match(command('rm -rf /'),/Command not found/);
 assert.match(command('cat secret.txt'),/Secret found/);
});
test('particle forces and boundary reflection are finite and directional',()=>{
 const well={x:200,y:100};
 for(const mode of ['Attraction','Repulsion','Vortex']){
  const p=integrate({x:100,y:100,vx:0,vy:0},well,.016,mode,2,400,300);
  assert.ok([p.x,p.y,p.vx,p.vy].every(Number.isFinite));
  assert.ok(mode==='Attraction'?p.vx>0:mode==='Repulsion'?p.vx<0:p.vy>0);
 }
 const edge=integrate({x:399,y:100,vx:300,vy:0},well,.05,'Repulsion',2,400,300);
 assert.ok(edge.x<=400&&edge.vx<0);
 for(const yaw of [0,.65,Math.PI])assert.ok(project([2,.4,1],yaw,.3,1,800,500).every(Number.isFinite));
});
function fakeApi(){
 const gradient={addColorStop(){}},ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const controls=new Map(),discoveries=new Set();
 const fakeCanvas=(w,h)=>({width:w,height:h,getContext:t=>t==='2d'?ctx:null,addEventListener(){},toDataURL:()=>'',getBoundingClientRect:()=>({width:w,height:h,left:0,top:0})});
 const api={canvas:fakeCanvas,tier:()=> 'Low',invalidate(){},say(){},beep(){},discover:id=>discoveries.add(id),point(){return{x:1,y:1}},drag(){},button:(name,fn)=>{const b={textContent:name,setAttribute(){}};controls.set(name,()=>fn(b));return b},select:(name,opts,fn)=>{controls.set(name,fn);return {value:'',replaceChildren(){},append(){}}},range:(name,min,max,value,step,fn)=>{controls.set(name,fn);return {updateValue(){}}}};
 return {api,controls,discoveries};
}
test('pixel worlds, compatibility cosmos and particle renderer draw and unlock via actual controls',()=>{
 for(const [id,mount,actions,goal] of [
  ['room',room,[['Look outside'],['Use computer'],['Toggle lamp'],['Pet cat'],['Inspect model car']],5],
  ['tokyo',tokyo,[['Discover this district'],['Neighborhood','1'],['Neighborhood','2']],3],
  ['universe',universe,[['Discover this view'],['Celestial view','1'],['Celestial view','2']],3],
  ['particles',particles,[['Discover this force'],['Force','Repulsion'],['Force','Vortex']],3]
 ]){
  const {api,controls,discoveries}=fakeApi(),world=mount(api);world.resize?.();world.draw(.016,1);for(const [name,v] of actions){assert.ok(controls.has(name),id+': '+name);controls.get(name)(v);world.draw(.016,2)}assert.equal(discoveries.size,goal,id);world.dispose?.();
 }
});
