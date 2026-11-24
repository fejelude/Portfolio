const $ = id => document.getElementById(id);
// Integer-coordinate sprites on low-resolution canvases; no personal artwork.
const flower = [
 '......oo....oo......','.....oppo..oppo.....','....oppppooppppo....','....ophhpoopphho....','....oppppppppppo....','.....oppppppppo.....','..ooooppppppppoooo..','.oppppppppppppppppo.','opphhppppyypppphhppo','opppppppyyyypppppppo','.oppppppyYyyppppppo.','..ooooppyYypppoooo..','.....oppppppppo.....','....oppppooppppo....','....opphpoopphpo....','.....oppo..oppo.....','......oo....oo......'];
const palette={o:'#c47396',p:'#f0b0c9',h:'#ffeaf4',y:'#f1d591',Y:'#fff8da'};
function sprite(ctx,x,y,pattern,colors,scale=1){pattern.forEach((row,j)=>[...row].forEach((ch,i)=>{if(colors[ch]){ctx.fillStyle=colors[ch];ctx.fillRect(x+i*scale,y+j*scale,scale,scale);}}));}
function drawEmblem(){const c=$('blossom').getContext('2d');sprite(c,6,7,flower,palette);c.fillStyle='#b18ac4';c.fillRect(3,5,1,3);c.fillRect(2,6,3,1);c.fillRect(28,24,1,5);c.fillRect(26,26,5,1);}
function drawGarden(){const c=$('garden').getContext('2d'); const xs=[14,31,52,78,104,124,144];xs.forEach((x,i)=>{let y=6+(i*7)%8;c.fillStyle='#85a98b';c.fillRect(x, y+5,1,23-y);c.fillRect(x-3,19,4,2);c.fillRect(x+1,16,4,2);sprite(c,x-3,y,['.o.o.','opppo','opypo','opppo','.ooo.'],i%3===1?{o:'#b18ac4',p:'#ded0ec',y:'#fff5db'}:palette);});c.fillStyle='#e1becd';c.fillRect(0,23,160,1);}
function random(i){const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);}
function drawGrove(){const canvas=$('grove'), w=Math.ceil(innerWidth/4),h=Math.ceil(innerHeight/4);canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');function rect(x,y,ww,hh,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),ww,hh);}
 // Two quiet, non-personal cherry trees framing the central window.
 for(const side of [0,1]){const x=side?w-14:14, dir=side?-1:1;const base=h-14, reach=Math.min(49,Math.floor(w*.21));for(let j=0;j<Math.min(100,h*.66);j++){rect(x+dir*Math.floor(j/14),base-j,5,1,'#ad8296');rect(x+dir*Math.floor(j/14)+1,base-j,2,1,'#c59aaa');}for(let b=0;b<5;b++){const start=base-22-b*13;for(let j=0;j<reach;j++){rect(x+dir*j,start-Math.floor(j*.65),3,2,'#bd93a7');}for(let k=0;k<32;k++){const xx=x+dir*(reach*.45+random(k+b*39+side*700)*reach*.77),yy=start-reach*.52+(random(k+311+b*39)-.5)*24;rect(xx,yy,3+Math.floor(random(k+80)*4),2+Math.floor(random(k+11)*3),['#e6a9c5','#f3c0d6','#fbe0e9','#d9b6dc'][k%4]);}}}
 for(let i=0;i<32;i++){let x=random(i+200)*w,y=random(i+400)*h;rect(x,y,1,3,'#fffaf0');rect(x-1,y+1,3,1,'#fffaf0');}
}
function initPetals(){const f=document.createDocumentFragment();for(let i=0;i<18;i++){const p=document.createElement('i');p.className='petal';p.style.left=`${random(i+100)*100}%`;p.style.setProperty('--duration',`${14+random(i+40)*13}s`);p.style.setProperty('--delay',`${-random(i+90)*25}s`);p.style.setProperty('--drift',`${Math.round((random(i+50)-.5)*120)}px`);f.append(p);} $('petals').append(f);}
drawEmblem();drawGarden();drawGrove();initPetals();let frame=0;addEventListener('resize',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(drawGrove);},{passive:true});
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
