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
// Each wheel has its own spoke count, sweep, split, finish and caliper color.
const wheelDesigns=[
 [8,.14,true,0x8e8ca2,0xd0a7ff], [8,.12,false,0x788ca2,0x99e0ff],
 [5,.19,true,0x34333b,0xe9864a], [7,.06,true,0x859895,0xc4ffb1],
 [6,.25,true,0x71949c,0xe2ffbf], [5,.05,false,0x39343c,0xffd067],
 [7,.11,false,0xa19b88,0xd7b57c], [5,.25,true,0x50464b,0xff9a48],
 [5,.18,true,0x777e68,0xe4f285], [9,.07,false,0x747e8a,0xff5765]
];
const frontSignatures=[
 [[.32,.47,.04],[.76,.52,.14],[.98,.64,.56]],
 [[.50,.64,.05],[.61,.65,.08],[.74,.67,.14],[.87,.70,.23]],
 [[.43,.46,.05],[.87,.51,.20],[1.01,.67,.65]],
 [[.58,.49,.17],[.82,.55,.30],[1.05,.69,.73]],
 [[.43,.50,.12],[.80,.54,.22],[.94,.60,.43],[.91,.68,.60]],
 [[.19,.60,-.12],[.89,.60,-.12]],
 [[.60,.62,.05],[.90,.65,.13]],
 [[.53,.45,.12],[.85,.47,.12],[1.02,.63,.55],[.90,.69,.68]],
 [[.44,.52,.08],[.71,.56,.18],[.99,.58,.32],[1.04,.67,.63]],
 [[.35,.46,.08],[.82,.48,.19],[1.04,.63,.62]]
];
const rearSignatures=[
 [[.18,.64,0],[.87,.65,0],[1.00,.70,.12]],
 [[.02,.72,-.03],[.83,.72,-.03],[1.02,.76,.16]],
 [[.43,.65,-.02],[.83,.67,-.01],[.98,.72,.18]],
 [[.50,.64,.01],[1.02,.73,.15]],
 [],
 [[.35,.68,-.03],[.89,.69,0],[1.05,.73,.15]],
 [],
 [[.58,.62,-.03],[.97,.63,.04]],
 [[.04,.67,-.02],[.90,.67,0],[1.04,.68,.16]],
 [[.25,.61,0],[.83,.63,.02],[1.01,.68,.18]]
];
const tireRadius=.435, axleHeight=.435, axlePositions=[-1.62,1.54];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const unit=a=>{const length=Math.hypot(...a)||1;return a.map(v=>v/length);};

