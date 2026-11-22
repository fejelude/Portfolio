export const IDS=['room','universe','lab','os','tokyo','particles'];
const KEY='feje.interactives.v1';
let fallback=[];
export function sanitize(value){return Array.isArray(value)?IDS.filter(id=>value.includes(id)):[]}
export function getProgress(storage){try{return sanitize(JSON.parse(storage.getItem(KEY)||'[]'))}catch{return fallback.slice()}}
export function earn(id,storage){const next=sanitize([...getProgress(storage),id]);fallback=next;try{storage.setItem(KEY,JSON.stringify(next))}catch{}return next}
export function clearProgress(storage){fallback=[];try{storage.removeItem(KEY)}catch{}}
export function deviceStorage(win=window){try{return win.localStorage}catch{return null}}
