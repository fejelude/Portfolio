// Angles are radians in each shaft's parent frame.
export const TAU = 2 * Math.PI;
export const MOVEMENT = Object.freeze({
 beatsPerSecond: 6, balanceAmplitude: 1.44,
 escapeTeeth: 15, escapePinion: 8, fixedFourth: 96,
 cagePinion: 12, thirdWheel: 36, thirdPinion: 16, barrel: 48,
 yokePinion: 16, yokeWheel: 80, carrierPinion: 16, carrierWheel: 64
});
export const SATELLITES=Object.freeze({
 regulator:Object.freeze([-1.41,1.10,.22]),
 earth:Object.freeze([-.20,1.37,-1.41]),
 moon:Object.freeze([1.41,1.36,-.22]),
 dial:Object.freeze([.22,1.12,1.41])
});
export const pitchRadius=(teeth,module)=>teeth*module/2;
export const meshRatio=(input,inputTeeth,outputTeeth)=>-input*inputTeeth/outputTeeth;
export const RELEASE=Object.freeze({unlock:.12,impulse:.24,drop:.37,bank:.45});
const smooth=x=>{
 const t=Math.max(0,Math.min(1,x));
 return t*t*(3-2*t);
};
const ramp=(t,start,end)=>smooth((t-start)/(end-start));

export function movementAt(seconds){
 const m=MOVEMENT,beat=seconds*m.beatsPerSecond;
 const lock=Math.floor(beat),fraction=beat-lock;
 const handed=lock%2===0?1:-1;
 const palletTravel=ramp(fraction,0,RELEASE.bank);
 // Stage the impulse and drop separately. Alternating entry and exit
 // pallets advance it by one full pitch over two beats.
 const impulse=ramp(fraction,RELEASE.unlock,RELEASE.impulse);
 const drop=ramp(fraction,RELEASE.impulse,RELEASE.drop);
 const escape=TAU*(lock+.78*impulse+.22*drop)/(2*m.escapeTeeth);
 const cage=escape*m.escapePinion/m.fixedFourth;
 const third=meshRatio(cage,m.cagePinion,m.thirdWheel);
 const barrel=meshRatio(third,m.thirdPinion,m.barrel);
 const yoke=meshRatio(cage,m.yokePinion,m.yokeWheel);
 const carrier=meshRatio(yoke,m.carrierPinion,m.carrierWheel);
 const balance=m.balanceAmplitude*Math.sin(Math.PI*beat);
 return {escape,cage,third,barrel,yoke,carrier,dial:-carrier,balance,
  fork:handed*.22*(2*palletTravel-1),earth:cage,earthTilt:-cage,moon:-cage,moonTilt:cage};
}
