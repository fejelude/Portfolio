import { between, clamp, ease } from './birthday-clock.mjs';

// Original artwork: every branch, petal, fold, and ribbon is drawn here.
// A deliberately small drawing surface gives consistent, crisp pixel edges.
export const FLOWERS = [
  { x:72,y:102,kind:'cherry',at:10.3,size:1.02 },
  { x:117,y:70,kind:'tulip',at:11.6,size:1.05 },
  { x:149,y:101,kind:'rose',at:13,size:1.23 },
  { x:189,y:76,kind:'rose',at:14.4,size:1.13 },
  { x:98,y:115,kind:'daisy',at:15.5,size:.9 },
  { x:92,y:60,kind:'rose',at:17,size:.93 },
  { x:168,y:47,kind:'daisy',at:18.2,size:.78 },
  { x:144,y:45,kind:'cherry',at:19.5,size:.95 },
  { x:212,y:111,kind:'tulip',at:20.8,size:1.07 },
  { x:133,y:134,kind:'rose',at:22,size:1.08 },
  { x:69,y:144,kind:'rose',at:23,size:.87 },
  { x:213,y:64,kind:'cherry',at:24,size:.86 },
  { x:231,y:140,kind:'cherry',at:25.2,size:.84 },
  { x:179,y:127,kind:'daisy',at:26.1,size:1.01 },
  { x:105,y:151,kind:'tulip',at:27,size:.93 },
  { x:191,y:161,kind:'cherry',at:28,size:.76 },
  { x:54,y:120,kind:'daisy',at:29,size:.6 },
  { x:159,y:156,kind:'cherry',at:29.6,size:.76 },
];

