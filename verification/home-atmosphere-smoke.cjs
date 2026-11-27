/* Matched real homepage recordings, before and after, from Git worktrees.
   Run: node verification/home-atmosphere-smoke.cjs /path/to/baseline [--chromium-only] */
const {chromium,firefox,webkit,devices}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const assert=require('node:assert/strict'),path=require('node:path');
const current=path.resolve(__dirname,'..'),baseline=path.resolve(process.argv[2]||current);
const out=path.join(__dirname,'home-atmosphere-results');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.mp4':'video/mp4','.webm':'video/webm','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json'};
function serverFor(root){return createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));
 if(!file.startsWith(root+path.sep))throw Error('path');
 const data=await readFile(file),type=mime[path.extname(file)]||'application/octet-stream';
 const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
 if(range){const start=Number(range[1]),end=Math.min(data.length-1,range[2]?Number(range[2]):data.length-1);
  if(start>end){res.writeHead(416,{'Content-Range':'bytes */'+data.length});return res.end();}
  res.writeHead(206,{'Content-Type':type,'Content-Range':'bytes '+start+'-'+end+'/'+data.length,'Accept-Ranges':'bytes','Content-Length':end-start+1});return res.end(data.subarray(start,end+1));}
 res.writeHead(200,{'Content-Type':type,'Content-Length':data.length,'Accept-Ranges':'bytes'});res.end(data);
 }catch{res.writeHead(404);res.end();}});}
