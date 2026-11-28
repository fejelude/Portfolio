import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const html=read('sofhia-franchesca-16.html');
const config=JSON.parse(read('vercel.json'));
test('approved archival announcement, metadata and direct home link',()=>{
 const copy=[...html.matchAll(/<p>([^<]+)<\/p>/g)].map(m=>m[1]);
 assert.deepEqual(copy,["This website was originally created as a personal birthday surprise, filled with little details, music, artwork, and things I made specifically for that occasion.","Its purpose has been fulfilled, and I’ve decided to preserve it privately out of respect for the person it was made for.","It hasn’t been erased. It’s simply been archived."]);
 for(const part of ['21 October 2026','A Grade 11 Memory.','Privately preserved · 2026','href="https://fejelude.xyz/">Return to Home','name="robots" content="noindex, nofollow"'])assert.ok(html.includes(part),part);
 assert.equal((html.match(/<audio\b/g)||[]).length,1);
 assert.ok(!/<form\b|type="password"|og:url/.test(html));
});
test('original public files removed, associated routes redirect, unrelated rules retained',()=>{
 for(const p of ['sofhias-songs-67.html','compendium.html','assets/birthday','assets/album','assets/compendium','js/birthday-config.mjs','js/album-config.mjs','js/compendium-data.mjs','verification/birthday','verification/album'])assert.equal(existsSync(new URL(p,root)),false,p);
 for(const p of ['/sofhias-songs-67','/sofhias-songs-67.html','/compendium','/compendium.html'])assert.ok(config.redirects.some(r=>r.source===p&&r.destination==='/sofhia-franchesca-16'&&!r.permanent),p);
 for(const p of ['/sofra','/admin','/crush'])assert.ok(config.rewrites.some(r=>r.source===p),p);
 assert.equal(config.git.deploymentEnabled['feat/grade-11-memory-archive'],false);
});
test('original unedited archive track and licensed font available',()=>{
 const data=readFileSync(new URL('assets/memory/archive.mp4',root));
 assert.equal(data.length,1552350);
 assert.equal(createHash('sha256').update(data).digest('hex'),'69136c48e78e790ef334be90266f4649b29f4fe4c2bbc4b8021e2dc1778f8600');
 assert.ok(existsSync(new URL('assets/memory/pixelify-latin.woff2',root)));
 assert.ok(existsSync(new URL('assets/memory/OFL.txt',root)));
 assert.ok(read('css/memory-archive.css').includes('prefers-reduced-motion'));
});

import {memoryBeat,mountMemoryStory} from '../js/memory-story.mjs';
import {mountMemoryGarden} from '../js/memory-garden.mjs';
test('Eternal Spring opening plays once, then four memories loop',()=>{
 for(const [time,kind] of [[0,'intro'],[4,'intro'],[8,'intro'],[12,'intro'],[15.99,'intro'],[16,'sakura'],[22,'kitten'],[28,'rose'],[34,'butterfly'],[40,'sakura'],[46,'kitten'],[64,'sakura'],[160,'sakura']]){
  assert.equal(memoryBeat(time).kind,kind,String(time));
 }
 for(const time of [15.5,21.5,27.5,33.5,39.5])assert.ok(memoryBeat(time).blend>0);
 assert.equal(memoryBeat(16).blend,0);
 assert.equal(memoryBeat(39.5).next,'sakura');
 assert.equal(memoryBeat(15.5).next,'sakura');
});

