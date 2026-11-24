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