const sections=['#home','#interactives-entry','#tourbillon','#sofra-project','#about','#roblox-creations','#services','#learning','#goals','#contact'];
async function inspect(browser,profile,label,url,enhanced,record){
 const context=await browser.newContext({...profile,...(record?{recordVideo:{dir:path.join(out,'recordings'),size:profile.viewport}}:{})});
 const page=await context.newPage(),video=page.video(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.documentElement.style.scrollBehavior='auto');
  if(enhanced)await page.waitForFunction(()=>document.body.hasAttribute('data-home-atmosphere'));
  await page.waitForTimeout(350);
  const get=()=>page.evaluate(selectors=>selectors.map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return {s,y:r.top+scrollY,h:r.height};}),sections);
  const boxes=await get();
  const sample=()=>page.evaluate(()=>({gradient:document.body.style.getPropertyValue('--home-atmosphere-gradient'),bg:getComputedStyle(document.body).backgroundImage,borders:[...document.querySelectorAll('main>.section-padding')].map(e=>getComputedStyle(e).borderTopColor),width:document.documentElement.scrollWidth,viewport:innerWidth,scroll:scrollY}));
  const first=await sample();
  if(enhanced){assert.ok(first.gradient.includes('linear-gradient'));assert.notEqual(first.bg,'none');assert.ok(first.borders.every(c=>c==='rgba(0, 0, 0, 0)'));assert.ok(first.width<=first.viewport+1);}
  // The two most important gaps are between content cards, not the section boxes.
  const targets=await page.evaluate(()=>{const sel=s=>document.querySelector(s).getBoundingClientRect(),y=scrollY;
   const gap=(a,b)=>(sel(a).bottom+sel(b).top)/2+y-innerHeight*.52;
   return {hero:gap('#interactives-entry','#tourbillon .ft-card'),sofra:gap('#tourbillon .ft-card','#sofra-project .sofra-feature'),about:gap('#sofra-project .sofra-feature','#about .profile-header')};});
  const jump=async y=>{await page.evaluate(y=>scrollTo({top:Math.max(0,y),behavior:'instant'}),y);await page.waitForTimeout(180);};
  for(const [name,y] of Object.entries(targets)){await jump(y);await page.screenshot({path:path.join(out,label+'-'+name+'.png')});}
  // Traverse every chapter in both directions, using both slow and fast jumps.
  const stops=boxes.slice(1).map(b=>Math.max(0,b.y- profile.viewport.height*.48));
  for(const y of stops)await jump(y);
  for(const y of stops.slice().reverse())await jump(y);
  for(const y of [stops[0],stops.at(-1),stops[1],stops[0]])await jump(y);
  if(enhanced){
   const after=await sample();assert.equal(after.gradient,first.gradient,'document backdrop must not change simply because of scroll direction');
   await jump(targets.hero);const atGap=await sample();await jump(targets.sofra);await jump(targets.hero);
   assert.equal((await sample()).gradient,atGap.gradient);
   const sky=await page.evaluate(()=>[...document.querySelectorAll('.daedalus-scroll-sky,.sofra-sakura-sky')].map(el=>({pointer:getComputedStyle(el).pointerEvents,canvases:[...el.querySelectorAll('canvas')].every(c=>getComputedStyle(c).pointerEvents==='none')})));
   assert.equal(sky.length,2);assert.ok(sky.every(s=>s.pointer==='none'&&s.canvases));
   assert.equal(await page.locator('#interactives-entry a.ix-cta').getAttribute('href'),'/interactives');
   assert.equal(await page.locator('#services .svc-cta').getAttribute('href'),'#contact');
   assert.equal(await page.locator('#tourbillon [data-ft-ratio]').count(),4);
   assert.equal(await page.locator('[data-particle-portrait]').count(),1);
   assert.equal(await page.locator('[data-about-ghost]').count(),1);
   await page.setViewportSize({width:profile.viewport.width,height:Math.max(500,profile.viewport.height-140)});
   await page.waitForTimeout(200);assert.ok((await sample()).gradient.includes('linear-gradient'));
   await page.setViewportSize(profile.viewport);await page.waitForTimeout(200);
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);
   assert.ok((await sample()).gradient.includes('linear-gradient'));
   assert.equal(await page.locator('#services [data-svc-row-active]').count(),0);
   // Noninteractive artwork must remain behind the content even when present.
   await page.locator('#services .svc-cta').scrollIntoViewIfNeeded();
   assert.ok(await page.locator('#services .svc-cta').evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
   assert.deepEqual(errors,[]);
  }
  console.log(label,JSON.stringify({chapters:boxes.length,comparisonStops:3,scrollBothDirections:true,rapidJumps:true,enhanced,errors}));
  return boxes;
 }finally{await context.close();if(video)await video.saveAs(path.join(out,label+'.webm'));}
}
(async()=>{
 await mkdir(out,{recursive:true});
 const a=serverFor(baseline),b=serverFor(current);
 await Promise.all([new Promise(r=>a.listen(0,'127.0.0.1',r)),new Promise(r=>b.listen(0,'127.0.0.1',r))]);
 const url=s=>'http://127.0.0.1:'+s.address().port;
 try{
  const cases=[[chromium,{viewport:{width:1440,height:900}},'desktop-chromium'],[chromium,{...devices['Pixel 7'],deviceScaleFactor:1},'android-chromium'],[chromium,{viewport:{width:768,height:1024}},'tablet-chromium']];
  if(!process.argv.includes('--chromium-only'))cases.push([webkit,{...devices['iPhone 13'],deviceScaleFactor:1},'iphone-webkit'],[firefox,{viewport:{width:1280,height:900}},'desktop-firefox']);
  for(const [engine,profile,name] of cases){
   const browser=await engine.launch(engine===chromium?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{});try{
    const before=await inspect(browser,profile,name+'-before',url(a),false,true);
    const after=await inspect(browser,profile,name+'-after',url(b),true,true);
    for(let i=0;i<before.length;i++)assert.ok(Math.abs(before[i].h-after[i].h)<=2,'section height changed: '+before[i].s);
   }finally{await browser.close();}
  }
 }finally{await Promise.all([new Promise(r=>a.close(r)),new Promise(r=>b.close(r))]);}
})().catch(e=>{console.error(e);process.exitCode=1});
