const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

// alpha coverage of the smoke overlay.
// NOTE: pass this as a FUNCTION to page.evaluate, never as a template-literal string.
// Playwright eval's a string expression raw and does not invoke it with args, so the string
// form silently returns the function object instead of the pixel count. (Task 1 hit this.)
function smokeCoverage() {
  var c = window.__evFigDebug.poofOverlay();
  var g = c.getContext('2d');
  var d = g.getImageData(0, 0, c.width, c.height).data;
  var n = 0;
  for (var i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
  return n;
}

// alpha-weighted centre of the overlay's ink, in CSS px. Coverage alone says nothing about
// WHERE the cloud is: the first version of this suite counted alpha pixels and happily passed
// while the smoke gathered at the victim's canvas-rect centre, hundreds of px of blank page
// away from the figure the user was actually holding.
function smokeCentroid() {
  var c = window.__evFigDebug.poofOverlay();
  var g = c.getContext('2d');
  var d = g.getImageData(0, 0, c.width, c.height).data;
  var sx = 0, sy = 0, wsum = 0;
  for (var y = 0; y < c.height; y++) {
    var row = y * c.width;
    for (var x = 0; x < c.width; x++) {
      var a = d[(row + x) * 4 + 3];
      if (a > 8) { sx += x * a; sy += y * a; wsum += a; }
    }
  }
  if (!wsum) return null;
  var dpr = c.width / (c.__w || c.width);
  return { x: sx / wsum / dpr, y: sy / wsum / dpr };
}

async function load(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  await page.waitForTimeout(1200);
  return page;
}

// Start a real right-press on the painted ink of a figure who is NOT drawn at his canvas centre,
// and report where the press landed. Only the canvas-centred modes (stand, seat) were ever served
// by the old rect-centre anchor; patrol, cartwheel, kite, paddlepair, yoyo and dogfetch all draw
// off-centre, which is what put the cloud 55-592px from the figure being held.
//
// The press target must be at least `minOffset` px from his canvas centre or this check could not
// fail on the bug: a patrol who happens to be strolling past his own canvas centre at press time
// would satisfy both anchors. So candidates are tried in turn and the press is only fired once
// that precondition holds AT PRESS TIME. Measurement and mousedown happen in the SAME tick,
// because a walking figure drifts out from under the point across an await.
async function pressOffCentre(page, minOffset) {
  // The draw loop culls canvases outside the viewport, so a figure that has never been on screen
  // has never been painted and has no ink to find. Scroll him in, let a few frames land, and only
  // then measure. Modes listed worst-offender first.
  const idxs = await page.evaluate(function () {
    var pref = ['cartwheel', 'patrol', 'kite', 'dogfetch', 'yoyo', 'paddlepair', 'beam', 'rope', 'vclimb'];
    var out = [];
    pref.forEach(function (m) {
      window.__evFigDebug.entries.forEach(function (e, i) {
        if (e.spec.mode === m && e.w) out.push(i);
      });
    });
    return out;
  });

  for (const idx of idxs) {
    await page.evaluate(function (i) {
      window.__evFigDebug.entries[i].c.scrollIntoView({ block: 'center', behavior: 'instant' });
    }, idx);
    await page.waitForTimeout(400);
    const hit = await pressOnInkAt(page, idx, minOffset);
    if (hit) return hit;
  }
  return null;
}

async function pressOnInkAt(page, idx, minOffset) {
  return page.evaluate(function (args) {
    var idx = args[0], minOffset = args[1];
    var es = [window.__evFigDebug.entries[idx]];
    for (var i = 0; i < es.length; i++) {
      var e = es[i];
      var r = e.c.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      var d;
      try { d = e.ctx.getImageData(0, 0, e.c.width, e.c.height).data; } catch (err) { continue; }
      var kx = e.c.width / r.width, ky = e.c.height / r.height;
      var ix = 0, iy = 0, n = 0, x, y;
      for (y = 0; y < e.c.height; y++) {
        for (x = 0; x < e.c.width; x++) {
          if (d[(y * e.c.width + x) * 4 + 3] > 8) { ix += x; iy += y; n++; }
        }
      }
      if (!n) continue;
      var px = r.left + (ix / n) / kx, py = r.top + (iy / n) / ky;
      if (!window.__evFigDebug.bobitAt(px, py)) {     // centroid fell in a gap between limbs
        var hit = null;
        for (y = 0; y < e.c.height && !hit; y++) {
          for (x = 0; x < e.c.width; x++) {
            if (d[(y * e.c.width + x) * 4 + 3] > 8) { hit = { x: r.left + x / kx, y: r.top + y / ky }; break; }
          }
        }
        if (!hit) continue;
        px = hit.x; py = hit.y;
      }
      var rectCentreX = r.left + r.width / 2;
      if (Math.abs(px - rectCentreX) < minOffset) continue;   // too near his canvas centre to be a real guard
      (document.elementFromPoint(px, py) || document.body).dispatchEvent(
        new MouseEvent('mousedown', { button: 2, buttons: 2, clientX: px, clientY: py, bubbles: true }));
      return { x: px, y: py, mode: e.spec.mode, rectCentreX: rectCentreX, rectFootY: r.bottom - 8 };
    }
    return null;
  }, [idx, minOffset]);
}

// The smoke must gather on the figure the user grabbed. Regression guard for the rect-centre
// anchor: `stand`/`seat` draw at their canvas centre, but patrol, cartwheel, kite, paddlepair,
// yoyo and dogfetch do not, so the cloud built over blank page for most of the cast.
//
// The cast is re-randomized on every page load, and on roughly one load in three none of the
// non-centred modes happen to be sitting >=150px from their own canvas centre (measured:
// dogfetch 18px, paddlepair 53px, beam 51px, rope 58px — all short of the gate). That is a
// property of the random cast, not of the code being tested, so a miss is retried against a
// fresh load rather than failing the run: reloading redraws a new random cast, and a patrol
// walker in particular will be at a different point in his stroll each time. The 150px gate
// itself is never loosened — that's what guarantees a qualifying candidate would actually have
// tripped the old rect-centre bug.
async function centroidRun(browser) {
  const MIN_OFFSET = 150;
  const MAX_LOAD_ATTEMPTS = 8;
  let page = null, p = null;
  for (let attempt = 1; attempt <= MAX_LOAD_ATTEMPTS && !p; attempt++) {
    page = await load(browser);
    p = await pressOffCentre(page, MIN_OFFSET);
    if (!p) {
      console.log('   centroid check: load ' + attempt + '/' + MAX_LOAD_ATTEMPTS +
        ' had nobody painted >= ' + MIN_OFFSET + 'px off his own canvas centre — reloading for a fresh cast');
      await page.close();
      page = null;
    }
  }
  assert.ok(p, 'no painted off-centre Bobit found for the smoke-anchor check after ' + MAX_LOAD_ATTEMPTS +
    ' reloads (needed one at least ' + MIN_OFFSET + 'px from his canvas centre)');
  assert.strictEqual(await page.evaluate(function () { return window.__evFigDebug.poof.phase; }), 'holding',
    'the right-press must have started a hold');

  await page.waitForTimeout(1200);
  const cen = await page.evaluate(smokeCentroid);
  assert.ok(cen, 'the hold must have painted smoke');
  const dist = Math.hypot(cen.x - p.x, cen.y - p.y);
  const oldDist = Math.hypot(p.rectCentreX - p.x, p.rectFootY - p.y);
  console.log('   smoke centroid ' + dist.toFixed(0) + 'px from the press point on ' + p.mode +
    ' (the old rect-centre anchor sat ' + oldDist.toFixed(0) + 'px away)');
  assert.ok(dist < 60,
    'the smoke must gather where the Bobit was grabbed, not at his canvas rect centre — the ' +
    'painted centroid is ' + dist.toFixed(0) + 'px from the press point');
  await page.close();
}

// spec #11: an open quote bubble is closed by the poof.
async function quoteRun(browser) {
  const page = await load(browser);
  const box = await page.evaluate(function () {
    var e = window.__evFigDebug.entries.filter(function (x) { return x.spec.mode === 'seat' && x.spec.quote; })[0];
    if (!e) return null;
    e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    var r = e.c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height - 42 - 40 };   // the seat line, on his body
  });
  assert.ok(box, 'no quote-carrying reader in this cast to open a bubble with');
  await page.waitForTimeout(250);
  await page.mouse.click(box.x, box.y);
  await page.waitForSelector('.ev-quote', { timeout: 3000 });

  await page.evaluate(function () {
    var d = window.__evFigDebug;
    var e = d.entries.filter(function (x) { return x.spec.mode !== 'why' && x.w && !x.gone; })[0];
    d.poof.victim = e; d.poof.phase = 'holding'; d.poof.t = 2.9;
  });
  await page.waitForFunction(function () {
    var ph = window.__evFigDebug.poof.phase;
    return ph !== 'holding' && ph !== 'idle';
  }, { timeout: 5000 });
  await page.waitForTimeout(700);   // close() removes the element 260ms after the fade starts

  const after = await page.evaluate(function () {
    return {
      bubbles: document.querySelectorAll('.ev-quote').length,
      handles: window.__evFigDebug.entries.filter(function (e) { return e.qh; }).length
    };
  });
  assert.strictEqual(after.bubbles, 0, 'the poof must close any open quote bubble');
  assert.strictEqual(after.handles, 0,
    'the poof must not leave a dangling quote handle on a reader (e.qh/e.qs must be reset too)');
  await page.close();
}

