// The Halloween takeover: a zombie Bobit shambles on, and anyone he reaches bolts.
//
// Four things here are easy to break without noticing, and three of them already bit once.
//
// 1. THE GATE IS A TAG, NOT A CALENDAR. "It is Halloween" is defined once, in ev-lines.js,
//    and the figures read it from there. The test that matters most is the OFF one: on
//    November 1 the tag stops matching and the whole takeover has to disappear on its own,
//    because nobody is going to remember to delete it. `?evlines=morning` is that November,
//    reachable in October — forcing tags REPLACES the derived set, so naming any other tag
//    is the same as not being Halloween.
//
// 2. `POOF.phase` RESTS ON THE STRING 'idle', WHICH IS TRUTHY. The first cut of zombieTick
//    guarded with `if (POOF.phase) return`, which returned on every frame forever and no
//    zombie ever arrived — with no error, and a gate that reported itself correctly on. The
//    spawn assertion below is what catches that class of bug, so it waits for a REAL spawn
//    on the scheduler rather than calling zombieSpawn() directly.
//
// 3. THE ZOMBIE CANVAS IS VIEWPORT-WIDE AND ABSOLUTE IN DOCUMENT SPACE. Every mode in
//    ev-figures.js that forgot fitW/fitLeft handed the whole page a horizontal scrollbar on
//    a phone. Checked here at 390px, which is the width that shows it.
//
// 4. ZOMBIES ARRIVE FOR AS LONG AS THE TAB IS OPEN. Unlike the cast, which is fixed, these
//    accumulate — so a retired one has to leave `entries` AND drop its backing store. At
//    1432x150 and DPR 1.5 each husk is about 1.9 MB.
//
// Needs Playwright and its browsers — see "Tests" in README.md:
//   node tests/layout/halloween-zombies.cjs
const { chromium } = require('playwright');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html';
const failures = [];
function want(cond, msg) { if (!cond) failures.push(msg); }

