// Document-space illumination: the browser scrolls the already-painted
// background with the page. No scroll listener, extra canvas or animation loop.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=t=>t*t*(3-2*t);
const rgb=(hex)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const color=(a,b,t)=>'rgb('+a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(',')+')';
// Anchors use content geometry rather than section start/end or viewport
// visibility. Gaps between anchors belong to both adjacent atmospheres.
export const CHAPTERS=Object.freeze([
 ['#home',.08,'#100d1b'],
 ['.world-viewport',.52,'#21192f'],
 ['#interactives-entry',.32,'#151c32'],
 ['#tourbillon .ft-card',.05,'#101e34'],
 ['#tourbillon .ft-card',.75,'#10213a'],
 ['#tourbillon .ft-card',.97,'#17243b'],
 ['#sofra-project .sofra-feature',.06,'#301e35'],
 ['#sofra-project .sofra-feature',.8,'#352139'],
 ['#about',.18,'#302039'],
 ['#about',.65,'#271c34'],
 ['#about',.94,'#21172e'],
 ['#roblox-creations [data-rc-zone="intro"]',.48,'#261936'],
 ['#roblox-creations [data-rc-zone="garage"]',.48,'#301c2a'],
 ['#roblox-creations [data-rc-zone="build"]',.48,'#152b25'],
 ['#roblox-creations [data-rc-zone="note"]',.48,'#251b34'],
 ['#services .svc-header',.5,'#25213b'],
 ['#services .svc-row--game',.5,'#192d43'],
 ['#services .svc-row--model',.5,'#302735'],
 ['#services .svc-row--web',.5,'#192e37'],
 ['#services .svc-footer',.6,'#231a32'],
 ['#learning',.32,'#1c192d'],
 ['#goals',.45,'#1e192b'],
 ['#contact',.4,'#20172d'],
 ['#contact',.96,'#15121f']
]);
export function gradientStops(anchors,height){
 const sorted=anchors.filter(a=>Number.isFinite(a.y)&&/^#[0-9a-f]{6}$/i.test(a.color))
  .map(a=>({...a,y:clamp(a.y,0,height)})).sort((a,b)=>a.y-b.y);
 if(!sorted.length)return ['#0c0a12 0px','#0c0a12 '+height+'px'];
 const unique=[];
 for(const a of sorted){if(unique.length&&a.y===unique.at(-1).y)unique[unique.length-1]=a;else unique.push(a);}
 const points=[{y:0,color:unique[0].color},...unique,{y:height,color:unique.at(-1).color}];
 const stops=[points[0].color+' 0px'];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],length=b.y-a.y;
  if(length<=0)continue;
  const x=rgb(a.color),z=rgb(b.color);
  for(let step=1;step<=8;step++){
   const t=step/8;stops.push(color(x,z,smooth(t))+' '+(a.y+length*t).toFixed(2)+'px');
  }
 }
 return stops;
}
const glows=[
 ['#home',.56,12,'#6c459d26'],['#interactives-entry',.6,88,'#427bbf20'],
 ['#tourbillon .ft-card',.45,5,'#397a9b30'],['#tourbillon .ft-card',.8,95,'#b38b4620'],
 ['#sofra-project .sofra-feature',.18,5,'#e87ca744'],['#sofra-project .sofra-feature',.8,92,'#b86aa843'],
 ['#about',.35,82,'#b7a1e52b'],['#about',.68,10,'#b86aa820'],
 ['#services .svc-row--game',.4,5,'#397acf40'],['#services .svc-row--model',.5,95,'#c18a4c35'],
 ['#services .svc-row--web',.6,8,'#4eb5ac35']
];
export function mountHomeAtmosphere(doc=document,win=doc.defaultView){
 const body=doc.body,main=doc.querySelector('#main-content');
 if(!body?.classList.contains('feje-world-home')||!main)return ()=>{};
 const elements=new Map();
 for(const [selector] of [...CHAPTERS,...glows]){
  if(!elements.has(selector)){const el=doc.querySelector(selector);if(el)elements.set(selector,el);}
 }
 if(!elements.size)return ()=>{};
 const life=new win.AbortController(),{signal}=life;
 let frame=0,observer,suspended=false,last='';
 function measure(){
  frame=0;if(signal.aborted||doc.hidden||suspended)return;
  const origin=body.getBoundingClientRect().top, height=Math.max(1,body.scrollHeight,body.offsetHeight);
  const boxes=new Map();
  for(const [selector,el] of elements){const r=el.getBoundingClientRect();if(r.height>0)boxes.set(selector,{y:r.top-origin,h:r.height});}
  const anchors=CHAPTERS.flatMap(([selector,fraction,color])=>{const b=boxes.get(selector);return b?[{y:b.y+b.h*fraction,color}]:[];});
  const lights=glows.flatMap(([selector,fraction,x,color])=>{const b=boxes.get(selector);if(!b)return [];
   const y=Math.round(b.y+b.h*fraction),radius=Math.round(clamp(b.h*.65,260,850));
   return ['radial-gradient(ellipse 72% '+radius+'px at '+x+'% '+y+'px,'+color+',transparent 100%)'];
  });
  const value=[...lights,'linear-gradient(to bottom,'+gradientStops(anchors,height).join(',')+')'].join(',');
  if(value!==last){body.style.setProperty('--home-atmosphere-gradient',value);last=value;}
  body.setAttribute('data-home-atmosphere','');
 }
 function invalidate(){if(!frame&&!doc.hidden&&!suspended&&!signal.aborted)frame=win.requestAnimationFrame(measure);}
 function cancel(){if(frame)win.cancelAnimationFrame(frame);frame=0;}
 function dispose(){life.abort();cancel();observer?.disconnect();body.removeAttribute('data-home-atmosphere');body.style.removeProperty('--home-atmosphere-gradient');}
 if(win.ResizeObserver){
  observer=new win.ResizeObserver(invalidate);observer.observe(body);observer.observe(main);
  for(const el of new Set(elements.values()))observer.observe(el);
 }
 win.addEventListener('resize',invalidate,{passive:true,signal});
 win.visualViewport?.addEventListener('resize',invalidate,{passive:true,signal});
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)cancel();else invalidate();},{signal});
 win.addEventListener('pagehide',event=>{suspended=true;cancel();if(!event.persisted)dispose();},{signal});
 win.addEventListener('pageshow',()=>{suspended=false;invalidate();},{signal});
 doc.fonts?.ready.then(()=>{if(!signal.aborted)invalidate();});
 measure();return dispose;
}
if(typeof document!=='undefined')mountHomeAtmosphere();
