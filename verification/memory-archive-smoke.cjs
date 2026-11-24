// Browser checks against actual HTTP files, without deploying or exposing a port.
const { chromium, firefox, webkit }=require('playwright');
const http=require('node:http'), fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'), config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json')));
const out=process.env.MEMORY_SCREENSHOTS||path.join(require('node:os').tmpdir(),'memory-archive-results');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.mp4':'audio/mp4','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost'),redirect=config.redirects.find(r=>r.source===u.pathname);
 if(redirect){res.writeHead(307,{Location:redirect.destination,'X-Robots-Tag':'noindex, nofollow'});return res.end();}
 const raw=u.pathname==='/'?'/index.html':u.pathname;let file=path.resolve(root,'.'+raw);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 if(!path.extname(file)&&fs.existsSync(file+'.html'))file+='.html';
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 const data=fs.readFileSync(file), headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Robots-Tag':'noindex, nofollow','Accept-Ranges':'bytes'};
 const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
 if(range){const first=Number(range[1]),last=Math.min(range[2]?Number(range[2]):data.length-1,data.length-1);if(first>last){res.writeHead(416);return res.end();}res.writeHead(206,{...headers,'Content-Range':`bytes ${first}-${last}/${data.length}`,'Content-Length':last-first+1});return res.end(data.subarray(first,last+1));}
 res.writeHead(200,{...headers,'Content-Length':data.length});res.end(data);
});
const engines={chromium,firefox,webkit};
const instrument=()=>{window.__audioTest={contexts:[],sources:[]};const A=window.AudioContext||window.webkitAudioContext;if(A){class Tracked extends A{constructor(...a){super(...a);window.__audioTest.contexts.push(this);}createBufferSource(){const n=super.createBufferSource(),start=n.start.bind(n),stop=n.stop.bind(n),rec={node:n,started:false,stopped:false,offset:0};window.__audioTest.sources.push(rec);n.start=(when,off,...rest)=>{rec.started=true;rec.offset=off||0;return start(when,off||0,...rest);};n.stop=(...a)=>{rec.stopped=true;return stop(...a);};return n;}}window.AudioContext=Tracked;window.webkitAudioContext=Tracked;}};
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;fs.mkdirSync(out,{recursive:true});
try{
for(const name of (process.env.MEMORY_ENGINES||'chromium').split(',')){const browser=await engines[name].launch(name==='chromium'?{args:['--autoplay-policy=user-gesture-required','--no-sandbox'],...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})}:{});
try{for(const [label,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]){const ctx=await browser.newContext({viewport,hasTouch:label==='mobile',...(name==='firefox'?{}:{isMobile:label==='mobile'})});await ctx.addInitScript(instrument);const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/sofhia-franchesca-16');await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.fonts.check('600 24px BirthdayPixel')));assert.equal(await page.locator('h1').innerText(),'A Grade 11 Memory.');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator('.pixel-button').getAttribute('href'),'https://fejelude.xyz/');await page.waitForTimeout(700);await page.screenshot({path:path.join(out,name+'-'+label+'.png'),fullPage:true});
if((await page.locator('#play').getAttribute('aria-label')).startsWith('Play'))await page.locator('h1').click();
await page.waitForFunction(()=>document.querySelector('#play').getAttribute('aria-label').startsWith('Pause'),{},{timeout:20000});
const state=await page.evaluate(()=>({count:__audioTest.sources.filter(s=>s.started&&!s.stopped).length,decoded:__audioTest.sources.some(s=>s.node.loop&&s.node.buffer?.duration>97&&s.node.buffer?.duration<98),native:!document.querySelector('audio').paused}));
assert.ok((state.count===1&&state.decoded)||(state.count===0&&state.native),JSON.stringify(state));
await page.setViewportSize({width:viewport.width+10,height:viewport.height});const tab=await ctx.newPage();await tab.bringToFront();await page.bringToFront();await tab.close();
assert.equal(await page.evaluate(()=>__audioTest.sources.filter(s=>s.started&&!s.stopped).length),state.count);
await page.locator('#mute').click();assert.equal(await page.locator('#mute').getAttribute('aria-pressed'),'true');await page.locator('#mute').click();await page.locator('#play').click();assert.ok((await page.locator('#play').getAttribute('aria-label')).startsWith('Play'));await page.locator('h1').click();assert.ok((await page.locator('#play').getAttribute('aria-label')).startsWith('Play'));await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#play').getAttribute('aria-label').startsWith('Pause'));await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.petal').first().evaluate(e=>getComputedStyle(e).display),'none');assert.deepEqual(errors,[]);await ctx.close();console.log(name,label,'PASS',state.native?'native':'decoded');}
}finally{await browser.close();}}
for(const p of ['/sofhias-songs-67','/sofhias-songs-67.html','/compendium','/compendium.html']){const r=await fetch(base+p,{redirect:'manual'});assert.equal(r.status,307);assert.equal(r.headers.get('location'),'/sofhia-franchesca-16');}
for(const p of ['/assets/birthday/song.mp3','/assets/album/song-01.mp4','/assets/compendium/full/01.jpeg','/js/birthday-config.mjs'])assert.equal((await fetch(base+p)).status,404);
const range=await fetch(base+'/assets/memory/archive.mp4',{headers:{Range:'bytes=0-99'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,100);console.log('retired route redirects, asset denial and range requests PASS');
}finally{server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
