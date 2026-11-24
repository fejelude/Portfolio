import {rect,poly,line,label,seeded,clamp} from './draw.mjs';
const districts=['Neon Crossing','Midnight Arcade','Skyline Station'];
const palettes=[['#e688d3','#80dded','#af8afa'],['#f0a781','#f290bd','#bc9afe'],['#96d9bb','#79cbe3','#e4b3eb']];
const skies=[[16,14,38,93,55,94],[143,85,126,236,177,156],[25,42,83,104,92,153]];
const shops=[['NEON','CAFE','PIXEL','24H'],['ARCADE','GAME','RAMEN','LOOP'],['STATION','LINE 02','SKY','METRO']];
export function mount(api){
 const c=api.canvas(480,300,true),ctx=c.getContext('2d',{alpha:false});
 let district=0,weather=65,hour=0,neon=0,traffic=true,speed=1,offset=0;
 let time=0,rainLevel=weather,sky=[...skies[hour]];
 // Cache the opaque street scene at native pixel resolution. Moving traffic,
 // weather and reflections are drawn onto the visible canvas each frame.
 const backdrop=c.ownerDocument?.createElement('canvas');
 if(backdrop){backdrop.width=c.width;backdrop.height=c.height}
 const scenery=backdrop?.getContext('2d',{alpha:false});
 let previousScene='';
 let buildings=[];
 function build(){
  const r=seeded(94+district*41);
  buildings=Array.from({length:20},(_,i)=>({x:i*32-65,h:50+Math.floor(r()*104),w:25+Math.floor(r()*20),seed:Math.floor(r()*1000)}));
 }
 build();
 const go=i=>{district=i;build();api.discover('district-'+i,'Welcome to '+districts[i]+'.')};
 api.select('Neighborhood',districts.map((d,i)=>[String(i),d]),v=>go(Number(v)));
 api.button('Discover this district',()=>go(district));
 api.range('Rain',0,100,weather,5,v=>weather=v);
 api.select('Time',[['0','Midnight'],['1','Sunrise'],['2','Blue hour']],v=>hour=+v);
 api.select('Neon theme',[['0','Rose'],['1','Sunset'],['2','Mint']],v=>neon=+v);
 api.button('Traffic on',b=>{traffic=!traffic;b.textContent=traffic?'Traffic on':'Traffic off';b.setAttribute('aria-pressed',String(traffic))},true);
 api.range('Motion',.25,2,1,.25,v=>speed=v);
 api.drag(c,(dx)=>{offset=clamp(offset+dx,-80,80)});
 function drawBuildings(target,shift){
  for(const [i,b] of buildings.entries()){
   const x=Math.round(b.x+shift),y=208-b.h,w=b.w;
   rect(target,x,y,w,b.h,i%3===0?'#2e253b':'#211e35');rect(target,x,y,w,3,'#685075');rect(target,x+w-4,y+4,4,b.h-4,'#372b49');
   if(i%4===2){rect(target,x+w/2,y-14,2,14,'#786689');rect(target,x+w/2-1,y-14,4,3,palettes[neon][1])}
   if(i%3===0){rect(target,x+5,y-5,11,5,'#4c4056');rect(target,x+6,y-6,10,1,'#80647b')}
   for(let row=0;row<Math.floor((b.h-9)/12);row++)for(let col=0;col<Math.floor((w-7)/8);col++){
    const a=(b.seed+row*11+col*7)%8;if(a>2)rect(target,x+4+col*8,y+8+row*12,4,6,a>5?'#c39fa4':'#5c557b');
   }
  }
 }
 function train(colors){
  // A commuter train passes above the shopping street.
  const x=(time*24+130)%760-190+offset*.4;
  for(let i=0;i<3;i++){
   const car=x+i*55;rect(ctx,car,77,53,15,'#aca4b8');rect(ctx,car,87,53,3,colors[1]);
   for(let j=0;j<5;j++)rect(ctx,car+j*10+3,80,7,5,'#41475f');
   rect(ctx,car+46,79,4,10,'#79798b');
  }
 }
 function reflection(x,y,width,color,phase){
  if(rainLevel<1)return;
  ctx.globalAlpha=rainLevel*.0028;
  for(let i=0;i<5;i++){
   const ripple=Math.sin(time*2+phase+i*1.9);
   rect(ctx,x+Math.round(ripple*2)-width*.5,y+i*(2+i*.3),width*(1-i*.13),1+i%2,color);
  }
  ctx.globalAlpha=1;
 }
 function drawScenery(ctx,colors){
  const g=ctx.createLinearGradient(0,0,0,200);
  g.addColorStop(0,'rgb('+sky.slice(0,3).map(Math.round)+')');g.addColorStop(1,'rgb('+sky.slice(3).map(Math.round)+')');rect(ctx,0,0,480,300,g);
  rect(ctx,364,18,29,29,hour===1?'#ffddac':'#ded5f0');rect(ctx,369,15,19,35,hour===1?'#ffddac':'#ded5f0');
  if(hour!==1)for(let i=0;i<35;i++)rect(ctx,(i*73+13)%480,8+(i*29)%72,1,1,'#eadcff');
  for(let i=-1;i<23;i++){const x=i*24-10+offset*.15,h=24+(i*41+district*13)%78;rect(ctx,x,174-h,22,h,'#322944');rect(ctx,x+8,170-h,2,3,'#9b74a0')}
  drawBuildings(ctx,offset*.55);
  if(district===2){
   rect(ctx,0,93,480,5,'#79677e');rect(ctx,0,98,480,4,'#322e43');
   for(let i=-1;i<6;i++)rect(ctx,20+i*112+offset*.45,102,7,104,'#3e344a');
  }
  // Foreground streets and distinct shopfronts.
  rect(ctx,0,206,480,13,'#594059');rect(ctx,0,220,480,80,'#1e1a31');rect(ctx,0,218,480,4,'#b0809f');rect(ctx,0,269,480,4,'#57495c');
  for(let i=0;i<8;i++)rect(ctx,i*65,248,36,2,'#9d7794');
  for(let i=0;i<11;i++){const x=(i*47+17)%480;rect(ctx,x,207,26,5,'#1d172b')}
  if(district===0){
   const x=202+offset*.85;
   rect(ctx,x+29,181,3,36,'#8a788a');rect(ctx,x+25,173,13,16,'#32283a');
   rect(ctx,x+29,176,4,4,colors[1]);rect(ctx,x+29,182,4,4,'#68515a');
   for(let j=0;j<7;j++){const y=224+j*10;poly(ctx,[[x-j*3,y],[x+28+j,y],[x+31+j,y+4+j*.3],[x-3-j*3,y+4+j*.3]],'#93839b')}
  }
  for(let k=-1;k<=4;k++){
   const i=(k+4)%4,x=22+k*116+offset*.85,y=122+(i%2)*10;
   if(x>480||x+82<0)continue;
   rect(ctx,x,y,78,86,'#1d172b');rect(ctx,x+4,y+4,70,3,'#78577c');rect(ctx,x+7,y+38,64,40,'#403553');rect(ctx,x+10,y+41,58,35,i%2?'#684a59':'#3a6171');rect(ctx,x+39,y+40,3,39,'#201b30');
   rect(ctx,x+3,y+12,72,20,colors[i%3]);rect(ctx,x+6,y+15,66,14,'#2a1c37');label(ctx,shops[district][i],x+10,y+25,colors[i%3],8);
   if(district===1){
    for(let j=0;j<3;j++){
     const px=x+12+j*19;
     rect(ctx,px,y+47,12,25,'#29243a');rect(ctx,px+2,y+49,8,7,colors[(i+j)%3]);rect(ctx,px+1,y+59,11,3,'#80627e');
     rect(ctx,px+4,y+63,2,2,'#e4a6c5');
    }
   }else{
    rect(ctx,x+4,y+35,70,4,district===0?'#ba829d':'#78949e');
    for(let j=0;j<4;j++)rect(ctx,x+6+j*17,y+39,8,3,'#a598aa');
    rect(ctx,x+46,y+51,12,7,'#b6a2ab');rect(ctx,x+49,y+53,7,1,'#54495e');
   }
   rect(ctx,x-7,y-22,13,65,colors[(i+1)%3]);rect(ctx,x-5,y-20,9,61,'#231932');
   for(let row=0;row<5;row++){rect(ctx,x-3,y-16+row*11,5,2,colors[(i+1)%3]);rect(ctx,x-1,y-19+row*11,1,7,colors[(i+1)%3])}
  }
  // Street lanterns and reflections.
  for(let i=-1;i<5;i++){let x=10+i*153+offset;rect(ctx,x,187,3,32,'#82738f');rect(ctx,x,184,16,3,'#82738f');rect(ctx,x+11,187,6,3,'#ffddbd')}
 }
 function draw(dt){
  time+=dt*speed;
  const blend=dt>0?1-Math.exp(-dt*5):1;
  rainLevel+=(weather-rainLevel)*blend;
  for(let i=0;i<sky.length;i++)sky[i]+=(skies[hour][i]-sky[i])*blend;
  const colors=palettes[neon];
  if(scenery){
   const scene=[district,neon,hour,Math.round(offset*2),...sky.map(Math.round)].join('/');
   if(previousScene!==scene){drawScenery(scenery,colors);previousScene=scene}
   ctx.drawImage(backdrop,0,0);
  }else drawScenery(ctx,colors);
  if(district===2&&traffic)train(colors);
  for(let k=-1;k<=4;k++){
   const i=(k+4)%4,x=22+k*116+offset*.85;
   if(x>480||x+82<0)continue;
   reflection(x+37,224,54,colors[i%3],i);reflection(x-1,237,11,colors[(i+1)%3],i+3);
  }
  for(let i=-1;i<5;i++){
   const x=10+i*153+offset;
   if(x>=-20&&x<=480)reflection(x+14,224,10,'#ffd3ba',i);
  }
  if(traffic){const count=api.tier()==='Low'?3:api.tier()==='High'?8:6;for(let i=0;i<count;i++){
   const right=i%2===0,px=(i*147+Math.floor(time*(right?37:23)))%560-40,x=right?px:480-px,y=right?231:258;
   const col=colors[i%3];poly(ctx,[[x,y],[x+10,y-7],[x+26,y-7],[x+34,y],[x+40,y+2],[x+40,y+10],[x,y+10]],col);
   rect(ctx,x+11,y-5,15,6,'#232136');rect(ctx,x+5,y+7,7,5,'#12101d');rect(ctx,x+30,y+7,7,5,'#12101d');rect(ctx,right?x+37:x,y+2,4,2,'#fff0bc');rect(ctx,right?x:x+37,y+2,4,2,'#f4779d');
   rect(ctx,x+18,y-4,2,5,'#62526c');rect(ctx,x+4,y+5,31,1,'#e9d3e280');
   reflection(x+21,y+14,31,col,i);reflection(right?x+38:x+2,y+13,8,'#ffe1a1',i);
  }}
  if(api.tier()==='High'){
   for(let i=0;i<26;i++){const x=(i*73+19)%478,y=270+(i*17)%27;rect(ctx,x,y,3+i%8,1,'#b9a1dc38')}
   if(rainLevel>8)for(let i=0;i<16;i++){const x=(i*83+41)%480,y=225+(i*31)%73,p=(Math.floor(time*12)+i)%9;if(p<5){line(ctx,x-p,y,x+p,y,'#b7c7e454');rect(ctx,x,y-1,1,1,'#d6e9fa80')}}
  }
  // Foreground rain uses deterministic, integer-pixel streaks.
  const count=Math.floor(rainLevel*(api.tier()==='Low'?.65:api.tier()==='High'?1.85:1.3));for(let i=0;i<count;i++){let x=(i*97+Math.floor(time*17))%480,y=(i*59+Math.floor(time*(72+i%7*9)))%300;line(ctx,x,y,x-2,y+5+i%4,'#c0b7e35e')}
  rect(ctx,9,8,150,22,'#130e23cc');rect(ctx,365,8,106,22,'#130e23cc');label(ctx,districts[district].toUpperCase(),17,22,colors[0],10);label(ctx,'NEO / '+(hour===0?'00:17':hour===1?'05:42':'18:30'),371,22,'#e5c9ee',9);
 }
 return {draw};
}