async function open(browser, query, viewport) {
  const page = await browser.newPage({ viewport: viewport || { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', function (e) { errors.push(String(e)); });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL + query);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  // index.html sets `html { scroll-behavior: smooth }`, so every scrollTo below is an
  // ANIMATION. Without this the test looks at the page while it is still travelling: parking
  // on a lane 3588px down landed at 2733 with no lane in view, the spawn refused, and the
  // phone case went green while testing an empty page. cartwheel-clearance.cjs does the same
  // thing for the same reason.
  await page.evaluate(function () { document.documentElement.style.scrollBehavior = 'auto'; });
  return { page: page, errors: errors };
}

// Park on one of the zombie's LANES — a full-bleed rule between sections — and report an
// inhabitant standing on it.
//
// He walks the whole width of the viewport, so he is only given a surface that exists for the
// whole of that walk, and he will not spawn without one in view. Parking beside an arbitrary
// figure, which is what this used to do, lands in the dead zone between two rules: the
// sections are taller than the viewport, so there is roughly 500px of scroll in the middle of
// section 02 with no lane on screen at all, and the spawn there simply never happens.
//
// Returns { lane, victim } where victim is an index into entries, or null if no lane on this
// page has anybody standing on it.
async function parkOnPeopledLane(page) {
  const found = await page.evaluate(function () {
    var D = window.__evFigDebug;
    var lanes = D.zombieLanes();
    for (var i = 0; i < lanes.length; i++) {
      var lane = lanes[i];
      window.scrollTo(0, Math.max(0, lane - window.innerHeight * 0.55));
      var sy = window.scrollY || window.pageYOffset;
      var idx = -1;
      D.entries.forEach(function (e, j) {
        if (idx >= 0 || e.gone || e.fl || e.ab || !e.w) return;
        if (e.spec.mode === 'why' || e.spec.mode === 'zombie') return;
        var feet = e.c.getBoundingClientRect().bottom - 6 + sy;
        if (Math.abs(feet - lane) <= D.zom.LANE) idx = j;
      });
      if (idx >= 0) return { lane: Math.round(lane), victim: idx };
    }
    return null;
  });
  await page.waitForTimeout(500);
  return found;
}

(async function () {
  const browser = await chromium.launch();
  const seen = [];

  // ──────────────────────────────────────────────────────────── 1. November
  {
    const { page, errors } = await open(browser, '?evlines=morning#figdebug');
    want(await page.evaluate(function () { return window.__evFigDebug.halloween === false; }),
      'november: the takeover reports itself ON when the halloween tag is absent');
    await parkOnPeopledLane(page);
    await page.waitForTimeout(14000);          // comfortably past ZOM.FIRST, which is 4-9s
    const n = await page.evaluate(function () { return window.__evFigDebug.zombies().length; });
    want(n === 0, 'november: ' + n + ' zombie(s) spawned with the tag off');
    want(errors.length === 0, 'november: page errors — ' + errors.join(' | '));
    seen.push('november: no zombies after 14s');
    await page.close();
  }

  // ──────────────────────────────────────────────────────────── 2. Halloween
  {
    const { page, errors } = await open(browser, '?evlines=halloween#figdebug');
    want(await page.evaluate(function () { return window.__evFigDebug.halloween === true; }),
      'halloween: the takeover reports itself OFF with the tag forced on');
    const parked = await parkOnPeopledLane(page);
    want(parked, 'halloween: no lane on this page has anybody standing on it');
    if (!parked) { await page.close(); await browser.close(); throw new Error('halloween-zombies: no peopled lane'); }
    seen.push('halloween: lane at document y ' + parked.lane + ', victim is entry ' + parked.victim);

    const before = await page.evaluate(function () {
      return window.__evFigDebug.entries.filter(function (e) {
        return !e.gone && e.spec.mode !== 'why' && e.spec.mode !== 'zombie';
      }).length;
    });

    // Wait for a spawn on the real scheduler. This is the assertion that catches a guard
    // which silently returns every frame.
    let spawned = false;
    for (let i = 0; i < 20 && !spawned; i++) {
      await page.waitForTimeout(1000);
      spawned = await page.evaluate(function () {
        return window.__evFigDebug.zombies().some(function (e) { return !e.gone; });
      });
    }
    want(spawned, 'halloween: no zombie arrived within 20s (ZOM.FIRST is 4-9s)');
    if (spawned) {
      const moved = await page.evaluate(async function () {
        var z = window.__evFigDebug.zombies().filter(function (e) { return !e.gone; })[0];
        var x0 = z.zX;
        await new Promise(function (r) { setTimeout(r, 1200); });
        return Math.abs(z.zX - x0);
      });
      want(moved > 8, 'halloween: the zombie is on the page but not walking (moved ' + Math.round(moved) + 'px in 1.2s)');
      seen.push('halloween: zombie arrived and walked ' + Math.round(moved) + 'px/1.2s');
    }

    // Drop a zombie straight onto someone and step time on: hands up, then gone.
    // The victim is the inhabitant parkOnPeopledLane found STANDING ON THE LANE, not simply
    // the first one on screen. Those are different figures: a seated reader on a note card is
    // on screen but his feet are 500px off the nearest rule, and a zombie placed level with
    // him would be the floating bug this file now guards against.
    const panic = await page.evaluate(async function (vi) {
      var D = window.__evFigDebug;
      var victim = D.entries[vi];
      if (!victim || victim.gone || !victim.w) return { err: 'the lane victim is no longer on the page' };
      var vr = victim.c.getBoundingClientRect();
      var vx = vr.left + (victim._figX != null ? victim._figX : victim.w / 2);
      // Put a zombie on his floor line, a few px away, and let the scan find him.
      if (!D.zombieSpawn()) return { err: 'no lane on screen to spawn onto' };
      var z = D.zombies().filter(function (e) { return !e.gone; }).pop();
      z.c.style.top = (vr.bottom - 6 + (window.scrollY || 0) - (z.h - 6)) + 'px';
      await new Promise(function (r) { setTimeout(r, 60); });
      z.zX = (vx - z.c.getBoundingClientRect().left) + 20;
      await new Promise(function (r) { setTimeout(r, 400); });
      var raised = !!victim.fl;
      var state = victim.fl;
      // POLL, do not sleep a fixed time. How long the exit takes depends on which figure the
      // randomised cast put on screen first. Run straight off a screen edge and he is gone in
      // about two seconds; run out of perch first and he takes the exodus's other path —
      // drop, heap (1.0s), getup (0.9s), then limp at HALF of FLEE_SPEED's 190px/s. From
      // mid-screen that is ten seconds or more, and a flat 9s wait called it stuck.
      var t0 = performance.now(), gone = false;
      while (performance.now() - t0 < 25000) {
        await new Promise(function (r) { setTimeout(r, 250); });
        if (victim.gone) { gone = true; break; }
      }
      return { mode: victim.spec.mode, raised: raised, firstState: state, gone: gone,
               secs: +((performance.now() - t0) / 1000).toFixed(1), still: victim.fl };
    }, parked.victim);
    want(!panic.err, 'halloween: ' + panic.err);
    if (!panic.err) {
      want(panic.raised, 'halloween: a zombie stood next to a Bobit and nothing happened');
      want(panic.firstState === 'raise', 'halloween: the panic skipped the hands-up beat (started in "' + panic.firstState + '")');
      want(panic.gone, 'halloween: a ' + panic.mode + ' panicked but was still on the page after ' +
        panic.secs + 's, stuck in "' + panic.still + '"');
      seen.push('halloween: a ' + panic.mode + ' ran ' + panic.firstState + ' -> gone in ' + panic.secs + 's');
    }

    const after = await page.evaluate(function () {
      return window.__evFigDebug.entries.filter(function (e) {
        return !e.gone && e.spec.mode !== 'why' && e.spec.mode !== 'zombie';
      }).length;
    });
    want(after < before, 'halloween: the cast did not thin out (' + before + ' -> ' + after + ')');
    seen.push('halloween: inhabitants ' + before + ' -> ' + after);

    // Retired zombies must not pile up: out of entries, and their backing store dropped.
    const husks = await page.evaluate(function () {
      var D = window.__evFigDebug;
      return {
        inEntries: D.entries.filter(function (e) { return e.spec.mode === 'zombie' && e.gone; }).length,
        live: D.zombies().length
      };
    });
    want(husks.inEntries === 0, 'halloween: ' + husks.inEntries + ' retired zombie(s) left in entries');
    want(husks.live <= 3, 'halloween: ' + husks.live + ' zombies at once, cap is ZOM.MAX 3');
    want(errors.length === 0, 'halloween: page errors — ' + errors.join(' | '));
    await page.close();
  }

  // ──────────────────────────────────────────────── 3. phone: no h-scroll
  //
  // THE SPAWN IS ASSERTED, and that is the whole point of the case. A viewport-wide canvas
  // placed in document space is what gives a phone a horizontal scrollbar, so with no zombie
  // on the page the scrollbar check passes while proving nothing — which is exactly what it
  // did for a while after the lanes landed, reporting "zombie canvas undefinedpx" in a line
  // that still said PASS. Park on ANY lane here rather than a peopled one: this case is about
  // canvas width, and whether anybody happens to be standing on that rule is irrelevant to it.
  {
    const { page, errors } = await open(browser, '?evlines=halloween#figdebug', { width: 390, height: 780 });
    const laneY = await page.evaluate(function () {
      var lanes = window.__evFigDebug.zombieLanes();
      if (!lanes.length) return null;
      window.scrollTo(0, Math.max(0, lanes[0] - window.innerHeight * 0.55));
      return Math.round(lanes[0]);
    });
    await page.waitForTimeout(500);
    want(laneY != null, 'phone: the page offers no lane at all at 390px');
    const spawned = await page.evaluate(function () { return !!window.__evFigDebug.zombieSpawn(); });
    want(spawned, 'phone: no zombie spawned, so the horizontal-scrollbar check proves nothing');
    await page.waitForTimeout(1200);
    const over = await page.evaluate(function () {
      return {
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
        zw: (window.__evFigDebug.zombies()[0] || {}).w
      };
    });
    want(over.zw > 0, 'phone: the zombie has no canvas width to test');
    want(over.scroll <= over.client,
      'phone: a zombie canvas gave the page a horizontal scrollbar (' + over.scroll + ' > ' + over.client + ')');
    want(errors.length === 0, 'phone: page errors — ' + errors.join(' | '));
    seen.push('phone 390px: lane ' + laneY + ', zombie canvas ' + over.zw + 'px, document ' +
              over.scroll + ' <= viewport ' + over.client);
    await page.close();
  }

  // ──────────────────────────────────────── 4. a real visitor, not a harness
  // The takeover is held OFF under an automated browser unless the harness names the tag,
  // so that the thirty-five unpinned tests stay deterministic. That guard is exactly the
  // shape of thing that hides a feature from every real visitor while every test still
  // passes — so this case stops pretending to be a robot and checks the page agrees with
  // the wall calendar. Nothing else in this file exercises the real-visitor path.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', function (e) { failures.push('real visitor: page error — ' + e); });
    await page.addInitScript(function () {
      Object.defineProperty(navigator, 'webdriver', { get: function () { return false; } });
    });
    await page.route('**/*', function (r) {
      return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
    });
    await page.goto(URL + '#figdebug');            // no ?evlines=: the real clock decides
    await page.waitForFunction(function () { return !!window.__evFigDebug; });
    const now = new Date();
    const inWindow = (now.getMonth() === 9 && now.getDate() >= 25);   // the ev-lines.js window
    const on = await page.evaluate(function () { return window.__evFigDebug.halloween; });
    want(on === inWindow,
      'real visitor: the takeover reports ' + on + ' but the calendar says ' + inWindow +
      ' — a guard meant for the harness is deciding what real visitors see');
    seen.push('real visitor (no ?evlines=): takeover ' + (on ? 'ON' : 'off') +
              ', calendar says ' + (inWindow ? 'in the window' : 'outside the window'));
    await page.close();
  }

  await browser.close();
  seen.forEach(function (s) { console.log('  ' + s); });
  if (failures.length) {
    failures.forEach(function (f) { console.error('FAIL ' + f); });
    throw new Error('halloween-zombies: ' + failures.length + ' failure(s)');
  }
  console.log('halloween-zombies: PASS (november gate, spawn, panic, cast thins, phone width)');
})();
