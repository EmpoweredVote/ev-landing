// freeze.mjs -- the three hand edits in step 1 of README.md, done by script.
//
//   node briefing/freeze.mjs briefing/2026-09-22/index.html 2026-09-22 "September 22, 2026"
//
// Run it on the COPY, after `cp briefing/index.html briefing/<date>/index.html`,
// never on briefing/index.html itself. It retitles the page, points the canonical
// at the dated address and adds noindex, and inserts the .archived banner with its
// CSS. Each of the four replacements must match exactly once or it throws and
// writes nothing, so a half-frozen page is not a state it can leave behind.
//
// LINE ENDINGS. Git stores briefing/index.html with LF. The Windows machine that runs
// the scheduled edition checks it out with CRLF; a Mac or Linux checkout has LF. This
// script works in either: it reads which ending the file uses and writes its own lines
// with the same one, so a four-line change never turns into a whole-file diff. It
// refuses a file that mixes the two, because then there is no single ending to match.
// (Until 2026-11-19 it demanded CRLF and so refused to run anywhere but Windows.)
//
// It knows the current page's markup by its exact strings: the <title>, the
// canonical link, the .sw rule it hangs the archived CSS off, and the opening
// <div class="wrap">. Change any of those in briefing/index.html and this throws
// on the next freeze, naming the one it could not find. That is the intended
// failure -- fix the string here, do not loosen the match.

import { readFileSync, writeFileSync } from 'node:fs';
const p = process.argv[2], date = process.argv[3], human = process.argv[4];
if (!p || !/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !human) {
  throw new Error('usage: node briefing/freeze.mjs <copy>/index.html YYYY-MM-DD "Month D, YYYY"');
}
let s = readFileSync(p, 'utf8');
const crlf = (s.match(/\r\n/g) || []).length;
const lf = (s.match(/\n/g) || []).length;
if (lf < 500) throw new Error(`only ${lf} lines -- is this really a briefing page?`);
if (crlf && crlf !== lf) throw new Error(`mixed line endings: ${crlf} CRLF of ${lf} lines`);
const E = crlf ? '\r\n' : '\n';
const sub1 = (old, nw) => {
  const n = s.split(old).length - 1;
  if (n !== 1) throw new Error(`expected 1 occurrence, got ${n}: ${old.slice(0,60)}`);
  s = s.replace(old, () => nw);
};
sub1('<title>Empowered Vote: State of the Platform</title>',
     `<title>Empowered Vote: State of the Platform &mdash; ${human}</title>`);
sub1(`<link rel="canonical" href="https://empowered.vote/briefing" />${E}`,
     `<link rel="canonical" href="https://empowered.vote/briefing/${date}" />${E}<meta name="robots" content="noindex">${E}`);
sub1(`  .sw{width:13px;height:13px;border-radius:2px;display:inline-block}${E}`,
     `  .sw{width:13px;height:13px;border-radius:2px;display:inline-block}${E}` +
     `  .archived{background:var(--panel2);border:1px solid var(--line);border-left:3px solid var(--amber);padding:14px 16px;margin:24px 0 0;font-size:14px;color:var(--dim)}${E}` +
     `  .archived b{color:var(--text)}${E}` +
     `  .archived a{color:var(--gold)}${E}`);
sub1(`<div class="wrap">${E}`,
     `<div class="wrap">${E}<div class="archived">${E}` +
     `  <b>This is an archived briefing.</b>  It was published on <b>${human}</b> and has not been${E}` +
     `  changed since.  Every figure on this page was true on that date and is not kept current.${E}` +
     `  For where the platform stands today, read the <a href="/briefing">current briefing</a>.${E}</div>${E}`);
writeFileSync(p, s);
console.log('frozen', p, s.length, crlf ? 'CRLF' : 'LF');
