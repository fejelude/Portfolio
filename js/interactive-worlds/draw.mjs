export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const mix=(a,b,t)=>a+(b-a)*t;
export function seeded(seed=42){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296}}
export function rect(ctx,x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
export function poly(ctx,points,fill,stroke){ctx.beginPath();for(let i=0;i<points.length;i++){const [x,y]=points[i];i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
export function line(ctx,x,y,x2,y2,color,width=1){ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();ctx.lineWidth=1}
export function label(ctx,s,x,y,color='#e8dafa',size=9){ctx.font=size+'px monospace';ctx.fillStyle=color;ctx.fillText(s,x,y)}
export function radial(ctx,x,y,r,stops){const g=ctx.createRadialGradient(x,y,0,x,y,r);for(const [p,c] of stops)g.addColorStop(p,c);return g}
