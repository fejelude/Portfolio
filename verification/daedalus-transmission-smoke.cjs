const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const {readFile,mkdir,writeFile} = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');

const root = path.resolve(__dirname,'..');
const output = process.env.DAEDALUS_TRANSMISSION_RESULTS || path.join(__dirname,'daedalus-transmission-results');
const types = {'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.webp':'image/webp','.woff2':'font/woff2'};
const server = createServer(async(req,res)=>{
 try{
  const {pathname} = new URL(req.url,'http://localhost');
  if(pathname==='/bench'){
   res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><style>body{margin:0;background:#0b1420}canvas{display:block}</style><canvas></canvas>');
   return;
  }
  const file = path.resolve(root,'.'+(pathname==='/'?'/index.html':decodeURIComponent(pathname)));
  if(!file.startsWith(root+path.sep))throw Error('path');
  const bytes=await readFile(file);
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(bytes);
 }catch{
  if(!res.headersSent)res.writeHead(404);
  res.end();
 }
});

async function inspect(browser,url,mobile){
 const viewport = mobile ? {width:390,height:844} : {width:930,height:770};
 const context=await browser.newContext({viewport,deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile,
  timezoneId:'America/Los_Angeles',reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
 try{
  await page.goto(url+'/bench');
  const images=await page.evaluate(async mobile=>{
   const {createWatchRenderer}=await import('/js/feje-tourbillon-renderer.mjs');
   const canvas=document.querySelector('canvas'),watch=createWatchRenderer(canvas,{mobile});
   if(!watch)throw Error('WebGL2 is required for this Chromium review');
   const gl=canvas.getContext('webgl2');
   watch.resize(mobile?360:894,mobile?338:686);
   const results=[];
   for(const [name,view,seconds,dx,dy,scale] of [
    ['gears','gears',8.3,0,0,1],['inclined-dial','dial',8.3,0,0,1],['quarter-orbit','gears',308.3,.58,.16,.96]
   ]){
    watch.focus(view);watch.orbit(dx,dy);watch.zoom(scale);watch.draw(seconds,1/60,true,0);
    const pixel=new Uint8Array(4);
    gl.readPixels(canvas.width>>1,canvas.height>>1,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    results.push({name,rgba:[...pixel],error:gl.getError(),stats:{...watch.stats},png:canvas.toDataURL('image/png').split(',')[1]});
   }
   watch.dispose();
   return results;
  },mobile);
  for(const {png,...shot} of images){
   assert.equal(shot.error,0);
   assert.ok(shot.stats.drawCalls>50 && shot.rgba[3]>0);
   await writeFile(path.join(output,(mobile?'mobile':'desktop')+'-'+shot.name+'.png'),Buffer.from(png,'base64'));
  }

  await page.goto(url);
  const watch=page.locator('#tourbillon'),stage=watch.locator('[data-ft-stage]');
  await stage.scrollIntoViewIfNeeded();
  await watch.locator('.ft-model:not([hidden])').waitFor({timeout:45000});
  const gear=watch.locator('[data-ft-inspect="gears"]');
  await gear.click();
  assert.equal(await gear.getAttribute('aria-pressed'),'true');
  assert.match(await watch.locator('#ft-detail').textContent(),/12:1/);
  const dial=watch.locator('[data-ft-inspect="dial"]');
  await dial.click();
  assert.equal(await dial.getAttribute('aria-pressed'),'true');
  assert.equal(await gear.getAttribute('aria-pressed'),'false');
  const clock=watch.locator('#ft-time');
  await page.emulateMedia({reducedMotion:'no-preference'});
  const pause=watch.locator('[data-ft-pause]');
  await pause.click();
  assert.equal(await pause.getAttribute('aria-pressed'),'true');
  const first=await clock.getAttribute('datetime');
  await page.waitForFunction(first=>document.querySelector('#ft-time').dateTime!==first,first);
  const [value,expected]=await clock.evaluate(el=>[el.textContent,
   new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Manila',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(el.dateTime))]);
  assert.equal(value,expected);
  await pause.click();
  assert.equal(await pause.getAttribute('aria-pressed'),'false');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({mobile,images:images.map(({png,...shot})=>shot)}));
 }finally{
  await context.close();
 }
}

(async()=>{
 await mkdir(output,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
 try{
  for(const mobile of [false,true])await inspect(browser,'http://127.0.0.1:'+server.address().port,mobile);
 }finally{
  await browser.close();
 }
})().catch(error=>{
 console.error(error);
 process.exitCode=1;
}).finally(()=>server.close());
