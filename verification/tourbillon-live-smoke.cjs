const {chromium}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const out=path.join(__dirname,'home-world-results');
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.webp':'image/webp'};
const section=readFile(path.join(root,'index.html'),'utf8').then(html=>{
 const watch=html.match(/<section id="tourbillon"[\s\S]*?<\/section>/)[0];
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
 <title>Daedalus · Live WebGL review</title><link rel="stylesheet" href="/css/feje-tourbillon.css">
 <style>*{box-sizing:border-box}body{margin:0;background:#0e121b}.ft-section{padding-inline:16px}.container{margin:auto}</style>
 <body class="feje-world-home">${watch}<script type="module" src="/js/feje-tourbillon.mjs"></script></body></html>`;
});
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end(await section);return}
  const file=path.resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+path.sep))throw Error('path');
  const data=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);
 }catch{res.writeHead(404);res.end()}
});

async function recordSky(browser,url){
 const viewport={width:1280,height:960};
 const context=await browser.newContext({viewport,deviceScaleFactor:.8,timezoneId:'America/Los_Angeles',
  recordVideo:{dir:out,size:{width:1000,height:750}}});
 const page=await context.newPage();
 const video=page.video();
 try{
  await page.goto(url);
  const stage=page.locator('[data-ft-stage]'),canvas=page.locator('.ft-model');
  const astro=page.locator('.ft-astrolabe');
  await canvas.waitFor({timeout:30000});
  await stage.scrollIntoViewIfNeeded();
  const time=await page.locator('#ft-time').evaluate(el=>Number(el.textContent.slice(0,2)));
  assert.equal(await astro.locator('figcaption').textContent(),time>=6&&time<18?'Manila day':'Manila night');
  assert.equal(await astro.locator('canvas').evaluate(c=>getComputedStyle(c).imageRendering),'pixelated');
  // Record a complete cycle before pausing to capture stable stills.
  await page.waitForTimeout(20800);
  await page.getByRole('button',{name:'Pause movement'}).click({timeout:60000});
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
 const viewport={width:1360,height:980};
 const context=await browser.newContext({viewport,recordVideo:{dir:out,size:{width:1040,height:750}},timezoneId:'America/Los_Angeles'});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const video=page.video();
 try{
  await page.goto(url);
  const canvas=page.locator('.ft-model'),stage=page.locator('[data-ft-stage]');
  await canvas.waitFor({timeout:30000});
  assert.ok(await canvas.evaluate(c=>!!c.getContext('webgl2')));
  await page.waitForTimeout(1050);
  // Hold the movement to isolate the camera test. The actual WebGL pixels
  // must change while the canvas element and its CSS transform stay put.
  await page.getByRole('button',{name:'Pause movement'}).click();
  await stage.screenshot({path:path.join(out,'daedalus-live-overview.png'),timeout:60000});
  const a=await canvas.screenshot(),b=await canvas.boundingBox();
  await page.mouse.move(b.x+b.width*.59,b.y+b.height*.46);
  await page.mouse.down();
  await page.mouse.move(b.x+b.width*.29,b.y+b.height*.53,{steps:22});
  await page.mouse.up();
  await page.waitForTimeout(560);
  assert.equal((await canvas.boundingBox()).width,b.width);
  assert.equal(await canvas.evaluate(c=>getComputedStyle(c).transform),'none');
  assert.notDeepEqual(await canvas.screenshot(),a,'orbit did not change the rendered geometry');

  await page.getByRole('button',{name:'Resume movement'}).click();
  await page.getByRole('button',{name:'Reset view'}).click();
  await page.getByRole('button',{name:'Hide case'}).click();
  await page.getByRole('button',{name:'Tourbillon',exact:true}).click();
  await stage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1700);
  const animatedA=await canvas.screenshot();
  await page.waitForTimeout(430);
  assert.notDeepEqual(await canvas.screenshot(),animatedA,'movement pixels did not advance');
  for(const [name,id] of [['Escapement','escapement'],['Gear train','train'],['Earth & moon','astronomy']]){
   await page.getByRole('button',{name,exact:true}).click();
   await stage.scrollIntoViewIfNeeded();
   await page.waitForTimeout(1350);
   await canvas.screenshot({path:path.join(out,'daedalus-live-'+id+'.png')});
  }
  await page.getByRole('button',{name:'Show case'}).click();
  await page.getByRole('button',{name:'Reset view'}).click();
  await page.getByRole('button',{name:'Pause movement'}).click();
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
  await loss.evaluate(ext=>ext.restoreContext());
  await canvas.waitFor({timeout:20000});
  await loss.dispose();
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
  await canvas.waitFor({timeout:30000});
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
  const a=await page.locator('.ft-astrolabe').boundingBox(),t=await page.locator('.ft-timeblock').boundingBox();
  assert.ok(a.x>=t.x+t.width-.5,'astrolabe overlaps the clock');
  await page.locator('#tourbillon').screenshot({path:path.join(out,'daedalus-celestial-mobile.png')});
  await page.getByRole('button',{name:'Pause movement'}).tap();
  const stats=await page.evaluate(async()=>{
   const {createWatchRenderer}=await import('/js/feje-tourbillon-renderer.mjs');
   const canvas=document.createElement('canvas');
   const gl=canvas.getContext('webgl2',{antialias:false,alpha:true,powerPreference:'low-power'});
   const r=createWatchRenderer(canvas,{mobile:true});r.resize(390,325);
   const samples=[];
   for(let i=0;i<26;i++){
    const start=performance.now();
    r.draw(i*.06,{hour:110,minute:72,second:128+i},1/60,true);
    gl.finish();
    if(i>=6)samples.push(performance.now()-start);
   }
   samples.sort((a,b)=>a-b);
   const result={...r.stats,p50:samples[10],p95:samples[19],width:canvas.width,height:canvas.height};
   r.dispose();
   return result;
  });
  assert.ok(stats.triangles>5000&&stats.drawCalls>50);
  console.log('Daedalus software WebGL2, emulated mobile, 20 synchronized frames',JSON.stringify(stats));
 }finally{
  await context.close();
  await video.saveAs(path.join(out,'daedalus-live-mobile.webm'));
 }
}
(async()=>{
 await mkdir(out,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{await recordSky(browser,url);await desktop(browser,url);await mobile(browser,url)}
 finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
