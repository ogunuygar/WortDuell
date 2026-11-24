/* ---------- dictionary ---------- */
$('dTopic').innerHTML="<option value=\"\">All topics</option><option value=\"*fav\">Favourites</option><option value=\"*wrong\">My mistakes</option>"+TOPICS.map((t,k)=>`<option value="${k}">${esc(t)}</option>`).join('');
let dT=null;$('dSearch').addEventListener('input',()=>{clearTimeout(dT);dT=setTimeout(renderDict,150);});$('dTopic').onchange=renderDict;
const fold=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss').replace(/ı/g,'i');
function renderDict(){
  const q=fold($('dSearch').value.trim()),tv=$('dTopic').value;
  let L=DATA;
  if(tv==='*fav')L=L.filter(d=>S.fav.includes(d.i));else if(tv==='*wrong')L=L.filter(d=>isWrong(d.i));else if(tv!=='')L=L.filter(d=>d.c===TOPICS[+tv]);
  if(q)L=L.filter(d=>fold(d.w+' '+d.t).includes(q));
  $('dCount').textContent=L.length+" words";
  const show=L.slice(0,150);
  $('dList').innerHTML=show.map(d=>`<details class="drow" data-i="${d.i}"><summary><span class="dot ${learned(d.i)?'l':(isWrong(d.i)?'w':'')}"></span><div class="t"><b>${wordHTML(d)}</b><span>${esc(d.t)}</span></div>${say(d.w,"Listen in German")}${say(d.t,"Listen in English","en-GB")}</summary><div class="body"></div></details>`).join('')+(L.length>150?`<p class="muted" style="text-align:center;font-size:14px">Showing the first 150 matches. Narrow your search.</p>`:'');
}
$('dList').addEventListener('toggle',e=>{const el=e.target;if(el.open){const b=el.querySelector('.body');if(!b.innerHTML)b.innerHTML=detailHTML(DATA[+el.dataset.i]);}},true);

