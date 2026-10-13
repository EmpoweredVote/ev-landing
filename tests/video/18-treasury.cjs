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

  // ---- REVIEW FOCUS 3 ----------------------------------------------------
  // Nothing may fade in again inside the nineteen-scene run. Every scene from
  // bar-named to levels-person carries continues: true, and a thing that
  // re-enters at a cut reads as a blink — the exact fault continues exists to
  // stop. At the first frame a continuing scene is already at full strength,
  // so it has about as much ink then as a second later.
  // Counted INSIDE the page. Serialising a 1280x720 frame out of the browser
  // is 3.7 million array entries, and thirty-two of them is minutes; the same
  // loop in the page is milliseconds and returns one number.
  async function inkCount(scene, t) {
    return page.evaluate(([sc, tt]) => {
      window.EVStage.renderFrame(sc, tt);
      const c = document.querySelector('canvas');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] + d[i + 1] + d[i + 2] > 120) n++;
      }
      return n;
    }, [scene, t]);
  }
  for (const id of ['bar-named', 'bar-open', 'bar-trail', 'bar-items',
                    'bar-payments', 'bar-trick', 'three-cards', 'three-named',
                    'three-half', 'years-change', 'years-across', 'levels-city',
                    'levels-four', 'levels-fed', 'levels-two', 'levels-person']) {
    const early = await inkCount(sceneAt(id), 0.02);
    const later = await inkCount(sceneAt(id), 1.20);
    assert.ok(early > later * 0.70,
      id + ' carries continues and must not fade in: ' + early +
      ' lit pixels at t=0.02 against ' + later + ' at t=1.2');
  }

  // ---- REVIEW FOCUS 4 ----------------------------------------------------
  // The four level bars must each be scaled to their OWN total. Four
  // governments spanning $21.5B to $7,195.8B share one picture, and a bar
  // scaled to the wrong denominator is a lie the viewer cannot see. The widest
  // segment of each row, as a fraction of the bar, is that government's own
  // largest share: Social Security is 20.3% of federal spending and Government
  // & Public Safety is 26.0% of Los Angeles's.
  {
    const shot = await pixels(sceneAt('levels-four'), 6);
    const x0 = Math.round(W * 0.08), x1 = Math.round(W * 0.92);
    for (const [row, expected] of [[0, 0.203], [3, 0.260]]) {
      const y = Math.round(H * (0.31 + row * 0.125 + 0.039));
      let best = 0, run = 0, prev = null;
      for (let x = x0; x < x1; x++) {
        const i = (y * shot.w + x) * 4;
        const key = shot.data[i] + ',' + shot.data[i + 1] + ',' + shot.data[i + 2];
        if (key === prev) run++; else { prev = key; run = 1; }
        if (run > best) best = run;
      }
      const got = best / (x1 - x0);
      assert.ok(Math.abs(got - expected) < 0.03,
        'level row ' + row + ' is scaled to the wrong total: widest segment is ' +
        got.toFixed(3) + ' of the bar, expected ' + expected);
    }
  }

  // ---- REVIEW FOCUS 5 ----------------------------------------------------
  // The close must not pan backwards at the cut. close-follow opens where
  // close-screen stopped, which is its rate times its MEASURED length —
  // episode 2 used 0.25 where its real figure was 0.264 and the page jumped
  // fifty pixels back up, which is the one thing a continuous pan must not do.
  {
    const timings = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'tools/video/build/treasury/timings.json'), 'utf8'));
    const dur = timings.lines.find(l => l.id === 'L036').dur;
    const a = sceneAt('close-screen'), b = sceneAt('close-follow');
    const endA = (a.panFrom || 0) + (a.panRate || 0) * dur;
    const startB = b.panFrom || 0;
    assert.ok(Math.abs(endA - startB) < 0.004,
      'close-follow opens at ' + startB + ' but close-screen stopped at ' +
      endA.toFixed(3) + ' after its measured ' + dur + 's — the page jumps at the cut');
  }
  // And the pan actually moves: a rate of zero would pass the check above.
  {
    const early = await pixels(sceneAt('close-screen'), 0.5);
    const late = await pixels(sceneAt('close-screen'), 4.5);
    let same = 0;
    const y = Math.round(H * 0.40);
    for (let x = 0; x < early.w; x++) {
      const i = (y * early.w + x) * 4;
      if (early.data[i] === late.data[i] && early.data[i + 1] === late.data[i + 1]) same++;
    }
    assert.ok(same < early.w * 0.9,
      'close-screen is not panning: ' + same + ' of ' + early.w +
      ' pixels are identical four seconds apart');
  }

  assert.deepStrictEqual(errors, [], 'the page threw while rendering');
  await browser.close();
  console.log('PASS 18-treasury (no early drill, no label too small, no re-entry, honest denominators, the pan joins up)');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
