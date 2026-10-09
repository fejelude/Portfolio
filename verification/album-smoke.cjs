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
  assert.equal(await page.locator('.album__track-button').count(),18);
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
  await activate('[data-track-id="song-01"] .album__track-button');
  await page.waitForFunction(()=>!document.getElementById('player-record').classList.contains('is-waiting'));
  assert.equal(await page.$eval('#player-cover',e=>new URL(e.src).pathname),ALBUM.tracks[0].cover);
  assert.notEqual(await page.$eval('#player-record i',e=>getComputedStyle(e).display),'none');
  await playing(page);
  await page.waitForFunction(() => document.getElementById('song-audio').currentTime>.1);
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
  assert.equal(await page.locator('#player-title').textContent(),'Song 02');
  await page.evaluate(()=>document.getElementById('song-audio').pause());
  await page.locator('#tap-continue').waitFor({state:'visible'}); await activate('#tap-continue');
  await playing(page);
  await activate('#shuffle'); assert.equal(await page.locator('#shuffle').getAttribute('aria-pressed'),'true'); await activate('#shuffle'); assert.equal(await page.locator('#shuffle').getAttribute('aria-pressed'),'false');
  await activate('#repeat'); assert.equal(await page.locator('#repeat').getAttribute('aria-pressed'),'true');
  await activate('#repeat'); assert.equal(await page.locator('#repeat-one').isVisible(),true); await activate('#repeat'); assert.equal(await page.locator('#repeat').getAttribute('aria-pressed'),'false');
  // A real ended event advances when its decoded native sample finishes.
  await page.evaluate(()=>{const a=document.getElementById('song-audio');a.currentTime=a.duration-.1;});
  await page.waitForFunction(()=>document.getElementById('player-title').textContent==='Song 03');
  await playing(page);
  await activate('[data-track-id="song-18"] .album__track-button'); await playing(page);
  await page.evaluate(()=>{const a=document.getElementById('song-audio');a.currentTime=a.duration-.1;});
  await page.locator('#play-again').waitFor({state:'visible'}); assert.equal(await page.$eval('#song-audio',a=>a.paused),true);
  await activate('#play-again'); await playing(page);
  assert.equal(await page.locator('#player-title').textContent(),'Song 01'); await activate('#play-pause');
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
  await page.click('[data-track-id="song-01"] .album__track-button');await page.waitForFunction(()=>document.getElementById('player-title').textContent==='Song 02');
  assert.equal(await page.locator('[data-track-id="song-01"] .album__track-button').isEnabled(),false);assert.deepEqual(errors,[]);await context.close();
  // Delayed native track download exercises loading and recovery.
  const slow=await browser.newContext({viewport:{width:390,height:844}}),slowPage=await slow.newPage();
  await slowPage.route('**/assets/album/sample.mp3',async route=>{await sleep(1500);await route.continue();});
  await slowPage.goto(url+'/sofhias-songs-67');await slowPage.click('#open-album');await slowPage.locator('#album-inside').waitFor({state:'visible'});
  await slowPage.click('[data-track-id="song-01"] .album__track-button');await slowPage.waitForFunction(()=>document.body.classList.contains('is-playing'),{},{timeout:15000});await slow.close();
  console.log(name+': reduced-motion 0/1/25 tracks, locked/missing track, slow response passed');
}
(async()=>{
  await fs.mkdir(out,{recursive:true});const {server,url}=await startServer();
  try{for(const name of (process.env.ALBUM_ENGINES||'chromium,firefox,webkit').split(',')){
    const browser=await pw[name].launch({headless:true});
    try{console.log(name+' '+browser.version());await nativeControls(browser,name,url,false);if(name!=='firefox')await nativeControls(browser,name,url,true);await variants(browser,name,url);}finally{await browser.close();}
  }}finally{server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
