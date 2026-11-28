// The scenery is painted once per viewport size at a deliberate pixel scale.
// The authored branch contours are the anchors for the blossom clusters.
const branches = [
  [[0,1,13],[.04,.88,11],[.015,.70,9],[.09,.56,7],[.18,.42,5],[.29,.34,3],[.37,.235,1]],
  [[.03,.78,8],[.19,.67,6],[.37,.63,4],[.55,.51,2],[.63,.46,1]],
  [[.08,.59,6],[-.02,.48,4],[-.10,.35,2],[-.13,.27,1]],
  [[.095,.55,6],[.25,.49,5],[.42,.43,3],[.61,.37,2],[.77,.27,1]],
  [[.17,.43,5],[.12,.34,4],[.12,.24,3],[.22,.15,1]],
  [[.26,.36,4],[.41,.32,3],[.48,.22,2],[.59,.17,1]],
  [[.34,.64,3],[.43,.55,2],[.42,.49,1]],
  [[.50,.39,3],[.63,.42,2],[.72,.39,1]],
];
const crowns = [
  [-.13,.29,.20,.095],[-.06,.41,.19,.075],[.10,.25,.23,.14],[.24,.16,.25,.082],
  [.35,.255,.235,.095],[.49,.18,.225,.09],[.64,.255,.23,.077],[.72,.34,.195,.075],
  [.53,.395,.19,.072],[.36,.40,.20,.08],[.12,.47,.19,.078],[.42,.54,.19,.065],
  [.61,.475,.20,.06],[.43,.625,.21,.058]
];
const pinks = ['#ad789d','#c48bb0','#dda2bf','#efb5cf','#f6c7d9','#ffdeeb','#fff0ec'];
const petals = [
  ['...hh...','..hpph..','hhpppphh','hppcppph','.hpppph.','..hpph..','...hh...'],
  ['.hh....','hpph...','hppph..','.hppph.','..hppph','...hhh.'],
];
const heart = ['.oo.oo.','oppoppo','opphppo','.opppo.','..opo..','...o...'];
const rose = ['..ooo..','.opppo.','ophhppo','ophohpo','opphppo','.opppo.','..gog..','...g...'];
const sparkle = ['..h..','..h..','hhhhh','..h..','..h..'];
const inks = {o:'#ad527b',p:'#dd83aa',h:'#fff2ee',c:'#f4c383',g:'#82a18b'};

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed,1664525)+1013904223)>>>0;
    return seed / 4294967296;
  };
}

function rect(ctx,x,y,w,h,color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x),Math.round(y),w,h);
}

function sprite(ctx,pattern,x,y,colors,scale=1) {
  pattern.forEach((row,j) => {
    for (let i=0;i<row.length;i++) {
      const color=colors[row[i]];
      if (color) rect(ctx,x+i*scale,y+j*scale,scale,scale,color);
    }
  });
}

function silhouette(ctx,points,shade,shift=0,thin=1) {
  for(let j=1;j<points.length;j++){
    const [ax,ay,aw]=points[j-1], [bx,by,bw]=points[j];
    const steps=Math.max(1,Math.ceil(Math.max(Math.abs(bx-ax),Math.abs(by-ay))));
    for(let s=0;s<=steps;s++){
      const t=s/steps;
      const radius=Math.max(1,Math.round((aw+(bw-aw)*t)*thin));
      rect(ctx,ax+(bx-ax)*t-radius/2+shift,ay+(by-ay)*t, radius,Math.max(1,Math.round(radius*.72)),shade);
    }
  }
}

function blossomMass(ctx,x,y,rx,ry,random,distant=false) {
  const lobes=[[-.65,.11,.45,.53],[-.34,-.25,.48,.61],[.03,-.37,.57,.56],[.39,-.13,.55,.68],[.66,.15,.36,.53],[.09,.34,.74,.48]];
  for(let j=0;j<lobes.length;j++){
    const [ox,oy,sx,sy]=lobes[j];
    const a=rx*sx,b=ry*sy,lx=x+rx*ox,ly=y+ry*oy;
    for(let yy=-Math.ceil(b);yy<=b;yy++){
      const band=yy/b;
      const span=a*Math.sqrt(Math.max(0,1-band**2))*(.86+random()*.23);
      const shade=band+(random()-.5)*.18;
      const tone=distant?(shade<.24?'#e5c5dc':'#dec0d8'):pinks[shade<-.49?5:shade<-.03?4:shade<.44?3:j%3===0?1:2];
      rect(ctx,lx-span,ly+yy,Math.ceil(span*2),1,tone);
    }
    const count=Math.round(a*b*(distant?.06:.23));
    for(let i=0;i<count;i++){
      const angle=random()*Math.PI*2,r=Math.sqrt(random())*.88;
      const xx=lx+Math.cos(angle)*a*r,yy=ly+Math.sin(angle)*b*r;
      const tone=distant?'#f0d4e3':pinks[Math.min(6,Math.floor(random()*3)+(yy<ly?4:2))];
      const scale=1+Math.floor(random()*3);
      rect(ctx,xx,yy,scale,1+Math.round(random()),tone);
      if(!distant&&i%5===0)rect(ctx,xx+1,yy-1,1,1,tone);
    }
  }
}

