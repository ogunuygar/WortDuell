// Generated from js/source/ by tools/build.py. Do not edit directly.
loadWortDuellData().then(function(content){
"use strict";
const DATA = content.vocabulary;
const TOPIC_TR = content.TOPIC_TR;
const TOPICS = [...new Set(DATA.map(d=>d.c))];
DATA.forEach((d,i)=>{d.i=i; const m=d.w.match(/^(der|die|das)\s+(.+)$/); d.art=m?m[1]:''; d.bare=m?m[2]:d.w;});


// Level choices come from the content catalog, not from hard-coded A1/A2 lists.
const vocabularyLevels = content.availableLevels.vocabulary;
const allLevelLabel = levels => levels.join(' + ') || 'All';
const levelChoice = (value, levels) => levels.includes(value) ? value : 'all';
function setLevelOptions(select, levels, allLabel = 'All levels', label = lv => lv) {
  const previous = select.value;
  select.replaceChildren(new Option(allLabel, 'all'), ...levels.map(lv => new Option(label(lv), lv)));
  select.value = levelChoice(previous, levels);
}
function addLevelFilter(container, id, levels, onChange) {
  const select = document.createElement('select');
  select.id = id; select.className = 'wd-simple-select';
  select.setAttribute('aria-label', 'Level');
  setLevelOptions(select, levels);
  select.addEventListener('change', onChange);
  container.appendChild(select);
  return select;
}

/* ---------- storage ---------- */
const KEY='wortduell1000.v3'; // Clean-start release; previous data is not deleted.
const DAY=86400000, INTERVALS=[1,3,7,14,30];
const fresh=()=>({v:4,w:{},fav:[],pts:0,best:0,ans:0,ok:0,days:{},dirStats:{},modeStats:{},topicStats:{},dailyPlan:null,set:{lvl:'all',len:10,dir:'mix',auto:true,autoQuestion:false,rate:0.9,time:0}});
const localDate=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const today=()=>localDate();
const dayKeyOffset=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return localDate(d);};
const blankDay=()=>({answers:0,correct:0,points:0,learned:0,review:0});
let S=fresh(),storageOK=true;
// Reject dangerous keys at every depth before importing/replaying state.
function validateStateTree(value, depth=0){
  if(depth>40)throw new Error('Progress data is too deeply nested');
  if(value===null||typeof value!=='object'){
    if(typeof value==='number'&&!Number.isFinite(value))throw new Error('Invalid progress number');
    return;
  }
  for(const key of Object.keys(value)){
    if(['__proto__','constructor','prototype'].includes(key))throw new Error('Unsafe progress key');
    validateStateTree(value[key],depth+1);
  }
}
function migrate(o){
  validateStateTree(o);
  if(!o||typeof o!=='object'||!o.w||typeof o.w!=='object'||Array.isArray(o.w))throw new Error('Invalid progress');
  const m=Object.assign(fresh(),o);
  m.set=Object.assign(fresh().set,o.set||{});
  if(!['mix','de2tr','tr2de'].includes(m.set.dir))m.set.dir='mix';
  m.w={...o.w};m.fav=Array.isArray(o.fav)?o.fav.filter(i=>Number.isInteger(i)&&i>=0&&i<DATA.length):[];
  m.days={};
  for(const [day,val] of Object.entries(o.days||{})){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day))continue;
    m.days[day]=typeof val==='number'?{...blankDay(),answers:val,legacy:true}:
      Object.assign(blankDay(),val&&typeof val==='object'?val:{});
  }
  for(const key of ['dirStats','modeStats','topicStats']){
    if(!m[key]||typeof m[key]!=='object'||Array.isArray(m[key]))m[key]={};
  }
  if(!m.dailyPlan||typeof m.dailyPlan!=='object'||!Array.isArray(m.dailyPlan.items))m.dailyPlan=null;
  // Existing v1–v3 progress proves recognition only; newer stages start unconfirmed.
  if(Number(o.v||0)<4)for(const r of Object.values(m.w)){if(r&&typeof r==='object'&&!r.mastery)r.mastery={recognition:(r.b||0)>=2,recognitionHits:(r.b||0)>=2?2:0,writing:false,sentence:false};}
  m.v=4;
  return m;
}
try{const raw=localStorage.getItem(KEY);if(raw)S=migrate(JSON.parse(raw));}catch(e){storageOK=false;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));storageOK=true;}catch(e){storageOK=false;}}
const rec=i=>S.w[i]||(S.w[i]={r:0,x:0,b:0});
// Three independent proofs of mastery. Older progress is kept as recognition,
// never silently upgraded to writing/sentence ability.
function masteryFor(i){
 const r=S.w[i];if(!r)return {recognition:false,writing:false,sentence:false,level:0};
 const m=r.mastery||{};
 const recognition=Boolean(m.recognition);
 const writing=Boolean(m.writing);
 const sentence=Boolean(m.sentence);
 return {recognition,writing,sentence,level:recognition?(writing?(sentence?3:2):1):0};
}
const learned=i=>masteryFor(i).level===3;
function markMastery(i,kind,correct=true){
 if(!correct||!Number.isInteger(i)||i<0||i>=DATA.length)return;
 const r=rec(i),m=r.mastery||(r.mastery={recognition:false,recognitionHits:0,writing:false,sentence:false});
 if(kind==='recognition'){
  m.recognitionHits=Math.min(2,(m.recognitionHits||0)+1);
  if(m.recognitionHits>=2)m.recognition=true;
 }
 if(kind==='writing')m.writing=true;
 if(kind==='sentence')m.sentence=true;
 if(learned(i)&&!r.learnedOn){r.learnedOn=today();const day=S.days[today()]||(S.days[today()]=blankDay());day.learned=(day.learned||0)+1;}
}
const masteryCounts=()=>DATA.reduce((acc,d)=>{const m=masteryFor(d.i);if(m.recognition)acc.recognition++;if(m.writing)acc.writing++;if(m.sentence)acc.sentence++;if(m.level===3)acc.complete++;return acc;},{recognition:0,writing:0,sentence:0,complete:0});
const masteryBadge=i=>{const m=masteryFor(i);return `<div class="wd-skill-strip" aria-label="Word becerileri"><span class="${m.recognition?'is-done':''}">${m.recognition?'✓':'○'} I recognise it</span><span class="${m.writing?'is-done':''}">${m.writing?'✓':'○'} I can write it</span><span class="${m.sentence?'is-done':''}">${m.sentence?'✓':'○'} I can build a sentence</span></div>`;};
const isWrong=i=>!!(S.w[i]&&S.w[i].x>0&&S.w[i].b<2);
const due=i=>{const r=S.w[i];return !!r&&((r.r+r.x>0&&(!r.next||r.next<=Date.now()))||Object.values(r.directions||{}).some(m=>(m.r+m.x)>0&&m.next<=Date.now()));};
// Read-only reporting: the legacy main counter excludes Academy, verb-choice and dedicated builder.
const countAnswers=x=>Number.isFinite(x)&&x>=0?Math.floor(x):0;
function questionTotals(state){
 const extra=[...Object.values(state.grammar?.byLesson||{}),state.grammar?.verb];
 return extra.reduce((t,x)=>({n:t.n+countAnswers(x?.n),ok:t.ok+countAnswers(x?.ok)}),{n:countAnswers(state.ans),ok:countAnswers(state.ok)});
}
function questionBreakdown(state){
 const legacy=state.modeStats||{},hub=state.study?.modes||{},lessons=state.grammar?.byLesson||{};
 const sum=(...xs)=>xs.reduce((a,x)=>({n:a.n+countAnswers(x?.n),ok:a.ok+countAnswers(x?.ok)}),{n:0,ok:0});
 const rows=[
  ['Vocabulary · DE → EN',sum(legacy.de2tr,legacy.choice,hub['Word · First meaning'])],
  ['Vocabulary · EN → DE',sum(legacy.tr2de)],
  ['Mini exercise · 4 choices',sum(hub['Word · 4 choices'])],
  ['Writing words',sum(legacy.type)],
  ['Fill in the gap',sum(legacy.gap,hub.Gap,hub['Word · Fill in the blank'])],
  ['Sentence building',sum(legacy.sentence,hub['Word · Sentence building'],lessons.builder)],
  ['Articles & plurals',sum(legacy.art,legacy.article,legacy.plural)],
  ['Grammar Academy',sum(...Object.entries(lessons).filter(([k])=>k!=='builder').map(([,v])=>v))],
  ['Verb forms & writing',sum(state.grammar?.verb,hub['Verb writing'])],
  ['Listening',sum(legacy.listen)],
  ['Reading · mini stories',sum(hub.Story)],
  ['Conversation practice',sum(legacy.dialogue,hub['Dialogue Pro'])],
  ['Spoken repetition (self-rated)',sum(hub['Spoken repetition'])]
 ];
 const total=questionTotals(state),known=sum(...rows.map(([,v])=>v));
 // Historical backups may have attempts without mode information. Do not invent categories.
 if(total.n>known.n)rows.push(['Other / older unclassified questions',{n:total.n-known.n,ok:Math.max(0,Math.min(total.n-known.n,total.ok-known.ok))}]);
 return {total,rows,mismatch:known.n>total.n||known.ok>total.ok||total.ok>total.n};
}
function daily(key){
 const d=S.days[key]||blankDay(),g=S.grammar?.day?.[key];
 return {...d,answers:countAnswers(d.answers)+countAnswers(g?.n),correct:countAnswers(d.correct)+countAnswers(g?.ok)};
}
const dueWords=()=>DATA.filter(d=>due(d.i));
function streak(){let n=0,j=0;if(!daily(today()).answers)j=-1;while(daily(dayKeyOffset(j)).answers>0){n++;j--;}return n;}
function recordAnswer(d,ok,points,wasLearned,wasReview){
  const dt=today(),obj=S.days[dt]||(S.days[dt]=blankDay());
  obj.answers++;if(ok)obj.correct++;obj.points+=points;
  if(wasReview)obj.review++;
  // New full-mastery event is recorded by markMastery(), once per word.
  save();
}


/* ---------- helpers ---------- */
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
const SPK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>';
function wordHTML(d){return d.art?`<span class="art ${d.art}">${d.art}</span> ${esc(d.bare)}`:esc(d.w);}
function toast(t){const el=$('toast');el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,1800);}


/* ---------- speech ---------- */
let voices={de:null,tr:null};
function pickVoice(){
  if(!('speechSynthesis' in window)){$('sVoice').textContent="This browser does not support text-to-speech.";return;}
  try{const vs=speechSynthesis.getVoices();
    const chosen=(lang)=>vs.find(v=>v.lang.toLowerCase()===lang.toLowerCase()&&/Google|Microsoft|Anna|Helena|Emel|Yelda|Tolga/i.test(v.name))||vs.find(v=>v.lang.toLowerCase()===lang.toLowerCase())||vs.find(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2)))||null;
    voices.de=chosen('de-DE');voices.tr=chosen("en-GB");
    $('sVoice').textContent="German: "+(voices.de?.name||"browser default")+" · English: "+(voices.tr?.name||"browser default")+". Install a German or English voice on your device if needed.";
  }catch(e){}
}
if('speechSynthesis' in window){pickVoice();try{speechSynthesis.onvoiceschanged=pickVoice;}catch(e){}}
function speak(t,lang='de-DE'){
  if(!('speechSynthesis' in window)){toast("This browser does not support reading aloud.");return;}
  if(!t)return;
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang=lang;
    const v=lang.startsWith("en")?voices.tr:voices.de;if(v)u.voice=v;
    u.rate=Number(S.set.rate)||0.9;u.onerror=ev=>{if(ev.error!=='interrupted'&&ev.error!=='canceled')toast("Audio could not play. Check your device voices.");};
    speechSynthesis.speak(u);
  }catch(e){toast("Audio could not start.");}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-say]');if(b){e.preventDefault();e.stopPropagation();speak(b.getAttribute('data-say'),b.getAttribute('data-lang')||'de-DE');}});
const say=(t,label,lang='de-DE')=>`<button type="button" class="speak" data-say="${esc(t)}" data-lang="${esc(lang)}" title="${esc(label||"Read aloud")}" aria-label="${esc(label||"Read aloud")}">${SPK}</button>`;


/* ---------- screens ---------- */
const SCREENS=['home','quiz','result','dict','settings','progress','practice','practiceResult','analytics','academy','lesson','grammarPlay','grammarDone','verbs','verbPlay','cases','builder','builderEnd','hub','hubStories','hubStory','hubTalks','hubTalk','hubVerb','hubCloze','hubCards','hubRepeat','hubPersonal','hubMistakes','hubGuide'];
function show(id){SCREENS.forEach(s=>$(s).hidden=s!==id);window.scrollTo(0,0);if(id==='home')renderHome();}
document.querySelectorAll('[data-home]').forEach(b=>b.onclick=()=>show('home'));


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

/* ---------- quiz engine ---------- */
let G=null;
function pickItems(pool,len,prio){
  if(!prio)return shuffle(pool.slice()).slice(0,Math.min(len,pool.length));
  // Old learned words are respected; new mode-specific tracking begins only when answered.
  return adaptBatch(pool,len,d=>adaptFamilyKey(d));
}
function gapRegex(d){const w=d.bare.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('(^|[^\\p{L}])('+w+')(?=[^\\p{L}]|$)','u');}
function qTypes(d,dir){
  if(dir==='de2tr')return ['de2tr'];
  if(dir==='tr2de')return ['tr2de'];
  const t=['de2tr','de2tr','tr2de','tr2de'];
  if(d.art)t.push('art');
  if(d.k!=='Ausdruck'&&d.bare.split(' ').length<=2&&gapRegex(d).test(d.e1))t.push('gap');
  return t;
}
function distract(d,field,n){
  const val=x=>field==='t'?x.t:(field==='bare'?x.bare:x.w);
  const used=new Set([val(d).toLowerCase(),d.t.toLowerCase()]);const out=[];
  const tiers=[DATA.filter(x=>x.c===d.c&&x.k===d.k),DATA.filter(x=>x.k===d.k),DATA.filter(x=>x.c===d.c),DATA];
  for(const tier of tiers){for(const x of shuffle(tier.slice())){if(out.length>=n)break;const v=val(x);if(x.i===d.i||used.has(v.toLowerCase())||used.has(x.t.toLowerCase()))continue;used.add(v.toLowerCase());used.add(x.t.toLowerCase());out.push(x);}if(out.length>=n)break;}
  return out;
}
function buildQ(d,dir){
  const types=qTypes(d,dir);const type=types[Math.random()*types.length|0];
  if(type==='art'){return{d,type,opts:['der','die','das'].map(a=>({label:a,ok:a===d.art,html:`<span>${a}</span>`}))};}
  const field=type==='de2tr'?'t':(type==='gap'?'bare':'w');
  const ds=distract(d,field,3);
  const lab=x=>field==='t'?x.t:(field==='bare'?x.bare:x.w);
  const opts=shuffle([d,...ds]).map(x=>({label:lab(x),ok:x.i===d.i,html:esc(lab(x))}));
  return{d,type,opts};
}
function start(pool,opt){
  if(!pool.length){toast("No words in this list");return;}
  const items=pickItems(pool,opt.len||10,opt.prio);
  const options={...opt,dir:opt.dir||S.set.dir};
  G={title:options.title,pool,opt:options,qs:items.map(d=>buildQ(d,options.dir)),k:0,score:0,streak:0,res:[]};
  show('quiz');renderQ();
}
let tmr=null,t0=0;
function renderQ(){
  const q=G.qs[G.k],d=q.d,n=G.qs.length;
  $('qProg').style.width=(G.k/n*100)+'%';$('qCount').textContent=(G.k+1)+'/'+n;$('qTopic').textContent=G.title===d.c?(TOPIC_TR[d.c]||d.c):d.c;$('qScore').textContent=G.score;
  $('qDirection').textContent=q.type==='de2tr'?"🇩🇪 German → 🇬🇧 English":q.type==='tr2de'?"🇬🇧 English → 🇩🇪 German":q.type==='art'?"Article practice":"Sentence completion";
  const P=$('prompt');
  if(q.type==='de2tr')P.innerHTML=`<span class="qtype">What does it mean in English?</span><div class="row" style="justify-content:center"><span class="big">${wordHTML(d)}</span>${say(d.w)}</div>`;
  else if(q.type==='tr2de')P.innerHTML=`<span class="qtype">How do you say it in German?</span><div class="row" style="justify-content:center"><span class="big">${esc(d.t)}</span>${say(d.t,"Listen in English","en-GB")}</div>`;
  else if(q.type==='art')P.innerHTML=`<span class="qtype">Which article fits?</span><span class="big">___ ${esc(d.bare)}</span><span class="muted">${esc(d.t)}</span>`;
  else{const s=d.e1.replace(gapRegex(d),(m,a)=>a+'\u0000');const parts=s.split('\u0000');
    P.innerHTML=`<span class="qtype">Fill in the blank</span><span class="sent">${esc(parts[0])}<span class="gap"></span>${esc(parts.slice(1).join(''))}</span><span class="muted" style="font-size:14px">${esc(d.e1t)}</span>`;}
  const T=$('tiles');T.style.gridTemplateColumns=q.opts.length===3?'1fr 1fr 1fr':'';
  T.innerHTML=q.opts.map((o,k)=>`<button class="tile s${k+1}" data-k="${k}">${o.html}</button>`).join('');
  $('reveal').hidden=true;$('reveal').innerHTML='';
  G.locked=false;
  const lim=S.set.time;const bar=$('qTimer');clearInterval(tmr);bar.parentElement.hidden=!lim;
  t0=performance.now();bar.style.width='100%';
  if(lim){tmr=setInterval(()=>{const r=1-(performance.now()-t0)/(lim*1000);bar.style.width=Math.max(0,r*100)+'%';if(r<=0){clearInterval(tmr);answer(-1);}},100);}
  if(S.set.autoQuestion){setTimeout(()=>{if(G&&!G.locked&&G.qs[G.k]===q){if(q.type==='de2tr')speak(d.w);else if(q.type==='tr2de')speak(d.t,"en-GB");}},50);}
}
$('tiles').addEventListener('click',e=>{const b=e.target.closest('.tile');if(b)answer(+b.dataset.k);});
document.addEventListener('keydown',e=>{if($('quiz').hidden)return;if(!G.locked&&/^[1-4]$/.test(e.key)&&+e.key<=G.qs[G.k].opts.length)answer(+e.key-1);else if(G.locked&&(e.key==='Enter'||e.key===' ')){e.preventDefault();next();}});
function answer(k){
  if(G.locked)return;G.locked=true;clearInterval(tmr);
  const q=G.qs[G.k],d=q.d,ok=k>=0&&q.opts[k].ok;
  const lim=S.set.time;const frac=lim?Math.max(0,1-(performance.now()-t0)/(lim*1000)):1;
  let gained=0;
  if(ok){G.streak++;gained=Math.round(500+500*frac)+100*Math.min(G.streak-1,5);}else G.streak=0;
  G.score+=gained;
  const wasLearned=learned(d.i),wasReview=due(d.i);
  const r=rec(d.i);if(ok){r.r++;r.b=Math.min(5,r.b+1);r.next=Date.now()+INTERVALS[r.b-1]*DAY;}
  else{r.x++;r.b=0;r.next=Date.now();}
  r.t=Date.now();
  markMastery(d.i,'recognition',ok);
  S.ans++;if(ok)S.ok++;S.pts+=gained;
  recordAnswer(d,ok,gained,wasLearned,wasReview);
  recordExtended(d,ok,gained,q.type,q.type==='de2tr'||q.type==='tr2de'?q.type:null);
  adaptTrack(adaptWordKey(d,q.type),ok,d.c,adaptFamilyKey(d));
  if(!ok&&G.k<G.qs.length-3){adaptInSession(G.qs,adaptFamilyKey(d),{...buildQ(d,G.opt.dir)},3);}
  G.res.push({d,ok});
  [...$('tiles').children].forEach((b,j)=>{const o=q.opts[j];if(o.ok){b.classList.add('right');b.insertAdjacentHTML('beforeend','<span class="mark">✓</span>');}else if(j===k){b.classList.add('wrong');b.insertAdjacentHTML('beforeend','<span class="mark">✗</span>');}else b.classList.add('dim');b.disabled=true;});
  const R=$('reveal');
  R.innerHTML=`<div class="verdict ${ok?'ok':'bad'}"><span>${ok?(G.streak>1?"Correct · "+G.streak+' seri':"Correct"):(k<0?"Time is up":"Incorrect")}</span><span class="pts num">${ok?'+'+gained:'+0'}</span></div>`+detailHTML(d)+
   `<button class="btn primary block" id="btnNext">${G.k+1<G.qs.length?"Continue":"See results"}</button>`;
  R.querySelector('#btnNext').insertAdjacentHTML('beforebegin',adaptNudge(adaptWordKey(d,q.type),ok,d.e1+' '+d.g));R.hidden=false;$('qScore').textContent=G.score;
  $('btnNext').onclick=next;
  if(S.set.auto)speak(d.w);
  setTimeout(()=>{try{R.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){}},60);
}
function detailHTML(d){
  const fav=S.fav.includes(d.i);
  return `<div class="whead"><span class="w">${wordHTML(d)}</span>${say(d.w)}</div>
  ${masteryBadge(d.i)}<div class="chips"><span class="chip lv">${esc(d.l)}</span><span class="chip">${esc(d.k)}</span><span class="chip">${esc(d.c)}</span></div>
  <div class="row" style="justify-content:space-between"><div class="mean">${esc(d.t)}</div>${say(d.t,"Listen in English","en-GB")}</div>${d.f&&d.f!=='–'?`<div class="forms">${esc(d.f)}</div>`:''}
  <div class="ex"><div class="txt"><span class="lv">A1</span><div class="de">${esc(d.e1)}</div><div class="trs">${esc(d.e1t)}</div></div><div class="col" style="display:flex;gap:5px">${say(d.e1,"Read the German sentence")}${say(d.e1t,"Read the English sentence","en-GB")}</div></div>
  ${d.e2?`<div class="ex"><div class="txt"><span class="lv">A2</span><div class="de">${esc(d.e2)}</div><div class="trs">${esc(d.e2t)}</div></div><div class="col" style="display:flex;gap:5px">${say(d.e2,"Read the German sentence")}${say(d.e2t,"Read the English sentence","en-GB")}</div></div>`:''}
  <div class="gram"><b>Grammar</b>${esc(d.g)}</div>
  <div><button class="star" data-fav="${d.i}" aria-pressed="${fav}">${fav?"★ In favourites":"☆ Add to favourites"}</button></div>`;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-fav]');if(!b)return;e.preventDefault();e.stopPropagation();const i=+b.dataset.fav;const p=S.fav.indexOf(i);
  if(p>=0)S.fav.splice(p,1);else S.fav.push(i);save();const on=p<0;b.setAttribute('aria-pressed',String(on));b.textContent=on?"★ In favourites":"☆ Add to favourites";});
