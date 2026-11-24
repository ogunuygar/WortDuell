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
function registerGrammar(ok){const g=gram(),l=g.byLesson[A.lesson.id]||(g.byLesson[A.lesson.id]={n:0,ok:0});l.n++;if(ok)l.ok++;const day=g.day[today()]||(g.day[today()]={n:0,ok:0});day.n++;if(ok)day.ok++;const q=A.qs[A.i];if(q)adaptTrack('grammar:'+A.lesson.id+':'+q.q,ok,A.lesson.title,'grammar-topic:'+A.lesson.id);save();}
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
 gram().verb.n++;if(ok)gram().verb.ok++;adaptTrack('verb-choice:'+v.v+':'+p,ok,"Verb conjugation",'verb:'+v.v);save();
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
