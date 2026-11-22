import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountMascot} from '../js/sofra-maintenance.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('maintenance takes over public panel route but preserves product page and original files',()=>{
 const config=JSON.parse(read('vercel.json'));
 assert.equal(config.rewrites.find(r=>r.source==='/sofra').destination,'/SofraMaintenance');
 assert.equal(config.rewrites.find(r=>r.source==='/sofra/about').destination,'/Sofra');
 for(const source of ['/SofraPanel','/SofraPanel.html']){
  const route=config.redirects.find(r=>r.source===source);
  assert.equal(route.destination,'/sofra');assert.equal(route.permanent,false);
 }
 const headers=config.headers.find(r=>r.source==='/sofra').headers;
 assert.ok(headers.some(h=>h.key==='Cache-Control'&&h.value==='no-store'));
 assert.match(read('SofraPanel.html'),/sofra-panel-core.js" defer/);
 assert.match(read('SofraMaintenance.html'),/name="robots" content="noindex, nofollow"/);
});
test('exact approved copy, native home link and independent pixel animation are present',()=>{
 const html=read('SofraMaintenance.html'),css=read('css/sofra-maintenance.css');
 assert.equal(html.match(/<h1[^>]*>(.*?)<\/h1>/s)[1].replace(/<br[^>]*>/g,'').trim(),'Sofra will be back soon.');
 assert.ok(html.includes('Unfortunately, Sofra is currently experiencing a problem and has been temporarily shut down because Feje is busy with other things right now. Hopefully, she will be back soon.'));
 assert.match(html,/class="sm-home" href="\/"/);
 assert.doesNotMatch(html,/\/api\/sofra|sofra-panel(?:-core)?\.js|<iframe|<video/);
 assert.match(html,/viewBox="0 0 66 62" shape-rendering="crispEdges"/);
 assert.match(css,/animation:sm-teardrop 1\.2s steps\(1,end\) infinite/);
 assert.match(css,/prefers-reduced-motion:no-preference/);
});
test('animation lifecycle respects visibility, manual pause, reduced motion and page suspension',()=>{
 const target=()=>({events:{},addEventListener(k,fn){this.events[k]=fn;}});
 const motion={...target(),matches:false},doc={...target(),hidden:false};
 let listener,disconnected=false;const classes=new Set();
 const mascot={...target(),classList:{toggle(k,v){v?classes.add(k):classes.delete(k);}},setAttribute(k,v){this[k]=v;}};
 const win={...target(),matchMedia:()=>motion,IntersectionObserver:class{constructor(cb){listener=cb;}observe(){}disconnect(){disconnected=true;}}};
 mountMascot(mascot,doc,win);assert.ok(!classes.has('is-running'));
 listener([{isIntersecting:true}]);assert.ok(classes.has('is-running'));
 mascot.events.click();assert.equal(mascot['aria-pressed'],'true');assert.ok(!classes.has('is-running'));
 mascot.events.click();assert.ok(classes.has('is-running'));
 doc.hidden=true;doc.events.visibilitychange();assert.ok(!classes.has('is-running'));
 doc.hidden=false;doc.events.visibilitychange();assert.ok(classes.has('is-running'));
 motion.matches=true;motion.events.change();assert.equal(mascot.disabled,true);assert.ok(!classes.has('is-enhanced'));
 motion.matches=false;motion.events.change();assert.ok(classes.has('is-running'));
 listener([{isIntersecting:false}]);assert.ok(!classes.has('is-running'));
 listener([{isIntersecting:true}]);win.events.pagehide({persisted:true});assert.ok(!classes.has('is-running'));
 win.events.pageshow();assert.ok(classes.has('is-running'));win.events.pagehide({persisted:false});assert.ok(disconnected);
});
