// Progressive enhancement: no JS or reduced motion keeps the static
// chapter gradient, finished pixel art and all original links.
export function pickScene(bounds,zones,readingLine){
  if(bounds.top>readingLine||bounds.bottom<=readingLine)return null;
  let scene='intro';
  for(const zone of zones)if(zone.top<=readingLine)scene=zone.name;
  return scene;
}
export function mountShowcase(section,doc=document,win=window){
  const entries=[...section.querySelectorAll('[data-rc-zone]')];
  const toggle=section.querySelector('.rc-motion-toggle');
  const motion=win.matchMedia('(prefers-reduced-motion: reduce)');
  const visible=new Set();
  let paused=false,suspended=false,frame=null,observer,resizeObserver;
  function clearScene(){
    delete doc.body.dataset.rcScene;
    for(const entry of entries)delete entry.dataset.rcCurrent;
  }
  function updateScene(){
    frame=null;
    if(motion.matches||doc.hidden||suspended){clearScene();return;}
    const line=win.innerHeight*.43,bounds=section.getBoundingClientRect();
    if(bounds.top>line||bounds.bottom<=line){clearScene();return;}
    const zones=entries.map(e=>({name:e.dataset.rcZone,top:e.getBoundingClientRect().top}));
    const scene=pickScene(bounds,zones,line);
    if(doc.body.dataset.rcScene!==scene)doc.body.dataset.rcScene=scene;
    for(const entry of entries){
      if(entry.dataset.rcZone===scene)entry.dataset.rcCurrent='';
      else delete entry.dataset.rcCurrent;
    }
  }
  function queueScene(){
    if(frame===null&&!doc.hidden&&!suspended&&!motion.matches)frame=win.requestAnimationFrame(updateScene);
  }
  function sync(){
    const inactive=paused||doc.hidden||suspended;
    if(toggle){
      toggle.disabled=motion.matches;
      toggle.setAttribute('aria-pressed',String(paused));
      const label=paused?'Resume Roblox showcase animations':'Pause Roblox showcase animations';
      toggle.setAttribute('aria-label',label);toggle.title=label;
    }
    if(motion.matches)delete section.dataset.rcEnhanced;
    else section.dataset.rcEnhanced='';
    if(inactive||motion.matches){section.dataset.rcPaused='';doc.body.dataset.rcMotion='paused';}
    else{delete section.dataset.rcPaused;delete doc.body.dataset.rcMotion;}
    for(const entry of entries){
      if(motion.matches){delete entry.dataset.animate;delete entry.dataset.animationPaused;continue;}
      if(visible.has(entry)&&!inactive)entry.dataset.animate='';
      if(Object.hasOwn(entry.dataset,'animate')){
        if(inactive||!visible.has(entry))entry.dataset.animationPaused='';
        else delete entry.dataset.animationPaused;
      }
    }
    if(motion.matches||doc.hidden||suspended){
      if(frame!==null){win.cancelAnimationFrame(frame);frame=null;}
      clearScene();
    }else queueScene();
  }
  function onPageHide(event){
    suspended=true;sync();
    if(!event.persisted){observer?.disconnect();resizeObserver?.disconnect();win.removeEventListener('scroll',queueScene);win.removeEventListener('resize',queueScene);}
  }
  if('IntersectionObserver' in win){
    observer=new win.IntersectionObserver(items=>{
      for(const item of items){
        const entry=item.target.closest('[data-rc-zone]');
        if(!entry)continue;
        if(item.isIntersecting)visible.add(entry);else visible.delete(entry);
      }
      sync();
    },{threshold:.15});
    for(const entry of entries)observer.observe(entry.querySelector('.rc-roblox-logo, .rc-motif, .rc-note-mark'));
  }else for(const entry of entries)visible.add(entry);
  if('ResizeObserver' in win){resizeObserver=new win.ResizeObserver(queueScene);resizeObserver.observe(section);}
  toggle?.addEventListener('click',()=>{paused=!paused;sync();});
  doc.addEventListener('visibilitychange',sync);
  if(motion.addEventListener)motion.addEventListener('change',sync);
  else if(motion.addListener)motion.addListener(sync);
  win.addEventListener('scroll',queueScene,{passive:true});
  win.addEventListener('resize',queueScene,{passive:true});
  win.addEventListener('pagehide',onPageHide);
  win.addEventListener('pageshow',()=>{suspended=false;sync();});
  sync();
}
if(typeof document!=='undefined'){
  const section=document.querySelector('#roblox-creations');
  if(section)mountShowcase(section);
}
