/* Synthetic admin preview only: no real credentials or production visitor records. */
const {chromium,firefox,webkit}=require('playwright');
const {createServer}=require('node:http');
const {readFileSync}=require('node:fs');
const {mkdir}=require('node:fs/promises');
const assert=require('node:assert/strict');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'admin-results');
const moduleMock={exports:{}};
vm.runInNewContext(readFileSync(path.join(root,'api/admin-page.js'),'utf8'),{module:moduleMock,URL,require:()=>({getHeader:()=> 'localhost',isAuthorized:r=>r.authorized,isConfigured:()=>true})});
const render=moduleMock.exports;
const now='2026-11-22T12:00:00Z';
const fixture={ok:true,summary:{visitors:17,visits:19,pages:2,securityEvents:2},storage:{persistent:true},visitors:Array.from({length:17},(_,i)=>({device:i%2?'Desktop':'Mobile',os:i%2?'Windows':'iOS',browser:i%2?'Chrome':'Safari',ip:'192.0.2.x',firstSeen:now,lastSeen:now,lastPage:i?'/' :'/Gallery.html',visits:i?1:3,pages:i?[{path:'/',count:1,lastSeen:now}]:[{path:'/',count:2,lastSeen:now},{path:'/Gallery.html',count:1,lastSeen:now}]}))};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/login'||url.pathname==='/dashboard'){
  const response={setHeader:(k,v)=>res.setHeader(k,v),status(n){res.statusCode=n;return this;},send(html){res.end(html);return this;}};
  return render({url:req.url,authorized:url.pathname==='/dashboard'},response);
 }
 if(url.pathname==='/api/activity'){res.setHeader('content-type','application/json');return res.end(JSON.stringify(fixture));}
 if(url.pathname==='/api/admin-auth'&&req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;assert.equal(new URLSearchParams(body).get('password'),'12345678');res.writeHead(303,{location:'/dashboard?unlocked=1'});return res.end();}
 if(!['/css/admin.css','/js/admin-pad.js','/js/admin-dashboard.js'].includes(url.pathname)){res.statusCode=404;return res.end();}
 res.setHeader('content-type',url.pathname.endsWith('.css')?'text/css':'text/javascript');res.end(readFileSync(path.join(root,url.pathname.slice(1))));
});
(async()=>{
 await mkdir(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 for(const [name,type] of Object.entries({chromium,firefox,webkit})){
  const browser=await type.launch({headless:true});
  try{
   for(const [width,height,mode] of [[320,680,'normal'],[390,844,'normal'],[768,1024,'normal'],[1440,900,'normal'],[390,844,'reduced'],[390,844,'no-js']]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:width<760,reducedMotion:mode==='reduced'?'reduce':'no-preference',javaScriptEnabled:mode!=='no-js'});
    try{
     const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
     await page.goto(url+'/login?error=1');const bot=page.locator('[data-droid-state]');assert.equal(await bot.getAttribute('data-droid-state'),'denied');
     const fits=()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
     assert.equal(await fits(),true);assert.equal(await page.locator('html').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(12, 10, 18)');
     await page.screenshot({path:path.join(out,name+'-'+width+'-'+mode+'-login.png'),fullPage:true,animations:'disabled'});
     if(mode==='no-js'){
      assert.equal(await page.locator('#admin-password').isVisible(),true);assert.equal(await page.locator('.admin-keypad').isVisible(),false);await page.locator('#admin-password').fill('12345678');
     }else{
      assert.equal(await page.locator('.admin-keypad').isVisible(),true);assert.equal(await page.locator('[data-pad-submit]').isDisabled(),true);
      assert.ok(await page.locator('.pad-key').evaluateAll(keys=>keys.every(k=>k.getBoundingClientRect().height>=44)));
      await page.locator('[data-pad-key="1"]').click();assert.equal(await bot.getAttribute('data-droid-state'),'typing');await page.locator('[data-pad-action="clear"]').click();
      await page.keyboard.type('1234567');await page.locator('[data-pad-key="8"]').click();assert.equal(await bot.getAttribute('data-droid-state'),'ready');assert.equal(await page.locator('.code-slot.is-filled').count(),8);assert.equal(await page.locator('[data-pad-submit]').isEnabled(),true);
      if(mode==='reduced')assert.equal(await bot.locator('.droid-body').evaluate(el=>getComputedStyle(el).animationName),'none');
     }
     await Promise.all([page.waitForURL('**/dashboard?unlocked=1'),page.locator('[data-pad-submit]').click()]);
     assert.equal(await page.locator('[data-droid-state]').getAttribute('data-droid-state'),'granted');assert.equal(await fits(),true);
     if(mode!=='no-js'){
      await page.waitForFunction(()=>document.querySelector('#stat-sessions').textContent==='17');
      assert.equal(await page.locator('.visitor-entry').count(),15);
      await page.locator('.visitor-entry summary').first().click();assert.equal(await page.locator('.visitor-entry[open] li').count(),2);
      assert.match(await page.locator('.visitor-entry').first().textContent(),/192\.0\.2\.x/);assert.equal(await fits(),true);
      await page.locator('#next-page').click();assert.equal(await page.locator('.visitor-entry').count(),2);
      await page.locator('#filter-device').selectOption('Desktop');assert.equal(await page.locator('.visitor-entry').count(),8);
      await page.locator('#log-search').fill('nothing-match');assert.equal(await page.locator('.visitor-entry').count(),0);
      await page.locator('#log-search').fill('');await page.locator('#filter-device').selectOption('');await page.locator('#refresh-logs').click();await page.waitForFunction(()=>document.querySelectorAll('.visitor-entry').length===15);
     }
     await page.screenshot({path:path.join(out,name+'-'+width+'-'+mode+'-dashboard.png'),fullPage:true,animations:'disabled'});
     assert.deepEqual(errors,[]);console.log(name,width,mode,'passed');
    }finally{await context.close();}
   }
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
