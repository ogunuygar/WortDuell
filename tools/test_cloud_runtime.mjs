// Test the actual sync module using fake GIS/Drive and browser storage.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const read=name=>readFileSync(new URL('../js/source/'+name,import.meta.url),'utf8');
const storage=read('02-storage.js');
const validation=storage.slice(storage.indexOf('function validateStateTree'),storage.indexOf('function migrate'));
const runtime=read('18-cloud-sync.js');
const files=new Map(), calls=[];let drop=false, failList=false;
async function fetch(url,opts){
  const p=new URL(url);calls.push(p.pathname+p.search);
  assert.equal(opts.headers.Authorization,'Bearer mock');
  const response=(value,status=200)=>new Response(JSON.stringify(value),{status});
  if(p.pathname==='/drive/v3/about')return response({user:{permissionId:'account',emailAddress:'mock@example.test'}});
  if(p.pathname==='/drive/v3/files'){
    if(failList)return response({error:{errors:[{reason:'notFound'}]}},404);
    return response({files:[...files].map(([id,f])=>({id,name:f.meta.name}))});
  }
  if(p.pathname==='/upload/drive/v3/files'){
    const chunks=[...opts.body.matchAll(/\r\n\r\n(\{[^\r\n]+\})\r\n/g)].map(m=>JSON.parse(m[1]));
    assert.equal(chunks.length,2);const [meta,batch]=chunks;
    assert.equal(meta.id,undefined);assert.deepEqual(meta.parents,['appDataFolder']);assert.match(meta.name,/^wortduell-sync-v3-/);
    const id=String(files.size+1);files.set(id,{meta,batch});
    if(drop){drop=false;throw Error('Simulated lost response after upload');}return response({id});
  }
  if(p.pathname.startsWith('/drive/v3/files/')){const f=files.get(p.pathname.split('/').at(-1));return f?response(f.batch):response({error:{errors:[{reason:'notFound'}]}},404);}
  throw Error('Unexpected request '+p.pathname);
}
function device(progress){
 let confirmed=false;
 const nodes=new Map(), saved=new Map([['wortduell.cloud.v1.406290812417',JSON.stringify({account:'account',known:['obsolete']})],['wortduell.cloud.v2.406290812417',JSON.stringify({account:'account',known:['obsolete-v2']})]]);
 const ui=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:'',dataset:{},addEventListener(){}});return nodes.get(id);};
 const google={accounts:{oauth2:{initTokenClient(config){assert.equal(config.client_id,'406290812417-8ioo5cb50nktmsl0spp2r4t1egtjjm42.apps.googleusercontent.com');return {requestAccessToken(){return config.callback({access_token:'mock',scope:'https://www.googleapis.com/auth/drive.appdata',expires_in:3600});}};}}}};
 const context=vm.createContext({console,fetch,URLSearchParams,crypto:webcrypto,google,window:{google,addEventListener(){}},navigator:{onLine:true},document:{getElementById:ui,createElement:()=>({}),head:{append(s){s.onload();}},addEventListener(){}},setInterval(){},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},confirm:()=>confirmed,progress});
 vm.runInContext(validation+`\nconst KEY='wortduell1000.v3';let S={ans:progress,ok:0,pts:0,w:{},fav:[]}, storageOK=true;const fresh=()=>({ans:0,ok:0,pts:0,w:{},fav:[]});const migrate=x=>x;let refreshMobileCloud=()=>{};function save(){localStorage.setItem(KEY,JSON.stringify(S));}function renderHome(){}function renderSettings(){}function downloadBackup(){}function toast(){}function resetLocalProgress(){if(confirm()){S=fresh();save();}}save();\n`+runtime,context);
 return {ui,saved,allowReset(value){confirmed=value;},add(n){vm.runInContext(`S.ans+=${n};save();`,context);},async reset(){await ui('sReset').onclick();},async connect(){await ui('cloudConnect').onclick();},async sync(){await ui('cloudSync').onclick();},state:()=>JSON.parse(saved.get('wortduell1000.v3'))};
}
const wait=async(d,text)=>{for(let i=0;i<100;i++){if(d.ui('cloudStatus').textContent.includes(text)&&!d.ui('cloudConnect').disabled)return;await new Promise(r=>setTimeout(r,5));}throw Error(d.ui('cloudStatus').textContent);};
const a=device(12);assert.equal(a.ui('wdRuntimeVersion').textContent,'Runtime ready');drop=true;await a.connect();await wait(a,'Sync paused');assert.equal(files.size,1);assert.equal(a.state().ans,12);
await a.sync();await wait(a,'Synced ');assert.equal(files.size,1);
const b=device(0);await b.connect();await wait(b,'Synced ');assert.equal(b.state().ans,12);assert.equal(files.size,1);
failList=true;await b.sync();await wait(b,'list app data HTTP 404 · notFound');assert.equal(b.state().ans,12);
assert.ok(!calls.some(p=>p.includes('obsolete')||p.includes('generateIds')));
console.log('PASS: fresh cloud namespace, mocked OAuth, lost upload response recovery, cross-device merge, labeled 404 and retained progress');

// Reset confirmation, interrupted upload, stale offline device and new learning.
failList=false;
const count=files.size;
await a.reset();assert.equal(files.size,count);assert.equal(a.state().ans,12);
a.allowReset(true);drop=true;await a.reset();await wait(a,'Reset pending');assert.equal(a.state().ans,12);assert.equal(files.size,count+1);
await a.sync();await wait(a,'All progress reset');assert.equal(a.state().ans,0);assert.equal(files.size,count+1);
// Simulate an outdated offline client uploading old progress after reset.
const old={schema:1,id:'stale-offline',clock:Date.now()+5000,ops:[['add',['ans'],99]]};
files.set('late-old',{meta:{name:'wortduell-sync-v3-stale-offline.json'},batch:old});
b.add(5);await b.sync();await wait(b,'All progress reset');assert.equal(b.state().ans,0);
a.add(3);await a.sync();await wait(a,'Synced ');assert.equal(a.state().ans,3);
await b.sync();await wait(b,'Synced ');assert.equal(b.state().ans,3);
const c=device(19);await c.connect();await wait(c,'All progress reset');assert.equal(c.state().ans,3);
a.allowReset(true);await a.reset();await wait(a,'All progress reset');assert.equal(a.state().ans,0);
await b.sync();await wait(b,'All progress reset');assert.equal(b.state().ans,0);
const local=device(8);await local.reset();assert.equal(local.state().ans,8);local.allowReset(true);await local.reset();assert.equal(local.state().ans,0);
console.log('PASS: reset cancellation, retry after lost reset response, stale device and old upload exclusion, new progress sync, second reset, local-only confirmation');
