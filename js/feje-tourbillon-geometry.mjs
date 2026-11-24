// Daedalus: pure geometric kernels. Dimensions are scene units, not machining tolerances.
export const TAU=2*Math.PI;
export const BALANCE_AMPLITUDE=250*Math.PI/180;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

// Rounded watch-wheel illustration: a common module controls addendum and
// dedendum. The flanks are eased, not claimed to be conjugate cycloidal curves.
// Every tooth is centred at an integral tooth pitch, preserving train phasing.
export function wheelOutline(count,pitch,{escape=false,ornamental=false}={}){
 if(!Number.isInteger(count)||count<3||!(pitch>0))throw new RangeError('Invalid wheel');
 const module=2*pitch/count;
 const root=escape?pitch*.77:ornamental?pitch*.91:Math.max(pitch*.72,pitch-module*.68);
 const tip=escape?pitch*1.06:ornamental?pitch*1.071:pitch+module*.58;
 const samples=escape?
  [[-.5,root],[-.25,root],[-.12,pitch*.93],[0,tip],[.075,tip*.988],[.14,pitch*.91],[.29,root]]:
  [[-.5,root],[-.36,root],[-.30,root+(.12*(pitch-root))],[-.25,pitch],[-.19,pitch+(tip-pitch)*.67],[-.12,tip],[-.06,tip], [.06,tip],[.12,tip],[.19,pitch+(tip-pitch)*.67],[.25,pitch],[.30,root+(.12*(pitch-root))],[.36,root]];
 const points=[];
 for(let tooth=0;tooth<count;tooth++)for(const [offset,radius] of samples){
  const angle=(tooth+offset)*TAU/count;
  points.push([radius*Math.cos(angle),radius*Math.sin(angle)]);
 }
 return {points,root,tip,module};
}

// A single flat spiral with a fixed outer end and an inner end on the collet.
// Uniformly increasing radius prevents the illustrative turns crossing. The
// phase deformation decays toward the stud. This is not a stress simulation.
export function hairspringPoint(u,balance){
 u=clamp(u,0,1);balance=clamp(balance,-BALANCE_AMPLITUDE,BALANCE_AMPLITUDE);
 const r=.034+.198*u;
 const a=Math.PI+TAU*5.5*u+balance*(1-u)**2;
 return [r*Math.cos(a),.522,-r*Math.sin(a)];
}

// Closed rectangular ribbon cross-section, with analytic tangent normals.
// Reuses preallocated arrays during playback; no allocation per vertex.
export function fillHairspring(positions,normals,count,balance){
 const b=clamp(balance,-BALANCE_AMPLITUDE,BALANCE_AMPLITUDE);
 for(let i=0;i<count;i++){
  const u=i/(count-1),r=.034+.198*u,a=Math.PI+TAU*5.5*u+b*(1-u)**2;
  const c=Math.cos(a),s=Math.sin(a),da=TAU*5.5-2*b*(1-u);
  const tx=.198*c-r*s*da,tz=-.198*s-r*c*da,len=Math.hypot(tx,tz);
  const nx=-tz/len,nz=tx/len;
  // Four flat faces, two vertices each, to keep the edges crisp.
  for(let face=0;face<4;face++){
   for(let side=0;side<2;side++){
    const corner=(face+side)%4,rad=corner===0||corner===3?-.002:.002;
    const y=corner<2?-.009:.009,j=(i*8+face*2+side)*3;
    positions[j]=r*c+nx*rad;positions[j+1]=.522+y;positions[j+2]=-r*s+nz*rad;
    normals[j]=face===1?nx:face===3?-nx:0;
    normals[j+1]=face===0?-1:face===2?1:0;
    normals[j+2]=face===1?nz:face===3?-nz:0;
   }
  }
 }
}
export function ribbonIndices(count){
 const indices=[];
 for(let i=0;i<count-1;i++)for(let f=0;f<4;f++){
  const a=i*8+f*2,b=a+1,c=a+8,d=b+8;
  indices.push(a,c,b,b,c,d);
 }
 return indices;
}

// The cutaway barrel illustrates a coiled mainspring within its drum.
// It rotates with the barrel; stored energy and winding are not simulated.
export function barrelSpiral(segments=192){
 return Array.from({length:segments+1},(_,i)=>{
  const u=i/segments,a=u*TAU*4.5;
  const r=.105+.218*u;
  return [r*Math.cos(a),.271,-r*Math.sin(a)];
 });
}

// Decorative engine-turned rosette in the recessed dial.
export function rosettePoint(u,radius,lobes,depth,phase=0){
 const a=u*TAU,r=radius+depth*Math.cos(lobes*a+phase);
 return [r*Math.cos(a),r*Math.sin(a)];
}
