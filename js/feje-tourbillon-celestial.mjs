import * as T from './vendor/three-r160.1.mjs';

import {SKY_PERIOD} from './feje-tourbillon-astrolabe.mjs';
const TAU=Math.PI*2;
const phaseAt=seconds=>TAU*((seconds%SKY_PERIOD+SKY_PERIOD)%SKY_PERIOD)/SKY_PERIOD;
export function celestialPhase(seconds){
 const a=phaseAt(seconds);
 return {angle:a,breath:.5+.5*Math.cos(a),pulse:a/TAU};
}
const random=(seed)=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const alloy=color=>new T.MeshStandardMaterial({color,metalness:.77,roughness:.34});
function place(root,name,geo,mat,x=0,y=0,z=0){
 const obj=new T.Mesh(geo,mat);obj.name=name;obj.position.set(x,y,z);root.add(obj);return obj;
}
function profile(root,name,points,material,n=64){
 return place(root,name,new T.LatheGeometry(points.map(p=>new T.Vector2(...p)),n),material);
}
function band(root,name,y,r,w,h,material,n=64){
 return profile(root,name,[[r-w,y-h/2],[r-.018,y-h/2],[r,y-h*.24],[r,y+h*.23],[r-.023,y+h/2],[r-w,y+h/2],[r-w,y-h/2]],material,n);
}
// Coordinates on the distant nebula dome (not near the temple pillars).
// Both the strokes and the star nodes are painted into the SAME sky texture.
export const CONSTELLATION_PATHS=Object.freeze([
 [[.640,.540],[.656,.489],[.677,.516],[.696,.471],[.721,.494]],
 [[.798,.536],[.813,.485],[.835,.505],[.851,.459],[.876,.475]]
]);
export function skyDirection(u,v,radius=52){
 const phi=TAU*u,theta=Math.PI*v;
 return [-radius*Math.cos(phi)*Math.sin(theta),radius*Math.cos(theta),radius*Math.sin(phi)*Math.sin(theta)];
}
export function writeNebulaColor(buffer,index,cloud,violet,fine){
 // Rich sapphire/indigo mass with cyan lights and selective violet shadows.
 buffer[index]=7+cloud*(47+34*violet)+fine;
 buffer[index+1]=12+cloud*(64-22*violet)+fine;
 buffer[index+2]=31+cloud*(158+16*violet)+fine;
 buffer[index+3]=255;
}
function skyTexture(low){
 const w=low?384:640,h=w/2;
 const c=document.createElement('canvas');c.width=w;c.height=h;
 const ctx=c.getContext('2d',{willReadFrequently:false}),img=ctx.createImageData(w,h),rand=random(1965);
 // Periodic noise wraps in longitude. A two-axis warp breaks the former
 // single thin cloud band into overlapping, irregular celestial gas masses.
 const side=64,noise=Float32Array.from({length:side*side},()=>rand());
 function grain(x,y){
  const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);
  const at=(a,b)=>noise[(((b%side)+side)%side)*side+((a%side+side)%side)];
  return mix(mix(at(ix,iy),at(ix+1,iy),fx),mix(at(ix,iy+1),at(ix+1,iy+1),fx),fy);
 }
 function cloudAt(u,v){
  const a=TAU*(u-.75),x0=8+6*Math.cos(a)+v*7,y0=8+6*Math.sin(a)+v*9;
  const warpA=grain(x0*.73+11,y0*.73+v*3);
  const warpB=grain(x0*.86-v*1.7+6,y0*.90+v*4);
  const x=x0+1.55*(warpA-.5),y=y0+v*9+1.6*(warpB-.5);
  const lowNoise=grain(x*.64+1,y*.58+1);
  const mid=grain(x*1.6+9,y*1.45+4);
  const hi=grain(x*3.4+2,y*3.1+7);
  const gauss=(center,width)=>Math.exp(-Math.pow((v-center)/width,2));
  const layers=.87*gauss(.59+.17*Math.sin(a*.9+.3),.34)
              +.62*gauss(.38+.12*Math.sin(a*1.7+2),.22)
              +.56*gauss(.83+.08*Math.sin(a*2.5-1),.25);
  const filaments=.10+1.20*(.64*lowNoise+.25*mid+.11*hi);
  return Math.min(1,Math.max(0,layers*filaments*.75));
 }
 for(let y=0;y<h;y++){
  const v=(y+.5)/h;
  for(let x=0;x<w;x++){
   const u=(x+.5)/w,a=TAU*(u-.75);
   const cloud=cloudAt(u,v);
   const violet=.14+.44*(.5+.5*Math.sin(a*2.3+v*6.5+1));
   const fine=(grain(x*.17,y*.19)-.5)*3;
   const i=(y*w+x)*4,cyan=.5+.5*Math.sin(a*2.7-v*9+1.9);
   writeNebulaColor(img.data,i,cloud,violet,fine);
   // Blue gas catches subtle aqua light, while purple remains in the shadows.
   img.data[i+1]+=cloud*cyan*30;
   img.data[i+2]+=cloud*cyan*8;
  }
 }
 ctx.putImageData(img,0,0);
 // Stars are embedded in the same nebula texture, biased toward wispy clouds
 // and softly extinguished in the denser gas instead of floating as a separate
 // full-sphere point cloud in front of the atmosphere.
 const stars=low?750:1450,scale=w/640;
 ctx.save();ctx.globalCompositeOperation='screen';
 for(let i=0;i<stars;i++){
  const u=rand(),v=.11+rand()*.79,gas=cloudAt(u,v);
  if(rand()>.22+.69*gas)continue;
  const x=u*w,y=v*h,large=rand()<.065,alpha=(.24+.54*rand())*(1-.32*gas);
  if(large){
   const size=(6+8*rand())*scale;
   const halo=ctx.createRadialGradient(x,y,0,x,y,size);
   halo.addColorStop(0,'rgba(215,247,255,.48)');
   halo.addColorStop(.2,'rgba(112,206,255,.21)');
   halo.addColorStop(1,'rgba(94,156,255,0)');
   ctx.globalAlpha=alpha;ctx.fillStyle=halo;ctx.fillRect(x-size,y-size,size*2,size*2);
  }
  ctx.globalAlpha=alpha;ctx.fillStyle=i%9===0?'#ffe7c7':i%5===0?'#b5e9ff':'#e3edff';
  const size=large?Math.max(1,1.5*scale):Math.max(.6,.85*scale);
  ctx.fillRect(x-size/2,y-size/2,size,size);
 }
 // Zodiac-like routes are a restrained overlay on the cloudy sky itself.
 // Glowing nodes emit into the surrounding nebula; there are no near-camera
 // zigzag "wires" beside the architectural columns.
 for(const path of CONSTELLATION_PATHS){
  ctx.beginPath();
  path.forEach(([u,v],i)=>{if(i)ctx.lineTo(u*w,v*h);else ctx.moveTo(u*w,v*h)});
  ctx.shadowColor='#62bfff';ctx.shadowBlur=12*scale;
  ctx.strokeStyle='#78c5ff';ctx.lineWidth=2.1*scale;ctx.globalAlpha=.26;ctx.stroke();
  ctx.shadowBlur=0;ctx.strokeStyle='#d1efff';ctx.lineWidth=Math.max(.65,.85*scale);
  ctx.globalAlpha=.50;ctx.stroke();
  path.forEach(([u,v],i)=>{
   const x=u*w,y=v*h,rad=(i%2?9:13)*scale;
   const glow=ctx.createRadialGradient(x,y,0,x,y,rad);
   glow.addColorStop(0,'rgba(243,252,255,.86)');
   glow.addColorStop(.16,'rgba(137,224,255,.5)');
   glow.addColorStop(1,'rgba(93,166,255,0)');
   ctx.globalAlpha=.74;ctx.fillStyle=glow;ctx.fillRect(x-rad,y-rad,2*rad,2*rad);
   ctx.globalAlpha=.9;ctx.fillStyle='#e8faff';
   ctx.beginPath();ctx.arc(x,y,Math.max(.8,1.45*scale),0,TAU);ctx.fill();
  });
 }
 ctx.restore();
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=2;return map;
}
function softStar(){
 const c=document.createElement('canvas');c.width=c.height=32;
 const ctx=c.getContext('2d'),g=ctx.createRadialGradient(16,16,0,16,16,16);
 g.addColorStop(0,'#ffffff');g.addColorStop(.24,'#e1f6ff');g.addColorStop(.52,'#9cd8ff72');g.addColorStop(1,'#74aaff00');
 ctx.fillStyle=g;ctx.fillRect(0,0,32,32);return new T.CanvasTexture(c);
}
const patternedLine=(root,name,points,color,opacity)=>{
 const g=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));
 const line=new T.Line(g,new T.LineBasicMaterial({color,opacity,transparent:true,depthWrite:false}));
 line.name=name;root.add(line);return line;
};
function starField(root,count,radius,texture,seed){
 const rng=random(seed),p=[],colors=[];
 for(let i=0;i<count;i++){
  const z=2*rng()-1,a=TAU*rng(),r=radius*(.88+rng()*.12),x=Math.sqrt(1-z*z);
  p.push(r*x*Math.cos(a),r*z,r*x*Math.sin(a));
  const c=new T.Color(i%6===0?0xbea0fc:i%4===0?0xf3d6b0:0x91baf4).multiplyScalar(.53+.47*rng());
  colors.push(c.r,c.g,c.b);
 }
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const dots=new T.Points(g,new T.PointsMaterial({
  map:texture,vertexColors:true,size:radius*.007,transparent:true,depthWrite:false,opacity:.73,blending:T.AdditiveBlending
 }));
 root.add(dots);return dots;
}
function constellationPulse(root,coords,texture,offset){
 const path=coords.map(([u,v])=>new T.Vector3(...skyDirection(u,v)));
 const pulse=new T.Sprite(new T.SpriteMaterial({
  map:texture,color:0xd4f5ff,transparent:true,depthWrite:false,
  blending:T.AdditiveBlending,opacity:0
 }));
 pulse.scale.setScalar(.48);pulse.name='Distant constellation shimmer';
 root.add(pulse);
 return progress=>{
  const t=(progress+offset)%1,travel=t*(path.length-1),i=Math.min(path.length-2,Math.floor(travel));
  pulse.position.lerpVectors(path[i],path[i+1],travel-i);
  pulse.material.opacity=.45*Math.pow(Math.sin(Math.PI*t),2);
 };
}
function engraving(root,name,points,material){
 const geo=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));
 const obj=new T.LineSegments(geo,material);obj.name=name;root.add(obj);return obj;
}
function platform(root,gold,gem,n){
 const floor=new T.MeshStandardMaterial({color:0x154285,metalness:.51,roughness:.34});
 const stone=new T.MeshStandardMaterial({color:0x162944,metalness:.29,roughness:.59});
 profile(root,'Carved foundation',[
  [0,-1.18],[2.63,-1.18],[3.13,-1.04],[3.45,-.86],[3.54,-.73],[3.55,-.61],[3.47,-.49],[3.32,-.402],[0,-.402]
 ],stone,n);
 profile(root,'Sapphire platform inlay',[[0,-.402],[3.36,-.402],[3.37,-.38],[0,-.38]],floor,n);
 for(const [y,r,w,h] of [[-.97,3.19,.06,.035],[-.787,3.51,.068,.047],[-.635,3.57,.12,.066],[-.454,3.49,.14,.05],[-.372,3.391,.094,.032],[-.367,2.79,.043,.014],[-.365,3.10,.027,.011]]){
  band(root,'Gilded platform rim',y,r,w,h,gold,n);
 }
 const ticks=new T.InstancedMesh(new T.BoxGeometry(1,.012,.014),gold,96);
 const pose=new T.Object3D(),glyphs=[];
 for(let i=0;i<96;i++){
  const a=i*TAU/96,major=i%8===0;
  pose.position.set(3.17*Math.cos(a),-.361,-3.17*Math.sin(a));pose.rotation.y=a;
  pose.scale.set(major?.157:.075,1,major?1.5:1);
  pose.updateMatrix();ticks.setMatrixAt(i,pose.matrix);
  if(major){
   const a2=a+.12,center=[2.96*Math.cos(a2),2.96*Math.sin(a2)];
   const at=(x,y)=>[center[0]+x*Math.cos(a2)-y*Math.sin(a2),-.361,center[1]+x*Math.sin(a2)+y*Math.cos(a2)];
   const diamond=[at(.1,0),at(0,.079),at(-.1,0),at(0,-.079)];
   for(let j=0;j<4;j++)glyphs.push(diamond[j],diamond[(j+1)%4]);
   if(i%16===0)glyphs.push(at(-.135,0),at(.134,0));
   else glyphs.push(at(0,-.117),at(0,.117));
  }
 }
 root.add(ticks);engraving(root,'Stylized celestial sigils',glyphs,new T.LineBasicMaterial({color:0xd2af7a}));
 const jewels=new T.InstancedMesh(new T.OctahedronGeometry(.102),gem,8);
 const mounts=new T.InstancedMesh(new T.CylinderGeometry(.135,.15,.04,14),gold,8);
 for(let i=0;i<8;i++){
  const a=(i+.5)*TAU/8;
  pose.position.set(3.25*Math.cos(a),-.327,3.25*Math.sin(a));
  pose.scale.set(1,.56,1);pose.rotation.y=a;
  pose.updateMatrix();jewels.setMatrixAt(i,pose.matrix);
  pose.position.y=-.365;pose.scale.setScalar(1);pose.updateMatrix();mounts.setMatrixAt(i,pose.matrix);
 }
 root.add(mounts,jewels);
}
// The former columns and arches were removed deliberately: this exhibit now
// floats in an uninterrupted celestial sky, with its engraved dial platform as
// the only architectural stage. This also saves meshes, materials and draws.
function orbitArc(parent,r,length,color,y){
 const pts=Array.from({length:64},(_,i)=>{
  const a=length*i/63;
  return [r*Math.cos(a),y,r*Math.sin(a)];
 });
 return patternedLine(parent,'Platform energy trail',pts,color,.55);
}
export function buildCelestialObservatory(scene,{mobile=false}={}){
 const root=new T.Group();root.name='Daedalus Celestial Observatory';scene.add(root);
 const skyGroup=new T.Group();skyGroup.name='Distant nebula and constellations';root.add(skyGroup);
 const skyMesh=place(skyGroup,'Layered sapphire nebula dome',new T.SphereGeometry(55,32,20),
  new T.MeshBasicMaterial({map:skyTexture(false),side:T.BackSide,depthWrite:false,toneMapped:false}));
 skyMesh.renderOrder=-20;
 const gold=alloy(0xd4a970);
 const gem=new T.MeshStandardMaterial({color:0x56cdf2,metalness:.42,roughness:.19,emissive:0x0c8bc3,emissiveIntensity:.7});
 const texture=softStar();
 // Far stars and strokes already live inside skyTexture; only nearby dust
 // and the two small travelling light glints remain separate 3D particles.
 const dust=starField(root,52,17,texture,712);
 const signals=CONSTELLATION_PATHS.map((path,i)=>constellationPulse(skyGroup,path,texture,i*.47+.09));
 platform(root,gold,gem,mobile?56:84);
 // No temple columns, arch toruses or detached terrace geometry.
 const orbiter=new T.Group();root.add(orbiter);
 band(orbiter,'Engraved traveling meridian',-.35,3.364,.015,.005,gold,mobile?56:84);
 const meridian=[];
 for(let i=0;i<12;i++){
  const a=i*TAU/12,at=r=>[r*Math.cos(a),-.344,r*Math.sin(a)];
  meridian.push(at(3.20),at(3.35));
 }
 engraving(orbiter,'Meridian highlights',meridian,new T.LineBasicMaterial({color:0xefce92,opacity:.63,transparent:true,depthWrite:false}));
 const blue=orbitArc(orbiter,3.34,1.25,0x68dafa,-.336);
 const warm=orbitArc(orbiter,3.05,.87,0xf2cb82,-.355);warm.rotation.y=Math.PI;
 const fill=new T.PointLight(0x3ab8ff,1.8,8,2);fill.position.set(0,.24,2.05);scene.add(fill);
 return {
 update(seconds,{economy=false,focus=false}={}){
  const {angle,breath,pulse}=celestialPhase(seconds);
  skyGroup.rotation.y=.012*Math.sin(angle);skyGroup.rotation.x=.004*Math.sin(angle+.7);
  orbiter.rotation.y=angle;blue.material.opacity=.44+.26*breath;warm.material.opacity=.29+.20*(1-breath);
  gem.emissiveIntensity=.46+.28*breath;
  fill.intensity=1.52+.51*breath;
  dust.visible=!economy&&!focus;
  dust.rotation.y=.055*Math.sin(angle);dust.rotation.z=.013*Math.cos(angle);
  signals.forEach(signal=>signal(pulse));
 }};
}
