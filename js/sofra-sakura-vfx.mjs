// Sofra's original pixel garden. No dependencies, external art or shared mutations.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const wrap=(x,n)=>((x%n)+n)%n;
const TAU=Math.PI*2;
const random=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
export const PALETTE=Object.freeze({d:'#793858',r:'#df759e',p:'#ffb2d0',c:'#ffdee5',w:'#fff5ec',l:'#c9b7f6',b:'#b1dff3',g:'#85b8ad',s:'#ae577e'});
// Hand-plotted, original glyphs. A dot is transparent, every other cell is a palette key.
export const SPRITES=Object.freeze({
 petal:['..cc.','.wpp.','cpppr','cppsr','.rrs.','..s..'],
 petalFold:['.wc.','cpp.','.pr.','.rs.','..s.'],
 heart:['.pp.pp.','pwwpppp','pwppprp','prppprp','.rpppr.','..rrr..','...r...'],
 blossom:['...p.p...','..cpcpc..','..cwwwc..','ppcwcwcpp','cwwpwpwwc','..pcwcp..','.cwp.pwc.','.pp...pp.','..r...r..'],
 bow:['rr.....rr','rpp...ppr','rwpp.ppwr','rppprpppr','.rrprprr.','...rrr...','..p...p..','.rr...rr.'],
 cat:['.l....l..','.ll..ll..','lclllcl..','lwwwwwl..','lwdwdwl..','lcpwpcl..','.lllll...','..lll..l.','.lllll.l.','.l.l.ll..','.........'],
 catBlink:['.l....l..','.ll..ll..','lclllcl..','lwwwwwl..','lwswswl..','lcpwpcl..','.lllll...','..lll.l..','.llllll..','.l.l.ll..','.........'],
 berry:['...g.g...','..ggggg..','.rrggrr..','rprprpr..','rpwprpr..','rprpwr...','.rprr....','..rr.....','...r.....'],
 star:['..w..','..c..','wcwcw','..c..','..w..'],
 glint:['.b.','bwb','.b.'],
 dot:['w']
});
export function sakuraEnvelope(top,bottom,h,celestialWash=0){
 const gap=Math.max(top-.72*h,.22*h-bottom,0)/Math.max(1,h);
 // At the shared boundary, first yield to the celestial wash; when Sofra
 // enters the reading band, let the pink foreground wash take ownership.
 // Daedalus remains entirely unchanged underneath this layer.
 const ownership=1-smooth(.25,.70,top/Math.max(1,h));
 const room=(1-clamp(celestialWash)*(1-ownership))**2;
 return {wash:(1-smooth(0,.58,gap))*room,petals:(1-smooth(.015,.44,gap))*room,
  ornaments:(1-smooth(.035,.31,gap))*room,hearts:(1-smooth(0,.18,gap))*room};
}
export function celestialPresence(top,bottom,h){
 const gap=Math.max(top-.72*h,.22*h-bottom,0)/Math.max(1,h);
 return 1-smooth(0,.58,gap);
}
export function gardenBands(w,h,box){
 const edge=(x,n)=>Math.max(0,Math.min(n,Math.round(x)));
 // Keep the four disjoint bands, but extend under the rounded card edge.
 const l=edge(box.left+12,w),r=edge(box.right-12,w),t=edge(box.top+12,h),b=edge(box.bottom-12,h);
 return [{x:0,y:0,w:l,h},{x:r,y:0,w:w-r,h},{x:l,y:0,w:r-l,h:t},{x:l,y:b,w:r-l,h:h-b}];
}
export const gardenScale=(area,dpr)=>Math.min(dpr,3,Math.sqrt(1_150_000/Math.max(1,area)));
export function makeGarden(count=112){
 const roll=random(72531);
 return Array.from({length:count},(_,i)=>{
  const k=i%20;
  const kind=k<11?'petal':k<14?'heart':k===14?'bow':k===15?'cat':k===16?'berry':k===17?'blossom':k===18?'star':'glint';
  return {kind,u:roll(),v:roll(),phase:roll()*TAU,depth:i%3,period:3+roll()*7,drift:7+roll()*19,side:i%2,wide:i%4===0};
 });
}
export function particlePose(p,time,scroll,w,h,box){
 const {depth,kind,phase,period,drift}=p;
 const rising=kind==='heart',falling=kind==='petal';
 const padding=36,span=h+padding*2;
 const y=wrap(p.v*span+(falling?drift:rising?-drift*.62:drift*.18)*time+scroll*(.04+depth*.035),span)-padding;
 const margin=p.side?w-box.right:box.left;
 const gutter=Math.max(1,margin);
 const sway=Math.sin(time*TAU/period+phase);
 const x=p.wide?p.u*w+sway*(5+depth*6):p.side?w-gutter*(.18+.64*p.u)+sway*gutter*.09:gutter*(.18+.64*p.u)+sway*gutter*.09;
 return {x,y,alpha:smooth(-padding,18,y)*(1-smooth(h-18,h+padding,y)),beat:.5+.5*Math.cos(time*TAU/period+phase)};
}
function atlas(doc){
 const result={};
 for(const [name,rows] of Object.entries(SPRITES)){
  const c=doc.createElement('canvas');c.width=Math.max(...rows.map(r=>r.length));c.height=rows.length;
  const ctx=c.getContext('2d');
  rows.forEach((row,y)=>[...row].forEach((key,x)=>{
   if(PALETTE[key]){ctx.fillStyle=PALETTE[key];ctx.fillRect(x,y,1,1);}
  }));
  result[name]=c;
 }
 return result;
}
function sprite(ctx,art,name,x,y,unit,alpha,frame,panel){
 if(alpha<.012)return;
 const image=art[name],{sx,sy}=frame;
 // Integer device pixels, including on DPR 3 phones. No rotation interpolation.
 const px=Math.max(1,Math.round(unit*sx)),py=Math.max(1,Math.round(unit*sy));
 const width=image.width*px/sx,height=image.height*py/sy;
 if(x+width/2<panel.x||x-width/2>panel.x+panel.w||y+height/2<panel.y||y-height/2>panel.y+panel.h)return;
 const left=Math.round((x-width/2)*sx)/sx,top=Math.round((y-height/2)*sy)/sy;
 ctx.globalAlpha=clamp(alpha);ctx.drawImage(image,left,top,width,height);
}
const sprays=[[-4,-13,2.3],[10,-20,1.8],[24,-12,1.5],[34,1,1.3],[17,7,2.1],[-6,9,1.6],[8,24,1.2]];
function paint(ctx,panel,frame,art,particles,time){
 const {w,h,box,scroll,level,sx,sy}=frame;
 ctx.setTransform(sx,0,0,sy,-panel.x*sx,-panel.y*sy);
 ctx.clearRect(panel.x,panel.y,panel.w,panel.h);
 ctx.imageSmoothingEnabled=false;
 const narrow=w<600;
 // Cropped floral sprays form quiet garden borders rather than a second mascot.
 for(const side of [0,1]){
  const dir=side?-1:1,margin=side?w-box.right:box.left;
  const x=side?w-Math.min(76,margin*.55):Math.min(76,margin*.55);
  for(const [j,anchor] of [h*.17,h*.79].entries()){
   const y=anchor+scroll*(j?.075:.035);
   const unit=narrow?.65:1.2;
   for(const [dx,dy,size] of sprays){
    sprite(ctx,art,'blossom',x+dir*dx*unit,y+dy*unit,size*unit,level.ornaments*(j?.35:.52),frame,panel);
   }
   sprite(ctx,art,'bow',x+dir*15*unit,y+34*unit,unit*1.6,level.ornaments*.56,frame,panel);
  }
 }
 // In open horizontal bands, offset small flower clusters from the card's
 // corners. On phones these read as a tiny garland above/below the exhibit.
 for(const [i,y] of [box.top-27,box.bottom+27].entries()){
  if(y<10||y>h-10)continue;
  for(const side of [0,1]){
   const dir=side?-1:1,x=side?Math.min(w-24,box.right-26):Math.max(24,box.left+26);
   for(const [j,[dx,dy,size]] of [[0,0,1.6],[18,-6,1.1],[32,3,.8]].entries()){
    sprite(ctx,art,'blossom',x+dir*dx,y+dy+scroll*.018,size,level.ornaments*(j===0?.85:.62),frame,panel);
   }
   sprite(ctx,art,side===i?'cat':'bow',x+dir*55,y+2+Math.sin(time*.6+i)*2,1.45,level.ornaments*.70,frame,panel);
   sprite(ctx,art,'glint',x+dir*73,y-6,1,level.ornaments*.65,frame,panel);
  }
 }
 const limit=narrow?70:particles.length;
 for(let i=0;i<limit;i++){
  const p=particles[i],pose=particlePose(p,time,scroll,w,h,box);
  const isPetal=p.kind==='petal',small=p.kind==='star'||p.kind==='glint';
  let name=p.kind;
  if(isPetal&&pose.beat<.28)name='petalFold';
  if(name==='cat'&&wrap(time+p.phase,5.3)<.23)name='catBlink';
  const strength=isPetal?level.petals:p.kind==='heart'?level.petals:level.ornaments;
  const depth=p.depth;
  const unit=(narrow? .78:1.05)*(small?.8:1)*(1+depth*.36);
  const opacity=pose.alpha*strength*(small?.22+.55*pose.beat:(.43+depth*.16));
  sprite(ctx,art,name,pose.x,pose.y,unit,opacity,frame,panel);
 }
 // A rare, slow heart meteor. A staggered fading trail of tiny pixel sparks.
 if(level.hearts>.15&&time>2){
  const t=wrap(time-2,11.7)/1.8;
  if(t<1){
   const right=Math.floor((time-2)/11.7)%2===1;
   const margin=right?w-box.right:box.left;
   const broad=box.top>96||h-box.bottom>96;
   const band=box.top>96?Math.max(0,box.top):Math.max(0,h-box.bottom);
   const y0=broad?(box.top>96?0:h-band)+band*.24:h*.16;
   const dx=broad?w*.45:Math.max(2,margin*.56),dy=broad?band*.48:h*.34;
   const x0=broad?w*.12:Math.max(3,margin*.16);
   for(let i=17;i>=0;i--){
    const s=t-i*.024;if(s<0)continue;
    const x=x0+dx*s,y=y0+dy*s;
    sprite(ctx,art,i===0?'heart':i%3===0?'glint':'dot',right?w-x:x,y,i===0?1.6:1,
     Math.sin(t*Math.PI)*level.hearts*(1-i/18)**1.4,frame,panel);
   }
  }
 }
 ctx.globalAlpha=1;
}
export function mountSofraGarden(section){
 const doc=section.ownerDocument,win=doc.defaultView,card=section.querySelector('.sofra-feature');
 if(!card)return ()=>{};
 const sky=doc.createElement('div');sky.className='sofra-sakura-sky';sky.hidden=true;sky.setAttribute('aria-hidden','true');
 const wash=doc.createElement('div');wash.className='sofra-sakura-wash';sky.append(wash);
 const panels=Array.from({length:4},()=>{
  const canvas=doc.createElement('canvas');canvas.width=canvas.height=1;sky.append(canvas);return {canvas,ctx:canvas.getContext('2d')};
 });
 if(panels.some(p=>!p.ctx))return ()=>{};
 // Appending behind the foreground stack but above the prepended celestial layer.
 doc.body.append(sky);
 const motion=win.matchMedia('(prefers-reduced-motion: reduce)');
 const desktop=win.matchMedia('(width > 900px) and (any-hover: hover) and (any-pointer: fine)');
 const lifecycle=new win.AbortController(),{signal}=lifecycle;
 const particles=makeGarden(),daedalus=doc.querySelector('#tourbillon');
 let artwork,near=!win.IntersectionObserver,suspended=false,dirty=true,frame=0,last=null,next=0,time=0,info,observer,resizer;
 function stop(release=false){
  if(frame)win.cancelAnimationFrame(frame);frame=0;last=null;next=0;sky.hidden=true;
  if(release)for(const {canvas} of panels)if(canvas.width!==1||canvas.height!==1)canvas.width=canvas.height=1;
 }
 function request(){
  if(!frame&&near&&!doc.hidden&&!suspended&&!signal.aborted)frame=win.requestAnimationFrame(tick);
 }
 function invalidate(){dirty=true;if(!near&&!doc.hidden&&!suspended){const b=section.getBoundingClientRect(),h=win.innerHeight;near=b.top<h*1.65&&b.bottom>-h*.65;}request();}
 function sample(){
  const h=Math.max(1,win.innerHeight),w=Math.max(1,doc.documentElement.clientWidth);
  const bounds=section.getBoundingClientRect(),box=card.getBoundingClientRect(),other=daedalus?.getBoundingClientRect();
  const level=sakuraEnvelope(bounds.top,bounds.bottom,h,other?celestialPresence(other.top,other.bottom,h):0);
  info=level.wash>.003?{w,h,box,level,scroll:motion.matches?0:Math.max(-h,Math.min(h,bounds.top-h*.23))}:null;
  dirty=false;
  if(!info)return;
  sky.style.setProperty('--sakura-strength',level.wash.toFixed(4));
  const bands=gardenBands(w,h,box),scale=gardenScale(w*h,win.devicePixelRatio||1);
  const translate=desktop.matches;
  for(const [i,p] of panels.entries()){
   const b=p.bounds=bands[i],c=p.canvas;
   c.hidden=!b.w||!b.h;
   const bw=c.hidden?1:Math.max(1,Math.floor(b.w*scale)),bh=c.hidden?1:Math.max(1,Math.floor(b.h*scale));
   if(c.width!==bw)c.width=bw;if(c.height!==bh)c.height=bh;
   // Keep desktop scroll positioning out of layout, as in the celestial sky.
   Object.assign(c.style,{
    left:translate?'0px':b.x+'px',top:translate?'0px':b.y+'px',
    transform:translate?`translate(${b.x}px, ${b.y}px)`:'',width:b.w+'px',height:b.h+'px'
   });
  }
 }
 function tick(now){
  frame=0;const changed=dirty;if(changed)sample();
  if(!info){stop(true);return;}
  const still=motion.matches||info.level.petals<.005;
  const interval=1000/(info.w<600?24:30);
  if(changed||last===null||now>=next-1){
   if(!artwork)artwork=atlas(doc);
   if(!still&&last!==null)time+=Math.min(.12,(now-last)/1000);
   next=last===null?now+interval:Math.max(next+interval,now+2);last=still?null:now;
   for(const {canvas,ctx,bounds} of panels)if(!canvas.hidden)
    paint(ctx,bounds,{...info,sx:canvas.width/bounds.w,sy:canvas.height/bounds.h},artwork,particles,still?0:time);
   sky.hidden=false;
  }
  if(!still)request();
 }
 function visibility(){if(doc.hidden||suspended)stop();else invalidate();}
 function dispose(){lifecycle.abort();observer?.disconnect();resizer?.disconnect();stop(true);sky.remove();}
 if(win.IntersectionObserver){
  observer=new win.IntersectionObserver(([entry])=>{near=entry.isIntersecting;if(near)invalidate();else stop(true);},{rootMargin:'100% 0px'});
  observer.observe(section);
 }
 if(win.ResizeObserver){
  resizer=new win.ResizeObserver(invalidate);resizer.observe(section);resizer.observe(card);if(daedalus)resizer.observe(daedalus);
 }
 win.addEventListener('scroll',invalidate,{passive:true,signal});
 win.addEventListener('resize',invalidate,{passive:true,signal});
 win.visualViewport?.addEventListener('resize',invalidate,{passive:true,signal});
 doc.addEventListener('visibilitychange',visibility,{signal});
 motion.addEventListener('change',invalidate,{signal});
 desktop.addEventListener('change',invalidate,{signal});
 win.addEventListener('pagehide',event=>{if(event.persisted){suspended=true;visibility();}else dispose();},{signal});
 win.addEventListener('pageshow',()=>{suspended=false;visibility();},{signal});
 request();return dispose;
}
if(typeof document!=='undefined'){
 const section=document.querySelector('#sofra-project');if(section)mountSofraGarden(section);
}
