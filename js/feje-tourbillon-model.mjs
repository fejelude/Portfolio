import * as T from './vendor/three-r160.1.mjs';
import {MOVEMENT as m, TAU} from './feje-tourbillon-mechanism.mjs';

import {wheelOutline,fillHairspring,ribbonIndices,barrelSpiral} from './feje-tourbillon-geometry.mjs';
import {perlageFinish,guillocheFinish,brushedFinish} from './feje-tourbillon-finishes.mjs';
import {coastlines} from './feje-tourbillon-coastlines.mjs';
const mat = (color,metalness,roughness,extra={}) =>
 new T.MeshStandardMaterial({color,metalness,roughness,...extra});
const gold=mat(0xd99066,.88,.24);
const edge=mat(0xf5bf96,.91,.16);
const brush=mat(0xa56148,.81,.37);
const steel=mat(0xb5cce4,.89,.23);
const mirror=mat(0xe2e8f1,.98,.115);
const blued=mat(0x355788,.95,.19);
const springSteel=mat(0x7895c8,.9,.27,{side:T.DoubleSide});
const rosePolish=mat(0xf0ac87,.96,.15);
const dark=mat(0x253344,.72,.37);
const blue=mat(0x123477,.47,.34);
const ruby=new T.MeshPhysicalMaterial({color:0xa20d39,metalness:.12,roughness:.14,clearcoat:1,clearcoatRoughness:.12});
const crystal=new T.MeshPhysicalMaterial({
 color:0xdde8fc,metalness:.44,roughness:.12,flatShading:true,clearcoat:.9
});
const dialInk=new T.MeshBasicMaterial({color:0xf9d3ab});
const sapphire=new T.MeshPhysicalMaterial({
 color:0xc3d8ff,metalness:.18,roughness:.075,transparent:true,opacity:.18,depthWrite:false,clearcoat:1
});
sapphire.onBeforeCompile=shader=>{
 shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   float rim = pow(1.0 - max(0.0, dot(normal, normalize(vViewPosition))), 3.0);
   diffuseColor.a *= 0.20 + 0.80 * rim;
   #include <opaque_fragment>`);
};

function group(parent,name,x=0,y=0,z=0){
 const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;
}
function flattenRigidGroup(parent,sub){
 sub.updateMatrix();
 for(const o of [...sub.children]){
  o.updateMatrix();o.matrix.premultiply(sub.matrix);o.matrix.decompose(o.position,o.quaternion,o.scale);
  parent.add(o);
 }
 parent.remove(sub);
}
function mesh(parent,name,geom,material,x=0,y=0,z=0){
 const obj=new T.Mesh(geom,material);obj.name=name;obj.position.set(x,y,z);parent.add(obj);return obj;
}
const profile=(parent,name,points,material,x=0,z=0,detail=72)=>
 mesh(parent,name,new T.LatheGeometry(points.map(p=>new T.Vector2(...p)),detail),material,x,0,z);
