// Full homepage comparison, served from two local Git worktrees.
// No production requests, real account data, or credentials.
const {chromium,firefox,webkit,devices}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const assert=require('node:assert/strict'),path=require('node:path');
const current=path.resolve(__dirname,'..'),baseline=path.resolve(process.argv[2]||current),out=path.join(__dirname,'pixel-shortcuts-results');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mp4':'video/mp4','.woff2':'font/woff2','.json':'application/json'};
function serve(root){return createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/admin'){res.writeHead(200,{'Content-Type':'text/html'});return res.end('<h1>Test-only admin destination</h1>');}
 const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
 if(!file.startsWith(root+path.sep))throw Error('path');
 const data=await readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
 const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
 if(range){const start=Number(range[1]),end=Math.min(data.length-1,range[2]?Number(range[2]):data.length-1);if(start>end){res.writeHead(416);return res.end();}res.writeHead(206,{'Content-Range':'bytes '+start+'-'+end+'/'+data.length,'Accept-Ranges':'bytes','Content-Length':end-start+1});return res.end(data.subarray(start,end+1));}
 res.end(data);
 }catch{res.writeHead(404);res.end();}})}
async function check(browser,profile,label,url,after,expected){
 const context=await browser.newContext({...profile,recordVideo:{dir:path.join(out,'raw'),size:profile.viewport}});
 const page=await context.newPage(),video=page.video(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const group=page.locator('.profile-action-cluster'),links=group.locator('a');
  await group.scrollIntoViewIfNeeded();await page.waitForTimeout(650);
  const hrefs=await links.evaluateAll(els=>els.map(e=>[e.getAttribute('href'),e.getAttribute('target'),e.getAttribute('aria-label')]));
  assert.equal(links?await links.count():0,2);
  if(after)assert.deepEqual(hrefs,expected);
  await group.screenshot({path:path.join(out,label+'-buttons.png'),animations:'disabled'});
  await page.screenshot({path:path.join(out,label+'-viewport.png'),animations:'disabled'});
  if(!after){await page.waitForTimeout(4500);return hrefs;}
  const boxes=await links.evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height,r.left,r.right,r.top]}));
  for(const b of boxes)assert.ok(Math.abs(b[0]-52)<=1&&Math.abs(b[1]-52)<=1,JSON.stringify(b));
  assert.ok(boxes[1][2]>boxes[0][3]&&Math.abs(boxes[0][4]-boxes[1][4])<=1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const states=()=>links.evaluateAll(els=>els.map(e=>[...e.querySelectorAll('[data-shortcut-frame]')].map(f=>Number(getComputedStyle(f).opacity))));
  await page.waitForFunction(()=>document.querySelectorAll('[data-shortcut-active]').length===2);
  const a=await states();assert.ok(a.every(s=>s.filter(n=>n===1).length===1));await page.waitForTimeout(1250);
  const b=await states();assert.ok(b.every(s=>s.filter(n=>n===1).length===1));assert.ok(b.every((s,i)=>s.join()!==a[i].join()));
  await page.waitForTimeout(3500);
  if(profile.hasTouch){
   await page.waitForSelector('body[data-living-mobile]',{state:'attached'});
   // Prevent only test navigation while checking the existing tap echo.
   await group.evaluate(el=>el.addEventListener('click',e=>e.preventDefault(),{once:true}));
   await links.first().tap();await page.locator('.mobile-echo[data-mobile-effect="stars"]:not([hidden])').waitFor();
   await page.waitForTimeout(500);
   await group.evaluate(el=>el.addEventListener('click',e=>e.preventDefault(),{once:true}));
   await links.last().tap();await page.locator('.mobile-echo[data-mobile-effect="signal"]:not([hidden])').waitFor();
  }else if(profile.viewport.width>900){
   await page.waitForSelector('body[data-living-desktop]',{state:'attached'});
   for(const link of [links.first(),links.last()]){
    await link.hover();await link.locator('.living-decoration[data-living-effect="shortcut"][data-lit]').waitFor({state:'attached'});
   }
  }
  await links.first().focus();assert.equal(await links.first().evaluate(e=>document.activeElement===e),true);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>!document.querySelector('[data-shortcut-active]'));
  assert.deepEqual(await states(),[[1,0,0,0],[1,0,0,0]]);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>scrollTo({top:document.body.scrollHeight,behavior:'instant'}));
  await page.waitForFunction(()=>!document.querySelector('[data-shortcut-active]'));
  await group.scrollIntoViewIfNeeded();
  // The external link's real popup navigation is intercepted at the network boundary.
  await context.route('https://www.roblox.com/**',r=>r.fulfill({contentType:'text/html',body:'Test-only Roblox destination'}));
  const popupPromise=page.waitForEvent('popup');await links.first().click();const popup=await popupPromise;await popup.waitForLoadState();assert.equal(popup.url(),hrefs[0][0]);await popup.close();
  await Promise.all([page.waitForURL('**/admin'),links.last().click()]);
  assert.equal(new URL(page.url()).pathname,'/admin');
  console.log(label,JSON.stringify({boxes,frames:4,reducedMotion:true,offscreen:true,originalDestinations:true,interaction:profile.hasTouch?'touch':'mouse',pageErrors:errors}));
  return hrefs;
 }finally{await context.close();await video?.saveAs(path.join(out,label+'.webm'));}
}
(async()=>{
 await mkdir(out,{recursive:true});const a=serve(baseline),b=serve(current);
 await Promise.all([new Promise(r=>a.listen(0,'127.0.0.1',r)),new Promise(r=>b.listen(0,'127.0.0.1',r))]);
 const url=s=>'http://127.0.0.1:'+s.address().port;
 try{
 const cases=[[chromium,{viewport:{width:1440,height:900}},'desktop'],[chromium,{...devices['Pixel 7'],deviceScaleFactor:1},'android'],[chromium,{viewport:{width:768,height:1024},hasTouch:true,isMobile:true},'tablet'],[chromium,{viewport:{width:320,height:680},hasTouch:true,isMobile:true},'small-mobile']];
 if(!process.argv.includes('--chromium-only'))cases.push([webkit,{...devices['iPhone 13'],deviceScaleFactor:1},'iphone-webkit'],[firefox,{viewport:{width:1280,height:900}},'firefox']);
 for(const [engine,profile,name] of cases){const browser=await engine.launch();try{
 const before=await check(browser,profile,name+'-before',url(a),false);
 await check(browser,profile,name+'-after',url(b),true,before);
 }finally{await browser.close()}}
 }finally{a.closeAllConnections();b.closeAllConnections();await Promise.all([new Promise(r=>a.close(r)),new Promise(r=>b.close(r))]);}
})().catch(e=>{console.error(e);process.exitCode=1});