function next(){if(!G||!G.locked)return;G.k++;if(G.k<G.qs.length){renderQ();window.scrollTo(0,0);}else finish();}
$('btnQuit').onclick=()=>{clearInterval(tmr);try{speechSynthesis.cancel();}catch(e){}if(G&&G.res.length)finish();else show('home');};
function finish(){
  clearInterval(tmr);const n=G.res.length,c=G.res.filter(r=>r.ok).length;
  S.best=Math.max(S.best,G.score);save();
  show('result');
  $('rScore').textContent=G.score;$('rLine').textContent=`${c} / ${n} correct`;
  const nl=G.res.filter(r=>learned(r.d.i)).length;
  $('rChips').innerHTML=`<span class="chip">${Math.round(c/n*100)}% accuracy</span><span class="chip">${nl} words learned</span>${G.score>=S.best&&G.score>0?"<span class=\"chip lv\">Best score</span>":''}`;
  $('btnRetryWrong').disabled=!G.res.some(r=>!r.ok);
  $('rList').innerHTML=G.res.map(r=>`<div class="rrow"><span class="ic ${r.ok?'ok':'bad'}">${r.ok?'✓':'✗'}</span><div class="t"><b>${wordHTML(r.d)}</b><span>${esc(r.d.t)}</span></div>${say(r.d.w)}</div>`).join('');
}
$('btnAgain').onclick=()=>start(G.pool,G.opt);
$('btnRetryWrong').onclick=()=>{const w=G.res.filter(r=>!r.ok).map(r=>r.d);start(w,{title:"Review mistakes",len:w.length,dir:G.opt.dir});};
$('btnHome').onclick=()=>show('home');


/* ---------- dictionary ---------- */
$('dTopic').innerHTML="<option value=\"\">All topics</option><option value=\"*fav\">Favourites</option><option value=\"*wrong\">My mistakes</option>"+TOPICS.map((t,k)=>`<option value="${k}">${esc(t)}</option>`).join('');
let dT=null;$('dSearch').addEventListener('input',()=>{clearTimeout(dT);dT=setTimeout(renderDict,150);});$('dTopic').onchange=renderDict;
const fold=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss').replace(/ı/g,'i');
function renderDict(){
  const q=fold($('dSearch').value.trim()),tv=$('dTopic').value;
  let L=DATA;
  if(tv==='*fav')L=L.filter(d=>S.fav.includes(d.i));else if(tv==='*wrong')L=L.filter(d=>isWrong(d.i));else if(tv!=='')L=L.filter(d=>d.c===TOPICS[+tv]);
  if(q)L=L.filter(d=>fold(d.w+' '+d.t).includes(q));
  $('dCount').textContent=L.length+" words";
  const show=L.slice(0,150);
  $('dList').innerHTML=show.map(d=>`<details class="drow" data-i="${d.i}"><summary><span class="dot ${learned(d.i)?'l':(isWrong(d.i)?'w':'')}"></span><div class="t"><b>${wordHTML(d)}</b><span>${esc(d.t)}</span></div>${say(d.w,"Listen in German")}${say(d.t,"Listen in English","en-GB")}</summary><div class="body"></div></details>`).join('')+(L.length>150?`<p class="muted" style="text-align:center;font-size:14px">Showing the first 150 matches. Narrow your search.</p>`:'');
}
$('dList').addEventListener('toggle',e=>{const el=e.target;if(el.open){const b=el.querySelector('.body');if(!b.innerHTML)b.innerHTML=detailHTML(DATA[+el.dataset.i]);}},true);


/* ---------- settings ---------- */
function exportCode(){try{return btoa(unescape(encodeURIComponent(JSON.stringify(S))));}catch(e){return '';}}
function renderSettings(){$('sAuto').checked=S.set.auto;$('sAutoQuestion').checked=S.set.autoQuestion;setSeg($('segRate'),S.set.rate);setSeg($('segTime'),S.set.time);$('sExport').value=exportCode();$('sReset').textContent="Reset All Progress";
  $('sStorage').textContent=storageOK?"Progress is saved in this browser. Connect Google Drive to sync between devices, or use a backup.":"⚠️ Local storage is unavailable. Download a backup.";
  $('sStorage').classList.toggle('warn',!storageOK);pickVoice();}
$('sAuto').onchange=e=>{S.set.auto=e.target.checked;save();};
$('sAutoQuestion').onchange=e=>{S.set.autoQuestion=e.target.checked;save();};
bindSeg($('segRate'),v=>{S.set.rate=+v;save();});
bindSeg($('segTime'),v=>{S.set.time=+v;save();});
$('sTest').onclick=()=>speak('Guten Tag! Ich lerne jeden Tag Deutsch.');
$('sTestTR').onclick=()=>speak("Hello! I learn German every day.","en-GB");
$('sCopy').onclick=()=>{const t=$('sExport');const v=t.value;const fb=()=>{t.focus();t.select();toast("Code selected. Copy it now.");};
  try{navigator.clipboard.writeText(v).then(()=>toast("Copied"),fb);}catch(e){fb();}};
function importProgress(raw){
  const source=raw.trim();
  let obj;
  try{obj=JSON.parse(source);}catch(e){obj=JSON.parse(decodeURIComponent(escape(atob(source))));}
  S=migrate(obj);save();renderSettings();toast("Progress and history restored");
}
$('sLoad').onclick=()=>{try{importProgress($('sImport').value);$('sImport').value='';}catch(e){toast("Invalid backup code");}};
$('sFile').onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{importProgress(await file.text());}catch(err){toast("Invalid or unreadable file");}
  e.target.value='';
};
function downloadBackup(){
  const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download="WortDuell-Backup-"+today()+'.json';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast("Backup downloaded");
}
$('sDownload').onclick=downloadBackup;
$('pBackup').onclick=downloadBackup;
function resetLocalProgress(){
  if(!confirm('Reset ALL learning progress on this device? Your settings will be kept. This cannot be undone without a backup.'))return;
  const keep=S.set;S=fresh();S.set=keep;save();renderSettings();toast(storageOK?'All progress reset':'Reset could not be saved');
}
// Safe fallback if the cloud module fails to initialize.
$('sReset').onclick=()=>{try{if(localStorage.getItem('wortduell.cloud.v3.406290812417')){toast('Cloud sync is unavailable. Reload before resetting.');return;}}catch(e){toast('Local storage is unavailable.');return;}resetLocalProgress();};

/* ---------- spaced review and multi-day memory ---------- */
function reviewNow(){const words=dueWords();if(!words.length){toast("No reviews due yet");return;}
  start(words,{title:"Daily review",len:Math.min(20,words.length),prio:true,dir:S.set.dir});
}
let progressDays=7,selectedDay=today();
function daySummary(key){const day=daily(key),accuracy=day.legacy?"Earlier record":(day.answers?Math.round(day.correct/day.answers*100)+'%':'–');
  $('dayDetail').innerHTML=`<div><strong>${esc(key)}</strong><span>Selected day</span></div><div><strong>${day.answers}</strong><span>Questions answered</span></div><div><strong>${esc(accuracy)}</strong><span>Accuracy</span></div><div><strong>${day.learned||0}</strong><span>Newly learned</span></div><div><strong>${day.points||0}</strong><span>Points earned</span></div><div><strong>${day.review||0}</strong><span>Review questions</span></div>`;
}
function renderProgress(){
  $('pStreak').textContent=streak();$('pTotal').textContent=questionTotals(S).n;
  renderQuestionBreakdown($('wdQuestionBreakdown'));renderRoadmap();
  const n=DATA.filter(d=>learned(d.i)).length;
  $('pLearn').textContent=n;$('pMasterText').textContent=`${n} / ${DATA.length} words completed in all three skills`;
  $('pMasterBar').style.width=(100*n/DATA.length)+'%';
  const m=masteryCounts();$('wdSkillProgress').innerHTML=`<h3>Three stages of vocabulary learning</h3><p class="notice">Recognise the meaning twice, write the word or complete a gap, then build a German sentence.</p>${[['recognition',"I recognise it"],['writing',"I can write it"],['sentence',"I can build a sentence"]].map(([k,label])=>`<div class="wd-stage-line"><b>${label}</b><span>${m[k]} / ${DATA.length}</span><div class="bar"><i style="width:${100*m[k]/DATA.length}%"></i></div></div>`).join('')}`;
  const nd=dueWords().length;$('pDueText').textContent=`${nd} words due for review`;
  $('pReview').disabled=!nd;$('pWrong').disabled=!DATA.some(d=>isWrong(d.i));
  setSeg($('segDays'),progressDays);
  const range=Array.from({length:progressDays},(_,i)=>dayKeyOffset(i-progressDays+1));
  if(!range.includes(selectedDay))selectedDay=today();
  $('activityGrid').innerHTML=range.map(day=>{const n=daily(day).answers;
    return `<button class="activity-day ${n?'on':''} ${n>=20?'high':''} ${day===today()?'now':''}" data-day="${day}" aria-label="${day} ${n} questions" aria-pressed="${day===selectedDay}"><small>${day.slice(5,7)}</small><span class="pico"></span><b>${day.slice(-2)}</b><small>${n}</small></button>`;
  }).join('');
  daySummary(selectedDay);
}
bindSeg($('segDays'),v=>{progressDays=+v;renderProgress();});
$('activityGrid').addEventListener('click',e=>{const b=e.target.closest('[data-day]');if(!b)return;selectedDay=b.dataset.day;
  $('activityGrid').querySelectorAll('[data-day]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  daySummary(selectedDay);
});
$('pReview').onclick=reviewNow;
$('pWrong').onclick=()=>start(DATA.filter(d=>isWrong(d.i)),{title:"Review mistakes",len:20,dir:S.set.dir});


/* ---------- Read-only learning roadmap (existing adaptive evidence) ---------- */
function questionCoverage(keys,skills,now=Date.now(),fallbackAttempts=0){
 const unique=[...new Set(keys)],records=unique.map(k=>skills[k]);
 const seen=records.filter(x=>x?.n>0).length;
 const passed=records.filter(x=>x?.n>0&&x.streak>0).length;
 const due=records.filter(x=>x?.n>0&&x.streak>0&&x.due>0&&x.due<=now).length;
 return {total:unique.length,seen,passed,due,started:seen>0||fallbackAttempts>0};
}
function roadmapStatus(c){
 if(c.total&&c.passed===c.total)return c.due?'Review due':'Completed';
 if(!c.started)return 'Not started';
 if(c.total&&c.seen===c.total)return 'Needs review';
 return 'In progress';
}
function renderQuestionBreakdown(root){
 const {total,rows,mismatch}=questionBreakdown(S);
 const dir=S.dirStats||{};
 root.innerHTML=`<div class="wd-report-total"><strong>${total.n}</strong><span>total answered attempts · ${total.n?Math.round(total.ok/total.n*100)+'% accuracy':'no answers yet'}</span></div>
 <div class="wd-report-rows">${rows.map(([label,x])=>`<div class="wd-report-row"><span>${esc(label)}</span><b class="num">${x.n}</b></div>`).join('')}</div>
 <p class="notice">Every checked answer counts once, including retries, mistakes and mini exercises. Listening to audio, reading examples and flipping cards do not count. Spoken repetition is self-rated.</p>
 <p class="notice">Direction statistics: DE → EN ${countAnswers(dir.de2tr?.n)} · EN → DE ${countAnswers(dir.tr2de?.n)}. These overlap with the categories above and are not added again.</p>${mismatch?'<p class="notice">Some older counters are inconsistent. The stored total is kept; categories may not reconcile.</p>':''}`;
}
let roadmapLevel='all';
function renderRoadmap(){
 const root=$('wdRoadmap'),skills=S.adaptive?.skills||{},now=Date.now();
 const selected=x=>roadmapLevel==='all'||x===roadmapLevel;
 const grammar=GRAMMAR_LESSONS.filter(l=>selected(l.lv)).map(l=>({name:l.title,level:l.lv,kind:'grammar',id:l.id,...questionCoverage(l.qs.map(q=>'grammar:'+l.id+':'+q[0]),skills,now,S.grammar?.byLesson?.[l.id]?.n||0)}));
 const stories=HUB_DATA.stories.filter(l=>selected(l.level)).map(l=>({name:l.title,level:l.level,kind:'story',id:l.id,...questionCoverage(l.qs.map((_,i)=>'hub:Story:'+l.id+':'+i),skills,now,S.study?.stories?.[l.id]?.runs||0)}));
 const talks=HUB_DATA.dialogues.filter(l=>selected(l.level)).map(l=>({name:l.title,level:l.level,kind:'talk',id:l.id,...questionCoverage(l.turns.map((_,i)=>'hub:Dialogue Pro:'+l.id+':'+i),skills,now,S.study?.conversations?.[l.id]?.runs||0)}));
 const vocab=[];
 for(const level of vocabularyLevels.filter(selected))for(const topic of TOPICS){
  const words=DATA.filter(d=>d.l===level&&d.c===topic);if(!words.length)continue;
  const passed=words.filter(d=>learned(d.i)).length,seen=words.filter(d=>{const r=S.w[d.i];return r&&(r.r||r.x||r.mastery)||Boolean(skills['hub:Word · First meaning:'+d.i+':guess']?.n);}).length;
  vocab.push({name:TOPIC_TR[topic]||topic,level,kind:'vocab',id:topic,total:words.length,seen:Math.max(seen,passed),passed,due:words.filter(d=>learned(d.i)&&due(d.i)).length,started:seen>0||passed>0});
 }
 const groups=[['Grammar topics',grammar],['Vocabulary topics',vocab],['Mini stories',stories],['Conversations',talks]];
 const all=groups.flatMap(([,items])=>items),complete=all.filter(x=>x.total&&x.passed===x.total).length;
 const row=x=>{const status=roadmapStatus(x),percent=x.total?100*x.passed/x.total:0;return `<button type="button" class="wd-roadmap-row" data-road-kind="${x.kind}" data-road-id="${esc(x.id)}" data-road-level="${esc(x.level)}"><div class="wd-roadmap-line"><b>${esc(x.name)}</b><span class="wd-road-status" data-state="${status}">${status}</span></div><div class="wd-roadmap-line"><small>${esc(x.level)} · ${x.passed}/${x.total} ${x.kind==='vocab'?'words mastered':'questions correct'} · ${x.seen} tried</small><span aria-hidden="true">→</span></div><div class="bar"><i style="width:${percent}%"></i></div></button>`;};
 // Keep open groups when the history or level filter is refreshed.
 const previous=new Set([...root.querySelectorAll('details[open]')].map(e=>e.dataset.group));
 const first=!root.children.length;
 root.innerHTML=`<div class="wd-report-total"><strong>${complete}/${all.length}</strong><span>topics & activities completed · ${all.filter(x=>roadmapStatus(x)==='Review due').length} due for review</span></div>${groups.map(([label,items],i)=>`<details class="wd-roadmap-group" data-group="${i}" ${(previous.has(String(i))||(first&&i===0))?'open':''}><summary><b>${label}</b><span>${items.filter(x=>x.total&&x.passed===x.total).length}/${items.length}</span></summary>${items.map(row).join('')||'<p class="notice">No content at this level yet.</p>'}</details>`).join('')}`;
}
$('wdRoadLevel').addEventListener('change',e=>{roadmapLevel=e.target.value;renderRoadmap();});
$('wdRoadmap').addEventListener('click',e=>{
 const b=e.target.closest('[data-road-kind]');if(!b)return;
 const {roadKind:k,roadId:id,roadLevel:lv}=b.dataset;
 if(k==='grammar')openLesson(id);
 else if(k==='story')openStory(id);
 else if(k==='talk')openTalk(id);
 else if(k==='vocab')wdBeginLesson(DATA.filter(d=>d.l===lv&&d.c===id));
});

/* ---------- Pro learning engine: all data stays under legacy storage key ---------- */
const MODE_LABELS={choice:"Word recognition",type:"Writing",listen:"Listening",sentence:"Sentence building",article:"Article",plural:"Plural",dialogue:"Dialogue",art:"Article",gap:"Fill in the blank",de2tr:"DE → EN",tr2de:"EN → DE"};
function tally(obj,key,ok,points){const x=obj[key]||(obj[key]={n:0,ok:0,points:0});x.n++;if(ok)x.ok++;x.points+=points||0;}
function recordExtended(d,ok,points,mode,dir){
  tally(S.modeStats,mode,ok,points);
  if(d)tally(S.topicStats,d.c,ok,points);
  if(dir&&d){
    tally(S.dirStats,dir,ok,points);
    const r=rec(d.i),v=r.directions||(r.directions={});
    const m=v[dir]||(v[dir]={r:0,x:0,b:0,next:0});
    if(ok){m.r++;m.b=Math.min(5,m.b+1);m.next=Date.now()+INTERVALS[m.b-1]*DAY;}
    else{m.x++;m.b=0;m.next=Date.now();}
  }
  const day=S.days[today()]||(S.days[today()]=blankDay());
  if(!day.modes)day.modes={};
  day.modes[mode]=(day.modes[mode]||0)+1;
  save();
}
function recordDialogue(ok,points){
  S.ans++;if(ok)S.ok++;S.pts+=points;
  const day=S.days[today()]||(S.days[today()]=blankDay());
  day.answers++;if(ok)day.correct++;day.points+=points;
  recordExtended(null,ok,points,'dialogue',null);
}
const normGerman=s=>String(s||'').toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[„“”"'’!?.,:;()[\]{}]/g,' ').replace(/\s+/g,' ').trim();
const tok=s=>(String(s).match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)||[]);
const sentenceAllowed=d=>[d.e1,d.e2].some(s=>{const t=tok(s);return t.length>=3&&t.length<=11&&t.every(x=>x.length<=26);});
const pluralOf=d=>{
  if(!d.art||!d.f)return '';
  const m=d.f.match(/^die\s+([^;,(\/]+)/i);
  if(!m)return '';
  const plural='die '+m[1].trim();
  return plural.length<55&&plural.split(' ').length<=4?plural:'';
};
const DIALOGUES=content.DIALOGUES;
let P=null;
function practicePool(mode){
  let a=DATA.filter(d=>S.set.lvl==='all'||d.l===S.set.lvl);
  if(mode==='sentence')a=a.filter(sentenceAllowed);
  if(mode==='article')a=a.filter(d=>!!d.art);
  return a;
}
function choosePractice(mode,d,group=''){
  if(mode==='dialogue')return{mode,d:null,dialogue:d,group};
  if(mode==='article'){
    const plural=!!pluralOf(d)&&Math.random()<.5;
    return{mode:plural?'plural':'article',d,group};
  }
  if(mode==='sentence'){
    const samples=[[d.e1,d.e1t],[d.e2,d.e2t]].filter(v=>tok(v[0]).length>=3&&tok(v[0]).length<=11);
    if(!samples.length)return{mode:'type',d,group};
    const sm=samples[Math.random()*samples.length|0];
    return{mode,d,group,sentence:sm[0],translation:sm[1],tokens:tok(sm[0])};
  }
  return{mode,d,group};
}
function beginPractice(mode,entries,options={}){
  if(!entries.length){toast("No questions available for this selection.");return;}
  P={mode,entries,index:0,res:[],score:0,locked:false,options};
  show('practice');showPracticeQuestion();
}

function pickModeItems(pool,len,mode){
  return adaptBatch(pool,len,d=>adaptWordKey(d,mode==='article'?'article':mode));
}
function openMode(mode){
  if(mode==='dialogue'){
    beginPractice(mode,shuffle(DIALOGUES.slice()).slice(0,S.set.len).map(d=>choosePractice(mode,d)));return;
  }
  const pool=practicePool(mode);
  const chosen=pickModeItems(pool,S.set.len,mode);
  beginPractice(mode,chosen.map(d=>choosePractice(mode,d)));
}
$('modeGrid').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b)openMode(b.dataset.mode);});
$('btnAnalytics').onclick=()=>{show('analytics');renderAnalytics();};
$('analysisProgress').onclick=()=>{show('progress');renderProgress();};
function renderDailyHome(){
  let plan=S.dailyPlan;
  if(!plan||plan.date!==today()||!Array.isArray(plan.items)){
    $('dailyStatus').textContent="New day";
    $('dailyMeter').innerHTML="<div><strong>5</strong><small>New (suggested)</small></div><div><strong>10</strong><small>Review (if due)</small></div><div><strong>5</strong><small>Mistakes (if any)</small></div>";
    $('dailyBar').style.width='0%';$('btnDaily').textContent="Prepare and start daily lesson";return;
  }
  const counter=group=>{const x=plan.items.filter(t=>t.group===group);return {total:x.length,done:x.filter(t=>t.done).length};};
  const kinds=[['new',"New"],['review',"Review"],['wrong',"Incorrect"]];
  $('dailyMeter').innerHTML=kinds.map(([key,label])=>{const c=counter(key);return `<div><strong>${c.done}/${c.total}</strong><small>${label}</small></div>`;}).join('');
  const done=plan.items.filter(x=>x.done).length,total=plan.items.length;
  $('dailyBar').style.width=(total?done/total*100:100)+'%';
  $('dailyStatus').textContent=done===total?"Complete":`${done}/${total}`;
  $('btnDaily').textContent=done===total?"Today’s lesson complete ✓":done?"Continue lesson":"Start lesson";
}
function buildDailyPlan(){
  const seen=d=>{const r=S.w[d.i];return !!r&&(r.r+r.x)>0;};
  const chosen=new Set(),entries=[];
  function add(group,pool,limit,mode){
    for(const d of shuffle(pool.slice())){
      if(entries.filter(e=>e.group===group).length>=limit)break;
      if(chosen.has(d.i))continue;
      entries.push({i:d.i,group,mode,done:false});chosen.add(d.i);
    }
  }
  add('new',adaptBatch(DATA.filter(d=>!seen(d)),5,d=>adaptFamilyKey(d)),5,'choice');
  add('review',adaptBatch(DATA.filter(d=>(due(d.i)||adaptStatus(adaptFamilyKey(d))==='review')&&seen(d)),10,d=>adaptFamilyKey(d)),10,'listen');
  add('wrong',adaptBatch(DATA.filter(d=>isWrong(d.i)||adaptStatus(adaptFamilyKey(d))==='wrong'),5,d=>adaptFamilyKey(d)),5,'type');
  // If no reviews or errors are due yet, the lesson remains intentionally shorter.
  return{date:today(),items:entries};
}
function beginDaily(){
  if(!S.dailyPlan||S.dailyPlan.date!==today()){
    S.dailyPlan=buildDailyPlan();save();
  }
  const pending=S.dailyPlan.items.filter(e=>!e.done);
  if(!pending.length){toast("Today’s lesson is complete!");renderDailyHome();return;}
  beginPractice('daily',pending.map(e=>({...choosePractice(e.mode,DATA[e.i],e.group),planEntry:e})),{daily:true});
}
$('btnDaily').onclick=beginDaily;
function showPracticeQuestion(){
  const q=P.entries[P.index];P.locked=false;P.picks=[];
  const total=P.entries.length;
  $('practiceBar').style.width=(100*P.index/total)+'%';
  $('practiceCount').textContent=(P.index+1)+' / '+total;
  $('practiceTitle').textContent=P.options.daily?"🎯 Daily lesson · "+({new:"New",review:"Review",wrong:"Incorrect"}[q.group]||''):MODE_LABELS[q.mode];
  $('practiceScore').textContent=P.score+" points";
  $('practiceFeedback').hidden=true;$('practiceFeedback').innerHTML='';
  const B=$('practiceInteraction'),T=$('practicePrompt'),d=q.d;
  if(q.mode==='type'){
    T.innerHTML=`<span class="label">Write the German for this English prompt</span><h3>${esc(d.t)}</h3><p class="practice-help">Write the complete German expression. Include the article for nouns.</p>`;
    B.innerHTML=`<label class="label" for="practiceText">Your German answer</label><input id="practiceText" class="practice-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type here…"><button class="btn primary block" id="checkPractice">Check answer</button>`;
    $('practiceText').focus();
  }else if(q.mode==='listen'){
    T.innerHTML=`<span class="label">Listen to the German expression</span><h3>🎧 What did you hear?</h3><p class="practice-help">Listen and choose the English meaning.</p><button class="btn soft" id="playPractice">${SPK} Listen again</button>`;
    q.options=shuffle([d,...distract(d,'t',3)]).map(x=>({label:x.t,ok:x.i===d.i}));
    B.innerHTML=optionMarkup(q.options);
    $('playPractice').onclick=()=>speak(d.w,'de-DE');
    speak(d.w,'de-DE');
  }else if(q.mode==='choice'){
    T.innerHTML=`<span class="label">New word · German → English</span><div class="row"><h3>${wordHTML(d)}</h3>${say(d.w)}</div><p class="practice-help">Choose the English meaning.</p>`;
    q.options=shuffle([d,...distract(d,'t',3)]).map(x=>({label:x.t,ok:x.i===d.i}));
    B.innerHTML=optionMarkup(q.options);
  }else if(q.mode==='article'){
    T.innerHTML=`<span class="label">Find the correct article</span><h3>___ ${esc(d.bare)}</h3><p>${esc(d.t)}</p>`;
    q.options=['der','die','das'].map(x=>({label:x,ok:x===d.art}));B.innerHTML=optionMarkup(q.options);
  }else if(q.mode==='plural'){
    T.innerHTML=`<span class="label">Plural form</span><h3>${wordHTML(d)}</h3><p>${esc(d.t)}</p>`;
    B.innerHTML=`<label class="label" for="practiceText">Write the plural with “die”</label><input id="practiceText" class="practice-input" type="text" spellcheck="false" autocomplete="off" placeholder="die ..."><button class="btn primary block" id="checkPractice">Check answer</button>`;
    $('practiceText').focus();
  }else if(q.mode==='sentence'){
    T.innerHTML=`<span class="label">Build a German sentence</span><h3>${esc(q.translation)}</h3><p class="practice-help">Arrange the words. Supported alternative word orders are accepted.</p>`;
    q.shuffled=shuffle(q.tokens.map((t,i)=>({t,i})));
    B.innerHTML=`<span class="label">Your sentence · Tap a word to remove it</span><div class="token-panel" id="chosenWords"><span class="muted-small">Your sentence appears here…</span></div><span class="label">Words</span><div class="token-bank" id="wordBank"></div><div class="row"><button class="btn soft" id="clearSentence">Clear</button><button class="btn soft" id="sentenceHint">Hint</button><button class="btn primary" id="checkPractice" style="flex:1">Check sentence</button></div>`;
    drawTokens();
  }else if(q.mode==='dialogue'){
    const v=q.dialogue;
    T.innerHTML=`<span class="label">💬 ${esc(v.place)}</span><h3>${esc(v.line)}</h3><p class="practice-help">${esc(v.tr)}</p><div class="row">${say(v.line,"Listen to the German dialogue")}</div><span class="label">How would you respond?</span>`;
    q.options=v.options.map((t,i)=>({label:t,ok:i===v.correct}));B.innerHTML=optionMarkup(q.options);
  }
}
function optionMarkup(items){return `<div class="choice-list">${items.map((x,i)=>`<button type="button" data-choice="${i}">${esc(x.label)}</button>`).join('')}</div>`;}

