// The cartwheeler and the Bobit who comes to help him must not occupy the same patch of floor.
//
// Reported from a phone as the helper "switching colours briefly". It was not a colour bug: the
// helper kneels 30px from the man he is helping and STAYS there through the kneel, the lift and the
// watch, which parks him inside the walker's roam — and nothing kept the walker off him. Measured at
// 390x844 with the spill mid-lane, 225 of the 387 frames the helper spent on the floor had the pair
// closer than 45px and the closest approach was ZERO: he strolled straight through him. Two stick
// figures at 0px apart are one tangle of limbs, and the helper is drawn over the walker, so the
// pixels where he stands alternate between the two tones as the limbs sweep through.
//
// It is a phone bug because of the lane: roamR - roamL is 180px at 390 wide against 1070px on a
// desktop, so here he crosses the man within seconds. Both spills are exercised below, because the
// first fix worked mid-lane and still walked through him when the spill landed against a wall —
// which is the common case, since a wheel ends at the wall.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const RELOADS = 30;
const SECS = 40;
// The staged distance: he kneels, rises and watches from 30px away, and the pair are drawn as two
// clearly separate men there. Anything under this is limbs through limbs.
const MIN_GAP = 28;

async function open(browser) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true
  });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  await page.waitForFunction(() => !!window.__evFigDebug);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  page.__errs = errs;
  return page;
}

// Drop him at `where` in his roam and let the rescue play out from the top.
async function spillAt(page, i, where) {
  return page.evaluate(([t, w]) => {
    const e = window.__evFigDebug.entries[t];
    const roamL = 128, roamR = e.w - 74;
    const x = w === 'wall' ? roamR : Math.round((roamL + roamR) / 2);
    e.cwX = x; e.cw = 'heap'; e.cwT = 0;
    e.hp = 'corner'; e.hpX = 46; e.hpT = 0;
    return { roamL, roamR, x, lane: roamR - roamL };
  }, [i, where]);
}

async function watchThem(page, i, secs) {
  return page.evaluate(([t, s]) => new Promise(res => {
    const e = window.__evFigDebug.entries[t];
    const rows = [];
    const t0 = performance.now();
    (function step() {
      rows.push({ cw: e.cw, hp: e.hp, cwX: e.cwX, hpX: e.hpX });
      if (performance.now() - t0 < s * 1000) requestAnimationFrame(step); else res(rows);
    })();
  }), [i, secs]);
}

function judge(tag, rows, lane) {
  // Only while he is out on the floor. In his corner (x 46) he is outside the roam entirely.
  const out = rows.filter(r => r.hp && r.hp !== 'corner');
  assert.ok(out.length > 40, tag + ': the helper never came out to him (' + out.length + ' frames)');

  // 1. Never through him. The walker is always on the same side of the helper — who kneels to his
  //    left and whose corner is further left still, so a crossing is never part of the staging.
  let sign = null, crossings = 0;
  out.forEach(r => {
    const s = Math.sign(r.cwX - r.hpX);
    if (s === 0) { crossings++; return; }
    if (sign !== null && s !== sign) crossings++;
    sign = s;
  });
  assert.strictEqual(crossings, 0, tag + ': the walker passed through the helper ' + crossings +
    ' time(s) — they were drawn standing in the same place');

  // 2. And never close enough to tangle.
  const gaps = out.map(r => Math.abs(r.cwX - r.hpX));
  const min = Math.min.apply(null, gaps);
  assert.ok(min >= MIN_GAP, tag + ': closest approach ' + min.toFixed(1) + 'px, under the ' + MIN_GAP +
    'px at which the two silhouettes touch (lane is ' + lane + 'px wide)');

  // 3. He gets home. The walker WAITS when a wall leaves him nowhere to go that is not through the
  //    helper, so the helper's watch has to time out on its own — if it does not, the pair of them
  //    stand there forever and the scene is over.
  const home = rows.slice(rows.indexOf(out[out.length - 1])).some(r => r.hp === 'corner');
  assert.ok(home || rows[rows.length - 1].hp === 'corner',
    tag + ': the helper never went back to his corner — he and the walker deadlocked');
  return { frames: out.length, min: min };
}

(async function () {
  const browser = await chromium.launch();
  let page = null, i = null;
  for (let n = 0; n < RELOADS; n++) {
    page = await open(browser);
    i = await page.evaluate(() => {
      const d = window.__evFigDebug;
      const j = d.entries.findIndex(e => e.spec.mode === 'cartwheel' && e.w && !e.gone);
      if (j < 0) return null;
      d.entries[j].c.scrollIntoView({ block: 'center', behavior: 'instant' });
      return j;
    });
    if (i != null) break;
    await page.close();
  }
  assert.ok(i != null, 'no cast in ' + RELOADS + ' loads put a cartwheel pair in the footer');
  await page.waitForTimeout(500);

  const midInfo = await spillAt(page, i, 'mid');
  const mid = judge('mid-lane', await watchThem(page, i, SECS), midInfo.lane);

  const wallInfo = await spillAt(page, i, 'wall');
  const wall = judge('against the wall', await watchThem(page, i, SECS), wallInfo.lane);

  assert.deepStrictEqual(page.__errs, [], 'page errors');
  console.log('  lane ' + midInfo.lane + 'px @390 wide');
  console.log('  mid-lane spill:  ' + mid.frames + ' frames on the floor, closest ' + mid.min.toFixed(1) + 'px, no crossings');
  console.log('  wall spill:      ' + wall.frames + ' frames on the floor, closest ' + wall.min.toFixed(1) + 'px, no crossings');
  console.log('cartwheel-clearance: PASS');
  await browser.close();
})();
