const {chromium,firefox,webkit}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'interactive-worlds-results');
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.svg':'image/svg+xml'};
const ids=['room','universe','lab','os','tokyo','particles'];
const server=createServer(async(req,res)=>{
 try{
  const name=new URL(req.url,'http://localhost').pathname;
  const target=name==='/'?'/index.html':path.extname(name)?name:name+'.html';
  const file=path.resolve(root,'.'+target);if(!file.startsWith(root+path.sep))throw Error('path');
  const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 }catch{if(!res.headersSent)res.writeHead(404);res.end()}
});
(async()=>{
 await mkdir(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 for(const [engine,type] of Object.entries({chromium,firefox,webkit})){
  const browser=await type.launch(engine==='chromium'?{headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{});
  try{
   for(const size of [{width:390,height:844},{width:1440,height:900}]){
    const context=await browser.newContext({viewport:size,hasTouch:size.width<500,acceptDownloads:true});const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const checkWidth=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const click=async(name)=>page.getByRole('button',{name,exact:true}).click();
    const select=async(name,value)=>page.getByLabel(name,{exact:true}).selectOption(value);
    try{
     await page.goto(base+'/interactives');assert.equal(await page.locator('[data-iw-card]').count(),6);assert.equal(await page.locator('#iw-count').textContent(),'0 / 6');await checkWidth();
     const dragon=page.locator('[data-iw-dragon]');await dragon.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-iw-dragon]').hasAttribute('data-visible'));
     assert.equal(await dragon.locator('.iw-dragon-flight').evaluate(el=>getComputedStyle(el).animationName),'iw-dragon-glide');
     assert.ok(await dragon.evaluate(el=>{const a=el.getBoundingClientRect(),b=document.querySelector('.iw-intro-copy').getBoundingClientRect();return a.width>0&&(a.left>=b.right-1||a.top>=b.bottom-1)}));
     await click('Pause motion');assert.equal(await dragon.locator('.iw-dragon-flight').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');await click('Resume motion');
     await page.locator('[data-iw-card="room"]').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-iw-card="room"]').hasAttribute('data-visible'));
     assert.equal(await page.locator('[data-iw-card="room"] .ix-rain').evaluate(el=>getComputedStyle(el).animationName),'iw-rain');
     await click('Pause motion');assert.equal(await page.locator('[data-iw-card="room"] .ix-rain').evaluate(el=>getComputedStyle(el).animationName),'none');await click('Resume motion');
     await page.screenshot({path:path.join(out,engine+'-'+size.width+'-hub.png'),fullPage:true});
     for(const id of ids){
      await page.locator('[data-iw-card="'+id+'"]').click();await page.waitForURL(base+'/interactives/'+id);
      await page.locator('#iw-stage '+(id==='os'?'.iw-os':'canvas')).waitFor();await checkWidth();
      await click('Pause');assert.equal(await page.locator('#iw-pause').getAttribute('aria-pressed'),'true');
      if(id==='room'){for(const name of ['Look outside','Use computer','Toggle lamp','Pet cat','Inspect model car'])await click(name)}
      if(id==='universe'){await click('Discover this view');await select('Celestial view','1');await select('Celestial view','2');await select('Quality','Low');assert.equal(await page.locator('#iw-stage canvas').evaluate(el=>el.width),480)}
      if(id==='lab'){await click('Inspect invention');await select('Invention','1');await select('Invention','2');await click('Wireframe');await select('Highlight part','Chassis')}
      if(id==='os'){
       await select('Open app','terminal');await page.getByLabel('Terminal command').fill('cat secret.txt');await click('Run');assert.match(await page.locator('[data-app="terminal"] pre').textContent(),/Secret found/);await click('Close Terminal');
       await select('Open app','calculator');await page.getByLabel('Calculator expression').fill('(12+8)*3');await click('Calculate');assert.equal(await page.locator('[data-app="calculator"] [role="status"]').textContent(),'60');await click('Close Calculator');
       await select('Open app','files');await click('▤ readme.txt');assert.match(await page.locator('[data-app="files"] pre').textContent(),/Welcome/);await click('Close Files');
       await select('Open app','paint');assert.equal(await page.locator('[data-app="paint"] canvas').count(),1);await click('Close Paint');
       await select('Open app','settings');await click('Mint');assert.equal(await page.locator('.iw-os').getAttribute('data-wallpaper'),'mint');
      }
      if(id==='tokyo'){await click('Discover this district');await select('Neighborhood','1');await select('Neighborhood','2');await select('Time','1');await select('Neon theme','2')}
      if(id==='particles'){await click('Discover this force');await select('Force','Repulsion');await select('Force','Vortex');await click('Burst');assert.ok(await page.locator('#iw-stage canvas').evaluate(el=>el.toDataURL('image/png').startsWith('data:image/png')))}
      assert.match(await page.locator('#iw-discovery').textContent(),/badge collected/);
      assert.equal(await page.locator('#iw-world-badge').getAttribute('data-earned'),'');
      await click('Play');await page.locator('#iw-stage').scrollIntoViewIfNeeded();await page.waitForTimeout(150);
      await page.locator('#iw-console').screenshot({path:path.join(out,engine+'-'+size.width+'-'+id+'.png')});
      if(id==='room'){await click('Fullscreen');await page.waitForFunction(()=>document.querySelector('#iw-full').getAttribute('aria-pressed')==='true');await click('Exit fullscreen');await page.waitForFunction(()=>document.querySelector('#iw-full').getAttribute('aria-pressed')==='false');await click('Reset world');await page.locator('#iw-stage canvas').waitFor();assert.match(await page.locator('#iw-discovery').textContent(),/^0 \//)}
      await page.locator('header a.iw-back').click();await page.waitForURL(base+'/interactives');await page.waitForFunction(n=>document.querySelector('#iw-count').textContent===n+' / 6',ids.indexOf(id)+1);
     }
     assert.equal(await page.locator('body').getAttribute('data-complete'),'');assert.match(await page.locator('#iw-reward').textContent(),/Secret unlocked/);
     assert.deepEqual(errors,[]);
    }finally{await context.close()}
   }
   const reduced=await browser.newContext({viewport:{width:320,height:568},reducedMotion:'reduce'});
   try{const p=await reduced.newPage();await p.goto(base+'/interactives');assert.equal(await p.locator('#iw-motion').isDisabled(),true);assert.equal(await p.locator('.iw-dragon-flight').evaluate(el=>getComputedStyle(el).animationName),'none');assert.equal(await p.locator('[data-iw-card="room"] .ix-rain').evaluate(el=>getComputedStyle(el).animationName),'none');await p.goto(base+'/interactives/room');await p.locator('#iw-stage canvas').waitFor();assert.equal(await p.locator('#iw-pause').getAttribute('aria-pressed'),'true');await p.getByRole('button',{name:'Pet cat',exact:true}).click();assert.match(await p.locator('#iw-discovery').textContent(),/^1 \//)}finally{await reduced.close()}
   const fallback=await browser.newContext({viewport:{width:390,height:844}});
   try{const p=await fallback.newPage();await p.addInitScript(()=>{const actual=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /^webgl/.test(type)?null:actual.call(this,type,...args)}});await p.goto(base+'/interactives/universe');await p.locator('#iw-stage canvas').waitFor();await p.getByRole('button',{name:'Discover this view',exact:true}).click();assert.match(await p.locator('#iw-discovery').textContent(),/^1 \//);assert.ok(await p.locator('#iw-stage canvas').evaluate(el=>!!el.getContext('2d')))}finally{await fallback.close()}
   const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:568}});
   try{const p=await nojs.newPage();await p.goto(base+'/interactives');assert.equal(await p.locator('[data-iw-card]').count(),6);await p.locator('[data-iw-card="room"]').click();assert.equal(await p.locator('noscript').isVisible(),true)}finally{await nojs.close()}
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
