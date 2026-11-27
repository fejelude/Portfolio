/* The canonical website maintenance date. To update it in the future:
 * edit SITE_LAST_UPDATED, run node scripts/sync-site-updated.cjs --write,
 * then commit the generated HTML alongside this file.
 * Only explicitly marked website-maintenance labels are synchronized.
 */
const {readFileSync,writeFileSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const SITE_LAST_UPDATED='2026-11-26';
const date=new Date(SITE_LAST_UPDATED+'T00:00:00Z');
if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==SITE_LAST_UPDATED)throw new Error('Invalid canonical ISO date');
const SITE_LAST_UPDATED_LABEL=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(date);
const root=path.resolve(__dirname,'..');
const requiredPages=new Set(['index.html','Gallery.html']);
const prefix='Website Updated Recently on ';
const marked=/<time data-site-last-updated datetime="[^"]*">[^<]*<\/time>/g;
const render=()=>'<time data-site-last-updated datetime="'+SITE_LAST_UPDATED+'">'+SITE_LAST_UPDATED_LABEL+'</time>';
function sync(mode){
 const paths=execFileSync('git',['ls-files','-z','--','*.html'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
 const errors=[],changes=[];let labels=0;
 for(const name of paths){
  const file=path.join(root,name),html=readFileSync(file,'utf8');
  const hits=[...html.matchAll(marked)];
  const claims=html.split(prefix).length-1;
  if(requiredPages.has(name)&&hits.length!==1)errors.push(name+': expected exactly one marked website update date');
  if(claims!==hits.length||hits.some(hit=>html.slice(hit.index-prefix.length,hit.index)!==prefix))errors.push(name+': unmarked or misplaced website-update label');
  if((html.match(/\bdata-site-last-updated\b/g)||[]).length!==hits.length)errors.push(name+': invalid date marker');
  labels+=hits.length;
  const updated=html.replace(marked,render);
  if(updated!==html)changes.push({file,name,updated});
 }
 for(const page of requiredPages)if(!paths.includes(page))errors.push('Missing tracked page: '+page);
 if(errors.length)throw new Error(errors.join('\n'));
 if(mode==='--check'&&changes.length)throw new Error('Stale website-update dates: '+changes.map(x=>x.name).join(', ')+'. Run with --write.');
 if(mode==='--write')for(const change of changes)writeFileSync(change.file,change.updated,'utf8');
 console.log('Website last updated: '+SITE_LAST_UPDATED_LABEL+' ('+SITE_LAST_UPDATED+'); '+labels+' labels across '+paths.length+' tracked HTML pages. '+changes.length+' files synchronized.');
}
if(require.main===module){
 const mode=process.argv[2];
 if(!['--check','--write'].includes(mode)){console.error('Usage: node scripts/sync-site-updated.cjs --check|--write');process.exitCode=1;}
 else try{sync(mode)}catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={SITE_LAST_UPDATED,SITE_LAST_UPDATED_LABEL};
