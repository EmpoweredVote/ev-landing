// A falling Bobit must land ON a section-break line — one of the page's full-bleed 1px rules — or, if
// that line is below the bottom of the screen, plummet past it and be gone.
//
// Before this, `FLEE_DROP` was a flat 50px anchored to nothing: every runner who left his perch
// crumpled onto an invisible plane mid-section. The rope Bobit had it worst — his anchor rect is the
// video thumb BELOW his feet, so he ran its full width on nothing, dropped 50px, and pratfalled
// hundreds of px above the nearest real surface.
//
// Which of the two outcomes you get is decided by SCROLL POSITION, so this test forces both rather
// than taking whichever the cast happens to hand it: park the rope Bobit near the top of the viewport
// and his line is on screen; centre him and it is below the fold.
//
// Like 08-flee-floor, this asserts PIXELS as well as state, because state is what stayed green through
// all four of this feature's geometry defects. Scenario A checks the ink he paints lying in the heap is
// on a line the test located independently from the DOM. Scenario B checks he leaves DOWNWARD and never
// plays the heap at all — an invisible pratfall would also leave poofTick waiting on him, so both
// scenarios then assert the exodus actually reaches 'cleared'.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const RELOADS = 12;
const GONE_BELOW_FOLD = 96;   // must match ev-figures.js

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

// The break lines, measured from the DOM by this test rather than read back from the module, so a
// wrong selector list in the module cannot agree with itself and pass.
function measureLines() {
  var ys = [];
  ['header.site-banner', 'header.hero', 'section.why', 'section.how', 'section.watch', 'footer']
    .forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return;
      var cs = getComputedStyle(el), r = el.getBoundingClientRect();
      if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') ys.push(r.top);
      if (parseFloat(cs.borderBottomWidth) > 0 && cs.borderBottomStyle !== 'none') ys.push(r.bottom);
    });
  ys.sort(function (a, b) { return a - b; });
  return ys.filter(function (y, i) { return i === 0 || y - ys[i - 1] > 2; });
}

