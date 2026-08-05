// The hero beam crew walks along `.hero`'s BOTTOM edge, so the hero's bottom padding is the
// crew's headroom. The crew paints ~87px tall; when the padding is smaller than that they rise
// into the `.hero .meta-row` text above — and on a phone that row wraps to three lines, so
// their heads land on the "Open about money" link and obscure it.
//
// This asserts the crew's PAINTED pixels stay below the row's last line of text.
//
// The FIGURES are held to that hard line. Three scenes deliberately reach higher and are excluded
// from the ink check: `light` (146px) lofts a replacement bulb UP to the yellow swatch, which lives
// inside that very row; `letters` (150px) carries the logo letters overhead; and the `button` load
// carries the real showcase button, which at full size against 93px of headroom cannot help covering
// part of the row. Asserting "no ink in the row" would forbid the light gag's entire point.
//
// The button is not simply exempted, though -- that would drop the coverage this test exists for.
// The figures keep the original assertion (sampled with an ordinary load up) and the CARD gets its
// own two bounds: it may never rise past the row into the tool list, and never exceed a measured
// overlap budget.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const WIDTHS = [320, 360, 480, 768, 1280];
// How much of the meta-row the carried Fallacy Finders button may cover. It is the real showcase
// button at full size and the crew only has 93px of headroom, so covering part of this row is the
// designed behaviour, not a bug. Measured: 41px at >=901px (where the row is one 25px line and is
// fully covered either way) and 27px at <=900px (where it wraps to three lines and the hold is kept
// low deliberately). The budget is the design claim -- if this trips, the hold height or the card
// size changed, and raising the number is the wrong fix.
const CARD_OVERLAP_BUDGET = 48;

(async function () {
  const browser = await chromium.launch();
  const failures = [];
  const observed = [];

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

      // Two phases, and the loads are PINNED for each rather than waited for. The rotation puts a
      // given load up roughly one pass in three and a pass is ~30-50s, so an unpinned 6s window
      // sampled whichever load it happened to catch: the first run of this against the button load
      // flagged only 2 of the 5 widths, purely by luck of the draw.
      function pin(load) {
        beam.scene = 'carry'; beam.load = load; beam.dwell = 0;
        beam.greet = 0; beam.wF = beam.wB = false; beam.dF = beam.dB = 0; beam._pickup = 0;
        beam.bx = beam.w * 0.5;    // mid-screen, so a turn cannot fire mid-window
      }

      // Phase 1 — the FIGURES. Original assertion, unchanged in meaning: with an ordinary load up,
      // the crew's own painted ink must stay below the row. This is the coverage the test exists for.
      var worst = null, carrySamples = 0;
      pin('line');
      for (var i = 0; i < 30; i++) {
        await new Promise(function (res) { setTimeout(res, 100); });
        pin('line');
        if ((beam.scene || 'carry') !== 'carry') continue;   // gags are allowed to reach up
        var t = inkTopCss();
        if (t == null) continue;
        carrySamples++;
        if (worst === null || t < worst) worst = t;
      }

      // Phase 2 — the CARD. The button load is a third deliberate reach-up alongside light and
      // letters: it is the real showcase button at full size against 93px of headroom, so it covers
      // part of this row on the way past. Intentional, see
      // docs/superpowers/specs/2026-08-05-fallacy-finders-tease-design.md.
      //
      // So the card is not measured by canvas ink — that would just re-flag the designed overlap.
      // It is bounded on its own terms below, from its reported rect.
      var cardTop = null, cardW = null, cardH = null, buttonSamples = 0;
      pin('button');
      for (var k = 0; k < 20; k++) {
        await new Promise(function (res) { setTimeout(res, 100); });
        pin('button');
        if (!beam._cardRect) continue;
        buttonSamples++;
        var qq = c.getBoundingClientRect();
        var tCss = qq.top + beam._cardRect.y * (qq.height / beam.h);
        if (cardTop === null || tCss < cardTop) cardTop = tCss;
        cardW = Math.round(beam._cardRect.w); cardH = Math.round(beam._cardRect.h);
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

      var metaTop = Math.min.apply(null, items.map(function (i) { return i.top; }));
      var showcase = document.querySelector('.showcase');

      return {
        carrySamples: carrySamples,
        highestInk: worst === null ? null : Math.round(worst),
        lastLineBottom: Math.round(lastLineBottom),
        metaTop: Math.round(metaTop),
        clearance: Math.round(hero.bottom - lastLineBottom),
        gap: worst === null ? null : Math.round(worst - lastLineBottom),
        canvasTop: Math.round(q.top),
        swatchTop: swTop === null ? null : Math.round(swTop),
        swatchHeadroom: swTop === null ? null : Math.round(swTop - q.top),
        buttonSamples: buttonSamples,
        cardTop: cardTop === null ? null : Math.round(cardTop),
        cardOverlap: cardTop === null ? null : Math.round(lastLineBottom - cardTop),
        cardW: cardW, cardH: cardH,
        showcaseBottom: showcase ? Math.round(showcase.getBoundingClientRect().bottom) : null
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

      // ── the carried button, bounded on its own terms ──
      // It is allowed to cover this row. It is NOT allowed to grow until it covers the tool list
      // above, and it is not allowed to creep past the budget the design claims. A failure here
      // means the hold height or the card size is wrong — do NOT raise the budget to go green.
      if (!r.buttonSamples) {
        failures.push(width + 'px: never observed the button load, so the card is unbounded here');
      } else if (r.cardTop === null) {
        failures.push(width + 'px: the button load reported no _cardRect, so nothing was drawn');
      } else {
        if (r.showcaseBottom !== null && r.cardTop < r.showcaseBottom) {
          failures.push(width + 'px: the carried button rises past the meta-row into the showcase ' +
            '(card top ' + r.cardTop + ' vs showcase bottom ' + r.showcaseBottom + ', card ' +
            r.cardW + 'x' + r.cardH + ')');
        }
        if (r.cardOverlap > CARD_OVERLAP_BUDGET) {
          failures.push(width + 'px: the carried button eats ' + r.cardOverlap + 'px of the meta-row, ' +
            'budget is ' + CARD_OVERLAP_BUDGET + ' (card ' + r.cardW + 'x' + r.cardH +
            ', top ' + r.cardTop + ' vs last text line bottom ' + r.lastLineBottom + ')');
        }
        observed.push(width + 'px card ' + r.cardW + 'x' + r.cardH + ' over ' + r.cardOverlap + 'px' +
          ' (row ' + (r.lastLineBottom - r.metaTop) + 'px tall)');
      }
    }
    await page.close();
  }

  assert.deepStrictEqual(failures, [],
    'beam crew overlaps the meta-row text:\n  ' + failures.join('\n  '));

  observed.forEach(function (line) { console.log('  ' + line); });
  console.log('beam-clears-metarow: PASS (' + WIDTHS.join('/') + 'px) — figures clear the row, card within its ' + CARD_OVERLAP_BUDGET + 'px budget');
  await browser.close();
})();
