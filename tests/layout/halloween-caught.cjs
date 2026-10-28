// What happens when a zombie actually REACHES somebody — and what stops the page turning into a
// parade of shamblers with nobody left to shamble at.
//
// 1. A RUNNER CAN BE CAUGHT. The scare loop skipped anyone already fleeing, so a Bobit could
//    sprint the length of the page straight THROUGH a second zombie and out the other side. That
//    is the most common way the two ever meet — a runner crosses the whole viewport and a zombie
//    is standing in the middle of it — so the thing you saw most often was the thing that did
//    nothing. He is taken by purple smoke now, and one of them walks out of it.
//
//    It is a two-second SCENE, not a swap: both of them go over, the smoke takes the pair, and
//    two of them walk out of it. So the catch removes the catching zombie as well as his victim,
//    and the live count has to DIP at the moment of contact before it comes back up.
//
//    The CENSUS is the half of this worth guarding. Everyone who flees is already booked to come
//    back as a zombie (zomQueue) — one booking per BODY, because an entry can be a whole crew —
//    and being caught SPENDS a booking rather than adding to it. Two placed by hand, one of them
//    taken, two out of the smoke: +3. Get it wrong and the page quietly inflates its population
//    every time somebody is caught, which nothing else here would notice.
//
// 1b. A CREW IS CAUGHT ONE CARRIER AT A TIME, and is frightened by the carrier NEAREST the
//    zombie rather than by the midpoint between them. Both halves of "the people carrying the
//    fallacy finders banner are walking past the zombie without converting or triggering a
//    conversion": the scare measured to `_figX`, a half-card (~178px) from either carrier against
//    a SCARE of 118, and the catch skipped any entry with mates because taking the entry would
//    have deleted the rest of them.
//
// 1c. THE DROPPED BAR IS A BAR. The circle load and the line load share one prop kind on purpose
//    (tests/poof/14-card-prop.cjs asserts it), so the line's length has to travel beside the kind
//    or it lands as the circle's ball. "When they drop a bar, it is turning into a yellow circle."
//
// 2. A BUSY RULE GETS A WORK CREW, NOT A THIRD ZOMBIE. Two on a line is a crowd; three is a
//    queue. The third arrival is cast at runtime as an ordinary beam crew anchored to the section
//    whose edge that rule is — so the assertion that matters is that it lands ON the rule. A crew
//    placed a section away is invisible rather than broken, which is the kind of wrong that
//    survives a release.
//
//    And the rule is THE CARRY LANE, the hero's bottom edge, and nothing else: "the carry scenes
//    only live above 01 and below the host." A crew hauling a yellow line across the 02 / 03
//    divider is the same animation playing in a room it does not belong in, so every other lane
//    has to refuse one and leave the caller to cast an ordinary zombie.
//
// 3. THE DOG DOES NOT RUN AND DOES NOT CONVERT. He is moved onto his own entry the moment his
//    owner is frightened, because the owner's canvas is about to belong to drawFlee. He backs off
//    barking, and only when he is boxed in on both sides does he leap — knocking exactly ONE
//    zombie down. "Exactly one" is the assertion: the nearest-on-each-side test stores distances
//    as positive numbers and compared one of them signed, which kept whichever zombie was found
//    first rather than the nearest.
//
// 4. THE CLICK-EXODUS MUST NOT ARM THE TAKEOVER'S OWN FIGURES. A zombie, a ghost and the guard
//    dog have no anchor element, and the exodus is built on the anchor — `poofArmFlee` reads
//    `e.el` for the perch the runner leaps off. Arming one threw, and because the arming runs
//    inside `tick()` the throw took the WHOLE FIGURE LAYER down for the rest of the session:
//    hold any Bobit for three seconds with a zombie on screen and everybody stopped moving. No
//    existing test could see it, because the takeover is gated off under an automated browser
//    unless `?evlines=` names it, so the poof tests never have a zombie on the page.
//
// Needs Playwright and its browsers — see "Tests" in README.md:
//   node tests/layout/halloween-caught.cjs
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
  // index.html sets `html { scroll-behavior: smooth }`, so every scrollTo is an ANIMATION.
  await page.evaluate(function () { document.documentElement.style.scrollBehavior = 'auto'; });
  await page.waitForTimeout(600);
  return { page: page, errors: errors };
}

