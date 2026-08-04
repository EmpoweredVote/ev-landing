// Build the quote-bubble fit-test page: inline the real rig and the real ev-quotes.js into
// template.html so the result is a single self-contained file.
//
//   node tools/bubble-rig/build.cjs                  -> tools/bubble-rig/bubble-rig.html
//   node tools/bubble-rig/build.cjs <out.html>       -> wherever you point it
//
// Why inline rather than <script src>: the page is published as a Claude artifact, whose CSP blocks
// every external request, so nothing can be fetched at runtime. Inlining also means the page tests
// the CURRENT working tree — rebuild after touching leremy-rig.js or ev-quotes.js or you are
// looking at an old build.
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const REPO = path.join(HERE, '..', '..');
const out = process.argv[2] || path.join(HERE, 'bubble-rig.html');

const SOURCES = [
  ['/*__RIG__*/', 'leremy-rig.js'],
  ['/*__QUOTES_JS__*/', 'ev-quotes.js']
];

let html = fs.readFileSync(path.join(HERE, 'template.html'), 'utf8');

SOURCES.forEach(function (pair) {
  const token = pair[0], file = pair[1];
  if (html.indexOf(token) < 0) throw new Error('template is missing the ' + token + ' placeholder');
  const src = fs.readFileSync(path.join(REPO, file), 'utf8');
  // an inline <script> ends at the first literal closing tag, so a source file containing one would
  // silently truncate the page
  if (src.indexOf('</scr' + 'ipt>') >= 0) {
    throw new Error(file + ' contains a literal closing script tag and cannot be inlined as-is');
  }
  html = html.replace(token, src);
});

if (/__RIG__|__QUOTES_JS__/.test(html)) throw new Error('a placeholder survived replacement');

fs.writeFileSync(out, html);

// report what went in, so a stale build is obvious
const sandbox = { window: {} };
new Function('window', fs.readFileSync(path.join(REPO, 'ev-quotes.js'), 'utf8'))(sandbox.window);
const quotes = sandbox.window.EVQuotes.QUOTES;
console.log('wrote ' + out);
console.log('  ' + (html.length / 1024).toFixed(1) + 'KB · ' + quotes.length + ' quotes from ' +
  new Set(quotes.map(function (q) { return q.who; })).size + ' speakers');
