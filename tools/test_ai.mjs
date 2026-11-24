// Isolated UI/worker protocol test. Does not run the downloaded model.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
class Element {
  constructor(){this.events={};this.children=[];this.value='';this.textContent='';this.open=false;}
  addEventListener(n,f){this.events[n]=f;}
  fire(n,event={}){this.events[n]?.(event);}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(){this.children=[];}
  showModal(){this.open=true;}
  close(){this.open=false;this.fire('close');}
  focus(){}
}
const elements=new Map(), get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
const doc=new Element();doc.getElementById=get;doc.createElement=()=>new Element();doc.baseURI='https://example.test/WortDuell/';
const win=new Element();win.isSecureContext=true;
const workers=[];class Worker {constructor(){workers.push(this);this.sent=[];}postMessage(d){this.sent.push(d);}terminate(){this.terminated=true;}emit(d){this.onmessage({data:d});}}win.Worker=Worker;
get('aiModel').value='light';get('aiLevel').value='A1';get('aiMode').value='grammar';
const context={document:doc,window:win,navigator:{gpu:{}},Worker,URL,setTimeout,clearTimeout};
vm.runInNewContext(readFileSync(new URL('../js/ai.js',import.meta.url),'utf8'),context);
assert.equal(workers.length,0);doc.fire('click',{target:{closest:()=>true}});assert.equal(get('aiDialog').open,true);assert.equal(workers.length,0);
get('aiLoad').fire('click');const w=workers[0];assert.equal(w.sent[0].model,'light');w.emit({type:'progress',progress:.4,text:'loading'});assert.equal(get('aiProgress').value,.4);w.emit({type:'ready',model:'test'});assert.equal(get('aiSend').disabled,false);
get('aiExample').fire('click');get('aiForm').fire('submit',{preventDefault(){}});assert.match(w.sent[1].messages[0].content,/Check the learner/);assert.match(w.sent[1].messages[1].content,/gestern/);w.emit({type:'token',text:'Example output'});w.emit({type:'done'});assert.equal(get('aiLog').children[1].children[1].textContent,'Example output');
get('aiMode').value='conversation';get('aiMode').fire('change');get('aiInput').value='Hallo';get('aiForm').fire('submit',{preventDefault(){}});w.emit({type:'token',text:'Guten Tag'});w.emit({type:'done'});get('aiInput').value='Wie geht es dir?';get('aiForm').fire('submit',{preventDefault(){}});assert.equal(w.sent.at(-1).messages[2].content,'Guten Tag');get('aiStop').fire('click');assert.equal(w.terminated,true);assert.equal(get('aiSend').disabled,true);
get('aiLoad').fire('click');workers[1].emit({type:'error',message:'GPU unavailable'});assert.equal(workers[1].terminated,true);assert.match(get('aiStatus').textContent,/GPU unavailable/);get('aiLoad').fire('click');doc.hidden=true;doc.fire('visibilitychange');assert.equal(workers[2].terminated,true);get('aiClose').fire('click');assert.equal(get('aiDialog').open,false);
console.log('PASS: lazy load, progress, grammar prompt, streaming, conversation history, cancellation, GPU error and background shutdown (mock worker)');
