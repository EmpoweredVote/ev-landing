// The long-press abduction on a touch screen, driven with real CDP touch events.
//
// The hold is state, not hit-testing: poofStart captures POOF.victim once and nothing re-tests
// bobitAt afterwards, so the Bobit rising away from the finger cannot by itself cancel anything.
// What CAN cancel it is the finger moving — and following him upward is the natural thing to do,
// which is what this exists to protect. He rises FLOAT_H = 34px, against a pre-hold move threshold
// of 10px, so before the fix a fingertip that tracked him killed the gag every time.
//
// The scroll escape still has to work: a decisive drag cancels, and a drag BEFORE the hold begins
// must leave the tap alone so a scroll that starts on a Bobit is still a scroll.
//
// Presses a STATIONARY Bobit on purpose. The beam crew walks 30-51px/s and drifts out of bobitAt's
// ~6px ink slop between choosing a point and the event landing, which makes for a test that fails
// for reasons that have nothing to do with touch. The .hero .meta-row presenter is cast
// unconditionally, so there is always one there.
//
// Needs Playwright, which is not a repo dependency:
//   NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" \
//     node tests/poof/15-touch-hold.cjs
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const STILL = ['stand', 'seat', 'kite', 'rope', 'vclimb', 'yoyo'];

async function hold(browser, opts) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2
  });
  const page = await ctx.newPage();
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  await page.evaluate(function () {
    document.documentElement.style.scrollBehavior = 'auto';
    // the whole cast is below the fold on a phone
    document.querySelector('.hero .meta-row').scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  await page.waitForTimeout(900);

  const pt = await page.evaluate(function (still) {
    var d = window.__evFigDebug;
    for (var i = 0; i < d.entries.length; i++) {
      var e = d.entries[i];
      if (!e.w || e.gone || e.spec.mode === 'why' || e.ab) continue;
      if (still.indexOf(e.spec.mode) < 0) continue;
      var r = e.c.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      for (var y = Math.max(2, r.top + 2); y < Math.min(innerHeight - 2, r.bottom - 2); y += 3) {
        for (var x = r.left + 2; x < r.right - 2; x += 3) {
          if (d.bobitAt(x, y) === e) return { x: Math.round(x), y: Math.round(y), mode: e.spec.mode };
        }
      }
    }
    return null;
  }, STILL);
  assert.ok(pt, opts.label + ': found no stationary Bobit on screen to press');

  const cdp = await ctx.newCDPSession(page);
  const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {
    type: type,
    touchPoints: type === 'touchEnd' ? [] : [{ x: x, y: y, id: 1, radiusX: 12, radiusY: 12, force: 1 }]
  });
  const state = () => page.evaluate(function () {
    var d = window.__evFigDebug;
    return { phase: d.poof.phase, victim: !!d.poof.victim,
             ab: d.poof.victim ? d.poof.victim.ab : null,
             lift: d.poof.victim ? Math.round(d.poof.victim.abLift || 0) : 0 };
  });

  await send('touchStart', pt.x, pt.y);
  if (opts.moveBeforeHold) {
    // straight away, before TAP_MS elapses
    await send('touchMove', pt.x + opts.moveBeforeHold.dx, pt.y + opts.moveBeforeHold.dy);
    await page.waitForTimeout(600);
    const s = await state();
    await send('touchEnd', pt.x, pt.y);
    await ctx.close();
    return { pt: pt, started: s };
  }

  await page.waitForTimeout(520);                 // past TAP_MS = 320
  const started = await state();

  if (opts.move) {
    for (let i = 1; i <= 4; i++) {
      await send('touchMove', pt.x + opts.move.dx * i / 4, pt.y + opts.move.dy * i / 4);
      await page.waitForTimeout(110);
    }
  }
  await page.waitForTimeout(900);
  const after = await state();

  await send('touchEnd', pt.x, pt.y);
  await ctx.close();
  return { pt: pt, started: started, after: after };
}

(async function () {
  const browser = await chromium.launch();
  const lines = [];

  // 1. the baseline: hold still and he rises. Nothing to do with the finger, but if this breaks the
  //    rest of the assertions below mean nothing.
  const a = await hold(browser, { label: 'held still' });
  assert.strictEqual(a.started.phase, 'holding',
    'a 520ms hold on a ' + a.pt.mode + ' did not begin the abduction (phase ' + a.started.phase + ')');
  assert.strictEqual(a.after.phase, 'holding',
    'holding perfectly still cancelled the abduction on its own (phase ' + a.after.phase + ')');
  assert.ok(a.after.lift > 0,
    'he never left the ground while held (lift ' + a.after.lift + ')');
  lines.push('held still: holding, lift ' + a.after.lift);

  // 2. THE POINT OF THIS FILE. He rises FLOAT_H = 34px; a finger that follows him must not cancel.
  const b = await hold(browser, { label: 'follows him up', move: { dx: 0, dy: -40 } });
  assert.strictEqual(b.started.phase, 'holding', 'follow case: the hold never began');
  assert.strictEqual(b.after.phase, 'holding',
    'following him upward by 40px cancelled the abduction (phase ' + b.after.phase + '). He rises 34px, ' +
    'so tracking him with a fingertip is the natural gesture and must be tolerated once the hold has ' +
    'begun — the 10px threshold is there to protect SCROLLING, which is a pre-hold concern.');
  assert.ok(b.after.lift > 0, 'follow case: he never left the ground (lift ' + b.after.lift + ')');
  lines.push('follows him up 40px: holding, lift ' + b.after.lift);

  // 3. a small sideways drift must also survive — fingers roll as they press
  const c = await hold(browser, { label: 'drifts sideways', move: { dx: 18, dy: -6 } });
  assert.strictEqual(c.after.phase, 'holding',
    'an 18px sideways drift cancelled the abduction (phase ' + c.after.phase + ')');
  lines.push('drifts 18px sideways: holding, lift ' + c.after.lift);

  // 4. ...but a decisive drag still cancels. Dragging away is a real escape hatch and losing it would
  //    mean the only way out is lifting off, which is not obvious mid-gag.
  const d = await hold(browser, { label: 'decisive drag', move: { dx: 0, dy: 160 } });
  assert.strictEqual(d.after.phase, 'idle',
    'a 160px drag did NOT cancel the abduction (phase ' + d.after.phase + '); dragging away has to ' +
    'remain an escape hatch');
  lines.push('drags 160px: cancelled');

  // 5. and a drag BEFORE the hold begins must leave the tap alone, so a scroll that happens to start
  //    on a Bobit is still a scroll rather than an abduction
  const e = await hold(browser, { label: 'pre-hold scroll', moveBeforeHold: { dx: 0, dy: -70 } });
  assert.strictEqual(e.started.phase, 'idle',
    'a scroll that began on a Bobit turned into an abduction (phase ' + e.started.phase +
    '); the pre-hold move threshold is what stops that');
  lines.push('scroll starting on a Bobit: no abduction');

  lines.forEach(function (l) { console.log('  ' + l); });
  console.log('15-touch-hold: PASS');
  await browser.close();
})();
