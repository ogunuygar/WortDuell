const DATA = content.vocabulary;
const TOPIC_TR = content.TOPIC_TR;
const TOPICS = [...new Set(DATA.map(d=>d.c))];
DATA.forEach((d,i)=>{d.i=i; const m=d.w.match(/^(der|die|das)\s+(.+)$/); d.art=m?m[1]:''; d.bare=m?m[2]:d.w;});


// Level choices come from the content catalog, not from hard-coded A1/A2 lists.
const vocabularyLevels = content.availableLevels.vocabulary;
const allLevelLabel = levels => levels.join(' + ') || 'All';
const levelChoice = (value, levels) => levels.includes(value) ? value : 'all';
function setLevelOptions(select, levels, allLabel = 'All levels', label = lv => lv) {
  const previous = select.value;
  select.replaceChildren(new Option(allLabel, 'all'), ...levels.map(lv => new Option(label(lv), lv)));
  select.value = levelChoice(previous, levels);
}
function addLevelFilter(container, id, levels, onChange) {
  const select = document.createElement('select');
  select.id = id; select.className = 'wd-simple-select';
  select.setAttribute('aria-label', 'Level');
  setLevelOptions(select, levels);
  select.addEventListener('change', onChange);
  container.appendChild(select);
  return select;
}
