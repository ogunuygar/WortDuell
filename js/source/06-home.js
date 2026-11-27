/* ---------- home ---------- */
function setSeg(el,val){el.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v==String(val))));}
function bindSeg(el,fn){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;setSeg(el,b.dataset.v);fn(b.dataset.v);});}
bindSeg($('segDir'),v=>{S.set.dir=v;save();});
bindSeg($('segLvl'),v=>{S.set.lvl=v;save();});
bindSeg($('segLen'),v=>{S.set.len=+v;save();});
// Keep the mobile card in sync with Settings even during startup.
let refreshMobileCloud=()=>{
  const account=$('cloudAccount'),status=$('cloudStatus'),sync=$('cloudSync');
  if(!account||!status||!sync)return;
  $('wdMobileCloudAccount').textContent=account.textContent;
  $('wdMobileCloudStatus').textContent=status.textContent;
  $('wdMobileSyncNow').disabled=sync.disabled;
};
const wdCloudSettingsObserver=new MutationObserver(()=>refreshMobileCloud());
for(const id of ['cloudAccount','cloudStatus','cloudSync']){
  const node=$(id);if(node)wdCloudSettingsObserver.observe(node,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['disabled']});
}
$('wdMobileSyncNow').onclick=()=>$('cloudSync').click();
function renderHome(){
  const L=DATA.filter(d=>learned(d.i)).length;
  $('stLearn').textContent=L;
  const totals=questionTotals(S);
  $('stAcc').textContent=totals.n?Math.round(totals.ok/totals.n*100)+'%':'–';
  $('stPts').textContent=S.pts>=10000?(S.pts/1000).toFixed(1)+'k':S.pts;
  $('stToday').textContent=daily(today()).answers;
  const fmt=n=>Number(n||0).toLocaleString('en-GB');
  $('wdMobileToday').textContent=fmt(daily(today()).answers);
  $('wdMobileTotal').textContent=fmt(totals.n);
  $('wdMobileAccuracy').textContent=totals.n?Math.round(totals.ok/totals.n*100)+'%':'–';
  $('wdMobileLearned').textContent=fmt(L);
  $('wdMobileStreak').textContent=fmt(streak());
  $('wdMobilePoints').textContent=fmt(S.pts);
  refreshMobileCloud();
  $('stProg').textContent=L+' / '+DATA.length;
  $('barAll').style.width=(L/DATA.length*100)+'%';
  const nw=DATA.filter(d=>isWrong(d.i)).length;
  $('cWrong').textContent=nw+" words";$('btnWrong').disabled=!nw;
  $('cFav').textContent=S.fav.length+" words";$('btnFav').disabled=!S.fav.length;
  setSeg($('segDir'),S.set.dir);setSeg($('segLvl'),S.set.lvl);setSeg($('segLen'),S.set.len);
  const nDue=dueWords().length;
  $('cDue').textContent=nDue+" words due";$('btnReview').disabled=!nDue;
  $('hStreak').textContent=streak();$('hToday').textContent=daily(today()).answers;$('hDue').textContent=nDue;
  const last7=Array.from({length:7},(_,i)=>dayKeyOffset(i-6));
  const mx=Math.max(1,...last7.map(day=>daily(day).answers));
  $('historyPreview').innerHTML=last7.map(day=>{const count=daily(day).answers;const dt=Number(day.slice(-2));
    return `<div class="hbar-wrap" title="${day}: ${count} questions"><div class="hbar"><i style="height:${count?Math.max(12,count/mx*100):0}%"></i></div><span>${dt}</span></div>`;}).join('');
  if(typeof renderDailyHome==='function')renderDailyHome();
  $('topics').innerHTML=TOPICS.map((t,k)=>{const ws=DATA.filter(d=>d.c===t);const l=ws.filter(d=>learned(d.i)).length;
    return `<button class="topic${l===ws.length?' done':''}" data-t="${k}"><span class="n">${esc(t)}</span><span class="tr">${esc(TOPIC_TR[t]||'')}</span>
    <div class="bar"><i style="width:${l/ws.length*100}%"></i></div><span class="meta num"><span>${l}/${ws.length}</span><span>${ws.filter(d=>isWrong(d.i)).length?ws.filter(d=>isWrong(d.i)).length+" incorrect":''}</span></span></button>`;}).join('');
}
$('topics').addEventListener('click',e=>{const b=e.target.closest('.topic');if(!b)return;const t=TOPICS[+b.dataset.t];
  start(DATA.filter(d=>d.c===t),{title:t,len:S.set.len,prio:true,dir:S.set.dir});});
$('btnQuick').onclick=()=>{let pool=DATA.filter(d=>S.set.lvl==='all'||d.l===S.set.lvl);start(pool,{title:"Quick duel",len:S.set.len,prio:true,dir:S.set.dir});};
$('btnWrong').onclick=()=>start(DATA.filter(d=>isWrong(d.i)),{title:"My mistakes",len:20,dir:S.set.dir});
$('btnFav').onclick=()=>start(DATA.filter(d=>S.fav.includes(d.i)),{title:"Favourites",len:20,dir:S.set.dir});
$('btnDict').onclick=()=>{show('dict');renderDict();};
$('btnSet').onclick=()=>{show('settings');renderSettings();};
$('btnReview').onclick=()=>reviewNow();
$('btnProgress').onclick=$('btnHistory').onclick=()=>{show('progress');renderProgress();};


$('wdMobileHistory').onclick=()=>{show('progress');renderProgress();};
$('wdMobileCloudSettings').onclick=()=>{show('settings');renderSettings();$('cloudConnect').scrollIntoView({block:'center'});};
