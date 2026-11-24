import {CAR_QUALITY_KEY,readPreset,writePreset} from './visual-quality.mjs';
import { COLLECTION, collectibleAt } from './home-collectibles.mjs';
/* Progressive enhancement: native navigation never depends on graphics. */
const stage=document.querySelector('#world-stage');
if(stage){
  const $=id=>document.getElementById(id);
  const host=$('world-canvas-host'), launch=$('world-launch'), controls=$('world-controls'), instructions=$('world-instructions');
  const motionQuery=matchMedia('(prefers-reduced-motion: reduce)'), coarse=matchMedia('(pointer: coarse)');
  const launchOnDemand=coarse.matches||innerWidth<=900||(navigator.deviceMemory&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4)||navigator.connection?.saveData;
  let quality=readPreset(CAR_QUALITY_KEY);const qualitySelect=$('world-quality');qualitySelect.value=quality;
  let sceneEvents=null,markerNodes=[],renderer=null,canvas=null,api=null,loading=false,visible=true,paused=motionQuery.matches,lights=true,frame=0,last=0,time=0,goal,current,drag,active='arrival',sizeObserver,slowFrames=0;
  const cleanup=new AbortController(),signal=cleanup.signal;
  let selected=0,queued=0,switchTimer=0,showcase=false;
  const collection=$('world-collection'),choiceButtons=[...collection.querySelectorAll('[data-collectible-choice]')],poster=stage.querySelector('.world-poster');
  const buttons=[...controls.querySelectorAll('[data-world-view]')];
  const listen=(target,event,handler,opts={})=>target.addEventListener(event,handler,{...opts,signal});
  const sceneListen=(target,event,handler)=>target.addEventListener(event,handler,{signal:sceneEvents.signal});
  function makeMarkers(){
    const layer=$('world-markers');layer.replaceChildren();
    markerNodes=Object.entries(api.STATIONS).map(([key,v])=>{
      const node=document.createElement('span');node.className='world-marker';node.textContent=v.label;node.hidden=true;layer.append(node);return {node,v,key,x:null,y:null};
    });
  }
  function updateMarkers(){
    for(const m of markerNodes){
      const p=renderer.project(m.v.marker);
      const show=p&&p[0]>38&&p[0]<canvas.clientWidth-38&&p[1]>64&&p[1]<canvas.clientHeight-48&&m.key!==active;
      m.node.hidden=!show;
      if(show){const x=Math.round(p[0]),y=Math.round(p[1]);if(x!==m.x||y!==m.y){m.node.style.left=x+'px';m.node.style.top=y+'px';m.x=x;m.y=y;}}
    }
  }
  const showLaunch=(label='Explore my collectibles XD ↗')=>{launch.textContent=label;launch.hidden=false;};
  const updateMotion=()=>{const b=$('world-motion');b.textContent=paused?'Resume motion':'Pause motion';b.setAttribute('aria-pressed',String(paused));};
  const setShowcase=value=>{showcase=Boolean(value)&&!motionQuery.matches;$('world-showcase').setAttribute('aria-pressed',String(showcase));};
  const updateCollection=()=>{
    const car=collectibleAt(selected),n=String(selected+1).padStart(2,'0');
    stage.dataset.collectible=String(selected);stage.style.setProperty('--collection-accent',car.accent);
    $('world-collectible-index').textContent='FJ / '+n;
    $('collection-counter').textContent=n+' / '+String(COLLECTION.length).padStart(2,'0');
    $('collection-name').textContent=car.name;$('collection-world').textContent=car.world;
    poster.style.backgroundImage='url("'+car.poster+'")';
    poster.setAttribute('aria-label',car.name+' inspired concept in '+car.world);
    choiceButtons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.collectibleChoice)===selected)));
  };
  const endSwitch=()=>{clearTimeout(switchTimer);switchTimer=0;delete stage.dataset.switching;};
  function changeCollectible(index){
    queued=(index+COLLECTION.length)%COLLECTION.length;
    clearTimeout(switchTimer);switchTimer=0;
    if(queued===selected){endSwitch();return;}
    const commit=()=>{
      switchTimer=0;selected=queued;setShowcase(false);updateCollection();
      if(renderer){
        try{
          renderer.setCollectible(selected);time=0;slowFrames=0;
          const reveal=!paused&&!motionQuery.matches&&visible&&!document.hidden;
          current=api.copyView(api.STATIONS.arrival);
          if(reveal){current.yaw-=.24;current.radius+=1.05;current.pitch+=.045;}
          goal=api.copyView(api.STATIONS.arrival);
          select('arrival');renderer.draw(current,lights,time);updateMarkers();
        }catch(error){fallback('Graphics are not available rn. Try again ↗');}
      }
      endSwitch();request();
    };
    if(renderer&&visible&&!document.hidden&&!motionQuery.matches&&!paused){stage.dataset.switching='true';switchTimer=setTimeout(commit,180);}
    else commit();
  }
  const select=key=>{
    if(!api||!api.STATIONS[key])return;
    if(key!=='arrival')setShowcase(false);
    active=key;const v=api.STATIONS[key];goal=api.copyView(v);
    if(current){const delta=goal.yaw-current.yaw;goal.yaw=current.yaw+Math.atan2(Math.sin(delta),Math.cos(delta));}
    $('world-status').textContent=v.label;$('world-description').textContent=v.description;
    const link=$('world-destination');link.setAttribute('href',v.link);link.textContent=v.action;
    buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.worldView===key)));request();
  };
  const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;last=0;};
  const usable=()=>renderer&&visible&&!document.hidden&&stage.dataset.state==='live';
  function request(){if(usable()&&!frame)frame=requestAnimationFrame(tick);}
  function tick(now){
    frame=0;if(!usable())return;
    const dt=last?Math.min(.1,(now-last)/1000):1/60;last=now;
    if(showcase&&!paused)goal.yaw+=dt*.30;
    const distance=api.blendView(current,goal,dt,paused||motionQuery.matches);
    // Keep prolonged showcase sessions numerically stable without a camera jump.
    if(Math.abs(current.yaw)>Math.PI*32){const turn=Math.trunc(current.yaw/(2*Math.PI))*2*Math.PI;current.yaw-=turn;goal.yaw-=turn;}
    if(!paused)time+=dt;
    renderer.draw(current,lights,time);updateMarkers();
    if(dt>.035&&!paused){if(++slowFrames>=24){renderer.ratio=Math.max(.85,renderer.ratio-.15);slowFrames=0;}}
    else slowFrames=Math.max(0,slowFrames-1);
    if(!paused||distance>.002)request();else last=0;
  }
  function fallback(message){
    endSwitch();selected=queued;updateCollection();setShowcase(false);
    stop();sizeObserver?.disconnect();sceneEvents?.abort();renderer?.dispose();renderer=null;drag=null;markerNodes=[];$('world-markers').replaceChildren();
    canvas?.remove();canvas=null;stage.dataset.state='fallback';controls.hidden=true;instructions.hidden=true;
    showLaunch(message);loading=false;
  }
  async function start(){
    if(loading||renderer||signal.aborted)return;
    loading=true;launch.hidden=false;launch.disabled=true;launch.textContent='Loading my collectibles…';
    try{
      api=await import('./home-world-renderer.mjs');
      if(signal.aborted)return;
      sceneEvents=new AbortController();
      canvas=document.createElement('canvas');canvas.tabIndex=0;canvas.setAttribute('aria-label','Hypercar collection scene. Drag or use arrow keys to orbit. Destination buttons below.');
      host.append(canvas);renderer=new api.TerminalRenderer(canvas,quality==='Low',selected);renderer.setQuality(quality);
      current=api.copyView(api.STATIONS[active]);goal=api.copyView(current);
      renderer.draw(current,lights,time);
      makeMarkers();updateMarkers();stage.dataset.state='live';launch.hidden=true;controls.hidden=false;instructions.hidden=false;updateMotion();select(active);
      if('ResizeObserver' in window){sizeObserver=new ResizeObserver(request);sizeObserver.observe(host);}
      sceneListen(canvas,'webglcontextlost',e=>{e.preventDefault();fallback('Oops, graphics stopped. Try again ↗');});
      sceneListen(canvas,'pointerdown',e=>{if(e.button!==0)return;setShowcase(false);drag={x:e.clientX,y:e.clientY,originX:e.clientX,originY:e.clientY,id:e.pointerId,moved:false};canvas.setPointerCapture?.(e.pointerId);});
      sceneListen(canvas,'pointermove',e=>{
        if(!drag||drag.id!==e.pointerId)return;
        const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
        if(Math.hypot(e.clientX-drag.originX,e.clientY-drag.originY)>5)drag.moved=true;
        if(drag.moved){goal.yaw-=dx*.008;goal.pitch=Math.max(.09,Math.min(.72,goal.pitch+dy*.005));request();}
        drag.x=e.clientX;drag.y=e.clientY;
      });
      sceneListen(canvas,'pointerup',e=>{
        if(!drag||drag.id!==e.pointerId)return;
        if(!drag.moved){
          const rect=canvas.getBoundingClientRect();let best=null,d=42;
          for(const {key,node,v} of markerNodes){if(node.hidden)continue;const p=renderer.project(v.marker);if(!p)continue;const bounds=node.getBoundingClientRect();if(e.clientX>=bounds.left&&e.clientX<=bounds.right&&e.clientY>=bounds.top&&e.clientY<=bounds.bottom){best=key;break;}const n=Math.hypot(e.clientX-rect.left-p[0],e.clientY-rect.top-p[1]);if(n<d){best=key;d=n;}}
          if(best)select(best);
        }
        drag=null;
      });
      sceneListen(canvas,'pointercancel',()=>{drag=null;});
      sceneListen(canvas,'lostpointercapture',()=>{drag=null;});
      sceneListen(canvas,'keydown',e=>{
        const dirs={ArrowLeft:[.18,0],ArrowRight:[-.18,0],ArrowUp:[0,-.08],ArrowDown:[0,.08]};
        if(e.key==='Home'){e.preventDefault();setShowcase(false);select('arrival');return;}
        if(!dirs[e.key])return;e.preventDefault();setShowcase(false);goal.yaw+=dirs[e.key][0];goal.pitch=Math.max(.09,Math.min(.72,goal.pitch+dirs[e.key][1]));request();
      });
      request();
    }catch(error){fallback('Graphics are not available rn. Try again ↗');}
    finally{loading=false;launch.disabled=false;}
  }
  collection.hidden=false;updateCollection();
  choiceButtons.forEach(b=>listen(b,'click',()=>changeCollectible(Number(b.dataset.collectibleChoice))));
  listen($('collection-prev'),'click',()=>changeCollectible(queued-1));
  listen($('collection-next'),'click',()=>changeCollectible(queued+1));
  listen($('world-showcase'),'click',()=>{if(motionQuery.matches)return;if(showcase){setShowcase(false);return;}select('arrival');setShowcase(true);paused=false;updateMotion();request();});
  $('world-showcase').disabled=motionQuery.matches;
  // Markers have equivalent keyboard-operable destination buttons.
  buttons.forEach(b=>listen(b,'click',()=>select(b.dataset.worldView)));
  listen($('world-lights'),'click',()=>{lights=!lights;$('world-lights').setAttribute('aria-pressed',String(lights));request();});
  listen($('world-motion'),'click',()=>{paused=!paused;if(paused)setShowcase(false);updateMotion();request();});
  listen(qualitySelect,'change',()=>{quality=qualitySelect.value;writePreset(CAR_QUALITY_KEY,quality);try{renderer?.setQuality(quality);slowFrames=0;request()}catch{fallback('Graphics are not available rn. Try again ↗')}});
  listen(window,'storage',e=>{if(e.key===CAR_QUALITY_KEY||e.key===null){quality=readPreset(CAR_QUALITY_KEY);qualitySelect.value=quality;try{renderer?.setQuality(quality);request()}catch{fallback('Graphics are not available rn. Try again ↗')}}});
  listen(launch,'click',start);
  listen(window,'resize',request);
  listen(document,'visibilitychange',()=>{if(document.hidden)stop();else request();});
  listen(motionQuery,'change',e=>{paused=e.matches;if(paused)setShowcase(false);$('world-showcase').disabled=e.matches;updateMotion();request();});
  // The legacy smooth-scroll handler doesn't focus its destination; keep the
  // skip link useful for keyboard users without touching shared main.js.
  listen(document.querySelector('.skip-link'),'click',e=>{
    e.preventDefault();e.stopImmediatePropagation();
    const main=$('main-content');main.focus({preventScroll:true});main.scrollIntoView({behavior:'auto'});
  });
  // Existing page anchors also select a corresponding view without intercepting navigation.
  listen(document,'click',e=>{
    const href=e.target.closest?.('a[href^="#"]')?.getAttribute('href');
    if(!href||!api)return;
    const key=Object.keys(api.STATIONS).find(k=>api.STATIONS[k].link===href);if(key&&key!==active)select(key);
  });
  let observer;
  if('IntersectionObserver' in window){observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)request();else stop();});observer.observe(stage);}
  listen(window,'pagehide',e=>{stop();if(!e.persisted){endSwitch();observer?.disconnect();sizeObserver?.disconnect();sceneEvents?.abort();renderer?.dispose();cleanup.abort();}});
  listen(window,'pageshow',()=>request());
  showLaunch();
  // On touch, data saver, lower-end devices and reduced motion, users opt in.
  if(!launchOnDemand&&!motionQuery.matches){if('requestIdleCallback' in window)requestIdleCallback(start,{timeout:1200});else setTimeout(start,250);}
}
