// A body's IDENTITY — his colour and his size — has to survive the gag taking over his entry.
//
// 13-multibody proved every body still gets drawn. It did not ask WHAT was drawn, and that is where
// the next defect lived: the abduction and the exodus each replace an entry's whole draw, and both
// drew every body in the entry's single `col` at the one adult scale S. So grabbing the parent of a
// parent-and-toddler repainted the toddler in the parent's colour, and grabbing the TODDLER stood him
// up as a full-sized adult in his parent's colour for the length of the hold — he snapped back to a
// small red child when the grab was cancelled. Same bug on the cartwheel pair and the paddle pair:
// delete one and his partner changed colour.
//
// So this file asserts PIXELS, and it takes its expectations from the mode's OWN draw a moment
// earlier rather than from anything the gag publishes: sample each body's dominant palette colour and
// ink height while his mode is still drawing him, then take the entry over and demand the same
// colour, and a small body that is still visibly smaller than the adult beside him.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const RELOADS = 40;

function installProbe() {
  var PAL = document.documentElement.dataset.theme === 'dark'
    ? ['#1DA8C6', '#FF6B52', '#FFD740', '#43D07E', '#B49BFF', '#FF9A4D']
    : ['#007D99', '#FF5740', '#B8860B', '#2E9E5B', '#7A4FD0', '#E0641C'];
  var RGB = PAL.map(function (h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  });
  // Which figure colour dominates a vertical band around this canvas-local x, and how tall is the ink
  // in it? Opaque pixels only: the shadow is a 0.18-alpha grey and the anti-aliased edge of a limb is
  // a blend of ink and page, and neither is the figure's colour.
  window.__band = function (e, x, halfW) {
    if (!e.c.parentNode) return null;
    var sw = e.c.width, sh = e.c.height, rx = sw / e.w, ry = sh / e.h;
    var x0 = Math.max(0, Math.round((x - halfW) * rx));
    var w = Math.min(sw - x0, Math.round(halfW * 2 * rx));
    if (w <= 0) return null;
    var d;
    try { d = e.ctx.getImageData(x0, 0, w, sh).data; } catch (err) { return { err: String(err) }; }
    var counts = [0, 0, 0, 0, 0, 0], top = null, bot = null;
    for (var p = 0; p < d.length; p += 4) {
      if (d[p + 3] < 200) continue;
      var py = Math.floor((p / 4) / w);
      if (top == null) top = py;
      bot = py;
      var best = -1, bd = 1e9;
      for (var i = 0; i < 6; i++) {
        var dr = d[p] - RGB[i][0], dg = d[p + 1] - RGB[i][1], db = d[p + 2] - RGB[i][2];
        var dist = dr * dr + dg * dg + db * db;
        if (dist < bd) { bd = dist; best = i; }
      }
      if (bd < 3000) counts[best]++;
    }
    var tone = -1, tc = 0;
    for (var k = 0; k < 6; k++) if (counts[k] > tc) { tc = counts[k]; tone = k; }
    return { tone: tc > 20 ? tone : -1, px: tc, inkH: top == null ? 0 : (bot - top) / ry };
  };
}

async function open(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  await page.waitForFunction(() => !!window.__evFigDebug);
  await page.waitForTimeout(1150);
  await page.evaluate(installProbe);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  page.__errs = errs;
  return page;
}

// Every entry that MIGHT draw two bodies. `_bodies` is published by the draw, and the loop culls
// entries that are off screen, so an entry that has never been on screen has none yet — the mode is
// the reliable filter, the array is not.
const MULTI = ['patrol', 'paddlepair', 'cartwheel', 'beam', 'letters'];
async function candidates(page) {
  return page.evaluate(m => {
    const d = window.__evFigDebug, out = [];
    for (let i = 0; i < d.entries.length; i++) {
      const e = d.entries[i];
      if (!e.w || e.gone || e.spec.mode === 'why') continue;
      if (m.indexOf(e.spec.mode) >= 0) out.push(i);
    }
    return out;
  }, MULTI);
}

const baseline = (page, i) => page.evaluate(t => {
  const e = window.__evFigDebug.entries[t];
  if (!e._bodies || e._bodies.length < 2) return null;
  return {
    mode: e.spec.mode, toddler: !!e.spec.toddler,
    bodies: e._bodies.map(b => Object.assign(
      { x: b.x, floor: b.floor, small: !!b.small }, window.__band(e, b.x, b.small ? 12 : 15)))
  };
}, i);

// Scroll each candidate into view in turn and keep the first whose bodies are painted in 2+ DIFFERENT
// colours. The beam crew is two bodies in one colour, so it can prove nothing here and is passed over.
// `wantSmall` narrows the hunt to the parent-and-toddler.
async function findTwoTone(page, wantSmall) {
  const idxs = await candidates(page);
  for (const i of idxs) {
    await page.evaluate(t => {
      window.__evFigDebug.entries[t].c.scrollIntoView({ block: 'center', behavior: 'instant' });
    }, i);
    await page.waitForTimeout(320);
    const b = await baseline(page, i);
    if (!b) continue;
    const tones = b.bodies.map(x => x.tone);
    if (tones.some(t => t < 0) || new Set(tones).size < 2) continue;
    if (wantSmall && !b.bodies.some(x => x.small)) continue;
    return { i: i, before: b };
  }
  return null;
}

