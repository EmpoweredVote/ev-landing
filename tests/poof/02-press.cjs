const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

async function load(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  await page.waitForTimeout(1200);
  return page;
}

// a point that is definitely ON painted ink, and one definitely off it but inside the same canvas
async function points(page) {
  return page.evaluate(function () {
    var es = window.__evFigDebug.entries.filter(function (e) {
      return e.spec.mode !== 'why' && e.w;
    });
    for (var i = 0; i < es.length; i++) {
      var e = es[i];
      e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
      var r = e.c.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      var g = e.ctx, d;
      try { d = g.getImageData(0, 0, e.c.width, e.c.height).data; } catch (err) { continue; }
      var sx = e.c.width / r.width, sy = e.c.height / r.height;
      var hit = null;
      for (var y = e.c.height - 1; y >= 0 && !hit; y--) {
        for (var x = 0; x < e.c.width; x++) {
          if (d[(y * e.c.width + x) * 4 + 3] > 8) { hit = { x: r.left + x / sx, y: r.top + y / sy }; break; }
        }
      }
      if (hit) return { hit: hit, empty: { x: r.left + 2, y: r.top + 2 }, mode: e.spec.mode };
    }
    return null;
  });
}

(async function () {
  const browser = await chromium.launch();
  let page = await load(browser);

  // the hit-test finds ink and rejects the empty box around it
  const pts = await points(page);
  assert.ok(pts, 'no painted Bobit found to test against');
  const probe = await page.evaluate(function (p) {
    var d = window.__evFigDebug;
    var onInk = d.bobitAt(p.hit.x, p.hit.y);
    var onEmpty = d.bobitAt(p.empty.x, p.empty.y);
    var offPage = d.bobitAt(4, 4);
    return { onInk: !!onInk, onInkMode: onInk && onInk.spec.mode, onEmpty: !!onEmpty, offPage: !!offPage };
  }, pts);
  assert.ok(probe.onInk, 'bobitAt must find a Bobit on painted ink');
  assert.strictEqual(probe.onEmpty, false, 'bobitAt must reject the empty space inside the canvas');
  assert.strictEqual(probe.offPage, false, 'bobitAt must reject a point with no Bobit');

  // why figures are never returned
  const whyProbe = await page.evaluate(function () {
    var why = window.__evFigDebug.entries.filter(function (e) { return e.spec.mode === 'why'; })[0];
    if (!why) return 'no-why';
    // the why section sits far from the figure used above — scroll back after checking it so
    // the earlier hit/empty points (captured against the current scroll position) stay valid
    var sx0 = window.scrollX, sy0 = window.scrollY;
    why.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    var r = why.c.getBoundingClientRect();
    var found = false;
    for (var y = 0; y < r.height; y += 4) {
      for (var x = 0; x < r.width; x += 4) {
        if (window.__evFigDebug.bobitAt(r.left + x, r.top + y)) { found = true; break; }
      }
      if (found) break;
    }
    window.scrollTo({ left: sx0, top: sy0, behavior: 'instant' });
    return found;
  });
  assert.notStrictEqual(whyProbe, true, 'a why figure must never be returned by bobitAt');

  // a 3s right-press fires; the phase machine leaves 'holding'
  await page.evaluate(function (p) {
    var el = document.elementFromPoint(p.hit.x, p.hit.y) || document.body;
    el.dispatchEvent(new MouseEvent('mousedown', { button: 2, buttons: 2, clientX: p.hit.x, clientY: p.hit.y, bubbles: true }));
  }, pts);
  await page.waitForTimeout(400);
  assert.strictEqual(await page.evaluate(function () { return window.__evFigDebug.poof.phase; }), 'holding',
    'a right-press on a Bobit must start a hold');

  await page.waitForTimeout(3000);
  assert.notStrictEqual(await page.evaluate(function () { return window.__evFigDebug.poof.phase; }), 'holding',
    'the hold must complete after 3s');
  await page.close();

  // releasing at 2.5s cancels — no poof
  page = await load(browser);
  let pts2 = await points(page);
  await page.evaluate(function (p) {
    (document.elementFromPoint(p.hit.x, p.hit.y) || document.body)
      .dispatchEvent(new MouseEvent('mousedown', { button: 2, buttons: 2, clientX: p.hit.x, clientY: p.hit.y, bubbles: true }));
  }, pts2);
  await page.waitForTimeout(2500);
  await page.evaluate(function () {
    document.dispatchEvent(new MouseEvent('mouseup', { button: 2, bubbles: true }));
  });
  await page.waitForTimeout(1500);
  const afterEarly = await page.evaluate(function () { return window.__evFigDebug.poof.phase; });
  assert.ok(afterEarly === 'idle' || afterEarly === 'fizzle',
    'releasing at 2.5s must cancel, got ' + afterEarly);

  // Escape cancels too
  await page.evaluate(function (p) {
    (document.elementFromPoint(p.hit.x, p.hit.y) || document.body)
      .dispatchEvent(new MouseEvent('mousedown', { button: 2, buttons: 2, clientX: p.hit.x, clientY: p.hit.y, bubbles: true }));
  }, pts2);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  const afterEsc = await page.evaluate(function () { return window.__evFigDebug.poof.phase; });
  assert.ok(afterEsc === 'idle' || afterEsc === 'fizzle', 'Escape must cancel, got ' + afterEsc);

  // figures keep animating/repositioning while the clock runs, so re-locate painted ink now —
  // several seconds have passed since pts2 was captured and that pixel may no longer be on him
  pts2 = await points(page);
  assert.ok(pts2, 'no painted Bobit found to test contextmenu suppression against');

  // contextmenu suppressed on a Bobit, allowed elsewhere
  const menus = await page.evaluate(function (p) {
    function tryMenu(x, y) {
      var el = document.elementFromPoint(x, y) || document.body;
      el.dispatchEvent(new MouseEvent('mousedown', { button: 2, buttons: 2, clientX: x, clientY: y, bubbles: true }));
      var ev = new MouseEvent('contextmenu', { clientX: x, clientY: y, bubbles: true, cancelable: true });
      el.dispatchEvent(ev);
      document.dispatchEvent(new MouseEvent('mouseup', { button: 2, bubbles: true }));
      return ev.defaultPrevented;
    }
    var onBobit = tryMenu(p.hit.x, p.hit.y);
    var offBobit = tryMenu(4, 4);
    return { onBobit: onBobit, offBobit: offBobit };
  }, pts2);
  assert.strictEqual(menus.onBobit, true, 'contextmenu must be suppressed on a Bobit');
  assert.strictEqual(menus.offBobit, false, 'contextmenu must work everywhere else');

  console.log('02-press: PASS');
  await browser.close();
})();
