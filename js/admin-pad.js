(() => {
 const form=document.querySelector('[data-admin-pad-form]');if(!form)return;
 const input=form.querySelector('#admin-password'),pad=form.querySelector('.admin-pad'),slots=[...pad.querySelectorAll('[data-code-slot]')],status=pad.querySelector('[data-pad-status]'),submit=form.querySelector('[data-pad-submit]'),droid=document.querySelector('[data-droid-state]');
 const limit=slots.length;let verifying=false;
 function setState(value){if(droid)droid.dataset.droidState=value;}
 function sync(preserve=false){
  input.value=input.value.replace(/\D/g,'').slice(0,limit);
  slots.forEach((slot,i)=>{slot.classList.toggle('is-filled',i<input.value.length);slot.classList.toggle('is-current',i===input.value.length-1);});
  const count=input.value.length,ready=count===limit;
  submit.disabled=!ready||verifying;
  status.textContent=ready?'all 8 digits. lemme check XD':count?limit-count+' digits left hehe':"where's the code bro";
  status.dataset.tone=ready?'ready':'';
  if(!preserve)setState(ready?'ready':count?'typing':'idle');
 }
 function digit(n){if(verifying||input.value.length>=limit)return;input.value+=n;sync();}
 form.classList.add('is-enhanced');pad.hidden=false;sync(droid?.dataset.droidState==='denied');
 input.addEventListener('input',()=>sync());
 form.addEventListener('click',e=>{
  if(verifying)return;
  const key=e.target.closest('[data-pad-key]'),action=e.target.closest('[data-pad-action]');
  if(key){digit(key.dataset.padKey);return;}
  if(action){input.value=action.dataset.padAction==='clear'?'':input.value.slice(0,-1);sync();}
 });
 form.addEventListener('submit',e=>{
  if(verifying||input.value.length!==limit){e.preventDefault();return;}
  verifying=true;submit.disabled=true;status.textContent="checking if you're actually me...";status.dataset.tone='ready';setState('verifying');
 });
 document.addEventListener('keydown',e=>{
  if(verifying||e.altKey||e.ctrlKey||e.metaKey)return;
  if(e.target===input){if(e.key==='Escape'){e.preventDefault();input.value='';sync();}return;}
  if(e.target?.matches('input,textarea,select,[contenteditable]'))return;
  if(/^\d$/.test(e.key)){e.preventDefault();digit(e.key);}
  else if(e.key==='Backspace'){e.preventDefault();input.value=input.value.slice(0,-1);sync();}
  else if(e.key==='Escape'){e.preventDefault();input.value='';sync();}
  else if(e.key==='Enter'&&!e.target?.closest('button,a')&&input.value.length===limit){e.preventDefault();form.requestSubmit();}
 });
 window.addEventListener('pageshow',()=>{if(verifying){verifying=false;input.value='';sync();}});
})();
