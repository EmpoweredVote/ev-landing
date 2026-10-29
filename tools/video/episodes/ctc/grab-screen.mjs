// Grabs stills of the live Civic Trivia app and writes them as data: URIs.
//
// A data URI, not a .png next to the page, on purpose. An image loaded through
// img.src under file:// taints the canvas permanently, and from then on every
// getImageData on it throws — which would break the pixel assertions in
// tests/video/03-cast.cjs and 04-art.cjs. A data: URI does not taint.
//
//   node grab-screen.mjs [url] [--out <file>] [--global <name>]
//                        [--height <px>] [--from <image>] [--fit <WxH>]
//                        [--note <text>]
//
// --out is a BARE filename. It resolves against this script's own directory;
// passing a path produces a doubled path and ENOENT.
//
// THIS EPISODE HOLDS TWO STILLS and neither is taken by this script today:
//
//   screen.js       window.EVCtcShot      the home page, panned under L025
//   screen-play.js  window.EVCtcPlayShot  a live question, held under L026
//
// Both came off Chris's own browser through Chrome's "Capture full size
// screenshot", because both are better signed in than out. The home page
// carries his level and XP in the header, which is the state the film has
// spent a chapter describing, and the question is a real local one — Santa
// Monica City Council — that follows from the Santa Monica collection selected
// on the page before it. A headless run gets neither: it is signed out, and it
// is served whatever collection is featured that morning.
//
// So the script is here for the day the shots need refreshing, and the two
// --from commands that actually built this episode are written at the top of
// each generated file. Run those, not this, unless you mean to replace the
// pictures with signed-out ones.
//
// DARK THEME IS NOT OPTIONAL. The episode is drawn on near-black; a light
// capture dropped into a dark episode is the brightest thing in three minutes.
// The theme is seeded before the first paint.
//
// --fit <WxH> re-encodes --from: centre-crop to that aspect, scale to that
// size, write JPEG. It is not a nicety. A full-size capture off a HiDPI screen
// is 3428px wide and 7 MB, screen.js is COMMITTED so a fresh checkout builds
// the same episode, and render.yaml serves the whole repo — so an unscaled
// still would ship 9 MB of base64 on every deploy to be drawn 1190px wide.
// The same picture is 346 KB at --fit 1440x1428.
//
// Pick the fit from the shape the DRAW needs, not from the source:
// drawLiveScreen gives the still a box W*0.62 wide by at most H*0.70 tall, so
// anything taller than 0.635 of its width pans and anything flatter is held.
// screen.js is 1440x1428 and pans; screen-play.js is 1440x914, which is that
// 0.635 exactly, so it fills the same box without moving.

import { createRequire } from 'node:module';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function flag(name, fallback) {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : fallback;
}
const taken = new Set();
for (const n of ['out', 'global', 'height', 'from', 'fit', 'note']) {
  const i = args.indexOf('--' + n);
  if (i >= 0) { taken.add(i); taken.add(i + 1); }
}
const OUT = flag('out', 'screen.js');
const GLOBAL = flag('global', 'EVCtcShot');
const HEIGHT = +flag('height', 2051);
const FROM = flag('from', null);
const FIT = flag('fit', null);
const NOTE = flag('note', null);
const TARGET = args.filter((a, i) => !taken.has(i) && !a.startsWith('--'))[0] ||
  'https://ctc.empowered.vote/';

function run(cmd, argv) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, argv, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d; });
    p.on('error', rej);
    p.on('close', code => code === 0 ? res() : rej(new Error(cmd + ' exited ' + code + '\n' + err)));
  });
}

// Centre-crop to the target aspect, then scale. Cropping before scaling and
// not after is what keeps the frame from being squashed: a 3428x1800 capture
// is far flatter than the box, and scaling it to the box's shape directly
// would stretch the question card vertically.
async function fit(src, spec) {
  const [w, h] = spec.split(/[x×]/).map(Number);
  if (!(w > 0 && h > 0)) throw new Error('--fit wants WxH, got ' + spec);
  const ar = w / h;
  const out = path.join(os.tmpdir(), 'ev-ctc-shot-' + process.pid + '.jpg');
  await run('ffmpeg', ['-v', 'error', '-y', '-i', src,
    '-vf', "crop=w='min(iw,ih*" + ar + ")':h='min(ih,iw/" + ar + ")'," +
           'scale=' + w + ':' + h + ':flags=lanczos',
    '-q:v', '3', out]);
  const buf = await readFile(out);
  await unlink(out).catch(() => {});
  return buf;
}

// --from embeds a picture that already exists instead of taking one. --note is
// written into the generated file beside the source, because a still nobody
// can regenerate has to say where it came from or the next person has no way
// to find out.
if (FROM) {
  const held = FIT ? await fit(FROM, FIT) : await readFile(FROM);
  const type = FIT || /\.jpe?g$/i.test(FROM) ? 'jpeg' : 'png';
  await writeFile(path.join(HERE, OUT),
    '// GENERATED by grab-screen.mjs --from. NOT reproducible by re-running\n' +
    '// this script against the live site: it is a picture somebody took.\n' +
    '//   node tools/video/episodes/ctc/grab-screen.mjs \\\n' +
    '//     --from ' + FROM + ' \\\n' +
    '//     --out ' + OUT + ' --global ' + GLOBAL + (FIT ? ' --fit ' + FIT : '') + '\n' +
    (NOTE ? '// ' + NOTE + '\n' : '') +
    'window.' + GLOBAL + ' = "data:image/' + type + ';base64,' + held.toString('base64') + '";\n',
    'utf8');
  console.log('wrote ' + OUT + ',', Math.round(held.length / 1024), 'KB from', FROM);
  process.exit(0);
}

const DARK = () => {
  try { localStorage.setItem('ev:color-scheme', 'dark'); } catch (e) { /* private mode */ }
};

const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(DARK);
await page.goto(TARGET, { waitUntil: 'networkidle' });

// The collections grid is fetched after the first paint, so networkidle alone
// can catch the skeleton. Wait for a real collection to be named, then let the
// photographs land — there are a dozen of them and they carry the page.
try {
  await page.getByText(/Featured Collections|Play Now|QUESTION/).first().waitFor({ timeout: 20000 });
} catch (e) {
  console.warn('nothing was named within 20s — look at the still before trusting it');
}
await page.waitForTimeout(3500);

const buf = await page.screenshot({ type: 'jpeg', quality: 92, fullPage: true,
  clip: { x: 0, y: 0, width: 1440, height: HEIGHT } });
await browser.close();

await writeFile(path.join(HERE, OUT),
  '// GENERATED by grab-screen.mjs. Re-run it to refresh the still.\n' +
  '//   node grab-screen.mjs ' + TARGET + ' --out ' + OUT +
  ' --global ' + GLOBAL + ' --height ' + HEIGHT + '\n' +
  '// Source: ' + TARGET + ' (fresh browser, signed out)\n' +
  (NOTE ? '// ' + NOTE + '\n' : '') +
  'window.' + GLOBAL + ' = "data:image/jpeg;base64,' + buf.toString('base64') + '";\n',
  'utf8');
console.log('wrote ' + OUT + ',', Math.round(buf.length / 1024), 'KB from', TARGET);
