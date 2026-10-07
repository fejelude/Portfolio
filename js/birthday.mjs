import { CONFIG } from './birthday-config.mjs';
import { StoryClock, clamp } from './birthday-clock.mjs';
import { BouquetRenderer, GroveRenderer, ParticleGarden } from './birthday-art.mjs';

const $ = id => document.getElementById(id);
const audio=$('birthday-audio'),clock=new StoryClock(CONFIG.duration);
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const bouquet=new BouquetRenderer($('bouquet')),grove=new GroveRenderer($('grove')),particles=new ParticleGarden($('particles'));
const lifetime=new AbortController(),options={signal:lifetime.signal};
let active=false,revealed=false,ready=false,buffering=false,manualPaused=false,backgroundResume=false;
let generation=0,playAttempt=0,raf=0,lastFrame=0,lastVisual=0,lastSecond=-1,lastPhase=-1,playPending=false,disposed=false,audioUnavailable=false;
let ambient=0,ambientAnchor=0,ambientRunning=false,welcomeFade=0,loadingSince=performance.now();
let pointer={x:0,y:0},parallax={x:0,y:0},tiltAttached=false,tiltAvailable=false;

// Copy is configured in one module; construct text nodes rather than HTML.
$('greeting').replaceChildren(document.createTextNode(CONFIG.greeting),document.createElement('br'));
const name=document.createElement('span');name.textContent=CONFIG.name;
const flower=document.createElement('span');flower.className='birthday__emoji';flower.textContent=' 🌸';
$('greeting').append(name,flower);
$('birthday-message').replaceChildren(document.createTextNode(CONFIG.message),document.createElement('br'),document.createTextNode(`${CONFIG.name} 💖`));
$('wish').textContent=CONFIG.wish;$('date').textContent=CONFIG.date;
$('signature').textContent=`${CONFIG.signature} 💗`;
document.title=`a little something for ${CONFIG.name} 🌸`;
const source=audio.querySelector('source');if(source.getAttribute('src')!==CONFIG.audio){source.src=CONFIG.audio;audio.load();}

function setStatus(message='') { $('playback-status').textContent=message; }
function setReady() {
  if(ready||disposed)return;ready=true;
  $('start').disabled=false;$('start').textContent='START';$('ready-status').textContent='tap ittt · sound on 💖';
}
function resize() {
  grove.resize(innerWidth,innerHeight);
  const rect=$('scene').getBoundingClientRect();particles.resize(rect.width,rect.height);
}
function startAmbient(now) { ambientAnchor=now;ambientRunning=true; }
function readAmbient(now) { return ambient+(ambientRunning?(now-ambientAnchor)/1000:0); }
function pauseAmbient(now) { ambient=readAmbient(now);ambientRunning=false; }
function schedule() { if(!raf&&!disposed&&!document.hidden)raf=requestAnimationFrame(frame); }
function isPaused() { return active&&!revealed&&!clock.running&&!buffering&&!playPending; }
function showContinue(copy='your flowers are still here 🌸') {
  $('continue-copy').textContent=copy;$('continue-panel').hidden=false;
  $('pause').setAttribute('aria-label','Continue experience');
}
function hideContinue() { $('continue-panel').hidden=true;$('pause').setAttribute('aria-label','Pause experience'); }

function requestMotion() {
  if(motion.matches||tiltAttached)return;
  const attach=(useMotion=false)=>{
    if(disposed||tiltAttached||motion.matches)return;tiltAttached=true;
    addEventListener(useMotion?'devicemotion':'deviceorientation',event=>{
      if(motion.matches)return;
      if(useMotion){const g=event.accelerationIncludingGravity;if(g?.x==null||g?.y==null)return;tiltAvailable=true;pointer={x:clamp(-g.x/4,-1,1),y:clamp((g.y+6)/4,-1,1)};}
      else {if(event.beta==null||event.gamma==null)return;tiltAvailable=true;pointer={x:clamp(event.gamma/22,-1,1),y:clamp((event.beta-45)/25,-1,1)};}
    },options);
  };
  try {
    const useMotion=typeof window.DeviceMotionEvent?.requestPermission==='function';
    const api=useMotion?window.DeviceMotionEvent:window.DeviceOrientationEvent;
    if(typeof api?.requestPermission==='function')api.requestPermission().then(result=>{if(result==='granted')attach(useMotion);}).catch(()=>{});
    else if('DeviceOrientationEvent' in window)attach();
  } catch { /* Mouse/touch remains available when tilt is blocked or unsupported. */ }
}