function drawTree(ctx, origin, top, height, reach, side, seed, variant) {
  const random=seeded(seed);
  const widthScale=Math.max(0.6,Math.min(1.25,height/240));
  const project=(x,y)=>[origin+side*x*reach,top+y*height];
  const limbs=branches.map((branch,index)=>branch.map(([x,y,r])=>[
    ...project(x+(index?variant*y*.13:0),y+(index?variant*x*.11:0)),r*widthScale
  ]));
  limbs.forEach(limb=>silhouette(ctx,limb,'#89637f'));
  limbs.forEach(limb=>silhouette(ctx,limb,'#ab7d93',side*1.1,.64));
  silhouette(ctx,limbs[0],'#ce9fa9',-side*1.5,.24);
  for(const [x,y,rx,ry] of [...crowns].sort((a,b)=>b[1]-a[1])){
    const wobble=(random()-.5)*.08;
    const [cx,cy]=project(x+variant*y*.15+wobble,y+variant*x*.12);
    blossomMass(ctx,cx,cy,reach*rx*(.9+random()*.23),height*ry,random);
  }
  // Five-petal highlights at selected bough tips, with gaps left for sky.
  for(const [x,y] of [[.57,.21],[.20,.198],[.70,.32],[.52,.47],[.33,.40]]){
    const [xx,yy]=project(x+variant*y*.13,y+variant*x*.10);
    sprite(ctx,petals[0],xx,yy,{h:'#fff4ec',p:'#efb4ce',c:'#d995ad'});
  }
}

function paintGrove(ctx,w,h,portrait) {
  const random=seeded(609);
  const shore=h*(portrait?.87:.81);
  for(let i=0;i<11;i++){
    const x=(i+.35)*w/11, y=shore-h*(.11+random()*.12);
    const spread=w*(.038+random()*.022);
    silhouette(ctx,[[x,shore+12,3],[x-2,y,1]],'#e0bed2');
    blossomMass(ctx,x,y,spread,h*(.042+random()*.035),random,true);
  }
  for(let x=0;x<w;x++){
    const step=Math.sin(x*.075)*2+Math.sin(x*.019)*4;
    rect(ctx,x,shore+step,1,Math.ceil(h-shore-step),'#f6dadd');
    rect(ctx,x,shore+h*.08+step,1,Math.ceil(h*.18),'#fbe5df');
  }
  for(let i=0;i<135;i++){
    const x=random()*w, y=shore+random()*(h-shore);
    const color=['#e6bccb','#f1cad7','#fff2e7','#d9bdd8'][i%4];
    rect(ctx,x,y,1+Math.floor(random()*3),1,color);
  }
  // Small tufts and fallen blossoms tie the wide trunks into the meadow.
  for(let i=0;i<42;i++){
    const x=(i%2===0?.07+random()*.15:.79+random()*.16)*w;
    const y=h*(.92+random()*.079);
    rect(ctx,x,y,1,2+i%3,'#b8ad9b');
    if(i%4===0)rect(ctx,x+1,y+2,2,1,'#dbadc4');
  }
  if(portrait){
    drawTree(ctx,3,-h*.10,h*.85,w*.63,1,770,-.55);
    drawTree(ctx,w-2,-h*.21,h*.94,w*.55,-1,557,.64);
    return;
  }
  const reach=Math.min(w*.33,h*.51);
  drawTree(ctx,w*.064,-h*.065,h*1.06,reach,1,770,-.55);
  drawTree(ctx,w*.936,-h*.17,h*1.16,reach*.94,-1,557,.64);
}