// A cast puts a parent-and-toddler on screen about one load in ten — a kite takes that slot a quarter
// of the time, the walker branch is 28% of what is left, and only half of those walkers escort a
// child — so hunting one by reloading is slow and flakes. The patrol draw reads its spec every frame,
// so hand a toddler to whichever patrol the cast did give us instead: it is the same draw, the same
// `_bodies`, and the same gag. What is under test is the takeover, not the casting dice.
const adopt = page => page.evaluate(() => {
  const d = window.__evFigDebug;
  let n = 0;
  for (const e of d.entries) {
    if (e.spec.mode !== 'patrol' || e.spec.toddler) continue;
    e.spec.toddler = true;
    e.spec.toddlerTone = ((e.spec.tone != null ? e.spec.tone : e.ci) + 3) % 6;   // never the parent's own
    e.spec.toddlerStyle = 'waddle';
    e._toff = null;
    n++;
  }
  return n;
});

// Grab body `which` and read every body back mid-hold.
async function scenarioAbduct(browser, wantToddler) {
  const page = await open(browser);
  if (wantToddler && !(await adopt(page))) { await page.close(); return null; }
  const found = await findTwoTone(page, wantToddler);
  if (!found) { await page.close(); return null; }
  const i = found.i, before = found.before;
  // Which body to grab: the small one when this run is hunting the toddler case, else the first.
  const which = wantToddler ? before.bodies.findIndex(b => b.small) : 0;
  if (which < 0) { await page.close(); return null; }

  const pressed = await page.evaluate(([t, wh]) => {
    const d = window.__evFigDebug, e = d.entries[t];
    const r = e.c.getBoundingClientRect();
    const b = e._bodies[wh];
    for (let dy = 10; dy < 90; dy += 3) {
      if (d.bobitAt(r.left + b.x, r.top + b.floor - dy) === e) {
        document.dispatchEvent(new MouseEvent('mousedown', {
          button: 2, clientX: r.left + b.x, clientY: r.top + b.floor - dy, bubbles: true
        }));
        return true;
      }
    }
    return false;
  }, [i, which]);
  if (!pressed) { await page.close(); return null; }

  await page.waitForTimeout(1500);                  // past letgo and the rise, into the shimmy
  const mid = await page.evaluate(t => {
    const e = window.__evFigDebug.entries[t];
    if (!e.ab) return null;
    return {
      ab: e.ab,
      victim: Object.assign({ x: e.abX }, window.__band(e, e.abX, 16)),
      mates: (e.abMates || []).map(m => Object.assign({ small: !!m.small }, window.__band(e, m.x, m.small ? 12 : 15)))
    };
  }, i);
  await page.evaluate(() => document.dispatchEvent(new MouseEvent('mouseup', { button: 2, bubbles: true })));
  const errs = page.__errs.slice();
  await page.close();
  if (!mid) return null;
  return { before, which, mid, errs };
}

// Poof somebody ELSE and read the two-tone entry back while it is fleeing.
//
// The exodus splits an entry on its ink MIDPOINT rather than on a grab point, and measured over
// repeated loads the ADULT wins that split every time: his silhouette is the wider one, so the
// midpoint of the pair's combined ink always lands nearer him than the child. So this scenario
// exercises the child as a MATE, and the "the runner himself is small" branch of drawFlee is the one
// path here no test reaches — scenario B covers the equivalent branch of the abduction, where the
// grab point puts the child in the victim role directly. Left in the code rather than dropped: a body
// carries his own size precisely so that whoever draws him does not have to know which role he is in.
async function scenarioFlee(browser) {
  const page = await open(browser);
  await adopt(page);
  const found = await findTwoTone(page, true);
  if (!found) { await page.close(); return null; }
  const i = found.i, before = found.before;

  const armed = await page.evaluate(t => {
    const d = window.__evFigDebug;
    const v = d.entries.find((e, j) => j !== t && e.w && !e.gone && e.spec.mode !== 'why');
    if (!v) return false;
    d.poof.victim = v; d.poof.phase = 'holding'; d.poof.t = 2.9;
    return true;
  }, i);
  if (!armed) { await page.close(); return null; }

  await page.waitForFunction(() => window.__evFigDebug.poof.phase === 'fleeing', { timeout: 12000 });
  await page.waitForTimeout(120);                   // still in 'raise': hands up, nobody has moved yet

  const mid = await page.evaluate(t => {
    const e = window.__evFigDebug.entries[t];
    if (e.gone || !e.fl) return null;
    return {
      fl: e.fl,
      self: Object.assign({ x: e.flX, small: !!e.flSmall }, window.__band(e, e.flX, e.flSmall ? 12 : 16)),
      mates: (e.flMates || []).map(m => Object.assign({ small: !!m.small }, window.__band(e, m.x, m.small ? 12 : 15)))
    };
  }, i);
  const errs = page.__errs.slice();
  await page.close();
  if (!mid) return null;
  return { before, mid, errs };
}

