export const WORLD_QUALITY_KEY='fejelude.worlds.quality.v2';
export const CAR_QUALITY_KEY='fejelude.collectibles.quality.v1';
export const PRESETS=Object.freeze(['Low','Medium','High']);
export const normalizePreset=value=>PRESETS.includes(value)?value:'High';
export function readPreset(key,storage){try{return normalizePreset((storage??globalThis.localStorage).getItem(key))}catch{return 'High'}}
export function writePreset(key,value,storage){try{(storage??globalThis.localStorage).setItem(key,normalizePreset(value))}catch{}}
export function bindWorldQuality(select,apply){
 let selected=readPreset(WORLD_QUALITY_KEY);
 const sync=value=>{selected=normalizePreset(value);select.value=selected;document.body.dataset.iwQuality=selected.toLowerCase();apply(selected)};
 sync(selected);
 select.addEventListener('change',()=>{sync(select.value);writePreset(WORLD_QUALITY_KEY,selected)});
 window.addEventListener('storage',e=>{if(e.key===WORLD_QUALITY_KEY||e.key===null)sync(readPreset(WORLD_QUALITY_KEY))});
 window.addEventListener('pageshow',()=>sync(readPreset(WORLD_QUALITY_KEY)));
 return ()=>selected;
}
