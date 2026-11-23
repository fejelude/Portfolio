import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ASPECTS,manilaParts,handAngles} from '../js/feje-tourbillon.mjs';
import {watchSVG} from '../js/feje-tourbillon-art.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Manila timezone is independent of visitor location',()=>{
 const parts=manilaParts(new Date('2026-11-23T13:12:34.500Z'));
 assert.deepEqual(parts,{hour:21,minute:12,second:34,millisecond:500});
 const angles=handAngles(parts);
 assert.ok(Math.abs(angles.hour-276.2875)<.0001);
 assert.ok(Math.abs(angles.minute-75.45)<.0001);
 assert.equal(angles.second,207);
 const midnight=manilaParts(new Date('2026-11-22T16:00:00Z'));
 assert.equal(midnight.hour,0);
 assert.equal(handAngles(midnight).hour,0);
});

test('all four controls resize the frame, never distort the circular watch',()=>{
 assert.deepEqual(ASPECTS,{normal:'4 / 3',landscape:'16 / 9',portrait:'3 / 4',square:'1 / 1'});
 const html=read('index.html'),css=read('css/feje-tourbillon.css');
 assert.ok(html.indexOf('id="interactives-entry"')<html.indexOf('id="tourbillon"'));
 assert.ok(html.indexOf('id="tourbillon"')<html.indexOf('id="sofra-project"'));
 for(const id of Object.keys(ASPECTS))assert.ok(html.includes('data-ft-ratio="'+id+'"'));
 for(const id of ['landscape','portrait','square'])assert.ok(css.includes('data-aspect='+id));
 assert.match(css,/\.ft-watch\{[^}]*aspect-ratio:1/);
 assert.match(html,/ΔΑΙΔΑΛΟΣ/);
});

test('complex original hardware uses no heavyweight render engine',()=>{
 const art=watchSVG(),html=read('index.html'),js=read('js/feje-tourbillon.mjs');
 assert.match(art,/viewBox="0 0 720 720"/);
 assert.ok((art.match(/class="ft-gear ft-spin-/g)||[]).length>=8);
 for(const id of ['ft-hour-hand','ft-minute-hand','ft-second-hand'])assert.ok(art.includes('id="'+id+'"'));
 assert.ok(art.includes('ft-tourb-cage'));
 assert.ok(art.includes('ft-orbit'));
 assert.ok(!art.includes('<script'));
 assert.match(js,/timeZone:'Asia\/Manila'/);
 assert.match(js,/IntersectionObserver/);
 assert.match(js,/document.hidden/);
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.match(js,/localStorage/);
 assert.match(js,/requestAnimationFrame/);
 assert.match(html,/<noscript><p class="ft-nojs">/);
 assert.match(read('css/feje-tourbillon.css'),/@media\(prefers-reduced-motion:reduce\)/);
});
