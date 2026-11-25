import * as T from './vendor/three-r160.1.mjs';
import {MOVEMENT as m, TAU, SATELLITES, pitchRadius} from './feje-tourbillon-mechanism.mjs';

import {TIME_TRAIN,meshPhase,radialTrain,timingTooth} from './feje-tourbillon-transmission.mjs';
import {buildStrap} from './feje-tourbillon-strap.mjs';
import {coastlines} from './feje-tourbillon-coastlines.mjs';
const mat = (color,metalness,roughness,extra={}) =>
 new T.MeshStandardMaterial({color,metalness,roughness,...extra});
const gold=mat(0xd8a083,.91,.25);
const edge=mat(0xf5d0a7,.95,.15);
const brush=mat(0xab725c,.87,.34);
const striped=mat(0xc0a291,.86,.36);
striped.onBeforeCompile=shader=>{
 shader.vertexShader='varying vec3 bridgePosition;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbridgePosition=position;');
 shader.fragmentShader='varying vec3 bridgePosition;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`
  #include <roughnessmap_fragment>
  float stripe = cos(bridgePosition.z * 43.0);
  float detail = 1.0 - smoothstep(.04, .20, fwidth(bridgePosition.z) * 9.0);
  roughnessFactor = clamp(roughnessFactor + stripe * .074 * detail, .18, .6);
 `);
};
const steel=mat(0xb5cce4,.86,.21);
const dark=mat(0x253344,.72,.37);
const blue=mat(0x0b315b,.49,.29);
const blued=mat(0x345979,.91,.19);
const ruby=new T.MeshPhysicalMaterial({color:0x8e0f3b,metalness:.36,roughness:.19,clearcoat:1});
const crystal=new T.MeshPhysicalMaterial({
 color:0xd4e5f1,metalness:.62,roughness:.095,flatShading:true,clearcoat:.9,ior:2.41
});
const dialInk=new T.MeshBasicMaterial({color:0xf9d3ab});
const sapphire=new T.MeshPhysicalMaterial({
 color:0xa6d1e4,metalness:.19,roughness:.13,transparent:true,opacity:.28,depthWrite:false,clearcoat:1,ior:1.76,side:T.DoubleSide,forceSinglePass:true
});
sapphire.onBeforeCompile=shader=>{
 shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   float rim = pow(1.0 - max(0.0, dot(normal, normalize(vViewPosition))), 3.0);
   diffuseColor.a *= 0.065 + 0.76 * rim;
   #include <opaque_fragment>`);
};

function group(parent,name,x=0,y=0,z=0){
 const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;
}
function mesh(parent,name,geom,material,x=0,y=0,z=0){
 const obj=new T.Mesh(geom,material);obj.name=name;obj.position.set(x,y,z);parent.add(obj);return obj;
}
const profile=(parent,name,points,material,x=0,z=0,detail=72)=>
 mesh(parent,name,new T.LatheGeometry(points.map(p=>new T.Vector2(...p)),detail),material,x,0,z);
