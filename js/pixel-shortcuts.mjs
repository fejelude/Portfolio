// Shared visibility observer for the two decorative sprites. No input listeners,
// navigation interception, credentials, authorization state, or animation loop.
export function mountPixelShortcuts(doc=document,win=window){
 const links=[...doc.querySelectorAll('#home .pixel-shortcut')];
 if(!links.length)return ()=>{};
 const media=win.matchMedia('(prefers-reduced-motion: reduce)'),visible=new Set();
 const life=new win.AbortController(),{signal}=life;
 let suspended=false,observer;
 function sync(){
  if(signal.aborted)return;
  const allowed=!doc.hidden&&!suspended&&!media.matches;
  for(const link of links)link.toggleAttribute('data-shortcut-active',allowed&&visible.has(link));
 }
 if(win.IntersectionObserver){
  observer=new win.IntersectionObserver(entries=>{
   for(const e of entries){if(e.isIntersecting)visible.add(e.target);else visible.delete(e.target);}
   sync();
  },{threshold:.1});
  links.forEach(link=>observer.observe(link));
 }
 doc.addEventListener('visibilitychange',sync,{signal});
 media.addEventListener('change',sync,{signal});
 win.addEventListener('pagehide',e=>{suspended=true;sync();if(!e.persisted)dispose();},{signal});
 win.addEventListener('pageshow',()=>{suspended=false;sync();},{signal});
 function dispose(){life.abort();observer?.disconnect();visible.clear();for(const link of links)link.removeAttribute('data-shortcut-active');}
 sync();return dispose;
}
