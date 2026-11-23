import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ASPECTS,manilaParts,handAngles} from '../js/feje-tourbillon.mjs';
import {MOVEMENT as m,TAU,movementAt} from '../js/feje-tourbillon-mechanism.mjs';
import {astrolabeTime,SKY_PERIOD} from '../js/feje-tourbillon-astrolabe.mjs';
import {celestialPhase,writeNebulaColor,skyDirection,CONSTELLATION_PATHS} from '../js/feje-tourbillon-celestial.mjs';
import {QUALITY_LEVELS,QUALITY_STORAGE_KEY,normalizeQuality,qualityConfiguration} from '../js/feje-tourbillon-quality.mjs';
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

test('escaping teeth drive the minute carriage through the fixed wheel and gear train',()=>{
 const atStart=movementAt(0),atMinute=movementAt(60);
 close(atMinute.cage-atStart.cage,TAU);
 close(atMinute.escape-atStart.escape,TAU*10);
 for(const seconds of [.043,.191,.41,10.410,62.67]){
  const s=movementAt(seconds);
  close(s.escape*m.escapePinion,s.cage*m.fixedFourth);
  close(s.cage*m.cagePinion+s.third*m.thirdWheel,0);
  close(s.third*m.thirdPinion+s.barrel*m.barrel,0);
  close(s.earth*m.earthWheel+s.barrel*m.earthDriver,0);
  close(s.moon*m.moonWheel+s.barrel*m.moonDriver,0);
 }
});

