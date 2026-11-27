const {chromium,firefox,webkit,devices}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'services-directory-results');
const section=readFile(path.join(root,'index.html'),'utf8').then(s=>s.match(/<section id="services"[\s\S]*?<\/section>/)[0]);
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/'){
   res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/css/home-world.css"><link rel="stylesheet" href="/css/services-directory.css"><style>body{margin:0}.spacer{height:160vh}</style><body class="feje-world-home"><main><div class="spacer"></div>'+await section+'<div class="spacer"></div><section id="contact" style="min-height:100vh">Contact</section></main><script type="module" src="/js/services-directory.mjs"></script></body></html>');return;
  }
  const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error('path');
  res.setHeader('Content-Type',({'.css':'text/css','.mjs':'text/javascript'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}
});
async function check(browser,profile,name,url){
 const page=await browser.newPage(profile),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url);const frame=page.locator('[data-svc-motion]'),rows=frame.locator('[data-svc-row]'),cta=frame.locator('.svc-cta');
  assert.equal(await rows.count(),3);assert.equal(await frame.getAttribute('data-svc-active'),null);
  const wizard=frame.locator('[data-svc-wizard]'),header=frame.locator('.svc-header');
  await header.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('[data-svc-wizard]').hasAttribute('data-svc-wizard-active'));
  const wizardBox=await wizard.boundingBox(),titleBox=await frame.locator('#services-title').boundingBox(),introBox=await frame.locator('.svc-intro').boundingBox();
  assert.ok(wizardBox.width>=64&&wizardBox.width<=160);
  const overlaps=(a,b)=>Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)+1&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)+1;
  assert.ok(!overlaps(wizardBox,titleBox)&&!overlaps(wizardBox,introBox),'wizard must not cover title or intro');
  assert.equal(await wizard.getAttribute('aria-hidden'),'true');
  const poses=wizard.locator('[data-svc-wizard-frame]');
  const poseState=()=>poses.evaluateAll(els=>els.map(el=>Number(getComputedStyle(el).opacity)));
  const seen=new Set();
  for(let i=0;i<4;i++){
   const state=await poseState();assert.equal(state.filter(n=>n===1).length,1);seen.add(state.indexOf(1));
   if(i<3)await page.waitForFunction(previous=>[...document.querySelectorAll('[data-svc-wizard-frame]')].findIndex(e=>Number(getComputedStyle(e).opacity)===1)!==previous,state.indexOf(1),{polling:50});
  }
  assert.equal(seen.size,4);
  await header.screenshot({path:path.join(out,name+'-wizard.png'),animations:'disabled'});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>!document.querySelector('[data-svc-wizard-active]'),null,{polling:100});
  assert.deepEqual(await poseState(),[1,0,0,0]);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>document.querySelector('[data-svc-wizard-active]'),null,{polling:100});
  await frame.scrollIntoViewIfNeeded();
  const palettes=await rows.evaluateAll(els=>els.map(el=>getComputedStyle(el).getPropertyValue('--svc-accent').trim()));
  assert.equal(new Set(palettes).size,3);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  for(let i=0;i<3;i++){
   const row=rows.nth(i);await row.scrollIntoViewIfNeeded();await row.waitFor({state:'visible'});
   await page.waitForFunction(i=>document.querySelectorAll('[data-svc-row]')[i].hasAttribute('data-svc-row-active'),i);
   const b=await row.boundingBox(),icon=await row.locator('.svc-icon-well').boundingBox(),copy=await row.locator('.svc-row-copy').boundingBox();
   assert.ok(icon.x+icon.width<=copy.x+1&&copy.x+copy.width<=b.x+b.width+1,'row icon and copy must not overlap');
   assert.equal(await row.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
   const sprite=row.locator(['.svc-game-block','.svc-model-core','.svc-web-cursor'][i]);
   assert.notEqual(await sprite.evaluate(e=>getComputedStyle(e).animationName),'none');
  }
  const samples=frame.locator('.svc-sample');
  assert.deepEqual(await samples.evaluateAll(els=>els.map(el=>Number(el.dataset.svcFrames))),[4,5,4]);
  for(let i=0;i<3;i++){
   const row=rows.nth(i),sample=samples.nth(i);await row.scrollIntoViewIfNeeded();
   await page.waitForFunction(i=>document.querySelectorAll('[data-svc-row]')[i].hasAttribute('data-svc-row-active'),i);
   const steps=sample.locator('[data-frame]');
   const state=()=>steps.evaluateAll(els=>els.map(el=>Number(getComputedStyle(el).opacity)));
   const before=await state();assert.equal(before.filter(n=>n===1).length,1);
   await page.waitForTimeout(1300);
   const after=await state();assert.equal(after.filter(n=>n===1).length,1);assert.notDeepEqual(after,before);
  }
  await page.waitForFunction(()=>Number(document.querySelector('#services').style.getPropertyValue('--svc-wash'))>0);
  const start=await page.evaluate(()=>document.querySelector('#services').style.getPropertyValue('--svc-parallax'));
  await page.evaluate(()=>{const el=document.querySelector('#services');scrollTo(0,scrollY+el.getBoundingClientRect().top+el.offsetHeight-80)});
  await page.waitForFunction(old=>document.querySelector('#services').style.getPropertyValue('--svc-parallax')!==old,start);
  await frame.screenshot({path:path.join(out,name+'-directory.png'),animations:'disabled'});
  await cta.scrollIntoViewIfNeeded();
  await page.evaluate(()=>{const e=document.querySelector('#services .svc-cta');window.scrollTo({top:scrollY+e.getBoundingClientRect().top-100,behavior:'instant'});});
  await page.waitForFunction(()=>!document.querySelector('[data-svc-wizard-active]'),null,{polling:100});
  assert.deepEqual(await poseState(),[1,0,0,0]);
  const b=await cta.boundingBox();assert.ok(b.height>=44);
  await cta.focus();assert.equal(await cta.evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>!document.querySelector('[data-svc-row-active]'),null,{polling:100});
  assert.equal(await rows.first().locator('.svc-game-block').evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.equal(await samples.first().locator('[data-frame="0"]').evaluate(e=>getComputedStyle(e).opacity),'1');
  assert.equal(await page.locator('#services').getAttribute('data-svc-ambient-active'),null);
  await cta.click();assert.equal(new URL(page.url()).hash,'#contact');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>!document.querySelector('[data-svc-row-active]'),null,{polling:100});
  assert.deepEqual(errors,[]);
  console.log(name,JSON.stringify({palettes,overflow:false,threeIcons:true,wizardFourPoses:true,wizardNoOverlap:true,wizardOffscreen:true,reducedMotion:true,contactLink:true,offscreenPaused:true}));
 }finally{await page.close()}
}
(async()=>{await mkdir(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const cases=[[chromium,{viewport:{width:1440,height:900}},'desktop-chromium'],[chromium,{viewport:{width:768,height:900}},'tablet-chromium'],[chromium,{...devices['Pixel 7']},'android-chromium'],[chromium,{viewport:{width:320,height:640},hasTouch:true,isMobile:true},'small-mobile-chromium']];
 if(!process.argv.includes('--chromium-only'))cases.push([firefox,{viewport:{width:1280,height:900}},'desktop-firefox'],[webkit,{...devices['iPhone 13']},'iphone-webkit']);
 for(const [engine,profile,name] of cases){const browser=await engine.launch();try{await check(browser,profile,name,url)}finally{await browser.close()}}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
