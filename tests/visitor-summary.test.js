const assert=require('node:assert/strict');
const test=require('node:test');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {publicPage,maskedIp,sessionKey,summarizeVisitors}=require('../lib/visitor-summary');
const root=path.resolve(__dirname,'..');
function load(relative,dependency,globals={}){
 const module={exports:{}};
 vm.runInNewContext(readFileSync(path.join(root,relative),'utf8'),{...globals,module,exports:module.exports,require:dependency,Buffer,URL,Date,Map,Set,console},{filename:relative});
 return module.exports;
}
const normalize=x=>JSON.parse(JSON.stringify(x));
test('public URLs are allowlisted, and query strings and private paths are discarded',()=>{
 assert.equal(publicPage('/index.html?token=secret'),'/');
 assert.equal(publicPage('/Gallery'),'/Gallery.html');
 assert.equal(publicPage('/sofra/about'),'/sofra/about');
 for(const p of ['/admin','/sofra','/SofraPanel.html','/compendium','/sofhia-franchesca-16.html','//','https://example.test','',undefined])assert.equal(publicPage(p),'');
 assert.equal(maskedIp('192.0.2.123'),'192.0.2.x');
 assert.equal(maskedIp('2001:db8:abcd:1234::1'),'2001:db8:abcd::/48');
 assert.equal(maskedIp('192.0.2.x'),'192.0.2.x');
 assert.equal(maskedIp('unknown'),'Unavailable');
 assert.equal(sessionKey('valid-session-123'),'valid-session-123');
 assert.equal(sessionKey('bad!'),'');
});
function fixture(minutes,patch={}){
 return {path:'/',type:'page_view',sessionId:'browser-one',receivedAt:new Date(Date.UTC(2026,10,22,12,minutes)).toISOString(),device:'Mobile',browser:'Safari',os:'iOS',ip:'192.0.2.123',...patch};
}
test('visitors are grouped by browser, not IP; repeated refreshes and legacy events collapse',()=>{
 const result=summarizeVisitors([
  fixture(0),fixture(5,{path:'/index.html?private=foo'}),fixture(10,{path:'/Gallery.html'}),fixture(30),fixture(31,{path:'/sofra/about'}),fixture(32,{sessionId:'browser-two'}),
  fixture(33,{type:'click'}),fixture(34,{path:'/admin'}),fixture(35,{type:'admin_failed_login',section:'security'})
 ]);
 assert.deepEqual(result.summary,{visitors:2,visits:5,pages:3,securityEvents:1});
 const first=result.visitors.find(v=>v.visits===4);
 assert.equal(first.ip,'192.0.2.x');
 assert.equal(first.lastPage,'/sofra/about');
 assert.equal(first.pages.find(p=>p.path==='/').count,2);
 assert.equal(first.pages.length,3);
 assert.equal(Object.hasOwn(first,'sessionId'),false);
 assert.ok(!JSON.stringify(result).includes('private=foo'));
 assert.ok(!JSON.stringify(result).includes('192.0.2.123'));
 assert.equal(summarizeVisitors([fixture(0,{sessionId:''}),fixture(1,{sessionId:''})]).summary.visitors,2);
});
test('memory dedup rejects repeats per route while retaining other routes and security writes',async()=>{
 const globals={};
 const store=load('api/activity-store.js',()=>{throw Error('unexpected dependency');},{process:{env:{}},globalThis:globals});
 const log=fixture(0);
 assert.equal((await store.saveVisit(log,'browser-home')).recorded,true);
 assert.equal((await store.saveVisit(log,'browser-home')).recorded,false);
 assert.equal((await store.saveVisit({...log,path:'/Gallery.html'},'browser-gallery')).recorded,true);
 await store.saveLog({type:'admin_login',section:'security'});
 assert.equal((await store.readLogs()).logs.length,3);
});
test('persistent dedup uses one atomic constrained Redis command and retains security writes',async()=>{
 const seen=new Set(),list=[],commands=[];
 const fetch=async(url,options)=>{
  const c=JSON.parse(options.body);commands.push(c[0]);let result;
  if(c[0]==='EVAL'){assert.equal(c[2],2);assert.match(c[1],/SET.*NX.*EX.*LPUSH.*LTRIM/);assert.equal(c[5],1800);if(seen.has(c[3]))result=0;else{seen.add(c[3]);list.unshift(c[6]);result=1;}}
  else if(c[0]==='LRANGE')result=list;
  else if(c[0]==='LPUSH'){list.unshift(c[2]);result=list.length;}
  else if(c[0]==='LTRIM')result='OK';
  else throw Error('unexpected command');
  return {ok:true,json:async()=>({result})};
 };
 const store=load('api/activity-store.js',()=>{}, {process:{env:{UPSTASH_REDIS_REST_URL:'https://example.test',UPSTASH_REDIS_REST_TOKEN:'fixture'}},globalThis:{},fetch});
 assert.equal((await store.saveVisit(fixture(0),'key')).recorded,true);
 assert.equal((await store.saveVisit(fixture(0),'key')).recorded,false);
 await store.saveLog({type:'admin_login'});
 assert.equal((await store.readLogs()).logs.length,2);
 assert.deepEqual(commands,['EVAL','EVAL','LPUSH','LTRIM','LRANGE']);
});
test('activity API gates reads, excludes signed-in admin and privacy signals, and persists minimal data',async()=>{
 const saved=[];
 const handler=load('api/activity.js',id=>{
  if(id==='./admin-session')return {isAuthorized:r=>r.authorized===true};
  if(id==='./activity-store')return {saveVisit:async(log,key)=>{saved.push({log,key});return {recorded:true};},readLogs:async()=>({logs:[fixture(0)],persistent:true})};
  if(id==='../lib/visitor-summary')return require('../lib/visitor-summary');
  if(id==='node:crypto')return require('node:crypto');
  throw Error(id);
 });
 const call=async(req)=>{const response={headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(data){this.data=data;return this;}};await handler(req,response);return response;};
 assert.equal((await call({method:'GET'})).code,401);
 const body={type:'page_view',path:'/?token=not-for-logs',sessionId:'browser-one',userAgent:'private',viewport:{width:10,height:10},referrer:'private'};
 for(const req of [{authorized:true},{headers:{dnt:'1'}},{headers:{'sec-gpc':'1'}},{body:{...body,type:'click'}},{body:{...body,path:'/sofra'}},{body:{...body,path:undefined}}])assert.equal((await call({method:'POST',body,...req})).data.recorded,false);
 assert.equal(saved.length,0);
 const response=await call({method:'POST',body,headers:{'x-forwarded-for':'192.0.2.49','user-agent':'Mozilla/5.0 (iPhone) Version/17 Safari/605.1'}});
 assert.equal(response.code,201);assert.equal(saved[0].log.ip,'192.0.2.x');assert.equal(saved[0].log.path,'/');assert.equal(saved[0].log.device,'Mobile');assert.match(saved[0].key,/^[a-f0-9]{64}$/);
 for(const key of ['userAgent','viewport','referrer','location','details','title'])assert.equal(Object.hasOwn(saved[0].log,key),false);
 const read=await call({method:'GET',authorized:true});assert.equal(read.code,200);assert.equal(read.headers['Cache-Control'],'no-store');assert.equal(read.data.visitors.length,1);assert.equal(Object.hasOwn(read.data,'logs'),false);
});
test('admin handler still returns separate unauthenticated and authorized HTML, with native form fallback',async()=>{
 const handler=load('api/admin-page.js',id=>{assert.equal(id,'./admin-session');return {getHeader:()=> 'localhost',isAuthorized:r=>r.authorized===true,isConfigured:()=>true};});
 const call=async(authorized,url)=>{const r={setHeader(){},status(c){this.code=c;return this;},send(html){this.html=html;return this;}};await handler({authorized,url},r);return r;};
 const login=await call(false,'/admin?error=1');assert.equal(login.code,401);assert.match(login.html,/data-droid-state="denied"/);assert.match(login.html,/name="password"/);assert.match(login.html,/method="post" action="\/api\/admin-auth"/);assert.equal((login.html.match(/data-code-slot/g)||[]).length,8);assert.ok(!login.html.includes('id="logs-body"'));
 const dash=await call(true,'/admin?unlocked=1');assert.equal(dash.code,200);assert.match(dash.html,/data-droid-state="granted"/);assert.match(dash.html,/name="action" value="logout"/);assert.match(dash.html,/id="logs-body"/);
});

test('obsolete visitor footer block and its stylesheet are removed',()=>{
  assert.equal(require('node:fs').existsSync(path.join(root,'privacy.html')),false);
  assert.equal(require('node:fs').existsSync(path.join(root,'css/visitor-analytics-note.css')),false);
  for(const name of ['index.html','Gallery.html','Sofra.html']){
    const html=readFileSync(path.join(root,name),'utf8');
    assert.doesNotMatch(html,/visitor-analytics-note|This site uses basic visitor analytics/);
    assert.match(html,/activity-logger\.js/);
  }
});
