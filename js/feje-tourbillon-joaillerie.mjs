import * as T from './vendor/three-r160.1.mjs';

const TAU=2*Math.PI;
// Original cut; separate triangle vertices preserve hard facet normals.
export function facetedPositions(rings,sectors,radius=1){
 const p=[],at=(i,k)=>{
  const [r,y,phase]=rings[i],a=(k+phase)*TAU/sectors;
  return [radius*r*Math.cos(a),radius*y,radius*r*Math.sin(a)];
 };
 for(let i=0;i<rings.length-1;i++)for(let k=0;k<sectors;k++){
  const a=at(i,k),b=at(i,k+1),c=at(i+1,k),d=at(i+1,k+1);
  if(rings[i][2]>rings[i+1][2])p.push(...a,...b,...d,...a,...d,...c);
  else p.push(...a,...b,...c,...b,...d,...c);
 }
 const end=rings.length-1;
 for(let k=1;k<sectors-1;k++)p.push(...at(0,0),...at(0,k+1),...at(0,k),...at(end,0),...at(end,k),...at(end,k+1));
 return p;
}
export const moonPositions=(radius=.405)=>facetedPositions(
 [20,36,54,72,90,108,126,144,160].map((d,i)=>{
  const a=d*Math.PI/180;return [Math.sin(a),Math.cos(a),i%2*.5];
 }),16,radius);
