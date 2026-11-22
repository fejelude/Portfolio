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
          assert.deepEqual(await kitty.locator('[data-kitty-mood]').evaluateAll(els=>els.map(el=>el.dataset.kittyMood)),['robot','love','sad','angry','flowers']);
          assert.equal(await card.locator('button').count(),1);
          const goals=page.locator('#goals .goal-achieved');
          assert.deepEqual(await goals.locator('.goal-achievement').allTextContents(),['MASTERED','COMPLETE','COMPLETE']);
          assert.deepEqual(await goals.evaluateAll(els=>els.map(el=>el.dataset.goalStatus)),['mastered','complete','complete']);
          const goalLayout=await goals.evaluateAll(els=>els.map(el=>{
            const row=el.querySelector('.goal-title-row'),badge=el.querySelector('.goal-achievement');
            const r=row.getBoundingClientRect(),b=badge.getBoundingClientRect();
            return {fits:b.left>=r.left-1&&b.right<=r.right+1,border:getComputedStyle(badge).borderTopColor};
          }));
          assert.ok(goalLayout.every(r=>r.fits),JSON.stringify(goalLayout));
          assert.notEqual(goalLayout[0].border,goalLayout[1].border);
          assert.equal(goalLayout[1].border,goalLayout[2].border);
          if(reduced||noJS){
            assert.equal(await kitty.isDisabled(),true);
            assert.equal(await kitty.locator('.sf-mood-flowers').evaluate(el=>getComputedStyle(el).opacity),'1');
            assert.equal(await kitty.locator('.sf-mood-robot').evaluate(el=>getComputedStyle(el).opacity),'0');
            assert.equal(await kitty.locator('.sf-bouquet-wrap').evaluate(el=>getComputedStyle(el).opacity),'1');
          }else{
            await kitty.scrollIntoViewIfNeeded();
            await page.waitForFunction(()=>document.querySelector('#sofra-feature-mascot').classList.contains('is-running'));
            assert.equal(await kitty.isEnabled(),true);
            await kitty.click();
            assert.equal(await kitty.getAttribute('aria-pressed'),'true');
            const sequence=await kitty.evaluate(el=>{
              const scenes=[...el.querySelectorAll('[data-kitty-mood]')];
              const animations=scenes.map(s=>s.getAnimations()[0]);
              const sample=t=>{animations.forEach(a=>a.currentTime=t);return scenes.map(s=>Number(getComputedStyle(s).opacity));};
              return {slots:[1000,3000,5000,7000,9000].map(sample),cross:sample(1900),end:sample(9900),wrap:sample(11000)};
            });
            sequence.slots.forEach((s,i)=>{assert.ok(s[i]>.99&&s.filter(v=>v>.01).length===1,JSON.stringify(sequence));});
            assert.ok(sequence.cross[0]>.05&&sequence.cross[0]<.95&&sequence.cross[1]>.05&&sequence.cross[1]<.95);
            assert.ok(sequence.end[4]>.05&&sequence.end[4]<.95&&sequence.end[0]>.05&&sequence.end[0]<.95);
            assert.ok(sequence.wrap[0]>.99);
            assert.equal(await kitty.locator('.sf-mood-robot').evaluate(el=>getComputedStyle(el).animationDuration),'10s');
            assert.equal(await kitty.locator('.sf-mood-robot').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
            if(width===390||width===1440){
              for(let i=0;i<5;i++){
                await kitty.evaluate((el,slot)=>{
                  for(const animation of el.querySelector('svg').getAnimations({subtree:true}))animation.currentTime=slot*2000+(slot===4?1600:1000);
                },i);
                await card.screenshot({path:path.join(out,'sofra-'+suffix+'-mood-'+i+'.png')});
              }
            }
            await kitty.focus();await page.keyboard.press('Space');
            assert.equal(await kitty.getAttribute('aria-pressed'),'false');
            assert.equal(await kitty.locator('.sf-mood-robot').evaluate(el=>getComputedStyle(el).animationPlayState),'running');
          }
          if(!noJS){
            await card.locator('.sofra-feature-primary').focus();
            assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('href')),'/sofra/about');
            await card.locator('.sofra-feature-secondary').focus();
            assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('href')),'/sofra');
            await card.locator('.sofra-feature-secondary').blur();
          }
          await card.screenshot({path:path.join(out,'sofra-'+suffix+'.png'),animations:'disabled'});
          if(width===390||width===1440)await page.locator('#goals .goals-wrapper').screenshot({path:path.join(out,'goals-'+suffix+'.png'),animations:'disabled'});
          assert.deepEqual(errors,[]);
          console.log('Sofra feature:',suffix,'passed');
        }finally{await context.close();}
      }
    }finally{await browser.close();}
  }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
