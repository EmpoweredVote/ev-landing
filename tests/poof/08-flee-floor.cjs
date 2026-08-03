// Every Bobit must start his run from the floor he was VISIBLY standing on.
//
// This is the third time in this feature that something was anchored to a canvas dimension that
// only holds for some modes (the pratfall drew 58px off-canvas; the smoke landed up to 592px from
// the figure; the flee floor was pinned to `h - 6`). `h - 6` is only where a figure stands for
// modes that draw at feetY = h - 6 — a seated reader's ink bottom measured 12px above that line
// and a rope-hanger's measured 225px above it, so both got yanked to a different height and ran
// off through empty space.
//
// It is also the third defect here that a green suite could not see, because every other test in
// tests/poof asserts STATE (he is fleeing, he advanced, he is gone) and would pass with the whole
// cast drawn off-screen. So this file asserts PIXELS on both sides of the arm:
//   1. the floor handed to drawFlee == the figure's pre-flee ink bottom, and
//   2. the ink actually painted in the first flee frame lands on that same floor.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

// Modes whose ink does not sit on the h-6 line — the cast is randomised per load, so we reload
// until one is on screen rather than let the run quietly prove nothing.
const OFF_CONVENTION_PX = 8;
const RELOADS = 10;

// injected: lowest painted row of a figure canvas, in CSS-local px
function installInkProbe() {
  window.__inkBottom = function (e) {
    var sw = e.c.width, sh = e.c.height;
    var img = e.ctx.getImageData(0, 0, sw, sh).data;
    for (var yy = sh - 1; yy >= 0; yy--) {
      var rb = yy * sw * 4;
      for (var xx = 0; xx < sw; xx++) if (img[rb + xx * 4 + 3] > 8) return yy / (sh / e.h);
    }
    return -1;
  };
}

async function attempt(browser, width) {
  const page = await browser.newPage({ viewport: { width: width, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  await page.waitForTimeout(1200);
  await page.evaluate(installInkProbe);

  // getImageData is the whole measurement here; under file:// it throws SecurityError on a canvas
  // that has had a cross-origin image drawn into it. These canvases are pure vector, so it works —
  // but fail loudly rather than silently measure nothing if that ever changes.
  const probe = await page.evaluate(function () {
    var e = window.__evFigDebug.entries.filter(function (x) { return x.w; })[0];
    try { e.ctx.getImageData(0, 0, 2, 2); return 'ok'; }
    catch (err) { return err.name + ': ' + err.message; }
  });
  assert.strictEqual(probe, 'ok', 'cannot read figure-canvas pixels, so this test cannot measure anything: ' + probe);

  // Scroll an off-convention figure into view and poof someone ELSE, so the interesting figure
  // survives the burst and actually flees. Offscreen entries are culled at arm time, so the target
  // has to be on screen at the moment the cast is armed.
  const target = await page.evaluate(function () {
    var d = window.__evFigDebug;
    for (var i = 0; i < d.entries.length; i++) {
      var e = d.entries[i];
      if (e.spec.mode === 'seat' || e.spec.mode === 'rope') {
        if (!e.w) continue;
        e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
        return { i: i, mode: e.spec.mode };
      }
    }
    return null;
  });
  if (!target) { await page.close(); return null; }

  await page.waitForTimeout(400);   // let him redraw where the scroll put him

  const armed = await page.evaluate(function (ti) {
    var d = window.__evFigDebug;
    var v = d.entries.filter(function (e, i) { return i !== ti && e.spec.mode !== 'why' && e.w; })[0];
    if (!v) return false;
    d.poof.victim = v; d.poof.phase = 'holding'; d.poof.t = 2.9;
    return true;
  }, target.i);
  if (!armed) { await page.close(); return null; }

  // dt is pinned to 0 for the whole 'stunned' second, so the ink measured here is exactly the ink
  // poofArmFlee will scan.
  await page.waitForFunction(function () { return window.__evFigDebug.poof.phase === 'stunned'; }, { timeout: 8000 });
  const pre = await page.evaluate(function () {
    var d = window.__evFigDebug;
    return d.entries.map(function (e, i) {
      if (e.gone || e.spec.mode === 'why' || !e.w) return null;
      var r = e.c.getBoundingClientRect();
      if (r.bottom < -40 || r.top > window.innerHeight + 40) return null;   // will be culled, never flees
      var ib = window.__inkBottom(e);
      if (ib < 0) return null;                                             // nothing painted: nothing to anchor to
      return {
        i: i, mode: e.spec.mode, anim: e.spec.anim || '', h: e.h,
        inkLocal: ib, inkScreen: r.top + ib, offConvention: ib - (e.h - 6)
      };
    }).filter(function (x) { return x; });
  });

  await page.waitForFunction(function () { return window.__evFigDebug.poof.phase === 'fleeing'; }, { timeout: 8000 });

  // One rAF so the first flee frame is on the canvas, then read the floor AND the ink together.
  const post = await page.evaluate(function (idxs) {
    var d = window.__evFigDebug;
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        resolve(idxs.map(function (i) {
          var e = d.entries[i];
          if (e.flFloor == null || e.gone || !e.c.parentNode) return null;
          var r = e.c.getBoundingClientRect();
          var ib = -1;
          try { ib = window.__inkBottom(e); } catch (err) { }
          return {
            fl: e.fl, yOff: e.flYOff || 0,
            floorScreen: r.top + e.flFloor,
            inkScreen: ib < 0 ? null : r.top + ib
          };
        }));
      });
    });
  }, pre.map(function (p) { return p.i; }));

  const rows = [];
  pre.forEach(function (p, k) {
    const a = post[k];
    if (!a) return;   // culled at arm time
    rows.push({ pre: p, post: a });
  });
  await page.close();
  return { width: width, target: target, rows: rows };
}

