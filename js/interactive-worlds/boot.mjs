import {bindWorldQuality} from '../visual-quality.mjs';
import {earn,getProgress,deviceStorage,IDS,getDiscoveries,saveDiscoveries} from './progress.mjs';
const world=document.body.dataset.world,stage=document.getElementById('iw-stage'),controls=document.getElementById('iw-controls'),consoleEl=document.getElementById('iw-console');
const pause=document.getElementById('iw-pause'),full=document.getElementById('iw-full'),quality=document.getElementById('iw-quality'),sound=document.getElementById('iw-sound'),reset=document.getElementById('iw-reset');
const message=document.getElementById('iw-message'),discovery=document.getElementById('iw-discovery'),badge=document.getElementById('iw-world-badge');
const loaders={room:()=>import('./room.mjs'),universe:()=>import('./universe.mjs'),lab:()=>import('./lab.mjs'),os:()=>import('./os.mjs'),tokyo:()=>import('./tokyo.mjs'),particles:()=>import('./particles.mjs')};
const goals={room:5,universe:3,lab:3,os:5,tokyo:3,particles:3};
const storage=deviceStorage(),motion=matchMedia('(prefers-reduced-motion: reduce)');
let paused=motion.matches,manualPause=false,suspended=false,visible=true,raf=0,last=0,elapsed=0,dirty=true,simulation=null,module=null,soundOn=false,audio=null,found=new Set(),generation=0;
function tier(){return quality.value||'High'}
let wakeTimer=0;
function active(){return !!simulation&&!paused&&!suspended&&visible&&!document.hidden}
function stopFrames(){
 cancelAnimationFrame(raf);raf=0;clearTimeout(wakeTimer);wakeTimer=0;last=0;
}
function invalidate(){dirty=true;schedule()}
function schedule(){if(!raf&&simulation&&visible&&!suspended&&!document.hidden&&(active()||dirty))raf=requestAnimationFrame(frame)}
function frame(now){
 raf=0;const dt=last?Math.min(.05,(now-last)/1000):0;
 last=active()?now:0;
 if(active())elapsed+=dt;
 if(simulation&&(active()||dirty)){dirty=false;simulation.draw?.(active()?dt:0,elapsed);}
 if(active()){
  if(simulation.nextFrameDelay){
   clearTimeout(wakeTimer);
   wakeTimer=setTimeout(invalidate,simulation.nextFrameDelay());
  }else schedule();
 }
}
function sync(){stopFrames();pause.textContent=paused?'Play':'Pause';pause.setAttribute('aria-pressed',String(paused));last=0;invalidate()}
function say(text){message.textContent=text}
function beep(){
 if(!soundOn||!audio)return;
 try{const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(620,audio.currentTime);o.frequency.exponentialRampToValueAtTime(880,audio.currentTime+.12);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.17);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.18)}catch{}
}
function refreshBadge(){const earned=getProgress(storage).includes(world);badge.toggleAttribute('data-earned',earned);discovery.textContent=found.size+' / '+goals[world]+' discovered'+(earned?' · badge collected!':'')}
function discover(id,text){if(!found.has(id)){found.add(id);saveDiscoveries(world,found,storage);if(found.size>=goals[world]){earn(world,storage);say('Badge collected! '+text)}else say(text);if(storage.temporary)say(message.textContent+' Device storage is unavailable. Progress is temporary.');beep();refreshBadge()}else say(text)}
function button(label,action,pressed){const el=document.createElement('button');el.type='button';el.textContent=label;if(pressed!==undefined)el.setAttribute('aria-pressed',String(pressed));el.addEventListener('click',()=>{action(el);invalidate()});controls.append(el);return el}
function range(label,min,max,value,step,action){const wrap=document.createElement('label'),el=document.createElement('input'),out=document.createElement('output');wrap.className='iw-range';wrap.append(document.createTextNode(label+' '));el.type='range';el.min=min;el.max=max;el.step=step;el.value=value;el.setAttribute('aria-label',label);out.textContent=value;el.addEventListener('input',()=>{out.textContent=el.value;action(Number(el.value));invalidate()});wrap.append(el,out);controls.append(wrap);el.updateValue=v=>{el.value=v;out.textContent=el.value};return el}
function select(label,options,action){const wrap=document.createElement('label'),el=document.createElement('select');wrap.className='iw-range';wrap.append(document.createTextNode(label+' '));el.setAttribute('aria-label',label);for(const item of options){const o=document.createElement('option');o.value=typeof item==='string'?item:item[0];o.textContent=typeof item==='string'?item:item[1];el.append(o)}el.addEventListener('change',()=>{action(el.value);invalidate()});wrap.append(el);controls.append(wrap);return el}
function canvas(w,h,pixel=false){const c=document.createElement('canvas');c.width=w;c.height=h;c.tabIndex=0;c.setAttribute('aria-label','Interactive '+world+' scene. Controls are also available below.');if(pixel)c.className='iw-pixel';stage.replaceChildren(c);return c}
function point(c,e){const r=c.getBoundingClientRect();return {x:(e.clientX-r.left)/Math.max(1,r.width)*c.width,y:(e.clientY-r.top)/Math.max(1,r.height)*c.height}}
function drag(c,move,pinch){
 const points=new Map();
 const distance=()=>{const [a,b]=[...points.values()];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0};
 c.addEventListener('pointerdown',e=>{if(e.button>0)return;points.set(e.pointerId,point(c,e));try{c.setPointerCapture(e.pointerId)}catch{}});
 c.addEventListener('pointermove',e=>{if(!points.has(e.pointerId))return;const prev=points.get(e.pointerId),p=point(c,e),oldDistance=distance();points.set(e.pointerId,p);
  if(points.size===1)move(p.x-prev.x,p.y-prev.y,p);
  else if(pinch&&oldDistance>1)pinch(distance()/oldDistance);
  invalidate();
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(event,e=>points.delete(e.pointerId));
 c.addEventListener('keydown',e=>{const map={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]};if(map[e.key]){e.preventDefault();move(...map[e.key]);invalidate()}else if(pinch&&(e.key==='+'||e.key==='='||e.key==='-')){e.preventDefault();pinch(e.key==='-'?.9:1.1);invalidate()}})
}
const api={stage,controls,canvas,button,range,select,point,drag,invalidate,say,discover,tier,beep};
const loading=stage.firstElementChild.cloneNode(true);
async function mount(resetWorld=false){
 const id=++generation;
 stopFrames();simulation?.dispose?.();simulation=null;
 stage.replaceChildren(loading.cloneNode(true));stage.setAttribute('aria-busy','true');
 controls.replaceChildren();
 if(resetWorld)saveDiscoveries(world,new Set(),storage);
 found=new Set(getDiscoveries(world,storage));elapsed=0;last=0;say('Explore at your own pace.');refreshBadge();
 try{module=module||await loaders[world]();if(id!==generation)return;simulation=module.mount(api)||{};simulation.resize?.();stage.setAttribute('aria-busy','false');invalidate();}
 catch(error){if(id!==generation)return;stage.replaceChildren();stage.setAttribute('aria-busy','false');const p=document.createElement('p');p.className='iw-message';p.textContent='This graphics experience could not start on this device. Try Reset world or choose another world.';stage.append(p);say('World initialization failed.');console.warn('World initialization failed',error);invalidate()}
}
function updateFullscreen(){
 const on=document.fullscreenElement===consoleEl||consoleEl.classList.contains('iw-expanded');
 full.setAttribute('aria-pressed',String(on));
 full.textContent=on?'Exit fullscreen':'Fullscreen';
}
function expandFallback(expanded){
 consoleEl.classList.toggle('iw-expanded',expanded);
 document.body.classList.toggle('iw-fullscreen-fallback',expanded);
 for(const sibling of [...consoleEl.parentElement.children,...document.querySelectorAll('body > header')]){
  if(sibling!==consoleEl)sibling.inert=expanded;
 }
 full.focus({preventScroll:true});
}
full.addEventListener('click',async()=>{
 try{
  if(document.fullscreenElement===consoleEl)await document.exitFullscreen();
  else if(consoleEl.classList.contains('iw-expanded'))expandFallback(false);
  else if(consoleEl.requestFullscreen){
   try{await consoleEl.requestFullscreen()}catch{expandFallback(true)}
  }else expandFallback(true);
 }catch{say('Fullscreen could not be changed.')}
 updateFullscreen();invalidate();
});
document.addEventListener('fullscreenchange',updateFullscreen);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&consoleEl.classList.contains('iw-expanded')){
  expandFallback(false);updateFullscreen();
 }
});
pause.addEventListener('click',()=>{manualPause=true;paused=!paused;sync()});motion.addEventListener('change',()=>{if(motion.matches){paused=true;manualPause=false}else if(!manualPause)paused=false;sync()});
bindWorldQuality(quality,()=>{simulation?.resize?.();say('Graphics quality: '+tier()+' · all worlds');invalidate()});reset.addEventListener('click',()=>mount(true));
sound.addEventListener('click',async()=>{if(!soundOn){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('audio unavailable');audio=audio||new Audio();await audio.resume();soundOn=true}catch{say('Audio is not available on this device.');return}}else{soundOn=false;audio?.suspend?.().catch(()=>{})}sound.setAttribute('aria-pressed',String(soundOn));sound.textContent=soundOn?'Sound on':'Sound off';beep()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopFrames();}else invalidate()});
window.addEventListener('pagehide',e=>{suspended=true;stopFrames();if(!e.persisted){generation++;simulation?.dispose?.();simulation=null;audio?.close?.().catch(()=>{})}});
function restoreProgress(){
 found=new Set(getDiscoveries(world,storage));
 refreshBadge();
}
window.addEventListener('storage',restoreProgress);
window.addEventListener('pageshow',()=>{suspended=false;restoreProgress();invalidate()});
if('IntersectionObserver' in window){new IntersectionObserver(items=>{visible=items[0].isIntersecting;stopFrames();if(visible)invalidate()},{threshold:.05}).observe(stage)}
if(IDS.includes(world)){[pause,full,quality,sound,reset].forEach(el=>el.disabled=false);quality.title='Shared graphics preference for all six worlds';sync();mount()}