function ring(parent,name,x,y,z,r,w,h,material,detail=64){
 // Scale the bevel to the part, not the case. Tiny jewels and thin tracks
 // no longer get an oversized fixed bevel that collapses their profile.
 const b=Math.min(w*.28,h*.32,r*.08);
 return profile(parent,name,[[r-w+b,y-h/2],[r-b,y-h/2],[r,y-h/2+b],[r,y+h/2-b],[r-b,y+h/2],[r-w+b,y+h/2],[r-w,y+h/2-b],[r-w,y-h/2+b],[r-w+b,y-h/2]],material,x,z,detail);
}
const cylinders=new Map();
function cylinder(parent,name,x,y,z,r,h,material,sides=24){
 const key=[r,h,sides].join(':');
 if(!cylinders.has(key))cylinders.set(key,new T.CylinderGeometry(r,r,h,sides));
 return mesh(parent,name,cylinders.get(key),material,x,y,z);
}
function rod(parent,name,a,b,r,material,sides=12){
 const p=new T.Vector3(...a),q=new T.Vector3(...b),d=q.sub(p),mid=p.addScaledVector(d,.5);
 const obj=cylinder(parent,name,mid.x,mid.y,mid.z,r,d.length(),material,sides);
 obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());
 return obj;
}
function box(parent,name,p,size,material){
 return mesh(parent,name,new T.BoxGeometry(...size),material,...p);
}
function screw(parent,x,y,z,r=.045){
 // Real recessed slot: separate clipped circular segments, not a painted line.
 const head=group(parent,'Blued slotted screw',x,y,z);
 cylinder(head,'Screw shank',0,-.012,0,r*.68,.074,steel,20);
 ring(head,'Polished countersink',0,.015,0,r*1.19,r*.21,.015,mirror,32);
 cylinder(head,'Dark slot floor',0,.023,0,r*.93,.010,dark,32);
 const gap=.18,angle=Math.asin(gap);
 for(const side of [0,1]){
  const shape=new T.Shape(),a0=angle+side*Math.PI,a1=Math.PI-angle+side*Math.PI;
  for(let i=0;i<=22;i++){const a=a0+(a1-a0)*i/22;shape[i?'lineTo':'moveTo'](r*Math.cos(a),r*Math.sin(a))}
  shape.closePath();
  const geo=new T.ExtrudeGeometry(shape,{depth:.013,bevelEnabled:true,bevelSize:r*.06,bevelThickness:.003,bevelSegments:1,curveSegments:12});
  geo.rotateX(-Math.PI/2);mesh(head,'Chamfered screw half',geo,blued,0,.026,0);
 }
 flattenRigidGroup(parent,head);
}
function jewel(parent,x,y,z,r=.079){
 const bearing=group(parent,'Jewelled bearing',x,y,z);
 ring(bearing,'Gold chaton',0,0,0,r,r*.25,.027,rosePolish,40);
 ring(bearing,'Annular ruby hole jewel',0,.014,0,r*.73,r*.49,.023,ruby,40);
 cylinder(bearing,'Pivot end',0,.025,0,r*.17,.022,mirror,24);
 flattenRigidGroup(parent,bearing);
}
function shapedSpoke(parent,a,core,inner,depth,y,material,pitch){
 // Tapered swept spokes are real bevelled solids attached to the wheel.
 const w=Math.min(pitch*.16,(inner-core)*.35),overlap=Math.min(.012,pitch*.08),s=new T.Shape();
 s.moveTo(core,-w*.5);s.quadraticCurveTo((core+inner)*.52,-w*.32,inner+overlap,-w*.78);
 s.lineTo(inner+overlap,w*.78);s.quadraticCurveTo((core+inner)*.52,w*.32,core,w*.5);s.closePath();
 const g=new T.ExtrudeGeometry(s,{depth:depth*.57,bevelEnabled:true,bevelSegments:1,bevelSize:w*.09,bevelThickness:depth*.045,curveSegments:5});g.rotateX(-Math.PI/2);
 const o=mesh(parent,'Tapered wheel spoke',g,material,0,y-depth*.285,0);o.rotation.y=a;
}
function gear(parent,name,count,pitch,y,material,{inner=pitch*.58,depth=.078,escape=false,ornamental=false,open=true}={}){
 const outline=wheelOutline(count,pitch,{escape,ornamental});
 inner=Math.min(inner,outline.root*.82);
 const shape=new T.Shape();
 outline.points.forEach(([x,z],i)=>shape[i?'lineTo':'moveTo'](x,z));shape.closePath();
 const hole=new T.Path();hole.absarc(0,0,inner,0,TAU,true);shape.holes.push(hole);
 // Small teeth need a bevel smaller than the pitch, or the teeth disappear.
 const bevel=Math.min(depth*.11,outline.module*.105);
 const geom=new T.ExtrudeGeometry(shape,{depth,curveSegments:24,bevelEnabled:true,bevelSegments:1,bevelSize:bevel,bevelThickness:bevel});
 geom.rotateX(-Math.PI/2);mesh(parent,name,geom,material,0,y-depth/2,0);
 const core=Math.min(pitch*.29,inner*.64);
 cylinder(parent,'Turned wheel hub',0,y,0,core,depth*1.25,material,28);
 if(pitch>.16){
  ring(parent,'Polished wheel rim',0,y+depth*.54,0,outline.root*.95,Math.min(.012,pitch*.045),.006,material,48);
  ring(parent,'Wheel hub shoulder',0,y+depth*.61,0,core,core*.20,.009,mirror,24);
 }
 if(open)for(let i=0;i<(pitch>.28?6:4);i++)shapedSpoke(parent,i*TAU/(pitch>.28?6:4),core,inner,depth,y,material,pitch);
}
function softOcclusion(parent,x,z,r,opacity){
 const c=document.createElement('canvas');c.width=c.height=64;
 const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,1,32,32,31);
 g.addColorStop(0,'#000');g.addColorStop(.47,'rgba(0,0,0,.62)');g.addColorStop(1,'transparent');
 ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
 const shadow=new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false,opacity});
 const o=mesh(parent,'Contact shadow',new T.PlaneGeometry(r*2,r*2),shadow,x,.108,z);
 o.rotation.x=-Math.PI/2;
}
function ticks(parent,count,r,y,scale=1){
 const mark=new T.InstancedMesh(new T.BoxGeometry(1,.007,1),dialInk,count);
 const pose=new T.Object3D();
 for(let i=0;i<count;i++){
  const a=i*TAU/count,big=i%5===0;
  pose.position.set(r*Math.cos(a),y,-r*Math.sin(a));
  pose.rotation.y=a;
  pose.scale.set((big?.073:.035)*scale,1,(big?.013:.007)*scale);
  pose.updateMatrix();mark.setMatrixAt(i,pose.matrix);
 }
 parent.add(mark);
}
function label(parent,text,position,w,h,{angle=0}={}){
 const c=document.createElement('canvas');c.width=512;c.height=128;
 const ctx=c.getContext('2d');ctx.fillStyle='#f4d7b0';ctx.font='96px Georgia';
 ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(text,256,68,494);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
 const ink=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false});
 const o=mesh(parent,text,new T.PlaneGeometry(w,h),ink,...position);
 o.rotation.set(-Math.PI/2,0,angle);
 return o;
}

