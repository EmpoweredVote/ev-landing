// The Halloween ghost: a sheet over a Bobit, drifting across Notes 02 and 03.
//
// He is not a Bobit and almost nothing the rest of the figure code knows applies to him. The
// four things here are the four that would go quietly wrong.
//
// 1. HE HAS NO FLOOR. Every other figure on this page stands on something, and both the
//    zombies' scare test and the fall machinery are built on that. A ghost is in the air over
//    a note card, so he frightens people by RADIUS and casts no shadow. If the band he floats
//    in drifts off the notes, nobody will see him at all — he will be over the body copy or
//    out in the margin — so where he floats is asserted against the notes themselves.
//
// 2. A FRIGHTENED GHOST IS HARMLESS. That is the arcade's rule and it is the point of the
//    easter egg: click him and the people around him stop running. It is also the one piece
//    of his behaviour that looks identical to a bug ("the ghost stopped scaring anyone").
//
// 3. THE STATE MACHINE IS ON A CLOCK. blue for GHOST.BLUE, then GHOST.BLINKS cycles of
//    flashing, then white again — and he keeps the NEW direction. Nothing throws if a
//    transition never fires; he simply stays blue forever, which reads as "the easter egg is
//    broken" long after whoever changed it has gone.
//
// 4. HIS CANVAS IS VIEWPORT-WIDE AND ABSOLUTE IN DOCUMENT SPACE, like the zombies'. Skipping
//    fitW/fitLeft is what hands a phone a horizontal scrollbar.
//
// Needs Playwright and its browsers — see "Tests" in README.md:
//   node tests/layout/halloween-ghost.cjs
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
  return { page: page, errors: errors };
}

// Park so Note 02 is in view, which is where he floats.
async function parkOnTheNotes(page) {
  await page.evaluate(function () {
    var n = document.querySelector('.note.n-team');
    if (!n) return;
    window.scrollTo(0, Math.max(0, n.getBoundingClientRect().top + (window.scrollY || 0) - 220));
  });
  await page.waitForTimeout(400);
}

