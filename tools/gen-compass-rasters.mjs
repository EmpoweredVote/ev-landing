/**
 * gen-compass-rasters.mjs — rebuild the Compass raster pack from its SVGs.
 *
 *   NODE_PATH=<playwright> node tools/gen-compass-rasters.mjs
 *
 * WHY THIS EXISTS
 * The shipped PNGs and ICOs did not match their own source SVGs. Measured on
 * 2026-10-15: the red ring in compass-symbol-light-512.png is 5px wide, and a
 * faithful render of the SVG at the same size puts it at 18px. Every stroke in
 * the pack was about 3.5x too thin, which is why the ring vanished at favicon
 * sizes — at 64px the coral did not survive an alpha test at all. The pack
 * looks like an export that did not scale stroke widths with the artboard.
 *
 * So these files are generated now, from the SVG, and the SVG is the only
 * place a Compass artwork change has to be made.
 *
 * FRAMING, and how it was decided
 * - Symbol and Favicon PNGs are square and are a straight render of the SVG at
 *   its own viewBox. That is already what the shipped files were: at 512 the
 *   ring's centre line lands within a fifth of a pixel of where it lands now.
 *   Only the stroke changes.
 * - Logo PNGs are named by width and are trimmed to ink, flush left, with 1%
 *   of the width as padding on the other three sides. That is the convention
 *   the shipped files follow — 400w, 800w and 2400w all measured pad
 *   [0, 1%, 1%, 1%]. The canvas height follows the artwork, so it can move by
 *   a pixel or two.
 * - The ICOs hold 48, 32 and 16 as 32-bit BMP with an AND mask, which is the
 *   structure the shipped ICOs already had, byte length for byte length.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const SYMBOL_SIZES = [64, 128, 256, 512, 1024];
const FAVICON_SIZES = [16, 32, 48, 64, 96, 180, 192, 512];
const LOGO_WIDTHS = [400, 800, 1200, 2400];
const ICO_SIZES = [48, 32, 16];
const THEMES = ['dark', 'light'];

const svgPath = (kind, theme) => kind === 'logo'
  ? join(ROOT, 'brand/compass/Logo/SVG/compass-logo-' + theme + '.svg')
  : join(ROOT, 'brand/compass/Symbol/SVG/compass-symbol-' + theme + '.svg');

function shell(svg, css) {
  return '<!doctype html><html><head><meta charset="utf-8"><style>'
    + 'html,body{margin:0;padding:0;background:transparent}'
    + 'svg{display:block;position:absolute}'
    + css
    + '</style></head><body>' + svg + '</body></html>';
}

// Stroke-aware ink box: getBBox() is geometry only, and in Chromium neither
// getBBox({stroke:true}) nor getBoundingClientRect() adds the stroke back.
// Both were measured here, not assumed. So pad every shape by half its own
// computed stroke width, and skip anything parked in <defs> or a <clipPath>,
// which is not painted but still answers getBBox().
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

// ── PNG decode, only enough to feed the ICO encoder ──────────────────────
function decodePng(buf) {
  let p = 8, idat = [], w, h;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.slice(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6) throw new Error('expected 8-bit RGBA');
    }
    if (type === 'IDAT') idat.push(data);
    if (type === 'IEND') break;
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = w * bpp, out = Buffer.alloc(h * stride);
  let o = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[o++], line = raw.slice(o, o + stride); o += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[y * stride + i - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + i] : 0;
      const c = (i >= bpp && y > 0) ? out[(y - 1) * stride + i - bpp] : 0;
      let v = line[i];
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      out[y * stride + i] = v & 255;
    }
  }
  return { w, h, data: out };
}

// ── ICO: 32-bit BMP entries, bottom-up, with a zero AND mask ─────────────
function bmpEntry(im) {
  const w = im.w, h = im.h, data = im.data;
  const maskStride = Math.ceil(w / 8 / 4) * 4;
  const buf = Buffer.alloc(40 + w * h * 4 + maskStride * h);
  buf.writeUInt32LE(40, 0);
  buf.writeInt32LE(w, 4);
  buf.writeInt32LE(h * 2, 8);          // height counts the image plus the mask
  buf.writeUInt16LE(1, 12);
  buf.writeUInt16LE(32, 14);
  buf.writeUInt32LE(w * h * 4, 20);
  let o = 40;
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      buf[o++] = data[i + 2]; buf[o++] = data[i + 1]; buf[o++] = data[i]; buf[o++] = data[i + 3];
    }
  }
  return buf;
}

function ico(images) {
  const head = Buffer.alloc(6 + images.length * 16);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  const bodies = images.map(bmpEntry);
  let off = head.length;
  images.forEach((im, i) => {
    const o = 6 + i * 16;
    head[o] = im.w === 256 ? 0 : im.w;
    head[o + 1] = im.h === 256 ? 0 : im.h;
    head.writeUInt16LE(1, o + 4);
    head.writeUInt16LE(32, o + 6);
    head.writeUInt32LE(bodies[i].length, o + 8);
    head.writeUInt32LE(off, o + 12);
    off += bodies[i].length;
  });
  return Buffer.concat([head, ...bodies]);
}

// ── render ───────────────────────────────────────────────────────────────
const browser = await chromium.launch();
const written = [];

async function square(svg, size) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(shell(svg, 'svg{left:0;top:0;width:' + size + 'px;height:' + size + 'px}'));
  const png = await page.screenshot({ omitBackground: true });
  await page.close();
  return png;
}

for (const theme of THEMES) {
  const symbol = readFileSync(svgPath('symbol', theme), 'utf8');

  for (const n of SYMBOL_SIZES) {
    writeFileSync(join(ROOT, 'brand/compass/Symbol/PNG/compass-symbol-' + theme + '-' + n + '.png'),
      await square(symbol, n));
    written.push('Symbol/PNG   compass-symbol-' + theme + '-' + n + '.png');
  }

  const icons = {};
  for (const n of FAVICON_SIZES) {
    const png = await square(symbol, n);
    writeFileSync(join(ROOT, 'brand/compass/Favicon/PNG/compass-favicon-' + theme + '-' + n + '.png'), png);
    icons[n] = png;
    written.push('Favicon/PNG  compass-favicon-' + theme + '-' + n + '.png');
  }

  writeFileSync(join(ROOT, 'brand/compass/Favicon/ICO/favicon-' + theme + '.ico'),
    ico(ICO_SIZES.map(n => decodePng(icons[n]))));
  written.push('Favicon/ICO  favicon-' + theme + '.ico  (' + ICO_SIZES.join(', ') + ')');

  // Logos: trim to ink, flush left, 1% of the width on the other three sides.
  const logo = readFileSync(svgPath('logo', theme), 'utf8');
  const measure = await browser.newPage({ viewport: { width: 1000, height: 400 } });
  await measure.setContent(shell(logo, 'svg{left:0;top:0}'));
  const ink = await measure.evaluate(INK);
  await measure.close();

  for (const w of LOGO_WIDTHS) {
    const pad = Math.round(w * 0.01);
    const innerW = w - pad;
    const scale = innerW / ink.width;
    const innerH = ink.height * scale;
    const h = Math.round(innerH + pad * 2);
    const framed = logo.replace('<svg',
      '<svg viewBox="' + ink.x + ' ' + ink.y + ' ' + ink.width + ' ' + ink.height
      + '" preserveAspectRatio="xMidYMid meet"');
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.setContent(shell(framed,
      'svg{left:0;top:' + pad + 'px;width:' + innerW + 'px;height:' + innerH + 'px}'));
    writeFileSync(join(ROOT, 'brand/compass/Logo/PNG/compass-logo-' + theme + '-' + w + 'w.png'),
      await page.screenshot({ omitBackground: true }));
    await page.close();
    written.push('Logo/PNG     compass-logo-' + theme + '-' + w + 'w.png  (' + w + 'x' + h + ')');
  }
}

await browser.close();
console.log(written.join('\n'));
console.log('\n' + written.length + ' files rebuilt from the Compass SVGs.');
