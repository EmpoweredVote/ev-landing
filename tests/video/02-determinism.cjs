// The premise of the whole pipeline: pixels depend on (scene, t) and nothing
// else. The interesting failure is not "the same call twice differs" — it is
// hidden state, where rendering t=1.5 AFTER t=99 differs from rendering t=1.5
// cold. That is what a stray accumulator or a Math.random would look like.
const { chromium } = require('playwright');
const assert = require('assert');
const crypto = require('crypto');
const FX = require('./fixtures/scene-fixtures.cjs');

const URL = 'file:///C:/ev-landing/ev-landing-main/tools/video/engine/stage.html';
const W = 480, H = 270;

function hash(buf) { return crypto.createHash('sha1').update(buf).digest('hex'); }

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  await page.evaluate(([w, h]) => window.EVStage.init(w, h), [W, H]);

  async function shot(scene, t) {
    await page.evaluate(([s, tt]) => window.EVStage.renderFrame(s, tt), [scene, t]);
    return await page.screenshot({ type: 'png' });
  }

  for (const key of ['title', 'stage', 'walker', 'bullets']) {
    const scene = FX[key];
    const cold = hash(await shot(scene, 1.5));
    await shot(scene, 99);
    await shot(FX.title, 7);
    const warm = hash(await shot(scene, 1.5));
    assert.strictEqual(warm, cold, key + ': t=1.5 must not depend on what was drawn before it');
  }

  // And the picture must actually move, or the determinism above is vacuous:
  // a renderer that drew nothing at all would satisfy every assertion above.
  // The title fades in between t=0 and t=1, which is motion this file owns.
  // Motion that comes from a FIGURE is asserted in 03-cast.cjs, which is where
  // the code that moves figures lives.
  const blank = hash(await shot(FX.title, 0.0));
  const shown = hash(await shot(FX.title, 1.0));
  assert.notStrictEqual(shown, blank, 'the title must fade in between t=0 and t=1');

  // A bullet that has not been reached yet must not be on screen.
  const early = hash(await shot(FX.bullets, 0.2));
  const late = hash(await shot(FX.bullets, 4.0));
  assert.notStrictEqual(early, late, 'bullets must reveal over time');

  assert.deepStrictEqual(errors, [], 'no page errors: ' + errors.join('; '));
  await browser.close();
  console.log('PASS 02-determinism');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
