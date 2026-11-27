import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gradientStops,CHAPTERS} from '../js/home-atmosphere.mjs';
test('document wash covers every pixel with continuous, ordered RGB stops',()=>{
 const stops=gradientStops([{y:300,color:'#10213a'},{y:900,color:'#352139'},{y:1500,color:'#192e37'}],2000);
 const pos=stops.map(s=>Number(s.match(/([\d.]+)px$/)[1]));
 assert.equal(pos[0],0);assert.equal(pos.at(-1),2000);
 assert.ok(pos.every((p,i)=>!i||p>pos[i-1]));
 assert.ok(stops.includes('rgb(16,33,58) 300.00px'));
 assert.ok(stops.includes('rgb(53,33,57) 900.00px'));
 assert.ok(stops.includes('rgb(25,46,55) 1500.00px'));
 assert.equal(gradientStops([],1000).length,2);
});
test('palette anchors cover all major chapters including Interactives and Roblox sub-scenes',()=>{
 const names=CHAPTERS.map(a=>a[0]).join(' ');
 for(const id of ['home','interactives-entry','tourbillon','sofra-project','about','roblox-creations','services','learning','goals','contact'])assert.ok(names.includes('#'+id));
 const js=readFileSync(new URL('../js/home-atmosphere.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(js,/addEventListener\(['"]scroll/);
 assert.doesNotMatch(js,/createElement\(['"]canvas/);
 const css=readFileSync(new URL('../css/home-atmosphere.css',import.meta.url),'utf8');
 assert.match(css,/background-attachment:scroll/);assert.match(css,/border-top-color:transparent/);
});
