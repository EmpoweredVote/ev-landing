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
// The first line is a CRLF guard. briefing/index.html is CRLF on disk, and a tool
// that normalises it turns a four-line change into a whole-file diff -- which is
// how the real edit would hide. It refuses rather than write LF.
//
// It knows the current page's markup by its exact strings: the <title>, the
// canonical link, the .sw rule it hangs the archived CSS off, and the opening
// <div class="wrap">. Change any of those in briefing/index.html and this throws
// on the next freeze, naming the one it could not find. That is the intended
// failure -- fix the string here, do not loosen the match.

import { readFileSync, writeFileSync } from 'node:fs';
const p = process.argv[2], date = process.argv[3], human = process.argv[4];
let s = readFileSync(p, 'utf8');
if ((s.match(/\r\n/g) || []).length < 500) throw new Error('CRLF lost');
const sub1 = (old, nw) => {
  const n = s.split(old).length - 1;
  if (n !== 1) throw new Error(`expected 1 occurrence, got ${n}: ${old.slice(0,60)}`);
  s = s.replace(old, nw);
};
sub1('<title>Empowered Vote: State of the Platform</title>',
     `<title>Empowered Vote: State of the Platform &mdash; ${human}</title>`);
sub1('<link rel="canonical" href="https://empowered.vote/briefing" />\r\n',
     `<link rel="canonical" href="https://empowered.vote/briefing/${date}" />\r\n<meta name="robots" content="noindex">\r\n`);
sub1('  .sw{width:13px;height:13px;border-radius:2px;display:inline-block}\r\n',
     '  .sw{width:13px;height:13px;border-radius:2px;display:inline-block}\r\n' +
     '  .archived{background:var(--panel2);border:1px solid var(--line);border-left:3px solid var(--amber);padding:14px 16px;margin:24px 0 0;font-size:14px;color:var(--dim)}\r\n' +
     '  .archived b{color:var(--text)}\r\n' +
     '  .archived a{color:var(--gold)}\r\n');
sub1('<div class="wrap">\r\n',
     '<div class="wrap">\r\n<div class="archived">\r\n' +
     `  <b>This is an archived briefing.</b>  It was published on <b>${human}</b> and has not been\r\n` +
     '  changed since.  Every figure on this page was true on that date and is not kept current.\r\n' +
     '  For where the platform stands today, read the <a href="/briefing">current briefing</a>.\r\n</div>\r\n');
writeFileSync(p, s);
console.log('frozen', p, s.length);
