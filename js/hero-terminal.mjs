const SLOT=2000, TRANSITION=320;
const PHRASES=['ITSMEFEJE.EXE','HELLO, WORLD!','feje@localhost:~$', "console.log('hi :)')", null, 'ENTERING MY WORLD'];
const GLYPHS='#$%&*+?@/|~▓▒░';
const glyph=random=>GLYPHS[Math.min(GLYPHS.length-1,Math.floor(random()*GLYPHS.length))];
export function terminalFrame(elapsed,random=Math.random){
  const t=Math.max(0,elapsed),slot=Math.floor(t/SLOT)%PHRASES.length,phase=t%SLOT;
  const transitioning=t>=SLOT&&phase<TRANSITION;
  const target=PHRASES[slot];
  let text;
  if(target===null)text='S.'+Array.from({length:9},()=>glyph(random)).join('');
  else if(transitioning){
    const revealed=Math.floor(target.length*phase/TRANSITION);
    text=Array.from(target,(c,i)=>i<revealed||c===' '?c:glyph(random)).join('');
  }else text=target;
  return {text,glitch:transitioning,slot,delay:target===null?Math.min(120,SLOT-phase):transitioning?Math.min(48,TRANSITION-phase):SLOT-phase};
}
export function mountTerminal(button,doc=document,win=window){
  const output=button.querySelector('[data-terminal-text]');
  if(!output)return;
  const motion=win.matchMedia('(prefers-reduced-motion: reduce)');
  const controller=new AbortController(),{signal}=controller;
  let visible=!('IntersectionObserver' in win),paused=false,suspended=false,timer=null,started=null,elapsed=0,observer;
  const time=()=>win.performance.now();
  function stop(){
    if(timer!==null){win.clearTimeout(timer);timer=null;}
    if(started!==null){elapsed+=time()-started;started=null;}
    button.classList.remove('is-running','is-glitching');
  }
  function paint(){
    timer=null;
    if(started===null)return;
    const frame=terminalFrame(elapsed+time()-started);
    output.textContent=frame.text;
    button.classList.toggle('is-glitching',frame.glitch);
    timer=win.setTimeout(paint,Math.max(1,Math.ceil(frame.delay)));
  }
  function sync(){
    button.disabled=motion.matches;
    button.setAttribute('aria-pressed',String(paused));
    if(motion.matches){stop();elapsed=0;output.textContent=PHRASES[0];return;}
    if(!visible||paused||doc.hidden||suspended){stop();return;}
    if(started!==null)return;
    started=time();button.classList.add('is-running');paint();
  }
  button.addEventListener('click',()=>{paused=!paused;sync();},{signal});
  doc.addEventListener('visibilitychange',sync,{signal});
  motion.addEventListener('change',sync,{signal});
  if('IntersectionObserver' in win){
    observer=new win.IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.15});
    observer.observe(button);
  }
  win.addEventListener('pagehide',event=>{
    suspended=true;stop();
    if(!event.persisted){observer?.disconnect();controller.abort();}
  },{signal});
  win.addEventListener('pageshow',()=>{suspended=false;sync();},{signal});
  sync();
}
if(typeof document!=='undefined'){
  const button=document.getElementById('hero-terminal');
  if(button)mountTerminal(button);
}