function casework(root){
 const shell=group(root,'Sapphire and sculpted case');
 const caseBrush=brush.clone();caseBrush.bumpMap=brushedFinish();caseBrush.bumpScale=.009;
 profile(shell,'Sculpted rose-gold case',[[2.12,-.38],[2.42,-.38],[2.55,-.33],[2.6,-.22],[2.62,-.08],[2.58,.08],[2.49,.14],[2.36,.12],[2.36,-.33],[2.12,-.38]],caseBrush,0,0,144);
 for(const [y,r,w,h,material] of [
  [-.32,2.51,.052,.035,edge],[-.22,2.6,.045,.029,gold],[-.075,2.62,.041,.032,edge],
  [.102,2.56,.057,.052,gold],[.168,2.526,.05,.039,edge],[.62,2.50,.070,.042,gold],[.676,2.515,.074,.050,edge],
  [.713,2.484,.024,.018,steel]
 ])ring(shell,'Beveled case moulding',0,y,0,r,w,h,material,104);
 profile(shell,'Transparent sidewall',[[2.493,.18],[2.471,.62],[2.446,.70]],sapphire,0,0,104).renderOrder=6;
 const arc=Array.from({length:40},(_,i)=>[2.453*Math.cos(i*Math.PI/78),.705+1.65*Math.sin(i*Math.PI/78)]);
 profile(shell,'Curved sapphire dome',arc,sapphire,0,0,104).renderOrder=7;
 // Recessed polished case-back seams and discrete milled edge detail.
 for(const y of [-.342,-.305,.132])ring(shell,'Polished case seam',0,y,0,2.50,.016,.012,rosePolish,112);
 const knurl=new T.InstancedMesh(new T.BoxGeometry(.024,.033,.010),rosePolish,96),pose=new T.Object3D();
 for(let i=0;i<96;i++){const a=i*TAU/96;pose.position.set(2.575*Math.cos(a),-.185,-2.575*Math.sin(a));pose.rotation.y=a-Math.PI/2;pose.updateMatrix();knurl.setMatrixAt(i,pose.matrix)}shell.add(knurl);
 for(let i=0;i<8;i++){
  const a=i*TAU/8+.23,x=2.451*Math.cos(a),z=2.451*Math.sin(a);
  cylinder(shell,'Sapphire support column',x,.39,z,.050,.48,brush);
  for(const y of [.206,.606])cylinder(shell,'Column collar',x,y,z,.088,.074,gold,18);
  screw(shell,x,.7,z,.047);
 }
 for(const x of [-1.52,1.52])for(const z of [-1,1]){
  const lug=profile(shell,'Sculpted attachment lug',[[0,-.08],[.282,-.08],[.35,-.04],[.35,.09],[.285,.13],[0,.13]],gold,0,0,24);
  lug.position.set(x,-.235,2.15*z);lug.scale.set(.81,1,1.27);
  rod(shell,'Lug pin',[x-.19,-.20,2.38*z],[x+.19,-.2,2.38*z],.043,steel);
 }
 const crown=group(shell,'Fluted crown',2.73,.012,0);crown.rotation.z=-Math.PI/2;
 cylinder(crown,'Crown stem',0,-.16,0,.084,.20,steel);
 gear(crown,'Crown flutes',30,.16,0,edge,{inner:.078,depth:.19,ornamental:true});
 cylinder(crown,'Polished crown face',0,.108,0,.142,.033,gold);
 label(crown,'Δ',[0,.128,0],.18,.18);
 return shell;
}
function plate(root){
 const plateMaterial=blue.clone();plateMaterial.bumpMap=perlageFinish();plateMaterial.bumpScale=.014;plateMaterial.roughness=.31;
 cylinder(root,'Circular-grained royal blue movement plate',0,-.026,0,2.405,.25,plateMaterial,128);
 for(const [radius,material] of [[1.40,dark],[1.85,steel],[1.91,dark],[2.07,gold],[2.21,steel],[2.36,steel]]){
  ring(root,'Fine engraved track',0,.102,0,radius,.009,.006,material,96);
 }
 ticks(root,120,2.295,.113,1.45);
 const flecks=new T.InstancedMesh(new T.BoxGeometry(.012,.002,.012),steel,270),dummy=new T.Object3D();
 let randomSeed=173;
 const random=()=>{randomSeed=(Math.imul(1664525,randomSeed)+1013904223)>>>0;return randomSeed/2**32};
 for(let i=0;i<270;i++){
  const a=random()*TAU,r=Math.sqrt(random())*2.26;
  dummy.position.set(r*Math.cos(a),.102,-r*Math.sin(a));dummy.rotation.y=a;
  dummy.scale.setScalar(.38+random()*.86);dummy.updateMatrix();flecks.setMatrixAt(i,dummy.matrix);
 }
 root.add(flecks);
 label(root,'D A E D A L U S',[0,.114,1.87],1.32,.24);
 label(root,'F E J E L U D E  /  0 0 1',[0,.114,2.06],1.11,.15);
 for(const a of [Math.PI/4,3*Math.PI/4,5*Math.PI/4,7*Math.PI/4]){
  const x=Math.cos(a)*1.64,z=Math.sin(a)*1.64;
  for(let i=0;i<4;i++){
   const cross=box(root,'Compass rose ray',[x,.111,z],[.035,.005,.195],i%2?steel:edge);cross.rotation.y=i*Math.PI/4;
  }
 }
}

