// Play each tiny decorative vignette once when it becomes visible.
const entries=document.querySelectorAll('#roblox-creations .rc-entry');
if(entries.length&&'IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  const observer=new IntersectionObserver(items=>{
    for(const item of items){
      if(!item.isIntersecting)continue;
      item.target.dataset.animate='';
      observer.unobserve(item.target);
    }
  },{threshold:0,rootMargin:'0px 0px -12% 0px'});
  for(const entry of entries)observer.observe(entry);
}
