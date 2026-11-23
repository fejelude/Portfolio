export const IDS=['room','universe','lab','os','tokyo','particles'];
const KEY='feje.interactives.v1';
const partialKey=id=>KEY+'.discoveries.'+id;
export const sanitize=value=>Array.isArray(value)?IDS.filter(id=>value.includes(id)):[];

// Keep a failed write authoritative even when subsequent reads still work
// (for example, a full quota). A null value represents a pending removal.
const unavailable=new Map();
const pendingByStore=new WeakMap();
function pending(storage){
 if(!storage)return unavailable;
 if(!pendingByStore.has(storage))pendingByStore.set(storage,new Map());
 return pendingByStore.get(storage);
}
function read(storage,key){
 const changes=pending(storage);
 if(changes.has(key))return changes.get(key);
 try{return storage?.getItem(key)}catch{return null}
}
function write(storage,key,value){
 const changes=pending(storage);
 try{
  if(value===null)storage.removeItem(key);
  else storage.setItem(key,value);
  changes.delete(key);
 }catch{changes.set(key,value)}
}
function list(storage,key){
 try{const value=JSON.parse(read(storage,key));return Array.isArray(value)?value:[]}catch{return []}
}
export function getProgress(storage){return sanitize(list(storage,KEY))}
export function earn(id,storage){
 const next=sanitize([...getProgress(storage),id]);
 write(storage,KEY,JSON.stringify(next));
 return next;
}
export function getDiscoveries(id,storage){return list(storage,partialKey(id)).filter(v=>typeof v==='string')}
export function saveDiscoveries(id,found,storage){write(storage,partialKey(id),found.size?JSON.stringify([...found]):null)}
export function clearProgress(storage){
 write(storage,KEY,null);
 for(const id of IDS)write(storage,partialKey(id),null);
}

export function deviceStorage(win=window){
 // Session storage can still be writable when local storage is full or denied.
 // Keep overrides separate so a reset can mask an older read-only collection.
 const sessionKey=key=>key+'.session';
 const memory=new Map();
 function override(key){
  if(memory.has(key))return memory.get(key);
  try{return win.sessionStorage.getItem(sessionKey(key))}catch{return null}
 }
 function update(key,value){
  try{
   if(value===null)win.localStorage.removeItem(key);
   else win.localStorage.setItem(key,value);
   memory.delete(key);
   try{win.sessionStorage.removeItem(sessionKey(key))}catch{}
  }catch{
   const encoded=JSON.stringify(value);
   memory.set(key,encoded);
   try{win.sessionStorage.setItem(sessionKey(key),encoded)}catch{}
  }
 }
 return {
  getItem(key){
   const saved=override(key);
   if(saved!==null){try{return JSON.parse(saved)}catch{}}
   try{return win.localStorage.getItem(key)}catch{return null}
  },
  setItem:(key,value)=>update(key,value),
  removeItem:key=>update(key,null),
  get temporary(){return override(KEY)!==null||IDS.some(id=>override(partialKey(id))!==null)}
 };
}
