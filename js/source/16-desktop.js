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

