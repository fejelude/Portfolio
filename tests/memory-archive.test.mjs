import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const html=read('sofhia-franchesca-16.html');
const config=JSON.parse(read('vercel.json'));
test('approved archival announcement, metadata and direct home link',()=>{
 const copy=[...html.matchAll(/<p>([^<]+)<\/p>/g)].map(m=>m[1]);
 assert.deepEqual(copy,["This website was originally created as a personal birthday surprise, filled with little details, music, artwork, and things I made specifically for that occasion.","Its purpose has been fulfilled, and I’ve decided to preserve it privately out of respect for the person it was made for.","It hasn’t been erased. It’s simply been archived."]);
 for(const part of ['21 October 2026','A Grade 11 Memory.','Privately preserved · 2026','href="https://fejelude.xyz/">Return to Home','name="robots" content="noindex, nofollow"'])assert.ok(html.includes(part),part);
 assert.equal((html.match(/<audio\b/g)||[]).length,1);
 assert.ok(!/<form\b|type="password"|og:url/.test(html));
});
test('original public files removed, associated routes redirect, unrelated rules retained',()=>{
 for(const p of ['sofhias-songs-67.html','compendium.html','assets/birthday','assets/album','assets/compendium','js/birthday-config.mjs','js/album-config.mjs','js/compendium-data.mjs','verification/birthday','verification/album'])assert.equal(existsSync(new URL(p,root)),false,p);
 for(const p of ['/sofhias-songs-67','/sofhias-songs-67.html','/compendium','/compendium.html'])assert.ok(config.redirects.some(r=>r.source===p&&r.destination==='/sofhia-franchesca-16'&&!r.permanent),p);
 for(const p of ['/sofra','/admin','/crush'])assert.ok(config.rewrites.some(r=>r.source===p),p);
 assert.equal(config.git.deploymentEnabled['feat/grade-11-memory-archive'],false);
});
test('original unedited archive track and licensed font available',()=>{
 const data=readFileSync(new URL('assets/memory/archive.mp4',root));
 assert.equal(data.length,1552350);
 assert.equal(createHash('sha256').update(data).digest('hex'),'69136c48e78e790ef334be90266f4649b29f4fe4c2bbc4b8021e2dc1778f8600');
 assert.ok(existsSync(new URL('assets/memory/pixelify-latin.woff2',root)));
 assert.ok(existsSync(new URL('assets/memory/OFL.txt',root)));
 assert.ok(read('css/memory-archive.css').includes('prefers-reduced-motion'));
});
