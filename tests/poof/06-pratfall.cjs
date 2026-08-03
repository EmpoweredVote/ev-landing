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

  // record every flee sub-phase each figure passes through
  await page.evaluate(function () {
    var d = window.__evFigDebug;
    d.__seen = {};
    d.__watch = setInterval(function () {
      d.entries.forEach(function (e, i) {
        if (!e.fl) return;
        d.__seen[i] = d.__seen[i] || [];
        var s = d.__seen[i];
        if (s[s.length - 1] !== e.fl) s.push(e.fl);
      });
    }, 40);
    var e0 = d.entries.filter(function (x) { return x.spec.mode !== 'why' && x.w; })[0];
    e0.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    d.poof.victim = e0; d.poof.phase = 'holding'; d.poof.t = 2.9;
  });

  await page.waitForFunction(function () {
    return window.__evFigDebug.poof.phase === 'cleared';
  }, { timeout: 30000 });

  const seen = await page.evaluate(function () {
    clearInterval(window.__evFigDebug.__watch);
    return Object.keys(window.__evFigDebug.__seen)
      .map(function (k) { return window.__evFigDebug.__seen[k]; });
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

  console.log('06-pratfall: PASS (' + full.length + ' of ' + seen.length + ' took the fall)');
  await browser.close();
})();
