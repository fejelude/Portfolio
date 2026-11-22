const {chromium,firefox,webkit}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'home-world-results');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep))throw Error('path');
  const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(body);
 }catch{res.writeHead(404);res.end();}
});
(async()=>{
 await mkdir(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 for(const [name,type] of Object.entries({chromium,firefox,webkit})){
  const browser=await type.launch({headless:true});
  try{
   for(const [width,height,mode] of [[320,700,'normal'],[390,844,'normal'],[768,1024,'normal'],[1440,900,'normal'],[390,844,'reduced'],[390,844,'no-js']]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:width<761,reducedMotion:mode==='reduced'?'reduce':'no-preference',javaScriptEnabled:mode!=='no-js'});
    try{
     const page=await context.newPage();await page.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());await page.goto(url,{waitUntil:'domcontentloaded'});
     const section=page.locator('#roblox-creations');await section.scrollIntoViewIfNeeded();assert.equal(await section.isVisible(),true);
     assert.equal(await section.locator('article').count(),2);
     for(const img of await section.locator('img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode());assert.ok(await img.evaluate(el=>el.naturalWidth>=200));}
     assert.equal(await section.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&el.scrollWidth<=el.clientWidth+1;}),true);
     const stacked=await section.locator('.rc-entry').first().evaluate(el=>getComputedStyle(el).gridTemplateAreas.startsWith('"heading"'));
     assert.equal(stacked,width<=760);
     if(mode==='reduced'||mode==='no-js')assert.equal(await section.locator('[data-animate]').count(),0);
     await section.screenshot({path:path.join(out,'roblox-'+name+'-'+width+'-'+mode+'.png'),animations:'disabled'});
    }finally{await context.close();}
   }
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
