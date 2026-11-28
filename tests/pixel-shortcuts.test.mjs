import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountPixelShortcuts} from '../js/pixel-shortcuts.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('two original destinations, accessible native links, four frames each',()=>{
 const html=read('index.html'),cluster=html.match(/<div class="profile-action-cluster"[\s\S]*?<\/div>/)[0];
 const links=[...cluster.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(m=>m[0]);
 assert.equal(links.length,2);assert.match(links[0],/href="https:\/\/www\.roblox\.com\/users\/\d+\/profile"/);
 assert.match(links[1],/href="\/admin"/);assert.match(links[0],/aria-label="Roblox Profile"/);assert.match(links[1],/aria-label="Admin Panel"/);
 for(const link of links){assert.deepEqual([...link.matchAll(/data-shortcut-frame="(\d)"/g)].map(m=>Number(m[1])),[0,1,2,3]);assert.match(link,/aria-hidden="true"/);}
 assert.match(read('js/living-desktop.mjs'),/pixel-shortcut', 'shortcut'/);
 assert.match(read('js/living-mobile.mjs'),/pixel-shortcut--vault', 'signal'/);
});
test('visibility, reduced motion, page lifecycle and disposal gate both sprites',()=>{
 const make=()=>{const a=new Set();return {a,toggleAttribute:(k,v)=>v?a.add(k):a.delete(k),removeAttribute:k=>a.delete(k)}};
 const links=[make(),make()],doc=new EventTarget(),win=new EventTarget(),media=new EventTarget();
 doc.querySelectorAll=()=>links;doc.hidden=false;win.AbortController=AbortController;win.matchMedia=()=>media;media.matches=false;
 let cb,disconnected=false;
 win.IntersectionObserver=class{constructor(fn){cb=fn}observe(){}disconnect(){disconnected=true}};
 const dispose=mountPixelShortcuts(doc,win);assert.ok(links.every(l=>!l.a.size));
 cb([{target:links[0],isIntersecting:true},{target:links[1],isIntersecting:true}]);assert.ok(links.every(l=>l.a.size));
 cb([{target:links[0],isIntersecting:false}]);assert.ok(!links[0].a.size&&links[1].a.size);
 doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));assert.ok(links.every(l=>!l.a.size));
 doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));assert.ok(links[1].a.size);
 media.matches=true;media.dispatchEvent(new Event('change'));assert.ok(!links[1].a.size);
 media.matches=false;media.dispatchEvent(new Event('change'));assert.ok(links[1].a.size);
 const hide=new Event('pagehide');Object.defineProperty(hide,'persisted',{value:true});win.dispatchEvent(hide);assert.ok(!links[1].a.size);
 win.dispatchEvent(new Event('pageshow'));assert.ok(links[1].a.size);
 dispose();assert.ok(disconnected&&links.every(l=>!l.a.size));
});
