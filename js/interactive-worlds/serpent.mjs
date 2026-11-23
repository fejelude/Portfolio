export const LOOP_SECONDS = 12;
const TAU = 2 * Math.PI;
const WIDTH = 240;
const HEIGHT = 140;
const OUTLINE = '#190e2c';

// The spine runs from the head to the curled tail. Each point carries a radius.
const spine = [
 [178,53,10],[167,73,11],[146,91,12],[120,91,11],[103,76,10],
 [96,55,9],[78,42,8],[58,46,7],[51,62,6],[48,78,5],
 [33,84,4],[20,74,3],[22,62,2],[30,61,1]
];
const stars = [
 [32,34,0.09,'#d7a4ff'],[73,23,0.45,'#f3a0d5'],[111,37,0.62,'#9beaec'],
 [128,61,0.34,'#d7a4ff'],[207,17,0.96,'#aeeff5'],[216,76,0.64,'#aeeff5'],
 [182,106,0.19,'#f3a0d5'],[96,112,0.8,'#d7a4ff'],[35,105,0.53,'#87cedb']
];
const orbit = Array.from({length:72},(_,i)=>{
 const a=TAU*i/72,x=103*Math.cos(a),y=42*Math.sin(a);
 return [119+x*.966+y*.259,69-x*.259+y*.966];
});

function polygon(ctx,points,color){
 ctx.beginPath();
 points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));
 ctx.closePath();
 ctx.fillStyle=color;
 ctx.fill();
}

function spline(points,u){
 const index=Math.floor(u),t=u-index,last=points.length-1;
 const a=points[Math.max(0,index-1)],b=points[index],c=points[Math.min(last,index+1)],d=points[Math.min(last,index+2)];
 return b.map((n,i)=>n+.5*t*(c[i]-a[i]+t*(2*a[i]-5*n+4*c[i]-d[i]+t*(3*n-a[i]-3*c[i]+d[i]))));
}

export function samplePose(seconds){
 const time=((seconds%LOOP_SECONDS)+LOOP_SECONDS)%LOOP_SECONDS;
 const phase=TAU*time/LOOP_SECONDS;
 const floatX=3*Math.sin(phase),floatY=4*Math.cos(phase);
 const points=spine.map(([x,y,r],i)=>{
  const t=i/(spine.length-1);
  return [x+floatX+Math.sin(phase+TAU*t)*3*t,
   y+floatY+(Math.sin(2*phase-TAU*t)*5+Math.sin(phase+TAU*t)*3)*t,r];
 });
 return {phase,points,tilt:.10*Math.sin(phase+.55)};
}

