import {earn,getProgress,deviceStorage,IDS} from './progress.mjs';
const world=document.body.dataset.world,stage=document.getElementById('iw-stage'),controls=document.getElementById('iw-controls'),consoleEl=document.getElementById('iw-console');
const pause=document.getElementById('iw-pause'),full=document.getElementById('iw-full'),quality=document.getElementById('iw-quality'),sound=document.getElementById('iw-sound'),reset=document.getElementById('iw-reset');
const message=document.getElementById('iw-message'),discovery=document.getElementById('iw-discovery'),badge=document.getElementById('iw-world-badge');
const loaders={room:()=>import('./room.mjs'),universe:()=>import('./universe.mjs'),lab:()=>import('./lab.mjs'),os:()=>import('./os.mjs'),tokyo:()=>import('./tokyo.mjs'),particles:()=>import('./particles.mjs')};
const goals={room:5,universe:3,lab:3,os:5,tokyo:3,particles:3};
const storage=deviceStorage(),motion=matchMedia('(prefers-reduced-motion: reduce)');
let paused=motion.matches,manualPause=false,suspended=false,visible=true,raf=0,last=0,elapsed=0,dirty=true,simulation=null,module=null,soundOn=false,audio=null,found=new Set(),generation=0;
let autoTier=innerWidth<650?'Low':'Medium',samples=0,slow=0;
function tier(){return quality.value==='Auto'?autoTier:quality.value}
function active(){return !paused&&!suspended&&visible&&!document.hidden}
function invalidate(){dirty=true;schedule()}
function schedule(){if(!raf&&!suspended&&!document.hidden&&(active()||dirty))raf=requestAnimationFrame(frame)}
function frame(now){
 raf=0;const dt=last?Math.min(.05,(now-last)/1000):0;
 if(active()&&last&&quality.value==='Auto'&&samples<120){samples++;if(now-last>27)slow++;if(samples===120&&slow>40&&autoTier!=='Low'){autoTier='Low';simulation?.resize?.();}}
 last=active()?now:0;
 if(active())elapsed+=dt;
 if(simulation&&(active()||dirty)){dirty=false;simulation.draw?.(active()?dt:0,elapsed);}
 if(active())schedule();
}
function sync(){pause.textContent=paused?'Play':'Pause';pause.setAttribute('aria-pressed',String(paused));last=0;invalidate()}
function say(text){message.textContent=text}
function beep(){
 if(!soundOn||!audio)return;
 try{const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(620,audio.currentTime);o.frequency.exponentialRampToValueAtTime(880,audio.currentTime+.12);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.17);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.18)}catch{}
}
function refreshBadge(){const earned=getProgress(storage).includes(world);badge.toggleAttribute('data-earned',earned);discovery.textContent=found.size+' / '+goals[world]+' discovered'+(earned?' · badge collected!':'')}
function discover(id,text){if(!found.has(id)){found.add(id);if(found.size>=goals[world]){earn(world,storage);say('Badge collected! '+text)}else say(text);beep();refreshBadge()}else say(text)}
function button(label,action,pressed){const el=document.createElement('button');el.type='button';el.textContent=label;if(pressed!==undefined)el.setAttribute('aria-pressed',String(pressed));el.addEventListener('click',()=>{action(el);invalidate()});controls.append(el);return el}
function range(label,min,max,value,step,action){const wrap=document.createElement('label'),el=document.createElement('input'),out=document.createElement('output');wrap.className='iw-range';wrap.append(document.createTextNode(label+' '));el.type='range';el.min=min;el.max=max;el.step=step;el.value=value;el.setAttribute('aria-label',label);out.textContent=value;el.addEventListener('input',()=>{out.textContent=el.value;action(Number(el.value));invalidate()});wrap.append(el,out);controls.append(wrap);return el}
function select(label,options,action){const wrap=document.createElement('label'),el=document.createElement('select');wrap.className='iw-range';wrap.append(document.createTextNode(label+' '));el.setAttribute('aria-label',label);for(const item of options){const o=document.createElement('option');o.value=typeof item==='string'?item:item[0];o.textContent=typeof item==='string'?item:item[1];el.append(o)}el.addEventListener('change',()=>{action(el.value);invalidate()});wrap.append(el);controls.append(wrap);return el}
function canvas(w,h,pixel=false){const c=document.createElement('canvas');c.width=w;c.height=h;c.tabIndex=0;c.setAttribute('aria-label','Interactive '+world+' scene. Controls are also available below.');if(pixel)c.className='iw-pixel';stage.replaceChildren(c);return c}
function point(c,e){const r=c.getBoundingClientRect();return {x:(e.clientX-r.left)/Math.max(1,r.width)*c.width,y:(e.clientY-r.top)/Math.max(1,r.height)*c.height}}
function drag(c,move){let previous=null;c.addEventListener('pointerdown',e=>{if(e.button>0)return;previous=point(c,e);try{c.setPointerCapture(e.pointerId)}catch{}});
 c.addEventListener('pointermove',e=>{if(!previous)return;const p=point(c,e);move(p.x-previous.x,p.y-previous.y,p);previous=p;invalidate()});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(event,()=>{previous=null});
 c.addEventListener('keydown',e=>{const map={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]};if(map[e.key]){e.preventDefault();move(...map[e.key]);invalidate()}})
}
const api={stage,controls,canvas,button,range,select,point,drag,invalidate,say,discover,tier,beep};
async function mount(){
 const id=++generation;simulation?.dispose?.();simulation=null;stage.replaceChildren();controls.replaceChildren();found=new Set();elapsed=0;last=0;refreshBadge();
 try{module=module||await loaders[world]();if(id!==generation)return;simulation=module.mount(api)||{};simulation.resize?.();say('Explore at your own pace.');invalidate();}
 catch(error){if(id!==generation)return;stage.replaceChildren();const p=document.createElement('p');p.className='iw-message';p.textContent='This graphics experience could not start on this device. Try Reset world or choose another world.';stage.append(p);say('World initialization failed.');console.warn('World initialization failed',error);invalidate()}
}
function updateFullscreen(){const on=document.fullscreenElement===consoleEl||consoleEl.classList.contains('iw-expanded');full.setAttribute('aria-pressed',String(on));full.textContent=on?'Exit fullscreen':'Fullscreen'}
full.addEventListener('click',async()=>{if(document.fullscreenElement===consoleEl){await document.exitFullscreen();}else if(consoleEl.classList.contains('iw-expanded')){consoleEl.classList.remove('iw-expanded');}else{try{if(!consoleEl.requestFullscreen)throw Error('fullscreen unsupported');await consoleEl.requestFullscreen()}catch{consoleEl.classList.add('iw-expanded')}}updateFullscreen();invalidate()});
document.addEventListener('fullscreenchange',updateFullscreen);document.addEventListener('keydown',e=>{if(e.key==='Escape'){consoleEl.classList.remove('iw-expanded');updateFullscreen()}});
pause.addEventListener('click',()=>{manualPause=true;paused=!paused;sync()});motion.addEventListener('change',()=>{if(motion.matches){paused=true;manualPause=false}else if(!manualPause)paused=false;sync()});
quality.addEventListener('change',()=>{simulation?.resize?.();say('Graphics quality: '+tier());invalidate()});reset.addEventListener('click',mount);
sound.addEventListener('click',async()=>{if(!soundOn){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('audio unavailable');audio=audio||new Audio();await audio.resume();soundOn=true}catch{say('Audio is not available on this device.');return}}else{soundOn=false;audio?.suspend?.().catch(()=>{})}sound.setAttribute('aria-pressed',String(soundOn));sound.textContent=soundOn?'Sound on':'Sound off';beep()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else invalidate()});
window.addEventListener('pagehide',e=>{suspended=true;cancelAnimationFrame(raf);raf=0;last=0;if(!e.persisted){simulation?.dispose?.();audio?.close?.().catch(()=>{})}});
window.addEventListener('pageshow',()=>{suspended=false;invalidate()});
if('IntersectionObserver' in window){new IntersectionObserver(items=>{visible=items[0].isIntersecting;last=0;invalidate()},{threshold:.05}).observe(stage)}
if(IDS.includes(world)){[pause,full,quality,sound,reset].forEach(el=>el.disabled=false);sync();mount()}
