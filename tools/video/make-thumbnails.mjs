/**
 * make-thumbnails.mjs — share cards for the explainer videos.
 *
 * One 1280x720 PNG per feature: the site's dark ground, the Empowered Vote
 * mark alone in the top left, and the feature lockup large in the middle.
 * No other text. The files are written to tools/video/thumbnails/.
 *
 *   NODE_PATH=<playwright> node tools/video/make-thumbnails.mjs
 *
 * Two things are normalised here, and both matter if you add a seventh card.
 *
 * 1. The lockups do not share a viewBox convention. Some run flush to their
 *    own box on all four sides and some carry padding, so fitting them by
 *    viewBox would make the padded ones read a size smaller. Each SVG is
 *    measured and its viewBox is replaced by its own ink box, so every card
 *    is fitted on ink and nothing else. The measurement is stroke-aware:
 *    getBBox() reports geometry only, and fitting Compass to that clipped the
 *    top and bottom off its red ring, which is a stroked circle.
 *
 * 2. The Empowered Vote mark has no file of its own. It is the right-hand
 *    third of icons/logo-dark.png — measured, not guessed: the wordmark and
 *    the mark are separated by one 40px column of transparent pixels, and the
 *    mark's ink box is x 425..687 of 688, full height.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const OUT = join(HERE, 'thumbnails');

// 1280x720 is YouTube's thumbnail; 1200x627 is LinkedIn's share image. The
// composition is identical — every length below is scaled by height/720 — so
// the two sizes are the same card, not two designs.
const SIZES = [{ w: 1280, h: 720 }, { w: 1200, h: 627 }];
const BG = '#111113';          // --bg in the dark theme, index.html

// The Empowered Vote mark inside icons/logo-dark.png.
const EV = { file: 'icons/logo-dark.png', sheetW: 688, sheetH: 156, x: 425, w: 263, h: 156 };
const EV_H = 74;               // rendered height of the corner mark, at 720 high
const EV_MARGIN = 52;

// Lockups are sized by INK AREA, not by a box they are fitted into. A
// contain-fit inside one box makes the squarer lockups read much larger than
// the long ones — Fallacy Finders came out half again the size of Essentials.
// Matching sqrt(area) gives every card the same visual weight. TARGET is the
// side of the square each lockup's ink is scaled to cover; 415 is the largest
// value that keeps the widest lockup (Essentials) inside MAX_W.
const TARGET = 415;
const MAX_W = 900;
const MAX_H = 330;

const FEATURES = [
  { slug: 'empowered-essentials', svg: 'brand/essentials/Logo/SVG/essentials-logo-dark.svg' },
  { slug: 'empowered-compass',    svg: 'brand/compass/Logo/SVG/compass-logo-dark.svg' },
  { slug: 'treasury-tracker',     svg: 'brand/treasury-tracker/Logo/SVG/treasury-tracker-logo-dark.svg' },
  { slug: 'read-and-rank',        svg: 'brand/read-and-rank/Logo/SVG/read-and-rank-logo-dark.svg' },
  { slug: 'civic-trivia-championships', svg: 'brand/civic-trivia-championship/Logo/SVG/civic-trivia-logo-dark.svg' },
  { slug: 'fallacy-finders',      svg: 'brand/fallacy-finders/Logo/SVG/fallacy-finders-logo-dark.svg' },
];

function dataUri(file) {
  return 'data:image/png;base64,' + readFileSync(join(ROOT, file)).toString('base64');
}

function page(svgMarkup, evUri, W, H, k) {
  const evH = EV_H * k;
  const evMargin = EV_MARGIN * k;
  const evW = Math.round(evH * (EV.w / EV.h));
  const scale = evH / EV.sheetH;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body { margin:0; padding:0; width:${W}px; height:${H}px; background:${BG}; }
  #ev {
    position:absolute; left:${evMargin}px; top:${evMargin}px;
    width:${evW}px; height:${evH}px;
    background-image:url("${evUri}");
    background-repeat:no-repeat;
    background-size:${EV.sheetW * scale}px ${EV.sheetH * scale}px;
    background-position:${-EV.x * scale}px 0;
  }
  #box {
    position:absolute; inset:0;
    display:flex; align-items:center; justify-content:center;
  }
  #box svg { display:block; }
  </style></head><body><div id="ev"></div><div id="box">${svgMarkup}</div></body></html>`;
}

const browser = await chromium.launch();
const evUri = dataUri(EV.file);
mkdirSync(OUT, { recursive: true });

const report = [];
for (const size of SIZES) {
const { w: W, h: H } = size;
const k = H / 720;
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
for (const f of FEATURES) {
  const svg = readFileSync(join(ROOT, f.svg), 'utf8');
  await p.setContent(page(svg, evUri, W, H, k));
  // Replace the viewBox with the artwork's own ink box, so padding in the
  // source file cannot change how big the lockup reads on the card.
  const ink = await p.evaluate(({ target, maxW, maxH }) => {
    const s = document.querySelector('#box svg');
    // Stroke-aware ink box. getBBox() returns GEOMETRY only — a stroked path
    // reports the bbox of its centre line and says nothing about the paint
    // either side of it. Fitting a viewBox to that shaved the top and bottom
    // off the Compass ring, which is a stroked circle.
    //
    // Neither of the obvious ways out works in Chromium. getBBox({stroke:true})
    // is accepted and ignored, and getBoundingClientRect() on an SVG shape
    // returns the same geometry box. Both were measured here, not assumed. So
    // each element is padded by half its own computed stroke width and the
    // result is mapped into the root's user space.
    const root = s.getCTM();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const el of s.querySelectorAll('*')) {
      if (!(el instanceof SVGGraphicsElement)) continue;
      if (el.tagName === 'g' || el.tagName === 'defs') continue;
      // Shapes inside <defs>/<clipPath> are not painted. They are still
      // reachable from querySelectorAll and getBBox() still answers for them,
      // and two of the six lockups keep a full-viewBox clip rect in there —
      // counting it made Essentials measure 167 tall instead of 134.
      if (el.closest('defs, clipPath, mask, symbol, pattern, marker')) continue;
      const bb = el.getBBox();
      if (!bb.width && !bb.height) continue;
      const cs = getComputedStyle(el);
      const pad = (cs.stroke && cs.stroke !== 'none') ? parseFloat(cs.strokeWidth) / 2 : 0;
      const local = root && el.getCTM() ? root.inverse().multiply(el.getCTM()) : null;
      const pts = [[bb.x - pad, bb.y - pad], [bb.x + bb.width + pad, bb.y + bb.height + pad]];
      for (const [px, py] of pts) {
        const q = local ? new DOMPoint(px, py).matrixTransform(local) : { x: px, y: py };
        x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y);
        x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
      }
    }
    const g = s.getBBox();
    const b = Number.isFinite(x0)
      ? { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
      : { x: g.x, y: g.y, width: g.width, height: g.height };
    s.setAttribute('viewBox', `${b.x} ${b.y} ${b.width} ${b.height}`);
    s.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    s.removeAttribute('width'); s.removeAttribute('height');
    let k = target / Math.sqrt(b.width * b.height);
    k = Math.min(k, maxW / b.width, maxH / b.height);
    s.style.width = b.width * k + 'px';
    s.style.height = b.height * k + 'px';
    return { width: b.width, height: b.height, k };
  }, { target: TARGET * k, maxW: MAX_W * k, maxH: MAX_H * k });
  const rect = await p.evaluate(() => {
    const r = document.querySelector('#box svg').getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  const out = join(OUT, `${f.slug}-${W}x${H}.png`);
  await p.screenshot({ path: out, type: 'png' });
  report.push(`${(W + 'x' + H).padEnd(9)} ${f.slug.padEnd(30)} ink ${ink.width.toFixed(0)}x${ink.height.toFixed(0)}  x${ink.k.toFixed(3)} -> drawn ${rect.w}x${rect.h}`);
}
await ctx.close();
}

await browser.close();
console.log(report.join('\n'));
console.log(`\n${FEATURES.length * SIZES.length} thumbnails in ${OUT}`);
