import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ASPECTS,manilaParts,handAngles} from '../js/feje-tourbillon.mjs';
import {MOVEMENT as m,TAU,movementAt,meshRatio,pitchRadius,RELEASE,SATELLITES} from '../js/feje-tourbillon-mechanism.mjs';
import {astrolabeTime,SKY_PERIOD} from '../js/feje-tourbillon-astrolabe.mjs';
import {celestialPhase,skyCoordinate,chartCoordinates,CHARTS} from '../js/feje-tourbillon-celestial.mjs';
import {watchPixelRatio} from '../js/feje-tourbillon-quality.mjs';
import * as T from '../js/vendor/three-r160.1.mjs';
import {overviewFraming} from '../js/feje-tourbillon-renderer.mjs';
import {buildWatch} from '../js/feje-tourbillon-model.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);

test('Manila clock is independent of the visitor timezone and simulation',()=>{
 const parts=manilaParts(new Date('2026-11-23T13:12:34.500Z'));
 assert.deepEqual(parts,{hour:21,minute:12,second:34,millisecond:500});
 const angles=handAngles(parts);
 close(angles.hour,276.2875);close(angles.minute,75.45);close(angles.second,207);
 const midnight=manilaParts(new Date('2026-11-22T16:00:00Z'));
 assert.equal(midnight.hour,0);assert.equal(handAngles(midnight).hour,0);
});

test('the JCAM10-inspired axes complete their documented periods and maintain local gear ratios',()=>{
 const start=movementAt(0);
 for(const [axis,period,direction] of [['cage',60,1],['yoke',300,-1],['carrier',1200,1],
   ['earth',60,1],['earthTilt',60,-1],['moon',60,-1],['moonTilt',60,1]]){
  close(movementAt(period)[axis]-start[axis],direction*TAU);
 }
 close(movementAt(60).escape,TAU*12);
 for(const seconds of [.043,.191,.41,10.410,62.67,183.29,530.20,1199.99]){
  const s=movementAt(seconds);
  close(s.escape*m.escapePinion,s.cage*m.fixedFourth);
  close(s.third,meshRatio(s.cage,m.cagePinion,m.thirdWheel));
  close(s.barrel,meshRatio(s.third,m.thirdPinion,m.barrel));
  close(s.yoke,meshRatio(s.cage,m.yokePinion,m.yokeWheel));
  close(s.carrier,meshRatio(s.yoke,m.carrierPinion,m.carrierWheel));
  close(s.carrier+s.dial,0);
 }
 close(pitchRadius(36,.025)+pitchRadius(12,.025),.6);
 close(pitchRadius(48,.025)+pitchRadius(16,.025),.8);
});

test('the lever unlocks before impulse and drop, then reverses smoothly at the next bank',()=>{
 const at=(beat,fraction)=>movementAt((beat+fraction)/m.beatsPerSecond);
 assert.equal(at(0,RELEASE.unlock).escape,0);
 assert.ok(at(0,RELEASE.impulse).escape>0);
 assert.ok(at(0,RELEASE.impulse).escape<at(0,RELEASE.drop).escape);
 assert.ok(at(0,RELEASE.impulse).fork>at(0,RELEASE.unlock).fork);
 close(at(0,.8).escape,TAU/(2*m.escapeTeeth));
 close(at(0,.99999).escape,at(1,0).escape);
 close(at(0,.99999).fork,at(1,0).fork);
 close(at(1,.8).escape,2*at(0,.8).escape);
 close(at(1,.8).fork,-at(0,.8).fork);
 assert.ok(at(0,.5).balance>1&&at(1,.5).balance<-1);
});

test('wearable geometry has valid indices and tracks the nested movement throughout the carrier orbit',()=>{
 const noop=()=>{};
 const ctx={fillRect:noop,fillText:noop,beginPath:noop,moveTo:noop,lineTo:noop,closePath:noop,fill:noop,stroke:noop,
  createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})};
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>ctx})};
 try{
  const scene=new T.Scene(),watch=buildWatch(scene);
  const expected=['Crowned calfskin tongue','Four-arm orbital carrier','Five-minute transverse yoke',
   'Breathing rectangular steel hairspring','Brilliant-cut faceted moon','Caseback medallion'];
  for(const name of expected)assert.ok(scene.getObjectByName(name),name+' must be actual geometry or a rigid group');
  assert.equal(watch.axle.parent.parent,watch.carrier);
  assert.equal(watch.movement.cage.parent.parent,watch.axle);
  assert.equal(watch.swivel.parent,watch.carrier);
  for(let seconds=0;seconds<=1200;seconds+=17.57){
   const s=movementAt(seconds);
   watch.update(s);scene.updateMatrixWorld(true);
   close(watch.axle.rotation.x,s.yoke);
   close(watch.movement.cage.rotation.y,s.cage);
   close(watch.swivel.getWorldQuaternion(new T.Quaternion()).angleTo(new T.Quaternion()),0);
   for(const [name,key] of [['earth satellite','earth'],['moon satellite','moon']]){
    const centre=scene.getObjectByName(name).getWorldPosition(new T.Vector3());
    close(Math.hypot(centre.x,centre.z),Math.hypot(SATELLITES[key][0],SATELLITES[key][2]));
   }
  }
  const spring=scene.getObjectByName('Breathing rectangular steel hairspring').geometry.attributes.position;
  const endpoint=()=>Array.from(spring.array.slice(-12));
  const a=endpoint();watch.update(movementAt(43.17));
  assert.deepEqual(endpoint(),a,'spring stud should stay fixed');
  scene.traverse(mesh=>{
   if(!mesh.geometry)return;
   const p=mesh.geometry.getAttribute('position');
   assert.ok(p&&p.array.every(Number.isFinite),mesh.name);
   assert.ok(!mesh.geometry.index||mesh.geometry.index.array.every(value=>value<p.count),mesh.name);
  });
 }finally{globalThis.document=previous;}
});

