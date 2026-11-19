// Every public page must carry a link-preview image, or LinkedIn, Facebook, Slack and
// iMessage show a grey placeholder card when someone shares it.  That is how /donate
// went out on LinkedIn in November 2026: it had og:title and og:description but no
// og:image.
//
// Checks every top-level .html page plus briefing/index.html for og:image (an absolute
// https URL), twitter:card = summary_large_image, and og:image:width/height that match
// the real pixel size of the image file they point at.
//
// SKIPPED on purpose:
//   redirect stubs (http-equiv="refresh", today only framer.html) -- they bounce at once
//                   and are never seen, the same rule .github/workflows/check-analytics.yml uses.
//   maps/*       -- purpose-map.html is generated in a separate repo (see maps/README.md),
//                   and the other two are unlinked working files.
// A new top-level page is checked automatically; add it to SKIP only if it is not public.
import { readFileSync, readdirSync } from 'node:fs';

const SKIP = new Set([]);
const pages = readdirSync('.')
  .filter((f) => f.endsWith('.html') && !SKIP.has(f))
  .filter((f) => !readFileSync(f, 'utf8').includes('http-equiv="refresh"'));
pages.push('briefing/index.html');

const meta = (head, key) => {
  const m = head.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`));
  return m && m[1];
};
const pngSize = (file) => {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

const errs = [];
for (const f of pages) {
  const s = readFileSync(f, 'utf8');
  const head = s.slice(0, s.indexOf('</head>'));
  const img = meta(head, 'og:image');
  if (!img) { errs.push(`${f}: no og:image`); continue; }
  if (!img.startsWith('https://')) errs.push(`${f}: og:image is not an absolute https URL: ${img}`);
  if (meta(head, 'twitter:card') !== 'summary_large_image') errs.push(`${f}: twitter:card is not summary_large_image`);
  const local = img.match(/^https:\/\/empowered\.vote\/(.+\.png)$/);
  if (local) {
    const [w, h] = pngSize(local[1]);
    const mw = meta(head, 'og:image:width'), mh = meta(head, 'og:image:height');
    if ((mw && +mw !== w) || (mh && +mh !== h)) errs.push(`${f}: og:image size says ${mw}x${mh}, ${local[1]} is ${w}x${h}`);
  }
}
if (errs.length) throw new Error('Link-preview tags missing or wrong:\n  ' + errs.join('\n  '));
console.log(`PASS og-image: ${pages.length} pages`);
