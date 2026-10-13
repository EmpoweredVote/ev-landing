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
  // cover-alpha names none of drawCoverage's optional fields — no fedAt, no
  // cityAt, no verbAt — and every one of them draws something. The four verbs
  // print down the right-hand side, so that side must be empty of type.
  //
  // An earlier version of this check asked whether bar-collapse drilled. It
  // could not fail: that stage hard-codes its rows and never reads openAt. A
  // test that cannot fail for the reason it names is worse than no test.
  // The verbs print down a fixed column at 0.56 of the frame, to the right
  // of the state grid. They used to be measured off the map; the map got
  // narrower and they moved with it.
  const verbBand = [Math.round(W * 0.55), Math.round(W * 0.95)];
  {
    const shot = await pixels(sceneAt('cover-alpha'), 2.1);
    let n = 0;
    for (let y = Math.round(H * 0.22); y < Math.round(H * 0.52); y++) {
      for (let x = verbBand[0]; x < verbBand[1]; x++) if (lit(shot, x, y) > 200) n++;
    }
    assert.strictEqual(n, 0,
      'cover-alpha names no verbAt and must print no verbs, found ' + n + ' lit pixels');
  }
  // And the scene that DOES name them prints them, or the rule above passes by
  // drawing nothing at all.
  {
    const shot = await pixels(sceneAt('cover-map'), 13);
    let n = 0;
    for (let y = Math.round(H * 0.22); y < Math.round(H * 0.52); y++) {
      for (let x = verbBand[0]; x < verbBand[1]; x++) if (lit(shot, x, y) > 200) n++;
    }
    assert.ok(n > 200, 'cover-map names verbAt and must print the verbs, found ' + n);
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
  // bar-trick, NOT bar-named: the 'named' stage sets labelAlpha to 0, so
  // icicle draws no segment labels at all and the width gate under test never
  // runs. bar-trick is the plain bar with every label icicle will print.
  // Read the WHOLE row and keep the busiest line in it. A label that takes two
  // lines moves its glyphs off whichever single scanline this used to read, so
  // one row through the middle of the bar now answers a question about layout
  // rather than about type.
  function maxDarkRuns(shot, x0, x1, minRun) {
    let best = 0;
    for (let y = Math.round(H * 0.34); y < Math.round(H * (0.34 + (64 / 1080) * 2.2)); y++) {
      const n = darkRuns(shot, y, x0, x1, minRun);
      if (n > best) best = n;
    }
    return best;
  }
  {
    const shot = await pixels(sceneAt('bar-trick'), 3);
    const runs = maxDarkRuns(shot, W * 0.70, W * 0.92, 3);
    assert.strictEqual(runs, 0,
      'a narrow segment printed a label over its neighbours: ' + runs +
      ' strokes of type across the small end of the bar');
  }
  // The widest segment DOES carry its name, or the rule above is passing by
  // drawing nothing at all.
  {
    const shot = await pixels(sceneAt('bar-trick'), 3);
    const runs = maxDarkRuns(shot, W * 0.09, W * 0.28, 2);
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
                    'years-change', 'years-across', 'levels-city',
                    'levels-four', 'levels-fed', 'levels-two', 'levels-person',
                    'close-follow']) {
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
      // Near the TOP of the row. A segment name takes two lines where it needs
      // to, so the middle of a row is now type as often as it is fill, and a
      // longest-run-of-one-colour measurement there measures the gap between
      // two letters.
      const y = Math.round(H * (0.31 + row * 0.125 + 0.008));
      let best = 0, run = 0, prev = null;
      for (let x = x0; x < x1; x++) {
        const i = (y * shot.w + x) * 4;
        const key = shot.data[i] + ',' + shot.data[i + 1] + ',' + shot.data[i + 2];
        if (key === prev) run++; else { prev = key; run = 1; }
        if (run > best) best = run;
      }
      const got = best / (x1 - x0);
      assert.ok(Math.abs(got - expected) < 0.02,
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
    // The SCENE's length, not the voice's: 4.768s of recorded line plus the
    // 0.45s gap timing.mjs leaves after every one. The pan runs for the scene,
    // so a panFrom computed from the voice alone lands 44 pixels short and the
    // page jumps back up at the cut — which is exactly what shipped.
    //
    // Pinned here rather than read out of build/treasury/timings.json: that
    // path is gitignored, so depending on it meant this assertion silently
    // disappeared on a clean checkout. If a re-split moves L036 this number
    // changes with it, and the splitter says so out loud.
    const dur = 4.768 + 0.45;
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

  // ---- the picture a reviewer watching it actually sees ------------------
  // Everything below came off one viewing of the cut. Each is a thing that
  // read wrong on screen while every structural test was green.

  // The bar's geometry, once. icicle() lays rows out from barBox().y with an
  // ancestor at half the height of the current row; these are those numbers as
  // fractions of the frame, so a test can name a row instead of guessing.
  const BAR_X = 0.08, BAR_W = 0.84, BAR_Y = 0.34;
  const R_ANC = (32 / 1080) * 2.2, R_CUR = (64 / 1080) * 2.2, R_GAP = 6 / 1080;
  const rowBand = (kinds, i) => {                 // kinds: 'a' | 'c', in order
    let y = BAR_Y;
    for (let k = 0; k < i; k++) y += (kinds[k] === 'c' ? R_CUR : R_ANC) + R_GAP;
    return [y, y + (kinds[i] === 'c' ? R_CUR : R_ANC)];
  };
  // Near the TOP of a row, above every glyph: a label's first line starts at
  // 30% of the row's height and its ascenders reach about 18%, so 6% is fill.
  const rowProbe = (kinds, i) => {
    const b = rowBand(kinds, i);
    return b[0] + (b[1] - b[0]) * 0.06;
  };
  const atX = frac => Math.round(W * (BAR_X + BAR_W * frac));
  const rgb = (shot, x, y) => {
    const i = (Math.round(y) * shot.w + Math.round(x)) * 4;
    return [shot.data[i], shot.data[i + 1], shot.data[i + 2]];
  };
  // How far a pixel is from the empty stage. A segment drawn at a reduced
  // alpha over the stage keeps its hue and loses this in proportion, so the
  // ratio between two frames IS the dim factor — which a brightness
  // comparison between two different segment colours can never be.
  const fromStage = (shot, x, y) => {
    const bg = rgb(shot, 3, 3), c = rgb(shot, x, y);
    return Math.abs(c[0] - bg[0]) + Math.abs(c[1] - bg[1]) + Math.abs(c[2] - bg[2]);
  };

  // ---- a long name on a wide segment is split, not shrunk ----------------
  // "Roads & Community Development" is twenty-nine characters on a segment
  // 16.1% of the bar. On one line it only fits by shrinking to the smallest
  // size fitLabel will go to, which is what shipped: legible on the canvas at
  // 1920 and unreadable on a phone. It has the height for two lines, so it
  // takes two.
  {
    const shot = await pixels(sceneAt('bar-trick'), 3);
    const band = rowBand(['c'], 0);
    const x0 = atX(0.4780), x1 = atX(0.6230);        // inside segment 2, no edges
    const bands = [];
    let open = null;
    for (let y = Math.round(H * band[0]); y < Math.round(H * band[1]); y++) {
      let runs = 0, run = 0;
      for (let x = x0; x < x1; x++) {
        if (lit(shot, x, y) < 220) run++;            // near-black type on yellow
        else { if (run >= 2) runs++; run = 0; }
      }
      if (run >= 2) runs++;
      if (runs >= 2) { if (open === null) open = y; }
      else if (open !== null) { bands.push([open, y]); open = null; }
    }
    if (open !== null) bands.push([open, Math.round(H * band[1])]);
    assert.ok(bands.length >= 3,
      'the yellow segment must print its name on two rows above its amount — ' +
      'found ' + bands.length + ' rows of type, not 3');
    const tallest = Math.max.apply(null, bands.map(b => b[1] - b[0]));
    assert.ok(tallest >= H * 0.011,
      'the label on the yellow segment is still shrunk to fit: its tallest row ' +
      'of type is ' + tallest + 'px, under the ' + Math.round(H * 0.011) +
      'px a reader needs');
  }

  // ---- a drill dims what was not chosen ----------------------------------
  // Opening a segment drew the children across the full width under an
  // ancestor row that still looked untouched, so the frame never said WHICH
  // segment had been opened. Everything but the chosen one steps back.
  {
    const flat = await pixels(sceneAt('bar-named'), 11);
    const open = await pixels(sceneAt('bar-open'), 8);
    const y = H * rowProbe(['a', 'a', 'c'], 0);
    const chosen = atX(0.13), sibling = atX(0.36);   // segments 0 and 1
    const yFlat = H * rowProbe(['c'], 0);
    const keptR = fromStage(open, chosen, y) / fromStage(flat, chosen, yFlat);
    const lostR = fromStage(open, sibling, y) / fromStage(flat, sibling, yFlat);
    assert.ok(keptR > 0.85,
      'the opened segment must stay at full strength, it is at ' + keptR.toFixed(2));
    assert.ok(lostR < 0.60,
      'the segments that were NOT opened must step back, they are at ' +
      lostR.toFixed(2) + ' of full strength — the frame does not say which one was chosen');
  }

  // ---- the second drill adds a third row and dims the second -------------
  // L008 is "the department breaks into its divisions, a division breaks into
  // its programs" — two drills. Only the first was drawn, so the sentence's
  // second half had no picture, and the line items that followed appeared from
  // a level the viewer had never been shown.
  {
    const open = await pixels(sceneAt('bar-open'), 8);
    const one = await pixels(sceneAt('bar-open'), 3);
    const y3 = H * rowProbe(['a', 'a', 'c'], 2);
    let edges = 0, prev = null;
    for (let x = atX(0.01); x < atX(0.99); x++) {
      const key = rgb(open, x, y3).join(',');
      if (prev !== null && key !== prev) edges++;
      prev = key;
    }
    assert.ok(edges >= 8,
      'the third row must break Public Safety into its programmes, found ' +
      edges + ' colour changes across it');
    // and the division row above it steps back the same way the top row did
    const y2 = H * rowProbe(['a', 'a', 'c'], 1);
    const yWas = H * rowProbe(['a', 'c'], 1);
    const keptR = fromStage(open, atX(0.40), y2) / fromStage(one, atX(0.40), yWas);
    const lostR = fromStage(open, atX(0.95), y2) / fromStage(one, atX(0.95), yWas);
    assert.ok(keptR > 0.85 && lostR < 0.60,
      'drilling into Public Safety must dim General Government beside it: ' +
      'chosen at ' + keptR.toFixed(2) + ', sibling at ' + lostR.toFixed(2));
  }

  // ---- the three cards are a selector, not three lamps -------------------
  // The live page shows ONE of Money In, Money Out and Employees at a time and
  // the bar below is whichever is selected. The episode lit each card as it
  // was named and left it lit, so by the end of the line all three were on and
  // the bar had never changed — the one thing the line says it does.
  {
    // The card's border is a 2px stroke centred on the top edge of the panel,
    // so it lands on one of three rows depending on where the rounding falls.
    // Read the band, not a row: a border test that misses by a pixel reports
    // that nothing is ever selected.
    const isAccent = (shot, x, yTop) => {
      for (let y = yTop - 2; y <= yTop + 2; y++) {
        const c = rgb(shot, x, y);
        if (c[0] > 150 && c[1] > 120 && c[2] < 110 && c[0] > c[2] + 80) return true;
      }
      return false;
    };
    const cardTop = Math.round(H * 0.055);
    const cardBand = i => {
      const gap = 0.022, w = (BAR_W - gap * 2) / 3;
      return [atX((i * (w + gap)) / BAR_W), atX((i * (w + gap) + w) / BAR_W)];
    };
    const cardX = i => { const b = cardBand(i); return Math.round((b[0] + b[1]) / 2); };
    for (const [t, want] of [[1.0, 1], [4.0, 0], [10.0, 2]]) {
      const shot = await pixels(sceneAt('three-named'), t);
      let on = 0;
      for (let i = 0; i < 3; i++) if (isAccent(shot, cardX(i), cardTop)) on++;
      assert.strictEqual(on, 1,
        'exactly one card may be selected at ' + t + 's, ' + on + ' are lit');
      // ...and it is the one he is naming: out, then in, then employees
      assert.ok(isAccent(shot, cardX(want), cardTop),
        'at ' + t + 's the selected card must be card ' + want);
    }
    // The bar below follows the selection. Money Out's widest segment is 25.9%
    // of its bar; Money In's is 30.1% of its own.
    function widest(shot, y) {
      let best = 0, run = 0, prev = null;
      for (let x = atX(0); x < atX(1); x++) {
        const key = rgb(shot, x, y).join(',');
        if (key === prev) run++; else { prev = key; run = 1; }
        if (run > best) best = run;
      }
      return best / (atX(1) - atX(0));
    }
    const y = H * rowProbe(['c'], 0);
    const out = widest(await pixels(sceneAt('three-named'), 1.6), y);
    const inn = widest(await pixels(sceneAt('three-named'), 7.5), y);
    assert.ok(Math.abs(out - 0.259) < 0.02,
      'with Money Out selected the bar is Money Out, widest segment ' + out.toFixed(3));
    assert.ok(Math.abs(inn - 0.301) < 0.02,
      'selecting Money In must redraw the bar as Money In, widest segment ' +
      inn.toFixed(3) + ' — expected 0.301');
    // Choosing Employees swaps the DATASET, the way the live page does: the
    // bar becomes what the city pays its workforce, department by department.
    // Water and Power is the widest of those, $2.12B of $7.35B.
    //
    // The first version of this drew an orange block over a third of the
    // budget bar. That answered the question with the wrong picture — it said
    // the first three and a half departments ARE the payroll — and it is not
    // what the product does.
    {
      const shot = await pixels(sceneAt('three-named'), 11.5);
      const w = widest(shot, y);
      assert.ok(Math.abs(w - 0.288) < 0.02,
        'selecting Employees must redraw the bar as the payroll by department, ' +
        'widest segment ' + w.toFixed(3) + ' — expected 0.288 for Water and Power');
    }
    // ...and the Money Out card carries the share, on its right-hand third,
    // which is where the live page puts it.
    {
      const shot = await pixels(sceneAt('three-named'), 11.5);
      const band = cardBand(1);
      const cy = Math.round(H * 0.055 + H * 0.110 * 0.5);
      // The SAME place on the card beside it, which carries no fill, is the
      // control: comparing one card's left to its own right reads the big
      // figure printed across it instead of the fill.
      const other = cardBand(0);
      const inset = Math.round((band[1] - band[0]) * 0.04);
      const right = rgb(shot, band[1] - inset, cy);
      const plain = rgb(shot, other[1] - inset, cy);
      assert.ok(right[0] > plain[0] + 20 && right[0] > right[2] + 20,
        'with Employees chosen the Money Out card must carry an orange fill on ' +
        'its right-hand third: it reads ' + right.join(',') + ' where the ' +
        'Money In card at the same place reads ' + plain.join(','));
    }
  }

  // ---- every segment table sums to the total printed beside it ------------
  // icicle scales each row to the sum of what it is HANDED. FED_OUT listed
  // nine segments adding to $6,695.5B while the frame printed $7,195.8B, so
  // every federal segment drew 7.5% too wide and $500.3B vanished without a
  // mark. The spec's rule: a drawn segment must never silently stand for
  // several.
  {
    const src = fs.readFileSync(path.join(EP_DIR, 'art.js'), 'utf8');
    const sumOf = name => {
      const i = src.indexOf('var ' + name + ' = [');
      assert.ok(i > 0, 'art.js has no table named ' + name);
      const body = src.slice(i, src.indexOf('\n  ];', i));
      return [...body.matchAll(/amt:\s*([\d.]+)e(\d)/g)]
        .reduce((a, m) => a + (+m[1]) * Math.pow(10, +m[2]), 0);
    };
    for (const [name, printed] of [['FED_OUT', 7195.8e9], ['FED_BY_DEPT', 7195.8e9],
                                   ['LA_OUT', 21.5e9], ['LA_IN', 21.6e9],
                                   ['COUNTY_OUT', 37.6e9],
                                   ['STATE_OUT', 190.3e9]]) {
      const off = Math.abs(sumOf(name) - printed) / printed;
      assert.ok(off < 0.01, name + ' sums to $' + (sumOf(name) / 1e9).toFixed(1) +
        'B but the frame prints $' + (printed / 1e9).toFixed(1) +
        'B, so every segment in it is drawn ' + (off * 100).toFixed(1) + '% wrong');
    }
  }

  // ---- the coverage caption counts what the map actually shows ----------
  // The caption said "in all 51 states". There are fifty, plus the District of
  // Columbia, and a civic tech platform that miscounts the states is not one
  // anybody should trust with a budget. The 51st code in the API's answer is
  // US — the federal government, which has its own line underneath the map.
  //
  // So the caption is tied to the table it describes: both numbers in it are
  // read back out of MAP_COUNT, and every key in MAP_COUNT has to be a real
  // state. A new state code, a re-capture, or a hand-edited caption all fail
  // here rather than on screen.
  {
    const src = fs.readFileSync(path.join(EP_DIR, 'art.js'), 'utf8');
    const STATES = ('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD ' +
      'MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT ' +
      'VT VA WA WV WI WY').split(' ');
    const i = src.indexOf('var MAP_COUNT = {');
    assert.ok(i > 0, 'art.js has no MAP_COUNT');
    const body = src.slice(i, src.indexOf('};', i));
    const pairs = [...body.matchAll(/\b([A-Z]{2}):\s*(\d+)/g)]
      .map(m => [m[1], +m[2]]);
    assert.ok(pairs.length > 40, 'MAP_COUNT did not parse, found ' + pairs.length + ' entries');

    const notStates = pairs.map(p => p[0]).filter(k => STATES.indexOf(k) < 0);
    assert.deepStrictEqual(notStates, [],
      'MAP_COUNT is keyed by state, and these are not states: ' + notStates.join(' ') +
      ' — the API answers with US for the federal government, which is not one');

    const cap = /var MAP_TOTAL = "([^"]+)"/.exec(src);
    assert.ok(cap, 'art.js has no MAP_TOTAL caption');
    const saidStates = +(/(\d+) states/.exec(cap[1]) || [])[1];
    const saidGovs = +String((/([\d,]+) governments/.exec(cap[1]) || [])[1] || '')
      .replace(/,/g, '');
    const sum = pairs.reduce((a, p) => a + p[1], 0);

    assert.strictEqual(saidStates, pairs.length,
      'the caption claims ' + saidStates + ' states and the map has ' + pairs.length);
    assert.ok(saidStates <= 50,
      'there are fifty states: the caption claims ' + saidStates);
    assert.strictEqual(saidGovs, sum,
      'the caption claims ' + saidGovs + ' governments and the map adds to ' + sum);
  }

  assert.deepStrictEqual(errors, [], 'the page threw while rendering');
  await browser.close();
  console.log('PASS 18-treasury (no early drill, no label too small, no re-entry, honest denominators, the pan joins up)');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
