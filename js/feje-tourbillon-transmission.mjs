// The clock takes its one-minute input from the already regulated cage.
// All signed angles are relative to the parent of the corresponding shaft.
export const TIME_TRAIN = Object.freeze({
 pickup:{teeth:[24,20,24],height:.585},
 transfer:{teeth:[38,18,40],height:.488},
 orientation:{teeth:[24,24,24],height:.667},
 bevel:{teeth:20,tilt:.69,yaw:.88,distance:.36,depth:.036},
 seconds:{first:[12,60],second:[10,60],last:[12,24,24],
  intermediate:[.242,0],countershaft:[.20,.236],heights:[-.304,-.237,-.174]},
 hours:{first:[12,36],second:[10,40],intermediate:[-.256,0],heights:[-.111,-.050]}
});

export const meshRatio=(input,inputTeeth,outputTeeth)=>-input*inputTeeth/outputTeeth;

export function timingTooth(teeth,pitch){
 const module=2*pitch/teeth,base=pitch*Math.cos(25*Math.PI/180);
 const root=pitch-1.05*module,tip=pitch+.75*module;
 const involute=radius=>{
  const angle=Math.acos(base/Math.max(base,radius));
  return Math.tan(angle)-angle;
 };
 // Fractions of one pitch. Leave backlash at the pitch circle and use a
 // shallow addendum so the 10-tooth steel pinions have room at the root.
 const flank=radius=>.227+(involute(pitch)-involute(radius))*teeth/(2*Math.PI);
 return [[-.5,root],[-flank(root),root],[-.227,pitch],[-flank(tip),tip],
  [flank(tip),tip],[.227,pitch],[flank(root),root]];
}

// Direction uses positive Y rotation, so +X rotates towards -Z.
export function meshPhase(direction,driverPhase,driverTeeth,drivenTeeth){
 return direction + Math.PI + ((direction-driverPhase)*driverTeeth-Math.PI)/drivenTeeth;
}

export function radialTrain(start,end,teeth){
 const [driver,idler,driven]=teeth;
 const dx=end[0]-start[0],dz=end[1]-start[1];
 const module=2*Math.hypot(dx,dz)/(driver+2*idler+driven);
 const fraction=(driver+idler)/(driver+2*idler+driven);
 return {points:[start,[start[0]+dx*fraction,start[1]+dz*fraction],end],module,
  direction:Math.atan2(-dz,dx)};
}
const passed=(angle,[driver,idler,driven])=>{
 const middle=meshRatio(angle,driver,idler);
 return [angle,middle,meshRatio(middle,idler,driven)];
};

export function timeTransmission(cage,carrier){
 const {pickup,transfer,orientation,seconds,hours}=TIME_TRAIN;
 const central=passed(cage,pickup.teeth);
 const feed=passed(central[2],transfer.teeth);
 // A stationary sun turns backwards in carrier coordinates. Two meshes
 // send that same angle to the dial swivel. The nested feed tube is clocked
 // at 19:20 so subtracting the dial's motion gives exactly cage speed.
 const swivel=passed(-carrier,orientation.teeth);
 const relativeInput=feed[2]-swivel[2];
 const second=-relativeInput; // Equal bevel cones reverse at the intersecting axes.
 const intermediate=meshRatio(second,...seconds.first);
 const countershaft=meshRatio(intermediate,...seconds.second);
 const minuteTrain=passed(countershaft,seconds.last);
 const minute=minuteTrain[2];
 const motionWheel=meshRatio(minute,...hours.first);
 const hour=meshRatio(motionWheel,...hours.second);
 return {central,feed,swivel,second,intermediate,countershaft,
  minuteIdler:minuteTrain[1],minute,motionWheel,hour};
}
