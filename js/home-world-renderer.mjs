import { COLLECTION, collectibleAt, buildCar, buildEnvironment, ambientOffset } from './home-collectibles.mjs';
export { COLLECTION, collectibleAt };
/* Procedural scenes are packed by material pass, one collectible at a time. */
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
    for(const [i,p] of [a,b,c].entries())data.push(...p,...(Array.isArray(n[0])?n[i]:n),...color,material);
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
export function buildWorld(low=false,index=0){
  const selected=collectibleAt(index);index=selected.index;
  const solid=makeBatch(), lamps=makeBatch(), shuttle=makeBatch(), rng=random(74);
  const {box,quad,loft,cylinderX,beam}=solid;
  const dark=hex(0x25212f), concrete=index===0?hex(0x524958):mix(hex(selected.ground),hex(0xa6a4ad),.30), metal=index===0?hex(0x9283a6):mix(hex(selected.paint),hex(0xb4b6be),.42), violet=hex(selected.neon), glass=hex(0x272838), silver=hex(0xc9bfd8);
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
  for(const x of [-3.4,3.4]){lamps.box(x,.014,1,.045,.025,14,hex(selected.neon),3);}
  for(let z=-8;z<8;z+=2)box(-3.8,.013,z,.12,.02,.48,silver);
  if(index===0){
  // Late-night Japanese electronics district. Signs are hand-drawn stroke
  // geometry (actual short Japanese words), no fonts/texture requests.
  const glyphs={
    'ネ':[[2,1,5,2],[1,4,7,4],[7,4,2,8],[4,6,4,10],[5,6,8,9]],
    'オ':[[1,4,8,4],[6,1,6,10],[6,5,1,9]],
    'ン':[[1,3,3,5],[2,8,5,7],[5,7,8,3]],
    'ゲ':[[3,1,1,5],[2,4,8,4],[6,4,5,8],[5,8,3,10],[6,1,7,2],[8,1,9,2]],
    'ー':[[1,5,8,5]],
    'ム':[[4,1,1,8],[1,8,8,7],[6,5,8,10]],
    '光':[[4.5,1,4.5,4],[1,2,3,3],[8,2,6,3],[1,5,8,5],[3,5,3,7],[3,7,1,10],[6,5,6,9],[6,9,8,9],[8,9,8,7]],
    '夜':[[4,1,5,2],[1,3,8,3],[3,3,1,7],[2,6,2,10],[6,4,4,7],[6,4,8,4],[8,4,6,8],[5,6,8,10],[6,8,4,10]],
    '電':[[1,1,8,1],[2,3,7,3],[1,3,1,5],[8,3,8,5],[4.5,1,4.5,5],[2,4,3,4],[6,4,7,4],[2,6,7,6],[2,6,2,9],[7,6,7,9],[2,9,7,9],[2,7.5,7,7.5],[4.5,6,4.5,10],[4.5,10,8,10]],
    '気':[[3,1,1,4],[3,2,8,2],[3,4,7,4],[1,6,7,6],[7,6,7,9],[7,9,8,10],[8,10,9,8],[2,7,5,10],[5,7,2,10]],
    '入':[[3,1,5,2],[5,2,7,8],[7,8,9,10],[5,3,3,7],[3,7,1,10]],
    '口':[[2,2,7,2],[2,2,2,9],[7,2,7,9],[2,9,7,9]],
    '店':[[4,1,5,2],[2,3,8,3],[2,3,2,7],[2,7,1,10],[5,4,5,7],[5,5,8,5],[4,7,8,7],[4,7,4,10],[8,7,8,10],[4,10,8,10]]
  };
  const neonColors=[hex(0xff57b1),hex(0x55e9ff),hex(0xc1a2ff),hex(0xffb76b),hex(0x91b9ff)];
  const sign=(x,y,z,w,h,side,word,color,vertical=true)=>{
    // Front faces point inward, toward the roof. Geometry remains batched.
    const axis=side[0]!==0,sgn=axis?side[0]:side[1];
    const point=(u,v,offset)=>axis?[x+sgn*offset,y+v,z+sgn*u]:[x-sgn*u,y+v,z+sgn*offset];
    const panel=(u0,v0,u1,v1,off,c,m)=>quad(point(u0,v0,off),point(u1,v0,off),point(u1,v1,off),point(u0,v1,off),c,m);
    box(x,y,z,axis?.20:w,h,axis?w:.20,hex(0x1c142b));
    panel(-w/2,-h/2,w/2,h/2,.111,mix(hex(0x160d25),color,.13),0);
    // Offset strokes to the outside face; panel face sits at .111.
    const line=(a,b,c,d,width,col)=>{const len=Math.hypot(c-a,d-b)||1,du=-(d-b)/len*width/2,dv=(c-a)/len*width/2;
      quad(point(a+du,b+dv,.135),point(a-du,b-dv,.135),point(c-du,d-dv,.135),point(c+du,d+dv,.135),col,5);};
    const edge=Math.min(w,h)*.055, bw=w/2-edge,bh=h/2-edge;
    line(-bw,-bh,bw,-bh,edge*.55,color);line(-bw,bh,bw,bh,edge*.55,color);
    line(-bw,-bh,-bw,bh,edge*.55,color);line(bw,-bh,bw,bh,edge*.55,color);
    const chars=Array.from(word);
    chars.forEach((ch,i)=>{
      const cellW=vertical?w*.70:w*.86/chars.length,cellH=vertical?h*.85/chars.length:h*.70;
      const size=Math.min(cellW/9,cellH/10),cx=vertical?0:-w*.43+cellW*(i+.5),cy=vertical?h*.425-cellH*(i+.5):0;
      const ink=mix(color,hex(0xffffff),.30);
      for(const [a,b,c,d] of glyphs[ch]||[])line(cx+(a-4.5)*size,cy+(5.5-b)*size,cx+(c-4.5)*size,cy+(5.5-d)*size,size*.75,ink);
    });
  };
  const rings=low?2:3;
  for(let ring=0;ring<rings;ring++){
    const count=low?[24,29][ring]:[31,35,38][ring],distance=ring===0?19:30+ring*15;
    for(let i=0;i<count;i++){
      const a=(i+rng()*.38)/count*Math.PI*2,rad=distance+rng()*8;
      const x=Math.cos(a)*rad,z=Math.sin(a)*rad;
      const h=ring===0?15+rng()*23:11+rng()*33,w=2.2+rng()*3.7,d=2.4+rng()*4.2,y=-10+h/2,top=y+h/2;
      const col=mix(hex(0x242137),hex(0x4a3559),ring/(rings+1));
      box(x,y,z,w,h,d,col,6);
      // Cornices, service cores, roof equipment, vertical ribs.
      box(x,top+.16,z,w+.16,.32,d+.16,hex(0x433751),0);
      box(x,top+.7,z,w*.57,1.2,d*.62,hex(0x292339),6);
      if(rng()>.55){box(x-w*.18,top+1.8,z,.105,3,.105,metal);box(x-w*.18,top+3.32,z,.18,.16,.18,neonColors[0],5);}
      if(ring===0){
        for(const s of [-1,1]){
          box(x+s*(w/2-.08),y,z+d/2+.045,.09,h,.10,hex(0x51425c));
          box(x+w/2+.045,y,z+s*(d/2-.08),.10,h,.09,hex(0x51425c));
          // Narrow horizontal floor breaks; windows are procedural in the shader.
          for(let k=1;k<=2;k++){const yy=-10+h*k/3;box(x,yy,z,w+.11,.11,d+.11,hex(0x332d48));}
        }
        const axis=Math.abs(x)>Math.abs(z),side=axis?[-Math.sign(x),0]:[0,-Math.sign(z)],col=neonColors[i%neonColors.length];
        if(i%3!==2){
          const fx=axis?x+side[0]*(w/2+.29):x+w*.18,fz=axis?z+d*.17:z+side[1]*(d/2+.29);
          const words=['ネオン','ゲーム','電気','夜','入口','光','店'];
          const height=Math.min(8.6,h*.46),sy=Math.max(3,top-height*.56);
          sign(fx,sy,fz,Math.min(1.72,(axis?d:w)*.45),height,side,words[i%words.length],col,true);
        }
        if(i%5===0){
          const fx=axis?x+side[0]*(w/2+.30):x,fz=axis?z:z+side[1]*(d/2+.30);
          sign(fx,Math.max(1,top-10),fz,Math.min(3.4,(axis?d:w)*.83),1.5,side,'ネオン',neonColors[(i+2)%5],false);
        }
        if(i%4===1){
          const fx=axis?x+side[0]*(w/2+.18):x-w*.34,fz=axis?z-d*.33:z+side[1]*(d/2+.18);
          box(fx,y+h*.17,fz,axis?.09:.075,h*.64,axis?.075:.09,col,5);
        }
      }
    }
  }
  }else buildEnvironment(solid,lamps,shuttle,index,low);
  // Rooftop utility details, kept out of the station/car footprint.
  for(const side of [-1,1]){
    for(const z of [-9.5,-5.7,2.7,8.8]){
      box(side*9.9,.29,z,.95,.58,.96,hex(0x343044),7);
      box(side*9.9,.61,z,1.02,.10,1.02,metal,4);
      for(let k=0;k<5;k++)box(side*9.9,.67,z-.32+k*.16,.78,.04,.065,dark);
      box(side*9.9,.36,z+.49,.28,.10,.025,hex(0xb3a2df),5);
    }
    for(let z=-10;z<=10;z+=2.5)box(side*10.6,.82,z,.12,.06,.32,hex(0x9d78ca),5);
    beam([side*10.5,.18,-10],[side*10.5,.18,10],.045,hex(0x5a506f));
    beam([side*10.35,.24,-10],[side*10.35,.24,10],.035,hex(0x786386));
  }
  for(let x=-8;x<=8;x+=4){box(x,.025,-10.9,2.1,.025,.12,hex(0x9a7aaf),5);}
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
  buildCar(solid,lamps,index);
  if(index===0){
    shuttle.loft([[-.9,.25,-.12,.1],[-.53,.45,-.16,.27],[.38,.44,-.15,.23],[.95,.18,-.10,.05]],metal,4);
    shuttle.box(0,-.10,-.84,.36,.06,.055,hex(0xf4b6da),1);
  }
  return [solid.data,lamps.data,shuttle.data].map(a=>new Float32Array(a));
}
const VERT='attribute vec3 aPosition,aNormal,aColor;attribute float aMaterial;uniform mat4 uVP;uniform vec3 uOffset;varying vec3 vPosition,vNormal,vColor;varying float vMaterial;void main(){vPosition=aPosition+uOffset;vNormal=aNormal;vColor=aColor;vMaterial=aMaterial;gl_Position=uVP*vec4(vPosition,1.0);}';
const FRAG=[
'precision mediump float;varying vec3 vPosition,vNormal,vColor;varying float vMaterial;uniform vec3 uEye,uHaze,uGround,uAccent;uniform float uLights,uReflectPass,uReflectionEnabled,uWet,uWorld,uTime;uniform vec2 uViewport;uniform sampler2D uReflection;',
'float hash(vec2 p){p=mod(p,64.);return fract(sin(dot(p,vec2(1.271,3.117)))*437.585);}',
// Analytic environment lobe: soft studio panels and a world-colored horizon.
'vec3 studio(vec3 r,float rough){float spread=.025+rough*.34;float panel=(1.-smoothstep(.06,.06+spread,abs(r.x+.30)))*smoothstep(.08,.65,r.y);float kicker=pow(max(dot(r,normalize(vec3(.63,.37,-.49))),0.),mix(54.,6.,rough));float sky=smoothstep(-.28,.68,r.y);return mix(vec3(.022,.018,.026),vec3(.26,.30,.38),sky)+vec3(1.,.91,.83)*panel*.95+mix(vec3(.62,.74,1.),pow(uAccent,vec3(2.2)),.52)*kicker*.75;}',
'vec3 schlick(vec3 f0,float angle){return f0+(1.-f0)*pow(1.-clamp(angle,0.,1.),5.);}',
'float ggx(float nh,float nv,float nl,float rough){float a2=pow(rough,4.);float nd=nh*nh*(a2-1.)+1.;float lv=nl*sqrt(nv*nv*(1.-a2)+a2);float ll=nv*sqrt(nl*nl*(1.-a2)+a2);return a2/(max(.001,3.14159*nd*nd)*max(.001,2.*(lv+ll)));}',
'void main(){if(uReflectPass>.5&&vPosition.y<.025)discard;vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;vec3 view=normalize(uEye-vPosition);float sun=max(dot(n,normalize(vec3(-.5,.7,.4))),0.);float rim=pow(1.-max(dot(n,view),0.),3.);',
'float normalVariation=0.;float m=vMaterial;vec3 col=vColor*(.27+.56*sun)+vec3(.058,.035,.095)*rim;',
'if(m>3.5&&m<4.5){vec3 r=reflect(-view,n);float stripe=smoothstep(.05,.82,abs(r.y));float band=pow(.5+.5*cos(r.z*17.+r.x*5.),14.);float glint=pow(max(dot(r,normalize(vec3(-.5,.6,.6))),0.),22.);float sky=pow(max(r.y,0.),.6);col=vColor*(.20+.50*stripe)+vec3(.31,.24,.44)*glint+uAccent*band*.19+sky*vec3(.10,.12,.22)+rim*vec3(.13,.09,.21);}',
'if(m>6.5&&m<7.5){vec3 r=reflect(-view,n);float line=pow(.5+.5*cos(r.x*13.+r.z*5.),22.);col=vColor*.18+vec3(.045,.055,.10)+vec3(.18,.12,.32)*line+rim*vec3(.17,.11,.25);}',
// IDs 7–13 are glass, rubber, paint, polished alloy, brake/caliper,
// brushed rotor and satin carbon. Paint adds a separate dielectric clearcoat.
'if(m>6.5){vec3 base=pow(vColor,vec3(2.2));bool glazing=m<7.5;bool tire=m>7.5&&m<8.5;bool paint=m>8.5&&m<9.5;bool alloy=m>9.5&&m<10.5;bool rotor=m>11.5&&m<12.5;bool carbon=m>12.5;',
'float rough=glazing?.19:tire?.80:paint?.31:alloy?.25:rotor?.48:carbon?.58:.45;float metal=paint?.39:alloy?.86:rotor?.72:0.;rough=sqrt(min(1.,rough*rough+min(.23,normalVariation*.9)));',
'vec3 L=normalize(vec3(-.43,.73,.50)),H=normalize(L+view),R=reflect(-view,n);float nv=max(.04,dot(n,view)),nl=max(0.,dot(n,L)),nh=max(0.,dot(n,H));vec3 f0=mix(vec3(glazing?.065:.04),base,metal);vec3 f=schlick(f0,nv);',
'vec3 diffuse=base*(1.-metal)*(1.-f)*(.24+.74*nl+max(n.y,0.)*.24);vec3 energy=diffuse+studio(R,rough)*f*.84+schlick(f0,dot(view,H))*min(1.1,ggx(nh,nv,nl,rough)*nl)*.35;',
'if(paint){float coat=sqrt(.035+min(.22,normalVariation*.85));vec3 cf=schlick(vec3(.048),nv);energy=energy*(1.-cf)+studio(R,coat)*cf*.96;}if(glazing)energy=base*.24+studio(R,.16)*f*.66+vec3(.008,.010,.013);',
'if(tire)energy=base*(.22+.82*nl+.42*max(n.y,0.))+vec3(.0025)+studio(R,rough)*f*.034;',
'if(carbon)energy=base*(.43+.68*nl)+studio(R,rough)*f*.20+vec3(.0013);',
'col=pow(max(vec3(0.),energy/(1.+energy*.36)),vec3(1./2.2));}',
'if(m>.5&&m<1.5)col=vColor*.85;',
'if(m>2.5&&m<3.5)col=mix(vColor*.15,vColor*1.28,uLights);',
'if(m>4.5&&m<5.5)col=vColor*1.35;',
'if(m>5.5&&m<6.5){float side=abs(n.x)>.5?vPosition.z:vPosition.x;vec2 f=vec2(side*1.30,vPosition.y*.83);vec2 cell=floor(f),uv=fract(f);float seed=hash(cell+floor(vPosition.xz*.17)*.31);float win=smoothstep(.15,.20,uv.x)*(1.-smoothstep(.73,.79,uv.x))*smoothstep(.20,.25,uv.y)*(1.-smoothstep(.69,.75,uv.y));float lit=step(.51,seed);vec3 glow=mix(vec3(.33,.12,.28),vec3(.12,.45,.54),step(.75,seed));glow=mix(glow,vec3(.65,.41,.22),step(.91,seed));float rib=smoothstep(.90,.97,uv.x);col=vColor*(.31+.36*sun)+rib*vec3(.022,.017,.035)+win*mix(vec3(.018,.022,.04),glow,lit);if(abs(n.y)>.5)col=vColor*.39;}',
'if(m>1.5&&m<2.5){vec2 p=vPosition.xz;vec2 uv=abs(fract(p*.5+.5)-.5);float seam=smoothstep(.476,.496,max(uv.x,uv.y));float grain=hash(floor(p*15.));float contact=0.;for(int i=0;i<4;i++){vec2 anchor=vec2(i<2?-1.10:1.10,mod(float(i),2.)<.5?-1.62:1.54);vec2 tire=(p-anchor)*vec2(7.,5.);contact+=exp(-dot(tire,tire));}float shadow=exp(-dot(p*vec2(.53,.29),p*vec2(.53,.29))*2.8);float puddle=smoothstep(.28,.76,.5+.5*sin(p.x*.8+sin(p.y*.62)));float lamp=exp(-abs(abs(p.x)-3.4)*3.)*uLights*max(0.,1.-abs(p.y)/8.);col=uGround*.60+grain*.012+puddle*uAccent*.025;col*=1.-shadow*.68;col*=1.-contact*.51;col*=1.-seam*.36;col+=lamp*uAccent*.22;if(uWorld>5.5&&uWorld<6.5){float vein=pow(.5+.5*sin(p.x*1.8+p.y*.5+sin(p.y*2.)*1.8),18.);col+=vein*vec3(.10,.073,.04);}if(uWorld>3.5&&uWorld<4.5){float caustic=pow(.5+.5*sin(p.x*2.2+sin(p.y*1.9+uTime*.7)),7.);col+=uAccent*caustic*.06;}',
'if(uReflectionEnabled>.5){vec2 rc=gl_FragCoord.xy/uViewport;rc.y=1.-rc.y;float ripple=sin(p.y*14.+p.x*6.)*.0013*uWet;rc.x+=ripple;vec3 reflectCol=texture2D(uReflection,clamp(rc,vec2(.002),vec2(.998))).rgb;float fresnel=pow(1.-max(dot(n,view),0.),1.8);float wet=uWet*(.17+.50*fresnel)*(.64+.36*puddle)*(1.-seam*.7)*(1.-shadow*.72);col=mix(col,reflectCol,wet);}}',
'float d=length(uEye-vPosition);float fog=1.-exp(-max(0.,d-10.)*.018);col=mix(col,uHaze,fog*.77);gl_FragColor=vec4(clamp(col,0.,1.),1.);}'
].join('\n');
const SKYV='attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition;gl_Position=vec4(aPosition,0.,1.);}';
const SKYF=[
'precision mediump float;varying vec2 vUv;uniform vec3 uForward,uRight,uUp,uSkyTop,uHorizon,uSkyAccent;uniform float uAspect,uWorld,uTime;',
'float hash(vec2 a){a=mod(a,64.);return fract(sin(dot(a,vec2(4.17,2.891)))*437.585); }',
'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}',
'void main(){vec3 r=normalize(uForward+uRight*vUv.x*uAspect*.404+uUp*vUv.y*.404);float h=clamp(r.y+.12,0.,1.);vec3 col=mix(uHorizon,uSkyTop,smoothstep(0.,.58,h));',
'vec3 sun=normalize(vec3(-.5,.12,-.8));float s=max(dot(r,sun),0.);col+=pow(s,20.)*uSkyAccent*.15+pow(s,250.)*uSkyAccent*.18;',
'vec2 p=vec2(atan(r.z,r.x)*7.+uTime*.012,r.y*28.);float cloud=noise(p)*.6+noise(p*2.2)*.27+noise(p*4.8)*.13;cloud=smoothstep(.49,.78,cloud)*smoothstep(-.05,.14,r.y)*(1.-smoothstep(.33,.75,r.y));col=mix(col,mix(uSkyTop,uHorizon,.40)+pow(s,12.)*.07,cloud*.64);if(uWorld>.5&&uWorld<1.5){float aurora=exp(-abs(r.y-.32-.075*sin(p.x*.8+uTime*.12))*25.);col+=aurora*(.42+.25*sin(p.x*2.))*vec3(.14,.50,.39);}if(uWorld>1.5&&uWorld<2.5){col+=pow(s,100.)*vec3(.42,.24,.10)+smoothstep(.998,.9995,s)*vec3(.55,.25,.06);}if(uWorld>3.5&&uWorld<4.5){float shaft=pow(.5+.5*sin(p.x*3.+r.y*12.+uTime*.2),12.);col+=shaft*max(r.y+.25,0.)*vec3(.08,.36,.42);}if(uWorld>6.5&&uWorld<7.5){float bank=noise(vec2(p.x*.43,r.y*14.));col=mix(col,vec3(.72,.42,.51),smoothstep(.40,.73,bank)*(1.-smoothstep(.02,.35,abs(r.y+.09)))*.62);}if(uWorld>7.5&&uWorld<8.5){float flick=.5+.5*sin(uTime*.45);col+=pow(s,18.)*flick*vec3(.11,.19,.13);}if(uWorld>8.5){vec3 planet=normalize(vec3(-.55,.32,-.76));float dp=dot(r,planet);float disc=smoothstep(.965,.966,dp);vec3 pc=mix(vec3(.16,.25,.48),vec3(.46,.66,.75),noise(p*2.));col=mix(col,pc,disc);col+=exp(-abs(dp-.965)*260.)*vec3(.13,.20,.32);float spark=step(.996,hash(floor(p*32.)));col+=spark*(1.-disc)*.50;}gl_FragColor=vec4(clamp(col,0.,1.),1.);}'
].join('\n');
// One exact-pixel sample from the resolved scene. Keep emissive details local.
const POSTF='precision mediump float;varying vec2 vUv;uniform sampler2D uScene;void main(){vec3 color=texture2D(uScene,vUv*.5+.5).rgb;gl_FragColor=vec4(color*(1.-.045*dot(vUv,vUv)),1.);}';

