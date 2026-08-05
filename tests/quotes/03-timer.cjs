// Quote bubbles have NO auto-expiry: one stays up until the next tap dismisses it.
//
// This file used to assert a 12s lifetime and all of its pause hooks (hover, figure-hold, keyboard
// focus), which existed to stop the clock running out while you were still reading. On a phone that
// clock was the problem rather than the fix — a quote could vanish before you got to it — so LIFE is 0
// now and `tick` never closes anything on its own. Dismissal was already covered elsewhere: ev-figures
// closes every open bubble on a tap that is not on a reader or a bubble, and on Escape.
//
// So what has to be true now is the opposite of what this file used to check: no amount of time closes
// a bubble, and closing still works when it is asked for.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html';

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.EVQuotes; });

  assert.strictEqual(await page.evaluate(function () { return window.EVQuotes.LIFE; }), 0,
    'LIFE must be 0 — anything else is an auto-expiry, and a bubble is meant to survive until a tap');

  // no amount of ticking closes it
  const patient = await page.evaluate(function () {
    window.EVQuotes.closeAll();
    var h = window.EVQuotes.open({ headX: 600, headY: 500, tone: '#007D99', quote: window.EVQuotes.QUOTES[0] });
    var closed = 0;
    for (var i = 0; i < 300; i++) closed += window.EVQuotes.tick(1).length;   // five minutes
    return { closed: closed, open: window.EVQuotes.openCount(), attached: !!h.el.parentNode };
  });
  assert.strictEqual(patient.closed, 0, 'tick closed a bubble after 300s — there must be no clock');
  assert.strictEqual(patient.open, 1, 'the bubble should still be open after five minutes of ticking');
  assert.ok(patient.attached, 'the bubble element left the DOM without being closed');

  // the pause hooks are harmless no-ops now: still callable, and still nothing expires afterwards
  const paused = await page.evaluate(function () {
    window.EVQuotes.closeAll();
    var h = window.EVQuotes.open({ headX: 600, headY: 500, tone: '#007D99', quote: window.EVQuotes.QUOTES[1] });
    h.setHeld(true);
    window.EVQuotes.tick(60);
    h.setHeld(false);
    var afterRelease = window.EVQuotes.tick(60).length;
    h.el.dispatchEvent(new MouseEvent('mouseenter'));
    window.EVQuotes.tick(60);
    h.el.dispatchEvent(new MouseEvent('mouseleave'));
    var afterLeave = window.EVQuotes.tick(60).length;
    return { afterRelease: afterRelease, afterLeave: afterLeave, open: window.EVQuotes.openCount() };
  });
  assert.strictEqual(paused.afterRelease, 0, 'releasing a hold must not start a countdown');
  assert.strictEqual(paused.afterLeave, 0, 'the pointer leaving must not start a countdown');
  assert.strictEqual(paused.open, 1, 'the bubble closed itself somewhere in the pause hooks');

  // and it still closes when asked
  const dismissed = await page.evaluate(function () {
    var before = window.EVQuotes.openCount();
    window.EVQuotes.closeAll();
    return { before: before, after: window.EVQuotes.openCount() };
  });
  assert.strictEqual(dismissed.before, 1);
  assert.strictEqual(dismissed.after, 0,
    'closeAll must still close everything — no clock does not mean unclosable');

  // A tap on empty page area closes it too. That is the real dismissal path on a phone, and it lives in
  // ev-figures rather than ev-quotes, so this drives the document the way a finger would.
  const tapped = await page.evaluate(function () {
    window.EVQuotes.open({ headX: 600, headY: 500, tone: '#007D99', quote: window.EVQuotes.QUOTES[2] });
    var open = window.EVQuotes.openCount();
    document.dispatchEvent(new MouseEvent('click', { clientX: 4, clientY: 4, bubbles: true }));
    return { open: open, after: window.EVQuotes.openCount() };
  });
  assert.strictEqual(tapped.open, 1);
  assert.strictEqual(tapped.after, 0,
    'a tap on empty page area must dismiss the bubble — with no clock, this is the only way it closes');

  console.log('03-timer: PASS (no auto-expiry; closes on closeAll and on a tap)');
  await browser.close();
})();
