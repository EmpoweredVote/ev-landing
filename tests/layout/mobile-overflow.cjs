// The figure canvases are absolutely positioned in document coordinates. Any that is placed
// past the right edge — or is itself wider than the viewport — extends documentElement
// scrollWidth and gives the whole page a horizontal scrollbar on a phone.
//
// The cast is RANDOM per load, so a single pass proves very little: which figures land near a
// right edge changes every time. This reloads repeatedly at each width.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const WIDTHS = [320, 360, 390, 414, 768];
const RELOADS = 4;

(async function () {
  const browser = await chromium.launch();
  const failures = [];

  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: width, height: 900 } });
    await page.route('**/*', function (r) {
      return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
    });
    await page.goto(URL);

    for (let pass = 0; pass < RELOADS; pass++) {
      if (pass) await page.reload();          // fresh random cast (a hash change would not re-run)
      await page.waitForFunction(function () { return !!window.__evFigDebug; });
      await page.waitForTimeout(1400);        // let reposition() settle

      const r = await page.evaluate(function () {
        var vw = document.documentElement.clientWidth;
        var offenders = (window.__evFigDebug ? window.__evFigDebug.entries : [])
          .filter(function (e) {
            var q = e.c.getBoundingClientRect();
            return q.right > vw + 0.5;
          })
          .map(function (e) {
            var q = e.c.getBoundingClientRect();
            return e.spec.mode + '(x=' + e.spec.x + ',w=' + Math.round(q.width) +
                   ') right=' + Math.round(q.right);
          });
        return {
          scrollW: document.documentElement.scrollWidth,
          inner: window.innerWidth,
          clientW: vw,
          offenders: offenders
        };
      });

      if (r.scrollW > r.clientW) {
        failures.push(width + 'px pass ' + pass + ': scrollWidth ' + r.scrollW +
          ' > ' + r.clientW + '  [' + r.offenders.join('; ') + ']');
      }
      if (r.offenders.length) {
        failures.push(width + 'px pass ' + pass + ': canvas past the right edge — ' +
          r.offenders.join('; '));
      }
    }
    await page.close();
  }

  assert.deepStrictEqual(failures, [],
    'horizontal overflow found:\n  ' + failures.join('\n  '));

  console.log('mobile-overflow: PASS (' + WIDTHS.join('/') + 'px, ' + RELOADS + ' casts each)');
  await browser.close();
})();