const ring=(parent,name,x,y,z,r,w,h,material,detail=64)=>
 profile(parent,name,[[r-w,y-h/2],[r,y-h/2],[r+.008,y-h*.28],[r+.008,y+h*.28],[r-.012,y+h/2],[r-w+.008,y+h/2],[r-w,y+h*.28],[r-w,y-h/2]],material,x,z,detail);
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
 // Two semicircular caps leave a real slot across the head.
 cylinder(parent,'Screw shank',x,y-.009,z,r,.09,steel,16);
 for(const side of [-1,1]){
  const cap=new T.CylinderGeometry(r,r,.014,12,1,false,side<0?.13:Math.PI+.13,Math.PI-.26);
  mesh(parent,'Blued slotted screw cap',cap,blued,x,y+.036,z);
 }
}
function jewel(parent,x,y,z,r=.079){
 ring(parent,'Gold jewel bezel',x,y,z,r,.014,.026,edge,24);
 const gem=new T.IcosahedronGeometry(r*.63,1);
 gem.scale(1,.48,1);
 mesh(parent,'Ruby bearing',gem,ruby,x,y+.02,z);
}
function tube(parent,name,inner,outer,bottom,top,material){
 const bevel=Math.min(.005,(outer-inner)*.36);
 return profile(parent,name,[[inner,bottom],[outer-bevel,bottom],[outer,bottom+bevel],
  [outer,top-bevel],[outer-bevel,top],[inner,top],[inner,bottom]],material,0,0,24);
}
function gear(parent,name,count,pitch,y,material,{inner=pitch*.58,depth=.078,escape=false,phase=0,cone=0,bore=0,fine=false}={}){
 // Root and addendum follow the module. The pitch flank passes through
 // the nominal pitch circle and leaves clearance for the opposite tooth.
 const module=2*pitch/count;
 const root=escape?pitch*.77:pitch-module*1.08;
 const tip=escape?pitch*1.06:pitch+module*.86;
 const profile=fine?timingTooth(count,pitch):escape?[[-.48,root],[-.18,root],[.09,tip],[.34,root]]:
  [[-.50,root],[-.31,root],[-.235,pitch],[-.13,tip],[.13,tip],[.235,pitch],[.31,root]];
 const shape=new T.Shape();
 for(let i=0;i<count;i++)for(const [j,[fraction,r]] of profile.entries()){
  const a=(i+fraction)*TAU/count+phase;
  shape[i||j?'lineTo':'moveTo'](r*Math.cos(a),r*Math.sin(a));
 }
 shape.closePath();
 const hole=new T.Path();
 hole.absarc(0,0,inner,0,TAU,true);shape.holes.push(hole);
 const bevelSize=fine?Math.min(depth*.12,module*.055):depth*.12;
 const geom=new T.ExtrudeGeometry(shape,{depth,curveSegments:18,bevelEnabled:true,bevelSegments:1,bevelSize,bevelThickness:depth*.12});
 geom.rotateX(-Math.PI/2);
 if(cone){
  const p=geom.getAttribute('position');
  for(let i=0;i<p.count;i++){
   const taper=1-(p.getY(i)-depth/2)/cone;
   p.setXYZ(i,p.getX(i)*taper,p.getY(i),p.getZ(i)*taper);
  }
  geom.computeVertexNormals();
 }
 mesh(parent,name,geom,material,0,y-depth/2,0);
 const core=pitch*.29;
 const spokes=pitch>.28?6:4;
 if(bore)tube(parent,'Bored pinion hub',bore,Math.max(core,bore+.01),y-depth*.625,y+depth*.625,material);
 else cylinder(parent,'Pinion hub',0,y,0,core,depth*1.25,material);
 for(let i=0;i<spokes;i++){
  const a=TAU*i/spokes;
  const spoke=box(parent,'Wheel spoke',[Math.cos(a)*(inner+core)/2,y,-Math.sin(a)*(inner+core)/2],[inner-core+.04,depth*.68,pitch*.12],material);
  spoke.rotation.y=a;
 }
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
 const c=document.createElement('canvas');c.width=256;c.height=64;
 const ctx=c.getContext('2d');ctx.fillStyle='#f4d7b0';ctx.font='48px Georgia';
 ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(text,128,34,247);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
 const ink=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false});
 const o=mesh(parent,text,new T.PlaneGeometry(w,h),ink,...position);
 o.rotation.set(-Math.PI/2,0,angle);
 return o;
}

