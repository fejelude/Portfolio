// npm install --no-save --package-lock=false playwright@1.56.1
// npx playwright install --with-deps chromium firefox webkit
// BIRTHDAY_ENGINES=chromium is useful in restricted local containers.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const pw=require('playwright');
const {startServer}=require('./birthday-server.cjs');
const out=path.join(__dirname,'birthday-results');
// Keep native browser layout/interaction scheduling; advance only the story's
// performance clock for bounded interruption tests. Native media is tested below.
const controlledTime=()=>{
 window.__birthdayNow=performance.now();const nativeRAF=window.requestAnimationFrame.bind(window);
 Object.defineProperty(performance,'now',{configurable:true,value:()=>window.__birthdayNow});
 window.requestAnimationFrame=callback=>nativeRAF(()=>callback(window.__birthdayNow));
};
const fakeAudio=()=>{
 const state={time:0,paused:true,ended:false,ready:4,error:null,denied:false};window.__birthdayMedia=state;
 for(const [property,key] of Object.entries({currentTime:'time',paused:'paused',ended:'ended',readyState:'ready',error:'error'}))Object.defineProperty(HTMLMediaElement.prototype,property,{configurable:true,get(){return state[key]},set(value){state[key]=value}});
 HTMLMediaElement.prototype.play=function(){if(state.denied)return Promise.reject(new DOMException('denied','NotAllowedError'));state.paused=false;state.ended=false;return Promise.resolve().then(()=>this.dispatchEvent(new Event('playing')));};
 HTMLMediaElement.prototype.pause=function(){if(!state.paused){state.paused=true;this.dispatchEvent(new Event('pause'));}};
};
async function tick(page,ms=35){
 await page.evaluate(ms=>window.__birthdayNow+=ms,ms);
 // Observe completed frames, rather than guessing how quickly each engine renders.
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function position(page,t){await page.evaluate(t=>window.__birthdayMedia.time=t,t);await tick(page);}
async function revealed(page){return page.$eval('#celebration',e=>!e.hidden);}
async function layout(page){
 const data=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,scene:document.getElementById('scene').getBoundingClientRect().height,controls:[...document.querySelectorAll('button,a#album-entry,a#album-return')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>{const r=e.getBoundingClientRect();return {id:e.id,x:r.x,y:r.y,right:r.right,bottom:r.bottom}}),w:innerWidth,h:innerHeight}));
 assert.equal(data.overflow,false);assert.ok(data.scene>0);
 for(const button of data.controls){assert.ok(button.x>=0&&button.right<=data.w+1,button.id+' horizontal bounds');assert.ok(button.y>=0&&button.bottom<=data.h+1,button.id+' vertical bounds');}
}
async function simulated(browser,name,url){
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},deviceScaleFactor:mobile?3:1,hasTouch:mobile});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(controlledTime);await page.addInitScript(fakeAudio);
  await page.goto(url+'/sofhia-franchesca-16');await tick(page,100);await page.waitForFunction(()=>!document.getElementById('start').disabled);
  assert.equal(await page.evaluate(()=>performance.now()===window.__birthdayNow),true,name+' controlled performance clock');
  assert.equal(await page.locator('button:visible').count(),1);assert.equal(await revealed(page),false);await layout(page);
  assert.equal(await page.locator('#album-entry').isVisible(),true);assert.equal(await page.locator('#album-entry').getAttribute('href'),'/sofhias-songs-67');
  await page.waitForTimeout(700);assert.ok(await page.$eval('#album-entry',e=>Number(getComputedStyle(e).opacity))>.95);
  await page.screenshot({path:path.join(out,`${name}-${mobile?'mobile':'desktop'}-welcome.png`)});
  await page.click('#start');await tick(page,600);
  for(const t of [4,12,22,31,38,44,50,55,58,59.4]){await position(page,t);assert.equal(await revealed(page),false);assert.equal(await page.locator('#album-return').isVisible(),false);}
  await page.screenshot({path:path.join(out,`${name}-${mobile?'mobile':'desktop'}-build.png`)});
  await page.evaluate(()=>{const a=document.getElementById('birthday-audio');window.__birthdayMedia.paused=true;window.__birthdayMedia.ended=true;a.dispatchEvent(new Event('ended'));});
  await tick(page,550);assert.equal(await revealed(page),false);await tick(page,100);assert.equal(await revealed(page),true);
  await tick(page,1700);assert.equal(await page.locator('#replay').isVisible(),true);await layout(page);
  assert.equal(await page.locator('#album-return').isVisible(),true);assert.equal(await page.locator('#album-return').getAttribute('href'),'/sofhias-songs-67');
  assert.equal(await page.locator('#album-entry').isVisible(),false);
  await page.screenshot({path:path.join(out,`${name}-${mobile?'mobile':'desktop'}-final.png`)});
  for(let run=0;run<3;run++){
   await page.click('#replay');await tick(page,100);assert.equal(await revealed(page),false);assert.equal(await page.locator('#replay').isVisible(),false);assert.equal(await page.locator('#album-return').isVisible(),false);
   assert.equal(await page.locator('#album-entry').isVisible(),false);
   await position(page,15);await page.click('#pause');await tick(page,5000);assert.equal(await page.$eval('#progress',e=>e.getAttribute('aria-valuenow')),'15');
   await page.click('#continue');await tick(page,100);await position(page,20);
   await page.evaluate(()=>document.getElementById('birthday-audio').dispatchEvent(new Event('waiting')));await position(page,30);assert.equal(await page.$eval('#progress',e=>e.getAttribute('aria-valuenow')),'20');
   await page.evaluate(()=>document.getElementById('birthday-audio').dispatchEvent(new Event('playing')));await tick(page);assert.equal(await page.$eval('#progress',e=>e.getAttribute('aria-valuenow')),'30');
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
   await tick(page,9000);assert.equal(await page.$eval('#progress',e=>e.getAttribute('aria-valuenow')),'30');
   await page.evaluate(()=>{window.__birthdayMedia.denied=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
   await tick(page,100);assert.equal(await page.locator('#continue-panel').isVisible(),true);
   await page.evaluate(()=>window.__birthdayMedia.denied=false);await page.click('#continue');await tick(page,100);await position(page,59.999);assert.equal(await revealed(page),false);
   await position(page,60);assert.equal(await revealed(page),true);await tick(page,1700);
  }
  if(mobile){await page.setViewportSize({width:844,height:390});await tick(page,100);await layout(page);await page.screenshot({path:path.join(out,`${name}-landscape.png`)});}
  assert.deepEqual(errors,[]);await context.close();
 }
 // Genuine play rejection: no media clock, full silent progression, no jump on pause.
 const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:320,height:568}});const page=await context.newPage();await page.addInitScript(controlledTime);await page.addInitScript(()=>{HTMLMediaElement.prototype.play=()=>Promise.reject(new DOMException('blocked','NotAllowedError'));});
 await page.goto(url+'/sofhia-franchesca-16');await tick(page,3100);await page.click('#start');await tick(page,100);
 await tick(page,29000);assert.equal(await revealed(page),false);await page.click('#pause');await tick(page,9000);const before=await page.$eval('#progress',e=>e.getAttribute('aria-valuenow'));assert.equal(before,'29');
 await page.click('#continue');await tick(page,30000);assert.equal(await revealed(page),false);await tick(page,1150);assert.equal(await revealed(page),true);await tick(page,2000);await layout(page);
 await page.screenshot({path:path.join(out,`${name}-reduced-motion.png`)});await context.close();
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const staticPage=await nojs.newPage();await staticPage.goto(url+'/sofhia-franchesca-16');assert.equal(await staticPage.locator('#static-fallback').isVisible(),true);assert.equal(await staticPage.locator('button:visible').count(),0);await staticPage.screenshot({path:path.join(out,`${name}-nojs.png`)});await nojs.close();
 const optional=await browser.newContext({viewport:{width:390,height:844}});const optionalPage=await optional.newPage();await optionalPage.addInitScript(()=>HTMLCanvasElement.prototype.getContext=()=>null);await optionalPage.goto(url+'/sofhia-franchesca-16');assert.equal(await optionalPage.locator('#static-fallback').isVisible(),true);assert.equal(await optionalPage.locator('button:visible').count(),0);await optional.close();
 const missing=await browser.newContext({viewport:{width:390,height:844}});const missingPage=await missing.newPage();await missingPage.addInitScript(controlledTime);await missingPage.route('**/assets/birthday/song.mp3',route=>route.fulfill({status:404,body:''}));await missingPage.goto(url+'/sofhia-franchesca-16');await tick(missingPage,3100);await missingPage.click('#start');await tick(missingPage,100);await tick(missingPage,59000);assert.equal(await revealed(missingPage),false);await tick(missingPage,1100);assert.equal(await revealed(missingPage),true);await missing.close();
 console.log(name+': simulated chapter boundaries, coda, buffering, background/blocked resume, three replays, reduced motion, responsive layouts, no-JS passed');
}