const TAU = Math.PI * 2;
const palettes = {
  rose: ['#ab5074','#db7e9d','#ee9fb8','#ffc9d8','#fff0e9'],
  cherry: ['#c47396','#f0b0c9','#ffd2e4','#ffeaf4','#fff8fa'],
  tulip: ['#ae6286','#d894b5','#f1bad2','#ffdae9','#ffedf6'],
  daisy: ['#c3959b','#f2d8d7','#fff1e9','#fff9f2','#ffffff'],
};
function seed(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function rect(c,x,y,w,h,color) { c.fillStyle=color; c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h))); }
function poly(c,points,color) { c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill(); }
function line(c,points,color,width=1) { c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.stroke(); }
function oval(c,x,y,rx,ry,color) {
  c.fillStyle=color;
  for(let row=-Math.ceil(ry);row<=ry;row++) {
    const w=Math.round(rx*Math.sqrt(Math.max(0,1-row*row/(ry*ry))));
    if(w) c.fillRect(Math.round(x-w),Math.round(y+row),w*2+1,1);
  }
}
export function heart(c,x,y,size,color) {
  const pattern=['0110110','1111111','1111111','0111110','0011100','0001000'];
  pattern.forEach((r,j)=>[...r].forEach((p,i)=>{if(p==='1')rect(c,x+i*size,y+j*size,size,size,color);}));
}
function sparkle(c,x,y,s,color='#fff8e2') { rect(c,x-s,y,s*2+1,1,color);rect(c,x,y-s,1,s*2+1,color);rect(c,x,y,1,1,'#fff'); }
function leaf(c,x,y,angle,size,p) {
  if(p<=0)return;
  c.save();c.translate(Math.round(x),Math.round(y));c.rotate(angle);c.scale(p,p);
  poly(c,[[0,0],[4,-6],[13,-10],[18,-10],[15,-3],[9,3],[3,3]],'#57866f');
  poly(c,[[1,0],[6,-5],[14,-8],[11,-3],[6,1]],'#89b98e');
  line(c,[[0,0],[13,-7]],'#c4d9a1');c.restore();
}
function petals(c,kind,p,index) {
  const colors=palettes[kind];
  if(kind==='tulip') {
    const w=5+8*p,h=15+3*p;
    poly(c,[[-w,2],[-w,-h+5],[-w+3,-h-2],[0,-h+4],[w-3,-h-2],[w,-h+5],[w,2],[6,9],[-6,9]],colors[0]);
    poly(c,[[-w+2,0],[-w+2,-h+5],[-w+4,-h+1],[2,-h+7],[4,7],[-4,7]],colors[2]);
    poly(c,[[1,7],[-2,-h+5],[4,-h+1],[w-1,-h+6],[w-1,0],[5,7]],colors[1]);
    poly(c,[[-3,6],[-5,-h+8],[0,-h+4],[5,-h+8],[3,6]],colors[3]);
    line(c,[[-w+4,-h+5],[-w+4,-3]],colors[4],2);
    line(c,[[w-3,-h+8],[w-3,-4]],colors[2]);
    return;
  }
  const count=kind==='daisy'?10:kind==='rose'?7:5;
  for(let n=0;n<count;n++) {
    const opening=ease(clamp(p*1.35-(n%3)*.1));
    c.save();c.rotate(n*TAU/count+(kind==='cherry'?.25:0)+(1-opening)*.27);
    const radius=(kind==='rose'?8:kind==='daisy'?9:8)*opening;
    const rx=kind==='daisy'?3:kind==='rose'?9:7;
    const ry=kind==='daisy'?8:kind==='rose'?10:9;
    oval(c,0,-radius,rx*(.3+.7*opening),ry*(.5+.5*opening),colors[0]);
    oval(c,-1,-radius-1,rx*(.3+.7*opening)-1,ry*(.5+.5*opening)-1,colors[2]);
    oval(c,-2,-radius-3,Math.max(1,rx*(.3+.7*opening)-3),Math.max(2,ry*(.5+.5*opening)-4),colors[3]);
    if(kind==='cherry')rect(c,-1,-radius-ry,2,2,colors[0]);
    if(kind==='rose')line(c,[[3,-radius-5],[5,-radius-2],[4,-radius+2]],colors[1]);
    c.restore();
  }
  if(kind==='rose') {
    oval(c,0,1,10*p+2,8*p+1,colors[1]);
    poly(c,[[-7*p,0],[-5*p,-4*p],[4*p,-5*p],[8*p,0],[5*p,5*p],[-4*p,6*p]],colors[3]);
    line(c,[[-5*p,1],[-3*p,-2],[3*p,-2],[4*p,2],[0,4],[-2,2],[1,0]],colors[0],2);
    rect(c,-4*p,-3*p,3,1,colors[4]);
  } else {
    oval(c,0,0,kind==='daisy'?6:3,kind==='daisy'?5:3,'#d6a153');
    oval(c,-1,-1,kind==='daisy'?4:2,kind==='daisy'?3:2,'#f4d188');
    rect(c,-2,-2,2,1,'#fff4c3');
    if(kind==='cherry')for(let n=0;n<5;n++){const a=n*TAU/5;rect(c,Math.cos(a)*5,Math.sin(a)*5,1,1,'#b27378');}
    if(kind==='daisy'){rect(c,2,1,1,1,'#ba8758');rect(c,-2,2,1,1,'#ba8758');}
  }
}

export function sceneAt(t) {
  return {
    stems:FLOWERS.map((f,i)=>between(t,.3+i*.22,5.2+i*.26)),
    flowers:FLOWERS.map((f,i)=>between(t,f.at,f.at+1.75+(i%3)*.3)),
    filler:between(t,32,45),paperBack:between(t,35,45),paperFront:between(t,42,51),
    ribbon:between(t,47,51),bow:between(t,51,56.5),tag:between(t,54,57),crescendo:between(t,57,60),
    complete:t>=60,
  };
}

