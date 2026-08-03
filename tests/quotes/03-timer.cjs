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

  assert.strictEqual(await page.evaluate(function () { return window.EVQuotes.LIFE; }), 12,
    'lifetime should be 12 seconds');

  // runs down and closes, reporting the handle it closed
  const expiry = await page.evaluate(function () {
    var h = window.EVQuotes.open({ headX: 600, headY: 500, tone: '#007D99', quote: window.EVQuotes.QUOTES[0] });
    var closedEarly = window.EVQuotes.tick(11.5).length;
    var stillOpen = window.EVQuotes.openCount();
    var closedNow = window.EVQuotes.tick(0.6);
    return {
      closedEarly: closedEarly,
      stillOpen: stillOpen,
      closedNow: closedNow.length,
      sameHandle: closedNow[0] === h,
      remaining: window.EVQuotes.openCount()
    };
  });
  assert.strictEqual(expiry.closedEarly, 0, 'must not close before 12s');
  assert.strictEqual(expiry.stillOpen, 1);
  assert.strictEqual(expiry.closedNow, 1, 'must close once past 12s');
  assert.ok(expiry.sameHandle, 'tick must return the handle it closed');
  assert.strictEqual(expiry.remaining, 0);

  // setHeld(true) pauses it indefinitely — this is the figure-hover case
  const held = await page.evaluate(function () {
    window.EVQuotes.closeAll();
    var h = window.EVQuotes.open({ headX: 600, headY: 500, tone: '#007D99', quote: window.EVQuotes.QUOTES[1] });
    h.setHeld(true);
    for (var i = 0; i < 60; i++) window.EVQuotes.tick(1);   // a whole minute
    var survived = window.EVQuotes.openCount();
    h.setHeld(false);
    var closed = window.EVQuotes.tick(12.1).length;
    return { survived: survived, closed: closed };
  });
  assert.strictEqual(held.survived, 1, 'a held bubble must never expire');
  assert.strictEqual(held.closed, 1, 'releasing the hold lets it expire again');

  // pointer over the bubble pauses it without the figure code doing anything
  const hovered = await page.evaluate(function () {
    window.EVQuotes.closeAll();
    var h = window.EVQuotes.open({ headX: 600, headY: 500, tone: '#007D99', quote: window.EVQuotes.QUOTES[2] });
    h.el.dispatchEvent(new MouseEvent('mouseenter'));
    for (var i = 0; i < 30; i++) window.EVQuotes.tick(1);
    var survived = window.EVQuotes.openCount();
    h.el.dispatchEvent(new MouseEvent('mouseleave'));
    var closed = window.EVQuotes.tick(12.1).length;
    return { survived: survived, closed: closed };
  });
  assert.strictEqual(hovered.survived, 1, 'pointer-over-bubble must pause the timer');
  assert.strictEqual(hovered.closed, 1);

  // keyboard focus inside the bubble also pauses it
  const focused = await page.evaluate(function () {
    window.EVQuotes.closeAll();
    var h = window.EVQuotes.open({ headX: 600, headY: 500, tone: '#007D99', quote: window.EVQuotes.QUOTES[3] });
    h.el.querySelector('a').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    for (var i = 0; i < 30; i++) window.EVQuotes.tick(1);
    return window.EVQuotes.openCount();
  });
  assert.strictEqual(focused, 1, 'focus inside the bubble must pause the timer');

  // several bubbles each run their own clock
  const many = await page.evaluate(function () {
    window.EVQuotes.closeAll();
    var a = window.EVQuotes.open({ headX: 300, headY: 500, tone: '#007D99', quote: window.EVQuotes.QUOTES[0] });
    window.EVQuotes.tick(8);
    var b = window.EVQuotes.open({ headX: 900, headY: 500, tone: '#FF5740', quote: window.EVQuotes.QUOTES[1] });
    var firstOut = window.EVQuotes.tick(4.5);        // a expires, b has only had 4.5s
    return { count: window.EVQuotes.openCount(), closed: firstOut.length, wasA: firstOut[0] === a };
  });
  assert.strictEqual(many.closed, 1, 'only the older bubble should expire');
  assert.ok(many.wasA);
  assert.strictEqual(many.count, 1, 'the newer bubble stays open');

  // double-close must not throw or double-remove
  await page.evaluate(function () {
    window.EVQuotes.closeAll();
    var h = window.EVQuotes.open({ headX: 600, headY: 500, tone: '#007D99', quote: window.EVQuotes.QUOTES[0] });
    window.EVQuotes.close(h);
    window.EVQuotes.close(h);
  });

  console.log('03-timer: PASS');
  await browser.close();
})();
