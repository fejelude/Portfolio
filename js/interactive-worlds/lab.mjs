import {clamp, line, radial} from './draw.mjs';

// A mesh is split into sections perpendicular to its length. Vertices run
// around each section in the same order, so adjacent sections share edges.
function shell(sections, name, color, axis) {
 const width=sections[0].length, last=(sections.length-1)*width;
 const rim=Array.from({length:width},(_,i)=>i);
 const faces=[rim.slice().reverse(), rim.map(i=>last+i)];
 for(let offset=0;offset<last;offset+=width){
  for(const i of rim){
   const j=(i+1)%width;
   faces.push([offset+i,offset+j,offset+j+width,offset+i+width]);
  }
 }
 const vertices=sections.flat();
 const center=[0,1,2].map(dim=>vertices.reduce((sum,v)=>sum+v[dim],0)/vertices.length);
 return {vertices,faces,center,name,color,axis};
}

function box([x,y,z],[w,h,d],name,color,axis){
 return shell([-1,1].map(end=>[
  [x-w/2,y-h/2,z+end*d/2],[x+w/2,y-h/2,z+end*d/2],
  [x+w/2,y+h/2,z+end*d/2],[x-w/2,y+h/2,z+end*d/2]
 ]),name,color,axis);
}

function cylinder([x,y,z],radius,length,name,color,axis,along='z',sides=12){
 const sections=[-1,1].map(end=>Array.from({length:sides},(_,i)=>{
  const angle=i*Math.PI*2/sides,u=Math.cos(angle)*radius,v=Math.sin(angle)*radius;
  return along==='x'?[x+end*length/2,y+u,z+v]:[x+u,y+v,z+end*length/2];
 }));
 return shell(sections,name,color,axis);
}

// Short annular sections expose the shaft and the inside of the housing
// from either end, including when the motor is pulled apart.
function sleeve(x,outer,inner,length,name,color,axis){
 const mesh=cylinder([x,0,0],outer,length,name,color,axis,'x',16);
 const bore=cylinder([x,0,0],inner,length,name,color,axis,'x',16);
 const count=mesh.vertices.length,sides=count/2;
 mesh.vertices.push(...bore.vertices);
 mesh.faces=mesh.faces.slice(2);
 for(let i=0;i<sides;i++){
  const j=(i+1)%sides;
  mesh.faces.push([i,i+count,j+count,j],
   [i+sides,j+sides,j+sides+count,i+sides+count],
   [j+count,i+count,i+count+sides,j+count+sides]);
 }
 return mesh;
}

// Each car station defines the sill, shoulder and roof width independently.
function bodywork(stations,name,color,axis){
 return shell(stations.map(([x,sill,roof,w,topWidth])=>[
  [x,sill,-w*.8],[x,sill,w*.8],[x,sill+.035,w],[x,roof-.035,topWidth+.035],
  [x,roof,topWidth],[x,roof,-topWidth],[x,roof-.035,-topWidth-.035],[x,sill+.035,-w]
 ].reverse()),name,color,axis);
}

// Flat markings travel with their parent face in the depth sort. Thin trims
// and solar cells can then sit flush without flickering through the panel.
function marked(mesh, detail){
 mesh.detail=detail;
 return mesh;
}

function carBody(){
 const shell=bodywork([[-2.18,-.16,-.01,.57,.49],[-1.68,-.18,.19,.89,.79],[-1.12,-.19,.35,.95,.80],
  [-.55,-.18,.27,.86,.69],[.62,-.16,.30,.84,.70],[1.22,-.16,.39,.94,.78],[2.01,-.12,.22,.83,.75]],
  'Aero body shell','#52b6c2',shellLift);
 return marked(shell,(face,paint)=>{
  if(face<2)return;
  const station=Math.floor((face-2)/8),side=(face-2)%8;
  if(station===0&&side===2){
   paint('#d9f4ed',[[.04,.68],[.23,.54],[.23,.93],[.05,.93]]);
   paint('#d9f4ed',[[.77,.54],[.96,.68],[.95,.93],[.77,.93]]);
  }
  if((side===0||side===4)&&(station===2||station===3)){
   paint('#244855',[[.14,.20],[.78,.02],[.84,.88],[.41,.70]]);
  }
 });
}

