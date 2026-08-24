// The two-beat greeting: a welcome while he waves, the nudge when his arm lands. Every case
// pins the tags with ?evlines= so a run in October does not get the Halloween line, and each
// asserts the SEQUENCE (which bubble, when, and how many) rather than just the end state.
//
// The beat-2 selection table lives in tests/lines/01-select.cjs. What is tested here is that
// the draw loop asks at the right moment and swaps correctly — not what the answer is.
const { chromium } = require('playwright');
const assert = require('assert');

const BASE = 'file:///C:/ev-landing/ev-landing-main/index.html';
const BEAT1 = 'Hi there. Welcome to Empowered Vote.';
const BEAT2 = 'Press one of those buttons up there to start exploring.';

async function makePage(browser, tags, init) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.addInitScript(function () {
    try { sessionStorage.removeItem('ev:greeted:session'); } catch (e) {}
    try { localStorage.removeItem('ev:greeted'); } catch (e) {}
    document.addEventListener('DOMContentLoaded', function () {
      document.documentElement.style.scrollBehavior = 'auto';
      document.addEventListener('click', function (ev) {
        if (ev.target.closest && ev.target.closest('.logo-trigger')) ev.preventDefault();
      }, true);
    });
  });
  if (init) await page.addInitScript(init);
  await page.goto(BASE + '?evlines=' + tags + '#figdebug');
  await page.waitForTimeout(400);
  return page;
}

// A page with NO ?evlines= at all, used only by the real-wire case below. ev-lines.js's
// `forced` short-circuit in context() is a full REPLACEMENT of the tag array, not a merge —
// `if (forced) { c.tags = forced.slice(); return c; }` returns before the predicate loop runs
// at all. That means ?evlines=first-visit,guest, or any other forced list, makes it IMPOSSIBLE
// for `tools-found` to ever appear in tags, no matter what a real hover does to featureEverOn —
// forcing any tags and exercising the real tools-found wire are mutually exclusive on this
// page. So the real-wire case cannot pin the tags; it has to let them derive for real, which
// also means beat 1's exact wording is whatever the wall clock's time-of-day predicate
// currently picks, not a fixed string — see the comment at that case for how it copes.
async function makeUnforcedPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.addInitScript(function () {
    try { sessionStorage.removeItem('ev:greeted:session'); } catch (e) {}
    try { localStorage.removeItem('ev:greeted'); } catch (e) {}
    document.addEventListener('DOMContentLoaded', function () {
      document.documentElement.style.scrollBehavior = 'auto';
      document.addEventListener('click', function (ev) {
        if (ev.target.closest && ev.target.closest('.logo-trigger')) ev.preventDefault();
      }, true);
    });
  });
  await page.goto(BASE + '#figdebug');
  await page.waitForTimeout(400);
  return page;
}

const STATE = function () {
  var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
  var el = document.querySelector('.ev-quote .say');
  return {
    gi: e.gi == null ? null : e.gi,
    beat: e.giBeat == null ? null : e.giBeat,
    total: e.giTotal || 0,
    bubbles: document.querySelectorAll('.ev-quote').length,
    text: el ? el.textContent : null
  };
};