test('overview framing leaves room for the strap tips in all four frames',()=>{
 for(const aspect of [4/3,16/9,3/4,1]){
  const view=overviewFraming(aspect),e=view.elevation,a=view.azimuth,d=view.distance;
  const f=2*Math.atan(Math.tan(38*Math.PI/360)/Math.min(aspect,1))*180/Math.PI;
  const camera=new T.PerspectiveCamera(f,aspect,.1,82);
  const target=new T.Vector3(...view.target);
  camera.position.copy(target).add(new T.Vector3(d*Math.cos(e)*Math.sin(a),d*Math.sin(e),d*Math.cos(e)*Math.cos(a)));
  camera.lookAt(target);camera.updateMatrixWorld();
  for(const position of [[0,2.59,0],[0,-1.15,5.70],[0,-1.15,-5.70],[-.57,-1.22,5.12],[.57,-1.22,-5.12]]){
   const {x,y}=new T.Vector3(...position).project(camera);
   assert.ok(Math.abs(x)<.97&&Math.abs(y)<.97,JSON.stringify({aspect,position,x,y}));
  }
 }
});

test('the original home placement and four ratios are preserved',()=>{
 assert.deepEqual(ASPECTS,{normal:'4 / 3',landscape:'16 / 9',portrait:'3 / 4',square:'1 / 1'});
 const html=read('index.html'),css=read('css/feje-tourbillon.css');
 assert.ok(html.indexOf('id="interactives-entry"')<html.indexOf('id="tourbillon"'));
 assert.ok(html.indexOf('id="tourbillon"')<html.indexOf('id="sofra-project"'));
 for(const id of Object.keys(ASPECTS))assert.ok(html.includes('data-ft-ratio="'+id+'"'));
 for(const id of ['landscape','portrait','square'])assert.ok(css.includes('data-aspect='+id));
 assert.match(html,/ΔΑΙΔΑΛΟΣ/);
});

