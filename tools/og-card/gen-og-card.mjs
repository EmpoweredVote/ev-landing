#!/usr/bin/env node
// Generate Open Graph share cards (og-image.png, 1200x630) for the Empowered Vote suite.
//
// One house template, driven by a small per-product config: dark ground, a teal bar down the
// left edge, the product wordmark top-left, a short two-line white headline, a teal rule + the
// site URL, faint concentric rings on the right, and the yellow/teal/coral brand dots.
//
// Why SVG + resvg and not a headless browser: the brand box has no rasteriser (see
// ../../brand/README.md) and the repo is deliberately dependency-light. resvg is a single
// prebuilt native module — no Chromium download — and an all-SVG card gives pixel control
// without fighting a browser's CSS/layout.
//
// Usage:
//   node gen-og-card.mjs                 # generate the real targets (see DEFAULT_TARGETS)
//   node gen-og-card.mjs civic-spaces    # generate one card by key
//   node gen-og-card.mjs --all           # every card in CARDS, including --validate proofs
//
// Brand tokens below were sampled from the live cards (read-rank/compass/treasury). If a token
// ever drifts, re-sample with:  magick <card>.png -format '%[pixel:p{x,y}]' info:
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const HERE = dirname(fileURLToPath(import.meta.url));
const EV_LANDING = resolve(HERE, '../..');     // the ev-landing repo root
const GH = resolve(EV_LANDING, '..');          // the GitHub workspace root (sibling repos live here)

// ---- brand tokens (sampled 2026-09-13 from read-rank/public/og-image.png) ----
const C = {
  bg: '#131416',
  teal: '#59B0C4',
  coral: '#FF5740',
  yellow: '#FFD426',
  white: '#FFFFFF',
};

const FONT_DIR = join(HERE, 'node_modules/@expo-google-fonts/manrope');
const FONT_FILES = [
  join(FONT_DIR, '800ExtraBold/Manrope_800ExtraBold.ttf'),
  join(FONT_DIR, '700Bold/Manrope_700Bold.ttf'),
  join(FONT_DIR, '500Medium/Manrope_500Medium.ttf'),
];

// ---- geometry ----
const W = 1200, H = 630;
const PAD_L = 90;            // left content edge
const BAR_W = 10;            // teal accent bar

// ---- card catalogue ----
// wordmark: { type:'image', src, w }  OR  { type:'text', top, bottom, size? }
// headline: up to two short lines.  url: bare host, no scheme.  out: absolute PNG path.
const CARDS = {
  'civic-spaces': {
    out: join(GH, 'civic-spaces/public/og-image.png'),
    wordmark: { type: 'text', top: 'civic', bottom: 'spaces' },
    headline: ['A digital public square', 'for the places you live.'],
    url: 'civicspaces.empowered.vote',
  },
  'ev-landing': {
    out: join(EV_LANDING, 'og-image.png'),
    wordmark: { type: 'image', src: join(EV_LANDING, 'icons/logo-dark.png'), w: 360 },
    headline: ['Your non-partisan', 'civic engagement platform.'],
    url: 'empowered.vote',
  },

  // --validate: regenerate an existing card from its brand logo, to eyeball the template
  // against the hand-made original. Not written to any app; lands in /tmp.
  'read-rank': {
    validate: true,
    out: '/tmp/og-validate-readrank.png',
    wordmark: { type: 'image', src: join(EV_LANDING, 'brand/read-and-rank/Logo/PNG/read-and-rank-logo-dark-800w.png'), w: 300 },
    headline: ['Judge candidates on substance,', 'not names.'],
    url: 'readrank.empowered.vote',
  },
};

const DEFAULT_TARGETS = ['civic-spaces', 'ev-landing'];

