/* The affine basis is exported by the Blender camera at the plane of the hands. */
export function watchSVG({dial}){
 const [[x,y],[xx,xy],[yx,yy]]=dial;
 const projection=[(xx-x)/100,(xy-y)/100,(yx-x)/100,(yy-y)/100,x,y].join(' ');
 return `<svg class="ft-dial" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
  <defs><linearGradient id="ft-hand-metal"><stop stop-color="#9b5e45"/><stop offset=".43" stop-color="#fff1cc"/><stop offset=".57" stop-color="#e2ae83"/><stop offset="1" stop-color="#8e503b"/></linearGradient></defs>
  <g transform="matrix(${projection})">
   <g id="ft-hour-hand"><path d="M-3 8-4-23 0-45 4-23 3 8Z" fill="url(#ft-hand-metal)" stroke="#261a23" stroke-width="1.4"/><path d="M0-38V-7" stroke="#ffead1" opacity=".7"/></g>
   <g id="ft-minute-hand"><path d="M-2.5 10-3.2-30 0-57 3.2-30 2.5 10Z" fill="url(#ft-hand-metal)" stroke="#261a23" stroke-width="1.15"/><path d="M0-48V-12" stroke="#ffead1" opacity=".68"/></g>
   <g id="ft-second-hand"><path d="M0 14V-62" stroke="#93d4ec" stroke-width="1.15"/><circle cx="0" cy="13" r="2.2" fill="#93d4ec"/></g>
   <circle r="4" fill="#efbe93" stroke="#442a30" stroke-width="1.4"/><circle r="1.6" fill="#a94258"/>
  </g>
 </svg>`;
}

const LOOP = 24_000;
const FRAMES_PER_SHEET = 8;

function loadImage(url){
 return new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=reject;
  image.src=url;
 });
}

export function mountMovement(canvas,manifest){
 const ctx=canvas.getContext('2d');
 if(!ctx)return ()=>{};
 const {patches,tile,sheets,size}=manifest;
 let pending,images,frame=0,started=null,elapsed=0,drawn=-Infinity,running=false;
 const interval=1000/24;
 canvas.width=size;canvas.height=size;
 function draw(index,alpha){
  const sheet=images[Math.floor(index/FRAMES_PER_SHEET)];
  const i=index%FRAMES_PER_SHEET,col=i%4,row=Math.floor(i/4);
  ctx.globalAlpha=alpha;
  for(const {x,y,w,h,offset} of patches)ctx.drawImage(sheet,col*tile[0]+offset,row*tile[1],w,h,x,y,w,h);
 }
 function tick(now){
  if(!running)return;
  if(started===null)started=now;
  if(now-drawn>=interval-2){
   const phase=((now-started+elapsed)%LOOP)/1000,index=Math.floor(phase);
   ctx.clearRect(0,0,canvas.width,canvas.height);
   draw(index,1);
   draw((index+1)%24,phase-index);
   canvas.hidden=false;
   drawn=now;
  }
  frame=requestAnimationFrame(tick);
 }
 function start(){
  if(!running||frame)return;
  if(images){frame=requestAnimationFrame(tick);return}
  if(!pending)pending=Promise.all(sheets.map(loadImage)).then(result=>{images=result;start()}).catch(()=>{});
 }
 return active=>{
  if(running===active)return;
  running=active;
  if(active)start();
  else{
   cancelAnimationFrame(frame);frame=0;
   if(started!==null)elapsed=(elapsed+performance.now()-started)%LOOP;
   started=null;drawn=-Infinity;
  }
 };
}