function useSilent() {
  if(!active||revealed||disposed)return;
  playAttempt++;
  const now=performance.now(),wasRunning=clock.running;
  clock.switchMode('silent',now,audio.currentTime);
  playPending=false;buffering=false;
  // Set mode first: the pause event must not be interpreted as an interruption.
  audio.pause();
  $('sound').disabled=true;$('sound').setAttribute('aria-label','Music unavailable');
  if(!document.hidden&&!manualPaused){clock.start(now);hideContinue();}
  else {clock.running=false;if(!document.hidden)showContinue();}
  setStatus('no sound rn, but keep going 💗');
  if(!wasRunning)lastVisual=clock.time;
  schedule();
}

function settlePlay(promise,token,fromGesture,initial=false) {
  const attempt=++playAttempt;
  Promise.resolve(promise).then(()=>{
    if(attempt!==playAttempt||token!==generation||disposed||!active||revealed||clock.mode!=='media')return;
    playPending=false;
    if(document.hidden||manualPaused){audio.pause();return;}
    // playing is the preferred signal. This also handles already-playing media.
    if(!audio.paused&&audio.readyState>=3){buffering=false;clock.start(performance.now());hideContinue();setStatus();}
    schedule();
  }).catch(error=>{
    if(attempt!==playAttempt||token!==generation||disposed||!active||revealed||clock.mode!=='media')return;
    playPending=false;
    // AbortError commonly comes from pausing during a background transition.
    if(document.hidden||manualPaused){clock.pause(performance.now(),audio.currentTime);return;}
    if(error?.name==='AbortError'){showContinue();setStatus();return;}
    if(!initial&&error?.name==='NotAllowedError'){clock.pause(performance.now(),audio.currentTime);showContinue('tap once and we’re back 🌸');setStatus();return;}
    useSilent();
  });
}

function begin() {
  if(!ready||disposed||active&&!revealed)return;
  const now=performance.now(),token=++generation;
  audio.pause();clock.reset();particles.reset();active=true;revealed=false;buffering=false;manualPaused=false;backgroundResume=false;
  audio.muted=false;$('sound').disabled=false;$('sound').setAttribute('aria-pressed','false');$('sound').setAttribute('aria-label','Mute music');
  lastVisual=0;lastSecond=-1;lastPhase=-1;ambient=0;ambientRunning=false;playPending=true;welcomeFade=now;
  $('welcome').classList.add('is-leaving');$('progress-panel').hidden=false;$('celebration').hidden=true;$('replay').hidden=true;
  $('controls').hidden=false;$('chrome-star').hidden=true;$('announcement').textContent='okayyy, here we go 🌸';
  $('pause').disabled=false;hideContinue();setStatus('starting the song… 🌸');
  try { audio.currentTime=0; } catch { /* A cold media element can seek once metadata arrives. */ }
  // This call and the permission request are both synchronous consequences of
  // START. Never await permission, asset loading, or a transition before play().
  try { const promise=audio.play();requestMotion();settlePlay(promise,token,true,true); }
  catch { requestMotion();useSilent(); }
  if(audio.error||audioUnavailable)useSilent();
  resize();schedule();
}

