import * as T from './vendor/three-r160.1.mjs';
import {buildWatch} from './feje-tourbillon-model.mjs';
import {movementAt} from './feje-tourbillon-mechanism.mjs';
import {buildCelestialObservatory} from './feje-tourbillon-celestial.mjs';
import {watchPixelRatio} from './feje-tourbillon-quality.mjs';

const fit=(n,min,max)=>Math.min(max,Math.max(min,n));
const views={
 overview:{target:[-.34,-.02,.43],azimuth:.89,elevation:.55,distance:13.5},
 carrier:{target:[0,.62,0],azimuth:.78,elevation:1.23,distance:6.50},
 tourbillon:{target:[-1.41,1.10,.22],azimuth:.11,elevation:.68,distance:3.20,tracking:true},
 escapement:{target:[-1.37,1.14,.22],azimuth:.28,elevation:1.18,distance:2.67,tracking:true},
 gears:{target:[-.76,.31,-.09],azimuth:-.41,elevation:1.15,distance:3.17,tracking:true},
 orbit:{target:[.57,1.32,-.8],azimuth:.82,elevation:.62,distance:5.85,tracking:true},
 case:{target:[.26,.29,.82],azimuth:1.37,elevation:.16,distance:7.15},
 back:{target:[0,-.38,0],azimuth:1.28,elevation:-1.13,distance:7.28}
};
const yAxis=new T.Vector3(0,1,0);

export function overviewFraming(aspect){
 const blend=fit((aspect-1)/(16/9-1),0,1);
 return {...views.overview,azimuth:.86+.55*blend,elevation:.62-.12*blend,distance:16.7-3.8*blend};
}

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
  if(Array.isArray(o.material))o.material.forEach(m=>materials.add(m));
  else if(o.material)materials.add(o.material);
 });
 for(const m of materials){
  for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
  m.dispose();
 }
 for(const g of buffers)g.dispose();
 for(const t of textures)t.dispose();
}

