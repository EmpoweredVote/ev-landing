// One scene -> one MP4. Frames are piped straight into ffmpeg's stdin and
// never written to disk: a ten-minute episode is 18,000 PNGs, which is several
// gigabytes as files and nothing at all as a pipe.

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGE_URL = 'file:///' + path.join(HERE, 'stage.html').replace(/\\/g, '/');

function playwright() {
  try { return require('playwright'); }
  catch {
    const alt = 'C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules';
    return require(path.join(alt, 'playwright'));
  }
}

// stdin.write returns false when the kernel buffer is full. Ignoring that and
// pushing 18,000 PNG buffers at it is how a render quietly eats all the memory
// on the machine. The listeners are removed on every path: a `once` that never
// fires is a leak repeated per frame.
function writeAsync(stream, buf) {
  return new Promise((resolve, reject) => {
    const onErr = e => { stream.off('drain', onDrain); reject(e); };
    const onDrain = () => { stream.off('error', onErr); resolve(); };
    stream.once('error', onErr);
    if (stream.write(buf)) { stream.off('error', onErr); resolve(); }
    else stream.once('drain', onDrain);
  });
}

export async function openStage(episode, artFiles = []) {
  const { chromium } = playwright();
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: episode.width, height: episode.height },
    deviceScaleFactor: 1
  });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(STAGE_URL);
  for (const f of artFiles) await page.addScriptTag({ path: f });
  if (artFiles.length) {
    // An episode's art may need an image decoded before the first frame. If it
    // exposes a promise as window.EVArt.ready, wait for it — otherwise frame 0
    // renders against a half-loaded asset and nothing in the output says so.
    await page.evaluate(() => (window.EVArt && window.EVArt.ready) || null);
  }
  await page.evaluate(([w, h]) => window.EVStage.init(w, h), [episode.width, episode.height]);
  return {
    page, browser, errors,
    close: () => browser.close()
  };
}

export async function renderScene({ scene, episode, outFile, artFiles = [], alpha = false,
                                    stage = null, ffmpegArgs = null }) {
  await mkdir(path.dirname(outFile), { recursive: true });
  const own = !stage;
  const st = stage || await openStage(episode, artFiles);
  const fps = episode.fps || 30;
  const frames = scene.frames || Math.round(scene.dur * fps);

  const codec = ffmpegArgs ? ffmpegArgs : (alpha
    ? ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le']
    : ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p']);

  const ff = spawn('ffmpeg', ['-y', '-v', 'error',
    '-f', 'image2pipe', '-vcodec', 'png', '-framerate', String(fps), '-i', '-',
    ...codec, '-r', String(fps), outFile], { stdio: ['pipe', 'ignore', 'pipe'] });

  let ffErr = '';
  ff.stderr.on('data', d => { ffErr += d; });
  const done = new Promise((resolve, reject) => {
    ff.on('error', reject);
    ff.on('close', code => code === 0
      ? resolve()
      : reject(new Error('ffmpeg exited ' + code + ' on scene ' + scene.id + ': ' + ffErr.slice(-2000))));
  });
  // A dead ffmpeg makes every later write throw EPIPE; swallow that so the
  // close handler above reports the real reason instead.
  ff.stdin.on('error', () => {});

  const withAlpha = alpha ? { ...scene, alpha: true } : scene;
  try {
    for (let i = 0; i < frames; i++) {
      if (ff.exitCode !== null) break;
      const t = i / fps;
      await st.page.evaluate(([s, tt]) => window.EVStage.renderFrame(s, tt), [withAlpha, t]);
      const buf = await st.page.screenshot({ type: 'png', omitBackground: alpha });
      await writeAsync(ff.stdin, buf);
    }
    ff.stdin.end();
    await done;
  } finally {
    if (own) await st.close();
  }

  if (st.errors.length) {
    throw new Error('page errors while rendering ' + scene.id + ': ' + st.errors.join('; '));
  }
  return { file: outFile, frames };
}
