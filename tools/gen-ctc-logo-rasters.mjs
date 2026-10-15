/**
 * gen-ctc-logo-rasters.mjs — rebuild the Civic Trivia logo PNGs from the SVG.
 *
 *   NODE_PATH=<playwright> node tools/gen-ctc-logo-rasters.mjs
 *
 * The lockup gained a final "s" on 2026-10-15 — it read "championship" while
 * the site, the film and every file name said "championships" — so the eight
 * Logo PNGs no longer matched their source. They are generated now.
 *
 * The Civic Trivia convention is not the Compass one. These files are trimmed
 * flush to ink on all four sides, measured: 400x110, 800x219 and 2400x655 all
 * came back with zero padding. Compass logo PNGs sit flush left with 1% on
 * the other three sides, which is why tools/gen-compass-rasters.mjs does its
 * own thing rather than this being one shared script.
 *
 * Nothing here touches Symbol/ or Favicon/. Those are the trophy alone, and
 * the wordmark change does not reach them.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const WIDTHS = [400, 800, 1200, 2400];
const THEMES = ['dark', 'light'];

// Stroke-aware ink box. The Civic Trivia lockup is all fills, but the helper
// is the same one the thumbnail and Compass generators use, and a future
// stroked glyph would silently clip without it.
const INK = () => {
  const s = document.querySelector('svg');
  const root = s.getCTM();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const el of s.querySelectorAll('*')) {
    if (!(el instanceof SVGGraphicsElement)) continue;
    if (el.tagName === 'g' || el.tagName === 'defs') continue;
    if (el.closest('defs, clipPath, mask, symbol, pattern, marker')) continue;
    const bb = el.getBBox();
    if (!bb.width && !bb.height) continue;
    const cs = getComputedStyle(el);
    const pad = (cs.stroke && cs.stroke !== 'none') ? parseFloat(cs.strokeWidth) / 2 : 0;
    const local = root && el.getCTM() ? root.inverse().multiply(el.getCTM()) : null;
    const corners = [[bb.x - pad, bb.y - pad], [bb.x + bb.width + pad, bb.y + bb.height + pad]];
    for (const c of corners) {
      const q = local ? new DOMPoint(c[0], c[1]).matrixTransform(local) : { x: c[0], y: c[1] };
      x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y);
      x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
    }
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
};

const browser = await chromium.launch();
const written = [];

for (const theme of THEMES) {
  const src = join(ROOT, 'brand/civic-trivia-championship/Logo/SVG/civic-trivia-logo-' + theme + '.svg');
  const svg = readFileSync(src, 'utf8');

  const measure = await browser.newPage({ viewport: { width: 1000, height: 400 } });
  await measure.setContent('<body style="margin:0">' + svg + '</body>');
  const ink = await measure.evaluate(INK);
  await measure.close();

  const framed = svg.replace('<svg',
    '<svg viewBox="' + ink.x + ' ' + ink.y + ' ' + ink.width + ' ' + ink.height
    + '" preserveAspectRatio="xMidYMid meet"');

  for (const w of WIDTHS) {
    const h = Math.round(w * ink.height / ink.width);
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.setContent('<body style="margin:0">'
      + framed.replace('<svg', '<svg style="width:' + w + 'px;height:' + h + 'px;display:block"')
      + '</body>');
    writeFileSync(join(ROOT, 'brand/civic-trivia-championship/Logo/PNG/civic-trivia-logo-' + theme + '-' + w + 'w.png'),
      await page.screenshot({ omitBackground: true }));
    await page.close();
    written.push('civic-trivia-logo-' + theme + '-' + w + 'w.png  (' + w + 'x' + h + ')');
  }
}

await browser.close();
console.log(written.join('\n'));
console.log('\n' + written.length + ' logo PNGs rebuilt from the Civic Trivia SVGs.');