export function worldBufferSize(width,height,dpr,maxSide,scale=1){
  const ratio=Math.min(dpr,3,Math.sqrt(2200000/Math.max(1,width*height)),maxSide/Math.max(1,width,height))*scale;
  return [Math.max(1,Math.floor(width*ratio)),Math.max(1,Math.floor(height*ratio))];
}
function multisampleTarget(gl,w,h,samples){
  if(!samples)return null;
  const frame=gl.createFramebuffer(),color=gl.createRenderbuffer(),depth=gl.createRenderbuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER,frame);
  for(const [buffer,format,attachment] of [[color,gl.RGBA8,gl.COLOR_ATTACHMENT0],[depth,gl.DEPTH_COMPONENT16,gl.DEPTH_ATTACHMENT]]){
    gl.bindRenderbuffer(gl.RENDERBUFFER,buffer);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER,samples,format,w,h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,attachment,gl.RENDERBUFFER,buffer);
  }
  const complete=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
  const target={frame,color,depth,w,h,samples};
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindRenderbuffer(gl.RENDERBUFFER,null);
  if(!complete){disposeTarget(gl,target);return null;}
  return target;
}
function sampleCounts(gl){
  const color=gl.getInternalformatParameter(gl.RENDERBUFFER,gl.RGBA8,gl.SAMPLES);
  const depth=gl.getInternalformatParameter(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,gl.SAMPLES);
  return [...color].filter(n=>n>1&&n<=4&&depth.includes(n)).sort((a,b)=>b-a);
}
function asWebGL2(source,vertex){
  const shader=source.replaceAll('attribute','in').replaceAll('varying',vertex?'out':'in').replaceAll('texture2D','texture');
  return '#version 300 es\n'+(vertex?shader:shader.replace('precision mediump float;','precision highp float;out vec4 fragment;').replaceAll('gl_FragColor','fragment'));
}
function renderTarget(gl,w,h,withDepth=true){
  const texture=gl.createTexture(),depth=withDepth?gl.createRenderbuffer():null,frame=gl.createFramebuffer();
  gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  if(depth){gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);}
  gl.bindFramebuffer(gl.FRAMEBUFFER,frame);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);if(depth)gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
  const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindTexture(gl.TEXTURE_2D,null);gl.bindRenderbuffer(gl.RENDERBUFFER,null);
  const target={texture,depth,frame,w,h};if(!ok){disposeTarget(gl,target);return null;}return target;
}
function disposeTarget(gl,t){if(t){gl.deleteFramebuffer(t.frame);gl.deleteRenderbuffer(t.depth??null);gl.deleteRenderbuffer(t.color??null);gl.deleteTexture(t.texture??null);}}
function program(gl,vs,fs){
  const shader=(kind,source)=>{const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(message);}return s;};
  const v=shader(gl.VERTEX_SHADER,vs),f=shader(gl.FRAGMENT_SHADER,fs),p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const message=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw Error(message);}return p;
}
const attr=(gl,p,name,size,stride,offset)=>{const a=gl.getAttribLocation(p,name);if(a>=0){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,stride,offset);}return a;};
const uniforms=(gl,p,names)=>Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(p,n)]));
export class TerminalRenderer{
  constructor(canvas,lightScenery=false,index=0){
    this.canvas=canvas;
    const options={alpha:false,antialias:true,depth:true,stencil:false,preserveDrawingBuffer:false};
    const gl2=canvas.getContext('webgl2',options);
    this.gl=gl2||canvas.getContext('webgl',options);
    if(!this.gl)throw Error('WebGL unavailable');
    const gl=this.gl;
    this.sampleCounts=gl2?sampleCounts(gl):[];
    this.maxSide=Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE),gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),...gl.getParameter(gl.MAX_VIEWPORT_DIMS));
    const derivatives=gl2||gl.getExtension('OES_standard_derivatives');
    const frag=derivatives?FRAG.replace('float normalVariation=0.;','float normalVariation=dot(dFdx(vNormal),dFdx(vNormal))+dot(dFdy(vNormal),dFdy(vNormal));'):FRAG;
    const compile=(vs,fs)=>gl2?program(gl,asWebGL2(vs,true),asWebGL2(fs,false)):program(gl,vs,fs);
    this.mesh=compile(VERT,!gl2&&derivatives?'#extension GL_OES_standard_derivatives : enable\n'+frag:frag);
    this.sky=compile(SKYV,SKYF);this.post=gl2?compile(SKYV,POSTF):null;
    this.m=uniforms(gl,this.mesh,['uVP','uOffset','uEye','uLights','uReflectPass','uReflectionEnabled','uViewport','uReflection','uHaze','uGround','uAccent','uWet','uWorld','uTime']);this.s=uniforms(gl,this.sky,['uForward','uRight','uUp','uAspect','uSkyTop','uHorizon','uSkyAccent','uWorld','uTime']);
    const buffer=arr=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);return {b,count:arr.length/10};};
    this.upload=buffer;this.batches=[];this.selected=collectibleAt(index);this.screen=buffer(new Float32Array([-1,-1,3,-1,-1,3]));
    this.lastMatrix=null;this.eye=[0,0,0];this.scale=1;this.lightScenery=lightScenery;this.reflectionTier=0;this.frameWindow=[];this.steadyWindows=0;this.stats={};this.destroyed=false;this.sceneTarget=null;this.reflectionTarget=null;this.targetWidth=0;this.targetHeight=0;
    this.black=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.black);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.bindTexture(gl.TEXTURE_2D,null);
    this.p=this.post?uniforms(gl,this.post,['uScene']):null;
    gl.disable(gl.CULL_FACE);this.setCollectible(index);
  }
  setCollectible(index){
    const next=collectibleAt(index);if(this.batches.length&&next.index===this.selected.index)return;
    const geometry=buildWorld(this.lightScenery,next.index),fresh=[];
    try{for(const data of geometry)fresh.push(this.upload(data));}catch(error){for(const {b} of fresh)this.gl.deleteBuffer(b);throw error;}
    for(const {b} of this.batches)this.gl.deleteBuffer(b);
    this.batches=fresh;this.selected=next;this.reflectedView=null;this.frameWindow.length=0;
    this.palette={skyTop:hex(next.top),horizon:hex(next.horizon),haze:hex(next.fog),ground:hex(next.ground),accent:hex(next.neon)};
  }
  observeFrame(seconds){
    this.frameWindow.push(seconds);
    if(this.frameWindow.length<90)return;
    const frames=this.frameWindow;
    this.frameWindow=[];
    if(frames.filter(dt=>dt>.032).length>63){
      this.steadyWindows=0;
      if(this.reflectionTier<2)this.reflectionTier++;
      else this.scale=Math.max(.78,this.scale-.08);
    }else if(frames.filter(dt=>dt<.022).length>78){
      if(++this.steadyWindows<3)return;
      this.steadyWindows=0;
      if(this.scale<1)this.scale=Math.min(1,this.scale+.08);
      else this.reflectionTier=Math.max(0,this.reflectionTier-1);
    }else this.steadyWindows=0;
  }
  resize(){
    const c=this.canvas;
    const [w,h]=worldBufferSize(c.clientWidth,c.clientHeight,window.devicePixelRatio||1,this.maxSide,this.scale);
    if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
  }
  ensureTargets(){
    const gl=this.gl,c=this.canvas;
    if(this.targetWidth!==c.width||this.targetHeight!==c.height){
      this.targetWidth=c.width;this.targetHeight=c.height;
      disposeTarget(gl,this.sceneTarget);disposeTarget(gl,this.multisample);
      // Attachment budget is about 44 MiB at the 4x limit, including resolve.
      const samples=this.sampleCounts.find(n=>c.width*c.height*(n*6+4)<=44*1024*1024);
      const msaa=this.multisample=multisampleTarget(gl,c.width,c.height,samples);
      this.sceneTarget=msaa?renderTarget(gl,c.width,c.height,false):null;
      if(!this.sceneTarget){disposeTarget(gl,msaa);this.multisample=null;}
    }
    const fraction=[.65,.49,.34][this.reflectionTier]*(.72+.28*this.selected.wet);
    const w=Math.max(1,Math.round(c.width*fraction)),h=Math.max(1,Math.round(c.height*fraction));
    if(this.reflectionWidth!==w||this.reflectionHeight!==h){
      this.reflectionWidth=w;this.reflectionHeight=h;
      disposeTarget(gl,this.reflectionTarget);
      this.reflectionTarget=renderTarget(gl,w,h);
      this.reflectedView=null;
    }
  }
  drawPass(eye,target,lights,time,dest,reflection){
    const gl=this.gl,c=this.canvas;
    const w=dest?dest.w:c.width,h=dest?dest.h:c.height;
    this.stats.drawCalls++;this.stats.triangles++;
    gl.bindFramebuffer(gl.FRAMEBUFFER,dest?dest.frame:null);gl.viewport(0,0,w,h);
    const forward=unit(sub(target,eye)),right=unit(cross(forward,[0,1,0])),up=cross(right,forward),aspect=c.width/c.height;
    const vp=matrix(eye,target,aspect);if(!reflection)this.lastMatrix=vp;
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.sky);gl.bindBuffer(gl.ARRAY_BUFFER,this.screen.b);const a=attr(gl,this.sky,'aPosition',2,0,0);
    gl.uniform3fv(this.s.uForward,forward);gl.uniform3fv(this.s.uRight,right);gl.uniform3fv(this.s.uUp,up);gl.uniform1f(this.s.uAspect,aspect);
    const {skyTop,horizon,haze,ground,accent}=this.palette,index=this.selected.index,clock=time%120;
    gl.uniform3fv(this.s.uSkyTop,skyTop);gl.uniform3fv(this.s.uHorizon,horizon);gl.uniform3fv(this.s.uSkyAccent,accent);gl.uniform1f(this.s.uWorld,index);gl.uniform1f(this.s.uTime,clock);
    gl.drawArrays(gl.TRIANGLES,0,3);gl.disableVertexAttribArray(a);
    gl.enable(gl.DEPTH_TEST);gl.useProgram(this.mesh);gl.uniformMatrix4fv(this.m.uVP,false,vp);gl.uniform3fv(this.m.uEye,eye);gl.uniform1f(this.m.uLights,lights?1:0);
    gl.uniform3fv(this.m.uHaze,haze);gl.uniform3fv(this.m.uGround,ground);gl.uniform3fv(this.m.uAccent,accent);gl.uniform1f(this.m.uWet,this.selected.wet);gl.uniform1f(this.m.uWorld,index);gl.uniform1f(this.m.uTime,clock);
    gl.uniform1f(this.m.uReflectPass,reflection?1:0);gl.uniform1f(this.m.uReflectionEnabled,!reflection&&this.reflectionTarget?1:0);gl.uniform2f(this.m.uViewport,w,h);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,!reflection&&this.reflectionTarget?this.reflectionTarget.texture:this.black);gl.uniform1i(this.m.uReflection,0);
    for(let i=0;i<this.batches.length;i++){
      const {b,count}=this.batches[i];if(!count)continue;
      this.stats.drawCalls++;this.stats.triangles+=count/3;gl.bindBuffer(gl.ARRAY_BUFFER,b);
      attr(gl,this.mesh,'aPosition',3,40,0);attr(gl,this.mesh,'aNormal',3,40,12);attr(gl,this.mesh,'aColor',3,40,24);attr(gl,this.mesh,'aMaterial',1,40,36);
      gl.uniform3fv(this.m.uOffset,i===2?ambientOffset(index,time):[0,0,0]);
      gl.drawArrays(gl.TRIANGLES,0,count);
    }
    for(const n of ['aPosition','aNormal','aColor','aMaterial'])gl.disableVertexAttribArray(gl.getAttribLocation(this.mesh,n));
    gl.bindTexture(gl.TEXTURE_2D,null);
  }
  draw(view,lights,time){
    if(this.destroyed)return;
    const gl=this.gl,c=this.canvas;this.resize();this.ensureTargets();
    const {target,yaw,pitch,radius}=view;
    const eye=add(target,[Math.sin(yaw)*Math.cos(pitch)*radius,Math.sin(pitch)*radius,Math.cos(yaw)*Math.cos(pitch)*radius]);
    this.eye=eye;
    const msaa=this.multisample,reflection=this.reflectionTarget;
    Object.assign(this.stats,{canvas:[c.width,c.height],scene:[c.width,c.height],reflection:reflection?[reflection.w,reflection.h]:null,
      samples:msaa?.samples??(gl.getContextAttributes()?.antialias?'default':0),drawCalls:0,triangles:0});
    const previous=this.reflectedView;
    if(reflection&&(!previous||lights!==previous.lights||Math.hypot(...sub(previous.eye,eye))>.008
      ||Math.hypot(...sub(previous.target,target))>.005||Math.abs(previous.time-time)>.045*(1+this.reflectionTier))){
      this.drawPass([eye[0],-eye[1],eye[2]],[target[0],-target[1],target[2]],lights,time,reflection,true);
      this.reflectedView={eye,target:[...target],lights,time};
    }
    this.drawPass(eye,target,lights,time,msaa,false);
    if(msaa){
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER,msaa.frame);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,this.sceneTarget.frame);
      gl.blitFramebuffer(0,0,c.width,c.height,0,0,c.width,c.height,gl.COLOR_BUFFER_BIT,gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.DEPTH_TEST);
      gl.useProgram(this.post);gl.bindBuffer(gl.ARRAY_BUFFER,this.screen.b);const a=attr(gl,this.post,'aPosition',2,0,0);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.sceneTarget.texture);gl.uniform1i(this.p.uScene,0);
      gl.drawArrays(gl.TRIANGLES,0,3);gl.disableVertexAttribArray(a);gl.bindTexture(gl.TEXTURE_2D,null);
      this.stats.drawCalls++;this.stats.triangles++;
    }
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
    gl.deleteProgram(this.mesh);gl.deleteProgram(this.sky);gl.deleteProgram(this.post);disposeTarget(gl,this.multisample);gl.deleteTexture(this.black);disposeTarget(gl,this.sceneTarget);disposeTarget(gl,this.reflectionTarget);
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
