/* ---------- settings ---------- */
function exportCode(){try{return btoa(unescape(encodeURIComponent(JSON.stringify(S))));}catch(e){return '';}}
function renderSettings(){$('sAuto').checked=S.set.auto;$('sAutoQuestion').checked=S.set.autoQuestion;setSeg($('segRate'),S.set.rate);setSeg($('segTime'),S.set.time);$('sExport').value=exportCode();$('sReset').dataset.arm='';$('sReset').textContent="Reset progress";
  $('sStorage').textContent=storageOK?"Progress is saved in this browser. Connect Google Drive to sync between devices, or use a backup.":"⚠️ Local storage is unavailable. Download a backup.";
  $('sStorage').classList.toggle('warn',!storageOK);pickVoice();}
$('sAuto').onchange=e=>{S.set.auto=e.target.checked;save();};
$('sAutoQuestion').onchange=e=>{S.set.autoQuestion=e.target.checked;save();};
bindSeg($('segRate'),v=>{S.set.rate=+v;save();});
bindSeg($('segTime'),v=>{S.set.time=+v;save();});
$('sTest').onclick=()=>speak('Guten Tag! Ich lerne jeden Tag Deutsch.');
$('sTestTR').onclick=()=>speak("Hello! I learn German every day.","en-GB");
$('sCopy').onclick=()=>{const t=$('sExport');const v=t.value;const fb=()=>{t.focus();t.select();toast("Code selected. Copy it now.");};
  try{navigator.clipboard.writeText(v).then(()=>toast("Copied"),fb);}catch(e){fb();}};
function importProgress(raw){
  const source=raw.trim();
  let obj;
  try{obj=JSON.parse(source);}catch(e){obj=JSON.parse(decodeURIComponent(escape(atob(source))));}
  S=migrate(obj);save();renderSettings();toast("Progress and history restored");
}
$('sLoad').onclick=()=>{try{importProgress($('sImport').value);$('sImport').value='';}catch(e){toast("Invalid backup code");}};
$('sFile').onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{importProgress(await file.text());}catch(err){toast("Invalid or unreadable file");}
  e.target.value='';
};
function downloadBackup(){
  const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download="WortDuell-Backup-"+today()+'.json';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast("Backup downloaded");
}
$('sDownload').onclick=downloadBackup;
$('pBackup').onclick=downloadBackup;
$('sReset').onclick=()=>{const b=$('sReset');if(b.dataset.arm!=='1'){b.dataset.arm='1';b.textContent="Tap again to confirm";return;}
  const keep=S.set;S=fresh();S.set=keep;save();renderSettings();toast("Progress reset");};

