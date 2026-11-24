/* ---------- spaced review and multi-day memory ---------- */
function reviewNow(){const words=dueWords();if(!words.length){toast("No reviews due yet");return;}
  start(words,{title:"Daily review",len:Math.min(20,words.length),prio:true,dir:S.set.dir});
}
let progressDays=7,selectedDay=today();
function daySummary(key){const day=daily(key),accuracy=day.legacy?"Earlier record":(day.answers?Math.round(day.correct/day.answers*100)+'%':'–');
  $('dayDetail').innerHTML=`<div><strong>${esc(key)}</strong><span>Selected day</span></div><div><strong>${day.answers}</strong><span>Questions answered</span></div><div><strong>${esc(accuracy)}</strong><span>Accuracy</span></div><div><strong>${day.learned||0}</strong><span>Newly learned</span></div><div><strong>${day.points||0}</strong><span>Points earned</span></div><div><strong>${day.review||0}</strong><span>Review questions</span></div>`;
}
function renderProgress(){
  $('pStreak').textContent=streak();$('pTotal').textContent=S.ans;
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

