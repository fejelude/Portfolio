const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'mario-gallery-results');
const manifest=require('../assets/mario-odyssey-memories/manifest.json');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep))throw Error('path');
  const data=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data);
 }catch{res.writeHead(404).end();}
});
async function verify(browser,engine,mobile,url){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?3:1,hasTouch:mobile,isMobile:mobile});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // Use the same pinned GSAP/CDN versions via installed files. Do not substitute
 // generated imagery for any missing real gallery image.
 for(const [name,file] of [['gsap.min.js','gsap/dist/gsap.min.js'],['ScrollTrigger.min.js','gsap/dist/ScrollTrigger.min.js'],['three.min.js','three/build/three.min.js']]){
  await context.route('**/'+name,route=>route.fulfill({path:require.resolve(file),contentType:'application/javascript'}));
 }
 const label=engine+'-'+(mobile?'mobile':'desktop');
 const grid=page.locator('#mario-odyssey-grid'),cards=grid.locator('[data-mario-memory]');
 const lightbox=page.locator('#lightbox');
 const caption=()=>lightbox.locator('.lightbox-caption').textContent();
 const go=async(i)=>{await cards.nth(i).scrollIntoViewIfNeeded();await page.waitForFunction(id=>{
  const el=document.querySelector('[data-mario-memory="'+id+'"]');
  return Number(getComputedStyle(el).opacity)>.98;
 },manifest.entries[i].id);};
 const open=async(i)=>{await go(i);await cards.nth(i).click();await lightbox.waitFor({state:'visible'});assert.ok((await caption()).startsWith(manifest.entries[i].caption));};
 const swipe=async(dx,dy)=>lightbox.evaluate((el,{dx,dy})=>{
  // Test existing touch handlers in both engines without altering application code.
  const event=(type,x,y)=>{const e=new Event(type,{bubbles:true});Object.defineProperty(e,'changedTouches',{value:[{screenX:x,screenY:y}]});el.dispatchEvent(e);};
  event('touchstart',180,180);event('touchend',180+dx,180+dy);
 },{dx,dy});
 try{
  await page.goto(url+'/Gallery.html',{waitUntil:'domcontentloaded'});
  const pending=await page.locator('template#mario-pending-images').count()===1;
  assert.equal(await page.locator('#gallery .gallery-grid').count(),pending?2:3);
  assert.equal(await page.locator('#gallery a.gallery-item').count(),0);
  if(pending){
   assert.equal(await cards.count(),0);
   console.log(label,'photo assets pending; Mario section intentionally not rendered');
  }else{
  await grid.scrollIntoViewIfNeeded();
  assert.equal(await cards.count(),21);
  assert.equal(await page.locator('#gallery .gallery-grid').nth(0).locator('img').count(),13);
  assert.equal(await page.locator('#gallery .gallery-grid').nth(1).locator('img').count(),10);
  assert.equal(await grid.locator('img').count(),21);
  for(const [i,e] of manifest.entries.entries()){
   await go(i);
   const card=cards.nth(i);
   assert.equal(await card.getAttribute('data-mario-memory'),e.id);
   assert.ok((await card.innerText()).includes(e.caption));
   const box=await card.boundingBox();
   assert.ok(box&&box.width>0&&box.height>0);
   await page.waitForFunction(id=>{const im=document.querySelector('[data-mario-memory="'+id+'"] img');return im.complete&&im.naturalWidth>=1280;},e.id);
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await go(0);
  await page.screenshot({path:path.join(out,label+'-start.png'),scale:'css'});
  await go(20);
  await page.screenshot({path:path.join(out,label+'-finale.png'),scale:'css'});
  for(let i=0;i<21;i++){await open(i);await page.keyboard.press('Escape');await lightbox.waitFor({state:'hidden'});}
   await open(0);
   await lightbox.locator('.lightbox-next').click();
   await page.waitForFunction(expected=>document.querySelector('.lightbox-caption').textContent.startsWith(expected),manifest.entries[1].caption);
   await page.keyboard.press('ArrowRight');
   await page.waitForFunction(expected=>document.querySelector('.lightbox-caption').textContent.startsWith(expected),manifest.entries[2].caption);
   await swipe(100,0);
   await page.waitForFunction(expected=>document.querySelector('.lightbox-caption').textContent.startsWith(expected),manifest.entries[1].caption);
   await swipe(0,100);await lightbox.waitFor({state:'hidden'});
   await open(20);
   await page.screenshot({path:path.join(out,label+'-peach-lightbox.png'),scale:'css'});
   await page.keyboard.press('Escape');
  }
  // A real local Zelda image must still enter and exit its existing lightbox.
  const zelda=page.locator('.gallery-grid').first().locator('.gallery-item').first();
  await zelda.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>{const img=document.querySelector('.gallery-grid img');return img.naturalWidth>0&&Number(getComputedStyle(img.parentElement).opacity)>.98;});
  await zelda.click();await lightbox.waitFor({state:'visible'});
  assert.equal(await caption(),'Subdued Ceremony');
  await page.keyboard.press('Escape');await lightbox.waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);
  console.log(label,pending?'existing Zelda lightbox; Mario photo testing pending':'21 photos and lightbox');
 }finally{await context.close();}
}
(async()=>{
 await mkdir(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  for(const [engine,launcher] of Object.entries({chromium,webkit})){
   const browser=await launcher.launch(engine==='chromium'?{args:['--enable-unsafe-swiftshader']}:{});
   try{for(const mobile of [false,true])await verify(browser,engine,mobile,'http://127.0.0.1:'+server.address().port);}finally{await browser.close();}
  }
 }finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