function bridge(parent,name,a,b){
 const dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz)||1;
 // Bridge is a bevelled, curved plate with broad bearing ends, not a tube.
 const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2];
 const support=group(parent,name,...mid);
 support.rotation.y=Math.atan2(-dz,dx);
 support.rotation.z=Math.atan2(b[1]-a[1],len);
 const span=Math.hypot(len,b[1]-a[1]),half=span/2,w=.072,shape=new T.Shape();
 shape.moveTo(-half-.075,0);shape.quadraticCurveTo(-half-.075,w*1.6,-half,w*1.6);
 shape.bezierCurveTo(-half*.55,w*1.6,-half*.32,w,0,w);
 shape.bezierCurveTo(half*.32,w,half*.55,w*1.6,half,w*1.6);shape.quadraticCurveTo(half+.075,w*1.6,half+.075,0);
 shape.quadraticCurveTo(half+.075,-w*1.6,half,-w*1.6);shape.bezierCurveTo(half*.55,-w*1.6,half*.32,-w,0,-w);
 shape.bezierCurveTo(-half*.32,-w,-half*.55,-w*1.6,-half,-w*1.6);shape.quadraticCurveTo(-half-.075,-w*1.6,-half-.075,0);shape.closePath();
 const g=new T.ExtrudeGeometry(shape,{depth:.052,bevelEnabled:true,bevelSegments:2,bevelSize:.014,bevelThickness:.012,curveSegments:6});
 g.rotateX(-Math.PI/2);mesh(support,'Anglage bridge body',g,brush,0,-.026,0);
 for(const side of [-1,1])rod(support,'Polished shoulder',[-half,.035,side*w*.88],[half,.035,side*w*.88],.009,mirror,8);
 flattenRigidGroup(parent,support);
}
function pillar(parent,x,z,height){
 cylinder(parent,'Stepped pivot pedestal',x,.23,z,.187,.23,brush);
 ring(parent,'Machined pedestal shoulder',x,.32,z,.171,.037,.028,edge,32);
 rod(parent,'Load-bearing shaft',[x,.32,z],[x,height,z],.063,steel);
}
function wheelAt(parent,name,x,z,angle=0){
 const axis=group(parent,name,x,0,z);
 const wheel=group(axis,name+' rotating hub');wheel.rotation.y=angle;
 return wheel;
}
function train(root){
 const cagePoint={x:-1.08,z:.86};
 const u={x:.80,z:-.60};
 const module=.025,step=teeth=>module*teeth*.5;
 const phase=Math.atan2(-u.z,u.x);
 const thirdPos={x:cagePoint.x+.6*u.x,z:cagePoint.z+.6*u.z};
 const barrelPos={x:thirdPos.x+.8*u.x,z:thirdPos.z+.8*u.z};
 const third=wheelAt(root,'Compound third shaft',thirdPos.x,thirdPos.z,phase+Math.PI+Math.PI/m.thirdWheel);
 const barrel=wheelAt(root,'Barrel shaft',barrelPos.x,barrelPos.z,phase+Math.PI+Math.PI/m.barrel);
 const pinion=wheelAt(root,'Carriage input shaft',cagePoint.x,cagePoint.z,phase);
 gear(third,'36-tooth third wheel',m.thirdWheel,step(m.thirdWheel),.395,edge);
 gear(third,'16-tooth third pinion',m.thirdPinion,step(m.thirdPinion),.225,steel,{depth:.060});
 gear(barrel,'48-tooth barrel',m.barrel,step(m.barrel),.225,gold,{inner:.36,open:false});
 // Open drum exposes the mainspring while retaining the original driven wheel.
 cylinder(barrel,'Barrel bottom',0,.174,0,.355,.024,brush,64);
 ring(barrel,'Barrel drum wall',0,.236,0,.359,.021,.092,gold,64);
 ring(barrel,'Polished drum lip',0,.282,0,.359,.014,.012,rosePolish,64);
 const points=barrelSpiral().map(p=>new T.Vector3(...p));
 const curve=new T.CatmullRomCurve3(points);
 mesh(barrel,'Exposed coiled mainspring',new T.TubeGeometry(curve,192,.009,5,false),blued);
 cylinder(barrel,'Barrel arbor collar',0,.270,0,.106,.035,mirror,32);
 gear(pinion,'12-tooth tourbillon pinion',m.cagePinion,step(m.cagePinion),.395,steel,{depth:.058});
 for(const [axis,x,z,h] of [[third,thirdPos.x,thirdPos.z,.52],[barrel,barrelPos.x,barrelPos.z,.69],[pinion,cagePoint.x,cagePoint.z,.81]]){
  rod(axis,'Turning arbor',[0,.126,0],[0,h,0],.047,steel);
  jewel(root,x,h,z,.077);
 }
 bridge(root,'Sculpted transmission bridge',[barrelPos.x-.15,.68,barrelPos.z-.08],[thirdPos.x,.50,thirdPos.z]);
 for(const [x,z] of [[barrelPos.x-.15,barrelPos.z-.08],[thirdPos.x+.15,thirdPos.z-.17]]){
  pillar(root,x,z,.50);screw(root,x,.58,z);
 }
 const pinionPhase=pinion.rotation.y,thirdPhase=third.rotation.y,barrelPhase=barrel.rotation.y;
 return {cagePoint,barrelPos,update(s){
  pinion.rotation.y=pinionPhase+s.cage;
  third.rotation.y=thirdPhase+s.third;
  barrel.rotation.y=barrelPhase+s.barrel;
 }};
}

