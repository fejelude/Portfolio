import {mountMovement,watchSVG} from './feje-tourbillon-art.mjs';

export const ASPECTS=Object.freeze({normal:'4 / 3',landscape:'16 / 9',portrait:'3 / 4',square:'1 / 1'});
const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Manila',hourCycle:'h23',hour:'2-digit',minute:'2-digit',second:'2-digit'});
const storageKey='fejelude.tourbillon.aspect.v1';
const manifestUrl='/assets/tourbillon/projection.json';
export function manilaParts(date){
 const pieces={};for(const part of fmt.formatToParts(date))if(['hour','minute','second'].includes(part.type))pieces[part.type]=Number(part.value);
 return {...pieces,millisecond:date.getUTCMilliseconds()};
}
export function handAngles(t){
 const seconds=t.second+t.millisecond/1000;
 return {hour:(t.hour%12+t.minute/60+seconds/3600)*30,minute:(t.minute+seconds/60)*6,second:seconds*6};
}
export function mountTourbillon(root){
 if(!root)return ()=>{};
 const stage=root.querySelector('[data-ft-stage]'),watch=root.querySelector('[data-ft-watch]'),output=root.querySelector('#ft-time'),note=root.querySelector('#ft-detail');
 const buttons=[...root.querySelectorAll('[data-ft-ratio]')],hotspots=[...root.querySelectorAll('[data-ft-inspect]')],pause=root.querySelector('[data-ft-pause]');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const controller=new AbortController(),signal=controller.signal;
 const handle=(node,event,callback,options)=>node.addEventListener(event,callback,{...options,signal});
 const alwaysVisible=!('IntersectionObserver' in window);
 let visible=alwaysVisible,onStage=alwaysVisible,suspended=false,paused=false,clock=0,observer,load,move,selected='',hands,drag=null;
 function setRatio(value){
  if(!Object.hasOwn(ASPECTS,value))return;
  stage.dataset.aspect=value;root.querySelector('.ft-card').dataset.ftAspect=value;
  buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ftRatio===value)));
  try{localStorage.setItem(storageKey,value)}catch{}
 }
 try{const saved=localStorage.getItem(storageKey);if(saved)setRatio(saved)}catch{}
 for(const button of buttons)handle(button,'click',()=>setRatio(button.dataset.ftRatio));
 const details={
  orbit:'Earth and moon. I gave the globe gold coastlines and cut the moon from silver and ice-blue facets.',
  gears:'The central hub ties the satellites together with twin bridges, shafts and exposed pinions.',
  tourbillon:'Tourbillon-inspired cage. The outer carriage, tilted inner ring and balance are a digital interpretation.'
 };
 for(const button of hotspots)handle(button,'click',()=>{
  selected=selected===button.dataset.ftInspect?'':button.dataset.ftInspect;
  hotspots.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ftInspect===selected)));
  note.textContent=details[selected]||'Drag gently to tilt the case, or pick a part to inspect.';
 });
 function loadArt(){
  if(load)return;
  load=fetch(manifestUrl,{signal}).then(response=>{
   if(!response.ok)throw Error('Watch geometry unavailable');
   return response.json();
  }).then(manifest=>{
   if(signal.aborted)return;
   watch.insertAdjacentHTML('beforeend',watchSVG(manifest));
   hands=Object.fromEntries(['hour','minute','second'].map(name=>[name,watch.querySelector('#ft-'+name+'-hand')]));
   move=mountMovement(watch.querySelector('canvas'),manifest);
   sync();
  }).catch(()=>{}); // The poster and digital Manila clock remain usable.
 }
 function updateTime(){
  const date=new Date(),parts=manilaParts(date);
  output.textContent=[parts.hour,parts.minute,parts.second].map(v=>String(v).padStart(2,'0')).join(':');
  output.dateTime=date.toISOString();
  if(hands){
   const angles=handAngles({...parts,millisecond:0});
   for(const [name,angle] of Object.entries(angles))hands[name].setAttribute('transform','rotate('+angle+')');
  }
  clock=setTimeout(updateTime,1000-date.getUTCMilliseconds());
 }
 function sync(){
  const active=visible&&!document.hidden&&!suspended;
  clearTimeout(clock);
  if(active){loadArt();updateTime()}
  const animate=active&&onStage&&!paused&&!reduced.matches;
  stage.toggleAttribute('data-running',animate);
  move?.(animate);
  pause.disabled=reduced.matches;
  if(reduced.matches)resetTilt();
 }
 handle(pause,'click',()=>{
  paused=!paused;pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Resume movement':'Pause movement';sync();
 });
 function tilt(event){
  if(reduced.matches||!onStage||(event.pointerType!=='mouse'&&drag!==event.pointerId))return;
  const r=watch.getBoundingClientRect(),clamp=n=>Math.min(1,Math.max(-1,n));
  const x=clamp((event.clientX-r.left)/r.width*2-1),y=clamp((event.clientY-r.top)/r.height*2-1);
  watch.style.setProperty('--ft-x',(-y*5)+'deg');watch.style.setProperty('--ft-y',(x*7)+'deg');
 }
 function resetTilt(){drag=null;watch.style.removeProperty('--ft-x');watch.style.removeProperty('--ft-y')}
 handle(watch,'pointerdown',event=>{if(event.isPrimary&&event.button===0)drag=event.pointerId},{passive:true});
 handle(watch,'pointermove',tilt,{passive:true});
 for(const event of ['pointerleave','pointerup','pointercancel'])handle(watch,event,resetTilt,{passive:true});
 if(!alwaysVisible){
  observer=new IntersectionObserver(entries=>{
   for(const entry of entries){
    if(entry.target===root)visible=entry.isIntersecting;
    else onStage=entry.isIntersecting;
   }
   sync();
  });
  observer.observe(root);observer.observe(stage);
 }
 handle(document,'visibilitychange',sync);
 handle(reduced,'change',sync);
 handle(window,'pageshow',()=>{suspended=false;sync()});
 handle(window,'pagehide',event=>{suspended=true;sync();if(!event.persisted)dispose()});
 function dispose(){controller.abort();observer?.disconnect();clearTimeout(clock);move?.(false)}
 sync();
 return dispose;
}
if(typeof document!=='undefined')mountTourbillon(document.getElementById('tourbillon'));