// Conservative alternate word order: move ONE complete time/place/prepositional
// phrase into or out of the German Vorfeld while keeping the finite verb second.
// No acceptance of arbitrary word permutations or case/agreement changes.
const WD_TIME_SINGLE=new Set(['heute','morgen','gestern','jetzt','bald','später','manchmal','immer','oft','danach','zuerst','montags','dienstags','mittwochs','donnerstags','freitags','samstags','sonntags','abends','morgens','mittags','nachts','nie','selten','regelmäßig','normalerweise','manchmal']);
const WD_PREPS=new Set(['am','im','in','auf','an','bei','mit','nach','vor','seit','zum','zur','aus','von','unter','über','hinter','neben','zwischen','ohne','für','durch','zu']);
const WD_ARTICLES=new Set(['dem','den','der','die','das','einem','einer','einen','mein','meine','meinem','meiner','meinen','deinem','deiner','deinen','sein','seine','seinem','seiner','seinen','unserer','unserem','unseren']);
const WD_PRONOUNS=new Set(['ich','du','er','sie','es','wir','ihr']);
const WD_NOM_ARTICLES=new Set(['der','die','das','ein','eine','mein','meine','dein','deine','sein','seine','ihr','ihre','unser','unsere','dieser','diese','dieses']);
const wdLower=x=>String(x).toLocaleLowerCase('de-DE').replace(/[.,!?;:]+$/g,'');
function wdAdverbialLength(parts,start){
 const t=parts.map(wdLower),x=t[start],y=t[start+1]||'',z=t[start+2]||'';
 if(!x)return 0;
 if(WD_TIME_SINGLE.has(x))return 1;
 if((x==='da'||x==='dort'||x==='hier')&&['drüben','vorne','hinten','oben','unten'].includes(y))return 2;
 if((x==='jeden'||x==='jede'||x==='jedes'||x==='nächste'||x==='nächsten'||x==='letzte'||x==='letzten'||x==='diese'||x==='diesen'||x==='heute')&&/^(tag|morgen|abend|nacht|woche|monat|jahr|wochenende|sommer|winter)$/.test(y))return 2;
 if(WD_PREPS.has(x)){
   if(WD_ARTICLES.has(y)&&z&&!/^(und|oder|aber|weil|dass)$/i.test(z))return 3;
   if(y&&/^[A-ZÄÖÜ]/.test(parts[start+1]))return 2;
   if(y==='hause'||y==='haus')return 2;
 }
 return 0;
}
function wdSubjectLength(tokens,start){
 if(start>=tokens.length)return 0;
 const first=wdLower(tokens[start]);
 if(WD_PRONOUNS.has(first))return 1;
 if(!WD_NOM_ARTICLES.has(first))return 0;
 // Der Mann / die Frau / das Haus, including a simple adjectival modifier.
 const next=tokens[start+1]||'',third=tokens[start+2]||'';
 if(/^[A-ZÄÖÜ]/.test(next))return 2;
 if(/^[a-zäöüß]+(?:e|en|er|es|em)$/.test(next)&&/^[A-ZÄÖÜ]/.test(third))return 3;
 return 0;
}
function wdSentenceOrders(tokens){
 const idx=tokens.map((_,i)=>i),arr=[idx],lo=tokens.map(wdLower);
 if(tokens.length<3||tokens.length>18)return arr;
 // Multi-clause and interrogative structures need a real parser; avoid false positives.
 if(tokens.some((x,i)=>i<tokens.length-1&&/[,:;!?]/.test(x))||lo.some(x=>['weil','dass','wenn','obwohl','während','aber','und','oder'].includes(x))||/[?]$/.test(tokens[tokens.length-1]))return arr;
 const seen=new Set([idx.join(',')]);
 const add=p=>{if(p.length!==idx.length||new Set(p).size!==idx.length)return;const k=p.join(',');if(!seen.has(k)){seen.add(k);arr.push(p);}};
 const subj=wdSubjectLength(tokens,0);
 if(subj&&tokens.length>=subj+2){
  // Die Post ist da drüben. -> Da drüben ist die Post.
  // Ich fahre mit dem Zug.  -> Mit dem Zug fahre ich.
  for(let j=subj+1;j<tokens.length;j++){
   const len=wdAdverbialLength(tokens,j);
   if(len&&j+len<=tokens.length){
    const front=idx.slice(j,j+len),rest=idx.slice(subj+1).filter(i=>i<j||i>=j+len);
    add([...front,subj,...idx.slice(0,subj),...rest]);
   }
  }
 } else {
  // Heute lerne ich Deutsch. -> Ich lerne heute Deutsch.
  const n=wdAdverbialLength(tokens,0);
  const sub=n?wdSubjectLength(tokens,n+1):0;
  if(n&&sub&&tokens.length>=n+sub+1)add([...idx.slice(n+1,n+1+sub),n,...idx.slice(0,n),...idx.slice(n+1+sub)]);
 }
 return arr;
}
function sentenceOrders(q){return wdSentenceOrders(q.tokens);}
function isAcceptedSentence(q,picks){
 const candidate=picks.map(i=>q.tokens[i]);
 return sentenceOrders(q).some(order=>normGerman(order.map(i=>q.tokens[i]).join(' '))===normGerman(candidate.join(' ')));
}
function wdAcceptRichSentence(text,candidate){
 const words=String(text).trim().split(/\s+/);
 return wdSentenceOrders(words).some(order=>normGerman(order.map(i=>words[i]).join(' '))===normGerman(candidate));
}
function sentenceExplain(q){
 const s=q.sentence;
 if(/\bweil\b|\bdass\b/.test(s))return "In a weil or dass clause, the conjugated verb comes last.";
 if(/\b(habe|hast|hat|haben|seid|bin|bist|sind|ist)\b/i.test(s)&&/\bge\w+(t|en)\b/i.test(s))return "In the Perfekt, the auxiliary is in second position and the past participle comes last.";
 if(/\b(kann|kannst|muss|musst|möchte|möchtest|will|wollen|soll|dürfen)\b/i.test(s))return "The conjugated modal verb takes second position. The main verb goes at the end in the infinitive.";
 if(/^(Heute|Morgen|Gestern|Jetzt|Später|Oft)\b/.test(s))return "When a time expression comes first, the verb stays second and the subject usually follows it.";
 return "The conjugated verb usually takes second position in a statement. Check word order and articles.";
}

