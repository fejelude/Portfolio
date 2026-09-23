import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync, existsSync} from 'node:fs';

const script = readFileSync(new URL('../js/surprise.js', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../assets/surprise/manifest.json', import.meta.url)));
// Deterministic DOM/media harness: exercise the production controller, including
// rejected/pending play promises, stalled clocks, lifecycle events and animation disposal.
function harness({reduced=false, mobile=false, playback='success'}={}) {
  let now=0, frames=new Map(), frameId=0, media, fills=0, peakFills=0;
  const animations=new Set();
  class Target {
    listeners=new Map();
    addEventListener(type, fn, options={}) {
      const set=this.listeners.get(type)||new Set(); set.add(fn);this.listeners.set(type,set);
      options.signal?.addEventListener('abort',()=>set.delete(fn),{once:true});
    }
    fire(type,props={}) {for(const fn of [...(this.listeners.get(type)||[])])fn({type,...props});}
  }
  class Element extends Target {
    constructor(tag='div') {super();this.tagName=tag;this.children=[];this.attributes={};this.style={setProperty(k,v){this[k]=v;}};this.dataset={};this.className='';this.textContent='';this.classList={add:(c)=>{this.className+=' '+c;},remove:(c)=>{this.className=this.className.split(' ').filter(x=>x!==c).join(' ');}};}
    append(el){el.parent=this;this.children.push(el);}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null;}
    setAttribute(k,v){this.attributes[k]=String(v);}
    removeAttribute(k){delete this.attributes[k];}
    contains(el){return this===el||this.children.some(x=>x.contains(el));}
    get isConnected(){return this===document.body||!!this.parent?.isConnected;}
    getBoundingClientRect(){return {left:100,top:400,width:160,height:48};}
    focus(){document.activeElement=this;}
    animate(frames,options){const a={frames,until:now+options.duration,cancel(){animations.delete(a);},onfinish:null};animations.add(a);return a;}
    getContext(){return new Proxy({clearRect(){peakFills=Math.max(peakFills,fills);fills=0;},fill(){fills++;}},{get:(o,k)=>o[k]||(()=>{})});}
  }
  const document=new Target();document.body=new Element('body');document.activeElement=document.body;
  const trigger=new Element('button'),status=new Element('p');document.body.append(trigger);document.body.append(status);
  document.getElementById=id=>id==='surprise-trigger'?trigger:status;document.createElement=t=>new Element(t);
  const motion=new Target();motion.matches=reduced;
  class Audio extends Target {
    constructor(){super();media=this;this.currentTime=0;this.paused=true;this.muted=false;this.playCalls=0;}
    set src(v){this._src=v;this.currentTime=0;this.duration=manifest.tracks.find(t=>t.src===v)?.duration;}
    get src(){return this._src;}
    load(){}
    play(){this.playCalls++;this.paused=false;if(playback==='reject')return Promise.reject(new Error('NotAllowedError'));if(playback==='pending')return new Promise(()=>{});return Promise.resolve();}
    pause(){this.paused=true;}
  }
  const window=new Target();window.FejeSurpriseAssets=manifest;window.visualViewport=new Target();window.visualViewport.width=mobile?390:1440;window.visualViewport.height=mobile?844:900;
  vm.runInNewContext(script,{window,document,Audio,Image:Element,AbortController,matchMedia:q=>q.includes('reduced')?motion:{matches:mobile},innerWidth:mobile?390:1440,innerHeight:900,devicePixelRatio:3,performance:{now:()=>now},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),console});
  const find=(cls,root=document.body)=>root.className.split(' ').includes(cls)?root:root.children.map(x=>find(cls,x)).find(Boolean);
  async function click(){trigger.fire('click');await new Promise(resolve=>setImmediate(resolve));}
  function step(ms,{stall=false}={}) {
    const ticks=Math.ceil(ms/16);
    for(let i=0;i<ticks;i++) {
      now+=16;if(!media.paused&&!stall&&playback==='success')media.currentTime+=.016;
      for(const a of [...animations])if(now>=a.until){animations.delete(a);a.onfinish?.();}
      const list=[...frames.values()];frames.clear();list.forEach(fn=>fn(now));
    }
  }
  function clean(){assert.equal(find('kawaii-world'),undefined);assert.equal(frames.size,0);assert.equal(animations.size,0);assert.equal(media.paused,true);assert.equal(trigger.attributes['aria-disabled'],undefined);assert.ok(!document.body.className.includes('kawaii-active'));}
  return {click,step,find,clean,media,document,trigger,motion,window,animations,peak:()=>Math.max(fills,peakFills)};
}