const polar=(r,a)=>[Math.cos(a)*r,-Math.sin(a)*r];
function regulator(root,x,z){
 const fixedY=.755,pitch=.44,orbit=pitch*(1+m.escapePinion/m.fixedFourth);
 const fixed=group(root,'Fixed fourth wheel plate',x,0,z);
 gear(fixed,'Fixed 80-tooth fourth wheel',m.fixedFourth,pitch,fixedY,steel,{depth:.051});
 for(let i=0;i<3;i++){
  const [dx,dz]=polar(.56,i*TAU/3);
  bridge(root,'Fixed cage bearing bridge',[x+dx,.47,z+dz],[x+dx*.38,.71,z+dz*.38]);
  pillar(root,x+dx,z+dz,.49);screw(root,x+dx,.55,z+dz,.047);
 }
 const cage=group(root,'One-minute carriage',x,fixedY,z);
 for(const [height,material] of [[.134,steel],[.168,edge],[.659,edge],[.695,steel]])ring(cage,'Carriage ring',0,height,0,.627,.033,.034,material,64);
 for(let i=0;i<3;i++){
  const [dx,dz]=polar(.595,.53+i*TAU/3);
  rod(cage,'Carriage upright',[dx,.145,dz],[dx,.685,dz],.046,steel);
  bridge(cage,'Sculpted carriage arm',[dx,.675,dz],[0,.713,0]);
  screw(cage,dx,.694,dz,.035);
 }
 jewel(cage,0,.754,0,.070);
 const escape=group(cage,'Escape wheel with planetary pinion',orbit,0,0);
 gear(escape,'Escape pinion rolling around fixed fourth wheel',m.escapePinion,pitch*m.escapePinion/m.fixedFourth,0,edge,{depth:.040,inner:.025});
 rod(escape,'Escape arbor',[0,0,0],[0,.368,0],.018,steel);
 gear(escape,'Asymmetric escapement teeth',m.escapeTeeth,.137,.338,edge,{inner:.086,depth:.043,escape:true});
 jewel(cage,orbit,.40,0,.050);

 const fork=group(cage,'Lever and two ruby pallets',.261,.339,.056);
 const pallet=new T.MeshPhysicalMaterial({color:0xd93558,roughness:.20,metalness:.28,clearcoat:1});
 for(const [tip,bend] of [[[.127,0,-.149],[.058,0,-.096]],[[.157,0,.064],[.099,0,.077]]]){
  rod(fork,'Pallet fork arm',[0,0,0],bend,.020,steel,8);
  rod(fork,'Pallet holder',bend,tip,.015,steel,8);
  const stone=box(fork,'Pallet locking jewel',tip,[.040,.031,.026],pallet);stone.rotation.y=-.25;
 }
 rod(fork,'Fork lever to balance roller',[-.164,0,-.041],[.005,0,0],.022,steel,8);
 for(const dz of [-.021,.021])box(fork,'Fork horn',[-.166,0,-.04+dz],[.041,.019,.017],steel);
 jewel(cage,.261,.395,.056,.049);
 for(const dz of [-.105,.13])cylinder(cage,'Lever banking pin',.299,.33,dz,.018,.09,dark,10);

 const balance=group(cage,'Oscillating balance wheel',0,.411,0);
 ring(balance,'Balance rim',0,0,0,.276,.034,.047,edge,96);
 ring(balance,'Polished balance rim lip',0,.023,0,.273,.010,.010,mirror,72);
 cylinder(balance,'Hairspring collet',0,.111,0,.034,.036,blued,24);
 cylinder(balance,'Collet anchor',-.034,.111,0,.007,.025,rosePolish,12);
 const roller=group(balance,'Balance roller');
 cylinder(roller,'Balance staff',0,0,0,.026,.24,mirror,24);
 cylinder(roller,'Impulse roller table',0,-.048,0,.125,.018,mirror,40);
 cylinder(roller,'Safety roller',0,-.083,0,.067,.014,steel,32);
 // Impulse jewel faces the fork at zero crossing, not the opposite side.
 box(roller,'Ruby impulse pin',[.111,-.073,.019],[.027,.038,.020],ruby);
 for(let i=0;i<6;i++){
  const [dx,dz]=polar(.254,i*TAU/6);
  rod(balance,'Balance spoke',[0,0,0],[dx,0,dz],.014,steel,12);
  cylinder(balance,'Rim timing mass',dx,.031,dz,.020,.018,rosePolish,16);
 }
 // Rectangular-section hairspring with a fixed stud and moving collet.
 const springPoints=241,positions=new Float32Array(springPoints*8*3),normals=new Float32Array(positions.length);
 const springGeom=new T.BufferGeometry();
 springGeom.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
 springGeom.setAttribute('normal',new T.BufferAttribute(normals,3).setUsage(T.DynamicDrawUsage));
 springGeom.setIndex(ribbonIndices(springPoints));fillHairspring(positions,normals,springPoints,0);
 const spring=mesh(cage,'Breathing flat hairspring ribbon',springGeom,springSteel);spring.frustumCulled=false;
 for(const y of [.476,.51])cylinder(cage,'Hairspring outer stud',.232,y,0,.018,.029,gold,16);
 box(cage,'Outer stud clamp',[.232,.522,0],[.024,.023,.026],mirror);
 return {cage,balance,fork,escape,update(s){
  cage.rotation.y=s.cage;
  escape.rotation.y=s.escape+Math.PI/m.escapePinion;
  balance.rotation.y=s.balance;fork.rotation.y=s.fork;
  fillHairspring(positions,normals,springPoints,s.balance);
  springGeom.attributes.normal.needsUpdate=true;
  springGeom.attributes.position.needsUpdate=true;
 }};
}

