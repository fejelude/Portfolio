// Animate only visible game icons; pause when the tab is hidden or the
// visitor requests it. Static finished artwork is the no-JS fallback.
const section=document.querySelector('#roblox-creations');
if(section){
  const entries=[...section.querySelectorAll('.rc-header, .rc-entry')];
  const toggle=section.querySelector('.rc-motion-toggle');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const visible=new Set();
  let paused=false;
  function sync(){
    if(toggle){
      toggle.hidden=motion.matches;
      toggle.setAttribute('aria-pressed',String(paused));
      const label=paused?'Resume Roblox animations':'Pause Roblox animations';
      toggle.setAttribute('aria-label',label);toggle.title=label;
    }
    for(const entry of entries){
      if(motion.matches){delete entry.dataset.animate;delete entry.dataset.animationPaused;continue;}
      if(visible.has(entry)&&!document.hidden&&!paused)entry.dataset.animate='';
      if(Object.hasOwn(entry.dataset,'animate')){
        if(paused||document.hidden||!visible.has(entry))entry.dataset.animationPaused='';
        else delete entry.dataset.animationPaused;
      }
    }
  }
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(items=>{
      for(const item of items){
        const entry=item.target.closest('.rc-header, .rc-entry');
        if(!entry)continue;
        if(item.isIntersecting)visible.add(entry);else visible.delete(entry);
      }
      sync();
    },{threshold:.15});
    for(const entry of entries)observer.observe(entry.querySelector('.rc-roblox-logo, .rc-motif'));
  }else for(const entry of entries)visible.add(entry);
  toggle?.addEventListener('click',()=>{paused=!paused;sync();});
  document.addEventListener('visibilitychange',sync);
  if(motion.addEventListener)motion.addEventListener('change',sync);
  else if(motion.addListener)motion.addListener(sync);
  sync();
}
