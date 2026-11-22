/* Mobile-first Sofra feature regression checks, independent of WebGL support. */
const {chromium,firefox,webkit}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'home-world-results');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(root+path.sep))throw Error('path');
    const content=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(content);
  }catch{res.writeHead(404);res.end();}
});
(async()=>{
  await mkdir(out,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  for(const [name,type] of Object.entries({chromium,firefox,webkit})){
    const browser=await type.launch({headless:true});
    try{
      for(const config of [
        {width:320,height:720},{width:390,height:844},{width:430,height:932},
        {width:768,height:1024},{width:1440,height:900},
        {width:390,height:844,reduced:true},{width:390,height:844,noJS:true}
      ]){
        const {width,height,reduced,noJS}=config;
        const context=await browser.newContext({viewport:{width,height},hasTouch:width<=768,reducedMotion:reduced?'reduce':'no-preference',javaScriptEnabled:!noJS});
        const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
        const suffix=name+'-'+width+(reduced?'-reduced':noJS?'-no-js':'');
        try{
          await page.goto(url,{waitUntil:'domcontentloaded'});
          const card=page.locator('#sofra-project .sofra-feature'),title=card.locator('h2'),kitty=card.locator('.sofra-feature-mascot');
          await card.scrollIntoViewIfNeeded();
          assert.equal(await title.innerText(),'The Best Free\nDiscord Bot.');
          assert.equal(await card.getByRole('status').count(),1);
          assert.equal(await card.locator('a[href="/sofra/about"]').count(),1);
          assert.equal(await card.locator('a[href="/sofra"]').count(),1);
          assert.equal(await kitty.isVisible(),true);
          const layout=await card.evaluate(el=>{
            const bounds=s=>{const r=el.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
            const panel=el.getBoundingClientRect(),style=getComputedStyle(el);
            return {pad:parseFloat(style.paddingLeft),right:panel.right,left:panel.left,overflow:el.scrollWidth>el.clientWidth+1,heading:bounds('h2'),kitty:bounds('.sofra-feature-mascot'),description:bounds('.sofra-feature-description'),status:bounds('.sofra-feature-status'),primary:bounds('.sofra-feature-primary'),secondary:bounds('.sofra-feature-secondary')};
          });
          assert.ok(layout.pad>=16,JSON.stringify(layout));
          assert.ok(layout.left>=0&&layout.right<=width+1&&!layout.overflow,JSON.stringify(layout));
          assert.ok(layout.heading.right<=layout.kitty.left+1,JSON.stringify(layout));
          for(const box of [layout.heading,layout.kitty,layout.description,layout.status,layout.primary,layout.secondary])assert.ok(box.left>=layout.left+layout.pad-1&&box.right<=layout.right-layout.pad+1,JSON.stringify(layout));
          assert.ok(layout.primary.height>=44&&layout.secondary.height>=44);
          if(width<=900)assert.ok(layout.description.top>=Math.max(layout.heading.bottom,layout.kitty.bottom)-1);
          if(width<=480)assert.ok(layout.secondary.top>=layout.primary.bottom);
          if(!noJS&&!reduced)await page.waitForFunction(()=>document.querySelector('#sofra-feature-mascot').classList.contains('is-greeting'));
          assert.equal(await kitty.locator('button, [role="button"]').count(),0);
          assert.equal(await kitty.locator('.sofra-pixel-frame').count(),6);
          if(reduced||noJS){
            assert.equal(await kitty.locator('.sofra-pixel-frame-0').evaluate(el=>getComputedStyle(el).animationName),'none');
            assert.equal(await kitty.locator('.sofra-pixel-wrap').evaluate(el=>getComputedStyle(el).opacity),'1');
          }else{
            const dance=await kitty.locator('.sofra-pixel-frame-0').evaluate(el=>({name:getComputedStyle(el).animationName,count:getComputedStyle(el).animationIterationCount,duration:getComputedStyle(el).animationDuration}));
            assert.deepEqual(dance,{name:'sf-pixel-pose-0',count:'4',duration:'1.2s'});
            // At least two actual poses must be visible over successive samples.
            const seen=new Set();
            for(let i=0;i<7;i++){
              const visible=await kitty.locator('.sofra-pixel-frame').evaluateAll(els=>els.findIndex(el=>getComputedStyle(el).opacity==='1'));
              assert.ok(visible>=0,'no visible dance pose');seen.add(visible);
              await page.waitForTimeout(180);
            }
            assert.ok(seen.size>=2,'pixel poses did not change');
          }
          if(!noJS){
            await card.locator('.sofra-feature-primary').focus();
            assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('href')),'/sofra/about');
            await card.locator('.sofra-feature-secondary').focus();
            assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('href')),'/sofra');
            await card.locator('.sofra-feature-secondary').blur();
          }
          await card.screenshot({path:path.join(out,'sofra-'+suffix+'.png'),animations:'disabled'});
          assert.deepEqual(errors,[]);
          console.log('Sofra feature:',suffix,'passed');
        }finally{await context.close();}
      }
    }finally{await browser.close();}
  }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
