import * as T from './vendor/three-r160.1.mjs';
import {buildWatch} from './feje-tourbillon-model.mjs';
import {movementAt} from './feje-tourbillon-mechanism.mjs';
import {buildCelestialObservatory} from './feje-tourbillon-celestial.mjs';

const fit=(n,min,max)=>Math.min(max,Math.max(min,n));
const views={
 overview:{target:[.055,.43,0],azimuth:.13,elevation:.58,distance:8.95},
 tourbillon:{target:[-1.08,1.055,.86],azimuth:-.35,elevation:.52,distance:3.15},
 escapement:{target:[-1.08,1.12,.86],azimuth:-.32,elevation:1.09,distance:2.45},
 gears:{target:[-.53,.30,.65],azimuth:-.33,elevation:1.13,distance:3.28},
 orbit:{target:[-.10,1.25,-.87],azimuth:.12,elevation:.44,distance:5.16}
};

function roomEnvironment(renderer){
 const room=new T.Scene();
 room.background=new T.Color(0x424855);
 const panel=new T.PlaneGeometry(1,1);
 const sources=[
  [[-3,6,4],[5.8,2.8],0xffded0,3.6],
  [[4,2,2],[1.5,4.6],0xd6e8ff,2.7],
  [[-1,5,-4],[4.8,3.0],0xdce7ff,3.2],
  [[0,.4,7],[4.1,2],0xffe7c9,1.7],
  [[-6,1,-.5],[.8,3.9],0xf1fff9,2.0]
 ];
 for(const [position,size,color,power] of sources){
  const m=new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(power)});
  const o=new T.Mesh(panel,m);
  o.position.set(...position);o.scale.set(...size,1);o.lookAt(0,0,0);room.add(o);
 }
 const pmrem=new T.PMREMGenerator(renderer);
 const texture=pmrem.fromScene(room,.11,.1,25);
 pmrem.dispose();panel.dispose();
 for(const o of room.children)o.material.dispose();
 return texture;
}

function disposeScene(scene){
 const buffers=new Set(),materials=new Set(),textures=new Set();
 scene.traverse(o=>{
  if(o.geometry)buffers.add(o.geometry);
  if(o.material)materials.add(o.material);
 });
 for(const m of materials){
  for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
  m.dispose();
 }
 for(const g of buffers)g.dispose();
 for(const t of textures)t.dispose();
}

export function createWatchRenderer(canvas,{mobile=false}={}){
 const antialias=!mobile;
 const context=canvas.getContext('webgl2',{alpha:true,antialias,depth:true,powerPreference:'low-power'});
 if(!context)return null;
 const renderer=new T.WebGLRenderer({canvas,context,alpha:true,antialias});
 renderer.toneMapping=T.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.21;
 renderer.setClearColor(0x000000,0);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.10,82);
 let reflection;
 const rebuildReflections=()=>{
  reflection?.dispose();
  reflection=roomEnvironment(renderer);
  scene.environment=reflection.texture;
 };
 const areaLight=(color,power,x,y,z)=>{
  const light=new T.DirectionalLight(color,power);light.position.set(x,y,z);scene.add(light);
 };
 areaLight(0xffe2ce,2.25,-3,6,4);
 areaLight(0xc7dcff,1.8,3,4,-4);
 areaLight(0xfff5e5,.65,3,1,4);
 scene.add(new T.HemisphereLight(0xd9e9ff,0x654133,1.1));
 const observatory=buildCelestialObservatory(scene,{mobile});
 const watch=buildWatch(scene);
 rebuildReflections();

 const {overview}=views;
 const target=new T.Vector3(...overview.target),desiredTarget=target.clone();
 const current={...overview},goal={...overview};
 let width=0,height=0;
 let pixelRatio=Math.min(devicePixelRatio||1,mobile?1.2:1.55);
 let samples=0,cost=0,slowFrames=0,economy=mobile,focusDetail=false;
 const stats={frames:0,triangles:0,drawCalls:0,pixelRatio};
 function resize(w,h){
  if(w<1||h<1||w===width&&h===height)return;
  width=w;height=h;
  camera.aspect=w/h;
  camera.fov=2*Math.atan(Math.tan(38*Math.PI/360)/Math.min(1,camera.aspect))*180/Math.PI;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(pixelRatio);renderer.setSize(width,height,false);
 }
 function focus(name){
  focusDetail=Object.hasOwn(views,name)&&name!=='overview';
  const v=views[name]??overview;
  desiredTarget.set(...v.target);
  Object.assign(goal,v);
 }
 function settleCamera(delta,immediate){
  const weight=immediate?1:1-Math.exp(-Math.max(.005,delta)*13);
  target.lerp(desiredTarget,weight);
  let moving=target.distanceToSquared(desiredTarget)>.000001;
  for(const key of ['azimuth','elevation','distance']){
   current[key]+=(goal[key]-current[key])*weight;
   moving ||= Math.abs(goal[key]-current[key])>.001;
  }
  const e=current.elevation,a=current.azimuth,d=current.distance;
  camera.position.set(target.x+d*Math.cos(e)*Math.sin(a),target.y+d*Math.sin(e),target.z+d*Math.cos(e)*Math.cos(a));
  camera.lookAt(target);
  return moving;
 }
 return {
  resize,focus,stats,rebuildReflections,
  orbit(dx,dy){
   goal.azimuth+=dx;
   goal.elevation=fit(goal.elevation+dy,.08,1.49);
  },
  zoom(factor){goal.distance=fit(goal.distance*factor,1.65,15)},
  setCase(visible){watch.shell.visible=visible},
  draw(seconds,angles,delta,immediate=false,skySeconds=seconds){
   const start=performance.now();
   watch.update(movementAt(seconds));
   observatory.update(skySeconds,{economy,focus:focusDetail});
   for(const [name,angle] of Object.entries(angles))watch.hands[name].rotation.y=-angle*Math.PI/180;
   const settling=settleCamera(delta,immediate);
   renderer.render(scene,camera);
   stats.frames++;stats.triangles=renderer.info.render.triangles;stats.drawCalls=renderer.info.render.calls;
   samples++;cost+=performance.now()-start;
   if(delta>.045)slowFrames++;
   // Lower fill cost after sustained slow frame submissions. Keep mesh detail
   // and the case structure intact in the coarse/mobile profile.
   if(samples===60){
    if(cost/samples>16||slowFrames/samples>.24){
     economy=true;
     if(pixelRatio>.78){
      pixelRatio=Math.max(.72,pixelRatio*.80);
      stats.pixelRatio=pixelRatio;renderer.setPixelRatio(pixelRatio);
     }
    }
    samples=0;cost=0;slowFrames=0;
   }
   return settling;
  },
  dispose(){reflection?.dispose();disposeScene(scene);renderer.dispose()}
 };
}
