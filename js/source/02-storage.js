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
const daily=key=>S.days[key]||blankDay();
const dueWords=()=>DATA.filter(d=>due(d.i));
function streak(){let n=0,j=0;if(!daily(today()).answers)j=-1;while(daily(dayKeyOffset(j)).answers>0){n++;j--;}return n;}
function recordAnswer(d,ok,points,wasLearned,wasReview){
  const dt=today(),obj=S.days[dt]||(S.days[dt]=blankDay());
  obj.answers++;if(ok)obj.correct++;obj.points+=points;
  if(wasReview)obj.review++;
  // New full-mastery event is recorded by markMastery(), once per word.
  save();
}

