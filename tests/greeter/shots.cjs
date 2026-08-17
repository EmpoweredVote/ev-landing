// Screenshots of the greeting. The assertions in 01-03 measure state and geometry; none of
// them can tell you it LOOKS right, and on this feature that is where every real defect has
// been found. Writes screenshots/greeter-<theme>-<width>-<phase>.png.
const { chromium } = require('playwright');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#greeter';   // #greeter ignores "seen before"

(async function () {
  const browser = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width: width, height: 900 } });
      await page.route('**/*', function (r) {
        return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
      });
      await page.addInitScript(function (t) {
        try { localStorage.setItem('ev:color-scheme', t); } catch (e) {}
        document.addEventListener('DOMContentLoaded', function () {
          document.documentElement.style.scrollBehavior = 'auto';
        });
      }, theme);
      await page.goto(URL);
      await page.waitForFunction(function () { return !!window.__evFigDebug; });
      await page.waitForTimeout(400);

      for (let i = 0; i < 80; i++) {
        const at = await page.evaluate(function () {
          var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
          var top = e.c.getBoundingClientRect().top, ih = window.innerHeight;
          var btn = document.querySelector('.showcase-logos').getBoundingClientRect().bottom;
          return top > 70 && top + e.h < ih - 8 && btn > ih * 0.45 && window.scrollY >= 60;
        });
        if (at) break;
        await page.evaluate(function () { window.scrollBy(0, 40); });
        await page.waitForTimeout(40);
      }

      const tag = 'greeter-' + theme + '-' + width;
      await page.waitForFunction(function () {
        var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
        return e.gi === 'wave';
      }, { timeout: 6000 });
      await page.waitForTimeout(1000);   // mid-wave
      await page.screenshot({ path: 'screenshots/' + tag + '-wave.png' });

      await page.waitForSelector('.ev-quote.in', { timeout: 6000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/' + tag + '-point.png' });
      console.log('wrote screenshots/' + tag + '-{wave,point}.png');
      await page.close();
    }
  }
  await browser.close();
})();