async function scrollDownInto(page) {
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

async function untilBeat(page, n, ms) {
  await page.waitForFunction(function (want) {
    var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
    return e.giBeat === want;
  }, n, { timeout: ms || 8000 });
}

(async function () {
  const browser = await chromium.launch();

  // ── 1. the full sequence, and never two bubbles at once
  {
    const page = await makePage(browser, 'first-visit,guest');
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 1);
    const one = await page.evaluate(STATE);
    assert.strictEqual(one.gi, 'wave', 'beat 1 opens during the wave, not after it');
    assert.strictEqual(one.text, BEAT1, 'beat 1 text: ' + one.text);
    assert.strictEqual(one.bubbles, 1, 'exactly one bubble at beat 1');

    // sample hard across the swap: two bubbles over one head, even for a frame, is a bug
    let maxBubbles = 0;
    for (let i = 0; i < 40; i++) {
      const s = await page.evaluate(STATE);
      maxBubbles = Math.max(maxBubbles, s.bubbles);
      if (s.beat === 2) break;
      await page.waitForTimeout(60);
    }
    assert.strictEqual(maxBubbles, 1, 'two bubbles were live at once during the swap');

    await untilBeat(page, 2);
    const two = await page.evaluate(STATE);
    assert.strictEqual(two.text, BEAT2, 'beat 2 text: ' + two.text);
    assert.strictEqual(two.bubbles, 1, 'exactly one bubble at beat 2');
    // 2.35s from the start of the wave, and never before the arm has arrived (1.55s)
    assert.ok(two.total >= 2.3, 'beat 2 came early, at ' + two.total.toFixed(2) + 's');
    assert.ok(two.gi === 'hold', 'beat 2 must land while he holds the point, not mid-turn');

    // and beat 2 stays: LIFE is 0, so bubbles wait for a tap rather than expiring
    await page.waitForTimeout(1500);
    const still = await page.evaluate(STATE);
    assert.strictEqual(still.text, BEAT2, 'beat 2 must not expire on its own');
    await page.close();
  }

  // ── 2. dismissal cancels the pending swap. This is the failure mode the split invents:
  //      a click at 1.0s getting a bubble back at 2.35s, just after you got rid of one.
  {
    const page = await makePage(browser, 'first-visit,guest');
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 1);
    await page.mouse.click(5, 5);          // click-off: nowhere near him or the bubble
    // EVQuotes.close() drops the "in" class immediately but defers the node's removal by
    // 260ms so an ordinary dismissal can fade out; 200ms here would catch it mid-fade and
    // fail even on a correct dismissal, so wait past that window.
    await page.waitForTimeout(350);
    const gone = await page.evaluate(STATE);
    assert.strictEqual(gone.bubbles, 0, 'the click-off must close beat 1');
    await page.waitForTimeout(2600);       // well past GREET_SAY2_AT
    const after = await page.evaluate(STATE);
    assert.strictEqual(after.bubbles, 0, 'beat 2 popped back after a dismissal');
    await page.close();
  }

  // ── 3. Escape, same rule
  {
    const page = await makePage(browser, 'first-visit,guest');
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 1);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2600);
    assert.strictEqual((await page.evaluate(STATE)).bubbles, 0, 'beat 2 popped back after Escape');
    await page.close();
  }

  // ── 4. found the tools: he still greets, and then says nothing more. Beat 1 must STAY —
  //      closing it to open nothing would take the welcome away for no reason.
  //
  //      Forcing the 'tools-found' tag with ?evlines= (as this case used to) bypasses
  //      greetFacts() entirely, so it never exercises the actual wire: a hover setting
  //      featureEverOn -> greetFacts() reporting toolsFound -> ev-lines.js turning that into
  //      the tools-found tag -> the beat-2 line list matching `{ id: null }` first. A stub or
  //      a typo anywhere in that chain would still pass a test that only ever forces the tag
  //      at the end of it. So instead: no ?evlines= at all (see makeUnforcedPage above for why
  //      pinning ANY tag here would have silently defeated this case), then hover the real
  //      trigger element before scrolling — the exact setup a since-deleted case in
  //      02-suppressed.cjs used, so it is proven to reach the firing window from here.
  //
  //      With tags deriving for real, beat 1's exact wording depends on the wall clock (one of
  //      greet.morning/afternoon/evening — see PREDICATES in ev-lines.js), so this case cannot
  //      pin it to the BEAT1 constant the way the other cases do. It captures whatever beat 1
  //      actually said instead, and asserts that the SAME text is still showing after beat 2's
  //      window passes — which is the thing "beat 1 survives" actually means, and does not
  //      depend on which greeting the clock picked.
  {
    const page = await makeUnforcedPage(browser);
    await page.hover('.showcase-logos .logo-trigger');
    // Confirm the hover actually registered on the canvas side before trusting anything
    // downstream of it — the same debug hook the deleted case asserted against.
    const hovered = await page.evaluate(function () { return window.__evFigDebug.toolsFound(); });
    assert.ok(hovered, 'the hover must register as featureEverOn before we scroll');
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 1);
    const one = await page.evaluate(STATE);
    assert.strictEqual(one.bubbles, 1, 'beat 1 must still open');
    assert.ok(one.text, 'beat 1 must have said something');
    await page.waitForTimeout(2600);
    const s = await page.evaluate(STATE);
    assert.strictEqual(s.beat, 2, 'beat 2 must be marked done so it is not asked every frame');
    assert.strictEqual(s.bubbles, 1, 'beat 1 must stay up when there is no nudge');
    assert.strictEqual(s.text, one.text, 'the surviving bubble must still be beat 1\'s welcome, unchanged: ' + s.text);
    await page.close();
  }

  // ── 4b. the forced-tag version kept alongside the real-wire case above: quick to read,
  //       and still worth having so a change to the line-selection table itself is caught
  //       without needing a working hover setup.
  {
    const page = await makePage(browser, 'first-visit,guest,tools-found');
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 1);
    await page.waitForTimeout(2600);
    const s = await page.evaluate(STATE);
    assert.strictEqual(s.beat, 2, 'beat 2 must be marked done so it is not asked every frame');
    assert.strictEqual(s.bubbles, 1, 'beat 1 must stay up when there is no nudge');
    assert.strictEqual(s.text, BEAT1, 'the surviving bubble must be the welcome: ' + s.text);
    await page.close();
  }

  // ── 5. the column has scrolled off: the nudge stops telling them to press it
  {
    const page = await makePage(browser, 'first-visit,guest,buttons-gone');
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 2);
    const s = await page.evaluate(STATE);
    assert.ok(/back up the page/.test(s.text), 'expected the scrolled-off nudge, got: ' + s.text);
    await page.close();
  }

  // ── 6. a signed-in visitor is greeted by name, and gets the SAME nudge as a stranger.
  //      The second half is the regression guard: a personalized nudge is the obvious
  //      thing for someone to add back, and it was tried and cut.
  //
  //      window.EVSession is NOT set via an init script here. index.html's auth block calls
  //      showLoggedOut() when the silent-SSO fetch fails — and every http(s) request in these
  //      tests is aborted, so it always fails, and it would overwrite an init-script value
  //      with { loggedIn: false, name: null } before the greeter ever reads it. Setting it
  //      after the page has settled (the aborted fetch rejects immediately, well within
  //      makePage's 400ms wait) and before we scroll avoids that race entirely.
  {
    const page = await makePage(browser, 'returning,logged-in,named');
    await page.evaluate(function () {
      window.EVSession = { loggedIn: true, name: 'Chris' };
    });
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 1);
    assert.strictEqual((await page.evaluate(STATE)).text, 'Welcome back, Chris.',
      'a known visitor is greeted by name');
    await untilBeat(page, 2);
    assert.strictEqual((await page.evaluate(STATE)).text, BEAT2,
      'the nudge must not be personalized');
    await page.close();
  }

  console.log('04-beats: PASS');
  await browser.close();
})();
