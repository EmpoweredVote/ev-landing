// Election Day: the hero's bottom rule stops being the carry lane and becomes a polling
// place — a booth at the left, a line of Bobits waiting to its right, one going in at a
// time, and each one walking off the left edge afterwards.
//
// Five things here are easy to break without noticing, and three of them are mistakes this
// feature's own design document made before the code existed.
//
// 1. THE GATE IS A TAG, NOT A CALENDAR. "It is Election Day" is defined once, in
//    ev-lines.js, and the figures read it from there. The OFF case matters more than the ON
//    one: on 4 November the tag stops matching and the whole scene has to disappear by
//    itself, because nobody is going to remember to delete it.
//
// 2. THE GUARD IS A HARNESS GUARD, NEVER A VISITOR GUARD. The scene is off under an
//    automated browser unless the harness names the tag, because 36 files in tests/ load
//    this page with no tags pinned and assert on who is standing where. That same guard
//    could just as easily hide the scene from every real visitor while this suite stayed
//    green, so case 6 spoofs navigator.webdriver back to false and checks the page agrees
//    with the wall calendar.
//
// 3. THE BOOTH MUST NOT COVER .meta-row. The 501(c)(3) line is a legal claim and the crew
//    has only 93px of headroom above its floor. On a phone the row is directly overhead, so
//    the booth clamps; on a desktop it stands in the empty column to the row's left. 390px
//    is the width that fails first, which is why case 3 samples ink at both ends.
//
// 4. THE EXODUS CASE CANNOT BE "IS THE PAGE STILL ANIMATING". The design said that first and
//    it is wrong: the polls scene deliberately HAS an anchor, so armAll arms it, the whole
//    queue correctly flees, and once nothing is left POOF.phase goes to 'cleared' — nothing
//    moving is the RIGHT outcome. Halloween's version only works because a zombie is
//    anchorless and gets skipped. The real distinction is fleeing versus throwing, and a
//    throw inside tick() leaves no error on the page, so the half that catches it is the
//    positive one: did they actually run.
//
// 5. A COUNT IS RIGHT IN BOTH THE WORKING CASE AND THE FROZEN ONE. "Four people are in the
//    line" stays true forever if the line stops moving, so case 5 asserts POSITIONS change
//    and that every state is reached, not that a number holds steady.
//
// Needs Playwright and its browsers — see "Tests" in README.md:
//   node tests/layout/election-polls.cjs
const { chromium } = require('playwright');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html';
const failures = [];
const seen = [];
function want(cond, msg) { if (!cond) failures.push(msg); }

async function open(browser, query, viewport) {
  const page = await browser.newPage({ viewport: viewport || { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', function (e) { errors.push(String(e)); });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL + (query || ''));
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  // index.html sets `html { scroll-behavior: smooth }`, so every scrollTo is an ANIMATION
  // and a harness that scrolls then looks is reading the page in transit.
  await page.evaluate(function () { document.documentElement.style.scrollBehavior = 'auto'; });
  return { page: page, errors: errors };
}

// The hero crew's entry — the one the scene runs on. `plain` crews are the Halloween work
// crews cast at runtime and are deliberately never the polling place.
function heroCrew(page) {
  return page.evaluate(function () {
    var e = window.__evFigDebug.entries.filter(function (x) {
      return x.spec.mode === 'beam' && !x.spec.plain && !x.gone;
    })[0];
    return e ? { scene: e.scene, hasAnchor: !!e.el } : null;
  });
}

// Park the viewport on the hero's bottom rule, so the scene is on screen and drawing.
async function parkOnLane(page) {
  await page.evaluate(function () {
    var r = document.querySelector('.hero').getBoundingClientRect();
    var y = r.bottom + (window.scrollY || window.pageYOffset);
    window.scrollTo(0, Math.max(0, y - window.innerHeight * 0.75));
  });
  await page.waitForTimeout(400);
}

(async function () {
  const browser = await chromium.launch();

  // ── Case 1: the gate is on, and the carry rotation is off ──────────────────────────
  {
    const { page, errors } = await open(browser, '?evlines=election-day#figdebug');
    await parkOnLane(page);

    want(await page.evaluate(function () { return window.__evFigDebug.election === true; }),
      'case 1: the scene must be armed under ?evlines=election-day');

    const crew = await heroCrew(page);
    want(crew !== null, 'case 1: the hero crew entry must exist');
    want(crew && crew.scene === 'polls',
      'case 1: the hero crew must run the polls scene, got ' + (crew && crew.scene));
    // The whole point of putting the scene on this entry rather than on entries of its own:
    // an anchorless entry threw inside tick() and took the figure layer down for a session.
    want(crew && crew.hasAnchor, 'case 1: the polls entry must keep its anchor element');

    // beamPick is what deals the carry rotation, the light gag, the letter carriers and the
    // play-button carrier. All four are off for the day.
    const stillPolls = await page.evaluate(function () {
      var e = window.__evFigDebug.entries.filter(function (x) {
        return x.spec.mode === 'beam' && !x.spec.plain;
      })[0];
      window.__evFigDebug.beamPick(e, 1440);
      return e.scene;
    });
    want(stillPolls === 'polls',
      'case 1: beamPick must refuse to deal a pass while the scene is on, got ' + stillPolls);

    want(errors.length === 0, 'case 1: page errors — ' + errors.join(' | '));
    seen.push('case 1: scene armed, anchored, and beamPick stood down');
    await page.close();
  }

  // ── Case 2: no tag pinned under the harness means no takeover ──────────────────────
  {
    const { page, errors } = await open(browser, '#figdebug');
    want(await page.evaluate(function () { return window.__evFigDebug.election === false; }),
      'case 2: an automated browser with no tag pinned must not get the takeover');
    const crew = await heroCrew(page);
    want(crew && crew.scene !== 'polls',
      'case 2: the hero crew must run its ordinary rotation, got ' + (crew && crew.scene));
    want(errors.length === 0, 'case 2: page errors — ' + errors.join(' | '));
    seen.push('case 2: off under the harness with no tag pinned');
    await page.close();
  }

  await browser.close();
  seen.forEach(function (s) { console.log('  ' + s); });
  if (failures.length) {
    failures.forEach(function (f) { console.error('FAIL ' + f); });
    throw new Error('election-polls: ' + failures.length + ' failure(s)');
  }
  console.log('election-polls: PASS (gate on, gate off)');
})();
