// Canvas-only image particles. No WebGL, dependencies, idle animation or overlay photo.
const STEP=1/120,SPRING=112,DAMPING=15,FORCE=570;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function particleGrid(cssWidth,sourceWidth=256,sourceHeight=144,economy=false){
 const cols=clamp(Math.round(cssWidth/(economy?3.1:2.5)),1,sourceWidth);
 return {cols,rows:Math.max(1,Math.round(cols*sourceHeight/sourceWidth))};
}
export class PortraitPhysics{
 constructor(cols,rows){
  this.cols=cols;this.rows=rows;this.count=cols*rows;
  this.dx=new Float32Array(this.count);this.dy=new Float32Array(this.count);
  this.vx=new Float32Array(this.count);this.vy=new Float32Array(this.count);
  this.active=new Set();
 }
 reset(){
  for(const i of this.active)this.dx[i]=this.dy[i]=this.vx[i]=this.vy[i]=0;
  this.active.clear();
 }
 step(dt,brush){
  if(!(dt>0))return;
  dt=Math.min(dt,.05);
  // The fixed grid makes neighbor lookup bounded by the local brush, not
  // the total image size. Displaced cells remain tracked until they settle.
  if(brush&&brush.strength>0){
   const {x,y,radius:r}=brush;
   for(let row=Math.max(0,Math.floor(y-r));row<=Math.min(this.rows-1,Math.ceil(y+r));row++){
    for(let col=Math.max(0,Math.floor(x-r));col<=Math.min(this.cols-1,Math.ceil(x+r));col++){
     if((col+.5-x)**2+(row+.5-y)**2<r*r)this.active.add(row*this.cols+col);
    }
   }
  }
  const steps=Math.ceil(dt/STEP),h=dt/steps,drag=Math.exp(-DAMPING*h);
  for(const i of this.active){
   const ox=i%this.cols+.5,oy=Math.floor(i/this.cols)+.5;
   let x=this.dx[i],y=this.dy[i],vx=this.vx[i],vy=this.vy[i];
   for(let s=0;s<steps;s++){
    let ax=-SPRING*x,ay=-SPRING*y;
    if(brush&&brush.strength>0){
     let rx=ox+x-brush.x,ry=oy+y-brush.y;
     let distance=Math.hypot(rx,ry);
     if(distance<brush.radius){
      const fall=1-distance/brush.radius;
      if(distance<.001){const angle=(i*2.399963229728653)%6.283185307;rx=Math.cos(angle);ry=Math.sin(angle);distance=1;}
      const force=FORCE*brush.radius/12*brush.strength*fall*fall;
      ax+=force*rx/distance;ay+=force*ry/distance;
     }
    }
    vx=(vx+ax*h)*drag;vy=(vy+ay*h)*drag;
    x+=vx*h;y+=vy*h;
    const cap=Math.max(4,this.cols*.035),d=Math.hypot(x,y);
    if(d>cap){x*=cap/d;y*=cap/d;const outward=(vx*x+vy*y)/(cap*cap);if(outward>0){vx-=outward*x;vy-=outward*y;}}
   }
   if(!brush&&Math.hypot(x,y)<.025&&Math.hypot(vx,vy)<.12){
    this.dx[i]=this.dy[i]=this.vx[i]=this.vy[i]=0;this.active.delete(i);
   }else{this.dx[i]=x;this.dy[i]=y;this.vx[i]=vx;this.vy[i]=vy;}
  }
 }
}
export function mountParticlePortrait(root){
 if(!root)return ()=>{};
 const canvas=root.querySelector('canvas'),ctx=canvas?.getContext('2d',{alpha:false});
 if(!ctx)return ()=>{};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const abort=new AbortController(),{signal}=abort;
 const listen=(node,event,fn,options={})=>node.addEventListener(event,fn,{...options,signal});
 const economy=Boolean(navigator.connection?.saveData)||(navigator.hardwareConcurrency||4)<=2;
 const cache=document.createElement('canvas'),cacheCtx=cache.getContext('2d',{alpha:false});
 const sample=document.createElement('canvas'),sampleCtx=sample.getContext('2d',{willReadFrequently:true});
 let source,loading=false,physics,colors=[],edgesX,edgesY,frame=0,last=0,slow=0,renderInterval=0;
 let visible=!('IntersectionObserver' in window),suspended=false,dirtySize=true,destroyed=false;
 let pointer=null,touchId=null,nearObserver,visibleObserver,resizeObserver;
 const state=value=>{if(root.dataset.portraitState!==value)root.dataset.portraitState=value};
 const allowed=()=>visible&&!document.hidden&&!suspended&&!reduced.matches&&!destroyed;
 function draw(){
  if(!physics)return;
  ctx.drawImage(cache,0,0);
  if(!physics.active.size)return;
  const {cols,active,dx,dy}=physics,sx=canvas.width/cols,sy=canvas.height/physics.rows;
  // Remove every moving particle's original pixel before drawing any new
  // positions. The cache itself is constructed from individual color cells,
  // not an underlying photograph; no stationary duplicate survives.
  ctx.fillStyle='#17111e';
  for(const i of active){
   const x=i%cols,y=Math.floor(i/cols);
   ctx.fillRect(edgesX[x],edgesY[y],edgesX[x+1]-edgesX[x],edgesY[y+1]-edgesY[y]);
  }
  for(const i of active){
   const x=i%cols,y=Math.floor(i/cols);
   ctx.fillStyle=colors[i];
   ctx.fillRect(Math.round((x+dx[i])*sx),Math.round((y+dy[i])*sy),Math.max(1,Math.round(sx*.91)),Math.max(1,Math.round(sy*.91)));
  }
 }
 function rebuild(){
  if(!source||!dirtySize||destroyed)return;
  const box=canvas.getBoundingClientRect();if(box.width<2||box.height<2)return;
  const dpr=Math.min(window.devicePixelRatio||1,economy?1.5:2.5,Math.sqrt(1500000/(box.width*box.height)));
  const width=Math.max(1,Math.round(box.width*dpr)),height=Math.max(1,Math.round(box.height*dpr));
  const {cols,rows}=particleGrid(box.width,source.naturalWidth,source.naturalHeight,economy);
  dirtySize=false;
  if(physics&&canvas.width===width&&canvas.height===height&&physics.cols===cols)return;
  physics=new PortraitPhysics(cols,rows);
  canvas.width=cache.width=width;canvas.height=cache.height=height;
  sample.width=cols;sample.height=rows;
  sampleCtx.drawImage(source,0,0,cols,rows);
  const pixels=sampleCtx.getImageData(0,0,cols,rows).data;
  colors=new Array(physics.count);
  edgesX=Int32Array.from({length:cols+1},(_,i)=>Math.round(i*width/cols));
  edgesY=Int32Array.from({length:rows+1},(_,i)=>Math.round(i*height/rows));
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const i=y*cols+x,p=i*4;
   const color='rgb('+pixels[p]+','+pixels[p+1]+','+pixels[p+2]+')';
   colors[i]=color;cacheCtx.fillStyle=color;
   cacheCtx.fillRect(edgesX[x],edgesY[y],edgesX[x+1]-edgesX[x],edgesY[y+1]-edgesY[y]);
  }
  // Sampling surface is no longer needed at this size.
  sample.width=sample.height=1;
  root.dataset.portraitParticles=String(physics.count);
  draw();state('idle');
 }
 function stop(){
  if(frame)cancelAnimationFrame(frame);
  frame=0;last=0;pointer=null;touchId=null;
  if(physics?.active.size){physics.reset();draw();}
  if(physics)state('idle');
 }
 function request(){if(allowed()&&physics&&!frame)frame=requestAnimationFrame(tick);}
 function tick(now){
  frame=0;
  if(!allowed()){stop();return;}
  if(!physics)return;
  if(last&&now-last<renderInterval){request();return;}
  const start=performance.now(),dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;
  let brush=null;
  if(pointer){
   const age=now-pointer.time;
   if(age<300){
    const box=canvas.getBoundingClientRect();
    const x=(pointer.x-box.left)*physics.cols/box.width,y=(pointer.y-box.top)*physics.rows/box.height;
    if(x>=0&&x<=physics.cols&&y>=0&&y<=physics.rows){
     const radius=clamp(Math.min(box.width,box.height)*.19,30,66)*physics.cols/box.width;
     brush={x,y,radius,strength:clamp((300-age)/150,0,1)};
    }
   }else pointer=null;
  }
  physics.step(dt,brush);draw();
  const cost=performance.now()-start;
  slow=cost>12?Math.min(12,slow+1):Math.max(0,slow-1);
  // Reduce frame cadence rather than dropping image detail on slower devices.
  if(slow>=5)renderInterval=1000/30;
  else if(slow===0)renderInterval=0;
  if(pointer||physics.active.size){state('active');request();}
  else{last=0;state('idle');}
 }
 function load(){
  if(source||loading||destroyed)return;
  loading=true;state('loading');
  const image=new Image();
  image.decoding='async';
  image.onload=()=>{
   if(destroyed)return;source=image;loading=false;dirtySize=true;
   if(visible&&!document.hidden&&!suspended)rebuild();
  };
  image.onerror=()=>{if(!destroyed){loading=false;state('unavailable');}};
  image.src=root.dataset.source;
 }
 function sync(){
  if(!visible||document.hidden||suspended||destroyed){stop();return;}
  load();rebuild();
  if(reduced.matches)stop();
 }
 function updatePointer(e){
  if(!allowed()||!physics||!e.isPrimary)return;
  if(e.pointerType==='touch'&&e.pointerId!==touchId)return;
  pointer={x:e.clientX,y:e.clientY,time:performance.now()};request();
 }
 listen(canvas,'pointerdown',e=>{
  if(!e.isPrimary||e.button!==0)return;
  if(e.pointerType==='touch')touchId=e.pointerId;
  updatePointer(e);
 },{passive:true});
 listen(canvas,'pointermove',updatePointer,{passive:true});
 listen(canvas,'pointerleave',e=>{if(e.pointerType!=='touch'){pointer=null;request();}},{passive:true});
 listen(canvas,'pointerup',e=>{
  if(touchId===e.pointerId){touchId=null;if(pointer)pointer.time=performance.now()-175;request();}
 },{passive:true});
 listen(canvas,'pointercancel',()=>{touchId=null;pointer=null;request();},{passive:true});
 listen(window,'blur',()=>{pointer=null;touchId=null;request();});
 listen(document,'visibilitychange',sync);listen(reduced,'change',sync);
 function resize(){dirtySize=true;if(visible&&!document.hidden&&!suspended)rebuild();}
 if('ResizeObserver' in window){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);}
 listen(window,'resize',resize,{passive:true});
 if('IntersectionObserver' in window){
  nearObserver=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){load();nearObserver.disconnect();}},{rootMargin:'220px 0px'});
  visibleObserver=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});
  nearObserver.observe(root);visibleObserver.observe(root);
 }else sync();
 function dispose(){
  destroyed=true;stop();abort.abort();nearObserver?.disconnect();visibleObserver?.disconnect();resizeObserver?.disconnect();
  if(source){source.onload=source.onerror=null;source=null;}
  cache.width=cache.height=sample.width=sample.height=1;physics=null;colors=[];edgesX=edgesY=null;
 }
 listen(window,'pagehide',e=>{suspended=true;stop();if(!e.persisted)dispose();});
 listen(window,'pageshow',()=>{suspended=false;sync();});
 return dispose;
}
if(typeof document!=='undefined')mountParticlePortrait(document.querySelector('[data-particle-portrait]'));
