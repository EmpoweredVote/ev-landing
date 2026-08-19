// The greeter Bobit (the hero presenter) waves, points at the tool buttons and opens a
// speech bubble when you scroll past him WITHOUT ever having highlighted a button.
// This suite locks the firing conditions; 03-sequence covers the poses and the dismissals.
//
// Loaded with #figdebug so window.__evFigDebug.entries is available. #figdebug does NOT
// bypass the suppression rules (only #greeter does), so everything asserted here is the
// behaviour a real first-time visitor gets.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const SAY = 'Hi there! If you want to start off exploring our features, you can press one of those buttons up there!';

async function makePage(browser, width, init) {
  const page = await browser.newPage({ viewport: { width: width, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  // a first-time visitor: nothing remembered, and smooth scrolling off so scrollY is
  // readable synchronously (index.html sets scroll-behavior:smooth on <html>)
  await page.addInitScript(function () {
    try { localStorage.removeItem('ev:greeted'); } catch (e) {}
    document.addEventListener('DOMContentLoaded', function () {
      document.documentElement.style.scrollBehavior = 'auto';
    });
  });
  if (init) await page.addInitScript(init);
  await page.goto(URL);
  await page.waitForTimeout(400);
  return page;
}

// Scroll down until he has risen into view with the buttons still above him — his window
// (see GREET_* in ev-figures.js). Stepped, so the draw loop actually gets frames inside it.
// Returns false unless we finished INSIDE the window, so a suite can never pass by having
// scrolled somewhere he was never going to speak from.
async function scrollIntoWindow(page) {
  for (let i = 0; i < 80; i++) {
    const at = await page.evaluate(function () {
      var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
      var top = e.c.getBoundingClientRect().top, ih = window.innerHeight;
      var btn = document.querySelector('.showcase-logos').getBoundingClientRect().bottom;
      if (top > 70 && top + e.h < ih - 8 && btn > ih * 0.45 && window.scrollY >= 60) return true;
      window.scrollBy(0, 40);
      return false;
    });
    if (at) return true;
    await page.waitForTimeout(50);
  }
  return false;
}

(async function () {
  const browser = await chromium.launch();
  const page = await makePage(browser, 1280);

  const start = await page.evaluate(function () {
    var d = window.__evFigDebug;
    var e = d && d.entries.find(function (x) { return x.spec.presenter; });
    return {
      debug: !!d,
      found: !!e,
      gi: e ? (e.gi == null ? null : e.gi) : 'no-entry',
      bubbles: document.querySelectorAll('.ev-quote').length,
      seen: localStorage.getItem('ev:greeted')
    };
  });
  assert.ok(start.debug, '#figdebug must expose __evFigDebug');
  assert.ok(start.found, 'the hero presenter must be in the cast (he is an always-on anchor)');
  assert.strictEqual(start.gi, null, 'he must not start the greeting before any scrolling');
  assert.strictEqual(start.bubbles, 0, 'no bubble before he is walked past');
  assert.strictEqual(start.seen, null, 'nothing remembered yet');

  assert.ok(await scrollIntoWindow(page), 'could not reach the greeting window');

  // He speaks a beat into the wave (GREET_SAY_AT = 0.55s), not after the whole gesture.
  // Assert that directly: the bubble must be open while he is still waving, because the
  // whole point of the change is that a reader who does not stop scrolling still sees it.
  const t0 = Date.now();
  await page.waitForSelector('.ev-quote.in', { timeout: 6000 });
  const openedAfter = Date.now() - t0;
  const stateAtOpen = await page.evaluate(function () {
    var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
    return e.gi;
  });
  assert.strictEqual(stateAtOpen, 'wave', 'the bubble must open mid-wave, not after the point');
  assert.ok(openedAfter < 2000, 'text took ' + openedAfter + 'ms to appear; it should be ~0.6s');

  // then he finishes the wave and turns to point, and the bubble stays up through it
  await page.waitForFunction(function () {
    var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
    return e.gi === 'hold';
  }, { timeout: 6000 });

  const fired = await page.evaluate(function () {
    // Ask the pixels where he actually is rather than re-deriving the rig's geometry (the
    // figure canvases are pure vector, so getImageData works even under file://).
    // Pointing straight up, his hand stops just short of his head top, so in the holding
    // pose the topmost ink IS the top of his head.
    function inkTop(c) {
      var px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      var ratio = c.height / c.getBoundingClientRect().height;   // backing store -> CSS px
      for (var y = 0; y < c.height; y++) {
        for (var x = 0; x < c.width; x++) if (px[(y * c.width + x) * 4 + 3] > 24) return y / ratio;
      }
      return -1;
    }
    var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
    var el = document.querySelector('.ev-quote');
    var r = el.getBoundingClientRect();
    var cr = e.c.getBoundingClientRect();
    return {
      gi: e.gi,
      hasHandle: !!e.gh,
      text: (el.querySelector('.say') || el.querySelector('q')).textContent,
      hasAttrib: !!el.querySelector('.attrib'),
      tag: (el.querySelector('.say') || el.querySelector('q')).tagName,
      top: r.top, bottom: r.bottom, left: r.left, right: r.right,
      inkTop: inkTop(e.c) + cr.top,   // his topmost painted pixel, in viewport coords
      btnBottom: document.querySelector('.showcase-logos').getBoundingClientRect().bottom,
      winW: window.innerWidth, winH: window.innerHeight,
      seen: localStorage.getItem('ev:greeted'),
      count: document.querySelectorAll('.ev-quote').length
    };
  });

  assert.strictEqual(fired.gi, 'hold', 'he holds the point while the bubble is open');
  assert.ok(fired.hasHandle, 'the entry must keep the bubble handle so it can dismiss it');
  assert.strictEqual(fired.text, SAY, 'greeting text must be exact, got: ' + fired.text);
  assert.ok(!fired.hasAttrib, 'a greeting has no source to attribute');
  assert.strictEqual(fired.count, 1, 'exactly one bubble');

  // it is no good if it opens off-screen — the whole point is that he is still visible
  assert.ok(fired.top >= 0, 'bubble opened above the viewport top: ' + fired.top);
  assert.ok(fired.bottom <= fired.winH, 'bubble hangs below the fold: ' + fired.bottom);
  assert.ok(fired.left >= 0 && fired.right <= fired.winW + 1,
    'bubble outside the viewport horizontally: ' + fired.left + '..' + fired.right);
  // the tail hangs 14px below the bubble, so its tip should land on his head — a bubble
  // floating in space, or overlapping him, is the failure this catches
  assert.ok(fired.inkTop > 0, 'nothing painted on the presenter canvas');
  assert.ok(Math.abs((fired.bottom + 14) - fired.inkTop) <= 8,
    'tail tip should touch his head: tip ' + (fired.bottom + 14) + ' vs ink top ' + fired.inkTop);

  // The one that a screenshot caught and none of the state assertions could: he must be
  // saying "one of those buttons up there" while there are still buttons up there. The first
  // trigger fired when HE was leaving the screen, by which time the column was long gone and
  // he was pointing a straight arm at the site banner.
  assert.ok(fired.btnBottom > fired.winH * 0.4,
    'the buttons he is pointing at have scrolled away: column bottom at ' + fired.btnBottom +
    ' of ' + fired.winH);

  assert.strictEqual(fired.seen, '1', 'greeting must be remembered so he does not do it again');

  // ...and he only does it once per page load, even if you scroll back and forth
  await page.evaluate(function () { window.scrollTo(0, 0); });
  await page.waitForTimeout(300);
  await scrollIntoWindow(page);
  await page.waitForTimeout(2600);
  const again = await page.evaluate(function () {
    return document.querySelectorAll('.ev-quote').length;
  });
  assert.ok(again <= 1, 'he must not stack a second bubble, found ' + again);

  console.log('01-fires: PASS');
  await browser.close();
})();
