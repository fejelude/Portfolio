import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const html=readFileSync(new URL('../Gallery.html',import.meta.url),'utf8');
const dir=new URL('../assets/mario-odyssey-memories/',import.meta.url);
const {entries}=JSON.parse(readFileSync(new URL('manifest.json',dir),'utf8'));
const section=html.split('<!-- mario-odyssey:start -->')[1].split('<!-- mario-odyssey:end -->')[0];
test('third collection contains exactly 17 kingdoms and four narrative moments',()=>{
 assert.equal(entries.length,21);
 assert.equal(entries.filter(e=>e.kind==='kingdom').length,17);
 assert.equal(entries.filter(e=>e.kind==='story').length,4);
 assert.equal(new Set(entries.map(e=>e.id)).size,21);
 assert.equal(new Set(entries.map(e=>e.file)).size,21);
 assert.equal(entries.at(-1).id,'rescuing-princess-peach');
 assert.ok(html.indexOf('The Hive Minecraft: Bedrock Edition')<html.indexOf('<!-- mario-odyssey:start -->'));
 for(const e of entries){
   assert.ok(section.includes('data-mario-memory="'+e.id+'"'));
   assert.ok(section.includes(e.caption));
   assert.equal(new URL(e.reference).protocol,'https:');
 }
 assert.equal((section.match(/data-mario-memory=/g)||[]).length,21);
 for(const [klass,value] of [['game','Super Mario Odyssey'],['date','2017'],['name','Mark Dhansen']])
   assert.ok(section.includes('<span class="highlight-'+klass+'">'+value+'</span>'));
});
test('old collections are retained; photo cards use local paths and are inert until assets exist',()=>{
 const before=html.split('<!-- mario-odyssey:start -->')[0];
 assert.equal((before.match(/<img [^>]*class="gallery-img"/g)||[]).length,23);
 const photo=!section.includes('<template id="mario-pending-images">');
 assert.equal((section.match(/class="gallery-img"/g)||[]).length,21);
 assert.ok(!section.includes('View screenshot reference'));
 assert.ok(!section.includes('mario-image-note'));
 assert.ok(!section.includes('<a class="gallery-item'));
 for(const e of entries)assert.ok(section.includes('/assets/mario-odyssey-memories/'+e.file));
 if(photo){
   const credits=JSON.parse(readFileSync(new URL('credits.json',dir),'utf8'));
   assert.equal(credits.length,21);
   for(const e of entries){
     assert.ok(existsSync(new URL(e.file,dir)));
     assert.ok(section.includes('/assets/mario-odyssey-memories/'+e.file));
     assert.ok(credits.some(c=>c.id===e.id&&c.permission&&c.credit&&c.source));
   }
   assert.equal((section.match(/loading="lazy"/g)||[]).length,21);
 }else{
   assert.ok(section.includes('</template>'));
   assert.equal((section.match(/loading="lazy"/g)||[]).length,21);
 }
});
