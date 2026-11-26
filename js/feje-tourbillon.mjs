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
 const stage=root.querySelector('[data-ft-stage]');
 let canvas=root.querySelector('.ft-model');
 const video=root.querySelector('[data-ft-video]'),explore=root.querySelector('[data-ft-explore]'),exit=root.querySelector('[data-ft-exit]');
 const interactive=[...root.querySelectorAll('[data-ft-interactive]')],status=root.querySelector('[data-ft-status]');
 const astrolabe=mountAstrolabe(root.querySelector('[data-ft-astro]'),root.querySelector('[data-ft-astro-status]'));
 const output=root.querySelector('#ft-time'),note=root.querySelector('#ft-detail'),fallback=root.querySelector('[data-ft-fallback]');
 const buttons=[...root.querySelectorAll('[data-ft-ratio]')],hotspots=[...root.querySelectorAll('[data-ft-inspect]')],viewButtons=[...root.querySelectorAll('[data-ft-view]')];
 const controls=[...buttons,...viewButtons,...hotspots];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(pointer: coarse)').matches;
 const controller=new AbortController(),{signal}=controller;
 const on=(element,event,handler,options)=>element.addEventListener(event,handler,{...options,signal});
 const alwaysVisible=!('IntersectionObserver' in window);
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
 let visible=alwaysVisible,onStage=alwaysVisible,suspended=false,mode='preview';
 let observer,resizer,model,canvasEvents,selected='',clock=0,frame=0,clockParts,skySeconds=0,last=0,lastPaint=-Infinity,dirty=true;
 let epoch=0,painted=false,videoRequested=false,videoFailed=false,videoWanted=false,ratio='landscape',astroStart=performance.now();
 const pointers=new Map();
 const live=()=>visible&&!document.hidden&&!suspended;
 const inView=()=>live()&&onStage&&mode!=='preview';
 const moving=()=>inView()&&!reduced.matches;
 const previewVisible=()=>live()&&onStage&&mode!=='live'&&!reduced.matches;
 function setReady(ready){
  stage.toggleAttribute('data-ft-live',ready);
  interactive.forEach(node=>node.hidden=!ready);
  for(const control of controls)control.disabled=!ready;
  exit.hidden=!ready;
  explore.hidden=ready;
  explore.disabled=mode==='loading';
  if(!ready)canvas.hidden=true;
 }
 function setRatio(value){
  if(!Object.hasOwn(ASPECTS,value))return;
  ratio=value;
  if(mode==='live')stage.dataset.aspect=value;
  buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ftRatio===value)));
  try{localStorage.setItem(storageKey,value)}catch{}
  resize();
 }
 try{const saved=localStorage.getItem(storageKey);if(Object.hasOwn(ASPECTS,saved))ratio=saved}catch{}
 for(const button of buttons)on(button,'click',()=>{if(mode==='live')setRatio(button.dataset.ftRatio)});
 function focus(name){
  selected=name;
  hotspots.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ftInspect===name)));
  note.textContent=details[name]||defaultNote;
  model?.focus(name);invalidate();
 }
 for(const button of hotspots)on(button,'click',()=>focus(selected===button.dataset.ftInspect?'':button.dataset.ftInspect));
 for(const button of viewButtons)on(button,'click',()=>{
  if(button.dataset.ftView==='reset')focus('');
  else model?.zoom(button.dataset.ftView==='in'?.84:1/.84);
  invalidate();
 });
 function updateTime(){
  const date=new Date();clockParts=manilaParts(date);
  output.textContent=[clockParts.hour,clockParts.minute,clockParts.second].map(v=>String(v).padStart(2,'0')).join(':');
  output.dateTime=date.toISOString();
  if(!reduced.matches)skySeconds=((performance.now()-astroStart)/1000)%SKY_PERIOD;
  astrolabe(clockParts,skySeconds);invalidate();
  clock=setTimeout(updateTime,1000-date.getUTCMilliseconds());
 }
 function syncVideo(){
  const wanted=previewVisible();
  stage.toggleAttribute('data-ft-preview-motion',wanted);
  if(!wanted){
   videoWanted=false;video.pause();
   if(reduced.matches)stage.removeAttribute('data-ft-video-playing');
   return;
  }
  if(videoWanted||videoFailed)return;
  videoWanted=true;
  video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;
  if(!videoRequested){video.src=video.dataset.src;videoRequested=true;}
  const result=video.play();
  result?.catch(()=>{if(videoWanted){stage.removeAttribute('data-ft-video-playing');}});
 }
 on(video,'playing',()=>{
  if(!previewVisible()){video.pause();return;}
  stage.setAttribute('data-ft-video-playing','');
 });
 on(video,'error',()=>{videoFailed=true;stage.removeAttribute('data-ft-video-playing');});
 on(window,'online',()=>{if(videoFailed){videoFailed=false;videoWanted=false;videoRequested=false;syncVideo();}});
 function release(){
  ++epoch;cancelAnimationFrame(frame);frame=0;
  resizer?.disconnect();resizer=null;canvasEvents?.abort();canvasEvents=null;
  pointers.clear();
  try{model?.dispose()}catch(error){console.warn('Tourbillon disposal failed',error)}
  model=null;painted=false;last=0;lastPaint=-Infinity;dirty=true;
  // New canvas per session: a deliberately lost WebGL context is never reused.
  const replacement=canvas.cloneNode(false);replacement.hidden=true;
  replacement.removeAttribute('width');replacement.removeAttribute('height');
  canvas.replaceWith(replacement);canvas=replacement;
 }
 function returnToPreview(message='',restoreFocus=false){
  mode='preview';stage.dataset.ftMode=mode;stage.dataset.aspect='landscape';explore.removeAttribute('aria-busy');
  setReady(false);release();focus('');
  fallback.hidden=!message;status.textContent=message||'Cinematic preview';
  videoWanted=false;syncVideo();sync();
  if(restoreFocus)explore.focus({preventScroll:true});
 }
 async function start(){
  if(mode!=='preview'||signal.aborted)return;
  const session=++epoch;mode='loading';stage.dataset.ftMode=mode;
  explore.disabled=true;explore.setAttribute('aria-busy','true');fallback.hidden=true;
  status.textContent='Preparing the mechanical watch';
  try{
   const {createWatchRenderer}=await import('./feje-tourbillon-renderer.mjs');
   if(signal.aborted||session!==epoch)return;
   canvasEvents=new AbortController();installCanvasEvents();
   model=createWatchRenderer(canvas,{mobile});
   if(!model)throw Error('WebGL2 unavailable');
   canvas.hidden=false;resize();
   if('ResizeObserver' in window){resizer=new ResizeObserver(resize);resizer.observe(stage)}
   invalidate();
  }catch(error){
   if(session!==epoch||signal.aborted)return;
   console.warn('Tourbillon renderer unavailable',error);
   returnToPreview('3D unavailable',true);
  }finally{if(session===epoch)explore.removeAttribute('aria-busy');}
 }
 function tick(now){
  frame=0;
  if(!inView()||!model)return;
  const delta=last?Math.min(.09,(now-last)/1000):0;
  last=now;
  const animate=moving(),interval=mobile?40:32;
  try{
   if(mode==='loading'&&painted){
    if(!model.canDraw()){frame=requestAnimationFrame(tick);return;}
    mode='live';stage.dataset.ftMode=mode;
    // First submitted frame has completed. The preview may now fade away.
    setReady(true);explore.removeAttribute('aria-busy');fallback.hidden=true;
    status.textContent='Interactive mechanical watch ready';syncVideo();
    if(ratio!=='landscape')setRatio(ratio);else setRatio('landscape');
    exit.focus({preventScroll:true});
   }
   if(dirty||!animate||now-lastPaint>=interval){
    if(!model.canDraw()){frame=requestAnimationFrame(tick);return;}
    const seconds=movementSeconds(animate?manilaParts(new Date()):{...clockParts,millisecond:0});
    if(!reduced.matches)skySeconds=((now-astroStart)/1000)%SKY_PERIOD;
    dirty=model.draw(seconds,delta,reduced.matches,skySeconds,Number.isFinite(lastPaint)?(now-lastPaint)/1000:0);
    astrolabe(clockParts,skySeconds);lastPaint=now;painted=true;
   }
   if(mode==='loading'||dirty||animate)frame=requestAnimationFrame(tick);
   else last=0;
  }catch(error){console.warn('Tourbillon draw failed',error);returnToPreview('3D unavailable',true);}
 }
 function invalidate(){
  dirty=true;
  if(!frame&&model&&inView())frame=requestAnimationFrame(tick);
 }
 function resize(){model?.resize(stage.clientWidth,stage.clientHeight);invalidate();}
 function sync(){
  root.toggleAttribute('data-ft-card-motion',live()&&!reduced.matches);
  clearTimeout(clock);
  if(live())updateTime();
  stage.toggleAttribute('data-running',moving());
  if(!inView()){cancelAnimationFrame(frame);frame=0;}
  last=0;lastPaint=-Infinity;syncVideo();invalidate();
 }
 function installCanvasEvents(){
  const listenCanvas=(event,handler)=>canvas.addEventListener(event,handler,{signal:canvasEvents.signal});
  listenCanvas('webglcontextlost',event=>{event.preventDefault();returnToPreview('3D unavailable',true);});
  // A lost session is disposed; restored contexts belong to retired canvases.
  listenCanvas('webglcontextrestored',()=>{});
 listenCanvas('pointerdown',event=>{
  if(event.button!==0||mode!=='live'||!model)return;
  pointers.set(event.pointerId,[event.clientX,event.clientY]);
  try{canvas.setPointerCapture(event.pointerId)}catch{}
 });
 listenCanvas('pointermove',event=>{
  const previous=pointers.get(event.pointerId);
  if(!previous||mode!=='live'||!model)return;
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
 for(const type of ['pointerup','pointercancel','lostpointercapture'])listenCanvas(type,event=>pointers.delete(event.pointerId));
 listenCanvas('keydown',event=>{
  if(mode!=='live')return;
  const key=event.key;
  const directions={ArrowLeft:[-.18,0],ArrowRight:[.18,0],ArrowUp:[0,.13],ArrowDown:[0,-.13]};
  if(directions[key])model?.orbit(...directions[key]);
  else if(key==='+'||key==='=')model?.zoom(.85);
  else if(key==='-')model?.zoom(1/.85);
  else if(key==='Home')focus('');
  else return;
  event.preventDefault();invalidate();
 });
 }
 on(explore,'click',start);
 on(exit,'click',()=>returnToPreview('',true));
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
 function dispose(){controller.abort();observer?.disconnect();clearTimeout(clock);video.pause();release();}
 setReady(false);sync();
 return dispose;
}
if(typeof document!=='undefined')mountTourbillon(document.getElementById('tourbillon'));
