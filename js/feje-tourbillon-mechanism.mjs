// Single-axis lever tourbillon. Angles are radians in each shaft's parent frame.
import {BALANCE_AMPLITUDE} from './feje-tourbillon-geometry.mjs';
export const TAU = 2 * Math.PI;
export const MOVEMENT = Object.freeze({
 beatsPerSecond: 5,
 escapeTeeth: 15,
 escapePinion: 8,
 fixedFourth: 80,
 cagePinion: 12,
 thirdWheel: 36,
 thirdPinion: 16,
 barrel: 48,
 earthDriver: 24,
 earthWheel: 48,
 moonDriver: 36,
 moonWheel: 24
});
const smooth = x => {
 const t = Math.max(0, Math.min(1, x));
 return t * t * (3 - 2 * t);
};

export function movementAt(seconds) {
 const m = MOVEMENT;
 const beats = seconds * m.beatsPerSecond;
 const lock = Math.floor(beats);
 const fraction = beats - lock;
 // The lever crosses first. The tooth drops after unlocking and banks again.
 // Two alternating pallets split a tooth pitch into two half-tooth advances.
 const drop = smooth((fraction - .13) / .21);
 const forkTravel = smooth(fraction / .25);
 const escape = TAU * (lock + drop) / (2 * m.escapeTeeth);
 const cage = escape * m.escapePinion / m.fixedFourth;
 const third = -cage * m.cagePinion / m.thirdWheel;
 const barrel = -third * m.thirdPinion / m.barrel;
 const balance = BALANCE_AMPLITUDE * Math.sin(Math.PI * beats);
 return {
  cage, escape, third, barrel, balance,
  fork: (lock % 2 ? -1 : 1) * .22 * (2 * forkTravel - 1),
  spring: balance / BALANCE_AMPLITUDE,
  earth: -barrel * m.earthDriver / m.earthWheel,
  moon: -barrel * m.moonDriver / m.moonWheel
 };
}
