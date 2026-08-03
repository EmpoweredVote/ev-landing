const { chromium } = require('playwright');

(async function () {
  const browser = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.route('**/*', function (r) {
      return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
    });
    await page.addInitScript(function (t) { localStorage.setItem('ev:color-scheme', t); }, theme);
    await page.goto('file:///C:/ev-landing/ev-landing-main/index.html#figdebug');
    await page.waitForFunction(function () { return !!window.__evFigDebug; });
    await page.waitForTimeout(1200);
    await page.evaluate(function () {
      var d = window.__evFigDebug;
      var e = d.entries.filter(function (x) { return x.spec.mode !== 'why' && x.w; })[0];
      e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
      d.poof.victim = e; d.poof.phase = 'holding'; d.poof.t = 2.2;
    });
    for (const [ms, label] of [[500, 'smoke'], [900, 'burst'], [1600, 'stunned'], [2400, 'fleeing'], [4200, 'pratfall']]) {
      await page.waitForTimeout(ms === 500 ? 500 : 700);
      await page.screenshot({ path: 'screenshots/poof-' + theme + '-' + label + '.png' });
      console.log('wrote screenshots/poof-' + theme + '-' + label + '.png');
    }
    await page.close();
  }
  await browser.close();
})();
