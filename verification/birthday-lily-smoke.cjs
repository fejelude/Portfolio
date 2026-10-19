const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const pw=require('playwright');
const {startServer}=require('./birthday-server.cjs');
const out=path.join(__dirname,'birthday-results');
async function shot(page,name,stage){
 const b=await page.locator('#lily-cake').boundingBox();
 await page.screenshot({path:path.join(out,`${name}-lily-${stage}.png`),clip:{x:Math.max(0,b.x+b.width/2-85),y:Math.max(0,b.y+b.height/2-80),width:170,height:160}});
}
async function layoutUnchanged(page){
 const result=await page.evaluate(()=>{
  const ids=['greeting','start','album-entry','signature'];
  const rects=()=>ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [r.x,r.y,r.width,r.height];});
  const after=rects(),button=document.getElementById('lily-cake'),old=document.createElement('span');old.className='birthday__welcome-flower';old.textContent='✿';
  button.replaceWith(old);const before=rects();old.replaceWith(button);
  return {before,after,overflow:document.documentElement.scrollWidth>innerWidth};
 });
 assert.equal(result.overflow,false);
 result.before.forEach((rect,i)=>rect.forEach((n,j)=>assert.ok(Math.abs(n-result.after[i][j])<.6,`existing element ${i} moved`)));
}
async function welcome(browser,name,url,mobile){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'/sofhia-franchesca-16');
 await page.waitForFunction(()=>document.getElementById('lily-cake').dataset.phase==='bud');
 const key=`${name}-${mobile?'mobile':'desktop'}`;
 await layoutUnchanged(page);await shot(page,key,'bud');
 await page.waitForFunction(()=>document.getElementById('lily-cake').dataset.phase==='bloom');
 const bloom=await page.locator('[data-lily-petal]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')));
 assert.equal(bloom.length,6);await shot(page,key,'bloom');
 await page.waitForFunction(()=>document.getElementById('lily-cake').dataset.phase==='transform');await page.waitForTimeout(450);await shot(page,key,'transform');
 await page.waitForFunction(()=>document.getElementById('lily-cake').dataset.phase==='candle');await shot(page,key,'candle');
 await page.waitForFunction(()=>document.querySelector('.birthday-lily-confetti').children.length>0);
 await page.waitForFunction(()=>document.getElementById('lily-cake').dataset.ready==='true',null,{timeout:20000});
 assert.equal(await page.locator('#lily-cake').isEnabled(),true);
 assert.notDeepEqual(await page.locator('[data-lily-petal]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d'))),bloom);
 await layoutUnchanged(page);await shot(page,key,'cake');
 await page.screenshot({path:path.join(out,`${key}-lily-welcome.png`)});
 // Mouse/touch and native keyboard activation produce small, bounded bursts.
 if(mobile)await page.tap('#lily-cake');else{await page.locator('#lily-cake').focus();await page.keyboard.press('Enter');}
 assert.equal(await page.locator('#lily-cake').getAttribute('data-phase'),'cake');
 assert.equal(await page.locator('#lily-cake').evaluate(e=>e.classList.contains('is-celebrating')),true);
 for(let i=0;i<10;i++)await page.locator('#lily-cake').dispatchEvent('click');
 assert.ok(await page.locator('.birthday-lily-confetti').evaluate(e=>e.children.length)<=56);
 await page.waitForFunction(()=>!document.getElementById('start').disabled);await page.click('#start');
 await page.waitForFunction(()=>document.querySelector('.birthday-lily-confetti').children.length===0);
 assert.equal(await page.locator('#welcome').evaluate(e=>e.classList.contains('is-leaving')),true);
 assert.deepEqual(errors,[]);await context.close();
 console.log(key+': native morph phases, no layout shift, cake interaction, bounded particles and START cleanup passed');
}
async function fallback(browser,name,url){
 const context=await browser.newContext({viewport:{width:320,height:568},reducedMotion:'reduce'}),page=await context.newPage();
 await page.goto(url+'/sofhia-franchesca-16');await page.waitForFunction(()=>document.getElementById('lily-cake').dataset.ready==='true');
 assert.equal(await page.locator('#lily-cake').getAttribute('data-phase'),'cake');
 assert.equal(await page.locator('[data-lily-art]').evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.equal(await page.locator('.birthday-lily-confetti').evaluate(e=>e.children.length),0);
 await page.click('#lily-cake');assert.equal(await page.locator('.birthday-lily-confetti').evaluate(e=>e.children.length),0);
 await layoutUnchanged(page);await page.screenshot({path:path.join(out,`${name}-lily-reduced-motion.png`)});await context.close();
 const staticContext=await browser.newContext(),staticPage=await staticContext.newPage();
 await staticPage.route('**/js/birthday-lily.mjs',r=>r.abort());await staticPage.goto(url+'/sofhia-franchesca-16');
 assert.equal(await staticPage.locator('[data-lily-petal]').count(),6);
 assert.equal(await staticPage.locator('[data-lily-cake-details]').getAttribute('opacity'),'0');
 await staticContext.close();console.log(name+': reduced-motion cake, small screen bounds and module-failure static lily passed');
}
(async()=>{await fs.mkdir(out,{recursive:true});const {server,url}=await startServer();try{
 for(const name of (process.env.BIRTHDAY_ENGINES||'chromium,firefox,webkit').split(',')){
  const browser=await pw[name].launch({headless:true});try{await welcome(browser,name,url,false);await welcome(browser,name,url,true);await fallback(browser,name,url);}finally{await browser.close();}
 }
}finally{server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
