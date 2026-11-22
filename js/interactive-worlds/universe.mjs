import {clamp,seeded,radial,label} from './draw.mjs';
// Original artistic approximation, not a numerical general relativity simulation.
const vertex='attribute vec2 a; void main(){gl_Position=vec4(a,0.,1.);}';
const fragment="\nprecision mediump float;\nuniform vec2 res;\nuniform float time, yaw, pitch, zoom, strength, mode;\nfloat hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}\nfloat fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=noise(p)*a;p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return n;}\nmat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}\nfloat stars(vec2 p,float s){vec2 q=p*s,id=floor(q),f=fract(q)-.5;float h=hash(id);vec2 c=vec2(hash(id+4.3),hash(id+9.7))*.65-.325;return (1.-smoothstep(.015,.10,length(f-c)))*step(.94,h)*(.6+.4*sin(time*.8+h*100.));}\nvoid main(){\n vec2 p=(gl_FragCoord.xy-res*.5)/res.y;\n p=rot(yaw*.55)*p/zoom;\n float r=length(p);\n vec2 d=p+vec2(yaw*.11,pitch*.14);\n if(mode<.5){\n  // Bend background coordinates around an artistic event horizon.\n  d+=normalize(p+vec2(.0001))*strength*.024/max(r,.055);\n }\n float cloud=fbm(d*3.+vec2(.32,-.2));float band=exp(-abs(d.y+.3*sin(d.x*2.))*5.);\n vec3 col=vec3(.014,.012,.038)+vec3(.13,.055,.22)*cloud*band+vec3(.025,.032,.083)*fbm(d*7.);\n float st=stars(d,85.)+stars(d+9.,170.)*.65;col+=vec3(.69,.75,1.)*st;\n if(mode<.5){\n  float tilt=clamp(.29+pitch*.2,.14,.65);vec2 q=rot(-.23)*p;vec2 disk=vec2(q.x,q.y/tilt);float rr=length(disk),a=atan(disk.y,disk.x);\n  float inner=.16,outer=.54;\n  float mask=smoothstep(inner,inner+.024,rr)*(1.-smoothstep(outer-.07,outer,rr));\n  float spiral=fbm(vec2(a*3.+time*.42,rr*28.-a*1.6));\n  float strands=.55+.45*sin(rr*115.+a*.8+spiral*5.);\n  vec3 hot=mix(vec3(.37,.15,.8),vec3(1.,.62,.31),exp(-abs(rr-.24)*7.));\n  vec3 emission=hot*mask*(.30+.9*spiral)*(.55+.45*strands)*(1.+.4*cos(a)) ;\n  float halo=exp(-abs(r-.139)*38.)*.38;\n  col+=vec3(.55,.28,1.)*halo;\n  if(r>.112)col+=emission;\n  else col=vec3(.003,.002,.008);\n  float ring=exp(-abs(r-.125)*115.);col+=vec3(1.,.68,.83)*ring*.72*strength;\n  // Foreground disk is in front of the silhouette.\n  if(q.y<0.&&rr>inner)col+=emission*.75;\n  float glow=exp(-abs(q.y)*23.)*exp(-abs(abs(q.x)-.26)*10.);\n  col+=vec3(.34,.12,.46)*glow*.22;\n }else if(mode<1.5){\n  vec2 q=rot(.2)*p;float pr=.25;\n  float atmosphere=exp(-abs(r-pr)*65.);\n  col+=vec3(.32,.62,.97)*atmosphere*.48;\n  if(r<pr){float z=sqrt(max(0.,1.-r*r/(pr*pr)));vec3 n=vec3(p/pr,z);float light=max(.10,dot(n,normalize(vec3(-.7,.5,.9))));float stripe=sin(q.y*94.+fbm(vec2(q.x*15.+time*.15,q.y*30.))*3.);vec3 gas=mix(vec3(.29,.20,.51),vec3(.97,.67,.46),.5+.5*stripe);col=gas*light+vec3(.07,.16,.28)*pow(1.-z,3.);}\n  vec2 ringp=vec2(q.x,q.y/.31);float rr=length(ringp);float rings=smoothstep(.31,.33,rr)*(1.-smoothstep(.46,.48,rr))*(.35+.65*pow(sin(rr*155.),2.));if(r>pr||q.y<0.)col=mix(col,vec3(.8,.63,.9),rings*.65);\n }else{\n  vec2 q=rot(yaw*.6)*p;float f=fbm(q*6.+time*.035);float knot=fbm(q*11.+f*2.);float neb=pow(max(0.,f+.4*knot-.3),2.)*exp(-r*r*2.);col+=mix(vec3(.18,.06,.66),vec3(.97,.25,.45),knot)*neb*2.;col+=vec3(.06,.32,.46)*pow(knot,3.)*.7;\n }\n col=1.-exp(-col*1.55);gl_FragColor=vec4(col,1.);\n}";

