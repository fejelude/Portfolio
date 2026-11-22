// Restart a short decorative animation when the entry actually enters view.
export function mountEntry(entry,doc=document,win=window){
  const motion=win.matchMedia('(prefers-reduced-motion: reduce)');
  let visible=!('IntersectionObserver' in win),suspended=false,observer;
  const sync=()=>{
    if(visible&&!motion.matches&&!doc.hidden&&!suspended)entry.dataset.ixVisible='';
    else delete entry.dataset.ixVisible;
  };
  if('IntersectionObserver' in win){
    observer=new win.IntersectionObserver(items=>{visible=items[0].isIntersecting;sync();},{threshold:.15});
    observer.observe(entry.querySelector('.ix-cta'));
  }
  doc.addEventListener('visibilitychange',sync);
  if(motion.addEventListener)motion.addEventListener('change',sync);
  else if(motion.addListener)motion.addListener(sync);
  win.addEventListener('pagehide',event=>{suspended=true;sync();if(!event.persisted)observer?.disconnect();});
  win.addEventListener('pageshow',()=>{suspended=false;sync();});
  sync();
}
if(typeof document!=='undefined'){
  const entry=document.getElementById('interactives-entry');
  if(entry)mountEntry(entry);
}
