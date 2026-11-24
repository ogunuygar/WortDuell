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
 const g=gram();g.byLesson.builder=g.byLesson.builder||{n:0,ok:0};g.byLesson.builder.n++;if(accepted)g.byLesson.builder.ok++;adaptTrack('builder:'+item.de,accepted,'Satzbau');save();
 BPLUS.done=true;
 $('builderFeedback').hidden=false;
 $('builderFeedback').innerHTML=`<div class="verdict ${accepted?'ok':'bad'}">${accepted?"✓ Correct sentence!":"Check the word order"}</div><b>${esc(item.de)}</b><p class="notice">${esc(item.rule)}</p>${adaptNudge('builder:'+item.de,accepted,item.rule+' '+item.de)}${item.alt?.length?`<p class="notice"><strong>Another correct version:</strong> ${esc(item.alt.join(' / '))}</p>`:''}<div class="row">${say(item.de,"Listen to the sentence")}<button class="btn primary" id="builderNext" style="flex:1">${BPLUS.i+1>=BPLUS.items.length?"Results":"Continue"}</button></div>`;
 $('builderNext').onclick=()=>{BPLUS.i++;builderRender();};
};

