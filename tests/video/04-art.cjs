// An art scene draws from an injected per-episode script, selected by NAME.
// A scene object crosses into the browser as JSON, so it cannot carry a
// function; naming one is the whole mechanism, and an unknown name must say so.
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');

const ROOT = 'C:/ev-landing/ev-landing-main';
const URL = 'file:///' + ROOT + '/tools/video/engine/stage.html';
const W = 400, H = 225;

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  await page.addScriptTag({ path: path.join(ROOT, 'tests/video/fixtures/art-fixture.js') });
  await page.evaluate(([w, h]) => window.EVStage.init(w, h), [W, H]);

  const scene = {
    id: 'fx-art', type: 'art', dur: 2, vo: 'L001', accent: '#FFD426', art: 'growingBar',
    cast: [{ at: [0.5, 0.92], anim: 'present', tone: 0, scale: 0.4 }]
  };

  function countInk() {
    const c = document.getElementById('stage');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - 0x11) + Math.abs(d[i + 1] - 0x11) + Math.abs(d[i + 2] - 0x13) > 60) n++;
    }
    return n;
  }

  async function inkCount(s, t) {
    return await page.evaluate(([sc, tt, src]) => {
      window.EVStage.renderFrame(sc, tt);
      return new Function('return (' + src + ')()')();
    }, [s, t, countInk.toString()]);
  }

  const early = await inkCount(scene, 0.2);
  const late = await inkCount(scene, 2.0);
  assert.ok(early > 0, 'the art scene must draw something at t=0.2');
  assert.ok(late > early * 1.5, 'the bar must grow: ' + early + ' -> ' + late);

  // The cast still draws on top of art.
  const withoutFigure = await inkCount(Object.assign({}, scene, { cast: [] }), 2.0);
  assert.ok(late > withoutFigure,
    'the Bobit must draw on top of the art, not be swallowed by it: ' + late + ' vs ' + withoutFigure);

  // An unknown art name aborts and names itself.
  let threw = null;
  try {
    await page.evaluate(s => window.EVStage.renderFrame(s, 0), Object.assign({}, scene, { art: 'nope' }));
  } catch (e) { threw = String(e); }
  assert.ok(threw && /nope/.test(threw), 'an unknown art name must throw and name itself, got: ' + threw);

  assert.deepStrictEqual(errors.filter(e => !/nope/.test(e)), [], 'no unexpected page errors');
  await browser.close();
  console.log('PASS 04-art');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
