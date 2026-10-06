// Local static host mirroring Vercel cleanUrls, existing redirects, route
// headers, and HTTP byte ranges. Hosting itself is verified separately.
const {createServer}=require('node:http');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.woff2':'font/woff2','.svg':'image/svg+xml','.json':'application/json'};
async function startServer(port=0){
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');let route=decodeURIComponent(url.pathname);
   if(['/arcade','/Arcade','/Arcade.html'].includes(route)){res.writeHead(307,{Location:'/#surprise'});res.end();return;}
   if(route==='/sofra/about')route='/Sofra.html';if(route==='/sofra')route='/SofraPanel.html';
   if(route==='/')route='/index.html';else if(!path.extname(route))route+='.html';
   const file=path.resolve(root,'.'+route);if(!file.startsWith(root+path.sep))throw Error('path');
   const body=await readFile(file),headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':body.length,'Accept-Ranges':'bytes'};
   if(route==='/sofhia-franchesca-16.html')headers['X-Robots-Tag']='noindex, nofollow';
   const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
   if(range){const start=Number(range[1]),end=Math.min(body.length-1,range[2]?Number(range[2]):body.length-1);if(start>end){res.writeHead(416,{'Content-Range':`bytes */${body.length}`});res.end();return;}
    headers['Content-Length']=end-start+1;headers['Content-Range']=`bytes ${start}-${end}/${body.length}`;res.writeHead(206,headers);res.end(req.method==='HEAD'?undefined:body.subarray(start,end+1));return;}
   res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(port,'0.0.0.0',resolve));return {server,url:`http://127.0.0.1:${server.address().port}`};
}
module.exports={startServer};
if(require.main===module)startServer(8766).then(({url})=>console.log(url));
