/* ---------- screens ---------- */
const SCREENS=['home','quiz','result','dict','settings','progress','practice','practiceResult','analytics','academy','lesson','grammarPlay','grammarDone','verbs','verbPlay','cases','builder','builderEnd','hub','hubStories','hubStory','hubTalks','hubTalk','hubVerb','hubCloze','hubCards','hubRepeat','hubPersonal','hubMistakes','hubGuide'];
function show(id){SCREENS.forEach(s=>$(s).hidden=s!==id);window.scrollTo(0,0);if(id==='home')renderHome();}
document.querySelectorAll('[data-home]').forEach(b=>b.onclick=()=>show('home'));

