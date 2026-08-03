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

  // participants should start moving toward an edge
  await page.waitForFunction(function () { return window.__evFigDebug.poof.phase === 'fleeing'; }, { timeout: 8000 });
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

(async function () {
  const browser = await chromium.launch();
  await run(browser, 1280);
  await run(browser, 360);   // narrow: also guards the overflow regression
  console.log('05-flee: PASS');
  await browser.close();
})();