async function welcomeEntry(browser,name,url){
 for(const viewport of [{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
  const context=await browser.newContext({viewport,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // The album remains reachable even while the birthday audio is still loading.
  await page.route('**/assets/birthday/song.mp3',route=>route.abort());
  await page.goto(url+'/sofhia-franchesca-16');await page.waitForTimeout(700);await layout(page);
  assert.equal(await page.locator('#album-entry').isVisible(),true);assert.equal(await page.locator('#celebration').isVisible(),false);
  const fit=await page.$eval('#welcome',e=>({height:e.clientHeight,content:e.scrollHeight}));assert.ok(fit.content<=fit.height+1,JSON.stringify({viewport,fit}));
  await page.screenshot({path:path.join(out,`${name}-welcome-${viewport.width}x${viewport.height}.png`)});
  await page.click('#album-entry');await page.waitForURL('**/sofhias-songs-67');assert.equal(await page.locator('#cover-screen').isVisible(),true);assert.equal(await page.$eval('#song-audio',a=>a.paused),true);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log(name+': welcome album entry, unloaded birthday audio, narrow/landscape bounds and navigation passed');
}

async function nativeMinute(browser,url){
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'/sofhia-franchesca-16');await page.waitForFunction(()=>!document.getElementById('start').disabled);
 await page.evaluate(()=>{
  const media=document.getElementById('birthday-audio');window.__nativeAudit={events:[],reveal:null};
  for(const event of ['playing','waiting','pause','ended','error'])media.addEventListener(event,()=>window.__nativeAudit.events.push({event,time:media.currentTime,now:performance.now()}));
  const target=document.getElementById('celebration');new MutationObserver(()=>{if(!target.hidden&&!window.__nativeAudit.reveal)window.__nativeAudit.reveal={now:performance.now(),media:media.currentTime};}).observe(target,{attributes:true,attributeFilter:['hidden']});
 });
 await page.click('#start');await page.waitForFunction(()=>document.getElementById('birthday-audio').currentTime>.2,{},{timeout:8000});
 const decodedDuration=await page.$eval('#birthday-audio',a=>a.duration);assert.ok(decodedDuration>59&&decodedDuration<60);
 await page.waitForFunction(()=>document.getElementById('birthday-audio').currentTime>5);
 await page.click('#pause');const paused=await page.$eval('#birthday-audio',a=>a.currentTime);await page.waitForTimeout(500);assert.equal(await page.$eval('#birthday-audio',a=>a.currentTime),paused);await page.click('#continue');
 for(const target of [10,32,47,57,59]){await page.waitForFunction(t=>document.getElementById('birthday-audio').currentTime>=t,target,{timeout:30000});assert.equal(await revealed(page),false);await page.screenshot({path:path.join(out,`native-${target}s.png`)});console.log(`native media clock reached ${target}s; birthday message still hidden`);}
 await page.waitForFunction(()=>!document.getElementById('celebration').hidden,{},{timeout:5000});await page.waitForTimeout(2800);await layout(page);
 assert.equal(await page.locator('#album-entry').isVisible(),false);
 assert.equal(await page.locator('#album-return').isVisible(),true);
 await page.screenshot({path:path.join(out,'native-final-mobile.png')});
 const audit=await page.evaluate(()=>window.__nativeAudit),end=audit.events.find(e=>e.event==='ended');assert.ok(end);assert.equal(audit.events.some(e=>e.event==='error'),false);
 const revealStoryTime=end.time+(audit.reveal.now-end.now)/1000;assert.ok(revealStoryTime>=59.98&&revealStoryTime<60.12,`revealed at ${revealStoryTime}`);
 await page.click('#album-return');await page.waitForURL('**/sofhias-songs-67');assert.equal(await page.locator('#cover-screen').isVisible(),true);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({decodedDuration,revealStoryTime,nativePauseHeld:true,audit}));await context.close();
}

(async()=>{
 await fs.mkdir(out,{recursive:true});const {server,url}=await startServer();
 try{
  for(const name of (process.env.BIRTHDAY_ENGINES||'chromium,firefox,webkit').split(',')){
   const browser=await pw[name].launch({headless:true});try{console.log(name+' '+browser.version());await welcomeEntry(browser,name,url);await simulated(browser,name,url);if(name==='chromium'&&process.env.BIRTHDAY_SKIP_NATIVE!=='1')await nativeMinute(browser,url);}finally{await browser.close();}
  }
  const audio=await fetch(url+'/assets/birthday/song.mp3',{headers:{Range:'bytes=0-255'}});assert.equal(audio.status,206);assert.equal(audio.headers.get('content-type'),'audio/mpeg');assert.match(audio.headers.get('content-range'),/^bytes 0-255\//);
  for(const route of ['/','/Gallery','/sofra/about','/sofra'])assert.equal((await fetch(url+route)).status,200);
  assert.equal((await fetch(url+'/arcade',{redirect:'manual'})).headers.get('location'),'/#surprise');console.log('Local HTTP range, MIME, clean route, and existing static-route checks passed');
 }finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
