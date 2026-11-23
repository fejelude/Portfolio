/* Reusable preset logic. Only Tourbillon consumes it for now. */
export const QUALITY_LEVELS=Object.freeze(['low','default','high']);
export const QUALITY_STORAGE_KEY='fejelude.tourbillon.quality.v1';
export function normalizeQuality(value){return QUALITY_LEVELS.includes(value)?value:'default';}
export function qualityConfiguration(value,{dpr=1,mobile=false,width=0,height=0,maxRenderSize=8192}={}){
 const mode=normalizeQuality(value),deviceDpr=Number.isFinite(dpr)&&dpr>0?dpr:1;
 const balanced=Math.min(deviceDpr,mobile?1.2:1.55);
 if(mode==='default')return {mode,pixelRatio:balanced,economy:mobile,detailedSky:false,adaptive:true};
 if(mode==='low')return {mode,pixelRatio:Math.min(balanced,.82),economy:true,detailedSky:false,adaptive:true};
 // High supersamples even on 1x displays. Cap pixel count and dimensions
 // to keep 4K monitors and mobile GPU memory within a sensible budget.
 const target=Math.min(Math.max(deviceDpr,mobile?1.85:2),mobile?2.25:2.5);
 const area=Math.max(1,width*height),maxPixels=mobile?2300000:3400000;
 const maxByArea=Math.sqrt(maxPixels/area);
 const maxBySide=Math.max(.05,maxRenderSize/Math.max(1,width,height));
 const ratio=Math.max(.05,Math.min(target,maxByArea,maxBySide));
 return {mode,pixelRatio:ratio,economy:false,detailedSky:true,adaptive:false};
}
