// When the room drops what it is holding, the beam crew's load has to be reported as what it
// actually is. propOf returned a single `beamload` kind for the whole crew regardless of load, and
// drawGroundProp paints that as a 7px circle outline — so a dropped 340x102 showcase button would
// have landed on the floor as a small ball.
//
// It is also the heaviest thing anybody on the page is carrying, so it belongs in HEAVY_PROP and
// should land on a foot rather than clatter down harmlessly beside one.
//
// Asserts the ground form actually PAINTS, and paints wider than tall. "propOf returns 'card'" would
// be equally true of a kind that drawGroundProp has no branch for and therefore draws nothing at all,
// which is exactly the failure worth catching here — see the header of 12-drop-beat.cjs for the same
// lesson learned the hard way.
//
// Needs Playwright, which is not a repo dependency:
//   NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" \
//     node tests/poof/14-card-prop.cjs
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
  await page.waitForTimeout(500);

  const r = await page.evaluate(function () {
    var d = window.__evFigDebug;
    var beam = d.entries.filter(function (e) { return e.spec.mode === 'beam'; })[0];
    if (!beam) return { error: 'no beam in the cast' };

    var out = { kinds: {} };
    var scene = beam.scene, load = beam.load;
    beam.scene = 'carry';
    ['button', 'circle', 'line'].forEach(function (l) {
      beam.load = l;
      var p = d.propOf(beam);
      out.kinds[l] = p ? p.kind : null;
    });
    beam.scene = scene; beam.load = load;

    // the ground form must paint, and paint like a slab rather than a ball
    function inkOf(kind) {
      var W = 80, H = 40;
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var g = c.getContext('2d');
      d.__gp(g, kind, W / 2, H - 2, '#000', 1);
      var px = g.getImageData(0, 0, W, H).data;
      var minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        if (px[(y * W + x) * 4 + 3] > 8) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
      return maxX < 0 ? null : { w: maxX - minX + 1, h: maxY - minY + 1 };
    }

    return {
      kinds: out.kinds,
      cardInk: inkOf('card'),
      beamloadInk: inkOf('beamload'),
      bookInk: inkOf('book')
    };
  });

  assert.ok(!r.error, r.error);

  assert.strictEqual(r.kinds.button, 'card',
    'the button load should report kind "card", got ' + r.kinds.button);
  assert.strictEqual(r.kinds.circle, 'beamload',
    'the ball should still report "beamload", got ' + r.kinds.circle);
  assert.strictEqual(r.kinds.line, 'beamload',
    'the line should still report "beamload", got ' + r.kinds.line);

  assert.ok(r.cardInk, 'drawGroundProp painted NOTHING for kind "card" — it has no branch for it, so ' +
    'the dropped button would vanish off the floor entirely');
  assert.ok(r.cardInk.w > 6,
    'the dropped card is only ' + r.cardInk.w + 'px wide; it should read as a slab');
  assert.ok(r.cardInk.w > r.cardInk.h,
    'a dropped card should lie WIDER than tall (' + r.cardInk.w + 'x' + r.cardInk.h + ')');
  assert.ok(r.cardInk.w > r.beamloadInk.w,
    'the dropped 340px button (' + r.cardInk.w + 'px) should read bigger than the ball it replaced (' +
    r.beamloadInk.w + 'px), or there was no point distinguishing them');

  // heavy: it must be in the table the drop beat consults
  const heavy = await page.evaluate(function () {
    var d = window.__evFigDebug;
    // HEAVY_PROP is not exported; exercise it through the drop machinery instead by checking that
    // a card drop is marked as hurting, the same field 12-drop-beat asserts on.
    return typeof d.heavyProp === 'object' ? Object.keys(d.heavyProp) : null;
  });
  assert.ok(heavy && heavy.indexOf('card') >= 0,
    'kind "card" is not in HEAVY_PROP (' + (heavy ? heavy.join(', ') : 'not exposed') +
    ') — a 340px button landing on a foot should hurt');

  console.log('  kinds: ' + JSON.stringify(r.kinds));
  console.log('  ground ink: card ' + r.cardInk.w + 'x' + r.cardInk.h +
    ', beamload ' + r.beamloadInk.w + 'x' + r.beamloadInk.h +
    ', book ' + r.bookInk.w + 'x' + r.bookInk.h);
  console.log('  heavy: ' + heavy.join(', '));
  console.log('14-card-prop: PASS');
  await browser.close();
})();
