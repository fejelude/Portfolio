// Start with the detailed mesh and sky. Supersampling is bounded by the
// renderbuffer limit and the pixel budget of the visible presentation frame.
export function watchPixelRatio({dpr=1,mobile=false,width=0,height=0,maxRenderSize=8192}={}){
 const deviceDpr=Number.isFinite(dpr)&&dpr>0?dpr:1;
 const target=Math.min(Math.max(deviceDpr,mobile?1.85:2),mobile?2.25:2.5);
 const maxByArea=Math.sqrt((mobile?2300000:3400000)/Math.max(1,width*height));
 const maxBySide=maxRenderSize/Math.max(1,width,height);
 return Math.min(target,maxByArea,maxBySide);
}
