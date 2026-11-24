// Load CEFR folders, preserving the original global record order and vocabulary IDs.
async function loadWortDuellData() {
  async function read(path) {
    const response = await fetch("data/" + path);
    if (!response.ok) throw new Error(path + ": HTTP " + response.status);
    return response.json();
  }
  const catalog = await read("catalog.json");
  if (catalog.schemaVersion !== 2) throw new Error("Unsupported data catalog");
  const levels = catalog.levels;
  const content = { levels, availableLevels: {} };
  await Promise.all([
    ...Object.entries(catalog.levelDatasets).map(async ([key, spec]) => {
      const groups = await Promise.all(levels.map(async level => {
        const paths = spec.files || [spec.file];
        const parts = await Promise.all(paths.map(file => read(level + "/" + file)));
        if (parts.some(part => !Array.isArray(part))) throw new Error("Invalid dataset: " + key);
        if (key === 'GRAMMAR_LESSONS') {
          content.grammarGroups ||= {};
          parts.forEach((part,i)=>part.forEach(lesson=>{
            content.grammarGroups[lesson.id] = paths[i].split('/').pop().replace(/\.json$/, '');
          }));
        }
        const rows = parts.flat();
        if (!Array.isArray(rows) || rows.some(row => row[spec.levelField] !== level))
          throw new Error("Invalid level data: " + level + "/" + (spec.file || key));
        return rows;
      }));
      content.availableLevels[key] = levels.filter((_, i) => groups[i].length > 0);
      const rows = groups.flat().sort((a, b) => a._order - b._order);
      if (rows.some((row, i) => row._order !== i))
        throw new Error("Missing or duplicate _order in " + (spec.file || key));
      content[key] = rows.map(({ _order, ...row }) => row);
    }),
    ...Object.entries(catalog.sharedDatasets).map(async ([key, path]) => {
      content[key] = await read(path);
    })
  ]);
  // Derive the legacy academy views from the canonical vocabulary records.
  const verbs = content.vocabulary.filter(row => row.conjugation).map(row => {
    const { label, meaning, example, ...conjugation } = row.conjugation;
    return { ...conjugation, v: label || row.w, tr: meaning || row.t,
      example: example || row.e1, vocabularyWord: row.w };
  }).sort((a,b) => a._order - b._order);
  if (verbs.some((v,i) => v._order !== i || v.forms.length !== 6 || !levels.includes(v.level)) || new Set(verbs.map(v=>v.n)).size !== verbs.length)
    throw new Error("Invalid conjugation records");
  content.verbs = verbs.map(({ _order, ...row }) => row);
  content.availableLevels.verbs = levels.filter(lv => verbs.some(v => v.level === lv));
  content.WD_TENSE_EXAMPLES = Object.fromEntries(content.vocabulary.filter(row => row.tenseExamples).map(row=>[row.w,row.tenseExamples]));
  return content;
}
function wortDuellLoadError(error) {
  console.error(error);
  document.getElementById("app").hidden = true;
  const message = document.createElement("p");
  message.textContent = location.protocol === "file:"
    ? "Open WortDuell through a local HTTP server. See README.md for instructions."
    : "WortDuell could not load its data. Reload the page and check the console.";
  message.setAttribute("role", "alert");
  message.style.padding = "20px";
  document.body.appendChild(message);
}
