import * as T from './vendor/three-r160.1.mjs';
import {MOVEMENT as m, TAU} from './feje-tourbillon-mechanism.mjs';

import {coastlines} from './feje-tourbillon-coastlines.mjs';
const mat = (color,metalness,roughness,extra={}) =>
 new T.MeshStandardMaterial({color,metalness,roughness,...extra});
const gold=mat(0xd99066,.88,.24);
const edge=mat(0xf5bf96,.91,.16);
const brush=mat(0xa56148,.81,.37);
const steel=mat(0xb5cce4,.86,.21);
const dark=mat(0x253344,.72,.37);
const blue=mat(0x123477,.47,.34);
const ruby=new T.MeshPhysicalMaterial({color:0x8e0f3b,metalness:.36,roughness:.19,clearcoat:1});
const crystal=new T.MeshPhysicalMaterial({
 color:0xdde8fc,metalness:.44,roughness:.12,flatShading:true,clearcoat:.9
});
const dialInk=new T.MeshBasicMaterial({color:0xf9d3ab});
const sapphire=new T.MeshPhysicalMaterial({
 color:0x9eb8ef,metalness:.56,roughness:.12,transparent:true,opacity:.22,depthWrite:false,clearcoat:1
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
  mesh(parent,'Slotted screw cap',cap,steel,x,y+.036,z);
 }
}
function jewel(parent,x,y,z,r=.079){
 ring(parent,'Gold jewel bezel',x,y,z,r,.014,.026,edge,24);
 const gem=new T.IcosahedronGeometry(r*.63,1);
 gem.scale(1,.48,1);
 mesh(parent,'Ruby bearing',gem,ruby,x,y+.02,z);
}
function gear(parent,name,count,pitch,y,material,{inner=pitch*.58,depth=.078,escape=false}={}){
 // Tooth centers sit at zero and at integral pitches. A circular rim and
 // open spokes let visitors see the shafts behind the wheels.
 const root=pitch*(escape?.77:.91),tip=pitch*(escape?1.06:1.071);
 const section=escape?4:6;
 const radial=Array.from({length:count*section},(_,i)=>{
  if(escape)return [root,root,tip,root][i%4];
  return [tip,tip,pitch,root,root,pitch][i%6];
 });
 const shape=new T.Shape();
 radial.forEach((r,i)=>{
  const a=(i-.5)*TAU/radial.length;
  if(i===0)shape.moveTo(r*Math.cos(a),r*Math.sin(a));
  else shape.lineTo(r*Math.cos(a),r*Math.sin(a));
 });
 shape.closePath();
 const hole=new T.Path();
 hole.absarc(0,0,inner,0,TAU,true);shape.holes.push(hole);
 const geom=new T.ExtrudeGeometry(shape,{depth,curveSegments:18,bevelEnabled:true,bevelSegments:1,bevelSize:depth*.12,bevelThickness:depth*.12});
 geom.rotateX(-Math.PI/2);
 mesh(parent,name,geom,material,0,y-depth/2,0);
 const core=pitch*.29;
 const spokes=pitch>.28?6:4;
 cylinder(parent,'Pinion hub',0,y,0,core,depth*1.25,material);
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
 const arc=Array.from({length:24},(_,i)=>[2.453*Math.cos(i*Math.PI/46),.705+1.65*Math.sin(i*Math.PI/46)]);
 profile(shell,'Curved sapphire dome',arc,sapphire,0,0,104).renderOrder=7;
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
 rod(parent,name,a,b,.073,brush,8);
 rod(parent,'Polished bridge edge',[a[0],a[1]+.064,a[2]],[b[0],b[1]+.064,b[2]],.022,edge,8);
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
 gear(barrel,'48-tooth barrel',m.barrel,step(m.barrel),.225,gold,{inner:.36});
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
 jewel(roller,-.113,-.062,-.025,.032);
 for(let i=0;i<6;i++){
  const [dx,dz]=polar(.254,i*TAU/6);
  rod(balance,'Balance spoke',[0,0,0],[dx,0,dz],.018,steel,8);
  screw(balance,dx,.015,dz,.027);
 }
 // Interpolate a spiral whose outer stud stays fixed while the collet moves.
 // A line is used for the thin steel ribbon to keep its updates inexpensive.
 const springPoints=241,positions=new Float32Array(springPoints*3);
 const springGeom=new T.BufferGeometry();
 springGeom.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
 const spring=new T.Line(springGeom,new T.LineBasicMaterial({color:0x9ccfe9}));
 spring.name='Breathing hairspring';spring.frustumCulled=false;cage.add(spring);
 const springAngles=Array.from({length:springPoints},(_,i)=>i/(springPoints-1));
 for(const y of [.476,.51])cylinder(cage,'Hairspring outer stud',.232,y,0,.029,.029,gold,10);
 return {cage,balance,fork,escape,update(s){
  cage.rotation.y=s.cage;
  escape.rotation.y=s.escape+Math.PI/m.escapePinion;
  balance.rotation.y=s.balance;fork.rotation.y=s.fork;
  springAngles.forEach((u,i)=>{
   const r=.026+u*.205+s.spring*.011*Math.sin(Math.PI*u);
   const a=u*TAU*5.5+s.balance*(1-u)*(1-u)+Math.PI;
   positions[3*i]=r*Math.cos(a);positions[3*i+1]=.522;positions[3*i+2]=-r*Math.sin(a);
  });
  springGeom.attributes.position.needsUpdate=true;
 }};
}

