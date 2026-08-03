const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });

  // the pose builders must exist and produce every joint the rig needs
  const poses = await page.evaluate(function () {
    var d = window.__evFigDebug;
    var keys = ['lean', 'headTilt', 'bob', 'hunch', 'armRU', 'armRF', 'armLU', 'armLF',
                'legRU', 'legRF', 'legLU', 'legLF'];
    function complete(p) { return keys.every(function (k) { return typeof p[k] === 'number'; }); }
    var g = d.quoteGlance(3), ho = d.quoteHold(3), sh = d.quoteShrugSeat(0.6);
    var rd = window.LeremyRig.ANIMATIONS.read.frame(3);
    return {
      complete: complete(g) && complete(ho) && complete(sh),
      // glance: head comes UP off the page relative to reading, book still up
      glanceLiftsHead: g.headTilt > rd.headTilt,
      glanceUncurls: g.hunch > rd.hunch,
      // hold: sat up further still, head up, seated
      holdUncurled: ho.hunch > g.hunch,
      holdHeadUp: ho.headTilt > 0,
      holdSeated: ho.legRU > 60 && ho.legLU > 60,
      shrugSeated: sh.legRU > 60 && sh.legLU > 60
    };
  });
  assert.ok(poses.complete, 'every pose must define all 12 joint angles');
  assert.ok(poses.glanceLiftsHead, 'hover must raise the head off the page');
  assert.ok(poses.glanceUncurls, 'hover should partly uncurl the spine');
  assert.ok(poses.holdUncurled, 'the hold pose must be more upright than the glance');
  assert.ok(poses.holdHeadUp, 'the hold pose must look up and out');
  assert.ok(poses.holdSeated, 'the hold pose must stay seated');
  assert.ok(poses.shrugSeated, 'the shrug must stay seated, not stand up');

  // force a reader to carry a quote, then drive the machine through a full cycle
  const cycle = await page.evaluate(async function () {
    var d = window.__evFigDebug;
    var e = d.entries.filter(function (x) {
      return x.spec.mode === 'seat' && x.spec.anim === 'read' && !x.spec.phone;
    })[0];
    if (!e) return { error: 'no seated reader in this cast' };
    e.c.scrollIntoView({ block: 'center' });
    e.spec.quote = window.EVQuotes.QUOTES[0];
    e.qs = 'read'; e.qsT = 0; e.qGlance = 0;
    var flipBefore = e.spec.x > 0.5;

    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    e.qs = 'lookup'; e.qsT = 0;
    await wait(900);                       // longer than the 0.5s transition
    var afterLookup = e.qs;
    var bubbles = document.querySelectorAll('.ev-quote').length;
    var bubbleText = bubbles ? document.querySelector('.ev-quote q').textContent : null;

    // dismiss and let him settle back into reading
    if (e.qh) window.EVQuotes.close(e.qh);
    e.qh = null; e.qs = 'resume'; e.qsT = 0;
    await wait(900);

    return {
      afterLookup: afterLookup,
      bubbles: bubbles,
      bubbleText: bubbleText,
      expected: window.EVQuotes.QUOTES[0].text,
      afterResume: e.qs,
      flipUnchanged: (e.spec.x > 0.5) === flipBefore
    };
  });
  assert.ok(!cycle.error, cycle.error);
  assert.strictEqual(cycle.afterLookup, 'hold', 'lookup must settle into hold');
  assert.strictEqual(cycle.bubbles, 1, 'reaching hold must open exactly one bubble');
  assert.strictEqual(cycle.bubbleText, cycle.expected, 'bubble must carry his own dealt quote');
  assert.strictEqual(cycle.afterResume, 'read', 'resume must return him to reading');
  assert.ok(cycle.flipUnchanged, 'he must never be flipped — no turning in this feature');

  // the shrug self-terminates rather than sticking
  const shrugEnds = await page.evaluate(async function () {
    var d = window.__evFigDebug;
    var e = d.entries.filter(function (x) {
      return x.spec.mode === 'seat' && x.spec.anim === 'read' && !x.spec.phone;
    })[0];
    e.c.scrollIntoView({ block: 'center' });
    e.spec.quote = null; e.qs = 'shrug'; e.qsT = 0;
    await new Promise(function (r) { setTimeout(r, 3200); });
    return { state: e.qs, bubbles: document.querySelectorAll('.ev-quote').length };
  });
  assert.strictEqual(shrugEnds.state, 'read', 'the shrug must end and go back to reading');
  assert.strictEqual(shrugEnds.bubbles, 0, 'a shrug must never open a bubble');

  console.log('04-poses: PASS');
  await browser.close();
})();
