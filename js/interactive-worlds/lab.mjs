import {clamp,poly,line,label,radial} from './draw.mjs';
const mul=(v,s)=>v.map(n=>n*s);
const add=(a,b)=>a.map((n,i)=>n+b[i]);
function box(center,size,name,color,axis){
 const [x,y,z]=size.map(v=>v/2),vertices=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]].map(v=>add(v,center));
 return {center,vertices,faces:[[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[0,3,7,4],[1,5,6,2]],name,color,axis};
}
function cylinder(center,radius,length,name,color,axis,along='z',n=16){
 const vertices=[],faces=[];for(const end of [-1,1])for(let i=0;i<n;i++){const a=i*Math.PI*2/n,rad=[Math.cos(a)*radius,Math.sin(a)*radius,end*length/2];vertices.push(add(along==='x'?[rad[2],rad[0],rad[1]]:rad,center))}
 for(let i=0;i<n;i++)faces.push([i,(i+1)%n,(i+1)%n+n,i+n]);faces.push(Array.from({length:n},(_,i)=>i),Array.from({length:n},(_,i)=>i+n).reverse());
 return {center,vertices,faces,name,color,axis};
}
function prism(profile,width,name,color,axis){const vertices=[...profile.map(p=>[...p,-width/2]),...profile.map(p=>[...p,width/2])];const n=profile.length,faces=[Array.from({length:n},(_,i)=>i),Array.from({length:n},(_,i)=>i+n).reverse()];for(let i=0;i<n;i++)faces.push([i,(i+1)%n,(i+1)%n+n,i+n]);return {center:[0,0,0],vertices,faces,name,color,axis}}
const models=[
 {name:'Concept EV',desc:'Battery, aero shell, wheels and cabin. A fictional electric hypercar concept.',parts:[
 box([0,-.25,0],[3.8,.18,1.75],'Battery platform','#459cae',[0,-.85,0]),
 prism([[-2,-.1],[-1.9,.28],[-.9,.45],[-.4,.9],[.6,.9],[1.35,.38],[2,.15],[2,-.1]],1.75,'Aero body shell','#65c3d3',[0,.85,0]),
 prism([[-.82,.48],[-.42,.87],[.55,.87],[1.1,.48]],1.48,'Cabin canopy','#9ce8ef',[0,1.45,0]),
 box([1.58,-.07,0],[.49,.27,.92],'Rear drive unit','#c4a0f0',[1.1,0,0]),
 ...[-1.18,1.25].flatMap((x,i)=>[-1,1].map(z=>cylinder([x,-.15,z],.44,.28,i===0?'Front wheel':'Rear wheel','#52667a',[x*.45,-.3,z*.8])))
 ]},
 {name:'Electric motor',desc:'A cutaway-inspired conceptual motor, with housing, rotor, coils and shaft.',parts:[
 cylinder([-.65,0,0],.95,.52,'Outer housing','#5fb4c4',[-1.4,0,0],'x'),
 cylinder([.05,0,0],.69,.58,'Stator core','#7eacc4',[-.4,0,0],'x'),
 ...Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return box([.1,Math.cos(a)*.7,Math.sin(a)*.7],[.66,.15,.16],'Copper winding','#d9a16e',[.15,Math.cos(a)*.55,Math.sin(a)*.55])}),
 cylinder([.64,0,0],.47,.59,'Rotor','#91d9dd',[1,0,0],'x'),
 cylinder([1.1,0,0],.12,1.3,'Drive shaft','#c0d9e5',[1.7,0,0],'x'),
 cylinder([-.62,0,0],.23,.25,'Bearing','#c0b1e6',[-1.9,0,0],'x')
 ]},
 {name:'Lunar rover',desc:'A little exploration robot with solar panels, sensor mast and six wheels.',parts:[
 box([0,.03,0],[2.55,.55,1.55],'Chassis','#6fa7bb',[0,-.4,0]),
 box([0,.46,0],[1.82,.35,1.35],'Electronics deck','#9ac6d0',[0,.7,0]),
 box([0,.85,-1],[2.7,.09,.78],'Solar array L','#647fe0',[0,.85,-1.1]),
 box([0,.85,1],[2.7,.09,.78],'Solar array R','#647fe0',[0,.85,1.1]),
 box([.5,1.02,0],[.1,1.05,.1],'Sensor mast','#a5cbd8',[.5,1.1,0]),
 box([.5,1.6,0],[.5,.31,.4],'Camera head','#9ee6e8',[.7,1.5,0]),
 ...[-.92,0,.92].flatMap(x=>[-1,1].map(z=>cylinder([x,-.36,z*.94],.42,.25,'Terrain wheel','#52667a',[x*.5,-.6,z*.7])))
 ]}
];
export function project(v,yaw,pitch,zoom,w,h){const a=Math.cos(yaw),b=Math.sin(yaw),p=Math.cos(pitch),q=Math.sin(pitch),x=v[0]*a-v[2]*b,z=v[0]*b+v[2]*a,y=v[1]*p-z*q,depth=v[1]*q+z*p;const k=h*.27*zoom/(1+depth*.085);return [w/2+x*k,h*.56-y*k,depth]}
export function mount(api){
 const c=api.canvas(800,500),ctx=c.getContext('2d',{alpha:false});let yaw=.65,pitch=.30,zoom=1,explode=.25,wire=false,spin=true,index=0,selected='';
 const choose=i=>{index=i;selected='';updateParts();api.discover('model-'+i,models[i].name+' inspected. '+models[i].desc)};
 api.select('Invention',models.map((m,i)=>[String(i),m.name]),v=>choose(+v));api.button('Inspect invention',()=>choose(index));
 api.range('Exploded view',0,1.15,explode,.05,v=>explode=v);
 const zoomControl=api.range('Zoom',.55,1.5,zoom,.05,v=>zoom=v);
 api.button('Wireframe',b=>{wire=!wire;b.setAttribute('aria-pressed',String(wire))},false);
 const spinButton=api.button('Auto rotate',b=>{spin=!spin;b.setAttribute('aria-pressed',String(spin))},true);
 const part=api.select('Highlight part',[['','All components']],v=>{selected=v;api.say(v?'Highlighting '+v+'.':models[index].desc)});
 function updateParts(){part.replaceChildren();for(const name of ['',...new Set(models[index].parts.map(p=>p.name))]){const o=document.createElement('option');o.value=name;o.textContent=name||'All components';part.append(o)}}
 updateParts();api.drag(c,(dx,dy)=>{yaw+=dx/c.width*4;pitch=clamp(pitch+dy/c.height*2,-.65,1.1);spin=false;spinButton.setAttribute('aria-pressed','false')},factor=>{zoom=clamp(zoom*factor,.55,1.5);zoomControl.updateValue(zoom)});
 c.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom-e.deltaY*.001,.55,1.5);zoomControl.updateValue(zoom);api.invalidate()},{passive:false});
 function resize(){c.width={Low:480,Medium:800,High:1200}[api.tier()]||800;c.height=Math.round(c.width/1.6)}
 function draw(dt,t){if(spin)yaw+=dt*.23;const w=c.width,h=c.height;
  ctx.fillStyle=radial(ctx,w*.5,h*.5,h*.9,[[0,'#173c49'],[.48,'#10232f'],[1,'#080e1b']]);ctx.fillRect(0,0,w,h);
  const P=v=>project(v,yaw,pitch,zoom,w,h);
  // Perspective floor below the floating hologram.
  for(let i=-6;i<=6;i++){let a=P([i,-1.2,-6]),b=P([i,-1.2,6]);line(ctx,a[0],a[1],b[0],b[1],'#32607455');a=P([-6,-1.2,i]);b=P([6,-1.2,i]);line(ctx,a[0],a[1],b[0],b[1],'#32607455')}
  const faces=[],tags=[];
  for(const p of models[index].parts){const delta=mul(p.axis,explode),points=p.vertices.map(v=>P(add(v,delta)));for(const face of p.faces){const pts=face.map(i=>points[i]);faces.push({pts,depth:pts.reduce((s,v)=>s+v[2],0)/pts.length,p})}if(!tags.some(x=>x.name===p.name))tags.push({name:p.name,p:P(add(p.center,delta))});}
  faces.sort((a,b)=>b.depth-a.depth);
  for(const f of faces){const emphasis=!selected||selected===f.p.name;ctx.globalAlpha=emphasis?1:.23;const pts=f.pts.map(v=>v.slice(0,2));poly(ctx,pts,wire?'#1b526220':f.p.color+'a8',emphasis?'#a4edf2bb':'#718a98');}
  ctx.globalAlpha=1;
  const scanY=h*.18+(Math.sin(t*1.15)*.5+.5)*h*.64;line(ctx,w*.08,scanY,w*.92,scanY,'#74deed33',1);
  if(explode>.2||selected){for(const [i,tag] of tags.entries()){if(selected&&selected!==tag.name)continue;const right=i%2===0,tx=right?w*.73:w*.035,ty=h*.18+i*(h*.65/Math.max(1,tags.length));line(ctx,tag.p[0],tag.p[1],right?tx-8:tx+w*.14,ty-4,'#9fdce7a0');ctx.fillStyle='#0c202cdd';ctx.fillRect(tx-4,ty-12,Math.min(w*.25,tag.name.length*h*.011+9),h*.038);label(ctx,tag.name,tx,ty,'#c7f8f9',Math.max(9,Math.round(h*.024)));}}
  label(ctx,'HOLOGRAPHIC MODEL / 0'+(index+1),w*.025,h*.055,'#b1f2ef',Math.max(10,Math.round(h*.026)));label(ctx,'DRAG TO ORBIT',w*.025,h*.95,'#93bac9',Math.max(9,Math.round(h*.021)));
 }
 return {draw,resize};
}
