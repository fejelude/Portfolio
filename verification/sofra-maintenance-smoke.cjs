// Tests the temporary production route mapping using local files only.
const {chromium}=require('playwright');
const {createServer}=require('node:http');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),config=require('../vercel.json');
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const redirect=config.redirects.find(r=>r.source===url.pathname);
 if(redirect){res.writeHead(307,{location:redirect.destination});return res.end();}
 const rewrite=config.rewrites.find(r=>r.source===url.pathname);
 let name=rewrite?.destination||url.pathname;
 if(name==='/')name='/index.html';
 if(!path.extname(name))name+='.html';
 const file=path.resolve(root,'.'+name);
 try{
  if(!file.startsWith(root+path.sep))throw Error('path');
  const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);
 }catch{res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true});
 try{
  for(const [width,height,mode] of [[320,568,'normal'],[390,844,'normal'],[768,1024,'normal'],[1440,900,'normal'],[844,390,'normal'],[390,844,'reduced'],[390,844,'no-js']]){
   const context=await browser.newContext({viewport:{width,height},javaScriptEnabled:mode!=='no-js',reducedMotion:mode==='reduced'?'reduce':'no-preference',hasTouch:width<900});
   try{
    const p=await context.newPage(),errors=[],api=[];
    p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/api/sofra'))api.push(r.url());});
    await p.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
    await p.goto(base+'/sofra');
    assert.equal((await p.locator('h1').innerText()).replace(/\s+/g,' ').trim(),'Sofra will be back soon.');
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    assert.equal(await p.locator('a.sm-home').getAttribute('href'),'/');
    assert.equal(await p.locator('#auth-gate').count(),0);
    const mascot=p.locator('.sm-mascot'),tear=mascot.locator('.sm-tear-left');
    if(mode==='normal'){
      await p.waitForFunction(()=>document.querySelector('.sm-mascot').classList.contains('is-running'));
      assert.equal(await tear.evaluate(el=>getComputedStyle(el).animationIterationCount),'infinite');
      const frames=await tear.evaluate(el=>{const a=el.getAnimations()[0];a.pause();a.currentTime=0;const start=getComputedStyle(el).transform;a.currentTime=600;const mid=getComputedStyle(el).transform;a.currentTime=1200;const repeat=getComputedStyle(el).transform;a.play();return [start,mid,repeat];});
      assert.notEqual(frames[0],frames[1]);assert.equal(frames[0],frames[2]);
      await mascot.click();assert.equal(await tear.evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
      await mascot.click();assert.equal(await tear.evaluate(el=>getComputedStyle(el).animationPlayState),'running');
    }else{assert.equal(await mascot.isDisabled(),true);assert.equal(await tear.evaluate(el=>getComputedStyle(el).animationName),'none');}
    assert.deepEqual(errors,[]);assert.deepEqual(api,[]);
    await p.goto(base+'/SofraPanel');assert.equal(new URL(p.url()).pathname,'/sofra');assert.equal(await p.locator('.sm-content').count(),1);
    await p.locator('a.sm-home').click();assert.equal(new URL(p.url()).pathname,'/');
    console.log('PASS',width,height,mode);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
