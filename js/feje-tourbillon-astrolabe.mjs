// Integer sprites for the small header instrument. Angles use the Manila
// clock supplied by the watch controller, even while scene motion is paused.
export const SKY_PERIOD=20;
const TAU=2*Math.PI;
const SIZE=88,CENTER=44;
export function astrolabeTime({hour,minute,second=0}){
 const hourPhase=(hour+minute/60+second/3600)/24;
 return {hourPhase,minutePhase:(minute+second/60)/60,day:hour>=6&&hour<18};
}
const colors={
 dark:'#121c3b',shadow:'#352236',bronze:'#98704f',gold:'#deb27b',light:'#ffe3a3',
 ice:'#b8f0ff',blue:'#40a8df',deep:'#2260a8'
};
export function mountAstrolabe(canvas,caption){
 const ctx=canvas.getContext('2d');
 if(!ctx)return ()=>{};
 const plate=canvas.ownerDocument.createElement('canvas');plate.width=plate.height=SIZE;
 const plateCtx=plate.getContext('2d');
 let previous='',pen=plateCtx;
 const dot=(x,y,c,size=1)=>{pen.fillStyle=c;pen.fillRect(Math.round(x),Math.round(y),size,size)};
 const point=(radius,turn)=>[CENTER+radius*Math.sin(TAU*turn),CENTER-radius*Math.cos(TAU*turn)];
 function ring(radius,color){
  const steps=Math.ceil(radius*TAU*1.5);
  for(let i=0;i<steps;i++)dot(...point(radius,i/steps),color);
 }
 function spokes(){
  for(let i=0;i<24;i++){
   const [x,y]=point(30,i/24),major=i%6===0;
   dot(x,y,major?colors.light:colors.bronze,major?2:1);
   if(major)dot(...point(27,i/24),colors.gold);
  }
 }
 function planet(radius,turn,day){
  const [px,py]=point(radius,turn),x=Math.round(px),y=Math.round(py);
  dot(x-3,y-3,colors.shadow,7);
  if(day){
   dot(x-2,y-2,colors.light,5);dot(x,y-3,colors.gold);dot(x,y+3,colors.gold);
   dot(x-3,y,colors.gold);dot(x+3,y,colors.gold);
  }else{
   dot(x-2,y-2,colors.ice,5);dot(x,y-3,colors.shadow,4);dot(x+1,y-1,colors.shadow,2);
  }
 }
  for(let y=-37;y<=37;y++){
   const size=Math.floor(Math.sqrt(37**2-y*y));
   plateCtx.fillStyle=colors.dark;plateCtx.fillRect(CENTER-size,CENTER+y,2*size+1,1);
  }
  ring(37,colors.shadow);ring(36,colors.bronze);ring(35,colors.gold);
  ring(33,colors.bronze);ring(25,colors.gold);ring(23,colors.deep);
  ring(17,colors.bronze);ring(15,colors.deep);spokes();
  for(const t of [0,.25,.5,.75]){
   const [x,y]=point(37,t);
   dot(x-2,y-2,colors.bronze,5);dot(x-1,y-1,colors.gold,3);dot(x,y,colors.light);
  }
 pen=ctx;
 return (parts,seconds=0)=>{
  if(!parts)return;
  const state=astrolabeTime(parts),tick=Math.floor(seconds*8)%(SKY_PERIOD*8);
  const key=[parts.hour,parts.minute,parts.second,tick].join('/');
  if(previous===key)return;
  previous=key;
  ctx.clearRect(0,0,SIZE,SIZE);
  ctx.drawImage(plate,0,0);
  const orbit=tick/(SKY_PERIOD*8);
  for(const direction of [0,.5]){
   const position=orbit+direction;
   for(let i=0;i<5;i++)dot(...point(35,position-.005*i),i<2?colors.light:colors.gold);
   const [x,y]=point(37,position);
   dot(x,y,colors.ice);
  }
  planet(25,state.hourPhase,state.day);
  const [mx,my]=point(17,state.minutePhase);
  dot(mx-1,my-1,colors.light,3);dot(mx,my,colors.gold);
  dot(40,40,colors.deep,9);dot(41,39,colors.blue,7);
  dot(42,40,colors.ice,4);dot(42,40,'#ffffff',2);dot(46,44,colors.blue,2);
  const label=state.day?'Manila day':'Manila night';
  if(caption.textContent!==label)caption.textContent=label;
 };
}
