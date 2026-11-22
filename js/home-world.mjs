/* Progressive enhancement: native navigation never depends on graphics. */
const stage=document.querySelector('#world-stage');
if(stage){
  const $=id=>document.getElementById(id);
  const host=$('world-canvas-host'), launch=$('world-launch'), controls=$('world-controls'), instructions=$('world-instructions');
  const motionQuery=matchMedia('(prefers-reduced-motion: reduce)'), coarse=matchMedia('(pointer: coarse)');
  const low=coarse.matches||innerWidth<=900||(navigator.deviceMemory&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4)||navigator.connection?.saveData;
  let renderer=null,canvas=null,api=null,loading=false,visible=true,paused=motionQuery.matches,lights=true,frame=0,last=0,time=0,goal,current,drag,active='arrival',sizeObserver,slowFrames=0;
  const cleanup=new AbortController(),signal=cleanup.signal;
  const buttons=[...controls.querySelectorAll('[data-world-view]')];
  const listen=(target,event,handler,opts={})=>target.addEventListener(event,handler,{...opts,signal});
  const showLaunch=(label='Enable interactive scene ↗')=>{launch.textContent=label;launch.hidden=false;};
  const updateMotion=()=>{const b=$('world-motion');b.textContent=paused?'Resume motion':'Pause motion';b.setAttribute('aria-pressed',String(paused));};
  const select=key=>{
    if(!api||!api.STATIONS[key])return;
    active=key;const v=api.STATIONS[key];goal=api.copyView(v);
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
    const distance=api.blendView(current,goal,dt,paused||motionQuery.matches);
    if(!paused)time+=dt;
    renderer.draw(current,lights,time);
    if(dt>.035&&!paused){if(++slowFrames>=24){renderer.ratio=Math.max(.7,renderer.ratio-.15);slowFrames=0;}}
    else slowFrames=Math.max(0,slowFrames-1);
    if(!paused||distance>.002)request();else last=0;
  }
  function fallback(message){
    stop();sizeObserver?.disconnect();renderer?.dispose();renderer=null;
    canvas?.remove();canvas=null;stage.dataset.state='fallback';controls.hidden=true;instructions.hidden=true;
    showLaunch(message);loading=false;
  }
  async function start(){
    if(loading||renderer||signal.aborted)return;
    loading=true;launch.hidden=false;launch.disabled=true;launch.textContent='Preparing the observatory…';
    try{
      api=await import('./home-world-renderer.mjs');
      if(signal.aborted)return;
      canvas=document.createElement('canvas');canvas.tabIndex=0;canvas.setAttribute('aria-label','Rooftop scene. Drag or use arrow keys to orbit. Destination buttons below.');
      host.append(canvas);renderer=new api.TerminalRenderer(canvas,!!low);
      current=api.copyView(api.STATIONS[active]);goal=api.copyView(current);
      renderer.draw(current,lights,time);
      stage.dataset.state='live';launch.hidden=true;controls.hidden=false;instructions.hidden=false;updateMotion();select(active);
      if('ResizeObserver' in window){sizeObserver=new ResizeObserver(request);sizeObserver.observe(host);}
      listen(canvas,'webglcontextlost',e=>{e.preventDefault();fallback('Graphics interrupted · retry ↗');});
      listen(canvas,'pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,originX:e.clientX,originY:e.clientY,id:e.pointerId,moved:false};canvas.setPointerCapture?.(e.pointerId);});
      listen(canvas,'pointermove',e=>{
        if(!drag||drag.id!==e.pointerId)return;
        const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
        if(Math.hypot(e.clientX-drag.originX,e.clientY-drag.originY)>5)drag.moved=true;
        if(drag.moved){goal.yaw-=dx*.008;goal.pitch=Math.max(.09,Math.min(.72,goal.pitch+dy*.005));request();}
        drag.x=e.clientX;drag.y=e.clientY;
      });
      listen(canvas,'pointerup',e=>{
        if(!drag||drag.id!==e.pointerId)return;
        if(!drag.moved){
          const rect=canvas.getBoundingClientRect();let best=null,d=42;
          for(const [key,v] of Object.entries(api.STATIONS)){const p=renderer.project(v.marker);if(!p)continue;const n=Math.hypot(e.clientX-rect.left-p[0],e.clientY-rect.top-p[1]);if(n<d){best=key;d=n;}}
          if(best)select(best);
        }
        drag=null;
      });
      listen(canvas,'pointercancel',()=>{drag=null;});
      listen(canvas,'lostpointercapture',()=>{drag=null;});
      listen(canvas,'keydown',e=>{
        const dirs={ArrowLeft:[.18,0],ArrowRight:[-.18,0],ArrowUp:[0,-.08],ArrowDown:[0,.08]};
        if(e.key==='Home'){e.preventDefault();select('arrival');return;}
        if(!dirs[e.key])return;e.preventDefault();goal.yaw+=dirs[e.key][0];goal.pitch=Math.max(.09,Math.min(.72,goal.pitch+dirs[e.key][1]));request();
      });
      request();
    }catch(error){fallback('Interactive graphics unavailable · retry ↗');}
    finally{loading=false;launch.disabled=false;}
  }
  // Markers have equivalent keyboard-operable destination buttons.
  buttons.forEach(b=>listen(b,'click',()=>select(b.dataset.worldView)));
  listen($('world-lights'),'click',()=>{lights=!lights;$('world-lights').setAttribute('aria-pressed',String(lights));request();});
  listen($('world-motion'),'click',()=>{paused=!paused;updateMotion();request();});
  listen(launch,'click',start);
  listen(window,'resize',request);
  listen(document,'visibilitychange',()=>{if(document.hidden)stop();else request();});
  listen(motionQuery,'change',e=>{paused=e.matches;updateMotion();request();});
  // Existing page anchors also select a corresponding view without intercepting navigation.
  listen(document,'click',e=>{
    const href=e.target.closest?.('a[href^="#"]')?.getAttribute('href');
    if(!href||!api)return;
    const key=Object.keys(api.STATIONS).find(k=>api.STATIONS[k].link===href);if(key&&key!==active)select(key);
  });
  let observer;
  if('IntersectionObserver' in window){observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)request();else stop();});observer.observe(stage);}
  listen(window,'pagehide',e=>{stop();if(!e.persisted){observer?.disconnect();sizeObserver?.disconnect();renderer?.dispose();cleanup.abort();}});
  listen(window,'pageshow',()=>request());
  showLaunch();
  // On touch, data saver, lower-end devices and reduced motion, users opt in.
  if(!low&&!motionQuery.matches){if('requestIdleCallback' in window)requestIdleCallback(start,{timeout:1200});else setTimeout(start,250);}
}