export function createWatchRenderer(canvas,{mobile=false}={}){
 const antialias=true;
 const context=canvas.getContext('webgl2',{alpha:true,antialias,depth:true,powerPreference:'low-power'});
 if(!context)return null;
 const renderer=new T.WebGLRenderer({canvas,context,alpha:true,antialias});
 renderer.toneMapping=T.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.21;
 renderer.setClearColor(0x000000,0);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.10,110);
 let reflection,pendingFrame;
 const rebuildReflections=()=>{
  pendingFrame=null;
  reflection?.dispose();
  reflection=roomEnvironment(renderer);
  scene.environment=reflection.texture;
 };
 const areaLight=(color,power,x,y,z)=>{
  const light=new T.DirectionalLight(color,power);light.position.set(x,y,z);scene.add(light);
 };
 areaLight(0xffe2ce,2.05,-3,6,4);
 areaLight(0xa8ecff,1.83,3,4,-4);
 areaLight(0xfff5e5,.65,3,1,4);
 scene.add(new T.HemisphereLight(0xd9edf7,0x665044,1.04));
 const observatory=buildCelestialObservatory(scene);
 const watch=buildWatch(scene);
 rebuildReflections();

 const {overview}=views;
 let overviewPose=overviewFraming(4/3);
 const target=new T.Vector3(...overviewPose.target),desiredTarget=target.clone();
 const current={...overviewPose},goal={...overviewPose};
 let width=0,height=0,bufferDirty=true;
 const deviceDpr=typeof devicePixelRatio==='number'?devicePixelRatio:1;
 const maxRenderSize=context.getParameter(context.MAX_RENDERBUFFER_SIZE)||8192;
 const params=()=>({dpr:deviceDpr,mobile,width,height,maxRenderSize});
 let scale=1,economy=false,focusDetail=false,activeView=overview;
 let pixelRatio=watchPixelRatio(params());
 let samples=0,cost=0,slowFrames=0,headroom=0;
 const stats={frames:0,triangles:0,drawCalls:0,pixelRatio,economy};
 function applyResolution(){
  pixelRatio=watchPixelRatio(params())*scale;
  stats.pixelRatio=pixelRatio;
  bufferDirty=true;
  observatory.setPixelRatio(pixelRatio);
 }
 function resize(w,h){
  if(w<1||h<1||w===width&&h===height)return;
  width=w;height=h;
  camera.aspect=w/h;
  const next=overviewFraming(camera.aspect);
  if(activeView===overview){
   for(const key of ['azimuth','elevation','distance'])goal[key]+=next[key]-overviewPose[key];
   if(!stats.frames)Object.assign(current,goal);
  }
  overviewPose=next;
  camera.fov=2*Math.atan(Math.tan(38*Math.PI/360)/Math.min(1,camera.aspect))*180/Math.PI;
  camera.updateProjectionMatrix();
  applyResolution();
 }
 function focus(name){
  focusDetail=Object.hasOwn(views,name)&&name!=='overview';
  activeView=views[name]??overview;
  const pose=activeView===overview?overviewPose:activeView;
  desiredTarget.set(...pose.target);
  const turn=pose.azimuth-current.azimuth;
  Object.assign(goal,pose,{azimuth:current.azimuth+Math.atan2(Math.sin(turn),Math.cos(turn))});
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
  canDraw(){
   if(!pendingFrame)return true;
   if(context.clientWaitSync(pendingFrame,0,0)===context.TIMEOUT_EXPIRED)return false;
   context.deleteSync(pendingFrame);pendingFrame=null;
   return true;
  },
  orbit(dx,dy){
   goal.azimuth+=dx;
   goal.elevation=fit(goal.elevation+dy,-1.40,1.49);
  },
  zoom(factor){goal.distance=fit(goal.distance*factor,1.65,21)},
  draw(seconds,angles,delta,immediate=false,skySeconds=seconds,paintInterval=delta){
   const start=performance.now();
   if(bufferDirty&&width>0&&height>0){
    // Resize and draw in one task so a compositor never receives a cleared
    // backing buffer while the stage changes aspect or settles on screen.
    renderer.setDrawingBufferSize(width,height,pixelRatio);
    bufferDirty=false;
   }
   watch.update(movementAt(seconds));
   if(activeView.tracking)desiredTarget.set(...activeView.target).applyAxisAngle(yAxis,watch.carrier.rotation.y);
   observatory.update(skySeconds,{economy,focus:focusDetail});
   for(const [name,angle] of Object.entries(angles))watch.hands[name].rotation.y=-angle*Math.PI/180;
   const settling=settleCamera(delta,immediate);
   renderer.render(scene,camera);
   if(pendingFrame)context.deleteSync(pendingFrame);
   pendingFrame=context.fenceSync(context.SYNC_GPU_COMMANDS_COMPLETE,0);
   context.flush();
   stats.frames++;stats.triangles=renderer.info.render.triangles;stats.drawCalls=renderer.info.render.calls;
   samples++;cost+=performance.now()-start;
   if(paintInterval>.066&&paintInterval<.8)slowFrames++;
   if(samples===90){
    if(cost/samples>26||slowFrames>63){
     headroom=0;
     if(!economy)economy=true;
     else if(scale>.76){scale=Math.max(.76,scale-.08);applyResolution();}
    }else if(cost/samples<11&&slowFrames<5){
     if(++headroom===3){
      if(scale<1){scale=Math.min(1,scale+.08);applyResolution();}
      else economy=false;
      headroom=0;
     }
    }else headroom=0;
    stats.economy=economy;
    samples=0;cost=0;slowFrames=0;
   }
   return settling;
  },
  dispose(){
   if(pendingFrame)context.deleteSync(pendingFrame);
   observatory.dispose();reflection?.dispose();disposeScene(scene);renderer.dispose();
  }
 };
}
