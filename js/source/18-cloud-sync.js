/* Google Drive appDataFolder sync. Append-only batches; no OAuth secrets or tokens on disk. */
function cloudMergeCore(){
 const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
 const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const safe=k=>typeof k==='string'&&!['__proto__','prototype','constructor'].includes(k);
 const counter=p=>{
  const [a,b]=p,k=p.at(-1);
  if(p.length===1)return ['pts','ans','ok'].includes(k);
  if(a==='w')return ['r','x'].includes(k);
  if(a==='days')return p.length===3&&['answers','correct','points','learned','review'].includes(k)||p.length===4&&p[2]==='modes';
  if(['dirStats','modeStats','topicStats'].includes(a))return ['n','ok','points'].includes(k);
  if(a==='grammar')return ['n','ok'].includes(k);
  if(a==='adaptive'&&b==='skills')return ['n','ok','bad'].includes(k);
  if(a==='study')return ['n','ok','runs','count','known','again'].includes(k)&&['modes','stories','conversations','mistakes','cards'].includes(b);
  return false;
 };
 function diff(a,b,p=[],out=[]){
  if(eq(a,b))return out;
  if(p.length&&(p[0]==='dailyPlan'||p.join('.')==='adaptive.recent')){out.push(b===undefined?['del',p]:['set',p,clone(b)]);return out;}
  if(p.join('.')==='fav'||p.join('.')==='study.extra'){
   const key=x=>p[0]==='fav'?String(x):x.id, old=new Map((Array.isArray(a)?a:[]).map(x=>[key(x),x])), next=new Map((Array.isArray(b)?b:[]).map(x=>[key(x),x]));
   for(const [id,v] of next)if(!eq(old.get(id),v))out.push(['item',p,id,clone(v)]);
   for(const id of old.keys())if(!next.has(id))out.push(['removeItem',p,id]);return out;
  }
  if(obj(b)&&(obj(a)||a===undefined||a===null)){
   if(p.length&&!obj(a))out.push(['ensure',p]);
   for(const k of new Set([...Object.keys(a||{}),...Object.keys(b)]))if(safe(k))diff(a?.[k],b[k],[...p,k],out);return out;
  }
  if(b===undefined){out.push(['del',p]);return out;}
  if(typeof b==='number'&&counter(p)){const delta=b-(typeof a==='number'?a:0);if(delta||a===undefined)out.push(['add',p,delta]);return out;}
  if(p.at(-1)==='best'||p.at(-1)==='recognitionHits'){out.push(['max',p,b]);return out;}
  if(p.includes('mastery')&&typeof b==='boolean'){if(b)out.push(['set',p,true]);return out;}
  if(p.at(-1)==='learnedOn'){out.push(['earliest',p,b]);return out;}
  out.push(['set',p,clone(b)]);return out;
 }
 function apply(state,ops){
  for(const op of ops){
   const [kind,p,v,item]=op;validateStateTree(v);validateStateTree(item);if(!Array.isArray(p)||!p.length||p.length>12||!p.every(safe))throw Error('Invalid cloud change path');
   let t=state;for(const k of p.slice(0,-1)){if(!Object.hasOwn(t,k)||!obj(t[k]))t[k]={};t=t[k];}const k=p.at(-1);
   if(kind==='del')delete t[k];
   else if(kind==='ensure'){if(!obj(t[k]))t[k]={};}
   else if(kind==='add'){if(!Number.isFinite(v)||!counter(p))throw Error('Invalid cloud counter');t[k]=Math.max(0,(Number(t[k])||0)+v);}
   else if(kind==='max')t[k]=Math.max(Number(t[k])||0,Number(v)||0);
   else if(kind==='earliest'){if(!t[k]||v<t[k])t[k]=v;}
   else if(kind==='set')t[k]=clone(v);
   else if(kind==='item'||kind==='removeItem'){
    if(!['fav','study.extra'].includes(p.join('.')))throw Error('Invalid list change');
    const arr=Array.isArray(t[k])?t[k]:[], key=x=>p[0]==='fav'?String(x):x.id;
    t[k]=arr.filter(x=>key(x)!==v);if(kind==='item')t[k].push(clone(item));
   }else throw Error('Unknown cloud operation');
  }return state;
 }
 function replay(seed,batches){const seen=new Set();for(const b of [...batches].sort((a,b)=>a.clock-b.clock||a.id.localeCompare(b.id))){if(seen.has(b.id))continue;seen.add(b.id);apply(seed,b.ops);}return seed;}
 return {clone,eq,diff,apply,replay};
}
/* CLOUD_RUNTIME */
try {
(()=>{
 const C=cloudMergeCore(), META='wortduell.cloud.v3.406290812417', PREFIX='wortduell-sync-v3-', CLIENT='406290812417-8ioo5cb50nktmsl0spp2r4t1egtjjm42.apps.googleusercontent.com', SCOPE='https://www.googleapis.com/auth/drive.appdata';
 const ui=id=>document.getElementById(id), status=ui('cloudStatus'), connect=ui('cloudConnect'), syncBtn=ui('cloudSync'), disconnect=ui('cloudDisconnect');
 let meta=null, token='', expiry=0, busy=false, stale=false, ready=false, loading=false, cache=new Map(), lastAttempt=0;
 const snapshot=()=>C.clone(S), tell=t=>{status.textContent=t;refreshMobileCloud();}, persist=()=>{try{localStorage.setItem(META,JSON.stringify(meta));}catch(e){stale=true;throw Error('Cloud journal could not be saved. Export a backup and reload.');}};
 refreshMobileCloud=()=>{
  const account=ui('wdMobileCloudAccount'), line=ui('wdMobileCloudStatus'), last=ui('wdMobileCloudLast'), button=ui('wdMobileSyncNow');
  account.textContent=meta?.account?'Linked account: '+(meta.email||'Google Drive'):'No account linked';
  const dirty=Boolean(meta?.initialized&&(meta.pending||C.diff(meta.base,snapshot()).length));
  const valid=Boolean(token&&Date.now()<expiry);
  let text=status.textContent, state='neutral';
  if(!navigator.onLine)text='Offline · local progress is kept.';
  else if(stale||text.startsWith('Sync paused:')||text.startsWith('Cloud state needs attention'))state='error';
  else if(meta?.account&&!valid&&!busy)text='Connect Google to resume syncing.';
  else if(valid&&!busy&&dirty)text='Local changes waiting to sync.';
  else if(valid&&!busy&&!dirty&&text.startsWith('Synced '))state='synced';
  line.textContent=text;line.dataset.state=state;
  last.textContent=meta?.last?'Last sync: '+new Date(meta.last).toLocaleString():'Last sync: —';
  button.disabled=busy||stale||!valid||!navigator.onLine;
 };
 function controls(){connect.disabled=busy||stale;syncBtn.disabled=busy||stale||!token;disconnect.disabled=busy||!token;ui('cloudAccount').textContent=meta?.account?'Linked account: '+(meta.email||'Google Drive'):'No account linked';refreshMobileCloud();}
 function fail(e){if(e.status===401){token='';expiry=0;tell('Google session expired. Connect again; your local work is safe.');}else tell('Sync paused: '+(e.message||String(e))+' Local progress is kept.');controls();}
 try{const raw=localStorage.getItem(META);if(raw){meta=JSON.parse(raw);validateStateTree(meta);}if(meta?.transaction){const t=meta.transaction;if(C.eq(JSON.parse(localStorage.getItem(KEY)||'null'),t.before)||C.eq(snapshot(),t.before)){S=migrate(t.after);save();if(!storageOK)throw Error('Local storage is unavailable');}else if(!C.eq(JSON.parse(localStorage.getItem(KEY)||'null'),t.after)&&!C.eq(snapshot(),t.after))throw Error('Interrupted sync: back up progress before retrying');delete meta.transaction;persist();}}catch(e){stale=true;tell('Cloud state needs attention. Export a backup. '+e.message);}
 if(!stale)tell(meta?.account?'Connect Google to resume syncing. Offline progress is kept.':'Connect your Google account to sync progress between devices.');controls();
 function loadGIS(){if(ready||loading||!navigator.onLine)return;loading=true;const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=()=>{ready=Boolean(window.google?.accounts?.oauth2);loading=false;};script.onerror=()=>{loading=false;};document.head.append(script);}
 loadGIS();
 async function api(path,opts={},operation='request'){
  if(!token||Date.now()>=expiry){const e=Error('Google session expired');e.status=401;throw e;}
  const response=await fetch('https://www.googleapis.com'+path,{...opts,headers:{...opts.headers,Authorization:'Bearer '+token},cache:'no-store',credentials:'omit'});
  if(!response.ok){
   let reason='';try{const data=await response.json();const value=data?.error?.errors?.[0]?.reason||data?.error?.status;if(typeof value==='string'&&/^[a-zA-Z0-9_]+$/.test(value))reason=' · '+value;}catch(_){}
   const e=Error('Google Drive '+operation+' HTTP '+response.status+reason);e.status=response.status;throw e;
  }return response.status===204?null:response.json();
 }
 async function list(){let page='',ids=[];do{const q=new URLSearchParams({spaces:'appDataFolder',q:"name contains '"+PREFIX+"'",fields:'nextPageToken,files(id,name)',pageSize:'1000'});if(page)q.set('pageToken',page);const result=await api('/drive/v3/files?'+q,{},'list app data');ids.push(...(result.files||[]).filter(f=>f.name.startsWith(PREFIX)).map(f=>f.id));page=result.nextPageToken||'';}while(page);return ids;}
 async function fetchBatch(id){if(cache.has(id))return cache.get(id);const b=await api('/drive/v3/files/'+encodeURIComponent(id)+'?alt=media',{},'read batch');if(b?.schema!==1||typeof b.id!=='string'||!Number.isSafeInteger(b.clock)||!Array.isArray(b.ops))throw Error('Unsupported cloud record');validateStateTree(b);cache.set(id,b);return b;}
 async function upload(p){
  const boundary='wd_'+crypto.randomUUID().replaceAll('-','');
  const metadata={name:PREFIX+p.batch.id+'.json',parents:['appDataFolder'],mimeType:'application/json'};
  const body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+'\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify(p.batch)+'\r\n--'+boundary+'--\r\n';
  const result=await api('/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body},'create batch');
  if(typeof result?.id!=='string'||!result.id)throw Error('Drive create batch returned no file ID');
  cache.set(result.id,p.batch);return result.id;
 }
 const hasWork=s=>!!(s.ans||s.pts||Object.keys(s.w||{}).length||s.fav?.length||Object.keys(s.adaptive?.skills||{}).length||Object.keys(s.grammar?.byLesson||{}).length||s.grammar?.verb?.n||s.study?.extra?.length||Object.keys(s.study?.modes||{}).length);
 const safeScreen=()=>!ui('settings').hidden||!ui('home').hidden;
 async function run(manual=false){
  if(busy||stale||!token||!navigator.onLine||!safeScreen()||(!manual&&document.hidden))return;
  busy=true;lastAttempt=Date.now();controls();tell('Syncing with Google Drive…');
  try{
   if(!storageOK)throw Error('Local storage is unavailable');
   if(!meta?.account)throw Error('Connect Google first');
   const listed=await list();
   const ids=new Set([...(meta.known||[]),...listed]);
   const batches=[];for(const id of ids){batches.push(await fetchBatch(id));}
   if(stale)throw Error('Another tab changed cloud data. Reload before syncing.');
   if(!meta.initialized){const local=snapshot();let seed=!ids.size;
    if(ids.size&&hasWork(local)){
     if(confirm('Cloud progress already exists. Is this device’s existing progress INDEPENDENT (not imported/copied from another device)? OK = merge independent progress; Cancel = choose cloud copy.'))seed=true;
     else if(!confirm('Use the cloud copy instead of this device’s old progress? A local backup will be downloaded first. Cancel to stop syncing.')){tell('Initial sync cancelled. Local progress is unchanged.');return;}
     if(!seed)downloadBackup();
    }
    meta.base=seed?{}:local;meta.initialized=true;persist();
   }
   let captured;
   if(!meta.pending){captured=snapshot();const ops=C.diff(meta.base,captured);
    if(ops.length){const clock=Math.max(Date.now(),...batches.map(b=>b.clock+1), (meta.clock||0)+1);const id=crypto.randomUUID();meta.pending={batch:{schema:1,id,clock,ops},snapshot:captured};persist();}
   }
   if(meta.pending){
    const p=meta.pending, existing=batches.filter(b=>b.id===p.batch.id);
    if(existing.some(b=>!C.eq(b,p.batch)))throw Error('Conflicting cloud batch; local work kept');
    if(!existing.length){ids.add(await upload(p));batches.push(p.batch);}
    captured=p.snapshot;
   }
   else captured=captured||snapshot();
   // Never change an active exercise's state. The uploaded batch is retained for a safe retry.
   if(!safeScreen()||stale){tell('Cloud changes saved. Return to Home or Settings to merge.');return;}
   const current=snapshot(), merged=migrate(C.replay(fresh(),batches)), after=migrate(C.apply(C.clone(merged),C.diff(captured,current)));
   // Journal the local commit so a reload between the two localStorage writes can recover.
   meta={...meta,base:C.clone(merged),known:[...ids],clock:Math.max(meta.clock||0,...batches.map(b=>b.clock)),pending:null,last:new Date().toISOString(),transaction:{before:JSON.parse(localStorage.getItem(KEY)||'null'),after:C.clone(after)}};persist();
   S=after;save();if(!storageOK){stale=true;throw Error('Unable to save merged progress. Export a backup and reload.');}delete meta.transaction;persist();
   if(!ui('settings').hidden)renderSettings();else renderHome();
   tell('Synced '+new Date(meta.last).toLocaleTimeString()+'. Local progress is also saved.');
  }catch(e){fail(e);}finally{busy=false;controls();}
 }
 connect.onclick=()=>{
  if(stale){tell('Reload this page before connecting.');return;}if(!navigator.onLine){tell('Connect to the internet first.');return;}
  if(!ready){loadGIS();tell('Google sign-in is loading. Tap Connect Google again in a moment.');return;}
  busy=true;controls();tell('Waiting for Google sign-in…');
  try{const client=google.accounts.oauth2.initTokenClient({client_id:CLIENT,scope:SCOPE,include_granted_scopes:false,callback:async r=>{
   if(r.error||!r.access_token){busy=false;fail(Error(r.error||'No token returned'));return;}
   const scopes=String(r.scope||'').trim().split(/\s+/).filter(Boolean);
   const lifetime=Number(r.expires_in);
   if(scopes.length!==1||scopes[0]!==SCOPE||!Number.isFinite(lifetime)||lifetime<=30){busy=false;token='';expiry=0;fail(Error('Unexpected Google permission or token lifetime. Only private application data is allowed.'));return;}
   token=r.access_token;expiry=Date.now()+lifetime*1000-30000;
   try{const about=await api('/drive/v3/about?fields=user(permissionId,emailAddress,displayName)',{},'identify account');const user=about.user;if(!user?.permissionId)throw Error('Cannot identify Drive account');if(meta?.account&&meta.account!==user.permissionId){token='';throw Error('This device is linked to another Google account. Reconnect using the original account.');}
    if(!meta){meta={account:user.permissionId,email:user.emailAddress||user.displayName||'',initialized:false,base:null,known:[],clock:0,pending:null};persist();}busy=false;controls();await run(true);
   }catch(e){busy=false;token='';fail(e);}
  },error_callback:e=>{busy=false;fail(Error(e.type||'Google popup failed'));}});client.requestAccessToken({prompt:'select_account'});}catch(e){busy=false;fail(e);}
 };
 syncBtn.onclick=()=>run(true);
 ui('wdMobileSyncNow').onclick=()=>run(true);
 disconnect.onclick=()=>{token='';expiry=0;cache.clear();tell('Disconnected. Progress remains on this device. Connect the same account to resume syncing.');controls();};
 // Reset/import are deliberately blocked for a linked device: a replacement is not an incremental change.
 for(const id of ['sReset','sLoad','sFile'])ui(id).addEventListener(id==='sFile'?'change':'click',e=>{if(meta?.account){e.stopImmediatePropagation();e.preventDefault();if(id==='sFile')e.target.value='';toast('Cloud-linked progress cannot be reset or imported. Download a backup instead.');}},true);
 window.addEventListener('storage',e=>{if(e.key===META){stale=true;token='';tell('Another WortDuell tab changed sync state. Reload this tab before syncing.');controls();}});
 window.addEventListener('online',()=>{refreshMobileCloud();loadGIS();run();});window.addEventListener('offline',refreshMobileCloud);document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshMobileCloud();run();}});
 setInterval(()=>{if(Date.now()-lastAttempt>=60000)run();},60000);
})();
 document.getElementById('wdRuntimeVersion').textContent='Runtime ready';
} catch (error) {
 console.error('WortDuell sync initialization',error);
 const message='Sync initialization failed: '+(error.message||String(error));
 for(const id of ['cloudStatus','wdMobileCloudStatus']){const el=document.getElementById(id);if(el)el.textContent=message;}
 document.getElementById('wdRuntimeVersion').textContent='Runtime error';
 for(const id of ['cloudConnect','cloudSync','wdMobileSyncNow','cloudDisconnect']){const el=document.getElementById(id);if(el)el.disabled=true;}
}

