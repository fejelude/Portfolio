/* Browser smoke, with a real WebGL context when available. */
const {chromium,firefox,webkit}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const out=path.join(__dirname,'home-world-results');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');const name=url.pathname==='/'?'/index.html':url.pathname;
    const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))throw Error('path');
    const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404);res.end();}
});
(async()=>{
  await mkdir(out,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  for(const [name,type] of Object.entries({chromium,firefox,webkit})){
    const browser=await type.launch(name==='chromium'?{headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{headless:true});
    try{
      for(const mode of ['desktop','mobile','reduced','no-webgl','no-js']){
        const mobile=mode==='mobile';
        const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,reducedMotion:mode==='reduced'?'reduce':'no-preference',javaScriptEnabled:mode!=='no-js'});
        const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
        if(mode==='no-webgl')await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /^webgl/.test(type)?null:original.call(this,type,...args);};});
        await page.goto(url,{waitUntil:'domcontentloaded'});
        assert.equal(await page.locator('h1').count(),1);
        assert.equal(await page.locator('#surprise-trigger').count(),1);
        assert.equal(await page.locator('a[href="/sofra"]').count()>=1,true);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        if(mode==='no-js'){assert.equal(await page.locator('#about').isVisible(),true);await context.close();continue;}
        if(mobile){
          const nav=page.locator('.mobile-toggle');await nav.click();
          assert.equal(await nav.getAttribute('aria-expanded'),'true');
          await nav.click();assert.equal(await nav.getAttribute('aria-expanded'),'false');
        }
        const launch=page.locator('#world-launch'), stage=page.locator('#world-stage');
        await page.locator('#world-viewport').scrollIntoViewIfNeeded();
        if(mode==='reduced')assert.equal(await stage.getAttribute('data-state'),null);
        if(await launch.isVisible())await launch.click();
        await page.waitForFunction(()=>['live','fallback'].includes(document.querySelector('#world-stage').dataset.state));
        const state=await stage.getAttribute('data-state');
        if(mode==='no-webgl')assert.equal(state,'fallback');
        if(name==='chromium'&&mode==='desktop')assert.equal(state,'live','Chromium must render the real scene');
        if(state==='live'){
          const canvas=page.locator('#world-canvas-host canvas');
          await canvas.focus();await page.keyboard.press('ArrowLeft');
          if(mode==='reduced')assert.equal(await page.locator('#world-motion').getAttribute('aria-pressed'),'true');
          await page.locator('[data-world-view="workshop"]').click();
          assert.equal(await page.locator('#world-status').textContent(),'03 / WORKSHOP');
          assert.equal(await page.locator('#world-destination').getAttribute('href'),'#learning');
          await page.locator('#world-lights').click();
          assert.equal(await page.locator('#world-lights').getAttribute('aria-pressed'),'false');
          await page.locator('[data-world-view="gallery"]').click();
          assert.equal(await page.locator('#world-destination').getAttribute('href'),'Gallery.html');
          await page.locator('[data-world-view="arrival"]').click();
          if(await page.locator('#world-motion').getAttribute('aria-pressed')==='false')await page.locator('#world-motion').click();
          // Paused movement still updates the camera; verify the actual context and visible frame.
          const sample=await canvas.evaluate(c=>{const gl=c.getContext('webgl');return {width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,error:gl.getError()};});
          assert.ok(sample.width>0&&sample.height>0);assert.equal(sample.error,0);
          await page.screenshot({path:path.join(out,name+'-'+mode+'.png')});
          if(mode==='desktop'){
            const canLose=await canvas.evaluate(c=>Boolean(c.getContext('webgl').getExtension('WEBGL_lose_context')));
            if(canLose){
              await canvas.evaluate(c=>c.getContext('webgl').getExtension('WEBGL_lose_context').loseContext());
              await page.waitForFunction(()=>document.querySelector('#world-stage').dataset.state==='fallback');
              assert.equal(await launch.isVisible(),true);
            }
          }
        }else await page.screenshot({path:path.join(out,name+'-'+mode+'-fallback.png')});
        assert.deepEqual(errors,[]);
        console.log(name,mode,state);
        await context.close();
      }
    }finally{await browser.close();}
  }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
