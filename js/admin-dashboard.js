(() => {
 const $=id=>document.getElementById(id),els={list:$('logs-body'),status:$('logs-state'),search:$('log-search'),device:$('filter-device'),refresh:$('refresh-logs'),prev:$('prev-page'),next:$('next-page'),label:$('page-label')};
 const state={visitors:[],filtered:[],page:1,perPage:15,error:false,loading:false};
 const text=(id,v)=>{$(id).textContent=String(v??'—');};
 const date=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'Unknown':d.toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});};
 const pageName=p=>p==='/'?'Homepage':p==='/Gallery.html'?'Game Gallery':p==='/sofra/about'?'Sofra':p||'Unknown page';
 function node(tag,cls,value){const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;}
 function row(v){
  const wrapper=node('div','');wrapper.setAttribute('role','listitem');
  const entry=node('details','visitor-entry'),header=node('summary'),icon=node('span','visitor-icon',v.device==='Mobile'?'M':v.device==='Tablet'?'T':v.device==='Desktop'?'D':'?');icon.setAttribute('aria-hidden','true');
  const main=node('span','visitor-main');main.append(node('span','visitor-name',[v.device,v.os,v.browser].filter(x=>x&&x!=='Unknown').join(' · ')||'Unknown browser'),node('span','visitor-page',pageName(v.lastPage)+' · '+v.visits+' '+(v.visits===1?'visit':'visits')));
  const meta=node('span','visitor-meta');meta.append(node('span','visitor-ip',v.ip||'Unavailable'),node('span','',date(v.lastSeen)));
  const chevron=node('span','visitor-chevron','›');chevron.setAttribute('aria-hidden','true');header.append(icon,main,meta,chevron);entry.append(header);
  const history=node('div','visitor-history');history.append(node('p','',v.anonymous?'Browser storage unavailable — anonymous visit.':'First recorded: '+date(v.firstSeen)));
  const list=node('ul');for(const p of v.pages||[]){const item=node('li');item.append(node('span','',pageName(p.path)+' · '+date(p.lastSeen)),node('span','',p.count+'×'));list.append(item);}history.append(list);entry.append(history);wrapper.append(entry);return wrapper;
 }
 function render(){
  els.list.replaceChildren();
  const count=state.filtered.length,pages=Math.max(1,Math.ceil(count/state.perPage));state.page=Math.min(state.page,pages);
  if(state.loading)els.status.textContent='loading my stuff...';
  else if(state.error)els.status.textContent='could not load visitors. try refreshing.';
  else els.status.textContent=count?count+' '+(count===1?'visitor browser':'visitor browsers')+' found.':state.visitors.length?'no visitors match that search.':'no visitors recorded yet.';
  if(!state.error){const fragment=document.createDocumentFragment();for(const v of state.filtered.slice((state.page-1)*state.perPage,state.page*state.perPage))fragment.append(row(v));els.list.append(fragment);}
  els.label.textContent='Page '+state.page+' / '+pages;els.prev.disabled=state.loading||state.error||state.page<=1;els.next.disabled=state.loading||state.error||state.page>=pages;
 }
 function filter(reset=true){
  const q=els.search.value.trim().toLowerCase(),device=els.device.value;
  state.filtered=state.visitors.filter(v=>(!device||v.device===device)&&(!q||[v.device,v.os,v.browser,v.ip,v.lastPage,...(v.pages||[]).flatMap(p=>[p.path,pageName(p.path)])].join(' ').toLowerCase().includes(q)));
  if(reset)state.page=1;render();
 }
 function setOptions(){
  const old=els.device.value,devices=[...new Set(state.visitors.map(v=>v.device).filter(Boolean))].sort();
  els.device.replaceChildren(new Option('All devices',''),...devices.map(v=>new Option(v,v)));els.device.value=devices.includes(old)?old:'';
 }
 async function load(){
  if(state.loading)return;state.loading=true;state.error=false;els.refresh.disabled=true;render();
  try{
   const response=await fetch('/api/activity?admin=1',{credentials:'same-origin',cache:'no-store'});
   if(response.status===401){window.location.assign('/admin');return;}
   const data=await response.json();if(!response.ok||!data.ok)throw Error('load');
   state.visitors=Array.isArray(data.visitors)?data.visitors:[];
   text('stat-sessions',data.summary?.visitors??state.visitors.length);text('stat-total',data.summary?.visits??0);text('stat-pages',data.summary?.pages??0);text('stat-security',data.summary?.securityEvents??0);
   text('stat-source',data.storage?.persistent?'Persistent Redis':'Runtime only');text('storage-warning',data.storage?.warning||'');setOptions();
  }catch{state.error=true;state.visitors=[];for(const id of ['stat-sessions','stat-total','stat-pages','stat-security','stat-source','storage-warning'])text(id,'—');}
  finally{state.loading=false;els.refresh.disabled=false;filter();}
 }
 els.search.addEventListener('input',()=>filter());els.device.addEventListener('change',()=>filter());els.refresh.addEventListener('click',load);
 els.prev.addEventListener('click',()=>{if(state.page>1){state.page--;render();}});els.next.addEventListener('click',()=>{if(state.page<Math.ceil(state.filtered.length/state.perPage)){state.page++;render();}});load();
})();
