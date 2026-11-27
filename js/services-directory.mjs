// CSS sprite motion + a scroll-driven ambient field, with no continuous JS loop.
export function servicesAmbient(bounds,height){
 if(!height||!bounds.height)return {wash:0,shift:0};
 const overlap=Math.max(0,Math.min(height,bounds.bottom)-Math.max(0,bounds.top));
 const coverage=Math.min(1,overlap/Math.min(height,bounds.height));
 const t=Math.max(0,Math.min(1,coverage));
 return {wash:t*t*(3-2*t),shift:Math.max(-32,Math.min(32,(bounds.top+bounds.height*.5-height*.5)*.045))};
}
export function mountServicesDirectory(root,win=window){
 if(!root)return ()=>{};
 const doc=win.document,media=win.matchMedia('(prefers-reduced-motion: reduce)');
 const rows=[...root.querySelectorAll('[data-svc-row]')],targets=[root,...rows];
 const section=root.closest?.('#services'),visible=new Set(),controller=new AbortController(),{signal}=controller;
 let observer,suspended=false,frame=0;
 const active=()=>!doc.hidden&&!suspended&&!media.matches&&visible.has(section||root);
 function stop(){if(frame){win.cancelAnimationFrame(frame);frame=0;}}
 function paint(){
  frame=0;if(!section||!active())return;
  const {wash,shift}=servicesAmbient(section.getBoundingClientRect(),win.innerHeight);
  section.style.setProperty('--svc-wash',wash.toFixed(3));
  section.style.setProperty('--svc-parallax',shift.toFixed(2)+'px');
 }
 function invalidate(){if(section&&active()&&!frame)frame=win.requestAnimationFrame(paint);}
 function sync(){
  if(signal.aborted)return;
  const running=!doc.hidden&&!suspended&&!media.matches;
  root.toggleAttribute('data-svc-active',running&&visible.has(root));
  for(const row of rows)row.toggleAttribute('data-svc-row-active',running&&visible.has(row));
  if(section){
   section.toggleAttribute('data-svc-ambient-active',active());
   if(active())invalidate();else{stop();section.style.setProperty('--svc-wash','0');section.style.setProperty('--svc-parallax','0px');}
  }
 }
 if('IntersectionObserver' in win){
  observer=new win.IntersectionObserver(entries=>{
   for(const entry of entries){if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);}
   sync();
  },{threshold:.01});
  targets.forEach(target=>observer.observe(target));
  if(section)observer.observe(section);
 }
 win.addEventListener('scroll',invalidate,{passive:true,signal});
 win.addEventListener('resize',invalidate,{passive:true,signal});
 win.visualViewport?.addEventListener('resize',invalidate,{passive:true,signal});
 doc.addEventListener('visibilitychange',sync,{signal});
 media.addEventListener('change',sync,{signal});
 win.addEventListener('pagehide',event=>{suspended=true;sync();if(!event.persisted)dispose();},{signal});
 win.addEventListener('pageshow',()=>{suspended=false;sync();},{signal});
 function dispose(){
  controller.abort();observer?.disconnect();visible.clear();stop();
  root.removeAttribute('data-svc-active');
  for(const row of rows)row.removeAttribute('data-svc-row-active');
  if(section){section.removeAttribute('data-svc-ambient-active');section.style.removeProperty('--svc-wash');section.style.removeProperty('--svc-parallax');}
 }
 sync();return dispose;
}
if(typeof document!=='undefined')mountServicesDirectory(document.querySelector('[data-svc-motion]'));