function fixture(){
 const listeners=new Map();
 const target=()=>({addEventListener(type,fn){const list=this.events[type]||=[];list.push(fn);this.events[type]=list;},events:{},emit(type,e={}){for(const fn of this.events[type]||[])fn(e);}});
 const host=Object.assign(target(),{dataset:{},classList:{add(){},remove(){}},setAttribute(){},getBoundingClientRect:()=>({left:0,width:192})});
 const canvas=(w=96,h=72)=>{
  const x={width:w,height:h,clientWidth:390,clientHeight:844,parentElement:host,toDataURL:()=>'',getContext:()=>ctx};
  const ctx={canvas:x,fillRect(){},clearRect(){},translate(){},save(){},restore(){},drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(x.width*x.height*4)})};
  return x;
 };
 const elements={grove:canvas(),blossom:canvas(32,32),garden:canvas(160,24),petals:{append(){},style:{}}};
 const doc=Object.assign(target(),{hidden:false,getElementById:id=>elements[id],createDocumentFragment:()=>({append(){}}),createElement:tag=>tag==='canvas'?canvas():{classList:{add(){}},style:{setProperty(){}}},documentElement:{toggleAttribute(name,value){this[name]=value;}}});
 const media=Object.assign(target(),{matches:false});
 let nextId=0;
 const win=Object.assign(target(),{AbortController,matchMedia:()=>media,requestAnimationFrame(fn){listeners.set(++nextId,fn);return nextId;},cancelAnimationFrame(id){listeners.delete(id);}});
 const frame=now=>{const calls=[...listeners.values()];listeners.clear();calls.forEach(fn=>fn(now));};
 return {host,doc,win,media,elements,listeners,frame};
}
test('story interactions never restart opening; reduced motion is static',()=>{
 const {host,doc,win}=fixture();
 const story=mountMemoryStory(doc,win);
 assert.ok(story);story.draw(0);
 host.emit('pointerenter',{pointerType:'mouse',clientX:100});
 assert.equal(story.reaction(),0);
 story.draw(15.5);assert.equal(host.dataset.memoryScene,'intro');
 story.draw(.5);assert.equal(host.dataset.memoryScene,'sakura');
 host.emit('pointerenter',{pointerType:'mouse',clientX:100});
 assert.equal(story.reaction(),1);assert.equal(host.dataset.memoryReacting,'true');
 story.draw(6);assert.equal(host.dataset.memoryScene,'kitten');
 host.emit('pointerdown',{pointerId:1,clientX:20,clientY:20});
 host.emit('pointerup',{pointerId:1,clientX:20,clientY:70});
 assert.equal(story.reaction(),0);
 host.emit('pointerdown',{pointerId:2,clientX:100,clientY:20});
 host.emit('pointerup',{pointerId:2,clientX:100,clientY:20});
 assert.equal(story.reaction(),1);
 const at=story.elapsed();story.draw(0,true);
 assert.equal(story.elapsed(),at);assert.equal(host.dataset.memoryScene,'sakura');
 assert.equal(story.reaction(),0);story.draw(0);
 assert.equal(host.dataset.memoryScene,'kitten');
 story.draw(18);assert.equal(host.dataset.memoryScene,'sakura');
 story.destroy();
});
test('garden clock pauses in hidden tabs and reduced motion, and resumes without restart',async()=>{
 const {host,doc,win,media,elements,listeners,frame}=fixture();
 mountMemoryGarden(doc,win);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(host.dataset.memoryScene,'intro');
 assert.equal(listeners.size,1);
 let now=100;
 for(let i=0;i<70;i++){frame(now);now+=250;}
 assert.equal(host.dataset.memoryScene,'sakura');
 doc.hidden=true;doc.emit('visibilitychange');assert.equal(listeners.size,0);
 assert.equal(doc.documentElement['data-garden-paused'],true);
 elements.grove.clientWidth=844;elements.grove.clientHeight=390;win.emit('resize');
 assert.equal(listeners.size,0);
 doc.hidden=false;doc.emit('visibilitychange');frame(now);now+=250;frame(now);
 assert.equal(host.dataset.memoryScene,'sakura');
 assert.equal(listeners.size,1);
 media.matches=true;media.emit('change');assert.equal(listeners.size,0);
 assert.equal(host.dataset.memoryScene,'sakura');
 media.matches=false;media.emit('change');assert.equal(listeners.size,1);
 win.emit('pagehide',{persisted:true});assert.equal(listeners.size,0);
 win.emit('pageshow');assert.equal(listeners.size,1);
 win.emit('pagehide',{persisted:false});assert.equal(listeners.size,0);
});