function pauseExperience(manual=false) {
  if(!active||revealed||disposed)return;
  playAttempt++;
  manualPaused=manual;playPending=false;
  clock.pause(performance.now(),audio.currentTime);buffering=false;
  audio.pause();showContinue();setStatus();schedule();
}
function resumeExperience(fromGesture=true) {
  if(!active||revealed||disposed)return;
  manualPaused=false;hideContinue();
  if(clock.mode!=='media'){clock.start(performance.now());setStatus(clock.mode==='silent'?'no sound rn, but keep going 💗':'');schedule();return;}
  if(audio.ended){clock.ended(performance.now(),audio.currentTime);clock.start(performance.now());schedule();return;}
  playPending=true;setStatus('finding the song again… 🌸');
  try { const promise=audio.play();if(fromGesture)requestMotion();settlePlay(promise,generation,fromGesture); }
  catch { useSilent(); }
  schedule();
}
function celebrate(now) {
  if(revealed)return;revealed=true;clock.time=CONFIG.duration;clock.running=false;
  ambient=0;startAmbient(now);buffering=false;playPending=false;
  hideContinue();$('progress-panel').hidden=true;$('celebration').hidden=false;
  $('progress').setAttribute('aria-valuenow',String(CONFIG.duration));$('progress-fill').style.transform='scaleX(1)';$('time').firstChild.textContent='1:00 ';
  $('pause').disabled=true;$('pause').setAttribute('aria-label','Bouquet complete');
  $('announcement').textContent=`${CONFIG.message} ${CONFIG.name}! ${CONFIG.wish}`;
  particles.burst(motion.matches);
  resize();
  // The scene stays up indefinitely. Only a new explicit Replay restarts it.
}

