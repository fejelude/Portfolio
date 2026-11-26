import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {particleGrid,PortraitPhysics} from '../js/about-particle-portrait.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
test('responsive source sampling preserves the complete landscape and adapts density',()=>{
 const desktop=particleGrid(680),mobile=particleGrid(320),low=particleGrid(320,256,144,true);
 assert.deepEqual(desktop,{cols:256,rows:144});
 assert.ok(mobile.cols*mobile.rows>8000&&low.cols<mobile.cols);
 assert.ok(Math.abs(mobile.cols/mobile.rows-16/9)<.03);
});
test('local repulsion moves away, is bounded and returns to exact source cells',()=>{
 const model=new PortraitPhysics(128,72),i=36*128+68,far=10;
 const brush={x:64,y:36.5,radius:15,strength:1};
 for(let f=0;f<18;f++)model.step(1/60,brush);
 assert.ok(model.dx[i]>0);assert.equal(model.dx[far],0);
 assert.ok(model.active.size<1000);
 assert.ok(Math.max(...model.dx)<6);
 for(let f=0;f<240&&model.active.size;f++)model.step(1/60,null);
 assert.equal(model.active.size,0);
 for(const values of [model.dx,model.dy,model.vx,model.vy])assert.ok(values.every(v=>v===0));
});
test('motion stays consistent across 30, 60 and 120 Hz',()=>{
 const values=[30,60,120].map(hz=>{
  const p=new PortraitPhysics(128,72);
  for(let i=0;i<hz*.5;i++)p.step(1/hz,{x:64,y:36.5,radius:15,strength:.8});
  return p.dx[36*128+68];
 });
 assert.ok(Math.max(...values)-Math.min(...values)<.002,JSON.stringify(values));
});
test('portrait stays between motto and copy; only an accessible canvas is presented',()=>{
 const html=read('index.html').toString(),css=read('css/about-particle-portrait.css').toString();
 const block=html.match(/<figure class="about-particle-portrait"[\s\S]*?<\/figure>/)?.[0];
 assert.ok(block);assert.ok(html.indexOf('IS MY MOTTO')<html.indexOf(block));
 assert.ok(html.indexOf(block)<html.indexOf('I am a developer focused on love.'));
 assert.match(block,/<canvas[^>]*role="img"/);assert.doesNotMatch(block,/<(?:img|button|h[1-6]|figcaption)\b/);
 assert.match(css,/touch-action:pan-y pinch-zoom/);assert.match(css,/aspect-ratio:16\/9/);
 const asset=read('assets/about/portrait-samples.webp');
 assert.equal(asset.toString('ascii',0,4),'RIFF');assert.equal(asset.toString('ascii',8,12),'WEBP');
 for(const chunk of ['EXIF','XMP ','ICCP'])assert.equal(asset.includes(Buffer.from(chunk)),false);
});
