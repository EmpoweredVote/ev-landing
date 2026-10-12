// What a reviewer sees that a unit test does not: things arriving twice,
// boxes too small for what is in them, and type that outruns its own card.
//
// Every assertion here came off a review of the cut picture. They are pixel
// questions because the complaints were pixel complaints — "the R's and D's
// respawn", "the last source falls outside the box" — and because the same
// scene object renders correctly in three other tests while still being wrong
// on screen.
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = 'C:/ev-landing/ev-landing-main';
const EP_DIR = path.join(ROOT, 'tools/video/episodes/compass');
const URL = 'file:///' + ROOT + '/tools/video/engine/stage.html';
const W = 640, H = 360;

const CYAN = '#6FD2E8';        // a reference host name on the source card
const RED = '#FF6B52';         // "different answers", and the agreement arrows
const ACCENT = '#FFD426';      // the three counts in the closing beat

(async function () {
  const episode = (await import(pathToFileURL(path.join(EP_DIR, 'episode.mjs')).href)).default;
  const byId = new Map(episode.scenes.map(s => [s.id, s]));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  for (const f of ['brand.js', 'screen.js', 'art.js']) {
    await page.addScriptTag({ path: path.join(EP_DIR, f) });
  }
  await page.evaluate(() => (window.EVArt && window.EVArt.ready) || null);
  await page.evaluate(([w, h]) => window.EVStage.init(w, h), [W, H]);

  const at = (id, extra) =>
    Object.assign({}, byId.get(id), { dur: 8, accent: episode.accent }, extra);

  // Every measurement below is one pass over one rendered frame: how many
  // pixels match a colour inside a box, and how far down the lowest one is.
  async function scan(scene, t, opts) {
    return await page.evaluate(([s, tt, o]) => {
      window.EVStage.renderFrame(s, tt);
      const el = document.getElementById('stage');
      const w = el.width, h = el.height;
      const d = el.getContext('2d').getImageData(0, 0, w, h).data;
      const hex = c => c && [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16),
                             parseInt(c.slice(5, 7), 16)];
      const want = hex(o.colour);
      const box = o.box || [0, 0, 1, 1];
      const x0 = Math.round(box[0] * w), x1 = Math.round(box[2] * w);
      const y0 = Math.round(box[1] * h), y1 = Math.round(box[3] * h);
      const tol = o.tol || 14;
      let n = 0, low = -1;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 4;
          let hit;
          if (want) {
            hit = Math.abs(d[i] - want[0]) < tol && Math.abs(d[i + 1] - want[1]) < tol &&
                  Math.abs(d[i + 2] - want[2]) < tol;
          } else {                                   // any ink at all
            hit = Math.abs(d[i] - 0x11) + Math.abs(d[i + 1] - 0x11) +
                  Math.abs(d[i + 2] - 0x13) > 40;
          }
          if (hit) { n++; if (y > low) low = y; }
        }
      }
      return { n: n, low: low / h };
    }, [scene, t, opts || {}]);
  }
  const count = async (s, t, o) => (await scan(s, t, o)).n;

  // How many separate things are stacked down a narrow column — the ticked
  // boxes against all the boxes. Counting pixels cannot tell eight full boxes
  // from ten, but counting the gaps between them can.
  async function stacked(scene, t, opts) {
    return await page.evaluate(([s, tt, o]) => {
      window.EVStage.renderFrame(s, tt);
      const el = document.getElementById('stage');
      const w = el.width, h = el.height;
      const d = el.getContext('2d').getImageData(0, 0, w, h).data;
      const hex = c => c && [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16),
                             parseInt(c.slice(5, 7), 16)];
      const want = hex(o.colour);
      const box = o.box;
      const x0 = Math.round(box[0] * w), x1 = Math.round(box[2] * w);
      const y0 = Math.round(box[1] * h), y1 = Math.round(box[3] * h);
      const tol = o.tol || 14;
      let runs = 0, inRun = false;
      for (let y = y0; y < y1; y++) {
        let any = false;
        for (let x = x0; x < x1 && !any; x++) {
          const i = (y * w + x) * 4;
          if (want) {
            any = Math.abs(d[i] - want[0]) < tol && Math.abs(d[i + 1] - want[1]) < tol &&
                  Math.abs(d[i + 2] - want[2]) < tol;
          } else {
            any = Math.abs(d[i] - 0x11) + Math.abs(d[i + 1] - 0x11) +
                  Math.abs(d[i + 2] - 0x13) > 40;
          }
        }
        if (any && !inRun) runs++;
        inRun = any;
      }
      return runs;
    }, [scene, t, opts]);
  }

  // 1. Nothing on the ballot arrives twice. The scene carries on from the one
  //    before it, so its first frame already holds everything its last frame
  //    does — no party disc fading up, no column of names dimming again.
  const first = await count(at('open-ponder'), 0.03, {});
  const settled = await count(at('open-ponder'), 2.5, {});
  assert.ok(Math.abs(first - settled) < settled * 0.04,
    'open-ponder must open on the picture it holds, not fade into it: ' +
    first + 'px at t=0.03 vs ' + settled + 'px at t=2.5');

  // 2. The questionnaire grows downward for the rows it has and still fits.
  const spill = await count(at('cal-which'), 5.0, { box: [0, 0.965, 0.38, 1] });
  assert.strictEqual(spill, 0,
    'the issues card must fit on screen, got ' + spill + 'px of it below the frame');

  // 3. And it offers more issues than the compass has spokes, so some of them
  //    are visibly passed over. The compass carries eight; the list is longer
  //    than that, and exactly eight of its boxes get ticked.
  const col = [0.058, 0.28, 0.082, 0.99];
  const boxes = await stacked(at('cal-which'), 5.0, { box: col });
  const ticked = await stacked(at('cal-which'), 5.0, { box: col, colour: '#7C6B9E' });
  assert.ok(boxes > 8, 'the issues list must offer more than it keeps, got ' + boxes + ' rows');
  assert.strictEqual(ticked, 8,
    'exactly the eight spokes must be ticked, got ' + ticked + ' of ' + boxes);

  // 4. A question longer than the card wraps inside it instead of running out
  //    the right-hand edge.
  const overrun = await count(at('cal-where'), 3.0, { box: [0.355, 0.17, 0.42, 0.30] });
  assert.strictEqual(overrun, 0,
    'the question must wrap inside its card, got ' + overrun + 'px past its edge');

  // 5. Where the two of them agree, arrows arrive and point it out — with the
  //    words, not at the cut.
  const early = await count(at('lay-overlap'), 0.6, { colour: RED });
  const arrows = await count(at('lay-overlap'), 4.0, { colour: RED });
  assert.strictEqual(early, 0, 'the agreement arrows must wait for the words, got ' + early + 'px');
  assert.ok(arrows > 60, 'the agreement arrows must be drawn, got ' + arrows + 'px');

  // 6. The issues that stay off the list sit above the two figures, not beside
  //    them, where they read as a third thing standing next to the compass.
  const beside = await count(at('lay-empty'), 3.5, { box: [0.44, 0.74, 0.64, 1.0] });
  const above = await count(at('lay-empty'), 3.5, { box: [0.02, 0.36, 0.34, 0.64] });
  assert.strictEqual(beside, 0, 'nothing may sit beside the figures, got ' + beside + 'px');
  assert.ok(above > 200, 'the off-list issues must sit above the figures, got ' + above + 'px');

  // 7. The source card is as big as what is in it. The fourth reference used
  //    to print below its own border.
  //    The card's left border is measured in a strip of its own, because
  //    nothing else is drawn between the card edge and its first column.
  const refs = await scan(at('src-refs'), 6.0, { colour: CYAN, box: [0.40, 0, 1, 1] });
  const border = await scan(at('src-refs'), 6.0, { box: [0.412, 0, 0.436, 1] });
  assert.ok(refs.n > 100, 'src-refs must print its references, got ' + refs.n + 'px');
  assert.ok(refs.low < border.low,
    'every reference must sit inside the card: last one at ' + refs.low.toFixed(3) +
    ' of the height, card bottom at ' + border.low.toFixed(3));

  // 8. The counts stand on their own. A card at a tenth of its brightness is
  //    still a page of words under three big numbers.
  const ghost = await count(at('src-scale'), 3.4, { colour: CYAN });
  assert.strictEqual(ghost, 0, 'the card must be gone under the counts, got ' + ghost + 'px');

  //    And no number is on screen before the voice reaches it. "Tens of
  //    thousands of positions" begins 3.0s into the line; nothing before that.
  const tooSoon = await count(at('src-scale'), 2.6, { colour: ACCENT });
  const spoken = await count(at('src-scale'), 8.0, { colour: ACCENT });
  assert.strictEqual(tooSoon, 0,
    'no count may appear before it is spoken, got ' + tooSoon + 'px at 2.6s');
  assert.ok(spoken > 2000, 'all three counts must be up by 8.0s, got ' + spoken + 'px');

  // 9. A headline can be told where to sit, so it does not crowd the mark in
  //    the corner above it.
  const high = await scan(at('why-driven', { headlineY: 0.30, cast: [] }), 3.0,
    { box: [0, 0.25, 0.6, 1] });
  const low = await scan(at('why-driven', { headlineY: 0.70, cast: [] }), 3.0,
    { box: [0, 0.25, 0.6, 1] });
  assert.ok(low.low > high.low + 0.2,
    'headlineY must move the headline down the frame: ' + high.low.toFixed(3) +
    ' vs ' + low.low.toFixed(3));

  assert.deepStrictEqual(errors, [], 'no page errors');
  await browser.close();
  console.log('PASS 15-continuity');
})().catch(e => { console.error('FAIL', e && e.message || e); process.exit(1); });
