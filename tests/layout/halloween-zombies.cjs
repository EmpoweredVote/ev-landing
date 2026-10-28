// The Halloween takeover: a zombie Bobit shambles on, and anyone he reaches bolts.
//
// Five things here are easy to break without noticing, and three of them already bit once.
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
// 6. THE AMBUSH AND THE LINE ARE BOTH SILENT WHEN THEY BREAK. A zombie who comes in behind
//    a carrier still catches him, just at the screen edge where the drop is wasted; a
//    bubble wired to the wrong handle just never appears. Neither throws. Case 6.
//
// 5. HALF THE GAG IS A SPEED. A zombie slower than the people he is chasing can only ever
//    meet them head-on, and a head-on meeting works at any speed at all — so every other
//    case in this file passes just as happily with the chase quietly gone. Case 5 is the
//    only thing standing between ZOM.SPEED and that.
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
        // The SAME rule the scare uses: a figure belongs to his nearest rule, not to
        // whichever one happens to be within a fixed distance. Almost nobody on this page
        // stands on a rule at all — they stand on the top edges of cards.
        if (D.laneOf(feet, lanes) === lane) idx = j;
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
        // THE CAST, not everything on the page. The takeover ADDS entries while it runs — a work
        // crew when a rule already holds two zombies, a guard dog when a dogfetch owner bolts,
        // a ghost over the notes — so counting every non-zombie entry measured the cast leaving
        // minus the takeover arriving, and reported 11 -> 13 on a page where three people had
        // run. Runtime arrivals are not inhabitants; `spec.plain` is what marks a work crew.
        if (e.gone || e.spec.plain) return false;
        var m = e.spec.mode;
        return m !== 'why' && m !== 'zombie' && m !== 'ghost' && m !== 'dogguard';
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
      // ANYBODY STILL STANDING WILL DO. The case above waits for a WILD zombie to arrive and
      // walk, and he does not stop when it is done with him — he goes on frightening people.
      // The scare measures to the nearest BODY now rather than to the middle of a scene, so a
      // crew is frightened from up to a half-card further out than it used to be, and the lane
      // victim picked several seconds ago was regularly already mid-flight by the time this
      // case staged its own zombie beside him. It then read `fl` as "hlimp" and reported that
      // the panic had skipped the hands-up beat, which is a true reading of the wrong moment.
      //
      // Re-picking, rather than sweeping the lane first: the wild zombies are part of what the
      // two assertions after this one count, and walking them off the edge to tidy the staging
      // changed the number they measure.
      if (victim && !victim.gone && victim.w && victim.fl) {
        var lanes0 = D.zombieLanes();
        var standing = function () {
          var sy0 = window.scrollY || window.pageYOffset;
          return D.entries.find(function (e) {
            if (e.gone || e.fl || e.ab || !e.w || e.spec.presenter) return false;
            if (e.spec.mode === 'why' || e.spec.mode === 'zombie') return false;
            var r0 = e.c.getBoundingClientRect();
            if (r0.bottom < 20 || r0.top > window.innerHeight - 20) return false;
            return D.laneOf(r0.bottom - 6 + sy0, lanes0) != null;
          });
        };
        // Walk the rules if this screen has nobody left standing on one. A wild zombie can
        // have cleared the whole viewport by now, and "nobody HERE" is not "nobody".
        victim = standing();
        for (var li0 = 0; !victim && li0 < lanes0.length; li0++) {
          window.scrollTo(0, Math.max(0, lanes0[li0] - window.innerHeight * 0.55));
          await new Promise(function (r) { setTimeout(r, 500); });
          victim = standing();
        }
      }
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
        // THE CAST, not everything on the page. The takeover ADDS entries while it runs — a work
        // crew when a rule already holds two zombies, a guard dog when a dogfetch owner bolts,
        // a ghost over the notes — so counting every non-zombie entry measured the cast leaving
        // minus the takeover arriving, and reported 11 -> 13 on a page where three people had
        // run. Runtime arrivals are not inhabitants; `spec.plain` is what marks a work crew.
        if (e.gone || e.spec.plain) return false;
        var m = e.spec.mode;
        return m !== 'why' && m !== 'zombie' && m !== 'ghost' && m !== 'dogguard';
      }).length;
    });
    want(after < before, 'halloween: the cast did not thin out (' + before + ' -> ' + after + ')');
    seen.push('halloween: inhabitants ' + before + ' -> ' + after);

    // Retired zombies must not pile up: out of entries, and their backing store dropped.
    const husks = await page.evaluate(function () {
      var D = window.__evFigDebug;
      return {
        inEntries: D.entries.filter(function (e) { return e.spec.mode === 'zombie' && e.gone; }).length,
        live: D.zombies().length,
        cap: D.zomCap()
      };
    });
    want(husks.inEntries === 0, 'halloween: ' + husks.inEntries + ' retired zombie(s) left in entries');
    // Against the CAP AS IT STANDS, not against ZOM.MAX. The ceiling climbs with how long the
    // tab has been open — one more every ZOM.GROW seconds — and this case can run past the
    // first step of that climb on a slow machine, which would have failed a correct page.
    want(husks.live <= husks.cap, 'halloween: ' + husks.live + ' zombies at once, cap is ' + husks.cap);
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

  // ───────────────────────────── 5. he runs a carrier down from behind
  // Why ZOM.SPEED is 44 and not the 17 it shipped at. Every WALK on the page is slower than
  // he is — the beam carry 30, stroll 32, march 34, strut 40 — and every hurry is faster —
  // the button carry 51, scurry 62. So he overhauls anybody strolling and never catches
  // anybody running, which is the rule the number encodes.
  //
  // The gap is measured the whole way down rather than just asserted at the end, because
  // "he caught somebody" is also what it looks like when a DIFFERENT zombie wanders into the
  // same crew. Two things stop that counting: the cap is pinned to 1 for the duration, so the
  // scheduler cannot add one, and the panic is only accepted if OUR zombie was within
  // scaring distance when it fired.
  {
    const { page, errors } = await open(browser, '?evlines=halloween#figdebug');
    await page.evaluate(function () {
      var lane = window.__evFigDebug.zombieLanes()[0];      // the hero's bottom edge: the carry lane
      window.scrollTo(0, Math.max(0, lane - window.innerHeight * 0.60));
    });
    await page.waitForTimeout(500);

    const chase = await page.evaluate(async function () {
      var D = window.__evFigDebug;
      var beam = D.entries.filter(function (e) { return e.spec.mode === 'beam'; })[0];
      if (!beam) return { err: 'the beam crew are not cast' };
      var at = function () {
        return beam.c.getBoundingClientRect().left + (beam._figX != null ? beam._figX : beam.w / 2);
      };
      // WHERE THE BACK OF THE CREW IS, which is not where the middle of it is. `_figX` is the
      // MIDPOINT between the two carriers, and with the Fallacy Finders button they stand a
      // half-card — about 178px — either side of it. The page frightens them off the body
      // NEAREST the zombie, so a chase staged and measured from the midpoint is 178px wrong in
      // both directions: he starts almost on top of them, and when they bolt the midpoint is
      // still ~296px away, which this case then reported as "something else frightened them".
      // It only went wrong on the passes that happened to deal the button, which is why it
      // failed about one run in four. Measure the carrier he actually reaches.
      var dir = 0, crewSpeed = 0;
      var rear = function () {
        var r = beam.c.getBoundingClientRect();
        if (!beam._bodies || !beam._bodies.length) return at();
        var best = r.left + beam._bodies[0].x;
        for (var i = 1; i < beam._bodies.length; i++) {
          var bx = r.left + beam._bodies[i].x;
          if ((bx - best) * dir < 0) best = bx;
        }
        return best;
      };

      // CLEAR THE LANE FIRST, before the wait below and not after it. Working out which way
      // the crew are walking takes up to twenty-four seconds, and the scheduler puts a zombie
      // on the carry lane every thirteen to twenty-four — so on the slow path a wild one
      // reaches them while this is still deciding, and everything after that is measuring an
      // empty chase. Pinning the cap to nought stops any more arriving; -400 walks the ones
      // already here off the left edge, where drawZombie retires them.
      D.zom.MAX = 0; D.zom.MAX_END = 0;
      D.zombies().forEach(function (e) { if (!e.gone) e.zX = -400; });
      await new Promise(function (r) { setTimeout(r, 200); });
      if (beam.fl) return { err: 'the crew were already running before the chase began ("' + beam.fl + '")' };

      // Wait for them to be WALKING and read which way off their own movement. Setting
      // beam.scene = 'carry' instead restarts the pass at the left edge, which drops them on
      // top of wherever the zombie was just put and reports a catch in half a second — that
      // is a staging artefact, and it is what the first version of this measured.
      //
      // The upper bound matters as much as the lower one: the light gag walks at 104px/s and
      // he is not supposed to catch that. Only a carry pass is slower than he is.
      for (var i = 0; i < 60 && !dir; i++) {
        var a = at();
        await new Promise(function (r) { setTimeout(r, 400); });
        var moved = at() - a, v = Math.abs(moved) / 0.4;
        if (v > 6 && v < D.zom.SPEED) { dir = moved > 0 ? 1 : -1; crewSpeed = v; }
      }
      if (!dir) return { err: 'the beam crew never took a pass slower than the zombie' };

      // Room for exactly one: ours.
      D.zom.MAX = 1; D.zom.MAX_END = 1;
      if (!D.zombieSpawn()) return { err: 'no lane on screen to spawn onto' };
      var z = D.zombies().filter(function (e) { return !e.gone; }).pop();
      // ON THE CREW'S OWN RULE. The spawn picks among the lanes in view and only WEIGHTS the
      // carry lane, so a chase staged without saying which rule it happens on is really a
      // measurement of the dice: a zombie one rule down is correctly ignored by the scare and
      // walks the whole way past them.
      var sy5 = window.scrollY || window.pageYOffset;
      z.zLaneDoc = D.laneOf(beam.c.getBoundingClientRect().bottom - 6 + sy5, D.zombieLanes());
      z.c.style.top = (z.zLaneDoc - (z.h - 6)) + 'px';
      await new Promise(function (r) { setTimeout(r, 60); });
      // 240px BEHIND them has to be a place that exists. The crew walk the full width and turn
      // round at each end, so for part of every pass the ground behind them is off the canvas —
      // put him there and drawZombie retires him on the next frame, before he has taken a step.
      // That failed as "the gap was still 244px", which is a true statement about a zombie who
      // was never on the page. Wait for a pass with room behind it instead.
      var gap0 = 240, zl = z.c.getBoundingClientRect().left, startX = 0;
      var fits = false;
      for (var w5 = 0; w5 < 25 && !fits; w5++) {
        startX = (rear() - dir * gap0) - zl;
        if (startX > 20 && startX < z.w - 20) { fits = true; break; }
        await new Promise(function (r) { setTimeout(r, 600); });
        zl = z.c.getBoundingClientRect().left;
      }
      if (!fits) return { err: 'the crew never walked far enough from an edge to stand 240px behind them' };
      z.zX = startX;
      z.zDir = dir;

      var gapNow = function () {
        return (rear() - (z.c.getBoundingClientRect().left + z.zX)) * dir;
      };
      var t0 = performance.now(), caught = false, gap = gap0, why = 'timeout';
      while (performance.now() - t0 < 30000) {
        await new Promise(function (r) { setTimeout(r, 250); });
        gap = gapNow();
        if (beam.fl) { caught = true; why = 'fl'; break; }
        if (z.gone) { why = 'zombie gone at zX=' + Math.round(z.zX) + '/' + z.w + ' lane ' + Math.round(z.zLaneDoc); break; }
        if (beam.gone) { why = 'beam gone'; break; }
      }
      return { crewSpeed: Math.round(crewSpeed), zomSpeed: D.zom.SPEED, scare: D.zom.SCARE,
               gap0: gap0, gap: Math.round(gap), caught: caught, state: beam.fl || null,
               secs: +((performance.now() - t0) / 1000).toFixed(1), why: why, dir: dir };
    });

    want(!chase.err, 'behind: ' + chase.err);
    if (!chase.err) {
      want(chase.zomSpeed > chase.crewSpeed,
        'behind: the zombie walks ' + chase.zomSpeed + 'px/s against a crew at ' + chase.crewSpeed +
        'px/s, so he can never run anybody down — only meet them head-on');
      want(chase.caught,
        'behind: [' + chase.why + ' dir' + chase.dir + '] he started ' + chase.gap0 + 'px back and after ' + chase.secs +
        's the gap was still ' + chase.gap + 'px');
      want(chase.state === 'raise',
        'behind: the catch skipped the hands-up beat (started in "' + chase.state + '")');
      want(chase.gap <= chase.scare + 40,
        'behind: they bolted with our zombie ' + chase.gap + 'px off, well outside ZOM.SCARE ' +
        chase.scare + ' — something else frightened them and the chase proved nothing');
      seen.push('behind: ' + chase.zomSpeed + 'px/s ran down a crew at ' + chase.crewSpeed +
                'px/s — ' + chase.gap0 + 'px closed to ' + chase.gap + 'px in ' + chase.secs + 's');
    }
    want(errors.length === 0, 'behind: page errors — ' + errors.join(' | '));
    await page.close();
  }

  // ──────────────── 6. the ambush, and the one thing he has to say
  // Two behaviours that fail quietly. The AMBUSH is a spawn side: get it wrong and he still
  // catches the carrier, just from behind and at the edge of the screen, where the dropped
  // beam lands outside the viewport and nobody sees the point of any of it. The LINE is a
  // bubble handle: wire it wrong and clicking him does nothing at all. Neither throws, and
  // every other case in this file passes either way.
  {
    const { page, errors } = await open(browser, '?evlines=halloween#figdebug');
    await page.evaluate(function () {
      var lane = window.__evFigDebug.zombieLanes()[0];
      window.scrollTo(0, Math.max(0, lane - window.innerHeight * 0.60));
    });
    await page.waitForTimeout(500);

    // Both directions. One of them passes by accident whichever way round the sign is.
    for (const heading of [1, -1]) {
      const r = await page.evaluate(async function (d) {
        var D = window.__evFigDebug;
        D.zom.MAX = 1; D.zom.MAX_END = 1;              // nobody else wanders in mid-measurement
        D.zombies().forEach(function (e) { if (!e.gone) e.zX = -400; });
        await new Promise(function (r) { setTimeout(r, 150); });
        var beam = D.entries.filter(function (e) { return e.spec.mode === 'beam'; })[0];
        if (!beam) return { err: 'the beam crew are not cast' };
        beam.scene = 'carry'; beam.dir = d; beam.dwell = 0; beam.greet = 0;
        var head = D.carrierHeading(beam);
        if (!D.zombieSpawn()) return { err: 'no lane on screen to spawn onto' };
        var z = D.zombies().filter(function (e) { return !e.gone; }).pop();
        return { head: head, zDir: z.zDir, at: Math.round(z.zX), w: z.w };
      }, heading);
      want(!r.err, 'ambush: ' + r.err);
      if (r.err) break;
      want(r.head === heading,
        'ambush: carrierHeading read ' + r.head + ' for a crew walking ' + heading);
      want(r.zDir === -heading,
        'ambush: the crew walk ' + heading + ' and the zombie walks ' + r.zDir +
        ' — he is following them rather than meeting them');
      want((r.at > r.w / 2) === (heading > 0),
        'ambush: crew walking ' + heading + ', zombie entered at x=' + r.at + ' of ' + r.w +
        ' — the wrong edge, so the drop happens behind them');
      seen.push('ambush: crew heading ' + (heading > 0 ? 'right' : 'left') +
                ' -> zombie in at x=' + r.at + '/' + r.w + ' walking ' + r.zDir);
    }

    // And the whole point of meeting him head-on: the load goes down HERE, and the carrier
    // turns round and goes back the way he came rather than carrying on into him.
    const meet = await page.evaluate(async function () {
      var D = window.__evFigDebug;
      var beam = D.entries.filter(function (e) { return e.spec.mode === 'beam'; })[0];
      if (!beam) return { err: 'the beam crew are not cast' };
      var at = function () {
        return beam.c.getBoundingClientRect().left + (beam._figX != null ? beam._figX : beam.w / 2);
      };

      // DO NOT force beam.scene = 'carry'. Setting it restarts the pass from the off-screen
      // edge, which teleports the crew a screen away from wherever the zombie was just put;
      // they then need thirty-odd seconds to walk back into him and the case times out having
      // measured nothing. Case 5 says the same thing and this is where it was relearned.
      // Watch them instead, and only act once they are actually walking.
      D.zom.MAX = 0; D.zom.MAX_END = 0;
      D.zombies().forEach(function (e) { if (!e.gone) e.zX = -400; });
      await new Promise(function (r) { setTimeout(r, 200); });
      var cdir = 0;
      for (var ci = 0; ci < 60 && !cdir; ci++) {
        var ca = at();
        await new Promise(function (r) { setTimeout(r, 400); });
        var cm = at() - ca, cv = Math.abs(cm) / 0.4;
        if (cv > 6 && cv < D.zom.SPEED) cdir = cm > 0 ? 1 : -1;
      }
      if (!cdir) return { err: 'the beam crew never took a pass slower than the zombie' };

      D.zom.MAX = 1; D.zom.MAX_END = 1;
      if (!D.zombieSpawn()) return { err: 'no lane on screen to spawn onto' };
      var z = D.zombies().filter(function (e) { return !e.gone; }).pop();
      // PUT HIM ON THE CREW'S OWN RULE. The spawn picks among the lanes in view and the carry
      // lane is only weighted, not guaranteed — so staging a meeting without saying which rule
      // it happens on measures whichever lane the dice chose. A zombie one rule down is
      // correctly ignored by the scare, and the case then fails for a reason that has nothing
      // to do with what it is testing.
      var sy = window.scrollY || window.pageYOffset;
      var beamFloor = beam.c.getBoundingClientRect().bottom - 6 + sy;
      z.zLaneDoc = D.laneOf(beamFloor, D.zombieLanes());
      z.c.style.top = (z.zLaneDoc - (z.h - 6)) + 'px';
      await new Promise(function (r) { setTimeout(r, 60); });
      // 150px AHEAD of them, in the direction they are already walking, facing back at them.
      z.zX = (at() + cdir * 150) - z.c.getBoundingClientRect().left;
      z.zDir = -cdir;
      var t0 = performance.now();
      while (performance.now() - t0 < 12000) {
        await new Promise(function (r) { setTimeout(r, 200); });
        if (beam.fl) break;
      }
      return { fl: beam.fl || null, flDir: beam.flDir, cdir: cdir,
               kept: D.drops().filter(function (d) { return d.keep; }).length };
    });
    want(!meet.err, 'ambush: ' + meet.err);
    if (!meet.err) {
      want(meet.fl === 'raise', 'ambush: the crew did not throw their hands up ("' + meet.fl + '")');
      want(meet.flDir === -meet.cdir,
        'ambush: the crew were walking ' + meet.cdir + ' and the carrier ran ' + meet.flDir +
        ' — into the zombie, not back the way he came');
      want(meet.kept >= 1, 'ambush: he ran without dropping anything (' + meet.kept + ' kept)');
      seen.push('ambush: met head-on walking ' + meet.cdir + ' -> ' + meet.fl + ', runs ' +
                meet.flDir + ', leaves ' + meet.kept);
    }

    // Click him. Unlike every other bubble on this page his walks with him, because he does
    // not stop to say it — so the follow is asserted, not just the opening.
    const say = await page.evaluate(async function () {
      var D = window.__evFigDebug;
      D.zom.MAX = 1; D.zom.MAX_END = 1;
      D.zombies().forEach(function (e) { if (!e.gone) e.zX = -400; });
      // The ambush case above leaves a crew mid-flight, and a runner who meets a zombie is now
      // CAUGHT — which takes the zombie off the page with him and closes the bubble this case is
      // measuring. Sweep the runners before spawning the one who talks.
      D.entries.forEach(function (e) {
        if (e.fl && !e.gone) { e.gone = true; if (e.c.parentNode) e.c.parentNode.removeChild(e.c); }
      });
      D.convs().length = 0;
      await new Promise(function (r) { setTimeout(r, 200); });
      if (!D.zombieSpawn()) return { err: 'no lane on screen to spawn onto' };
      var z = D.zombies().filter(function (e) { return !e.gone; }).pop();
      z.zX = z.w * 0.5;                       // mid-screen, so the bubble is not clamped
      await new Promise(function (r) { setTimeout(r, 120); });
      // ONE dispatch: the canvas is pointer-events:none, the handler is the document's, and
      // a second dispatch is a second click, which toggles the bubble straight back off.
      document.dispatchEvent(new MouseEvent('click',
        { bubbles: true, clientX: z._zSX, clientY: z._zFY - 40 }));
      await new Promise(function (r) { setTimeout(r, 200); });
      var el = document.querySelector('.ev-quote.ev-say');
      var x0 = el ? el.getBoundingClientRect().left : null;
      await new Promise(function (r) { setTimeout(r, 1200); });
      var el2 = document.querySelector('.ev-quote.ev-say');
      var x1 = el2 ? el2.getBoundingClientRect().left : null;
      // and again: it goes away
      document.dispatchEvent(new MouseEvent('click',
        { bubbles: true, clientX: z._zSX, clientY: z._zFY - 40 }));
      await new Promise(function (r) { setTimeout(r, 300); });
      return { text: el ? el.textContent.trim() : null, said: z.zSay,
               followed: (x0 != null && x1 != null) ? Math.round(x1 - x0) : null,
               stillOpen: !!z.zh, egg: D.zom.EGG };
    });
    want(!say.err, 'says: ' + say.err);
    if (!say.err) {
      want(say.text === say.said,
        'says: the bubble reads "' + say.text + '" but he was handed "' + say.said + '"');
      want(/brains|Happy Halloween/.test(say.text || ''), 'says: unexpected line "' + say.text + '"');
      want(Math.abs(say.followed || 0) > 20,
        'says: the bubble stayed put while he walked off from under it (moved ' +
        say.followed + 'px in 1.2s)');
      want(!say.stillOpen, 'says: clicking him a second time did not put it away');
      seen.push('says: "' + say.text + '", bubble tracked ' + say.followed + 'px, click again closes');
    }
    want(errors.length === 0, 'ambush/says: page errors — ' + errors.join(' | '));
    await page.close();
  }

  // ───────────────────────────────────── 7. the host never runs
  // He is the one figure on the page who is talking TO you, and EVQuotes places his bubble
  // over his head ONCE and leaves it there — so when he bolted, his words hung in mid-air
  // with nobody under them. Chris saw it live.
  //
  // It was not a scare bug; it was the nearest-lane rule doing its job. He stands on the
  // meta-row, 141px above the carry lane, so the moment a figure belonged to its NEAREST
  // rule rather than to one within a lane's width, he belonged to the lane the beam crew
  // walk and every zombie that came along went for him. He is purple, so the two seconds of
  // him in a heap on the floor read as "purple smoke" — and because everyone who runs comes
  // back as a zombie, the page then had one more than it started with.
  {
    const { page, errors } = await open(browser, '?evlines=halloween#figdebug');
    await page.evaluate(function () {
      var lane = window.__evFigDebug.zombieLanes()[0];
      window.scrollTo(0, Math.max(0, lane - window.innerHeight * 0.62));
    });
    await page.waitForTimeout(500);

    const held = await page.evaluate(async function () {
      var D = window.__evFigDebug;
      var h = D.entries.filter(function (e) { return e.spec.presenter; })[0];
      if (!h) return { err: 'the presenter is not cast' };
      var sy = window.scrollY || window.pageYOffset;
      var feet = h.c.getBoundingClientRect().bottom - 6 + sy;
      var lanes = D.zombieLanes();
      var lane = D.laneOf(feet, lanes);
      D.zom.MAX = 1; D.zom.MAX_END = 1;
      D.zombies().forEach(function (e) { if (!e.gone) e.zX = -400; });
      await new Promise(function (r) { setTimeout(r, 150); });
      if (!D.zombieSpawn()) return { err: 'no lane on screen to spawn onto' };
      var z = D.zombies().filter(function (e) { return !e.gone; }).pop();
      // Onto the host's own rule, then parked on top of him for five seconds.
      z.zLaneDoc = lane;
      z.c.style.top = (lane - (z.h - 6)) + 'px';
      await new Promise(function (r) { setTimeout(r, 60); });
      var t0 = performance.now();
      while (performance.now() - t0 < 5000) {
        await new Promise(function (r) { setTimeout(r, 120); });
        var r2 = h.c.getBoundingClientRect();
        z.zX = (r2.left + (h._figX != null ? h._figX : h.w / 2)) - z.c.getBoundingClientRect().left;
        if (h.fl) break;
      }
      return { fl: h.fl || null, gone: !!h.gone, tone: h.spec.tone,
               above: Math.round(lane - feet) };
    });
    want(!held.err, 'host: ' + held.err);
    if (!held.err) {
      want(held.fl === null,
        'host: he bolted ("' + held.fl + '") with a zombie on his rule — his bubble is placed ' +
        'once and would be left hanging in the air with nobody under it');
      want(!held.gone, 'host: he left the page entirely');
      seen.push('host: tone ' + held.tone + ', ' + held.above +
                'px above his nearest rule, stayed put through 5s of a zombie on top of him');
    }
    want(errors.length === 0, 'host: page errors — ' + errors.join(' | '));
    await page.close();
  }

  // ───────────────────────────── 8. he is not drawn in the cast's green
  // ZOM.COL, not figColor(ZOM.TONE). On the palette green he was the same ink as a living
  // Bobit, which reads as a cheerful man with his arms out rather than something drained —
  // and the whole gag is that you can tell at a glance which of them has turned.
  //
  // Asked of the PIXELS in both themes, because the fault this guards against is a colour
  // looking right in one of them: the dark palette's green is three shades lighter than the
  // light one's, so a value picked against a white page can come back glowing on a black one.
  {
    const { page, errors } = await open(browser, '?evlines=halloween#figdebug');
    for (const theme of ['light', 'dark']) {
      const r = await page.evaluate(async function (th) {
        var D = window.__evFigDebug;
        document.documentElement.dataset.theme = th;
        var lane = D.zombieLanes()[0];
        window.scrollTo(0, Math.max(0, lane - window.innerHeight * 0.62));
        await new Promise(function (r) { setTimeout(r, 300); });
        var z = D.makeZombie(lane, 1, 300);
        await new Promise(function (r) { setTimeout(r, 600); });
        var g = z.c.getContext('2d');
        var d = g.getImageData(0, 0, z.c.width, z.c.height).data;
        var tally = {}, top = null;
        for (var i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 200) continue;
          var k = '#' + [d[i], d[i + 1], d[i + 2]].map(function (v) {
            return (v < 16 ? '0' : '') + v.toString(16);
          }).join('').toUpperCase();
          tally[k] = (tally[k] || 0) + 1;
          if (!top || tally[k] > tally[top]) top = k;
        }
        z.gone = true; z.c.width = z.c.height = 0;
        if (z.c.parentNode) z.c.parentNode.removeChild(z.c);
        return { ink: top, px: tally[top], want: D.zomColor().toUpperCase(),
                 cast: (th === 'dark' ? '#43D07E' : '#2E9E5B') };
      }, theme);
      want(r.px > 200, theme + ' ink: only ' + r.px + 'px of solid colour — he was not drawn');
      want(r.ink === r.want,
        theme + ' ink: he is drawn ' + r.ink + ', not ZOM.COL ' + r.want);
      want(r.ink !== r.cast,
        theme + " ink: he is still the cast's green " + r.cast + ' — a zombie and a living ' +
        'Bobit are the same colour');
      seen.push('ink (' + theme + '): ' + r.px + 'px of ' + r.ink + ', cast green is ' + r.cast);
    }
    want(errors.length === 0, 'ink: page errors — ' + errors.join(' | '));
    await page.close();
  }

  await browser.close();
  seen.forEach(function (s) { console.log('  ' + s); });
  if (failures.length) {
    failures.forEach(function (f) { console.error('FAIL ' + f); });
    throw new Error('halloween-zombies: ' + failures.length + ' failure(s)');
  }
  console.log('halloween-zombies: PASS (november gate, spawn, panic, cast thins, phone width, chase from behind, ambush, the line, host holds, his own green)');
})();
