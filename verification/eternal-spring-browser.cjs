// Real-browser verification for the public archive notice only. Local HTTP, no deployment.
const {chromium,firefox,webkit}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const out=process.env.MEMORY_SCREENSHOTS||path.join(require('node:os').tmpdir(),'eternal-spring-browser');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.woff2':'font/woff2','.mp4':'audio/mp4','.svg':'image/svg+xml'};
const profiles=[
 ['desktop',{width:1440,height:900},false],
 ['phone-portrait',{width:390,height:844},true],
 ['phone-landscape',{width:844,height:390},true],
 ['tablet-portrait',{width:768,height:1024},true],
 ['tablet-landscape',{width:1180,height:820},true]
];
async function serve(dir){
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const f=path.resolve(dir,'.'+(pathname==='/sofhia-franchesca-16'?pathname+'.html':pathname));
  if(!f.startsWith(dir+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
  const data=fs.readFileSync(f);
  res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Content-Length':data.length});res.end(data);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {server,url:'http://127.0.0.1:'+server.address().port+'/sofhia-franchesca-16'};
}
function options(name,viewport,touch,extra={}){
 return {viewport,hasTouch:touch,reducedMotion:'no-preference',...(name==='firefox'?{}:{isMobile:touch}),...extra};
}
const stage=(page,phase)=>page.waitForFunction(phase=>document.querySelector('.emblem')?.dataset.memoryPhase===phase,phase,{timeout:35000,polling:50});
async function bounds(page){
 const d=await page.evaluate(()=>{
  const emblem=document.querySelector('.emblem').getBoundingClientRect(),h=document.querySelector('h1').getBoundingClientRect(),copy=document.querySelector('.copy').getBoundingClientRect();
  return {overflow:document.documentElement.scrollWidth>innerWidth+1,emblem:emblem.bottom,heading:h.top,copy:copy.top,headingBottom:h.bottom};
 });
 assert.equal(d.overflow,false);assert.ok(d.emblem<=d.heading+1&&d.headingBottom<=d.copy+1,JSON.stringify(d));
}
async function photograph(page,label){await bounds(page);await page.screenshot({path:path.join(out,label+'.png'),fullPage:true});}
async function journey(browser,name,base,profile){
 const [label,viewport,touch]=profile,prefix=name+'-'+label;
 const ctx=await browser.newContext(options(name,viewport,touch,{recordVideo:{dir:out,size:viewport}}));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const video=page.video();
 try{
  await page.goto(base);await page.evaluate(()=>document.fonts.ready);await stage(page,'holding');
  const emblem=page.locator('.emblem');
  // An interaction in the opening must not restart or reverse the story.
  if(touch)await emblem.tap();else await emblem.hover();
  assert.equal(await emblem.getAttribute('data-memory-reacting'),null);
  for(const phase of ['holding','release','farewell','departure']){
   await stage(page,phase);await page.waitForTimeout(1250);await photograph(page,prefix+'-'+phase);
  }
  for(const phase of ['sakura','kitten','rose','butterfly']){
   await stage(page,phase);await page.waitForTimeout(450);await photograph(page,prefix+'-'+phase);
   if(touch)await emblem.tap();
   else{await page.mouse.move(1,1);await emblem.hover();}
   await page.waitForFunction(()=>document.querySelector('.emblem').dataset.memoryReacting==='true');
   await page.waitForTimeout(200);await photograph(page,prefix+'-'+phase+'-reaction');
  }
  await stage(page,'sakura');assert.notEqual(await emblem.getAttribute('data-memory-scene'),'intro');
  await photograph(page,prefix+'-loop-restarted');
  const toggle=page.locator('#garden-motion');
  const audioState=()=>page.locator('#play').getAttribute('aria-label');
  const beforeAudio=await audioState();
  if(touch)await toggle.tap();else{await toggle.focus();await page.keyboard.press('Space');}
  assert.equal(await toggle.getAttribute('aria-pressed'),'true');
  const getFrozen=()=>page.evaluate(()=>({phase:document.querySelector('.emblem').dataset.memoryPhase,art:document.querySelector('#blossom').toDataURL(),grove:document.querySelector('#grove').toDataURL()}));
  const frozen=await getFrozen();await page.waitForTimeout(900);assert.deepEqual(await getFrozen(),frozen);
  assert.equal(await audioState(),beforeAudio);await photograph(page,prefix+'-paused');
  if(touch)await toggle.tap();else await page.keyboard.press('Space');
  assert.equal(await toggle.getAttribute('aria-pressed'),'false');assert.equal(await audioState(),beforeAudio);
  if(touch){
   await page.setViewportSize({width:844,height:390});await page.waitForTimeout(250);
   assert.notEqual(await emblem.getAttribute('data-memory-scene'),'intro');await photograph(page,prefix+'-rotated');
   await page.setViewportSize(viewport);
  }
  const tab=await ctx.newPage();await tab.bringToFront();await page.waitForTimeout(200);
  const hidden=await page.evaluate(()=>document.hidden);
  if(hidden)assert.ok(await page.locator('html').getAttribute('data-garden-paused')!==null);
  await page.bringToFront();await tab.close();
  console.log(prefix,'hidden-tab visibility exposed by browser:',hidden);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>matchMedia('(prefers-reduced-motion: reduce)').matches&&document.querySelector('#garden-motion').disabled&&document.documentElement.hasAttribute('data-garden-paused'),null,{polling:50,timeout:10000});
  await stage(page,'sakura');
  assert.equal(await toggle.isDisabled(),true);assert.equal(await toggle.getAttribute('aria-pressed'),'true');
  const staticFrame=await page.locator('#blossom').evaluate(c=>c.toDataURL());
  await page.waitForTimeout(700);
  assert.equal(await page.locator('#blossom').evaluate(c=>c.toDataURL()),staticFrame);
  assert.equal(await page.locator('.garden-fleck').first().evaluate(e=>getComputedStyle(e).display),'none');
  assert.deepEqual(errors,[]);await photograph(page,prefix+'-reduced-motion');
  console.log(prefix,'full story, loop, interactions, layout and reduced motion PASS');
 }finally{await ctx.close();if(video){await video.saveAs(path.join(out,prefix+'-full-sequence.webm'));await video.delete();}}
}
async function shortProfile(browser,name,base,profile){
 const [label,viewport,touch]=profile;
 for(const reducedMotion of ['no-preference','reduce']){
  const ctx=await browser.newContext(options(name,viewport,touch,{reducedMotion}));
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base);await page.evaluate(()=>document.fonts.ready);
   await stage(page,reducedMotion==='reduce'?'sakura':'holding');
   await page.waitForTimeout(750);
   if(reducedMotion==='reduce'){
    assert.equal(await page.locator('#garden-motion').isDisabled(),true);
    assert.ok(await page.locator('html').getAttribute('data-garden-paused')!==null);
    assert.equal(await page.locator('.garden-fleck').first().evaluate(e=>getComputedStyle(e).display),'none');
   }
   await photograph(page,name+'-'+label+'-'+(reducedMotion==='reduce'?'static':'layout'));
   assert.deepEqual(errors,[]);console.log(name,label,reducedMotion,'PASS');
  }finally{await ctx.close();}
 }
}
async function measure(browser,name,base,profile,version){
 const [label,viewport,touch]=profile,ctx=await browser.newContext(options(name,viewport,touch));
 const page=await ctx.newPage();
 try{
  await page.goto(base);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1000);
  let session=null,pre={};
  if(name==='chromium'){
   session=await ctx.newCDPSession(page);await session.send('Performance.enable');
   if(touch)await session.send('Emulation.setCPUThrottlingRate',{rate:2});
   pre=Object.fromEntries((await session.send('Performance.getMetrics')).metrics.map(v=>[v.name,v.value]));
  }
  const values=await page.evaluate(()=>new Promise(resolve=>{
   const a=[];let start,prev;
   function step(now){if(start===undefined)start=now;if(prev!==undefined)a.push(now-prev);prev=now;
    if(now-start<3200)requestAnimationFrame(step);else{
     a.sort((a,b)=>a-b);resolve({samples:a.length,p95:a[Math.min(a.length-1,Math.floor(a.length*.95))],gapsOver24:a.filter(v=>v>24).length,canvasPixels:document.querySelector('#grove').width*document.querySelector('#grove').height});
    }}
   requestAnimationFrame(step);
  }));
  if(session){
   const post=Object.fromEntries((await session.send('Performance.getMetrics')).metrics.map(v=>[v.name,v.value]));
   values.scriptMs=(post.ScriptDuration-pre.ScriptDuration)*1000;values.taskMs=(post.TaskDuration-pre.TaskDuration)*1000;values.heapBytes=post.JSHeapUsedSize;
  }
  return {browser:name,profile:label,version,...values};
 }finally{await ctx.close();}
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const current=await serve(root),baseline=process.env.MEMORY_BASELINE_ROOT?await serve(path.resolve(process.env.MEMORY_BASELINE_ROOT)):null;
 const results=[];const failures=[];
 try{
  for(const name of (process.env.MEMORY_ENGINES||'chromium').split(',')){
   const engine={chromium,firefox,webkit}[name];
   const browser=await engine.launch(name==='chromium'?{args:['--no-sandbox','--autoplay-policy=user-gesture-required'],...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})}:{});
   try{
    for(const profile of profiles.slice(0,2)){
     if(name==='chromium')for(let n=0;n<2;n++){
      if(baseline)results.push(await measure(browser,name,baseline.url,profile,'before'));
      results.push(await measure(browser,name,current.url,profile,'after'));
      fs.writeFileSync(path.join(out,'eternal-spring-performance.json'),JSON.stringify(results,null,2));
      console.log('PERFORMANCE',JSON.stringify(results.slice(-2)));
     }
     try{await journey(browser,name,current.url,profile);}catch(error){failures.push(name+' '+profile[0]+': '+error.stack);console.error(failures.at(-1));}
    }
    for(const profile of profiles.slice(2))try{await shortProfile(browser,name,current.url,profile);}catch(error){failures.push(name+' '+profile[0]+': '+error.stack);console.error(failures.at(-1));}
   }finally{await browser.close();}
  }
  fs.writeFileSync(path.join(out,'eternal-spring-performance.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
  if(failures.length){fs.writeFileSync(path.join(out,'eternal-spring-failures.txt'),failures.join('\n\n'));throw Error(failures.length+' browser profile checks failed');}
 }finally{current.server.close();baseline?.server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