function paintDetails(doc) {
  const emblem=doc.getElementById('blossom').getContext('2d');
  const garden=doc.getElementById('garden').getContext('2d');
  if(emblem){
    const crest=['.......oo.......','......oppo......','.....ophhpo.....','..oo.oppppo.oo..','.oppooppppooppo.','ophhpppppppphhpo','opppppccccpppppo','.opppccYYccpppo.','..ooppccccppoo..','...oppppppppo...','..ophpppppphpo..','..oppppooppppo..','...oppo..oppo...','....oo....oo....'];
    sprite(emblem,crest,8,8,{...inks,Y:'#fff8d2'});
    sprite(emblem,sparkle,2,7,{h:'#bb90c2'});
    sprite(emblem,sparkle,25,22,{h:'#cb9dbf'});
  }
  if(garden){
    rect(garden,0,23,160,1,'#e0bbcc');
    const heights=[4,10,7,2,10,4,8,5,11,6,3];
    heights.forEach((y,i)=>{
      const x=9+i*14;
      rect(garden,x,y+5,1,18-y,'#789b83');
      rect(garden,x-2,19,3,1,'#a2b196');
      rect(garden,x+1,16,3,1,'#8eac90');
      sprite(garden,i%3===0?rose:petals[0],x-3,y,
        i%3===1?{...inks,o:'#af89bb',p:'#d9bfdc'}:inks);
    });
  }
}

export function mountMemoryGarden(doc=document, win=window) {
  const grove=doc.getElementById('grove');
  const layer=doc.getElementById('petals');
  const ctx=grove.getContext('2d');
  const motion=win.matchMedia('(prefers-reduced-motion: reduce)');
  const life=new win.AbortController();
  const {signal}=life;
  const random=seeded(271);
  let frame=0,lastWidth=0,lastHeight=0,suspended=false;

  // Reusable pixel sprites. CSS moves the small tiles independently of the grove.
  const kinds=[petals[0],petals[1],heart,rose,sparkle];
  const images=kinds.map(pattern=>{
    const stamp=doc.createElement('canvas');
    stamp.width=stamp.height=9;
    const tile=stamp.getContext('2d');
    if(!tile)return '';
    sprite(tile,pattern,0,0,inks);
    return stamp.toDataURL();
  });
  const fragments=doc.createDocumentFragment();
  for(let i=0;i<24;i++){
    const fleck=doc.createElement('i');
    const kind=i<17?i%2:i<19?2:i<21?3:4;
    const rising=kind===2||kind===3;
    fleck.className='garden-fleck';
    if(rising)fleck.classList.add('garden-fleck--rise');
    if(kind===4)fleck.classList.add('garden-fleck--glint');
    fleck.style.backgroundImage=images[kind]?`url(${images[kind]})`:'none';
    fleck.style.left=`${(i%2?54:5)+random()*41}%`;
    fleck.style.setProperty('--size',`${(kind===3?12:8)+Math.round(random()*6)}px`);
    fleck.style.setProperty('--drift',`${18+random()*42}px`);
    fleck.style.setProperty('--duration',`${(rising?25:17)+random()*17}s`);
    fleck.style.setProperty('--delay',`${-random()*35}s`);
    if(kind===4)fleck.style.top=`${12+random()*70}%`;
    fragments.append(fleck);
  }
  layer.append(fragments);

  function draw() {
    frame=0;
    const width=Math.max(1,grove.clientWidth);
    const height=Math.max(1,grove.clientHeight);
    if(!ctx||(width===lastWidth&&height===lastHeight))return;
    lastWidth=width;
    lastHeight=height;
    const cell=Math.max(2.5,Math.sqrt(width*height/165000));
    grove.width=Math.ceil(width/cell);
    grove.height=Math.ceil(height/cell);
    paintGrove(ctx,grove.width,grove.height,width<=640&&height>width);
  }

  function onResize() {
    if(!frame&&!doc.hidden&&!suspended)frame=win.requestAnimationFrame(draw);
  }

  function sync() {
    const paused=doc.hidden||suspended||motion.matches;
    doc.documentElement.toggleAttribute('data-garden-paused',paused);
    if(doc.hidden||suspended){
      win.cancelAnimationFrame(frame);
      frame=0;
    }else onResize();
  }
  doc.addEventListener('visibilitychange',sync,{signal});
  motion.addEventListener('change',sync,{signal});
  win.addEventListener('resize',onResize,{passive:true,signal});
  win.addEventListener('pagehide',event=>{
    suspended=true;
    sync();
    if(!event.persisted)life.abort();
  },{signal});
  win.addEventListener('pageshow',()=>{
    suspended=false;
    sync();
  },{signal});

  paintDetails(doc);
  draw();
  sync();
}
