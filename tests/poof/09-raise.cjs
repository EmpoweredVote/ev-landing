// The hands go up BEFORE the legs go.
//
// Asserting the sub-phase string alone would pass for a 'raise' that renders identically to the
// run, so this measures the ink: across the raise his feet must stay put on his floor and his
// silhouette must open out (arms leaving his sides), with flX frozen the whole time — and only
// then may he start covering ground.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const RAISE_SECS = 0.45;   // must match ev-figures.js

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  await page.waitForTimeout(1200);

  // Sample one on-screen figure densely through his whole flee. Only one, because reading pixels
  // for the entire cast every 30ms starves the animation we are trying to measure.
  const started = await page.evaluate(function () {
    var d = window.__evFigDebug;
    var ti = d.entries.findIndex(function (e) { return e.w && e.spec.mode !== 'why'; });
    var e = d.entries[ti];
    e.c.scrollIntoView({ block: 'center', behavior: 'instant' });

    d.__s = [];
    d.__watch = setInterval(function () {
      if (!e.fl || e.gone || !e.c.parentNode) return;
      var box = null;
      try {
        var sw = e.c.width, sh = e.c.height, ratio = sh / e.h, rx = sw / e.w;
        var img = e.ctx.getImageData(0, 0, sw, sh).data;
        var minX = -1, maxX = -1, minY = -1, maxY = -1;
        for (var yy = 0; yy < sh; yy++) {
          var rb = yy * sw * 4;
          for (var xx = 0; xx < sw; xx++) {
            if (img[rb + xx * 4 + 3] > 8) {
              if (minY < 0) minY = yy;
              maxY = yy;
              if (minX < 0 || xx < minX) minX = xx;
              if (xx > maxX) maxX = xx;
            }
          }
        }
        if (minY >= 0) box = { top: minY / ratio, bottom: maxY / ratio, w: (maxX - minX) / rx };
      } catch (err) { /* leave box null */ }
      d.__s.push({ fl: e.fl, t: e.flT, x: e.flX, dir: e.flDir, floor: e.flFloor, box: box });
    }, 30);

    var v = d.entries.filter(function (x, i) { return i !== ti && x.spec.mode !== 'why' && x.w; })[0];
    if (!v) return false;
    d.poof.victim = v; d.poof.phase = 'holding'; d.poof.t = 2.9;
    return true;
  });
  assert.ok(started, 'could not arm the poof: no second on-screen figure to use as the victim');

  await page.waitForFunction(function () {
    var d = window.__evFigDebug;
    return d.poof.phase === 'cleared' || d.__s.some(function (s) { return s.fl === 'limp'; });
  }, { timeout: 30000 });

  const s = await page.evaluate(function () {
    clearInterval(window.__evFigDebug.__watch);
    return window.__evFigDebug.__s;
  });
  await browser.close();

  assert.ok(s.length > 0, 'no flee samples recorded');
  const raise = s.filter(function (x) { return x.fl === 'raise'; });
  // 'run' or 'hlimp': this test is about the hands-up beat and the hand-off OUT of it, not about which
  // gait follows. Since the stunned drop landed, a Bobit whose own load came down on his foot raises
  // with everybody else and then limps instead of running — and the watched entry is entries[0], the
  // beam crew, who is carrying the heaviest thing on the page and so is usually exactly that Bobit.
  const moving = s.filter(function (x) { return x.fl === 'run' || x.fl === 'hlimp'; });

  assert.strictEqual(s[0].fl, 'raise', 'the flee must open with the raise, saw ' + s[0].fl);
  assert.ok(raise.length >= 3, 'only ' + raise.length + ' raise samples — too short to be a beat');
  assert.ok(moving.length > 0, 'the raise never handed off to a run or a limp');

  // hands up ON THE SPOT: not one pixel of ground covered while the arms come up
  const x0 = raise[0].x;
  raise.forEach(function (r) {
    assert.ok(Math.abs(r.x - x0) <= 1,
      'he moved ' + (r.x - x0).toFixed(1) + 'px during the raise (t=' + r.t.toFixed(2) +
      ') — the raise is meant to be a standing beat, not a running one');
  });

  // ...and his feet stay on the floor he raised them from
  const withBox = raise.filter(function (r) { return r.box; });
  assert.ok(withBox.length >= 3, 'could not read pixels for the raise (' + withBox.length + ' readable samples)');
  withBox.forEach(function (r) {
    assert.ok(Math.abs(r.box.bottom - (r.floor + 3)) <= 5,
      'his lowest ink sat at ' + r.box.bottom.toFixed(1) + ' during the raise, but his floor is ' +
      r.floor.toFixed(1) + ' (the shadow puts the expected bottom ~3px under it) — he left the ground');
  });

  // ...and the arms actually come up: a standstill silhouette has both arms down along the body,
  // so the ink box has to open out measurably by the peak. This is the check that a 'raise' which
  // renders identically to a standstill, or straight into the run pose, cannot pass.
  const wStart = withBox[0].box.w;
  const wMax = Math.max.apply(null, withBox.map(function (r) { return r.box.w; }));
  assert.ok(wMax - wStart >= 8,
    'his silhouette only widened ' + (wMax - wStart).toFixed(1) + 'px across the raise (from ' +
    wStart.toFixed(1) + 'px) — the arms are not going up');

  // the raise has to be a beat the eye can catch, and then end
  const last = raise[raise.length - 1].t;
  assert.ok(last >= RAISE_SECS * 0.6 && last <= RAISE_SECS * 1.5,
    'the raise ran ' + last.toFixed(2) + 's, expected about ' + RAISE_SECS + 's');

  // and only after it does he start covering ground
  const advanced = moving.some(function (r) { return (r.x - x0) * r.dir > 4; });
  assert.ok(advanced, 'he never advanced toward his edge once he started moving');

  console.log('09-raise: PASS (raise ' + last.toFixed(2) + 's, ' + raise.length +
    ' samples, silhouette +' + (wMax - wStart).toFixed(1) + 'px, then ran)');
})();
