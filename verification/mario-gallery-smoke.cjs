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
 page.on('pageerror',e=>errors.push(e.stack||e.message));
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
 const expectPhoto=async entry=>page.waitForFunction(({caption,file,width,height})=>{
  const lightbox=document.querySelector('#lightbox');
  const img=lightbox.querySelector('.lightbox-content');
  return lightbox.querySelector('.lightbox-caption').textContent===caption
   &&new URL(img.src).pathname.endsWith('/'+file)
   &&img.complete&&img.naturalWidth===width&&img.naturalHeight===height;
 },entry,{timeout:8000});
 const open=async i=>{
  await go(i);
  await cards.nth(i).locator('img').evaluate(img=>img.decode());
  await cards.nth(i).click();
  await lightbox.waitFor({state:'visible'});
  await expectPhoto(manifest.entries[i]);
 };
 const close=async()=>{
  await page.keyboard.press('Escape');
  await lightbox.waitFor({state:'hidden'});
 };
 const swipe=async(dx,dy)=>lightbox.evaluate((el,{dx,dy})=>{
  const dispatch=(type,x,y)=>{
   const event=new Event(type,{bubbles:true});
   const touch={screenX:x,screenY:y,clientX:x,clientY:y};
   Object.defineProperties(event,{
    touches:{value:type==='touchend'?[]:[touch]},
    changedTouches:{value:[touch]}
   });
   el.dispatchEvent(event);
  };
  dispatch('touchstart',180,180);
  dispatch('touchend',180+dx,180+dy);
 },{dx,dy});
 try{
  await page.goto(url+'/Gallery.html',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#gallery .gallery-grid').count(),3);
  assert.equal(await page.locator('#gallery a.gallery-item, #gallery template').count(),0);
  assert.equal(await cards.count(),21);
  assert.equal(await page.locator('#gallery .gallery-grid').nth(0).locator('img').count(),13);
  assert.equal(await page.locator('#gallery .gallery-grid').nth(1).locator('img').count(),10);
  assert.equal(await grid.locator('img').count(),21);
  assert.equal(await cards.first().evaluate(el=>Number(getComputedStyle(el).opacity)),0);
  await go(0);
  if(!mobile){
   await cards.first().hover();
   await page.waitForFunction(()=>{
    const card=document.querySelector('#mario-odyssey-grid .gallery-item');
    return Number(getComputedStyle(card.querySelector('.gallery-caption')).opacity)===1
     &&getComputedStyle(card.querySelector('.gallery-img')).transform!=='none';
   });
  }
  await page.screenshot({path:path.join(out,label+'-start.png'),scale:'css'});
  if(mobile){
   // Traverse the collection before scrolling past its lazy-loaded thumbnails.
   await open(0);
   for(const entry of manifest.entries.slice(1)){
    await swipe(-100,0);
    await expectPhoto(entry);
   }
   await swipe(0,100);
   await lightbox.waitFor({state:'hidden'});
  }
  for(const [i,entry] of manifest.entries.entries()){
   await go(i);
   const card=cards.nth(i);
   assert.equal(await card.getAttribute('data-mario-memory'),entry.id);
   assert.equal(await card.locator('.gallery-caption').textContent(),entry.caption);
   await page.waitForFunction(({id,width,height})=>{
    const img=document.querySelector('[data-mario-memory="'+id+'"] img');
    return img.complete&&img.naturalWidth===width&&img.naturalHeight===height;
   },entry);
   await open(i);
   await close();
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(out,label+'-finale.png'),scale:'css'});
  await open(0);
  await lightbox.locator('.lightbox-next').click();
  await expectPhoto(manifest.entries[1]);
  await lightbox.locator('.lightbox-prev').click();
  await expectPhoto(manifest.entries[0]);
  await page.keyboard.press('ArrowRight');
  await expectPhoto(manifest.entries[1]);
  await page.keyboard.press('ArrowLeft');
  await expectPhoto(manifest.entries[0]);
  await close();
  await open(20);
  await page.screenshot({path:path.join(out,label+'-peach-lightbox.png'),scale:'css'});
  await close();
  for(const [index,expected] of ['Subdued Ceremony','SkyWars'].entries()){
   const card=page.locator('#gallery .gallery-grid').nth(index).locator('.gallery-item').first();
   await card.scrollIntoViewIfNeeded();
   const img=await card.locator('img').elementHandle();
   await page.waitForFunction(img=>img.complete&&img.naturalWidth>0,img);
   const source=await img.evaluate(img=>img.src);
   await card.click();
   await lightbox.waitFor({state:'visible'});
   assert.equal(await caption(),expected);
   await page.waitForFunction(source=>{
    const img=document.querySelector('#lightbox .lightbox-content');
    return img.src===source&&img.complete&&img.naturalWidth>0;
   },source);
   await close();
  }
  assert.deepEqual(errors,[]);
  console.log(label,'21 Mario photos and lightboxes, navigation, and Zelda and Minecraft lightboxes');
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
