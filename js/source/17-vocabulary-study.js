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
