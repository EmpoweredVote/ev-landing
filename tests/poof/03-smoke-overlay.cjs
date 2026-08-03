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

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  await page.waitForTimeout(1200);

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

  console.log('03-smoke-overlay: PASS');
  await browser.close();
})();
