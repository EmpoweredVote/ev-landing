// A falling Bobit falls ALL the way to the next section-break rule below him — one of the page's
// full-bleed 1px lines — lands on it, and does his heap-getup-limp there.
//
// Before this, FLEE_DROP's flat 50px was anchored to nothing, so everyone who left his perch crumpled
// onto an invisible plane mid-section. The rope Bobit had it worst: his anchor rect is the video thumb
// BELOW his feet, so he ran its full width through empty air, dropped 50px, and pratfalled hundreds of
// px above the nearest real surface. He now throws his hands up and lets go.
//
// Two things here are easy to get silently wrong, so both are measured rather than assumed:
//
// 1. SCROLL-FOLLOW. Fleeing canvases are position:absolute in document coords, so scrolling carries
//    the runners and you can follow a faller down. They were briefly position:fixed (to kill an
//    h-scroll bug, now handled by refitFlee) and that froze them to the viewport. A regression to
//    fixed would leave every state assertion below green while making the fall unwatchable, so this
//    asserts the canvas is absolute AND that scrolling moves him on screen by the scroll amount.
//
// 2. THE MOBILE SPLIT. A fall only lands if it fits the viewport (flCanLand, FIT_SCREENS=0.85).
//    Desktop falls are 0.69-0.79 screens so they always land; phone falls are 1.36-1.80 screens
//    because .watch stacks to ~1,249px tall, so those exit off the bottom instead of playing ~6s of
//    unseen animation. This runs a desktop AND a phone viewport and asserts each takes its own path —
//    and fails if either path goes unexercised.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const RELOADS = 14;

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

// The break lines in DOCUMENT coords, measured from the DOM by this test rather than read back from
// the module, so a wrong selector list in the module cannot agree with itself and pass.
function measureLines() {
  var sy = window.scrollY;
  var ys = [];
  ['header.site-banner', 'header.hero', 'section.why', 'section.how', 'section.watch', 'footer']
    .forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return;
      var cs = getComputedStyle(el), r = el.getBoundingClientRect();
      if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') ys.push(r.top + sy);
      if (parseFloat(cs.borderBottomWidth) > 0 && cs.borderBottomStyle !== 'none') ys.push(r.bottom + sy);
    });
  ys.sort(function (a, b) { return a - b; });
  return ys.filter(function (y, i) { return i === 0 || y - ys[i - 1] > 2; });
}

