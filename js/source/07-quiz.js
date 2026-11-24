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

