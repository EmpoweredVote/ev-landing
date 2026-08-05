// The heavy-hold gait, used by the beam crew when the load is the Fallacy Finders button — a
// ~340x102 slab, taller than they are. It has to READ as strained, which is four separate things
// and not one: folded further forward than the normal carry, head lifted relative to that fold,
// arms hanging straighter (so the hands sit as low as the rig reaches), and a small sag each time
// the planted foot takes the weight.
//
// Asserting "ANIMATIONS.hefty exists" would pass for a gait that is a byte-for-byte copy of `carry`,
// which is exactly the regression worth catching: the whole point of the pose is that it differs.
//
// Two sign conventions here are counter-intuitive, so read them before touching the numbers:
//   positive `bob`      = DOWNWARD  (the ball gag uses `bob += 12` for "a big downward lurch")
//   negative `hunch`    = folds FORWARD (`heave` uses -42 for a deep fold)
//   positive `headTilt` = looks UP  (`painhop` runs -22 at the foot to +18 after the ball)
//
// Runs in a browser rather than bare Node on purpose: leremy-rig.js is an IIFE whose first line
// reads `window.LeremyRig`, and it publishes the pose table only via that global. There is nothing
// to require.
//
// Needs Playwright, which is not a repo dependency:
//   NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" \
//     node tests/layout/hefty-pose.cjs
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html';

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () {
    return !!(window.LeremyRig && window.LeremyRig.ANIMATIONS);
  });

  const r = await page.evaluate(function () {
    var A = window.LeremyRig.ANIMATIONS;
    if (!A.hefty) return { missing: true };
    // Sample whole strides rather than one instant. The lurch is a per-step event, and step LENGTH
    // is an amplitude — comparing legRU at a single t compares two gaits at different phases (they
    // run at different speeds), which says nothing about stride.
    var maxBob = -Infinity, minBob = Infinity, sameAsCarry = true;
    var strideHefty = 0, strideCarry = 0;
    for (var t = 0; t < 8; t += 0.01) {
      var p = A.hefty.frame(t), c = A.carry.frame(t);
      if (p.bob > maxBob) maxBob = p.bob;
      if (p.bob < minBob) minBob = p.bob;
      if (Math.abs(p.legRU) > strideHefty) strideHefty = Math.abs(p.legRU);
      if (Math.abs(c.legRU) > strideCarry) strideCarry = Math.abs(c.legRU);
      if (sameAsCarry && (p.bob !== c.bob || p.hunch !== c.hunch || p.legRU !== c.legRU)) {
        sameAsCarry = false;
      }
    }
    return {
      carry: A.carry.frame(0.5),
      hefty: A.hefty.frame(0.5),
      maxBob: maxBob, minBob: minBob, sameAsCarry: sameAsCarry,
      strideHefty: strideHefty, strideCarry: strideCarry,
      inOrder: window.LeremyRig.ORDER.indexOf('hefty') >= 0,
      hasLabel: !!(A.hefty.label && A.hefty.mood)
    };
  });

  assert.ok(!r.missing, 'ANIMATIONS.hefty is missing');
  assert.ok(!r.sameAsCarry, 'hefty is indistinguishable from carry — it is meant to look strained');

  assert.ok(r.hefty.hunch < r.carry.hunch,
    'hefty should fold further forward than carry (hunch ' + r.hefty.hunch + ' vs ' + r.carry.hunch + ')');
  assert.ok(r.hefty.headTilt > r.carry.headTilt,
    'hefty should tip the head back to see past the load (headTilt ' +
    r.hefty.headTilt + ' vs ' + r.carry.headTilt + ')');
  assert.ok(Math.abs(r.hefty.armRU) < Math.abs(r.carry.armRU),
    'hefty arms should hang straighter than carry, to put the hands as low as the rig reaches ' +
    '(armRU ' + r.hefty.armRU + ' vs ' + r.carry.armRU + ')');
  assert.ok(r.strideHefty < r.strideCarry,
    'hefty should take shorter steps than carry — comparing stride AMPLITUDE over whole cycles, not ' +
    'legRU at one instant, since the two gaits run at different speeds and so are never in phase ' +
    '(stride ' + r.strideHefty.toFixed(1) + ' vs ' + r.strideCarry.toFixed(1) + ')');

  // Bounded from BOTH sides. makeGait leaves the planted rear leg fully straight, so a pelvis drop
  // has no knee slack and pushes the foot through the floor instead. Measured lowest ink below the
  // floor line at the crew's S = 0.32, against the 2px every shipped gait already sits at:
  //     sag  0 -> 2px    8 -> 3px    16 -> 6px
  //     sag  4 -> 2px   11 -> 4px    24 -> 8px
  assert.ok(r.maxBob > 5,
    'hefty should sag onto the weight-bearing foot; max bob was only ' + r.maxBob.toFixed(2) +
    ' (positive bob is downward in this rig)');
  assert.ok(r.maxBob < 12,
    'hefty sags ' + r.maxBob.toFixed(2) + ', which drives the planted foot more than ~1px past the ' +
    'floor line the other gaits sit at — the rear leg is straight, so there is no slack for it');
  assert.ok(r.maxBob - r.minBob > 5,
    'the sag should be a per-step event, not a constant offset (bob range ' +
    r.minBob.toFixed(2) + '..' + r.maxBob.toFixed(2) + ')');

  assert.ok(r.inOrder, 'hefty is missing from ORDER, so the pose browser will not list it');
  assert.ok(r.hasLabel, 'hefty needs a label and mood like every other entry in ANIMATIONS');

  console.log('hefty-pose: PASS (bob ' + r.minBob.toFixed(1) + '..' + r.maxBob.toFixed(1) +
    ', stride ' + r.strideHefty.toFixed(1) + ' vs carry ' + r.strideCarry.toFixed(1) +
    ', hunch ' + r.hefty.hunch.toFixed(1) + ' vs ' + r.carry.hunch.toFixed(1) + ')');
  await browser.close();
})();