test('the pallet unlocks, drops half a tooth, then locks until the next beat',()=>{
 const beforeDrop=movementAt(.021),releasing=movementAt(.045),banked=movementAt(.105);
 assert.equal(beforeDrop.escape,0);
 assert.ok(releasing.escape>0&&releasing.escape<banked.escape);
 assert.ok(releasing.fork>beforeDrop.fork);
 close(banked.escape,TAU/(2*m.escapeTeeth));
 close(movementAt(.19999).escape,banked.escape);
 close(movementAt(.2).escape,banked.escape);
 close(movementAt(.31).escape,2*banked.escape);
 close(movementAt(.31).fork,-banked.fork);
 assert.ok(movementAt(.1).balance>1&&movementAt(.3).balance< -1);
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

test('nebula pixels retain blue, violet and green channels',()=>{
 const p=new Uint8ClampedArray(8);
 writeNebulaColor(p,4,.7,.8,1);
 assert.ok(p[6]>p[4]&&p[4]>p[5]&&p[5]>10);
 assert.equal(p[7],255);
 assert.deepEqual([...p.slice(0,4)],[0,0,0,0]);
});

test('constellations and embedded stars share the distant blue nebula',()=>{
 const sky=read('js/feje-tourbillon-celestial.mjs');
 assert.match(sky,/const stars=low\?750:1450/);
 assert.match(sky,/constellationPulse\(skyGroup,path,texture/);
 assert.match(sky,/Layered sapphire nebula dome/);
 assert.match(sky,/skyGroup\.rotation\.y=/);
 assert.doesNotMatch(sky,/starField\(root,mobile\?530:920/);
 assert.doesNotMatch(sky,/constellation\(root,\[\[/);
 assert.doesNotMatch(sky,/engraving\(root,'Distant celestial terrace'/);
 assert.equal(CONSTELLATION_PATHS.length,2);
 for(const path of CONSTELLATION_PATHS){
  assert.ok(path.length>=5);
  for(const [u,v] of path){
   assert.ok(u>=0&&u<=1&&v>=0&&v<=1);
   const p=skyDirection(u,v,52);
   close(Math.hypot(...p),52);
   assert.ok(p[2]<0,'constellation belongs to distant hemisphere');
  }
 }
 const back=skyDirection(.75,.5,52);
 close(back[2],-52);close(back[1],0);
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
 assert.match(sky,/platform\(root,gold,gem/);
 assert.match(sky,/Layered sapphire nebula dome/);
 assert.match(sky,/constellationPulse\(skyGroup/);
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
 assert.match(css,/\.feje-world-home \.ft-title-block h2\{[\s\S]*?Cormorant Garamond/);
 assert.match(css,/\.feje-world-home \.ft-kicker\{[\s\S]*?Cinzel/);
 assert.match(css,/@keyframes ft-atelier-zodiac-signal/);
 assert.match(css,/@keyframes ft-atelier-aura/);
 assert.match(css,/@keyframes ft-atelier-streak/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/#tourbillon\[data-ft-card-motion\]/);
 assert.match(app,/root\.toggleAttribute\('data-ft-card-motion',live\(\)&&!paused&&!reduced\.matches\)/);
 assert.match(app,/timeZone:'Asia\/Manila'/);
});

test('quality profiles preserve Default while Low saves fill cost and High adds real pixels',()=>{
 assert.deepEqual(QUALITY_LEVELS,['low','default','high']);
 assert.equal(normalizeQuality('invalid'),'default');
 assert.equal(normalizeQuality(null),'default');
 assert.equal(normalizeQuality('high'),'high');
 assert.match(QUALITY_STORAGE_KEY,/tourbillon/);
 const phone={dpr:3,mobile:true,width:390,height:520};
 const low=qualityConfiguration('low',phone),normal=qualityConfiguration('default',phone),high=qualityConfiguration('high',phone);
 assert.equal(normal.pixelRatio,1.2,'existing default mobile DPR must stay unchanged');
 assert.equal(normal.economy,true);
 assert.equal(normal.adaptive,true);
 assert.equal(low.pixelRatio,.82);
 assert.equal(low.economy,true);
 assert.ok(high.pixelRatio>normal.pixelRatio,'High must visibly supersample');
 assert.equal(high.economy,false);
 assert.equal(high.detailedSky,true);
 const desktop={dpr:1,mobile:false,width:960,height:720};
 assert.equal(qualityConfiguration('default',desktop).pixelRatio,1);
 assert.equal(qualityConfiguration('high',desktop).pixelRatio,2);
 assert.equal(qualityConfiguration('default',{dpr:3,mobile:false}).pixelRatio,1.55);
 const giant=qualityConfiguration('high',{dpr:4,mobile:false,width:4000,height:3000,maxRenderSize:8192});
 assert.ok(giant.pixelRatio**2*4000*3000<=3400000+1,'High must cap pixel budget');
 assert.ok(giant.pixelRatio*4000<=8192,'High must cap max buffer dimension');
});

test('Tourbillon uses live graphics presets, not a decorative no-op selector',()=>{
 const html=read('index.html'),app=read('js/feje-tourbillon.mjs'),render=read('js/feje-tourbillon-renderer.mjs'),sky=read('js/feje-tourbillon-celestial.mjs'),css=read('css/feje-tourbillon.css');
 for(const key of QUALITY_LEVELS)assert.match(html,new RegExp('data-ft-quality="'+key+'"'));
 assert.match(html,/data-ft-quality-toggle aria-haspopup/);
 assert.match(html,/data-ft-quality-panel role="dialog"/);
 assert.match(html,/role="radiogroup" aria-label="Graphics presets"/);
 assert.match(html,/class="ft-quality-gear"/);
 assert.doesNotMatch(html,/data-ft-case/);
 assert.doesNotMatch(app,/caseVisible|caseButton|setCase\(/);
 assert.doesNotMatch(render,/setCase\(/);
 assert.match(app,/QUALITY_STORAGE_KEY/);
 assert.match(app,/model\?\.setQuality\(quality\)/);
 assert.match(app,/createWatchRenderer\(canvas,\{mobile,quality\}\)/);
 assert.match(app,/event\.key==='Escape'/);
 assert.match(app,/event\.key==='ArrowDown'/);
 assert.match(render,/setQuality,stats|stats,rebuildReflections,setQuality/);
 assert.match(render,/renderer\.setPixelRatio\(pixelRatio\)/);
 assert.match(render,/observatory\.setQuality\(mode\)/);
 assert.match(render,/qualityMode==='high'/);
 assert.match(render,/cost\/samples>26/);
 assert.match(sky,/detailedSky=skyTexture\(false\)/);
 assert.match(sky,/setQuality,/);
 assert.match(css,/\.ft-quality-panel\[hidden\]\{display:none!important\}/);
 assert.match(css,/\.ft-quality-option\[aria-checked=true\]/);
});
