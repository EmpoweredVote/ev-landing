const { chromium } = require('playwright');

(async function () {
  const browser = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.route('**/*', function (r) {
      return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
    });
    await page.addInitScript(function (t) { localStorage.setItem('ev:color-scheme', t); }, theme);
    await page.goto('file:///C:/ev-landing/ev-landing-main/index.html#figdebug');
    await page.waitForFunction(function () { return !!window.__evFigDebug; });

    // instant scroll: index.html sets scroll-behavior:smooth, which would leave the rect stale
    await page.evaluate(function () {
      var e = window.__evFigDebug.entries.filter(function (x) {
        return x.spec.mode === 'seat' && x.spec.quote;
      })[0];
      e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    await page.waitForTimeout(300);
    const box = await page.evaluate(function () {
      var e = window.__evFigDebug.entries.filter(function (x) {
        return x.spec.mode === 'seat' && x.spec.quote;
      })[0];
      var r = e.c.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height - 82, who: e.spec.quote.who };
    });
    await page.mouse.click(box.x, box.y);
    await page.waitForSelector('.ev-quote.in');
    await page.waitForTimeout(700);
    // move the pointer off him so the bubble isn't shown in its held state
    await page.mouse.move(10, 10);
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'screenshots/quote-bubble-' + theme + '.png' });
    console.log('wrote screenshots/quote-bubble-' + theme + '.png (' + box.who + ')');
    await page.close();
  }
  await browser.close();
})();