export class BouquetRenderer {
  constructor(canvas) { this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:true}); }
  render(t,ambient=0,reduced=false,parallax={x:0,y:0}) {
    const c=this.c;if(!c)return;
    const state=sceneAt(t),motion=reduced?0:(t>=60?60+ambient:t);
    c.clearRect(0,0,300,320);c.imageSmoothingEnabled=false;
    c.save();c.translate(150+parallax.x*2,246+parallax.y);c.rotate(reduced?0:Math.sin(motion*.75)*.013*clamp(t/10));c.translate(-150,-246);
    if(t>0&&t<10){
      const gather=between(t,0,5);c.globalAlpha=Math.sin(t/10*Math.PI)*(reduced?.25:.6);
      for(let i=0;i<12;i++){const a=i*TAU/12,r=43*(1-gather)+5;sparkle(c,150+Math.cos(a)*r,249+Math.sin(a)*r*.55,i%4?1:2,i%2?'#e9b77e':'#fff');}
      c.globalAlpha=1;
    }
    if(t>1){c.globalAlpha=.08*between(t,1,10);oval(c,151,293,69,5,'#a76894');c.globalAlpha=1;}
    // Back paper spreads open before the front folds; flowers remain in front.
    if(state.paperBack>0) {
      const p=state.paperBack;c.save();c.translate(150,265);c.scale(p,1);c.translate(-150,-265);
      poly(c,[[41,168],[51,147],[131,180],[171,169],[242,156],[251,185],[174,287],[130,291]],'#d890ad');
      poly(c,[[45,166],[54,151],[130,184],[153,272],[132,285]],'#fff6e9');
      poly(c,[[153,272],[171,175],[241,161],[247,183],[174,283]],'#f7d4df');
      line(c,[[55,152],[129,188],[151,269]],'#e6b5c5',2);
      line(c,[[176,178],[241,165]],'#fff2ef',3);
      c.restore();
    }
    FLOWERS.forEach((f,i)=>{
      const p=state.stems[i];if(!p)return;
      const sway=reduced?0:Math.sin(motion*.95+i*1.8)*1.8*p;
      const top={x:150+(f.x-150)*p+sway,y:245+(f.y-245)*p};
      line(c,[[147+i%7,260],[143+(f.x-150)*.22,199],[top.x,top.y]],'#5b876f',2);
      line(c,[[148+i%7,252],[145+(f.x-150)*.22,199],[top.x+1,top.y]],'#97b88b');
      const lp=between(t,3.5+i*.22,7.2+i*.24);
      leaf(c,147+(f.x-150)*.48,245+(f.y-245)*.48,i%2?-.8:-2.6,.8,lp*.78);
      leaf(c,148+(f.x-150)*.7,245+(f.y-245)*.7,i%2?-2.7:-.7,.8,lp*.6);
    });
    // Distinct filler branches appear progressively throughout 0:32–0:47.
    for(let i=0;i<32;i++) {
      const p=between(t,32+i*.29,34+i*.31);if(!p)continue;
      const a=(i/32)*TAU,x=150+Math.cos(a)*(76+seed(i)*22),y=111+Math.sin(a)*(61+seed(i+3)*13);
      const ex=150+(x-150)*p,ey=233+(y-233)*p;
      line(c,[[151,249],[152+(x-150)*.35,180],[ex,ey]],'#92a37b');
      leaf(c,x,y+.5,Math.cos(a)>0?-.7:-2.5,1,p*.75);
      for(let j=0;j<4;j++){
        const xx=ex+(seed(i*4+j+35)-.5)*15,yy=ey+(seed(i*4+j+76)-.5)*13;
        rect(c,xx-1,yy-1,3,3,'#d9b2b9');rect(c,xx-1,yy-2,2,2,'#fff9ee');rect(c,xx+1,yy,1,1,'#fff');
      }
    }
    FLOWERS.forEach((f,i)=>{
      const p=state.flowers[i];if(t<f.at-.6)return;
      const sway=reduced?0:Math.sin(motion*.95+i*1.8)*1.8;
      c.save();c.translate(Math.round(f.x+sway),f.y);c.scale(f.size,f.size);
      poly(c,[[-4,3],[-6,-2],[0,-5],[6,-2],[4,3],[0,6]],'#6d977a');
      c.save();c.scale(.35+.65*p,.45+.55*p);petals(c,f.kind,p,i);c.restore();c.restore();
      const trail=clamp((t-(f.at+1.4))/1.8);
      if(!reduced&&trail>0&&trail<1){c.globalAlpha=Math.sin(trail*Math.PI)*.8;for(let n=0;n<5;n++){const a=n*TAU/5+i;const r=18+trail*17;sparkle(c,f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,1,n%2?'#e9b269':'#fff');}c.globalAlpha=1;}
    });
    for(let i=0;i<5;i++) {
      const p=between(t,37+i*1.3,39+i*1.3);if(!p)continue;
      c.save();c.globalAlpha=p*.85;heart(c,62+i*36,80+Math.sin(i*2.5)*56+(reduced?0:Math.sin(motion+i)*1.5),.7,['#e898b6','#e9bdce','#d5adcf'][i%3]);c.restore();
    }
    if(state.paperFront>0) {
      const p=state.paperFront;
      c.save();c.translate(151,280);c.scale(p,1);c.translate(-151,-280);
      poly(c,[[57,180],[105,196],[163,204],[150,291],[122,285]],'#c7799b');
      poly(c,[[61,182],[106,200],[158,206],[147,286],[124,281]],'#f3b4cd');
      poly(c,[[59,179],[90,184],[115,201],[96,202]],'#ffe8ed');
      line(c,[[72,189],[109,220],[136,278]],'#ffe4ed',2);
      c.restore();
      const q=between(t,46,51);c.save();c.translate(153,282);c.scale(q,1);c.translate(-153,-282);
      poly(c,[[152,207],[234,181],[180,282],[150,292],[139,285]],'#b97094');
      poly(c,[[154,210],[229,185],[177,279],[151,288],[142,283]],'#ffdae5');
      poly(c,[[169,206],[223,184],[233,181],[214,206]],'#fff4ee');
      line(c,[[228,186],[174,272],[153,284]],'#edb1c7',2);
      for(let i=0;i<10;i++)rect(c,174+seed(i)*24,218+seed(i+30)*32,1,1,'#eeb7cc');
      c.restore();
    }
    if(state.ribbon>0) {
      const p=state.ribbon;
      poly(c,[[119,229],[119+63*p,235],[180,243],[122,237]],'#bb507c');
      line(c,[[120,231],[120+61*p,237]],'#f69fc4',3);
      const r=between(t,49,55),s=reduced?0:Math.sin((1-r)*8)*(1-r)*9;
      poly(c,[[151,241],[132-s,263],[129,279],[143,269],[149,276],[159,246]],'#dc76a2');
      poly(c,[[158,241],[175+s,256],[183,271],[172,268],[170,276],[150,246]],'#c85e8b');
      line(c,[[149,246],[138,266]],'#ffb7d4',3);
      line(c,[[158,246],[174,266]],'#ef9dbc',2);
    }
    if(state.bow>0) {
      const p=state.bow;const lift=Math.sin(p*Math.PI)*10;
      c.save();c.translate(153,240-lift);c.scale(p,p);c.translate(-153,-240);
      poly(c,[[152,238],[131,219],[112,218],[105,225],[109,240],[128,248],[149,244]],'#b44f7e');
      poly(c,[[147,238],[128,224],[114,222],[110,228],[115,238],[129,243],[147,241]],'#ee96bc');
      poly(c,[[142,237],[126,229],[116,226],[116,233],[127,238]],'#ffc4de');
      poly(c,[[155,238],[172,219],[190,216],[200,225],[196,240],[176,247],[157,244]],'#ac527c');
      poly(c,[[159,238],[175,223],[188,221],[195,227],[191,236],[176,242],[160,241]],'#e789b1');
      line(c,[[169,235],[182,227],[190,227]],'#ffd2e4',3);
      rect(c,146,235,14,11,'#ab4f79');rect(c,148,236,10,8,'#ef9ac0');rect(c,149,237,3,5,'#ffd4e4');
      c.restore();
    }
    if(state.tag>0) {
      c.globalAlpha=state.tag;line(c,[[169,238],[182,253]],'#b18570');
      poly(c,[[180,251],[191,253],[189,267],[178,265]],'#cb9d98');
      poly(c,[[180,250],[190,252],[188,265],[179,264]],'#fff5dc');heart(c,181,255,.7,'#d785a4');c.globalAlpha=1;
    }
    if(t>54)for(let i=0;i<10;i++) {
      const pulse=reduced?.3:(.4+Math.sin(motion*1.5+i*3)*.35);c.globalAlpha=pulse*between(t,54,60);
      sparkle(c,48+seed(i+88)*210,34+seed(i+22)*215,i%3?1:2,i%2?'#e3b269':'#fff');
    }
    if(state.crescendo>0&&t<60&&!reduced){
      c.globalAlpha=.6*Math.sin(state.crescendo*Math.PI*.8);
      for(let i=0;i<12;i++){const a=i*TAU/12+state.crescendo*.4,r=108-state.crescendo*39;sparkle(c,150+Math.cos(a)*r,142+Math.sin(a)*r*.95,i%3?1:2,i%2?'#e7ba79':'#fff9e9');}
    }
    c.globalAlpha=1;c.restore();
  }
}