function check(res) {
  const w = res.width + 'px';
  let checked = 0, offConvention = 0;

  res.rows.forEach(function (row) {
    const p = row.pre, a = row.post;
    const label = w + ': ' + p.mode + (p.anim ? '/' + p.anim : '') + ' (entry ' + p.i + ')';
    checked++;
    if (Math.abs(p.offConvention) > OFF_CONVENTION_PX) offConvention++;

    // 1. the floor handed to drawFlee is the floor he was standing on. Both sides come from the
    //    same frozen ink, so this is exact — anything above a rounding px is a real displacement.
    assert.ok(Math.abs(a.floorScreen - p.inkScreen) <= 1.5,
      label + ': flee floor is at screen y ' + a.floorScreen.toFixed(1) + ' but his ink bottom was at ' +
      p.inkScreen.toFixed(1) + ' — he teleported ' + (a.floorScreen - p.inkScreen).toFixed(1) +
      'px before starting to run. His mode draws ' + p.offConvention.toFixed(1) +
      'px off the h-6 line, so the flee geometry is still assuming h-6 somewhere.');

    // 2. and the ink that actually got painted is there too. drawFlee lays a shadow ellipse
    //    (ry ~2.4px) on the floor line, so the painted bottom sits a couple of px below it.
    //    Only figures still in 'run' with no drop offset are comparable.
    if (a.fl === 'run' && a.yOff === 0 && a.inkScreen != null) {
      assert.ok(Math.abs(a.inkScreen - p.inkScreen) <= 6,
        label + ': first flee frame painted its lowest ink at screen y ' + a.inkScreen.toFixed(1) +
        ', ' + (a.inkScreen - p.inkScreen).toFixed(1) + 'px from where he was standing (' +
        p.inkScreen.toFixed(1) + ')');
    }
  });

  assert.ok(checked > 0, w + ': no on-screen figure survived to flee, so nothing was measured');
  assert.ok(offConvention > 0,
    w + ': every figure measured happens to stand on the h-6 line, so this run could not have ' +
    'caught the bug it exists for. Needed a seat or rope figure on screen.');
  console.log(w + ': ' + checked + ' fleeing figures measured, ' + offConvention +
    ' of them off the h-6 line by >' + OFF_CONVENTION_PX + 'px (target was ' + res.target.mode + ')');
}

(async function () {
  const browser = await chromium.launch();
  for (const width of [1280, 360]) {
    let res = null;
    for (let n = 0; n < RELOADS && !res; n++) res = await attempt(browser, width);
    assert.ok(res, width + 'px: no cast in ' + RELOADS + ' loads contained an on-screen seat or rope figure');
    check(res);
  }
  console.log('08-flee-floor: PASS');
  await browser.close();
})();
