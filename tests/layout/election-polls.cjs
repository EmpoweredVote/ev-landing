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

// Painted ink inside .meta-row's RECT — both axes, which is the difference that matters
// here. tests/layout/beam-clears-metarow.cjs measures the topmost ink in Y alone, which is
// right for a crew that walks UNDER the row and wrong for a booth that stands BESIDE it:
// the desktop booth is 135px tall against 93px of headroom, so it reaches above the row's
// bottom edge in Y while sitting 300px clear of it in X. A Y-only test would call that a
// failure. That is also why `polls` is not added to that file's exemption list: it never
// sees the scene (no tags pinned there means the gate is off), so there is nothing to
// exempt, and exempting it would have thrown away the only automatic check on the clamp.
//
// The band is sampled half-open and inset by 1px on each edge, because the clamped booth's
// top lands exactly ON row.bottom and a boundary pixel is a coin flip, not a bug.
async function inkInMetaRow(page) {
  return page.evaluate(function () {
    var e = window.__evFigDebug.entries.filter(function (x) {
      return x.spec.mode === 'beam' && !x.spec.plain && !x.gone;
    })[0];
    if (!e || !e.c.width) return { error: 'no beam canvas' };
    var c = e.c, g = c.getContext('2d');
    var q = c.getBoundingClientRect();
    var row = document.querySelector('.hero .meta-row').getBoundingClientRect();
    var sx = c.width / q.width, sy = c.height / q.height;
    var x0 = Math.max(0, Math.floor((row.left - q.left) * sx) + 1);
    var x1 = Math.min(c.width, Math.ceil((row.right - q.left) * sx) - 1);
    var y0 = Math.max(0, Math.floor((row.top - q.top) * sy) + 1);
    var y1 = Math.min(c.height, Math.ceil((row.bottom - q.top) * sy) - 1);
    if (x1 <= x0 || y1 <= y0) return { hits: 0, band: [x0, x1, y0, y1], empty: true };
    var d = g.getImageData(0, 0, c.width, c.height).data, hits = 0;
    for (var y = y0; y < y1; y++) {
      for (var x = x0; x < x1; x++) if (d[(y * c.width + x) * 4 + 3] > 8) hits++;
    }
    return { hits: hits, band: [x0, x1, y0, y1] };
  });
}

