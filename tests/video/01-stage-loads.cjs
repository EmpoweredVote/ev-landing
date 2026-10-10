// The render page must load the LIVE rig and the extras, and expose EVStage.
// It must NOT load ev-figures.js — that file randomizes its cast per load and
// runs its own rAF loop, which would make every render different.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/tools/video/engine/stage.html';

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);

  const probe = await page.evaluate(() => ({
    rig: !!window.LeremyRig,
    anims: window.LeremyRig ? Object.keys(window.LeremyRig.ANIMATIONS).length : 0,
    hasPonder: !!(window.LeremyRig && window.LeremyRig.ANIMATIONS.ponder),
    stage: typeof window.EVStage === 'object' && typeof window.EVStage.renderFrame === 'function',
    figures: !!window.__evFigDebug,
    scripts: Array.from(document.scripts).map(s => s.getAttribute('src'))
  }));

  assert.ok(probe.rig, 'LeremyRig must be loaded');
  assert.ok(probe.anims >= 26, 'the rig must carry its full animation set, got ' + probe.anims);
  assert.ok(probe.hasPonder, 'ev-anim-extras.js must be loaded (ponder is one of its poses)');
  assert.ok(probe.stage, 'window.EVStage.renderFrame must exist');
  assert.ok(!probe.figures, 'ev-figures.js must NOT be loaded into the render page');
  assert.ok(!probe.scripts.some(s => /ev-figures/.test(s || '')), 'no ev-figures script tag');
  assert.deepStrictEqual(errors, [], 'the render page must throw nothing: ' + errors.join('; '));

  await browser.close();
  console.log('PASS 01-stage-loads');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
