// The victim reacts across the 3s hold: drops his prop, floats off the ground into a spread eagle,
// judders for the last second, then goes. Let go early and he comes back down — gently if he had barely
// left the floor, hard if he was up — and carries on.
//
// Pixels, not just state. Every earlier defect in this feature passed a state-only suite, and this one
// has two traps that a state test walks straight past:
//
//   * The shadow deliberately STAYS on the floor while he rises, so his ink BOTTOM never moves. A test
//     asserting "he rose" against the ink bottom measures the shadow and passes at any float height,
//     including zero. The rise is measured off the ink TOP.
//   * The first spread-eagle pose got NARROWER through the second half of the rise (armRF is an
//     absolute direction in this rig, so 132/150 folds the forearm back toward vertical: 39px against
//     49px for straight limbs). "He is in the spread eagle" was true the whole time; the silhouette was
//     the only thing that knew it was wrong.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const RELOADS = 14;

// Ink metrics for a figure canvas, in CSS-local px. `aboveY` excludes the ground band so the shadow —
// which is 30px wide at rest and never leaves the floor — cannot masquerade as the figure.
function installInk() {
  window.__ink = function (e, aboveY) {
    if (!e.c.parentNode) return null;
    var sw = e.c.width, sh = e.c.height;
    var d;
    try { d = e.ctx.getImageData(0, 0, sw, sh).data; } catch (x) { return null; }
    var rx = sw / e.w, ry = sh / e.h;
    var lim = (aboveY == null) ? sh : Math.max(0, Math.round(aboveY * ry));
    var top = -1, bot = -1, minX = -1, maxX = -1, sumX = 0, n = 0;
    for (var y = 0; y < lim; y++) {
      var rb = y * sw * 4;
      for (var x = 0; x < sw; x++) {
        if (d[rb + x * 4 + 3] > 8) {
          if (top < 0) top = y;
          bot = y;
          if (minX < 0 || x < minX) minX = x;
          if (x > maxX) maxX = x;
          sumX += x; n++;
        }
      }
    }
    if (top < 0) return null;
    return { top: top / ry, bot: bot / ry, w: (maxX - minX) / rx, cx: (sumX / n) / rx };
  };
}

