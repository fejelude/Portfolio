import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const html=readFileSync(new URL('../Gallery.html',import.meta.url),'utf8');
const dir=new URL('../assets/mario-odyssey-memories/',import.meta.url);
const {entries}=JSON.parse(readFileSync(new URL('manifest.json',dir),'utf8'));
const section=html.split('<!-- mario-odyssey:start -->')[1].split('<!-- mario-odyssey:end -->')[0];
test('21 local photo cards in original order, no references or placeholders',()=>{
 assert.equal(entries.length,21);
 assert.equal(entries.filter(e=>e.kind==='kingdom').length,17);
 assert.equal(entries.filter(e=>e.kind==='story').length,4);
 assert.equal(new Set(entries.map(e=>e.id)).size,21);
 assert.equal(new Set(entries.map(e=>e.file)).size,21);
 assert.equal(entries.at(-1).id,'rescuing-princess-peach');
 assert.deepEqual([...section.matchAll(/data-mario-memory="([^"]+)"/g)].map(m=>m[1]),entries.map(e=>e.id));
 assert.deepEqual([...section.matchAll(/<div class="gallery-caption">(.*?)<\/div>/g)].map(m=>m[1]),entries.map(e=>e.caption));
 assert.deepEqual([...section.matchAll(/<img src="\/assets\/mario-odyssey-memories\/([^"]+)"/g)].map(m=>m[1]),entries.map(e=>e.file));
 assert.equal((section.match(/class="gallery-img"/g)||[]).length,21);
 assert.equal((section.match(/loading="lazy"/g)||[]).length,21);
 assert.ok(!/<template|View screenshot reference|mario-image-note|<a\s|https?:\/\//.test(section));
 for(const e of entries){
  const data=readFileSync(new URL(e.file,dir));
  assert.equal(data.subarray(0,4).toString(),'RIFF');
  assert.equal(data.subarray(8,12).toString(),'WEBP');
  assert.equal(createHash('sha256').update(data).digest('hex'),e.sha256);
  assert.ok(e.width>0 && e.height>0);
 }
});
test('original introduction and prior galleries retained',()=>{
 assert.equal((html.split('<!-- mario-odyssey:start -->')[0].match(/<img [^>]*class="gallery-img"/g)||[]).length,23);
 assert.ok(html.indexOf('The Hive Minecraft: Bedrock Edition')<html.indexOf('<!-- mario-odyssey:start -->'));
 assert.ok(section.includes('It brings back so many wonderful childhood memories.</p>'));
 for(const [klass,value] of [['game','Super Mario Odyssey'],['date','2017'],['name','Mark Dhansen']])
   assert.ok(section.includes('<span class="highlight-'+klass+'">'+value+'</span>'));
});
