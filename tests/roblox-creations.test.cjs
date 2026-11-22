const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name));
const html=read('index.html').toString();
const section=html.match(/<section id="roblox-creations"[\s\S]*?<\/section>/)?.[0]||'';
test('Roblox creations is a chronological standalone homepage section',()=>{
  assert.ok(section);
  assert.ok(html.indexOf('id="about"')<html.indexOf('id="roblox-creations"'));
  assert.ok(html.indexOf('id="roblox-creations"')<html.indexOf('id="learning"'));
  assert.ok(section.indexOf('id="rc-garage-title"')<section.indexOf('id="rc-build-title"'));
  assert.match(section,/I'll continue making Roblox games with my heart/);
  assert.doesNotMatch(section,/\u2014|\bXD\b/i);
  assert.match(section,/aria-labelledby="roblox-creations-title"/);
});
test('Both actual screenshot previews are local WebP files with reserved dimensions and alt text',()=>{
  for(const name of ['dream-garage-tycoon','build-to-impress']){
    const file='assets/roblox-creations/'+name+'.webp',data=read(file);
    assert.equal(data.toString('ascii',0,4),'RIFF');
    assert.equal(data.toString('ascii',8,12),'WEBP');
    assert.equal(data.readUInt32LE(4)+8,data.length);
    const img=section.match(new RegExp('<img src="/'+file.replace('.','\\.')+'"[^>]*>'))?.[0];
    assert.ok(img);assert.match(img,/width="\d+" height="\d+"/);assert.match(img,/loading="lazy"/);assert.match(img,/alt="[^"]+"/);
  }
});
test('No fabricated game URLs, live statistics or third-party images are introduced',()=>{
  assert.equal((section.match(/https?:\/\//g)||[]).length,1);
  assert.match(section,/https:\/\/www\.roblox\.com\/users\/5512860740\/profile/);
  assert.doesNotMatch(section,/active players|live players|approval rating/i);
  assert.match(read('css/roblox-creations.css').toString(),/prefers-reduced-motion:no-preference/);
});
