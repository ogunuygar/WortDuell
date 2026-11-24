/* ---------- speech ---------- */
let voices={de:null,tr:null};
function pickVoice(){
  if(!('speechSynthesis' in window)){$('sVoice').textContent="This browser does not support text-to-speech.";return;}
  try{const vs=speechSynthesis.getVoices();
    const chosen=(lang)=>vs.find(v=>v.lang.toLowerCase()===lang.toLowerCase()&&/Google|Microsoft|Anna|Helena|Emel|Yelda|Tolga/i.test(v.name))||vs.find(v=>v.lang.toLowerCase()===lang.toLowerCase())||vs.find(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2)))||null;
    voices.de=chosen('de-DE');voices.tr=chosen("en-GB");
    $('sVoice').textContent="German: "+(voices.de?.name||"browser default")+" · English: "+(voices.tr?.name||"browser default")+". Install a German or English voice on your device if needed.";
  }catch(e){}
}
if('speechSynthesis' in window){pickVoice();try{speechSynthesis.onvoiceschanged=pickVoice;}catch(e){}}
function speak(t,lang='de-DE'){
  if(!('speechSynthesis' in window)){toast("This browser does not support reading aloud.");return;}
  if(!t)return;
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang=lang;
    const v=lang.startsWith("en")?voices.tr:voices.de;if(v)u.voice=v;
    u.rate=Number(S.set.rate)||0.9;u.onerror=ev=>{if(ev.error!=='interrupted'&&ev.error!=='canceled')toast("Audio could not play. Check your device voices.");};
    speechSynthesis.speak(u);
  }catch(e){toast("Audio could not start.");}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-say]');if(b){e.preventDefault();e.stopPropagation();speak(b.getAttribute('data-say'),b.getAttribute('data-lang')||'de-DE');}});
const say=(t,label,lang='de-DE')=>`<button type="button" class="speak" data-say="${esc(t)}" data-lang="${esc(lang)}" title="${esc(label||"Read aloud")}" aria-label="${esc(label||"Read aloud")}">${SPK}</button>`;

