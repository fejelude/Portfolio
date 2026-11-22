const {chromium,firefox,webkit}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'home-world-results');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep))throw Error('path');
  const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(body);
 }catch{res.writeHead(404);res.end();}
});
(async()=>{
 await mkdir(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 for(const [name,type] of Object.entries({chromium,firefox,webkit})){
  const browser=await type.launch({headless:true});
  try{
   for(const [width,height,mode] of [[320,700,'normal'],[390,844,'normal'],[768,1024,'normal'],[1440,900,'normal'],[390,844,'reduced'],[390,844,'no-js']]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:width<761,reducedMotion:mode==='reduced'?'reduce':'no-preference',javaScriptEnabled:mode!=='no-js'});
    try{
     const page=await context.newPage();await page.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());await page.goto(url,{waitUntil:'domcontentloaded'});
     const section=page.locator('#roblox-creations');await section.scrollIntoViewIfNeeded();assert.equal(await section.isVisible(),true);
     assert.equal(await section.locator('article').count(),2);
     const logo=section.locator('.rc-roblox-logo');
     await logo.scrollIntoViewIfNeeded();
     assert.equal(await logo.count(),1);
     assert.equal(await logo.getAttribute('aria-hidden'),'true');
     assert.ok(await logo.evaluate(el=>{const r=el.getBoundingClientRect(),h=el.closest('h2').getBoundingClientRect();return r.width>=26&&r.width<=43&&r.left>=h.left-1&&r.right<=h.right+1;}));
     for(const [selector,color] of [['#roblox-creations-title','rgb(199, 169, 255)'],['#rc-garage-title','rgb(229, 176, 210)'],['#rc-build-title','rgb(175, 217, 179)']]){
      assert.equal(await section.locator(selector).evaluate(el=>getComputedStyle(el).color),color);
     }
     if(mode==='reduced'||mode==='no-js')assert.equal(await logo.locator('.rc-roblox-logo-body').evaluate(el=>getComputedStyle(el).animationName),'none');
     else await page.waitForFunction(()=>getComputedStyle(document.querySelector('.rc-roblox-logo-body')).animationName==='rc-logo-idle');
     for(const img of await section.locator('img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode());assert.ok(await img.evaluate(el=>el.naturalWidth===Number(el.getAttribute('width'))&&el.naturalHeight===Number(el.getAttribute('height'))&&Math.abs(el.getBoundingClientRect().width/el.getBoundingClientRect().height-el.naturalWidth/el.naturalHeight)<.025));}
     assert.equal(await section.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&el.scrollWidth<=el.clientWidth+1;}),true);
     const stacked=await section.locator('.rc-entry').first().evaluate(el=>getComputedStyle(el).gridTemplateAreas.startsWith('"heading"'));
     assert.equal(stacked,width<=760);
     assert.equal(await section.locator('.rc-play-link').count(),2);
     assert.equal(await section.locator('.rc-image-frame img').first().evaluate(el=>getComputedStyle(el).objectFit),'contain');
     assert.ok(await section.locator('.rc-image-frame img').first().evaluate(el=>parseFloat(getComputedStyle(el).borderTopLeftRadius)>0));
     if(mode==='reduced'||mode==='no-js'){assert.equal(await section.locator('[data-animate]').count(),0);assert.equal(await section.locator('.rc-motion-toggle').isDisabled(),true);assert.equal(await section.locator('.rc-motion-toggle').isVisible(),true);assert.equal(await page.locator('body').getAttribute('data-rc-scene'),null);}
     else{
      for(const [name,selector] of [['rc-garage','.rc-car'],['rc-build','.rc-house-upper']]){
       const icon=section.locator('.'+name+' .rc-motif');
       await icon.scrollIntoViewIfNeeded();
       assert.equal(await icon.getAttribute('viewBox'),'0 0 54 42');
       assert.equal(await icon.getAttribute('shape-rendering'),'crispEdges');
       const part=icon.locator(selector);
       await page.waitForFunction(sel=>getComputedStyle(document.querySelector(sel)).animationPlayState==='running'&&getComputedStyle(document.querySelector(sel)).animationIterationCount==='infinite','.'+name+' '+selector);
       assert.match(await part.evaluate(el=>getComputedStyle(el).animationTimingFunction),/^steps\(1(?:,\s*end)?\)$/);
       // Sample real CSS animation frames to prove the artwork actually changes.
       const frames=await part.evaluate(el=>{
         const a=el.getAnimations()[0];a.pause();a.currentTime=0;
         const first=getComputedStyle(el).transform+' '+getComputedStyle(el).opacity;
         a.currentTime=3600;
         const finished=getComputedStyle(el).transform+' '+getComputedStyle(el).opacity;
         a.currentTime=6000;
         const repeat=getComputedStyle(el).transform+' '+getComputedStyle(el).opacity;
         a.play();return {first,finished,repeat};
       });
       assert.notEqual(frames.first,frames.finished);assert.equal(frames.first,frames.repeat);
      }
      const toggle=section.locator('.rc-motion-toggle');await toggle.click();
      assert.equal(await toggle.getAttribute('aria-pressed'),'true');
      await logo.scrollIntoViewIfNeeded();assert.equal(await logo.locator('.rc-roblox-logo-body').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
      const first=section.locator('.rc-garage .rc-motif');await first.scrollIntoViewIfNeeded();
      assert.equal(await first.locator('.rc-car').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
      await toggle.click();assert.equal(await toggle.getAttribute('aria-pressed'),'false');
      await logo.scrollIntoViewIfNeeded();await page.waitForFunction(()=>getComputedStyle(document.querySelector('.rc-roblox-logo-body')).animationPlayState==='running');
     }
     if(mode==='normal'){
      const readScene=async(zone)=>{
       await section.locator('[data-rc-zone="'+zone+'"]').evaluate(el=>window.scrollTo({top:window.scrollY+el.getBoundingClientRect().top-innerHeight*.35,behavior:'instant'}));
       await page.waitForFunction(zone=>document.body.dataset.rcScene===zone,zone);
       assert.equal(await section.locator('[data-rc-zone="'+zone+'"]').getAttribute('data-rc-current'),'');
      };
      for(const [zone,background] of [['intro','rgb(32, 20, 47)'],['garage','rgb(48, 24, 36)'],['build','rgb(17, 41, 33)'],['note','rgb(33, 22, 47)']]){
       await readScene(zone);
       await page.waitForFunction(color=>getComputedStyle(document.body).backgroundColor===color,background);
       const active=section.locator('[data-rc-zone="'+zone+'"]');
       assert.equal(await active.locator('.rc-particles i').first().evaluate(el=>getComputedStyle(el).animationName),'rc-pixel-drift');
       if(zone==='garage'||zone==='build')assert.notEqual(await active.locator('.rc-image-frame').evaluate(el=>getComputedStyle(el).boxShadow),'none');
       if(zone==='note')await page.waitForFunction(()=>getComputedStyle(document.querySelector('.rc-heart-beat')).animationName==='rc-heart-beat');
       if(width===390||width===1440)await page.screenshot({path:path.join(out,'chromatic-'+name+'-'+width+'-'+zone+'.png')});
      }
      await readScene('garage');await readScene('intro');
      await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
      await page.waitForFunction(()=>!document.body.hasAttribute('data-rc-scene'));
      await page.waitForFunction(()=>getComputedStyle(document.body).backgroundColor==='rgb(12, 10, 18)');
     }else{
      assert.equal(await section.locator('.rc-heart-beat').evaluate(el=>getComputedStyle(el).animationName),'none');
      assert.equal(await section.locator('.rc-particles i').first().evaluate(el=>getComputedStyle(el).animationName),'none');
     }
     await section.screenshot({path:path.join(out,'roblox-'+name+'-'+width+'-'+mode+'.png'),animations:'disabled'});
    }finally{await context.close();}
   }
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
