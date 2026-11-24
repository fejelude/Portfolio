/* Matched before/after captures from the live geometry at fixed camera poses. */
const {chromium}=require('playwright');
const {createServer}=require('node:http');
const {mkdir,readFile,writeFile}=require('node:fs/promises');
const {resolve,sep}=require('node:path');
const assert=require('node:assert/strict');

const baseline=process.argv[2];
if(!baseline)throw Error('Pass the path to a checkout of the baseline revision');
const roots={before:resolve(baseline),after:resolve(__dirname,'..')};
const output=resolve(__dirname,'automotive-fidelity-results');
const poses={
 front:{target:[0,.61,0],yaw:.72,pitch:.22,radius:8.5},
 rear:{target:[0,.63,0],yaw:2.53,pitch:.23,radius:8.6},
 profile:{target:[0,.62,0],yaw:Math.PI/2,pitch:.14,radius:8.7},
 wheel:{target:[1.04,.48,1.53],yaw:1.34,pitch:.155,radius:2.18}
};
const server=createServer(async(req,res)=>{
 try{
  const [,version,...parts]=new URL(req.url,'http://localhost').pathname.split('/');
  const root=roots[version];
  if(!root)throw Error('invalid version');
  if(!parts.length||!parts[0]){
   res.writeHead(200,{'content-type':'text/html'});
   res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#120f1c}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas>');
   return;
  }
  const file=resolve(root,...parts);
  if(!file.startsWith(root+sep)||!file.endsWith('.mjs'))throw Error('invalid path');
  res.writeHead(200,{'content-type':'text/javascript'});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}
});

async function review(browser,url,version,device,report){
 const mobile=device==='mobile',viewport=mobile?{width:390,height:340}:{width:850,height:480};
 const context=await browser.newContext({viewport,deviceScaleFactor:mobile?3:1.5,isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage();
 const folder=resolve(output,version,device);
 await mkdir(folder,{recursive:true});
 try{
  await page.goto(url+'/'+version+'/');
  const driver=await page.evaluate(async useCompactBaseline=>{
   const {TerminalRenderer,COLLECTION}=await import('./js/home-world-renderer.mjs');
   const canvas=document.querySelector('canvas');
   const start=performance.now();
   const renderer=window.fidelityRenderer=new TerminalRenderer(canvas,useCompactBaseline);
   const gl=renderer.gl,debug=gl.getExtension('WEBGL_debug_renderer_info');
   return {ids:COLLECTION.map(c=>c.id),initializationMs:performance.now()-start,dpr:devicePixelRatio,
     api:gl.getParameter(gl.VERSION),renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
  },version==='before'&&mobile);
  const result={viewport,...driver,cars:{}};
  report[version][device]=result;
  for(const [index,id] of driver.ids.entries()){
   result.cars[id]={};
   const setup=await page.evaluate(index=>{
    const start=performance.now();
    const r=window.fidelityRenderer;
    const previous=r.batches.map(({b})=>b);
    const changed=index!==r.selected.index;
    r.setCollectible(index);
    return {switchMs:performance.now()-start,releasedPrevious:!changed||previous.every(b=>!r.gl.isBuffer(b))};
   },index);
   assert.ok(setup.releasedPrevious,'retained buffers from the previous model');
   result.cars[id].setup=setup;
   for(const [name,view] of Object.entries(poses)){
    if(mobile&&name!=='front')continue;
    const stats=await page.evaluate(({view,baseline})=>{
     const r=window.fidelityRenderer,gl=r.gl;
     r.draw(view,true,3.25);
     gl.finish();
     const reflection=r.reflectionTarget,scene=r.sceneTarget,canvas=r.canvas;
     const triangles=r.batches.reduce((n,b)=>n+b.count/3,0);
     const passes=reflection?2:1;
     return {...(r.stats??{canvas:[canvas.width,canvas.height],scene:[scene?.w??canvas.width,scene?.h??canvas.height],
       reflection:reflection?[reflection.w,reflection.h]:null,samples:0,
       drawCalls:passes*(1+r.batches.length)+(scene?1:0),trianglesSubmitted:passes*(1+triangles)+(scene?1:0)}),
       meshTriangles:triangles,baseline,error:gl.getError()};
    },{view,baseline:version==='before'});
    assert.equal(stats.error,0,JSON.stringify(stats));
    if(version==='after')assert.deepEqual(stats.canvas,stats.scene);
    result.cars[id][name]=stats;
    await page.locator('canvas').screenshot({path:resolve(folder,id+'-'+name+'.jpg'),type:'jpeg',quality:95,scale:'device'});
   }
  }
  result.orbit=await page.evaluate(view=>{
   const r=window.fidelityRenderer,gl=r.gl,samples=[];
   const pixel=new Uint8Array(4);
   r.setCollectible(0);
   for(let i=0;i<30;i++){
    const start=performance.now();
    r.draw({...view,yaw:view.yaw+i*.014},true,3.25+i/60);
    // Readback waits for the measured frame instead of just timing the
    // command submission on browsers that optimize finish().
    gl.readPixels(r.canvas.width>>1,r.canvas.height>>1,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    if(i>5)samples.push(performance.now()-start);
   }
   samples.sort((a,b)=>a-b);
   const buffers=r.batches.map(({b})=>b),reflection=r.reflectionTarget,scene=r.sceneTarget;
   const error=gl.getError();
   r.dispose();
   return {samples:samples.length,method:"render + synchronous pixel readback",p50:samples[11],p95:samples[22],error,
     released:buffers.every(b=>!gl.isBuffer(b))&&[reflection,scene].every(target=>!target||!gl.isFramebuffer(target.frame))};
  },poses.front);
  assert.equal(result.orbit.error,0);
  assert.ok(result.orbit.released);
  console.log(version,device,JSON.stringify(result.orbit),JSON.stringify(result.cars.owl.front),driver.renderer);
 }finally{await context.close();}
}

async function verifyWebGL1(browser,url){
 const context=await browser.newContext({viewport:{width:480,height:330},deviceScaleFactor:2});
 try{
  const page=await context.newPage();
  await page.addInitScript(()=>{
   const original=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...options){
    return type==='webgl2'?null:original.call(this,type,...options);
   };
  });
  await page.goto(url+'/after/');
  return await page.evaluate(async view=>{
   const {TerminalRenderer}=await import('./js/home-world-renderer.mjs');
   const renderer=new TerminalRenderer(document.querySelector('canvas'));
   try{
    renderer.draw(view,true,0);
    const gl=renderer.gl;
    const pixels=new Uint8Array(4*12*12);
    gl.readPixels(460,300,12,12,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    return {api:gl.getParameter(gl.VERSION),size:renderer.stats.canvas,visible:pixels.some((v,i)=>i%4!==3&&v>0),error:gl.getError()};
   }finally{renderer.dispose();}
  },poses.front);
 }finally{await context.close();}
}

(async()=>{
 await mkdir(output,{recursive:true});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={before:{},after:{}};
 try{
  for(const version of ['before','after'])for(const device of ['desktop','mobile'])await review(browser,url,version,device,report);
  report.webgl1=await verifyWebGL1(browser,url);
  assert.match(report.webgl1.api,/WebGL 1/);
  assert.deepEqual(report.webgl1.size,[960,660]);
  assert.equal(report.webgl1.error,0);
  assert.equal(report.webgl1.visible,true);
  console.log('WebGL 1 fallback',JSON.stringify(report.webgl1));
 }finally{
  await writeFile(resolve(output,'measurements.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
