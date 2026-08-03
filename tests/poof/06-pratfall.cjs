const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  await page.waitForTimeout(1200);

  // record every flee sub-phase each figure passes through, plus a geometry invariant:
  // the ground he's drawn on (flFloor + yOff) must never fall outside his own canvas
  // (flFloor + yOff <= e.h). A stub that just flips e.fl strings with no regard for where
  // things actually render would sail through the phase-sequence assertions below, so this
  // is the check that catches a heap/limp drawn off-canvas (invisible) rather than on it.
  await page.evaluate(function () {
    var d = window.__evFigDebug;
    d.__seen = {};
    d.__geom = {};   // per-entry worst (largest) overshoot of ground past canvas bottom
    d.__ink = {};     // per-entry: did a nonzero-alpha pixel show up during 'heap'?
    d.__watch = setInterval(function () {
      d.entries.forEach(function (e, i) {
        if (!e.fl) return;
        d.__seen[i] = d.__seen[i] || [];
        var s = d.__seen[i];
        if (s[s.length - 1] !== e.fl) s.push(e.fl);

        var ground = e.flFloor + (e.flYOff || 0);
        var over = ground - e.h;
        if (!d.__geom[i] || over > d.__geom[i].over) {
          d.__geom[i] = { over: over, fl: e.fl, ground: ground, h: e.h };
        }

        // cheap pixel check: during 'heap', scan once for any drawn (non-transparent) pixel
        if (e.fl === 'heap' && !d.__ink[i]) {
          try {
            var img = e.ctx.getImageData(0, 0, e.c.width, e.c.height).data;
            var found = false;
            for (var p = 3; p < img.length; p += 4) { if (img[p] > 8) { found = true; break; } }
            d.__ink[i] = found;
          } catch (err) { /* leave unset if unreadable */ }
        }
      });
    }, 40);
    var e0 = d.entries.filter(function (x) { return x.spec.mode !== 'why' && x.w; })[0];
    e0.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    d.poof.victim = e0; d.poof.phase = 'holding'; d.poof.t = 2.9;
  });

  await page.waitForFunction(function () {
    return window.__evFigDebug.poof.phase === 'cleared';
  }, { timeout: 30000 });

  const { seen, geom, ink } = await page.evaluate(function () {
    clearInterval(window.__evFigDebug.__watch);
    var d = window.__evFigDebug;
    return {
      seen: Object.keys(d.__seen).map(function (k) { return d.__seen[k]; }),
      geom: d.__geom,
      ink: d.__ink
    };
  });

  assert.ok(seen.length > 0, 'no flee sequences recorded');

  // at least one figure should have run out of ledge and done the whole pratfall
  const full = seen.filter(function (s) {
    return s.indexOf('drop') >= 0 && s.indexOf('heap') >= 0 &&
           s.indexOf('getup') >= 0 && s.indexOf('limp') >= 0;
  });
  assert.ok(full.length > 0,
    'expected at least one drop>heap>getup>limp, saw: ' + JSON.stringify(seen));

  // and the order must be right wherever it happened
  full.forEach(function (s) {
    const idx = ['drop', 'heap', 'getup', 'limp'].map(function (k) { return s.indexOf(k); });
    for (let i = 1; i < idx.length; i++) {
      assert.ok(idx[i] > idx[i - 1], 'pratfall out of order: ' + s.join('>'));
    }
    assert.strictEqual(s[0], 'run', 'a pratfall must start from the run: ' + s.join('>'));
  });

  // every recorded sequence must be one of the two legal shapes
  seen.forEach(function (s) {
    const uniq = s.join('>');
    const legal = /^run$/.test(uniq) || /^run>drop>heap>getup>limp$/.test(uniq);
    assert.ok(legal, 'unexpected flee sequence: ' + uniq);
  });

  // geometry invariant: the ground drawn on must stay inside the figure's own canvas at every
  // sampled instant, across every sub-phase — this is what would have caught heap/limp drawing
  // 58px / 44px below the canvas's bottom edge (invisible) despite a perfectly-ordered e.fl trail.
  const EPS = 0.5; // px tolerance for float rounding, not for slack in the invariant itself
  Object.keys(geom).forEach(function (i) {
    const g = geom[i];
    assert.ok(g.over <= EPS,
      'entry ' + i + ' drew ' + g.over.toFixed(1) + 'px past its own canvas bottom during "' + g.fl +
      '" (ground ' + g.ground.toFixed(1) + ' vs canvas height ' + g.h + ')');
  });

  // cheap pixel corroboration: at least one figure that heaped left visible ink while heaped
  const heapedIdx = Object.keys(ink).filter(function (i) { return ink[i] != null; });
  if (heapedIdx.length) {
    const anyInk = heapedIdx.some(function (i) { return ink[i]; });
    assert.ok(anyInk, 'no visible pixels found on any canvas during "heap" — ' + JSON.stringify(ink));
  }

  console.log('06-pratfall: PASS (' + full.length + ' of ' + seen.length + ' took the fall; ' +
    'max ground overshoot ' + Math.max.apply(null, Object.keys(geom).map(function (i) { return geom[i].over; })).toFixed(1) + 'px)');
  await browser.close();
})();
