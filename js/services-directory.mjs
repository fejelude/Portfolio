// Lightweight per-row visibility gating. Static artwork remains visible
// without JS, without IntersectionObserver, or with reduced motion.
export function mountServicesDirectory(root,win=window){
 if(!root)return ()=>{};
 const doc=win.document,media=win.matchMedia('(prefers-reduced-motion: reduce)');
 const rows=[...root.querySelectorAll('[data-svc-row]')],targets=[root,...rows];
 const visible=new Set(),controller=new AbortController(),{signal}=controller;
 let observer,suspended=false;
 function sync(){
  if(signal.aborted)return;
  const running=!doc.hidden&&!suspended&&!media.matches;
  root.toggleAttribute('data-svc-active',running&&visible.has(root));
  for(const row of rows)row.toggleAttribute('data-svc-row-active',running&&visible.has(row));
 }
 if('IntersectionObserver' in win){
  observer=new win.IntersectionObserver(entries=>{
   for(const entry of entries){if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);}
   sync();
  },{threshold:.05});
  targets.forEach(target=>observer.observe(target));
 }
 doc.addEventListener('visibilitychange',sync,{signal});
 media.addEventListener('change',sync,{signal});
 win.addEventListener('pagehide',event=>{suspended=true;sync();if(!event.persisted)dispose();},{signal});
 win.addEventListener('pageshow',()=>{suspended=false;sync();},{signal});
 function dispose(){
  controller.abort();observer?.disconnect();visible.clear();
  root.removeAttribute('data-svc-active');
  for(const row of rows)row.removeAttribute('data-svc-row-active');
 }
 sync();return dispose;
}
if(typeof document!=='undefined')mountServicesDirectory(document.querySelector('[data-svc-motion]'));
