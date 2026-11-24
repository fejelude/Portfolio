import * as T from './vendor/three-r160.1.mjs';
import {TAU,rosettePoint} from './feje-tourbillon-geometry.mjs';

// Original procedural finishing maps. Height texture data is linear, not sRGB.
// One texture per finish, generated once per watch and disposed with the scene.
function surface(size,paint){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d');paint(ctx,size);
 const map=new T.CanvasTexture(canvas);map.anisotropy=4;return map;
}
export function perlageFinish(){
 return surface(512,(ctx,n)=>{
  ctx.fillStyle='#777';ctx.fillRect(0,0,n,n);
  for(let row=-1;row<13;row++)for(let col=-1;col<13;col++){
   const x=col*45+(row%2)*22.5,y=row*43;
   const g=ctx.createRadialGradient(x,y,1,x,y,28);
   g.addColorStop(0,'#888');g.addColorStop(.40,'#777');g.addColorStop(.65,'#a1a1a1');g.addColorStop(.85,'#707070');g.addColorStop(1,'#7b7b7b');
   ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,28,0,TAU);ctx.fill();
   for(let i=4;i<27;i+=3){ctx.strokeStyle=i%2?'#aaa3':'#4443';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(x,y,i,0,TAU);ctx.stroke()}
  }
 });
}
export function guillocheFinish(){
 return surface(512,(ctx,n)=>{
  ctx.fillStyle='#777';ctx.fillRect(0,0,n,n);
  ctx.translate(n/2,n/2);
  for(let i=0;i<24;i++){
   const r=16+i*9.5,depth=2.1+i*.12,phase=i*Math.PI/6;
   ctx.beginPath();
   for(let j=0;j<=600;j++){const [x,y]=rosettePoint(j/600,r,18,depth,phase);ctx[j?'lineTo':'moveTo'](x,y)}
   ctx.strokeStyle='#454545';ctx.lineWidth=2.4;ctx.stroke();
   ctx.translate(.7,.7);ctx.strokeStyle='#b2b2b2';ctx.lineWidth=.8;ctx.stroke();ctx.translate(-.7,-.7);
  }
 });
}
export function brushedFinish(){
 return surface(256,(ctx,n)=>{
  const pixels=ctx.createImageData(n,n);
  let seed=317;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let y=0;y<n;y++){
   const grain=rand()*32;
   for(let x=0;x<n;x++){
    const i=(y*n+x)*4,v=100+grain+rand()*9+10*Math.sin(y*2.3);
    pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;
   }
  }
  ctx.putImageData(pixels,0,0);
 });
}