// Start every case from a FRESH LOAD, parked on the carry rule.
//
// Sweeping the page by hand was not enough and the ways it failed were all different: the crew
// budget is a lifetime count that nothing refunds, a runner left mid-flight now takes the next
// case's zombie off the page with him when he is caught, and sweeping the runners instead takes
// the Fallacy Finders crew that a later case needs. A reload costs a second and a half and is
// the only version of this that is actually true.
async function reset(page) {
  await page.reload();
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  await page.evaluate(function () { document.documentElement.style.scrollBehavior = 'auto'; });
  await page.waitForTimeout(500);
  await page.evaluate(function () {
    var D = window.__evFigDebug;
    window.scrollTo(0, Math.max(0, D.zombieLanes()[0] - window.innerHeight * 0.62));
  });
  await page.waitForTimeout(500);
}

(async function () {
  const browser = await chromium.launch();
  const seen = [];

  // ───────────────────────────── 1. November: none of this machinery runs
  {
    const { page } = await open(browser, '?evlines=morning#figdebug');
    await page.waitForTimeout(12000);
    const n = await page.evaluate(function () {
      var D = window.__evFigDebug;
      return { z: D.zombies().length, crews: D.crews().length, dogs: D.dogGuards().length,
               conv: D.convs().length };
    });
    want(n.z === 0 && n.crews === 0 && n.dogs === 0 && n.conv === 0,
      'november: ' + JSON.stringify(n) + ' on a page that is not Halloween');
    seen.push('november: no zombies, no crews, no dogs, no smoke after 12s');
    await page.close();
  }

  const { page, errors } = await open(browser, '?evlines=halloween#figdebug');
  // ───────────────────────────── 2. a runner who meets a second zombie is converted
  //
  // The victim is deliberately a ONE-BODY entry. A crew is a separate case below, because a crew
  // survives its first catch — the rest of it keeps running — and the census arithmetic is then a
  // different sum.
  await reset(page);
  {
    const r = await page.evaluate(async function () {
      var D = window.__evFigDebug;
      var sx = window.scrollX || 0, vh = window.innerHeight;
      var lanes = D.zombieLanes();
      function oneBodyOnScreen() {
        return D.entries.find(function (e) {
          if (e.gone || e.fl || !e.w || e.spec.presenter) return false;
          if (['zombie', 'ghost', 'why', 'dogguard'].indexOf(e.spec.mode) >= 0) return false;
          if (e._bodies && e._bodies.length > 1) return false;      // one body: see the note above
          // FULLY in view, not merely overlapping it. A figure hanging off the top of the screen
          // has his feet on one rule and his canvas nearest another, so the lane read off his rect
          // is not the lane he is standing on and the zombie is placed somewhere he will never be.
          var q = e.c.getBoundingClientRect();
          if (!(q.top > 20 && q.bottom < vh - 20)) return false;
          // AND standing near a rule. A Bobit on a card 150px above the line is frightened by a
          // zombie walking it — laneOf answers "nearest" with no distance — but he can never be
          // TOUCHED by one, because CONV_Y keeps the smoke and the pair that rise out of it on the
          // same line. That is the product's answer, not a bug; it just makes him the wrong victim
          // for this case.
          var feet = q.bottom - 6 + window.scrollY;
          var ln = D.laneOf(feet, D.zombieLanes());
          return ln != null && Math.abs(feet - ln) <= D.zom.CONV_Y;
        });
      }
      // The carry rule is usually the beam crew and nothing else, so walk the rules until a
      // single-figure entry is in view rather than giving up on the first screen. Twice round,
      // because half this cast is walking: a patrol or a crosser who was off the side of his own
      // canvas on the first pass is in the middle of it a few seconds later.
      var v = oneBodyOnScreen();
      for (var pass = 0; !v && pass < 2; pass++) {
        for (var li = 0; !v && li < lanes.length; li++) {
          window.scrollTo(0, Math.max(0, lanes[li] - vh * 0.62));
          await new Promise(function (r) { setTimeout(r, 600); });
          v = oneBodyOnScreen();
        }
      }
      if (!v) return { err: 'no single-figure Bobit anywhere on the page to scare' };
      var sy = window.scrollY || 0;
      var lane = D.laneOf(v.c.getBoundingClientRect().bottom - 6 + sy, lanes);
      D.zom.MAX = 8; D.zom.MAX_END = 8;
      var before = D.zombies().filter(function (z) { return !z.gone; }).length;
      D.dropProp(v, sx, sy, true);

      // Scare him the way the page does — a real zombie held on top of him — rather than by
      // calling the flee machinery, so the whole path under test is the one that ships.
      if (!D.zombieSpawn()) return { err: 'spawn refused' };
      var z1 = D.zombies().filter(function (z) { return !z.gone; }).pop();
      z1.zLaneDoc = lane; z1.c.style.top = (lane - (z1.h - 6)) + 'px';
      var t0 = performance.now();
      while (performance.now() - t0 < 8000 && !v.fl) {
        await new Promise(function (r) { setTimeout(r, 90); });
        var q = v.c.getBoundingClientRect();
        z1.zX = (q.left + (v._figX != null ? v._figX : v.w / 2)) - z1.c.getBoundingClientRect().left;
      }
      if (!v.fl) {
        var qq = v.c.getBoundingClientRect(), zq = z1.c.getBoundingClientRect();
        return { err: 'he never ran: a ' + v.spec.mode + ' at lane ' + Math.round(lane) +
          ', his rect ' + Math.round(qq.top) + '..' + Math.round(qq.bottom) + ' of ' + vh +
          ', his own lane ' + Math.round(D.laneOf(qq.bottom - 6 + window.scrollY, D.zombieLanes())) +
          ', zombie lane ' + Math.round(z1.zLaneDoc) + ' rect top ' + Math.round(zq.top) +
          ', gap ' + Math.round(Math.abs((qq.left + (v._figX || v.w / 2)) - (zq.left + z1.zX))) +
          ', zombie gone ' + !!z1.gone };
      }

      // ...and now a SECOND one in his path.
      if (!D.zombieSpawn()) return { err: 'second spawn refused' };
      var z2 = D.zombies().filter(function (z) { return !z.gone; }).pop();
      z2.zLaneDoc = lane; z2.c.style.top = (lane - (z2.h - 6)) + 'px';
      var phases = [], prevLive = 0;
      t0 = performance.now();
      // Exit on HIM being taken, not on there being smoke somewhere. The page spawns zombies of
      // its own throughout, so somebody else's conversion can open while this one is still running
      // and the case would then measure a scene it did not set up.
      while (performance.now() - t0 < 12000 && !v.gone) {
        prevLive = D.zombies().filter(function (z) { return !z.gone; }).length;
        await new Promise(function (r) { setTimeout(r, 70); });
        phases.push(v.fl);
        z2.zX = (v.flLeft + v.flX) - z2.zLeft;
        z2.zDown = 0;                                  // keep him on his feet; nothing else is after him
        // FOLLOW HIM DOWN. A runner whose perch ends drops to the rule below and limps away on
        // it, and a zombie left on the rule above is then on a different line from him and can
        // never catch him. The page does not have to solve that — there are zombies on every rule
        // — but a test holding exactly one does.
        var nowLane = D.laneOf(v.flTopDoc + v.flFloor + (v.flYOff || 0), D.zombieLanes());
        if (nowLane != null && Math.round(nowLane) !== Math.round(z2.zLaneDoc)) {
          z2.zLaneDoc = nowLane;
          z2.c.style.top = (nowLane - (z2.h - 6)) + 'px';
        }
      }
      var smoking = D.convs().length;
      // BOTH BODIES GO DOWN AND BOTH GO. The catching zombie is taken with his victim — that is
      // what makes two rise out of one puff — so the live count DROPS at the moment of the catch
      // and only comes back at CONV_UP.
      // EITHER of the two placed zombies may be the one who got him: z1 is still standing where
      // he frightened him. The assertion is that ONE of them went down with him, which the dip in
      // the live count below says the same way.
      var caughtGone = !!v.gone, zGone = !!z1.gone || !!z2.gone;
      var live = D.zombies().filter(function (z) { return !z.gone; });
      var atCatch = live.length;
      // WHO ROSE OUT OF THIS SMOKE, not how many zombies the page has. Over the two seconds the
      // scene takes, the takeover's own spawner and the return queue both add zombies of their
      // own, so a total is a number that is right until it is not. His conversion is the last one
      // pushed; the two it makes stand on its rule, a stride either side of where the pair fell.
      var cv = D.convs()[D.convs().length - 1] || null;
      // past CONV_UP, and before a new one has walked far from where he got up
      await new Promise(function (r) { setTimeout(r, 2400); });
      var risen = !cv ? -1 : D.zombies().filter(function (z) {
        if (z.gone || live.indexOf(z) >= 0) return false;
        if (Math.round(z.zLaneDoc) !== Math.round(cv.lane)) return false;
        return Math.abs((z.zLeft + z.zX) - (cv.px + cv.zx) / 2) < 120;
      }).length;
      return { mode: v.spec.mode, gone: caughtGone, zGone: zGone, smoking: smoking,
               before: before, prevLive: prevLive, atCatch: atCatch, risen: risen,
               after: D.zombies().filter(function (z) { return !z.gone; }).length,
               phases: Array.from(new Set(phases)).join(',') };
    });
    want(!r.err, 'caught: ' + r.err);
    if (!r.err) {
      want(r.gone, 'the runner walked through a zombie untouched (phases seen: ' + r.phases + ')');
      want(r.smoking > 0, 'he was taken with no smoke over him');
      want(r.zGone, 'the zombie who caught him stayed on his feet — the pair has to go down together');
      // Counted as DELTAS off the frame before the catch, never as absolutes. The page keeps
      // spawning its own zombies throughout, so "there should be exactly three" is a sum that is
      // right until the takeover adds a fourth of its own and the case fails for no reason.
      want(r.atCatch === r.prevLive - 1,
        'the live count went ' + r.prevLive + ' -> ' + r.atCatch + ' at the catch; it has to drop ' +
        'by exactly one, because the zombie who got him goes down with him');
      want(r.risen === 2,
        r.risen + ' zombie(s) came out of the smoke on that rule, want exactly 2');
      seen.push('caught: a ' + r.mode + ' taken mid-' + r.phases + '; the live count went ' +
                r.prevLive + ' -> ' + r.atCatch + ' at the catch, and ' + r.risen +
                ' rose out of the smoke');
    }
  }

  // ───────────────────────────── 2b. a CREW is caught one carrier at a time
  //
  // "The people carrying the fallacy finders banner are walking past the zombie without converting
  // or triggering a conversion." Two separate faults, and this case covers both.
  //
  // TRIGGERING. The scare measured the gap to `_figX`, which for a crew is the MIDPOINT between
  // the two of them — and with the button load that is a half-card, ~178px, from either carrier.
  // SCARE is 118. So the zombie walked through the front carrier and most of the banner before he
  // was close enough to anything, and if they turned at the screen edge first he never was.
  //
  // CONVERTING. A fleeing entry draws its whole crew on one canvas, so catching "the entry" would
  // have deleted the rest of them, and the pair was skipped outright. The catch is per BODY now:
  // the nearest one is taken and the entry runs on with one fewer.
  await reset(page);
  {
    const r = await page.evaluate(async function () {
      var D = window.__evFigDebug;
      var b = D.entries.find(function (e) { return e.spec.mode === 'beam' && !e.gone && e.w; });
      if (!b) return { err: 'no beam crew cast on this load' };
      window.scrollTo(0, Math.max(0,
        b.c.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.55));
      await new Promise(function (r) { setTimeout(r, 400); });
      b.scene = 'carry'; b.load = 'button'; b.dwell = 99;     // the widest load: the worst case
      await new Promise(function (r) { setTimeout(r, 400); });

      var sy = window.scrollY || 0;
      var lane = D.laneOf(b.c.getBoundingClientRect().bottom - 6 + sy, D.zombieLanes());
      D.zom.MAX = 10; D.zom.MAX_END = 10;
      if (!b._bodies || b._bodies.length < 2) return { err: 'the crew is not drawing two bodies' };
      var gap = Math.round(Math.abs(b._bodies[0].x - b._figX));

      if (!D.zombieSpawn()) return { err: 'spawn refused' };
      var z1 = D.zombies().filter(function (z) { return !z.gone; }).pop();
      z1.zLaneDoc = lane; z1.c.style.top = (lane - (z1.h - 6)) + 'px';
      // Held on the FRONT CARRIER, never on the midpoint. Under the old test this is a half-card
      // away from anything the scan could see.
      var t0 = performance.now();
      while (performance.now() - t0 < 6000 && !b.fl) {
        await new Promise(function (r) { setTimeout(r, 90); });
        var q = b.c.getBoundingClientRect();
        var front = (b._bodies && b._bodies.length) ? b._bodies[0].x : b._figX;
        z1.zX = (q.left + front) - z1.c.getBoundingClientRect().left;
      }
      if (!b.fl) return { err: 'the crew never ran', gap: gap };

      var mates0 = b.flMates ? b.flMates.length : 0;
      if (!D.zombieSpawn()) return { err: 'second spawn refused' };
      var z2 = D.zombies().filter(function (z) { return !z.gone; }).pop();
      z2.zLaneDoc = lane; z2.c.style.top = (lane - (z2.h - 6)) + 'px';
      t0 = performance.now();
      while (performance.now() - t0 < 10000 && !D.convs().length && !b.gone) {
        await new Promise(function (r) { setTimeout(r, 60); });
        z2.zX = (b.flLeft + b.flX) - z2.zLeft;
        z2.zDown = 0;
      }
      var caught = D.convs().length > 0;
      var alive = !b.gone, mates1 = b.flMates ? b.flMates.length : 0;
      // and the rest of them are not eaten on the next frame: one catch per CONV, so the two
      // events read as two events
      var convs1 = D.convs().length;
      await new Promise(function (r) { setTimeout(r, 400); });
      return { gap: gap, caught: caught, alive: alive, mates0: mates0, mates1: mates1,
               convs1: convs1, convs2: D.convs().length };
    });
    want(!r.err, 'crew caught: ' + r.err + (r.gap != null ? ' (nearest carrier is ' + r.gap +
      'px from the midpoint the scan used to measure)' : ''));
    if (!r.err) {
      want(r.gap > 118, 'this load puts the carriers only ' + r.gap + 'px from the midpoint — ' +
        'inside SCARE, so the case does not prove the nearest-body fix');
      want(r.caught, 'the crew ran through the second zombie untouched');
      want(r.alive, 'catching one carrier deleted the whole crew');
      want(r.mates1 === r.mates0 - 1,
        'the crew went from ' + r.mates0 + ' mate(s) to ' + r.mates1 + ' — one body, not more');
      want(r.convs2 <= r.convs1,
        'a second body was taken inside the first conversion: ' + r.convs1 + ' -> ' + r.convs2);
      seen.push('crew caught: scared from ' + r.gap + 'px out (SCARE is 118), one carrier taken, ' +
                r.mates0 + ' -> ' + r.mates1 + ' mate(s), the rest still running');
    }
  }

  // ───────────────────────────── 2c. the dropped bar is a bar
  //
  // "When they drop a bar, it is turning into a yellow circle." The circle load and the line load
  // share one prop KIND, because tests/poof/14-card-prop.cjs asserts they do — so the shape has to
  // travel beside the kind, the way the button's measured size already does.
  await reset(page);
  {
    const r = await page.evaluate(async function () {
      var D = window.__evFigDebug;
      var b = D.entries.find(function (e) { return e.spec.mode === 'beam' && !e.gone && e.w; });
      if (!b) return { err: 'no beam crew cast on this load' };
      var out = {};
      for (var li = 0; li < 2; li++) {
        var load = li ? 'circle' : 'line';
        b.scene = 'carry'; b.load = load; b.dwell = 99; b.propGone = false;
        await new Promise(function (r) { setTimeout(r, 250); });
        D.dropProp(b, window.scrollX, window.scrollY, true);
        var d = D.drops()[D.drops().length - 1];
        out[load] = { kind: d.kind, bar: d.bar || 0 };
      }
      return out;
    });
    want(!r.err, 'bar: ' + r.err);
    if (!r.err) {
      want(r.line.kind === 'beamload' && r.circle.kind === 'beamload',
        'the two loads no longer share a kind: ' + JSON.stringify(r));
      want(r.line.bar > 0, 'the line load still drops with no length on it — it lands as a circle');
      want(!r.circle.bar, 'the circle load picked up a bar length: it is a ball, and lands as one');
      seen.push('bar: the line drops as a ' + r.line.bar + 'px bar, the circle still as a circle');
    }
  }

  // ───────────────────────────── 3. the third arrival on a rule is a work crew
  await reset(page);
  {
    const r = await page.evaluate(async function () {
      var D = window.__evFigDebug;
      var sy = window.scrollY || 0;
      // THE CARRY LANE, not whichever rule happens to be on screen: a crew is only ever cast on
      // this one, and `reset` parks the page on it. Every other lane must REFUSE, which is the
      // second half of this case.
      var lane = D.zombieLanes()[0];
      if (!(lane > sy + 60 && lane < sy + window.innerHeight - 30)) return { err: 'carry lane off screen' };
      var refused = D.zombieLanes().slice(1).map(function (y) {
        return { y: Math.round(y), anchor: (D.laneAnchor(y) || {}).sel || null, spawned: D.workerSpawn(y) };
      });
      var before = D.crews().length;
      for (var i = 0; i < D.zom.CREW_AT; i++) D.makeZombie(lane, i % 2 ? 1 : -1, 100 + i * 200);
      var tries = 0;
      while (tries < 8 && D.crews().length === before) { D.zombieSpawn(); tries++; }
      await new Promise(function (r) { setTimeout(r, 500); });
      var c = D.crews()[D.crews().length - 1];
      if (!c) return { err: 'a rule with ' + D.zom.CREW_AT + ' zombies produced no crew in ' +
                            tries + ' spawns' };
      return { before: before, after: D.crews().length, anchor: c.spec.anchor, refused: refused,
               plain: !!c.spec.plain, scene: c.scene,
               feet: Math.round(c.c.getBoundingClientRect().top + window.scrollY + c.h - 6),
               edge: Math.round(c.el.getBoundingClientRect().top + window.scrollY) };
    });
    want(!r.err, 'crew: ' + r.err);
    if (!r.err) {
      want(r.plain, 'the crew is not pinned to plain carries — the light gag measures the hero ' +
                    'swatch against its own canvas and would loft a box half a page away');
      want(r.scene === 'carry', 'the crew opened on scene "' + r.scene + '", not a carry');
      want(Math.abs(r.feet - r.edge) < 3,
        'the crew stands at ' + r.feet + ' and its rule is at ' + r.edge + ' — it is on a different line');
      want(r.anchor === 'section.why',
        'the crew was anchored to ' + r.anchor + ', not the carry lane');
      want(r.refused.every(function (x) { return !x.spawned && x.anchor === null; }),
        'a crew was cast off the carry lane: ' + JSON.stringify(r.refused));
      seen.push('crew: cast on ' + r.anchor + ' carrying, feet ' + r.feet + ' = rule ' + r.edge +
                '; ' + r.refused.length + ' other lanes refused one');
    }
  }

  // ───────────────────────────── 4. the dog holds the line, and gets exactly one of them
  await reset(page);
  {
    const r = await page.evaluate(async function () {
      var D = window.__evFigDebug;
      var sy = window.scrollY || 0;
      var lanes = D.zombieLanes().filter(function (y) {
        return y > sy + 60 && y < sy + window.innerHeight - 30;
      });
      if (!lanes.length) return { err: 'no rule on screen' };
      var lane = lanes[0];
      // The cast only has a dog on some loads, so he is placed directly. What is under test is his
      // own machine, not whether buildCast dealt a dogfetch today.
      var g = D.dogGuardSpawn({ spec: { tone2: 5 }, c: D.entries[0].c, dogX: 0 }, lane);
      g.dgX = g.w * 0.5;
      await new Promise(function (r) { setTimeout(r, 150); });
      var start = g.dgX;

      // one closing from the RIGHT: he should face it and give ground to the left
      var z1 = D.makeZombie(lane, -1, g.dgX + 110);
      for (var i = 0; i < 8; i++) {
        await new Promise(function (r) { setTimeout(r, 100); });
        z1.zX = g.dgX + 110;
      }
      var backed = g.dgX, facing = g.dgFace, phase = g.dgPhase;

      // ...and now one on the other side as well
      var z2 = D.makeZombie(lane, 1, g.dgX - 110);
      for (var j = 0; j < 60 && g.dgPhase === 'bark'; j++) {
        await new Promise(function (r) { setTimeout(r, 60); });
        z1.zX = g.dgX + 110; z2.zX = g.dgX - 110;
      }
      var leapt = g.dgPhase;
      await new Promise(function (r) { setTimeout(r, 900); });
      return { start: Math.round(start), backed: Math.round(backed), facing: facing,
               phase: phase, leapt: leapt, after: g.dgPhase,
               // EVERY zombie on the page, not just the two placed here. The takeover keeps
               // spawning its own, and one that wanders onto this rule can be the nearest when the
               // dog picks — so counting only z1 and z2 reported "nobody went down" on a leap that
               // landed perfectly well, on a zombie this case did not create.
               down: D.zombies().filter(function (z) { return z.zDown > 0; }).length,
               queued: D.zombies().length };
    });
    want(!r.err, 'dog: ' + r.err);
    if (!r.err) {
      want(r.phase === 'bark', 'the dog went to "' + r.phase + '" instead of standing and barking');
      want(r.facing === 1, 'the dog is facing ' + r.facing + ', not the zombie on his right');
      want(r.backed < r.start - 10, 'the dog held his ground instead of giving it: ' +
                                    r.start + ' -> ' + r.backed);
      want(r.leapt === 'leap', 'boxed in on both sides, the dog stayed in "' + r.leapt + '"');
      want(r.down === 1, r.down + ' zombies went down, want exactly 1');
      seen.push('dog: barked and backed ' + r.start + ' -> ' + r.backed + ', then leapt; ' +
                r.down + ' zombie down; ended ' + r.after);
    }
  }

  // ───────────────────────────── 5. the click-exodus survives a page with zombies on it
  await reset(page);
  {
    const r = await page.evaluate(async function () {
      var D = window.__evFigDebug;
      var lane = D.zombieLanes()[0];
      D.makeZombie(lane, 1, 400);
      D.makeZombie(lane, -1, 900);
      D.dogGuardSpawn({ spec: { tone2: 5 }, c: D.entries[0].c, dogX: 0 }, lane);
      D.ghostSpawn();                                  // may refuse if the notes are off screen
      await new Promise(function (r) { setTimeout(r, 300); });
      var victim = D.entries.find(function (e) {
        return !e.gone && e.w && e.spec.mode === 'stand';
      });
      if (!victim) return { err: 'nobody to take' };
      var anchorless = D.entries.filter(function (e) { return !e.gone && e.w && !e.el; }).length;
      // Drive the phase machine straight at the exodus, the way a three-second hold does.
      D.poof.victim = victim; D.poof.fx = 0.5; D.poof.fy = 0.5;
      D.poof.phase = 'stunned'; D.poof.t = 99;
      await new Promise(function (r) { setTimeout(r, 2500); });
      // A ZOMBIE STILL WALKING is the proof the loop is running: a throw inside tick() stops it
      // dead, and he is the one figure here whose own clock keeps advancing through an exodus
      // (a runner is on drawFlee's flT, and a fleeing entry's lt is frozen).
      var t0 = D.zombies().filter(function (z) { return !z.gone; })[0];
      var lt0 = t0 ? t0.zX : null;
      await new Promise(function (r) { setTimeout(r, 600); });
      return { anchorless: anchorless, phase: D.poof.phase,
               moved: t0 ? (t0.zX !== lt0) : null,
               armed: D.zombies().filter(function (z) { return !!z.fl; }).length +
                      D.dogGuards().filter(function (z) { return !!z.fl; }).length +
                      D.ghosts().filter(function (z) { return !!z.fl; }).length };
    });
    want(!r.err, 'exodus: ' + r.err);
    if (!r.err) {
      want(r.anchorless >= 3, 'only ' + r.anchorless + ' anchorless figures were on the page — ' +
        'this case proves nothing without them');
      want(r.armed === 0, r.armed + ' takeover figures were armed to flee; they have no perch');
      want(r.moved === true, 'the figure layer stopped: tick() threw during the exodus');
      seen.push('exodus: ' + r.anchorless + ' anchorless figures skipped, the loop kept running');
    }
    want(errors.length === 0, 'exodus: page errors — ' + errors.join(' | '));
  }

  want(errors.length === 0, 'page errors — ' + errors.join(' | '));
  await page.close();
  await browser.close();

  seen.forEach(function (s) { console.log('  ' + s); });
  if (failures.length) {
    failures.forEach(function (f) { console.error('FAIL ' + f); });
    throw new Error('halloween-caught: ' + failures.length + ' failure(s)');
  }
  console.log('halloween-caught: PASS (november gate, conversion + census, a crew caught one ' +
              'carrier at a time, the dropped bar, work crew, the dog, the exodus)');
})();