// Continuous shoulders use shared normals across neighboring surface cells.
// Fender openings remove the sidewall right over each tire.
function sculptSkin(batch,profile,color,material,body=false){
 const contour=curve([[0,0,1],[1,.37,.988],[2,.67,.90],[3,.87,.74],[4,.98,.53],[5,1,.32],[6,.97,.12],[7,.89,0]],2);
 const rows=curve(profile,5);
 for(const side of [-1,1]){
  const surface=rows.map(([z,w,bottom,top])=>{
   const axle=Math.min(...axlePositions.map(position=>Math.abs(position-z)));
   const opening=body&&axle<.477?Math.max(0,axleHeight+Math.sqrt(.477**2-axle**2)-bottom)*.98:0;
   const shoulder=body?.14*Math.exp(-((axle/.54)**2)):0;
   return contour.map(([,x,y])=>[side*(w+shoulder*.43)*x,bottom+(top-bottom)*y+opening*(1-y)**4
    +shoulder*Math.sin(Math.PI*y)*x,z]);
  });
  const normal=(i,j)=>{
   const along=sub(surface[Math.min(i+1,rows.length-1)][j],surface[Math.max(0,i-1)][j]);
   const across=sub(surface[i][Math.min(j+1,contour.length-1)],surface[i][Math.max(0,j-1)]);
   const n=unit(cross(along,across)).map(v=>side*v);
   if(j===0)return unit([0,along[2],-along[1]]);
   return n;
  };
  const normals=surface.map((row,i)=>row.map((_,j)=>normal(i,j)));
  for(let i=0;i<surface.length-1;i++)for(let j=0;j<contour.length-1;j++){
   const a=surface[i][j],b=surface[i+1][j],c=surface[i+1][j+1],d=surface[i][j+1];
   const [na,nb,nc,nd]=[normals[i][j],normals[i+1][j],normals[i+1][j+1],normals[i][j+1]];
   if(side>0){batch.tri(a,b,c,color,material,[na,nb,nc]);batch.tri(a,c,d,color,material,[na,nc,nd]);}
   else{batch.tri(a,c,b,color,material,[na,nc,nb]);batch.tri(a,d,c,color,material,[na,nd,nc]);}
  }
  for(const i of [0,surface.length-1]){
   const row=surface[i],base=[0,row.at(-1)[1],row[0][2]],dir=i===0?-1:1;
   for(let j=0;j<row.length-1;j++){
    if(dir*side>0)batch.tri(base,row[j+1],row[j],color,material,[0,0,dir]);
    else batch.tri(base,row[j],row[j+1],color,material,[0,0,dir]);
   }
  }
  if(body)for(let i=0;i<surface.length-1;i++){
   const a=surface[i].at(-1),b=surface[i+1].at(-1);
   const inner=p=>[p[0]*.88,p[1]-.012,p[2]];
   batch.quad(a,b,inner(b),inner(a),dark,13);
  }
 }
}

function wheelSurface(batch,side,z,profile,color,material,segments=36){
 const point=(x,r,a)=>[side*x,axleHeight+r*Math.cos(a),z+r*Math.sin(a)];
 for(let j=0;j<profile.length-1;j++){
  const [x,r]=profile[j],[nextX,nextR]=profile[j+1];
  const axis=r-nextR,radial=nextX-x;
  const normal=a=>unit([side*axis,radial*Math.cos(a),radial*Math.sin(a)]);
  for(let i=0;i<segments;i++){
   const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments;
   const A=point(x,r,a),B=point(nextX,nextR,a),C=point(nextX,nextR,b),D=point(x,r,b);
   const n=normal(a),m=normal(b);
   if(side>0){batch.tri(A,C,B,color,material,[n,m,n]);batch.tri(A,D,C,color,material,[n,m,m]);}
   else{batch.tri(A,B,C,color,material,[n,n,m]);batch.tri(A,C,D,color,material,[n,m,m]);}
  }
 }
}
function buildWheel(batch,index,side,z,paint){
 const [count,sweep,split,finish,caliper]=wheelDesigns[index],alloy=hex(finish);
 const {beam,box,cylinderX}=batch;
 wheelSurface(batch,side,z,[[.89,.310],[.89,.365],[.91,.413],[.947,tireRadius],[1.224,tireRadius],[1.276,.422],[1.304,.398],[1.317,.342],[1.304,.316]],rubber,8);
 wheelSurface(batch,side,z,[[1.002,.312],[1.312,.314],[1.335,.321],[1.351,.316],[1.353,.297],[1.331,.285],[1.10,.285]],alloy,10);
 wheelSurface(batch,side,z,[[1.253,.268],[1.279,.268],[1.281,.107]],silver,12);
 const point=(x,r,a)=>[side*x,axleHeight+r*Math.cos(a),z+r*Math.sin(a)];
 for(let i=0;i<count;i++){
  const a=i*Math.PI*2/count,knee=a+sweep*.46;
  const low=point(1.342,.083,a),mid=point(1.325,.177,knee);
  beam(low,mid,split?.047:.057,alloy,10);
  beam(mid,point(1.342,.301,a+sweep),split?.033:.055,alloy,10);
  if(split)beam(mid,point(1.339,.300,a+sweep-.20),.029,alloy,10);
 }
 for(let i=0;i<16;i++){
  const a=i*Math.PI/8,[x,y,pz]=point(1.283,.235,a);
  cylinderX(x,y,pz,.009,.004,dark,13,6);
 }
 // Fasteners and a separate caliper bracket sit behind the outer spokes.
 cylinderX(side*1.342,axleHeight,z,.090,.051,alloy,10,24);
 cylinderX(side*1.371,axleHeight,z,.051,.021,paint,9,20);
 for(let i=0;i<5;i++){
  const [x,y,pz]=point(1.371,.069,i*Math.PI*.4);
  cylinderX(x,y,pz,.011,.012,silver,10,6);
 }
 box(side*1.288,.478,z-.223,.052,.146,.076,hex(caliper),11);
}
function lens(steel,lights,points,ink,glow,width,face){
 const offset=(p,up,out)=>[p[0],p[1]+up,p[2]+face*out];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];
  if(face>0){
   // The lens lies above the housing along the hood.
   steel.beam(a,b,width*1.65,ink,13);
   lights.beam(offset(a,width*.71,.006),offset(b,width*.71,.006),width,glow,3);
  }else{
   const back=offset(a,0,width*.52),end=offset(b,0,width*.52);
   steel.beam(back,end,width*1.95,ink,13);
   lights.beam(offset(back,0,width*.85),offset(end,0,width*.85),width,glow,3);
  }
 }
}