function cabin(){
 const canopy=bodywork([[-1.05,.26,.36,.66,.59],[-.25,.28,.70,.70,.46],[.42,.28,.68,.67,.47],[1.23,.32,.39,.63,.54]],
  'Cabin canopy','#52798f',canopyLift);
 return marked(canopy,(face,paint)=>{
  if(face===12)paint('#89b9c3',[[.06,.06],[.94,.06],[.94,.94],[.06,.94]]);
  if(face===4)paint('#819cae',[[.08,.12],[.22,.12],[.46,.9],[.32,.9]]);
 });
}

function solarPanel(side){
 const name=side<0?'Solar array L':'Solar array R';
 const panel=box([0,.68,side*1.07],[2.6,.085,.81],name,'#bdc5c9',[0,.8,side*.95]);
 return marked(panel,(face,paint)=>{
  if(face!==4)return;
  for(let x=0;x<6;x++)for(let y=0;y<2;y++){
   const left=.025+x*.16,top=.065+y*.455;
   paint(y?'#495e9d':'#536ba4',[[left,top],[left+.149,top],[left+.149,top+.414],[left,top+.414]]);
  }
 });
}

function wheel(x,y,z,radius,width,name,axis){
 const side=Math.sign(z);
 return [
  cylinder([x,y,z],radius,width,name,'#374553',axis),
  cylinder([x,y,z+side*width*.52],radius*.67,width*.1,name,'#a0b6c4',axis),
  cylinder([x,y,z+side*width*.59],radius*.43,width*.08,name,'#425d69',axis, 'z',6)
 ];
}

const shellLift=[0,.78,0], canopyLift=[0,1.3,0],deckLift=[0,.65,0];
const models=[
 {name:'Concept EV',desc:'A low electric coupe with a removable canopy and a battery under the floor.',parts:[
  ...[-1.28,0,1.28].map(x=>box([x,-.24,0],[1.27,.15,1.68],'Battery platform','#566e88',[0,-.8,0])),
  carBody(),cabin(),
  box([1.52,-.02,0],[.55,.35,.94],'Rear drive unit','#c69ed2',[1.05,0,0]),
  box([1.953,.176,0],[.025,.044,1.4],'Aero body shell','#f48f97',shellLift),
  ...[-1.25,1.25].flatMap((x,i)=>[-1,1].flatMap(z=>wheel(x,-.17,z*.94,.39,.24,i?'Rear wheel':'Front wheel',[x*.44,-.24,z*.78])))
 ]},
 {name:'Electric motor',desc:'Pull the motor apart to see the copper windings, rotor and drive shaft.',parts:[
  sleeve(-.68,.9,.65,.68,'Outer housing','#548a99',[-.92,0,0]),
  ...[-.92,-.68,-.44].map(x=>sleeve(x,.98,.89,.055,'Outer housing','#90b5c1',[-.92,0,0])),
  sleeve(.02,.77,.48,.54,'Stator core','#8599af',[-.25,0,0]),
  ...Array.from({length:10},(_,i)=>{
   const angle=i*Math.PI/5,y=Math.cos(angle),z=Math.sin(angle);
   const coil=cylinder([.1,.66*y,.66*z],.125,.82,'Copper winding','#e9a06d',[.12,.65*y,.65*z],'x',8);
   return marked(coil,(face,paint)=>{
    if(face<2)return;
    for(const t of [.20,.47,.74])paint('#a46d51',[[0,t],[1,t],[1,t+.055],[0,t+.055]]);
   });
  }),
  cylinder([.53,0,0],.43,.62,'Rotor','#8db9b1',[.88,0,0],'x'),
  cylinder([1.02,0,0],.145,1.35,'Drive shaft','#d1cadd',[1.45,0,0],'x'),
  sleeve(-1.1,.32,.16,.15,'Bearing','#c4a6d8',[-1.55,0,0])
 ]},
 {name:'Lunar rover',desc:'Six wheels, folding solar panels and a stereo camera on a mast.',parts:[
  box([0,.03,0],[2.48,.50,1.44],'Chassis','#a89d87',[0,-.38,0]),
  marked(box([0,.44,0],[1.76,.32,1.22],'Electronics deck','#bfa988',deckLift),(face,paint)=>{
   if(face!==4)return;
   for(let i=0;i<5;i++){
    const x=.13+i*.09;
    paint('#706957',[[x,.17],[x+.035,.17],[x+.035,.72],[x,.72]]);
   }
  }),
  solarPanel(-1),solarPanel(1),
  box([.52,1,0],[.11,1,.11],'Sensor mast','#b4c6cc',[.35,.85,0]),
  box([.52,1.49,0],[.37,.27,.53],'Camera head','#d1c4a6',[.55,1.05,0]),
  ...[-.15,.15].map(z=>cylinder([.315,1.49,z],.085,.08,'Camera head','#455b72',[.55,1.05,0],'x',8)),
  ...[-.91,0,.91].flatMap(x=>[-1,1].flatMap(z=>wheel(x,-.36,z*.91,.37,.26,'Terrain wheel',[x*.5,-.55,z*.65])))
 ]}
];

