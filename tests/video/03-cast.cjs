// Where a Bobit's FEET land. The rig places the pelvis at the origin, so a
// naive placement floats the figure a leg-length off the ground and every
// scene still renders, still passes, and still looks broken. So this test
// asks the pixels, per the lesson already paid for in this repo.
const { chromium } = require('playwright');
const assert = require('assert');
const crypto = require('crypto');

const URL = 'file:///C:/ev-landing/ev-landing-main/tools/video/engine/stage.html';
const W = 800, H = 450;

function sceneWith(cast) {
  return { id: 'fx', type: 'stage', dur: 2, vo: 'L001', accent: '#FFD426', cast: cast };
}

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  await page.evaluate(([w, h]) => window.EVStage.init(w, h), [W, H]);

  // Return the lowest and the horizontal centre of every pixel that is not the
  // #111113 background, ignoring the soft shadow ellipse by requiring a strong
  // difference from the background.
  async function ink(scene, t) {
    return await page.evaluate(([s, tt]) => {
      window.EVStage.renderFrame(s, tt);
      const c = document.getElementById('stage');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let lo = -1, minX = 1e9, maxX = -1, n = 0;
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          const i = (y * c.width + x) * 4;
          const diff = Math.abs(d[i] - 0x11) + Math.abs(d[i + 1] - 0x11) + Math.abs(d[i + 2] - 0x13);
          if (diff > 60) { lo = y; if (x < minX) minX = x; if (x > maxX) maxX = x; n++; }
        }
      }
      return { lo, minX, maxX, n };
    }, [scene, t]);
  }

  async function pixels(scene, t) {
    await page.evaluate(([s, tt]) => window.EVStage.renderFrame(s, tt), [scene, t]);
    const buf = await page.screenshot({ type: 'png' });
    return crypto.createHash('sha1').update(buf).digest('hex');
  }

  // 1. Feet land on the ground line, standing.
  const groundFrac = 0.80;
  const stand = await ink(sceneWith([{ at: [0.5, groundFrac], anim: 'present', tone: 0 }]), 1.0);
  assert.ok(stand.n > 200, 'the figure must actually be drawn, got ' + stand.n + ' ink pixels');
  const want = Math.round(H * groundFrac);
  assert.ok(Math.abs(stand.lo - want) <= 6,
    'standing feet must land on the ground line: lowest ink ' + stand.lo + ', ground ' + want);

  // 2. A seated pose also lands on the ground line, not 72px off it.
  const sit = await ink(sceneWith([{ at: [0.5, groundFrac], anim: 'sit', tone: 0 }]), 1.0);
  assert.ok(Math.abs(sit.lo - want) <= 10,
    'seated feet must land on the ground line too: lowest ink ' + sit.lo + ', ground ' + want);

  // 3. Scale shrinks the figure but keeps the feet down.
  const small = await ink(sceneWith([{ at: [0.5, groundFrac], anim: 'present', tone: 0, scale: 0.5 }]), 1.0);
  assert.ok(Math.abs(small.lo - want) <= 6, 'a scaled figure keeps its feet on the ground');
  assert.ok(small.n < stand.n * 0.6, 'scale 0.5 must draw substantially less ink');

  // 4. A path moves the figure across the scene.
  const walk = [{ at: [0.2, groundFrac], anim: 'stroll', tone: 1, path: [[0.2, groundFrac], [0.8, groundFrac]] }];
  const begin = await ink(sceneWith(walk), 0.0);
  const end = await ink(sceneWith(walk), 2.0);           // scene dur is 2
  const cBegin = (begin.minX + begin.maxX) / 2, cEnd = (end.minX + end.maxX) / 2;
  assert.ok(cEnd - cBegin > W * 0.4,
    'a path must carry the figure across: centre moved ' + Math.round(cEnd - cBegin) + 'px');

  // 5. The walk cycle itself animates, with no path to carry it. Without this,
  //    a renderer that froze every figure at frame 0 would pass everything
  //    above. (Moved here from 02-determinism, where the cast was still a stub.)
  const inPlace = sceneWith([{ at: [0.5, groundFrac], anim: 'stroll', tone: 1 }]);
  assert.notStrictEqual(await pixels(inPlace, 0.90), await pixels(inPlace, 0.30),
    'a walking Bobit must look different at two times even with no path');

  // 6. More than three Bobits is a stated limit, so it must fail, not render.
  let tooMany = null;
  try {
    await page.evaluate(s => window.EVStage.renderFrame(s, 0), sceneWith([
      { at: [0.2, 0.8], anim: 'present', tone: 0 }, { at: [0.4, 0.8], anim: 'present', tone: 1 },
      { at: [0.6, 0.8], anim: 'present', tone: 2 }, { at: [0.8, 0.8], anim: 'present', tone: 3 }
    ]));
  } catch (e) { tooMany = String(e); }
  assert.ok(tooMany && /limit is 3/.test(tooMany), 'a fourth Bobit must abort, got: ' + tooMany);

  // 7. An unknown animation name must abort loudly, naming itself.
  let threw = null;
  try {
    await page.evaluate(s => window.EVStage.renderFrame(s, 0),
      sceneWith([{ at: [0.5, 0.8], anim: 'moonwalk', tone: 0 }]));
  } catch (e) { threw = String(e); }
  assert.ok(threw && /moonwalk/.test(threw),
    'an unknown animation must throw and name itself, got: ' + threw);

  assert.deepStrictEqual(errors.filter(e => !/moonwalk|limit is 3/.test(e)), [],
    'no unexpected page errors');
  await browser.close();
  console.log('PASS 03-cast');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
