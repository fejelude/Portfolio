import * as T from './vendor/three-r160.1.mjs';
import {SKY_PERIOD} from './feje-tourbillon-astrolabe.mjs';

const TAU=2*Math.PI;
const phaseAt=seconds=>TAU*((seconds%SKY_PERIOD+SKY_PERIOD)%SKY_PERIOD)/SKY_PERIOD;
export function celestialPhase(seconds){
 const a=phaseAt(seconds);
 return {angle:a,breath:.5+.5*Math.cos(a),pulse:a/TAU};
}
const random=(seed)=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);

// Approximate J2000 hours, degrees and visual magnitude. Each pattern is
// rotated as a rigid group to compose the observatory's decorative sky.
export const CHARTS=[
 {name:'Orion',target:[-1.04,-.31,-.79],
  stars:[[5.9195,7.407,.50],[5.4189,6.349,1.64],[5.5334,-.299,2.23],[5.6036,-1.202,1.69],
   [5.6793,-1.943,1.77],[5.7959,-9.670,2.07],[5.2423,-8.202,.13]],
  lines:[[0,1],[1,2],[2,3],[3,4],[4,0],[4,5],[5,6],[6,2]]},
 {name:'Cassiopeia',target:[-.36,-.21,-1.1],
  stars:[[0.1529,59.150,2.27],[0.6751,56.537,2.23],[.9451,60.717,2.47],
   [1.4303,60.235,2.68],[1.9066,63.670,3.38]],
  lines:[[0,1],[1,2],[2,3],[3,4]]},
 {name:'Cygnus',target:[.94,-.31,-.74],
  stars:[[20.6905,45.280,1.25],[20.3705,40.257,2.23],[19.5120,27.960,3.05],
   [19.7496,45.131,2.87],[20.7702,33.970,2.48]],
  lines:[[0,1],[1,2],[3,1],[1,4]]}
];
export function skyCoordinate(ra,dec){
 const a=ra*TAU/24,d=dec*Math.PI/180;
 return [Math.sin(a)*Math.cos(d),Math.sin(d),-Math.cos(a)*Math.cos(d)];
}
export function chartCoordinates(chart){
 const positions=chart.stars.map(([a,d])=>new T.Vector3(...skyCoordinate(a,d)));
 const centre=positions.reduce((sum,p)=>sum.add(p),new T.Vector3()).normalize();
 const orientation=new T.Quaternion().setFromUnitVectors(centre,new T.Vector3(...chart.target).normalize());
 return positions.map(p=>p.applyQuaternion(orientation).toArray());
}
const nebulaVertex=`
varying vec3 direction;
void main(){
 direction=position;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}`;