function casework(root){
 const shell=group(root,'Removable sapphire and case');
 profile(shell,'Sculpted rose-gold case',[[2.12,-.38],[2.42,-.38],[2.55,-.33],[2.6,-.22],[2.62,-.08],[2.58,.08],[2.49,.14],[2.36,.12],[2.36,-.33],[2.12,-.38]],brush,0,0,112);
 for(const [y,r,w,h,material] of [
  [-.32,2.51,.052,.035,edge],[-.22,2.6,.045,.029,gold],[-.075,2.62,.041,.032,edge],
  [.102,2.56,.057,.052,gold],[.168,2.526,.05,.039,edge],[.62,2.50,.070,.042,gold],[.676,2.515,.074,.050,edge],
  [.713,2.484,.024,.018,steel]
 ])ring(shell,'Beveled case moulding',0,y,0,r,w,h,material,104);
 profile(shell,'Transparent sidewall',[[2.493,.18],[2.471,.62],[2.446,.70]],sapphire,0,0,104).renderOrder=6;
 const arc=Array.from({length:24},(_,i)=>[2.453*Math.cos(i*Math.PI/46),.705+1.89*Math.sin(i*Math.PI/46)]);
 profile(shell,'Curved sapphire dome',arc,sapphire,0,0,104).renderOrder=7;
 for(let i=0;i<8;i++){
  const a=i*TAU/8+.23,x=2.451*Math.cos(a),z=2.451*Math.sin(a);
  cylinder(shell,'Sapphire support column',x,.39,z,.050,.48,brush);
  for(const y of [.206,.606])cylinder(shell,'Column collar',x,y,z,.088,.074,gold,18);
  screw(shell,x,.7,z,.047);
 }
 buildStrap(shell,{gold,edge,steel,rod,cylinder});
 const back=group(shell,'Caseback medallion',0,-.39,0);
 back.rotation.x=Math.PI;
 cylinder(back,'Midnight display caseback',0,0,0,2.17,.065,blue,104);
 for(const [r,w,material] of [[2.36,.16,brush],[2.20,.02,edge],[1.92,.017,steel],[1.32,.014,edge],[.77,.018,steel]]){
  ring(back,'Caseback engraved radial frame',0,.041,0,r,w,.036,material,96);
 }
 ticks(back,72,2.10,.058,1.08);
 for(let i=0;i<8;i++){
  const [x,z]=polar(2.265,i*TAU/8+.13);
  screw(back,x,.027,z,.067);
 }
 for(const side of [-1,1]){
  const bow=ring(back,'Recessed folding adjustment bow',side*.80,.072,.21,.42,.032,.038,edge,44);
  bow.scale.x=.77;
  label(back,side<0?'WIND':'SET',[side*.80,.061,.21],.43,.16);
 }
 label(back,'ΔΑΙΔΑΛΟΣ',[0,.058,-1.16],2.05,.40);
 label(back,'ASTRAL  /  No. 001',[0,.058,1.36],1.65,.23);
 const crown=group(shell,'Fluted crown',2.73,.012,0);crown.rotation.z=-Math.PI/2;
 cylinder(crown,'Crown stem',0,-.16,0,.084,.20,steel);
 gear(crown,'Crown flutes',30,.16,0,edge,{inner:.078,depth:.19});
 cylinder(crown,'Polished crown face',0,.108,0,.142,.033,gold);
 label(crown,'Δ',[0,.128,0],.18,.18);
 return shell;
}
function plate(root){
 cylinder(root,'Royal blue enamel plate',0,-.026,0,2.405,.25,blue,104);
 for(const [radius,material] of [[1.40,dark],[1.85,steel],[1.91,dark],[2.07,gold],[2.21,steel],[2.36,steel]]){
  ring(root,'Fine engraved track',0,.102,0,radius,.009,.006,material,96);
 }
 ticks(root,120,2.295,.113,1.45);
 const burnish=new T.InstancedMesh(new T.RingGeometry(.065,.073,18),mat(0x3a6083,.75,.46),190);
 burnish.name='Overlapping perlage on the enamel border';
 const stamp=new T.Object3D();stamp.rotation.x=-Math.PI/2;
 for(let i=0;i<190;i++){
  const row=i<90?0:1,a=(row?i-90+.5:i)*TAU/(row?100:90),r=1.79+row*.108;
  stamp.position.set(r*Math.cos(a),.101,r*Math.sin(a));stamp.updateMatrix();
  burnish.setMatrixAt(i,stamp.matrix);
 }
 root.add(burnish);
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
 const direction=new T.Vector3().fromArray(b).sub(new T.Vector3().fromArray(a));
 const length=direction.length(),shape=new T.Shape();
 shape.moveTo(-.118,0);shape.quadraticCurveTo(-.16,length*.12,-.097,length*.28);
 shape.lineTo(-.078,length*.74);shape.quadraticCurveTo(-.13,length*.96,-.073,length);
 shape.lineTo(.073,length);shape.quadraticCurveTo(.13,length*.96,.078,length*.74);
 shape.lineTo(.097,length*.28);shape.quadraticCurveTo(.16,length*.12,.118,0);shape.closePath();
 const geom=new T.ExtrudeGeometry(shape,{depth:.057,bevelEnabled:true,bevelSize:.016,bevelThickness:.018,bevelSegments:2,curveSegments:4});
 geom.rotateX(Math.PI/2);
 const pivot=mesh(parent,name,geom,[striped,edge],...a);
 pivot.rotation.y=Math.atan2(direction.x,direction.z);
 return pivot;
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
 const [x,,z]=SATELLITES.regulator,cagePoint={x,z};
 const u={x:.80,z:-.60};
 const module=.025,step=teeth=>pitchRadius(teeth,module);
 const phase=Math.atan2(-u.z,u.x);
 const thirdPos={x:cagePoint.x+.6*u.x,z:cagePoint.z+.6*u.z};
 const barrelPos={x:thirdPos.x+.8*u.x,z:thirdPos.z+.8*u.z};
 const third=wheelAt(root,'Compound third shaft',thirdPos.x,thirdPos.z,phase+Math.PI+Math.PI/m.thirdWheel);
 const barrel=wheelAt(root,'Barrel shaft',barrelPos.x,barrelPos.z,phase+Math.PI);
 const pinion=wheelAt(root,'Carriage input shaft',cagePoint.x,cagePoint.z,phase);
 gear(third,'36-tooth third wheel',m.thirdWheel,step(m.thirdWheel),.395,edge);
 gear(third,'16-tooth third pinion',m.thirdPinion,step(m.thirdPinion),.225,steel,{depth:.060,phase:-Math.PI+Math.PI/m.thirdPinion-Math.PI/m.thirdWheel});
 gear(barrel,'48-tooth barrel',m.barrel,step(m.barrel),.225,gold,{inner:.36});
 gear(pinion,'12-tooth tourbillon pinion',m.cagePinion,step(m.cagePinion),.395,steel,{depth:.058});
 for(const [axis,x,z,h] of [[third,thirdPos.x,thirdPos.z,.52],[barrel,barrelPos.x,barrelPos.z,.69],[pinion,cagePoint.x,cagePoint.z,.81]]){
  rod(axis,'Turning arbor',[0,.126,0],[0,h,0],.047,steel);
  jewel(root,x,h,z,.077);
 }
 bridge(root,'Anglage on the transmission bridge',[barrelPos.x-.15,.68,barrelPos.z-.08],[thirdPos.x,.50,thirdPos.z]);
 for(const [x,z] of [[barrelPos.x-.15,barrelPos.z-.08],[thirdPos.x+.15,thirdPos.z-.17]]){
  pillar(root,x,z,.50);screw(root,x,.58,z);
 }
 const pinionPhase=pinion.rotation.y,thirdPhase=third.rotation.y,barrelPhase=barrel.rotation.y;
 return {cagePoint,barrelPos,pinionPhase,update(s){
  pinion.rotation.y=pinionPhase+s.cage;
  third.rotation.y=thirdPhase+s.third;
  barrel.rotation.y=barrelPhase+s.barrel;
 }};
}

