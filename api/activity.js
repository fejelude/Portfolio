const { isAuthorized } = require('./admin-session');
const { readLogs, saveVisit } = require('./activity-store');
const { createHash } = require('node:crypto');
const { publicPage, maskedIp, sessionKey, summarizeVisitors } = require('../lib/visitor-summary');

function header(req,name){const value=req.headers?.[name]??req.headers?.[name.toLowerCase()];return Array.isArray(value)?String(value[0]||''):String(value||'');}
function json(res,status,data){res.setHeader('Cache-Control','no-store');return res.status(status).json(data);}
function readBody(req){
  if(!req.body)return {};
  if(typeof req.body==='object'&&!Buffer.isBuffer(req.body))return req.body;
  try{return JSON.parse(String(req.body));}catch{return {};}
}
function agent(ua){
  const browser=/Edg(?:A|iOS)?\//i.test(ua)?'Edge':/OPR\/|Opera/i.test(ua)?'Opera':/Chrome\/|CriOS\//i.test(ua)?'Chrome':/Firefox\/|FxiOS\//i.test(ua)?'Firefox':/Safari\//i.test(ua)?'Safari':'Unknown';
  const os=/iPhone|iPad|iPod/i.test(ua)?'iOS':/Android/i.test(ua)?'Android':/Windows NT/i.test(ua)?'Windows':/Mac OS X/i.test(ua)?'macOS':/Linux/i.test(ua)?'Linux':'Unknown';
  const device=/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)?'Tablet':/Mobile|Android|iPhone|iPod/i.test(ua)?'Mobile':ua?'Desktop':'Unknown';
  return {browser,os,device};
}
module.exports=async(req,res)=>{
  if(req.method==='OPTIONS'){res.setHeader('Allow','GET, POST, OPTIONS');return res.status(204).end();}
  if(req.method==='POST'){
    try{
      // Respect browser privacy signals and exclude the authenticated owner.
      if(header(req,'dnt')==='1'||header(req,'sec-gpc')==='1'||isAuthorized(req))return json(res,200,{ok:true,recorded:false});
      const body=readBody(req)||{},path=publicPage(body.path);
      if(body.type!=='page_view'||!path)return json(res,200,{ok:true,recorded:false});
      const sessionId=sessionKey(body.sessionId),now=new Date().toISOString();
      const ip=header(req,'x-forwarded-for').split(',')[0]||header(req,'x-real-ip')||header(req,'cf-connecting-ip');
      const details=agent(header(req,'user-agent').slice(0,600));
      // Only coarse device/browser/OS and masked network prefix are retained.
      const log={type:'page_view',path,sessionId,receivedAt:now,ip:maskedIp(ip),...details};
      const key=sessionId?createHash('sha256').update(sessionId+'\n'+path).digest('hex'):'';
      const result=await saveVisit(log,key);
      return json(res,result.recorded?201:200,{ok:true,recorded:result.recorded});
    }catch{return json(res,500,{ok:false,error:'Unable to record visit.'});}
  }
  if(req.method==='GET'){
    if(!isAuthorized(req))return json(res,401,{ok:false,error:'Unauthorized'});
    try{
      const {logs,...storage}=await readLogs();
      return json(res,200,{ok:true,...summarizeVisitors(logs),storage:{source:storage.source,persistent:storage.persistent,limit:storage.limit,warning:storage.warning}});
    }catch{return json(res,500,{ok:false,error:'Unable to load visitors.'});}
  }
  res.setHeader('Allow','GET, POST, OPTIONS');return json(res,405,{ok:false,error:'Method not allowed'});
};
