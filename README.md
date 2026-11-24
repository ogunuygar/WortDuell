# WortDuell — Unified A1/A2 German–English edition

This version builds on WortDuell_A1A2_Expanded. It keeps the existing learning engine, layout, backup format and `wortduell1000.v1` storage key. No AI, cloud sync, PWA or GitHub deployment is included.

## Run locally

Open a terminal in the folder containing `index.html`:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Windows: `py -m http.server 8000 --bind 127.0.0.1`. Open http://localhost:8000. JSON loading requires HTTP; direct file opening is not supported reliably. Python is only a development tool, not a production backend.

## Contents

| Dataset | A1 | A2 | Total |
|---|---:|---:|---:|
| Vocabulary and expressions | 831 | 404 | 1235 |
| Conjugation exercises (by exercise level) | 101 | 100 | 201 |
| Grammar lessons | 11 | 11 | 22 |
| Grammar questions | 88 | 88 | 176 |
| Sentence builder | 15 | 19 | 34 |
| Stories | 12 | 14 | 26 |
| Dialogues | 9 | 9 | 18 |

The vocabulary now has 274 verb entries, of which 201 have full six-person present-tense conjugation practice and a Perfekt form. The remaining 73 retain their original lexical forms and examples; complete conjugations have not been added to them. The time/calendar/frequency filter covers 107 entries. There are 2354 ordinary translated example sentences (excluding additional tense examples and grammar lesson examples).

## Single source of truth

```text
data/
  catalog.json
  A1/                    # same structure for A2, B1, B2, C1, C2
    vocabulary/
      nouns.json
      verbs.json         # meanings, examples, conjugation, extra tense examples
      adjectives.json
      adverbs.json
      prepositions.json
      conjunctions.json
      pronouns.json
      question-words.json
      numbers.json
      particles.json
      expressions.json
      time-expressions.json
      other.json
    grammar/
      foundations.json
      cases.json
      tenses.json
      word-order.json
    sentences.json
    stories.json
    dialogues.json
  shared/
    topics.json
    dialogue-practice.json
    grammar/
      cases.json         # unlevelled original reference examples
      grammar-reference.json
css/
js/source/               # editable source sections
js/data-loader.js        # catalog v2 loader and derived conjugation view
js/app.js                 # generated bundle
tools/build.py
```

There is no second level-level `verbs.json` or separate verb tense example bank. 111 original conjugation entries were attached to their matching vocabulary entries; 89 previously conjugation-only verbs became ordinary vocabulary entries. `rufen`, which previously appeared only in the extra tense examples, became a vocabulary entry with six present-tense forms. 27 additional independently authored vocabulary entries fill selected practical and examination vocabulary gaps. All 1118 previous word records remain at their original positions; no existing entry was deleted. New entries generally have one translated example. The original separate lexical description `f` is retained for compatibility; structured conjugation data lives on the same record. `conjugation.label`, `meaning` and `example` are optional overrides for distinct original conjugation-exercise wording, not independent verb records. `conjugation.level` preserves the old exercise difficulty even when a verb's lexical level `l` differs. `conjugation.n` and its `_order` preserve old exercise identities. The academy view is derived at runtime, so both learning modes use one canonical record.

Time words are stored once in time-expressions.json where applicable. They also appear under their word class in the UI by means of the `k` field. Grammar lessons now have a level and a category filter. A1 adds a Präsens lesson; A2 adds a reflexive-verbs lesson. The original 20 lessons remain unchanged.

## Editing and extending

- For vocabulary, use the existing record schema: `w` German word, `t` English meaning, `k` word class, `l` CEFR level, `c` topic, `f` forms/usage, `e1`/`e1t` and optionally `e2`/`e2t` (use empty strings if not supplied), `g` explanation. Set `_order` to the next global index (1235 for the next new word). Never renumber or delete existing records because the legacy progress engine uses their global array indices. Moving records between category files is safe when `_order` remains unchanged.
- To add a conjugation, add a `conjugation` object to the existing verb record: unique `n` (next 202), unique `_order` (next 201), `level`, `type`, six `forms`, and `perf`. Prefer bare subject forms and a `type` other than the legacy `Next 100` (which denotes forms prefixed with subject pronouns). Optional `label` preserves a specific exercise label such as a prepositional construction. Use `tenseExamples` with four strings (German present, English present, German perfect, English perfect) for an optional pair of extra sentences.
- Grammar lesson IDs and global `_order` must be unique; next lesson order is 22. Edit the relevant category file; all files in the catalog load automatically. B1–C2 folders remain empty. No new content becomes visible until its dataset actually contains records.
- Edit JSON and reload; no JavaScript rebuild is required for content updates. If editing JS source, run `python3 tools/build.py` (Windows `py tools/build.py`). The ready-to-run bundle is included. Catalog schema version 2 requires this loader.
- Before changing URL, browser or device, export your old progress in Settings, then import it in the new version. No cloud sync yet. Do not upload personal progress backups to a public repository.

## Curriculum references and limits

Official Goethe-Institut exam preparation and vocabulary lists were consulted as a curriculum reference for everyday topics, time, family, occupations and exam vocabulary. The A1 list describes approximately 650 words and the A2 list broadens the scope. WortDuell's own record count is not directly comparable to Goethe's headword count: this app also counts phrases and some derived forms. This is an independent learning resource, not the complete official Goethe list, a certified course, or a guarantee of exam readiness. Added English translations, examples (except previously supplied German example sentences), and grammar exercises were independently authored. No official example sentences or full official lists were copied. New level placement is editorial; a systematic word-by-word coverage and linguistic audit remains open.

- A1 official practice: https://www.goethe.de/de/spr/prf/ueb/pa1.html
- A1 official word list: https://www.goethe.de/pro/relaunch/prf/el/A1_SD1_Wortliste_02.pdf
- A2 official practice: https://www.goethe.de/de/spr/prf/ueb/pa2.html
- A2 official word list: https://www.goethe.de/pro/relaunch/prf/he/Goethe-Zertifikat_A2_Wortliste.pdf

## Verification

Data integrity checks passed: 1118 original vocabulary rows match exactly after ignoring newly attached conjugation/tense metadata, global indices are contiguous, 200 original conjugation rows reconstruct exactly, and existing grammar, stories, dialogues and sentence builder records match the previous version. JS syntax checks passed. Chromium at 1440px and 390px passed startup, time filter, vocabulary session, dictionary search and expansion for a promoted verb, level/category grammar filtering, Präsens question feedback, full 201-entry conjugation list, verb lookup, and conjugation question feedback. Browser tests used simulated fetch and localStorage with the real JSON/JS; real HTTP deployment, physical Apple devices, Safari, full progress migration tests, and complete language QA have not been performed in this version.
