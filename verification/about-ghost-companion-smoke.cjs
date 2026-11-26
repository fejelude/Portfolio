const {chromium,firefox,webkit,devices}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'about-ghost-results');
const section=readFile(path.join(root,'index.html'),'utf8').then(s=>s.match(/<section id="about"[\s\S]*?<\/section>/)[0]);
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/'){
   res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/css/home-world.css"><link rel="stylesheet" href="/css/about-particle-portrait.css"><link rel="stylesheet" href="/css/about-ghost-companion.css"><style>body{margin:0}.spacer{height:160vh}</style><body class="feje-world-home"><main><div class="spacer"></div>'+await section+'<div class="spacer"></div></main><script type="module" src="/js/about-ghost-companion.mjs"></script><script type="module" src="/js/about-particle-portrait.mjs"></script></body></html>');return;
  }
  const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error('path');
  res.setHeader('Content-Type',({'.css':'text/css','.mjs':'text/javascript','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}
});
async function check(browser,profile,name,url){
 const page=await browser.newPage(profile),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url);
  const ghost=page.locator('[data-about-ghost]'),motto=page.locator('.about-motto-row > span:first-child'),portrait=page.locator('[data-particle-portrait]');
  const active=()=>ghost.getAttribute('data-ghost-active');
  await page.waitForFunction(()=>document.querySelector('[data-about-ghost]').hasAttribute('data-ghost-managed'));
  assert.equal(await active(),null);assert.equal(await ghost.getAttribute('data-ghost-seen'),null);
  await ghost.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('[data-about-ghost]').hasAttribute('data-ghost-active'));
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.about-ghost-rise')).opacity==='1');
  const [g,m,p]=await Promise.all([ghost.boundingBox(),motto.boundingBox(),portrait.boundingBox()]);
  assert.ok(g.x>=m.x+m.width-1&&g.y+g.height<=p.y+1,'ghost must not obscure motto or portrait');
  assert.ok(g.width<=100&&g.height<=68);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.equal(await ghost.evaluate(el=>getComputedStyle(el).pointerEvents),'none');
  const sprite=ghost.locator('.about-ghost-sprite');
  assert.equal(await sprite.evaluate(el=>getComputedStyle(el).animationPlayState),'running');
  const t1=await sprite.evaluate(el=>getComputedStyle(el).transform);
  await page.waitForTimeout(650);
  assert.notEqual(await sprite.evaluate(el=>getComputedStyle(el).transform),t1);
  await portrait.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('[data-particle-portrait]').dataset.portraitState==='idle');
  await ghost.scrollIntoViewIfNeeded();
  await page.locator('.profile-header').screenshot({path:path.join(out,name+'-motto.png')});
  await ghost.screenshot({path:path.join(out,name+'-ghost.png')});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>!document.querySelector('[data-about-ghost]').hasAttribute('data-ghost-active'),null,{polling:100});
  assert.equal(await sprite.evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>scrollTo(0,0));
  await page.waitForFunction(()=>!document.querySelector('[data-about-ghost]').hasAttribute('data-ghost-active'),null,{polling:100});
  assert.equal(await sprite.evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
  assert.notEqual(await ghost.getAttribute('data-ghost-seen'),null);
  assert.deepEqual(errors,[]);
  console.log(name,JSON.stringify({ghost:[g.width,g.height],noOverlap:true,portraitReady:true,offscreenPaused:true,reducedMotion:true}));
 }finally{await page.close();}
}
(async()=>{
 await mkdir(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const cases=[[chromium,{viewport:{width:1200,height:900}},'desktop-chromium'],[chromium,{...devices['Pixel 7']},'android-chromium'],[chromium,{viewport:{width:320,height:640},hasTouch:true,isMobile:true},'small-mobile-chromium']];
 if(!process.argv.includes('--chromium-only'))cases.push([firefox,{viewport:{width:1200,height:900}},'desktop-firefox'],[webkit,{...devices['iPhone 13']},'iphone-webkit']);
 for(const [engine,profile,name] of cases){const browser=await engine.launch();try{await check(browser,profile,name,url)}finally{await browser.close();}}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
