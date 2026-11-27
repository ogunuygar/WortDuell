// Reporting tests using actual source functions and the real data catalog.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=name=>fs.readFileSync(new URL('../js/source/'+name,import.meta.url),'utf8');
const storage=read('02-storage.js');
const report=read('10-progress.js');
const nodes=new Map();
const $=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',children:[],querySelectorAll:()=>[],addEventListener(){}});return nodes.get(id);};
const ctx=vm.createContext({console,$,fetch:async path=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../'+path,import.meta.url),'utf8'))})});
const loader=fs.readFileSync(new URL('../js/data-loader.js',import.meta.url),'utf8');
ctx.content=await vm.runInContext(loader+'\nloadWortDuellData()',ctx);
vm.runInContext(`const DATA=content.vocabulary;DATA.forEach((d,i)=>d.i=i);const TOPICS=[...new Set(DATA.map(d=>d.c))],TOPIC_TR=content.TOPIC_TR,vocabularyLevels=content.availableLevels.vocabulary,GRAMMAR_LESSONS=content.GRAMMAR_LESSONS,HUB_DATA={stories:content.stories,dialogues:content.dialogues};\nconst esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));\nconst localStorage={getItem:()=>null,setItem(){}};\n`+storage+'\n'+report.slice(report.indexOf('/* ---------- Read-only learning roadmap'))+'\n',ctx);
const run=s=>vm.runInContext(s,ctx);
const value=s=>JSON.parse(JSON.stringify(run(s)));
// Reproduce 91 main questions, including the 31 not represented by the two direction counts.
run(`S=fresh();S.ans=91;S.ok=60;S.dirStats={de2tr:{n:27,ok:20},tr2de:{n:33,ok:20}};S.modeStats={de2tr:{n:27,ok:20},tr2de:{n:33,ok:20}};S.study={modes:{'Word · 4 choices':{n:10,ok:7},'Word · Fill in the blank':{n:11,ok:7},'Word · Sentence building':{n:10,ok:6}}};`);
assert.equal(run('questionTotals(S).n'),91);
assert.equal(run('questionBreakdown(S).rows.reduce((n,[,x])=>n+x.n,0)'),91);
assert.equal(run('questionBreakdown(S).mismatch'),false);
run(`S.grammar={byLesson:{a:{n:8,ok:6},builder:{n:4,ok:3}},verb:{n:5,ok:4},day:{'2026-11-27':{n:8,ok:6}}};S.days['2026-11-27']={...blankDay(),answers:10,correct:8};`);
assert.deepEqual(value('questionTotals(S)'),{n:108,ok:73});
assert.equal(run('questionBreakdown(S).rows.reduce((n,[,x])=>n+x.n,0)'),108);
assert.equal(run('daily("2026-11-27").answers'),18);
assert.equal(run('daily("2026-11-27").correct'),14);
assert.equal(run('S.days["2026-11-27"].answers'),10); // read-only
run(`S.ans+=3;S.ok++;`);
assert.deepEqual(value('questionBreakdown(S).rows.at(-1)'),['Other / older unclassified questions',{n:3,ok:1}]);
// Coverage: repeats do not complete a topic; a latest missed question needs review.
assert.equal(run(`roadmapStatus(questionCoverage(['a','b'],{},100))`),'Not started');
assert.equal(run(`roadmapStatus(questionCoverage(['a','b'],{a:{n:40,streak:3,due:200}},100))`),'In progress');
assert.equal(run(`roadmapStatus(questionCoverage(['a','b'],{a:{n:40,streak:3,due:200},b:{n:1,streak:0}},100))`),'Needs review');
assert.equal(run(`roadmapStatus(questionCoverage(['a','b'],{a:{n:1,streak:1,due:200},b:{n:1,streak:1,due:200}},100))`),'Completed');
assert.equal(run(`roadmapStatus(questionCoverage(['a','b'],{a:{n:1,streak:1,due:50},b:{n:1,streak:1,due:200}},100))`),'Review due');
// Exercise the real render functions against all 125 data files and verify level filtering.
run(`S=fresh();renderRoadmap();renderQuestionBreakdown($('breakdown'));`);
assert.match($('wdRoadmap').innerHTML,/Grammar topics/);assert.match($('wdRoadmap').innerHTML,/Vocabulary topics/);assert.match($('wdRoadmap').innerHTML,/Mini stories/);assert.match($('wdRoadmap').innerHTML,/Conversations/);
assert.match($('wdRoadmap').innerHTML,/data-road-level="A1"/);assert.match($('wdRoadmap').innerHTML,/data-road-level="A2"/);
run(`roadmapLevel='A2';renderRoadmap();`);assert.doesNotMatch($('wdRoadmap').innerHTML,/data-road-level="A1"/);
run(`roadmapLevel='A1';S.adaptive={skills:{}};const lesson=GRAMMAR_LESSONS.find(x=>x.lv==='A1');for(const q of lesson.qs)S.adaptive.skills['grammar:'+lesson.id+':'+q[0]]={n:1,streak:1,due:Date.now()+86400000};renderRoadmap();`);
assert.match($('wdRoadmap').innerHTML,/data-state="Completed"/);
assert.equal(run('questionTotals(S).n'),0); // render never changes counters
console.log('PASS: question breakdown reconciliation, legacy attempts, daily attribution, unique completion, review states, real-data roadmap rendering and level filter');