function earthMap(){
 const canvas=document.createElement('canvas');
 canvas.width=768;canvas.height=384;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#0e4296';ctx.fillRect(0,0,768,384);
 ctx.fillStyle='#c88a53';
 for(const coast of coastlines){
  ctx.beginPath();coast.forEach(([lon,lat],i)=>ctx[i?'lineTo':'moveTo']((lon+180)/360*768,(90-lat)/180*384));
  ctx.closePath();ctx.fill();
 }
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
 const globe=mesh(earthSupport,'Enamel Earth and gold continents',new T.SphereGeometry(.453,56,36),
  new T.MeshPhysicalMaterial({map:earthMap(),metalness:.54,roughness:.26,clearcoat:.74,clearcoatRoughness:.17}));
 const moonSupport=group(root,'Lunar spindle support',moonPoint[0],1.41,moonPoint[1]);
 moonSupport.rotation.z=.13;
 rod(moonSupport,'Lunar polished axis',[0,-.82,0],[0,.45,0],.034,steel);
 for(const y of [-.452,.403])cylinder(moonSupport,'Lunar bearing cap',0,y,0,.060,.056,edge,18);
 const lunarGeom=new T.IcosahedronGeometry(.387,2);
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
  const h=group(face,'Live '+name+' hand',0,y,0);
  const shape=new T.Shape();
  shape.moveTo(-width*.45,-.08);shape.lineTo(width*.45,-.08);
  shape.lineTo(width,length*.68);shape.lineTo(0,length);shape.lineTo(-width,length*.68);shape.closePath();
  const body=new T.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:true,bevelSize:.003,bevelThickness:.002,bevelSegments:1});
  body.rotateX(-Math.PI/2);mesh(h,'Beveled '+name+' hand',body,material);
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
 const root=group(scene,'ΔΑΙΔΑΛΟΣ · Fejelude astronomical movement');
 const shell=casework(root);
 plate(root);
 for(const [x,z,r,alpha] of [[-.98,.85,.87,.51],[1,.71,.86,.47],[-1.08,-.78,.61,.47],[.79,-1.04,.63,.50],[0,0,.75,.48]])softOcclusion(root,x,z,r,alpha);
 const drive=train(root);
 const movement=regulator(root,drive.cagePoint.x,drive.cagePoint.z);
 const orbit=astronomy(root,drive.barrelPos);
 const hands=timeDial(root);
 batchMachinedDetails(root);
 return {root,shell,hands,movement,orbit,update(state){drive.update(state);movement.update(state);orbit.update(state)}};
}