const nebulaFragment=`
precision highp float;
varying vec3 direction;
uniform sampler2D noiseAtlas;
uniform vec2 flow;
uniform float economy;
vec2 sampleNoise(vec2 p){return texture2D(noiseAtlas,p).rg;}
void main(){
 vec3 d=normalize(direction);
 vec2 p=vec2(dot(d,vec3(.81,.19,-.51)),dot(d,vec3(-.28,.95,.12)));
 vec2 broad=sampleNoise(p*.13+vec2(.38,.11));
 vec2 warp=sampleNoise(p*.43+.19*broad+flow*.006);
 vec2 gas=p+warp*.38+broad*.65+flow*.012;
 float body=sampleNoise(gas*.22+vec2(.53,.27)).r;
 float cloud=sampleNoise(gas*.61+.66).g;
 float turbulence=sampleNoise(gas*1.30+vec2(.76,.12)).r;
 float fine=sampleNoise(gas*2.72+vec2(.55,.40)).g;
 if(economy<.5) fine=mix(fine,sampleNoise(gas*5.62+vec2(.34,.52)).r,.26);
 float sheet=p.y+.14*sin(p.x*3.4)+.14*(broad.r-.5)+.115;
 float front=smoothstep(.17,.72,cloud*.56+body*.29+turbulence*.15);
 float ridge=max(0.,1.-abs(sheet+(turbulence-.46)*.16)*5.7);
 float lace=pow(max(0.,1.-abs(cloud-.60)*3.15),5.)*front*ridge;
 float ash=smoothstep(.40,.69,cloud*.55+turbulence*.27+fine*.18);
 float veins=pow(max(0.,1.-abs(turbulence-.53)*3.0),7.)*ridge*front*(.31+.69*fine);
 vec3 ink=mix(vec3(.006,.017,.039),vec3(.015,.049,.107),broad.g);
 vec3 cobalt=vec3(.010,.061,.143)*front*(.47+ridge*.70);
 vec3 turquoise=vec3(.016,.128,.139)*(lace*.74+veins*.68);
 vec3 veil=vec3(.009,.029,.055)*fine*ridge;
 vec3 color=ink+cobalt*(.55+.58*ash)+turquoise+veil;
 color*=.76+.24*ash;
 gl_FragColor=vec4(color,1.);
 #include <colorspace_fragment>
}`;
function noiseTexture(){
 const n=128,data=new Uint8Array(n*n*4),roll=random(45008);
 const seeds=[4,8,16,32,64].map(size=>({size,values:Float32Array.from({length:size*size},roll)}));
 const smooth=x=>x*x*(3-2*x);
 const noise=(u,v,{size,values})=>{
  const x=u*size,y=v*size,ix=Math.floor(x),iy=Math.floor(y);
  const at=(dx,dy)=>values[((iy+dy)%size)*size+(ix+dx)%size];
  return T.MathUtils.lerp(T.MathUtils.lerp(at(0,0),at(1,0),smooth(x-ix)),T.MathUtils.lerp(at(0,1),at(1,1),smooth(x-ix)),smooth(y-iy));
 };
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const u=x/n,v=y/n,i=(y*n+x)*4;
  data[i]=(noise(u,v,seeds[1])*.60+noise(u,v,seeds[2])*.26+noise(u,v,seeds[3])*.14)*255;
  data[i+1]=(noise(u,v,seeds[0])*.49+noise(u,v,seeds[2])*.31+noise(u,v,seeds[4])*.20)*255;
  data[i+2]=0;data[i+3]=255;
 }
 const t=new T.DataTexture(data,n,n);
 t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;
 t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.needsUpdate=true;
 return t;
}
const pointVertex=`
attribute float intensity;
attribute float sparkle;
uniform float pixelRatio;
uniform float phase;
varying float light;
varying vec3 ink;
void main(){
 gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
 gl_PointSize=(1.15+2.0*intensity)*pixelRatio;
 light=(.44+.52*intensity)*(.88+.12*cos(phase+sparkle));
 ink=mix(vec3(.32,.65,.82),vec3(1.,.91,.75),step(5.,sparkle)*.57);
}`;
const pointFragment=`
varying float light;
varying vec3 ink;
void main(){
 float r=length(gl_PointCoord-.5);
 float alpha=(1.-smoothstep(.18,.49,r))*light;
 if(alpha<.025)discard;
 gl_FragColor=vec4(ink,alpha);
 #include <colorspace_fragment>
}`;
function starLayers(root){
 const pos=[],intensity=[],sparkle=[],lines=[];
 const add=(p,brightness,phase)=>{pos.push(...p);intensity.push(brightness);sparkle.push(phase);};
 const roll=random(76374);
 for(let i=0;i<1450;i++){
  const y=roll()*2-1,a=roll()*TAU,d=Math.sqrt(1-y*y);
  add([Math.cos(a)*d*53,y*53,Math.sin(a)*d*53],.09+roll()**4*.34,roll()*TAU);
 }
 for(const chart of CHARTS){
  const stars=chartCoordinates(chart).map(p=>p.map(n=>n*51.8));
  stars.forEach((p,i)=>add(p,.43+(3.50-chart.stars[i][2])*.16,roll()*TAU));
  for(const [a,b] of chart.lines)lines.push(...stars[a],...stars[b]);
 }
 const chartGeo=new T.BufferGeometry();
 chartGeo.setAttribute('position',new T.Float32BufferAttribute(lines,3));
 const chartLines=new T.LineSegments(chartGeo,new T.LineBasicMaterial({color:0xe5c58c,transparent:true,opacity:.48,depthWrite:false}));
 chartLines.name='Orion, Cassiopeia and Cygnus chart lines';root.add(chartLines);
 const starGeo=new T.BufferGeometry();
 starGeo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
 starGeo.setAttribute('intensity',new T.Float32BufferAttribute(intensity,1));
 starGeo.setAttribute('sparkle',new T.Float32BufferAttribute(sparkle,1));
 const uniforms={phase:{value:0},pixelRatio:{value:1}};
 const stars=new T.Points(starGeo,new T.ShaderMaterial({vertexShader:pointVertex,fragmentShader:pointFragment,uniforms,transparent:true,depthWrite:false,toneMapped:false}));
 stars.name='Separate crisp stars and visual magnitude';root.add(stars);
 return uniforms;
}

function meridian(scene){
 const root=new T.Group();root.position.y=-1.52;scene.add(root);
 const points=[];
 for(const radius of [4.04,4.12,4.27]){
  for(let i=0;i<160;i++){
   const a=i*TAU/160,b=(i+1)*TAU/160;
   points.push(radius*Math.cos(a),0,radius*Math.sin(a),radius*Math.cos(b),0,radius*Math.sin(b));
  }
 }
 for(let i=0;i<96;i++){
  const a=i*TAU/96,r=i%8?4.15:4.06;
  points.push(r*Math.cos(a),0,r*Math.sin(a),4.25*Math.cos(a),0,4.25*Math.sin(a));
 }
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.Float32BufferAttribute(points,3));
 const lines=new T.LineSegments(geo,new T.LineBasicMaterial({color:0x7dc5c7,transparent:true,opacity:.31,depthWrite:false}));
 lines.name='Astral meridian and minute inlays';root.add(lines);
 return root;
}
export function buildCelestialObservatory(scene){
 const skyGroup=new T.Group();skyGroup.name='Aqua nebula and reference constellations';scene.add(skyGroup);
 const uniforms={noiseAtlas:{value:noiseTexture()},flow:{value:new T.Vector2()},economy:{value:0}};
 const sky=new T.Mesh(new T.SphereGeometry(72,42,28),new T.ShaderMaterial({
  vertexShader:nebulaVertex,fragmentShader:nebulaFragment,uniforms,
  side:T.BackSide,depthWrite:false,toneMapped:false
 }));
 sky.name='Procedural nebula filament dome';sky.renderOrder=-20;skyGroup.add(sky);
 const stars=starLayers(skyGroup),engraving=meridian(scene);
 return {
  setPixelRatio(ratio){stars.pixelRatio.value=ratio;},
  dispose(){uniforms.noiseAtlas.value.dispose();},
  update(seconds,{economy=false,focus=false}={}){
   const {angle}=celestialPhase(seconds);
   uniforms.economy.value=economy||focus?1:0;
   uniforms.flow.value.set(Math.cos(angle),Math.sin(angle));
   stars.phase.value=angle;
   skyGroup.rotation.y=.011*Math.sin(angle);
   engraving.visible=!focus;
   engraving.rotation.y=.027*Math.sin(angle);
  }
 };
}
