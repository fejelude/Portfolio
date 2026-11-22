// The page needs no JavaScript to show its message, link or completed sprite.
export function mountMascot(mascot,doc=document,win=window){
  const motion=win.matchMedia('(prefers-reduced-motion: reduce)');
  const controller=new AbortController(),{signal}=controller;
  let visible=!('IntersectionObserver' in win),paused=false,suspended=false,observer;
  function sync(){
    mascot.disabled=motion.matches;
    mascot.classList.toggle('is-enhanced',!motion.matches);
    mascot.classList.toggle('is-running',!motion.matches&&visible&&!paused&&!doc.hidden&&!suspended);
    mascot.setAttribute('aria-pressed',String(paused));
    mascot.setAttribute('aria-label',paused?'Resume Hello Kitty animation':'Pause Hello Kitty animation');
  }
  mascot.addEventListener('click',()=>{paused=!paused;sync();},{signal});
  doc.addEventListener('visibilitychange',sync,{signal});
  motion.addEventListener('change',sync,{signal});
  if('IntersectionObserver' in win){
    observer=new win.IntersectionObserver(items=>{visible=items[0].isIntersecting;sync();},{threshold:.15});
    observer.observe(mascot);
  }
  win.addEventListener('pagehide',event=>{suspended=true;sync();if(!event.persisted){observer?.disconnect();controller.abort();}},{signal});
  win.addEventListener('pageshow',()=>{suspended=false;sync();},{signal});
  sync();
}
if(typeof document!=='undefined'){
  const mascot=document.querySelector('.sm-mascot');
  if(mascot)mountMascot(mascot);
}