(async function () {
  const browser = await chromium.launch();
  const seen = [];

  // ───────────────────────────────── 1. November: no ghost at all
  {
    const { page } = await open(browser, '?evlines=morning#figdebug');
    await parkOnTheNotes(page);
    await page.waitForTimeout(20000);                // well past GHOST.FIRST's 8-16s
    const n = await page.evaluate(function () { return window.__evFigDebug.ghosts().length; });
    want(n === 0, 'november: ' + n + ' ghost(s) on a page that is not Halloween');
    seen.push('november: no ghosts after 20s');
    await page.close();
  }

  // ───────────────────────────────── 2. he arrives, drifts, bobs, and is over the notes
  {
    const { page, errors } = await open(browser, '?evlines=halloween#figdebug');
    await parkOnTheNotes(page);

    let arrived = false;
    for (let i = 0; i < 24 && !arrived; i++) {
      await page.waitForTimeout(1000);
      arrived = await page.evaluate(function () {
        return window.__evFigDebug.ghosts().some(function (g) { return !g.gone; });
      });
    }
    want(arrived, 'no ghost arrived within 24s (GHOST.FIRST is 8-16s)');
    if (!arrived) { await page.close(); await browser.close(); throw new Error('halloween-ghost: no ghost'); }

    const drift = await page.evaluate(async function () {
      var D = window.__evFigDebug;
      var g = D.ghosts().filter(function (e) { return !e.gone; })[0];
      window.__g = g;
      var sy = window.scrollY || 0;
      var n2 = document.querySelector('.note.n-team').getBoundingClientRect();
      var n3 = document.querySelector('.note.n-ai').getBoundingClientRect();
      var ys = [], x0 = g.gX;
      for (var i = 0; i < 40; i++) {
        await new Promise(function (r) { setTimeout(r, 60); });
        ys.push(g._ghSY + sy);
      }
      return {
        moved: Math.round(g.gX - x0),
        bob: Math.round(Math.max.apply(null, ys) - Math.min.apply(null, ys)),
        mid: Math.round(g.gMidDoc),
        top: Math.round(Math.min(n2.top, n3.top) + sy),
        bot: Math.round(Math.max(n2.bottom, n3.bottom) + sy)
      };
    });
    want(Math.abs(drift.moved) > 10, 'the ghost is not drifting (' + drift.moved + 'px in 2.4s)');
    want(drift.bob > 6, 'the ghost is not bobbing (' + drift.bob + 'px of rise and fall)');
    want(drift.mid >= drift.top - 40 && drift.mid <= drift.bot + 40,
      'the ghost floats at y=' + drift.mid + ', outside Notes 02-03 (' + drift.top + '..' + drift.bot +
      ') — he is over the body copy or out in the margin, where the gag is invisible');
    seen.push('drifts ' + drift.moved + 'px/2.4s, bobs ' + drift.bob + 'px, at y=' + drift.mid +
              ' inside the notes ' + drift.top + '..' + drift.bot);

    // click: reverse + blue
    const clicked = await page.evaluate(async function () {
      var g = window.__g, before = g.gDir;
      document.dispatchEvent(new MouseEvent('click',
        { bubbles: true, clientX: g._ghSX, clientY: g._ghSY }));
      await new Promise(function (r) { setTimeout(r, 150); });
      return { before: before, after: g.gDir, phase: g.gPhase };
    });
    want(clicked.after === -clicked.before,
      'clicking the ghost did not reverse him (' + clicked.before + ' -> ' + clicked.after + ')');
    want(clicked.phase === 'blue', 'clicking left him in "' + clicked.phase + '", not blue');
    seen.push('clicked: ' + clicked.before + ' -> ' + clicked.after + ', ' + clicked.phase);

    // a frightened ghost frightens nobody; a roaming one does. BOTH halves are asserted,
    // because "nobody ran" is also what a broken scare looks like.
    const scare = await page.evaluate(async function () {
      var D = window.__evFigDebug, g = window.__g;
      var vh = window.innerHeight;
      var v = D.entries.filter(function (e) {
        if (e.gone || e.fl || e.ab || !e.w || e.spec.presenter) return false;
        if (e.spec.mode === 'zombie' || e.spec.mode === 'ghost' || e.spec.mode === 'why') return false;
        var r = e.c.getBoundingClientRect();
        return r.top < vh && r.bottom > 0;
      })[0];
      if (!v) return { err: 'nobody on screen to float at' };
      var pin = function () {
        var r = v.c.getBoundingClientRect();
        g.gX = (r.left + (v._figX != null ? v._figX : v.w / 2)) - g.c.getBoundingClientRect().left;
        g.c.style.top = (r.bottom - 6 - 36 - g.h / 2 + (window.scrollY || 0)) + 'px';
      };
      g.gPhase = 'blue'; g.gT = 0;
      var t0 = performance.now();
      while (performance.now() - t0 < 2500) { await new Promise(function (r) { setTimeout(r, 120); }); pin(); }
      var whileBlue = v.fl || null;
      g.gPhase = 'roam'; g.gT = 0;
      t0 = performance.now();
      while (performance.now() - t0 < 6000) {
        await new Promise(function (r) { setTimeout(r, 120); });
        pin();
        if (v.fl) break;
      }
      return { mode: v.spec.mode, whileBlue: whileBlue, whileRoaming: v.fl || null };
    });
    want(!scare.err, 'scare: ' + scare.err);
    if (!scare.err) {
      want(scare.whileBlue === null,
        'a FRIGHTENED ghost sent a ' + scare.mode + ' running ("' + scare.whileBlue +
        '") — while he is blue he is harmless, which is the whole easter egg');
      want(scare.whileRoaming === 'raise',
        'a roaming ghost did not frighten the ' + scare.mode + ' he was floating over ("' +
        scare.whileRoaming + '")');
      seen.push('blue ghost: the ' + scare.mode + ' stayed put. roaming ghost: ' +
                scare.mode + ' -> ' + scare.whileRoaming);
    }

    // the clock
    const timed = await page.evaluate(async function () {
      var D = window.__evFigDebug, G = D.ghost;
      if (!D.ghostSpawn()) return { err: 'spawn refused' };
      var g = D.ghosts().filter(function (e) { return !e.gone; }).pop();
      g.gX = g.w * 0.5;
      var dirBefore = g.gDir;
      D.ghostScare(g);
      var log = [], last = null, t0 = performance.now();
      var span = (G.BLUE + G.BLINK * 2 * G.BLINKS + 1.2) * 1000;
      while (performance.now() - t0 < span) {
        await new Promise(function (r) { setTimeout(r, 50); });
        g.gX = g.w * 0.5;                       // hold him on screen for the whole run
        if (g.gPhase !== last) {
          log.push({ phase: g.gPhase, at: +((performance.now() - t0) / 1000).toFixed(2) });
          last = g.gPhase;
        }
      }
      return { log: log, dirBefore: dirBefore, dirAfter: g.gDir,
               cfg: { BLUE: G.BLUE, BLINK: G.BLINK, BLINKS: G.BLINKS } };
    });
    want(!timed.err, 'timing: ' + timed.err);
    if (!timed.err) {
      const seq = timed.log.map(function (l) { return l.phase; }).join(' -> ');
      want(seq === 'blue -> flash -> roam', 'the ghost went "' + seq + '", not blue -> flash -> roam');
      const flashAt = (timed.log.filter(function (l) { return l.phase === 'flash'; })[0] || {}).at;
      const roamAt = (timed.log.filter(function (l) { return l.phase === 'roam'; })[0] || {}).at;
      const wantRoam = timed.cfg.BLUE + timed.cfg.BLINK * 2 * timed.cfg.BLINKS;
      want(Math.abs(flashAt - timed.cfg.BLUE) < 0.5,
        'flashing started at ' + flashAt + 's, not GHOST.BLUE ' + timed.cfg.BLUE + 's');
      want(Math.abs(roamAt - wantRoam) < 0.6,
        'he went white again at ' + roamAt + 's, not ' + wantRoam + 's');
      want(timed.dirAfter === -timed.dirBefore, 'he did not keep the reversed direction');
      seen.push('clock: ' + seq + ' (flash at ' + flashAt + 's, white at ' + roamAt +
                's; wanted ' + timed.cfg.BLUE + ' and ' + wantRoam + ')');
    }
    want(errors.length === 0, 'page errors — ' + errors.join(' | '));
    await page.close();
  }

  // ───────────────────────────────── 3. phone: no horizontal scrollbar
  // The spawn is ASSERTED. A viewport-wide canvas in document space is what gives a phone a
  // scrollbar, so with no ghost on the page the check passes while proving nothing.
  {
    const { page, errors } = await open(browser, '?evlines=halloween#figdebug', { width: 390, height: 780 });
    await parkOnTheNotes(page);
    const over = await page.evaluate(function () {
      var D = window.__evFigDebug;
      if (!D.ghostSpawn()) return { err: 'no band on screen at 390px' };
      var g = D.ghosts().filter(function (e) { return !e.gone; }).pop();
      return { gw: g.w,
               scroll: document.documentElement.scrollWidth,
               client: document.documentElement.clientWidth };
    });
    want(!over.err, 'phone: ' + over.err);
    if (!over.err) {
      want(over.gw > 0, 'phone: the ghost has no canvas width to test');
      want(over.scroll <= over.client,
        'phone: a ghost canvas gave the page a horizontal scrollbar (' + over.scroll +
        ' > ' + over.client + ')');
      seen.push('phone 390px: ghost canvas ' + over.gw + 'px, document ' + over.scroll +
                ' <= viewport ' + over.client);
    }
    want(errors.length === 0, 'phone: page errors — ' + errors.join(' | '));
    await page.close();
  }

  await browser.close();
  seen.forEach(function (s) { console.log('  ' + s); });
  if (failures.length) {
    failures.forEach(function (f) { console.error('FAIL ' + f); });
    throw new Error('halloween-ghost: ' + failures.length + ' failure(s)');
  }
  console.log('halloween-ghost: PASS (november gate, drift, click, harmless when blue, clock, phone width)');
})();
