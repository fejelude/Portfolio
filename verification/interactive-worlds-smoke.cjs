const {chromium,firefox,webkit}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'interactive-worlds-results');
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.svg':'image/svg+xml','.png':'image/png'};
const ids=['room','universe','lab','os','tokyo','particles'];
const server=createServer(async(req,res)=>{
 try{
  const name=new URL(req.url,'http://localhost').pathname;
  const target=name==='/'?'/index.html':path.extname(name)?name:name+'.html';
  const file=path.resolve(root,'.'+target);if(!file.startsWith(root+path.sep))throw Error('path');
  const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 }catch{if(!res.headersSent)res.writeHead(404);res.end()}
});
(async()=>{
 await mkdir(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 for(const [engine,type] of Object.entries({chromium,firefox,webkit})){
  const browser=await type.launch(engine==='chromium'?{headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{});
  try{
   for(const size of [{width:390,height:844},{width:1440,height:900}]){
    const context=await browser.newContext({viewport:size,hasTouch:size.width<500,acceptDownloads:true});const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const checkWidth=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.addInitScript(()=>{
     const request=window.requestAnimationFrame.bind(window);
     window.worldFrames=0;
     window.requestAnimationFrame=callback=>request(time=>{window.worldFrames++;callback(time)});
    });
    const click=async(name)=>page.getByRole('button',{name,exact:true}).click();
    const select=async(name,value)=>page.getByLabel(name,{exact:true}).selectOption(value);
    try{
     await page.goto(base+'/interactives');assert.equal(await page.locator('[data-iw-card]').count(),6);assert.equal(await page.locator('#iw-count').textContent(),'0 / 6');await checkWidth();
     const pointer=page.locator('[data-iw-hero-cursor]');await pointer.waitFor();
     await pointer.scrollIntoViewIfNeeded();
     await page.waitForFunction(()=>document.querySelector('[data-iw-hero-cursor]').hasAttribute('data-visible'));
     assert.equal(await pointer.getAttribute('aria-hidden'),'true');
     assert.equal(await pointer.evaluate(el=>getComputedStyle(el).pointerEvents),'none');
     assert.equal(await pointer.locator('.iw-cursor-drift').evaluate(el=>getComputedStyle(el).animationName),'iw-hero-cursor-fly');
     assert.ok(await pointer.evaluate(el=>{const a=el.getBoundingClientRect(),nav=document.querySelector('.iw-nav').getBoundingClientRect();return a.width>50&&a.right<=innerWidth+1&&a.top>=nav.bottom-15}));
     await click('Pause motion');assert.equal(await pointer.locator('.iw-cursor-drift').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');await click('Resume motion');
     const dragon=page.locator('[data-iw-dragon]');await dragon.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-iw-dragon]').hasAttribute('data-visible'));
     const sprite=dragon.locator('canvas');
     await sprite.waitFor();
     assert.equal(await sprite.evaluate(el=>getComputedStyle(el).imageRendering),'pixelated');
     const frame=await sprite.evaluate(el=>el.toDataURL());
     await page.waitForFunction(first=>document.querySelector('[data-iw-dragon] canvas').toDataURL()!==first,frame);
     assert.ok(await dragon.evaluate(el=>{const a=el.getBoundingClientRect(),b=document.querySelector('.iw-intro-copy').getBoundingClientRect();return a.width>0&&(a.left>=b.right-1||a.top>=b.bottom-1)}));
     await click('Pause motion');
     const pausedFrame=await sprite.evaluate(el=>el.toDataURL());
     await page.waitForTimeout(150);
     assert.equal(await sprite.evaluate(el=>el.toDataURL()),pausedFrame);
     await click('Resume motion');
     await page.waitForFunction(last=>document.querySelector('[data-iw-dragon] canvas').toDataURL()!==last,pausedFrame);
     await page.locator('[data-iw-card="room"]').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-iw-card="room"]').hasAttribute('data-visible'));
     assert.equal(await page.locator('[data-iw-card="room"] .ix-rain').evaluate(el=>getComputedStyle(el).animationName),'iw-rain');
     await click('Pause motion');assert.equal(await page.locator('[data-iw-card="room"] .ix-rain').evaluate(el=>getComputedStyle(el).animationName),'none');await click('Resume motion');
     await page.screenshot({path:path.join(out,engine+'-'+size.width+'-hub.png'),fullPage:true});
     for(const id of ids){
      await page.locator('[data-iw-card="'+id+'"]').click();await page.waitForURL(base+'/interactives/'+id);
      await page.locator('#iw-stage '+(id==='os'?'.iw-os':'canvas')).waitFor();await checkWidth();
      await click('Pause');assert.equal(await page.locator('#iw-pause').getAttribute('aria-pressed'),'true');
      if(id==='room'){
       await click('Pet cat');await click('Pet cat');
       await page.locator('header a.iw-back').click();
       await page.locator('[data-iw-card="room"]').click();
       await page.waitForFunction(()=>document.querySelector('#iw-discovery').textContent.startsWith('1 /'));
       await click('Pause');
       for(const name of ['Look outside','Use computer','Toggle lamp'])await click(name);
       assert.equal(await page.locator('#iw-world-badge').getAttribute('data-earned'),null);
       await click('Secret drawer');assert.match(await page.locator('#iw-message').textContent(),/tiny note/);
       await click('Inspect model car');
      }
      if(id==='universe'){
       await click('Discover this view');
       await select('Celestial view','1');
       await select('Celestial view','2');
       await select('Quality','Low');
       const surface=page.locator('#iw-stage canvas');
       assert.equal(await surface.evaluate(el=>el.width),480);
       if(engine==='chromium'){
        const original=await surface.elementHandle();
        const gl=await original.evaluateHandle(el=>el.getContext('webgl'));
        assert.ok(await gl.evaluate(ctx=>ctx!==null),'Chromium with SwiftShader should compile the shader');
        const recovery=await gl.evaluateHandle(ctx=>ctx.getExtension('WEBGL_lose_context'));
        await recovery.evaluate(ext=>ext.loseContext());
        await page.waitForFunction(old=>document.querySelector('#iw-stage canvas')!==old,original);
        assert.ok(await surface.evaluate(el=>!!el.getContext('2d')));
        await recovery.evaluate(ext=>ext.restoreContext());
        await page.waitForFunction(old=>document.querySelector('#iw-stage canvas')===old,original);
        assert.equal(await gl.evaluate(ctx=>ctx.isContextLost()),false);
        for(const handle of [recovery,gl,original])await handle.dispose();
       }
      }
      if(id==='lab'){await click('Inspect invention');await select('Invention','1');await select('Invention','2');await click('Wireframe');await select('Highlight part','Chassis')}
      if(id==='os'){
       await click('Play');
       await page.locator('.iw-os').scrollIntoViewIfNeeded();
       await page.waitForTimeout(150);
       const startFrames=await page.evaluate(()=>window.worldFrames);
       await page.waitForTimeout(1000);
       const idleFrames=await page.evaluate(()=>window.worldFrames)-startFrames;
       console.log(engine,size.width,'FejeOS idle callbacks in 1s:',idleFrames);
       assert.ok(idleFrames<=2,'An idle desktop only wakes for its clock');
       await click('Pause');
       await select('Open app','terminal');await page.getByLabel('Terminal command').fill('cat secret.txt');await click('Run');assert.match(await page.locator('[data-app="terminal"] pre').textContent(),/Secret found/);await click('Close Terminal');
       await select('Open app','calculator');await page.getByLabel('Calculator expression').fill('(12+8)*3');await click('Calculate');assert.equal(await page.locator('[data-app="calculator"] [role="status"]').textContent(),'60');await click('Close Calculator');
       await select('Open app','files');await click('▤ readme.txt');assert.match(await page.locator('[data-app="files"] pre').textContent(),/Welcome/);await click('Close Files');
       await select('Open app','paint');assert.equal(await page.locator('[data-app="paint"] canvas').count(),1);const download=page.waitForEvent('download');await click('Save PNG');assert.equal((await download).suggestedFilename(),'fejeos-paint.png');await click('Close Paint');
       await select('Open app','settings');await click('Mint');assert.equal(await page.locator('.iw-os').getAttribute('data-wallpaper'),'mint');
      }
      if(id==='tokyo'){await click('Discover this district');await select('Neighborhood','1');await select('Neighborhood','2');await select('Time','1');await select('Neon theme','2')}
      if(id==='particles'){await click('Discover this force');await select('Force','Repulsion');await select('Force','Vortex');await click('Burst');const download=page.waitForEvent('download');await click('Save PNG');assert.equal((await download).suggestedFilename(),'feje-particle-art.png');assert.ok(await page.locator('#iw-stage canvas').evaluate(el=>el.toDataURL('image/png').startsWith('data:image/png')))}
      assert.match(await page.locator('#iw-discovery').textContent(),/badge collected/);
      assert.equal(await page.locator('#iw-world-badge').getAttribute('data-earned'),'');
      await click('Play');await page.locator('#iw-stage').scrollIntoViewIfNeeded();await page.waitForTimeout(150);
      await page.locator('#iw-console').screenshot({path:path.join(out,engine+'-'+size.width+'-'+id+'.png')});
      if(id==='room'){await click('Fullscreen');await page.waitForFunction(()=>document.querySelector('#iw-full').getAttribute('aria-pressed')==='true');await click('Exit fullscreen');await page.waitForFunction(()=>document.querySelector('#iw-full').getAttribute('aria-pressed')==='false');await click('Reset world');await page.locator('#iw-stage canvas').waitFor();assert.match(await page.locator('#iw-discovery').textContent(),/^0 \//)}
      await page.locator('header a.iw-back').click();await page.waitForURL(base+'/interactives');await page.waitForFunction(n=>document.querySelector('#iw-count').textContent===n+' / 6',ids.indexOf(id)+1);
     }
     assert.equal(await page.locator('body').getAttribute('data-complete'),'');assert.match(await page.locator('#iw-reward').textContent(),/Secret unlocked/);
     await page.reload();await page.waitForFunction(()=>document.querySelector('#iw-count').textContent==='6 / 6');
     for(const confirmReset of [false,true]){
      page.once('dialog',dialog=>confirmReset?dialog.accept():dialog.dismiss());
      await click('Reset collection');
      assert.equal(await page.locator('#iw-count').textContent(),confirmReset?'0 / 6':'6 / 6');
     }
     await page.reload();await page.waitForFunction(()=>document.querySelector('#iw-clear').disabled===false);
     assert.equal(await page.locator('[data-iw-badge][data-earned]').count(),0);
     assert.deepEqual(errors,[]);
    }finally{await context.close()}
   }
   const reduced=await browser.newContext({viewport:{width:320,height:568},reducedMotion:'reduce'});
   try{const p=await reduced.newPage();await p.goto(base+'/interactives');assert.equal(await p.locator('#iw-motion').isDisabled(),true);assert.equal(await p.locator('.iw-cursor-drift').evaluate(el=>getComputedStyle(el).animationName),'none');assert.equal(await p.locator('[data-iw-dragon] canvas').isHidden(),true);assert.ok(await p.locator('[data-iw-dragon] img').evaluate(el=>el.complete&&el.naturalWidth===240));assert.equal(await p.locator('[data-iw-card="room"] .ix-rain').evaluate(el=>getComputedStyle(el).animationName),'none');await p.goto(base+'/interactives/room');await p.locator('#iw-stage canvas').waitFor();assert.equal(await p.locator('#iw-pause').getAttribute('aria-pressed'),'true');await p.getByRole('button',{name:'Pet cat',exact:true}).click();assert.match(await p.locator('#iw-discovery').textContent(),/^1 \//)}finally{await reduced.close()}
   const fallback=await browser.newContext({viewport:{width:390,height:844}});
   try{const p=await fallback.newPage();await p.addInitScript(()=>{const actual=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /^webgl/.test(type)?null:actual.call(this,type,...args)}});await p.goto(base+'/interactives/universe');await p.locator('#iw-stage canvas').waitFor();await p.getByRole('button',{name:'Discover this view',exact:true}).click();assert.match(await p.locator('#iw-discovery').textContent(),/^1 \//);assert.ok(await p.locator('#iw-stage canvas').evaluate(el=>!!el.getContext('2d')))}finally{await fallback.close()}
   const restricted=await browser.newContext();
   try{
    await restricted.addInitScript(()=>{
     const set=Storage.prototype.setItem;
     Storage.prototype.setItem=function(key,value){
      if(this===localStorage)throw new DOMException('Full','QuotaExceededError');
      return set.call(this,key,value);
     };
    });
    const p=await restricted.newPage();await p.goto(base+'/interactives/tokyo');
    await p.getByRole('button',{name:'Discover this district'}).click();
    await p.getByLabel('Neighborhood').selectOption('1');await p.getByLabel('Neighborhood').selectOption('2');
    await p.locator('header a.iw-back').click();await p.reload();
    await p.waitForFunction(()=>document.querySelector('#iw-count').textContent==='1 / 6');
    assert.match(await p.locator('#iw-reward').textContent(),/temporary/);
   }finally{await restricted.close()}
   const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:568}});
   try{const p=await nojs.newPage();await p.goto(base+'/interactives');assert.equal(await p.locator('[data-iw-card]').count(),6);assert.ok(await p.locator('[data-iw-dragon] img').evaluate(el=>el.complete&&el.naturalWidth===240));assert.equal(await p.locator('[data-iw-hero-cursor]').count(),1);await p.locator('[data-iw-card="room"]').click();assert.equal(await p.locator('noscript').isVisible(),true)}finally{await nojs.close()}
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
