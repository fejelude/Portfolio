import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Sofra featured-project star becomes a pixel princess crown without disturbing the mascot',()=>{
 const html=read('index.html');
 const section=html.slice(html.indexOf('<section id="sofra-project"'),html.indexOf('<section id="sofra-project"')+4000);
 for(const text of ['class="sofra-feature-kicker"','class="sofra-princess-crown" aria-hidden="true"','shape-rendering="crispEdges"','class="sf-crown-gem"','class="sf-crown-sparkles"','<strong>Featured project</strong>'])assert.ok(section.includes(text),text);
 assert.doesNotMatch(section,/<span aria-hidden="true">✦<\/span>/);
 assert.match(section,/fejes new <span class="sofra-feature-slash">\/</);
 assert.ok(html.includes('id="sofra-feature-mascot"'));
});

test('pixel crown has scoped CSS, reduced motion and smoke coverage',()=>{
 const css=read('css/sofra-feature.css');
 for(const text of ['.feje-world-home .sofra-feature-kicker > .sofra-princess-crown','image-rendering: pixelated','pointer-events: none','@media (prefers-reduced-motion: no-preference)','@keyframes sf-princess-crown-bob','@keyframes sf-princess-crown-gem','@keyframes sf-princess-crown-glint'])assert.ok(css.includes(text),text);
 assert.match(read('verification/home-world-smoke.cjs'),/mode==='reduced'\?'none':'sf-princess-crown-bob'/);
});
