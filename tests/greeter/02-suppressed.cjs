// The greeter's whole point is that he only nudges someone who missed the buttons. Each case
// here is a reason he must stay quiet. Every one of them parks him INSIDE his firing window
// (asserted, not assumed) and waits out the whole wave+turn, so a pass means he genuinely
// chose not to speak — not that the page was scrolled somewhere he never speaks from.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const SEQ = 2600;   // GREET_WAVE (1.8s) + GREET_TURN (0.35s) + slack

async function makePage(browser, init) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.addInitScript(function () {
    try { localStorage.removeItem('ev:greeted'); } catch (e) {}
    document.addEventListener('DOMContentLoaded', function () {
      document.documentElement.style.scrollBehavior = 'auto';
      // clicking a tool must not navigate away mid-test; the listeners still fire
      document.addEventListener('click', function (ev) {
        if (ev.target.closest && ev.target.closest('.logo-trigger')) ev.preventDefault();
      }, true);
    });
  });
  if (init) await page.addInitScript(init);
  await page.goto(URL);
  await page.waitForTimeout(400);
  return page;
}

// Is he standing where he would speak up, if nothing were stopping him? Every case below
// has to reach this, or it proves nothing. (Same numbers as GREET_* in ev-figures.js.)
const IN_WINDOW = function () {
  var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
  var top = e.c.getBoundingClientRect().top, ih = window.innerHeight;
  var btn = document.querySelector('.showcase-logos').getBoundingClientRect().bottom;
  return top > 70 && top + e.h < ih - 8 && btn > ih * 0.45 && Math.abs(window.scrollY) >= 60;
};

async function scrollDownInto(page) {
  for (let i = 0; i < 80; i++) {
    if (await page.evaluate(IN_WINDOW)) return true;
    await page.evaluate(function () { window.scrollBy(0, 40); });
    await page.waitForTimeout(50);
  }
  return false;
}

// same place, but arrived at from below — the only difference is the direction of travel
async function scrollUpInto(page) {
  await page.evaluate(function () { window.scrollTo(0, 2600); });
  await page.waitForTimeout(250);
  for (let i = 0; i < 90; i++) {
    if (await page.evaluate(IN_WINDOW)) return true;
    await page.evaluate(function () { window.scrollBy(0, -40); });
    await page.waitForTimeout(50);
  }
  return false;
}

async function quiet(page, label) {
  await page.waitForTimeout(SEQ);
  const out = await page.evaluate(function () {
    var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
    return {
      bubbles: document.querySelectorAll('.ev-quote').length,
      gi: e.gi == null ? null : e.gi,
      done: !!e.giDone
    };
  });
  assert.strictEqual(out.bubbles, 0, label + ': he opened a bubble anyway');
  assert.strictEqual(out.gi, null, label + ': he started the greeting anyway (' + out.gi + ')');
  assert.ok(!out.done, label + ': he ran the greeting anyway');
}

(async function () {
  const browser = await chromium.launch();

  // ── 1. he already greeted you THIS visit. Once per session, not once per browser: a
  //      returning visitor is exactly who "Good morning" and "Welcome back" are for.
  {
    const page = await makePage(browser, function () {
      try { sessionStorage.setItem('ev:greeted:session', '1'); } catch (e) {}
    });
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await quiet(page, 'already greeted this session');
    await page.close();
  }

  // ── 2. ...and having been here on a PREVIOUS visit is no longer a reason to stay quiet.
  //      This is the inverse of the case above and guards the change from being reverted.
  {
    const page = await makePage(browser, function () {
      try { localStorage.setItem('ev:greeted', '1'); } catch (e) {}
    });
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await page.waitForSelector('.ev-quote.in', { timeout: 6000 });
    await page.close();
  }

  // ── 3. nor is being signed in. It used to silence him entirely, which silenced exactly
  //      the visitor a personalized greeting is for.
  {
    const page = await makePage(browser, function () {
      window.addEventListener('load', function () {
        window.EVSession = { loggedIn: true, name: 'Chris' };
        window.dispatchEvent(new CustomEvent('ev:session'));
      });
    });
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await page.waitForSelector('.ev-quote.in', { timeout: 6000 });
    await page.close();
  }

  // ── 5. coming back UP to the hero: you are already looking at the buttons
  {
    const page = await makePage(browser);
    assert.ok(await scrollUpInto(page), 'could not bring him back into view from below');
    await quiet(page, 'scrolled back up');
    await page.close();
  }

  // ── 6. flicked past at speed. He starts to wave, the buttons leave the top of the screen
  //      mid-gesture, and he stands down without saying anything rather than finish a point at
  //      something that is no longer there. (He must actually have STARTED, or this is testing
  //      nothing — the trigger window and the abort are different conditions.)
  {
    const page = await makePage(browser);
    let started = false;
    for (let i = 0; i < 25 && !started; i++) {
      await page.evaluate(function () { window.scrollBy(0, 90); });
      await page.waitForTimeout(40);
      started = await page.evaluate(function () {
        var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
        return e.gi === 'wave';
      });
    }
    assert.ok(started, 'he never began the wave, so the abort was never exercised');
    for (let i = 0; i < 12; i++) {   // keep going: the column leaves the screen
      await page.evaluate(function () { window.scrollBy(0, 90); });
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(1400);
    const out = await page.evaluate(function () {
      var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
      return { bubbles: document.querySelectorAll('.ev-quote').length, gi: e.gi == null ? null : e.gi };
    });
    assert.strictEqual(out.bubbles, 0, 'flicked past: he spoke to an empty screen');
    // He is off-screen by now, and the draw loop culls him, so the arm-lowering he was in the
    // middle of cannot finish until he is on screen again. It must then finish, and he must not
    // start over: an entry parked in a greeting state forever is the dead end to watch for.
    assert.ok(out.gi === null || out.gi === 'settle', 'flicked past: left in ' + out.gi);
    await page.evaluate(function () { window.scrollTo(0, 200); });
    await page.waitForTimeout(1200);
    const back = await page.evaluate(function () {
      var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
      return { bubbles: document.querySelectorAll('.ev-quote').length, gi: e.gi == null ? null : e.gi, done: !!e.giDone };
    });
    assert.strictEqual(back.gi, null, 'back in view: still stuck in ' + back.gi);
    assert.ok(back.done, 'back in view: should be marked as done, not primed to try again');
    assert.strictEqual(back.bubbles, 0, 'back in view: he started over and spoke');
    await page.close();
  }

  // ── 7. and the control: with none of the above, he does greet. Without this the six
  //      assertions above would all pass on a greeter that never works at all.
  {
    const page = await makePage(browser);
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await page.waitForSelector('.ev-quote.in', { timeout: 6000 });
    await page.close();
  }

  console.log('02-suppressed: PASS');
  await browser.close();
})();
