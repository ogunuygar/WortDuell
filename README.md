# WortDuell — Unified A1/A2 German–English PWA

This version builds on WortDuell_A1A2_Expanded. It keeps the existing learning engine, layout, backup format and `wortduell1000.v1` storage key. This release adds PWA support and automated GitHub Pages deployment. AI and cloud sync are not included.

## Publish and install (PWA)

1. Copy this release into the existing Git working tree, keeping `.git` and the current remote. Include the hidden `.github/workflows/pages.yml` file. If you have uncommitted edits, review or back them up first. Export learning progress in Settings before installation, particularly if you are moving from localhost or Safari to a standalone app.
2. On GitHub, open repository **Settings → Pages → Build and deployment → Source → GitHub Actions** (instead of Deploy from a branch). This is a one-time change. Commit and push to `main`; the included workflow **Publish WortDuell** builds the generated JS, creates a content-hashed offline manifest, and deploys only the public runtime files. If the push preceded changing the Pages source, run the workflow manually under Actions → Publish WortDuell → Run workflow.
3. Open the published URL shown in Settings → Pages (for this repository, `https://ogunuygar.github.io/WortDuell/`). In WortDuell → Settings → App & offline updates, wait for **Ready for offline use** while connected to the internet.
4. iPhone / iPad: open in Safari → Share → Add to Home Screen; enable Open as Web App if offered. Mac: Safari → File → Add to Dock. Open the installed app while online at least once, and check its own offline status. If progress is missing, import your exported backup. Then test in Airplane Mode (disable Wi-Fi too).

All 140 current runtime assets, including the catalog and the A1–C2 dataset files, are included in the initial offline release. The service worker verifies the exact bytes of every resource before installation. Each new deployment automatically gets a new content hash if runtime files change; failed installations do not intentionally replace the active release. The app checks for updates on launch, when returning to the foreground, on reconnection and periodically while open. A downloaded release waits until older windows close, or you choose **Update & reload**. Finish the current exercise first; clicking Apply can reload other open WortDuell windows. Saved progress retains its existing localStorage key. Cache data and storage can be evicted by the operating system, and speech recognition or speech synthesis may require internet/device voices. Offline mode is not cross-device synchronization.

For development, `python3 tools/build.py` is needed after editing JS source sections; then `python3 tools/prepare_pwa.py` refreshes local release metadata when any runtime file changes. You do not need to run these commands for production: GitHub Actions does both after push. If testing local changes with an existing service worker, apply its update or use a fresh browser profile. The application can still be used online when a browser does not support PWA features.

PWA files: `manifest.webmanifest`, `sw.js`, `pwa-assets.js` (generated), `icons/`, `js/pwa.js`, `css/pwa.css`, `.github/workflows/pages.yml`, `tools/prepare_pwa.py`. The optional `node tools/test_pwa.mjs` test uses a simulated service worker environment (Node 22+ and Python 3) and is not required for using the app. See the original educational-content documentation below.

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
- Edit JSON; no JavaScript rebuild is required for content updates. For local PWA development regenerate the offline metadata and apply the update, or let the GitHub Actions workflow handle this on push. If editing JS source, run `python3 tools/build.py` (Windows `py tools/build.py`). The ready-to-run bundle is included. Catalog schema version 2 requires this loader.
- Before changing URL, browser or device, export your old progress in Settings, then import it in the new version. No cloud sync yet. Do not upload personal progress backups to a public repository.

## Curriculum references and limits

Official Goethe-Institut exam preparation and vocabulary lists were consulted as a curriculum reference for everyday topics, time, family, occupations and exam vocabulary. The A1 list describes approximately 650 words and the A2 list broadens the scope. WortDuell's own record count is not directly comparable to Goethe's headword count: this app also counts phrases and some derived forms. This is an independent learning resource, not the complete official Goethe list, a certified course, or a guarantee of exam readiness. Added English translations, examples (except previously supplied German example sentences), and grammar exercises were independently authored. No official example sentences or full official lists were copied. New level placement is editorial; a systematic word-by-word coverage and linguistic audit remains open.

- A1 official practice: https://www.goethe.de/de/spr/prf/ueb/pa1.html
- A1 official word list: https://www.goethe.de/pro/relaunch/prf/el/A1_SD1_Wortliste_02.pdf
- A2 official practice: https://www.goethe.de/de/spr/prf/ueb/pa2.html
- A2 official word list: https://www.goethe.de/pro/relaunch/prf/he/Goethe-Zertifikat_A2_Wortliste.pdf

## Verification

Data integrity checks passed: 1118 original vocabulary rows match exactly after ignoring newly attached conjugation/tense metadata, global indices are contiguous, 200 original conjugation rows reconstruct exactly, and existing grammar, stories, dialogues and sentence builder records match the previous version. JS syntax checks passed. Chromium at 1440px and 390px passed startup, time filter, vocabulary session, dictionary search and expansion for a promoted verb, level/category grammar filtering, Präsens question feedback, full 201-entry conjugation list, verb lookup, and conjugation question feedback. Browser tests used simulated fetch and localStorage with the real JSON/JS; real HTTP deployment, physical Apple devices, Safari, full progress migration tests, and complete language QA have not been performed in this version.

## PWA verification

The original data and learning JavaScript are unchanged. Syntax, generated release metadata and simulated service-worker install, cache-only navigation, all runtime assets, JSON-only version change, rejection of a corrupted update, activation and old-cache cleanup were tested. Live HTTP browser testing was blocked by the execution environment; GitHub Actions deployment, Safari, iOS/iPadOS installation and real offline/update behavior remain to be verified on the published site.

## Optional local AI chat (experimental)

Open **AI Tutor** from the floating button on any study screen. Press **Download AI model** once on each device, then ask any German-learning question. No activity, CEFR level or model selector is required. The app chooses Qwen2.5 0.5B on phones/tablets and 1.5B on desktops automatically. Device detection is a heuristic. The WebLLM runtime is pinned to 0.2.85; model and runtime artifacts are downloaded from external hosts when needed. Models remain in browser-managed storage, not the project directory or GitHub. After closing the panel, sending a question starts the AI again; if cached files have been evicted, internet and another download may be necessary. The dedicated worker stops when the panel closes, the app becomes hidden, the page is left, or Stop/Release is pressed. Only recent completed turns are passed to the model; chat history is session-only. Model replies are not authoritative grammar references. WebGPU/worker support and real model performance must be tested on each device. The main learning app remains usable without AI. No paid inference API is used.

For a published PWA, files in a local Mac folder are not directly accessible on iPhone. Do not commit model weights to this repository. The model cache is separate from WortDuell's small offline release cache; offline AI is not guaranteed.

### AI model storage

Settings → AI model storage has **Download Model**, **Unload Model**, and **Delete Model**. Download prepares the automatically selected model, reusing cached files where possible. Unload stops the inference worker and keeps downloaded files. Delete first stops inference, then uses WebLLM 0.2.85's model-specific cache API for both Qwen sizes and both precision variants, including incomplete downloads. It does not clear site storage, lesson caches, or learning records. It clears only AI download indicators after successful deletion. The runtime import may require internet access. Close other WortDuell tabs before deleting to prevent concurrent downloads; the browser manages when disk space is reclaimed. A previous download indicator is not proof that cached weights are still present. The model and its cache are local to the current browser/app storage context.
