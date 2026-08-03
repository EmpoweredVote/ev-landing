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
  // scroll everything into view at least once so scene machines have initialised
  await page.evaluate(async function () {
    for (var y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y); await new Promise(function (r) { setTimeout(r, 100); });
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);

  // freeze the page in the stunned phase and sample twice
  const r = await page.evaluate(async function () {
    var d = window.__evFigDebug;
    var others = d.entries.filter(function (e) { return e.spec.mode !== 'why' && !e.gone; });
    // hold the phase there for the duration of the measurement
    d.poof.victim = others[0];
    d.poof.phase = 'stunned'; d.poof.t = 0;
    var hold = setInterval(function () { d.poof.phase = 'stunned'; d.poof.t = 0; }, 50);

    function snap() {
      return others.map(function (e) {
        return [e.lt, e.qsT, e.cwT, e.dfT, e.ktT, e.yoT, e.rl, e.phT]
          .map(function (v) { return v == null ? '-' : (typeof v === 'number' ? v.toFixed(4) : v); })
          .join(',');
      }).join('|');
    }
    var a = snap();
    await new Promise(function (res) { setTimeout(res, 700); });
    var b = snap();
    clearInterval(hold);
    return { same: a === b, a: a.slice(0, 200), b: b.slice(0, 200), n: others.length };
  });

  assert.ok(r.n > 0, 'no figures to test');
  assert.ok(r.same,
    'stunned figures must not advance ANY clock — gait or scene.\n  before: ' + r.a + '\n  after:  ' + r.b);

  // ── reader-specific proof: e.qsT is a scene-machine timer, separate from the gait clock
  // (e.lt). It only advances while the reader is scrolled on-screen — at scroll (0,0) most
  // scene figures sit behind tick()'s own "skip offscreen canvases" early-return, which
  // freezes their scene timers regardless of the stun. That means the check above, sampled
  // at scroll (0,0), cannot actually prove the scene-timer half of the freeze — a gait-only
  // implementation (extending just the `e.lt += dt * (...)` gate) would pass it too. This
  // block scrolls a reader on-screen and proves all three legs: it ticks normally (control,
  // so a frozen-forever reader can't pass step 2 vacuously), freezes while stunned, and
  // resumes once the stun ends.
  const readerProof = await page.evaluate(async function () {
    var d = window.__evFigDebug;
    var reader = d.entries.filter(function (e) {
      return e.spec.mode === 'seat' && e.spec.anim === 'read' && !e.spec.phone && !e.gone;
    })[0];
    if (!reader) return { found: false };
    reader.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    await new Promise(function (res) { setTimeout(res, 300); });

    // Step 1 (control): idle, qsT must be advancing at all.
    d.poof.phase = 'idle'; d.poof.t = 0;
    var c1 = reader.qsT;
    await new Promise(function (res) { setTimeout(res, 400); });
    var c2 = reader.qsT;

    // Step 2: hold the phase stunned for the duration of the measurement.
    d.poof.phase = 'stunned'; d.poof.t = 0;
    var hold = setInterval(function () { d.poof.phase = 'stunned'; d.poof.t = 0; }, 50);
    var s1 = reader.qsT;
    await new Promise(function (res) { setTimeout(res, 700); });
    var s2 = reader.qsT;
    clearInterval(hold);

    // Step 3: back to idle, qsT must resume advancing.
    d.poof.phase = 'idle'; d.poof.t = 0;
    var r1 = reader.qsT;
    await new Promise(function (res) { setTimeout(res, 400); });
    var r2 = reader.qsT;

    return {
      found: true,
      controlAdvanced: c2 > c1, c1: c1, c2: c2,
      frozen: s1 === s2, s1: s1, s2: s2,
      resumedAdvanced: r2 > r1, r1: r1, r2: r2
    };
  });

  assert.ok(readerProof.found, 'no quote reader in cast to prove the scene-timer freeze with');
  assert.ok(readerProof.controlAdvanced,
    'control: reader qsT must be advancing while idle (c1=' + readerProof.c1 + ' c2=' + readerProof.c2 + ')');
  assert.ok(readerProof.frozen,
    'reader qsT (scene timer) must not advance while stunned (s1=' + readerProof.s1 + ' s2=' + readerProof.s2 + ')');
  assert.ok(readerProof.resumedAdvanced,
    'reader qsT must resume advancing once the stun is over (r1=' + readerProof.r1 + ' r2=' + readerProof.r2 + ')');

  // and they resume afterwards
  const resumed = await page.evaluate(async function () {
    var d = window.__evFigDebug;
    d.poof.phase = 'idle'; d.poof.t = 0;
    var e = d.entries.filter(function (x) { return x.spec.mode !== 'why' && !x.gone; })[0];
    e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    await new Promise(function (res) { setTimeout(res, 300); });
    var before = e.lt;
    await new Promise(function (res) { setTimeout(res, 500); });
    return e.lt > before;
  });
  assert.ok(resumed, 'clocks must resume once the stun is over');

  console.log('04-stun: PASS');
  await browser.close();
})();
