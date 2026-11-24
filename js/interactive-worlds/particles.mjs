import {clamp,seeded} from './draw.mjs';
const colors={Aurora:['#9ae6c9','#74cfe2','#a8a0f6','#dbaff0'],Sunset:['#f4b1bd','#ffc88c','#e98bc7','#b19cf5'],Cosmic:['#c4a8ff','#7d9aec','#f0a6e4','#94dce0'],Rainbow:['#fa92ae','#f6d28c','#a1e2ab','#88d5ef','#bda2f5']};
export function integrate(p,well,dt,mode,power,width,height){
 const dx=well.x-p.x,dy=well.y-p.y,d=Math.sqrt(dx*dx+dy*dy)+8,acc=power*880000/(d*d+1300),nx=dx/d,ny=dy/d;
 const ax=mode==='Vortex'?-ny*acc+nx*acc*.29:mode==='Repulsion'?-nx*acc:nx*acc;
 const ay=mode==='Vortex'?nx*acc+ny*acc*.29:mode==='Repulsion'?-ny*acc:ny*acc;
 p.vx=(p.vx+ax*dt)*Math.pow(.985,dt*60);p.vy=(p.vy+ay*dt)*Math.pow(.985,dt*60);
 const squaredSpeed=p.vx*p.vx+p.vy*p.vy;
 if(squaredSpeed>320*320){const scale=320/Math.sqrt(squaredSpeed);p.vx*=scale;p.vy*=scale}
 p.x+=p.vx*dt;p.y+=p.vy*dt;
 if(p.x<0||p.x>width){p.x=clamp(p.x,0,width);p.vx*=-.82}if(p.y<0||p.y>height){p.y=clamp(p.y,0,height);p.vy*=-.82}
 return p;
}
export function mount(api){
 const c=api.canvas(800,500),ctx=c.getContext('2d',{alpha:false});let pool=[],mode='Attraction',palette='Aurora',density=1800,power=1.2,speed=1,trails=true,pointerId=null,manual=false,groups=[],well={x:400,y:250},dirty=true;
 const random=seeded(614);
 function spawn(){let r=random()*Math.min(c.width,c.height)*.43,a=random()*Math.PI*2;return {x:c.width/2+Math.cos(a)*r,y:c.height/2+Math.sin(a)*r,vx:-Math.sin(a)*r*.5,vy:Math.cos(a)*r*.5,h:Math.floor(random()*12)}}
 function count(){return Math.min(density,{Low:650,Medium:1400,High:2400}[api.tier()]||1400)}
 function groupByColor(){
  groups=colors[palette].map(()=>[]);
  for(const p of pool)groups[p.h%groups.length].push(p);
 }
 function setCount(){const n=count();while(pool.length<n)pool.push(spawn());if(pool.length>n)pool.length=n;groupByColor()}
 function clear(){ctx.fillStyle='#071019';ctx.fillRect(0,0,c.width,c.height);dirty=false}
 function resize(){const before=[c.width,c.height];c.width={Low:480,Medium:800,High:1440}[api.tier()]||800;c.height=Math.round(c.width/1.6);for(const p of pool){p.x=p.x/before[0]*c.width;p.y=p.y/before[1]*c.height;p.vx*=c.width/before[0];p.vy*=c.height/before[1]}well.x*=c.width/before[0];well.y*=c.height/before[1];setCount();dirty=true}
 api.select('Force',['Attraction','Repulsion','Vortex'],v=>{mode=v;api.discover(v,v+' force discovered.')});
 api.button('Discover this force',()=>api.discover(mode,mode+' force discovered.'));
 api.select('Palette',Object.keys(colors),v=>{palette=v;groupByColor();dirty=true});
 api.range('Particles',250,2400,density,50,v=>{density=v;setCount();api.say(pool.length+' particles at this quality setting.')});
 api.range('Gravity',.2,3,power,.1,v=>power=v);
 api.range('Speed',.25,2,speed,.25,v=>speed=v);
 api.button('Trails on',b=>{trails=!trails;b.textContent=trails?'Trails on':'Trails off';b.setAttribute('aria-pressed',String(trails));dirty=true},true);
 api.button('Burst',()=>{for(const p of pool){p.vx+=(random()-.5)*220;p.vy+=(random()-.5)*220}api.say('Particle burst!')});
 api.button('Save PNG',()=>{const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='feje-particle-art.png';a.click();api.say('Your particle art is ready to save.')});
 function interact(e){const p=api.point(c,e);well.x=clamp(p.x,0,c.width);well.y=clamp(p.y,0,c.height);api.invalidate()}
 c.addEventListener('pointerdown',e=>{if(e.button>0||pointerId!==null)return;pointerId=e.pointerId;manual=true;interact(e);api.discover(mode,mode+' force discovered.');try{c.setPointerCapture(e.pointerId)}catch{}});
 c.addEventListener('pointermove',e=>{if(e.pointerId===pointerId||(pointerId===null&&e.pointerType==='mouse')){manual=true;interact(e)}});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(event,e=>{
  if(pointerId===e.pointerId){pointerId=null;manual=e.pointerType==='mouse'&&event==='pointerup'&&c.matches(':hover')}
 });
 c.addEventListener('pointerleave',()=>{if(pointerId===null)manual=false});
 c.addEventListener('blur',()=>{if(pointerId===null)manual=false});
 c.addEventListener('keydown',e=>{const map={ArrowLeft:[-22,0],ArrowRight:[22,0],ArrowUp:[0,-22],ArrowDown:[0,22]};if(map[e.key]){e.preventDefault();manual=true;well.x=clamp(well.x+map[e.key][0],0,c.width);well.y=clamp(well.y+map[e.key][1],0,c.height);api.discover(mode,mode+' force discovered.');api.invalidate()}});
 function draw(dt,t){if(dirty||!trails)clear();else if(dt>0){ctx.fillStyle='rgba(7,16,25,'+(1-Math.pow(.86,dt*60))+')';ctx.fillRect(0,0,c.width,c.height)}
  if(!manual&&dt>0){well.x=c.width*(.5+.23*Math.cos(t*.32));well.y=c.height*(.5+.23*Math.sin(t*.43))}
  const pal=colors[palette],step=Math.min(.05,dt*speed);
  if(step>0)for(const p of pool)integrate(p,well,step,mode,power,c.width,c.height);
  ctx.globalCompositeOperation='lighter';
  for(let j=0;j<pal.length;j++){ctx.fillStyle=pal[j];ctx.globalAlpha=.13;for(const p of groups[j])ctx.fillRect(p.x-2,p.y-2,5,5);if(api.tier()==='High'){ctx.globalAlpha=.035;for(const p of groups[j])ctx.fillRect(p.x-4,p.y-4,9,9)}
   ctx.globalAlpha=.65;for(const p of groups[j])ctx.fillRect(p.x,p.y,1.65,1.65)}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  const g=ctx.createRadialGradient(well.x,well.y,0,well.x,well.y,25);g.addColorStop(0,'#c7f6e54d');g.addColorStop(1,'#c7f6e500');ctx.fillStyle=g;ctx.fillRect(well.x-25,well.y-25,50,50);
 }
 return {draw,resize};
}