async function attempt(browser, width, height) {
  const page = await browser.newPage({ viewport: { width: width, height: height } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  await page.waitForTimeout(1200);
  await page.evaluate(installInkProbe);

  // The rope Bobit is cast with chance(0.85), so reload until he is here AND on screen: offscreen
  // entries are culled at arm time and would never flee. Parked near the top of the viewport, which is
  // where a desktop fall has room to land in view.
  const target = await page.evaluate(function () {
    var d = window.__evFigDebug;
    for (var i = 0; i < d.entries.length; i++) {
      var e = d.entries[i];
      if (e.spec.mode === 'rope' && e.w) {
        e.c.scrollIntoView({ block: 'start', behavior: 'instant' });
        return i;
      }
    }
    return null;
  });
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

  const a = await page.evaluate(function (ti) {
    var d = window.__evFigDebug, e = d.entries[ti];
    if (e.gone || !e.c.parentNode) return null;
    return {
      lines: window.__measureLines(), fold: window.innerHeight, scrollY: window.scrollY,
      docH: document.documentElement.scrollHeight,
      consts: d.fleeConst,
      flAir: !!e.flAir, flCanLand: !!e.flCanLand, flFall: e.flFall, flDropSecs: e.flDropSecs,
      position: getComputedStyle(e.c).position,
      canvasH: e.h, canvasBottomDoc: e.flTopDoc + e.h,
      floorDoc: e.flTopDoc + e.flFloor,
      landDoc: e.flTopDoc + e.flFloor + e.flFall,
      ledgeW: e.flLedgeR - e.flLedgeL,
      others: d.entries.map(function (x, i) {
        if (i === ti || !x.fl || x.gone || !x.c.parentNode) return null;
        return { mode: x.spec.mode, flFall: x.flFall, canLand: !!x.flCanLand,
                 landDoc: x.flTopDoc + x.flFloor + x.flFall };
      }).filter(Boolean)
    };
  }, target);
  if (!a) { await page.close(); return null; }

  // SCROLL-FOLLOW: nudge the page and confirm he moved with it. A position:fixed canvas would not.
  // The rope Bobit sits near the document bottom, so scrolling DOWN often has no room — try down,
  // then up, and report which one actually moved so a no-op cannot pass as a success.
  const follow = await page.evaluate(function (ti) {
    var e = window.__evFigDebug.entries[ti];
    if (e.gone || !e.c.parentNode) return null;
    // The page sets `html { scroll-behavior: smooth }`, so a default scrollBy animates and scrollY
    // does not update synchronously — every reading came back unmoved and the probe proved nothing.
    var prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    var y0 = window.scrollY, out = { scrolled: 0, shift: 0 };
    for (var d = 0; d < 2; d++) {
      var delta = d === 0 ? 120 : -120;
      var top0 = e.c.getBoundingClientRect().top;
      window.scrollTo(0, y0 + delta);
      var moved = window.scrollY - y0;
      var shift = top0 - e.c.getBoundingClientRect().top;
      window.scrollTo(0, y0);
      if (Math.abs(moved) > 1) { out = { scrolled: moved, shift: shift }; break; }
    }
    document.documentElement.style.scrollBehavior = prev;
    return out;
  }, target);

  // Follow him frame by frame through to the end of his story.
  const seen = await page.evaluate(function (ti) {
    var d = window.__evFigDebug, e = d.entries[ti];
    var phases = [], lastGroundDoc = null, heapInkDoc = null;
    return new Promise(function (resolve) {
      var t0 = performance.now();
      (function step() {
        var alive = !e.gone && e.c.parentNode;
        if (alive && e.fl) {
          if (phases[phases.length - 1] !== e.fl) phases.push(e.fl);
          lastGroundDoc = e.flTopDoc + e.flFloor + (e.flYOff || 0);
          if (e.fl === 'heap' && heapInkDoc == null) {
            var ib = window.__inkBottom(e);
            if (ib >= 0) heapInkDoc = e.c.getBoundingClientRect().top + window.scrollY + ib;
          }
        }
        if (!alive || heapInkDoc != null || performance.now() - t0 > 9000) {
          return resolve({ phases: phases, lastGroundDoc: lastGroundDoc, heapInkDoc: heapInkDoc,
                           gone: !!e.gone, timedOut: performance.now() - t0 > 9000 });
        }
        requestAnimationFrame(step);
      })();
    });
  }, target);

  // Nothing may stall the exodus.
  const cleared = await page.evaluate(function () {
    return new Promise(function (resolve) {
      var t0 = performance.now();
      (function step() {
        if (window.__evFigDebug.poof.phase === 'cleared') return resolve(true);
        if (performance.now() - t0 > 25000) return resolve(false);
        requestAnimationFrame(step);
      })();
    });
  });

  // And the widened canvas must not have grown the page.
  const overflow = await page.evaluate(function () {
    return { scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth };
  });

  await page.close();
  return { width, height, a, follow, seen, cleared, overflow };
}

function nearestLine(lines, y) {
  return lines.reduce(function (b, l) { return (b == null || Math.abs(l - y) < Math.abs(b - y)) ? l : b; }, null);
}

function check(res) {
  const tag = res.width + 'x' + res.height;
  const a = res.a, lines = a.lines, phases = res.seen.phases;
  assert.ok(lines.length >= 3, tag + ': only found ' + lines.length + ' section-break lines, so there ' +
    'is nothing to land on and this test cannot measure anything. Selector list out of date?');

  // ── he is airborne and let go, and his target is a real line ─────────────────────────────────
  assert.strictEqual(a.flAir, true, tag + ': the rope Bobit is not flagged airborne, so he will try ' +
    'to run along his anchor rect — the video thumb BELOW his feet.');
  assert.ok(phases.indexOf('run') < 0,
    tag + ': entered "run" (phases: ' + phases.join(' -> ') + '). He is hanging in mid-air, so running ' +
    'means sprinting ' + Math.round(a.ledgeW) + 'px through empty space.');
  assert.ok(phases.indexOf('drop') >= 0, tag + ': never dropped (phases: ' + phases.join(' -> ') + ')');

  const line = nearestLine(lines, a.landDoc);
  assert.ok(Math.abs(line - a.landDoc) <= 2,
    tag + ': set to land at document y ' + a.landDoc.toFixed(1) + ', which is ' +
    (a.landDoc - line).toFixed(1) + 'px off the nearest section-break line (' + line.toFixed(1) +
    '). Lines: [' + lines.map(Math.round).join(', ') + ']');
  assert.ok(a.landDoc > a.floorDoc + 24,
    tag + ': falls only ' + (a.landDoc - a.floorDoc).toFixed(1) + 'px — he should drop to a line well ' +
    'below the thumbnail he hangs over.');

  const expect = Math.min(1.4, Math.sqrt(2 * a.flFall / a.consts.FALL_G));
  assert.ok(Math.abs(a.flDropSecs - expect) < 0.02,
    tag + ': a ' + a.flFall.toFixed(0) + 'px fall is timed at ' + a.flDropSecs.toFixed(3) + 's, expected ' +
    expect.toFixed(3) + 's from gravity');

  // ── scroll-follow: the whole point of not being position:fixed ────────────────────────────────
  assert.strictEqual(a.position, 'absolute',
    tag + ': the fleeing canvas is position:' + a.position + '. It must stay absolute in document ' +
    'coords or scrolling cannot follow a faller down to his line.');
  assert.ok(res.follow && Math.abs(res.follow.scrolled) > 1,
    tag + ': could not scroll the page in either direction, so scroll-follow was not actually tested');
  assert.ok(Math.abs(res.follow.shift - res.follow.scrolled) <= 2,
    tag + ': scrolled ' + res.follow.scrolled + 'px but the fleeing canvas moved ' +
    res.follow.shift.toFixed(1) + 'px on screen — it is not tracking the document, so you cannot ' +
    'follow him down.');

  // ── the fit rule, and the ending it selects ──────────────────────────────────────────────────
  const ratio = a.flFall / a.fold;
  const shouldLand = ratio <= a.consts.FIT_SCREENS;
  assert.strictEqual(a.flCanLand, shouldLand,
    tag + ': fall is ' + ratio.toFixed(2) + ' screen-heights and FIT_SCREENS is ' +
    a.consts.FIT_SCREENS + ', so flCanLand should be ' + shouldLand + ' but is ' + a.flCanLand);

  let summary;
  if (a.flCanLand) {
    // lands: assert the PIXELS are on the line
    assert.ok(phases.indexOf('heap') >= 0,
      tag + ': fall fits the viewport (' + ratio.toFixed(2) + ' screens) so he must land, but he never ' +
      'reached the heap (phases: ' + phases.join(' -> ') + ')');
    assert.ok(res.seen.heapInkDoc != null, tag + ': nothing painted in the heap frame');
    assert.ok(Math.abs(res.seen.heapInkDoc - line) <= 8,
      tag + ': lying with his lowest pixel at document y ' + res.seen.heapInkDoc.toFixed(1) + ', ' +
      (res.seen.heapInkDoc - line).toFixed(1) + 'px from the line he was supposed to land on (' +
      line.toFixed(1) + ')');
    summary = 'landed on the line at ' + Math.round(line) + ' (ink ' +
      (res.seen.heapInkDoc - line).toFixed(1) + 'px off)';
  } else {
    // does not fit: he must leave downward, never playing the unseen heap
    assert.ok(phases.indexOf('heap') < 0,
      tag + ': fall is ' + ratio.toFixed(2) + ' screen-heights, too tall to watch, but he still played ' +
      'the heap (phases: ' + phases.join(' -> ') + ') — that is ~6s of animation nobody sees, with ' +
      'poofTick waiting on him.');
    assert.ok(res.seen.gone,
      tag + ': fell past the fold but was never marked gone (phases: ' + phases.join(' -> ') +
      (res.seen.timedOut ? ', timed out' : '') + ')');
    assert.ok(res.seen.lastGroundDoc > a.scrollY + a.fold,
      tag + ': removed while his ground line was at document y ' + res.seen.lastGroundDoc.toFixed(1) +
      ', still above the fold (' + (a.scrollY + a.fold) + ') — he vanished on screen instead of ' +
      'falling out of it');
    summary = 'fall was ' + ratio.toFixed(2) + ' screens; exited the bottom at ' +
      res.seen.lastGroundDoc.toFixed(0) + ' (line was ' + Math.round(line) + ')';
  }

  // ── nothing stalls, nothing overflows, the page did not grow ──────────────────────────────────
  assert.ok(res.cleared, tag + ': the exodus never reached "cleared" — some figure is stuck, so the ' +
    'page sits there looking finished while poofTick waits on him');
  assert.ok(res.overflow.scrollW <= res.overflow.clientW,
    tag + ': a flee canvas gave the page horizontal scroll (scrollWidth ' + res.overflow.scrollW +
    ' > clientWidth ' + res.overflow.clientW + ')');
  assert.ok(a.canvasBottomDoc <= a.docH + 4,
    tag + ': the flee canvas ends at document y ' + a.canvasBottomDoc.toFixed(0) + ' but the document ' +
    'is only ' + a.docH + ' tall, so an absolute canvas is padding the page with empty scroll space');

  // fallback: anyone with no line below him keeps the flat FLEE_DROP
  let toLine = 0, flat = 0;
  a.others.forEach(function (o) {
    if (Math.abs(nearestLine(lines, o.landDoc) - o.landDoc) <= 2) { toLine++; return; }
    assert.strictEqual(o.flFall, a.consts.FLEE_DROP,
      tag + ': ' + o.mode + ' is set to fall ' + o.flFall + 'px to document y ' + o.landDoc.toFixed(1) +
      ', which is neither a break line nor the flat FLEE_DROP fallback');
    flat++;
  });

  console.log(tag + ': let go, fell ' + a.flFall.toFixed(0) + 'px in ' + a.flDropSecs.toFixed(2) + 's, ' +
    summary + '; phases ' + phases.join(' -> ') + '; scroll-follow ok; others: ' + toLine +
    ' to a line, ' + flat + ' on the FLEE_DROP fallback');
  return a.flCanLand;
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

  // one desktop and one phone: the fit rule must sort them differently on its own
  const VIEWPORTS = [[1280, 900], [390, 844]];
  let landed = 0, exited = 0;
  for (const [w, h] of VIEWPORTS) {
    let res = null;
    for (let n = 0; n < RELOADS && !res; n++) res = await attempt(browser, w, h);
    assert.ok(res, w + 'x' + h + ': no cast in ' + RELOADS + ' loads had the rope Bobit on screen');
    if (check(res)) landed++; else exited++;
  }

  // Neither ending may quietly go unexercised — an earlier version of this file passed while only
  // ever measuring one of them.
  assert.ok(landed > 0, 'no viewport produced a landing, so the heap/pixel assertions never ran');
  assert.ok(exited > 0, 'no viewport produced a too-tall fall, so the bottom-exit assertions never ran');
  console.log('10-flee-landing: PASS (' + landed + ' landed on a line, ' + exited + ' exited the bottom)');
  await browser.close();
})();
