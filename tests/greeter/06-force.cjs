// #greeter is the escape hatch: it exists so you can re-see the greeting without clearing
// storage or opening a private window. It used to fail in the one situation you actually reach
// for it — after a reload — because greetReady() checked `!scrollDown` BEFORE it checked the
// force flag. A reload restores the scroll position, so no scroll event fires, so scrollDown
// stayed false and the override was never reached. Chris found this by having to use incognito.
//
// Also pins the beat-1 dwell, which is the other thing he reported: the nudge used to replace
// the welcome after 1.8s, which read as too fast to finish reading it.
const { chromium } = require('playwright');
const assert = require('assert');

const FORCE = 'file:///C:/ev-landing/ev-landing-main/index.html?evlines=first-visit,guest#greeter';

async function makePage(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.addInitScript(function () {
    document.addEventListener('DOMContentLoaded', function () {
      document.documentElement.style.scrollBehavior = 'auto';
    });
  });
  await page.goto(FORCE);
  await page.waitForTimeout(400);
  return page;
}

// Scroll down into his firing window. Returns the number of 40px steps it took, so a caller
// can tell "already there, never scrolled" (0) from "had to travel" (>0) — that distinction is
// the whole bug.
async function scrollDownInto(page) {
  for (let i = 0; i < 90; i++) {
    const at = await page.evaluate(function () {
      var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
      var top = e.c.getBoundingClientRect().top, ih = window.innerHeight;
      var btn = document.querySelector('.showcase-logos').getBoundingClientRect().bottom;
      return top > 70 && top + e.h < ih - 8 && btn > ih * 0.45 && window.scrollY >= 60;
    });
    if (at) return i;
    await page.evaluate(function () { window.scrollBy(0, 40); });
    await page.waitForTimeout(45);
  }
  return -1;
}

const BUBBLES = function () { return document.querySelectorAll('.ev-quote').length; };

(async function () {
  const browser = await chromium.launch();

  // ── 1. #greeter greets on a first load. The control: without this the rest proves nothing.
  {
    const page = await makePage(browser);
    assert.ok(await scrollDownInto(page) >= 0, 'could not reach the greeting window');
    await page.waitForSelector('.ev-quote.in', { timeout: 6000 });
    await page.close();
  }

  // ── 2. THE BUG. Reload with #greeter still in the URL. Chromium restores the scroll
  //      position, so he is already in his window and NO scroll event fires — which is
  //      exactly the state that used to silence him.
  {
    const page = await makePage(browser);
    assert.ok(await scrollDownInto(page) >= 0, 'could not reach the greeting window');
    await page.waitForSelector('.ev-quote.in', { timeout: 6000 });
    await page.reload();
    await page.waitForTimeout(500);
    // Assert the precondition rather than hoping for it: he must already be in the window
    // with no travel needed, or this is not the case that was broken.
    const steps = await scrollDownInto(page);
    assert.strictEqual(steps, 0,
      'the reload did not restore the scroll position, so this run does not exercise the bug ' +
      '(needed ' + steps + ' scroll steps)');
    await page.waitForFunction(function () {
      return document.querySelectorAll('.ev-quote').length > 0;
    }, { timeout: 6000 }).catch(function () {});
    assert.strictEqual(await page.evaluate(BUBBLES), 1,
      '#greeter must still greet after a reload — it is the one case you use it for');
    await page.close();
  }

  // ── 3. ...and he greets after a reload WITHOUT #greeter too. The stored gate is gone: he
  //      speaks once per page load, and the variety in the line pools is what keeps that from
  //      being repetitive. A stale session key from the old build must not silence him.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.route('**/*', function (r) {
      return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
    });
    await page.addInitScript(function () {
      try { sessionStorage.setItem('ev:greeted:session', '1'); } catch (e) {}
      document.addEventListener('DOMContentLoaded', function () {
        document.documentElement.style.scrollBehavior = 'auto';
      });
    });
    await page.goto('file:///C:/ev-landing/ev-landing-main/index.html?evlines=first-visit,guest,needs-tools#figdebug');
    await page.waitForTimeout(400);
    assert.ok(await scrollDownInto(page) >= 0, 'could not reach the greeting window');
    await page.waitForSelector('.ev-quote.in', { timeout: 6000 });
    assert.strictEqual(await page.evaluate(BUBBLES), 1,
      'a stale session key must not silence him now that the gate is gone');
    await page.close();
  }

  // ── 4. Coming back UP to the hero still must not greet, even with #greeter. The force flag
  //      is for re-seeing it, not for defeating the "not on the way up" rule — being flagged
  //      down while scrolling up reads as nagging (see the comment at ev-figures.js:43).
  {
    const page = await makePage(browser);
    await page.evaluate(function () { window.scrollTo(0, 2600); });
    await page.waitForTimeout(300);
    let reached = false;
    for (let i = 0; i < 90 && !reached; i++) {
      reached = await page.evaluate(function () {
        var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
        var top = e.c.getBoundingClientRect().top, ih = window.innerHeight;
        var btn = document.querySelector('.showcase-logos').getBoundingClientRect().bottom;
        if (top > 70 && top + e.h < ih - 8 && btn > ih * 0.45 && window.scrollY >= 60) return true;
        window.scrollBy(0, -40);
        return false;
      });
      await page.waitForTimeout(45);
    }
    assert.ok(reached, 'could not bring him back into view from below');
    await page.waitForTimeout(3200);
    assert.strictEqual(await page.evaluate(BUBBLES), 0,
      'arriving from below must stay quiet even with #greeter');
    await page.close();
  }

  // ── 5. The dwell. Beat 1 must stay up long enough to read before the nudge takes its place.
  //      1.8s was the shipped value and read as too fast; the floor here is what a reader gets.
  {
    const page = await makePage(browser);
    assert.ok(await scrollDownInto(page) >= 0, 'could not reach the greeting window');
    await page.waitForFunction(function () {
      var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
      return e.giBeat === 1;
    }, { timeout: 6000 });
    const openedAt = Date.now();
    await page.waitForFunction(function () {
      var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
      return e.giBeat === 2;
    }, { timeout: 9000 });
    const dwell = Date.now() - openedAt;
    // Measured wall-clock, so allow for the polling granularity on the low side only.
    assert.ok(dwell >= 2150,
      'beat 1 was replaced after only ' + dwell + 'ms; it must hold for at least ~2.3s');
    assert.ok(dwell < 4000,
      'beat 1 held for ' + dwell + 'ms, far longer than intended — check GREET_SAY2_AT');
    await page.close();
  }

  console.log('06-force: PASS');
  await browser.close();
})();