function drawBody(ctx,points,phase){
 const last=points.length-1;
 const profile=[];
 for(let i=0;i<=last*5;i++){
  const u=i/5,[x,y,r]=spline(points,u);
  const a=spline(points,Math.max(0,u-.04)),b=spline(points,Math.min(last,u+.04));
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
  profile.push({x,y,r,dx:dx/length,dy:dy/length});
 }
 const edge=({x,y,r,dx,dy},side,ahead=0)=>[x-dy*r*side+dx*ahead,y+dx*r*side+dy*ahead];
 const band=(inner,outer,color)=>polygon(ctx,[
  ...profile.map(p=>edge(p,inner)),...profile.slice().reverse().map(p=>edge(p,outer))
 ],color);

 // The icy crest follows the outer edge of the spine.
 for(let i=4;i<profile.length-7;i+=5){
  const p=profile[i],tip=p.r>7?1.72:1.47;
  polygon(ctx,[edge(p,.73,-4),edge(p,tip,1),edge(p,.82,6)],OUTLINE);
  polygon(ctx,[edge(p,.82,-2),edge(p,tip-.19,1),edge(p,.88,4)],i%3===0?'#e68bc7':'#9f9de8');
  if(p.r>7)polygon(ctx,[edge(p,tip-.19,1),edge(p,1.12,1),edge(p,.88,4)],'#a3e4ef');
 }
 band(-1.12,1.12,OUTLINE);
 band(-.97,.96,'#5a3795');
 band(-.94,-.20,'#bf6eb7');
 band(-.77,-.28,'#f2a6cc');
 band(-.27,.73,'#8650b9');
 band(.43,.81,'#ad80dc');
 band(.72,.91,'#c5acfa');
 for(let i=3;i<profile.length-2;i+=3){
  const p=profile[i];
  polygon(ctx,[edge(p,-.91,-1),edge(p,-.25,0),edge(p,-.28,1.5),edge(p,-.93,1)],'#894e91');
  if(p.r<5)continue;
  const glint=.5+.5*Math.cos(2*phase-i*.27);
  polygon(ctx,[edge(p,.13,-2),edge(p,.56,0),edge(p,.24,3),edge(p,.03,1)],'#643d9d');
  polygon(ctx,[edge(p,.13,-1),edge(p,.53,0),edge(p,.26,1)],glint>.84?'#b3e9f1':'#c6a0e9');
 }
 const tail=profile.at(-1);
 polygon(ctx,[edge(tail,6,-5),edge(tail,1,6),edge(tail,-5,1),edge(tail,-2,-4)],OUTLINE);
 polygon(ctx,[edge(tail,4,-3),edge(tail,1,4),edge(tail,-3,1),edge(tail,-1,-3)],'#a8e4ee');
}

function drawHead(ctx,[x,y],tilt,phase){
 ctx.save();
 ctx.translate(Math.round(x),Math.round(y));
 ctx.rotate(tilt);
 const fill=(color,...points)=>polygon(ctx,points,color);
 // Two stepped antlers, a jagged mane and a long armored snout.
 fill(OUTLINE,[-6,-11],[-18,-29],[-16,-34],[-11,-29],[-7,-29],[-6,-23],[1,-21],[3,-13]);
 fill('#d0b6f1',[-6,-14],[-15,-28],[-15,-31],[-11,-27],[-8,-27],[-4,-21],[0,-18]);
 fill(OUTLINE,[6,-16],[3,-23],[9,-27],[10,-32],[16,-38],[19,-38],[17,-29],[17,-24],[14,-17]);
 fill('#9adce8',[8,-18],[6,-23],[12,-27],[13,-32],[17,-36],[15,-25],[12,-18]);
 fill(OUTLINE,[-5,-18],[7,-19],[17,-16],[23,-10],[31,-8],[37,-4],[39,3],[34,8],[18,10],[12,15],[2,17],[-11,13],[-17,15],[-14,7],[-22,9],[-18,0],[-24,-5],[-16,-8],[-19,-16],[-9,-13]);
 fill('#6e449e',[-6,-16],[8,-17],[17,-14],[22,-8],[31,-6],[36,-3],[37,2],[32,6],[17,8],[11,13],[2,15],[-10,11],[-13,12],[-11,5],[-18,7],[-15,-1],[-20,-5],[-13,-7],[-15,-13],[-8,-11]);
 fill('#9c69cc',[-10,-10],[-4,-14],[8,-15],[17,-12],[21,-7],[29,-5],[22,-2],[15,-5],[12,3],[3,6],[-4,3],[-9,8],[-8,1],[-15,4],[-11,-4],[-16,-6]);
 fill('#ec9ac9',[3,8],[11,5],[23,3],[37,1],[33,6],[17,8],[11,12],[4,14],[-3,11]);
 fill('#b7a4eb',[-8,-10],[0,-13],[10,-13],[14,-11],[7,-10],[-2,-7]);
 fill('#543177',[-15,-6],[-8,-6],[-3,-2],[-9,0],[-15,4],[-11,-3]);
 fill('#2b1947',[6,-6],[12,-9],[18,-6],[15,0],[9,2],[5,-1]);
 fill('#a7eff5',[7,-5],[12,-7],[16,-5],[13,-1],[9,0]);
 ctx.fillStyle='#381d5a';ctx.fillRect(11,-6,2,5);ctx.fillRect(31,-3,3,2);
 ctx.fillStyle='#e4fbff';ctx.fillRect(9,-6,2,2);
 fill('#fde1ef',[22,5],[25,4],[24,8],[22,8]);
 const blink=Math.abs(phase-4.45)<.065;
 if(blink)fill('#8253ac',[5,-4],[12,-5],[17,-4],[14,1],[8,2]);

 // Fine whiskers float behind the muzzle.
 const sway=2*Math.sin(2*phase);
 fill('#a3e8e9',[29,4],[40,7],[47,7+sway],[54,3+sway],[48,9+sway],[39,9],[29,6]);
 fill('#dc96d2',[25,7],[32,12],[42,15+sway],[48,12+sway],[43,17+sway],[31,14],[25,9]);
 ctx.restore();
}

