import { mountMemoryGarden } from './memory-garden.mjs';

const $ = id => document.getElementById(id);
// Same decoded-buffer looping strategy as the existing album. The MP4
// is remuxed without edits; Web Audio repeats the complete original track.
const audio=$('music'), play=$('play'), mute=$('mute'), status=$('audio-status');
const Context=window.AudioContext||window.webkitAudioContext;
const url=audio.getAttribute('data-src');
let mode=Context?'buffer':'native', wanted=true, muted=false, failed=false;
let context=null,gain=null,source=null,decoded=null,loading=null,nativePending=null,startedAt=0,offset=0;
const PLAY='M5 3h3v2h3v2h3v2h3v2h-3v2h-3v2H8v2H5z', PAUSE='M4 3h4v14H4zM12 3h4v14h-4z';
const active=()=>mode==='buffer'?!!source&&context?.state==='running':!audio.paused;
function sync(){const on=active()&&!failed;const label=on?'Pause background music':'Play background music';play.setAttribute('aria-label',label);play.title=label;$('play-glyph').setAttribute('d',on?PAUSE:PLAY);mute.setAttribute('aria-pressed',String(muted));const sound=muted?'Unmute background music':'Mute background music';mute.setAttribute('aria-label',sound);mute.title=sound;$('waves').toggleAttribute('hidden',muted);$('mute-glyph').toggleAttribute('hidden',!muted);}
function markFailed(){failed=true;play.disabled=true;mute.disabled=true;status.textContent='Background music is unavailable.';sync();}
function startBuffer(){if(mode!=='buffer'||!wanted||!decoded||source||context.state!=='running')return;const node=context.createBufferSource();node.buffer=decoded;node.loop=true;node.connect(gain);startedAt=context.currentTime;source=node;node.start(0,offset%decoded.duration);status.textContent='';sync();}
function pause(){if(mode==='buffer'&&source){offset=(offset+Math.max(0,context.currentTime-startedAt))%decoded.duration;source.stop();source.disconnect();source=null;}else if(mode==='native')audio.pause();sync();}
function applyMute(){audio.muted=muted;if(gain){const t=context.currentTime;gain.gain.cancelScheduledValues(t);gain.gain.setTargetAtTime(muted?0:1,t,.02);}sync();}
function fallback(){if(mode==='native')return;mode='native';if(source){source.stop();source.disconnect();source=null;}context?.close().catch(()=>{});audio.src=url;audio.muted=muted;status.textContent='Use the music control to start background music.';attempt();}
function nativePlay(){if(!audio.getAttribute('src'))audio.src=url;if(!audio.paused||nativePending)return;try{nativePending=Promise.resolve(audio.play()).then(()=>{if(!wanted)audio.pause();status.textContent='';}).catch(e=>{if(e.name==='NotAllowedError')status.textContent='Use the music control to start background music.';else if(e.name!=='AbortError')status.textContent='Background music could not start.';}).finally(()=>{nativePending=null;sync();});}catch{status.textContent='Background music could not start.';}}
function attempt(){if(!wanted||failed)return;if(mode==='native'){nativePlay();return;}try{if(!context){context=new Context();gain=context.createGain();gain.gain.value=muted?0:1;gain.connect(context.destination);context.addEventListener('statechange',()=>{if(context.state==='running')startBuffer();sync();});loading=fetch(url).then(r=>{if(!r.ok)throw Error('audio');return r.arrayBuffer();}).then(b=>context.decodeAudioData(b)).then(b=>{decoded=b;startBuffer();}).catch(()=>fallback());}
// Invoke resume directly during the eligible event, not after a fetch or timer.
context.resume().then(()=>{startBuffer();sync();}).catch(()=>{status.textContent='Use the music control to start background music.';sync();});if(context.state!=='running')status.textContent='Use the music control to start background music.';startBuffer();}catch{fallback();}}
function eligible(e){if(e.target instanceof Element&&e.target.closest('.audio-controls'))return;if(e.type==='keydown'&&(e.key==='Escape'||e.key==='Tab'||e.repeat||e.ctrlKey||e.metaKey||e.altKey))return;attempt();}
play.addEventListener('click',()=>{if(active()){wanted=false;pause();}else{wanted=true;attempt();}sync();});
mute.addEventListener('click',()=>{muted=!muted;applyMute();if(wanted)attempt();});
for(const event of ['pointerup','touchend','keydown','click'])document.addEventListener(event,eligible,{passive:true});
for(const event of ['play','pause','playing'])audio.addEventListener(event,sync);
audio.addEventListener('error',()=>{if(mode==='native')markFailed();});
// No visibility, orientation or resize handler seeks or recreates the source.
// An OS interruption can suspend playback; the next eligible gesture resumes it.
sync();attempt();

mountMemoryGarden();