// ---- helpers ----
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function pngSize(path) {
  const b = readFileSync(path);
  // PNG signature is 8 bytes; IHDR width/height are big-endian u32 at byte 16 and 20.
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

function dataUri(path) {
  const b = readFileSync(path);
  const mime = path.toLowerCase().endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  return `data:${mime};base64,${b.toString('base64')}`;
}

function wordmarkSVG(wm) {
  if (wm.type === 'image') {
    const { w: iw, h: ih } = pngSize(wm.src);
    const w = wm.w ?? 340;
    const h = Math.round((w * ih) / iw);
    const y = 118 - h / 2;   // vertically centre the lockup on the wordmark band
    return `<image x="${PAD_L}" y="${y.toFixed(1)}" width="${w}" height="${h}" href="${dataUri(wm.src)}" preserveAspectRatio="xMinYMid meet" />`;
  }
  // two-tone stacked wordmark — the house style (cf. "empowered / compass", "read / & rank")
  const size = wm.size ?? 48;
  const lh = size * 0.94;
  const y1 = 78 + size * 0.74;
  const y2 = y1 + lh;
  const attr = `font-family="Manrope" font-weight="800" font-size="${size}" letter-spacing="-1.2"`;
  return (
    `<text x="${PAD_L}" y="${y1.toFixed(1)}" ${attr} fill="${C.teal}">${esc(wm.top)}</text>` +
    `<text x="${PAD_L}" y="${y2.toFixed(1)}" ${attr} fill="${C.coral}">${esc(wm.bottom)}</text>`
  );
}

function headlineSVG(lines) {
  const size = 60, lh = 74, y0 = 312;
  return lines
    .slice(0, 2)
    .map(
      (ln, i) =>
        `<text x="${PAD_L}" y="${y0 + i * lh}" font-family="Manrope" font-weight="700" font-size="${size}" letter-spacing="-1.5" fill="${C.white}">${esc(ln)}</text>`,
    )
    .join('');
}

function buildSVG(card) {
  const cx = 1050, cy = 300;   // ring centre, pushed toward the right edge
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="${cx}" cy="${cy}" r="360" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#7FC6D6" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#7FC6D6" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- faint concentric rings, cropped by the right edge -->
  <circle cx="${cx}" cy="${cy}" r="300" fill="none" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="2"/>
  <circle cx="${cx}" cy="${cy}" r="228" fill="none" stroke="#FFFFFF" stroke-opacity="0.05" stroke-width="2"/>

  <!-- teal accent bar -->
  <rect x="0" y="0" width="${BAR_W}" height="${H}" fill="${C.teal}"/>

  ${wordmarkSVG(card.wordmark)}
  ${headlineSVG(card.headline)}

  <!-- rule + url -->
  <rect x="${PAD_L}" y="470" width="120" height="6" rx="3" fill="${C.teal}"/>
  <text x="${PAD_L}" y="546" font-family="Manrope" font-weight="500" font-size="30" letter-spacing="0.2" fill="${C.teal}">${esc(card.url)}</text>

  <!-- brand dots -->
  <circle cx="1046" cy="527" r="11" fill="${C.yellow}"/>
  <circle cx="1083" cy="527" r="11" fill="${C.teal}"/>
  <circle cx="1120" cy="527" r="11" fill="${C.coral}"/>
</svg>`;
}

function render(key, card) {
  const svg = buildSVG(card);
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Manrope' },
  })
    .render()
    .asPng();
  mkdirSync(dirname(card.out), { recursive: true });
  writeFileSync(card.out, png);
  console.log(`  ${key.padEnd(14)} -> ${card.out}  (${(png.length / 1024).toFixed(0)} KB)`);
}

// ---- main ----
const args = process.argv.slice(2);
let keys;
if (args.includes('--all')) keys = Object.keys(CARDS);
else if (args.length) keys = args;
else keys = DEFAULT_TARGETS;

const unknown = keys.filter((k) => !CARDS[k]);
if (unknown.length) {
  console.error(`Unknown card(s): ${unknown.join(', ')}\nKnown: ${Object.keys(CARDS).join(', ')}`);
  process.exit(1);
}

console.log('Generating OG cards:');
for (const k of keys) render(k, CARDS[k]);
console.log('Done.');