export function drawSerpent(ctx,seconds){
 const {phase,points,tilt}=samplePose(seconds);
 ctx.clearRect(0,0,WIDTH,HEIGHT);
 const pulse=.5+.5*Math.cos(phase*2);
 const glow=ctx.createRadialGradient(122,75,8,122,75,91);
 glow.addColorStop(0,'rgba(107,53,155,'+(.13+.07*pulse)+')');
 glow.addColorStop(1,'rgba(107,53,155,0)');
 ctx.fillStyle=glow;ctx.fillRect(16,7,214,125);

 const runner=phase/TAU*orbit.length;
 orbit.forEach(([x,y],i)=>{
  if(i%3!==0)return;
  const distance=(runner-i+orbit.length)%orbit.length;
  ctx.globalAlpha=.10+.28*Math.max(0,1-distance/12);
  ctx.fillStyle=distance<5?'#aceef2':'#ae92e8';
  ctx.fillRect(Math.round(x),Math.round(y),distance<4?2:1,1);
 });
 for(const [x,y,offset,color] of stars){
  const a=phase+offset*TAU,light=Math.pow(.5+.5*Math.cos(a),5);
  const px=Math.round(x+2*Math.sin(a)),py=Math.round(y-2*Math.cos(a));
  ctx.globalAlpha=.27+.64*light;
  ctx.fillStyle=color;ctx.fillRect(px,py,2,2);
  if(light>.43){
   ctx.fillRect(px-2,py,6,1);ctx.fillRect(px,py-2,1,6);
  }
 }
 ctx.globalAlpha=.28+.17*pulse;
 ctx.fillStyle='#bda3ef';
 for(const [x,y] of [[66,105],[221,96],[148,27]]){
  ctx.fillRect(x+2,y,2,1);ctx.fillRect(x,y+2,1,3);
  ctx.fillRect(x+5,y+2,1,3);ctx.fillRect(x+2,y+6,2,1);
  ctx.fillRect(x+2,y+3,2,1);
 }
 ctx.globalAlpha=1;
 drawBody(ctx,points,phase);
 drawHead(ctx,points[0],tilt,phase);
}

export function mountSerpent(canvas){
 const ctx=canvas.getContext('2d');
 if(!ctx)return ()=>{};
 let frame=null,last=null,elapsed=0;
 const frameStep=1000/30;
 function tick(now){
  frame=requestAnimationFrame(tick);
  if(last!==null&&now-last<frameStep-1)return;
  if(last!==null)elapsed=(elapsed+(now-last)/1000)%LOOP_SECONDS;
  last=now;
  drawSerpent(ctx,elapsed);
  canvas.hidden=false;
 }
 return running=>{
  if(running&&frame===null)frame=requestAnimationFrame(tick);
  else if(!running&&frame!==null){cancelAnimationFrame(frame);frame=null;last=null}
 };
}
