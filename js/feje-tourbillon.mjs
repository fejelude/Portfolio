import {watchSVG} from './feje-tourbillon-art.mjs';
/* Real Philippine clock hands + optional interaction. Art is inserted once near the viewport. */
export const ASPECTS=Object.freeze({normal:'4 / 3',landscape:'16 / 9',portrait:'3 / 4',square:'1 / 1'});
const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Manila',hourCycle:'h23',hour:'2-digit',minute:'2-digit',second:'2-digit'});
export function manilaParts(date){
 const pieces={};for(const part of fmt.formatToParts(date))if(['hour','minute','second'].includes(part.type))pieces[part.type]=Number(part.value);
 return {...pieces,millisecond:date.getUTCMilliseconds()};
}
export function handAngles(t){
 const seconds=t.second+t.millisecond/1000;
 return {hour:(t.hour%12+t.minute/60+seconds/3600)*30,minute:(t.minute+seconds/60)*6,second:seconds*6};
}
export function mountTourbillon(root){
 if(!root)return()=>{};
 const stage=root.querySelector('[data-ft-stage]'),watch=root.querySelector('[data-ft-watch]'),output=root.querySelector('#ft-time'),note=root.querySelector('#ft-detail');
 const buttons=[...root.querySelectorAll('[data-ft-ratio]')],hotspots=[...root.querySelectorAll('[data-ft-inspect]')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),coarse=matchMedia('(pointer: coarse)');
 const storageKey='fejelude.tourbillon.aspect.v1';
 let loaded=false,visible=!('IntersectionObserver' in window),observer,running=false,raf=0,lastFrame=-Infinity,lastTick=-1,cachedParts=null,hands,tiltQueued=false,selected='';
 function setRatio(value){
  if(!Object.hasOwn(ASPECTS,value))return;
  stage.dataset.aspect=value;root.querySelector('.ft-card').dataset.ftAspect=value;
  buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ftRatio===value)));
  try{localStorage.setItem(storageKey,value)}catch{}
 }
 try{const saved=localStorage.getItem(storageKey);if(saved)setRatio(saved)}catch{}
 buttons.forEach(button=>button.addEventListener('click',()=>setRatio(button.dataset.ftRatio)));
 const details={
  orbit:'Orbital display. I coded a little planetary complication into the dial.',
  gears:'Gear train. The little wheels, bridges and jewels are all original SVG artwork.',
  tourbillon:'Tourbillon-inspired cage. This is a digital animation, not a real mechanical movement.'
 };
 hotspots.forEach(button=>{
  button.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>{
   selected=selected===button.dataset.ftInspect?'':button.dataset.ftInspect;
   hotspots.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ftInspect===selected)));
   note.textContent=details[selected]||'Real Philippine time. The moving parts are my own little mechanical experiment.';
  });
 });
 function render(){
  if(loaded)return;
  watch.insertAdjacentHTML('afterbegin',watchSVG());
  watch.querySelector('.ft-watch-poster')?.remove();
  hands={hour:watch.querySelector('#ft-hour-hand'),minute:watch.querySelector('#ft-minute-hand'),second:watch.querySelector('#ft-second-hand')};
  loaded=true;
 }
 function updateTime(epoch){
  const secondKey=Math.floor(epoch/1000);
  if(secondKey!==lastTick){
   lastTick=secondKey;cachedParts=manilaParts(new Date(epoch));
   output.textContent=[cachedParts.hour,cachedParts.minute,cachedParts.second].map(v=>String(v).padStart(2,'0')).join(':');
   output.dateTime=new Date(epoch).toISOString();
  }
  const a=handAngles({...cachedParts,millisecond:epoch%1000});
  for(const name of ['hour','minute','second'])hands[name].setAttribute('transform','rotate('+a[name]+' 360 360)');
 }
 function tick(now){
  if(!running)return;
  const delay=reduced.matches?1000:coarse.matches?65:34;
  if(now-lastFrame>=delay){lastFrame=now;updateTime(Date.now())}
  raf=requestAnimationFrame(tick);
 }
 function sync(){
  const should=visible&&!document.hidden;
  stage.toggleAttribute('data-running',should&&!reduced.matches);
  if(should&&!running){render();running=true;lastFrame=-Infinity;lastTick=-1;updateTime(Date.now());raf=requestAnimationFrame(tick)}
  else if(!should&&running){running=false;cancelAnimationFrame(raf)}
  if(reduced.matches){watch.style.removeProperty('--ft-x');watch.style.removeProperty('--ft-y')}
 }
 function move(event){
  if(reduced.matches||(event.pointerType!=='mouse'&&event.buttons!==1)||tiltQueued)return;
  const rect=watch.getBoundingClientRect(),dx=Math.max(-1,Math.min(1,(event.clientX-rect.left-rect.width/2)/(rect.width/2))),dy=Math.max(-1,Math.min(1,(event.clientY-rect.top-rect.height/2)/(rect.height/2)));
  tiltQueued=true;
  requestAnimationFrame(()=>{tiltQueued=false;if(!root.isConnected)return;watch.style.setProperty('--ft-x',(-dy*5)+'deg');watch.style.setProperty('--ft-y',(dx*5)+'deg')});
 }
 const resetTilt=()=>{watch.style.setProperty('--ft-x','0deg');watch.style.setProperty('--ft-y','0deg')};
 watch.addEventListener('pointermove',move,{passive:true});
 watch.addEventListener('pointerleave',resetTilt,{passive:true});
 watch.addEventListener('pointerup',resetTilt,{passive:true});
 if('IntersectionObserver' in window){observer=new IntersectionObserver(entries=>{visible=!!entries[0]?.isIntersecting;sync()},{rootMargin:'240px 0px',threshold:0});observer.observe(root)}
 document.addEventListener('visibilitychange',sync);
 reduced.addEventListener?.('change',sync);
 window.addEventListener('pageshow',sync);
 sync();
 return()=>{
  running=false;cancelAnimationFrame(raf);observer?.disconnect();
  document.removeEventListener('visibilitychange',sync);reduced.removeEventListener?.('change',sync);window.removeEventListener('pageshow',sync);
  watch.removeEventListener('pointermove',move);watch.removeEventListener('pointerleave',resetTilt);watch.removeEventListener('pointerup',resetTilt);
 };
}
if(typeof document!=='undefined')mountTourbillon(document.getElementById('tourbillon'));
