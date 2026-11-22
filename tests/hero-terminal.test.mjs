import {test} from 'node:test';
import assert from 'node:assert/strict';
import {terminalFrame,mountTerminal} from '../js/hero-terminal.mjs';
test('six two-second slots and a scrambled transition',()=>{
  const expected=['ITSMEFEJE.EXE','HELLO, WORLD!','feje@localhost:~$', "console.log('hi :)')",null,'ENTERING MY WORLD'];
  for(let i=0;i<6;i++){
    const f=terminalFrame(i*2000+1000,()=>.2);
    assert.equal(f.slot,i);assert.equal(f.glitch,false);
    if(expected[i]!==null)assert.equal(f.text,expected[i]);
  }
  assert.equal(terminalFrame(2000,()=>0).glitch,true);
  assert.match(terminalFrame(2000,()=>0).text,/^[# ]+$/);
  assert.equal(terminalFrame(2320).text,'HELLO, WORLD!');
  assert.equal(terminalFrame(12320).text,'ITSMEFEJE.EXE');
});
test('noise slot contains only fixed prefix and continuously scrambled symbols',()=>{
  assert.notEqual(terminalFrame(8050,()=>0).text,terminalFrame(8150,()=>.99).text);
  for(let t=8000;t<10000;t+=23){
    const f=terminalFrame(t);
    assert.match(f.text,/^S\.[#$%&*+?@/|~▓▒░]{9}$/);
    assert.ok(f.delay<=120);
  }
});
test('terminal lifecycle pauses and restores correctly',()=>{
  let now=0,seq=0,observer;const timers=new Map();
  const target=()=>({events:{},addEventListener(k,fn){this.events[k]=fn;}});
  const motion={...target(),matches:false},doc={...target(),hidden:false};
  const classes=new Set(),output={textContent:''};
  const button={...target(),querySelector:()=>output,setAttribute(k,v){this[k]=v;},classList:{add:x=>classes.add(x),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),toggle(x,b){b?classes.add(x):classes.delete(x);}}};
  const win={...target(),matchMedia:()=>motion,performance:{now:()=>now},setTimeout(fn,delay){timers.set(++seq,{fn,delay});return seq;},clearTimeout:id=>timers.delete(id),IntersectionObserver:class{constructor(cb){observer=cb;}observe(){} disconnect(){}}};
  mountTerminal(button,doc,win);
  assert.equal(timers.size,0);observer([{isIntersecting:true}]);assert.equal(timers.size,1);
  now=2000;const [id,task]=[...timers][0];timers.delete(id);task.fn();assert.equal(classes.has('is-glitching'),true);assert.equal(timers.size,1);
  button.events.click();assert.equal(timers.size,0);assert.equal(button['aria-pressed'],'true');
  button.events.click();assert.equal(timers.size,1);doc.hidden=true;doc.events.visibilitychange();assert.equal(timers.size,0);
  doc.hidden=false;doc.events.visibilitychange();assert.equal(timers.size,1);observer([{isIntersecting:false}]);assert.equal(timers.size,0);
  observer([{isIntersecting:true}]);motion.matches=true;motion.events.change();assert.equal(timers.size,0);assert.equal(output.textContent,'ITSMEFEJE.EXE');assert.equal(button.disabled,true);
  motion.matches=false;motion.events.change();assert.equal(timers.size,1);
  win.events.pagehide({persisted:true});assert.equal(timers.size,0);win.events.pageshow();assert.equal(timers.size,1);
  win.events.pagehide({persisted:false});assert.equal(timers.size,0);
});