function earthMap(){
 const canvas=document.createElement('canvas');
 canvas.width=1024;canvas.height=512;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#0e4296';ctx.fillRect(0,0,1024,512);
 ctx.fillStyle='#c88a53';
 for(const coast of coastlines){
  ctx.beginPath();coast.forEach(([lon,lat],i)=>ctx[i?'lineTo':'moveTo']((lon+180)/360*1024,(90-lat)/180*512));
  ctx.closePath();ctx.fill();
 }
 // Fine latitude/longitude engraving on the enamel globe.
 ctx.strokeStyle='#a2c7e02e';ctx.lineWidth=1;
 for(let x=0;x<1024;x+=1024/24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke()}
 for(let y=512/12;y<512;y+=512/12){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1024,y);ctx.stroke()}
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
 return map;
}
function astronomy(root,base){
 const earthPoint=[-1.08,-.78],moonPoint=[.79,-1.04];
 const outputs=[];
 const positions=[{point:earthPoint,driver:m.earthDriver,teeth:m.earthWheel,y:.192},
                  {point:moonPoint,driver:m.moonDriver,teeth:m.moonWheel,y:.314}];
 for(const {point:[x,z],driver,teeth,y} of positions){
  const distance=Math.hypot(x-base.x,z-base.z),ratio=distance/(driver+teeth);
  const lineAngle=Math.atan2(base.z-z,x-base.x);
  const driverAxis=wheelAt(root,'Astronomical driving wheel',base.x,base.z,lineAngle);
  const satelliteAxis=wheelAt(root,'Astronomical satellite output',x,z,lineAngle+Math.PI+Math.PI/teeth);
  const driverPhase=driverAxis.rotation.y,satellitePhase=satelliteAxis.rotation.y;
  gear(driverAxis,'Astronomical driver '+driver+' teeth',driver,driver*ratio,y,steel,{depth:.049});
  gear(satelliteAxis,'Astronomical output '+teeth+' teeth',teeth,teeth*ratio,y,gold,{depth:.049});
  rod(satelliteAxis,'Complication output arbor',[0,.13,0],[0,.39,0],.051,steel);
  outputs.push((barrel,output)=>{
   driverAxis.rotation.y=driverPhase+barrel;
   satelliteAxis.rotation.y=satellitePhase+output;
  });
  pillar(root,x,z,.54);
  for(const side of [-1,1]){
   bridge(root,'Satellite yoke',[base.x+side*.12,.562,base.z],[x+side*.13,.51,z]);
   screw(root,x+side*.12,.594,z,.039);
  }
 }
 const earthSupport=group(root,'Earth pole support',earthPoint[0],1.245,earthPoint[1]);
 earthSupport.rotation.z=-.32;
 rod(earthSupport,'Polished polar axis',[0,-.64,0],[0,.52,0],.034,edge);
 for(const y of [-.51,.487])cylinder(earthSupport,'Earth polar collet',0,y,0,.067,.07,steel,18);
 const globe=mesh(earthSupport,'Enamel Earth and gold continents',new T.SphereGeometry(.453,72,48),
  new T.MeshPhysicalMaterial({map:earthMap(),metalness:.54,roughness:.26,clearcoat:.74,clearcoatRoughness:.17}));
 const moonSupport=group(root,'Lunar spindle support',moonPoint[0],1.41,moonPoint[1]);
 moonSupport.rotation.z=.13;
 rod(moonSupport,'Lunar polished axis',[0,-.82,0],[0,.45,0],.034,steel);
 for(const y of [-.452,.403])cylinder(moonSupport,'Lunar bearing cap',0,y,0,.060,.056,edge,18);
 const lunarGeom=new T.IcosahedronGeometry(.387,3);
 const color=[],count=lunarGeom.attributes.position.count;
 for(let i=0;i<count/3;i++){
  const c=new T.Color([0xffffff,0xbbcfea,0xc8def6,0xcdd0e3,0xeed8ce][Math.floor(i*13.7)%5]);
  for(let j=0;j<3;j++)color.push(c.r,c.g,c.b);
 }
 lunarGeom.setAttribute('color',new T.Float32BufferAttribute(color,3));crystal.vertexColors=true;
 const moon=mesh(moonSupport,'Faceted lunar crystal',lunarGeom,crystal);
 return {globe,moon,update(s){
  globe.rotation.y=s.earth+.3;
  moon.rotation.y=s.moon+.45;
  outputs[0](s.barrel,s.earth);
  outputs[1](s.barrel,s.moon);
 }};
}