// One pixel of the booth's panel stroke, for the theme check.
async function boothInk(page) {
  return page.evaluate(function () {
    var e = window.__evFigDebug.entries.filter(function (x) {
      return x.spec.mode === 'beam' && !x.spec.plain && !x.gone;
    })[0];
    var c = e.c, g = c.getContext('2d');
    var r = window.__evFigDebug.boothRect();
    var d = g.getImageData(0, 0, c.width, c.height).data;
    var sx = c.width / c.getBoundingClientRect().width;
    var sy = c.height / c.getBoundingClientRect().height;
    // Walk down the panel's left edge and return the first opaque pixel we meet.
    var px = Math.round((r.x + 1) * sx);
    for (var y = Math.round(r.y * sy); y < Math.round((r.y + r.h) * sy); y++) {
      var i = (y * c.width + px) * 4;
      if (d[i + 3] > 200) return [d[i], d[i + 1], d[i + 2]];
    }
    return null;
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

  // ── Case 3: the booth clears .meta-row at both ends of the range ───────────────────
  // The 501(c)(3) line is a legal claim and the crew has 93px of headroom. 390px is the
  // width that fails first: there the row spans the whole canvas, so the booth has to clamp.
  for (const width of [1440, 390]) {
    const { page, errors } = await open(browser, '?evlines=election-day#figdebug',
      { width: width, height: 900 });
    await parkOnLane(page);
    await page.waitForTimeout(1200);
    const ink = await inkInMetaRow(page);
    want(!ink.error, 'case 3 @' + width + ': ' + ink.error);
    want(ink.hits === 0,
      'case 3 @' + width + ': ' + ink.hits + ' painted pixels inside .meta-row (band ' +
      JSON.stringify(ink.band) + ')');
    want(errors.length === 0, 'case 3 @' + width + ': page errors — ' + errors.join(' | '));
    seen.push('case 3 @' + width + ': meta-row clear (' + ink.hits + ' px)');
    await page.close();
  }

  // ── Case 4: the clamp is a CEILING, not the thing that picks the size ──────────────
  // The booth is 1.9x a figure at every width. An earlier draft let it "take the canvas"
  // wherever nothing was overhead, which gave 240px on a desktop against 93px on a phone —
  // a 2.5x jump between two widths of one page, and a structure 3.4x the height of the
  // people queuing at it.
  {
    const { page } = await open(browser, '?evlines=election-day#figdebug',
      { width: 1440, height: 900 });
    await parkOnLane(page);
    const wide = await page.evaluate(function () { return window.__evFigDebug.boothRect(); });
    want(wide && wide.h === 135, 'case 4 @1440: booth stands at its design height, got ' + (wide && wide.h));
    want(wide && wide.signOnPanel === false, 'case 4 @1440: the sign sits above the roofline');
    want(wide && wide.x === 44, 'case 4 @1440: inset is 44, got ' + (wide && wide.x));
    seen.push('case 4 @1440: booth ' + wide.w + 'x' + wide.h + ' at x=' + wide.x + ', sign above');
    await page.close();
  }
  {
    const { page } = await open(browser, '?evlines=election-day#figdebug',
      { width: 390, height: 780 });
    await parkOnLane(page);
    const narrow = await page.evaluate(function () { return window.__evFigDebug.boothRect(); });
    want(narrow && narrow.h === 93, 'case 4 @390: booth clamps to the headroom, got ' + (narrow && narrow.h));
    // A voter has to be HIDDEN while he votes, so the panel cannot be shorter than a 71px
    // figure. Of 93px that leaves 22px above the roofline, which is not a sign, it is a
    // smear — so below the clamp the board goes on the panel's face instead.
    want(narrow && narrow.signOnPanel === true, 'case 4 @390: the sign must move onto the panel');
    want(narrow && narrow.x === 16, 'case 4 @390: inset is 16, got ' + (narrow && narrow.x));
    seen.push('case 4 @390: booth clamped to ' + narrow.h + ', sign on the panel');
    await page.close();
  }

  // ── Case 5: the booth is themed every frame, not inked once at spawn ───────────────
  // Halloween's zombie needed a colour pair of its own because the cast palette read wrong
  // against one theme. A colour captured once would be the wrong ink after a flip, and
  // nothing about the page would look broken — it would just be the other theme's booth.
  {
    const { page, errors } = await open(browser, '?evlines=election-day#figdebug');
    await parkOnLane(page);
    await page.waitForTimeout(900);
    // BOTH themes are driven explicitly. The page defaults to DARK (the anti-FOUC
    // fallback picks it), so flipping only to dark measures the same theme twice and the
    // case passes vacuously against a booth with its colours hardcoded.
    await page.evaluate(function () { document.documentElement.setAttribute('data-theme', 'light'); });
    await page.waitForTimeout(900);
    const before = await boothInk(page);
    await page.evaluate(function () { document.documentElement.setAttribute('data-theme', 'dark'); });
    await page.waitForTimeout(900);
    const after = await boothInk(page);
    want(before && after, 'case 5: needed booth ink in both themes, got ' +
      JSON.stringify(before) + ' / ' + JSON.stringify(after));
    want(JSON.stringify(before) !== JSON.stringify(after),
      'case 5: the booth kept its light-theme ink after a flip to dark: ' + JSON.stringify(before));
    want(errors.length === 0, 'case 5: page errors — ' + errors.join(' | '));
    seen.push('case 5: booth re-inks on a theme flip (' + JSON.stringify(before) + ' -> ' + JSON.stringify(after) + ')');
    await page.close();
  }

  // ── Case 6: a line forms, and it is mixed ─────────────────────────────────────────
  // "Different color bobits waiting in line" was the ask, and takeTone() is already the
  // mechanism: a shuffled bag, so neighbours rarely match.
  {
    const { page, errors } = await open(browser, '?evlines=election-day#figdebug');
    await parkOnLane(page);
    await page.waitForTimeout(14000);

    // "The line frequently has 4-8 people waiting" is a claim about a STRETCH OF TIME, not
    // about one instant, and sampling it as an instant is how this case first went flaky:
    // one departure lands a moment before a replacement and a true scene reads as a failure.
    // So watch for a while and judge the high-water mark and the typical.
    let peak = 0, samples = [], tones = new Set();
    for (let i = 0; i < 24; i++) {
      const snap = await page.evaluate(function () {
        return window.__evFigDebug.polls()
          .filter(function (f) { return f.state === 'waiting'; })
          .map(function (f) { return f.tone; });
      });
      peak = Math.max(peak, snap.length);
      samples.push(snap.length);
      snap.forEach(function (t) { tones.add(t); });
      await page.waitForTimeout(700);
    }
    const typical = samples.slice().sort(function (a, b) { return a - b; })[Math.floor(samples.length / 2)];
    want(peak >= 4, 'case 6: the line never reached four, peaked at ' + peak + ' (' + samples.join(',') + ')');
    want(peak <= 8, 'case 6: the line overshot eight, peaked at ' + peak);
    want(typical >= 3, 'case 6: the line typically held only ' + typical + ' (' + samples.join(',') + ')');
    want(tones.size > 1, 'case 6: the line must not be all one colour, got ' + JSON.stringify([...tones]));
        want(errors.length === 0, 'case 6: page errors — ' + errors.join(' | '));
    seen.push('case 6: peak ' + peak + ', typical ' + typical + ', ' + tones.size + ' colours');

    // ── Case 7: the line MOVES, and every state is reached ──────────────────────────
    // A COUNT is right in both the working case and the frozen one — "four people are in
    // the line" stays true forever if the line stops — so this asserts positions change and
    // that somebody actually arrives, votes and leaves.
    const before = await page.evaluate(function () {
      return window.__evFigDebug.polls().map(function (f) { return [f.state, Math.round(f.x)]; });
    });
    await page.waitForTimeout(11000);
    const after = await page.evaluate(function () {
      return window.__evFigDebug.polls().map(function (f) { return [f.state, Math.round(f.x)]; });
    });
    want(JSON.stringify(before) !== JSON.stringify(after),
      'case 7: the queue must advance, not freeze: ' + JSON.stringify(before));

    // Every state must be reached BY THE STATE MACHINE, not announced by the seeder. Two of
    // these four used to be set unconditionally while seeding the line, so they were true
    // before anybody had arrived or waited and proved nothing at all.
    const states = await page.evaluate(function () { return window.__evFigDebug.pollStates(); });
    for (const st of ['arriving', 'waiting', 'voting', 'leaving']) {
      want(states.indexOf(st) >= 0, 'case 7: nobody was ever ' + st + ' (saw ' + states.join(',') + ')');
    }
    want(errors.length === 0, 'case 7: page errors — ' + errors.join(' | '));
    seen.push('case 7: queue advances; states seen: ' + states.join(', '));

    // ── Case 9: a resize re-seats the line against the NEW slots ────────────────────
    // reposition() re-fits the canvas, and both the booth clamp and the gap are functions
    // of width, so every slot moves. A waiter holding a stored absolute x would be standing
    // in the wrong place with nothing to show it was wrong.
    await page.setViewportSize({ width: 760, height: 900 });
    await parkOnLane(page);
    await page.waitForTimeout(2500);
    const seated = await page.evaluate(function () {
      var slots = window.__evFigDebug.pollSlots();
      return window.__evFigDebug.polls()
        .filter(function (f) { return f.state === 'waiting'; })
        .map(function (f) { return { slot: f.slot, x: f.x, want: slots[f.slot] }; });
    });
    want(seated.length > 0, 'case 9: needed somebody waiting after the resize');
    for (const f of seated) {
      want(f.want != null && Math.abs(f.x - f.want) < 24,
        'case 9: waiter in slot ' + f.slot + ' is at ' + Math.round(f.x) +
        ', its slot is now ' + Math.round(f.want));
    }
    seen.push('case 9: ' + seated.length + ' waiters re-seated after a resize to 760');
    await page.close();
  }

  // ── Case 8: 320px, the narrowest real viewport ────────────────────────────────────
  // Booth 96 + inset 16 + eight waiters at the 26px floor is 294px of a 320px canvas.
  // Narrower than that and the back of the line walks off the edge of its own canvas —
  // or, worse, off the edge of the document and the page grows a horizontal scrollbar,
  // which is the bug every mode that forgot fitW/fitLeft has shipped at least once.
  {
    const { page, errors } = await open(browser, '?evlines=election-day#figdebug',
      { width: 320, height: 700 });
    await parkOnLane(page);
    await page.waitForTimeout(14000);
    const r = await page.evaluate(function () {
      var e = window.__evFigDebug.entries.filter(function (x) {
        return x.spec.mode === 'beam' && !x.spec.plain && !x.gone;
      })[0];
      var all = window.__evFigDebug.polls();
      // EVERY state, not just `waiting`. This case was written to catch a figure parked off
      // the right edge and for a while it could not: the ones that overflow are `arriving`,
      // which the filter excluded, so it passed green with two people standing in the dark
      // past the canvas edge. A test that cannot see the thing it was written for is worse
      // than no test, because it reports the risk as covered.
      var off = all.filter(function (f) { return f.state !== 'leaving' && f.x > e.w - 8; })
                   .map(function (f) { return [f.state, Math.round(f.x)]; });
      // ...and nobody may stand inside anybody else.
      var stacked = [];
      for (var i = 0; i < all.length; i++) {
        for (var j = i + 1; j < all.length; j++) {
          if (all[i].state === 'voting' || all[j].state === 'voting') continue;
          if (Math.abs(all[i].x - all[j].x) < 10) stacked.push([all[i].state, Math.round(all[i].x)]);
        }
      }
      return {
        over: off.length, offDetail: JSON.stringify(off),
        stacked: stacked.length, stackDetail: JSON.stringify(stacked),
        waiting: all.filter(function (f) { return f.state === 'waiting'; }).length,
        scroll: document.documentElement.scrollWidth > window.innerWidth
      };
    });
    want(r.over === 0, 'case 8 @320: ' + r.over + ' figure(s) off the right edge: ' + r.offDetail);
    want(r.stacked === 0, 'case 8 @320: ' + r.stacked + ' figure(s) standing inside each other: ' + r.stackDetail);
    want(r.waiting > 0, 'case 8 @320: the line must still form at all');
    want(r.scroll === false, 'case 8 @320: the page grew a horizontal scrollbar');
    want(errors.length === 0, 'case 8 @320: page errors — ' + errors.join(' | '));
    seen.push('case 8 @320: ' + r.waiting + ' waiting, none overflowing, no h-scroll');
    await page.close();
  }

  // ── Case 10: prod somebody in the line and he answers ─────────────────────────────
  // A switch, like the greeter and like a zombie: click once to open, again to put it away.
  {
    const { page, errors } = await open(browser, '?evlines=election-day#figdebug');
    await parkOnLane(page);
    await page.waitForTimeout(12000);

    // Read the coordinates and click in the smallest window possible, and aim at the BACK
    // of the line. The front is the one that walks into the booth next, and the whole line
    // steps up behind it — so coordinates read a beat before the click can be stale by the
    // time it lands, and the click then falls on empty floor. That is a race in the test,
    // not in the page: it cost two runs before it was pinned.
    // The line is FROZEN for these cases, and a figure is followed by its id rather than
    // its slot. Both are needed and the first run proved it: a slot is a POSITION, so when
    // the line steps up everybody's slot changes and the person you measured is 46px to the
    // left by the time the click lands — outside the 26px hitbox, so it falls on bare floor
    // and nothing happens. Freezing makes the case about the hitbox, which is what it is
    // for; following the id makes "the same person" mean the same person.
    async function backOfLine(page) {
      return page.evaluate(function () {
        var q = window.__evFigDebug.polls().filter(function (x) {
          return x.state === 'waiting' && x.sx != null;
        }).sort(function (a, b) { return b.slot - a.slot; });
        var f = q[0];
        return f ? { sx: f.sx, fy: f.fy, say: f.say, id: f.id } : null;
      });
    }
    async function clickWaiter(page, id) {
      const at = await page.evaluate(function (i) {
        var f = window.__evFigDebug.polls().filter(function (x) { return x.id === i; })[0];
        return f && f.sx != null ? { sx: f.sx, fy: f.fy } : null;
      }, id);
      if (!at) return false;
      await page.mouse.click(at.sx, at.fy - 40);
      await page.waitForTimeout(400);
      return true;
    }
    // Freeze, then WAIT FOR THE LINE TO STAND STILL. Freezing stops new arrivals and the
    // step-up, but anybody already mid-shuffle keeps walking to his slot — and a waiter
    // read while he is still moving gives coordinates he has left by the time the click
    // lands. That is the whole of what made the first three runs of this case fail.
    await page.evaluate(function () { window.__evFigDebug.pollFreeze(true); });
    await page.waitForFunction(function () {
      var slots = window.__evFigDebug.pollSlots();
      return window.__evFigDebug.polls()
        .filter(function (f) { return f.state === 'waiting'; })
        .every(function (f) { return Math.abs(f.x - slots[f.slot]) < 1; });
    }, { timeout: 15000 });

    const hit = await backOfLine(page);
    want(hit !== null, 'case 10: needed a waiter publishing a hitbox to click');

    if (hit) {
      want(typeof hit.say === 'string' && hit.say.length > 0,
        'case 10: a waiter must be dealt his line at spawn, got ' + JSON.stringify(hit.say));

      want(await clickWaiter(page, hit.id), 'case 10: the waiter went away before the click');
      want(await page.evaluate(function () { return window.EVQuotes.openCount(); }) === 1,
        'case 10: a click must open exactly one bubble');

      await clickWaiter(page, hit.id);
      want(await page.evaluate(function () { return window.EVQuotes.openCount(); }) === 0,
        'case 10: a second click must put it away');

      // ── Case 11: the SAME person says the SAME thing, however many times you prod him.
      // The line is fixed at spawn, not drawn per click — the rule the zombies' easter egg
      // established, and the reason given for it there holds here.
      const again = await page.evaluate(function (i) {
        var f = window.__evFigDebug.polls().filter(function (x) { return x.id === i; })[0];
        return f ? f.say : null;
      }, hit.id);
      want(again === hit.say,
        'case 11: his line changed between clicks: ' + JSON.stringify(hit.say) + ' -> ' + JSON.stringify(again));

      // ── Case 12: his bubble closes when he steps forward.
      // A waiter stands still except during a shuffle, so closing on the step is the cheap
      // right answer rather than carrying the zombies' re-pin-every-frame machinery into a
      // second place — but it has to actually happen, or a bubble is left hanging over
      // nobody while its owner walks out from under it.
      await clickWaiter(page, hit.id);
      want(await page.evaluate(function () { return window.EVQuotes.openCount(); }) === 1,
        'case 12: needed an open bubble before forcing the shuffle');
      // Unfreeze, then wait for the step-up to actually TAKE. pollAdvance refuses while
      // somebody is still in the booth, so calling it once and assuming it fired asserts
      // nothing — the bubble would still be open for the honest reason that nobody moved.
      await page.evaluate(function () { window.__evFigDebug.pollFreeze(false); });
      const stepped = await page.waitForFunction(function () {
        return window.__evFigDebug.pollAdvance();
      }, { timeout: 25000 }).then(function () { return true; }, function () { return false; });
      want(stepped, 'case 12: the line never stepped up, so nothing was proved');
      await page.waitForTimeout(900);
      want(await page.evaluate(function () { return window.EVQuotes.openCount(); }) === 0,
        'case 12: stepping forward must close the bubble');
    }

    want(errors.length === 0, 'case 10-12: page errors — ' + errors.join(' | '));
    seen.push('case 10-12: click opens/closes, line fixed at spawn, step closes it');
    await page.close();
  }

  // ── Case 13: the exodus takes the queue CLEANLY ───────────────────────────────────
  // This case was specified wrongly first and the correction is the point of it. The
  // design said "hold a Bobit for three seconds and assert the figure layer is still
  // animating", which CANNOT PASS even against correct code: the polls scene deliberately
  // has an anchor, so armAll arms it, the whole queue correctly flees, and once nothing is
  // left POOF.phase goes to 'cleared' — nothing moving is the RIGHT outcome. Halloween's
  // version works only because a zombie is anchorless and gets skipped.
  //
  // The real distinction is FLEEING versus THROWING, and a throw inside tick() leaves no
  // error on the page and nothing that looks wrong until you notice nobody moves. So the
  // positive half is the half that catches it: did they actually run.
  {
    const { page, errors } = await open(browser, '?evlines=election-day#figdebug');
    await parkOnLane(page);
    await page.waitForTimeout(9000);

    const r = await page.evaluate(async function () {
      var D = window.__evFigDebug;
      var before = D.polls().map(function (f) { return { id: f.id, x: f.x }; });
      if (!before.length) return { err: 'nobody was in the scene to take' };
      var entry = D.entries.filter(function (e) {
        return e.spec.mode === 'beam' && !e.spec.plain && !e.gone;
      })[0];
      var hadAnchor = !!entry.el;
      // Drive the phase machine straight at the exodus, the way a three-second hold does.
      var victim = D.entries.find(function (e) { return !e.gone && e.w && e.spec.mode === 'stand'; });
      if (!victim) return { err: 'no victim to poof' };
      D.poof.victim = victim; D.poof.fx = 0.5; D.poof.fy = 0.5;
      D.poof.phase = 'stunned'; D.poof.t = 99;
      await new Promise(function (res) { setTimeout(res, 2600); });
      var armed = !!entry.fl;
      // Once the entry is armed, drawFlee owns its canvas and runPolls stops being called —
      // so POLLS freezes at its last values BY DESIGN and is no evidence either way. What
      // proves the loop survived is the runner's own clock: flX is advanced by drawFlee on
      // every frame, and a throw inside tick() stops it dead.
      var x0 = entry.flX, mates0 = entry.flMates ? entry.flMates.length : 0;
      await new Promise(function (res) { setTimeout(res, 900); });
      var x1 = entry.flX;
      // WAIT FOR IT, do not guess at it. A runner crosses up to a full viewport at scurry
      // speed, so how long the exodus takes depends on how many bodies the scene had and
      // where they were standing — a fixed delay here passed with six runners and failed
      // with eight, which is a flaky test rather than a finding. Polling keeps the
      // assertion meaningful: if tick() had thrown, this never clears and the wait expires.
      var waited = 0;
      while (waited < 30000 && D.poof.phase !== 'cleared' && entry.gone !== true) {
        await new Promise(function (res) { setTimeout(res, 500); });
        waited += 500;
      }
      return {
        hadAnchor: hadAnchor, armed: armed, phase: D.poof.phase, waited: waited,
        before: before.length, mates: mates0,
        ran: (x0 != null && x1 != null && x0 !== x1) || entry.gone === true,
        cleared: D.poof.phase === 'cleared' || entry.gone === true
      };
    });

    want(!r.err, 'case 13: ' + r.err);
    if (!r.err) {
      // The premise of the whole feature: this entry is anchored, which is why it is safe.
      want(r.hadAnchor, 'case 13: the polls entry must HAVE an anchor — that is the point');
      want(r.armed, 'case 13: an anchored entry must be armed to flee, not skipped');
      want(r.ran,
        'case 13: the runner never moved — tick() threw during the exodus (phase ' + r.phase + ')');
      // THE QUEUE SPLITS. drawFlee draws one runner plus everyone in flMates, and that list
      // is built from the _bodies the scene publishes each frame. If the scene forgot to
      // publish, eight people would leave as one.
      want(r.mates > 0,
        'case 13: the queue left as a single figure — _bodies was not published (' + r.mates + ' mates)');
      want(r.cleared,
        'case 13: the exodus never finished in 30s, phase stuck at ' + r.phase);
      seen.push('case 13: anchored queue armed, split into ' + (r.mates + 1) +
        ' runners, ran, and cleared in ' + (r.waited / 1000) + 's (' + r.before + ' in the scene)');
    }
    want(errors.length === 0, 'case 13: a poof must not throw — ' + errors.join(' | '));
    await page.close();
  }

  // ── Case 14: the guard is a HARNESS guard, never a visitor guard ──────────────────
  // The webdriver gate exists so 36 unpinned test files do not become date-dependent. It
  // could just as easily hide the scene from every real visitor while this suite stayed
  // green, which is the failure nobody would notice until the day. So: spoof it back and
  // check the page agrees with the wall calendar.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', function (e) { errors.push(String(e)); });
    await page.route('**/*', function (r) {
      return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
    });
    await page.addInitScript(function () {
      Object.defineProperty(navigator, 'webdriver', { get: function () { return false; } });
    });
    await page.goto(URL + '#figdebug');          // deliberately NO ?evlines=
    await page.waitForFunction(function () { return !!window.__evFigDebug; });

    const agree = await page.evaluate(function () {
      var isDay = window.EVLines.context({}).tags.indexOf('election-day') >= 0;
      return { isDay: isDay, armed: window.__evFigDebug.election, wd: navigator.webdriver };
    });
    want(agree.wd === false, 'case 14: the spoof did not take, so this proves nothing');
    want(agree.armed === agree.isDay,
      'case 14: a real visitor must see the scene exactly when the calendar says Election Day — ' +
      'calendar says ' + agree.isDay + ', page says ' + agree.armed);
    want(errors.length === 0, 'case 14: page errors — ' + errors.join(' | '));
    seen.push('case 14: calendar says election-day=' + agree.isDay + ', an unspoofed visitor agrees');
    await page.close();
  }

  // ── Case 15: a poof must not leave a bubble hanging over an empty page ────────────
  // The exodus clears the page until reload. While the entry is fleeing but not yet gone,
  // a waiter's last published hitbox is still sitting there, so a click on bare floor could
  // open a bubble over nobody — and runPolls has stopped being called, so the SAY timeout
  // that would normally take it away never runs either. It stays until reload.
  {
    const { page, errors } = await open(browser, '?evlines=election-day#figdebug');
    await parkOnLane(page);
    await page.waitForTimeout(9000);
    const at = await page.evaluate(function () {
      var D = window.__evFigDebug;
      var f = D.polls().filter(function (x) { return x.state === 'waiting' && x.sx != null; })[0];
      var victim = D.entries.find(function (e) { return !e.gone && e.w && e.spec.mode === 'stand'; });
      if (!f || !victim) return null;
      D.poof.victim = victim; D.poof.fx = 0.5; D.poof.fy = 0.5;
      D.poof.phase = 'stunned'; D.poof.t = 99;
      return { sx: f.sx, fy: f.fy };
    });
    want(at !== null, 'case 15: needed a waiter and a victim');
    if (at) {
      await page.waitForTimeout(900);
      await page.mouse.click(at.sx, at.fy - 40);
      await page.waitForTimeout(600);
      want(await page.evaluate(function () { return window.EVQuotes.openCount(); }) === 0,
        'case 15: a click during the exodus opened a bubble over an empty page');
      await page.waitForTimeout(3000);
      want(await page.evaluate(function () { return window.EVQuotes.openCount(); }) === 0,
        'case 15: a bubble survived the exodus and nothing is left to time it out');
    }
    want(errors.length === 0, 'case 15: page errors — ' + errors.join(' | '));
    seen.push('case 15: no bubble survives a poof');
    await page.close();
  }

  // ── Case 16: clicking off does not leave a waiter mute ────────────────────────────
  // dismissBubbles() resets the handle on ENTRIES; the people in the line are not entries,
  // so their `qh` was left dangling. The bubble closed on screen and the figure still
  // believed he was talking, so the next click on him read as "put it away" and he refused
  // to speak. You had to click him twice, with nothing to say why.
  {
    const { page, errors } = await open(browser, '?evlines=election-day#figdebug');
    await parkOnLane(page);
    await page.waitForTimeout(10000);
    await page.evaluate(function () { window.__evFigDebug.pollFreeze(true); });
    await page.waitForFunction(function () {
      var slots = window.__evFigDebug.pollSlots();
      return window.__evFigDebug.polls().filter(function (f) { return f.state === 'waiting'; })
        .every(function (f) { return Math.abs(f.x - slots[f.slot]) < 1; });
    }, { timeout: 15000 });

    const who = await page.evaluate(function () {
      var f = window.__evFigDebug.polls().filter(function (x) { return x.state === 'waiting'; })[0];
      return f ? { id: f.id, sx: f.sx, fy: f.fy } : null;
    });
    want(who !== null, 'case 16: needed a settled waiter');
    if (who) {
      await page.mouse.click(who.sx, who.fy - 40);
      await page.waitForTimeout(350);
      want(await page.evaluate(function () { return window.EVQuotes.openCount(); }) === 1,
        'case 16: first click must open');
      // click a quiet patch of page, which is how anyone dismisses a bubble
      await page.mouse.click(who.sx, who.fy - 220);
      await page.waitForTimeout(350);
      const mid = await page.evaluate(function (i) {
        return { open: window.EVQuotes.openCount(),
                 qh: !!window.__evFigDebug.polls().filter(function (x) { return x.id === i; })[0].qh };
      }, who.id);
      want(mid.open === 0, 'case 16: clicking off must close it');
      want(mid.qh === false, 'case 16: the figure still thinks he is talking — dangling handle');
      await page.mouse.click(who.sx, who.fy - 40);
      await page.waitForTimeout(350);
      want(await page.evaluate(function () { return window.EVQuotes.openCount(); }) === 1,
        'case 16: he refused to speak again after a click-off');
    }
    want(errors.length === 0, 'case 16: page errors — ' + errors.join(' | '));
    seen.push('case 16: click-off leaves no dangling handle');
    await page.close();
  }

  // ── Case 17: only somebody STANDING STILL can be clicked ──────────────────────────
  // A waiter's bubble is placed once and never re-pinned, which is right because he stands
  // still. An arriving or leaving figure is walking, so his bubble would hang in the air
  // behind him — ~190px of drift over the SAY window, which is precisely what the zombies'
  // re-pin machinery exists for and precisely what this scene chose not to carry.
  {
    const { page, errors } = await open(browser, '?evlines=election-day#figdebug');
    await parkOnLane(page);
    await page.waitForTimeout(9000);
    const walker = await page.evaluate(function () {
      var f = window.__evFigDebug.polls().filter(function (x) {
        return x.state === 'arriving' && x.sx != null;
      })[0];
      return f ? { sx: f.sx, fy: f.fy, id: f.id } : null;
    });
    want(walker !== null, 'case 17: needed somebody walking in');
    if (walker) {
      await page.mouse.click(walker.sx, walker.fy - 40);
      await page.waitForTimeout(500);
      want(await page.evaluate(function () { return window.EVQuotes.openCount(); }) === 0,
        'case 17: a walking figure must not open a bubble it cannot carry');
    }
    want(errors.length === 0, 'case 17: page errors — ' + errors.join(' | '));
    seen.push('case 17: only a standing waiter can be prodded');
    await page.close();
  }

  // ── Case 18: a resize that SHRINKS capacity must not strand anybody ────────────────
  // Case 9 resizes 1440 -> 760, where capacity stays at 8, so it exercises re-seating but
  // never a capacity shrink. Going to a phone width cuts the number of slots, and a waiter
  // holding a slot index past the new capacity stands off the canvas edge, invisible, until
  // the line happens to advance him back on.
  {
    const { page, errors } = await open(browser, '?evlines=election-day#figdebug');
    await parkOnLane(page);
    await page.waitForTimeout(11000);
    await page.setViewportSize({ width: 320, height: 700 });
    await parkOnLane(page);
    await page.waitForTimeout(3000);
    const r = await page.evaluate(function () {
      var e = window.__evFigDebug.entries.filter(function (x) {
        return x.spec.mode === 'beam' && !x.spec.plain && !x.gone;
      })[0];
      return window.__evFigDebug.polls()
        .filter(function (f) { return f.state !== 'leaving' && f.x > e.w - 8; })
        .map(function (f) { return [f.state, Math.round(f.x), 'canvas ' + Math.round(e.w)]; });
    });
    want(r.length === 0, 'case 18: ' + r.length + ' figure(s) stranded off-canvas after 1440->320: ' + JSON.stringify(r));
    want(errors.length === 0, 'case 18: page errors — ' + errors.join(' | '));
    seen.push('case 18: nobody stranded by a capacity shrink');
    await page.close();
  }

  await browser.close();
  seen.forEach(function (s) { console.log('  ' + s); });
  if (failures.length) {
    failures.forEach(function (f) { console.error('FAIL ' + f); });
    throw new Error('election-polls: ' + failures.length + ' failure(s)');
  }
  console.log('election-polls: PASS (gate, booth, queue, clicks, exodus, guard, bubble lifecycle, narrow + shrinking widths)');
})();