// `place` = where in the viewport to park the rope Bobit: 'start' puts his landing line on screen,
// 'center' puts it below the fold.
async function attempt(browser, width, place) {
  const page = await browser.newPage({ viewport: { width: width, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  await page.waitForTimeout(1200);
  await page.evaluate(installInkProbe);

  // The rope Bobit is cast with chance(0.85), so reload until he is here AND on screen: offscreen
  // entries are culled at arm time and would never flee.
  const target = await page.evaluate(function (pl) {
    var d = window.__evFigDebug;
    for (var i = 0; i < d.entries.length; i++) {
      var e = d.entries[i];
      if (e.spec.mode === 'rope' && e.w) {
        e.c.scrollIntoView({ block: pl, behavior: 'instant' });
        return i;
      }
    }
    return null;
  }, place);
  if (target == null) { await page.close(); return null; }

  await page.waitForTimeout(400);   // let him redraw where the scroll put him

  // Poof somebody ELSE so the rope Bobit survives the burst and actually flees.
  const armed = await page.evaluate(function (ti) {
    var d = window.__evFigDebug;
    var v = d.entries.filter(function (e, i) { return i !== ti && e.spec.mode !== 'why' && e.w; })[0];
    if (!v) return false;
    d.poof.victim = v; d.poof.phase = 'holding'; d.poof.t = 2.9;
    return true;
  }, target);
  if (!armed) { await page.close(); return null; }

  await page.waitForFunction(function () { return window.__evFigDebug.poof.phase === 'fleeing'; }, { timeout: 8000 });

  // Arm-time geometry plus an independent line measurement, in the same frame.
  const a = await page.evaluate(function (ti) {
    var d = window.__evFigDebug, e = d.entries[ti];
    if (e.gone || !e.c.parentNode) return null;
    var r = e.c.getBoundingClientRect();
    return {
      lines: window.__measureLines(), fold: window.innerHeight,
      flAir: !!e.flAir, flFall: e.flFall, flDropSecs: e.flDropSecs,
      floorVY: r.top + e.flFloor,
      landVY: r.top + e.flFloor + e.flFall,
      ledgeW: e.flLedgeR - e.flLedgeL,   // how far he WOULD have run on nothing
      others: d.entries.map(function (x, i) {
        if (i === ti || !x.fl || x.gone || !x.c.parentNode) return null;
        var xr = x.c.getBoundingClientRect();
        return { mode: x.spec.mode, flFall: x.flFall, landVY: xr.top + x.flFloor + x.flFall };
      }).filter(Boolean)
    };
  }, target);
  if (!a) { await page.close(); return null; }

  // Follow him frame by frame: every phase he enters, and — for the plummet case — the last ground
  // line he was drawn at before being removed. Both have to be observed, not inferred from one sample.
  const seen = await page.evaluate(function (ti) {
    var d = window.__evFigDebug, e = d.entries[ti], phases = [], lastGroundVY = null, heapInkVY = null;
    return new Promise(function (resolve) {
      var t0 = performance.now();
      (function step() {
        var alive = !e.gone && e.c.parentNode;
        if (alive && e.fl) {
          if (phases[phases.length - 1] !== e.fl) phases.push(e.fl);
          lastGroundVY = e.flTopVY + e.flFloor + (e.flYOff || 0);
          // grab the pixels the FIRST time he is lying down, before he starts getting up
          if (e.fl === 'heap' && heapInkVY == null) {
            var ib = window.__inkBottom(e);
            if (ib >= 0) heapInkVY = e.c.getBoundingClientRect().top + ib;
          }
        }
        if (!alive || heapInkVY != null || performance.now() - t0 > 8000) {
          return resolve({
            phases: phases, lastGroundVY: lastGroundVY, heapInkVY: heapInkVY,
            gone: !!e.gone, timedOut: performance.now() - t0 > 8000
          });
        }
        requestAnimationFrame(step);
      })();
    });
  }, target);

  // Nothing may stall the exodus: the page has to finish clearing.
  const cleared = await page.evaluate(function () {
    return new Promise(function (resolve) {
      var t0 = performance.now();
      (function step() {
        if (window.__evFigDebug.poof.phase === 'cleared') return resolve(true);
        if (performance.now() - t0 > 20000) return resolve(false);
        requestAnimationFrame(step);
      })();
    });
  });

  await page.close();
  return { width: width, place: place, a: a, seen: seen, cleared: cleared };
}

function nearestLine(lines, y) {
  return lines.reduce(function (best, l) {
    return (best == null || Math.abs(l - y) < Math.abs(best - y)) ? l : best;
  }, null);
}

function check(res) {
  const tag = res.width + 'px/' + res.place;
  const a = res.a, lines = a.lines, phases = res.seen.phases;
  assert.ok(lines.length >= 3, tag + ': only found ' + lines.length + ' section-break lines, so there ' +
    'is nothing to land on and this test cannot measure anything. Selector list out of date?');

  // ── shared: he is airborne, he let go, and his target is a real line ──────────────────────────
  assert.strictEqual(a.flAir, true, tag + ': the rope Bobit is not flagged airborne, so he will try ' +
    'to run along his anchor rect — the video thumb BELOW his feet.');
  assert.ok(phases.indexOf('run') < 0,
    tag + ': the rope Bobit entered "run" (phases: ' + phases.join(' -> ') + '). He is hanging in ' +
    'mid-air, so running means sprinting ' + Math.round(a.ledgeW) + 'px through empty space.');
  assert.ok(phases.indexOf('drop') >= 0,
    tag + ': the rope Bobit never dropped (phases: ' + phases.join(' -> ') + ')');

  const line = nearestLine(lines, a.landVY);
  assert.ok(Math.abs(line - a.landVY) <= 2,
    tag + ': set to land at viewport y ' + a.landVY.toFixed(1) + ', which is ' +
    (a.landVY - line).toFixed(1) + 'px off the nearest section-break line (' + line.toFixed(1) +
    '). Lines: [' + lines.map(function (l) { return Math.round(l); }).join(', ') + ']');
  assert.ok(a.landVY > a.floorVY + 24,
    tag + ': falls only ' + (a.landVY - a.floorVY).toFixed(1) + 'px — he should be dropping to a line ' +
    'well below the thumbnail he hangs over.');

  // the fall is timed off the distance, not the old flat 0.45s
  const expect = Math.min(1.4, Math.sqrt(2 * a.flFall / 1100));
  assert.ok(Math.abs(a.flDropSecs - expect) < 0.02,
    tag + ': a ' + a.flFall.toFixed(0) + 'px fall is timed at ' + a.flDropSecs.toFixed(3) +
    's, expected ' + expect.toFixed(3) + 's from gravity');

  // ── the two outcomes ─────────────────────────────────────────────────────────────────────────
  const onScreen = a.landVY <= a.fold - 8;
  let summary;

  if (onScreen) {
    // A: he lands where you can see it, so assert the PIXELS are on the line.
    assert.ok(phases.indexOf('heap') >= 0,
      tag + ': his line is on screen at ' + Math.round(line) + ' (fold ' + a.fold + ') but he never ' +
      'reached the heap (phases: ' + phases.join(' -> ') + '), so no landing was painted');
    assert.ok(res.seen.heapInkVY != null, tag + ': nothing painted in the heap frame');
    // drawFlee lays a shadow ellipse (ry ~2.4px) on the floor and the heap pose lies across it.
    assert.ok(Math.abs(res.seen.heapInkVY - line) <= 8,
      tag + ': lying with his lowest pixel at viewport y ' + res.seen.heapInkVY.toFixed(1) + ', ' +
      (res.seen.heapInkVY - line).toFixed(1) + 'px from the line he was supposed to land on (' +
      line.toFixed(1) + ')');
    summary = 'landed on the line at ' + Math.round(line) + ' (ink ' +
      (res.seen.heapInkVY - line).toFixed(1) + 'px off)';
  } else {
    // B: his line is below the fold, so he must leave DOWNWARD mid-fall — no unseen pratfall.
    assert.ok(phases.indexOf('heap') < 0,
      tag + ': his line is at ' + Math.round(line) + ', below the fold (' + a.fold + '), but he still ' +
      'played the heap (phases: ' + phases.join(' -> ') + ') — that pratfall happens off-screen and ' +
      'holds up the whole exodus while poofTick waits on him.');
    assert.ok(res.seen.gone,
      tag + ': fell past the fold but was never marked gone (phases: ' + phases.join(' -> ') +
      (res.seen.timedOut ? ', timed out' : '') + ')');
    assert.ok(res.seen.lastGroundVY > a.fold,
      tag + ': removed while his ground line was still at ' + res.seen.lastGroundVY.toFixed(1) +
      ', above the fold (' + a.fold + ') — he vanished on screen instead of falling out of it');
    assert.ok(res.seen.lastGroundVY <= a.fold + GONE_BELOW_FOLD + 40,
      tag + ': kept falling to ' + res.seen.lastGroundVY.toFixed(1) + ', well past the fold (' +
      a.fold + ') + GONE_BELOW_FOLD — he is being drawn far below the screen for no reason');
    summary = 'plummeted past the fold (' + a.fold + ') toward the line at ' + Math.round(line) +
      ', gone at ' + res.seen.lastGroundVY.toFixed(0);
  }

  // ── and nothing stalls ───────────────────────────────────────────────────────────────────────
  assert.ok(res.cleared, tag + ': the exodus never reached "cleared" — some figure is stuck, so the ' +
    'page sits there looking finished while poofTick waits on him');

  // fallback: anyone with no line below him keeps the flat 50px
  let toLine = 0, flat = 0;
  a.others.forEach(function (o) {
    if (Math.abs(nearestLine(lines, o.landVY) - o.landVY) <= 2) { toLine++; return; }
    assert.strictEqual(o.flFall, 50,
      tag + ': ' + o.mode + ' is set to fall ' + o.flFall + 'px to viewport y ' + o.landVY.toFixed(1) +
      ', which is neither a break line nor the flat FLEE_DROP fallback');
    flat++;
  });

  console.log(tag + ': let go, fell ' + a.flFall.toFixed(0) + 'px in ' + a.flDropSecs.toFixed(2) +
    's, ' + summary + '; phases ' + phases.join(' -> ') + '; others: ' + toLine + ' to a line, ' +
    flat + ' on the FLEE_DROP fallback');
}

(async function () {
  const browser = await chromium.launch();
  const origNewPage = browser.newPage.bind(browser);
  browser.newPage = async function (opts) {
    const p = await origNewPage(opts);
    await p.addInitScript(measureLines.toString().replace('function measureLines',
      'window.__measureLines = function'));
    return p;
  };

  let sawLanding = 0, sawPlummet = 0;
  for (const width of [1280, 360]) {
    for (const place of ['start', 'center']) {
      let res = null;
      for (let n = 0; n < RELOADS && !res; n++) res = await attempt(browser, width, place);
      assert.ok(res, width + 'px/' + place + ': no cast in ' + RELOADS + ' loads had the rope Bobit on screen');
      check(res);
      if (res.a.landVY <= res.a.fold - 8) sawLanding++; else sawPlummet++;
    }
  }

  // Neither branch may quietly go unexercised — that is how the first version of this test passed
  // while only ever measuring the plummet.
  assert.ok(sawLanding > 0, 'no run put the landing line on screen, so the heap/pixel assertions ' +
    'never ran. Scroll placement no longer produces an on-screen landing.');
  assert.ok(sawPlummet > 0, 'no run put the landing line below the fold, so the plummet assertions ' +
    'never ran.');
  console.log('10-flee-landing: PASS (' + sawLanding + ' landed on screen, ' + sawPlummet + ' plummeted)');
  await browser.close();
})();