function timeDial(root){
 const face=group(root,'Raised Roman numeral time dial',1.075,1.205,.705);
 face.rotation.x=.70;face.rotation.y=-.16;
 for(const side of [-1,1]){
  pillar(root,1.075+side*.40,.66,.55);
  bridge(root,'Floating dial support fork',[1.075+side*.40,.51,.60],[1.075+side*.51,1.11,.68]);
  screw(root,1.075+side*.40,.59,.62,.046);
 }
 for(const [y,r,w,h,material] of [[0,.743,.11,.103,brush],[.049,.742,.058,.048,edge],[.076,.696,.020,.025,steel],[.085,.674,.111,.038,blue],[.10,.566,.018,.021,edge]]){
  ring(face,'Machined dial moulding',0,y,0,r,w,h,material,72);
 }
 const dialMaterial=blue.clone();dialMaterial.bumpMap=guillocheFinish();dialMaterial.bumpScale=.009;dialMaterial.roughness=.29;
 cylinder(face,'Sunken engine-turned guilloché dial',0,.047,0,.577,.055,dialMaterial,96);
 ring(face,'Guilloché border',0,.079,0,.544,.009,.008,rosePolish,80);
 ring(face,'Minute chapter inner border',0,.112,0,.592,.006,.006,mirror,80);
 ticks(face,60,.642,.115,.69);
 const applied=new T.InstancedMesh(new T.BoxGeometry(.022,.014,.011),rosePolish,12),markerPose=new T.Object3D();
 for(let i=0;i<12;i++){const a=i*TAU/12;markerPose.position.set(.661*Math.cos(a),.120,-.661*Math.sin(a));markerPose.rotation.y=a;markerPose.updateMatrix();applied.setMatrixAt(i,markerPose.matrix)}face.add(applied);
 const numerals=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
 numerals.forEach((n,i)=>{
  const a=i*TAU/12;
  label(face,n,[.604*Math.sin(a),.122,-.604*Math.cos(a)],.17,.086);
 });
 const hands={};
 for(const [name,length,width,y,material] of [
  ['hour',.385,.039,.150,edge],['minute',.526,.027,.173,edge],['second',.578,.009,.195,steel]
 ]){
  const h=group(face,'Live '+name+' hand',0,y,0);
  const shape=new T.Shape();
  shape.moveTo(-width*.45,-.08);shape.lineTo(width*.45,-.08);
  shape.lineTo(width,length*.58);shape.lineTo(width*.45,length*.82);shape.lineTo(0,length);shape.lineTo(-width*.45,length*.82);shape.lineTo(-width,length*.58);shape.closePath();
  const body=new T.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:true,bevelSize:.003,bevelThickness:.002,bevelSegments:1});
  body.rotateX(-Math.PI/2);mesh(h,'Beveled '+name+' hand',body,material);
  if(name!=='second')rod(h,'Polished hand ridge',[0,.015,-.08],[0,.015,-length*.80],.004,mirror,8);
  else ring(h,'Seconds counterweight',0,.006,.068,.030,.009,.009,rosePolish,24);
  hands[name]=h;
 }
 jewel(face,0,.221,0,.068);
 return hands;
}

