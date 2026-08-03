const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');

// counts pixels with alpha > 8 on a scratch canvas
const COVERAGE = (args) => {
  var c = document.createElement('canvas');
  c.width = 400; c.height = 300;
  var g = c.getContext('2d');
  window.LeremyRig.drawSmoke(g, args.x, args.y, args.spread, args.alpha, args.seed, args.t);
  var d = g.getImageData(0, 0, c.width, c.height).data;
  var n = 0, sum = 0;
  for (var i = 3; i < d.length; i += 4) { if (d[i] > 8) { n++; sum += d[i]; } }
  return { pixels: n, meanAlpha: n ? sum / n : 0 };
};

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto('about:blank');
  await page.addScriptTag({ path: path.join(__dirname, '..', '..', 'leremy-rig.js') });

  assert.ok(await page.evaluate(function () { return typeof window.LeremyRig.drawSmoke === 'function'; }),
    'LeremyRig must export drawSmoke');

  const base = { x: 200, y: 200, spread: 30, alpha: 0.8, seed: 7, t: 0 };

  // draws something
  const small = await page.evaluate(COVERAGE, base);
  assert.ok(small.pixels > 200, 'a puff should paint a meaningful area, got ' + small.pixels);

  // a bigger spread covers more ground
  const big = await page.evaluate(COVERAGE, Object.assign({}, base, { spread: 70 }));
  assert.ok(big.pixels > small.pixels * 1.5,
    'spread 70 should cover much more than spread 30 (' + big.pixels + ' vs ' + small.pixels + ')');

  // alpha scales opacity, not area
  const faint = await page.evaluate(COVERAGE, Object.assign({}, base, { alpha: 0.2 }));
  assert.ok(faint.meanAlpha < small.meanAlpha * 0.6,
    'lower alpha must be fainter (' + faint.meanAlpha + ' vs ' + small.meanAlpha + ')');

  // nothing at all when invisible or unspread
  for (const dead of [{ alpha: 0 }, { alpha: -1 }, { spread: 0 }]) {
    const r = await page.evaluate(COVERAGE, Object.assign({}, base, dead));
    assert.strictEqual(r.pixels, 0, 'must draw nothing for ' + JSON.stringify(dead));
  }

  // deterministic for a given seed, different across seeds
  const a1 = await page.evaluate(COVERAGE, Object.assign({}, base, { seed: 3 }));
  const a2 = await page.evaluate(COVERAGE, Object.assign({}, base, { seed: 3 }));
  const b1 = await page.evaluate(COVERAGE, Object.assign({}, base, { seed: 4 }));
  assert.strictEqual(a1.pixels, a2.pixels, 'same seed must produce the same puff');
  assert.notStrictEqual(a1.pixels, b1.pixels, 'different seeds should scatter differently');

  // does not leave the context dirtied for the next caller
  const clean = await page.evaluate(function () {
    var c = document.createElement('canvas'); c.width = 50; c.height = 50;
    var g = c.getContext('2d');
    window.LeremyRig.drawSmoke(g, 25, 25, 10, 0.5, 1, 0);
    return { alpha: g.globalAlpha, fill: g.fillStyle };
  });
  assert.strictEqual(clean.alpha, 1, 'drawSmoke must restore globalAlpha');

  console.log('01-smoke: PASS');
  await browser.close();
})();
