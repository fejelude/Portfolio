// The admin view consumes a deliberately small visitor DTO, not raw events.
const WINDOW_MS=30*60*1000;
function publicPage(value){
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//'))return '';
  const path=value.split(/[?#]/,1)[0].toLowerCase().replace(/\/+$/,'')||'/';
  if(path==='/'||path==='/index'||path==='/index.html')return '/';
  if(['/gallery','/gallery.html','/arcade','/arcade.html'].includes(path))return '/Gallery.html';
  if(['/sofra/about','/sofra.html'].includes(path))return '/sofra/about';
  return '';
}
function maskedIp(value){
  const ip=String(value||'').trim();
  if(/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)){
    const p=ip.split('.');
    if(p.every(x=>Number(x)<=255))return p.slice(0,3).join('.')+'.x';
  }
  if(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.x$/.test(ip))return ip;
  if(ip.includes(':')&&/^[a-f0-9:]+$/i.test(ip)){
    const halves=ip.split('::');
    if(halves.length>2)return 'Unavailable';
    const a=halves[0]?halves[0].split(':'):[],b=halves[1]?halves[1].split(':'):[];
    if(a.concat(b).some(x=>!(/^[a-f0-9]{1,4}$/i.test(x))))return 'Unavailable';
    const missing=8-a.length-b.length;
    if((halves.length===1&&missing!==0)||(halves.length===2&&missing<1))return 'Unavailable';
    return [...a,...Array(Math.max(0,missing)).fill('0'),...b].slice(0,3).map(x=>Number.parseInt(x,16).toString(16)).join(':')+'::/48';
  }
  if(/^[a-f0-9]{1,4}:[a-f0-9]{1,4}:[a-f0-9]{1,4}::\/48$/i.test(ip))return ip;
  return 'Unavailable';
}
const sessionKey=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{8,80}$/.test(value)?value:'';
const label=(value,max=40)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max)||'Unknown':'Unknown';
function summarizeVisitors(logs){
  const groups=new Map(),pages=new Set();
  let recorded=0,security=0;
  const events=logs.map((log,index)=>({log,index,time:Date.parse(log?.receivedAt||log?.timestamp||'')}))
    .filter(x=>x.log&&typeof x.log==='object')
    .sort((a,b)=>(Number.isFinite(a.time)?a.time:0)-(Number.isFinite(b.time)?b.time:0));
  for(const {log,index,time} of events){
    if(log.section==='security'||String(log.type||'').startsWith('admin_')){security++;continue;}
    const path=publicPage(log.path);
    if(log.type!=='page_view'||!path||!Number.isFinite(time))continue;
    const session=sessionKey(log.sessionId);
    // Never infer identity from IP or device fingerprints. Anonymous visits
    // cannot reliably be joined, and are kept separate.
    const key=session?'browser:'+session:'anonymous:'+index;
    let g=groups.get(key);
    if(!g){g={firstSeen:time,lastSeen:time,device:'Unknown',os:'Unknown',browser:'Unknown',ip:'Unavailable',lastPage:path,pages:new Map(),anonymous:!session,visits:0};groups.set(key,g);}
    g.lastSeen=time;g.lastPage=path;
    g.device=label(log.device);g.os=label(log.os);g.browser=label(log.browser);g.ip=maskedIp(log.ip);
    let visit=g.pages.get(path);
    if(!visit){visit={path,count:0,lastSeen:time,lastCounted:null};g.pages.set(path,visit);}
    visit.lastSeen=time;
    if(visit.lastCounted===null||time-visit.lastCounted>=WINDOW_MS){visit.count++;visit.lastCounted=time;g.visits++;recorded++;}
    pages.add(path);
  }
  const visitors=Array.from(groups.values()).sort((a,b)=>b.lastSeen-a.lastSeen).map(g=>({
    firstSeen:new Date(g.firstSeen).toISOString(),lastSeen:new Date(g.lastSeen).toISOString(),device:g.device,os:g.os,browser:g.browser,ip:g.ip,lastPage:g.lastPage,anonymous:g.anonymous,visits:g.visits,
    pages:Array.from(g.pages.values()).sort((a,b)=>b.lastSeen-a.lastSeen).map(p=>({path:p.path,count:p.count,lastSeen:new Date(p.lastSeen).toISOString()}))
  }));
  return {visitors,summary:{visitors:visitors.length,visits:recorded,pages:pages.size,securityEvents:security}};
}
module.exports={WINDOW_MS,publicPage,maskedIp,sessionKey,summarizeVisitors};
