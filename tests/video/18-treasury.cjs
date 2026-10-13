// What a reviewer sees in episode 3 that a unit test does not.
//
// Every assertion here is one of the ways this episode is most likely to break
// for a viewer, and each came off a fault this series has already paid for.
// They are pixel questions because the faults are pixel faults: the same scene
// object is structurally correct in 12-episode.cjs while being wrong on screen.
const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = 'C:/ev-landing/ev-landing-main';
const EP_DIR = path.join(ROOT, 'tools/video/episodes/treasury');
const URL = 'file:///' + ROOT + '/tools/video/engine/stage.html';
const W = 1280, H = 720;

// The build loads the episode's .js files sorted, with art.js LAST, so the
// asset globals exist before art.js runs its module-level load() calls.
const FILES = ['brand.js', 'screen.js', 'art.js'];

(async function () {
  const episode = (await import(pathToFileURL(path.join(EP_DIR, 'episode.mjs')).href)).default;
  const byId = new Map(episode.scenes.map(s => [s.id, s]));
  // Named sceneAt, not at: art.js already has an at(scene, key, t, dur), and
  // two different things with one name in one episode loses an afternoon.
  const sceneAt = (id, extra) =>
    Object.assign({}, byId.get(id), { dur: 12, accent: episode.accent }, extra);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  for (const f of FILES) await page.addScriptTag({ path: path.join(EP_DIR, f) });
  await page.evaluate(() => (window.EVArt && window.EVArt.ready) || null);
  await page.evaluate(([w, h]) => window.EVStage.init(w, h), [W, H]);

  // The canvas as raw RGBA at one moment. It is pure vector plus data: URIs, so
  // getImageData is readable; an image loaded by PATH would taint it forever.
  async function pixels(scene, t) {
    return page.evaluate(([sc, tt]) => {
      window.EVStage.renderFrame(sc, tt);
      const c = document.querySelector('canvas');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height);
      return { w: c.width, h: c.height, data: Array.from(d.data) };
    }, [scene, t]);
  }
  const lit = (shot, x, y) => {
    const i = (y * shot.w + x) * 4;
    return shot.data[i] + shot.data[i + 1] + shot.data[i + 2];
  };
  // Anything brighter than the stage, in a band of rows.
  function inkInBand(shot, y0, y1, threshold) {
    let n = 0;
    for (let y = Math.round(y0); y < Math.round(y1); y++) {
      for (let x = 0; x < shot.w; x++) if (lit(shot, x, y) > (threshold || 150)) n++;
    }
    return n;
  }

  // ---- REVIEW FOCUS 1 ----------------------------------------------------
  // A field nobody set reads as zero, and zero means "already on screen". That
  // put four things on screen one to two scenes early in episode 2, each
  // looking deliberate.
  //
  // bar-collapse names no openAt, so the bar must never drill. The drill is
  // visible as a SECOND row: one bar occupies y 0.34 to 0.47 of the frame and
  // nothing below it, while a drilled bar has a compressed ancestor on top and
  // its current row reaching to 0.54. So sample below the single row — at its
  // last frame, not its first, because an early arrival that is also wrong is
  // still wrong at the end.
  const belowOneRow = Math.round(H * 0.50);
  {
    const shot = await pixels(sceneAt('bar-collapse'), 16);
    let n = 0;
    for (let x = Math.round(W * 0.10); x < Math.round(W * 0.85); x++) {
      if (lit(shot, x, belowOneRow) > 150) n++;
    }
    assert.strictEqual(n, 0,
      'bar-collapse names no openAt and must not drill, found ' + n +
      ' lit pixels where a drilled row would be');
  }
  // And the scene that DOES name it drills, or the rule above passes by
  // drawing nothing at all.
  {
    const shot = await pixels(sceneAt('bar-open'), 5);
    let n = 0;
    for (let x = Math.round(W * 0.10); x < Math.round(W * 0.85); x++) {
      if (lit(shot, x, belowOneRow) > 150) n++;
    }
    assert.ok(n > 300, 'bar-open names openAt and must drill, found only ' + n);
  }

  // ---- REVIEW FOCUS 2 ----------------------------------------------------
  // A segment too narrow to hold its name must not print it. Los Angeles's
  // smallest top-level segment is 0.3% of the budget — four pixels of 1352 on
  // the live page — and "Other City Business Activities" is thirty characters.
  // Type printed into it runs under its neighbours and is cut in half by them.
  //
  // Type on a segment is near-black on a bright fill, so a label gives itself
  // away as DARK pixels inside a lit row. The right-hand quarter of the bar is
  // the small segments; none of them may carry one.
  //
  // Count RUNS of dark pixels, not dark pixels. Each segment is drawn one pixel
  // narrower than its share so the fills do not touch, which leaves a
  // one-pixel dark border at every boundary — six of them across the small end
  // of the bar. A letter stroke is three pixels or more. Counting pixels makes
  // the borders look like type and the check fails on a correct frame.
  function darkRuns(shot, y, x0, x1, minRun) {
    let runs = 0, run = 0;
    for (let x = Math.round(x0); x < Math.round(x1); x++) {
      if (lit(shot, x, y) < 110) run++;
      else { if (run >= minRun) runs++; run = 0; }
    }
    if (run >= minRun) runs++;
    return runs;
  }
  const rowY = Math.round(H * 0.34 + H * 0.045);      // through the label glyphs
  {
    const shot = await pixels(sceneAt('bar-named'), 11);
    const runs = darkRuns(shot, rowY, W * 0.70, W * 0.92, 3);
    assert.strictEqual(runs, 0,
      'a narrow segment printed a label over its neighbours: ' + runs +
      ' strokes of type across the small end of the bar');
  }
  // The widest segment DOES carry its name, or the rule above is passing by
  // drawing nothing at all.
  {
    const shot = await pixels(sceneAt('bar-named'), 11);
    const runs = darkRuns(shot, rowY, W * 0.09, W * 0.28, 2);
    assert.ok(runs > 4, 'the largest segment must print its name, found ' + runs + ' strokes');
  }

  assert.deepStrictEqual(errors, [], 'the page threw while rendering');
  await browser.close();
  console.log('PASS 18-treasury (no early drill, no label in a segment too small)');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