function canonicalTime(t) {
  // Timing edits retain individual flower/fold choreography within each chapter.
  const originals=[0,10,32,47,57,60],custom=[0,...CONFIG.stages];
  for(let i=1;i<custom.length;i++)if(t<=custom[i])return originals[i-1]+(originals[i]-originals[i-1])*clamp((t-custom[i-1])/(custom[i]-custom[i-1]));
  return 60;
}
function frame(now) {
  raf=0;if(disposed||document.hidden)return;
  const frameMs=lastFrame?now-lastFrame:16;lastFrame=now;
  if(!ready&&(audio.readyState>=2||audio.error||now-loadingSince>=3000))setReady();
  const t=active?clock.read(now,audio.currentTime):0;
  if(active&&!revealed&&t>=CONFIG.duration)celebrate(now);
  const finalTime=revealed?readAmbient(now):0;
  const visual=active?(revealed?CONFIG.duration+finalTime:t):(now-loadingSince)/1000;
  const dt=Math.max(0,visual-lastVisual);lastVisual=visual;
  if(motion.matches){parallax.x=0;parallax.y=0;}else{
    const lerp=1-Math.exp(-Math.min(frameMs,60)/180);parallax.x+=(pointer.x-parallax.x)*lerp;parallax.y+=(pointer.y-parallax.y)*lerp;
  }
  grove.render(visual,motion.matches,parallax);
  bouquet.render(active?canonicalTime(t):0,finalTime,motion.matches,parallax);
  particles.render(dt,visual,motion.matches,revealed,!active,frameMs);
  const anticipation=!revealed&&t>=CONFIG.stages[3]?Math.sin(clamp((t-CONFIG.stages[3])/(CONFIG.duration-CONFIG.stages[3]))*Math.PI)*.08:0;
  $('halo').style.opacity=String(active?.3+.6*clamp(t/CONFIG.duration)+anticipation+(revealed&&!motion.matches?Math.sin(finalTime*.8)*.05:0):.2);
  if(active&&!revealed){
    if(!welcomeFade||now-welcomeFade>500)$('welcome').hidden=true;
    const phase=Math.min(4,CONFIG.stages.findIndex(end=>t<end));
    if(phase!==lastPhase){lastPhase=phase;$('phase').textContent=CONFIG.phases[Math.max(0,phase)];}
    $('progress-fill').style.transform=`scaleX(${clamp(t/CONFIG.duration)})`;
    const sec=Math.floor(t);
    if(sec!==lastSecond){lastSecond=sec;$('time').firstChild.textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')} `;$('progress').setAttribute('aria-valuenow',String(sec));}
  }
  if(revealed&&finalTime>=1.6)$('replay').hidden=false;
  // One loop for the entire page lifetime, including replay and resize.
  schedule();
}

audio.addEventListener('canplay',setReady,options);
audio.addEventListener('playing',()=>{
  if(!active||revealed||clock.mode!=='media'||disposed)return;
  if(document.hidden||manualPaused){audio.pause();return;}
  playPending=false;buffering=false;clock.start(performance.now());hideContinue();setStatus();schedule();
},options);
audio.addEventListener('waiting',()=>{
  if(!active||revealed||clock.mode!=='media'||document.hidden||manualPaused)return;
  clock.pause(performance.now(),audio.currentTime);buffering=true;setStatus('hold uppp, the song is loading 🌸');schedule();
},options);
audio.addEventListener('stalled',()=>{
  // stalled is a network event, not proof that the buffered audio stopped.
  // Let currentTime continue until waiting/paused says it actually stopped.
  if(active&&!revealed&&audio.readyState<3&&!audio.paused){clock.pause(performance.now(),audio.currentTime);buffering=true;setStatus('hold uppp, the song is loading 🌸');}
},options);
audio.addEventListener('pause',()=>{
  if(!active||revealed||clock.mode!=='media'||audio.ended||!audio.paused||disposed)return;
  playAttempt++;
  clock.pause(performance.now(),audio.currentTime);playPending=false;buffering=false;
  if(!document.hidden)showContinue();
},options);
audio.addEventListener('ended',()=>{
  if(!active||revealed||clock.mode!=='media'||disposed)return;
  const now=performance.now();clock.ended(now,audio.currentTime);buffering=false;playPending=false;
  if(!document.hidden&&!manualPaused){clock.start(now);hideContinue();setStatus();}
  else clock.running=false;
  // The actual 59.455s track is preserved byte-for-byte. Its remaining fraction
  // of a second is a pauseable silent crescendo, never an early birthday reveal.
  schedule();
},options);
function mediaFailed(){audioUnavailable=true;setReady();$('ready-status').textContent='tap ittt 💖';if(active)useSilent();}
audio.addEventListener('error',mediaFailed,options);
// With <source>, a failed resource can report only on the source element.
source.addEventListener('error',mediaFailed,options);
$('start').addEventListener('click',begin,options);
$('replay').addEventListener('click',begin,options);
$('continue').addEventListener('click',()=>resumeExperience(true),options);
$('pause').addEventListener('click',()=>{if(isPaused())resumeExperience(true);else pauseExperience(true);},options);
$('sound').addEventListener('click',()=>{
  audio.muted=!audio.muted;$('sound').setAttribute('aria-pressed',String(audio.muted));$('sound').setAttribute('aria-label',audio.muted?'Unmute music':'Mute music');
},options);
addEventListener('pointermove',event=>{
  if(motion.matches||tiltAvailable&&event.pointerType==='touch')return;
  pointer={x:clamp(event.clientX/innerWidth*2-1,-1,1),y:clamp(event.clientY/innerHeight*2-1,-1,1)};
},{...options,passive:true});
motion.addEventListener('change',()=>{pointer={x:0,y:0};parallax={x:0,y:0};},options);
addEventListener('resize',resize,options);
document.addEventListener('visibilitychange',()=>{
  const now=performance.now();
  if(document.hidden){
    backgroundResume=active&&!revealed&&!manualPaused&&(clock.running||buffering||playPending);
    if(active&&!revealed)pauseExperience(manualPaused);
    if(revealed)pauseAmbient(now);
    cancelAnimationFrame(raf);raf=0;lastFrame=0;
  }else{
    if(revealed)startAmbient(now);
    if(backgroundResume&&!manualPaused)resumeExperience(false);
    backgroundResume=false;lastVisual=active?(revealed?CONFIG.duration+readAmbient(now):clock.time):(now-loadingSince)/1000;
    schedule();
  }
},options);
function dispose() { disposed=true;generation++;cancelAnimationFrame(raf);raf=0;lifetime.abort();audio.pause();audio.removeAttribute('src');source.removeAttribute('src');audio.load();particles.reset(); }
addEventListener('pagehide',event=>{
  if(event.persisted){
    backgroundResume=active&&!revealed&&!manualPaused&&(clock.running||buffering||playPending);
    if(active&&!revealed)pauseExperience(manualPaused);if(revealed)pauseAmbient(performance.now());cancelAnimationFrame(raf);raf=0;
  }else dispose();
},options);
addEventListener('pageshow',event=>{if(event.persisted){if(backgroundResume&&!manualPaused)resumeExperience(false);if(revealed&&!ambientRunning)startAmbient(performance.now());backgroundResume=false;lastFrame=0;schedule();}},options);

if(!bouquet.c||!grove.c||!particles.c){
  $('welcome').hidden=true;$('bouquet').hidden=true;$('halo').hidden=true;$('static-fallback').hidden=false;$('signature').hidden=true;
}else{
  resize();audio.load();schedule();
}
