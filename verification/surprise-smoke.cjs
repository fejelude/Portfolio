/* Real browser regression coverage; run in CI after installing Playwright browsers. */
const { chromium, firefox, webkit } = require('playwright');
const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const {readFile, mkdir} = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.mp3':'audio/mpeg','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try {const url=new URL(req.url,'http://localhost');const name=url.pathname==='/'?'/index.html':url.pathname;const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))throw Error('path');const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':body.length});res.end(body);}catch {res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(8765,'127.0.0.1',resolve));
 await mkdir(path.join(__dirname,'surprise-results'),{recursive:true});
 for(const [name,type] of Object.entries({chromium,firefox,webkit})){
  const browser=await type.launch({headless:true});
  try {
   for(const mobile of [false,true]){
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,deviceScaleFactor:mobile?3:1});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    // Load the existing site's graphics dependencies as a normal visitor would.
    await page.addInitScript(()=>{const NativeAudio=window.Audio;window.Audio=function(...args){const a=new NativeAudio(...args);window.__testAudio=a;return a;};});
    await page.goto('http://127.0.0.1:8765');
    await page.locator('#surprise-trigger').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(__dirname,`surprise-results/${name}-${mobile?'mobile':'desktop'}-rest.png`)});
    await page.locator('#surprise-trigger').click();
    try { await page.waitForFunction(()=>window.__testAudio.currentTime>.1, {}, {timeout:8000}); }
    catch(error) {
      console.error(name, {mobile}, await page.evaluate(()=>({status:document.querySelector('#surprise-status')?.textContent, overlays:document.querySelectorAll('.kawaii-world').length, audio:{src:window.__testAudio.src,paused:window.__testAudio.paused,time:window.__testAudio.currentTime,ready:window.__testAudio.readyState,error:window.__testAudio.error?.message}})), errors);
      await page.screenshot({path:path.join(__dirname,`surprise-results/${name}-${mobile?'mobile':'desktop'}-failure.png`)});
      throw error;
    }
    const track=await page.evaluate(()=>window.__testAudio.src);
    await page.locator('#surprise-trigger').click({force:true});
    assert.equal(await page.locator('.kawaii-world').count(),1);
    assert.equal(await page.evaluate(()=>window.__testAudio.src),track);
    await page.getByRole('button',{name:'Mute',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.__testAudio.muted),true);
    await page.getByRole('button',{name:'Unmute',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.kawaii-reveal')?.style.visibility==='visible',{},{timeout:22000});
    await page.waitForTimeout(950);
    const bounds=await page.locator('.kawaii-hero').boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0);
    await page.screenshot({path:path.join(__dirname,`surprise-results/${name}-${mobile?'mobile':'desktop'}-peak.png`)});
    if(mobile){await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
    await page.waitForSelector('.kawaii-world',{state:'detached',timeout:13000});
    assert.equal(await page.evaluate(()=>window.__testAudio.paused),true);
    assert.equal(await page.locator('#surprise-trigger').getAttribute('aria-disabled'),null);
    await page.locator('#surprise-trigger').click();assert.notEqual(await page.evaluate(()=>window.__testAudio.src),track);
    await page.getByRole('button',{name:'End surprise'}).click();
    assert.equal(await page.locator('.kawaii-world').count(),0);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'surprise-trigger');
    assert.deepEqual(errors,[]);
    await context.close();
   }
   const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:320,height:568}});
   const page=await context.newPage();
   await page.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('blocked','NotAllowedError'));};});
   await page.goto('http://127.0.0.1:8765');await page.locator('#surprise-trigger').click();
   await page.waitForFunction(()=>document.querySelector('.kawaii-reveal')?.style.visibility==='visible');
   assert.equal(await page.locator('.kawaii-sticker').count(),0);
   assert.equal(await page.getByRole('button',{name:'Sound unavailable'}).isDisabled(),true);
   await page.screenshot({path:path.join(__dirname,`surprise-results/${name}-reduced-motion.png`)});
   await page.keyboard.press('Escape');assert.equal(await page.locator('.kawaii-world').count(),0);
   await context.close();console.log(`${name}: desktop, mobile, rotation, full audio, replay, mute, cleanup and reduced-motion passed`);
  } finally {await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
