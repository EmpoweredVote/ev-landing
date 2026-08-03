// The hero beam crew walks along `.hero`'s BOTTOM edge, so the hero's bottom padding is the
// crew's headroom. The crew paints ~87px tall; when the padding is smaller than that they rise
// into the `.hero .meta-row` text above — and on a phone that row wraps to three lines, so
// their heads land on the "Open about money" link and obscure it.
//
// This asserts the crew's PAINTED pixels stay below the row's last line of text.
//
// Only the `carry` scene is checked, and deliberately so. The beam also runs two gags that
// reach much higher on purpose: `light` (146px) lofts a replacement bulb UP to the yellow
// swatch, which lives inside that very row, and `letters` (150px) carries the logo letters
// overhead. Asserting "no ink in the row" would forbid the light gag's entire point.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const WIDTHS = [320, 360, 480, 768, 1280];

(async function () {
  const browser = await chromium.launch();
  const failures = [];

  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: width, height: 900 } });
    await page.route('**/*', function (r) {
      return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
    });
    await page.goto(URL);
    await page.waitForFunction(function () { return !!window.__evFigDebug; });
    // the draw loop culls off-screen canvases, so an unscrolled hero paints nothing at all
    await page.evaluate(function () {
      document.querySelector('.hero .meta-row').scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    await page.waitForTimeout(600);

    const r = await page.evaluate(async function () {
      var beam = window.__evFigDebug.entries.filter(function (e) { return e.spec.mode === 'beam'; })[0];
      if (!beam) return { error: 'no beam in the cast' };
      var c = beam.c, g = c.getContext('2d');

      function inkTopCss() {
        var d = g.getImageData(0, 0, c.width, c.height).data;
        var minY = -1;
        for (var y = 0; y < c.height && minY < 0; y++) {
          for (var x = 0; x < c.width; x++) {
            if (d[(y * c.width + x) * 4 + 3] > 8) { minY = y; break; }
          }
        }
        if (minY < 0) return null;
        var q = c.getBoundingClientRect();
        return q.top + minY * (q.height / c.height);
      }

      var worst = null, carrySamples = 0;
      for (var i = 0; i < 60; i++) {
        await new Promise(function (res) { setTimeout(res, 100); });
        if ((beam.scene || 'carry') !== 'carry') continue;   // gags are allowed to reach up
        var t = inkTopCss();
        if (t == null) continue;
        carrySamples++;
        if (worst === null || t < worst) worst = t;
      }

      var items = [].slice.call(document.querySelectorAll('.hero .meta-row > *')).map(function (el) {
        var q = el.getBoundingClientRect();
        return { top: q.top, bottom: q.bottom };
      });
      var lastLineBottom = Math.max.apply(null, items.map(function (i) { return i.bottom; }));
      var hero = document.querySelector('.hero').getBoundingClientRect();

      // The other half of the coupling: runLightGag measures the yellow swatch relative to the
      // CANVAS TOP, so if the swatch sits above it the bulb gag lofts its box off-canvas and
      // silently stops working. Raising the hero's bottom padding pushes the swatch further
      // from the crew's floor, so the beam canvas has to stay tall enough to contain it.
      var q = beam.c.getBoundingClientRect();
      var swEl = document.querySelector('.hero .meta-row .swatch.s-yellow');
      var swTop = swEl ? swEl.getBoundingClientRect().top : null;

      return {
        carrySamples: carrySamples,
        highestInk: worst === null ? null : Math.round(worst),
        lastLineBottom: Math.round(lastLineBottom),
        clearance: Math.round(hero.bottom - lastLineBottom),
        gap: worst === null ? null : Math.round(worst - lastLineBottom),
        canvasTop: Math.round(q.top),
        swatchTop: swTop === null ? null : Math.round(swTop),
        swatchHeadroom: swTop === null ? null : Math.round(swTop - q.top)
      };
    });

    if (r.error) failures.push(width + 'px: ' + r.error);
    else if (!r.carrySamples) failures.push(width + 'px: never observed the carry scene');
    else {
      if (r.gap < 0) {
        failures.push(width + 'px: crew rises ' + (-r.gap) + 'px into the meta-row text ' +
          '(highest ink ' + r.highestInk + ' vs last text line bottom ' + r.lastLineBottom +
          ', hero reserves only ' + r.clearance + 'px)');
      }
      if (r.swatchTop !== null && r.swatchHeadroom < 8) {
        failures.push(width + 'px: the yellow swatch is ' + (-r.swatchHeadroom) +
          'px ABOVE the beam canvas top — the light-out gag would loft its box off-canvas ' +
          '(swatch ' + r.swatchTop + ', canvas top ' + r.canvasTop + '). Make the beam canvas taller.');
      }
    }
    await page.close();
  }

  assert.deepStrictEqual(failures, [],
    'beam crew overlaps the meta-row text:\n  ' + failures.join('\n  '));

  console.log('beam-clears-metarow: PASS (' + WIDTHS.join('/') + 'px)');
  await browser.close();
})();
