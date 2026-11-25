"""WortDuell build: migrate OAuth/storage and keep inline CSP hashes in sync."""
from pathlib import Path
import base64
import hashlib
import re
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'js' / 'source'
CLIENT = '406290812417-8ioo5cb50nktmsl0spp2r4t1egtjjm42.apps.googleusercontent.com'
REPLACEMENTS = {
    'wortduell1000.v1': 'wortduell1000.v2',
    'wortduell.cloud.v1': 'wortduell.cloud.v2',
    'wortduell-sync-v1-': 'wortduell-sync-v2-',
}


def migrate(text):
    for old, new in REPLACEMENTS.items():
        text = text.replace(old, new)
    return re.sub(r"(\bCLIENT\s*=\s*)(['\"])[^'\"]+\.apps\.googleusercontent\.com\2",
                  lambda m: m[1] + m[2] + CLIENT + m[2], text)


class InlineScripts(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.current = None
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        if tag == 'script' and 'src' not in dict(attrs):
            self.current = []

    def handle_data(self, data):
        if self.current is not None:
            self.current.append(data)

    def handle_endtag(self, tag):
        if tag == 'script' and self.current is not None:
            self.scripts.append(''.join(self.current))
            self.current = None


def update_csp(html):
    parser = InlineScripts()
    parser.feed(html)
    parser.close()
    if not parser.scripts:
        raise RuntimeError('No inline scripts found; check index.html')
    hashes = list(dict.fromkeys(
        "'sha256-" + base64.b64encode(hashlib.sha256(s.encode('utf-8')).digest()).decode('ascii') + "'"
        for s in parser.scripts
    ))
    def replace_directive(match):
        directive = re.sub(r"\s+'sha(?:256|384|512)-[^']+'", '', match[0]).rstrip()
        return directive + ' ' + ' '.join(hashes)
    # Limit the rewrite to the existing CSP meta tag; preserve other directives.
    pattern = r'<meta\b(?=[^>]*\bhttp-equiv\s*=\s*[\'"]Content-Security-Policy[\'"])[^>]*>'
    def replace_meta(match):
        updated, count = re.subn(r'\bscript-src\s+[^;\"]+', replace_directive, match[0])
        if count != 1:
            raise RuntimeError('Expected one script-src directive')
        return updated
    html, count = re.subn(pattern, replace_meta, html, flags=re.IGNORECASE)
    if count != 1:
        raise RuntimeError('Expected exactly one CSP meta tag')
    print(f'CSP: {len(hashes)} inline script hashes')
    return html


def update_pwa_meta(html):
    """Retain the Apple tag and add its standard mobile counterpart once."""
    standard = r'<meta\b[^>]*\bname\s*=\s*(?:"mobile-web-app-capable"|\'mobile-web-app-capable\'|mobile-web-app-capable(?=\s|/?>))[^>]*>'
    apple = r'<meta\b[^>]*\bname\s*=\s*(?:"apple-mobile-web-app-capable"|\'apple-mobile-web-app-capable\'|apple-mobile-web-app-capable(?=\s|/?>))[^>]*>'
    if re.search(standard, html, re.IGNORECASE):
        return html
    tag = '<meta name="mobile-web-app-capable" content="yes">'
    html, count = re.subn(apple, lambda m: m[0] + tag, html, count=1, flags=re.IGNORECASE)
    if not count:
        html, count = re.subn(r'</head\s*>', lambda m: tag + m[0], html, count=1, flags=re.IGNORECASE)
        if not count:
            raise RuntimeError('No head element found for PWA metadata')
    return html


def main():
    index = ROOT / 'index.html'
    html = migrate(index.read_text(encoding='utf-8'))
    for new in (*REPLACEMENTS.values(), CLIENT):
        if new not in html:
            raise RuntimeError(f'Expected migration marker missing: {new}')
    html = update_pwa_meta(html)
    html = update_csp(html)
    files = sorted(SOURCE.glob('[0-9][0-9]-*.js'))
    if len(files) != 18 or files[-1].name != '18-cloud-sync.js':
        raise RuntimeError('Unexpected js/source layout; build stopped')
    parts = []
    for path in files:
        original = path.read_text(encoding='utf-8')
        updated = migrate(original)
        if updated != original:
            path.write_text(updated, encoding='utf-8')
        parts.append(updated)
    # Keep the separately generated runtime for the existing release workflow.
    # The current index contains a newer inline runtime: do not replace it.
    output = ('// Generated from js/source/ by tools/build.py. Do not edit directly.\n'
              'loadWortDuellData().then(function(content){\n"use strict";\n'
              + ''.join(parts) + '}).catch(wortDuellLoadError);\n')
    (ROOT / 'js' / 'app.js').write_text(output, encoding='utf-8')
    index.write_text(html, encoding='utf-8')
    print('Built js/app.js; updated index.html OAuth, storage v2, PWA metadata and CSP.')


if __name__ == '__main__':
    main()