function camera(yaw,pitch,zoom,w,h){
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 return (x,y,z)=>{
  const across=x*cy-z*sy,forward=x*sy+z*cy;
  const depth=forward*cp-y*sp,k=h*.245*zoom/(1+depth*.078);
  return [w/2+across*k,h*.58-(y*cp+forward*sp)*k,depth];
 };
}
export function project(v,yaw,pitch,zoom,w,h){return camera(yaw,pitch,zoom,w,h)(...v)}

// The models and the studio light are fixed in world space. Compute the
// material colors once; only vertex positions and visibility change in orbit.
for(const model of models){
 for(const mesh of model.parts){
  const rgb=mesh.color.slice(1).match(/../g).map(pair=>parseInt(pair,16));
  mesh.faces=mesh.faces.map((indices,index)=>{
   const [a,b,c]=indices.map(i=>mesh.vertices[i]);
   const u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]);
   const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
   const light=(-.38*normal[0]+.83*normal[1]-.4*normal[2])/(Math.hypot(...normal)||1);
   const shade=.59+Math.max(0,light)*.6;
   const markings=[];
   mesh.detail?.(index,(color,quad)=>markings.push({color,weights:quad.map(([u,v])=>[(1-u)*(1-v),u*(1-v),u*v,(1-u)*v])}));
   return {indices,markings,color:'rgb('+rgb.map(n=>Math.min(255,Math.round(n*shade))).join(',')+')'};
  });
 }
}

