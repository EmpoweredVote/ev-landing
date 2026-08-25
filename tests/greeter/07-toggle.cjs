// Click him to bring back what he just said, click him again to put it away. Before this,
// a click was a one-way door: it dismissed the bubble and he was silent for the rest of the
// page load, so a line you were still reading when you tapped was gone for good.
//
// What is under test is the TOGGLE and what it remembers — not which line the data file
// picks, which belongs to tests/lines/01-select.cjs. Tags are pinned with ?evlines= so beat 2
// is the button nudge and not one of the twenty tips.
const { chromium } = require('playwright');
const assert = require('assert');

const BASE = 'file:///C:/ev-landing/ev-landing-main/index.html';
const TAGS = 'first-visit,guest,needs-tools';
const BEAT1 = 'Hi there. Welcome to Empowered Vote.';
const BEAT2 = 'Press one of those buttons up there to start exploring.';

// EVQuotes.close() drops the "in" class at once but leaves the node mounted for 260ms so an
// ordinary dismissal can fade out. Anything shorter than that here would catch the fade and
// fail on a perfectly correct close.
const FADE = 350;

async function makePage(browser) {
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
  await page.goto(BASE + '?evlines=' + TAGS + '#figdebug');
  await page.waitForTimeout(400);
  return page;
}

