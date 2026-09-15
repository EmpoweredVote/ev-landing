// Empowered Vote Zoom virtual backgrounds — 1920x1080.
//
// Two styles:
//   solid   — the flat ev-landing page background (#111113 dark / #FFFFFF light) + a faint ring.
//   aurora  — a Webex-style glow rising from the bottom edge, built from the four core EV colours
//             (warm yellow/coral on the left, cool teal on the right) as overlapping radial blooms.
//
// SVG rendered with resvg (a prebuilt native module — no headless browser). The logo is the
// master EV wordmark PNG from ../../icons (logo-dark.png on dark grounds, logo-light.png on light).
//
// Usage:  cd ev-landing/tools/zoom-bg && npm install && node gen-zoom-bg.mjs
//         PNGs are written to ./out/.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const HERE = dirname(fileURLToPath(import.meta.url));
const EV_LANDING = resolve(HERE, '../..');
const ICONS = join(EV_LANDING, 'icons');
const OUT = join(HERE, 'out');

const W = 1920, H = 1080, MARGIN = 84;

function pngSize(p) { const b = readFileSync(p); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }
function dataUri(p) { return `data:image/png;base64,${readFileSync(p).toString('base64')}`; }

// The four core EV colours only, warm (left) to cool (right). Each is a radial bloom sitting just
// below the bottom edge, so only its upper half shows — light rising from the floor.
const BLOOMS = [
  { c: '#FED12E', cx: 150,  cy: 1180, r: 500 }, // yellow
  { c: '#FF5740', cx: 660,  cy: 1130, r: 600 }, // coral
  { c: '#00657C', cx: 1240, cy: 1185, r: 560 }, // dark teal
  { c: '#59B0C4', cx: 1790, cy: 1135, r: 560 }, // bright teal
];

function auroraSVG(peak) {
  const defs = BLOOMS.map((b, i) => `
    <radialGradient id="b${i}" cx="${b.cx}" cy="${b.cy}" r="${b.r}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${b.c}" stop-opacity="${peak}"/>
      <stop offset="0.55" stop-color="${b.c}" stop-opacity="${(peak * 0.38).toFixed(3)}"/>
      <stop offset="1" stop-color="${b.c}" stop-opacity="0"/>
    </radialGradient>`).join('');
  const body = BLOOMS.map((_, i) => `<rect width="${W}" height="${H}" fill="url(#b${i})"/>`).join('');
  return { defs, body };
}

// pos: 'br' 'bl' 'tr' 'tl' (corner) or 'top' (top-centre)
function logoSVG(logo, pos) {
  const { w: iw, h: ih } = pngSize(logo);
  const lw = pos === 'top' ? 320 : 360;
  const lh = Math.round((lw * ih) / iw);
  let lx, ly;
  if (pos === 'top') { lx = (W - lw) / 2; ly = 88; }
  else { lx = pos.includes('l') ? MARGIN : W - MARGIN - lw; ly = pos.includes('t') ? MARGIN : H - MARGIN - lh; }
  return `<image x="${lx}" y="${ly}" width="${lw}" height="${lh}" href="${dataUri(logo)}" preserveAspectRatio="xMidYMid meet"/>`;
}

function build({ bg, logo, ring, dark }, { style, pos }) {
  let defs = '', body = '';
  if (style === 'aurora') {
    const a = auroraSVG(dark ? 0.9 : 0.6);
    defs = a.defs; body = a.body;
  } else {
    // faint rings on the right, opposite the logo vertically so they never collide with it
    const cy = pos.includes('t') ? 1090 : 70;
    body = `
      <circle cx="1940" cy="${cy}" r="560" fill="none" stroke="${ring}" stroke-opacity="0.05" stroke-width="2"/>
      <circle cx="1940" cy="${cy}" r="410" fill="none" stroke="${ring}" stroke-opacity="0.04" stroke-width="2"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${defs}</defs>
  <rect width="${W}" height="${H}" fill="${bg}"/>
  ${body}
  ${logoSVG(logo, pos)}
</svg>`;
}

function render(name, theme, opts) {
  const png = new Resvg(build(theme, opts), { fitTo: { mode: 'width', value: W } }).render().asPng();
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, name), png);
  console.log(`  ${name.padEnd(26)} ${(png.length / 1024).toFixed(0)} KB`);
}

const DARK  = { bg: '#111113', logo: join(ICONS, 'logo-dark.png'),  ring: '#FFFFFF', dark: true };
const LIGHT = { bg: '#FFFFFF', logo: join(ICONS, 'logo-light.png'), ring: '#00657C', dark: false };

console.log('Zoom backgrounds (1920x1080) -> ./out/');
render('ev-zoom-dark.png',         DARK,  { style: 'solid',  pos: 'br' });
render('ev-zoom-light.png',        LIGHT, { style: 'solid',  pos: 'br' });
render('ev-zoom-dark-top.png',     DARK,  { style: 'solid',  pos: 'tr' });
render('ev-zoom-light-top.png',    LIGHT, { style: 'solid',  pos: 'tr' });
render('ev-zoom-dark-aurora.png',  DARK,  { style: 'aurora', pos: 'tr' });
render('ev-zoom-light-aurora.png', LIGHT, { style: 'aurora', pos: 'tr' });
console.log('Done.');