export function mount(api){
 const canvas=api.canvas(800,500),ctx=canvas.getContext('2d',{alpha:false});
 let yaw=.58,pitch=.34,zoom=1,explode=0,targetExplode=0,wire=false,spin=true,index=0,selected='',backdrop;
 function choose(i){
  if(i!==index)yaw=i===1?-.85:.58;
  index=i;selected='';updateParts();
  api.discover('model-'+i,models[i].name+' inspected. '+models[i].desc);
 }
 api.select('Invention',models.map((m,i)=>[String(i),m.name]),v=>choose(+v));
 api.button('Inspect invention',()=>choose(index));
 api.range('Exploded view',0,1.15,targetExplode,.05,v=>targetExplode=v);
 const zoomControl=api.range('Zoom',.55,1.5,zoom,.05,v=>zoom=v);
 api.button('Wireframe',b=>{wire=!wire;b.setAttribute('aria-pressed',String(wire))},false);
 const spinButton=api.button('Auto rotate',b=>{spin=!spin;b.setAttribute('aria-pressed',String(spin))},true);
 const part=api.select('Highlight part',[['','All components']],v=>{selected=v;api.say(v?'Highlighting '+v+'.':models[index].desc)});
 function updateParts(){
  part.replaceChildren();
  for(const name of ['',...new Set(models[index].parts.map(p=>p.name))]){
   const option=document.createElement('option');option.value=name;option.textContent=name||'All components';part.append(option);
  }
 }
 function changeZoom(value){zoom=clamp(value,.55,1.5);zoomControl.updateValue(zoom)}
 updateParts();
 api.drag(canvas,(dx,dy)=>{
  yaw+=dx/canvas.width*4;pitch=clamp(pitch+dy/canvas.height*2,-.65,1.1);
  spin=false;spinButton.setAttribute('aria-pressed','false');
 },factor=>changeZoom(zoom*factor));
 canvas.addEventListener('wheel',e=>{
  e.preventDefault();changeZoom(zoom-e.deltaY*.001);api.invalidate();
 },{passive:false});
 function resize(){
  canvas.width={Low:480,Medium:800,High:1200}[api.tier()]||800;
  canvas.height=Math.round(canvas.width/1.6);
  backdrop=radial(ctx,canvas.width*.48,canvas.height*.54,canvas.height*.93,[[0,'#23414c'],[.58,'#132933'],[1,'#0a1520']]);
 }
 function annotate(anchors,w,h){
  const font=Math.max(11,Math.round(h*.027)),pad=Math.round(w*.025);
  ctx.font=font+'px monospace';
  // Place each caption in its nearest margin; order by height so leader
  // lines stay apart as a model rotates or its assemblies separate.
  for(const right of [false,true]){
   const side=[...anchors].filter(([,p])=>(p[0]>=w/2)===right).sort((a,b)=>a[1][1]-b[1][1]);
   let previous=h*.13-font*1.8;
   side.forEach(([name,p],i)=>{
    const y=clamp(p[1],previous+font*1.8,h*.84-(side.length-i-1)*font*1.8);
    previous=y;
    const width=Math.ceil(ctx.measureText(name).width)+12,x=right?w-pad-width:pad,edge=right?x:x+width;
    line(ctx,p[0],p[1],edge,y,'#91c2c9',1);
    ctx.fillStyle='#e0fcf7';ctx.fillRect(p[0]-2,p[1]-2,4,4);
    ctx.fillStyle='#12252e';ctx.fillRect(x,y-font*.82,width,font*1.65);
    ctx.fillStyle='#e2f1ef';ctx.fillText(name,x+6,y+font*.34);
   });
  }
 }
 function draw(dt){
  if(spin)yaw+=dt*.19;
  explode=dt?explode+(targetExplode-explode)*(1-Math.exp(-dt*12)):targetExplode;
  const w=canvas.width,h=canvas.height,P=camera(yaw,pitch,zoom/(1+explode*(index===2?.45:.26)),w,h);
  ctx.fillStyle=backdrop;ctx.fillRect(0,0,w,h);
  for(let i=-5;i<=5;i++){
   const a=P(i,-1.05,-5),b=P(i,-1.05,5),c=P(-5,-1.05,i),d=P(5,-1.05,i);
   line(ctx,a[0],a[1],b[0],b[1],'#4b657436');line(ctx,c[0],c[1],d[0],d[1],'#4b657436');
  }
  const faces=[],anchors=new Map();
  for(const mesh of models[index].parts){
   const [ox,oy,oz]=mesh.axis.map(v=>v*explode);
   const points=mesh.vertices.map(([x,y,z])=>P(x+ox,y+oy,z+oz));
   const active=mesh.name===selected;
   const anchor=P(mesh.center[0]+ox,mesh.center[1]+oy,mesh.center[2]+oz);
   if((active||(!selected&&explode>.25))&&(!anchors.has(mesh.name)||anchors.get(mesh.name)[2]>anchor[2]))anchors.set(mesh.name,anchor);
   for(const face of mesh.faces){
    const [i,j,k]=face.indices,a=points[i],b=points[j],c=points[k];
    const facing=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    if(facing<=0&&!wire)continue;
    const depth=face.indices.reduce((sum,n)=>sum+points[n][2],0)/face.indices.length;
    faces.push({points,face,depth,active});
   }
  }
  faces.sort((a,b)=>b.depth-a.depth);
  ctx.lineJoin='round';
  for(const {points,face,active} of faces){
   ctx.globalAlpha=selected&&!active?.22:1;
   ctx.beginPath();
   for(let i=0;i<face.indices.length;i++){
    const p=points[face.indices[i]];if(i===0)ctx.moveTo(p[0],p[1]);else ctx.lineTo(p[0],p[1]);
   }
   ctx.closePath();
   if(!wire){ctx.fillStyle=face.color;ctx.fill()}
   ctx.strokeStyle=active?'#b4f7ed':wire?'#83c4ce':'#1b344650';
   ctx.stroke();
   if(!wire&&face.markings.length){
    const [a,b,c,d]=face.indices.map(i=>points[i]);
    for(const {color,weights} of face.markings){
     ctx.fillStyle=color;ctx.beginPath();
     for(let i=0;i<weights.length;i++){
      const [wa,wb,wc,wd]=weights[i];
      const x=a[0]*wa+b[0]*wb+c[0]*wc+d[0]*wd,y=a[1]*wa+b[1]*wb+c[1]*wc+d[1]*wd;
      if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
     }
     ctx.closePath();ctx.fill();
    }
   }
  }
  ctx.globalAlpha=1;
  annotate(anchors,w,h);
  const font=Math.max(10,Math.round(h*.025));
  ctx.font=font+'px monospace';ctx.fillStyle='#add2d3';
  ctx.fillText(models[index].name.toUpperCase(),w*.025,h*.07);
 }
 return {draw,resize};
}
