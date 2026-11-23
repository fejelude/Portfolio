import {getProgress,clearProgress,deviceStorage} from './progress.mjs';
const storage=deviceStorage(),body=document.body,cards=[...document.querySelectorAll('[data-iw-card]')],motion=matchMedia('(prefers-reduced-motion: reduce)'),toggle=document.getElementById('iw-motion');
const dragon=document.querySelector('[data-iw-dragon]');
const observed=dragon?[...cards,dragon]:cards;
const heroCursor=document.querySelector('[data-iw-hero-cursor]');
if(heroCursor)observed.push(heroCursor);
let paused=false,suspended=false,observer,loadSerpent,setSerpentRunning;
function syncSerpent(){
 const running=dragon?.hasAttribute('data-visible')&&!paused&&!motion.matches&&!document.hidden&&!suspended;
 if(setSerpentRunning){setSerpentRunning(running);return}
 if(running&&!loadSerpent){
  loadSerpent=import('./serpent.mjs').then(({mountSerpent})=>{
   setSerpentRunning=mountSerpent(dragon.querySelector('canvas'));
   syncSerpent();
  }).catch(()=>{}); // The poster remains visible if animation cannot load.
 }
}
function sync(){const off=paused||motion.matches||document.hidden;body.toggleAttribute('data-motion-paused',off);toggle.disabled=motion.matches;toggle.textContent=motion.matches?'Reduced motion':paused?'Resume motion':'Pause motion';toggle.setAttribute('aria-pressed',String(off));syncSerpent()}
function progress(){const earned=getProgress(storage);document.getElementById('iw-count').textContent=earned.length+' / 6';document.getElementById('iw-progress').value=earned.length;for(const badge of document.querySelectorAll('[data-iw-badge]')){const collected=earned.includes(badge.dataset.iwBadge);badge.toggleAttribute('data-earned',collected);badge.setAttribute('role','img');badge.setAttribute('aria-label',badge.title+(collected?', collected':', uncollected'))}body.toggleAttribute('data-complete',earned.length===6);document.getElementById('iw-reward').textContent=earned.length===6?'6/6! Secret unlocked :)':storage.temporary?'Device storage is unavailable. Your badges are temporary.':'Finish each world’s challenge to get a badge. Your progress is saved here.'}
const stars=document.querySelector('.iw-stars');for(let i=0;i<35;i++){const star=document.createElement('i');star.style.setProperty('--x',((i*37+17)%100)+'%');star.style.setProperty('--y',((i*61+9)%100)+'%');star.style.setProperty('--delay',-(i%7)*.7+'s');stars.append(star)}
if('IntersectionObserver' in window){observer=new IntersectionObserver(items=>{for(const item of items)item.target.toggleAttribute('data-visible',item.isIntersecting);syncSerpent()},{threshold:.1});observed.forEach(item=>observer.observe(item))}else observed.forEach(item=>item.setAttribute('data-visible',''));
toggle.addEventListener('click',()=>{paused=!paused;sync()});const clear=document.getElementById('iw-clear');clear.disabled=false;clear.addEventListener('click',()=>{if(confirm('Reset your six world badges on this device?')){clearProgress(storage);progress()}});
motion.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);window.addEventListener('pageshow',()=>{suspended=false;progress();sync()});window.addEventListener('pagehide',e=>{suspended=true;syncSerpent();if(!e.persisted)observer?.disconnect()});window.addEventListener('storage',progress);progress();sync();