export function buildCar(solid,lamps,index){
 const c=collectibleAt(index),paint=hex(c.paint),trim=hex(c.trim),accent=hex(c.neon),white=hex(0xe9efff);
 const {box,beam}=solid;
 const tail=[-2.76,-2.72,-2.85,-2.62,-2.65,-2.84,-2.65,-2.93,-2.79,-2.88][index],nose=[2.75,2.72,2.86,2.68,2.70,2.84,2.68,2.80,2.77,2.78][index];
 const z=[tail,-2.24,-1.55,-.53,.55,1.52,2.23,nose];
 const heights=[
 [.65,.86,.88,.72,.68,.80,.55,.44],[.83,.97,1.03,.84,.82,.88,.65,.60],[.73,.87,.93,.71,.72,.86,.52,.40],[.66,.84,.96,.70,.66,.88,.51,.38],[.77,.88,.93,.75,.72,.87,.55,.46],
 [.83,.91,.90,.79,.77,.86,.59,.48],[.80,.96,1,.82,.78,.91,.68,.50],[.67,.88,.94,.73,.73,.87,.50,.39],[.78,.91,.96,.79,.80,.88,.56,.45],[.77,.87,.97,.73,.69,.88,.54,.41]
 ][index];
 const profile=z.map((v,i)=>[v,c.widths[i],index===3?.34:.26,heights[i]]);
 const roof=c.cabin[5],cabin=[[-1.56,c.cabin[0],.74,.80],[-.79,c.cabin[1],.74,roof-.10],[.10,c.cabin[2],.72,roof],[.84,c.cabin[3],.70,roof-.23],[1.32,c.cabin[4],.68,.76]];
 sculptSkin(solid,profile,paint,9,true);sculptSkin(solid,cabin,glass,7);
 for(const s of [-1,1]){
  box(s*1.015,.27,-.05,.16,.10,2.35,trim,7);box(s*.94,.83,.57,.26,.085,.28,paint,4);
  for(const zz of axlePositions)buildWheel(solid,index,s,zz,paint);
  const hood=profile[6];
  beam([s*c.cabin[4],.782,1.29],[s*hood[1]*.51,hood[3]+.008,hood[0]],.012,trim,13);
  // Slim sill, mirror with a reflective face, and brake duct trim.
  beam([s*.78,.324,-.96],[s*1.05,.325,.93],.028,trim,13);
  beam([s*(c.cabin[2]-.04),.93,.65],[s*.98,.94,.64],.045,trim,13);
  box(s*.997,.945,.64,.145,.069,.16,paint,9);
  box(s*.997,.945,.551,.115,.045,.017,silver,10);
  for(let k=0;k<4;k++)box(s*(c.widths[3]+.01),.42+k*.041,-.93+k*.09,.035,.014,.25,trim,13);
  const head=frontSignatures[index].map(([x,y,d])=>[s*x,y,nose-d]);
  const rear=rearSignatures[index].map(([x,y,d])=>[s*x,y,tail+d]);
  if(index===1||index===6){
   for(const [x,y,pz] of head){
    box(x,y,pz,.12,.068,.065,trim,13);
    lamps.box(x,y+.012,pz+.03,index===6?.062:.082,.024,.039,white,3);
   }
  }else lens(solid,lamps,head,trim,white,index===5?.021:.028,1);
  if(index===6){
   for(const [y,x,z] of [[.70,.91,.02],[.58,.87,-.035]])circle(lamps,[s*x,y,tail+z],.062,.043,.017,hex(0xff6d83),3,16);
  }else lens(solid,lamps,rear,trim,hex(0xff526c),.025,-1);
  if(index===2||index===7||index===9){beam([s*.71,.86,-1.56],[s*.52,.78,-.78],.043,trim,7);beam([s*.52,.78,-.78],[s*.84,.76,.65],.038,trim,7);}
  if(index===3){beam([s*.91,.33,-1.84],[s*.78,.30,.72],.065,silver,4);box(s*.75,.35,-.83,.14,.13,1.25,trim,7);}
  lamps.beam([s*.95,.25,-.65],[s*.95,.25,.70],.018,accent,3);
 }
 box(0,.24,nose-.18,1.87,.075,.60,trim,13);box(0,.23,tail+.15,1.86,.09,.55,trim,13);
 for(let j=-3;j<=3;j++)box(j*.24,.26,tail+.06,.045,.19,.42,trim,13);
 const wing=(height,span,z,split=false)=>{
  // Swept airfoil with a rounded leading edge and an actual trailing lip.
  const blade=(level,half,chord,offset,color)=>{
   const ribs=Array.from({length:13},(_,i)=>{
    const t=i/6-1,x=t*half,edge=t*t,pz=z+offset+edge*.15,y=level+edge*.085,d=chord*(1-edge*.22);
    return [[x,y-.010,pz-d*.53],[x,y+.019,pz-d*.18],[x,y+.054,pz+d*.16],
     [x,y+.032,pz+d*.43],[x,y-.004,pz+d*.48],[x,y-.025,pz+d*.25]];
   });
   for(let i=1;i<ribs.length;i++)for(let j=0;j<6;j++){
    const next=(j+1)%6;solid.quad(ribs[i-1][j],ribs[i][j],ribs[i][next],ribs[i-1][next],color,j===0?13:9);
   }
   for(const end of [ribs[0],ribs.at(-1)])for(let i=1;i<5;i++)solid.tri(end[0],end[i],end[i+1],trim,13);
  };
  for(const s of [-1,1]){
   beam([s*.60,.78,z+.23],[s*.69,height,z+.05],.058,trim,13);
   const x=s*(span/2-.035);
   solid.quad([x,height-.097,z-.18],[x,height+.145,z-.19],[x,height+.17,z+.24],[x,height-.055,z+.37],paint,9);
  }
  blade(height,span/2,.64,0,paint);
  if(split)blade(height-.12,span*.42,.41,.07,trim);
 };
 switch(c.feature){
  case "blade":box(0,.37,nose-.01,1.40,.13,.16,trim,7);for(let i=-3;i<=3;i++)box(i*.14,.37,nose+.08,.045,.11,.018,trim,7);box(0,.90,tail+.24,1.8,.055,.27,paint,4);break;
  case "horseshoe":box(0,.48,nose+.03,.58,.43,.10,dark,7);for(let j=0;j<24;j++){const a=-Math.PI*.12+j*Math.PI*1.24/24,b=a+Math.PI*1.24/24;beam([.32*Math.cos(a),.43+.34*Math.sin(a),nose+.11],[.32*Math.cos(b),.43+.34*Math.sin(b),nose+.11],.036,silver,4);}beam([-.30,.35,nose+.11],[.30,.35,nose+.11],.035,silver,4);for(let i=-3;i<=3;i++)box(i*.075,.46,nose+.115,.015,.27,.015,silver);
   for(const s of [-1,1])for(let i=0;i<12;i++){const a=-1.2+i*.2,b=a+.2;beam([s*1.09,.70+.33*Math.sin(a),-.70+.62*Math.cos(a)],[s*1.09,.70+.33*Math.sin(b),-.70+.62*Math.cos(b)],.038,silver,4);}break;
  case "wing":wing(1.57,2.60,tail+.29,true);for(const s of [-1,1]){box(s*.84,.34,nose+.06,.48,.09,.30,trim);beam([s*.86,.63,nose-.38],[s*1.26,.37,nose-.10],.064,trim,4);}break;
  case "tunnels":for(const s of [-1,1]){box(s*.86,.37,0,.39,.21,2.23,trim,7);beam([s*.62,.55,-1.01],[s*1.05,.23,-2.19],.16,paint,4);beam([s*.66,.52,.91],[s*1.17,.36,1.95],.14,paint,4);}wing(1.13,2.10,tail+.32);break;
  case "vents":for(const s of [-1,1]){box(s*.67,.57,tail-.05,.74,.43,.05,dark,7);circle(solid,[s*.67,.58,tail-.085],.37,.23,.044,paint,4);circle(lamps,[s*.67,.58,tail-.115],.30,.17,.036,hex(0xff6c9d),3);}break;
  case "visor":box(0,.56,nose+.04,1.89,.21,.13,trim,7);wing(1.27,2.39,tail+.36,true);break;
  case "quad":for(const x of [-.105,.105])for(const y of [.59,.80]){box(x,y,tail-.045,.16,.16,.13,trim,7);circle(solid,[x,y,tail-.12],.078,.078,.028,silver,4,18);}box(0,.91,tail+.24,1.65,.06,.26,paint,4);break;
  case "longtail":wing(1.16,2.34,tail+.13,true);box(0,.73,tail+.25,2.12,.07,.66,paint,4);for(const s of [-1,1])beam([s*.81,.64,-.76],[s*1.17,.35,-1.93],.13,trim,7);break;
  case "split":wing(1.34,2.31,tail+.30);box(0,.32,nose+.04,1.52,.15,.15,trim,7);lamps.beam([-.85,.58,nose-.02],[.85,.58,nose-.02],.03,accent,3);break;
  case "tandem":wing(1.52,2.55,tail+.30,true);beam([0,roof-.05,.10],[0,.87,-2.34],.1,paint,4);for(const s of [-1,1]){box(s*.85,.36,nose-.05,.44,.10,.37,trim);beam([s*.56,.60,-.7],[s*1.02,.78,-1.56],.085,paint,4);}break;
 }
 // Distinct accent inlays follow the roof/deck profile. They sit just above
 // the loft and do not modify the shared camera target or wheel geometry.
 if(index===1||index===6){
  for(let j=0;j<profile.length-1;j++){
   const a=profile[j],b=profile[j+1];beam([0,a[3]+.012,a[0]],[0,b[3]+.012,b[0]],index===1?.026:.055,index===1?silver:trim,4);
  }
 }
 if(index===5||index===8)for(const s of [-1,1])for(let j=4;j<profile.length-1;j++){
  const a=profile[j],b=profile[j+1];beam([s*a[1]*.56,a[3]-.035,a[0]],[s*b[1]*.56,b[3]-.035,b[0]],.055,trim,7);
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
