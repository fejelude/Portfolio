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
function skyTexture(low){
 const w=low?384:640,h=w/2;
 const c=document.createElement('canvas');c.width=w;c.height=h;
 const ctx=c.getContext('2d'),img=ctx.createImageData(w,h),rand=random(1965);
 // Periodic value-noise fields keep the nebula seam closed around the sky.
 const side=64,noise=Float32Array.from({length:side*side},()=>rand());
 function grain(x,y){
  const a=Math.floor(x),b=Math.floor(y),fx=smooth(x-a),fy=smooth(y-b);
  const at=(u,v)=>noise[((v+side*64)%side)*side+((u+side*64)%side)];
  return mix(mix(at(a,b),at(a+1,b),fx),mix(at(a,b+1),at(a+1,b+1),fx),fy);
 }
 for(let y=0;y<h;y++){
  const v=y/h;
  for(let x=0;x<w;x++){
   const u=x/w,a=TAU*(u-.75),dx=Math.cos(a),dz=Math.sin(a);
   const nx=dx*8+8,ny=dz*8+8+v*12;
   const dust=grain(nx,ny)*.55+grain(nx*2+3,ny*2)*.27+grain(nx*4,ny*4+7)*.13+grain(nx*8,ny*8)*.05;
   const latitude=.67+.09*Math.sin(2*a+.7)+.05*Math.sin(5*a);
   const cloud=Math.exp(-Math.abs(v-latitude)*7.8)*Math.pow(dust,.88);
   const violet=.54+.46*Math.sin(2*a+.86+v*3);
   const fine=grain(nx*11,ny*11)*2;
   const i=(y*w+x)*4;
   img.data[i]=6+cloud*(21+77*violet)+fine;
   img.data[i]=10+cloud*(52-17*violet)+fine;
   img.data[i]=29+cloud*(112+22*violet)+fine;
   img.data[i+3]=255;
  }
 }
 ctx.putImageData(img,0,0);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return map;
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
function constellation(root,coords,texture,offset){
 const path=coords.map(p=>new T.Vector3(...p));
 const line=patternedLine(root,'Constellation strokes',coords,0xbcdcff,.4);
 const g=new T.BufferGeometry().setFromPoints(path),sparkMat=new T.PointsMaterial({
  size:.28,color:0xb6e1ff,map:texture,transparent:true,depthWrite:false,blending:T.AdditiveBlending
 });
 root.add(new T.Points(g,sparkMat));
 const pulse=new T.Sprite(new T.SpriteMaterial({map:texture,color:0xe1efff,depthWrite:false,transparent:true,blending:T.AdditiveBlending}));
 pulse.scale.setScalar(.57);root.add(pulse);
 return progress=>{
  const t=(progress+offset)%1,travel=t*(path.length-1),i=Math.min(path.length-2,Math.floor(travel));
  const glow=Math.pow(Math.sin(Math.PI*t),2);
  pulse.position.lerpVectors(path[i],path[i+1],travel-i);
  line.material.opacity=.40+glow*.31;pulse.material.opacity=glow*.80;sparkMat.opacity=.67+.30*glow;
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
function makePillar(root,x,z,base,height,muted,gold,gem,n){
 const g=new T.Group();root.add(g);g.position.set(x,base,z);g.scale.setScalar(height/6.7);
 const stone=new T.MeshStandardMaterial({color:muted?0x263355:0x536888,metalness:.30,roughness:.6});
 const shadowed=new T.MeshStandardMaterial({color:muted?0x171f3e:0x344866,metalness:.37,roughness:.55});
 profile(g,'Stepped Ionian base and capital',[
  [0,0],[1.18,0],[1.18,.25],[1.02,.25],[1.02,.48],[.88,.48],[.88,.74],[.70,.84],[.69,1.25],[.47,1.36],[.43,1.55],
  [.38,5.46],[.48,5.62],[.64,5.73],[.64,5.91],[.87,6.05],[.87,6.22],[1.05,6.34],[1.05,6.57],[0,6.57]
 ],stone,n);
 const count=muted?8:16;
 const geo=new T.CylinderGeometry(.067,.09,4.06,6);
 const flutes=new T.InstancedMesh(geo,shadowed,count),pose=new T.Object3D();
 for(let i=0;i<count;i++){
  const a=TAU*i/count;pose.position.set(.421*Math.cos(a),3.49,.421*Math.sin(a));
  pose.rotation.z=-.012*Math.cos(a);pose.rotation.x=.012*Math.sin(a);pose.updateMatrix();flutes.setMatrixAt(i,pose.matrix);
 }
 g.add(flutes);
 for(const [y,r,w] of [[.25,1.183,.075],[.77,.85,.057],[1.32,.585,.07],[5.65,.54,.05],[6.23,.96,.076],[6.57,1.048,.09]]){
  band(g,'Column collar inlay',y,r,w,.063,gold,n);
 }
 if(!muted){
  const mount=place(g,'Chiseled crystal shrine',new T.OctahedronGeometry(.29),gold,0,1.04,.676);
  mount.scale.set(.88,1.47,.45);
  place(g,'Cyan column stone',new T.OctahedronGeometry(.215),gem,0,1.05,.789).scale.set(.85,1.5,.45);
 }
}
function architecture(root,gold,gem,low){
 const n=low?24:40;
 makePillar(root,-7.65,-11,-8.0,7.5,false,gold,gem,n);
 makePillar(root,6.62,-12.8,-9.05,8.6,false,gold,gem,n);
 const distanceTrim=new T.Group();root.add(distanceTrim);
 if(!low){
  makePillar(distanceTrim,-11,-18,-12.0,12.1,true,gold,gem,24);
  makePillar(distanceTrim,12.1,-19,-12.6,12.8,true,gold,gem,24);
 }
 const arch=place(root,'Open celestial arch',new T.TorusGeometry(6.9,.072,6,76,2.92),gold,.25,-9.0,-12);
 arch.rotation.z=.11;
 place(root,'Arch second ring',new T.TorusGeometry(6.58,.04,5,64,2.92),gold,.25,-9.0,-12).rotation.z=.11;
 const wavy=[];
 for(let j=0;j<3;j++)for(let i=0;i<32;i++){
  const p=i/32,q=(i+1)/32;
  const at=k=>[-8+16*k,-7.05+j*.18+.10*Math.sin(10*k+j),-10.7];
  wavy.push(at(p),at(q));
 }
 engraving(root,'Distant celestial terrace',wavy,new T.LineBasicMaterial({color:0x546999,transparent:true,opacity:.65,depthWrite:false}));
 return distanceTrim;
}
function orbitArc(parent,r,length,color,y){
 const pts=Array.from({length:64},(_,i)=>{
  const a=length*i/63;
  return [r*Math.cos(a),y,r*Math.sin(a)];
 });
 return patternedLine(parent,'Platform energy trail',pts,color,.55);
}
export function buildCelestialObservatory(scene,{mobile=false}={}){
 const root=new T.Group();root.name='Daedalus Celestial Observatory';scene.add(root);
 const sky=skyTexture(mobile);
 place(root,'Procedural nebula dome',new T.SphereGeometry(55,32,20),
  new T.MeshBasicMaterial({map:sky,side:T.BackSide,depthWrite:false,toneMapped:false})).renderOrder=-20;
 const gold=alloy(0xd4a970);
 const gem=new T.MeshStandardMaterial({color:0x56cdf2,metalness:.42,roughness:.19,emissive:0x0c8bc3,emissiveIntensity:.7});
 const texture=softStar();
 starField(root,mobile?530:920,46,texture,318);
 const dust=starField(root,mobile?40:98,17,texture,712);
 const signals=[
  constellation(root,[[-9,-2.1,-13],[-7.2,-.9,-13],[-5.8,-2.3,-13],[-4.0,-1.4,-13],[-3.0,-2.9,-13]],texture,.13),
  constellation(root,[[3.5,-2.7,-14],[5.7,-1.1,-14],[7.2,-2.0,-14],[8.7,-.7,-14],[10.1,-2.7,-14]],texture,.68)
 ];
 platform(root,gold,gem,mobile?56:84);
 const distanceTrim=architecture(root,gold,gem,mobile);
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
 return {update(seconds,{economy=false,focus=false}={}){
  const {angle,breath,pulse}=celestialPhase(seconds);
  orbiter.rotation.y=angle;blue.material.opacity=.44+.26*breath;warm.material.opacity=.29+.20*(1-breath);
  gem.emissiveIntensity=.46+.28*breath;
  fill.intensity=1.52+.51*breath;
  dust.visible=!economy&&!focus;distanceTrim.visible=!economy;
  dust.rotation.y=.055*Math.sin(angle);dust.rotation.z=.013*Math.cos(angle);
  signals.forEach(signal=>signal(pulse));
 }};
}