export const brilliantPositions=()=>facetedPositions([
 [.53,.35,0],[.82,.20,.5],[1,0,0],[.82,-.18,.5],[.10,-.67,0]
],16);
export const baguettePositions=()=>{
 const outline=[[.65,1],[-.65,1],[-1,.65],[-1,-.65],[-.65,-1],[.65,-1],[1,-.65],[1,.65]];
 const bands=[[.63,.23],[.85,.12],[1,0],[.72,-.16],[.30,-.42]];
 const p=[],at=(i,k)=>{const [x,z]=outline[k%8],[scale,y]=bands[i];return [x*scale,y,z*scale];};
 for(let i=0;i<bands.length-1;i++)for(let k=0;k<8;k++){
  const a=at(i,k),b=at(i,k+1),c=at(i+1,k),d=at(i+1,k+1);
  p.push(...a,...b,...c,...b,...d,...c);
 }
 for(let k=1;k<7;k++)p.push(...at(0,0),...at(0,k+1),...at(0,k),...at(4,0),...at(4,k),...at(4,k+1));
 return p;
};
export function facetGeometry(positions){
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 g.computeVertexNormals();g.computeBoundingSphere();return g;
}
export const JEWEL_LAYOUT=Object.freeze({
 bezel:Object.freeze({count:112,radius:2.55,girdle:.738,stone:.049}),
 chapter:Object.freeze({count:48,radius:2.344,girdle:.118,stone:.033}),
 dial:Object.freeze({count:12,radius:.603,girdle:.121,stone:.016})
});
export const ringSites=({count,radius,girdle,stone},phase=0)=>Array.from({length:count},(_,i)=>{
 const a=TAU*i/count+phase;
 return {x:radius*Math.cos(a),y:girdle,z:radius*Math.sin(a),r:stone,a};
});
export function gemstone(color,ior,{hero=false,thickness=.65}={}){
 // The small stones use a high-index opaque environment approximation.
 // Only the moon incurs a physical transmission pass.
 const m=new T.MeshPhysicalMaterial({color,metalness:hero?.08:.27,roughness:hero?.055:.075,
  ior,clearcoat:.65,clearcoatRoughness:.045,envMapIntensity:hero?1.45:1.65,
  flatShading:true,transmission:hero?.48:0,thickness,
  attenuationDistance:hero?1.5:Infinity,attenuationColor:new T.Color(color)});
 if(hero&&'dispersion' in m)m.dispersion=.035;
 return m;
}
function instances(parent,name,geometry,material,sites,configure){
 if(!sites.length){geometry.dispose();return;}
 const result=new T.InstancedMesh(geometry,material,sites.length),pose=new T.Object3D();
 result.name=name;
 sites.forEach((site,i)=>{
  pose.position.set(0,0,0);pose.rotation.set(0,0,0);pose.scale.set(1,1,1);
  configure(pose,site,i);pose.updateMatrix();result.setMatrixAt(i,pose.matrix);
 });
 result.instanceMatrix.needsUpdate=true;result.computeBoundingSphere();parent.add(result);return result;
}
export function setBrilliants(parent,name,sites,material,setting,{prongs=false}={}){
 instances(parent,name,facetGeometry(brilliantPositions()),material,sites,(p,s,i)=>{
  p.position.set(s.x,s.y,s.z);p.rotation.y=s.a+i*Math.PI/16;p.scale.setScalar(s.r);
 });
 instances(parent,name+' • polished collets',new T.TorusGeometry(.91,.11,6,20).rotateX(-Math.PI/2),setting,sites,(p,s)=>{
  p.position.set(s.x,s.y-.15*s.r,s.z);p.scale.setScalar(s.r);
 });
 if(prongs){
  const claws=sites.flatMap(s=>Array.from({length:4},(_,i)=>{
   const a=s.a+Math.PI/4+i*Math.PI/2;return {x:s.x+.91*s.r*Math.cos(a),y:s.y+.03*s.r,z:s.z+.91*s.r*Math.sin(a),r:s.r};
  }));
  instances(parent,name+' • rounded bead prongs',new T.SphereGeometry(1,8,6),setting,claws,(p,s)=>{
   p.position.set(s.x,s.y,s.z);p.scale.set(.16*s.r,.20*s.r,.16*s.r);
  });
 }
}
export function setBaguettes(parent,name,sites,material,setting){
 instances(parent,name,facetGeometry(baguettePositions()),material,sites,(p,s)=>{
  p.position.set(s.x,s.y,s.z);p.rotation.y=-s.a;p.scale.set(s.r,.80*s.r,1.45*s.r);
 });
 const rails=sites.flatMap(s=>[-1,1].map(side=>({...s,x:s.x+side*.97*s.r*Math.cos(s.a),z:s.z+side*.97*s.r*Math.sin(s.a)})));
 instances(parent,name+' • gold channel shoulders',new T.BoxGeometry(1,1,1),setting,rails,(p,s)=>{
  p.position.set(s.x,s.y-.16*s.r,s.z);p.rotation.y=-s.a;p.scale.set(.24*s.r,.33*s.r,2.9*s.r);
 });
}
// Derivative-filtered analytic surface finishing; no external textures.
export function finishing(material,kind){
 const patterns={
  aventurine:`
   vec2 jq = jewelPosition.xz * 175.0;
   float js = fract(sin(dot(floor(jq),vec2(127.1,311.7)))*43758.5453);
   float jd = 1.0-smoothstep(.08,.26,length(fract(jq)-.5));
   float jv = 1.0-smoothstep(.30,1.05,max(length(dFdx(jq)),length(dFdy(jq))));
   float jf = step(.91,js)*jd*jv;
   float jr = length(jewelPosition.xz);
   float jFilter=1.0-smoothstep(.2,2.0,fwidth(jr)*170.0);
   float jWave=cos(jr*170.0)*jFilter;
   diffuseColor.rgb *= 1.0+.055*jWave;
   diffuseColor.rgb += jf*vec3(.11,.16,.22);`,
  guilloche:`
   float jr=length(jewelPosition.xz);
   float ja=atan(jewelPosition.z,jewelPosition.x);
   float jFilter=1.0-smoothstep(.2,2.0,fwidth(jr)*255.0);
   float jWave=cos(jr*255.0+5.0*cos(ja*18.0))*jFilter;
   diffuseColor.rgb *= 1.0+.16*jWave;`,
  brushing:`
   float jr=length(jewelPosition.xz);
   float jFilter=1.0-smoothstep(.25,2.0,fwidth(jr)*340.0);
   float jWave=cos(jr*340.0)*jFilter;
   diffuseColor.rgb *= 1.0+.045*jWave;`
 };
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 jewelPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\njewelPosition=position;');
  shader.fragmentShader='varying vec3 jewelPosition;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+patterns[kind]);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+.055*jWave,.08,.6);');
 };
 material.customProgramCacheKey=()=> 'daedalus-finish-'+kind;
 return material;
}
