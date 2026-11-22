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
    const url=new URL(req.url,'http://localhost');const name=url.pathname==='/'?'/index.html':url.pathname==='/interactives'?'/interactives.html':url.pathname;
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
        assert.equal(await page.locator('.brand-mark svg path').count(),3);
        assert.match(await page.locator('.footer-bottom .footer-links a').textContent(),/November 22, 2026/);
        assert.equal(await page.locator('#surprise-trigger').count(),1);
        assert.equal(await page.locator('a[href="/sofra"]').count()>=1,true);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        if(mode==='reduced')assert.equal(await page.locator('.brand-code-left').evaluate(el=>getComputedStyle(el).animationName),'none');
        assert.match(await page.locator('.world-view-label').textContent(),/FEJE'S COLLECTIBLES/);
        // Entry point is accessible even with JavaScript disabled or WebGL unavailable.
        const ix=page.locator('#interactives-entry'),link=ix.locator('a.ix-cta');
        await link.scrollIntoViewIfNeeded();assert.equal(await link.isVisible(),true);
        assert.equal(await link.getAttribute('href'),'/interactives');
        const bounds=await link.boundingBox();assert.ok(bounds.height>=44&&bounds.x>=0&&bounds.x+bounds.width<=await page.evaluate(()=>innerWidth)+1);
        const details=ix.locator('details');assert.equal(await details.getAttribute('open'),null);
        await details.locator('summary').click();assert.equal(await details.locator('p').isVisible(),true);
        await details.locator('summary').click();assert.equal(await details.getAttribute('open'),null);
        if(mode==='reduced')assert.equal(await link.locator('.ix-star-body').evaluate(el=>getComputedStyle(el).animationName),'none');
        else if(mode!=='no-js')await page.waitForFunction(()=>document.querySelector('#interactives-entry').hasAttribute('data-ix-visible'));
        await link.click();await page.waitForURL(url+'/interactives');
        assert.equal(await page.locator('h1').textContent(),'My interactives.');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
        assert.equal(await page.locator('.ix-template-main a.ix-return').getAttribute('href'),'/#interactives-entry');
        await page.locator('.ix-return').click();await page.waitForURL(url+'/#interactives-entry');
        await page.goto(url,{waitUntil:'domcontentloaded'});
        if(mode==='no-js'){assert.equal(await page.locator('#about').isVisible(),true);assert.equal(await page.locator('#world-collection').isVisible(),false);await context.close();continue;}
        await page.locator('#world-collection').waitFor({state:'visible'});
        assert.equal(await page.locator('[data-collectible-choice]').count(),10);
        assert.equal(await page.locator('#collection-name').textContent(),'Aspark Owl');
        if(mobile){
          const nav=page.locator('.mobile-toggle');await nav.click();
          assert.equal(await nav.getAttribute('aria-expanded'),'true');
          const mobileLinks=page.locator('.nav-links');
          assert.equal(await mobileLinks.locator('a[href="#surprise"]').textContent(),'Click me');
          assert.equal(await mobileLinks.locator('a.sofra-panel-link[href="/sofra"]').textContent(),'Sofra Panel');
          assert.doesNotMatch(await mobileLinks.textContent(),/[♡♥]/);
          await nav.click();assert.equal(await nav.getAttribute('aria-expanded'),'false');
        }
        const launch=page.locator('#world-launch'), stage=page.locator('#world-stage');
        await page.locator('#world-viewport').scrollIntoViewIfNeeded();
        if(mode==='reduced')assert.equal(await stage.getAttribute('data-state'),null);
        await page.waitForFunction(()=>{const s=document.querySelector('#world-stage'),b=document.querySelector('#world-launch');return s.dataset.state==='live'||(!b.hidden&&!b.disabled);});
        if((await stage.getAttribute('data-state'))!=='live') {
          // Automatic desktop startup may race an explicit click; success in
          // either path is equivalent. Do not swallow a failed launch.
          try{await launch.click({timeout:2500});}catch(error){if((await stage.getAttribute('data-state'))!=='live')throw error;}
        }
        await page.waitForFunction(()=>['live','fallback'].includes(document.querySelector('#world-stage').dataset.state));
        const state=await stage.getAttribute('data-state');
        if(mode==='no-webgl'){
          assert.equal(state,'fallback');
          await page.locator('[data-collectible-choice="9"]').click();
          assert.equal(await stage.getAttribute('data-collectible'),'9');
          assert.equal(await page.locator('#collection-name').textContent(),'Czinger 21C');
          assert.match(await page.locator('.world-poster').evaluate(el=>el.style.backgroundImage),/collectible-10\.svg/);
          await page.locator('#collection-next').click();
          assert.equal(await stage.getAttribute('data-collectible'),'0');
        }
        if(name==='chromium'&&mode==='desktop')assert.equal(state,'live','Chromium must render the real scene');
        if(state==='live'){
          const canvas=page.locator('#world-canvas-host canvas');
          await canvas.focus();await page.keyboard.press('ArrowLeft');
          if(mode==='reduced')assert.equal(await page.locator('#world-motion').getAttribute('aria-pressed'),'true');
          await page.locator('[data-world-view="workshop"]').click();
          assert.equal(await page.locator('#world-status').textContent(),'03 / LEARNING');
          assert.equal(await page.locator('#world-destination').getAttribute('href'),'#learning');
          await page.locator('#world-lights').click();
          assert.equal(await page.locator('#world-lights').getAttribute('aria-pressed'),'false');
          await page.locator('[data-world-view="gallery"]').click();
          assert.equal(await page.locator('#world-destination').getAttribute('href'),'Gallery.html');
          await page.locator('[data-world-view="arrival"]').click();
          if(await page.locator('#world-motion').getAttribute('aria-pressed')==='false')await page.locator('#world-motion').click();
          // A paused scene must switch immediately, with no extra canvas.
          const expected=['Aspark Owl','Bugatti Tourbillon','Koenigsegg Jesko Attack','Aston Martin Valkyrie','Lotus Evija','Ferrari F80','Pagani Utopia','McLaren W1','Rimac Nevera R','Czinger 21C'];
          const slots=name==='chromium'&&mode==='desktop'?[1,2,3,4,5,6,7,8,9,0]:[4,9,0];
          for(const slot of slots){
            await page.locator('[data-collectible-choice="'+slot+'"]').click();
            await page.waitForFunction(i=>document.querySelector('#world-stage').dataset.collectible===String(i),slot);
            assert.equal(await page.locator('#collection-name').textContent(),expected[slot]);
            assert.equal(await page.locator('[data-collectible-choice][aria-pressed="true"]').count(),1);
            assert.equal(await page.locator('#world-canvas-host canvas').count(),1);
            assert.equal(await canvas.evaluate(c=>c.getContext('webgl').getError()),0);
            if(name==='chromium'&&mode==='desktop')await page.locator('#world-viewport').screenshot({path:path.join(out,'collectible-'+(slot+1)+'.png')});
          }
          await page.locator('#collection-prev').click();
          assert.equal(await stage.getAttribute('data-collectible'),'9');
          await page.locator('#collection-next').click();
          assert.equal(await stage.getAttribute('data-collectible'),'0');
          if(mode==='reduced')assert.equal(await page.locator('#world-showcase').isDisabled(),true);
          else{
            await page.locator('#world-showcase').click();assert.equal(await page.locator('#world-showcase').getAttribute('aria-pressed'),'true');
            await canvas.focus();await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('#world-showcase').getAttribute('aria-pressed'),'false');
            await page.evaluate(()=>{document.querySelector('[data-collectible-choice="1"]').click();document.querySelector('[data-collectible-choice="7"]').click();});
            await page.waitForFunction(()=>document.querySelector('#world-stage').dataset.collectible==='7');
            await page.locator('#world-motion').click();
            await page.locator('[data-collectible-choice="0"]').click();
          }
          // Paused movement still updates the camera; verify the actual context and visible frame.
          const sample=await canvas.evaluate(c=>{const gl=c.getContext('webgl');return {width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,error:gl.getError()};});
          assert.ok(sample.width>0&&sample.height>0);assert.equal(sample.error,0);
          // Real GL validation on a fresh canvas before screenshots. The branch's
          // shader sources, both framebuffer passes and final composite run here.
          if(name==='chromium'&&(mode==='desktop'||mode==='mobile')){
            const render=await page.evaluate(async low=>{
              const {TerminalRenderer,STATIONS,copyView}=await import('/js/home-world-renderer.mjs');
              const c=document.createElement('canvas');c.style.cssText='position:fixed;left:-2000px;top:0;width:320px;height:260px';document.body.append(c);
              let renderer;
              try{
                renderer=new TerminalRenderer(c,low);renderer.draw(copyView(STATIONS.arrival),true,0);
                const gl=renderer.gl,scene=renderer.sceneTarget,reflection=renderer.reflectionTarget;
                if(!scene||!reflection)return {targets:false,error:gl.getError()};
                const sample=target=>{
                  gl.bindFramebuffer(gl.FRAMEBUFFER,target?target.frame:null);
                  const w=target?target.w:c.width,h=target?target.h:c.height;
                  const data=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,data);
                  const bins=new Set();let lit=0;
                  for(let i=0;i<data.length;i+=4){bins.add((data[i]>>4)*256+(data[i+1]>>4)*16+(data[i+2]>>4));if(Math.max(data[i],data[i+1],data[i+2])>150)lit++;}
                  return {bins:bins.size,lit};
                };
                const final=sample(null),mirror=sample(reflection),base=sample(scene);
                gl.bindFramebuffer(gl.FRAMEBUFFER,null);
                return {targets:true,final,mirror,base,ratio:reflection.w/scene.w,error:gl.getError()};
              }finally{renderer?.dispose();c.remove();}
            },mobile);
            assert.ok(render.targets,JSON.stringify(render));assert.equal(render.error,0);
            for(const s of [render.final,render.mirror,render.base])assert.ok(s.bins>8&&s.lit>0,JSON.stringify(render));
            assert.ok(render.ratio>=.35&&render.ratio<=.55,JSON.stringify(render));
          }
          await page.locator('#world-viewport').screenshot({path:path.join(out,name+'-'+mode+'-neon-city.png')});
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
