const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile,mkdir,writeFile}=require('node:fs/promises');
const path=require('node:path');
const {chromium,firefox,webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'sofra-sakura-results');
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.svg':'image/svg+xml','.woff':'font/woff','.webp':'image/webp','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const file=path.resolve(root,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':decodeURIComponent(new URL(req.url,'http://localhost').pathname)));
  if(!file.startsWith(root+path.sep))throw Error('path');
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(await readFile(file));
 }catch{if(!res.headersSent)res.writeHead(404);res.end();}
});
async function verify(browser,url,engine,mobile){
 const viewport=mobile?{width:390,height:844}:{width:1440,height:900};
 const context=await browser.newContext({viewport,deviceScaleFactor:mobile?3:1,isMobile:mobile&&engine!=='firefox',hasTouch:mobile,reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
 await page.addInitScript(()=>{
  window.sakuraPaints=[];const clear=CanvasRenderingContext2D.prototype.clearRect;
  CanvasRenderingContext2D.prototype.clearRect=function(...args){
   if(this.canvas.parentElement?.className==='sofra-sakura-sky'&&this.canvas===this.canvas.parentElement.querySelector('canvas')){
    window.sakuraPaints.push(performance.now());
   }
   return clear.apply(this,args);
  };
 });
 const sky=page.locator('.sofra-sakura-sky'),card=page.locator('#sofra-project .sofra-feature');
 const position=(selector,edge,fraction)=>page.evaluate(({selector,edge,fraction})=>{
  const r=document.querySelector(selector).getBoundingClientRect();window.scrollTo({top:scrollY+r[edge]-innerHeight*fraction,behavior:'instant'});
 },{selector,edge,fraction});
 const strength=()=>sky.evaluate(e=>Number(e.style.getPropertyValue('--sakura-strength')));
 const waitStrength=(lo,hi)=>page.waitForFunction(({lo,hi})=>{
  const e=document.querySelector('.sofra-sakura-sky');if(!e||e.hidden)return false;
  const x=Number(e.style.getPropertyValue('--sakura-strength'));return x>=lo&&x<=hi;
 },{lo,hi});
 const digest=()=>sky.evaluate(e=>[...e.querySelectorAll('canvas:not([hidden])')].map(c=>{
  const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=0;
  for(let i=3;i<a.length;i+=4)h=Math.imul(h^a[i],16777619);return h;
 }).join(','));
 const shot=phase=>page.screenshot({path:path.join(out,engine+'-'+(mobile?'mobile':'desktop')+'-'+phase+'.png'),scale:'css'});
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});await sky.waitFor({state:'attached'});
  await position('#sofra-project','top',.20);await waitStrength(.85,1);
  const full=await strength(),stage=await sky.evaluate(e=>({
   aria:e.getAttribute('aria-hidden'),pointer:getComputedStyle(e).pointerEvents,
   pixels:[...e.querySelectorAll('canvas')].reduce((n,c)=>n+c.width*c.height,0)
  }));
  assert.equal(stage.aria,'true');assert.equal(stage.pointer,'none');assert.ok(stage.pixels<=1150004);
  assert.equal(await card.locator('h2').innerText(),'The Best Free\nDiscord Bot.');
  assert.equal(await card.getByRole('status').count(),1);
  const link=card.locator('a[href="/sofra/about"]');await link.scrollIntoViewIfNeeded();
  assert.ok(await link.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
  await position('#sofra-project','top',.20);await waitStrength(.85,1);
  const still=await digest();await page.waitForTimeout(350);assert.equal(await digest(),still);
  await shot('garden-reduced');
  await sky.evaluate(e=>e.style.visibility='hidden');await shot('baseline');await sky.evaluate(e=>e.style.removeProperty('visibility'));
  await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>window.sakuraPaints.length=0);
  await page.waitForTimeout(1800);assert.notEqual(await digest(),still);
  const cadence=await page.evaluate(()=>{
   const a=window.sakuraPaints;return {frames:a.length,fps:a.length>1?(a.length-1)*1000/(a.at(-1)-a[0]):0};
  });
  assert.ok(cadence.frames>0);assert.ok(cadence.fps<=(mobile?28:34));
  await shot('garden-animated');
  await position('#tourbillon','top',.20);await sky.waitFor({state:'hidden'});await shot('daedalus');
  await position('#sofra-project','top',.20);await waitStrength(.85,1);await shot('return');
  await position('#sofra-project','bottom',-.10);await waitStrength(.05,.85);const leaving=await strength();await shot('leaving');
  await position('#sofra-project','bottom',-.7);await sky.waitFor({state:'hidden'});
  assert.ok(await sky.evaluate(e=>[...e.querySelectorAll('canvas')].every(c=>c.width===1&&c.height===1)));
  await position('#sofra-project','top',.20);await waitStrength(.85,1);
  await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));await sky.waitFor({state:'hidden'});
  await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await waitStrength(.85,1);
  assert.equal(await sky.count(),1);
  await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide')));await sky.waitFor({state:'detached'});
  assert.deepEqual(errors,[]);return {engine,mobile,full,leaving,...stage,cadence};
 }finally{await context.close();}
}
(async()=>{
 await mkdir(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const results=[];
 try{
  for(const [engine,launcher] of Object.entries({chromium,firefox,webkit})){
   const browser=await launcher.launch(engine==='chromium'?{args:['--enable-unsafe-swiftshader']}:{});
   try{for(const mobile of [false,true]){const r=await verify(browser,'http://127.0.0.1:'+server.address().port,engine,mobile);results.push(r);console.log(r);}}
   finally{await browser.close();}
  }
 }finally{await writeFile(path.join(out,'measurements.json'),JSON.stringify(results,null,2));server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
