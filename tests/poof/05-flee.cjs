const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

async function run(browser, width) {
  const page = await browser.newPage({ viewport: { width: width, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  await page.waitForTimeout(1200);

  // trigger from the phase machine directly; input is covered by task 02
  await page.evaluate(function () {
    var d = window.__evFigDebug;
    var e = d.entries.filter(function (x) { return x.spec.mode !== 'why' && x.w; })[0];
    e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    d.poof.victim = e; d.poof.phase = 'holding'; d.poof.t = 2.9;
  });

  // capture pre-arm geometry for any patrol figures while 'stunned' has their dt frozen at 0 —
  // this is exactly the position poofArmFlee should hand to drawFlee. Patrol walks off-centre
  // (figX = pad + tri*span), so if poofArmFlee ever falls back to canvas-centre (cr.left + e.w/2)
  // for a mode that doesn't draw centred, this diverges from where he actually starts running.
  await page.waitForFunction(function () { return window.__evFigDebug.poof.phase === 'stunned'; }, { timeout: 6000 });
  const patrolPre = await page.evaluate(function () {
    var d = window.__evFigDebug;
    return d.entries.map(function (e, i) {
      if (e.spec.mode !== 'patrol' || e.gone || !e.w) return null;
      var r = e.c.getBoundingClientRect();
      var pad = 70, span = e.w - pad * 2;
      var figX = pad + (e._tri || 0) * span;
      return { i: i, screenX: r.left + figX };
    }).filter(function (x) { return x; });
  });

  // participants should start moving toward an edge
  await page.waitForFunction(function () { return window.__evFigDebug.poof.phase === 'fleeing'; }, { timeout: 8000 });

  if (patrolPre.length) {
    const patrolPost = await page.evaluate(function (idxs) {
      var d = window.__evFigDebug;
      return idxs.map(function (i) {
        var e = d.entries[i];
        if (e.flX == null) return null;
        var r = e.c.getBoundingClientRect();
        return { screenX: r.left + e.flX };
      });
    }, patrolPre.map(function (p) { return p.i; }));
    patrolPre.forEach(function (pre, k) {
      var post = patrolPost[k];
      if (!post) return;   // culled the instant he was armed (offscreen) — nothing to compare
      assert.ok(Math.abs(post.screenX - pre.screenX) < 20,
        width + 'px: patrol entry ' + pre.i + ' flee start x (' + post.screenX +
        ') does not match his frozen pre-arm position (' + pre.screenX +
        ') — figScreenX likely fell back to canvas-centre instead of scanning ink');
    });
  } else {
    console.log(width + 'px: no patrol entries in this cast — finding-1 pixel-scan check skipped this run');
  }

  // They stand still with their hands up for RAISE_SECS before a single step, so sampling from the
  // instant of arming would measure the raise, not the run.
  await page.waitForFunction(function () {
    return window.__evFigDebug.entries.some(function (e) { return e.fl === 'run' && !e.gone; });
  }, { timeout: 4000 });

  const moving = await page.evaluate(async function () {
    var d = window.__evFigDebug;
    function xs() {
      return d.entries.filter(function (e) { return e.spec.mode !== 'why' && !e.gone && e.flX != null; })
        .map(function (e) { return { x: e.flX, dir: e.flDir }; });
    }
    var a = xs();
    await new Promise(function (r) { setTimeout(r, 500); });
    var b = xs();
    var advanced = 0;
    for (var i = 0; i < Math.min(a.length, b.length); i++) {
      if ((b[i].x - a[i].x) * b[i].dir > 4) advanced++;
    }
    return { n: a.length, advanced: advanced };
  });
  assert.ok(moving.n > 0, width + 'px: nobody entered the flee');
  assert.ok(moving.advanced > 0, width + 'px: fleeing figures must move toward their edge');

  // no horizontal page scroll while the widened canvases are live
  const overflow = await page.evaluate(function () {
    return { scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth };
  });
  assert.ok(overflow.scrollW <= overflow.clientW,
    width + 'px: the widened flee canvases caused horizontal scroll (' +
    overflow.scrollW + ' > ' + overflow.clientW + ')');

  // everyone leaves; only the why figures remain
  await page.waitForFunction(function () {
    return window.__evFigDebug.poof.phase === 'cleared';
  }, { timeout: 20000 });

  const end = await page.evaluate(function () {
    var d = window.__evFigDebug;
    var left = d.entries.filter(function (e) { return !e.gone && e.c.parentNode; });
    return {
      remainingModes: left.map(function (e) { return e.spec.mode; }).sort(),
      whyStillThere: d.entries.filter(function (e) { return e.spec.mode === 'why' && e.c.parentNode; }).length
    };
  });
  assert.deepStrictEqual([...new Set(end.remainingModes)], ['why'],
    width + 'px: only the why figures may remain, found ' + end.remainingModes.join(','));
  assert.strictEqual(end.whyStillThere, 3, width + 'px: all three why illustrations must stay');

  await page.close();
}

// A resize mid-flee must not reset the widened flee canvas back to its at-rest geometry.
// reposition() runs on window 'resize' AND on a 700ms interval; both must skip entries with e.fl.
async function runResize(browser) {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  await page.waitForTimeout(1200);

  await page.evaluate(function () {
    var d = window.__evFigDebug;
    var e = d.entries.filter(function (x) { return x.spec.mode !== 'why' && x.w; })[0];
    e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    d.poof.victim = e; d.poof.phase = 'holding'; d.poof.t = 2.9;
  });

  await page.waitForFunction(function () { return window.__evFigDebug.poof.phase === 'fleeing'; }, { timeout: 8000 });
  // wait until at least one figure is actually mid-flee (armed + running), not just at the instant of arming
  await page.waitForFunction(function () {
    return window.__evFigDebug.entries.some(function (e) { return e.fl === 'run' && !e.gone; });
  }, { timeout: 4000 });

  // Only test entries with enough runway left that they cannot legitimately finish within the
  // ~150ms resize-settle window (at FLEE_SPEED=190px/s that's <30px) — so any 'gone' seen after
  // the resize is unambiguously the bug (canvas snapped back to at-rest width, flX now reads as
  // past its edge) and not a coincidental on-time finish.
  const before = await page.evaluate(function () {
    return window.__evFigDebug.entries
      .map(function (e, i) {
        if (!e.fl || e.gone) return null;
        var dist = e.flDir < 0 ? (e.flX + 60) : (e.w + 60 - e.flX);
        var r = e.c.getBoundingClientRect();
        return { i: i, fl: e.fl, w: e.w, dist: dist, screenX: r.left + e.flX };
      })
      .filter(function (x) { return x && x.dist > 60; });
  });
  assert.ok(before.length > 0, 'resize mid-flee: nobody had enough runway left to test the resize against');

  // A shrink mid-exodus must not hand the page a horizontal scrollbar. Avoiding horizontal page
  // scroll is a hard constraint (the bug fixed on 2026-08-02) and a phone rotating landscape ->
  // portrait mid-flee is the real trigger.
  //
  // HOW that is achieved changed on 2026-08-04. These canvases used to go position:fixed while
  // fleeing, so an over-wide one contributed nothing to the document and reposition() could skip
  // them entirely — this test asserted the width was UNCHANGED across the resize. Fixed also meant
  // scrolling no longer carried the runners, which made a fall to a section rule below the fold
  // impossible to watch. They are position:absolute in document coords again, and refitFlee()
  // re-clamps width and left on resize instead. So the width is now expected to CHANGE on a shrink;
  // what must not change is his position on screen, or his sub-phase, or his existence.
  //
  // Two shrinks, because one cannot test both halves. A hard shrink to 360 crops runners out of the
  // viewport entirely — at which point being removed is CORRECT, not a bug (measured: a runner at
  // screen x 718 in a 900px viewport is genuinely off-screen once it is 500px wide), so it cannot
  // also prove nobody vanished spuriously. So: first a gentle shrink that still contains every
  // runner, which is where survival and the no-jump rebase are asserted; then the hard one, which is
  // purely about overflow and finishing.
  const gentleW = Math.max(420, Math.ceil(Math.max.apply(null, before.map(function (b) { return b.screenX; })) + 100));
  await page.setViewportSize({ width: gentleW, height: 900 });
  await page.waitForTimeout(150);

  const shrunk = await page.evaluate(function () {
    return { scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth };
  });
  assert.ok(shrunk.scrollW <= shrunk.clientW,
    'resize mid-flee: shrinking the viewport to ' + gentleW + ' gave the page horizontal scroll ' +
    '(scrollWidth ' + shrunk.scrollW + ' > clientWidth ' + shrunk.clientW + ')');

  const after = await page.evaluate(function (idxs) {
    var d = window.__evFigDebug;
    return idxs.map(function (i) {
      var e = d.entries[i];
      var r = e.c.parentNode ? e.c.getBoundingClientRect() : null;
      return {
        fl: e.fl, gone: e.gone, w: e.w,
        pos: getComputedStyle(e.c).position,
        // his x on screen: canvas viewport-left plus his canvas-local x
        screenX: r ? r.left + e.flX : null
      };
    });
  }, before.map(function (b) { return b.i; }));

  before.forEach(function (b, k) {
    var a = after[k];
    assert.ok(!a.gone,
      'resize mid-flee: entry ' + b.i + ' vanished right after the resize (canvas reset to w=' +
      a.w + ', was ' + b.w + ') instead of continuing to run');
    assert.strictEqual(a.fl, b.fl,
      'resize mid-flee: entry ' + b.i + ' lost its flee sub-phase across the resize');
    assert.strictEqual(a.pos, 'absolute',
      'resize mid-flee: entry ' + b.i + ' is position:' + a.pos + ', not absolute — a fleeing canvas ' +
      'must stay in document coords so scrolling can follow a faller down to his line');
    assert.ok(a.w <= shrunk.clientW,
      'resize mid-flee: entry ' + b.i + ' canvas is ' + a.w + 'px wide in a ' + shrunk.clientW +
      'px viewport — refitFlee() did not re-clamp it, which is what gives the page h-scroll');
    // refitFlee rebases flX by the same delta it moves the canvas, so he must not jump. He is also
    // still running, so allow a frame or two of real travel on top.
    assert.ok(a.screenX != null && Math.abs(a.screenX - b.screenX) <= 40,
      'resize mid-flee: entry ' + b.i + ' jumped from screen x ' + b.screenX.toFixed(1) + ' to ' +
      a.screenX.toFixed(1) + ' across the resize — refitFlee() moved the canvas without rebasing flX');
  });

  // Now the hard one: a phone-width rotation. Runners cropped out of the viewport may legitimately be
  // removed here, so this half asserts only the overflow guarantee — and that the exodus still ends.
  await page.setViewportSize({ width: 360, height: 900 });
  await page.waitForTimeout(150);
  const hard = await page.evaluate(function () {
    return {
      scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
      widest: window.__evFigDebug.entries.reduce(function (m, e) {
        return (e.fl && !e.gone && e.c.parentNode) ? Math.max(m, e.w) : m;
      }, 0)
    };
  });
  assert.ok(hard.scrollW <= hard.clientW,
    'resize mid-flee: a 360px rotation gave the page horizontal scroll (scrollWidth ' + hard.scrollW +
    ' > clientWidth ' + hard.clientW + '), widest live flee canvas ' + hard.widest + 'px');

  // the run must still finish despite two mid-flight resizes
  await page.waitForFunction(function () {
    return window.__evFigDebug.poof.phase === 'cleared';
  }, { timeout: 20000 });

  const end = await page.evaluate(function () {
    var d = window.__evFigDebug;
    var left = d.entries.filter(function (e) { return !e.gone && e.c.parentNode; });
    return {
      remainingModes: left.map(function (e) { return e.spec.mode; }).sort(),
      whyStillThere: d.entries.filter(function (e) { return e.spec.mode === 'why' && e.c.parentNode; }).length
    };
  });
  assert.deepStrictEqual([...new Set(end.remainingModes)], ['why'],
    'resize mid-flee: only the why figures may remain, found ' + end.remainingModes.join(','));
  assert.strictEqual(end.whyStillThere, 3, 'resize mid-flee: all three why illustrations must stay');

  await page.close();
}

(async function () {
  const browser = await chromium.launch();
  await run(browser, 1280);
  await run(browser, 360);   // narrow: also guards the overflow regression
  await runResize(browser);  // guards against a mid-flee window resize resetting the canvas
  console.log('05-flee: PASS');
  await browser.close();
})();
