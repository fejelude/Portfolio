import * as T from './vendor/three-r160.1.mjs';

const point=(x,y,z)=>new T.Vector3(x,y,z);
const leatherPath=[
 [2.17,-.18,.65],[2.37,-.19,.72],[2.68,-.26,.705],[3.02,-.39,.68],
 [3.47,-.65,.65],[4.07,-.94,.625],[4.67,-1.16,.595],[5.12,-1.22,.57],
 [5.45,-1.19,.52],[5.62,-1.16,.36],[5.70,-1.14,.015]
];
function pathAt(t,side){
 const f=Math.min(1,Math.max(0,t))*(leatherPath.length-1),i=Math.min(leatherPath.length-2,Math.floor(f)),a=leatherPath[i],b=leatherPath[i+1];
 const blend=k=>{
  const before=leatherPath[Math.max(0,i-1)][k],after=leatherPath[Math.min(i+2,leatherPath.length-1)][k],u=f-i;
  return .5*((2*a[k])+(-before+b[k])*u+(2*before-5*a[k]+4*b[k]-after)*u*u+(-before+3*a[k]-3*b[k]+after)*u*u*u);
 };
 return {z:side*blend(0),y:blend(1),w:Math.max(.012,blend(2))};
}
function stampedLeather(){
 const size=256,bytes=new Uint8Array(size*size*4);
 // Irregular oval grain cells. The height map is shared by both strap halves.
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size*12,v=y/size*18,ix=Math.floor(u),iy=Math.floor(v);
  let best=10,second=10;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const cx=ix+dx,cy=iy+dy,a=(cx+12)%12,b=(cy+18)%18;
   const h=(Math.imul(a+91,21569)^Math.imul(b+47,83003))>>>0;
   const px=cx+.23+((h>>4)&31)*.017,py=cy+.21+((h>>10)&31)*.018;
   const d=(px-u)**2+(py-v)**2;
   if(d<best){second=best;best=d;}else second=Math.min(second,d);
  }
  const grain=Math.min(1,(second-best)*5);
  const pore=(Math.sin(x*1.7+y*.3)+Math.cos(y*2.03-x*.6))*2.5;
  const wrinkle=Math.sin(v*3+u*.8)*5;
  const i=(y*size+x)*4;
  bytes[i]=bytes[i+1]=bytes[i+2]=Math.round(60+150*grain+pore+wrinkle);
  bytes[i+3]=255;
 }
 const texture=new T.DataTexture(bytes,size,size);
 texture.wrapS=texture.wrapT=T.RepeatWrapping;
 texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;
 texture.generateMipmaps=true;texture.anisotropy=4;texture.needsUpdate=true;
 return texture;
}
function rail(side){
 const positions=[],uv=[],indices=[];
 const length=52,ribs=18;
 for(let row=0;row<=length;row++){
  const t=row/length,{z,y,w}=pathAt(t,side);
  for(let k=0;k<ribs;k++){
   const a=2*Math.PI*k/ribs,c=Math.cos(a),s=Math.sin(a);
   positions.push(w*Math.sign(c)*Math.abs(c)**.56,y+.088*Math.sign(s)*Math.abs(s)**.66,z);
   uv.push(k/ribs*1.4,t*2.25);
   if(row<length){
    const i=row*ribs+k,j=row*ribs+(k+1)%ribs,n=i+ribs,m=j+ribs;
    if(side>0)indices.push(i,j,n,n,j,m);
    else indices.push(i,n,j,n,m,j);
   }
  }
 }
 for(let k=1;k<ribs-1;k++){
  const end=length*ribs;
  if(side>0)indices.push(0,k+1,k,end,end+k,end+k+1);
  else indices.push(0,k,k+1,end,end+k+1,end+k);
 }
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);
 geo.computeVertexNormals();return geo;
}
function latchProfile(parent,vertices,thickness,material,{x=0,y=0,z=0,angle=0}={}){
 const shape=new T.Shape();
 vertices.forEach(([u,v],i)=>shape[i?'lineTo':'moveTo'](u,v));shape.closePath();
 const geo=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelSize:.039,bevelThickness:.032,bevelSegments:3});
 geo.rotateX(-Math.PI/2);
 const obj=new T.Mesh(geo,material);obj.position.set(x,y,z);obj.rotation.y=angle;parent.add(obj);
 return obj;
}
const lugShape=[[0,.00],[.19,.04],[.235,.20],[.215,.46],[.145,.68],[.011,.725],[-.083,.62],[-.095,.34],[-.127,.10]];
const latchShape=[[.38,.03],[.57,.09],[.63,.20],[.60,.48],[.49,.55],[.36,.48],[.43,.34],[.42,.20],[.35,.13]];
export function buildStrap(shell,{gold,edge,steel,rod,cylinder}){
 const leather=new T.MeshStandardMaterial({color:0x142d51,roughness:.55,metalness:.03,bumpMap:stampedLeather(),bumpScale:.035,side:T.DoubleSide});
 const thread=new T.MeshStandardMaterial({color:0x91a7ae,roughness:.79});
 const selvedge=new T.MeshStandardMaterial({color:0x12243c,roughness:.44});
 const ink=new T.MeshStandardMaterial({color:0x050a13,roughness:.73});
 const seamMaterial=new T.CapsuleGeometry(.009,.053,2,5);
 const up=point(0,1,0),pose=new T.Object3D();
 for(const side of [-1,1]){
  const panel=new T.Mesh(rail(side),leather);
  panel.name=side>0?'Crowned calfskin tongue':'Crowned calfskin buckle strap';shell.add(panel);
  const threadMesh=new T.InstancedMesh(seamMaterial,thread,64);threadMesh.name='Hand-stitched contrasting welt';
  const sample=(t,edgeSide)=>{
   const p=pathAt(t,side);return point(edgeSide*(p.w-.084),p.y+.075,p.z);
  };
  for(const [j,s] of [-1,1].entries()){
   for(let i=0;i<32;i++){
    const t=.111+i*.024, a=sample(t,s),b=sample(t+.0095,s);
    pose.position.copy(a).lerp(b,.5);pose.quaternion.setFromUnitVectors(up,b.sub(a).normalize());
    pose.updateMatrix();threadMesh.setMatrixAt(j*32+i,pose.matrix);
   }
   const curve=new T.CatmullRomCurve3(Array.from({length:20},(_,i)=>{
    const {w,y,z}=pathAt(i/19,side);return point(s*w*.987,y-.008,z);
   }));
   const bead=new T.Mesh(new T.TubeGeometry(curve,40,.019,6,false),selvedge);
   bead.name='Burnished edge';shell.add(bead);
   const nice=lugShape.map(([u,v])=>[u*s,v]);
   const form=latchProfile(shell,nice,.195,gold,{x:s*.777,y:-.320,z:side*1.99,angle:side>0?Math.PI:0});
   form.name='Swept gold lug with polished bevel';
   cylinder(shell,'Spring-bar shoulder',s*.735,-.209,side*2.53,.072,.128,edge,18).rotation.z=Math.PI/2;
  }
  shell.add(threadMesh);
  rod(shell,'Steel spring bar',[-.819,-.204,2.53*side],[.819,-.204,2.53*side],.044,steel,14);
 }
 for(let i=0;i<5;i++){
  const {z,y}=pathAt(.51+i*.075,1);
  cylinder(shell,'Recessed strap adjustment',0,y+.083,z,.035,.006,ink,16);
 }
 for(const side of [-1,1]){
  const latch=latchProfile(shell,latchShape.map(([x,z])=>[side*x,z]),.103,gold,{y:-1.194,z:-4.61});
  latch.name='Rounded folding clasp frame';
 }
 rod(shell,'Clasp hinge',[-.55,-1.12,-4.73],[.55,-1.12,-4.73],.061,edge,16);
 rod(shell,'Clasp bridge',[-.53,-1.12,-5.11],[.53,-1.12,-5.11],.070,edge,16);
 rod(shell,'Angled clasp lock',[0,-1.17,-5.10],[0,-1.05,-4.62],.039,steel,12);
}
