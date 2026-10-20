// Run with the same Playwright setup as verification/birthday-smoke.cjs.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const pw = require('playwright');
const { startServer } = require('./birthday-server.cjs');
const out = path.join(__dirname, 'album-results');
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));

function observeNativeMixer() {
  const Native = window.AudioContext || window.webkitAudioContext;
  if (!Native) return;
  window.__albumAudit = { gains: [], loops: [], analysers: [], events: [] };
  addEventListener('DOMContentLoaded',()=>{
    const audio=document.getElementById('song-audio');
    if(!audio)return;
    for(const type of ['play','playing','pause','ended','seeking','seeked','waiting','error'])audio.addEventListener(type,()=>{
      window.__albumAudit.events.push({type,time:audio.currentTime,paused:audio.paused,ready:audio.readyState,title:document.getElementById('player-title').textContent});
      if(window.__albumAudit.events.length>40)window.__albumAudit.events.shift();
    });
  },{once:true});
  class ObservedContext extends Native {
    createGain() { const gain = super.createGain(); window.__albumAudit.gains.push(gain); return gain; }
    createBufferSource() { const source = super.createBufferSource(); window.__albumAudit.loops.push(source); return source; }
    createAnalyser() { const analyser = super.createAnalyser(); window.__albumAudit.analysers.push(analyser); return analyser; }
  }
  window.AudioContext = ObservedContext;
}
async function assertLayout(page) {
  const data = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    controls: [...document.querySelectorAll('button,input,a')].filter(e => e.getBoundingClientRect().width > 0)
      .map(e => ({ id: e.id || e.className, x: e.getBoundingClientRect().x, right: e.getBoundingClientRect().right })),
    width: innerWidth,
  }));
  assert.equal(data.overflow,false,'horizontal scroll');
  for (const e of data.controls) assert.ok(e.x >= -1 && e.right <= data.width + 1,`${e.id} horizontal bounds`);
}
async function playing(page) {
  try {
    await page.waitForFunction(() => document.body.classList.contains('is-playing') || !document.getElementById('tap-continue').hidden, {}, {timeout:15000});
    // Exercise the real recovery UI if native audio policy requires a new tap.
    if (await page.locator('#tap-continue').isVisible()) await page.click('#tap-continue');
    await page.waitForFunction(() => document.body.classList.contains('is-playing'), {}, {timeout:15000});
  } catch (error) {
    console.log('Native playback failure', await page.evaluate(() => {
      const a = document.getElementById('song-audio');
      return {title:document.getElementById('player-title').textContent,status:document.getElementById('status-copy').textContent,
        tap:!document.getElementById('tap-continue').hidden,paused:a.paused,time:a.currentTime,ready:a.readyState,src:a.currentSrc,
        error:a.error?.code,contexts:window.__albumAudit.gains.map(g=>g.context.state),events:window.__albumAudit.events};
    }));
    await page.screenshot({path:path.join(out,'native-playback-failure.png'),fullPage:true}); throw error;
  }
}
async function nativeControls(browser,name,url,mobile) {
  const device = mobile && name === 'webkit' ? pw.devices['iPhone 13'] : mobile && name === 'chromium' ? pw.devices['Pixel 5'] :
    { viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, hasTouch: mobile };
  const context = await browser.newContext(device);
  const page = await context.newPage(); const activate = selector => mobile ? page.tap(selector) : page.click(selector); const errors = []; page.on('pageerror',e => errors.push(e.message));
  await page.addInitScript(observeNativeMixer); await page.goto(url+'/sofhias-songs-67');
  await page.waitForFunction(() => !document.getElementById('open-album').disabled);
  assert.equal(await page.locator('#album-inside').isVisible(),false);
  assert.equal(await page.locator('#opening-heading').textContent(),'HAPPY 16TH, SOFIII ♡');
  assert.equal(await page.locator('#cover-subtitle').textContent(),'made you something hehe');
  assert.equal(await page.locator('#cover-hint').textContent(),'go onnn, open it HAHAHA ♡');
  assert.equal(await page.locator('#album-signature').textContent(),'- fejee ♡');
  assert.equal(await page.$eval('#song-audio',a => a.paused),true); await assertLayout(page);
  await page.waitForFunction(() => { const image=document.getElementById('album-cover'); return image.complete && image.naturalWidth>0; });
  assert.ok(await page.$eval('#album-cover',e=>e.currentSrc.endsWith('/sofhia-birthday-disc.jpg')));
  const rotation=await page.$eval('#album-cover',e=>getComputedStyle(e).transform);
  await page.waitForTimeout(150);
  assert.notEqual(await page.$eval('#album-cover',e=>getComputedStyle(e).transform),rotation,'the welcome CD spins before opening');
  await page.screenshot({ path: path.join(out,`${name}-${mobile?'mobile':'desktop'}-cover.png`), fullPage: true });
  await activate('#open-album'); await page.locator('#album-inside').waitFor({state:'visible'});
  const { ALBUM } = await import('../js/album-config.mjs');
  assert.equal(await page.$eval('#player-cover',e=>new URL(e.src).pathname),ALBUM.idleCover);
  assert.equal(await page.$eval('#player-record',e=>e.classList.contains('is-waiting')),true);
  assert.equal(await page.locator('#player-state').textContent(),ALBUM.playerInvitation);
  assert.equal(await page.locator('#player-title').textContent(),ALBUM.waitingTitle);
  assert.equal(await page.locator('#player-detail').textContent(),ALBUM.waitingDetail);
  assert.equal(await page.locator('#sample-label').textContent(),ALBUM.tracklistCaption);
  assert.equal(await page.$eval('#player-record i',e=>getComputedStyle(e).display),'none');
  assert.equal(await page.locator('.album__letter').isVisible(),true);
  assert.equal(await page.locator('#album-note-title').textContent(),'a little note for sofiii ♡');
  assert.deepEqual(await page.locator('#album-note-copy p').allTextContents(),ALBUM.note);
  assert.ok(await page.evaluate(()=>document.querySelector('.album__letter').getBoundingClientRect().bottom<=document.getElementById('now-playing').getBoundingClientRect().top));
  await page.screenshot({path:path.join(out,`${name}-${mobile?'mobile':'desktop'}-letter.png`),fullPage:true});
  assert.equal(await page.locator('.album__track-button').count(),5);
  assert.equal(await page.locator('#track-count').textContent(), '05 tracks ♡');
  const deluxeRow=page.locator('[data-track-id="song-04"]');
  assert.equal(await page.locator('.album__track.is-deluxe').count(),1);
  assert.equal(await deluxeRow.locator('.album__track-title').textContent(),'One Less Lonely Girl');
  assert.equal(await deluxeRow.locator('.album__deluxe-badge').textContent(),'🔥 DELUXE');
  assert.equal(await deluxeRow.locator('.album__track-button').isEnabled(),true,'Song #4 has its actual audio connected');
  assert.equal(await deluxeRow.locator('img').getAttribute('src'),ALBUM.tracks[3].cover);
  await activate('[data-track-id="song-04"] .album__track-note');
  assert.equal(await page.locator('#note-copy').textContent(),ALBUM.tracks[3].note);await activate('#note-ok');

  assert.equal(await page.locator('[data-track-id="song-01"] .album__track-meta').textContent(),'2:55');
  await page.locator('#now-playing').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>{const i=document.getElementById('player-cover');return i.complete&&i.naturalWidth>0;});
  await page.screenshot({path:path.join(out,`${name}-${mobile?'mobile':'desktop'}-waiting-photo.png`)});
  await page.waitForFunction(() => window.__albumAudit.loops.some(s => s.loop && s.buffer));
  await sleep(750);
  // Audit the exact native-decoded buffer used for the browser's loop, including
  // both stereo channels. No fake clock and no synthetic sound engine here.
  const seam = await page.evaluate(() => {
    const source = window.__albumAudit.loops.find(s => s.loop && s.buffer), buffer = source.buffer;
    const channels = [];
    for (let c=0;c<buffer.numberOfChannels;c++) {
      const data=buffer.getChannelData(c); let normal=0;
      for(let i=1;i<data.length;i+=37) normal=Math.max(normal,Math.abs(data[i]-data[i-1]));
      channels.push({step:Math.abs(data[0]-data[data.length-1]),normal});
    }
    return {duration:buffer.duration,channels,loop:source.loop};
  });
  assert.equal(seam.loop,true); assert.ok(seam.duration>40&&seam.duration<48);
  for(const channel of seam.channels) assert.ok(channel.step<channel.normal);
  // Song #5 uses the supplied personal recording and square artwork in the
  // same native player on desktop and touch layouts.
  const photograph = ALBUM.tracks[4];
  const photographRow = page.locator('[data-track-id="song-05"]');
  assert.equal(await photographRow.locator('.album__track-title').textContent(), 'Photograph');
  assert.equal(await photographRow.locator('.album__track-meta').textContent(), '2:28');
  await activate('[data-track-id="song-05"] .album__track-button');
  await playing(page);
  await page.waitForFunction(() => document.getElementById('song-audio').currentTime > .1);
  assert.ok(await page.$eval('#song-audio', a => a.duration > 148 && a.duration < 149));
  assert.equal(await page.$eval('#song-audio', a => new URL(a.currentSrc).pathname), photograph.audio);
  assert.equal(await page.$eval('#player-cover', e => new URL(e.src).pathname), photograph.cover);
  assert.equal(await page.$eval('#player-cover', e => getComputedStyle(e).objectFit), 'contain');
  assert.match(await page.locator('#player-detail').textContent(), /Ed Sheeran cover/);
  assert.equal(await page.locator('#player-number').textContent(), 'TRACK 05 / 05');
  assert.equal(await page.$eval('#next-audio', a => a.paused), true);
  assert.equal(await page.evaluate(() => window.__albumAudit.gains[0].gain.value), 0);
  await activate('#play-pause');
  const photographPaused = await page.$eval('#song-audio', a => a.currentTime);
  await sleep(250);
  assert.equal(await page.$eval('#song-audio', a => a.currentTime), photographPaused);
  await page.locator('#song-seek').focus(); await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.getElementById('song-audio').currentTime < 1);
  await activate('#play-pause'); await playing(page);
  await activate('#player-note');
  assert.equal(await page.locator('#note-copy').textContent(), photograph.note);
  assert.equal(await page.$eval('#note-copy', e => getComputedStyle(e).whiteSpace), 'pre-wrap');
  await assertLayout(page);
  await page.screenshot({path:path.join(out,`${name}-${mobile?'mobile':'desktop'}-photograph-note.png`),fullPage:true});
  await activate('#note-ok');
  await page.$eval('#song-audio', a => { a.currentTime = 0; });
  await activate('#previous'); await playing(page);
  assert.equal(await page.locator('#player-title').textContent(), ALBUM.tracks[3].title);
  await activate('#next'); await playing(page);
  assert.equal(await page.locator('#player-title').textContent(), photograph.title);
  await activate('[data-track-id="song-01"] .album__track-button');
  await page.waitForFunction(()=>!document.getElementById('player-record').classList.contains('is-waiting'));
  assert.equal(await page.$eval('#player-cover',e=>new URL(e.src).pathname),ALBUM.tracks[0].cover);
  assert.equal(await page.$eval('#player-record i',e=>getComputedStyle(e).display),'none');
  assert.equal(await page.$eval('#player-record',e=>getComputedStyle(e).borderRadius),'0px');
  assert.equal(await page.$eval('#player-cover',e=>getComputedStyle(e).objectFit),'contain');
  await playing(page);
  await page.waitForFunction(() => document.getElementById('song-audio').currentTime>.1);
  assert.ok(await page.$eval('#song-audio',a=>a.duration>175&&a.duration<176));
  assert.equal(await page.locator('#cover-title').textContent(),ALBUM.title);
  assert.equal(await page.locator('#inside-title').textContent(),ALBUM.insideTitle);
  assert.equal(await page.locator('#player-note').textContent(),'fun fact ->');
  await page.waitForFunction(()=>{const i=document.getElementById('player-cover');return i.complete&&i.naturalWidth>0;});
  await page.locator('#now-playing').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,`${name}-${mobile?'mobile':'desktop'}-song-one.png`)});
  const gates = await page.evaluate(() => window.__albumAudit.gains.slice(0,2).map(g => g.gain.value));
  if(gates[0]!==0||gates[1]!==1)console.log('Native gain diagnostics',await page.evaluate(()=>({
    gains:window.__albumAudit.gains.map(g=>({value:g.gain.value,time:g.context.currentTime,state:g.context.state})),
    signal:window.__albumAudit.analysers.map(a=>{const data=new Uint8Array(a.fftSize);a.getByteTimeDomainData(data);return Math.max(...data)-Math.min(...data);}),
    songTime:document.getElementById('song-audio').currentTime,ready:document.getElementById('song-audio').readyState
  })));
  assert.equal(gates[0],0); assert.equal(gates[1],1);
  assert.equal(await page.$eval('#next-audio',a=>a.paused),true);
  await activate('#play-pause'); const paused = await page.$eval('#song-audio',a=>a.currentTime);
  await sleep(750); assert.equal(await page.$eval('#song-audio',a=>a.currentTime),paused);
  const pausedGates = await page.evaluate(() => window.__albumAudit.gains.slice(0,2).map(g=>g.gain.value));
  assert.equal(pausedGates[1],0); assert.ok(pausedGates[0]>.35&&pausedGates[0]<=.41);
  await activate('#ambient-toggle'); await sleep(650); assert.equal(await page.evaluate(()=>window.__albumAudit.gains[0].gain.value),0);
  await activate('#ambient-toggle');
  await activate('[data-track-id="song-01"] .album__track-note');
  assert.equal(await page.locator('#note-dialog').isVisible(),true); await activate('#note-ok');
  assert.equal(await page.locator('#note-dialog').isVisible(),false);
  await activate('#play-pause'); await playing(page);
  // Native seeking, rapid selection, and external pause/explicit resume.
  await page.locator('#song-seek').focus(); await page.keyboard.press('End'); await page.keyboard.press('ArrowLeft');
  await activate('[data-track-id="song-03"] .album__track-button');
  await activate('[data-track-id="song-02"] .album__track-button');
  await playing(page);
  assert.equal(await page.locator('#player-title').textContent(),'Made in Camella');
  assert.ok(await page.$eval('#song-audio',a=>a.currentSrc.endsWith('/song-02.mp3')&&a.duration>40.6&&a.duration<40.8));
  await page.waitForFunction(()=>document.getElementById('song-audio').currentTime>.1);
  assert.equal(await page.$eval('#player-cover',e=>new URL(e.src).pathname),ALBUM.tracks[1].cover);
  await page.waitForFunction(()=>{const i=document.getElementById('player-cover');return i.complete&&i.naturalWidth>0;});
  const artwork=await page.$eval('#player-cover',e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,fit:getComputedStyle(e).objectFit};});
  assert.equal(artwork.width,artwork.height);assert.equal(artwork.fit,'contain');
  assert.equal(await page.$eval('#next-audio',a=>a.paused),true);
  await activate('#play-pause');const songTwoPaused=await page.$eval('#song-audio',a=>a.currentTime);
  await sleep(250);assert.equal(await page.$eval('#song-audio',a=>a.currentTime),songTwoPaused);
  await activate('#player-note');assert.equal(await page.locator('#note-copy').textContent(),ALBUM.tracks[1].note);
  assert.equal(await page.$eval('#note-copy',e=>getComputedStyle(e).whiteSpace),'pre-wrap');await assertLayout(page);await activate('#note-ok');
  await activate('#play-pause');await playing(page);
  await page.locator('#song-seek').evaluate(e=>{e.value='20';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>document.getElementById('song-audio').currentTime>20.1);
  assert.equal(await page.locator('#duration').textContent(),'0:40');
  await page.locator('#now-playing').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,`${name}-${mobile?'mobile':'desktop'}-song-two.png`)});
  await activate('[data-track-id="song-01"] .album__track-button');await playing(page);
  assert.equal(await page.$eval('#player-cover',e=>new URL(e.src).pathname),ALBUM.tracks[0].cover);
  await activate('[data-track-id="song-02"] .album__track-button');await playing(page);

  await page.evaluate(()=>document.getElementById('song-audio').pause());
  await page.locator('#tap-continue').waitFor({state:'visible'}); await activate('#tap-continue');
  await playing(page);
  await activate('#shuffle'); assert.equal(await page.locator('#shuffle').getAttribute('aria-pressed'),'true'); await activate('#shuffle'); assert.equal(await page.locator('#shuffle').getAttribute('aria-pressed'),'false');
  await activate('#repeat'); assert.equal(await page.locator('#repeat').getAttribute('aria-pressed'),'true');
  await activate('#repeat'); assert.equal(await page.locator('#repeat-one').isVisible(),true); await activate('#repeat'); assert.equal(await page.locator('#repeat').getAttribute('aria-pressed'),'false');
  // A real ended event advances when its decoded native sample finishes.
  await page.evaluate(()=>{const a=document.getElementById('song-audio');a.currentTime=a.duration-.1;});
  await page.waitForFunction(()=>document.getElementById('player-title').textContent==='Daisies');
  await playing(page);
  assert.ok(await page.$eval('#song-audio',a=>a.currentSrc.endsWith('/song-03.mp3')&&a.duration>98&&a.duration<98.2));
  await page.waitForFunction(()=>document.getElementById('song-audio').currentTime>.1);
  assert.equal(await page.$eval('#player-cover',e=>new URL(e.src).pathname),ALBUM.tracks[2].cover);
  await page.waitForFunction(()=>{const i=document.getElementById('player-cover');return i.complete&&i.naturalWidth>0;});
  assert.equal(await page.$eval('#player-cover',e=>e.naturalWidth===e.naturalHeight),true);
  await activate('#player-note');
  assert.equal(await page.locator('#note-copy').textContent(),ALBUM.tracks[2].note);
  assert.equal(await page.$eval('#note-copy',e=>getComputedStyle(e).whiteSpace),'pre-wrap');
  await assertLayout(page); await activate('#note-ok');
  await activate('#play-pause'); const songThreePaused=await page.$eval('#song-audio',a=>a.currentTime);
  await sleep(250); assert.equal(await page.$eval('#song-audio',a=>a.currentTime),songThreePaused);
  await activate('#play-pause'); await playing(page);
  await page.locator('#song-seek').evaluate(e=>{e.value='45';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});
  await playing(page);await page.waitForFunction(()=>document.getElementById('song-audio').currentTime>45.1);
  await page.locator('#now-playing').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,`${name}-${mobile?'mobile':'desktop'}-song-three.png`)});
  await activate('[data-track-id="song-05"] .album__track-button'); await playing(page);
  await page.evaluate(()=>{const a=document.getElementById('song-audio');a.currentTime=a.duration-.1;});
  await page.locator('#play-again').waitFor({state:'visible'}); assert.equal(await page.$eval('#song-audio',a=>a.paused),true);
  await activate('#play-again'); await playing(page);
  assert.equal(await page.locator('#player-title').textContent(),ALBUM.tracks[0].title); await activate('#play-pause');
  await assertLayout(page);
  await page.screenshot({path:path.join(out,`${name}-${mobile?'mobile':'desktop'}-album.png`),fullPage:true});
  if(mobile){await page.setViewportSize({width:320,height:568});await assertLayout(page);await page.screenshot({path:path.join(out,`${name}-small.png`),fullPage:true});await page.setViewportSize({width:844,height:390});await assertLayout(page);}
  await activate('#birthday-back'); await page.waitForURL('**/sofhia-franchesca-16');
  assert.equal(await page.locator('#start').isVisible(),true); assert.equal(await page.locator('#album-entry').isVisible(),true);
  assert.deepEqual(errors,[]); console.log(name+' '+(mobile?'mobile':'desktop')+': native audio, seam '+JSON.stringify(seam)+', ducking, controls, seek, interruptions, finish, layouts, and birthday return passed');
  await context.close();
}
async function variants(browser,name,url){
  const config=await fs.readFile(path.join(__dirname,'../js/album-config.mjs'),'utf8');
  for(const count of [0,1,25]){
    const context=await browser.newContext({viewport:{width:320,height:568},reducedMotion:'reduce'}),page=await context.newPage();
    await page.route('**/js/album-config.mjs',r=>r.fulfill({contentType:'text/javascript',body:config+`\nALBUM.tracks=Array.from({length:${count}},(_,i)=>({...ALBUM.tracks[0],id:'variant-'+i,title:'a very long song title '+('sofiii'.repeat(12))+' '+(i+1),audio:i%3===2?'':ALBUM.tracks[0].audio}));`}));
    await page.goto(url+'/sofhias-songs-67');assert.equal(await page.$eval('#album-cover',e=>getComputedStyle(e).animationName),'none');await page.click('#open-album');await page.locator('#album-inside').waitFor({state:'visible'});
    assert.equal(await page.locator('.album__track').count(),count);await assertLayout(page);
    if(count===25)assert.equal(await page.locator('.album__track-button:disabled').count(),8);
    await page.screenshot({path:path.join(out,`${name}-${count}-tracks.png`),fullPage:true});await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Force only track 1 to be missing, with no fallback. Track 2 remains native.
  await page.route('**/js/album-config.mjs',r=>r.fulfill({contentType:'text/javascript',body:config+"\nALBUM.tracks[0].audio='/assets/album/missing.mp3';ALBUM.tracks[0].fallbackAudio='';"}));
  await page.goto(url+'/sofhias-songs-67');await page.click('#open-album');await page.locator('#album-inside').waitFor({state:'visible'});
  await page.click('[data-track-id="song-01"] .album__track-button');await page.waitForFunction(()=>document.getElementById('player-title').textContent==='Made in Camella');
  assert.equal(await page.locator('[data-track-id="song-01"] .album__track-button').isEnabled(),false);assert.deepEqual(errors,[]);await context.close();
  // Delayed native track download exercises loading and recovery.
  const slow=await browser.newContext({viewport:{width:390,height:844}}),slowPage=await slow.newPage();
  await slowPage.route('**/assets/album/song-01.mp3',async route=>{await sleep(1500);await route.continue();});
  await slowPage.goto(url+'/sofhias-songs-67');await slowPage.click('#open-album');await slowPage.locator('#album-inside').waitFor({state:'visible'});
  await slowPage.click('[data-track-id="song-01"] .album__track-button');await slowPage.waitForFunction(()=>document.body.classList.contains('is-playing'),{},{timeout:15000});await slow.close();
  const aacContext=await browser.newContext({viewport:{width:390,height:844}}),aacPage=await aacContext.newPage();
  await aacPage.addInitScript(observeNativeMixer);
  await aacPage.route('**/assets/album/song-01.mp3',route=>route.abort());
  await aacPage.goto(url+'/sofhias-songs-67');await aacPage.click('#open-album');await aacPage.locator('#album-inside').waitFor({state:'visible'});
  await aacPage.click('[data-track-id="song-01"] .album__track-button');await playing(aacPage);
  const fallback=await aacPage.$eval('#song-audio',a=>({src:a.currentSrc,duration:a.duration,aac:a.canPlayType('audio/mp4'),codec:a.canPlayType('audio/mp4; codecs="mp4a.40.2"'),title:document.getElementById('player-title').textContent,error:a.error?.code}));
  console.log(name+': forced MP3 failure recovery '+JSON.stringify(fallback));
  if(fallback.codec){
    assert.ok(fallback.src.endsWith('/song-01.mp4')&&fallback.duration>175);
    await aacPage.waitForFunction(()=>document.getElementById('song-audio').currentTime>.1);
    await aacPage.locator('#song-seek').evaluate(e=>{e.value='90';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});
    await playing(aacPage);await aacPage.waitForFunction(()=>document.getElementById('song-audio').currentTime>90.1);
  }else{
    assert.equal(fallback.title,'Made in Camella','a browser without AAC skips the failed track gracefully');
  }
  await aacContext.close();
  for(const [file,mime] of [['song-01.mp3','audio/mpeg'],['song-01.mp4','audio/mp4'],['song-02.mp3','audio/mpeg'],['song-02.m4a','audio/mp4'],['song-03.mp3','audio/mpeg'],['song-03.m4a','audio/mp4'],['song-04.mp3','audio/mpeg'],['song-04.m4a','audio/mp4']]){
    const response=await fetch(url+'/assets/album/'+file,{headers:{Range:'bytes=0-255'}});assert.equal(response.status,206);assert.equal(response.headers.get('content-type'),mime);assert.equal((await response.arrayBuffer()).byteLength,256);
  }
  console.log(name+': reduced-motion 0/1/25 tracks, locked/missing track, slow response passed');
}
// Exercise the actual Song #4 recording and the exclusive Deluxe treatment.
async function deluxeControls(browser,name,url,mobile){
  const { ALBUM } = await import('../js/album-config.mjs');
  const device=mobile&&name==='webkit'?pw.devices['iPhone 13']:mobile&&name==='chromium'?pw.devices['Pixel 5']:{viewport:{width:1440,height:1000}};
  const context=await browser.newContext(device),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(observeNativeMixer);
  const activate=selector=>mobile?page.tap(selector):page.click(selector);
  await page.goto(url+'/sofhias-songs-67');await page.waitForFunction(()=>!document.getElementById('open-album').disabled);
  await activate('#open-album');await page.locator('#album-inside').waitFor({state:'visible'});
  await activate('[data-track-id="song-04"] .album__track-button');await playing(page);
  assert.equal(await page.locator('#player-title').textContent(),'One Less Lonely Girl');
  assert.ok(await page.$eval('#song-audio',a=>a.currentSrc.endsWith('/song-04.mp3')&&a.duration>227&&a.duration<227.4));
  assert.equal(await page.locator('#duration').textContent(),'3:47');
  assert.equal(await page.locator('#now-playing.is-deluxe').count(),1);
  assert.equal(await page.locator('#player-detail .album__deluxe-badge').textContent(),'🔥 DELUXE');
  await page.waitForFunction(()=>{const i=document.getElementById('player-cover');return i.complete&&i.naturalWidth===3464;});
  assert.equal(await page.$eval('#player-cover',e=>getComputedStyle(e).objectFit),'contain');
  assert.equal(await page.$eval('#now-playing',e=>getComputedStyle(e,'::after').pointerEvents),'none');
  assert.equal(await page.$eval('#now-playing',e=>getComputedStyle(e,'::after').animationName),'album-deluxe-embers');
  await activate('#play-pause');const pausedAt=await page.$eval('#song-audio',a=>a.currentTime);
  await sleep(250);assert.equal(await page.$eval('#song-audio',a=>a.currentTime),pausedAt);
  await activate('#player-note');assert.equal(await page.locator('#note-copy').textContent(),ALBUM.tracks[3].note);
  await assertLayout(page);await activate('#note-ok');
  await page.locator('#now-playing').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,`${name}-${mobile?'mobile':'desktop'}-deluxe.png`),fullPage:true});
  await activate('#play-pause');await playing(page);
  await page.locator('#song-seek').evaluate(e=>{e.value='100';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});
  await playing(page);await page.waitForFunction(()=>document.getElementById('song-audio').currentTime>100.1);
  for(const id of ['song-01','song-02','song-03']){
    await activate(`[data-track-id="${id}"] .album__track-button`);await playing(page);
    assert.equal(await page.locator('#now-playing.is-deluxe').count(),0);
    assert.equal(await page.locator('#player-detail .album__deluxe-badge').count(),0);
    assert.equal(await page.$eval('#next-audio',a=>a.paused),true);
  }
  await activate('#play-pause');await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.$eval('[data-track-id="song-04"]',e=>getComputedStyle(e,'::after').animationName),'none');
  await assertLayout(page);assert.deepEqual(errors,[]);await context.close();
  console.log(name+' Deluxe '+(mobile?'mobile':'desktop')+': actual recording playback, badge isolation, artwork, controls, bounds and reduced motion passed');
}
async function discoverControls(browser,name,url,mobile) {
  const context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},hasTouch:mobile});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(observeNativeMixer);
  const activate=selector=>mobile?page.tap(selector):page.click(selector);
  await page.goto(url+'/sofhias-songs-67');
  await page.waitForFunction(()=>!document.getElementById('open-album').disabled);
  await activate('#open-album');await page.locator('#album-inside').waitFor({state:'visible'});
  assert.equal(await page.locator('#tracklist .album__track').count(),5);
  assert.equal(await page.locator('#track-count').textContent(),'05 tracks ♡');
  assert.equal(await page.locator('.discover__card').count(),7);
  assert.deepEqual(await page.locator('.discover__title').allTextContents(),['Beauty And A Beat','One Less Lonely Girl',...Array.from({length:5},(_,i)=>`Top ${i+3} — Coming Soon`)]);
  for(const [index,tier] of ['gold','silver','bronze'].entries())assert.equal(await page.locator(`.discover__card--${tier}[data-rank="${index+1}"]`).count(),1);
  assert.equal(await page.locator('.discover__rank svg').count(),3);
  assert.equal(await page.locator('.discover audio,.discover__song-link').count(),0);
  assert.equal(await page.locator('.discover img').count(),2);
  assert.equal(await page.locator('.discover__listen').count(),2);
  assert.equal(await page.locator('#discover-meme').isVisible(),false);
  await activate('.discover__card[data-rank="1"] summary');
  assert.equal(await page.locator('.discover__card[data-rank="1"] .discover__description').textContent(),'coming soon ♡');
  await activate('.discover__card[data-rank="1"] summary');
  await activate('[data-track-id="song-01"] .album__track-button');await playing(page);
  const before=await page.$eval('#song-audio',a=>({time:a.currentTime,src:a.currentSrc}));
  await activate('#discover-six-seven');await page.waitForTimeout(150);
  assert.equal(await page.locator('#discover-meme').isVisible(),true);
  assert.equal(await page.locator('#discover-six-seven').getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('.discover__hand').count(),2);
  assert.equal(await page.$eval('#song-audio',a=>a.paused),false);
  await page.screenshot({path:path.join(out,`${name}-${mobile?'mobile':'desktop'}-discover-meme.png`),fullPage:true});
  await page.locator('#discover-meme').waitFor({state:'hidden',timeout:6000});
  assert.ok(await page.$eval('#song-audio',(a,before)=>!a.paused&&a.currentSrc===before.src&&a.currentTime>before.time,before),'meme never interrupts the original recording');
  await page.emulateMedia({reducedMotion:'reduce'});
  await activate('#discover-six-seven');
  assert.equal(await page.locator('#discover-meme').isVisible(),true);
  assert.equal(await page.$eval('.discover__hand',e=>getComputedStyle(e).animationName),'none');
  await page.locator('#discover-meme').waitFor({state:'hidden',timeout:6000});
  await activate('.discover__card[data-rank="1"] summary');
  await activate('.discover__listen[data-discovery-id="discover-01"]');await playing(page);
  await page.waitForFunction(()=>document.getElementById('song-audio').currentTime>.1);
  assert.equal(await page.locator('#player-title').textContent(),'Beauty And A Beat');
  assert.equal(await page.locator('#player-detail').textContent(),'Justin Bieber ft. Nicki Minaj');
  assert.equal(await page.$eval('#song-audio',a=>new URL(a.currentSrc).pathname),'/assets/album/discover-01.mp3');
  assert.ok(await page.$eval('#song-audio',a=>a.duration>64&&a.duration<64.5));
  assert.equal(await page.$eval('#player-cover',e=>new URL(e.src).pathname),'/assets/album/discover-01-cover.jpg');
  assert.equal(await page.locator('#track-count').textContent(),'05 tracks ♡');
  assert.equal(await page.$eval('#next-audio',a=>a.paused),true);
  assert.equal(await page.evaluate(()=>window.__albumAudit.gains[0].gain.value),0);
  await activate('#play-pause');assert.equal(await page.$eval('#song-audio',a=>a.paused),true);
  await page.locator('#song-seek').evaluate(e=>{e.value='30';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});
  await activate('#play-pause');await playing(page);
  await page.waitForFunction(()=>document.getElementById('song-audio').currentTime>30.1);
  await activate('[data-track-id="song-04"] .album__track-button');await playing(page);
  assert.equal(await page.locator('#now-playing.is-deluxe').count(),1);
  assert.equal(await page.locator('.discover__listen[data-discovery-id="discover-01"]').getAttribute('aria-pressed'),'false');
  await activate('.discover__listen[data-discovery-id="discover-02"]');await playing(page);
  assert.equal(await page.$eval('#song-audio',a=>new URL(a.currentSrc).pathname),'/assets/album/discover-02.mp3');
  assert.equal(await page.locator('#player-detail').textContent(),'Justin Bieber');
  assert.equal(await page.locator('#now-playing.is-deluxe').count(),0);
  await activate('.discover__listen[data-discovery-id="discover-01"]');await playing(page);
  assert.equal(await page.locator('#now-playing.is-deluxe').count(),0);
  await page.evaluate(()=>{const a=document.getElementById('song-audio');a.currentTime=a.duration-.1;});
  await page.waitForFunction(()=>document.getElementById('player-title').textContent==='One Less Lonely Girl');
  await playing(page);
  assert.equal(await page.locator('#player-detail').textContent(),'Justin Bieber');
  assert.match(await page.locator('#player-number').textContent(),/TOP 2 — SILVER/);
  assert.equal(await page.$eval('#player-cover',e=>new URL(e.src).pathname),'/assets/album/discover-02-cover.jpg');
  assert.equal(await page.$eval('#song-audio',a=>new URL(a.currentSrc).pathname),'/assets/album/discover-02.mp3');
  assert.ok(await page.$eval('#song-audio',a=>a.duration>67&&a.duration<68));
  assert.equal(await page.locator('#now-playing.is-deluxe').count(),0);
  await activate('#play-pause');
  await page.locator('#song-seek').evaluate(e=>{e.value='20';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});
  await activate('#play-pause');await playing(page);
  await page.waitForFunction(()=>document.getElementById('song-audio').currentTime>20.1);
  assert.equal(await page.$eval('#next-audio',a=>a.paused),true);
  await page.screenshot({path:path.join(out,`${name}-${mobile?'mobile':'desktop'}-silver-player.png`)});
  await page.evaluate(()=>{const a=document.getElementById('song-audio');a.currentTime=a.duration-.1;});
  await page.locator('#play-again').waitFor({state:'visible'});
  assert.equal(await page.locator('#player-title').textContent(),'One Less Lonely Girl');
  assert.equal(await page.$eval('#song-audio',a=>a.paused),true);
  await activate('[data-track-id="song-01"] .album__track-button');await playing(page);
  if(mobile){await page.setViewportSize({width:320,height:740});await assertLayout(page);await page.screenshot({path:path.join(out,`${name}-discover-320.png`),fullPage:true});}
  await activate('#play-pause');assert.deepEqual(errors,[]);await context.close();
  console.log(name+' discover '+(mobile?'mobile':'desktop')+': Gold/Silver recordings, five placeholders, shared playback/seek/switch/finish, silent meme and reduced motion passed');
}
(async()=>{
  await fs.mkdir(out,{recursive:true});const {server,url}=await startServer();
  try{for(const name of (process.env.ALBUM_ENGINES||'chromium,firefox,webkit').split(',')){
    const browser=await pw[name].launch({headless:true});
    try{console.log(name+' '+browser.version());await nativeControls(browser,name,url,false);if(name!=='firefox')await nativeControls(browser,name,url,true);await variants(browser,name,url);await deluxeControls(browser,name,url,false);if(name!=='firefox')await deluxeControls(browser,name,url,true);await discoverControls(browser,name,url,false);if(name!=='firefox')await discoverControls(browser,name,url,true);}finally{await browser.close();}
  }}finally{server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