test('the watch uses live WebGL geometry and keeps a static compatibility poster',()=>{
 const html=read('index.html'),app=read('js/feje-tourbillon.mjs'),renderer=read('js/feje-tourbillon-renderer.mjs');
 assert.match(html,/<img class="ft-watch-poster"[^>]*observatory.webp/);
 assert.match(html,/<canvas class="ft-model"[^>]*hidden/);
 assert.match(app,/import\('\.\/feje-tourbillon-renderer\.mjs'\)/);
 assert.match(app,/webglcontextlost/);assert.match(app,/webglcontextrestored/);
 assert.match(renderer,/new T\.PerspectiveCamera/);
 assert.match(renderer,/watch\.update\(movementAt\(seconds\)\)/);
 assert.doesNotMatch(renderer,/motion-[1-3]\.webp|drawImage\(/);
});

test('the 20-second sky and the Manila astrolabe track independent timelines',()=>{
 assert.equal(SKY_PERIOD,20);
 assert.deepEqual(celestialPhase(3.25),celestialPhase(23.25));
 assert.deepEqual(celestialPhase(0),celestialPhase(20));
 assert.equal(celestialPhase(10).breath,0);
 const morning=astrolabeTime(manilaParts(new Date('2026-11-23T22:30:00Z')));
 const evening=astrolabeTime(manilaParts(new Date('2026-11-24T10:30:00Z')));
 assert.ok(morning.day);
 assert.equal(evening.day,false);
 close(morning.hourPhase,6.5/24);
 close(evening.hourPhase,18.5/24);
 close(morning.minutePhase,.5);
});

test('each constellation preserves the angular separation of its catalogue stars',()=>{
 assert.deepEqual(CHARTS.map(chart=>chart.name),['Orion','Cassiopeia','Cygnus']);
 for(const chart of CHARTS){
  const original=chart.stars.map(([ra,dec])=>new T.Vector3(...skyCoordinate(ra,dec)));
  const placed=chartCoordinates(chart).map(p=>new T.Vector3(...p));
  for(const [a,b] of chart.lines){
   assert.ok(a!==b&&original[a]&&original[b]);
   close(original[a].dot(original[b]),placed[a].dot(placed[b]));
  }
 }
});

test('nebula sampling, constellation edges and star cores use independent live geometry',()=>{
 const sky=read('js/feje-tourbillon-celestial.mjs');
 assert.match(sky,/uniform sampler2D noiseAtlas/);
 assert.match(sky,/float (?:lace|veins)=/);
 assert.match(sky,/float fine=sampleNoise/);
 assert.match(sky,/new T\.LineSegments\(chartGeo/);
 assert.match(sky,/gl_PointSize=.*pixelRatio/);
 assert.match(sky,/gl_PointCoord/);
 assert.match(sky,/skyGroup\.rotation\.y=/);
 assert.doesNotMatch(sky,/putImageData|shadowBlur|drawImage/);
});

test('the maker mark is pixel clockwork, not a selectable Delta character',()=>{
 const html=read('index.html'),css=read('css/feje-tourbillon.css');
 const kickerStart=html.indexOf('<p class="ft-kicker">',html.indexOf('id="tourbillon"'));
 assert.ok(kickerStart>0,'Daedalus maker label is present');
 const head=html.slice(kickerStart,html.indexOf('</p>',kickerStart)+4);
 assert.match(head,/class="ft-maker-seal" aria-hidden="true"/);
 assert.match(head,/shape-rendering="crispEdges"/);
 assert.match(head,/class="ft-maker-seal-jewel"/);
 assert.match(head,/ΔΑΙΔΑΛΟΣ/);
 assert.doesNotMatch(head,/<span aria-hidden="true">Δ<\/span>/);
 assert.match(css,/\.ft-maker-seal-art\{[^}]*image-rendering:pixelated/);
 assert.match(css,/pointer-events:none;user-select:none/);
 assert.match(css,/@keyframes ft-maker-wheel/);
 assert.match(css,/@media\(prefers-reduced-motion:no-preference\)/);
});

test('the observatory is pillar-free while its real watch and cosmic platform survive',()=>{
 const sky=read('js/feje-tourbillon-celestial.mjs');
 const renderer=read('js/feje-tourbillon-renderer.mjs');
 assert.doesNotMatch(sky,/makePillar\(|function architecture\(|distanceTrim|Open celestial arch|Arch second ring|Stepped Ionian base and capital/);
 assert.match(sky,/function meridian\(scene\)/);
 assert.match(sky,/Procedural nebula filament dome/);
 assert.match(sky,/const stars=starLayers\(skyGroup\)/);
 assert.match(renderer,/watch\.update\(movementAt\(seconds\)\)/);
});

test('premium Daedalus card stays local, accessible and pauses its ambient animation',()=>{
 const html=read('index.html'),css=read('css/feje-tourbillon.css'),app=read('js/feje-tourbillon.mjs');
 const card=html.slice(html.indexOf('id="tourbillon"'),html.indexOf('id="tourbillon"')+5200);
 assert.match(html,/family=Cormorant\+Garamond/);
 assert.match(html,/family=Cinzel/);
 assert.match(card,/class="ft-card-cosmos" aria-hidden="true"/);
 assert.match(card,/class="ft-title-name">Fejelude's Tourbillon\.<\/span>/);
 assert.match(card,/class="ft-title-echo" aria-hidden="true"/);
 assert.match(css,/font:400 clamp[^;]*Pinyon Signature[^;]*Cormorant Garamond/);
 assert.match(css,/\.feje-world-home \.ft-kicker\{[\s\S]*?Cinzel/);
 assert.match(css,/@keyframes ft-atelier-zodiac-signal/);
 assert.match(css,/@keyframes ft-atelier-aura/);
 assert.match(css,/@keyframes ft-atelier-streak/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/#tourbillon\[data-ft-card-motion\]/);
 assert.match(app,/root\.toggleAttribute\('data-ft-card-motion',live\(\)&&!paused&&!reduced\.matches\)/);
 assert.match(app,/timeZone:'Asia\/Manila'/);
});

test('the Tourbillon starts at the former high fidelity on desktop and mobile, with hardware limits',()=>{
 const phone={dpr:3,mobile:true,width:390,height:520};
 assert.equal(watchPixelRatio(phone),2.25);
 assert.equal(watchPixelRatio({dpr:1,width:800,height:600}),2);
 const giant={dpr:4,width:4000,height:3000,maxRenderSize:8192};
 const ratio=watchPixelRatio(giant);
 assert.ok(ratio**2*giant.width*giant.height<=3400000+1);
 assert.equal(watchPixelRatio({...giant,maxRenderSize:1024}),1024/giant.width);
});

test('graphics presets and persisted selection have been removed from the watch',()=>{
 const html=read('index.html'),app=read('js/feje-tourbillon.mjs'),render=read('js/feje-tourbillon-renderer.mjs'),sky=read('js/feje-tourbillon-celestial.mjs'),css=read('css/feje-tourbillon.css');
 assert.doesNotMatch(html,/data-ft-quality|Graphics presets|data-ft-case/);
 assert.doesNotMatch(css,/ft-quality/);
 assert.doesNotMatch(app,/quality\.v1|setQuality|caseVisible/);
 assert.doesNotMatch(render,/setQuality|setCase/);
 assert.match(render,/watchPixelRatio\(params\(\)\)\*scale/);
 assert.match(sky,/economy:\{value:0\}/);
 assert.match(render,/observatory\.setPixelRatio/);
});
