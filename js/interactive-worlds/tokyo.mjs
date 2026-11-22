import {rect,poly,line,label,seeded,clamp} from './draw.mjs';
const districts=['Neon Crossing','Midnight Arcade','Skyline Station'];
const palettes=[['#e688d3','#80dded','#af8afa'],['#f0a781','#f290bd','#bc9afe'],['#96d9bb','#79cbe3','#e4b3eb']];
export function mount(api){
 const c=api.canvas(480,300,true),ctx=c.getContext('2d',{alpha:false});
 let district=0,weather=65,hour=0,neon=0,traffic=true,speed=1,offset=0;
 let buildings=[];function build(){const r=seeded(94+district*41);buildings=Array.from({length:18},(_,i)=>({x:i*32-36,h:50+Math.floor(r()*104),w:25+Math.floor(r()*20),seed:Math.floor(r()*1000)}))}build();
 const go=i=>{district=i;build();api.discover('district-'+i,'Welcome to '+districts[i]+'.')};
 api.select('Neighborhood',districts.map((d,i)=>[String(i),d]),v=>go(Number(v)));
 api.button('Discover this district',()=>go(district));
 api.range('Rain',0,100,weather,5,v=>weather=v);
 api.select('Time',[['0','Midnight'],['1','Sunrise'],['2','Blue hour']],v=>hour=+v);
 api.select('Neon theme',[['0','Rose'],['1','Sunset'],['2','Mint']],v=>neon=+v);
 api.button('Traffic on',b=>{traffic=!traffic;b.textContent=traffic?'Traffic on':'Traffic off';b.setAttribute('aria-pressed',String(traffic))},true);
 api.range('Motion',.25,2,1,.25,v=>speed=v);
 api.drag(c,(dx)=>{offset=clamp(offset+dx,-80,80)});
 function draw(dt,t){
  const colors=palettes[neon],time=t*speed,g=ctx.createLinearGradient(0,0,0,200);
  g.addColorStop(0,['#100e26','#8f557e','#192a53'][hour]);g.addColorStop(1,['#5d375e','#ecb19c','#685c99'][hour]);rect(ctx,0,0,480,300,g);
  rect(ctx,364,18,29,29,hour===1?'#ffddac':'#ded5f0');rect(ctx,369,15,19,35,hour===1?'#ffddac':'#ded5f0');
  for(let i=0;i<35;i++){if(hour!==1)rect(ctx,(i*73+13)%480,8+(i*29)%72,1,1,'#eadcff')}
  for(let i=0;i<23;i++){const x=i*24-10+offset*.15,h=24+(i*41+district*13)%78;rect(ctx,x,174-h,22,h,'#322944');rect(ctx,x+8,170-h,2,3,'#9b74a0')}
  for(const [i,b] of buildings.entries()){
   const x=Math.round(b.x+offset*.55),y=208-b.h,w=b.w;
   rect(ctx,x,y,w,b.h,i%3===0?'#2e253b':'#211e35');rect(ctx,x,y,w,3,'#685075');rect(ctx,x+w-4,y+4,4,b.h-4,'#372b49');
   if(i%4===2){rect(ctx,x+w/2,y-14,2,14,'#786689');rect(ctx,x+w/2-1,y-14,4,3,colors[1])}
   for(let row=0;row<Math.floor((b.h-9)/12);row++)for(let col=0;col<Math.floor((w-7)/8);col++){
    const a=(b.seed+row*11+col*7)%8;if(a>2)rect(ctx,x+4+col*8,y+8+row*12,4,6,a>5?'#c39fa4':'#5c557b');
   }
  }
  // Foreground streets and distinct shopfronts.
  rect(ctx,0,206,480,13,'#594059');rect(ctx,0,220,480,80,'#1e1a31');rect(ctx,0,218,480,4,'#b0809f');rect(ctx,0,269,480,4,'#57495c');
  for(let i=0;i<8;i++)rect(ctx,i*65,248,36,2,'#9d7794');
  for(let i=0;i<11;i++){const x=(i*47+17)%480;rect(ctx,x,207,26,5,'#1d172b')}
  const shops=district===0?['NEON','CAFE','PIXEL','24H']:district===1?['ARCADE','GAME','RAMEN','LOOP']:['STATION','LINE 02','SKY','METRO'];
  for(let i=0;i<4;i++){
   const x=22+i*116+offset*.25,y=122+(i%2)*10;
   rect(ctx,x,y,78,86,'#1d172b');rect(ctx,x+4,y+4,70,3,'#78577c');rect(ctx,x+7,y+38,64,40,'#403553');rect(ctx,x+10,y+41,58,35,i%2?'#684a59':'#3a6171');rect(ctx,x+39,y+40,3,39,'#201b30');
   rect(ctx,x+3,y+12,72,20,colors[i%3]);rect(ctx,x+6,y+15,66,14,'#2a1c37');label(ctx,shops[i],x+10,y+25,colors[i%3],8);
   rect(ctx,x-7,y-22,13,65,colors[(i+1)%3]);rect(ctx,x-5,y-20,9,61,'#231932');
   for(let row=0;row<5;row++){rect(ctx,x-3,y-16+row*11,5,2,colors[(i+1)%3]);rect(ctx,x-1,y-19+row*11,1,7,colors[(i+1)%3])}
   const alpha=weather/100*.22;if(alpha){ctx.globalAlpha=alpha;for(let j=0;j<6;j++)rect(ctx,x+4+j*10,226+j%2*7,4,12+j%3*11,colors[i%3]);ctx.globalAlpha=1}
  }
  // Street lanterns and reflections.
  for(let i=0;i<4;i++){let x=10+i*153;rect(ctx,x,187,3,32,'#82738f');rect(ctx,x,184,16,3,'#82738f');rect(ctx,x+11,187,6,3,'#ffddbd');ctx.globalAlpha=weather/300;rect(ctx,x+9,224,12,26,'#ffd3ba');ctx.globalAlpha=1}
  if(traffic){const count=api.tier()==='Low'?3:6;for(let i=0;i<count;i++){
   const right=i%2===0,px=(i*147+Math.floor(time*(right?37:23)))%560-40,x=right?px:480-px,y=right?231:258;
   const col=colors[i%3];poly(ctx,[[x,y],[x+10,y-7],[x+26,y-7],[x+34,y],[x+40,y+2],[x+40,y+10],[x,y+10]],col);
   rect(ctx,x+11,y-5,15,6,'#232136');rect(ctx,x+5,y+7,7,5,'#12101d');rect(ctx,x+30,y+7,7,5,'#12101d');rect(ctx,right?x+37:x,y+2,4,2,'#fff0bc');rect(ctx,right?x:x+37,y+2,4,2,'#f4779d');
   ctx.globalAlpha=weather/400;rect(ctx,x+3,y+13,37,9,col);ctx.globalAlpha=1;
  }}
  // Foreground rain uses deterministic, integer-pixel streaks.
  const count=Math.floor(weather*(api.tier()==='Low'?.65:1.3));for(let i=0;i<count;i++){let x=(i*97+Math.floor(time*17))%480,y=(i*59+Math.floor(time*(72+i%7*9)))%300;line(ctx,x,y,x-2,y+5+i%4,'#c0b7e35e')}
  rect(ctx,9,8,150,22,'#130e23cc');label(ctx,districts[district].toUpperCase(),17,22,colors[0],10);label(ctx,'NEO / '+(hour===0?'00:17':hour===1?'05:42':'18:30'),371,22,'#e5c9ee',9);
 }
 return {draw};
}
