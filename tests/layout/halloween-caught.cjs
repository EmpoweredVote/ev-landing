// What happens when a zombie actually REACHES somebody — and what stops the page turning into a
// parade of shamblers with nobody left to shamble at.
//
// 1. A RUNNER CAN BE CAUGHT. The scare loop skipped anyone already fleeing, so a Bobit could
//    sprint the length of the page straight THROUGH a second zombie and out the other side. That
//    is the most common way the two ever meet — a runner crosses the whole viewport and a zombie
//    is standing in the middle of it — so the thing you saw most often was the thing that did
//    nothing. He is taken by purple smoke now, and one of them walks out of it.
//
//    The CENSUS is the half of this worth guarding. Everyone who flees is already booked to come
//    back as a zombie (zomQueue); being caught SPENDS that booking rather than adding to it. Get
//    that wrong and the page quietly doubles its population every time somebody is caught, which
//    nothing else here would notice.
//
// 2. A BUSY RULE GETS A WORK CREW, NOT A THIRD ZOMBIE. Two on a line is a crowd; three is a
//    queue. The third arrival is cast at runtime as an ordinary beam crew anchored to the section
//    whose edge that rule is — so the assertion that matters is that it lands ON the rule. A crew
//    placed a section away is invisible rather than broken, which is the kind of wrong that
//    survives a release.
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

// Park on the carry rule, and sweep away anything a previous case left walking. Zombies, crews and
// the dog all outlive the case that made them; a case that inherits them measures them instead.
async function reset(page) {
  await page.evaluate(function () {
    var D = window.__evFigDebug;
    D.entries.forEach(function (e) {
      var m = e.spec.mode;
      if (m === 'zombie' || m === 'ghost' || m === 'dogguard' || (m === 'beam' && e.spec.plain)) {
        if (!e.gone) { e.gone = true; if (e.c.parentNode) e.c.parentNode.removeChild(e.c); }
      }
    });
    D.convs().length = 0;
    window.scrollTo(0, Math.max(0, D.zombieLanes()[0] - window.innerHeight * 0.62));
  });
  await page.waitForTimeout(400);
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
  await reset(page);
  {
    const r = await page.evaluate(async function () {
      var D = window.__evFigDebug;
      var sy = window.scrollY || 0, sx = window.scrollX || 0, vh = window.innerHeight;
      var lanes = D.zombieLanes();
      var v = D.entries.find(function (e) {
        if (e.gone || e.fl || !e.w || e.spec.presenter) return false;
        if (['zombie', 'ghost', 'why', 'dogguard'].indexOf(e.spec.mode) >= 0) return false;
        var q = e.c.getBoundingClientRect();
        return q.top < vh - 60 && q.bottom > 60;
      });
      if (!v) return { err: 'nobody on screen to scare' };
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
      if (!v.fl) return { err: 'he never ran' };

      // ...and now a SECOND one in his path.
      if (!D.zombieSpawn()) return { err: 'second spawn refused' };
      var z2 = D.zombies().filter(function (z) { return !z.gone; }).pop();
      z2.zLaneDoc = lane; z2.c.style.top = (lane - (z2.h - 6)) + 'px';
      var phases = [];
      t0 = performance.now();
      while (performance.now() - t0 < 12000 && !v.gone) {
        await new Promise(function (r) { setTimeout(r, 70); });
        phases.push(v.fl);
        z2.zX = (v.flLeft + v.flX) - z2.zLeft;
        z2.zDown = 0;                                  // keep him on his feet; nothing else is after him
      }
      var smoking = D.convs().length;
      await new Promise(function (r) { setTimeout(r, 1600); });
      return { mode: v.spec.mode, gone: !!v.gone, smoking: smoking, before: before,
               after: D.zombies().filter(function (z) { return !z.gone; }).length,
               phases: Array.from(new Set(phases)).join(',') };
    });
    want(!r.err, 'caught: ' + r.err);
    if (!r.err) {
      want(r.gone, 'the runner walked through a zombie untouched (phases seen: ' + r.phases + ')');
      want(r.smoking > 0, 'he was taken with no smoke over him');
      // two were placed by hand, so the conversion is the third
      want(r.after === r.before + 3,
        'the census is wrong: ' + r.before + ' -> ' + r.after + ', want +3 (two placed, one converted)');
      seen.push('caught: a ' + r.mode + ' taken mid-' + r.phases + '; zombies ' +
                r.before + ' -> ' + r.after);
    }
  }

  // ───────────────────────────── 3. the third arrival on a rule is a work crew
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
      var before = D.crews().length;
      for (var i = 0; i < D.zom.CREW_AT; i++) D.makeZombie(lane, i % 2 ? 1 : -1, 100 + i * 200);
      var tries = 0;
      while (tries < 8 && D.crews().length === before) { D.zombieSpawn(); tries++; }
      await new Promise(function (r) { setTimeout(r, 500); });
      var c = D.crews()[D.crews().length - 1];
      if (!c) return { err: 'a rule with ' + D.zom.CREW_AT + ' zombies produced no crew in ' +
                            tries + ' spawns' };
      return { before: before, after: D.crews().length, anchor: c.spec.anchor,
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
      seen.push('crew: cast on ' + r.anchor + ' carrying, feet ' + r.feet + ' = rule ' + r.edge);
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
               down: (z1.zDown > 0 ? 1 : 0) + (z2.zDown > 0 ? 1 : 0),
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
  console.log('halloween-caught: PASS (november gate, conversion + census, work crew, the dog, ' +
              'the exodus)');
})();
