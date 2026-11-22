import {rect,poly,line,label,seeded,clamp} from './draw.mjs';
export function mount(api){
 const c=api.canvas(480,300,true),ctx=c.getContext('2d',{alpha:false});
 let night=true,rain=true,lamp=true,computer=true,cat=false,car=false,drawer=false;
 const objects=[
 {id:'window',name:'Look outside',bounds:[37,49,103,86],act(){night=!night;api.discover('window',night?'Midnight has arrived.':'Good morning, little world!')}},
 {id:'computer',name:'Use computer',bounds:[232,78,134,73],act(){computer=!computer;api.discover('computer',computer?'Hello, world! The monitors are online.':'Even developers need rest.');}},
 {id:'lamp',name:'Toggle lamp',bounds:[380,73,41,81],act(){lamp=!lamp;api.discover('lamp',lamp?'Cozy mode activated.':'Lights out!');}},
 {id:'cat',name:'Pet cat',bounds:[153,191,74,48],act(){cat=true;api.discover('cat','Purr! You found the sleepy pixel cat.');}},
 {id:'car',name:'Inspect model car',bounds:[39,159,90,40],act(){car=!car;api.discover('car','Tiny hypercar, big dreams.');}}
 ];
 function choose(o){o.act();api.invalidate()}
 for(const o of objects)api.button(o.name,()=>choose(o));
 const rb=api.button('Rain on',b=>{rain=!rain;b.textContent=rain?'Rain on':'Rain off';b.setAttribute('aria-pressed',String(rain));api.say(rain?'A little rain outside.':'The sky is clear now.')},true);
 api.button('Secret drawer',()=>{drawer=!drawer;api.say(drawer?'You found a tiny note: keep learning, keep creating :)':'The drawer is closed.')});
 c.addEventListener('pointerdown',e=>{const p=api.point(c,e),o=objects.find(o=>{const [x,y,w,h]=o.bounds;return p.x>=x&&p.x<=x+w&&p.y>=y&&p.y<=y+h});if(o)choose(o)});
 function windowArt(t){
  rect(ctx,33,43,114,98,'#21172d');rect(ctx,38,48,104,88,night?'#201f41':'#779ad0');
  const sky=ctx.createLinearGradient(0,48,0,136);sky.addColorStop(0,night?'#171b39':'#91c3de');sky.addColorStop(1,night?'#69477b':'#f6c3aa');rect(ctx,40,50,100,84,sky);
  if(night){rect(ctx,112,58,12,12,'#efddba');rect(ctx,109,56,7,7,'#24213c');for(let i=0;i<13;i++)rect(ctx,44+(i*17)%91,54+(i*11)%37,1,1,'#eedffc')}
  else{rect(ctx,106,59,17,17,'#ffe5aa');rect(ctx,107,57,13,21,'#ffe5aa')}
  for(let i=0;i<10;i++){const x=40+i*10,h=12+(i*13)%30;rect(ctx,x,134-h,9,h,night?'#302b49':'#6d7b9f');for(let y=136-h;y<131;y+=6)if((i+y)%3!==0)rect(ctx,x+3,y,2,2,night?'#e4ae88':'#b3b8d6')}
  if(rain){ctx.save();ctx.beginPath();ctx.rect(40,50,100,84);ctx.clip();for(let i=0;i<(api.tier()==='Low'?15:api.tier()==='High'?40:25);i++){const x=40+(i*31)%101,y=50+(i*17+Math.floor(t*40))%84;line(ctx,x,y,x-2,y+8,night?'#98b1dc99':'#d6e9f4aa')}ctx.restore()}
  rect(ctx,87,49,5,86,'#483954');rect(ctx,40,91,100,4,'#483954');rect(ctx,35,134,110,5,'#987caa');
  rect(ctx,29,40,122,4,'#b69bd0');for(let i=0;i<4;i++){rect(ctx,29+i*5,44,4,96,i%2?'#634c89':'#8467a9');rect(ctx,132+i*5,44,4,96,i%2?'#634c89':'#8467a9')}
 }
 function draw(dt,t){
  const bg=ctx.createLinearGradient(0,0,480,300);bg.addColorStop(0,night?'#161226':'#675c86');bg.addColorStop(1,night?'#26172f':'#c6a6bd');rect(ctx,0,0,480,300,bg);
  poly(ctx,[[18,36],[218,9],[218,184],[18,218]],night?'#3a2b4d':'#8f7696');poly(ctx,[[218,9],[460,47],[460,216],[218,184]],night?'#473255':'#a186a5');poly(ctx,[[18,218],[218,184],[460,216],[271,292]],night?'#574052':'#b08a83');
  for(let i=0;i<10;i++){let x=18+i*24;line(ctx,x,218-i*4.1,x+253,292-i*7.6,night?'#3c2e44':'#92717c')}
  for(let i=0;i<9;i++){let x=38+i*29;line(ctx,x,215-i*4.5,x-2+122,259+i*3.5,night?'#6a4d61':'#c59a8f')}
  line(ctx,218,10,218,183,'#211729',3);line(ctx,20,216,218,184,'#a080a6',3);line(ctx,218,184,459,216,'#a080a6',3);
  windowArt(t);
  // Wall shelf and books.
  rect(ctx,154,54,48,5,'#21192d');rect(ctx,156,51,45,4,'#a88ab6');for(let i=0;i<6;i++){const h=11+(i*7)%11;rect(ctx,158+i*7,51-h,5,h,['#c28cbc','#799cb6','#e5bb8e'][i%3]);rect(ctx,159+i*7,53-h,3,1,'#e7d5ef')}
  rect(ctx,403,50,34,25,'#241b33');rect(ctx,406,53,28,19,'#b397d0');label(ctx,'>_',410,66,'#392a54',12);
  // Bed with pixel blanket and pillow.
  poly(ctx,[[25,145],[100,132],[167,166],[90,190]],'#211a31');poly(ctx,[[25,143],[100,130],[167,163],[90,183]],'#876aa9');poly(ctx,[[25,143],[90,183],[90,202],[25,162]],'#483453');poly(ctx,[[90,183],[167,163],[167,181],[90,202]],'#39283e');
  poly(ctx,[[28,141],[67,134],[95,148],[56,159]],'#e7d1ed');poly(ctx,[[65,149],[100,136],[164,164],[91,179]],'#b58dca');for(let i=0;i<4;i++)line(ctx,70+i*11,151+i*5,108+i*11,138+i*5,'#8f65ae',2);
  // Rug and low display table.
  poly(ctx,[[114,210],[232,191],[325,226],[204,269]],'#302846');poly(ctx,[[122,211],[232,197],[313,227],[204,262]],'#77578d');poly(ctx,[[133,212],[232,202],[298,227],[204,255]],'#513964');
  rect(ctx,35,169,94,7,'#a98bb6');rect(ctx,40,176,5,22,'#422e50');rect(ctx,116,176,5,19,'#422e50');
  // Tiny model car.
  poly(ctx,[[49,161],[60,153],[81,151],[91,155],[110,158],[117,165],[112,171],[49,171]],'#d68db9');
  poly(ctx,[[62,155],[80,153],[91,158],[59,158]],'#322541');rect(ctx,50,163,62,5,'#eab0d6');rect(ctx,55,168,12,5,'#241c32');rect(ctx,97,168,12,5,'#241c32');rect(ctx,111,161,5,3,car?'#fff4bd':'#9d799d');
  if(car){poly(ctx,[[116,160],[155,155],[155,171],[116,165]],'#f8dfaa22')}
  // Desk, PC tower, two monitors and keyboard.
  poly(ctx,[[218,137],[369,123],[441,151],[286,169]],'#ad86ac');poly(ctx,[[218,137],[286,169],[286,178],[218,146]],'#6d4d73');poly(ctx,[[286,169],[441,151],[441,160],[286,178]],'#77577f');
  rect(ctx,225,146,7,54,'#44304d');rect(ctx,280,175,7,57,'#44304d');rect(ctx,426,161,7,61,'#44304d');
  rect(ctx,250,80,59,45,'#221b31');rect(ctx,255,85,49,35,computer?'#243750':'#15101d');rect(ctx,316,86,58,44,'#221b31');rect(ctx,321,91,48,34,computer?'#26314c':'#15101d');rect(ctx,276,126,8,13,'#211a2e');rect(ctx,264,138,32,4,'#211a2e');rect(ctx,340,130,8,8,'#211a2e');rect(ctx,331,139,27,4,'#211a2e');
  if(computer){for(let i=0;i<7;i++){rect(ctx,260+(i%3)*3,90+i*4,9+(i*13)%28,2,['#9fb6ef','#d9a6e7','#83cbbd'][i%3])}for(let i=0;i<5;i++){rect(ctx,326,96+i*5,12+(i*11)%27,2,'#a897f5')}if(Math.floor(t*2)%2===0)rect(ctx,326,120,5,2,'#efdefa')}
  poly(ctx,[[272,150],[325,145],[344,154],[291,160]],'#252035');for(let i=0;i<7;i++)rect(ctx,281+i*6,151,4,2,'#b99bdc');
  rect(ctx,392,114,29,39,'#2a223b');rect(ctx,397,119,19,26,'#4d3867');rect(ctx,401,123,11,11,'#a893e3');rect(ctx,403,125,7,7,'#403455');rect(ctx,408,141,5,2,'#e2bfef');
  // Desk lamp and warm light.
  rect(ctx,395,79,4,41,'#d4b4a4');rect(ctx,387,119,21,4,'#cbb0a2');poly(ctx,[[389,78],[409,78],[417,97],[381,97]],lamp?'#ffe0b2':'#806d99');rect(ctx,382,96,34,3,'#bda0a6');
  if(lamp){const glow=ctx.createRadialGradient(399,105,2,399,105,74);glow.addColorStop(0,'#ffd4a744');glow.addColorStop(1,'#ffd4a700');rect(ctx,325,31,147,148,glow);}
  // Chair.
  rect(ctx,304,174,30,27,'#4a345f');rect(ctx,309,178,20,18,'#9276bf');rect(ctx,309,202,20,6,'#b89ad8');rect(ctx,316,208,5,18,'#29213c');line(ctx,304,227,334,225,'#29213c',4);
  // Drawers, optional note.
  rect(ctx,365,170,47,36,'#4d3557');for(let i=0;i<3;i++){rect(ctx,369,173+i*11,39,9,'#99769b');rect(ctx,386,176+i*11,7,2,'#e5c2de')}
  if(drawer){rect(ctx,362,166,46,18,'#e7d5d4');label(ctx,'keep going :)',365,176,'#49345d',5)}
  // Cat, stepped tail and tiny blink.
  const cy=cat?205:211;rect(ctx,171,cy+9,43,17,'#30243d');rect(ctx,176,cy+5,32,18,'#d3af9d');rect(ctx,163,cy+1,25,19,'#e9c8b3');rect(ctx,164,cy-4,7,9,'#e9c8b3');rect(ctx,181,cy-4,6,9,'#e9c8b3');rect(ctx,166,cy-2,3,4,'#cb91aa');rect(ctx,183,cy-2,2,4,'#cb91aa');
  if(cat&&Math.floor(t*3)%5!==0){rect(ctx,170,cy+7,2,5,'#3e2b47');rect(ctx,181,cy+7,2,5,'#3e2b47')}else{rect(ctx,169,cy+9,4,1,'#3e2b47');rect(ctx,180,cy+9,4,1,'#3e2b47')}
  rect(ctx,176,cy+13,3,2,'#da8caa');rect(ctx,205,cy+10,15,5,'#c49e99');rect(ctx,215,cy+Math.floor(t*2)%2*3+3,5,12,'#c49e99');
  if(cat){label(ctx,'♥',190,cy-7,'#f1a1ca',13)}else label(ctx,'z z',194,cy-7-Math.floor(t*2)%3,'#d7b9f2',9);
  label(ctx,night?'23:59 / RAINY LITTLE ROOM':'08:14 / GOOD MORNING',17,21,'#edd8ef',9);
  label(ctx,'tap objects or use the controls below',17,287,'#f1d8ef',8);
 }
 return {draw};
}
