// The same six paths bloom, spiral inward, then reshape into the cake.
// No media, audio, birthday timeline, or album data is changed here.
const BLOOM = [[100.0, 108.0, 116.0, 122.0, 124.0, 151.0, 112.0, 178.0, 106.0, 191.0, 100.0, 193.0, 100.0, 198.0, 99.0, 182.0, 75.0, 159.0, 82.0, 136.0, 86.0, 120.0, 96.0, 112.0, 100.0, 108.0], [100.0, 108.0, 82.291, 114.034, 56.67, 107.37, 41.373, 86.345, 34.106, 76.053, 35.221, 70.6, 31.411, 68.4, 44.044, 74.678, 72.133, 66.507, 86.581, 81.962, 97.015, 92.051, 98.712, 103.192, 100.0, 108.0], [100.0, 108.0, 104.124, 87.144, 125.239, 65.715, 154.622, 62.608, 168.88, 61.304, 173.612, 65.5, 177.942, 63.0, 164.586, 71.866, 156.667, 104.151, 133.249, 109.588, 117.392, 114.124, 105.464, 109.464, 100.0, 108.0], [100.0, 108.0, 96.371, 126.354, 77.79, 145.21, 51.933, 147.945, 39.386, 149.093, 35.221, 145.4, 31.411, 147.6, 43.164, 139.798, 50.133, 111.387, 70.741, 106.602, 84.695, 102.611, 95.192, 106.712, 100.0, 108.0], [100.0, 108.0, 120.124, 101.144, 149.239, 108.715, 166.622, 132.608, 174.88, 144.304, 173.612, 150.5, 177.942, 153.0, 163.586, 145.866, 131.667, 155.151, 115.249, 137.588, 103.392, 126.124, 101.464, 113.464, 100.0, 108.0], [100.0, 108.0, 85.92, 95.68, 78.88, 70.16, 89.44, 46.4, 94.72, 34.96, 100.0, 33.2, 100.0, 28.8, 100.88, 42.88, 122.0, 63.12, 115.84, 83.36, 112.32, 97.44, 103.52, 104.48, 100.0, 108.0]];
const BUD = [[100.0, 108.0, 96.658, 101.469, 94.133, 84.457, 95.186, 65.924, 95.731, 56.97, 96.703, 54.889, 96.509, 51.765, 97.305, 61.624, 102.396, 72.671, 102.063, 88.011, 101.984, 98.563, 100.545, 104.947, 100.0, 108.0], [100.0, 108.0, 96.83, 100.453, 94.73, 82.72, 96.231, 64.586, 96.993, 55.836, 98.012, 54.065, 97.895, 50.893, 98.447, 60.962, 103.249, 73.551, 102.543, 88.73, 102.207, 99.216, 100.617, 105.128, 100.0, 108.0], [100.0, 108.0, 97.026, 99.495, 95.367, 81.176, 97.304, 63.578, 98.277, 55.098, 99.336, 53.652, 99.297, 50.455, 99.601, 60.657, 104.077, 74.693, 103.004, 89.595, 102.412, 99.936, 100.685, 105.331, 100.0, 108.0], [100.0, 108.0, 97.245, 98.602, 96.039, 79.836, 98.399, 62.908, 99.575, 54.763, 100.664, 53.652, 100.703, 50.455, 100.757, 60.713, 104.875, 76.089, 103.441, 90.6, 102.6, 100.718, 100.747, 105.554, 100.0, 108.0], [100.0, 108.0, 97.485, 97.78, 96.742, 78.711, 99.505, 62.581, 100.875, 54.833, 101.988, 54.065, 102.105, 50.893, 101.908, 61.129, 105.634, 77.728, 103.853, 91.737, 102.768, 101.555, 100.804, 105.796, 100.0, 108.0], [100.0, 108.0, 97.744, 97.036, 97.469, 77.808, 100.616, 62.6, 102.169, 55.308, 103.297, 54.889, 103.491, 51.765, 103.045, 61.901, 106.352, 79.597, 104.235, 92.998, 102.915, 102.441, 100.855, 106.055, 100.0, 108.0]];
const CAKE = [[36, 140, 36, 131, 164, 131, 164, 140, 164, 149, 36, 149, 36, 140, 36, 140, 36, 140, 36, 140, 36, 140, 36, 140, 36, 140], [49, 91, 49, 78, 151, 78, 151, 91, 151, 106, 151, 123, 151, 133, 151, 146, 49, 146, 49, 133, 49, 121, 49, 105, 49, 91], [49, 88, 49, 69, 151, 69, 151, 88, 151, 100, 128, 104, 100, 104, 72, 104, 49, 100, 49, 88, 49, 88, 49, 88, 49, 88], [49, 87, 58, 97, 79, 101, 101, 101, 104, 117, 91, 120, 88, 106, 83, 105, 80, 127, 72, 111, 68, 104, 55, 120, 49, 101], [100, 101, 122, 102, 143, 95, 151, 87, 151, 105, 147, 117, 140, 107, 135, 100, 132, 125, 122, 111, 116, 108, 110, 116, 100, 101], [49, 126, 72, 136, 128, 136, 151, 126, 151, 128, 151, 130, 151, 132, 127, 142, 73, 142, 49, 132, 49, 130, 49, 128, 49, 126]];
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => { x=clamp(x); return x*x*(3-2*x); };
const mix = (a,b,t) => a.map((v,i)=>v+(b[i]-v)*t);
export function pathData(points) {
  return `M${points.slice(0,2).join(',')} ${[2,8,14,20].map(i=>`C${points.slice(i,i+6).join(',')}`).join(' ')}Z`;
}
export function petalAt(index, time) {
  if(time<2.2)return mix(BUD[index],BLOOM[index],ease(time/2.2));
  if(time<4)return BLOOM[index];
  const turn=ease((time-4)/1.25),theta=turn*(Math.PI*1.25+index*.08),scale=1-turn*.68;
  const swirl=BLOOM[index].map((v,j,a)=>{
    const x=a[j-j%2]-100,y=a[j-j%2+1]-108;
    return j%2 ? 108-turn*7+(x*Math.sin(theta)+y*Math.cos(theta))*scale : 100+(x*Math.cos(theta)-y*Math.sin(theta))*scale;
  });
  if(time<5.25)return swirl;
  // This exact bundled silhouette is both the end and start of the two phases.
  const angle=Math.PI*1.25+index*.08;
  const bundle=BLOOM[index].map((v,j,a)=>{
    const x=a[j-j%2]-100,y=a[j-j%2+1]-108;
    return j%2 ? 101+(x*Math.sin(angle)+y*Math.cos(angle))*.32 : 100+(x*Math.cos(angle)-y*Math.sin(angle))*.32;
  });
  return mix(bundle,CAKE[index],ease((time-5.25)/.85));
}

