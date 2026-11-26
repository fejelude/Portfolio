// The ghost uses CSS-only sprite motion; this observer gates animation work.
export function mountAboutGhost(root,win=window){
 if(!root)return ()=>{};
 const doc=win.document,media=win.matchMedia('(prefers-reduced-motion: reduce)');
 let visible=!('IntersectionObserver' in win),suspended=false,observer;
 const controller=new AbortController(),{signal}=controller;
 const sync=()=>{
  if(signal.aborted)return;
  if(visible||media.matches)root.setAttribute('data-ghost-seen','');
  root.toggleAttribute('data-ghost-active',visible&&!doc.hidden&&!suspended&&!media.matches);
 };
 root.setAttribute('data-ghost-managed','');
 if('IntersectionObserver' in win){
  observer=new win.IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);sync();},{threshold:0.12});
  observer.observe(root);
 }
 doc.addEventListener('visibilitychange',sync,{signal});
 media.addEventListener('change',sync,{signal});
 win.addEventListener('pagehide',event=>{suspended=true;sync();if(!event.persisted)dispose();},{signal});
 win.addEventListener('pageshow',()=>{suspended=false;sync();},{signal});
 function dispose(){
  controller.abort();observer?.disconnect();
  root.removeAttribute('data-ghost-active');root.removeAttribute('data-ghost-managed');
 }
 sync();return dispose;
}
if(typeof document!=='undefined')mountAboutGhost(document.querySelector('[data-about-ghost]'));
