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
