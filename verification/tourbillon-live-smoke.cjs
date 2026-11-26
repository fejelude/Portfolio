const {chromium,firefox,webkit}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir,access}=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const out=path.join(__dirname,'home-world-results');
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.webp':'image/webp','.woff':'font/woff','.mp4':'video/mp4'};
const section=readFile(path.join(root,'index.html'),'utf8').then(html=>{
 const watch=html.match(/<section id="tourbillon"[\s\S]*?<\/section>/)[0];
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
 <title>Daedalus · Live WebGL review</title><link rel="stylesheet" href="/css/feje-tourbillon.css">
 <style>*{box-sizing:border-box}body{margin:0;background:#0e121b}.ft-section{padding-inline:16px}.container{margin:auto}</style>
 <body class="feje-world-home">${watch}<div aria-hidden="true" style="height:120vh"></div><script type="module" src="/js/feje-tourbillon.mjs"></script></body></html>`;
});
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end(await section);return}
  const file=path.resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+path.sep))throw Error('path');
  const data=await readFile(file);
  const type=mime[path.extname(file)]||'application/octet-stream';
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if(range&&type==='video/mp4'){
   const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):data.length-1,data.length-1);
   if(start>end){res.writeHead(416,{'Content-Range':'bytes */'+data.length});res.end();return}
   res.writeHead(206,{'Content-Type':type,'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1));return;
  }
  res.writeHead(200,{'Content-Type':type,'Content-Length':data.length,'Accept-Ranges':'bytes'});res.end(data);
 }catch{res.writeHead(404);res.end()}
});

async function enter(page){
 const stage=page.locator('[data-ft-stage]');
 await stage.scrollIntoViewIfNeeded();
 await page.getByRole('button',{name:'Explore in 3D'}).click();
 await stage.locator('.ft-model').waitFor({timeout:45000});
 await page.waitForFunction(()=>document.querySelector('[data-ft-stage]').hasAttribute('data-ft-live'));
}
async function verifyPreviewMedia(page){
 const stage=page.locator('[data-ft-stage]'),video=page.locator('[data-ft-video]');
 await stage.scrollIntoViewIfNeeded();
 const bounds=await stage.boundingBox();assert.ok(Math.abs(bounds.width/bounds.height-16/9)<.02);
 assert.equal(await video.evaluate(v=>v.controls),false);
 assert.equal(await page.locator('[data-ft-pause]').count(),0);
 const exists=await access(path.join(root,'assets/tourbillon/daedalus-preview.mp4')).then(()=>true,()=>false);
 if(!exists){
  console.warn('Missing source MP4: cinematic playback and loop verification blocked');
  return;
 }
 await page.waitForFunction(()=>{const v=document.querySelector('[data-ft-video]');return !v.paused&&v.currentTime>0});
 const media=await video.evaluate(v=>({duration:v.duration,muted:v.muted,loop:v.loop,inline:v.playsInline,width:v.videoWidth,height:v.videoHeight}));
 assert.ok(Math.abs(media.duration-8)<.2&&media.muted&&media.loop&&media.inline&&Math.abs(media.width/media.height-16/9)<.02);
 await video.evaluate(v=>v.currentTime=v.duration-.3);
 await page.waitForFunction(()=>document.querySelector('[data-ft-video]').currentTime<2);
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
 await page.waitForFunction(()=>document.querySelector('[data-ft-video]').paused);
 await stage.scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>!document.querySelector('[data-ft-video]').paused);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>document.querySelector('[data-ft-video]').paused);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForFunction(()=>!document.querySelector('[data-ft-video]').paused);
 console.log('Daedalus cinematic media',JSON.stringify(media));
}
async function recordSky(browser,url){
 const viewport={width:920,height:900};
 const context=await browser.newContext({viewport,deviceScaleFactor:.8,timezoneId:'America/Los_Angeles',
  recordVideo:{dir:out,size:{width:1000,height:750}}});
 const page=await context.newPage();
 const video=page.video();
 try{
  await page.goto(url);
  const stage=page.locator('[data-ft-stage]'),canvas=page.locator('.ft-model');
  const astro=page.locator('.ft-astrolabe');
  await stage.scrollIntoViewIfNeeded();
  await verifyPreviewMedia(page);
  await stage.screenshot({path:path.join(out,'daedalus-preview-desktop.png')});
  await enter(page);
  const time=await page.locator('#ft-time').evaluate(el=>Number(el.textContent.slice(0,2)));
  assert.equal(await astro.locator('figcaption').textContent(),time>=6&&time<18?'Manila day':'Manila night');
  assert.equal(await astro.locator('canvas').evaluate(c=>getComputedStyle(c).imageRendering),'pixelated');
  // Capture the running mechanism and its independent astrolabe.
  await page.waitForTimeout(20800);
  await astro.screenshot({path:path.join(out,'daedalus-pixel-astrolabe.png'),timeout:60000});
  await stage.screenshot({path:path.join(out,'daedalus-celestial-desktop.png'),timeout:60000});
  await page.getByRole('button',{name:'Zoom in'}).click();
  await stage.scrollIntoViewIfNeeded();
  await canvas.focus();
  await canvas.press('ArrowDown');
  await page.waitForTimeout(850);
  await stage.screenshot({path:path.join(out,'daedalus-platform-detail.png'),timeout:60000});
 } finally{
  await context.close();
  await video.saveAs(path.join(out,'daedalus-celestial-cycle.webm'));
 }
}

async function desktop(browser,url){
 const viewport={width:1000,height:900};
 const context=await browser.newContext({viewport,recordVideo:{dir:out,size:{width:1040,height:750}},timezoneId:'America/Los_Angeles'});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const video=page.video();
 try{
  await page.addInitScript(()=>{
   localStorage.setItem('fejelude.tourbillon.quality.v1','low');
   window.ftContextRequests=0;
   const original=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){if(this.matches('.ft-model')&&/^webgl/.test(type))window.ftContextRequests++;return original.call(this,type,...args)};
  });
  await page.goto(url);
  const watchCard=page.locator('#tourbillon');
  assert.equal(await watchCard.locator('.ft-card-cosmos').count(),1);
  assert.equal(await watchCard.locator('.ft-title-echo[aria-hidden="true"]').count(),1);
  assert.ok(await watchCard.locator('#ft-title').evaluate(async el=>{
   const faces=await document.fonts.load('48px "Pinyon Signature"');
   return getComputedStyle(el).fontFamily.startsWith('"Pinyon Signature"')&&faces.some(face=>face.status==='loaded');
  }));

  const insignia=page.locator('#tourbillon .ft-maker-seal');
  assert.equal(await insignia.count(),1);
  assert.equal(await insignia.getAttribute('aria-hidden'),'true');
  assert.equal(await insignia.evaluate(el=>getComputedStyle(el).userSelect),'none');
  const canvas=page.locator('.ft-model'),stage=page.locator('[data-ft-stage]');
  await stage.scrollIntoViewIfNeeded();
  assert.equal(await canvas.isHidden(),true);
  assert.equal(await page.locator('[data-ft-ratio]').first().isHidden(),true);
  assert.equal(await page.locator('[data-ft-pause]').count(),0);
  const previewMetrics=await page.evaluate(()=>({contextRequests:window.ftContextRequests,rendererResources:performance.getEntriesByType('resource').filter(e=>/feje-tourbillon-(renderer|model)\.mjs/.test(e.name)).length}));
  assert.deepEqual(previewMetrics,{contextRequests:0,rendererResources:0});
  console.log('Daedalus preview workload',JSON.stringify(previewMetrics));
  await enter(page);
  assert.ok(await canvas.evaluate(c=>!!c.getContext('webgl2')));
  assert.ok(await canvas.evaluate(c=>c.width/c.clientWidth>1.55),'a previously saved Low setting reduced default fidelity');
  await page.waitForTimeout(1050);
  // The model now runs continuously; camera transform and framing remain independent.

  await stage.screenshot({path:path.join(out,'daedalus-live-overview.png'),timeout:60000});
  const b=await canvas.boundingBox();
  const clip={x:b.x,y:b.y,width:b.width,height:b.height};
  const sample=()=>page.screenshot({clip,timeout:60000});
  const a=await sample();
  await page.mouse.move(b.x+b.width*.59,b.y+b.height*.46);
  await page.mouse.down();
  await page.mouse.move(b.x+b.width*.29,b.y+b.height*.53,{steps:22});
  await page.mouse.up();
  await page.waitForTimeout(560);
  assert.equal((await canvas.boundingBox()).width,b.width);
  assert.equal(await canvas.evaluate(c=>getComputedStyle(c).transform),'none');
  assert.notDeepEqual(await sample(),a,'orbit did not change the rendered geometry');

  await page.waitForFunction(()=>document.querySelector('#tourbillon').hasAttribute('data-ft-card-motion'));

  await page.getByRole('button',{name:'Reset view'}).click();
  assert.equal(await watchCard.locator('[data-ft-quality-toggle]').count(),0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('fejelude.tourbillon.quality.v1')),'low');
  await page.getByRole('button',{name:'Tourbillon',exact:true}).click();
  await stage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1700);
  const animatedFrame=await canvas.boundingBox();
  const animationSample=()=>page.screenshot({clip:animatedFrame,timeout:60000});
  const animatedA=await animationSample();
  await page.waitForTimeout(430);
  assert.notDeepEqual(await animationSample(),animatedA,'movement pixels did not advance');
  for(const [name,id] of [['Escapement','escapement'],['Gear train','train'],['Earth & moon','astronomy'],
   ['Carrier','carrier'],['Case & lugs','case'],['Caseback','back']]){
   await page.getByRole('button',{name,exact:true}).click();
   await stage.scrollIntoViewIfNeeded();
   await page.waitForTimeout(1350);
   await canvas.screenshot({path:path.join(out,'daedalus-live-'+id+'.png'),timeout:60000});
  }
  assert.equal(await stage.getAttribute('data-quality'),null);
  await page.getByRole('button',{name:'Reset view'}).click();
  const previous=await page.locator('#ft-time').getAttribute('datetime');
  await page.waitForFunction(last=>document.querySelector('#ft-time').dateTime!==last,previous);
  const clock=await page.locator('#ft-time').evaluate(el=>{
   const date=new Date(el.dateTime);
   const reference=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Manila',hourCycle:'h23',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(date);
   return {live:el.textContent,reference};
  });
  assert.equal(clock.live,clock.reference);
  const loss=await canvas.evaluateHandle(c=>c.getContext('webgl2').getExtension('WEBGL_lose_context'));
  await loss.evaluate(ext=>ext.loseContext());
  await canvas.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Explore in 3D'}).waitFor();
  await loss.dispose();
  for(let i=0;i<3;i++){
   await enter(page);
   const retired=await canvas.elementHandle();
   await page.getByRole('button',{name:'Exit 3D'}).click();
   assert.equal(await canvas.isHidden(),true);
   assert.equal(await stage.getAttribute('data-aspect'),'landscape');
   assert.equal(await retired.evaluate(c=>c.isConnected),false);
   await retired.dispose();
  }
  await stage.screenshot({path:path.join(out,'daedalus-preview-return.png')});
  assert.deepEqual(errors,[]);
 }finally{
  await context.close();
  await video.saveAs(path.join(out,'daedalus-live-desktop.webm'));
 }
}
async function mobile(browser,url){
 const viewport={width:390,height:844};
 const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,deviceScaleFactor:2,recordVideo:{dir:out,size:viewport}});
 const page=await context.newPage();
 const video=page.video();
 try{
  await page.goto(url);
  const stage=page.locator('[data-ft-stage]'),canvas=page.locator('.ft-model');
  await stage.scrollIntoViewIfNeeded();
  await stage.screenshot({path:path.join(out,'daedalus-preview-mobile.png')});
  await enter(page);
  for(const [name,aspect] of [['normal',4/3],['landscape',16/9],['portrait',3/4],['square',1]]){
   await page.locator('[data-ft-ratio="'+name+'"]').tap();
   await stage.scrollIntoViewIfNeeded();
   const b=await canvas.boundingBox();
   assert.ok(Math.abs(b.width/b.height-aspect)<.02);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.waitForTimeout(950);
   await stage.screenshot({path:path.join(out,'daedalus-mobile-'+name+'.png')});
  }
  const frames=await page.locator('[data-ft-ratio]').evaluateAll(buttons=>buttons.map(b=>b.getBoundingClientRect().top));
  assert.equal(new Set(frames).size,1,'the four frame segments should share one row');
  assert.equal(await page.locator('[data-ft-quality-root]').count(),0);
  const mobileScale=await canvas.evaluate(c=>c.width/c.clientWidth);
  assert.ok(mobileScale>1.25,'phone must start above the old default DPR cap');
  const a=await page.locator('.ft-astrolabe').boundingBox(),t=await page.locator('.ft-timeblock').boundingBox();
  assert.ok(a.x>=t.x+t.width-.5,'astrolabe overlaps the clock');
  await page.locator('#tourbillon').screenshot({path:path.join(out,'daedalus-celestial-mobile.png')});
  await page.getByRole('button',{name:'Exit 3D'}).tap();
  const stats=await page.evaluate(async()=>{
   const {createWatchRenderer}=await import('/js/feje-tourbillon-renderer.mjs');
   const canvas=document.createElement('canvas');
   const gl=canvas.getContext('webgl2',{antialias:true,alpha:true,powerPreference:'low-power'});
   const r=createWatchRenderer(canvas,{mobile:true});r.resize(390,325);
   const samples=[],pixel=new Uint8Array(4);
   for(let i=0;i<16;i++){
    const start=performance.now();
    r.draw(2*3600+5*60+i*.06,1/60,true);
    gl.readPixels(canvas.width>>1,canvas.height>>1,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    if(i>=4)samples.push(performance.now()-start);
   }
   samples.sort((a,b)=>a-b);
   const result={...r.stats,p50:samples[5],p95:samples[11],width:canvas.width,height:canvas.height,error:gl.getError()};
   r.dispose();
   return result;
  });
  assert.ok(stats.triangles>5000&&stats.drawCalls>50);
  assert.equal(stats.error,0);
  console.log('Daedalus software WebGL2, emulated mobile, 12 render-and-readback samples',JSON.stringify(stats));
 }finally{
  await context.close();
  await video.saveAs(path.join(out,'daedalus-live-mobile.webm'));
 }
}
async function crossEngine(url){
 for(const [name,engine] of [['firefox',firefox],['webkit',webkit]]){
  const browser=await engine.launch({headless:true});
  try{
   for(const viewport of [{width:1000,height:900},{width:390,height:844}]){
    const page=await browser.newPage({viewport,reducedMotion:'reduce',timezoneId:'America/Los_Angeles'});
    const issues=[];
    page.on('pageerror',e=>issues.push(e.message));
    page.on('console',message=>{
     if(/THREE\.WebGLProgram.*(?:error|invalid)/i.test(message.text()))issues.push(message.text());
    });
    try{
     await page.goto(url,{waitUntil:'domcontentloaded'});
     const stage=page.locator('[data-ft-stage]'),canvas=stage.locator('.ft-model');
     await stage.scrollIntoViewIfNeeded();
     await page.getByRole('button',{name:'Explore in 3D'}).click();
     await page.waitForFunction(()=>document.querySelector('[data-ft-stage]').hasAttribute('data-ft-live')
      ||!document.querySelector('[data-ft-fallback]').hidden);
     const live=(await stage.getAttribute('data-ft-live'))!==null;
     if(live)assert.ok(await canvas.evaluate(c=>!!c.getContext('webgl2')));
     else{
      assert.equal(await canvas.isHidden(),true);
      await page.waitForFunction(()=>document.querySelector('.ft-watch-poster').naturalWidth===820);
     }
     if(live)for(const [id,ratio] of [['normal',4/3],['portrait',3/4],['square',1],['landscape',16/9]]){
      await page.locator('[data-ft-ratio="'+id+'"]').click();
      const bounds=await stage.boundingBox();
      assert.ok(Math.abs(bounds.width/bounds.height-ratio)<.02,id+' was distorted');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
     }
     if(live)await page.locator('[data-ft-ratio="normal"]').click();
     await stage.scrollIntoViewIfNeeded();
     if(live)await page.waitForFunction(()=>{
      const c=document.querySelector('.ft-model');
      return Math.abs(c.width/c.height-c.clientWidth/c.clientHeight)<.015;
     });
     const actual=await page.locator('#ft-time').evaluate(el=>[el.textContent,
      new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Manila',hour:'2-digit',minute:'2-digit',second:'2-digit',
       hourCycle:'h23'}).format(new Date(el.dateTime))]);
     assert.equal(actual[0],actual[1]);
     assert.deepEqual(issues,[]);
     await page.locator('#tourbillon').screenshot({path:path.join(out,'daedalus-'+name+'-'+viewport.width+'.png'),timeout:60000});
     console.log('Daedalus',name,viewport.width,live?'live WebGL2':'static fallback','clock and four ratios passed');
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 }
}
(async()=>{
 await mkdir(out,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 if(process.argv.includes('--cross-engine')){await crossEngine(url);return;}
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{await recordSky(browser,url);await desktop(browser,url);await mobile(browser,url)}
 finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
