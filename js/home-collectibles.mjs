/* Original, model-inspired stylized geometry. No third-party asset downloads.
   The selector and renderer use the same immutable catalogue. */
const records=[
 // id, real reference, world, accent, paint, trim, sky top, horizon, fog, deck, wetness, silhouette, cabin, feature
 ["owl","Aspark Owl","Neon Tokyo","#c6a2ff",0x9b8cae,0x332642,0x090715,0x382040,0x211733,0x17131f,.85,[.82,1.16,1.20,1.02,.98,1.14,1.04,.79],[.60,.72,.69,.57,.40,1.29],"blade"],
 ["tourbillon","Bugatti Tourbillon","Frozen Horizon","#a4defa",0x9fbddb,0x243949,0x101d37,0x557eab,0x576d91,0x34485e,.63,[.91,1.17,1.23,1.08,1.04,1.20,1.09,.92],[.70,.79,.78,.64,.45,1.48],"horseshoe"],
 ["jesko","Koenigsegg Jesko Attack","Solar Wasteland","#ffc184",0xc87636,0x402c20,0x3a2028,0xa7643f,0x885e4c,0x4b3328,.10,[.94,1.22,1.24,.93,.98,1.21,1.14,.91],[.62,.77,.75,.58,.38,1.38],"wing"],
 ["valkyrie","Aston Martin Valkyrie","Emerald Sanctuary","#84e8ba",0x3d886e,0x1c3634,0x082524,0x315a4d,0x315e50,0x1b302b,.42,[.63,1.12,1.20,.77,.68,1.18,1.08,.66],[.43,.54,.54,.43,.25,1.44],"tunnels"],
 ["evija","Lotus Evija","Abyss","#7feee9",0x397c92,0x123240,0x071c32,0x145879,0x16445d,0x12303b,.94,[.99,1.20,1.21,.93,1.01,1.16,1.07,.86],[.61,.74,.71,.55,.39,1.38],"vents"],
 ["f80","Ferrari F80","Crimson Foundry","#ff8298",0xcc3850,0x34202a,0x190c21,0x662039,0x4e2335,0x281d28,.47,[1.10,1.23,1.23,1.10,1.10,1.25,1.18,1.05],[.66,.72,.66,.55,.39,1.40],"visor"],
 ["utopia","Pagani Utopia","Golden Reverie","#efd2a0",0xb99a68,0x3e302e,0x201d2a,0x635038,0x6a5547,0x43342e,.67,[.82,1.13,1.22,1.02,1.06,1.18,1.03,.75],[.53,.72,.77,.64,.41,1.49],"quad"],
 ["w1","McLaren W1","Skyline 2099","#ffad86",0xe77d48,0x3d283d,0x282044,0xa85f73,0x84536f,0x30293f,.40,[.91,1.22,1.22,.93,1.03,1.20,1.08,.85],[.55,.70,.67,.55,.33,1.41],"longtail"],
 ["nevera-r","Rimac Nevera R","Storm Circuit","#d0ed82",0x738c4f,0x24302d,0x131d27,0x394f4b,0x394d47,0x23312e,.88,[.92,1.18,1.23,1.05,1.09,1.23,1.15,.92],[.64,.77,.72,.60,.40,1.44],"split"],
 ["21c","Czinger 21C","Lunar Outpost","#dce7ff",0xabb9c9,0x303548,0x080b1b,0x34394f,0x34394f,0x333744,.12,[.92,1.16,1.24,.79,.75,1.20,1.08,.75],[.33,.41,.42,.38,.25,1.48],"tandem"]
];
export const COLLECTION=Object.freeze(records.map((r,index)=>{
 const [id,name,world,accent,paint,trim,top,horizon,fog,ground,wet,widths,cabin,feature]=r;
 return Object.freeze({id,index,name,world,accent,neon:parseInt(accent.slice(1),16),paint,trim,top,horizon,fog,ground,wet,widths:Object.freeze(widths),cabin:Object.freeze(cabin),feature,poster:'assets/home-world/collectible-'+(index+1)+'.svg'});
}));
export const collectibleAt=i=>COLLECTION[Number.isInteger(i)&&i>=0&&i<COLLECTION.length?i:0];
const hex=n=>[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const rngFor=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const dark=hex(0x171622),silver=hex(0xb4b8c7),rubber=hex(0x181820),glass=hex(0x182133);
const circle=(batch,center,rx,ry,width,col,material=5,segments=24,plane="xy")=>{
 const point=a=>plane==="xz"?[center[0]+rx*Math.cos(a),center[1],center[2]+ry*Math.sin(a)]:[center[0]+rx*Math.cos(a),center[1]+ry*Math.sin(a),center[2]];
 for(let i=0;i<segments;i++)batch.beam(point(i*2*Math.PI/segments),point((i+1)*2*Math.PI/segments),width,col,material);
};
// Densified longitudinal profile avoids harsh changes between sculpted sections.
const curve=(p,detail)=>{
 const out=[];for(let i=0;i<p.length-1;i++){
  const a=p[Math.max(0,i-1)],b=p[i],c=p[i+1],d=p[Math.min(p.length-1,i+2)];
  for(let j=0;j<detail;j++){const t=j/detail,t2=t*t,t3=t2*t;out.push([b[0]+(c[0]-b[0])*t,...b.slice(1).map((v,k)=>{const n=k+1;return .5*(2*v+(-a[n]+c[n])*t+(2*a[n]-5*v+4*c[n]-d[n])*t2+(-a[n]+3*v-3*c[n]+d[n])*t3);})]);}
 }out.push(p.at(-1).slice());return out;
};
export function buildCar(solid,lamps,index,low){
 const c=collectibleAt(index),paint=hex(c.paint),trim=hex(c.trim),accent=hex(c.neon),white=hex(0xe9efff);
 const {box,beam,loft,cylinderX}=solid;
 const tail=[-2.76,-2.72,-2.85,-2.62,-2.65,-2.84,-2.65,-2.93,-2.79,-2.88][index],nose=[2.75,2.72,2.86,2.68,2.70,2.84,2.68,2.80,2.77,2.78][index];
 const z=[tail,-2.24,-1.55,-.53,.55,1.52,2.23,nose];
 const heights=[
 [.65,.86,.88,.72,.68,.80,.55,.44],[.83,.97,1.03,.84,.82,.88,.65,.60],[.73,.87,.93,.71,.72,.86,.52,.40],[.66,.84,.96,.70,.66,.88,.51,.38],[.77,.88,.93,.75,.72,.87,.55,.46],
 [.83,.91,.90,.79,.77,.86,.59,.48],[.80,.96,1,.82,.78,.91,.68,.50],[.67,.88,.94,.73,.73,.87,.50,.39],[.78,.91,.96,.79,.80,.88,.56,.45],[.77,.87,.97,.73,.69,.88,.54,.41]
 ][index];
 const profile=z.map((v,i)=>[v,c.widths[i],index===3?.34:.26,heights[i]]);
 const roof=c.cabin[5],cabin=[[-1.56,c.cabin[0],.74,.80],[-.79,c.cabin[1],.74,roof-.10],[.10,c.cabin[2],.72,roof],[.84,c.cabin[3],.70,roof-.23],[1.32,c.cabin[4],.68,.76]];
 loft(curve(profile,low?2:4),paint,4);loft(curve(cabin,low?2:4),glass,7);
 for(const s of [-1,1]){
  box(s*1.015,.27,-.05,.16,.10,2.35,trim,7);box(s*.94,.83,.57,.26,.085,.28,paint,4);
  beam([s*c.cabin[2],roof-.15,.10],[s*c.cabin[4],.77,1.32],.025,silver,4);
  for(const zz of [-1.62,1.54]){
   cylinderX(s*1.10,.435,zz,.435,.39,rubber,8,low?26:48);
   cylinderX(s*1.306,.435,zz,.318,.035,trim,4,low?20:32);
   cylinderX(s*1.329,.435,zz,.267,.026,silver,4,low?20:32);
   cylinderX(s*1.347,.435,zz,.242,.027,trim,4,low?20:32);
   const spokes=index===6?7:5;
   for(let i=0;i<spokes;i++){const a=i*Math.PI*2/spokes;beam([s*1.37,.435+.07*Math.cos(a),zz+.07*Math.sin(a)],[s*1.37,.435+.258*Math.cos(a+.1),zz+.258*Math.sin(a+.1)],.048,silver,4);}
   cylinderX(s*1.383,.435,zz,.075,.042,paint,4,16);box(s*1.354,.49,zz-.19,.03,.14,.085,accent,4);
   for(let i=0;i<16;i++){const a=-1.38+i*2.76/16,b=a+2.76/16;beam([s*1.16,.435+.452*Math.cos(a),zz+.452*Math.sin(a)],[s*1.16,.435+.452*Math.cos(b),zz+.452*Math.sin(b)],.036,paint,4);}
  }
  beam([s*.55,.78,1.23],[s*.48,.57,nose-.44],.018,trim,7);
  for(let k=0;k<4;k++)box(s*1.04,.40+k*.055,-.95+k*.1,.035,.025,.30,trim,7);
  lamps.beam([s*.28,.49,nose-.015],[s*.78,.52,nose-.10],.045,white,3);
  lamps.beam([s*.78,.52,nose-.10],[s*.99,.60,nose-.52],.035,white,3);
  lamps.beam([s*.15,.65,tail-.03],[s*.90,.66,tail+.01],.048,hex(0xff6d92),3);
  lamps.beam([s*.95,.25,-.65],[s*.95,.25,.70],.018,accent,3);
 }
 box(0,.24,nose-.18,1.87,.075,.60,trim,7);box(0,.23,tail+.15,1.86,.09,.55,trim,7);
 for(let j=-3;j<=3;j++)box(j*.24,.26,tail+.06,.045,.19,.42,trim,7);
 const wing=(height,span,z,split=false)=>{
  for(const s of [-1,1]){beam([s*.62,.81,z+.24],[s*.67,height,z],.068,trim,4);box(s*(span/2-.025),height,z,.07,.28,.63,paint,4);}
  box(0,height,z,span,.09,.58,paint,4);if(split)box(0,height-.16,z+.11,span*.82,.055,.31,trim,4);
  lamps.beam([-span*.43,height+.055,z-.25],[span*.43,height+.055,z-.25],.025,accent,3);
 };
 switch(c.feature){
  case "blade":box(0,.37,nose-.01,1.40,.13,.16,trim,7);for(let i=-3;i<=3;i++)box(i*.14,.37,nose+.08,.045,.11,.018,trim,7);box(0,.90,tail+.24,1.8,.055,.27,paint,4);break;
  case "horseshoe":box(0,.48,nose+.03,.58,.43,.10,dark,7);circle(solid,[0,.51,nose+.11],.32,.29,.036,silver,4,24);for(let i=-3;i<=3;i++)box(i*.075,.46,nose+.115,.015,.27,.015,silver);
   for(const s of [-1,1])for(let i=0;i<12;i++){const a=-1.2+i*.2,b=a+.2;beam([s*1.09,.70+.33*Math.sin(a),-.70+.62*Math.cos(a)],[s*1.09,.70+.33*Math.sin(b),-.70+.62*Math.cos(b)],.038,silver,4);}break;
  case "wing":wing(1.57,2.60,tail+.29,true);for(const s of [-1,1]){box(s*.84,.34,nose+.06,.48,.09,.30,trim);beam([s*.86,.63,nose-.38],[s*1.26,.37,nose-.10],.064,trim,4);}break;
  case "tunnels":for(const s of [-1,1]){box(s*.86,.37,0,.39,.21,2.23,trim,7);beam([s*.62,.55,-1.01],[s*1.05,.23,-2.19],.16,paint,4);beam([s*.66,.52,.91],[s*1.17,.36,1.95],.14,paint,4);}wing(1.13,2.10,tail+.32);break;
  case "vents":for(const s of [-1,1]){box(s*.67,.57,tail-.05,.74,.43,.05,dark,7);circle(solid,[s*.67,.58,tail-.085],.37,.23,.044,paint,4);circle(lamps,[s*.67,.58,tail-.115],.30,.17,.036,hex(0xff6c9d),3);}break;
  case "visor":box(0,.56,nose+.04,1.89,.21,.13,trim,7);for(const s of [-1,1])lamps.beam([s*.24,.60,nose+.12],[s*.89,.60,nose+.12],.035,white,3);wing(1.27,2.39,tail+.36,true);break;
  case "quad":for(const x of [-.105,.105])for(const y of [.59,.80]){box(x,y,tail-.045,.16,.16,.13,trim,7);circle(solid,[x,y,tail-.12],.078,.078,.028,silver,4,18);}for(const s of [-1,1])for(const x of [.61,.89])circle(lamps,[s*x,.61,nose-.07],.095,.065,.032,white,3,16);box(0,.91,tail+.24,1.65,.06,.26,paint,4);break;
  case "longtail":wing(1.16,2.34,tail+.13,true);box(0,.73,tail+.25,2.12,.07,.66,paint,4);for(const s of [-1,1])beam([s*.81,.64,-.76],[s*1.17,.35,-1.93],.13,trim,7);break;
  case "split":wing(1.34,2.31,tail+.30);box(0,.32,nose+.04,1.52,.15,.15,trim,7);lamps.beam([-.85,.58,nose-.02],[.85,.58,nose-.02],.03,accent,3);break;
  case "tandem":wing(1.52,2.55,tail+.30,true);beam([0,roof-.05,.10],[0,.87,-2.34],.1,paint,4);for(const s of [-1,1]){box(s*.85,.36,nose-.05,.44,.10,.37,trim);beam([s*.56,.60,-.7],[s*1.02,.78,-1.56],.085,paint,4);}break;
 }
}
// Nine independent architectural compositions; Tokyo retains the existing city.
export function buildEnvironment(solid,lamps,ambient,index,low){
 const c=collectibleAt(index),rng=rngFor(901+index*117),tone=hex(c.fog),neon=hex(c.neon),metal=hex(c.trim),stone=mix(tone,hex(0x171b26),.48),count=low?10:17;
 const {box,beam,tri,quad}=solid;
 const crystal=(x,y,z,r,h,col)=>{const n=6,ring=Array.from({length:n},(_,i)=>[x+Math.cos(i*2*Math.PI/n)*r,y,z+Math.sin(i*2*Math.PI/n)*r]);for(let i=0;i<n;i++)tri(ring[i],ring[(i+1)%n],[x,y+h,z],mix(col,neon,i%2*.23),4);};
 const loop=(p,x,y,w,col)=>circle(solid,p,x,y,w,col,4,low?18:32);
 const rim=(x,y,z,rx,rz,col)=>circle(lamps,[x,y,z],rx,rz,.06,col,5,low?20:32,"xz");
 const radial=(n,fn,min=22,max=36)=>{for(let i=0;i<n;i++){const a=i/n*Math.PI*2,r=min+rng()*(max-min);fn(Math.cos(a)*r,Math.sin(a)*r,a,i,r);}};
 for(let k=0;k<8;k++){const a=k*Math.PI/4,x=Math.cos(a)*12.3,z=Math.sin(a)*12.3;box(x,-1.1,z,.42,2.1,.42,stone);box(x,.03,z,.39,.12,.39,neon,5);}
 switch(index){
  case 1:radial(count,(x,z,a,i,r)=>{const h=7+rng()*22;box(x,-5+h*.24,z,3.2,h*.48,3.2,stone,6);crystal(x,-5+h*.48,z,2,h*.65,mix(tone,neon,.36));if(i%2===0){box(x,2,z,5.2,.16,4.8,neon,5);beam([x,3,z],[Math.cos(a-.22)*r,3,Math.sin(a-.22)*r],.28,hex(0xa4cfe5),4);}});break;
  case 2:radial(count,(x,z)=>{const h=4+rng()*13;for(let j=0;j<4;j++)box(x,-7+(j+.5)*h/4,z,7-j*1.18,h/4,6-j*.88,mix(tone,hex(0xad7553),j*.1));},25,42);
   for(const s of [-1,1]){for(let k=0;k<4;k++){const x=s*(16+k*3.2),z=-11-k*1.4;box(x,.1,z,.13,3,.13,metal);quad([x-1.5,1.1,z-.8],[x+1.5,1.1,z-.8],[x+1.5,2.1,z+.8],[x-1.5,2.1,z+.8],hex(0x454d75),7);beam([x-1.5,1.1,z-.8],[x+1.5,1.1,z-.8],.07,neon,5);}box(s*20,6,-18,.8,22,.8,stone);box(s*20,17,-18,2.1,.8,2.1,neon,5);}break;
  case 3:radial(count,(x,z)=>{const h=6+rng()*10;beam([x,-3,z],[x+1,h,z],.32,stone);for(let j=0;j<5;j++){const b=j*1.26,tip=[x+1+Math.cos(b)*3,h+1+(j%2)*1.4,z+Math.sin(b)*3];beam([x+.7,h*.67,z],tip,.14,hex(0x44736b));crystal(...tip,1.3,1.2,mix(tone,neon,.45));}});
   for(const x of [-18,18]){for(let z=-16;z<=16;z+=4)loop([x,0,z],5,6,.14,hex(0x6c9d8f));for(let z=-16;z<16;z+=4)beam([x,5.9,z],[x,5.9,z+4],.12,neon,5);box(x,-.4,0,8,.4,33,stone);}break;
  case 4:for(let k=0;k<5;k++){const z=-14-k*5;loop([0,2,z],9,7,.30,hex(0x416981));circle(lamps,[0,2,z+.06],8.7,6.7,.045,neon,5,24);}
   for(const x of [-18,18])for(let k=0;k<6;k++){const z=-15+k*6,h=4+rng()*10;beam([x,-4,z],[x,h,z],.44,stone);for(let j=0;j<3;j++){const end=[x+(j-1)*1.6,h+j,z+1.8];beam([x,h*.62,z],end,.23,hex(0x597b92));crystal(...end,.62,1.4,neon);}}break;
  case 5:radial(count,(x,z,a,i)=>{const h=5+rng()*18;box(x,h/2-4,z,4.2,h,4.5,stone,6);box(x,h-4,z,5,.55,5,metal);if(i%3===0){box(x+.8,h-1,z,.58,7,.58,metal);box(x+.8,h+2.5,z,.70,.15,.70,neon,5);}});
   for(const z of [-19,19])for(const x of [-16,16]){box(x,4,z,.65,13,.65,metal);beam([x,10,z],[x>0?7:-7,10,z],.50,metal);beam([x,8,z],[x>0?7:-7,10,z],.22,neon,5);}for(const s of [-1,1]){beam([s*14,1,-20],[s*14,1,20],.60,stone);beam([s*15,2.2,-20],[s*15,2.2,20],.25,neon,5);}break;
  case 6:for(let i=0;i<16;i++){const a=i/16*Math.PI*2,r=21,x=Math.cos(a)*r,z=Math.sin(a)*r,b=a+Math.PI/8;box(x,4,z,1.1,13,1.1,mix(tone,hex(0xccb99e),.25),4);box(x,10.7,z,1.7,.65,1.7,neon,4);box(x,-2,z,1.8,.6,1.8,stone,4);beam([x,0,z],[x,10,z],.07,neon,5);beam([x,11,z],[Math.cos(b)*r,11,Math.sin(b)*r],.48,neon,4);for(let j=0;j<3;j++)box(x,12+j*.6,z,1.43-j*.26,.45,1.43-j*.26,stone,4);}rim(0,.018,0,4.45,6.4,neon);rim(0,.019,0,4.70,6.65,hex(0x927452));break;
  case 7:radial(count,(x,z,a,i)=>{const y=-4+rng()*10;box(x,y,z,6,.6,5,stone,4);crystal(x,y-.3,z,2.8,-4,stone);box(x,y+2,z,3.4,4,3.4,mix(tone,hex(0x51516d),.35),6);box(x,y+4,z,4,.2,4,neon,5);if(i%3===0)beam([x,y,z],[x*.83,y-2,z*.83],.18,neon,5);},24,42);for(const s of [-1,1]){beam([s*13,-2,-22],[s*13,-2,22],.21,metal);beam([s*13,-1.8,-22],[s*13,-1.8,22],.06,neon,5);}break;
  case 8:for(let i=0;i<12;i++){const a=i/12*6.283,r=23,x=Math.cos(a)*r,z=Math.sin(a)*r;box(x,3,z,.62,13,.62,metal);for(const s of [-1,1])beam([x+s*1.8,6,z],[x,9,z],.18,stone);box(x,9.6,z,2.8,.24,2.8,neon,5);rim(x,10.2,z,1.55,1.55,neon);if(i%2===0)beam([x,9,z],[Math.cos(a+.524)*r,9,Math.sin(a+.524)*r],.035,neon,5);}for(const s of [-1,1]){box(s*17,0,-5,4.4,2.4,5,stone,6);for(let j=0;j<4;j++)box(s*17,.25+j*.29,-2.45,3.8,.09,.05,neon,5);}break;
  case 9:radial(count,(x,z)=>crystal(x,-6,z,3+rng()*5,2+rng()*5,mix(tone,hex(0x858e9e),.3)),25,43);for(const x of [-18,18]){box(x,-.5,-5,5,2.8,6,hex(0x777d8c),4);loop([x,1,-1.92],2.2,1.7,.18,silver);circle(lamps,[x,1,-1.88],1.9,1.4,.045,neon,5,24);box(x,3,-5,.18,5,.18,silver,4);const p=[x,5,-5];for(let j=0;j<24;j++){const a=j*6.283/24,b=(j+1)*6.283/24;tri(p,[x+2.8*Math.cos(a),6.2,-5+2.8*Math.sin(a)],[x+2.8*Math.cos(b),6.2,-5+2.8*Math.sin(b)],silver,4);}beam(p,[x,7,-5],.09,metal);}break;
 }
 if(index===7||index===9){ambient.loft([[-1,.28,-.15,.10],[-.54,.72,-.20,.25],[.42,.68,-.17,.24],[1,.22,-.10,.08]],silver,4);ambient.box(0,-.11,-.86,.46,.06,.05,neon,5);if(index===9){ambient.box(-1.1,0,0,1.15,.04,.65,hex(0x5d7294),7);ambient.box(1.1,0,0,1.15,.04,.65,hex(0x5d7294),7);}}
 else for(let i=0;i<(low?25:57);i++){const x=(rng()-.5)*37,z=(rng()-.5)*37,y=1+rng()*14,size=index===1?.055:index===4?.09:.045,color=index===1?hex(0xc2eaff):index===2?hex(0xc68b62):index===3?hex(0x91d6ad):index===4?hex(0x6fd6dc):index===5?hex(0xe7a17a):index===6?hex(0xf4d49d):neon;ambient.box(x,y,z,size,size*(index===8?4:1),size,color,1);}
}
export function ambientOffset(index,t){
 if(index===0||index===7||index===9)return [Math.sin(t*.09)*21,7+Math.sin(t*.4)*.3,-18+Math.cos(t*.09)*5];
 if(index===1||index===8)return [Math.sin(t*.47)*1.6,-1.8+Math.cos(t*.62)*1.8,Math.sin(t*.24)*1.4];
 if(index===4||index===5)return [Math.sin(t*.3)*.8,Math.sin(t*.48)*1.9,0];
 return [Math.sin(t*.43)*2,Math.sin(t*.25)*.7,Math.cos(t*.35)*1.2];
}
