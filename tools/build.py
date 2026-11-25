from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "js" / "source"
FILES = ['01-vocabulary.js', '02-storage.js', '03-helpers.js', '04-speech.js', '05-navigation.js', '06-home.js', '07-quiz.js', '08-dictionary.js', '09-settings.js', '10-progress.js', '11-practice.js', '12-grammar-academy.js', '13-sentence-builder.js', '14-study-hub.js', '15-adaptive-memory.js', '16-desktop.js', '17-vocabulary-study.js', '18-cloud-sync.js']

parts = [(SOURCE / name).read_text(encoding="utf-8") for name in FILES]
output = ("// Generated from js/source/ by tools/build.py. Do not edit directly.\n"
          "loadWortDuellData().then(function(content){\n\"use strict\";\n"
          + "".join(parts) + "}).catch(wortDuellLoadError);\n")
(ROOT / "js" / "app.js").write_text(output, encoding="utf-8")
print("Built js/app.js")
