/* Six-scene title companion: geometry, timing, pause, reduced-motion, no JS. */
const {chromium,firefox,webkit}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'home-world-results');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://localhost');
    const file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));
    if(!file.startsWith(root+path.sep))throw Error('path');
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);
  }catch{res.writeHead(404);res.end();}
});
(async()=>{
  await mkdir(out,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  for(const [name,type] of Object.entries({chromium,firefox,webkit})){
    const browser=await type.launch({headless:true});
    try{
      for(const [width,height,mode] of [[320,720,'normal'],[390,844,'normal'],[430,932,'normal'],[768,1024,'normal'],[1024,768,'normal'],[1440,900,'normal'],[390,844,'reduced'],[390,844,'no-js']]){
        const context=await browser.newContext({viewport:{width,height},hasTouch:width<900,reducedMotion:mode==='reduced'?'reduce':'no-preference',javaScriptEnabled:mode!=='no-js'});
        try{
          const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
          // This isolated layout test does not need a GPU or remote icon/font assets.
          await page.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
          await page.goto(url,{waitUntil:'domcontentloaded'});
          const row=page.locator('.feje-title-row'),sprite=page.locator('#feje-pixel-companion');
          await row.scrollIntoViewIfNeeded();
          assert.equal(await row.locator('h1').count(),1);
          assert.equal(await sprite.locator('[data-pixel-scene]').count(),6);
          assert.equal(await sprite.isVisible(),true);
          const bounds=await row.evaluate(el=>{
            const b=el.getBoundingClientRect(),a=el.querySelector('button').getBoundingClientRect(),h=el.querySelector('h1').getBoundingClientRect();
            const text=Array.from(el.querySelectorAll('h1 .blur-text')).map(s=>{const r=document.createRange();r.selectNodeContents(s);return r.getBoundingClientRect().right;});
            return {rowLeft:b.left,rowRight:b.right,artLeft:a.left,artRight:a.right,artWidth:a.width,headingRight:h.right,textRight:Math.max(...text),docWidth:document.documentElement.scrollWidth,viewport:innerWidth};
          });
          assert.ok(bounds.artWidth>=60&&bounds.artWidth<=124,JSON.stringify(bounds));
          assert.ok(bounds.headingRight<=bounds.artLeft+1&&bounds.textRight<=bounds.artLeft+1,JSON.stringify(bounds));
          assert.ok(bounds.artRight<=bounds.rowRight+1&&bounds.rowRight<=width+1,JSON.stringify(bounds));
          if(mode==='normal'){
            await page.waitForFunction(()=>document.querySelector('#feje-pixel-companion').classList.contains('is-running'));
            assert.equal(await sprite.isEnabled(),true);
            const duration=await sprite.locator('.feje-pixel-developer').evaluate(el=>getComputedStyle(el).animationDuration);
            assert.equal(duration,'12s');
            // Seek the real CSS animations to the center of every slot, then
            // verify one dominant scene and a crossfade near a boundary.
            await sprite.click();
            assert.equal(await sprite.getAttribute('aria-pressed'),'true');
            const sequence=await sprite.evaluate(el=>{
              const scenes=[...el.querySelectorAll('[data-pixel-scene]')];
              const animations=scenes.map(s=>s.getAnimations()[0]);
              const samples=[];
              for(let i=0;i<6;i++){
                animations.forEach(a=>a.currentTime=i*2000+1000);
                samples.push(scenes.map(s=>Number(getComputedStyle(s).opacity)));
              }
              animations.forEach(a=>a.currentTime=1880);
              const crossing=scenes.map(s=>Number(getComputedStyle(s).opacity));
              animations.forEach(a=>a.currentTime=11880);
              const wrapCrossing=scenes.map(s=>Number(getComputedStyle(s).opacity));
              animations.forEach(a=>a.currentTime=12000+1000);
              const wrap=scenes.map(s=>Number(getComputedStyle(s).opacity));
              return {samples,crossing,wrapCrossing,wrap};
            });
            sequence.samples.forEach((s,i)=>{assert.ok(s[i]>.99,JSON.stringify(sequence));assert.ok(s.filter(v=>v>.01).length===1,JSON.stringify(sequence));});
            assert.ok(sequence.crossing[0]>.05&&sequence.crossing[0]<.95&&sequence.crossing[1]>.05&&sequence.crossing[1]<.95,JSON.stringify(sequence));
            assert.ok(sequence.wrapCrossing[5]>.05&&sequence.wrapCrossing[5]<.95&&sequence.wrapCrossing[0]>.05&&sequence.wrapCrossing[0]<.95,JSON.stringify(sequence));
            assert.ok(sequence.wrap[0]>.99);
            assert.equal(await sprite.locator('.feje-pixel-developer').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
            if(width===390||width===1440){
              for(let i=0;i<6;i++){
                await sprite.evaluate((el,slot)=>{for(const s of el.querySelectorAll('[data-pixel-scene]'))s.getAnimations()[0].currentTime=slot*2000+1000;},i);
                await row.screenshot({path:path.join(out,'hero-pixels-'+name+'-'+width+'-scene-'+i+'.png')});
              }
            }
            await sprite.focus();await page.keyboard.press('Space');
            assert.equal(await sprite.getAttribute('aria-pressed'),'false');
            assert.equal(await sprite.locator('.feje-pixel-developer').evaluate(el=>getComputedStyle(el).animationPlayState),'running');
          }else{
            assert.equal(await sprite.isEnabled(),false);
            assert.equal(await sprite.locator('.feje-pixel-developer').evaluate(el=>getComputedStyle(el).opacity),'1');
            assert.equal(await sprite.locator('.feje-pixel-cat').evaluate(el=>getComputedStyle(el).opacity),'0');
            assert.equal(await sprite.locator('.feje-pixel-developer').evaluate(el=>getComputedStyle(el).animationName),'none');
          }
          await row.screenshot({path:path.join(out,'hero-pixels-'+name+'-'+width+'-'+mode+'.png')});
          assert.deepEqual(errors,[]);
          console.log('Hero pixel companions:',name,width,mode,'passed');
        }finally{await context.close();}
      }
    }finally{await browser.close();}
  }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
