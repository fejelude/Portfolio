const {chromium}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir,writeFile}=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');

const baseline=process.argv[2];
if(!baseline)throw Error('Pass a checkout of the base revision');
const roots={before:path.resolve(baseline),after:path.resolve(__dirname,'..')};
const output=path.join(__dirname,'daedalus-astral-results');
const mime={'.css':'text/css','.mjs':'text/javascript','.webp':'image/webp','.woff':'font/woff'};
const sections=Object.fromEntries(Object.entries(roots).map(([key,root])=>[key,readFile(path.join(root,'index.html'),'utf8').then(html=>
 html.match(/<section id="tourbillon"[\s\S]*?<\/section>/)[0].replaceAll('src="/assets/','src="/'+key+'/assets/'))]));

const server=createServer(async(req,res)=>{
 try{
  const [,route,...parts]=new URL(req.url,'http://localhost').pathname.split('/');
  const key=route==='assets'?'after':route;
  if(route==='assets')parts.unshift(route);
  const root=roots[key];
  if(!root)throw Error('unknown revision');
  if(parts[0]==='card'){
   res.writeHead(200,{'content-type':'text/html'});
   res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="/${key}/css/feje-tourbillon.css">
    <style>*{box-sizing:border-box}body{margin:0;background:#080e19}.ft-section{padding-inline:16px}.container{margin:auto}</style>
    <body class="feje-world-home">${await sections[key]}<script type="module" src="/${key}/js/feje-tourbillon.mjs"></script></body>`);
   return;
  }
  if(parts[0]==='probe'){
   res.writeHead(200,{'content-type':'text/html'});
   res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas>');
   return;
  }
  const file=path.resolve(root,...parts);
  if(!file.startsWith(root+path.sep))throw Error('invalid path');
  const data=await readFile(file);
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});
  res.end(data);
 }catch{res.writeHead(404);res.end();}
});

async function capture(browser,url,revision,device){
 const mobile=device==='mobile';
 const viewport=mobile?{width:390,height:844}:{width:1000,height:900};
 const context=await browser.newContext({viewport,deviceScaleFactor:mobile?3:1,hasTouch:mobile,
  isMobile:mobile,reducedMotion:'reduce',timezoneId:'America/New_York'});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(/THREE\.WebGLProgram.*(?:error|invalid)/i.test(message.text()))errors.push(message.text());});
 try{
  await page.goto(url+'/'+revision+'/card');
  const card=page.locator('.ft-card'),stage=card.locator('.ft-stage'),surface=card.locator('.ft-model');
  await surface.waitFor({timeout:45000});
  for(const name of mobile?['normal','portrait','square','landscape']:['normal','landscape']){
   await card.locator('[data-ft-ratio="'+name+'"]').click();
   await stage.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>{const c=document.querySelector('.ft-model');return !c.hidden
    &&Math.abs(c.width/c.height-c.clientWidth/c.clientHeight)<.015;});
   await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
   await stage.screenshot({path:path.join(output,revision+'-'+device+'-'+name+'-stage.png'),timeout:60000});
   if(name==='normal')await card.screenshot({path:path.join(output,revision+'-'+device+'-card.png'),timeout:60000});
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  const sample=await surface.evaluate(c=>({width:c.width,height:c.height,clientWidth:c.clientWidth,
   antialias:c.getContext('webgl2').getContextAttributes().antialias,dpr:devicePixelRatio}));
  await page.goto(url+'/'+revision+'/probe');
  const timing=await page.evaluate(async mobile=>{
   const {createWatchRenderer,overviewFraming}=await import('./js/feje-tourbillon-renderer.mjs');
   const canvas=document.querySelector('canvas');
   const gl=canvas.getContext('webgl2',{alpha:true,antialias:typeof overviewFraming==='function'||!mobile,depth:true,powerPreference:'low-power'});
   const probe=createWatchRenderer(canvas,{mobile});
   const frame=mobile?[390,293]:[620,465];
   probe.resize(...frame);
   const pixel=new Uint8Array(4),times=[],angles={hour:266.2,minute:74,second:186};
   const draw=(seconds,sky)=>probe.draw.length===2?probe.draw(seconds,1/60,true,sky):probe.draw(seconds,angles,1/60,true,sky);
   const start=performance.now();
   for(let i=0;i<18;i++){
    const at=performance.now();
    draw(i*71.3,i*.6);
    gl.readPixels(canvas.width>>1,canvas.height>>1,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    if(i>=4)times.push(performance.now()-at);
   }
   times.sort((a,b)=>a-b);
   const debug=gl.getExtension('WEBGL_debug_renderer_info');
   const result={...probe.stats,buffer:[canvas.width,canvas.height],warmAndSampleMs:performance.now()-start,
    count:times.length,p50:times[6],p95:times[13],rgba:[...pixel],error:gl.getError(),
    driver:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
   // Product galleries intentionally use the new overview composition.
   // This additional frame holds yaw, elevation, camera distance and time
   // steady so the reconstruction can also be compared from one pose.
   const reference=overviewFraming?.(frame[0]/frame[1])??{azimuth:.13,elevation:.58,distance:8.95};
   probe.orbit(.82-reference.azimuth,.55-reference.elevation);
   probe.zoom(14.3/reference.distance);
   draw(0,0);
   const fixedPose=canvas.toDataURL('image/png').split(',')[1];
   probe.dispose();
   return {result,fixedPose};
  },mobile);
  assert.equal(timing.result.error,0,JSON.stringify(timing.result));
  assert.ok(timing.result.rgba.some((x,i)=>i<3&&x>0),'rendered pixel is empty');
  assert.ok(timing.fixedPose.length>2000,'matched orbit image is empty');
  await writeFile(path.join(output,revision+'-'+device+'-matched-camera.png'),Buffer.from(timing.fixedPose,'base64'));
  assert.deepEqual(errors,[]);
  return {sample,timing:timing.result};
 }finally{await context.close();}
}

(async()=>{
 await mkdir(output,{recursive:true});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={};
 try{
  for(const revision of ['before','after'])for(const device of ['desktop','mobile']){
   const key=revision+'-'+device;
   report[key]=await capture(browser,url,revision,device);
   console.log(key,JSON.stringify(report[key]));
  }
 }finally{
  await writeFile(path.join(output,'measurements.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
