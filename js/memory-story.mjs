// Original, integer-raster miniature artwork for the archive. No external images.
const W=96,H=72, INTRO=16, SLOT=6, TRANSITION=1.15;
const names=['sakura','kitten','rose','butterfly'];
const P={ink:'#68475d',hair:'#403846',hairMid:'#5b4a59',hairLight:'#786171',skin:'#f6c6b0',skinShade:'#db9b98',skinLight:'#ffe4ca',blush:'#e4a0a3',shirt:'#b4a1c9',shirtShade:'#8d79a6',shirtLight:'#d8c8e4',pants:'#716780',pantsLight:'#9889a3',shoe:'#785468',white:'#fff5ea',pinkDark:'#a74f7b',pink:'#d975a1',pinkMid:'#eca0bd',pinkLight:'#f8c3d8',pinkPale:'#ffe3e9',lav:'#be9bc9',green:'#789887',greenDark:'#51786a',greenLight:'#aec5a0',gold:'#efbf78'};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
const sin=Math.sin, TAU=Math.PI*2;
function box(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);}
function polygon(c,points,color){
  const ys=points.map(p=>p[1]), ymin=Math.floor(Math.min(...ys)), ymax=Math.ceil(Math.max(...ys));
  c.fillStyle=color;
  for(let y=ymin;y<ymax;y++){
    const row=y+.5,xs=[];
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const [a,b]=points[i],[d,e]=points[j];
      if((b>row)!==(e>row))xs.push(a+(row-b)*(d-a)/(e-b));
    }
    xs.sort((a,b)=>a-b);
    for(let i=0;i+1<xs.length;i+=2){const a=Math.ceil(xs[i]-.5),b=Math.ceil(xs[i+1]-.5);if(b>a)c.fillRect(a,y,b-a,1);}
  }
}
function line(c,x,y,u,v,color,width=1){
  const n=Math.max(1,Math.ceil(Math.max(Math.abs(u-x),Math.abs(v-y))));
  for(let i=0;i<=n;i++)box(c,mix(x,u,i/n)-Math.floor(width/2),mix(y,v,i/n)-Math.floor(width/2),width,width,color);
}
function stamp(c,rows,x,y,colors,scale=1){
  rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(colors[r[i]])box(c,x+i*scale,y+j*scale,scale,scale,colors[r[i]]);});
}
function petal(c,x,y,color=P.pinkLight){box(c,x,y,2,1,color);box(c,x-1,y+1,3,2,color);box(c,x,y+3,1,1,P.pinkMid);}
function spark(c,x,y,color=P.lav){box(c,x,y-2,1,5,color);box(c,x-2,y,5,1,color);box(c,x,y,1,1,P.white);}
function heart(c,x,y){stamp(c,['.pp.pp.','ppppppp','ppppppp','.ppppp.','..ppp..','...p...'],x,y,{p:P.pinkMid});}
function shadow(c,x,y,w){box(c,x-w/2+3,y,w-6,1,'#ead5df');box(c,x-w/2,y+1,w,1,'#f0dfe4');}
function butterfly(c,x,y,t,scale=1){
  // Two independent wing lobes, dark body and antennae. Four stepped widths.
  const width=[1,.78,.46,.67][Math.floor(t*7)%4];
  c.save();c.translate(Math.round(x),Math.round(y));
  for(const side of [-1,1]){
    const wing=(pts,col)=>polygon(c,pts.map(([a,b])=>[Math.round(a*width*side*scale),Math.round(b*scale)]),col);
    wing([[1,0],[3,-7],[8,-13],[14,-14],[17,-11],[16,-5],[12,0],[8,2],[12,5],[13,10],[10,13],[5,12],[1,5]],P.pinkDark);
    wing([[2,0],[5,-7],[9,-12],[14,-12],[15,-10],[14,-5],[10,-1],[6,2],[11,6],[11,10],[9,11],[5,9],[2,4]],P.pink);
    wing([[4,-1],[7,-8],[11,-11],[14,-10],[12,-6],[8,-3]],P.pinkLight);
    wing([[4,3],[8,4],[10,7],[9,10],[6,8]],P.lav);
    wing([[7,-7],[10,-9],[12,-9],[10,-6]],P.pinkPale);
    if(width>.55){wing([[7,5],[9,7],[8,8],[6,6]],P.white);wing([[12,-4],[14,-6],[14,-4],[12,-2]],P.white);}
  }
  box(c,-1,-5,2,12*scale,P.ink);box(c,-1,-7,2,2,P.pinkDark);
  line(c,-1,-6,-4,-10,P.ink);line(c,0,-6,3,-10,P.ink);
  box(c,-4,-11,1,1,P.lav);box(c,3,-11,1,1,P.lav);c.restore();
}
function arm(c,points,hand=true){
  const [a,b,d]=points;
  for(let i=1;i<points.length;i++)line(c,...points[i-1],...points[i],P.ink,6);
  line(c,...a,...b,P.shirtShade,4);line(c,...a,...b,P.shirtLight,2);
  line(c,...b,...d,P.shirt,4);
  if(hand){box(c,d[0]-2,d[1]-2,5,5,P.ink);box(c,d[0]-1,d[1]-2,3,4,P.skin);box(c,d[0]-1,d[1]-2,2,1,P.skinLight);}
}
function boy(c,t){
  const release=ease((t-4)/2.7), wave=ease((t-8)/1.1)*(1-ease((t-11.6)/1.3));
  const smile=ease((t-7)/2), breath=Math.round(sin(t*2.1)*.55), blink=t%3.4>3.19;
  const x=34-Math.round(ease((t-13)/2)*4),y=breath;
  c.save();c.translate(x,y);
  shadow(c,0,66-y,30);
  // Shoes and trousers; two separately shaded legs.
  polygon(c,[[-10,43],[10,43],[10,53],[7,62],[10,64],[10,66],[1,66],[-1,63],[-2,52],[-5,61],[-6,66],[-16,66],[-16,64],[-12,61],[-12,51]],P.ink);
  polygon(c,[[-9,44],[9,44],[8,54],[5,62],[1,62],[-2,50],[-5,50],[-7,62],[-11,62],[-11,50]],P.pants);
  box(c,-10,47,3,12,P.pantsLight);box(c,4,47,3,8,P.pantsLight);
  box(c,-14,64,7,1,P.shoe);box(c,2,64,7,1,P.shoe);box(c,-14,65,7,1,P.white);box(c,2,65,7,1,P.white);
  // Far sleeve, sweater silhouette, hem and collar.
  arm(c,[[-9,30],[-14,38],[-10+Math.round(release*-4),43-Math.round(release*4)]]);
  polygon(c,[[-5,25],[6,25],[12,28],[14,36],[11,46],[-10,46],[-13,35],[-11,28]],P.ink);
  polygon(c,[[-5,26],[6,26],[11,29],[12,35],[10,44],[-9,44],[-11,35],[-9,29]],P.shirt);
  polygon(c,[[-9,29],[-5,27],[-3,36],[-5,42],[-9,42]],P.shirtLight);
  box(c,-9,43,19,2,P.shirtShade);box(c,7,35,3,7,P.shirtShade);
  box(c,-5,27,10,2,P.white);box(c,-3,23,7,4,P.skinShade);box(c,-2,24,5,3,P.skin);
  // Head, stepped dark hair silhouette, rim light and individual locks.
  polygon(c,[[-13,9],[-12,5],[-8,3],[-3,3],[-1,1],[4,2],[9,3],[12,7],[14,10],[14,19],[11,22],[8,25],[-6,25],[-11,22],[-14,17]],P.ink);
  polygon(c,[[-10,10],[0,6],[9,8],[12,13],[12,19],[8,23],[4,25],[-4,24],[-9,21],[-11,16]],P.skinShade);
  polygon(c,[[-9,11],[-2,8],[8,9],[11,13],[11,19],[7,22],[3,23],[-4,22],[-8,19]],P.skin);
  box(c,-8,15,3,4,P.skinLight);box(c,5,21,3,1,P.skinLight);
  polygon(c,[[-14,10],[-13,6],[-9,4],[-5,4],[-3,2],[1,3],[4,1],[7,4],[11,5],[13,9],[15,12],[12,13],[12,17],[9,14],[9,11],[6,14],[3,11],[1,14],[-2,10],[-5,14],[-8,12],[-10,16],[-12,14],[-14,16]],P.hair);
  polygon(c,[[-12,9],[-8,5],[-3,5],[-4,8],[-8,11],[-10,11]],P.hairMid);
  polygon(c,[[-1,5],[4,4],[9,7],[10,10],[6,8],[4,9],[1,7]],P.hairMid);
  box(c,-8,6,3,1,P.hairLight);box(c,2,5,4,1,P.hairLight);box(c,9,8,2,1,P.hairLight);
  box(c,-12,17,3,3,P.skinShade);box(c,-11,17,2,2,P.skin);
  if(blink){box(c,-4,16,3,1,P.ink);box(c,5,16,3,1,P.ink);}
  else{box(c,-4,15,3,4,P.ink);box(c,5,15,3,4,P.ink);box(c,-3,15,1,1,P.white);box(c,6,15,1,1,P.white);}
  box(c,-7,19,3,1,P.blush);box(c,8,19,2,1,P.blush);box(c,2,19,1,1,P.skinShade);
  if(smile>.65){box(c,0,21,4,1,P.ink);box(c,-1,20,1,1,P.ink);box(c,4,20,1,1,P.ink);}else box(c,1,21,3,1,P.ink);
  // Near arm moves from cupped hands to open palm, then a small wave.
  const dx=mix(14,19,release),dy=mix(39,35,release);
  const wrist=[Math.round(mix(dx,17+sin(t*6)*2,wave)),Math.round(mix(dy,12+sin(t*6+.5),wave))];
  const elbow=[Math.round(mix(13,18,wave)),Math.round(mix(38,28,wave))];
  arm(c,[[9,30],elbow,wrist]);
  if(wave>.65){box(c,wrist[0]-2,wrist[1]-5,1,4,P.skin);box(c,wrist[0],wrist[1]-6,1,5,P.skin);box(c,wrist[0]+2,wrist[1]-4,1,4,P.skin);}
  else if(release<.8){box(c,11,39,5,2,P.skinShade);box(c,12,38,4,1,P.skinLight);}
  c.restore();
}
function sakura(c,x,y,t,react){
  // Five notched lobes; each has three nested color ramps and a vein.
  const size=1+.05*sin(t*2)+.12*react;
  const outline=[[0,3],[-5,0],[-10,-8],[-10,-15],[-7,-20],[-3,-22],[0,-18],[3,-22],[7,-20],[10,-15],[10,-8],[5,0]];
  for(let k=0;k<5;k++){
    const a=k*TAU/5,co=Math.cos(a),si=sin(a);
    const shape=(ps,color)=>polygon(c,ps.map(([u,v])=>[Math.round(x+(u*co-v*si)*size),Math.round(y+(u*si+v*co)*size)]),color);
    shape(outline,P.pinkDark);
    shape([[0,2],[-5,-2],[-8,-9],[-8,-15],[-5,-19],[-3,-19],[0,-15],[3,-19],[5,-19],[8,-15],[8,-9],[5,-2]],P.pink);
    shape([[-2,0],[-6,-6],[-7,-12],[-5,-17],[-3,-17],[0,-13],[3,-17],[5,-17],[7,-12],[5,-5],[2,0]],P.pinkLight);
    shape([[-5,-11],[-4,-15],[-2,-15],[0,-10],[0,-5],[-2,-7]],P.pinkPale);
    shape([[0,-2],[1,-8],[2,-7],[2,-2]],P.pinkMid);
  }
  polygon(c,[[x-7,y],[x-4,y-5],[x+4,y-5],[x+7,y],[x+4,y+5],[x-4,y+5]],P.pinkDark);
  box(c,x-4,y-3,8,6,P.gold);box(c,x-2,y-2,4,4,P.white);box(c,x+3,y,2,2,'#d89b64');
}
function kitten(c,x,y,t,react,look){
  const hop=Math.round(react*5+Math.max(0,sin(t*1.8-5))*(t>3.1&&t<4.3?3:0));
  shadow(c,x,y+24,35);
  c.save();c.translate(x,y-hop);
  const tail=Math.round(sin(t*2.5)*4);
  line(c,10,16,19,13,P.pinkDark,6);line(c,19,13,23,7+tail,P.pinkDark,6);line(c,23,7+tail,20,1+tail,P.pinkDark,5);
  line(c,11,15,19,12,P.pink,4);line(c,19,12,23,7+tail,P.pinkMid,4);line(c,23,7+tail,20,1+tail,P.pinkLight,3);
  polygon(c,[[-11,0],[8,0],[13,8],[15,17],[12,22],[-13,22],[-16,18],[-15,9]],P.pinkDark);
  polygon(c,[[-10,1],[7,1],[11,8],[13,17],[10,20],[-12,20],[-14,17],[-13,9]],P.pinkMid);
  polygon(c,[[-7,4],[5,4],[8,12],[6,19],[-7,19],[-9,11]],P.pinkPale);
  box(c,-13,17,8,5,P.pinkDark);box(c,-12,17,6,4,P.pinkLight);
  box(c,5,17,8,5,P.pinkDark);box(c,6,17,6,4,P.pinkLight);box(c,-10,19,1,2,P.pink);box(c,9,19,1,2,P.pink);
  const ear=Math.round(sin(t*2)*1);
  polygon(c,[[-17,-4],[-17,-23+ear],[-13,-24+ear],[-6,-18],[6,-18],[13,-24],[17,-23],[17,-4],[13,3],[7,7],[-8,7],[-14,3]],P.pinkDark);
  polygon(c,[[-15,-5],[-15,-21+ear],[-12,-21+ear],[-6,-16],[6,-16],[13,-21],[15,-21],[15,-5],[12,1],[6,5],[-7,5],[-12,1]],P.pinkLight);
  polygon(c,[[-13,-20+ear],[-8,-15],[-13,-12]],P.pink);
  polygon(c,[[13,-20],[8,-15],[13,-12]],P.pink);
  polygon(c,[[-13,-5],[-8,-10],[7,-10],[13,-5],[11,1],[5,4],[-6,4],[-11,1]],P.pinkPale);
  box(c,-11,-5,3,2,P.pinkMid);box(c,8,-5,3,2,P.pinkMid);
  const blink=t%2.9>2.67,eye=Math.round(look*1.5);
  for(const ex of [-7,5]){if(blink)box(c,ex-1,-8,4,1,P.ink);else{box(c,ex-1,-11,5,6,P.pinkDark);box(c,ex+eye,-10,2,3,P.ink);box(c,ex,-10,1,1,P.white);}}
  box(c,-1,-3,3,2,P.pinkDark);box(c,0,-1,1,2,P.ink);box(c,-3,1,3,1,P.ink);box(c,1,1,3,1,P.ink);
  box(c,-16,-2,5,1,P.white);box(c,12,-2,5,1,P.white);
  box(c,-16,0,4,1,P.pinkMid);box(c,13,0,4,1,P.pinkMid);
  c.restore();
}
function rose(c,x,y,t,react){
  const sw=Math.round(sin(t*1.6)*2), open=1+.06*sin(t*1.6)+.12*react;
  line(c,x,y+28,x+sw,y+2,P.greenDark,3);line(c,x-1,y+27,x+sw-1,y+4,P.greenLight,1);
  for(const d of [-1,1]){
    const leaf=(ps,col)=>polygon(c,ps.map(([a,b])=>[x+a*d,y+b]),col);
    leaf([[0,18],[6,10],[14,8],[19,9],[15,16],[8,20]],P.greenDark);
    leaf([[2,18],[7,12],[15,10],[16,11],[12,16],[7,18]],P.green);
    leaf([[3,17],[8,13],[13,12],[8,15]],P.greenLight);
  }
  c.save();c.translate(x+sw,y);
  const shape=(ps,color)=>polygon(c,ps.map(([a,b])=>[Math.round(a*open),Math.round(b*open)]),color);
  shape([[-15,-13],[-18,-8],[-16,2],[-10,9],[-2,12],[8,9],[15,3],[18,-6],[16,-14],[10,-20],[2,-23],[-7,-22],[-13,-18]],P.pinkDark);
  shape([[-15,-12],[-16,-6],[-13,2],[-8,7],[-1,10],[8,7],[13,2],[16,-6],[14,-13],[9,-18],[2,-21],[-7,-20],[-12,-16]],P.pink);
  shape([[-14,-11],[-10,-9],[-8,-3],[-1,3],[7,2],[13,-4],[12,3],[7,7],[-1,8],[-8,5],[-13,0]],P.pinkLight);
  shape([[-11,-15],[-6,-19],[2,-20],[8,-17],[10,-12],[6,-6],[-1,-4],[-6,-6],[-8,-10],[-4,-14],[2,-15],[5,-12],[3,-9],[-1,-9],[-2,-11],[1,-12],[0,-13],[-3,-12],[-3,-9],[0,-7],[5,-8],[7,-12],[5,-16],[-2,-17],[-8,-14],[-9,-9],[-6,-3],[1,0],[8,-3],[12,-10],[12,-14],[15,-10],[13,-3],[7,3],[-2,4],[-9,0],[-13,-7]],P.pinkDark);
  shape([[-9,-15],[-5,-18],[2,-19],[7,-16],[5,-15],[0,-17],[-5,-16]],P.pinkPale);
  shape([[-13,-8],[-10,-4],[-7,0],[-2,2],[-5,3],[-10,0],[-13,-4]],P.pinkPale);
  shape([[9,-6],[12,-9],[12,-5],[8,-1],[4,0]],P.pinkLight);
  c.restore();
}
function ambient(c,t,kind,react=0){
  for(let i=0;i<4;i++){const p=(t*.21+i*.29)%1;const x=11+i*23+sin(t+i)*3,y=9+p*49;if(i===2)spark(c,x,y);else petal(c,x,y);}
  if(react>0.05){for(let i=0;i<3;i++){const a=i*2.1+t*.5;const x=48+Math.cos(a)*(23+(1-react)*9),y=35+sin(a)*20;if(kind==='kitten')heart(c,x,y);else if(kind==='sakura')petal(c,x,y);else spark(c,x,y);}}
}
function art(c,kind,t,react=0,look=0){
  c.clearRect(0,0,W,H);
  if(kind==='intro'){
    boy(c,t);
    const release=ease((t-4)/3), flight=ease((t-7)/7);
    const x=49+release*11+flight*23+sin(t*2)*release*2;
    const y=38-release*16-flight*13+sin(t*2.1)*release*3;
    butterfly(c,x,y,t,.42);
    ambient(c,t,'intro');
    if(release>.1)for(let i=0;i<3;i++)spark(c,x-5-i*5,y+i*3,P.pinkMid);
    return;
  }
  if(kind==='sakura')sakura(c,48,35+Math.round(sin(t*1.5)),t,react);
  if(kind==='kitten')kitten(c,48,35,t,react,look);
  if(kind==='rose')rose(c,48,35,t,react);
  if(kind==='butterfly')butterfly(c,48+sin(t*1.1)*6+look*react*7,35+sin(t*1.9)*4-react*4,t,1.28);
  ambient(c,t,kind,react);
}
export function memoryBeat(seconds){
  const t=Math.max(0,seconds);
  if(t<INTRO-TRANSITION)return {kind:'intro',local:t,next:'sakura',blend:0};
  if(t<INTRO)return {kind:'intro',local:t,next:'sakura',blend:ease((t-INTRO+TRANSITION)/TRANSITION)};
  const loop=(t-INTRO)%(SLOT*names.length),index=Math.floor(loop/SLOT),local=loop%SLOT;
  return {kind:names[index],local,next:names[(index+1)%names.length],blend:ease((local-SLOT+TRANSITION)/TRANSITION)};
}
function raster(doc){const a=doc.createElement('canvas');a.width=W;a.height=H;return a.getContext('2d',{willReadFrequently:true});}
function pixels(c){
  const data=c.getImageData(0,0,W,H).data, points=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4;if(data[i+3]&&((x+y)%2===0||data[i+3]===255))points.push([x,y,'rgb('+data[i]+','+data[i+1]+','+data[i+2]+')',((x*73+y*137)%251)/251]);}
  return points;
}
function dissolve(c,from,to,p){
  c.clearRect(0,0,W,H);
  for(const [x,y,col,n] of from){if(n<p)continue;box(c,x+(p>.15?Math.round(p*(3+n*5)):0),y-Math.round(p*n*7),1,1,col);}
  for(const [x,y,col,n] of to){if(n>p)continue;box(c,x-Math.round((1-p)*n*7),y+Math.round((1-p)*n*5),1,1,col);}
  for(let i=0;i<7;i++){const a=i*2.4+p*2,r=12+sin(p*Math.PI)*24;petal(c,48+Math.cos(a)*r,35+sin(a)*r*.6,i%2?P.pinkLight:P.lav);}
}
export function mountMemoryStory(doc,win){
  const canvas=doc.getElementById('blossom'),host=canvas?.parentElement;
  if(!canvas||!host)return null;
  const c=canvas.getContext('2d'),a=raster(doc),b=raster(doc);if(!c||!a||!b)return null;
  canvas.width=W;canvas.height=H;c.imageSmoothingEnabled=false;host.classList.add('is-story');
  let elapsed=0, lastKind='', transition=null, reaction=0, look=0, reduced=false, down=null;
  const life=new win.AbortController(), {signal}=life;
  function draw(dt,staticMode=false){
    if(staticMode){if(elapsed<INTRO)elapsed=INTRO;reduced=true;art(c,'sakura',0);host.dataset.memoryScene='sakura';return null;}
    reduced=false;elapsed+=dt;reaction=Math.max(0,reaction-dt*.85);
    const beat=memoryBeat(elapsed),changed=beat.kind!==lastKind;
    if(changed){lastKind=beat.kind;host.dataset.memoryScene=beat.kind;transition=null;}
    if(beat.blend>0){
      if(!transition){art(a,beat.kind,beat.local);art(b,beat.next,0);transition=[pixels(a),pixels(b)];}
      dissolve(c,...transition,beat.blend);
    }else art(c,beat.kind,beat.local,reaction,look);
    return changed?beat.kind:null;
  }
  const react=e=>{
    if(reduced||elapsed<INTRO||memoryBeat(elapsed).blend>0)return;
    const r=host.getBoundingClientRect();look=clamp((e.clientX-r.left)/r.width*2-1,-1,1);reaction=1;
  };
  host.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')react(e);},{passive:true,signal});
  host.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&reaction>0){const r=host.getBoundingClientRect();look=clamp((e.clientX-r.left)/r.width*2-1,-1,1);}},{passive:true,signal});
  host.addEventListener('pointerdown',e=>{down=[e.pointerId,e.clientX,e.clientY];},{passive:true,signal});
  host.addEventListener('pointercancel',()=>{down=null;},{passive:true,signal});
  host.addEventListener('pointerup',e=>{if(down&&down[0]===e.pointerId&&Math.hypot(e.clientX-down[1],e.clientY-down[2])<12)react(e);down=null;},{passive:true,signal});
  return {draw,elapsed:()=>elapsed,reaction:()=>reaction,destroy:()=>life.abort()};
}
