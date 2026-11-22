/* Original, dependency-free WebGL rooftop. All dimensions are in world units.
 * Static geometry is packed once; only camera, lighting and one shuttle animate.
 */
const clamp = (x, a, b) => Math.max(a, Math.min(b,x));
const sub = (a,b)=>a.map((v,i)=>v-b[i]);
const add = (a,b)=>a.map((v,i)=>v+b[i]);
const scale = (a,s)=>a.map(v=>v*s);
const dot = (a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross = (a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit = a=>scale(a,1/(Math.hypot(...a)||1));
const hex = n=>[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];
const mix = (a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const random = seed => () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const matrix = (eye,target,aspect) => {
  const z=unit(sub(eye,target)), x=unit(cross([0,1,0],z)), y=cross(z,x);
  const v=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
  const f=1/Math.tan(44*Math.PI/360), near=.1, far=190;
  const p=[f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];
  const out=new Float32Array(16);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=p[k*4+r]*v[c*4+k];
  return out;
};
export const STATIONS = Object.freeze({
  arrival:{label:"01 / MY CAR",description:"hehe, look at my car XD",link:"#about",action:"Get to know me XD ↗",target:[0,.65,0],yaw:.66,pitch:.25,radius:10.6,marker:[0,1.8,0]},
  sofra:{label:"02 / SOFRA",description:"Her name is Sofra, my Discord Bot :3",link:"#sofra-project",action:"Meet Sofra ↗",target:[-6,1.4,-3.4],yaw:.43,pitch:.17,radius:7.3,marker:[-6,3.1,-3.4]},
  workshop:{label:"03 / LEARNING",description:"Things I am currently learning, mostly LuaU hehe.",link:"#learning",action:"What I'm learning ↗",target:[6,1.4,-3.4],yaw:-.43,pitch:.17,radius:7.3,marker:[6,3.1,-3.4]},
  roadmap:{label:"04 / MY GOALS",description:"My Goals for the next upcoming Months / Years.",link:"#goals",action:"See my Goals ↗",target:[0,1.5,-8],yaw:.26,pitch:.16,radius:8,marker:[0,4,-8]},
  relay:{label:"05 / CONTACT",description:"If you wanna talk to me go ahead hehe.",link:"#contact",action:"Contact me ↗",target:[7,1.4,4.5],yaw:.9,pitch:.24,radius:7.6,marker:[7,3,4.5]},
  gallery:{label:"06 / GALLERY",description:"Here are some of the games and stuff I've made xD",link:"Gallery.html",action:"My game Gallery ↗",target:[-7,1.4,4.5],yaw:-.9,pitch:.24,radius:7.6,marker:[-7,3,4.5]}
});
const makeBatch=()=>{
  const data=[];
  const tri=(a,b,c,color,material=0,normal)=>{
    const n=normal||unit(cross(sub(b,a),sub(c,a)));
    for(const p of [a,b,c])data.push(...p,...n,...color,material);
  };
  const quad=(a,b,c,d,color,material=0)=>{tri(a,b,c,color,material);tri(a,c,d,color,material);};
  const box=(x,y,z,w,h,d,color,material=0)=>{
    const a=[x-w/2,y-h/2,z-d/2],b=[x+w/2,y-h/2,z-d/2],c=[x+w/2,y+h/2,z-d/2],e=[x-w/2,y+h/2,z-d/2];
    const A=add(a,[0,0,d]),B=add(b,[0,0,d]),C=add(c,[0,0,d]),E=add(e,[0,0,d]);
    quad(b,a,e,c,color,material);quad(A,B,C,E,color,material);quad(a,A,E,e,color,material);quad(B,b,c,C,color,material);quad(e,E,C,c,color,material);quad(a,b,B,A,color,material);
  };
  // Sweep a sculpted body through cross sections, with bevelled shoulders.
  const loft=(sections,color,material)=>{
    const rings=sections.map(([z,w,y0,y1])=>[[-w*.82,y0,z],[w*.82,y0,z],[w,y0+(y1-y0)*.31,z],[w*.81,y1-(y1-y0)*.12,z],[w*.47,y1,z],[-w*.47,y1,z],[-w*.81,y1-(y1-y0)*.12,z],[-w,y0+(y1-y0)*.31,z]]);
    for(let i=0;i<rings.length-1;i++)for(let j=0;j<8;j++){const k=(j+1)%8;quad(rings[i][j],rings[i][k],rings[i+1][k],rings[i+1][j],color,material);}
    for(let j=1;j<7;j++){tri(rings[0][0],rings[0][j+1],rings[0][j],color,material);tri(rings.at(-1)[0],rings.at(-1)[j],rings.at(-1)[j+1],color,material);}
  };
  const cylinderX=(x,y,z,r,width,color,material=0,segments=32)=>{
    for(let i=0;i<segments;i++){
      const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;
      const p=[x-width/2,y+r*Math.cos(a),z+r*Math.sin(a)],q=[x-width/2,y+r*Math.cos(b),z+r*Math.sin(b)],P=add(p,[width,0,0]),Q=add(q,[width,0,0]);
      quad(p,q,Q,P,color,material);tri([x-width/2,y,z],q,p,color,material);tri([x+width/2,y,z],P,Q,color,material);
    }
  };
  const beam=(a,b,width,color,material=0)=>{
    const direction=unit(sub(b,a)),u=scale(unit(cross(direction,Math.abs(direction[1])>.9?[1,0,0]:[0,1,0])),width/2),v=scale(unit(cross(direction,u)),width/2);
    const corners=p=>[add(add(p,u),v),add(sub(p,u),v),sub(sub(p,u),v),add(sub(p,v),u)];
    const A=corners(a), B=corners(b);
    for(let j=0;j<4;j++)quad(A[j],A[(j+1)%4],B[(j+1)%4],B[j],color,material);
    quad(A[3],A[2],A[1],A[0],color,material);quad(...B,color,material);
  };
  return {data,tri,quad,box,loft,cylinderX,beam};
};
export function buildWorld(low=false){
  const solid=makeBatch(), lamps=makeBatch(), shuttle=makeBatch(), rng=random(74);
  const {box,quad,loft,cylinderX,beam}=solid;
  const dark=hex(0x25212f), concrete=hex(0x524958), metal=hex(0x9283a6), violet=hex(0xb195db), glass=hex(0x272838), silver=hex(0xc9bfd8), rubber=hex(0x25232c);
  // Flat observation deck, rendered with a procedural stone/seam/wet-surface shader.
  quad([-11,0,-12],[-11,0,11],[11,0,11],[11,0,-12],hex(0x57505e),2);
  box(0,-.34,-.5,22,.65,23,dark);
  for(const x of [-10.8,10.8]){
    box(x,.42,-.5,.28,.84,23,concrete);
    box(x,.9,-.5,.45,.11,23,metal);
    for(let z=-10;z<10;z+=3){box(x,1.24,z,.15,.65,.16,dark);box(x,1.57,z,.23,.1,.23,silver);}
    box(x,1.53,-.5,.085,.08,22,metal);
  }
  box(0,.4,-11.7,22,.8,.35,concrete);box(0,.85,-11.7,22,.11,.45,metal);
  for(const x of [-3.4,3.4]){lamps.box(x,.014,1,.045,.025,14,hex(0xa58bc8),3);}
  for(let z=-8;z<8;z+=2)box(-3.8,.013,z,.12,.02,.48,silver);
  // Distant massing. No individual meshes, asset downloads or per-tower animation.
  const rings=low?2:3;
  for(let ring=0;ring<rings;ring++){
    const count=low?26:43, distance=26+ring*17;
    for(let i=0;i<count;i++){
      const a=(i+rng()*.5)/count*Math.PI*2,rad=distance+rng()*9;
      const x=Math.cos(a)*rad,z=Math.sin(a)*rad,h=5+rng()*19,w=1.5+rng()*4,d=1.5+rng()*4,y=-10+h/2;
      const col=mix(hex(0x352b43),hex(0x65556c),ring/(rings+1));
      box(x,y,z,w,h,d,col);
      if(rng()>.37){box(x,y+h*.51,z,w*.6,.8,d*.62,dark);if(rng()>.5)box(x,y+h*.58,z,.12,1.8,.12,metal);}
      for(let k=0;k<Math.min(8,Math.floor(h/1.6));k++){
        const wy=y+h/2-1-k*1.5;
        if(rng()>.35)box(x,wy,z+d/2+.015,w*.64,.055,.025,hex(0x8f778f),1);
        if(rng()>.42)box(x+w/2+.015,wy,z,.025,.055,d*.64,hex(0x897595),1);
        if(!low&&rng()>.45)box(x,wy,z-d/2-.015,w*.43,.065,.025,hex(0xb19199),1);
      }
    }
  }
  // Two distinct exhibits. Their portal shapes and colours distinguish destinations.
  for(const [x,z,c] of [[-6,-3.4,hex(0xe5aecb)],[6,-3.4,violet],[7,4.5,hex(0xb2c9d9)],[-7,4.5,hex(0xd4c3ab)]]){
    box(x,.14,z,2.5,.28,2.2,dark);box(x,.32,z,2.35,.08,2.07,metal);
    for(const sign of [-1,1]){
      box(x+sign*1.02,1.53,z,.22,2.6,.42,concrete);
      box(x+sign*.88,1.5,z+.25,.065,2.3,.065,c,1);
      box(x+sign*.91,.57,z+.7,.14,.72,.14,metal);
    }
    box(x,2.86,z,2.38,.24,.5,concrete);
    box(x,2.83,z+.27,1.7,.07,.055,c,1);
    box(x,1.54,z-.18,1.53,1.54,.12,glass,4);
    for(let i=0;i<5;i++)box(x,1.09+i*.21,z-.10,.97-(i%3)*.19,.028,.02,c,1);
    box(x,.6,z+.46,1.10,.24,.35,dark);
    // Recessed indicator, visible at a distance.
    box(x,3.08,z,.32,.11,.21,c,1);
  }
  // Roadmap sculpture: stacked, offset monoliths and a single elevated strip.
  for(let i=0;i<4;i++){
    const x=(i-1.5)*.84,h=1.4+i*.64;
    box(x,h/2,-8,.57,h,.72,concrete);box(x,h-.13,-7.62,.43,.09,.055,violet,1);
  }
  beam([-1.7,3.78,-8],[1.7,3.78,-8],.11,metal);
  box(0,3.98,-8,.32,.15,.25,violet,1);
  // Car: independent body, cabin, aerodynamic skirts, wheels and running lights.
  loft([[-2.72,.87,.31,.69],[-2.24,1.17,.28,.86],[-1.55,1.19,.29,.88],[-.55,1.00,.27,.73],[.55,1.01,.27,.75],[1.48,1.18,.28,.85],[2.22,1.10,.26,.64],[2.70,.81,.27,.46]],metal,4);
  loft([[-1.57,.62,.72,.77],[-.78,.77,.72,1.29],[.12,.76,.72,1.34],[.82,.65,.70,1.11],[1.27,.46,.70,.76]],glass,4);
  for(const side of [-1,1]){
    box(side*1.015,.29,0,.15,.14,2.43,dark);
    beam([side*.70,1.08,.8],[side*.76,1.29,.12],.052,silver,4);
    beam([side*.76,1.29,.12],[side*.72,1.21,-.65],.052,silver,4);
    beam([side*.72,1.21,-.65],[side*.59,.80,-1.55],.052,silver,4);
    beam([side*.80,.53,1.28],[side*.89,.54,2.51],.035,silver,4);
    box(side*.94,.87,.56,.25,.085,.27,metal,4);
    for(const z of [-1.64,1.55]){
      const x=side*1.115;
      cylinderX(x,.43,z,.43,.36,rubber,0,low?20:40);
      cylinderX(side*1.307,.43,z,.30,.045,dark,4);
      cylinderX(side*1.337,.43,z,.24,.033,metal,4);
      for(let i=0;i<6;i++){const a=i*Math.PI/3;beam([side*1.359,.43,z],[side*1.359,.43+.245*Math.cos(a),z+.245*Math.sin(a)],.042,dark,4);}
      cylinderX(side*1.364,.43,z,.086,.06,silver,4);
    }
    lamps.beam([side*.22,.49,2.69],[side*.81,.54,2.63],.057,hex(0xeee1ff),3);
    lamps.beam([side*.81,.54,2.63],[side*1.03,.57,2.29],.045,hex(0xeee1ff),3);
    lamps.beam([side*.13,.67,-2.70],[side*.83,.68,-2.70],.053,hex(0xf08cae),3);
    box(side*.75,.26,-2.63,.40,.13,.32,dark);
  }
  box(0,.38,2.57,1.31,.15,.18,dark);box(0,.29,-2.52,1.58,.10,.35,dark);
  box(0,.95,-2.19,1.98,.08,.33,metal,4);
  for(const side of [-1,1])box(side*.65,.84,-2.19,.09,.21,.13,dark);
  // Tiny shuttle provides scale and quiet ambient motion.
  shuttle.loft([[-.9,.25,-.12,.1],[-.53,.45,-.16,.27],[.38,.44,-.15,.23],[.95,.18,-.10,.05]],metal,4);
  shuttle.box(0,-.10,-.84,.36,.06,.055,hex(0xf4b6da),1);
  return [solid.data,lamps.data,shuttle.data].map(a=>new Float32Array(a));
}
const VERT='attribute vec3 aPosition,aNormal,aColor;attribute float aMaterial;uniform mat4 uVP;uniform vec3 uOffset;varying vec3 vPosition,vNormal,vColor;varying float vMaterial;void main(){vPosition=aPosition+uOffset;vNormal=aNormal;vColor=aColor;vMaterial=aMaterial;gl_Position=uVP*vec4(vPosition,1.0);}';
const FRAG=[
'precision mediump float;varying vec3 vPosition,vNormal,vColor;varying float vMaterial;uniform vec3 uEye;uniform float uLights;',
'float hash(vec2 p){p=mod(p,64.);return fract(sin(dot(p,vec2(1.271,3.117)))*437.585); }',
'void main(){vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;vec3 view=normalize(uEye-vPosition);float sun=max(dot(n,normalize(vec3(-.5,.7,.4))),0.);float rim=pow(1.-max(dot(n,view),0.),3.);',
'vec3 col=vColor*(.43+.65*sun)+vec3(.075,.045,.12)*rim;',
'if(vMaterial>3.5){vec3 r=reflect(-view,n);float stripe=smoothstep(.1,.9,abs(r.y));float glint=pow(max(dot(r,normalize(vec3(-.5,.6,.6))),0.),15.);col=vColor*(.27+.57*stripe)+vec3(.48,.32,.57)*glint+rim*vec3(.15,.10,.19);}',
'if(vMaterial>.5&&vMaterial<1.5)col=vColor*.85;',
'if(vMaterial>2.5&&vMaterial<3.5)col=mix(vColor*.20,vColor*1.05,uLights);',
'if(vMaterial>1.5&&vMaterial<2.5){vec2 p=vPosition.xz;vec2 uv=abs(fract(p*.5+.5)-.5);float seam=step(.487,max(uv.x,uv.y));float grain=hash(floor(p*120.));float shadow=exp(-dot(p*vec2(.53,.29),p*vec2(.53,.29))*2.6);float puddle=pow(.5+.5*sin(p.x*.8+sin(p.y*.62)),3.);float lamp=exp(-abs(abs(p.x)-3.4)*3.)*uLights*max(0.,1.-abs(p.y)/8.);col=vec3(.125,.105,.155)+grain*.028+puddle*vec3(.045,.028,.065);col*=1.-shadow*.66;col*=1.-seam*.36;col+=lamp*vec3(.14,.075,.23);}',
'float d=length(uEye-vPosition);float fog=1.-exp(-max(0.,d-9.)*.023);vec3 haze=vec3(.37,.26,.39);col=mix(col,haze,fog*.87);gl_FragColor=vec4(clamp(col,0.,1.),1.);}'
].join('\n');
const SKYV='attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition;gl_Position=vec4(aPosition,0.,1.);}';
const SKYF=[
'precision mediump float;varying vec2 vUv;uniform vec3 uForward,uRight,uUp;uniform float uAspect;',
'float hash(vec2 a){a=mod(a,64.);return fract(sin(dot(a,vec2(4.17,2.891)))*437.585); }',
'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}',
'void main(){vec3 r=normalize(uForward+uRight*vUv.x*uAspect*.404+uUp*vUv.y*.404);float h=clamp(r.y+.12,0.,1.);vec3 col=mix(vec3(.56,.34,.44),vec3(.10,.075,.16),smoothstep(0.,.72,h));',
'vec3 sun=normalize(vec3(-.5,.12,-.8));float s=max(dot(r,sun),0.);col+=pow(s,35.)*vec3(.34,.18,.13)+pow(s,350.)*vec3(.34,.24,.19);',
'vec2 p=vec2(atan(r.z,r.x)*7.,r.y*28.);float cloud=noise(p)*.6+noise(p*2.2)*.27+noise(p*4.8)*.13;cloud=smoothstep(.49,.78,cloud)*smoothstep(-.05,.14,r.y)*(1.-smoothstep(.33,.75,r.y));col=mix(col,vec3(.25,.17,.30)+pow(s,12.)*.14,cloud*.64);gl_FragColor=vec4(col,1.);}'
].join('\n');
function program(gl,vs,fs){
  const shader=(kind,source)=>{const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(message);}return s;};
  const v=shader(gl.VERTEX_SHADER,vs),f=shader(gl.FRAGMENT_SHADER,fs),p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const message=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw Error(message);}return p;
}
const attr=(gl,p,name,size,stride,offset)=>{const a=gl.getAttribLocation(p,name);if(a>=0){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,stride,offset);}return a;};
const uniforms=(gl,p,names)=>Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(p,n)]));
export class TerminalRenderer{
  constructor(canvas,low=false){
    this.canvas=canvas;this.gl=canvas.getContext('webgl',{alpha:false,antialias:!low,depth:true,stencil:false,preserveDrawingBuffer:false,powerPreference:low?'low-power':'default'});
    if(!this.gl)throw Error('WebGL unavailable');
    const gl=this.gl;
    this.mesh=program(gl,VERT,FRAG);this.sky=program(gl,SKYV,SKYF);
    this.m=uniforms(gl,this.mesh,['uVP','uOffset','uEye','uLights']);this.s=uniforms(gl,this.sky,['uForward','uRight','uUp','uAspect']);
    const buffer=arr=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);return {b,count:arr.length/10};};
    this.batches=buildWorld(low).map(buffer);this.screen=buffer(new Float32Array([-1,-1,3,-1,-1,3]));
    this.lastMatrix=null;this.eye=[0,0,0];this.limit=low?1:1.65;this.ratio=this.limit;this.destroyed=false;
    gl.disable(gl.CULL_FACE);
  }
  resize(){
    const c=this.canvas,ratio=Math.min(this.ratio,window.devicePixelRatio||1);
    const resolution=Math.min(ratio,1800/Math.max(1,c.clientWidth),1400/Math.max(1,c.clientHeight));
    const w=Math.max(1,Math.round(c.clientWidth*resolution)),h=Math.max(1,Math.round(c.clientHeight*resolution));
    if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
    this.gl.viewport(0,0,c.width,c.height);
  }
  draw(view,lights,time){
    if(this.destroyed)return;
    const gl=this.gl,c=this.canvas;this.resize();
    const {target,yaw,pitch,radius}=view;
    const eye=add(target,[Math.sin(yaw)*Math.cos(pitch)*radius,Math.sin(pitch)*radius,Math.cos(yaw)*Math.cos(pitch)*radius]);
    this.eye=eye;const forward=unit(sub(target,eye)),right=unit(cross(forward,[0,1,0])),up=cross(right,forward),aspect=c.width/c.height;
    const vp=matrix(eye,target,aspect);this.lastMatrix=vp;
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.sky);gl.bindBuffer(gl.ARRAY_BUFFER,this.screen.b);const a=attr(gl,this.sky,'aPosition',2,0,0);
    gl.uniform3fv(this.s.uForward,forward);gl.uniform3fv(this.s.uRight,right);gl.uniform3fv(this.s.uUp,up);gl.uniform1f(this.s.uAspect,aspect);
    gl.drawArrays(gl.TRIANGLES,0,3);gl.disableVertexAttribArray(a);
    gl.enable(gl.DEPTH_TEST);gl.useProgram(this.mesh);gl.uniformMatrix4fv(this.m.uVP,false,vp);gl.uniform3fv(this.m.uEye,eye);gl.uniform1f(this.m.uLights,lights?1:0);
    for(let i=0;i<this.batches.length;i++){
      const {b,count}=this.batches[i];gl.bindBuffer(gl.ARRAY_BUFFER,b);
      attr(gl,this.mesh,'aPosition',3,40,0);attr(gl,this.mesh,'aNormal',3,40,12);attr(gl,this.mesh,'aColor',3,40,24);attr(gl,this.mesh,'aMaterial',1,40,36);
      gl.uniform3fv(this.m.uOffset,i===2?[Math.sin(time*.09)*21,7+Math.sin(time*.4)*.3,-18+Math.cos(time*.09)*5]:[0,0,0]);
      gl.drawArrays(gl.TRIANGLES,0,count);
    }
    for(const n of ['aPosition','aNormal','aColor','aMaterial'])gl.disableVertexAttribArray(gl.getAttribLocation(this.mesh,n));
  }
  project(p){
    const m=this.lastMatrix;if(!m)return null;
    const [x,y,z]=p,w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<.1)return null;
    const u=(m[0]*x+m[4]*y+m[8]*z+m[12])/w,v=(m[1]*x+m[5]*y+m[9]*z+m[13])/w;
    if(Math.abs(u)>1||Math.abs(v)>1)return null;
    return [(u*.5+.5)*this.canvas.clientWidth,(.5-v*.5)*this.canvas.clientHeight];
  }
  dispose(){
    if(this.destroyed)return;this.destroyed=true;const gl=this.gl;
    for(const {b} of [...this.batches,this.screen])gl.deleteBuffer(b);
    gl.deleteProgram(this.mesh);gl.deleteProgram(this.sky);
  }
}
export function copyView(v){return {target:v.target.slice(),yaw:v.yaw,pitch:v.pitch,radius:v.radius};}
export function blendView(current,goal,dt,instant=false){
  if(instant){Object.assign(current,copyView(goal));return 0;}
  const t=1-Math.exp(-Math.max(0,dt)*5.2);
  current.target=mix(current.target,goal.target,t);
  for(const k of ['yaw','pitch','radius'])current[k]+=(goal[k]-current[k])*t;
  return Math.abs(current.yaw-goal.yaw)+Math.abs(current.pitch-goal.pitch)+Math.abs(current.radius-goal.radius)+Math.hypot(...sub(current.target,goal.target));
}
