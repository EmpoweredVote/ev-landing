const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

(async function () {
  const browser = await chromium.launch();
  let found = false;

  // dogfetch is one of three footer options, so reload until it is cast
  for (let attempt = 0; attempt < 14 && !found; attempt++) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.route('**/*', function (r) {
      return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
    });
    await page.goto(URL);
    await page.waitForFunction(function () { return !!window.__evFigDebug; });

    const has = await page.evaluate(function () {
      var e = window.__evFigDebug.entries.filter(function (x) { return x.spec.mode === 'dogfetch'; })[0];
      if (!e) return false;
      e.c.scrollIntoView({ block: 'center', behavior: 'instant' });   // scene only ticks when visible
      return true;
    });
    if (!has) { await page.close(); continue; }
    found = true;

    await page.waitForFunction(function () {
      var e = window.__evFigDebug.entries.filter(function (x) { return x.spec.mode === 'dogfetch'; })[0];
      return e && e.df != null;                                       // fetch machine has initialised
    }, { timeout: 8000 });

    await page.evaluate(function () {
      var d = window.__evFigDebug;
      var e = d.entries.filter(function (x) { return x.spec.mode !== 'why' && x.w; })[0];
      d.poof.victim = e; d.poof.phase = 'holding'; d.poof.t = 2.9;
    });
    await page.waitForFunction(function () { return window.__evFigDebug.poof.phase === 'fleeing'; }, { timeout: 9000 });

    const dog = await page.evaluate(async function () {
      var e = window.__evFigDebug.entries.filter(function (x) { return x.spec.mode === 'dogfetch'; })[0];
      if (!e || e.gone) return { skipped: true };
      var a = e.flDog ? e.flDog.x : null;
      await new Promise(function (r) { setTimeout(r, 500); });
      var b = e.flDog ? e.flDog.x : null;
      return { seeded: a !== null, moved: a !== null && b !== null && Math.abs(b - a) > 10,
               dir: e.flDog && e.flDog.dir, ownerX: e.flX };
    });

    if (dog.skipped) { await page.close(); found = false; continue; }
    assert.ok(dog.seeded, 'the dog must be seeded a flee of his own (e.flDog)');
    assert.ok(dog.moved, 'the dog must run');

    await page.waitForFunction(function () {
      return window.__evFigDebug.poof.phase === 'cleared';
    }, { timeout: 25000 });
    console.log('07-dog: PASS');
    await page.close();
  }

  assert.ok(found, 'dogfetch never appeared in 14 casts — rerun; it is one of three footer options');
  await browser.close();
})();