export class GroveRenderer {
  constructor(canvas) { this.canvas=canvas;this.c=canvas.getContext('2d');this.back=document.createElement('canvas');this.lastSize=''; }
  resize(width,height) {
    const w=420,h=Math.round(w*height/width),key=`${w},${h}`;if(this.lastSize===key)return;
    this.lastSize=key;this.canvas.width=w;this.canvas.height=h;this.back.width=w;this.back.height=h;
    const c=this.back.getContext('2d'),g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#f4bbd4');g.addColorStop(.5,'#ffeaf2');g.addColorStop(1,'#e9c1d5');c.fillStyle=g;c.fillRect(0,0,w,h);
    oval(c,w*.5,h*.36,w*.45,h*.31,'#fff1f68a');
    // Distant grove silhouettes, then textured blossom crowns at the edges.
    for(let side=0;side<2;side++){
      c.save();if(side){c.translate(w,0);c.scale(-1,1);}
      poly(c,[[0,h],[0,h*.06],[17,h*.11],[23,h*.3],[37,h*.44],[33,h*.62],[21,h*.82],[34,h]],'#ba87a850');
      poly(c,[[0,h*.64],[12,h*.24],[18,0],[32,0],[27,h*.27],[39,h*.4],[49,h*.52],[37,h*.54],[22,h*.35],[17,h*.68]],'#9f759656');
      line(c,[[18,h*.34],[53,h*.24],[83,h*.14]],'#ad789742',5);
      for(let i=0;i<140;i++){
        const x=seed(i+side*10)*112-20,y=seed(i+side*32+11)*Math.min(h*.35,155)-24,s=7+seed(i+3)*16;
        const color=['#dd95b7','#efabca','#f6c1d7','#ffd8e5','#e8a2c3'][i%5];
        rect(c,x,y,s,s*.7,color);rect(c,x+2,y-3,s-4,s*.8,color);
        if(i%4===0)rect(c,x+3,y+2,4,2,'#ffe7f0');
      }
      for(let i=0;i<25;i++) {
        const x=seed(i+side*13)*96,y=h-13-seed(i+33)*65;
        rect(c,x,y,10+seed(i)*12,3,['#dca1bd','#edbed3','#fff0ed'][i%3]);
      }
      c.restore();
    }
    for(let i=0;i<60;i++)rect(c,seed(i+321)*w,h-6-seed(i+310)*38,2,1,i%2?'#fff2e8':'#b695b066');
  }
  render(t,reduced=false,parallax={x:0,y:0}) {
    const c=this.c;if(!c)return;const w=this.canvas.width,h=this.canvas.height;c.clearRect(0,0,w,h);c.drawImage(this.back,Math.round(parallax.x*2),Math.round(parallax.y),w,h);
    // Original golden charms frame the grove without crossing the date or title.
    [32,75,w-75,w-32].forEach((x,i)=>{
      const y=[63,99,85,55][i],swing=reduced?0:Math.sin(t*.6+i)*2.2;
      line(c,[[x,0],[x+swing,y]],'#c99c5d80');
      poly(c,[[x+swing,y-6],[x+swing+2,y-2],[x+swing+6,y],[x+swing+2,y+2],[x+swing,y+6],[x+swing-2,y+2],[x+swing-6,y],[x+swing-2,y-2]],'#c99b53');
      rect(c,x+swing-1,y-2,2,3,'#ffe5a3');
    });
    for(let i=0;i<(reduced?6:20);i++){
      c.globalAlpha=reduced?.4:clamp(.5+Math.sin(t*.7+i*2)*.5);sparkle(c,seed(i+93)*w,20+seed(i+433)*(h-35),i%3?1:2,'#fff7ea');
    }c.globalAlpha=1;
  }
}