// Batch opaque details that share a material and direct rigid parent.
// Moving parts still have separate pivots. The shell, cage, balance, fork
// and each arbor can be transformed without rewriting the GPU buffers.
function batchMachinedDetails(root){
 const candidates=new Set();
 function batch(parent){
  const buckets=new Map();
  for(const child of [...parent.children]){
   if(child.isGroup){batch(child);continue}
   if(!child.isMesh||child.isInstancedMesh||child.material.transparent||child.material.vertexColors)continue;
   const keys=Object.keys(child.geometry.attributes).sort();
   if(!keys.includes('normal'))continue;
   if(!buckets.has(child.material))buckets.set(child.material,new Map());
   const family=buckets.get(child.material),key=keys.join('/');
   if(!family.has(key))family.set(key,[]);
   family.get(key).push(child);
  }
  for(const [material,families] of buckets)for(const pieces of families.values()){
   if(pieces.length<3)continue;
   const positions=pieces.reduce((n,o)=>n+o.geometry.attributes.position.count,0);
   const indices=pieces.reduce((n,o)=>n+(o.geometry.index?.count??o.geometry.attributes.position.count),0);
   const keys=Object.keys(pieces[0].geometry.attributes);
   const joined=new T.BufferGeometry(),data={};
   for(const key of keys){
    const stride=pieces[0].geometry.attributes[key].itemSize;
    data[key]=new Float32Array(positions*stride);
    joined.setAttribute(key,new T.BufferAttribute(data[key],stride));
   }
   const index=positions>65535?new Uint32Array(indices):new Uint16Array(indices);
   let vertex=0,offset=0;
   for(const piece of pieces){
    piece.updateMatrix();
    const g=piece.geometry.clone().applyMatrix4(piece.matrix);
    const n=g.attributes.position.count,ind=g.index?.array;
    for(const key of keys)data[key].set(g.attributes[key].array,vertex*g.attributes[key].itemSize);
    for(let i=0;i<(ind?.length??n);i++)index[offset++]=(ind?ind[i]:i)+vertex;
    vertex+=n;
    candidates.add(piece.geometry);parent.remove(piece);g.dispose();
   }
   joined.setIndex(new T.BufferAttribute(index,1));
   mesh(parent,'Matched machined details',joined,material);
  }
 }
 batch(root);
 root.traverse(o=>{if(o.geometry)candidates.delete(o.geometry)});
 for(const g of candidates)g.dispose();
}
export function buildWatch(scene){
 cylinders.clear(); // Per-build geometry cache; no stale disposed buffers.
 const root=group(scene,'ΔΑΙΔΑΛΟΣ · Fejelude astronomical movement');
 const shell=casework(root);
 plate(root);
 for(const [x,z,r,alpha] of [[-.98,.85,.87,.51],[1,.71,.86,.47],[-1.08,-.78,.61,.47],[.79,-1.04,.63,.50],[0,0,.75,.48]])softOcclusion(root,x,z,r,alpha);
 const drive=train(root);
 const movement=regulator(root,drive.cagePoint.x,drive.cagePoint.z);
 const orbit=astronomy(root,drive.barrelPos);
 const hands=timeDial(root);
 batchMachinedDetails(root);
 const finishMaterials=new Set();root.traverse(o=>{if(o.material?.bumpMap)finishMaterials.add(o.material)});
 const scales=new Map([...finishMaterials].map(m=>[m,m.bumpScale]));
 return {root,shell,hands,movement,orbit,setQuality(mode){for(const m of finishMaterials)m.bumpScale=scales.get(m)*(mode==='low'?.30:mode==='default'?.72:1)},update(state){drive.update(state);movement.update(state);orbit.update(state)}};
}