if(typeof document!=='undefined')initLily();
function initLily(){
  const button=document.getElementById('lily-cake'),welcome=document.getElementById('welcome');
  if(!button||!welcome)return;
  const $=selector=>button.querySelector(selector),petals=[...button.querySelectorAll('[data-lily-petal]')];
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),life=new AbortController(),opts={signal:life.signal};
  const art=$('[data-lily-art]'),details=$('[data-lily-details]'),cakeDetails=$('[data-lily-cake-details]'),stem=$('[data-lily-stem]'),glow=$('[data-lily-glow]'),orbit=[...$('[data-lily-orbit]').children];
  const svgNS='http://www.w3.org/2000/svg';
  const overlay=document.createElementNS(svgNS,'svg');overlay.classList.add('birthday-lily-confetti');overlay.setAttribute('aria-hidden','true');overlay.setAttribute('focusable','false');document.body.append(overlay);
  let raf=0,last=0,time=0,ready=false,autoBurst=false,disposed=false,bumpTimer=0,lastTap=-1000;
  let particles=[];
  const visible=()=>!document.hidden&&!welcome.hidden&&!welcome.classList.contains('is-leaving')&&getComputedStyle(button).display!=='none';
  const gradients=[...button.querySelectorAll('linearGradient[id^="lily-pink-"]')];
  const cakeColors=[['#fff5fc','#eed9eb','#d9acd0'],['#ffd6e8','#f6afce','#de85ad'],['#fff7fc','#ffe6f2','#f7c6df'],['#fff9fc','#fff0f8','#f5bfda'],['#fff9fc','#fff0f8','#f5bfda'],['#eea6c9','#e895bc','#d977a8']];
  function color(a,b,t){const parts=[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t));return `rgb(${parts.join(',')})`;}
  function render(t){
    petals.forEach((path,i)=>path.setAttribute('d',pathData(petalAt(i,t))));
    const sway=1-ease((t-3.5)/.5);
    art.setAttribute('transform',`translate(0 ${Math.sin(t*1.4)*1.5*sway}) rotate(${Math.sin(t*.9)*1.1*sway} 100 108)`);
    const morph=ease((t-5.25)/.85);
    gradients.forEach((g,i)=>[...g.children].forEach((s,j)=>s.setAttribute('stop-color',color(['#fff1f8','#f9add0','#d85b96'][j],cakeColors[i][j],morph))));
    details.style.opacity=String(ease((t-.8)/1.4)*(1-ease((t-4)/.7)));
    stem.style.opacity=String(1-ease((t-4)/.7));
    cakeDetails.style.opacity=String(ease((t-5.8)/.5));
    $('[data-lily-flame]').style.opacity=String(ease((t-6.25)/.6));
    glow.style.opacity=String(.45+Math.sin(clamp((t-4)/2)*Math.PI)*.4);
    orbit.forEach((star,i)=>{const angle=i*Math.PI/5+t*(t<4?.25:1.1),r=62+Math.sin(t*1.2+i)*8;star.setAttribute('transform',`translate(${100+Math.cos(angle)*r} ${95+Math.sin(angle)*r*.8}) scale(${.45+(1+Math.sin(t*2+i))*.24})`);star.style.opacity=String((t<6?ease((t-1)/2):1-ease((t-7)/2))*.8);});
    button.dataset.phase=t<2.2?'bud':t<4?'bloom':t<6.1?'transform':t<7?'candle':'celebrate';
  }
  function finish(){ready=true;button.disabled=false;button.dataset.ready='true';button.dataset.phase='cake';button.setAttribute('aria-label','Celebrate Sofhia’s birthday — tap the pink cake');}
  function burst(count){
    if(motion.matches||!visible())return;
    overlay.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);
    const rect=button.getBoundingClientRect(),x=rect.x+rect.width/2,y=rect.y+rect.height/2;
    const colors=['#ee95bd','#fff5fc','#c9b1e3','#f8bad4'];
    for(let i=0;i<count&&particles.length<56;i++){
      const kind=i%5,node=document.createElementNS(svgNS,'path');
      node.setAttribute('d',kind===0?'M0 2C-9-3-7-10-2-7L0-5L2-7C7-10 9-3 0 2Z':kind===1?'M0-5L1-1L5 0L1 1L0 5L-1 1L-5 0L-1-1Z':kind===2?'M0-5Q8-2 0 6Q-5 0 0-5Z':'M-2-4H2V4H-2Z');
      node.setAttribute('fill',colors[i%4]);overlay.append(node);
      const a=-Math.PI*.95+(i/(count-1))*Math.PI*.9;
      particles.push({node,x,y,vx:Math.cos(a)*(32+(i%7)*13),vy:Math.sin(a)*(70+(i%6)*13)-25,age:0,life:1.7+(i%5)*.15,spin:(i%2?1:-1)*(40+i*9),size:.4+(i%4)*.15});
    }
    schedule();
  }
  function frame(now){
    raf=0;if(disposed||!visible()){last=0;clearParticles();return;}
    const dt=last?Math.min((now-last)/1000,.05):0;last=now;
    if(!ready){time+=dt;render(time);if(time>=7&&!autoBurst){autoBurst=true;burst(40);}if(time>=9.3)finish();}
    particles=particles.filter(p=>{
      p.age+=dt;if(p.age>=p.life){p.node.remove();return false;}
      p.x+=p.vx*dt;p.vy+=72*dt;p.y+=p.vy*dt;
      p.node.setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${p.age*p.spin}) scale(${p.size})`);
      p.node.style.opacity=String(Math.min(1,(p.life-p.age)*2));return true;
    });
    if(!ready||particles.length)schedule();else last=0;
  }
  function schedule(){if(!raf&&!disposed&&visible()&&(!ready||particles.length))raf=requestAnimationFrame(frame);}
  function clearParticles(){particles.forEach(p=>p.node.remove());particles=[];}
  function suspend(){cancelAnimationFrame(raf);raf=0;last=0;clearParticles();}
  function reduced(){if(!motion.matches)return;time=9.3;autoBurst=true;render(time);finish();suspend();}
  button.addEventListener('click',()=>{
    if(!ready||!visible()||performance.now()-lastTap<700)return;lastTap=performance.now();
    button.classList.remove('is-celebrating');void button.offsetWidth;button.classList.add('is-celebrating');
    clearTimeout(bumpTimer);bumpTimer=setTimeout(()=>button.classList.remove('is-celebrating'),650);burst(22);
  },opts);
  document.addEventListener('visibilitychange',()=>document.hidden?suspend():schedule(),opts);
  document.getElementById('start')?.addEventListener('click',suspend,opts);
  motion.addEventListener('change',reduced,opts);
  const observer=new MutationObserver(()=>visible()?schedule():suspend());observer.observe(welcome,{attributes:true,attributeFilter:['hidden','class']});
  addEventListener('resize',()=>{clearParticles();schedule();},opts);
  addEventListener('pagehide',event=>{suspend();if(!event.persisted){disposed=true;life.abort();observer.disconnect();overlay.remove();clearTimeout(bumpTimer);}},opts);
  addEventListener('pageshow',()=>schedule(),opts);
  render(0);reduced();schedule();
}
