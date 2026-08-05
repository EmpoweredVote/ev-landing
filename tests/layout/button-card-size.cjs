// The Fallacy Finders button the beam crew carries is the REAL showcase button, measured live off
// `.showcase-logos .logo-trigger` — but only where that measurement means something.
//
// Measured button boxes, which is why this is not a single hardcoded size:
//     >=1025px  340 x 102        768px  560 x 178
//       1024px  390 x  90        480px  440 x 202
//                                 360px  320 x 250
//
// At <=900px the button goes full width and renders its `.m-desc` description INLINE, so it
// measures 178-250px tall. That height belongs to a paragraph of body text the carried prop does not
// have; copying it would hand the crew a near-square empty slab taller than their whole 240px
// canvas. Below 901px the desktop 340:102 shape is used instead.
//
// The card is never scaled to fit the hero content — being the same size as the buttons in the list
// is the gag. The one permitted scale is the viewport-width guard, and it is uniform so the button's
// proportions survive it.
//
// Needs Playwright, which is not a repo dependency:
//   NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" \
//     node tests/layout/button-card-size.cjs
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const WIDTHS = [320, 360, 480, 768, 1024, 1280, 1600];
const DESKTOP_RATIO = 340 / 102;

(async function () {
  const browser = await chromium.launch();
  const failures = [];
  const seen = [];

  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: width, height: 900 } });
    await page.route('**/*', function (r) {
      return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
    });
    await page.goto(URL);
    await page.waitForFunction(function () { return !!window.__evFigDebug; });
    // the beam entry needs a layout pass before e.w is meaningful
    await page.waitForFunction(function () {
      var b = window.__evFigDebug.entries.filter(function (e) { return e.spec.mode === 'beam'; })[0];
      return !!(b && b.w > 0);
    });

    const r = await page.evaluate(function () {
      var d = window.__evFigDebug;
      if (typeof d.buttonCardSize !== 'function') return { missing: true };
      var beam = d.entries.filter(function (e) { return e.spec.mode === 'beam'; })[0];
      var btn = document.querySelector('.showcase-logos .logo-trigger').getBoundingClientRect();
      return {
        card: d.buttonCardSize(beam, beam.w),
        button: { w: Math.round(btn.width), h: Math.round(btn.height) },
        canvasW: beam.w,
        innerW: window.innerWidth
      };
    });

    if (r.missing) {
      failures.push(width + 'px: __evFigDebug.buttonCardSize is not exposed');
      await page.close();
      continue;
    }

    const c = r.card, wide = r.innerW >= 901, cap = r.canvasW - 20;
    seen.push(width + 'px card ' + Math.round(c.w) + 'x' + Math.round(c.h) +
      ' (button ' + r.button.w + 'x' + r.button.h + ')');

    if (!(c.w > 0 && c.h > 0)) {
      failures.push(width + 'px: card has no size (' + c.w + 'x' + c.h + ')');
      await page.close();
      continue;
    }
    if (c.w > cap + 0.5) {
      failures.push(width + 'px: card ' + Math.round(c.w) + 'px wide exceeds the viewport guard ' + cap);
    }

    if (wide) {
      // exactly the button, because at these widths the button is a logo-only lockup
      if (Math.abs(c.w - r.button.w) > 1.5 || Math.abs(c.h - r.button.h) > 1.5) {
        failures.push(width + 'px: card ' + Math.round(c.w) + 'x' + Math.round(c.h) +
          ' should equal the measured button ' + r.button.w + 'x' + r.button.h);
      }
    } else {
      // the desktop shape, NOT the tall mobile text card
      const ratio = c.w / c.h;
      if (Math.abs(ratio - DESKTOP_RATIO) > 0.05) {
        failures.push(width + 'px: card ratio ' + ratio.toFixed(3) + ' should be the desktop ' +
          DESKTOP_RATIO.toFixed(3) + ' (card ' + Math.round(c.w) + 'x' + Math.round(c.h) + ')');
      }
      if (c.h > 120) {
        failures.push(width + 'px: card is ' + Math.round(c.h) + 'px tall — it copied the mobile ' +
          'text card (' + r.button.w + 'x' + r.button.h + ') instead of the desktop shape');
      }
      // and it must not have quietly become the mobile button's size either
      if (Math.abs(c.h - r.button.h) < 2 && r.button.h > 130) {
        failures.push(width + 'px: card height ' + Math.round(c.h) + ' matches the mobile button ' +
          'height ' + r.button.h + ' — the <=900px branch is not being taken');
      }
    }
    await page.close();
  }

  console.log(seen.join('\n'));
  assert.deepStrictEqual(failures, [], 'button card sizing:\n  ' + failures.join('\n  '));
  console.log('button-card-size: PASS (' + WIDTHS.join('/') + 'px)');
  await browser.close();
})();