function drawTokens(){
  const q=P.entries[P.index],selected=new Set(P.picks);
  $('chosenWords').innerHTML=P.picks.length?P.picks.map((j,i)=>`<button class="token selected" data-undo="${i}">${esc(q.tokens[j])}</button>`).join(''):"<span class=\"muted-small\">Your sentence appears here…</span>";
  $('wordBank').innerHTML=q.shuffled.map((x,k)=>`<button class="token" data-token="${x.i}" ${selected.has(x.i)?'disabled':''}>${esc(x.t)}</button>`).join('');
}
$('practiceInteraction').addEventListener('click',e=>{
  if(!P||P.locked)return;
  const b=e.target.closest('button');if(!b)return;
  const q=P.entries[P.index];
  if(b.hasAttribute('data-choice')){
    const k=+b.dataset.choice;evaluatePractice(q.options[k].ok,q.options[k].label,k);return;
  }
  if(b.hasAttribute('data-token')){P.picks.push(+b.dataset.token);drawTokens();return;}
  if(b.hasAttribute('data-undo')){P.picks.splice(+b.dataset.undo,1);drawTokens();return;}
  if(b.id==='clearSentence'){P.picks=[];drawTokens();return;}
  if(b.id==='sentenceHint'){toast(sentenceExplain(q));return;}
  if(b.id==='checkPractice'){
    if(q.mode==='sentence'){
      if(P.picks.length!==q.tokens.length){toast("Select all the words first");return;}
      evaluatePractice(isAcceptedSentence(q,P.picks),P.picks.map(i=>q.tokens[i]).join(' '));
    }else{
      const s=$('practiceText').value.trim();if(!s){toast("Type your answer");return;}
      const correct=q.mode==='plural'?pluralOf(q.d):q.d.w;
      const variants=q.mode==='type'?correct.split(/\s+\/\s+/).map(s=>s.trim()):[correct];
      evaluatePractice(variants.some(v=>normGerman(v)===normGerman(s)),s);
    }
  }
});
$('practiceInteraction').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='practiceText'&&!P.locked){e.preventDefault();$('checkPractice').click();}});
function practiceCorrectLabel(q){
  if(q.mode==='dialogue')return q.dialogue.options[q.dialogue.correct];
  if(q.mode==='plural')return pluralOf(q.d);
  if(q.mode==='article')return q.d.art;
  if(q.mode==='sentence')return q.sentence;
  if(q.mode==='choice'||q.mode==='listen')return q.d.t;
  return q.d.w;
}
function evaluatePractice(ok,given,choiceIndex=-1){
  if(P.locked)return;
  P.locked=true;const q=P.entries[P.index],d=q.d;
  const points=ok?100:0;P.score+=points;
  if(q.options){
    $('practiceInteraction').querySelectorAll('[data-choice]').forEach((button,i)=>{button.disabled=true;if(q.options[i].ok)button.classList.add('correct');else if(i===choiceIndex)button.classList.add('incorrect');});
  }
  if(d){
    const wasLearned=learned(d.i),wasReview=due(d.i),r=rec(d.i);
    if(ok){r.r++;r.b=Math.min(5,r.b+1);r.next=Date.now()+INTERVALS[r.b-1]*DAY;}
    else{r.x++;r.b=0;r.next=Date.now();}
    r.t=Date.now();if(['choice','listen','article'].includes(q.mode))markMastery(d.i,'recognition',ok);
    if(ok&&(q.mode==='type'||q.mode==='plural'))markMastery(d.i,'writing');
    if(ok&&q.mode==='sentence')markMastery(d.i,'sentence');
    S.ans++;if(ok)S.ok++;S.pts+=points;
    recordAnswer(d,ok,points,wasLearned,wasReview);
    const direction=q.mode==='type'||q.mode==='plural'||q.mode==='sentence'?'tr2de':q.mode==='choice'||q.mode==='listen'?'de2tr':null;
    recordExtended(d,ok,points,q.mode,direction);
    adaptTrack(adaptWordKey(d,q.mode),ok,d.c,adaptFamilyKey(d));
    if(!ok&&!P.options.daily&&P.index<P.entries.length-3)adaptInSession(P.entries,adaptWordKey(d,q.mode),{...q,options:undefined,shuffled:undefined},2);
  }else{recordDialogue(ok,points);adaptTrack('dialogue-basic:'+q.dialogue.place+':'+q.dialogue.line,ok,"Dialogue");}
  if(q.planEntry){q.planEntry.done=true;save();}
  P.res.push({q,ok,given,correct:practiceCorrectLabel(q)});
  $('practiceScore').textContent=P.score+" points";
  const hint=q.mode==='dialogue'?`<p class="practice-help">${esc(q.dialogue.tip)}</p>`:q.mode==='sentence'?`<p class="practice-help">${esc(sentenceExplain(q))}</p>${sentenceOrders(q).length>1?`<p class="practice-help">Alternative: ${esc(sentenceOrders(q)[1].map(i=>q.tokens[i]).join(' '))}</p>`:''}`:'';
  $('practiceFeedback').innerHTML=`<div class="verdict ${ok?'ok':'bad'}"><b>${ok?"✓ Correct":"✗ Review this item"}</b><strong>${ok?'+100':'0'} points</strong></div><p style="margin:0"><span class="label">Expected answer</span><br><strong>${esc(practiceCorrectLabel(q))}</strong></p>${!ok&&given?`<p class="practice-help" style="margin:0">Your answer: ${esc(given)}</p>`:''}${hint}${adaptNudge(d?adaptWordKey(d,q.mode):'dialogue-basic:'+q.dialogue.place+':'+q.dialogue.line,ok,d?d.g+' '+d.e1:q.dialogue.tip)}${d?detailHTML(d):say(q.dialogue.line,"Listen to the dialogue")}<button class="btn primary block" id="practiceNext">${P.index+1<P.entries.length?"Continue":"Results"}</button>`;
  $('practiceFeedback').hidden=false;
  $('practiceNext').onclick=nextPractice;
  if(S.set.auto&&d&&q.mode!=='listen')speak(d.w);
  $('practiceFeedback').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function nextPractice(){if(!P||!P.locked)return;P.index++;if(P.index>=P.entries.length)finishPractice();else{showPracticeQuestion();window.scrollTo(0,0);}}
function finishPractice(){
  const n=P.res.length,c=P.res.filter(x=>x.ok).length;
  show('practiceResult');
  $('practiceResultScore').textContent=P.score;
  $('practiceResultDetail').textContent=`${c} / ${n} correct · ${n?Math.round(100*c/n):0}%`;
  $('practiceResultNote').textContent=P.options.daily?"Today’s practice was saved. Resume any remaining questions from Home.":"Missed questions will return in future practice.";
  $('practiceResultList').innerHTML=P.res.map(x=>`<div class="rrow"><b class="ic ${x.ok?'ok':'bad'}">${x.ok?'✓':'✗'}</b><div class="t"><b>${esc(x.correct)}</b><span>${x.q.mode==='dialogue'?esc(x.q.dialogue.place):esc(x.q.d.t)}</span></div>${x.q.d?say(x.q.d.w):''}</div>`).join('');
  $('practiceResultAgain').textContent=P.options.daily?"Back to home":"Play a new round";
  $('practiceResultAgain').onclick=()=>{if(P.options.daily)show('home');else openMode(P.mode);};
}
$('practiceQuit').onclick=()=>{try{speechSynthesis.cancel();}catch(e){}if(P&&P.res.length)finishPractice();else show('home');};
function renderAnalytics(){
  const learnedCount=DATA.filter(d=>learned(d.i)).length;
  const totalDone=Object.values(S.days).reduce((acc,d)=>acc+(d.answers||0),0);
  const d30=Array.from({length:30},(_,i)=>dayKeyOffset(i-29));
  const in30=d30.reduce((s,k)=>s+daily(k).answers,0);
  $('analysisTotals').innerHTML=[["All 3 skills complete",learnedCount+' / '+DATA.length],["Total questions",questionTotals(S).n],["Last 30 days",in30],["Day streak",streak()+" days"]].map(([l,v])=>`<div><strong>${v}</strong><span>${l}</span></div>`).join('');
  const mx=Math.max(1,...d30.map(k=>daily(k).answers));
  $('analysisChart').innerHTML=d30.map(k=>{const n=daily(k).answers;return `<div class="hbar-wrap" title="${k}: ${n} questions"><div class="hbar"><i style="height:${n?Math.max(9,100*n/mx):0}%"></i></div><span>${k.slice(-2)}</span></div>`;}).join('');
  const directionHTML=dir=>{
    const s=S.dirStats[dir]||{n:0,ok:0};
    const tried=DATA.filter(d=>S.w[d.i]?.directions?.[dir]);
    const strong=tried.filter(d=>S.w[d.i].directions[dir].b>=2).length;
    const waiting=tried.filter(d=>{const r=S.w[d.i].directions[dir];return r.next<=Date.now();}).length;
    return `<div class="analysis-line"><strong>${dir==='de2tr'?"🇩🇪 DE → 🇬🇧 EN":"🇬🇧 EN → 🇩🇪 DE"}</strong><small>${s.n} questions · ${s.n?Math.round(100*s.ok/s.n):0}% · ${strong} strong · ${waiting} reviews</small><div class="bar"><i style="width:${s.n?100*s.ok/s.n:0}%"></i></div></div>`;
  };
  $('analysisDirections').innerHTML=directionHTML('de2tr')+directionHTML('tr2de');
  renderQuestionBreakdown($('analysisModes'));
  const topics=Object.entries(S.topicStats).filter(([k,a])=>a.n>=2).sort((a,b)=>a[1].ok/a[1].n-b[1].ok/b[1].n).slice(0,8);
  $('analysisTopics').innerHTML=topics.map(([t,a])=>`<div class="analysis-line"><strong>${esc(TOPIC_TR[t]||t)}</strong><small>${a.ok}/${a.n} · ${Math.round(100*a.ok/a.n)}%</small><div class="bar"><i style="width:${100*a.ok/a.n}%"></i></div></div>`).join('')||"<p class=\"muted\">Answer at least two questions to compare topics.</p>";
  const errors=DATA.filter(d=>S.w[d.i]?.x>0).sort((a,b)=>{const ra=S.w[a.i],rb=S.w[b.i];return (rb.x/(rb.x+rb.r))-(ra.x/(ra.x+ra.r))||rb.x-ra.x;}).slice(0,12);
  $('analysisDifficult').innerHTML=errors.map(d=>`<div class="rrow"><div class="t"><b>${wordHTML(d)}</b><span>${esc(d.t)} · ${S.w[d.i].x} incorrect, ${S.w[d.i].r} correct</span></div>${say(d.w)}</div>`).join('')||"<p class=\"muted\">No missed words yet.</p>";
}


/* WortDuell A1-A2 Akademi: additive, offline, no dependencies. */
const ACADEMY_DATA={verbs: content.verbs, casework: content.cases};
const GRAMMAR_LESSONS=content.GRAMMAR_LESSONS;
const ACADEMY_QBANK=GRAMMAR_LESSONS.flatMap(l=>l.qs.map((q,i)=>({lesson:l.id,level:l.lv,q:q[0],answer:q[1],others:q[2],why:q[3],idx:i})));
function grammarFresh(){return {byLesson:{},verb:{n:0,ok:0},day:{}};}
if(!S.grammar||typeof S.grammar!=='object')S.grammar=grammarFresh();
const gram=()=>{if(!S.grammar||!S.grammar.byLesson)S.grammar=grammarFresh();return S.grammar;};
function renderAcademy(){
 const root=$('academyCards'),stats=gram().byLesson;
 root.innerHTML=GRAMMAR_LESSONS.filter(x=>(!$('wdGrammarLevel')||$('wdGrammarLevel').value==='all'||x.lv===$('wdGrammarLevel').value)&&(!$('wdGrammarGroup')||$('wdGrammarGroup').value==='all'||content.grammarGroups[x.id]===$('wdGrammarGroup').value)).map(x=>{const a=stats[x.id]||{n:0,ok:0};return `<button class="academy-card" data-lesson="${x.id}"><span class="academy-icon">${x.icon}</span><b>${esc(x.title)}</b><small>${x.lv} · ${a.n?`${a.ok}/${a.n} correct`:"Not started"}</small></button>`;}).join('');
 $('academyCount').textContent=Object.values(stats).reduce((n,x)=>n+(x.n||0),0)+" exercises";
 $('academyVerbCount').textContent=ACADEMY_DATA.verbs.length+" verbs and expressions · 6 subject forms";
}
let A=null;
const acadPick=(arr,n)=>shuffle(arr.slice()).slice(0,n);
function openLesson(id){
 const l=GRAMMAR_LESSONS.find(x=>x.id===id);if(!l)return;
 A={lesson:l,qs:adaptBatch(ACADEMY_QBANK.filter(x=>x.lesson===id),8,q=>'grammar:'+id+':'+q.q),i:0,ok:0,answered:false};
 $('lessonTitle').textContent=l.icon+' '+l.title;
 $('lessonLevel').textContent=l.lv+' · '+l.source;
 $('lessonIntro').textContent=l.intro;
 $('lessonSamples').innerHTML=l.samples.map(x=>`<div class="lesson-example"><b>${esc(x[0])}</b><span>${esc(x[1])}</span>${say(x[0],"Listen to the German example")}</div>`).join('');
 $('lessonAction').onclick=()=>{A.i=0;A.ok=0;show('grammarPlay');renderGrammarQuestion();};
 show('lesson');
}
function renderGrammarQuestion(){
 if(A.i>=A.qs.length){finishGrammar();return;}
 A.answered=false;
 const q=A.qs[A.i];$('grammarCount').textContent=`${A.i+1} / ${A.qs.length}`;
 $('grammarBar').style.width=(100*A.i/A.qs.length)+'%';
 $('grammarQuestion').textContent=q.q;
 $('grammarHint').textContent='';$('grammarReveal').hidden=true;
 const options=shuffle([q.answer,...q.others]);A.options=options;
 $('grammarOptions').innerHTML=options.map((s,i)=>`<button type="button" data-gchoice="${i}" class="grammar-option">${esc(s)}</button>`).join('');
}
function recordAcademyDay(ok){const g=gram();g.day=g.day||{};const day=g.day[today()]||(g.day[today()]={n:0,ok:0});day.n++;if(ok)day.ok++;}
function registerGrammar(ok){const g=gram(),l=g.byLesson[A.lesson.id]||(g.byLesson[A.lesson.id]={n:0,ok:0});l.n++;if(ok)l.ok++;recordAcademyDay(ok);const q=A.qs[A.i];if(q)adaptTrack('grammar:'+A.lesson.id+':'+q.q,ok,A.lesson.title,'grammar-topic:'+A.lesson.id);save();}
function grammarAnswer(i){
 if(!A||A.answered)return;A.answered=true;const q=A.qs[A.i],ok=A.options[i]===q.answer;
 if(ok)A.ok++;registerGrammar(ok);
 $('grammarOptions').querySelectorAll('button').forEach((b,k)=>{b.disabled=true;if(A.options[k]===q.answer)b.classList.add('correct');else if(k===i)b.classList.add('incorrect');});
 $('grammarReveal').hidden=false;
 $('grammarReveal').innerHTML=`<div class="verdict ${ok?'ok':'bad'}">${ok?"✓ Well done!":"Let’s look at the answer"}</div><strong>${esc(q.answer)}</strong><p class="notice">${esc(q.why)}</p>${adaptNudge('grammar:'+A.lesson.id+':'+q.q,ok,q.why+' '+q.q)}<div class="row">${say(q.answer,"Listen to the correct answer",((q.lesson==="zeit" && q.idx>=5)||(q.lesson==="futur" && q.idx===7))?"en-GB":"de-DE")}<button class="btn primary" id="grammarNext" style="flex:1">${A.i+1===A.qs.length?"Finish lesson":"Continue"}</button></div>`;
 $('grammarNext').onclick=()=>{A.i++;renderGrammarQuestion();};
}
function finishGrammar(){
 $('grammarDoneTitle').textContent=A.lesson.title;
 $('grammarDoneStat').textContent=`${A.ok} / ${A.qs.length} correct`;
 $('grammarDoneMsg').textContent="You can stop here. Missed questions will return another day.";
 show('grammarDone');
}
$('academyCards').addEventListener('click',e=>{const b=e.target.closest('[data-lesson]');if(b)openLesson(b.dataset.lesson);});
$('grammarOptions').addEventListener('click',e=>{const b=e.target.closest('[data-gchoice]');if(b)grammarAnswer(+b.dataset.gchoice);});
$('grammarHintButton').onclick=()=>{$('grammarHint').textContent=A.lesson.intro;};
$('grammarAgain').onclick=()=>openLesson(A.lesson.id);
$('grammarToAcademy').onclick=()=>{show('academy');renderAcademy();};
$('academyBack').onclick=()=>show('home');
$('lessonBack').onclick=()=>{show('academy');renderAcademy();};
$('grammarBack').onclick=()=>{show('academy');renderAcademy();};
$('academyFromDone').onclick=()=>{show('academy');renderAcademy();};
$('btnAcademy').onclick=()=>{show('academy');renderAcademy();};
$('academyVerb').onclick=()=>{show('verbs');renderVerbs();};
$('verbsBack').onclick=()=>{show('academy');renderAcademy();};
let vFilter='all',vPerson=0,vQuery='',vPractice=null;
const persons=['ich','du','er/sie/es','wir','ihr','sie/Sie'];
const formParts=(v,i)=>{
 const s=(v.forms[i]||'').trim();return v.type==="Next 100"?s.replace(/^(ich|du|er\/sie\/es|wir|ihr|sie\/Sie)\s+/,''):s;
};
function renderVerbs(){
 const set=ACADEMY_DATA.verbs.filter(v=>(vFilter==='all'||v.level===vFilter)&&(fold(v.v+' '+v.tr).includes(fold(vQuery))));
 $('verbsN').textContent=set.length+" verbs / expressions";
 $('verbsList').innerHTML=set.map(v=>`<details class="verb-row"><summary><div><b>${esc(v.v)}</b><small>${esc(v.tr)} · ${v.level}</small></div><span class="muted">⌄</span></summary><div class="verb-detail">${persons.map((p,i)=>`<div><span>${esc(p)}</span><b>${esc(formParts(v,i))}</b></div>`).join('')}${v.perf?`<p class="notice"><strong>Perfekt:</strong> ${esc(v.perf)}</p>`:''}${v.example?`<p class="notice"><b>${esc(v.example)}</b> ${say(v.example,"Listen to the example sentence")}</p>`:''}${say(v.v,"Listen to the verb")}</div></details>`).join('');
}
$('verbsSearch').addEventListener('input',e=>{vQuery=e.target.value;renderVerbs();});
$('verbsLvl').addEventListener('change',e=>{vFilter=e.target.value;renderVerbs();});
$('verbsTrain').onclick=()=>{
 const pool=ACADEMY_DATA.verbs.filter(v=>vFilter==='all'||v.level===vFilter).filter(v=>v.forms.length===6&&v.forms.every(x=>x.trim()));
 vPractice={list:adaptBatch(pool,10,v=>'verb:'+v.v).map(v=>({v,p:Math.random()*6|0})),i:0,ok:0,answered:false};
 show('verbPlay');renderVerbQuestion();
};
function renderVerbQuestion(){
 if(vPractice.i>=vPractice.list.length){$('verbDoneText').textContent=`${vPractice.ok} / ${vPractice.list.length} correct · Well done!`;$('verbPlayPart').hidden=true;$('verbDonePart').hidden=false;return;}
 $('verbPlayPart').hidden=false;$('verbDonePart').hidden=true;vPractice.answered=false;
 const {v,p}=vPractice.list[vPractice.i];$('verbQCount').textContent=`${vPractice.i+1} / ${vPractice.list.length}`;
 $('verbQuestion').innerHTML=`<span class="label">${v.level} · ${esc(persons[p])}</span><h2>${esc(v.v)}</h2><p class="muted">${esc(v.tr)}</p><p class="notice">Choose the correct present-tense form.</p>`;
 const answer=formParts(v,p),others=[...new Set(v.forms.map((_,i)=>formParts(v,i)).filter(x=>x!==answer))];
 const pool=shuffle(others).slice(0,2);while(pool.length<2){pool.push(['lerne','geht','mache','sind'][pool.length]);}
 vPractice.options=shuffle([answer,...pool]);
 $('verbChoices').innerHTML=vPractice.options.map((s,i)=>`<button class="grammar-option" data-vchoice="${i}">${esc(s)}</button>`).join('');$('verbFeedback').hidden=true;
}
$('verbChoices').addEventListener('click',e=>{
 const b=e.target.closest('[data-vchoice]');if(!b||vPractice.answered)return;
 const {v,p}=vPractice.list[vPractice.i],ans=formParts(v,p),ok=vPractice.options[+b.dataset.vchoice]===ans;
 vPractice.answered=true;if(ok)vPractice.ok++;
 gram().verb.n++;if(ok)gram().verb.ok++;recordAcademyDay(ok);adaptTrack('verb-choice:'+v.v+':'+p,ok,"Verb conjugation",'verb:'+v.v);save();
 $('verbChoices').querySelectorAll('button').forEach((el,k)=>{el.disabled=true;if(vPractice.options[k]===ans)el.classList.add('correct');else if(k===+b.dataset.vchoice)el.classList.add('incorrect');});
 $('verbFeedback').hidden=false;$('verbFeedback').innerHTML=`<div class="verdict ${ok?'ok':'bad'}">${ok?"✓ Correct":"Check the correct form"}</div><p><b>${esc(persons[p])} ${esc(ans)}</b> ${say(persons[p]+' '+ans,"Listen to the verb form")}</p>${adaptNudge('verb-choice:'+v.v+':'+p,ok,v.example)}<button class="btn primary block" id="nextVerb">Continue</button>`;
 $('nextVerb').onclick=()=>{vPractice.i++;renderVerbQuestion();};
});
$('verbPlayBack').onclick=()=>{show('verbs');renderVerbs();};
$('verbDoneBack').onclick=()=>{show('verbs');renderVerbs();};
/* 101 source-derived, labelled Kasus sentences browsable in the academy. */
$('academyCases').onclick=()=>{show('cases');renderCases();};
$('casesBack').onclick=()=>{show('academy');renderAcademy();};
let caseFilter='all';
function renderCases(){
 let rows=ACADEMY_DATA.casework.filter(x=>caseFilter==='all'||x.case===caseFilter);
 $('casesCount').textContent=rows.length+" example sentences";
 $('casesList').innerHTML=rows.map((c,i)=>`<div class="case-example"><span class="tag">${esc(c.case)}</span><b>${esc(c.de)}</b><small>Focus word: ${esc(c.word)} (${esc(c.tr)})</small><span>${say(c.de,"Listen to the example sentence")}</span></div>`).join('');
}
$('casesSelect').addEventListener('change',e=>{caseFilter=e.target.value;renderCases();});

/* Dedicated, rule-tagged German sentence builder from the supplied worksheets. */
const BUILDER_BANK=content.BUILDER_BANK;
let BPLUS=null;
const cleanTokens=s=>tok(s);
const tokenEqual=(a,b)=>normGerman(a.join(' '))===normGerman(b.join(' '));
function builderStart(){
 const level=S.set.lvl;
 const pool=BUILDER_BANK.filter(x=>level==='all'||x.lv===level);
 BPLUS={items:adaptBatch(pool,Math.min(10,pool.length),x=>'builder:'+x.de),i:0,correct:0,positions:[],hints:0,done:false};
 show('builder');builderRender();
}
function builderRender(){
 if(BPLUS.i>=BPLUS.items.length){builderFinish();return;}
 const item=BPLUS.items[BPLUS.i];item.tokens=cleanTokens(item.de);
 BPLUS.positions=[];BPLUS.done=false;BPLUS.hints=0;
 BPLUS.shuffled=shuffle(item.tokens.map((s,i)=>({s,i})));
 $('builderCounter').textContent=`${BPLUS.i+1} / ${BPLUS.items.length}`;
 $('builderProgress').style.width=(100*BPLUS.i/BPLUS.items.length)+'%';
 $('builderLevel').textContent=item.lv+' · Satzbau';$('builderTurkish').textContent=item.tr;
 $('builderTip').textContent='';$('builderFeedback').hidden=true;$('builderFeedback').innerHTML='';
 builderDraw();
}
function builderDraw(){
 const item=BPLUS.items[BPLUS.i],used=new Set(BPLUS.positions);
 $('builderSelected').innerHTML=BPLUS.positions.length?BPLUS.positions.map((idx,k)=>`<button class="token selected" data-bundo="${k}">${esc(item.tokens[idx])}</button>`).join(''):"<span class=\"muted-small\">Select the words in order…</span>";
 $('builderBank').innerHTML=BPLUS.shuffled.map(x=>`<button class="token" data-bword="${x.i}" ${used.has(x.i)?'disabled':''}>${esc(x.s)}</button>`).join('');
}
$('btnBuilderPlus').onclick=builderStart;
$('builderBack').onclick=()=>{show('home');};
$('builderSelected').addEventListener('click',e=>{if(BPLUS.done)return;const b=e.target.closest('[data-bundo]');if(b){BPLUS.positions.splice(+b.dataset.bundo,1);builderDraw();}});
$('builderBank').addEventListener('click',e=>{if(BPLUS.done)return;const b=e.target.closest('[data-bword]');if(b){BPLUS.positions.push(+b.dataset.bword);builderDraw();}});
$('builderClear').onclick=()=>{if(!BPLUS.done){BPLUS.positions=[];builderDraw();}};
$('builderHint').onclick=()=>{const item=BPLUS.items[BPLUS.i];BPLUS.hints++;$('builderTip').textContent=BPLUS.hints===1?item.rule:"First word: "+cleanTokens(item.de)[0]+" · Rule: "+item.rule;};
function builderFinish(){
 $('builderEndScore').textContent=`${BPLUS.correct} / ${BPLUS.items.length} correct`;
 show('builderEnd');
}
$('builderEndHome').onclick=()=>show('home');
$('builderEndAgain').onclick=builderStart;
$('builderCheck').onclick=()=>{
 if(BPLUS.done)return;
 const item=BPLUS.items[BPLUS.i],ordered=BPLUS.positions.map(i=>item.tokens[i]);
 if(ordered.length<item.tokens.length){toast("Select all the words first");return;}
 const accepted=[item.de,...(item.alt||[])].some(v=>tokenEqual(ordered,cleanTokens(v)));
 if(accepted)BPLUS.correct++;
 const g=gram();g.byLesson.builder=g.byLesson.builder||{n:0,ok:0};g.byLesson.builder.n++;if(accepted)g.byLesson.builder.ok++;recordAcademyDay(accepted);adaptTrack('builder:'+item.de,accepted,'Satzbau');save();
 BPLUS.done=true;
 $('builderFeedback').hidden=false;
 $('builderFeedback').innerHTML=`<div class="verdict ${accepted?'ok':'bad'}">${accepted?"✓ Correct sentence!":"Check the word order"}</div><b>${esc(item.de)}</b><p class="notice">${esc(item.rule)}</p>${adaptNudge('builder:'+item.de,accepted,item.rule+' '+item.de)}${item.alt?.length?`<p class="notice"><strong>Another correct version:</strong> ${esc(item.alt.join(' / '))}</p>`:''}<div class="row">${say(item.de,"Listen to the sentence")}<button class="btn primary" id="builderNext" style="flex:1">${BPLUS.i+1>=BPLUS.items.length?"Results":"Continue"}</button></div>`;
 $('builderNext').onclick=()=>{BPLUS.i++;builderRender();};
};


/* WortDuell A1-A2: calm daily study hub, additive and compatible with v1 storage. */
const HUB_DATA={stories: content.stories, dialogues: content.dialogues};
const hubDefaults=()=>({stories:{},conversations:{},cards:{},extra:[],mistakes:{},modes:{},last:{},settings:{level:'all',size:10,kind:'mix'},created:new Date().toISOString()});
function hub(){if(!S.study||typeof S.study!=='object'||Array.isArray(S.study))S.study=hubDefaults();const h=S.study;const d=hubDefaults();for(const k of ['stories','conversations','cards','mistakes','modes','last','settings'])if(!h[k]||typeof h[k]!=='object'||Array.isArray(h[k]))h[k]=d[k];if(!Array.isArray(h.extra))h.extra=[];return h;}
function hStats(name,ok){const h=hub(),x=h.modes[name]||(h.modes[name]={n:0,ok:0});x.n++;if(ok)x.ok++;}
function hLog(kind,ok,prompt,correct,given,key){const h=hub();hStats(kind,ok);const points=ok?20:0;S.ans++;if(ok)S.ok++;S.pts+=points;const day=S.days[today()]||(S.days[today()]=blankDay());day.answers++;if(ok)day.correct++;day.points+=points;if(!day.modes)day.modes={};day.modes[kind]=(day.modes[kind]||0)+1;
 if(!ok){const mk=kind+'|'+(key||prompt);const m=h.mistakes[mk]||(h.mistakes[mk]={kind,prompt,correct,given:'',count:0,when:today(),right:0});m.count++;m.given=String(given||'').slice(0,180);m.when=today();m.right=0;}
 else{const mk=kind+'|'+(key||prompt);if(h.mistakes[mk]){h.mistakes[mk].right=(h.mistakes[mk].right||0)+1;if(h.mistakes[mk].right>=2)delete h.mistakes[mk];}}
 const stable='hub:'+kind+':'+(key||prompt);
 adaptTrack(stable,ok,kind,kind==="Verb writing"?'verb:'+String(key||'').replace(/-\d+$/,''):null);
 save();}
function selectBatch(all,label,n=10){
 const key=x=>label==='verbtype'?'verb:'+x.v:label==='cloze'?"hub:Gap:"+x.id:label.startsWith('cards-')?'card:'+x.id:label==='repeat'?'repeat:'+x.id:'hub:'+label+':'+x.id;
 const pick=adaptBatch(all,n,key);const h=hub();h.last[label]=pick.map(x=>x.id).slice(-60);save();return pick;
}
const hubTitle={stories:"📖 Mini stories",talk:"💬 Conversation practice",verbtype:"🔤 Type the verb",cloze:"✏️ Fill in the blank",cards:"🗂️ Vocabulary cards",repeat:"🎙️ Listen and repeat",personal:"📒 My vocabulary notebook",mistakes:"🧠 My mistake notebook",guide:"📚 Pocket grammar guide"};
function showHub(id){show(id);document.activeElement?.blur?.();}
$('btnHub').onclick=()=>{showHub('hub');drawHub();};
function drawHub(){const h=hub();$('hubTotals').innerHTML=`<span class="tag">${HUB_DATA.stories.length} stories</span><span class="tag">${HUB_DATA.dialogues.length} dialogues</span><span class="tag">${ACADEMY_DATA.verbs.length} verbs</span><span class="tag">${h.extra.length} personal words</span>`;const cards=[['stories','📖',"Mini stories","Short text · 3 questions"],['talk','💬',"Conversation practice","A dialogue in 3 turns"],['verbtype','🔤',"Verb writing",ACADEMY_DATA.verbs.length+" verbs · 6 subject forms"],['cloze','✏️',"Fill in the blank","Cases, prepositions and sentences"],['cards','🗂️',"Vocabulary cards","Review at your own pace"],['repeat','🎙️',"Listen and repeat","Optional microphone"],['personal','📒',"My words","Add, edit and learn"],['mistakes','🧠',"Mistake notebook",Object.keys(h.mistakes).length+" active mistakes"],['guide','📚',"Pocket grammar guide",GRAMMAR_LESSONS.length+" lessons · examples and tables"]];$('hubModes').innerHTML=cards.map(x=>`<button type="button" data-hnav="${x[0]}" class="mode-card"><span class="symbol">${x[1]}</span><b>${x[2]}</b><small>${x[3]}</small></button>`).join('');$('hubLevel').value=h.settings.level;$('hubSize').value=String(h.settings.size);}
$('hubModes').addEventListener('click',e=>{const b=e.target.closest('[data-hnav]');if(b)hubGo(b.dataset.hnav);});
$('hubLevel').onchange=e=>{hub().settings.level=e.target.value;save();};
$('hubSize').onchange=e=>{hub().settings.size=+e.target.value;save();};
$('hubBack').onclick=()=>show('home');
for(const b of document.querySelectorAll('[data-hub-back]'))b.onclick=()=>{showHub('hub');drawHub();};
function hubGo(kind){if(kind==='stories')renderStoryList();else if(kind==='talk')renderTalkList();else if(kind==='verbtype')startVerbTyping();else if(kind==='cloze')startCloze();else if(kind==='cards')startCards();else if(kind==='repeat')startRepeat();else if(kind==='personal')renderPersonal();else if(kind==='mistakes')renderMistakes();else if(kind==='guide')renderGuide();}
function lvFilter(a){const level=hub().settings.level;return a.filter(x=>level==='all'||(x.level||x.l||x.lv)===level);}
function markCompleted(kind,id,ok){const h=hub(),map=kind==='stories'?h.stories:h.conversations,stat=map[id]||(map[id]={runs:0,best:0});stat.runs++;stat.best=Math.max(ok,stat.best);stat.last=today();save();}
let hStory=null;
function renderStoryList(){showHub('hubStories');const h=hub(),pool=HUB_DATA.stories.filter(x=>{const level=$('wdStoryLevel')?.value||hub().settings.level;return level==='all'||x.level===level;}).sort((a,b)=>adaptScore('hub:story:'+b.id)-adaptScore('hub:story:'+a.id));$('hStoryCount').textContent=`${pool.length} stories · 3 questions per story`; $('hStories').innerHTML=pool.map(x=>{let s=h.stories[x.id];return `<button class="hub-list-item" data-story="${x.id}"><b>${esc(x.title)}</b><small>${x.level} · ${esc(x.tr)} ${s?`· Best ${s.best}/3`:''}</small><span>Read →</span></button>`;}).join('');}
$('hStories').addEventListener('click',e=>{const b=e.target.closest('[data-story]');if(b)openStory(b.dataset.story);});
function openStory(id){const x=HUB_DATA.stories.find(t=>t.id===id);if(!x)return;hStory={x,index:0,ok:0,locked:false,done:false};showHub('hubStory');$('hStoryTitle').textContent=x.title;$('hStoryLevel').textContent=`${x.level} · ${x.tr}`;$('hStoryText').textContent=x.de;$('hStoryTR').textContent=x.translation;$('hStoryTR').hidden=true;$('hShowTR').textContent="Show English translation";$('hStoryStart').hidden=false;$('hStoryQA').hidden=true;$('hStoryFinal').hidden=true;$('hStoryRead').onclick=()=>speak(x.de);}
$('hShowTR').onclick=()=>{const x=$('hStoryTR');x.hidden=!x.hidden;$('hShowTR').textContent=x.hidden?"Show English translation":"Hide English translation";};
$('hStoryStart').onclick=()=>{$('hStoryStart').hidden=true;$('hStoryQA').hidden=false;renderStoryQ();};
function renderStoryQ(){const t=hStory,x=t.x;if(t.index>=x.qs.length){markCompleted('stories',x.id,t.ok);$('hStoryQA').hidden=true;$('hStoryFinal').hidden=false;$('hStoryFinal').innerHTML=`<h3>Story complete 🌿</h3><p>${t.ok} / ${x.qs.length} correct. Try another story when you like.</p><button class="btn primary block" id="hStoryHome">Back to stories</button>`;$('hStoryHome').onclick=renderStoryList;return;}
 t.locked=false;const q=x.qs[t.index];$('hStoryStep').textContent=`${t.index+1} / 3`;$('hStoryQuestion').textContent=q.q;$('hStoryChoices').innerHTML=shuffle([q.a,...q.wrong]).map(y=>`<button class="grammar-option" data-story-choice="${esc(y)}">${esc(y)}</button>`).join('');$('hStoryFeedback').hidden=true;}
$('hStoryChoices').addEventListener('click',e=>{const b=e.target.closest('[data-story-choice]');if(!b||!hStory||hStory.locked)return;const t=hStory,q=t.x.qs[t.index],choice=b.dataset.storyChoice,ok=choice===q.a;t.locked=true;if(ok)t.ok++;hLog("Story",ok,q.q,q.a,choice,t.x.id+':'+t.index);adaptTrack('hub:story:'+t.x.id,ok,"Story");$('hStoryChoices').querySelectorAll('button').forEach(el=>{el.disabled=true;if(el.dataset.storyChoice===q.a)el.classList.add('correct');else if(el===b)el.classList.add('incorrect');});$('hStoryFeedback').hidden=false;$('hStoryFeedback').innerHTML=`<div class="verdict ${ok?'ok':'bad'}">${ok?"✓ Correct":"Learn the correct answer"}</div><b>${esc(q.a)}</b>${adaptNudge("hub:Story:"+t.x.id+':'+t.index,ok,q.q)}<button class="btn primary block" id="hStoryNext">${t.index===2?"Finish story":"Next question"}</button>`;$('hStoryNext').onclick=()=>{t.index++;renderStoryQ();};});
$('hStoryToList').onclick=renderStoryList;
let hTalk=null;
function renderTalkList(){showHub('hubTalks');const p=HUB_DATA.dialogues.filter(x=>{const level=$('wdTalkLevel')?.value||hub().settings.level;return level==='all'||x.level===level;}).sort((a,b)=>adaptScore('hub:talk:'+b.id)-adaptScore('hub:talk:'+a.id)),h=hub();$('hTalkCount').textContent=`${p.length} dialogues · 3 turns each`;$('hTalks').innerHTML=p.map(x=>`<button data-talk="${x.id}" class="hub-list-item"><b>${esc(x.title)}</b><small>${x.level} · ${esc(x.tr)} ${h.conversations[x.id]?`· Best ${h.conversations[x.id].best}/3`:''}</small><span>Speak →</span></button>`).join('');}
$('hTalks').addEventListener('click',e=>{const b=e.target.closest('[data-talk]');if(b)openTalk(b.dataset.talk);});
function openTalk(id){const x=HUB_DATA.dialogues.find(z=>z.id===id);if(!x)return;hTalk={x,index:0,ok:0,locked:false};showHub('hubTalk');$('hTalkTitle').textContent=x.title;$('hTalkSub').textContent=x.level+' · '+x.tr;renderTalkTurn();}
function renderTalkTurn(){const t=hTalk;if(t.index>=t.x.turns.length){markCompleted('conversations',t.x.id,t.ok);$('hTalkScene').innerHTML=`<div class="card"><h3>Conversation complete 🌿</h3><p>${t.ok} / 3 appropriate responses</p><button class="btn primary block" id="hTalkDone">Other conversations</button></div>`;$('hTalkDone').onclick=renderTalkList;return;}
 t.locked=false;const x=t.x.turns[t.index];$('hTalkScene').innerHTML=`<span class="tag">${t.index+1} / 3</span><div class="hub-bubble">${esc(x.line)}</div><div class="row">${say(x.line,"Listen to the German expression")}</div><p class="notice">Choose the most natural response.</p><div id="hTalkAnswers" class="gram-choice-list">${shuffle([x.good,...x.bad]).map(y=>`<button class="grammar-option" data-speech-answer="${esc(y)}">${esc(y)}</button>`).join('')}</div><div class="reveal" id="hTalkFeedback" hidden></div>`;}
$('hTalkScene').addEventListener('click',e=>{const b=e.target.closest('[data-speech-answer]');if(!b||!hTalk||hTalk.locked)return;const t=hTalk,turn=t.x.turns[t.index],choice=b.dataset.speechAnswer,ok=choice===turn.good;t.locked=true;if(ok)t.ok++;hLog("Dialogue Pro",ok,turn.line,turn.good,choice,t.x.id+':'+t.index);adaptTrack('hub:talk:'+t.x.id,ok,"Conversation");$('hTalkAnswers').querySelectorAll('button').forEach(el=>{el.disabled=true;if(el.dataset.speechAnswer===turn.good)el.classList.add('correct');else if(el===b)el.classList.add('incorrect');});$('hTalkFeedback').hidden=false;$('hTalkFeedback').innerHTML=`<div class="verdict ${ok?'ok':'bad'}">${ok?"✓ Good response":"This response sounds more natural"}</div><p><b>${esc(turn.good)}</b></p><p class="notice">${esc(turn.why)}</p>${adaptNudge("hub:Dialogue Pro:"+t.x.id+':'+t.index,ok,turn.why)}<div class="row">${say(turn.good,"Listen to the answer")}<button class="btn primary" style="flex:1" id="hTalkNext">${t.index===2?"Finish":"Continue"}</button></div>`;$('hTalkNext').onclick=()=>{t.index++;renderTalkTurn();};});
$('hTalkToList').onclick=renderTalkList;
let hVerb=null;
function startVerbTyping(){const pool=lvFilter(ACADEMY_DATA.verbs).filter(v=>v.forms?.length===6&&v.forms.every(z=>z?.trim()));const records=pool.map(v=>({...v,id:String(v.n)+'-'+v.v}));const entries=selectBatch(records,'verbtype',hub().settings.size).map(v=>({v,p:Math.random()*6|0}));hVerb={entries,i:0,ok:0,locked:false};showHub('hubVerb');renderVerbTyping();}
function renderVerbTyping(){const t=hVerb;if(t.i>=t.entries.length){$('hVerbBody').innerHTML=`<h2>Verb practice complete</h2><p>${t.ok} / ${t.entries.length} correct</p><button class="btn primary block" id="hVerbAgain">Practise again</button>`;$('hVerbAgain').onclick=startVerbTyping;return;}t.locked=false;const {v,p}=t.entries[t.i];$('hVerbBody').innerHTML=`<span class="tag">${v.level} · ${t.i+1}/${t.entries.length} · ${esc(persons[p])}</span><h2>${esc(v.v)}</h2><p class="muted">${esc(v.tr)}</p><p>Type the <b>${esc(persons[p])}</b> form of this verb.</p><input id="hVerbInput" class="practice-input" placeholder="e.g. gehe" autocomplete="off" autocapitalize="off"><div class="row"><button class="btn soft" id="hVerbHint">Hint</button><button class="btn primary" style="flex:1" id="hVerbCheck">Check answer</button></div><p id="hVerbTip" class="notice"></p><div class="reveal" id="hVerbFeedback" hidden></div>`;$('hVerbInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('hVerbCheck').click();});$('hVerbHint').onclick=()=>{$('hVerbTip').textContent=`Starts with: ${formParts(v,p).slice(0,2)}… · ${esc(v.example||'')}`;};$('hVerbCheck').onclick=()=>{if(t.locked)return;const ans=formParts(v,p),given=$('hVerbInput').value.trim(),ok=normGerman(given)===normGerman(ans);t.locked=true;if(ok)t.ok++;hLog("Verb writing",ok,persons[p]+' + '+v.v,ans,given,v.v+'-'+p);$('hVerbInput').disabled=true;$('hVerbFeedback').hidden=false;$('hVerbFeedback').innerHTML=`<div class="verdict ${ok?'ok':'bad'}">${ok?"✓ Correct":"Let’s look at the answer"}</div><b>${esc(persons[p])} ${esc(ans)}</b>${v.perf?`<p class="notice">Perfekt: ${esc(v.perf)}</p>`:''}${adaptNudge("hub:Verb writing:"+v.v+'-'+p,ok,v.example)}<div class="row">${say(persons[p]+' '+ans,"Listen to the form")}<button class="btn primary" style="flex:1" id="hVerbNext">${t.i===t.entries.length-1?"Finish":"Next verb"}</button></div>`;$('hVerbNext').onclick=()=>{t.i++;renderVerbTyping();};};}
$('hVerbToHub').onclick=()=>{showHub('hub');drawHub();};
let hCloze=null;
const regEscape=t=>String(t).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function gapPool(){const base=ACADEMY_QBANK.filter(q=>q.q.includes('___')).map(q=>({id:'gram-'+q.lesson+'-'+q.idx,level:q.level,prompt:q.q,answer:q.answer,others:q.others,why:q.why}));const added=[];
 for(const d of DATA){if(!d.art||!d.bare||d.bare.includes('/')||d.bare.length>30)continue;const rx=new RegExp('\\b'+regEscape(d.art)+'\\s+'+regEscape(d.bare)+'\\b','i');for(const s of [d.e1,d.e2]){if(!s||s.length>130||!rx.test(s))continue;const transformed=s.replace(rx,'___ '+d.bare);if(!transformed.includes('___'))continue;added.push({id:'word-'+d.i+'-'+added.length,level:d.l,prompt:transformed,answer:d.art,others:['der','die','das'].filter(z=>z!==d.art),why:`${d.w} takes the article ${d.art}.`,wordId:d.i});break;}}
 return [...base,...added];}
const gapBank=gapPool();
function startCloze(){const pool=lvFilter(gapBank);hCloze={entries:selectBatch(pool,'cloze',hub().settings.size),i:0,ok:0,locked:false};showHub('hubCloze');renderCloze();}
function renderCloze(){const t=hCloze;if(t.i>=t.entries.length){$('hClozeBody').innerHTML=`<h2>Well done 🌿</h2><p>${t.ok} / ${t.entries.length} correct</p><button class="btn primary block" id="hClozeAgain">New questions</button>`;$('hClozeAgain').onclick=startCloze;return;}t.locked=false;const q=t.entries[t.i];$('hClozeBody').innerHTML=`<span class="tag">${q.level} · ${t.i+1}/${t.entries.length}</span><h2 class="hub-question">${esc(q.prompt)}</h2><p class="notice">Type the missing word or choose an option below.</p><input id="hGapInput" class="practice-input" autocapitalize="off" autocomplete="off" placeholder="Your answer"><div id="hGapChoices" class="choice-list">${shuffle([...new Set([q.answer,...q.others])]).map(x=>`<button type="button" data-gap-choice="${esc(x)}">${esc(x)}</button>`).join('')}</div><div class="row"><button class="btn soft" id="hGapHint">Hint</button><button class="btn primary" id="hGapCheck" style="flex:1">Check answer</button></div><p class="notice" id="hGapTip"></p><div class="reveal" id="hGapFeedback" hidden></div>`;$('hGapInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('hGapCheck').click();});$('hGapHint').onclick=()=>{$('hGapTip').textContent=q.why;};$('hGapChoices').addEventListener('click',e=>{const b=e.target.closest('[data-gap-choice]');if(b&&!t.locked)$('hGapInput').value=b.dataset.gapChoice;});$('hGapCheck').onclick=()=>{if(t.locked)return;const given=$('hGapInput').value.trim();if(!given){toast("Write or choose an answer first");return;}const ok=normGerman(given)===normGerman(q.answer);t.locked=true;if(ok)t.ok++;hLog("Gap",ok,q.prompt,q.answer,given,q.id);$('hGapInput').disabled=true;$('hGapChoices').querySelectorAll('button').forEach(b=>b.disabled=true);$('hGapFeedback').hidden=false;$('hGapFeedback').innerHTML=`<div class="verdict ${ok?'ok':'bad'}">${ok?"✓ Correct":"Check the correct answer"}</div><b>${esc(q.answer)}</b><p class="notice">${esc(q.why)}</p>${adaptNudge("hub:Gap:"+q.id,ok,q.why+' '+q.prompt)}<button class="btn primary block" id="hGapNext">${t.i+1===t.entries.length?"Finish":"Continue"}</button>`;$('hGapNext').onclick=()=>{t.i++;renderCloze();};};}
$('hClozeToHub').onclick=()=>{showHub('hub');drawHub();};
let hCard=null;
function cardSource(mode='all'){const dict=lvFilter(DATA).map(d=>({id:'w'+d.i,de:d.w,tr:d.t,example:d.e1,lv:d.l,original:d})),custom=hub().extra.filter(x=>hub().settings.level==='all'||x.level===hub().settings.level).map(d=>({id:'p'+d.id,de:d.de,tr:d.tr,example:d.ex,lv:d.level}));return mode==='mine'?custom:mode==='original'?dict:dict.concat(custom);}
function startCards(source='all'){const pool=cardSource(source);if(!pool.length){toast("No words in this group yet");renderPersonal();return;}const cards=selectBatch(pool,'cards-'+source,hub().settings.size);hCard={entries:cards,i:0,front:true,source};showHub('hubCards');renderCard();}
function renderCard(){const t=hCard;if(t.i>=t.entries.length){$('hCardBody').innerHTML=`<h2>Your cards are complete for today 🌿</h2><p>Take your time.</p><button class="btn primary block" id="hCardsRestart">Practise more cards</button>`;$('hCardsRestart').onclick=()=>startCards(t.source);return;}const c=t.entries[t.i],rating=hub().cards[c.id]||{known:0,again:0};$('hCardBody').innerHTML=`<span class="tag">${t.i+1} / ${t.entries.length} · ${esc(c.lv)}</span><div id="hFlipCard" role="button" tabindex="0" class="hub-flip"><span class="label">${t.front?"German":"English"}</span><h2>${esc(t.front?c.de:c.tr)}</h2><small>Tap → ${t.front?"show meaning":"return to word"}</small></div>${t.front?'':`<div class="card"><p><b>${esc(c.de)}</b> — ${esc(c.tr)}</p>${c.example?`<p class="notice">${esc(c.example)}</p>`:''}<div class="row">${say(c.de,"Listen to the word")}${c.example?say(c.example,"Listen to the sentence"):''}</div></div><div class="row"><button class="btn soft" id="hCardAgain">Show again</button><button class="btn primary" id="hCardKnown" style="flex:1">I know it</button></div>`}<span class="muted-small">This card: ${rating.known} times remembered · ${rating.again} reviews</span>`;const flip=()=>{t.front=!t.front;renderCard();};$('hFlipCard').onclick=flip;$('hFlipCard').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip();}};if(!t.front){$('hCardKnown').onclick=()=>rateCard(true);$('hCardAgain').onclick=()=>rateCard(false);}}
function rateCard(ok){const t=hCard,c=t.entries[t.i],x=hub().cards[c.id]||(hub().cards[c.id]={known:0,again:0});if(ok)x.known++;else x.again++;x.last=today();adaptTrack('card:'+c.id,ok,"Card");save();if(!ok){const m=hub().mistakes["Card|"+c.id]||(hub().mistakes["Card|"+c.id]={kind:"Card",prompt:c.tr,correct:c.de,count:0,right:0,when:today()});m.count++;m.right=0;m.when=today();save();}t.i++;t.front=true;renderCard();}
$('hCardsToHub').onclick=()=>{showHub('hub');drawHub();};
$('hCardsSource').onchange=e=>startCards(e.target.value);
let hRepeat=null;
function startRepeat(){const list=lvFilter(DATA).filter(d=>d.e1&&tok(d.e1).length>=3&&tok(d.e1).length<=12).map(d=>({id:d.i,de:d.e1,tr:d.e1t}));hRepeat={entries:selectBatch(list,'repeat',hub().settings.size),i:0};showHub('hubRepeat');renderRepeat();}
function renderRepeat(){const t=hRepeat;if(t.i>=t.entries.length){$('hRepeatBody').innerHTML=`<h2>Listening practice complete 🌿</h2><p>Listen to more sentences whenever you like.</p><button class="btn primary block" id="hRepeatAgain">Practise again</button>`;$('hRepeatAgain').onclick=startRepeat;return;}const c=t.entries[t.i];$('hRepeatBody').innerHTML=`<span class="tag">${t.i+1}/${t.entries.length}</span><h2>${esc(c.de)}</h2><p class="notice">${esc(c.tr||'')}</p><button class="btn primary" id="hRepeatAudio">🔊 Listen in German</button><button class="btn soft" id="hRepeatMic">🎙️ Try the microphone</button><p class="notice" id="hRepeatMicStatus">The microphone is optional. You can repeat aloud and assess your own answer.</p><div class="row"><button class="btn soft" id="hRepeatAgainWord">Practise again</button><button class="btn primary" style="flex:1" id="hRepeatKnown">I could say it</button></div>`;$('hRepeatAudio').onclick=()=>speak(c.de);$('hRepeatMic').onclick=()=>{const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Rec){$('hRepeatMicStatus').textContent="Speech recognition is unavailable in this browser. You can still repeat aloud.";return;}try{const r=new Rec();r.lang='de-DE';r.interimResults=false;r.maxAlternatives=1;$('hRepeatMicStatus').textContent="Listening…";r.onresult=e=>{const heard=e.results[0][0].transcript;const equal=normGerman(heard)===normGerman(c.de);$('hRepeatMicStatus').textContent=`Heard: “${heard}” · ${equal?"The words matched.":"The words sounded different. Try again slowly."} (This checks the words, not your pronunciation.)`;};r.onerror=e=>{$('hRepeatMicStatus').textContent="Speech recognition unavailable ("+e.error+"). You can continue manually.";};r.start();}catch(e){$('hRepeatMicStatus').textContent="Microphone unavailable. You can still repeat aloud.";}};$('hRepeatKnown').onclick=()=>repeatRate(true);$('hRepeatAgainWord').onclick=()=>repeatRate(false);}
function repeatRate(ok){const t=hRepeat,c=t.entries[t.i];hLog("Spoken repetition",ok,c.tr||c.de,c.de,ok?"Self-assessment: correct":"I’ll practise again",'repeat-'+c.id);adaptTrack('repeat:'+c.id,ok,"Spoken repetition");t.i++;renderRepeat();}
$('hRepeatToHub').onclick=()=>{showHub('hub');drawHub();};
let editPersonal=null;
function renderPersonal(){showHub('hubPersonal');$('myLevel').value=content.levels.includes(hub().settings.level)?hub().settings.level:'A1';renderPersonalList();}
function renderPersonalList(){const custom=hub().extra;const q=fold($('mySearch').value||'');$('myTotal').textContent=custom.length+" words";$('myList').innerHTML=custom.filter(x=>fold(x.de+' '+x.tr+' '+x.ex).includes(q)).map(x=>`<div class="hub-list-item"><b>${esc(x.de)}</b><small>${esc(x.tr)} · ${esc(x.level)} ${x.ex?'· '+esc(x.ex):''}</small><div class="row"><button class="btn soft" data-mine-edit="${esc(x.id)}">Düzenle</button><button class="btn soft" data-mine-remove="${esc(x.id)}">Sil</button>${say(x.de,"Listen to the word")}</div></div>`).join('')||"<p class=\"notice\">No words yet. Add your first word.</p>";$('myFlash').disabled=custom.length===0;$('myFlash').textContent=`Practise my words (${custom.length})`;}
$('mySearch').oninput=renderPersonalList;
$('mySave').onclick=()=>{const de=$('myDE').value.trim(),tr=$('myTR').value.trim(),level=$('myLevel').value,ex=$('myEx').value.trim();if(!de||!tr){toast("Enter the German word and its English meaning");return;}const h=hub();if(editPersonal){const item=h.extra.find(x=>x.id===editPersonal);if(item)Object.assign(item,{de,tr,level,ex});}else{h.extra.push({id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),de,tr,level,ex});}save();editPersonal=null;for(const id of ['myDE','myTR','myEx'])$(id).value='';$('mySave').textContent="Save word";$('myCancel').hidden=true;renderPersonalList();toast("Word saved");};
$('myList').addEventListener('click',e=>{const ed=e.target.closest('[data-mine-edit]');if(ed){const x=hub().extra.find(v=>v.id===ed.dataset.mineEdit);if(!x)return;editPersonal=x.id;$('myDE').value=x.de;$('myTR').value=x.tr;$('myEx').value=x.ex||'';$('myLevel').value=x.level;$('mySave').textContent="Save changes";$('myCancel').hidden=false;window.scrollTo(0,0);return;}const del=e.target.closest('[data-mine-remove]');if(del){if(del.dataset.armed==='1'){hub().extra=hub().extra.filter(x=>x.id!==del.dataset.mineRemove);save();renderPersonalList();}else{del.dataset.armed='1';del.textContent="Delete? Tap again";}}});
$('myCancel').onclick=()=>{editPersonal=null;for(const id of ['myDE','myTR','myEx'])$(id).value='';$('mySave').textContent="Save word";$('myCancel').hidden=true;};
$('myFlash').onclick=()=>{startCards('mine');$('hCardsSource').value='mine';};
$('myToHub').onclick=()=>{showHub('hub');drawHub();};
function renderMistakes(){showHub('hubMistakes');const list=Object.entries(hub().mistakes).sort((a,b)=>b[1].count-a[1].count);const legacy=DATA.filter(d=>isWrong(d.i));$('hMistakeCounts').textContent=`${list.length} mistakes in new modes · ${legacy.length} earlier vocabulary mistakes`;$('hMistakeList').innerHTML=list.map(([id,m])=>`<div class="training-card"><div class="row" style="justify-content:space-between"><span class="tag">${esc(m.kind)}</span><span class="muted-small">${m.count} mistakes · ${esc(m.when||'')}</span></div><b>${esc(m.prompt)}</b><div class="notice">Correct: <b>${esc(m.correct)}</b></div>${m.given?`<p class="notice">Your answer: ${esc(m.given)}</p>`:''}<button class="btn soft" data-mark-remember="${esc(id)}">I know it now ✓</button></div>`).join('')||"<p class=\"notice\">No mistakes in the new exercises yet. 🌿</p>";$('hLegacyWrong').innerHTML=legacy.slice(0,30).map(d=>`<div class="hub-list-item"><b>${wordHTML(d)}</b><small>${esc(d.t)}</small>${say(d.w)}</div>`).join('')||"<p class=\"notice\">No mistakes in earlier word quizzes.</p>";}
$('hMistakeList').addEventListener('click',e=>{const b=e.target.closest('[data-mark-remember]');if(!b)return;const m=hub().mistakes[b.dataset.markRemember];if(!m)return;if(b.dataset.armed==='1'){delete hub().mistakes[b.dataset.markRemember];save();renderMistakes();}else{b.dataset.armed='1';b.textContent="Tap again to confirm";}});
$('hMistakeReview').onclick=()=>adaptReviewNext();
$('hMistakeToHub').onclick=()=>{showHub('hub');drawHub();};
function renderGuide(){showHub('hubGuide');drawGuide();}
const guideExtra=content.guideExtra;
function drawGuide(){const q=fold($('hubGuideSearch').value||'');const all=GRAMMAR_LESSONS.filter(l=>fold(l.title+' '+l.intro+' '+l.samples.map(s=>s.join(' ')).join(' ')).includes(q));$('hubGuideLessons').innerHTML=all.map(l=>`<details class="hub-details"><summary><strong>${esc(l.icon)} ${esc(l.title)}</strong><small>${esc(l.lv)}</small></summary><div class="hub-detail-inside"><p class="notice">${esc(l.intro)}</p>${l.samples.map(s=>`<div class="lesson-example"><b>${esc(s[0])}</b><span>${esc(s[1])}</span>${say(s[0])}</div>`).join('')}<button class="btn soft" data-hub-lesson="${esc(l.id)}">Practise this lesson</button></div></details>`).join('')||"<p class=\"notice\">No grammar lessons match your search.</p>";$('hubGuideTables').innerHTML=guideExtra.filter(l=>fold(l.title+' '+l.intro+' '+l.rows.flat().join(' ')).includes(q)).map(l=>`<details class="hub-details"><summary><b>${esc(l.title)}</b></summary><div class="hub-detail-inside"><p>${esc(l.intro)}</p><div class="hub-grammar-grid">${l.rows.map(r=>`<div>${esc(r[0])}</div><b>${esc(r[1])}</b>`).join('')}</div></div></details>`).join('');}
$('hubGuideSearch').oninput=drawGuide;
$('hubGuideLessons').addEventListener('click',e=>{const b=e.target.closest('[data-hub-lesson]');if(b)openLesson(b.dataset.hubLesson);});
$('hGuideToHub').onclick=()=>{showHub('hub');drawHub();};
/* Add errors from the existing games and Akademi into the same notebook without altering their records. */
const hRecord=recordExtended;
recordExtended=function(d,ok,points,mode,dir){hRecord(d,ok,points,mode,dir);if(!ok&&d){const h=hub(),key='Önceki mod|'+mode+'-'+d.i;const m=h.mistakes[key]||(h.mistakes[key]={kind:MODE_LABELS[mode]||mode,prompt:d.t,correct:d.w,count:0,right:0,when:today()});m.count++;m.when=today();save();}};
const hGrammar=registerGrammar;
registerGrammar=function(ok){hGrammar(ok);const q=A?.qs?.[A.i];if(!ok&&q){const h=hub(),key="Grammar|"+A.lesson.id+'-'+A.i,m=h.mistakes[key]||(h.mistakes[key]={kind:"Grammar",prompt:q.q,correct:q.answer,count:0,right:0,when:today()});m.count++;m.when=today();save();}};
function updateStudyHome(){const h=hub(),label={mix:"A bit of everything",word:"Vocabulary practice",grammar:"Grammar practice",story:"Mini story",talk:"Speaking practice"};$('hubHomeCurrent').textContent=`Your choice: ${label[h.settings.kind]||"A bit of everything"}`;document.querySelectorAll('[data-study-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.studyKind===h.settings.kind)));}
$('hubChoiceModes').addEventListener('click',e=>{const b=e.target.closest('[data-study-kind]');if(!b)return;hub().settings.kind=b.dataset.studyKind;save();updateStudyHome();});
$('hubStartToday').onclick=()=>{const kind=hub().settings.kind;if(kind==='mix'){const options=['cards','cloze','stories','verbtype','talk'];hubGo(options[Math.random()*options.length|0]);}else if(kind==='word')startCards();else if(kind==='grammar')startCloze();else if(kind==='story')renderStoryList();else if(kind==='talk')renderTalkList();};
const hOriginalRender=renderHome;
renderHome=function(){hOriginalRender();updateStudyHome();adaptHome();};
/* Even old backups import safely: hub() initializes new fields lazily. */
const hOriginalImport=importProgress;
importProgress=function(raw){hOriginalImport(raw);hub();adaptive();save();updateStudyHome();adaptHome();};



/* === Akıllı Öğrenme: shared memory inside the legacy progress === */
const ADAPT_PLANS={relaxed:[7,2,1],balanced:[5,3,2],focused:[2,6,2]};
const ADAPT_TITLES={relaxed:"Relaxed",balanced:"Balanced",focused:"Focus on mistakes"};
function adaptive(){
 if(!S.adaptive||typeof S.adaptive!=='object'||Array.isArray(S.adaptive))S.adaptive={version:1,mode:'balanced',skills:{},recent:[]};
 let a=S.adaptive;
 if(!ADAPT_PLANS[a.mode])a.mode='balanced';
 if(!a.skills||typeof a.skills!=='object'||Array.isArray(a.skills))a.skills={};
 if(!Array.isArray(a.recent))a.recent=[];
 return a;
}
function adaptRecord(key){return adaptive().skills[key]||null;}
function adaptFamilyKey(d){return 'word:'+d.i+':all';}
function adaptWordKey(d,mode){return 'word:'+d.i+':'+(mode||'mix');}
function adaptTrack(key,ok,subject='',parent=''){
 const a=adaptive(),ts=Date.now();
 const x=a.skills[key]||(a.skills[key]={n:0,ok:0,bad:0,streak:0,due:0,last:0,subject:''});
 x.n++;x.last=ts;x.subject=subject||x.subject;
 if(ok){x.ok++;x.streak=Math.min(6,(x.streak||0)+1);x.due=ts+[0,1,3,7,14,30,30][x.streak]*DAY;}
 else{x.bad++;x.streak=0;x.due=ts;}
 if(parent&&parent!==key){
   const p=a.skills[parent]||(a.skills[parent]={n:0,ok:0,bad:0,streak:0,due:0,last:0,subject:''});
   p.n++;p.last=ts;p.subject=subject||p.subject;
   if(ok){p.ok++;p.streak=Math.min(6,(p.streak||0)+1);p.due=ts+[0,1,3,7,14,30,30][p.streak]*DAY;}
   else{p.bad++;p.streak=0;p.due=ts;}
 }
 a.recent.push(key);if(a.recent.length>90)a.recent.splice(0,a.recent.length-90);
 save();
}
function adaptStatus(key){
 const x=adaptRecord(key), now=Date.now();
 if(!x||!x.n)return 'new';
 if(x.streak===0 || (x.bad>0 && x.streak<2))return x.due<=now?'wrong':'waiting';
 if(x.due<=now)return 'review';
 return 'waiting';
}
function adaptScore(key){
 const x=adaptRecord(key),status=adaptStatus(key), a=adaptive();
 const recent=a.recent.slice(-18).includes(key)?-.9:0;
 if(status==='wrong')return 6+(x?Math.min(4,x.bad*.4):0)+Math.random()+recent;
 if(status==='review')return 3.5+(x?Math.min(2,(Date.now()-x.due)/DAY*.12):0)+Math.random()+recent;
 if(status==='new')return 2+Math.random()+recent;
 return Math.random()*.25+recent;
}
function adaptBatch(pool,limit,keyFn){
 const list=pool.slice();if(!list.length)return [];
 const a=adaptive(), ratio=ADAPT_PLANS[a.mode], count=Math.min(limit,list.length);
 const all=list.map(x=>({x,k:keyFn(x)}));
 const rank=g=>g.sort((x,y)=>adaptScore(y.k)-adaptScore(x.k));
 const kinds={wrong:rank(all.filter(v=>adaptStatus(v.k)==='wrong')),
              new:rank(all.filter(v=>adaptStatus(v.k)==='new')),
              review:rank(all.filter(v=>adaptStatus(v.k)==='review')),
              waiting:rank(all.filter(v=>adaptStatus(v.k)==='waiting'))};
 const alloc=[['new',ratio[0]],['wrong',ratio[1]],['review',ratio[2]]];
 const take=[],used=new Set();
 for(const [kind,parts] of alloc){
    const quota=Math.round(count*parts/10);
    for(const item of kinds[kind].slice(0,quota)){if(!used.has(item.k)){take.push(item);used.add(item.k);}}
 }
 // Fill spare slots with due weaknesses first, then unseen, and only then already learned items.
 for(const kind of ['wrong','review','new','waiting'])for(const item of kinds[kind]){
   if(take.length>=count)break;
   if(!used.has(item.k)){take.push(item);used.add(item.k);}
 }
 return shuffle(take.slice(0,count).map(v=>v.x));
}
function adaptInSession(queue,key,entry,max=3){
 if(!queue||!key||entry._adaptRetry)return false;
 const mark=queue._adaptRetries||(queue._adaptRetries=new Set());
 if(mark.has(key)||mark.size>=max)return false;
 mark.add(key);
 queue.push({...entry,_adaptRetry:true});return true;
}
function adaptRule(text){
 const s=String(text||'').toLowerCase();
 if(/\b(mit|bei|nach|aus|von|zu)\b/.test(s))return "Mit, bei, nach, aus, von and zu take the dative.";
 if(/\b(für|ohne|durch|gegen|um)\b/.test(s))return "Für, ohne, durch, gegen and um take the accusative.";
 if(/\b(weil|dass|wenn)\b/.test(s))return "In a weil, dass or wenn clause, the conjugated verb comes last.";
 if(/\b(gegangen|gefahren|gekommen|gemacht|gelernt|gearbeitet)\b/.test(s))return "Perfekt uses a conjugated form of haben or sein and a past participle.";
 return '';
}
function adaptNudge(key,ok,context=''){
 const x=adaptRecord(key), extra=!ok?adaptRule(context):'';
 const line=ok?(x?.streak>=3?"You remember this well. The interval before your next review will grow.":"Well done. You’ll review this again another day."):"This question will return in a later session.";
 return `<p class="adapt-note">🧠 ${esc(line)}${extra?`<br>${esc(extra)}`:''}</p>`;
}
function adaptCount(){return Object.entries(adaptive().skills).filter(([k,x])=>x.n&&x.streak===0&&!k.endsWith(':all')&&!k.startsWith('grammar-topic:')&&!/^verb:[^:]+$/.test(k)).length;}
function adaptHome(){
 const el=$('adaptCount');if(el)el.textContent=adaptCount()+" items to revisit · "+Object.entries(adaptive().skills).filter(([k,x])=>x.n&&x.streak>=3&&!k.endsWith(':all')&&!k.startsWith('grammar-topic:')&&!/^verb:[^:]+$/.test(k)).length+" strong items";
 const active=adaptive().mode;
 document.querySelectorAll('#adaptMode button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.adapt===active)));
 const w=DATA.filter(d=>isWrong(d.i)).length;const smart=adaptCount();$('cWrong').textContent=w+" words"+(smart?' · '+smart+" other mistakes":'');
}
const adaptRoot=$('adaptMode');
if(adaptRoot)adaptRoot.addEventListener('click',e=>{const b=e.target.closest('[data-adapt]');if(!b)return;adaptive().mode=b.dataset.adapt;save();adaptHome();toast("Study mode: "+ADAPT_TITLES[adaptive().mode]);});
$('btnWrong').onclick=()=>adaptReviewNext();
$('btnReview').onclick=()=>adaptReviewNext();
function adaptReviewNext(){
 const weak=Object.entries(adaptive().skills)
  .filter(([k,v])=>v.n&&v.streak===0&&v.due<=Date.now()&&!k.endsWith(':all')&&!k.startsWith('grammar-topic:')&&!/^verb:[^:]+$/.test(k))
  .sort((x,y)=>y[1].bad-x[1].bad);
 const key=weak.length?weak[0][0]:'';
 if(key.startsWith("hub:Gap:")){startCloze();return;}
 if(key.startsWith('grammar:')){const lesson=key.split(':')[1];if(GRAMMAR_LESSONS.some(x=>x.id===lesson)){openLesson(lesson);return;}}
 if(key.startsWith('verb-')||key.startsWith("hub:Verb writing:")){startVerbTyping();return;}
 if(key.startsWith('builder:')){builderStart();return;}
 if(key.startsWith("hub:Story:")){renderStoryList();return;}
 if(key.startsWith("hub:Dialogue Pro:")||key.startsWith('hub:talk:')){renderTalkList();return;}
 const wrong=DATA.filter(d=>isWrong(d.i)||adaptStatus(adaptFamilyKey(d))==='wrong');
 if(wrong.length){start(wrong,{title:"Review mistakes",len:Math.min(10,wrong.length),dir:S.set.dir,prio:true});return;}
 const pending=dueWords();if(pending.length){reviewNow();return;}
 const dueOther=Object.entries(adaptive().skills).find(([k,v])=>v.n&&v.due<=Date.now()&&v.streak>0&&!k.endsWith(':all'))?.[0]||'';
 if(dueOther.startsWith("hub:Gap:")){startCloze();return;}
 if(dueOther.startsWith('grammar:')){openLesson(dueOther.split(':')[1]);return;}
 if(dueOther.startsWith("hub:Verb writing:")){startVerbTyping();return;}
 if(dueOther.startsWith('builder:')){builderStart();return;}
 if(dueOther.startsWith('word:')){const n=+dueOther.split(':')[1];if(DATA[n]){start([DATA[n]],{title:"Scheduled review",len:1,dir:S.set.dir,prio:true});return;}}
 toast("No difficult questions are due. Try a new question.");
}


/* --- Wide desktop chrome. Layout stays unchanged. --- */
const wdNavTo=(target)=>{
  if(target==='home')show('home');
  else if(target==='daily')beginDaily();
  else if(target==='review')adaptReviewNext();
  else if(target==='hub'){showHub('hub');drawHub();}
  else if(target==='stories')renderStoryList();
  else if(target==='talk')renderTalkList();
  else if(target==='builder')builderStart();
  else if(target==='academy'){show('academy');renderAcademy();}
  else if(target==='verbs'){show('verbs');renderVerbs();}
  else if(target==='dict'){show('dict');renderDict();}
  else if(target==='mistakes')renderMistakes();
  else if(target==='progress'){show('progress');renderProgress();}
  else if(target==='settings'){show('settings');renderSettings();}
  wdSyncNav();
};
function wdSyncNav(){
  const current=SCREENS.find(id=>!$(id).hidden)||'home';
  const map={home:'home',quiz:'home',result:'home',practice:'daily',practiceResult:'daily',hub:'hub',hubStories:'stories',hubStory:'stories',hubTalks:'talk',hubTalk:'talk',hubVerb:'hub',hubCloze:'hub',hubCards:'hub',hubRepeat:'hub',hubPersonal:'hub',hubMistakes:'mistakes',hubGuide:'academy',academy:'academy',lesson:'academy',grammarPlay:'academy',grammarDone:'academy',verbs:'verbs',verbPlay:'verbs',cases:'academy',builder:'builder',builderEnd:'builder',dict:'dict',progress:'progress',analytics:'progress',settings:'settings'};
  document.querySelectorAll('.wd-side [data-go]').forEach(b=>{
    const active=b.dataset.go===map[current];b.classList.toggle('active',active);
    if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  });
}
function wdUpdateRail(){
  const root=$('wdLearn');if(!root)return;
  const learnedCount=DATA.filter(d=>learned(d.i)).length;
  root.textContent=learnedCount+' / '+DATA.length;
  $('wdPercent').textContent=Math.round(100*learnedCount/DATA.length)+'%';
  $('wdProgressBar').style.width=(100*learnedCount/DATA.length)+'%';
  $('wdToday').textContent=daily(today()).answers;
  $('wdStreak').textContent=streak();
  const smartDue=Object.entries(adaptive().skills).filter(([k,v])=>v.n&&v.due<=Date.now()&&!k.endsWith(':all')&&!k.startsWith('grammar-topic:')&&!/^verb:[^:]+$/.test(k)).length;
  const dueN=dueWords().length+smartDue;
  $('wdDue').textContent=dueN;
  const wdReview=document.querySelector('.wd-insights [data-go="review"]');
  wdReview.disabled=dueN===0;
  wdReview.firstChild.textContent=dueN?"Review ":"No review due ";
  $('wdDate').textContent=new Intl.DateTimeFormat("en-GB",{weekday:'long',day:'numeric',month:'long'}).format(new Date()).toLocaleUpperCase("en-GB");
  const daysFromEpoch=Math.floor(new Date().setHours(12,0,0,0)/86400000);
  const w=DATA[((daysFromEpoch%DATA.length)+DATA.length)%DATA.length];
  $('wdWordDe').textContent=w.w;
  $('wdWordTr').textContent=w.t;
  $('wdWordLv').textContent=w.l;
  $('wdSpeak').dataset.say=w.w;
  wdSyncNav();
}
document.querySelectorAll('.wd-side [data-go],.wd-insights [data-go]').forEach(b=>b.addEventListener('click',()=>wdNavTo(b.dataset.go)));
$('wdSpeak').addEventListener('click',()=>speak($('wdSpeak').dataset.say,'de-DE'));
const wdOldShow=show;
show=function(id){wdOldShow(id);wdUpdateRail();};
const wdOldSave=save;
let wdUpdateRequested=false;
save=function(){wdOldSave();if(!wdUpdateRequested){wdUpdateRequested=true;requestAnimationFrame(()=>{wdUpdateRequested=false;wdUpdateRail();});}};
wdUpdateRail();


/* --- WortDuell Sade Anlam Testi integration --- */
/* WortDuell Sade: existing study screens/data/storage are retained. */
const WD_KINDS=[
  {key:'all',label:"All",test:()=>true},
  {key:'Nomen',label:"Nouns",test:d=>d.k==='Nomen'},
  {key:'Verb',label:"Verbs",test:d=>d.k==='Verb'},
  {key:'Adjektiv',label:"Adjectives",test:d=>d.k==='Adjektiv'},
  {key:'Adverb',label:"Adverbs",test:d=>d.k==='Adverb'},
  {key:'Präposition',label:"Prepositions",test:d=>d.k==='Präposition'},
  {key:'Konjunktion',label:"Conjunctions",test:d=>d.k==='Konjunktion'},
  {key:'Pronomen',label:"Pronouns",test:d=>d.k==='Pronomen'},
  {key:'Fragewort',label:"Question words",test:d=>d.k==='Fragewort'},
  {key:'Zahl',label:"Numbers",test:d=>d.k==='Zahl'},
  {key:'Partikel',label:"Particles",test:d=>d.k==='Partikel'},
  {key:'Ausdruck',label:"Expressions",test:d=>d.k==='Ausdruck'},
  {key:'time',label:"Time & calendar",test:d=>['Uhrzeit & Zeitangaben','Tage, Monate & Jahreszeiten','Häufigkeit'].includes(d.c)},
  {key:'frequency',label:"Frequency",test:d=>d.c==='Häufigkeit'},
  {key:'connectors',label:"Connect sentences",test:d=>d.c==='Konjunktionen'||d.k==='Konjunktion'},
  {key:'other',label:"Other",test:d=>!['Nomen','Verb','Adjektiv','Präposition','Ausdruck','Adverb','Konjunktion','Pronomen','Fragewort','Zahl','Partikel'].includes(d.k)}
];
const WD_LABELS={Nomen:"Noun",Verb:"Verb",Adjektiv:"Adjective",Präposition:"Preposition",Ausdruck:"Expression",Adverb:"Adverb",Konjunktion:"Conjunction",Pronomen:"Pronoun",Fragewort:"Question word",Zahl:"Number",Partikel:"Particle"};
const wdPref=()=>{
  if(!S.sade||typeof S.sade!=='object'||Array.isArray(S.sade))S.sade={group:'kind',kind:'all',topic:'all',level:'all',count:20};
  return S.sade;
};
const wdRelevant=d=>{
 const p=wdPref();return (p.level==='all'||d.l===p.level)&&(p.group==='topic'?(p.topic==='all'||d.c===p.topic):(WD_KINDS.find(v=>v.key===p.kind)||WD_KINDS[0]).test(d));
};
const wdFiltered=()=>DATA.filter(wdRelevant);
function wdRenderPicker(){
 const p=wdPref();p.level=levelChoice(p.level,vocabularyLevels);if(p.kind==='other'&&!DATA.some(d=>WD_KINDS.find(k=>k.key==='other').test(d)))p.kind='all';
 const modes=$('wdCategoryPills');if(!modes)return;
 $('wdGroupKind').setAttribute('aria-pressed',String(p.group==='kind'));
 $('wdGroupTopic').setAttribute('aria-pressed',String(p.group==='topic'));
 $('wdKindsPanel').hidden=p.group!=='kind';$('wdTopicsPanel').hidden=p.group!=='topic';
 modes.innerHTML=WD_KINDS.filter(x=>x.key!=='other'||DATA.some(x.test)).map(x=>`<button type="button" class="wd-filter-pill" data-wd-kind="${x.key}" aria-pressed="${p.kind===x.key}">${x.label} <small>${DATA.filter(d=>(p.level==='all'||d.l===p.level)&&x.test(d)).length}</small></button>`).join('');
 $('wdTopicPicker').value=p.topic;$('wdLevelPicker').value=p.level;$('wdCountPicker').value=String([5,10,20,30,40,50].includes(Number(p.count))?p.count:20);
 const n=wdFiltered().length;
 $('wdStudySummary').textContent=(p.group==='kind'?(WD_KINDS.find(v=>v.key===p.kind)?.label||"Word"):(p.topic==='all'?"All topics":TOPIC_TR[p.topic]||p.topic))+' · '+n+" words · "+(p.level==='all'?allLevelLabel(vocabularyLevels):p.level);
 $('wdBeginLearn').disabled=n===0;
}
const wdEscapeRx=t=>String(t).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function wdVerbContext(d){
 const v=ACADEMY_DATA.verbs.find(x=>fold(x.vocabularyWord||x.v)===fold(d.w));
 const forms=v&&v.forms&&v.forms.length===6?v.forms.map((_,i)=>formParts(v,i)):null;
 const m=String(d.f||'').match(/(?:^|[,;]\s*)(hat|ist|haben|sind)\s+([^,;]+)/i);
 const perfect=(v?.perf|| (m?m[1]+' '+m[2]:'')).trim();
 return {forms,perfect,source:v};
}
// Only label an example as a past-tense sentence if its actual grammar supports that label.
// Short, reviewed A1/A2 examples; other verbs keep their exact source sentences.
const WD_TENSE_EXAMPLES=content.WD_TENSE_EXAMPLES;
function wdTense(text){
 const s=String(text||'');
 if(/\b(?:habe|hast|hat|haben|habt|bin|bist|ist|sind|seid)\b.{0,75}\b(?:ge[\p{L}]+(?:en|t)|[\p{L}]+(?:iert|gangen|kommen|worden))\b/iu.test(s))return "Perfekt example";
 if(/\b(?:war|warst|waren|wart|hatte|hattest|hatten|konnte|konnte|musste|wollte)\b/i.test(s))return "Past-tense example";
 if(/\b(?:morgen|nächste Woche|übermorgen)\b/i.test(s))return "Future meaning";
 return "Example sentence";
}
function wdExampleHTML(de,tr,n){
 return `<div class="wd-example"><div class="wd-example-top"><span class="wd-eyebrow">${wdTense(de)} ${n}</span>${say(de,"Listen to the sentence")}</div><div class="wd-example-de">${esc(de)}</div>${tr?`<div class="wd-example-tr">${esc(tr)}</div>`:''}</div>`;
}
function wdCloze(d){
 const wanted=[];
 const bare=String(d.bare||d.w.replace(/^(der|die|das)\s+/,'')).trim();
 if(d.k==='Nomen'){
    wanted.push(bare);
    const plural=(d.f||'').match(/^die\s+([\p{L}-]+)/iu);
    if(plural)wanted.push(plural[1]);
 } else if(d.k==='Verb'){
    const info=wdVerbContext(d);
    wanted.push(d.w,...(info.forms||[]).flatMap(x=>String(x).split(/\s+/)));
    const root=d.w.replace(/en$|n$/,'');
    if(root.length>=3)wanted.push(root+'e',root+'st',root+'t',root+'en',root+'te');
 }else{
    wanted.push(d.w);
    if(d.k==='Adjektiv')wanted.push(...['e','en','em','er','es'].map(x=>d.w+x));
 }
 const sorted=[...new Set(wanted.filter(x=>x&&x.length>2))].sort((a,b)=>b.length-a.length);
 for(const [text,tr] of [[d.e1,d.e1t],[d.e2,d.e2t]]){
   if(!text)continue;
   for(const token of sorted){
     const re=new RegExp('(^|[^\\p{L}\\p{N}])('+wdEscapeRx(token)+')(?=$|[^\\p{L}\\p{N}])','iu');
     const match=re.exec(text);
     if(!match)continue;
     const answer=match[2];
     // Avoid nonsense fragments when a separable verb is represented by only the prefix.
     if(d.k==='Verb'&&['ein','aus','ab','an','auf','mit','zu','vor','weg'].includes(answer.toLowerCase()))continue;
     return {question:text.slice(0,match.index+match[1].length)+'___'+text.slice(match.index+match[1].length+answer.length),answer,translation:tr||'',inSentence:true};
   }
 }
 return {question:'___ → '+d.t,answer:d.w,translation:"Write the German expression.",inSentence:false};
}
function wdChoiceOptions(d){
 const pools=[DATA.filter(x=>x.k===d.k&&x.i!==d.i),DATA.filter(x=>x.i!==d.i)];
 const seen=new Set([fold(d.t)]),results=[d.t];
 for(const pool of pools){for(const x of shuffle(pool.slice())){
  const k=fold(x.t);if(seen.has(k))continue;seen.add(k);results.push(x.t);if(results.length===4)break;
 }if(results.length===4)break;}
 return shuffle(results);
}
function wdReverseOptions(d){
 const pools=[DATA.filter(x=>x.k===d.k&&x.i!==d.i),DATA.filter(x=>x.i!==d.i)];
 const seen=new Set([fold(d.w)]),choices=[d.w];
 for(const pool of pools){for(const item of shuffle(pool.slice())){
  const key=fold(item.w);if(seen.has(key))continue;
  seen.add(key);choices.push(item.w);if(choices.length===4)break;
 }if(choices.length===4)break;}
 return shuffle(choices);
}
function wdResetCard(){
 const r=hCard;r.guess=null;r.guessOptions=null;r.exerciseWrong=false;r.mode='cloze';r.exResult=null;
 r.options=null;r.cloze=null;r.tokens=null;r.shuffled=null;r.selected=[];
}
function wdRevealGuess(given){
 const t=hCard;if(!t?.rich||t.guess||t.i>=t.entries.length)return;
 const d=t.entries[t.i].original,ok=normGerman(given)===normGerman(d.t);
 t.guess={ok,given:String(given)};t.exerciseWrong=false;markMastery(d.i,'recognition',ok);
 // Each first attempt becomes an actual learning event, not an untracked reveal.
 hLog("Word · First meaning",ok,d.w,d.t,given,d.i+':guess');
 if(!ok)adaptInSession(t.entries,'wd-meaning:'+d.i,t.entries[t.i],2);
 t.mode='cloze';t.exResult=null;t.options=null;t.cloze=null;t.tokens=null;t.selected=[];
 save();wdRichCard();
}
function wdWordExercise(d){
 const r=hCard,mode=r.mode||'choice';
 const feedback=r.exResult;
 if(mode==='choice'){
  if(!r.options)r.options=wdReverseOptions(d);
  return `<div class="wd-task-heading"><b>“${esc(d.t)}” in German?</b><span class="muted-small">4 choices · reverse direction</span></div><div class="wd-choices">${r.options.map((v,i)=>`<button type="button" class="wd-answer${feedback?(v===d.w?' correct':(feedback.given===v?' incorrect':'')):''}" data-wd-choice="${i}" ${feedback?'disabled':''}>${esc(v)}</button>`).join('')}</div>`;
 }
 if(mode==='cloze'){
   if(!r.cloze)r.cloze=wdCloze(d);
   const q=r.cloze;
   return `<div class="wd-task-heading"><b>${q.inSentence?"Fill in the missing word":"Recall the German expression"}</b><span class="muted-small">Learn by writing</span></div><div class="wd-gap-sentence">${esc(q.question)}</div>${q.inSentence&&q.translation?`<div class="muted-small">${esc(q.translation)}</div>`:''}<div class="wd-answer-write"><input type="text" id="wdTypeAnswer" class="practice-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer" ${feedback?'disabled':''} value="${feedback?esc(feedback.given):''}"><button type="button" class="btn primary" data-wd-check ${feedback?'disabled':''}>Check answer</button></div>`;
 }
 const text=(d.e1||d.e2||'').trim();
 if(!r.tokens){r.tokens=(text.match(/\S+/g)||[]).map((v,i)=>({word:v,id:i}));r.shuffled=shuffle(r.tokens.slice());r.selected=[];}
 const selected=new Set(r.selected||[]);
 return `<div class="wd-task-heading"><b>Build the example sentence</b><span class="muted-small">Word order</span></div><p class="muted-small">${esc(d.e1t||d.e2t||'')}</p><div class="wd-tiles-selected">${r.selected.map(id=>`<button class="wd-token wd-token-chosen" data-wd-undo="${id}" ${feedback?'disabled':''}>${esc(r.tokens[id].word)}</button>`).join('')||"<span class=\"muted-small\">Select the words in order…</span>"}</div><div class="wd-tiles-bank">${r.shuffled.map(t=>`<button class="wd-token" data-wd-tile="${t.id}" ${selected.has(t.id)||feedback?'disabled':''}>${esc(t.word)}</button>`).join('')}</div><div class="row"><button type="button" class="btn soft" data-wd-clear ${feedback?'disabled':''}>Clear</button><button type="button" class="btn primary" data-wd-check ${feedback||r.selected.length!==r.tokens.length?'disabled':''}>Check answer</button></div>`;
}
function wdExerciseResult(d){
 const r=hCard;if(!r.exResult)return '';
 const x=r.exResult,mode=r.mode;
 const answer=mode==='choice'?d.w:mode==='cloze'?r.cloze.answer:(d.e1||d.e2);
 return `<div class="wd-ex-result ${x.ok?'is-good':'is-error'}" aria-live="polite"><strong>${x.ok?"✓ Correct. You can continue.":"Let’s take a look."}</strong><span>${!x.ok?"Example answer: "+esc(answer):''}</span>${mode==='sentence'?"<small>Alternative positions of time and place expressions are accepted when they follow German verb-second word order. More complex alternatives may need a manual check.</small>":''}${d.g?`<small>${esc(d.g)}</small>`:''}</div>`;
}
function wdRichCard(){
 const t=hCard;
 if(t.i>=t.entries.length){
   $('hCardBody').innerHTML=`<div class="wd-finished"><div class="wd-finished-icon">✓</div><h2>That’s it for today 🌿</h2><p>You can return another day and pick up your practice.</p><button class="btn primary" type="button" data-wd-restart>Learn new words</button><button class="btn soft" type="button" data-wd-home>Home</button></div>`;
   $('wdCardsTitle').textContent="Practice complete";return;
 }
 const c=t.entries[t.i],d=c.original;
 // No translation, example sentence or grammar hint before the first choice.
 if(!t.guess){
  if(!t.guessOptions)t.guessOptions=wdChoiceOptions(d);
  $('wdCardsTitle').textContent="Guess the meaning first";
  $('wdCardsIntro').textContent="Read the German word and choose its English meaning. The examples appear after you answer.";
  $('wdCardsSourceRow').hidden=true;
  $('hCardBody').innerHTML=`<div class="wd-lesson-progress"><span>${t.i+1} / ${t.entries.length} words</span><span>${esc(WD_LABELS[d.k]||d.k)} · ${esc(d.l)}</span></div><div class="bar"><i style="width:${100*t.i/t.entries.length}%"></i></div>
  <div class="wd-guess-box"><span class="wd-eyebrow">GUESS THE MEANING</span><div class="wd-guess-word">${wordHTML(d)}</div><div class="wd-guess-audio">${say(d.w,"Listen to the word")}</div><p>What does this German expression mean in English?</p></div>
  <div class="wd-choices wd-guess-choices">${t.guessOptions.map((v,i)=>`<button type="button" class="wd-answer" data-wd-guess="${i}">${esc(v)}</button>`).join('')}</div>
  <div class="wd-guess-bottom"><span class="muted-small">After answering, explore the meaning, example sentences and exercises.</span><button type="button" class="wd-skip" data-wd-skip>Skip this word</button></div>`;
  return;
 }
 // Keep the original 1000-word database as the sole source of the new lesson content.
 const verb=d.k==='Verb'?wdVerbContext(d):null;
 const rest=d.k==='Verb'?(verb?.forms?`<p class="wd-detail-line"><b>Präsens:</b> ich ${esc(verb.forms[0])} · du ${esc(verb.forms[1])} · er/sie/es ${esc(verb.forms[2])}</p>`:'')+(verb?.perfect?`<p class="wd-detail-line"><b>Perfekt:</b> ${esc(verb.perfect)}</p>`:''):'';
 $('wdCardsTitle').textContent="Learn vocabulary";
 $('wdCardsIntro').textContent="Now explore the examples and practise using the word.";
 $('wdCardsSourceRow').hidden=true;
 $('hCardBody').innerHTML=`<div class="wd-lesson-progress"><span>${t.i+1} / ${t.entries.length} words</span><span>${esc(WD_LABELS[d.k]||d.k)} · ${esc(d.l)}</span></div><div class="bar"><i style="width:${100*t.i/t.entries.length}%"></i></div>
 <div class="wd-guess-result ${t.guess.ok?'is-good':'is-error'}"><strong>${t.guess.ok?"✓ You got it!":"↺ This word will come up again."}</strong><span>${t.guess.ok?"You remembered the meaning.":"Your answer: "+esc(t.guess.given)}</span></div>
 <div class="wd-word-heading"><div><h2>${wordHTML(d)}</h2><p>${esc(d.t)}</p></div>${say(d.w,"Listen to the word")}</div>
 ${d.f?`<div class="wd-forms">${d.k==='Nomen'?"Plural / form":d.k==='Verb'?"Other forms":d.k==='Adjektiv'?"Comparison":"Usage"}: <strong>${esc(d.f)}</strong></div>`:''}
 ${d.k==='Verb'&&rest?`<div class="wd-conjugation"><span class="wd-eyebrow">USE THE VERB</span>${rest}</div>`:''}
 <div class="wd-lessons-examples"><div class="wd-eyebrow">IN A SENTENCE</div>${d.e1?wdExampleHTML(d.e1,d.e1t,'01'):''}${d.e2?wdExampleHTML(d.e2,d.e2t,'02'):''}${d.k==='Verb'&&WD_TENSE_EXAMPLES[d.w]?`<details class=\"wd-verb-times\"><summary>Show two more sentences in the present and the Perfekt</summary><div class=\"wd-examples-expand\">${wdExampleHTML(WD_TENSE_EXAMPLES[d.w][0],WD_TENSE_EXAMPLES[d.w][1],'· Präsens')}${wdExampleHTML(WD_TENSE_EXAMPLES[d.w][2],WD_TENSE_EXAMPLES[d.w][3],'· Perfekt')}</div></details>`:''}</div>
 ${d.g?`<details class="wd-help-detail"><summary>💡 Usage and grammar</summary><p>${esc(d.g)}</p></details>`:''}
 ${masteryBadge(d.i)}<div class="wd-practice-inline"><div class="wd-practice-top"><div><b>Practise further</b><p>You know the meaning. Now try using it in a sentence.</p></div></div><div class="wd-practice-switch"><button data-wd-mode="choice" aria-pressed="${t.mode==='choice'}">4 choices</button><button data-wd-mode="cloze" aria-pressed="${t.mode==='cloze'}">Fill the gap</button><button data-wd-mode="sentence" aria-pressed="${t.mode==='sentence'}">Build a sentence</button></div><div class="wd-task-area">${wdWordExercise(d)}${wdExerciseResult(d)}</div></div>
 <div class="wd-lesson-actions"><button type="button" class="btn soft" data-wd-later>Show again</button><button type="button" class="btn primary" data-wd-known>Next word →</button></div><button type="button" class="wd-skip" data-wd-skip>Skip for now</button>`;
 $('hCardBody').querySelector('input#wdTypeAnswer')?.addEventListener('keydown',e=>{if(e.key==='Enter')$('hCardBody').querySelector('[data-wd-check]')?.click();});
}
function wdSubmitExercise(given){
 const t=hCard;if(t.exResult)return;
 const d=t.entries[t.i].original,mode=t.mode;
 let correct=mode==='choice'?d.w:mode==='cloze'?t.cloze.answer:(d.e1||d.e2||'');
 const ok=mode==='sentence'?wdAcceptRichSentence(correct,given):normGerman(String(given))===normGerman(String(correct));
 if(ok&&mode==='cloze')markMastery(d.i,'writing');
 if(ok&&mode==='sentence')markMastery(d.i,'sentence');
 t.exResult={ok,given:String(given)};
 const name=mode==='choice'?"4 choices":mode==='cloze'?"Fill in the blank":"Sentence building";
 hLog("Word · "+name,ok,mode==='cloze'?t.cloze.question:(mode==='sentence'?(d.e1t||d.e2t||d.w):d.w),correct,given,d.i+':'+mode);
 adaptTrack('wd-word:'+d.i+':'+mode,ok,name,adaptFamilyKey(d));
 if(!ok){t.exerciseWrong=true;if(t.guess?.ok)adaptInSession(t.entries,'wd-meaning:'+d.i,t.entries[t.i],2);}
 if(mode==='sentence'&&!ok)t.exResult.unsure=true;
 save();wdRichCard();
}
const wdLegacyRenderCard=renderCard,wdLegacyStartCards=startCards,wdLegacyRateCard=rateCard;
function wdBeginLesson(pool=null){
 const candidates=pool||wdFiltered();
 if(!candidates.length){toast("No words match this filter");return;}
 const cards=selectBatch(candidates.map(d=>({id:'w'+d.i,de:d.w,tr:d.t,example:d.e1,lv:d.l,original:d})),'cards-original',Math.min(50,wdPref().count));
 hCard={entries:cards,i:0,front:false,source:'original',rich:true,mode:'cloze',guess:null,guessOptions:null,exResult:null};
 showHub('hubCards');wdRichCard();
}
startCards=function(source='all'){
 if(source==='mine')return wdLegacyStartCards(source);
 const src=cardSource(source).filter(x=>x.original).map(x=>x.original);
 return wdBeginLesson(src);
};
renderCard=function(){if(hCard?.rich)return wdRichCard();return wdLegacyRenderCard();};
rateCard=function(ok){if(!hCard?.rich)return wdLegacyRateCard(ok);
 const d=hCard.entries[hCard.i].original,r=rec(d.i),wasLearned=learned(d.i);
 if(ok){r.r=(r.r||0)+1;r.b=Math.min(5,(r.b||0)+1);r.next=Date.now()+[1,3,7,14,30][r.b-1]*DAY;}
 else{r.x=(r.x||0)+1;r.b=0;r.next=Date.now();}
 save();wdResetCard();return wdLegacyRateCard(ok);};
$('hCardBody').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||!hCard?.rich)return;
 const r=hCard,d=r.entries[r.i]?.original;
 if(b.hasAttribute('data-wd-home')){show('home');return;}
 if(b.hasAttribute('data-wd-restart')){wdBeginLesson();return;}
 if(!d)return;
 if(b.hasAttribute('data-wd-guess')){wdRevealGuess(r.guessOptions[+b.dataset.wdGuess]);return;}
 if(!r.guess&& !b.hasAttribute('data-wd-skip'))return;
 if(b.hasAttribute('data-wd-mode')){r.mode=b.dataset.wdMode;r.exResult=null;r.options=null;r.cloze=null;r.tokens=null;r.selected=[];wdRichCard();return;}
 if(b.hasAttribute('data-wd-choice')){wdSubmitExercise(r.options[+b.dataset.wdChoice]);return;}
 if(b.hasAttribute('data-wd-tile')){r.selected.push(+b.dataset.wdTile);wdRichCard();return;}
 if(b.hasAttribute('data-wd-undo')){r.selected=r.selected.filter((x,i)=>i!==r.selected.indexOf(+b.dataset.wdUndo));wdRichCard();return;}
 if(b.hasAttribute('data-wd-clear')){r.selected=[];wdRichCard();return;}
 if(b.hasAttribute('data-wd-check')){
  if(r.mode==='cloze'){
   const value=$('wdTypeAnswer')?.value.trim();if(!value){toast("Write an answer first");return;}wdSubmitExercise(value);
  }else if(r.mode==='sentence'){
   if(r.selected.length!==r.tokens.length){toast("Select the words first");return;}
   wdSubmitExercise(r.selected.map(i=>r.tokens[i].word).join(' '));
  }return;
 }
 if(b.hasAttribute('data-wd-known')){rateCard(Boolean(r.guess?.ok&&!r.exerciseWrong));return;}
 if(b.hasAttribute('data-wd-later')){rateCard(false);return;}
 if(b.hasAttribute('data-wd-skip')){if(r.guess){rateCard(Boolean(r.guess.ok&&!r.exerciseWrong));}else{r.i++;wdResetCard();wdRichCard();}return;}
});
// Keep the original casual flashcards and all existing training modes reachable,
// but use the new integrated learner as the prominent first action.
$('hCardsToHub').onclick=()=>show('home');
const wdHome=document.getElementById('home');
const wdIntro=document.createElement('div');wdIntro.id='wdSimpleHome';wdIntro.innerHTML=`
 <div class="wd-simple-lead"><div class="wd-lead-text"><span class="wd-eyebrow">A QUIET SPACE TO LEARN</span><h2>Learn German through words <br><em>and sentences.</em></h2><p>${DATA.length.toLocaleString('en-GB')} words, real examples and short exercises when you want them. At your own pace.</p></div><div class="wd-lead-illustration" aria-hidden="true"><span>W.</span><small>lernen · verstehen · sprechen</small></div></div>
 <div class="wd-start-card" id="wdLearnStart"><div class="wd-start-head"><div><span class="wd-eyebrow">LEARN</span><h3>What would you like to start with?</h3><p>Choose a starting point and work at your own pace.</p></div><span class="wd-start-symbol" aria-hidden="true">↗</span></div>
 <div class="wd-study-group" role="group" aria-label="Word selection"><button id="wdGroupKind" aria-pressed="true">By word type</button><button id="wdGroupTopic" aria-pressed="false">By topic</button></div>
 <div id="wdKindsPanel"><div class="wd-kind-chips" id="wdCategoryPills"></div></div>
 <div id="wdTopicsPanel" hidden><label class="wd-eyebrow" for="wdTopicPicker">CHOOSE A TOPIC</label><select id="wdTopicPicker" class="wd-simple-select"></select></div>
 <div class="wd-options-row"><label>Level<select id="wdLevelPicker" class="wd-simple-select"><option value="all">A1 + A2</option><option value="A1">A1</option><option value="A2">A2</option></select></label><label>Round<select id="wdCountPicker" class="wd-simple-select"><option value="5">5 words</option><option value="10">10 words</option><option value="20">20 words</option><option value="30">30 words</option><option value="40">40 words</option><option value="50">50 words</option></select></label></div>
 <div class="wd-start-footer"><span id="wdStudySummary" class="muted-small"></span><button class="btn primary" id="wdBeginLearn">Start learning <span aria-hidden="true">→</span></button></div></div>
 <div class="wd-paths-title"><h3>Explore other activities</h3><span>No fixed schedule</span></div>
 <div class="wd-simple-paths"><button data-wd-path="academy"><span class="wd-path-icon">Aa</span><b>Grammar</b><small>Short lessons and examples</small></button><button data-wd-path="story"><span class="wd-path-icon">▤</span><b>Stories</b><small>Reading comprehension</small></button><button data-wd-path="talk"><span class="wd-path-icon">“ ”</span><b>Conversation</b><small>Everyday German</small></button><button data-wd-path="dict"><span class="wd-path-icon">⌕</span><b>My dictionary</b><small>${DATA.length.toLocaleString('en-GB')} words and notes</small></button></div>
 <details class="wd-extra"><summary>More practice and daily review <span>⌄</span></summary><div class="wd-extra-actions"><button data-wd-path="review">Adaptive review</button><button data-wd-path="daily">Previous daily plan</button><button data-wd-path="hub">All exercises</button><button data-wd-path="verbs">${ACADEMY_DATA.verbs.length} verb conjugations</button><button data-wd-path="personal">My words</button></div></details>`;
$('wdMobileProgress').insertAdjacentElement('afterend',wdIntro);
setLevelOptions($('wdLevelPicker'), vocabularyLevels, allLevelLabel(vocabularyLevels));
$('wdTopicPicker').innerHTML=`<option value="all">All topics · ${DATA.length.toLocaleString('en-GB')} words</option>`+TOPICS.map(t=>`<option value="${esc(t)}">${esc(TOPIC_TR[t]||t)}</option>`).join('');
$('wdGroupKind').onclick=()=>{wdPref().group='kind';save();wdRenderPicker();};
$('wdGroupTopic').onclick=()=>{wdPref().group='topic';save();wdRenderPicker();};
$('wdCategoryPills').onclick=e=>{const b=e.target.closest('[data-wd-kind]');if(!b)return;wdPref().kind=b.dataset.wdKind;save();wdRenderPicker();};
$('wdTopicPicker').onchange=e=>{wdPref().topic=e.target.value;save();wdRenderPicker();};
$('wdLevelPicker').onchange=e=>{wdPref().level=e.target.value;save();wdRenderPicker();};
$('wdCountPicker').onchange=e=>{wdPref().count=+e.target.value;save();wdRenderPicker();};
$('wdBeginLearn').onclick=()=>wdBeginLesson();
wdIntro.addEventListener('click',e=>{const b=e.target.closest('[data-wd-path]');if(!b)return;const kind=b.dataset.wdPath;
 if(kind==='academy'){show('academy');renderAcademy();}
 else if(kind==='story')renderStoryList();
 else if(kind==='talk')renderTalkList();
 else if(kind==='dict'){show('dict');renderDict();}
 else if(kind==='review')adaptReviewNext();
 else if(kind==='daily')beginDaily();
 else if(kind==='hub'){showHub('hub');drawHub();}
 else if(kind==='verbs'){show('verbs');renderVerbs();}
 else if(kind==='personal')renderPersonal();
});
// The original 1000-word dictionary receives the same kind filter.
const wdDictFilters=$('dTopic').parentElement;
const wdDictKind=document.createElement('select');wdDictKind.id='wdDictKind';wdDictKind.setAttribute('aria-label',"Word type");
wdDictKind.innerHTML=WD_KINDS.filter(k=>k.key!=='other'||DATA.some(k.test)).map(k=>`<option value="${k.key}">${k.label}</option>`).join('');
wdDictFilters.appendChild(wdDictKind);
const wdDictLevel=addLevelFilter(wdDictFilters,'wdDictLevel',vocabularyLevels,()=>renderDict());
const wdOldDict=renderDict;
renderDict=function(){wdOldDict();const choice=WD_KINDS.find(k=>k.key===wdDictKind.value)||WD_KINDS[0];
 const q=fold($('dSearch').value.trim()),tv=$('dTopic').value;
 let subset=DATA.filter(d=>choice.test(d)&&(wdDictLevel.value==='all'||d.l===wdDictLevel.value));
 if(tv==='*fav')subset=subset.filter(d=>S.fav.includes(d.i));else if(tv==='*wrong')subset=subset.filter(d=>isWrong(d.i));else if(tv!=='')subset=subset.filter(d=>d.c===TOPICS[+tv]);
 if(q)subset=subset.filter(d=>fold(d.w+' '+d.t).includes(q));
 $('dCount').textContent=subset.length+" words";$('dList').innerHTML=subset.slice(0,150).map(d=>`<details class="drow" data-i="${d.i}"><summary><span class="dot ${learned(d.i)?'l':(isWrong(d.i)?'w':'')}"></span><div class="t"><b>${wordHTML(d)}</b><span>${esc(d.t)}</span></div>${say(d.w,"Listen in German")}${say(d.t,"Listen in English","en-GB")}</summary><div class="body"></div></details>`).join('')+(subset.length>150?'<p class="muted">Showing the first 150 matches. Narrow your search.</p>':'');
};
wdDictKind.onchange=renderDict;
// Gentle defaults only for new users; keep old settings untouched if a backup exists.
const wdNavNames={home:"Home",hub:"Learn",academy:"Grammar",dict:"My dictionary",progress:"My progress",settings:"Settings"};
document.querySelectorAll('.wd-side .wd-nav-item').forEach(b=>{
 const id=b.dataset.go;if(!(id in wdNavNames)){b.hidden=true;return;}
 b.lastElementChild.textContent=wdNavNames[id];
});
const hubNav=document.querySelector('.wd-side [data-go="hub"]');
hubNav.addEventListener('click',e=>{e.stopImmediatePropagation();e.preventDefault();wdBeginLesson();},true);
const wdRailToday=document.querySelector('.wd-rail-today');if(wdRailToday)wdRailToday.hidden=true;
$('hCardsSource').value='original';
$('wdCardsSourceRow').hidden=true;
$('hCardsToHub').textContent="Home";
wdRenderPicker();
// Populate level selectors only where actual lessons are available.
const allStudyLevels = content.levels.filter(lv=>Object.values(content.availableLevels).some(list=>list.includes(lv)));
setLevelOptions($('hubLevel'), allStudyLevels, allLevelLabel(allStudyLevels), lv=>lv+' only');
setLevelOptions($('verbsLvl'), content.availableLevels.verbs, 'All', lv=>lv+' · '+ACADEMY_DATA.verbs.filter(v=>v.level===lv).length+' verbs');
$('myLevel').replaceChildren(...content.levels.map(lv=>new Option(lv,lv)));
$('segLvl').replaceChildren(...['all',...vocabularyLevels].map(lv=>{const b=document.createElement('button');b.dataset.v=lv;b.textContent=lv==='all'?'All':lv;b.setAttribute('aria-pressed',String(S.set.lvl===lv));return b;}));
const grammarLevel=addLevelFilter($('academyCards').parentElement,'wdGrammarLevel',content.availableLevels.GRAMMAR_LESSONS,()=>renderAcademy());
const grammarGroup = document.createElement('select');
grammarGroup.id='wdGrammarGroup';grammarGroup.className='wd-simple-select';grammarGroup.setAttribute('aria-label','Grammar category');
grammarGroup.replaceChildren(new Option('All grammar topics','all'), ...Object.entries({'foundations':'Foundations & pronouns','cases':'Cases & prepositions','tenses':'Verb tenses','word-order':'Word order & conjunctions'}).filter(([key])=>Object.values(content.grammarGroups).includes(key)).map(([key,label])=>new Option(label,key)));
grammarGroup.addEventListener('change',renderAcademy);
$('academyCards').before(grammarLevel,grammarGroup);
const storyLevel=addLevelFilter($('hubStories'),'wdStoryLevel',content.availableLevels.stories,()=>renderStoryList());$('hStories').before(storyLevel);
const talkLevel=addLevelFilter($('hubTalks'),'wdTalkLevel',content.availableLevels.dialogues,()=>renderTalkList());$('hTalks').before(talkLevel);
$('hubLevel').addEventListener('change',()=>{storyLevel.value=levelChoice($('hubLevel').value,content.availableLevels.stories);talkLevel.value=levelChoice($('hubLevel').value,content.availableLevels.dialogues);});
storyLevel.value=levelChoice(hub().settings.level,content.availableLevels.stories);talkLevel.value=levelChoice(hub().settings.level,content.availableLevels.dialogues);
document.querySelector('.brand .k').textContent=DATA.length;
document.querySelector('.wd-level').textContent=allLevelLabel(allStudyLevels);
const wdOldImport=importProgress;
importProgress=function(raw){wdOldImport(raw);wdRenderPicker();};
const wdOldHomeRender=renderHome;
renderHome=function(){wdOldHomeRender();wdRenderPicker();};

renderHome();

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
 const ordered=batches=>[...batches].sort((a,b)=>a.clock-b.clock||a.id.localeCompare(b.id));
 function latestReset(batches){return ordered(batches).filter(b=>b.reset===true).at(-1)||null;}
 function replay(seed,batches){
  const seen=new Set(), reset=latestReset(batches), epoch=reset?.id||null;
  if(reset)apply(seed,reset.ops);
  for(const b of ordered(batches)){if(b.reset===true||(b.epoch||null)!==epoch||seen.has(b.id))continue;seen.add(b.id);apply(seed,b.ops);}return seed;
 }
 return {clone,eq,diff,apply,replay,latestReset};
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
  const dirty=Boolean(meta?.initialized&&(meta.pendingReset||meta.pending||C.diff(meta.base,snapshot()).length));
  const valid=Boolean(token&&Date.now()<expiry);
  let text=status.textContent, state='neutral';
  if(!navigator.onLine)text=meta?.pendingReset?'Offline · reset pending. Reconnect to finish.':'Offline · local progress is kept.';
  else if(stale||text.startsWith('Sync paused:')||text.startsWith('Cloud state needs attention'))state='error';
  else if(meta?.account&&!valid&&!busy)text='Connect Google to resume syncing.';
  else if(valid&&!busy&&dirty)text='Local changes waiting to sync.';
  else if(valid&&!busy&&!dirty&&(text.startsWith('Synced ')||text.startsWith('All progress reset. Synced ')))state='synced';
  line.textContent=text;line.dataset.state=state;
  last.textContent=meta?.last?'Last sync: '+new Date(meta.last).toLocaleString():'Last sync: —';
  button.disabled=busy||stale||!valid||!navigator.onLine;
 };
 function controls(){ui('sReset').disabled=busy||stale||Boolean(meta?.pendingReset);connect.disabled=busy||stale;syncBtn.disabled=busy||stale||!token;disconnect.disabled=busy||!token;ui('cloudAccount').textContent=meta?.account?'Linked account: '+(meta.email||'Google Drive'):'No account linked';refreshMobileCloud();}
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
 async function fetchBatch(id){if(cache.has(id))return cache.get(id);const b=await api('/drive/v3/files/'+encodeURIComponent(id)+'?alt=media',{},'read batch');if(b?.schema!==1||typeof b.id!=='string'||!Number.isSafeInteger(b.clock)||!Array.isArray(b.ops)||(b.epoch!=null&&typeof b.epoch!=='string')||(b.reset!==undefined&&b.reset!==true))throw Error('Unsupported cloud record');validateStateTree(b);cache.set(id,b);return b;}
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
 async function run(manual=false,requestReset=false){
  if(busy||stale||!token||!navigator.onLine||!safeScreen()||(!manual&&document.hidden))return;
  busy=true;lastAttempt=Date.now();controls();tell(requestReset||meta?.pendingReset?'Resetting all progress…':'Syncing with Google Drive…');
  try{
   if(!storageOK)throw Error('Local storage is unavailable');
   if(!meta?.account)throw Error('Connect Google first');
   const listed=await list();
   const ids=new Set([...(meta.known||[]),...listed]);
   const batches=[];for(const id of ids){batches.push(await fetchBatch(id));}
   if(stale)throw Error('Another tab changed cloud data. Reload before syncing.');
   // A reset is a durable generation boundary. Old-generation batches (including late
   // uploads from offline devices or old app versions) can never recreate reset progress.
   if(requestReset&&!meta.pendingReset){
    const clock=Math.max(Date.now(),...batches.map(b=>b.clock+1),(meta.clock||0)+1);
    const id=crypto.randomUUID(), clean=fresh();clean.set=C.clone(S.set);
    meta.pendingReset={batch:{schema:1,id,clock,reset:true,ops:C.diff(fresh(),clean)}};persist();
   }
   if(meta.pendingReset){
    const p=meta.pendingReset, existing=batches.filter(b=>b.id===p.batch.id);
    if(existing.some(b=>!C.eq(b,p.batch)))throw Error('Conflicting reset record');
    if(!existing.length){ids.add(await upload(p));batches.push(p.batch);}
   }
   const epoch=C.latestReset(batches)?.id||null;
   if(meta.pendingReset||epoch!==(meta.epoch||null)){
    if(!safeScreen()||stale){tell('Cloud reset recorded. Return to Home or Settings to finish.');return;}
    const after=migrate(C.replay(fresh(),batches));
    commit(after,after,ids,batches,epoch);
    tell('All progress reset. Synced '+new Date(meta.last).toLocaleTimeString()+'.');
    return;
   }
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
    if(ops.length){const clock=Math.max(Date.now(),...batches.map(b=>b.clock+1), (meta.clock||0)+1);const id=crypto.randomUUID();meta.pending={batch:{schema:1,id,clock,epoch,ops},snapshot:captured};persist();}
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
   commit(merged,after,ids,batches,epoch);
   tell('Synced '+new Date(meta.last).toLocaleTimeString()+'. Local progress is also saved.');
  }catch(e){fail(e);if(meta?.pendingReset)tell(status.textContent+' Reset pending: reconnect or sync again to finish.');}finally{busy=false;controls();}
 }
 // Journal the local commit so a reload between the two localStorage writes can recover.
 function commit(merged,after,ids,batches,epoch){
  meta={...meta,initialized:true,base:C.clone(merged),known:[...ids],clock:Math.max(meta.clock||0,...batches.map(b=>b.clock)),epoch,pending:null,pendingReset:null,last:new Date().toISOString(),transaction:{before:JSON.parse(localStorage.getItem(KEY)||'null'),after:C.clone(after)}};persist();
  S=after;save();if(!storageOK){stale=true;throw Error('Unable to save merged progress. Export a backup and reload.');}delete meta.transaction;persist();
  if(!ui('settings').hidden)renderSettings();else renderHome();
 }
 ui('sReset').onclick=()=>{
  if(busy||stale)return;
  if(!meta?.account){resetLocalProgress();return;}
  if(!token||Date.now()>=expiry||!navigator.onLine){toast('Connect Google while online to reset all devices.');tell('Connect Google to reset all progress.');return;}
  if(!safeScreen())return;
  if(!confirm('Reset ALL learning progress on this device and Google Drive? Other devices will reset on their next sync. Unsynced progress from before the reset will be discarded. Your settings and Google connection will be kept. Continue?'))return;
  return run(true,true);
 };
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
 // Import remains blocked for a linked device: a replacement is not an incremental change.
 for(const id of ['sLoad','sFile'])ui(id).addEventListener(id==='sFile'?'change':'click',e=>{if(meta?.account){e.stopImmediatePropagation();e.preventDefault();if(id==='sFile')e.target.value='';toast('Cloud-linked progress cannot be imported. Download a backup instead.');}},true);
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

}).catch(wortDuellLoadError);
