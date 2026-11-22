const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const read=p=>readFileSync(path.join(__dirname,'..',p),'utf8');
test('interactives entry follows collectible controls and precedes Sofra',()=>{
 const html=read('index.html'),block=html.match(/<div class="ix-entry" id="interactives-entry">[\s\S]*?<\/details>\s*<\/div>/)?.[0];
 assert.ok(block);assert.ok(html.indexOf('id="world-controls"')<html.indexOf('id="interactives-entry"'));
 assert.ok(html.indexOf('id="interactives-entry"')<html.indexOf('id="sofra-project"'));
 assert.match(block,/<a class="ix-cta" href="\/interactives">/);
 assert.match(block,/<span>View interactives<\/span>/);
 assert.match(block,/<details class="ix-details">\s*<summary>how does this work\? hehe<\/summary>/);
 assert.match(block,/shape-rendering="crispEdges"/);
 assert.match(html,/href="\/css\/interactives\.css"/);
});
test('clean URL resolves to a genuine static placeholder, with a return link',()=>{
 assert.equal(JSON.parse(read('vercel.json')).cleanUrls,true);
 const page=read('interactives.html'),css=read('css/interactives.css');
 assert.match(page,/<title>Interactives \| Itsmefeje<\/title>/);
 assert.match(page,/<h1>My interactives\.<\/h1>/);
 assert.match(page,/href="\/#interactives-entry"/);
 assert.doesNotMatch(page,/<script|<iframe/);
 assert.match(css,/ix-star-hop 1\.6s steps\(1,end\) 3/);
 assert.match(css,/@media\(prefers-reduced-motion:no-preference\)/);
});
