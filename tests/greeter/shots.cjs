// Screenshots of the greeting. The assertions in 01-03 measure state and geometry; none of
// them can tell you it LOOKS right, and on this feature that is where every real defect has
// been found. Writes screenshots/greeter-<theme>-<width>-<phase>.png.
const { chromium } = require('playwright');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html?evlines=first-visit,guest#greeter';   // #greeter ignores "seen this visit"

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
      await page.waitForTimeout(1000);   // mid-wave, with beat 1 up
      await page.screenshot({ path: 'screenshots/' + tag + '-wave.png' });

      // Arm on the buttons, beat 1 still up. Waits for the STATE rather than sleeping:
      // this used to be waitForSelector('.ev-quote.in') + 500ms, which resolved instantly
      // because the wave shot had already opened the bubble, so what it caught was a
      // timing accident. Now that a second bubble follows, an accident would catch the
      // wrong one.
      await page.waitForFunction(function () {
        var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
        return e.gi === 'hold' && e.giBeat === 1;
      }, { timeout: 6000 });
      await page.screenshot({ path: 'screenshots/' + tag + '-point.png' });

      // ...and the nudge that replaces it at GREET_SAY2_AT. A fixed wait here is what
      // makes screenshot suites flake under load, so wait for the beat itself.
      await page.waitForFunction(function () {
        var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
        return e.giBeat === 2;
      }, { timeout: 8000 });
      await page.waitForTimeout(400);    // let the fade finish
      await page.screenshot({ path: 'screenshots/' + tag + '-nudge.png' });
      console.log('wrote screenshots/' + tag + '-{wave,point,nudge}.png');
      await page.close();
    }
  }
  await browser.close();
})();
