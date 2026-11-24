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
  $('analysisTotals').innerHTML=[["All 3 skills complete",learnedCount+' / '+DATA.length],["Total questions",S.ans],["Last 30 days",in30],["Day streak",streak()+" days"]].map(([l,v])=>`<div><strong>${v}</strong><span>${l}</span></div>`).join('');
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
  const modeLabels=['de2tr','tr2de','type','listen','sentence','article','plural','dialogue','art','gap','choice'];
  $('analysisModes').innerHTML=modeLabels.filter(k=>S.modeStats[k]?.n).map(k=>{const a=S.modeStats[k];return `<div class="analysis-line"><strong>${esc(MODE_LABELS[k]||k)}</strong><small>${a.ok}/${a.n} · ${Math.round(100*a.ok/a.n)}%</small><div class="bar"><i style="width:${100*a.ok/a.n}%"></i></div></div>`;}).join('')||"<p class=\"muted\">No questions answered in this version yet.</p>";
  const topics=Object.entries(S.topicStats).filter(([k,a])=>a.n>=2).sort((a,b)=>a[1].ok/a[1].n-b[1].ok/b[1].n).slice(0,8);
  $('analysisTopics').innerHTML=topics.map(([t,a])=>`<div class="analysis-line"><strong>${esc(TOPIC_TR[t]||t)}</strong><small>${a.ok}/${a.n} · ${Math.round(100*a.ok/a.n)}%</small><div class="bar"><i style="width:${100*a.ok/a.n}%"></i></div></div>`).join('')||"<p class=\"muted\">Answer at least two questions to compare topics.</p>";
  const errors=DATA.filter(d=>S.w[d.i]?.x>0).sort((a,b)=>{const ra=S.w[a.i],rb=S.w[b.i];return (rb.x/(rb.x+rb.r))-(ra.x/(ra.x+ra.r))||rb.x-ra.x;}).slice(0,12);
  $('analysisDifficult').innerHTML=errors.map(d=>`<div class="rrow"><div class="t"><b>${wordHTML(d)}</b><span>${esc(d.t)} · ${S.w[d.i].x} incorrect, ${S.w[d.i].r} correct</span></div>${say(d.w)}</div>`).join('')||"<p class=\"muted\">No missed words yet.</p>";
}