test('every asset exists, hero is the selected ninth image, and cues fit all full tracks',()=>{
 assert.equal(manifest.images.length,32);assert.equal(manifest.tracks.length,4);
 assert.equal(manifest.images.find(i=>i.src===manifest.hero).original,'8DE684AF-8DBE-4B35-91FB-9686773CD2BF.jpeg');
 for(const {src} of [...manifest.images,...manifest.tracks])assert.ok(readFileSync(new URL('..'+src,import.meta.url)).length > 100, `${src} must contain media data`);
 for(const t of manifest.tracks){assert.ok(t.duration>=21&&t.duration<26);assert.ok(t.reveal>3&&t.reveal<t.duration-3);}
});
test('plays immediately, prevents click stacking, reveals, and follows full audio length',async()=>{
 const h=harness();await h.click();assert.equal(h.media.playCalls,1);const duration=h.media.duration;
 await h.click();await h.click();assert.equal(h.media.playCalls,1);
 h.step(14500);assert.equal(h.find('kawaii-reveal').style.visibility,'visible');assert.ok(h.find('kawaii-world'));
 h.step((duration-14.5)*1000+100);h.clean();assert.ok(h.peak()<=150);
});
test('replay avoids the previous track and resets audio/mute state',async()=>{
 const h=harness();for(let i=0;i<5;i++){await h.click();const src=h.media.src;h.find('kawaii-controls').children[1].fire('click');assert.equal(h.media.muted,true);h.step(h.media.duration*1000+100);h.clean();assert.notEqual(h.media.src,src);assert.equal(h.media.muted,false);}
});
test('blocked audio completes a silent sequence and unlocks replay',async()=>{
 const h=harness({playback:'reject'});await h.click();assert.equal(h.find('kawaii-controls').children[1].textContent,'Sound unavailable');h.step(27000);h.clean();await h.click();assert.ok(h.find('kawaii-world'));
});
test('never-settling play promise times out instead of deadlocking',async()=>{
 const h=harness({playback:'pending'});await h.click();h.step(4500);assert.equal(h.find('kawaii-controls').children[1].disabled,true);h.step(27000);h.clean();
});
test('stalled playback switches to a monotonic silent clock',async()=>{
 const h=harness();await h.click();h.step(2000);h.step(3500,{stall:true});assert.equal(h.media.paused,true);h.step(27000);h.clean();
});
test('End restores focus and removes all running effects',async()=>{
 const h=harness();await h.click();h.step(4000);const end=h.find('kawaii-controls').children[2];end.focus();end.fire('click');h.clean();assert.equal(h.document.activeElement,h.trigger);
});
test('Escape, pagehide, visibility change and motion changes each clean up',async()=>{
 for(const event of ['Escape','pagehide','visibilitychange','change']){const h=harness();await h.click();h.step(1000);if(event==='Escape')h.document.fire('keydown',{key:'Escape'});if(event==='pagehide')h.window.fire(event);if(event==='visibilitychange'){h.document.hidden=true;h.document.fire(event);}if(event==='change')h.motion.fire(event);h.clean();}
});
test('reduced motion displays the reveal gently with no flying stickers',async()=>{
 const h=harness({reduced:true});await h.click();h.step(14500);assert.equal(h.find('kawaii-world').dataset.reduced,'true');assert.equal(h.find('kawaii-reveal').style.visibility,'visible');assert.equal(h.find('kawaii-sticker'),undefined);h.step(27000);h.clean();assert.ok(h.peak()<=12);
});
test('mobile particle count stays bounded under sustained pointer activity',async()=>{
 const h=harness({mobile:true});await h.click();h.step(14000);for(let i=0;i<100;i++){h.window.fire('pointermove',{clientX:180,clientY:300});h.step(60);}assert.ok(h.peak()<=72);h.window.visualViewport.width=844;h.window.visualViewport.height=390;h.window.fire('resize');assert.equal(h.find('kawaii-canvas').width,1266);h.step(27000);h.clean();
});

test('hero reveal shares the sound cue and leaves room for the complete effect',async()=>{
 const h=harness();await h.click();const track=manifest.tracks.find(t=>t.src===h.media.src);
 h.step((track.reveal-.1)*1000);assert.notEqual(h.find('kawaii-reveal').style.visibility,'visible');
 h.step(120);assert.equal(h.find('kawaii-reveal').style.visibility,'visible');
 assert.ok(track.duration>=track.reveal+manifest.effectDuration);
 h.step(manifest.effectDuration*1000-200);assert.ok(h.find('kawaii-world'));
 h.document.fire('keydown',{key:'Escape'});h.clean();
});
