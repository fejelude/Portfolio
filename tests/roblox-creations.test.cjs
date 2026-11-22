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
    assert.ok(img);assert.match(img,/width="\d+" height="\d+"/);
    const [,w,h]=img.match(/width="(\d+)" height="(\d+)"/);
    assert.equal(data.toString('ascii',12,16),'VP8 ');
    assert.equal(data.readUInt16LE(26)&0x3fff,Number(w));assert.equal(data.readUInt16LE(28)&0x3fff,Number(h));
    const sourceRatio=name==='dream-garage-tycoon'?937/914:966/916;
    assert.ok(Math.abs(Number(w)/Number(h)-sourceRatio)<.003);assert.match(img,/loading="lazy"/);assert.match(img,/alt="[^"]+"/);
  }
});
test('Owner-supplied links, full screenshot proportions and continuous motion are retained',()=>{
  assert.equal((section.match(/https?:\/\//g)||[]).length,3);
  assert.match(section,/https:\/\/www\.roblox\.com\/users\/5512860740\/profile/);
  for(const [id,code,stamp] of [['garage','132634f1bcf0e6408124bc98c218b860','1795354910064'],['build','c433ab2168342e45bcbbf4eb823ab887','1795354924018']]){
    const entry=section.match(new RegExp('<article class="rc-entry rc-'+id+'"[\\s\\S]*?<\\/article>'))[0];
    assert.ok(entry.includes('https://www.roblox.com/share?code='+code+'&amp;type=ExperienceDetails&amp;stamp='+stamp));
    assert.match(entry,/target="_blank" rel="noopener noreferrer"/);
    assert.match(entry,/width="360" height="(?:351|341)"/);
  }
  assert.doesNotMatch(section,/active players|live players|approval rating/i);
  assert.match(section,/rc-motion-toggle/);
  assert.match(read('css/roblox-creations.css').toString(),/animation:rc-car-roll 6s steps\(1,end\) infinite/);
  assert.match(read('css/roblox-creations.css').toString(),/animation:rc-build-upper 6s steps\(1,end\) infinite/);
  assert.match(read('css/roblox-creations.css').toString(),/prefers-reduced-motion:no-preference/);
});

test('Pixel Roblox brand artwork and title colors are scoped to the creations section',()=>{
  assert.match(section,/<h2 id="roblox-creations-title"[^>]*>\s*<button class="rc-motion-toggle"[^>]*>\s*<svg class="rc-roblox-logo"[^>]*aria-hidden="true"[^>]*shape-rendering="crispEdges"/);
  assert.match(section,/<span id="rc-title-text">My Roblox Creations\.<\/span>/);
  assert.equal((html.match(/class="rc-roblox-logo"/g)||[]).length,1);
  const css=read('css/roblox-creations.css').toString();
  assert.match(css,/\.rc-entry h3\{color:var\(--rc-accent\)\}/);
  assert.match(css,/animation:rc-logo-idle 4s steps\(8,end\) infinite/);
  assert.match(css,/\.rc-header\[data-animation-paused\] \.rc-roblox-logo \*\{\s*animation-play-state:paused/);
  assert.match(read('js/roblox-creations.mjs').toString(),/observer\.observe\(entry\.querySelector\('\.rc-roblox-logo, \.rc-motif, \.rc-note-mark'\)\)/);
});

test('Both game motifs use a real 54 by 42 pixel grid, not gradients or smooth vector shapes',()=>{
  const motifs=[...section.matchAll(/<svg class="rc-motif rc-(?:garage|build)-icon"[\s\S]*?<\/svg>/g)].map(m=>m[0]);
  assert.equal(motifs.length,2);
  for(const svg of motifs){
    assert.match(svg,/viewBox="0 0 54 42" shape-rendering="crispEdges"/);
    assert.doesNotMatch(svg,/<(?:linearGradient|radialGradient|ellipse|circle|polygon)\b/);
    const paths=[...svg.matchAll(/<path fill="(#[0-9a-f]{6})" d="([^"]+)"/gi)];
    assert.ok(paths.length>=20);
    for(const [,color,data] of paths){
      assert.match(data,/^(?:M\d+ \d+h\d+v1h-\d+z)+$/);
      for(const [,x,y,w,back] of data.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)){
        assert.equal(w,back);assert.ok(+x+ +w<=54&&+y<42&&+w>0);
      }
    }
  }
  const css=read('css/roblox-creations.css').toString();
  assert.match(css,/\.rc-wheel-spin\{animation:rc-wheel-turn 6s steps\(1,end\) infinite\}/);
  assert.match(css,/\.rc-entry\[data-animation-paused\] \.rc-motif \*\{animation-play-state:paused\}/);
});

test('chromatic showcase is scoped, motion-aware and uses the logo as its control',()=>{
 const css=read('css/roblox-creations.css').toString();
 assert.equal((section.match(/class="rc-motion-toggle"/g)||[]).length,1);
 assert.match(section,/class="rc-motion-toggle" type="button" disabled aria-pressed="false"/);
 assert.equal((section.match(/class="rc-particles"/g)||[]).length,4);
 assert.match(section,/class="rc-note-mark" viewBox="0 0 24 24" shape-rendering="crispEdges"/);
 for(const [scene,color] of [['intro','#20142f'],['garage','#301824'],['build','#112921'],['note','#21162f']]){
  assert.ok(section.includes('data-rc-zone="'+scene+'"'));
  assert.ok(css.includes('body.feje-world-home[data-rc-scene="'+scene+'"]{--rc-page:'+color));
 }
 assert.match(css,/transition:background-color \.78s/);
 assert.match(css,/animation:rc-pixel-drift 5\.6s steps\(1,end\) infinite/);
 assert.match(css,/animation:rc-heart-beat 2\.4s steps\(1,end\) infinite/);
 assert.match(css,/\.rc-entry\[data-rc-current\] \.rc-image-frame/);
 assert.match(css,/prefers-reduced-motion:no-preference/);
});
test('reading-line scene selection honors boundaries in either scroll direction',async()=>{
 const {pickScene}=await import('../js/roblox-creations.mjs');
 const bounds={top:100,bottom:1000},zones=[{name:'intro',top:150},{name:'garage',top:300},{name:'build',top:600},{name:'note',top:850}];
 for(const [line,scene] of [[50,null],[100,'intro'],[299,'intro'],[300,'garage'],[599,'garage'],[600,'build'],[850,'note'],[999,'note'],[1000,null],[700,'build'],[250,'intro']])
  assert.equal(pickScene(bounds,zones,line),scene);
});

test('showcase controller clears the theme outside the chapter and responds to motion preferences',async()=>{
 const {mountShowcase}=await import('../js/roblox-creations.mjs');
 const listeners=()=>({events:{},addEventListener(k,f){this.events[k]=f;},removeEventListener(k){delete this.events[k];}});
 let offset=0,callback,frameCallback,seq=0;
 const entries=['intro','garage','build','note'].map((name,i)=>{const e={dataset:{rcZone:name},getBoundingClientRect:()=>({top:100+i*400-offset}),querySelector:()=>({closest:()=>e})};return e;});
 const motion={...listeners(),matches:false},doc={...listeners(),body:{dataset:{}},hidden:false};
 const toggle={...listeners(),setAttribute(k,v){this[k]=v;}};
 const root={dataset:{},querySelectorAll:()=>entries,querySelector:()=>toggle,getBoundingClientRect:()=>({top:80-offset,bottom:1860-offset})};
 const win={...listeners(),innerHeight:800,matchMedia:()=>motion,requestAnimationFrame:f=>{frameCallback=f;return ++seq;},cancelAnimationFrame:()=>{frameCallback=null;},IntersectionObserver:class{constructor(cb){callback=cb;}observe(){}disconnect(){}}};
 const flush=()=>{const f=frameCallback;frameCallback=null;f?.();};
 mountShowcase(root,doc,win);flush();assert.equal(doc.body.dataset.rcScene,'intro');
 callback([{target:entries[0].querySelector(),isIntersecting:true}]);flush();assert.equal(entries[0].dataset.animate,'');
 offset=600;win.events.scroll();flush();assert.equal(doc.body.dataset.rcScene,'build');assert.equal(entries[2].dataset.rcCurrent,'');
 toggle.events.click();flush();assert.equal(root.dataset.rcPaused,'');assert.equal(entries[0].dataset.animationPaused,'');
 motion.matches=true;motion.events.change();assert.equal(doc.body.dataset.rcScene,undefined);assert.equal(toggle.disabled,true);
 motion.matches=false;motion.events.change();flush();assert.equal(doc.body.dataset.rcScene,'build');toggle.events.click();flush();
 offset=220;win.events.scroll();flush();assert.equal(doc.body.dataset.rcScene,'garage');
 offset=-400;win.events.scroll();flush();assert.equal(doc.body.dataset.rcScene,undefined);
 offset=2400;win.events.scroll();flush();assert.equal(doc.body.dataset.rcScene,undefined);
 doc.hidden=true;doc.events.visibilitychange();assert.equal(root.dataset.rcPaused,'');
});

test('game captions keep the names without screenshot capture labels',()=>{
 assert.match(section,/<figcaption><span>01 \/ Dream Garage Tycoon<\/span><\/figcaption>/);
 assert.match(section,/<figcaption><span>02 \/ Build to Impress<\/span><\/figcaption>/);
 assert.doesNotMatch(section,/Roblox screenshot · captured earlier/);
});
