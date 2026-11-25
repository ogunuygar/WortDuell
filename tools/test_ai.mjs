// UI/worker protocol test; does not execute a real model.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
class Element {
  constructor(){this.events={};this.children=[];this.value='';this.textContent='';this.hidden=false;}
  addEventListener(n,f){this.events[n]=f;}
  fire(n,event={}){this.events[n]?.(event);}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(){this.children=[];}
  querySelector(){return null;}
  setAttribute(n,v){this[n]=v;}
  focus(){}
}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
const doc=new Element();doc.getElementById=get;doc.createElement=()=>new Element();doc.baseURI='https://example.test/WortDuell/';
const win=new Element();win.isSecureContext=true;let confirmed=true;win.confirm=()=>confirmed;
const workers=[];class Worker {constructor(){workers.push(this);this.sent=[];}postMessage(d){this.sent.push(d);}terminate(){this.terminated=true;}emit(d){this.onmessage({data:d});}}win.Worker=Worker;
const storage=new Map(),localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
get('aiDialog').hidden=true;
const context={document:doc,window:win,navigator:{gpu:{},userAgent:'iPhone'},Worker,URL,setTimeout,clearTimeout,localStorage};
vm.runInNewContext(readFileSync(new URL('../js/ai.js',import.meta.url),'utf8'),context);
assert.equal(workers.length,0);const open=()=>doc.fire('click',{target:{closest:s=>s==='[data-ai-open]'?{}:null}});open();assert.equal(get('aiDialog').hidden,false);assert.equal(workers.length,0);assert.equal(get('aiSend').disabled,true);
get('aiLoad').fire('click');const w=workers[0];assert.equal(w.sent[0].model,'light');w.emit({type:'progress',progress:.4,text:'loading'});assert.equal(get('aiProgress').value,.4);w.emit({type:'ready'});assert.equal(get('aiSend').disabled,false);assert.equal(get('aiSetup').hidden,true);
const ask=text=>{get('aiInput').value=text;get('aiForm').fire('submit',{preventDefault(){}});};
ask('Why dem instead of den?');assert.match(w.sent[1].messages[0].content,/actual question directly/);assert.equal(w.sent[1].messages[1].content,'Why dem instead of den?');w.emit({type:'token',text:'Dem is dative.'});w.emit({type:'done'});assert.equal(get('aiLog').children[1].children[1].textContent,'Dem is dative.');
ask('Give an example');assert.equal(w.sent.at(-1).messages[2].content,'Dem is dative.');w.emit({type:'token',text:'Ich helfe dem Mann.'});w.emit({type:'done'});
get('aiClose').fire('click');assert.equal(w.terminated,true);assert.equal(get('aiDialog').hidden,true);open();ask('Why helfen?');const second=workers[1];assert.equal(second.sent[0].type,'load');second.emit({type:'ready'});assert.equal(second.sent[1].type,'generate');assert.equal(second.sent[1].messages.at(-1).content,'Why helfen?');second.emit({type:'error',message:'GPU unavailable'});assert.equal(second.terminated,true);assert.match(get('aiStatus').textContent,/GPU unavailable/);
ask('Try again');const third=workers[2];doc.hidden=true;doc.fire('visibilitychange');assert.equal(third.terminated,true);get('aiClear').fire('click');assert.equal(get('aiLog').children.length,0);
console.log('PASS: lazy download, device model, free chat, follow-up context, wake on send, error and background release (mock worker)');

// Settings: the same worker lifecycle is used whether the panel is open or not.
get('aiClose').fire('click');
const before=workers.length;
get('aiStorageDownload').fire('click');const fromSettings=workers.at(-1);
assert.equal(workers.length,before+1);assert.equal(fromSettings.sent[0].type,'load');
fromSettings.emit({type:'progress',progress:.7,text:'Downloading weights'});
assert.equal(get('aiStorageProgress').value,.7);assert.equal(get('aiStorageStatus').textContent,'Downloading weights');
fromSettings.emit({type:'ready'});assert.equal(get('aiStorageUnload').disabled,false);
get('aiStorageUnload').fire('click');assert.equal(fromSettings.terminated,true);assert.equal(storage.get('wortduell.ai.loaded.light'),'1');
assert.match(get('aiStorageStatus').textContent,/Downloaded files are kept/);
storage.set('wortduell1000.v1','learning records');storage.set('wortduell.ai.loaded.balanced','1');
confirmed=false;const count=workers.length;get('aiStorageDelete').fire('click');assert.equal(workers.length,count);
confirmed=true;get('aiStorageDelete').fire('click');const failed=workers.at(-1);assert.equal(failed.sent[0].type,'delete');
assert.equal(get('aiStorageDownload').disabled,true);assert.equal(get('aiSend').disabled,true);
failed.emit({type:'error',message:'network'});assert.match(get('aiStorageStatus').textContent,/Deletion not confirmed/);assert.equal(storage.get('wortduell.ai.loaded.light'),'1');
get('aiStorageDelete').fire('click');const deletion=workers.at(-1);deletion.emit({type:'deleted'});
assert.equal(deletion.terminated,true);assert.equal(storage.has('wortduell.ai.loaded.light'),false);assert.equal(storage.has('wortduell.ai.loaded.balanced'),false);
assert.equal(storage.get('wortduell1000.v1'),'learning records');assert.equal(get('aiSend').disabled,true);assert.match(get('aiStorageStatus').textContent,/deleted/);
assert.equal(get('aiSetup').hidden,false);assert.equal(get('aiStorageDownload').disabled,false);
// Verify the worker requests deletion of all four model variants using a mocked runtime.
const workerSource=readFileSync(new URL('../js/ai-worker.js',import.meta.url),'utf8').replaceAll('await import(runtimeURL)','await mockRuntime()');
const removed=[], messages=[];const scope={postMessage:d=>messages.push(d)};
const runtime={deleteModelAllInfoInCache:async id=>removed.push(id),hasModelInCache:async()=>false,prebuiltAppConfig:{}};
vm.runInNewContext(workerSource,{self:scope,mockRuntime:async()=>runtime});
await scope.onmessage({data:{type:'delete'}});
assert.equal(removed.length,4);assert.equal(new Set(removed).size,4);assert.equal(messages.at(-1).type,'deleted');
runtime.hasModelInCache=async()=>true;await scope.onmessage({data:{type:'delete'}});assert.equal(messages.at(-1).type,'error');
console.log('PASS: Settings download, unload, cancelled/failed/successful deletion, all model variants and learning record preservation (mock worker/runtime)');
