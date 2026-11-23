import {clamp} from './draw.mjs';
const APPS=[['terminal','Terminal','>_'],['files','Files','▤'],['paint','Paint','✦'],['calculator','Calculator','+−'],['settings','Settings','⚙']];
export function calculate(expression){
 if(typeof expression!=='string'||expression.length>120)throw Error('Expression is too long');
 const s=expression.replace(/\s+/g,'');let at=0;
 function number(){const m=s.slice(at).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);if(!m)throw Error('Expected a number');at+=m[0].length;return Number(m[0])}
 function factor(){if(s[at]==='+'){at++;return factor()}if(s[at]==='-'){at++;return -factor()}if(s[at]==='('){at++;const n=sum();if(s[at++]!==')')throw Error('Missing closing bracket');return n}return number()}
 function product(){let n=factor();while(s[at]==='*'||s[at]==='/'){const op=s[at++],v=factor();n=op==='*'?n*v:n/v}return n}
 function sum(){let n=product();while(s[at]==='+'||s[at]==='-'){const op=s[at++],v=product();n=op==='+'?n+v:n-v}return n}
 const result=sum();if(at!==s.length||!Number.isFinite(result))throw Error('Invalid expression');return Number(result.toPrecision(12))
}
export function command(input){const text=String(input).trim().slice(0,160);const cmd=text.toLowerCase();
 if(cmd==='help')return 'help · ls · about · whoami · date · echo [text] · cat readme.txt · cat secret.txt · clear';
 if(cmd==='ls')return 'readme.txt     secret.txt     apps/';
 if(cmd==='about')return 'FejeOS v1.0 / a fictional desktop experiment. No access to your real filesystem.';
 if(cmd==='whoami')return 'guest@fejeos';
 if(cmd==='date')return new Date().toLocaleString();
 if(cmd==='cat readme.txt')return 'Welcome! Open the apps, play around and have fun hehe :)';
 if(cmd==='cat secret.txt')return 'The best worlds are the ones you make yourself. Secret found!';
 if(cmd.startsWith('echo '))return text.slice(5);
 if(cmd==='clear')return '';
 if(!cmd)return '';
 return 'Command not found. Type help for the available commands.'
}
export function mount(api){
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
 const desktop=el('div','iw-os');desktop.setAttribute('data-wallpaper','violet');const icons=el('div','iw-os-icons'),bar=el('div','iw-os-taskbar'),windows=new Map();let z=3;
 const start=el('span','','✦ FEJEOS / v1.0'),clock=el('span','','00:00');bar.append(start,clock);
 desktop.append(icons,bar);api.stage.replaceChildren(desktop);
 function btn(text,fn){const b=el('button','',text);b.type='button';b.addEventListener('click',fn);return b}
 function front(w){
  const current=desktop.querySelector('[data-front]');
  if(current===w)return;
  current?.removeAttribute('data-front');
  w.setAttribute('data-front','');
  w.style.zIndex=String(++z);
 }
 function open(id){
  const info=APPS.find(a=>a[0]===id);if(!info)return;
  if(windows.has(id)){const w=windows.get(id);front(w);w.querySelector('.iw-os-title').focus();return}
  const w=el('section','iw-os-window');w.dataset.app=id;w.setAttribute('aria-label',info[1]);const offset=windows.size%4*14;w.style.left=(12+offset)+'px';w.style.top=(38+offset)+'px';
  const title=el('header','iw-os-title');title.tabIndex=0;title.append(el('span','',info[1]));const close=btn('×',()=>{w.remove();windows.delete(id);icons.querySelector('[data-app-open="'+id+'"]').focus()});close.setAttribute('aria-label','Close '+info[1]);title.append(close);
  const content=el('div','iw-os-content');w.append(title,content);desktop.append(w);windows.set(id,w);front(w);let drag=null;
  function move(x,y){const maxX=Math.max(0,desktop.clientWidth-w.offsetWidth),maxY=Math.max(0,desktop.clientHeight-w.offsetHeight-44);w.style.left=clamp(x,0,maxX)+'px';w.style.top=clamp(y,0,maxY)+'px'}
  title.addEventListener('pointerdown',e=>{if(e.target.closest('button')||e.button>0)return;drag={x:e.clientX-w.offsetLeft,y:e.clientY-w.offsetTop};try{title.setPointerCapture(e.pointerId)}catch{};front(w)});
  title.addEventListener('pointermove',e=>{if(drag)move(e.clientX-drag.x,e.clientY-drag.y)});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])title.addEventListener(type,()=>drag=null);
  title.addEventListener('keydown',e=>{if(e.target!==title)return;const steps={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]};if(steps[e.key]){e.preventDefault();move(w.offsetLeft+steps[e.key][0],w.offsetTop+steps[e.key][1])}});
  w.addEventListener('pointerdown',()=>front(w));
  w.addEventListener('focusin',()=>front(w));
  if(id==='terminal')terminal(content);
  if(id==='files')files(content);
  if(id==='paint')paint(content);
  if(id==='calculator')calculator(content);
  if(id==='settings')settings(content);
  move(w.offsetLeft,w.offsetTop);api.discover(id,info[1]+' opened.');title.focus({preventScroll:true});
 }
 function terminal(content){
  const output=el('pre','','FEJEOS TERMINAL v1.0\nType help to see what you can do.\n'),form=el('form'),input=el('input');input.setAttribute('aria-label','Terminal command');input.placeholder='guest@fejeos:~$';input.maxLength=160;input.autocomplete='off';const row=el('div','iw-os-row'),run=el('button','','Run');run.type='submit';row.append(run);form.append(input,row);content.append(output,form);
  form.addEventListener('submit',e=>{e.preventDefault();const value=input.value;output.textContent=value.trim().toLowerCase()==='clear'?'':(output.textContent+'\n$ '+value+'\n'+command(value)+'\n').slice(-6000);input.value='';input.focus()});
 }
 function files(content){
  const text=el('pre','','Select a file to read it.');for(const name of ['readme.txt','secret.txt'])content.append(btn('▤ '+name,()=>{text.textContent=command('cat '+name);if(name==='secret.txt')api.say('Secret note discovered!')}));content.append(text);
 }
 function calculator(content){
  const form=el('form'),input=el('input');input.placeholder='(12 + 8) * 3';input.setAttribute('aria-label','Calculator expression');input.maxLength=120;const row=el('div','iw-os-row'),equals=el('button','','Calculate');equals.type='submit';const result=el('p','','0');result.setAttribute('role','status');row.append(equals,btn('Clear',()=>{input.value='';result.textContent='0'}));form.append(input,row,result);content.append(form);
  form.addEventListener('submit',e=>{e.preventDefault();try{result.textContent=String(calculate(input.value))}catch{result.textContent='Check the expression and try again.'}});
 }
 function paint(content){
  const c=el('canvas');c.width=360;c.height=180;c.setAttribute('aria-label','Paint canvas');const ctx=c.getContext('2d');let color='#7952bc',size=7,prev=null;
  const clear=()=>{ctx.fillStyle='#f6eef9';ctx.fillRect(0,0,c.width,c.height)};clear();const row=el('div','iw-os-row');
  const swatches=[['Violet','#7952bc'],['Rose','#e77ba6'],['Blue','#56a7b9'],['Green','#40886d'],['Ink','#34223d']];
  for(const [name,value] of swatches){
   const b=btn('●',()=>{
    color=value;
    for(const swatch of row.querySelectorAll('[aria-pressed]'))swatch.setAttribute('aria-pressed',String(swatch===b));
   });
   b.style.setProperty('--paint-color',value);
   b.setAttribute('aria-label','Paint color '+name);
   b.setAttribute('aria-pressed',String(value===color));
   row.append(b);
  }
  const brush=el('input');brush.type='range';brush.min=2;brush.max=20;brush.value=size;brush.setAttribute('aria-label','Brush size');brush.addEventListener('input',()=>size=+brush.value);
  row.append(btn('Clear',clear),btn('Save PNG',()=>{const a=el('a');a.download='fejeos-paint.png';a.href=c.toDataURL('image/png');a.click()}));content.append(c,row,brush);
  const point=e=>{const r=c.getBoundingClientRect();return [(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]};
  const stroke=(a,b)=>{ctx.strokeStyle=color;ctx.lineWidth=size;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0]+.01,b[1]+.01);ctx.stroke()};
  c.addEventListener('pointerdown',e=>{if(e.button>0||!e.isPrimary)return;prev=point(e);stroke(prev,prev);try{c.setPointerCapture(e.pointerId)}catch{}});
  c.addEventListener('pointermove',e=>{if(prev&&e.isPrimary){const p=point(e);stroke(prev,p);prev=p}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(event,e=>{if(e.isPrimary)prev=null});
 }
 function settings(content){content.append(el('p','','Choose your desktop wallpaper.'),...['violet','rose','mint'].map(v=>btn(v[0].toUpperCase()+v.slice(1),()=>{desktop.dataset.wallpaper=v;api.say('Wallpaper changed to '+v+'.')})),el('p','','This is a fictional desktop running entirely inside your browser.'))}
 for(const [id,name,symbol] of APPS){const b=btn('',()=>open(id));b.dataset.appOpen=id;b.append(el('span','iw-os-symbol',symbol),el('span','',name));icons.append(b)}
 api.button('Close all windows',()=>{for(const w of windows.values())w.remove();windows.clear();api.say('Desktop cleared.')});
 const openSelect=api.select('Open app',[['','Choose an app'],...APPS.map(([id,name])=>[id,name])],v=>{if(v)open(v);openSelect.value=''});
 api.say('FejeOS is ready. Tap an app to open it.');
 let previous='';function draw(){const value=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});if(value!==previous){clock.textContent=value;previous=value}}
 function resize(){for(const w of windows.values()){w.style.left=clamp(w.offsetLeft,0,Math.max(0,desktop.clientWidth-w.offsetWidth))+'px';w.style.top=clamp(w.offsetTop,0,Math.max(0,desktop.clientHeight-w.offsetHeight-44))+'px'}}
 const observer='ResizeObserver' in window?new ResizeObserver(resize):null;observer?.observe(desktop);
 return {draw,resize,nextFrameDelay:()=>60000-Date.now()%60000,dispose:()=>observer?.disconnect()};
}