const STATE = function () {
  var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
  var el = document.querySelector('.ev-quote .say');
  return {
    gi: e.gi == null ? null : e.gi,
    done: !!e.giDone,
    beat: e.giBeat == null ? null : e.giBeat,
    said: e.giSaid ? { at: e.giSaid.at, id: e.giSaid.id, text: e.giSaid.text } : null,
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

// Arrive at him from BELOW, which is the one way to be looking straight at him and get no
// greeting: greetReady() refuses on an upward scroll, because being flagged down on the way
// back up reads as nagging. The jump to the bottom is a single scrollTo rather than a walk,
// so no drawn frame ever catches him inside the firing window on the way past.
async function scrollUpInto(page) {
  await page.evaluate(function () { window.scrollTo(0, document.body.scrollHeight); });
  await page.waitForTimeout(150);
  for (let i = 0; i < 120; i++) {
    const at = await page.evaluate(function () {
      var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
      var top = e.c.getBoundingClientRect().top, ih = window.innerHeight;
      if (top > 70 && top + e.h < ih - 8) return true;
      window.scrollBy(0, -40);
      return false;
    });
    if (at) return true;
    await page.waitForTimeout(50);
  }
  return false;
}

// His click box, from the anchor the draw loop writes every frame: 40px either side of his
// centre, from 104px above his feet down to 8px below them. Mid-body, well under the bubble.
async function clickHim(page) {
  const at = await page.evaluate(function () {
    var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
    return { x: e._prSX, y: e._prFY - 60 };
  });
  await page.mouse.click(at.x, at.y);
}

async function untilBeat(page, n, ms) {
  await page.waitForFunction(function (want) {
    var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
    return e.giBeat === want;
  }, n, { timeout: ms || 8000 });
}

(async function () {
  const browser = await chromium.launch();

  // ── 1. off, on, off. The whole feature in one case: the nudge comes back word for word,
  //      and a third click puts it away again.
  {
    const page = await makePage(browser);
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 2);
    const two = await page.evaluate(STATE);
    assert.strictEqual(two.text, BEAT2, 'beat 2 text: ' + two.text);

    await clickHim(page);
    await page.waitForTimeout(FADE);
    const off = await page.evaluate(STATE);
    assert.strictEqual(off.bubbles, 0, 'clicking him must close the bubble');
    assert.ok(off.said, 'he must REMEMBER the line he just closed');

    await clickHim(page);
    await page.waitForTimeout(FADE);
    const on = await page.evaluate(STATE);
    assert.strictEqual(on.bubbles, 1, 'the second click must bring the line back');
    assert.strictEqual(on.text, BEAT2, 'the line that came back was: ' + on.text);

    await clickHim(page);
    await page.waitForTimeout(FADE);
    assert.strictEqual((await page.evaluate(STATE)).bubbles, 0, 'a third click must close it again');
    await page.close();
  }

  // ── 2. THE LAST LINE HE SHOWED, not always beat 2. Dismiss during the welcome and the
  //      welcome is what comes back — and the nudge must not then arrive on its old timer,
  //      which is the failure the beat split invented and this feature could re-open.
  {
    const page = await makePage(browser);
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 1);
    await clickHim(page);
    await page.waitForTimeout(FADE);
    assert.strictEqual((await page.evaluate(STATE)).bubbles, 0, 'the click must close beat 1');

    await clickHim(page);
    await page.waitForTimeout(FADE);
    const back = await page.evaluate(STATE);
    assert.strictEqual(back.bubbles, 1, 'the welcome must come back');
    assert.strictEqual(back.text, BEAT1, 'expected the welcome, got: ' + back.text);

    await page.waitForTimeout(3000);                   // well past GREET_SAY2_AT
    const later = await page.evaluate(STATE);
    assert.strictEqual(later.bubbles, 1, 'a re-shown welcome must not gain a second bubble');
    assert.strictEqual(later.text, BEAT1, 'the nudge swapped itself in after a re-show');
    await page.close();
  }

  // ── 3. He has not spoken at all, because you came up to him from below. A click starts the
  //      greeting rather than doing nothing — clicking a Bobit should never be inert.
  {
    const page = await makePage(browser);
    assert.ok(await scrollUpInto(page), 'could not reach him from below');
    const quiet = await page.evaluate(STATE);
    assert.strictEqual(quiet.bubbles, 0, 'arriving from below must not greet you');
    assert.strictEqual(quiet.gi, null, 'he must not be mid-greeting yet');
    assert.strictEqual(quiet.done, false, 'he must not have greeted yet');

    await clickHim(page);
    await page.waitForSelector('.ev-quote.in', { timeout: 6000 });
    const started = await page.evaluate(STATE);
    assert.strictEqual(started.bubbles, 1, 'the click must start the greeting');
    assert.ok(started.text, 'the greeting started but said nothing');
    await page.close();
  }

  // ── 4. You went and found the tools yourself. A nudge toward buttons you have already
  //      pressed is stale, so it is dropped from what a click can bring back — the same
  //      judgement the data file makes when it declines to nudge a visitor who found them.
  //
  //      The hover is dispatched rather than driven with page.hover(), which would scroll the
  //      trigger into view and move him out from under the click box we are about to use.
  {
    const page = await makePage(browser);
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 2);
    assert.strictEqual((await page.evaluate(STATE)).text, BEAT2, 'this case needs the nudge');

    await page.evaluate(function () {
      document.querySelector('.showcase-logos .logo-trigger')
        .dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    });
    await page.waitForTimeout(FADE);
    const found = await page.evaluate(STATE);
    assert.ok(await page.evaluate(function () { return window.__evFigDebug.toolsFound(); }),
      'the hover must register as featureEverOn');
    assert.strictEqual(found.bubbles, 0, 'highlighting a tool still drops the bubble');
    assert.strictEqual(found.said, null, 'the stale nudge must not be left for a click to re-open');

    await clickHim(page);
    await page.waitForTimeout(FADE);
    const after = await page.evaluate(STATE);
    assert.strictEqual(after.bubbles, 0, 'he must not re-offer a nudge you no longer need');

    // ...and that click must not be SWALLOWED. A greeter with nothing left to switch is a
    // quiet patch of page like any other, so clicking him still closes whatever else is up.
    await page.evaluate(function () {
      window.EVQuotes.open({
        headX: (window.scrollX || 0) + 200,
        headY: (window.scrollY || 0) + 300,
        tone: '#888888',
        quote: { text: 'Another bubble.' }
      });
    });
    await page.waitForFunction(function () {
      return document.querySelectorAll('.ev-quote').length === 1;
    }, null, { timeout: 8000 });
    await clickHim(page);
    await page.waitForTimeout(FADE);
    assert.strictEqual((await page.evaluate(STATE)).bubbles, 0,
      'a click on a silent greeter must still dismiss other bubbles');
    await page.close();
  }

  // ── 5. A welcome is NOT stale after you find the tools — only the nudge is. This is the
  //      guard on case 4's rule being written with a broad brush.
  {
    const page = await makePage(browser);
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 1);
    await page.evaluate(function () {
      document.querySelector('.showcase-logos .logo-trigger')
        .dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    });
    await page.waitForTimeout(FADE);
    const found = await page.evaluate(STATE);
    assert.strictEqual(found.bubbles, 0, 'highlighting a tool drops the bubble');
    assert.ok(found.said, 'the welcome is still worth re-reading');

    await clickHim(page);
    await page.waitForTimeout(FADE);
    const back = await page.evaluate(STATE);
    assert.strictEqual(back.bubbles, 1, 'the welcome must still come back');
    assert.strictEqual(back.text, BEAT1, 'expected the welcome, got: ' + back.text);
    await page.close();
  }

  // ── 6. Never two bubbles. A click that re-opens his line closes anything else that is up,
  //      which is the same one-at-a-time rule every other bubble on the page follows.
  {
    const page = await makePage(browser);
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 2);
    await clickHim(page);
    await page.waitForTimeout(FADE);

    // A bare bubble, opened straight through EVQuotes rather than by driving a seated reader
    // into 'lookup'. A reader initialises its own state on its first drawn frame, and the
    // readers are far below the hero here, so poking one from up at the greeter would skip
    // that initialiser and break the figure instead of testing anything.
    await page.evaluate(function () {
      window.EVQuotes.open({
        headX: (window.scrollX || 0) + 200,
        headY: (window.scrollY || 0) + 300,
        tone: '#888888',
        quote: { text: 'Another bubble.' }
      });
    });
    await page.waitForFunction(function () {
      return document.querySelectorAll('.ev-quote').length === 1;
    }, null, { timeout: 8000 });
    await clickHim(page);
    await page.waitForTimeout(FADE);
    const s = await page.evaluate(STATE);
    assert.strictEqual(s.bubbles, 1, 'exactly one bubble may be live, found ' + s.bubbles);
    assert.strictEqual(s.text, BEAT2, 'the surviving bubble must be his: ' + s.text);
    await page.close();
  }

  console.log('07-toggle: PASS');
  await browser.close();
})();
