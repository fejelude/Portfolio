const {chromium,firefox,webkit,devices}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QA_PORTRAIT_OUT||path.join(__dirname,'about-portrait-results'));
const html=readFile(path.join(root,'index.html'),'utf8').then(s=>s.match(/<section id="about"[\s\S]*?<\/section>/)[0]);
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/'){
   const about=await html;
   res.setHeader('Content-Type','text/html');
   res.end('<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/css/home-world.css"><link rel="stylesheet" href="/css/about-particle-portrait.css"><style>body{margin:0}.before{height:180vh}.after{height:180vh}</style><body class="feje-world-home"><main><div class="before"></div>'+about+'<div class="after"></div></main><script type="module" src="/js/about-particle-portrait.mjs"></script></body></html>');return;
  }
  const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error('path');
  const mime={'.css':'text/css','.mjs':'text/javascript','.webp':'image/webp'};
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}
});
async function check(browser,profile,name,url){
 const page=await browser.newPage(profile),errors=[];let requests=0;
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(r.url().endsWith('/portrait-samples.webp'))requests++});
 await page.addInitScript(()=>{
  window.portraitDraws=0;const original=CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage=function(...args){if(this.canvas.matches?.('.about-particle-canvas'))window.portraitDraws++;return original.apply(this,args)};
 });
 try{
  await page.goto(url);
  const frame=page.locator('[data-particle-portrait]'),canvas=frame.locator('canvas');
  await page.waitForTimeout(200);assert.equal(requests,0,'source must be lazy');
  await frame.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('[data-particle-portrait]').dataset.portraitState==='idle');
  const rect=await canvas.boundingBox();
  assert.ok(Math.abs(rect.width/rect.height-16/9)<.02);
  const count=Number(await frame.getAttribute('data-portrait-particles'));assert.ok(count>5000);
  assert.equal(requests,1);
  const tone=await canvas.evaluate(c=>{
   const ctx=c.getContext('2d');
   const alpha=(x,y)=>ctx.getImageData(Math.round(x*(c.width-1)),Math.round(y*(c.height-1)),1,1).data[3];
   return {center:alpha(.5,.5),top:alpha(.5,0),outer:alpha(.03,.45)};
  });
  assert.ok(tone.center>180&&tone.top<10&&tone.outer<35,'recognizable core and transparent edges');
  assert.equal(await frame.getAttribute('data-portrait-visible'),'');
  if(profile.hasTouch){
   await canvas.tap({position:{x:rect.width*.48,y:rect.height*.50}});
   await page.waitForFunction(()=>document.querySelector('[data-particle-portrait]').dataset.portraitState==='active');
   await page.waitForFunction(()=>document.querySelector('[data-particle-portrait]').dataset.portraitState==='idle',null,{timeout:5000});
  }
  const digest=()=>canvas.evaluate(c=>c.toDataURL());
  const rest=await digest(),idleDraws=await page.evaluate(()=>window.portraitDraws);
  await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.portraitDraws),idleDraws,'ambient breathing should require zero idle canvas draws');
  await frame.screenshot({path:path.join(out,name+'-rest.png')});
  const x=rect.x+rect.width*.5,y=rect.y+rect.height*.5;
  let cdp;
  if(profile.hasTouch&&name.includes('chromium')){
   cdp=await page.context().newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+24,y}]});
  }else if(profile.hasTouch){
   await canvas.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y});
   await canvas.dispatchEvent('pointermove',{pointerType:'touch',pointerId:1,isPrimary:true,clientX:x+24,clientY:y});
  }else{
   await page.mouse.move(x,y);await page.mouse.move(x+24,y,{steps:4});
  }
  await page.waitForFunction(()=>document.querySelector('[data-particle-portrait]').dataset.portraitState==='active');
  await page.waitForTimeout(100);
  assert.notEqual(await digest(),rest,'image particles should actually move');
  await frame.screenshot({path:path.join(out,name+'-scatter.png')});
  if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  else if(profile.hasTouch)await canvas.dispatchEvent('pointerup',{pointerType:'touch',pointerId:1,isPrimary:true});
  else await page.mouse.move(1,1);
  await page.waitForFunction(()=>document.querySelector('[data-particle-portrait]').dataset.portraitState==='idle',null,{timeout:5000,polling:50});
  assert.equal(await digest(),rest,'every particle must return exactly');
  if(cdp){
   const before=await page.evaluate(()=>scrollY);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*15}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForFunction(initial=>scrollY>initial+10,before,{timeout:5000});
   await frame.scrollIntoViewIfNeeded();
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  const b=await canvas.boundingBox();
  await canvas.dispatchEvent('pointermove',{pointerType:'mouse',isPrimary:true,clientX:b.x+b.width/2,clientY:b.y+b.height/2});
  await page.waitForTimeout(350);
  assert.equal(await frame.getAttribute('data-portrait-state'),'idle');assert.equal(await digest(),rest);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.locator('[data-particle-portrait][data-portrait-visible]').waitFor({state:'detached'});
  const draws=await page.evaluate(()=>window.portraitDraws);await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>window.portraitDraws),draws);
  assert.deepEqual(errors,[]);
  console.log(name,JSON.stringify({particles:count,css:[rect.width,rect.height],idleDraws:0,recovered:true,scrollTest:!!cdp}));
 }finally{await page.close();}
}
(async()=>{
 await mkdir(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const cases=[
  [chromium,{viewport:{width:1200,height:900}},'desktop-chromium'],
  [chromium,{...devices['Pixel 7']},'android-chromium'],
  [chromium,{...devices['Pixel 7'],viewport:{width:320,height:568}},'compact-chromium'],
  [chromium,{...devices['Pixel 7'],viewport:{width:740,height:390}},'landscape-chromium'],
 ];
 if(!process.argv.includes('--chromium-only'))cases.push([firefox,{viewport:{width:1200,height:900}},'desktop-firefox'],[webkit,{...devices['iPhone 13']},'iphone-webkit']);
 for(const [engine,profile,name] of cases){
  const browser=await engine.launch({headless:true,...(engine===chromium&&process.env.QA_CHROMIUM?{executablePath:process.env.QA_CHROMIUM}:{} )});try{await check(browser,profile,name,url)}finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