async function open(browser, w, h) {
  const page = await browser.newPage({ viewport: { width: w || 1280, height: h || 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  await page.waitForFunction(() => !!window.__evFigDebug);
  await page.waitForTimeout(1100);
  await page.evaluate(installInk);
  page.__errs = errs;
  return page;
}

// Find an on-screen victim matching a predicate, scroll him into view, and return his index.
async function pick(page, predSrc) {
  return page.evaluate(function (src) {
    var pred = new Function('e', 'return (' + src + ')(e)');
    var d = window.__evFigDebug;
    for (var i = 0; i < d.entries.length; i++) {
      var e = d.entries[i];
      if (!e.w || e.gone || e.spec.mode === 'why') continue;
      if (!pred(e)) continue;
      e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
      return i;
    }
    return null;
  }, predSrc);
}

// Press the real way, so the mousedown/mousemove/mouseup handlers are what is under test.
//
// Aim at his measured INK, not at a canvas-relative guess. `e.h - 20` seemed reasonable and works for
// stand and beam, but the rope Bobit sits at the TOP of a 300px canvas — the press landed on empty
// space, bobitAt selected nothing, and the rope simply carried on drawing while the test blamed the
// product for clipping him.
async function press(page, i) {
  const ok = await page.evaluate(function (ti) {
    var e = window.__evFigDebug.entries[ti];
    var ink = window.__ink(e);
    if (!ink) return false;
    var r = e.c.getBoundingClientRect();
    var pt = { x: r.left + ink.cx, y: r.top + (ink.top + ink.bot) / 2 };
    // and it must land on HIM, not on a figure overlapping him
    if (window.__evFigDebug.bobitAt(pt.x, pt.y) !== e) {
      var hit = false;
      for (var yy = ink.top; yy <= ink.bot; yy += 2) {
        if (window.__evFigDebug.bobitAt(r.left + ink.cx, r.top + yy) === e) { pt.y = r.top + yy; hit = true; break; }
      }
      if (!hit) return false;
    }
    window.__pressPt = pt;
    document.dispatchEvent(new MouseEvent('mousedown', {
      button: 2, clientX: pt.x, clientY: pt.y, bubbles: true
    }));
    return true;
  }, i);
  return ok;
}
async function release(page) {
  await page.evaluate(() => document.dispatchEvent(new MouseEvent('mouseup', { button: 2, bubbles: true })));
}

// ── A: he rises, he spreads, he judders, and the run completes ────────────────────────────────
async function scenarioRise(browser) {
  const page = await open(browser);
  const i = await pick(page, "e => e.spec.mode === 'stand'");
  if (i == null) { await page.close(); return null; }
  await page.waitForTimeout(350);

  const idle = await page.evaluate(t => window.__ink(window.__evFigDebug.entries[t]), i);
  if (!(await press(page, i))) { await page.close(); return null; }
  await page.waitForTimeout(80);

  const armed = await page.evaluate(t => {
    const e = window.__evFigDebug.entries[t];
    return { ab: e.ab, grew: e.h - e.abPrevH, floor: e.abFloor };
  }, i);

  // sample the rise
  const rise = [];
  for (let k = 0; k < 7; k++) {
    await page.waitForTimeout(270);
    rise.push(await page.evaluate(t => {
      const e = window.__evFigDebug.entries[t];
      const ink = window.__ink(e, e.abFloor - 10);
      return { ab: e.ab, lift: e.abLift, top: ink && ink.top, w: ink && ink.w };
    }, i));
  }

  // per-frame sampling through the shimmy: a 50Hz judder is invisible at 270ms intervals
  const shim = await page.evaluate(t => {
    const e = window.__evFigDebug.entries[t];
    return new Promise(res => {
      const xs = [];
      (function step() {
        if (!e.c.parentNode || e.ab !== 'shimmy') {
          if (xs.length > 6 || !e.c.parentNode) return res(xs);
        } else {
          const ink = window.__ink(e, e.abFloor - 10);
          if (ink) xs.push(ink.cx);
        }
        requestAnimationFrame(step);
      })();
    });
  }, i);

  await page.waitForFunction(() => window.__evFigDebug.poof.phase === 'cleared', { timeout: 30000 });
  const errs = page.__errs.slice();
  await page.close();
  return { idle, armed, rise, shim, errs };
}

function checkRise(r) {
  assert.ok(r.armed.ab, 'A: the hold did not start an abduction');
  assert.ok(r.armed.grew > 0, 'A: the canvas did not grow upward, so he has nowhere to float to');

  const lifted = r.rise.filter(s => s.top != null && s.lift > 0);
  assert.ok(lifted.length >= 3, 'A: not enough sampled frames with him off the ground');

  // He rises: ink TOP climbs. (Ink bottom is the shadow and never moves — see the header.)
  const first = lifted[0], last = lifted[lifted.length - 1];
  assert.ok(last.top < first.top - 20,
    'A: his ink top only moved from ' + first.top.toFixed(1) + ' to ' + last.top.toFixed(1) +
    ' — he is not actually rising on screen');
  const peak = Math.max.apply(null, r.rise.map(s => s.lift || 0));
  assert.ok(Math.abs(peak - 34) <= 2, 'A: peak lift was ' + peak.toFixed(1) + 'px, expected FLOAT_H 34');

  // monotonic while rising — no bouncing
  for (let k = 1; k < lifted.length; k++) {
    assert.ok(lifted[k].top <= lifted[k - 1].top + 2,
      'A: ink top went back DOWN mid-rise (' + lifted[k - 1].top.toFixed(1) + ' -> ' +
      lifted[k].top.toFixed(1) + ') — the float is not monotonic');
  }

  // He spreads. Compared against idle, not frame-to-frame: the arms sweep up THROUGH horizontal, so
  // the silhouette peaks mid-rise and settles narrower at the final X. Measured 31 idle -> 52 spread.
  const spread = r.rise.filter(s => s.ab === 'shimmy' || s.lift > 30).map(s => s.w).filter(x => x != null);
  assert.ok(spread.length, 'A: never reached the spread eagle');
  const wSpread = Math.max.apply(null, spread);
  assert.ok(wSpread > r.idle.w * 1.4,
    'A: silhouette at full float is ' + wSpread.toFixed(1) + 'px against ' + r.idle.w.toFixed(1) +
    'px idle — he is not visibly spread-eagled. (armRF is an ABSOLUTE angle here; setting it away ' +
    'from armRU folds the forearm back and narrows him.)');

  // He judders: real variance, no net drift.
  assert.ok(r.shim.length >= 6, 'A: only ' + r.shim.length + ' shimmy frames sampled');
  const mean = r.shim.reduce((a, b) => a + b, 0) / r.shim.length;
  const sd = Math.sqrt(r.shim.reduce((a, b) => a + (b - mean) * (b - mean), 0) / r.shim.length);
  const halfA = r.shim.slice(0, Math.floor(r.shim.length / 2));
  const halfB = r.shim.slice(Math.floor(r.shim.length / 2));
  const mA = halfA.reduce((a, b) => a + b, 0) / halfA.length;
  const mB = halfB.reduce((a, b) => a + b, 0) / halfB.length;
  assert.ok(sd > 0.3, 'A: shimmy x-spread is ' + sd.toFixed(2) + 'px — he is not vibrating');
  assert.ok(Math.abs(mB - mA) < 6,
    'A: shimmy drifted ' + (mB - mA).toFixed(1) + 'px between halves — that is a slide, not a judder');

  assert.deepStrictEqual(r.errs, [], 'A: page errors during the abduction');
  return { peak, wSpread, idleW: r.idle.w, sd: sd };
}

// ── B: the rope Bobit must not lose his head. He is the mode with 0px of headroom. ─────────────
async function scenarioRopeClip(browser) {
  const page = await open(browser);
  const i = await pick(page, "e => e.spec.mode === 'rope'");
  if (i == null) { await page.close(); return null; }
  await page.waitForTimeout(350);
  if (!(await press(page, i))) { await page.close(); return null; }

  let minTop = 1e9;
  for (let k = 0; k < 8; k++) {
    await page.waitForTimeout(250);
    const t = await page.evaluate(ti => {
      const e = window.__evFigDebug.entries[ti];
      const ink = window.__ink(e);
      return ink ? ink.top : null;
    }, i);
    if (t != null) minTop = Math.min(minTop, t);
  }
  await release(page);
  const errs = page.__errs.slice();
  await page.close();
  return { minTop, errs };
}

// ── C: his prop hits the floor and stays there ─────────────────────────────────────────────────
async function scenarioProp(browser) {
  const page = await open(browser);
  // beam is always cast and carries a load; its prop kind is 'beamload'
  const i = await pick(page, "e => e.spec.mode === 'beam'");
  if (i == null) { await page.close(); return null; }
  await page.waitForTimeout(350);
  if (!(await press(page, i))) { await page.close(); return null; }
  await page.waitForTimeout(120);

  const hasProp = await page.evaluate(t => {
    const e = window.__evFigDebug.entries[t];
    return e.abProp ? { kind: e.abProp.kind, y0: e.abProp.y0 } : null;
  }, t = i);
  if (!hasProp) { await page.close(); return { skipped: true }; }

  await page.waitForTimeout(900);            // letgo done, prop should be down
  const landed = await page.evaluate(t => {
    const e = window.__evFigDebug.entries[t];
    return { landed: e.abProp.landed, y: e.abProp.y, floor: e.abFloor };
  }, i);
  const errs = page.__errs.slice();
  await page.close();
  return { hasProp, landed, errs };
}

// ── D/E: early release, both branches ──────────────────────────────────────────────────────────
async function scenarioRelease(browser, holdMs, label) {
  const page = await open(browser);
  const i = await pick(page, "e => e.spec.mode === 'stand'");
  if (i == null) { await page.close(); return null; }
  await page.waitForTimeout(350);

  const beforeH = await page.evaluate(t => window.__evFigDebug.entries[t].h, i);
  if (!(await press(page, i))) { await page.close(); return null; }
  await page.waitForTimeout(holdMs);
  const atRelease = await page.evaluate(t => {
    const e = window.__evFigDebug.entries[t];
    return { ab: e.ab, lift: e.abLift };
  }, i);
  await release(page);

  // watch every sub-phase he passes through on the way back
  const seen = await page.evaluate(t => {
    const e = window.__evFigDebug.entries[t];
    return new Promise(res => {
      const ph = [];
      const t0 = performance.now();
      (function step() {
        if (e.ab && ph[ph.length - 1] !== e.ab) ph.push(e.ab);
        if (!e.ab || performance.now() - t0 > 6000) {
          return res({ ph, done: !e.ab, timedOut: performance.now() - t0 > 6000 });
        }
        requestAnimationFrame(step);
      })();
    });
  }, i);

  await page.waitForTimeout(250);
  const after = await page.evaluate(t => {
    const e = window.__evFigDebug.entries[t];
    return {
      gone: !!e.gone, ab: e.ab, h: e.h, attached: !!e.c.parentNode,
      painting: !!window.__ink(e), phase: window.__evFigDebug.poof.phase
    };
  }, i);
  const errs = page.__errs.slice();
  await page.close();
  return { label, atRelease, seen, after, beforeH, errs };
}

function checkRelease(r, expectHeap) {
  const L = r.label;
  assert.ok(r.seen.done, L + ': he never finished recovering (phases: ' + r.seen.ph.join(' -> ') +
    (r.seen.timedOut ? ', timed out' : '') + ')');
  assert.ok(!r.after.gone, L + ': an early release made him vanish — only the full 3s may do that');
  assert.strictEqual(r.after.ab, null, L + ': e.ab is still set after recovery, so he can never be re-grabbed');
  assert.ok(r.after.attached && r.after.painting, L + ': he is not drawing again after recovery');
  assert.strictEqual(r.after.h, r.beforeH,
    L + ': canvas is ' + r.after.h + 'px, was ' + r.beforeH + ' before the grab — the growth was not undone');
  assert.strictEqual(r.after.phase, 'idle', L + ': POOF did not return to idle, it is ' + r.after.phase);

  const heaped = r.seen.ph.indexOf('heap') >= 0;
  if (expectHeap) {
    assert.ok(r.atRelease.lift >= 12,
      L + ': meant to test the collapse branch but he had only risen ' + r.atRelease.lift.toFixed(1) + 'px');
    assert.ok(heaped, L + ': released at full height but he never heaped (phases: ' + r.seen.ph.join(' -> ') + ')');
    assert.ok(r.seen.ph.indexOf('getup') >= 0, L + ': no getup (phases: ' + r.seen.ph.join(' -> ') + ')');
  } else {
    assert.ok(r.atRelease.lift < 12,
      L + ': meant to test the settle branch but he had risen ' + r.atRelease.lift.toFixed(1) + 'px');
    assert.ok(!heaped,
      L + ': a ' + (r.atRelease.lift).toFixed(1) + 'px lift produced a full pratfall (phases: ' +
      r.seen.ph.join(' -> ') + ') — a quick grab must just settle');
  }
  return r.seen.ph.join('->');
}

// ── F: the move-off cancel must not fire once he is airborne ───────────────────────────────────
async function scenarioMoveOff(browser) {
  const page = await open(browser);
  const i = await pick(page, "e => e.spec.mode === 'stand'");
  if (i == null) { await page.close(); return null; }
  await page.waitForTimeout(350);

  // during letgo, moving off him SHOULD cancel
  if (!(await press(page, i))) { await page.close(); return null; }
  await page.waitForTimeout(90);
  await page.evaluate(() => document.dispatchEvent(
    new MouseEvent('mousemove', { clientX: 3, clientY: 3, bubbles: true })));
  await page.waitForTimeout(60);
  const duringLetgo = await page.evaluate(() => window.__evFigDebug.poof.phase);
  await release(page);
  await page.waitForTimeout(1400);          // let him recover fully

  // during rise, it must NOT
  if (!(await press(page, i))) { await page.close(); return null; }
  await page.waitForTimeout(700);           // well into 'rise'
  const abNow = await page.evaluate(t => window.__evFigDebug.entries[t].ab, i);
  await page.evaluate(() => document.dispatchEvent(
    new MouseEvent('mousemove', { clientX: 3, clientY: 3, bubbles: true })));
  await page.waitForTimeout(80);
  const duringRise = await page.evaluate(() => window.__evFigDebug.poof.phase);
  await release(page);
  const errs = page.__errs.slice();
  await page.close();
  return { duringLetgo, abNow, duringRise, errs };
}

(async function () {
  const browser = await chromium.launch();
  const out = [];

  let a = null;
  for (let n = 0; n < RELOADS && !a; n++) a = await scenarioRise(browser);
  assert.ok(a, 'no cast in ' + RELOADS + ' loads had an on-screen stand figure');
  const am = checkRise(a);
  out.push('rise: lift ' + am.peak.toFixed(1) + 'px, silhouette ' + am.idleW.toFixed(0) + ' -> ' +
    am.wSpread.toFixed(0) + 'px, shimmy sd ' + am.sd.toFixed(2) + 'px');

  let b = null;
  for (let n = 0; n < RELOADS && !b; n++) b = await scenarioRopeClip(browser);
  assert.ok(b, 'no cast in ' + RELOADS + ' loads had an on-screen rope Bobit — the 0px-headroom mode ' +
    'is the whole reason the canvas grows, so this run would prove nothing');
  assert.ok(b.minTop > 0,
    'rope: his ink touched y=' + b.minTop.toFixed(1) + ' during the rise — he is being clipped by the ' +
    'top of his canvas. rope has 0px of headroom, which is why AB_GROW exists.');
  assert.deepStrictEqual(b.errs, [], 'rope: page errors');
  out.push('rope: min ink top ' + b.minTop.toFixed(1) + 'px, not clipped');

  let c = null;
  for (let n = 0; n < RELOADS && !c; n++) c = await scenarioProp(browser);
  assert.ok(c, 'no cast in ' + RELOADS + ' loads had an on-screen beam crew');
  if (c.skipped) {
    out.push('prop: beam was not carrying a load this run, prop drop unverified');
  } else {
    assert.ok(c.landed.landed, 'prop: his ' + c.hasProp.kind + ' never finished falling');
    assert.ok(Math.abs(c.landed.y - c.landed.floor) < 2,
      'prop: his ' + c.hasProp.kind + ' came to rest at y ' + c.landed.y.toFixed(1) + ', not on his floor (' +
      c.landed.floor.toFixed(1) + ')');
    assert.ok(c.landed.y > c.hasProp.y0,
      'prop: it did not fall — started at ' + c.hasProp.y0.toFixed(1) + ', ended at ' + c.landed.y.toFixed(1));
    out.push('prop: ' + c.hasProp.kind + ' fell ' + (c.landed.y - c.hasProp.y0).toFixed(0) + 'px onto his floor');
  }

  let d = null;
  for (let n = 0; n < RELOADS && !d; n++) d = await scenarioRelease(browser, 200, 'settle');
  assert.ok(d, 'settle: no on-screen stand figure');
  out.push('settle (' + d.atRelease.lift.toFixed(1) + 'px lift): ' + checkRelease(d, false));

  let e2 = null;
  for (let n = 0; n < RELOADS && !e2; n++) e2 = await scenarioRelease(browser, 2500, 'collapse');
  assert.ok(e2, 'collapse: no on-screen stand figure');
  out.push('collapse (' + e2.atRelease.lift.toFixed(1) + 'px lift): ' + checkRelease(e2, true));

  let f = null;
  for (let n = 0; n < RELOADS && !f; n++) f = await scenarioMoveOff(browser);
  assert.ok(f, 'move-off: no on-screen stand figure');
  assert.strictEqual(f.duringLetgo, 'fizzle',
    'move-off: dragging off him during letgo did not cancel (phase ' + f.duringLetgo + ')');
  assert.ok(f.abNow && f.abNow !== 'letgo', 'move-off: second grab was still in letgo, nothing was tested');
  assert.strictEqual(f.duringRise, 'holding',
    'move-off: dragging off him while he was airborne cancelled the hold (phase ' + f.duringRise +
    '). He floats out from under the cursor, so this would make the gag impossible to complete.');
  out.push('move-off: cancels in letgo, ignored once airborne');

  out.forEach(l => console.log('  ' + l));
  console.log('11-abduct: PASS');
  await browser.close();
})();
