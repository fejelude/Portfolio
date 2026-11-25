import {mountAstrolabe,SKY_PERIOD} from './feje-tourbillon-astrolabe.mjs';

export const ASPECTS=Object.freeze({normal:'4 / 3',landscape:'16 / 9',portrait:'3 / 4',square:'1 / 1'});
const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Manila',hourCycle:'h23',hour:'2-digit',minute:'2-digit',second:'2-digit'});
const storageKey='fejelude.tourbillon.aspect.v1';

export function manilaParts(date){
 const pieces={};for(const part of fmt.formatToParts(date))if(['hour','minute','second'].includes(part.type))pieces[part.type]=Number(part.value);
 return {...pieces,millisecond:date.getUTCMilliseconds()};
}
// Every modeled shaft returns to its starting orientation after this span.
export function movementSeconds({hour,minute,second,millisecond=0}){
 return (hour%12)*3600+minute*60+second+millisecond/1000;
}

export function mountTourbillon(root){
 if(!root)return ()=>{};
 const stage=root.querySelector('[data-ft-stage]'),canvas=root.querySelector('.ft-model');
 const astrolabe=mountAstrolabe(root.querySelector('[data-ft-astro]'),root.querySelector('[data-ft-astro-status]'));
 const output=root.querySelector('#ft-time'),note=root.querySelector('#ft-detail');
 const buttons=[...root.querySelectorAll('[data-ft-ratio]')],hotspots=[...root.querySelectorAll('[data-ft-inspect]')];
 const pause=root.querySelector('[data-ft-pause]');
 const viewButtons=[...root.querySelectorAll('[data-ft-view]')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(pointer: coarse)').matches;
 const controller=new AbortController(),{signal}=controller;
 const on=(element,event,handler,options)=>element.addEventListener(event,handler,{...options,signal});
 const fallback=root.querySelector('[data-ft-fallback]');
 const alwaysVisible=!('IntersectionObserver' in window);
 const controls=[pause,...viewButtons,...hotspots];
 const details={
  tourbillon:'The inner cage makes one turn per minute. Its transverse yoke turns every five minutes.',
  escapement:'Each beat unlocks one ruby pallet, advances the escape wheel half a tooth, and locks on the other pallet.',
  gears:'Follow the silver wheels from the cage shaft to the dial. A bevel pair turns the drive into the slanted face, and the motion works reduce minute speed to hour speed by 12:1.',
  dial:'Behind the dial, the seconds staff runs inside the minute tube and hour pipe. The gold motion wheel drives the hour hand once per 12 hours.',
  orbit:'Earth and moon each turn on two axes once per minute.',
  carrier:'Four arms orbit the centre every 20 minutes. A fixed sun wheel and an idler keep the dial upright.',
  case:'Rose-gold lugs hold steel spring bars under the domed sapphire.',
  back:'Turn the case over to see the engraved plate, inset winding bows and folding clasp.'
 };
 const defaultNote='Drag to orbit. Pinch or use + and − to zoom.';
 let visible=alwaysVisible,onStage=alwaysVisible,suspended=false,paused=false,contextLost=false;
 let observer,resizer,load,model,selected='',clock=0,frame=0,clockParts,skySeconds=0,last=0,lastPaint=-Infinity,dirty=true;
 const pointers=new Map();
 const live=()=>visible&&!document.hidden&&!suspended;
 const inView=()=>live()&&onStage&&!contextLost;
 const moving=()=>inView()&&!paused&&!reduced.matches;
 function setReady(ready){
  stage.toggleAttribute('data-ft-live',ready);
  canvas.hidden=!ready;
  for(const control of controls)control.disabled=!ready||(control===pause&&reduced.matches);
 }
 function setRatio(value){
  if(!Object.hasOwn(ASPECTS,value))return;
  stage.dataset.aspect=value;
  buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ftRatio===value)));
  try{localStorage.setItem(storageKey,value)}catch{}
  invalidate();
 }
 try{const saved=localStorage.getItem(storageKey);if(saved)setRatio(saved)}catch{}
 for(const button of buttons)on(button,'click',()=>setRatio(button.dataset.ftRatio));
 function focus(name){
  selected=name;
  hotspots.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ftInspect===name)));
  note.textContent=details[name]||defaultNote;
  model?.focus(name);
  invalidate();
 }
 for(const button of hotspots)on(button,'click',()=>focus(selected===button.dataset.ftInspect?'':button.dataset.ftInspect));
 on(pause,'click',()=>{
  paused=!paused;
  pause.textContent=paused?'Resume movement':'Pause movement';
  pause.setAttribute('aria-pressed',String(paused));
  sync();
 });
 for(const button of viewButtons)on(button,'click',()=>{
  if(button.dataset.ftView==='reset')focus('');
  else model?.zoom(button.dataset.ftView==='in'?.84:1/.84);
  invalidate();
 });

 function updateTime(){
  const date=new Date();
  clockParts=manilaParts(date);
  output.textContent=[clockParts.hour,clockParts.minute,clockParts.second].map(v=>String(v).padStart(2,'0')).join(':');
  output.dateTime=date.toISOString();
  astrolabe(clockParts,skySeconds);
  invalidate();
  clock=setTimeout(updateTime,1000-date.getUTCMilliseconds());
 }
 function loadModel(){
  if(load)return;
  load=import('./feje-tourbillon-renderer.mjs').then(({createWatchRenderer})=>{
   if(signal.aborted)return;
   model=createWatchRenderer(canvas,{mobile});
   if(!model){fallback.hidden=false;return}
   resize();
   if('ResizeObserver' in window){resizer=new ResizeObserver(resize);resizer.observe(stage)}
   invalidate();
  }).catch(error=>{
   model?.dispose();
   model=null;setReady(false);fallback.hidden=false;
   console.warn('Tourbillon renderer unavailable',error);
  });
 }
 function tick(now){
  frame=0;
  if(!inView()||!model)return;
  if(last&&moving()){
   const activeSeconds=(now-last)/1000;
   skySeconds=(skySeconds+activeSeconds)%SKY_PERIOD;
  }
  const delta=last?Math.min(.09,(now-last)/1000):0;
  last=now;
  const animate=moving(),interval=mobile?40:32;
  if(dirty||!animate||now-lastPaint>=interval){
   // Skip this submission while the GPU still has the previous frame queued.
   // Camera input, the movement clock and the time display stay current.
   if(!model.canDraw()){frame=requestAnimationFrame(tick);return;}
   // While paused, redraw the entire transmission on the Manila second.
   // Every shaft and hand stays mechanically indexed to the same snapshot.
   const seconds=movementSeconds(animate?manilaParts(new Date()):{...clockParts,millisecond:0});
   dirty=model.draw(seconds,delta,reduced.matches,skySeconds,
    Number.isFinite(lastPaint)?(now-lastPaint)/1000:0);
   astrolabe(clockParts,skySeconds);
   lastPaint=now;
   if(canvas.hidden){setReady(true);fallback.hidden=true}
  }
  if(dirty||animate)frame=requestAnimationFrame(tick);
  else last=0;
 }
 function invalidate(){
  dirty=true;
  if(!frame&&model&&inView())frame=requestAnimationFrame(tick);
 }
 function resize(){
  model?.resize(stage.clientWidth,stage.clientHeight);
  invalidate();
 }
 function sync(){
  // Decorative card animation follows the existing watch pause/visibility
  // state; keep the actual Asia/Manila clock independent and accurate.
  root.toggleAttribute('data-ft-card-motion',live()&&!paused&&!reduced.matches);
  clearTimeout(clock);
  if(live())updateTime();
  if(inView())loadModel();
  stage.toggleAttribute('data-running',moving());
  if(!inView()){
   cancelAnimationFrame(frame);frame=0;
  }
  last=0;lastPaint=-Infinity;
  if(stage.hasAttribute('data-ft-live'))pause.disabled=reduced.matches;
  invalidate();
 }
 on(canvas,'webglcontextlost',event=>{
  event.preventDefault();contextLost=true;setReady(false);fallback.hidden=false;sync();
 });
 on(canvas,'webglcontextrestored',()=>{
  // Three's listener reinitializes its renderer state in this event too.
  // Rebuild the reflection target after all event listeners have run.
  setTimeout(()=>{
   if(signal.aborted||canvas.getContext('webgl2')?.isContextLost())return;
   try{
    model?.rebuildReflections();
    contextLost=false;sync();
   }catch(error){
    fallback.hidden=false;console.warn('Tourbillon context recovery failed',error);
   }
  },0);
 });
 on(canvas,'pointerdown',event=>{
  if(event.button!==0||!model)return;
  pointers.set(event.pointerId,[event.clientX,event.clientY]);
  try{canvas.setPointerCapture(event.pointerId)}catch{}
 });
 on(canvas,'pointermove',event=>{
  const previous=pointers.get(event.pointerId);
  if(!previous||!model)return;
  const next=[event.clientX,event.clientY];
  if(pointers.size===2){
   const other=[...pointers.entries()].find(([id])=>id!==event.pointerId)[1];
   const distance=p=>Math.hypot(p[0]-other[0],p[1]-other[1]);
   const a=distance(previous),b=distance(next);
   if(a>8&&b>8)model.zoom(a/b);
  }else if(pointers.size===1){
   const scale=Math.min(canvas.clientWidth,canvas.clientHeight);
   if(scale>0)model.orbit((previous[0]-next[0])*4.2/scale,(next[1]-previous[1])*3.2/scale);
  }
  pointers.set(event.pointerId,next);invalidate();
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])on(canvas,type,event=>pointers.delete(event.pointerId));
 on(canvas,'keydown',event=>{
  const key=event.key;
  const directions={ArrowLeft:[-.18,0],ArrowRight:[.18,0],ArrowUp:[0,.13],ArrowDown:[0,-.13]};
  if(directions[key])model?.orbit(...directions[key]);
  else if(key==='+'||key==='=')model?.zoom(.85);
  else if(key==='-')model?.zoom(1/.85);
  else if(key==='Home')focus('');
  else return;
  event.preventDefault();invalidate();
 });
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
 if(!('ResizeObserver' in window))on(window,'resize',resize);
 on(document,'visibilitychange',sync);
 on(reduced,'change',sync);
 on(window,'pageshow',()=>{suspended=false;sync()});
 on(window,'pagehide',event=>{suspended=true;sync();if(!event.persisted)dispose()});
 function dispose(){controller.abort();observer?.disconnect();resizer?.disconnect();clearTimeout(clock);cancelAnimationFrame(frame);model?.dispose()}
 sync();
 return dispose;
}
if(typeof document!=='undefined')mountTourbillon(document.getElementById('tourbillon'));