// Reusable bounded particles: no DOM emitters, per-frame allocations, or replay leaks.
export class ParticleGarden {
  constructor(canvas) {
    this.canvas=canvas;this.c=canvas.getContext('2d');this.pool=Array.from({length:150},()=>({live:false}));this.cursor=0;this.emitted=0;this.quality=1;this.reset();
  }
  resize(w,h) { this.w=w;this.h=h;const dpr=Math.min(window.devicePixelRatio||1,1.5);this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);this.c?.setTransform(dpr,0,0,dpr,0,0); }
  reset() { this.pool.forEach(p=>p.live=false);this.cursor=0;this.emitted=0;this.next=0;this.slow=0;this.quality=1; }
  emit(type,x,y,vx,vy,life) {
    const p=this.pool[this.cursor++%this.pool.length];p.live=true;p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.age=0;p.life=life;p.type=type;p.size=type==='heart'?1.4:2+seed(this.cursor)*2;p.turn=seed(this.cursor+1)*TAU;p.color=['#f1a0c0','#f8c2d8','#d8b2d0','#e6b961','#fff5e7'][this.cursor%5];this.emitted++;
  }
  burst(reduced=false) {
    const count=reduced?16:Math.round(100*this.quality);
    for(let i=0;i<count;i++){const a=(i/count)*TAU;const v=(35+seed(i+876)*85)*(reduced?.4:1);this.emit(i%4===0?'heart':i%3===0?'confetti':'petal',this.w*.5,this.h*.44,Math.cos(a)*v,Math.sin(a)*v-(reduced?8:30),3.8+seed(i)*2);}
  }
  render(dt,time,reduced=false,final=false,welcome=false,frameMs=16) {
    const c=this.c;if(!c)return;
    if(frameMs>25&&dt>0)this.slow++;else this.slow=Math.max(0,this.slow-1);
    if(this.slow>35){this.quality=Math.max(.35,this.quality*.85);this.slow=0;}
    c.clearRect(0,0,this.w,this.h);dt=clamp(dt,0,.06);
    this.next-=dt;
    if(dt>0&&this.next<=0){this.next=(reduced?1.8:.24)/this.quality;this.emit(final&&this.emitted%5===0?'heart':'petal',seed(this.emitted+19)*this.w,-8,8+seed(this.emitted+3)*14,14+seed(this.emitted+4)*20,Math.max(6,this.h/18));}
    for(const p of this.pool){
      if(!p.live)continue;p.age+=dt;if(p.age>p.life||p.y>this.h+20){p.live=false;continue;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.turn+=dt*(reduced?.1:1.1);if(final&&p.type==='confetti')p.vy+=dt*8;
      c.save();c.globalAlpha=Math.min(.72,Math.min(p.age*3,(p.life-p.age)*2));c.translate(p.x+Math.sin(time+p.turn)*3,p.y);c.fillStyle=p.color;
      if(p.type==='heart')heart(c,-4,-4,p.size,p.color);
      else if(p.type==='confetti'){c.rotate(p.turn);c.fillRect(-2,-3,3,6);}
      else{c.rotate(p.turn);c.fillRect(-p.size,-1,p.size*2,2);c.fillRect(-p.size+1,-2,p.size*2-2,4);}
      c.restore();
    }
  }
}