const polar=(r,a)=>[Math.cos(a)*r,-Math.sin(a)*r];
function regulator(root,x,z){
 const fixedY=.755,pitch=.399,orbit=pitch*(1+m.escapePinion/m.fixedFourth);
 const fixed=group(root,'Fixed fourth wheel plate',x,0,z);
 gear(fixed,'Fixed 96-tooth fourth wheel',m.fixedFourth,pitch,fixedY,steel,{depth:.051});
 ring(fixed,'Fixed fourth wheel bearing',0,fixedY-.037,0,.459,.042,.029,edge,48);
 const cage=group(root,'One-minute carriage',x,fixedY,z);
 for(const [height,material] of [[.134,steel],[.168,edge],[.659,edge],[.695,steel]])ring(cage,'Carriage ring',0,height,0,.545,.027,.034,material,64);
 for(let i=0;i<3;i++){
  const [dx,dz]=polar(.521,.53+i*TAU/3);
  rod(cage,'Carriage upright',[dx,.145,dz],[dx,.685,dz],.046,steel);
  rod(cage,'Carriage upper Y bridge',[dx,.693,dz],[0,.735,0],.031,gold,8);
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
 ring(balance,'Balance rim',0,0,0,.276,.034,.047,edge,48);
 const roller=group(balance,'Balance roller');
 cylinder(roller,'Balance staff',0,0,0,.040,.22,steel,12);
 cylinder(roller,'Polished roller table',0,-.053,0,.126,.021,steel,24);
 cylinder(roller,'Safety roller',0,-.084,0,.084,.022,blued,24);
 cylinder(fork,'Guard pin',-.151,-.036,-.043,.012,.051,steel,8);
 jewel(roller,-.113,-.062,-.025,.032);
 for(let i=0;i<6;i++){
  const [dx,dz]=polar(.254,i*TAU/6);
  rod(balance,'Balance spoke',[0,0,0],[dx,0,dz],.018,steel,8);
  screw(balance,dx,.015,dz,.027);
 }
 // The winding is a four-cornered ribbon. The outer endpoint is fixed
 // to the stud and the inner endpoint rotates with the collet.
 const springPoints=157,positions=new Float32Array(springPoints*12);
 const springGeom=new T.BufferGeometry(),indices=[];
 springGeom.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
 for(let i=0;i<springPoints-1;i++)for(let edge=0;edge<4;edge++){
  const a=i*4+edge,b=i*4+(edge+1)%4;
  indices.push(a,b,a+4,b,b+4,a+4);
 }
 springGeom.setIndex(indices);
 const spring=new T.Mesh(springGeom,mat(0x86b4d0,.72,.25,{side:T.DoubleSide}));
 spring.name='Breathing rectangular steel hairspring';spring.frustumCulled=false;cage.add(spring);
 cylinder(cage,'Hairspring outer stud',.231,.506,0,.024,.051,gold,14);
 ring(balance,'Fixed collet on balance staff',0,.111,0,.050,.015,.022,blued,20);
 return {cage,balance,fork,escape,update(s){
  cage.rotation.y=s.cage;
  escape.rotation.y=s.escape+Math.PI/m.escapePinion;
  balance.rotation.y=s.balance;fork.rotation.y=s.fork;
  for(let i=0;i<springPoints;i++){
   const u=i/(springPoints-1);
   const r=.035+u*.196+s.balance*.007*Math.sin(Math.PI*u),a=u*TAU*5.5+s.balance*(1-u)**2+Math.PI;
   const x=Math.cos(a),z=-Math.sin(a);
   for(let corner=0;corner<4;corner++){
    const index=i*12+corner*3,radius=r+(corner===0||corner===3?-.0023:.0023);
    positions[index]=radius*x;positions[index+1]=.522+(corner<2?-.006:.006);positions[index+2]=radius*z;
   }
  }
  springGeom.attributes.position.needsUpdate=true;springGeom.computeVertexNormals();
 }};
}

function earthMap(){
 const canvas=document.createElement('canvas'),w=1536,h=768;
 canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d'),ocean=ctx.createLinearGradient(0,0,0,h);
 ocean.addColorStop(0,'#103761');ocean.addColorStop(.49,'#075185');ocean.addColorStop(1,'#10315c');
 ctx.fillStyle=ocean;ctx.fillRect(0,0,w,h);
 ctx.strokeStyle='#8dd4df4a';ctx.lineWidth=1;
 for(let x=0;x<w;x+=w/24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
 for(let y=h/12;y<h;y+=h/12){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
 ctx.fillStyle='#dab779';ctx.strokeStyle='#f8d8a1';ctx.lineWidth=1.4;
 for(const polygon of coastlines){
  ctx.beginPath();
  for(const coast of polygon){
   coast.forEach(([lon,lat],i)=>ctx[i?'lineTo':'moveTo']((lon+180)/360*w,(90-lat)/180*h));
   ctx.closePath();
  }
  ctx.fill('evenodd');ctx.stroke();
 }
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=6;
 return map;
}
function cutMoon(radius){
 const values=[],circles=[
  [.39,.41,.5],[.69,.61,0],[.91,.32,.5],[1,0,0],[.91,-.32,.5],[.69,-.61,0],[.39,-.41,.5]
 ];
 // Distinct table, crown and pavilion bands. Staggering the rings alternates
 // bright and dark triangular faces without a tone painted on the material.
 circles[0][1]=.92;circles[1][1]=.70;circles[5][1]=-.70;circles[6][1]=-.92;
 const at=(i,k)=>{
  const [r,y,phase]=circles[i],a=(k+phase)*TAU/12;
  return [r*radius*Math.cos(a),y*radius,radius*r*Math.sin(a)];
 };
 for(let i=0;i<circles.length-1;i++)for(let k=0;k<12;k++){
  const a=at(i,k),b=at(i,k+1),c=at(i+1,k),d=at(i+1,k+1);
  values.push(...a,...b,...c,...b,...d,...c);
 }
 for(let k=1;k<11;k++){values.push(...at(0,0),...at(0,k+1),...at(0,k),...at(6,0),...at(6,k),...at(6,k+1));}
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(values,3));
 geometry.computeVertexNormals();return geometry;
}
function astronomy(carrier){
 const elements=[];
 for(const [key,position] of [['earth',SATELLITES.earth],['moon',SATELLITES.moon]]){
  const [x,y,z]=position,post=group(carrier,key+' satellite',x,y,z);
  rod(post,'Hardened satellite arbor',[0,-.94,0],[0,-.35,0],.058,steel);
  ring(post,'Rotating satellite collet',0,-.43,0,.132,.034,.06,edge,32);
  const gimbal=group(post,key+' gimbal');
  const loop=ring(gimbal,'Brushed polar yoke',0,0,0,.506,.025,.043,gold,64);
  loop.rotation.z=Math.PI/2;
  for(const sign of [-1,1]){
   rod(gimbal,'Polished polar spindle',[0,sign*.35,0],[0,sign*.51,0],.027,steel);
   cylinder(gimbal,'Polar pivot bezel',0,sign*.493,0,.062,.052,edge,20);
  }
  const material=key==='earth'?new T.MeshPhysicalMaterial({map:earthMap(),metalness:.48,roughness:.22,clearcoat:.89,clearcoatRoughness:.11}):crystal;
  const output=mesh(gimbal,key==='earth'?'Enamel Earth and gilt coastlines':'Brilliant-cut faceted moon',
   key==='earth'?new T.SphereGeometry(.403,64,42):cutMoon(.405),material);
  elements.push({key,gimbal,output});
 }
 return {update(state){
  for(const {key,gimbal,output} of elements){
   gimbal.rotation.z=.26+state[key+'Tilt'];
   output.rotation.y=state[key]+(key==='earth'?.3:.45);
  }
 }};
}

const axisAngle=(x,z)=>Math.atan2(-z,x);

function transmissionRow(parent,fixed,start,end,spec,phase,names,depth,bores=[]){
 const {points,module,direction}=radialTrain(start,end,spec.teeth);
 const row=points.map(([x,z],i)=>wheelAt(i===0&&fixed?fixed:parent,names[i],x,z));
 const phases=[phase];
 for(let i=0;i<row.length;i++){
  if(i>0)phases.push(meshPhase(direction,phases[i-1],spec.teeth[i-1],spec.teeth[i]));
  row[i].rotation.y=phases[i];
  gear(row[i],names[i]+' teeth',spec.teeth[i],pitchRadius(spec.teeth[i],module),spec.height,i===1?edge:steel,{depth,bore:bores[i],fine:true});
 }
 const [ix,iz]=points[1];
 rod(row[1],'Polished idler arbor',[0,spec.height-.055,0],[0,spec.height+.054,0],.026,steel);
 jewel(parent,ix,spec.height+.045,iz,.041);
 return {phases,points,row,update(angles){
  for(let i=fixed?1:0;i<row.length;i++)row[i].rotation.y=phases[i]+angles[i];
 }};
}

function dialFeed(base,carrier,{cagePoint,pinionPhase}){
 const centre=[0,0],dial=[SATELLITES.dial[0],SATELLITES.dial[2]];
 const {pickup,transfer,orientation}=TIME_TRAIN;
 const seconds=transmissionRow(carrier,null,[cagePoint.x,cagePoint.z],centre,pickup,pinionPhase,
  ['Regulated seconds take-off','Take-off idler','Central seconds wheel'],.034,[0,0,.023]);
 const ratio=transmissionRow(carrier,null,centre,dial,transfer,seconds.phases[2]+.18,
  ['38-tooth central feed wheel','Carrier feed idler','40-tooth dial feed wheel'],.034,[.023]);
 const swivel=transmissionRow(carrier,base,centre,dial,orientation,.20,
  ['Fixed orientation sun','Orbiting orientation idler','Equal-tooth dial orientation wheel'],.032,[0,0,.037]);
 const [x,z]=dial;
 const feed=ratio.row[2];
 const sleeve=swivel.row[2];
 rod(base,'Fixed sun arbor through the centre wheels',[0,.169,0],[0,.695,0],.021,steel);
 tube(seconds.row[2],'Hollow compound seconds arbor',.023,.044,.471,.603,steel);
 profile(sleeve,'Flanged counter-rotating swivel tube',[[.036,.621],[.087,.621],[.091,.655],[.074,.698],[.067,.739],[.036,.739],[.036,.621]],brush);
 rod(feed,'Seconds feed through swivel tube',[0,.464,0],[0,1.017,0],.023,steel);
 ring(base,'Seat of fixed orientation sun',0,.695,0,.155,.058,.033,brush,32);
 for(const [i,[sx,sz]] of [seconds.points[1],ratio.points[1],swivel.points[1]].entries()){
  const h=[pickup,transfer,orientation][i].height;
  const side=i===0?-1:1;
  bridge(carrier,'Skeleton bridge over transfer pivot',[sx+side*.23,h+.073,sz+.14],[sx,h+.073,sz]);
  rod(carrier,'Bridge abutment',[sx+side*.23,.42,sz+.14],[sx+side*.23,h+.056,sz+.14],.035,brush);
  screw(carrier,sx+side*.23,h+.044,sz+.14,.028);
 }
 for(const side of [-1,1]){
  const sx=x+side*.24,sz=z+.22;
  rod(carrier,'Dial swivel bridge pillar',[sx,.396,sz],[sx,.742,sz],.043,brush);
  bridge(carrier,'Dial swivel bearing arm',[sx,.747,sz],[x,.747,z]);
  screw(carrier,sx,.746,sz,.036);
 }
 ring(carrier,'Stationary bearing around the dial swivel',x,.745,z,.115,.047,.032,edge,32);
 return {feed,phase:ratio.phases[2],swivel,
  update(time){seconds.update(time.central);ratio.update(time.feed);swivel.update(time.swivel);}};
}

function motionWorks(face,drive,y){
 const {bevel,seconds,hours}=TIME_TRAIN;
 const main=wheelAt(face,'Seconds staff and bevel output',0,0);
 const minute=wheelAt(face,'Cannon pinion and minute tube',0,0);
 const hour=wheelAt(face,'Hour wheel and outer hour pipe',0,0);
 const intermediate=wheelAt(face,'60-tooth seconds reduction countershaft',...seconds.intermediate);
 const countershaft=wheelAt(face,'Compound minute input shaft',...seconds.countershaft);
 const minuteLink=radialTrain(seconds.countershaft,[0,0],seconds.last);
 const idler=wheelAt(face,'Final minute reduction idler',...minuteLink.points[1]);
 const motionWheel=wheelAt(face,'Compound motion wheel',...hours.intermediate);
 const angles=new Map();
 const setPhase=(shaft,value)=>{angles.set(shaft,value);shaft.rotation.y=value;};
 const planar=(driver,from,driven,to,teeth,height,names,{module,alreadyCut=false,bores=[]}={})=>{
  const [a,b]=teeth;
  const x=to[0]-from[0],z=to[1]-from[1],direction=axisAngle(x,z);
  module??=2*Math.hypot(x,z)/(a+b);
  const phase=meshPhase(direction,angles.get(driver),a,b);
  setPhase(driven,phase);
  if(!alreadyCut)gear(driver,names[0],a,pitchRadius(a,module),height,steel,{depth:.022,bore:bores[0],fine:true});
  gear(driven,names[1],b,pitchRadius(b,module),height,edge,{depth:.024,bore:bores[1],fine:true});
 };
 const axle=new T.Vector3(0,1,0).applyEuler(face.rotation);
 const inward=axle.clone().negate();
 const drivingDirection=axisAngle(inward.x,inward.z);
 const outputDirection=new T.Vector3(0,-1,0).applyQuaternion(new T.Quaternion().setFromEuler(face.rotation).invert());
 const outgoing=axisAngle(outputDirection.x,outputDirection.z);
 const pitch=bevel.distance*Math.tan(bevel.tilt/2);
 const bevelPhase=outgoing+drivingDirection-drive.phase-Math.PI/bevel.teeth;
 setPhase(main,bevelPhase);
 gear(drive.feed,'Input bevel pinion',bevel.teeth,pitch,y-bevel.distance,edge,{depth:bevel.depth,cone:bevel.distance,fine:true});
 gear(main,'Inclined dial bevel pinion',bevel.teeth,pitch,-bevel.distance,steel,{depth:bevel.depth,cone:bevel.distance,fine:true});
 const centre=[0,0];
 planar(main,centre,intermediate,seconds.intermediate,seconds.first,seconds.heights[0],['Seconds pinion','First reduction wheel']);
 planar(intermediate,seconds.intermediate,countershaft,seconds.countershaft,seconds.second,seconds.heights[1],['Compound steel pinion','Second reduction wheel']);
 planar(countershaft,seconds.countershaft,idler,minuteLink.points[1],seconds.last.slice(0,2),seconds.heights[2],['Minute transfer pinion','Minute idler'],{module:minuteLink.module});
 planar(idler,minuteLink.points[1],minute,centre,seconds.last.slice(1),seconds.heights[2],['','Cannon-wheel drive'],{module:minuteLink.module,alreadyCut:true,bores:[0,.019]});
 planar(minute,centre,motionWheel,hours.intermediate,hours.first,hours.heights[0],['Cannon pinion','36-tooth minute wheel'],{bores:[.019]});
 planar(motionWheel,hours.intermediate,hour,centre,hours.second,hours.heights[1],['Motion-wheel pinion','40-tooth hour wheel'],{bores:[0,.031]});
 rod(main,'Continuous polished seconds arbor',[0,-.396,0],[0,.209,0],.017,steel);
 for(const [shaft,name,inner,r,foot,tip,material] of [
  [minute,'Open cannon pinion tube',.019,.029,-.183,.178,steel],
  [hour,'Concentric hour pipe',.031,.046,-.065,.157,gold]
 ]){
  tube(shaft,name,inner,r,foot,tip,material);
 }
 for(const [shaft,pt,low] of [[intermediate,seconds.intermediate,-.325],[countershaft,seconds.countershaft,-.260],[idler,minuteLink.points[1],-.203],[motionWheel,hours.intermediate,-.132]]){
  rod(shaft,'Motion-work shaft',[0,low,0],[0,-.019,0],.017,steel);
  jewel(face,pt[0],-.027,pt[1],.039);
 }
 for(const [pt,foot] of [[seconds.intermediate,[.46,-.08]],[seconds.countershaft,[.45,.30]],[hours.intermediate,[-.47,-.09]]]){
  bridge(face,'Sculpted motion-work bridge',[foot[0],-.005,foot[1]],[pt[0],-.005,pt[1]]);
  screw(face,foot[0],-.027,foot[1],.029);
 }
 const shafts={second:main,minute,hour,intermediate,countershaft,minuteIdler:idler,motionWheel};
 return {shafts,update(time){
  for(const [key,shaft] of Object.entries(shafts))shaft.rotation.y=angles.get(shaft)+time[key];
 }};
}

function timeDial(root,drive){
 const swivel=group(root,'Counter-rotating dial swivel',...SATELLITES.dial);
 const face=group(swivel,'Raised Roman numeral time dial');
 const {tilt,yaw}=TIME_TRAIN.bevel;
 face.rotation.set(tilt,yaw,0,'YXZ');
 const works=motionWorks(face,drive,SATELLITES.dial[1]);
 const away=new T.Vector3(0,1,0).applyEuler(face.rotation);
 away.y=0;away.normalize();
 const across=new T.Vector3(away.z,0,-away.x);
 // The yoke takes the structural load around the bevels instead of through them.
 for(const side of [-1,1]){
  const foot=away.clone().multiplyScalar(.043).addScaledVector(across,.051*side);
  const knee=away.clone().multiplyScalar(.224).addScaledVector(across,.123*side);
  const neck=away.clone().multiplyScalar(.298).addScaledVector(across,.144*side);
  rod(swivel,'Splayed dial yoke',[foot.x,-.395,foot.z],[knee.x,-.29,knee.z],.026,brush);
  rod(swivel,'Dial yoke upright',[knee.x,-.29,knee.z],[neck.x,-.153,neck.z],.027,brush);
  rod(swivel,'Polished yoke shoulder',[neck.x,-.153,neck.z],[across.x*.15*side,-.037,across.z*.15*side],.025,steel);
 }
 ring(swivel,'Polished dial yoke bearing',0,-.09,0,.109,.031,.039,edge,38);
 for(const [y,r,w,h,material] of [[0,.743,.11,.103,brush],[.049,.742,.058,.048,edge],[.076,.696,.020,.025,steel],[.085,.674,.111,.038,blue],[.10,.566,.018,.021,edge]]){
  ring(face,'Machined dial moulding',0,y,0,r,w,h,material,72);
 }
 cylinder(face,'Sunken blue guilloché dial',0,.047,0,.577,.055,blue,72);
 for(let i=0;i<13;i++)ring(face,'Guilloché hairline',0,.077,0,.149+i*.030,.004,.004,i%3?dark:steel,48);
 ticks(face,60,.642,.115,.69);
 const numerals=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
 numerals.forEach((n,i)=>{
  const a=i*TAU/12;
  label(face,n,[.604*Math.sin(a),.122,-.604*Math.cos(a)],.17,.086);
 });
 const hands={};
 for(const [name,length,width,y,material] of [
  ['hour',.385,.039,.150,edge],['minute',.526,.027,.173,edge],['second',.578,.009,.195,steel]
 ]){
  const shaft=works.shafts[name];
  const h=group(shaft,'Live '+name+' hand',0,y,0);
  h.rotation.y=-shaft.rotation.y;
  const shape=new T.Shape();
  shape.moveTo(-width*.45,-.08);shape.lineTo(width*.45,-.08);
  shape.lineTo(width,length*.68);shape.lineTo(0,length);shape.lineTo(-width,length*.68);shape.closePath();
  const body=new T.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:true,bevelSize:.003,bevelThickness:.002,bevelSegments:1});
  body.rotateX(-Math.PI/2);mesh(h,'Beveled '+name+' hand',body,material);
  hands[name]=h;
 }
 jewel(face,0,.221,0,.068);
 return {hands,swivel,works};
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
   if(!child.isMesh||child.isInstancedMesh||Array.isArray(child.material)||child.material.transparent||child.material.vertexColors)continue;
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
 const root=group(scene,'ΔΑΙΔΑΛΟΣ · Fejelude astronomical movement'),shell=casework(root);
 plate(root);
 softOcclusion(root,0,0,2.04,.38);
 const carrier=group(root,'Four-arm orbital carrier');
 cylinder(root,'Fixed seat of the orbital bearing',0,.16,0,.50,.145,steel,48);
 ring(root,'Chamfered bearing race',0,.22,0,.465,.065,.058,edge,48);
 cylinder(carrier,'Satellite centre shaft',0,.32,0,.298,.206,gold,48);
 ring(carrier,'Carrier bearing collar',0,.425,0,.343,.056,.043,edge,48);
 jewel(carrier,0,.455,0,.116);
 for(const [x,,z] of Object.values(SATELLITES)){
  bridge(carrier,'Rose-gold satellite bridge',[0,.373,0],[x,.373,z]);
  cylinder(carrier,'Satellite foot seat',x,.37,z,.19,.117,brush,24);
  ring(carrier,'Polished arm bearing',x,.435,z,.161,.032,.032,steel,28);
  screw(carrier,x*.83,.40,z*.83,.040);
 }
 const drive=train(carrier),[x,y,z]=SATELLITES.regulator;
 const feed=dialFeed(root,carrier,drive);
 const station=group(carrier,'Fixed transverse axle forks',x,y,z);
 const axle=group(station,'Five-minute transverse yoke');
 for(const side of [-1,1]){
  rod(station,'Yoke bearing column',[side*.575,-.69,0],[side*.575,0,0],.042,brush);
  const cap=cylinder(station,'Transverse bearing bezel',side*.586,0,0,.101,.075,edge,24);
  cap.rotation.z=Math.PI/2;
 }
 const yokeRing=ring(axle,'Transverse polished cage frame',0,0,0,.687,.027,.035,steel,72);
 yokeRing.rotation.z=Math.PI/2;
 rod(axle,'Transverse pivot axle',[-.60,0,0],[.60,0,0],.032,steel);
 const suspension=group(axle,'Inner cage mounting frame',0,-1.063,0);
 const movement=regulator(suspension,0,0),orbit=astronomy(carrier),{hands,swivel,works}=timeDial(carrier,feed);
 batchMachinedDetails(root);
 const watch={root,shell,carrier,hands,movement,orbit,axle,swivel,works,update(state){
  carrier.rotation.y=state.carrier;axle.rotation.x=state.yoke;swivel.rotation.y=state.dial;
  drive.update(state);movement.update(state);orbit.update(state);
  feed.update(state.time);works.update(state.time);
 }};
 return watch;
}
