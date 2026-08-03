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