export function mount(api){
 let yaw=.12,pitch=.0,zoom=1,strength=1,speed=1,mode=0;
 const names=['Black hole','Ringed gas giant','Nebula'];
 let c=api.canvas(800,500),gl=null,program=null,buffer=null,uniforms={},ctx=null,resources=[],lost=false;
 function resetCanvas(){c=api.canvas(800,500);ctx=c.getContext('2d',{alpha:false});if(!ctx)throw Error('Canvas unavailable')}
 function setup(){
  try{
   gl=c.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:false});if(!gl)throw Error('WebGL unavailable');
   function compile(type,source){const s=gl.createShader(type);resources.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
   program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
   gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
   const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
   for(const key of ['res','time','yaw','pitch','zoom','strength','mode'])uniforms[key]=gl.getUniformLocation(program,key);
  }catch{disposeGL();gl=null;resetCanvas();}
 }
 function disposeGL(){if(gl){if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);for(const s of resources)gl.deleteShader(s)}resources=[]}
 setup();
 const stars=Array.from({length:320},(_,i)=>{const r=seeded(i+89);return [r(),r(),r()]});
 api.select('Celestial view',names.map((name,i)=>[String(i),name]),v=>visit(+v));
 api.button('Discover this view',()=>visit(mode));
 function visit(i){mode=i;api.discover('view-'+i,names[i]+' discovered. '+(i===0?'A stylized light-bending simulation.':i===1?'A banded planet and dusty rings.':'A cloud of glowing cosmic dust.'))}
 const zoomControl=api.range('Zoom',.65,2.3,zoom,.05,v=>zoom=v);
 api.range('Lensing',.3,1.6,strength,.1,v=>strength=v);
 api.range('Speed',0,2,speed,.1,v=>speed=v);
 api.drag(c,(dx,dy)=>{yaw+=dx/c.width*2;pitch=clamp(pitch+dy/c.height*2,-1.2,1.2)});
 c.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom-e.deltaY*.001,.65,2.3);zoomControl.value=zoom;api.invalidate()},{passive:false});
 c.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;api.say('Graphics context paused. Reset world to restart rendering.')});
 c.addEventListener('webglcontextrestored',()=>{lost=false;setup();resize();api.invalidate()});
 function resize(){const w={Low:480,Medium:800,High:1200}[api.tier()]||800;c.width=w;c.height=Math.round(w/1.6);if(gl&&!lost)gl.viewport(0,0,c.width,c.height)}
 function draw(dt,t){
  if(gl&&!lost){gl.useProgram(program);gl.uniform2f(uniforms.res,c.width,c.height);for(const [key,value] of Object.entries({time:t*speed,yaw,pitch,zoom,strength,mode}))gl.uniform1f(uniforms[key],value);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);return}
  if(!ctx)return;
  const w=c.width,h=c.height;ctx.fillStyle='#080817';ctx.fillRect(0,0,w,h);ctx.fillStyle=radial(ctx,w*.48,h*.45,w*.55,[[0,'#43205f'],[.5,'#201635'],[1,'#080817']]);ctx.fillRect(0,0,w,h);
  for(const [a,b,s] of stars){let x=((a+yaw*.04)%1+1)%1*w,y=((b+pitch*.04)%1+1)%1*h;ctx.globalAlpha=.35+s*.65;ctx.fillStyle='#e4d9ff';ctx.fillRect(x,y,1+s*1.3,1+s*1.3)}ctx.globalAlpha=1;
  const r=h*.19*zoom;ctx.save();ctx.translate(w/2,h/2);ctx.rotate(-.18+yaw*.28);
  if(mode===0){
   ctx.strokeStyle='#7648c555';ctx.lineWidth=r*.58;ctx.beginPath();ctx.ellipse(0,0,r*2.2,r*.68,0,0,Math.PI*2);ctx.stroke();
   for(let i=0;i<20;i++){ctx.strokeStyle=i%3===0?'#ffd4b1':'#ba8cde';ctx.globalAlpha=.25+i*.018;ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(0,0,r*(1.2+i*.055),r*(.28+i*.017),0,t*speed*.08+i*.4,t*speed*.08+i*.4+Math.PI*1.2);ctx.stroke()}
   ctx.globalAlpha=1;ctx.fillStyle='#05030d';ctx.beginPath();ctx.arc(0,0,r*.68,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f6bcec';ctx.lineWidth=2;ctx.stroke();
   ctx.strokeStyle='#f2be95';ctx.beginPath();ctx.ellipse(0,0,r*1.85,r*.52,0,0,Math.PI);ctx.stroke();
  }else if(mode===1){ctx.fillStyle=radial(ctx,-r*.4,-r*.4,r*1.7,[[0,'#f4cc9e'],[.7,'#a47baf'],[1,'#313050']]);ctx.beginPath();ctx.arc(0,0,r*1.35,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d2b3e2';ctx.lineWidth=r*.14;ctx.beginPath();ctx.ellipse(0,0,r*2.15,r*.7,0,0,Math.PI);ctx.stroke()}
  else{for(let i=0;i<12;i++){const a=i*.54+t*.02*speed;let x=Math.cos(a)*r*.8,y=Math.sin(a)*r*.6;ctx.fillStyle=radial(ctx,x,y,r*1.5,[[0,i%2?'#d46da65a':'#8069ee65'],[1,'#00000000']]);ctx.fillRect(x-r*1.5,y-r*1.5,r*3,r*3)}}ctx.restore();
  label(ctx,'CANVAS COMPATIBILITY MODE',12,22,'#c8b5ea',12);
 }
 return {draw,resize,dispose:disposeGL};
}