// Every tone the mode painted must still be on the canvas, and no tone that was not.
function assertTonesKept(tag, before, drawn) {
  const want = before.bodies.map(b => b.tone).sort().join(',');
  const got = drawn.map(b => b.tone).sort().join(',');
  assert.strictEqual(got, want,
    tag + ': ' + before.mode + ' paints its bodies in tones [' + want + '] but the takeover drew [' +
    got + '] — a body was repainted in somebody else\'s colour');
}

(async function () {
  const browser = await chromium.launch();

  // ── A: grab an adult; his partner keeps his own colour ──────────────────────────────────────
  let a = null;
  for (let n = 0; n < RELOADS && !a; n++) a = await scenarioAbduct(browser, false);
  assert.ok(a, 'no cast in ' + RELOADS + ' loads offered a grabbable two-tone entry');
  assert.deepStrictEqual(a.errs, [], 'abduct: page errors');
  assertTonesKept('abduct', a.before, [a.mid.victim].concat(a.mid.mates));
  assert.strictEqual(a.mid.victim.tone, a.before.bodies[a.which].tone,
    'abduct: grabbed the body painted in tone ' + a.before.bodies[a.which].tone +
    ' but he is being drawn in tone ' + a.mid.victim.tone);

  // ── B: grab the TODDLER; he stays his own colour AND stays a child ──────────────────────────
  let b = null;
  for (let n = 0; n < RELOADS && !b; n++) b = await scenarioAbduct(browser, true);
  assert.ok(b, 'no cast in ' + RELOADS + ' loads offered a patrol to escort a toddler — the small-body ' +
    'path is the one that regressed, so this test refuses to pass without exercising it');
  assert.deepStrictEqual(b.errs, [], 'toddler: page errors');
  assert.ok(b.before.toddler, 'toddler: expected a patrol escorting a toddler, got ' + b.before.mode);
  assertTonesKept('toddler', b.before, [b.mid.victim].concat(b.mid.mates));
  assert.strictEqual(b.mid.victim.tone, b.before.bodies[b.which].tone,
    'toddler: he is painted in tone ' + b.before.bodies[b.which].tone + ' but is being abducted in tone ' +
    b.mid.victim.tone + ' — the gag drew him in his parent\'s colour');
  // Size, against the adult in the same frame rather than an absolute px count: the spread eagle is a
  // different silhouette from a toddle, but a child is a child in any pose.
  const adult = b.mid.mates.find(m => !m.small);
  assert.ok(adult, 'toddler: the parent is not among the mates');
  assert.ok(b.mid.victim.inkH < adult.inkH * 0.8,
    'toddler: he measures ' + b.mid.victim.inkH.toFixed(1) + 'px against the parent\'s ' +
    adult.inkH.toFixed(1) + 'px — he grew up while being abducted');

  // ── C: the exodus draws the same cast; it must keep their colours too ───────────────────────
  let c = null;
  for (let n = 0; n < RELOADS && !c; n++) c = await scenarioFlee(browser);
  assert.ok(c, 'no cast in ' + RELOADS + ' loads had a parent-and-toddler survive to flee');
  assert.deepStrictEqual(c.errs, [], 'flee: page errors');
  assertTonesKept('flee', c.before, [c.mid.self].concat(c.mid.mates));
  const running = [c.mid.self].concat(c.mid.mates);
  const kid = running.find(x => x.small), grown = running.find(x => !x.small);
  assert.ok(kid && grown, 'flee: expected a child and an adult running, got ' +
    JSON.stringify(running.map(x => x.small)));
  assert.ok(kid.inkH < grown.inkH * 0.8,
    'flee: the child measures ' + kid.inkH.toFixed(1) + 'px against the adult\'s ' + grown.inkH.toFixed(1) +
    'px — he grew up on the way out' + (c.mid.self.small ? ' (he was the runner)' : ' (he was a mate)'));

  console.log('  abduct:  ' + a.before.mode + ' kept tones [' + a.before.bodies.map(x => x.tone).join(',') + ']');
  console.log('  toddler: abducted in tone ' + b.mid.victim.tone + ' at ' + b.mid.victim.inkH.toFixed(1) +
    'px vs the parent\'s ' + adult.inkH.toFixed(1) + 'px');
  console.log('  flee:    ' + c.before.mode + ' fled in tones [' + c.before.bodies.map(x => x.tone).join(',') +
    '], child ' + kid.inkH.toFixed(1) + 'px vs adult ' + grown.inkH.toFixed(1) + 'px' +
    (c.mid.self.small ? ' (the child was the runner)' : ' (the child was a mate)'));
  console.log('16-body-identity: PASS');
  await browser.close();
})();
