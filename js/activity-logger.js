(() => {
  const KEY='portfolio-session-id', EXPIRY='portfolio-session-expiry';
  const DAY=86400000;
  function allowed(){return navigator.doNotTrack!=='1'&&window.doNotTrack!=='1'&&navigator.globalPrivacyControl!==true;}
  function page(){
    const path=location.pathname.toLowerCase().replace(/\/+$/,'')||'/';
    if(['/', '/index','/index.html'].includes(path))return '/';
    if(['/gallery','/gallery.html','/arcade','/arcade.html'].includes(path))return '/Gallery.html';
    if(['/sofra/about','/sofra.html'].includes(path))return '/sofra/about';
    return '';
  }
  function browserId(){
    try{
      let id=localStorage.getItem(KEY);
      const until=Number(localStorage.getItem(EXPIRY));
      if(!id||!(/^[a-zA-Z0-9_-]{8,80}$/).test(id)||(until&&until<=Date.now())){
        id=typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
        localStorage.setItem(KEY,id);localStorage.setItem(EXPIRY,String(Date.now()+30*DAY));
      }else if(!until)localStorage.setItem(EXPIRY,String(Date.now()+30*DAY));
      return id;
    }catch{return '';}
  }
  let sent=false;
  async function track(type){
    if(type!=='page_view'||sent||!allowed())return;
    const path=page();if(!path)return;
    sent=true;
    const sessionId=browserId();
    try{
      await fetch('/api/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'page_view',path,sessionId}),credentials:'same-origin',keepalive:true});
    }catch{/* No persistent retry queue of private browsing activity. */}
  }
  // Preserve the public method so existing callers do not break; non-page
  // events are intentionally ignored, including repeated clicks/animations.
  window.PortfolioActivity={track};
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',()=>track('page_view'),{once:true});
  else track('page_view');
})();