(async function () {
  const browser = await chromium.launch();
  const page = await load(browser);

  // pick a visible Bobit and start a hold on him directly (input is covered by 02)
  const ok = await page.evaluate(function () {
    var e = window.__evFigDebug.entries.filter(function (x) {
      return x.spec.mode !== 'why' && x.w;
    })[0];
    e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    return !!e;
  });
  assert.ok(ok);
  await page.waitForTimeout(400);

  const before = await page.evaluate(smokeCoverage);
  assert.strictEqual(before, 0, 'no smoke before a hold starts');

  await page.evaluate(function () {
    var d = window.__evFigDebug;
    var e = d.entries.filter(function (x) { return x.spec.mode !== 'why' && x.w; })[0];
    d.poof.phase = 'holding'; d.poof.t = 0; d.poof.victim = e;
  });

  await page.waitForTimeout(900);
  const early = await page.evaluate(smokeCoverage);
  await page.waitForTimeout(1400);
  const later = await page.evaluate(smokeCoverage);
  assert.ok(early > 0, 'smoke should be visible early in the hold');
  assert.ok(later > early * 1.4,
    'smoke must thicken over the hold (' + early + ' -> ' + later + ')');

  // let it complete: the burst should be bigger still, then clear away
  await page.waitForFunction(function () { return window.__evFigDebug.poof.phase !== 'holding'; }, { timeout: 4000 });
  const burst = await page.evaluate(smokeCoverage);
  assert.ok(burst > later, 'the burst must be larger than the build-up (' + later + ' -> ' + burst + ')');

  // the victim is gone
  await page.waitForFunction(function () {
    var p = window.__evFigDebug.poof;
    return p.phase === 'stunned' || p.phase === 'fleeing' || p.phase === 'cleared';
  }, { timeout: 4000 });
  const victimGone = await page.evaluate(function () {
    var v = window.__evFigDebug.poof.victim;
    return { removed: !v || !v.c.parentNode || v.gone === true };
  });
  assert.ok(victimGone.removed, 'the victim must be removed once the cloud clears');

  // and the smoke eventually clears
  await page.waitForTimeout(1200);
  assert.strictEqual(await page.evaluate(smokeCoverage), 0, 'smoke must clear after the burst');
  await page.close();

  await centroidRun(browser);
  await quoteRun(browser);

  console.log('03-smoke-overlay: PASS');
  await browser.close();
})();
