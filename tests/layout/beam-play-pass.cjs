// The play-button carrier, one of the beam crew's set-piece passes. He walks the showcase play
// button across the hero; click him and he trips, the button rolls on ahead of him, he lies there
// a beat, gets up and runs after it. Click the rolling button and it stops, he catches it up, picks
// it up and carries on.
//
// Four things are asserted, and three of them are regressions that actually happened while this was
// being built — the fourth is the feature's whole shape:
//
//   1. BOTH endings reach their end. Left alone, the button and then the man leave the screen and
//      the pass hands back to the crew's rotation. Stopped, he gets back to carrying it. A state
//      machine that stalls mid-gag leaves the hero with a man lying on the floor for good, and
//      nothing else on the page would notice.
//   2. Nothing is clipped by the floor. The hero canvas ends 6px below the crew's floor line, so a
//      lying pose borrowed from the cartwheeler (who lands in the footer, where there is room to
//      overhang) painted into the last row and had his legs cut off square.
//   3. The button never teleports. Twice, a branch advanced the state or the clock at its end and
//      the code that places the button read the advanced value — so for exactly one frame it was in
//      the carry's hands during the lift, and then back on the floor on the handoff. One frame is
//      invisible in a screenshot and obvious in motion.
//   4. He is never swallowed by his own cargo. This one is a coarse backstop, not a tuning guard:
//      the disc is a solid circle most of his height, and how high he holds it was settled by eye
//      against the letter carrier beside him in the rotation. Checked by mutation, the bound here
//      does NOT trip for a few pixels of hold height either way — it trips if the disc grows or
//      rises far enough to cover him, which is the only part of that judgement a test can hold.
//
// Needs Playwright and its browsers — see "Tests" in README.md:
//   node tests/layout/beam-play-pass.cjs
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
// The lowest ink any shipped gait already puts below the floor line is 2px (the round cap on the
// foot); the lying poses add a pixel of wobble. Past this the canvas is cutting him off.
const FLOOR_SLACK = 4;
// The biggest honest single-frame move of the button's HEIGHT is the throw as he goes over, which
// measures ~4.6px. The two pops this guards against were both 26px.
const MAX_STEP = 10;
// How much of him has to show above the disc for him to still read as a man carrying it. Measured
// 27px as shipped, and 20px in the first, too-big-and-held-too-high version — so this is a long way
// below either, on purpose. See note 4: it is a backstop against the disc covering him, not a
// restatement of a proportion that was settled by looking at it.
const HEAD_CLEAR = 8;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', (r) => (/^https?:/.test(r.request().url()) ? r.abort() : r.continue()));
  await page.goto(URL);
  await page.waitForFunction(() => !!window.__evFigDebug);

  const beam = () => page.evaluate(() => {
    const e = window.__evFigDebug.entries.find((x) => x.spec.mode === 'beam');
    return { scene: e.scene, st: e.pSt, x: e.pX, bx: e.pBX, by: e.pBY, v: e.pV, w: e.w, dir: e.dir };
  });
  // Seed a pass at a chosen fraction across, walking right. Recording starts with it.
  const start = async (frac) => {
    await page.evaluate((f) => {
      const d = window.__evFigDebug, e = d.entries.find((x) => x.spec.mode === 'beam');
      e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
      d.startPlay(e, e.w, 1);
      // beamPick records the pass it just started; startPlay on its own does not, and the entry
      // still carries whatever the random opening seed left behind. Leave that inconsistent and
      // the pass that follows this one can legitimately be another 'play' — which looks exactly
      // like this pass never ending. Set what beamPick would have set.
      e.lastAction = 'play'; e.lastSpecial = 'play'; e.carryRun = 0;
      e.pX = e.w * f;
      window.__e = e; window.__log = [];
      // One logger per start, and it begins on the SECOND frame. Both matter. startPlay leaves
      // pBY at 0 until the first draw fills it in, so frame one is an init value and not a frame
      // anybody sees; and without the generation guard every earlier start's logger is still
      // running, so that init frame gets recorded once per live loop and no fixed number of
      // leading frames can be trusted to drop it.
      const gen = (window.__gen = (window.__gen || 0) + 1);
      let first = true;
      const push = () => {
        if (window.__gen !== gen) return;               // a newer start has taken over
        const q = window.__e;
        if (first) first = false;
        else if (q.scene === 'play') window.__log.push([q.pSt, q.pBY, q.pX]);
        requestAnimationFrame(push);
      };
      requestAnimationFrame(push);
    }, frac);
    await sleep(150);
  };
  const clickMan = () => page.evaluate(() => {
    const e = window.__e;
    document.dispatchEvent(new MouseEvent('click', { clientX: e._pSX, clientY: e._pFY - 40, bubbles: true }));
  });
  const clickButton = () => page.evaluate(() => {
    const e = window.__e;
    if (e._pBSX == null) return false;
    document.dispatchEvent(new MouseEvent('click', { clientX: e._pBSX, clientY: e._pBSY, bubbles: true }));
    return true;
  });
  const waitFor = async (pred, ms) => {
    for (let i = 0; i < ms / 100; i++) { if (pred(await beam())) return true; await sleep(100); }
    return false;
  };

  // ── 1. nobody touches him: he walks the whole way across and the pass ends ──
  await start(0.86);
  const walkedOff = await waitFor((b) => b.scene !== 'play', 14000);
  assert.ok(walkedOff, 'an untouched play pass never ended — he walked off the edge and the crew ' +
    'never got its rotation back, so the hero is now empty for good');

  // ── 2. clicked, left alone: he trips, it rolls away, he chases it off ──
  await start(0.62);
  await clickMan();
  assert.ok(await waitFor((b) => b.st === 'down', 2000), 'clicking him did not put him on the floor');
  assert.ok((await beam()).v > 0, 'he went down but the button did not roll — the gag is him losing it');
  assert.ok(await waitFor((b) => b.st === 'chase', 4000), 'he never got up and gave chase');
  assert.ok(await waitFor((b) => b.scene !== 'play', 14000),
    'he chased the button off the edge but the pass never handed back to the rotation');

  // ── 3. clicked, then the button is stopped: he catches it and carries on ──
  await start(0.18);
  await clickMan();
  await sleep(900);
  assert.ok(await clickButton(), 'the rolling button published no hitbox, so it can never be stopped');
  assert.ok(await waitFor((b) => b.v === 0, 2000), 'clicking the rolling button did not stop it');
  assert.ok(await waitFor((b) => b.st === 'lift', 12000), 'he never reached the stopped button');
  assert.ok(await waitFor((b) => b.st === 'carry', 4000), 'he reached it but never picked it back up');
  // ...and it is genuinely back in his hands, not left behind on the floor beside him
  const held = await beam();
  assert.ok(Math.abs(held.bx - held.x) < 30,
    'he is carrying again but the button is ' + Math.round(Math.abs(held.bx - held.x)) +
    'px away from him — it did not come with him');

  // ── 4. nothing teleported, across the whole recorded pass ──
  const log = await page.evaluate(() => window.__log);
  assert.ok(log.length > 60, 'only ' + log.length + ' frames were recorded — too few to say ' +
    'anything about whether the button moves smoothly');
  let worst = 0, worstAt = '';
  for (let k = 1; k < log.length; k++) {
    const d = Math.abs(log[k][1] - log[k - 1][1]);
    if (d > worst) { worst = d; worstAt = log[k - 1][0] + ' -> ' + log[k][0]; }
  }
  assert.ok(worst <= MAX_STEP,
    'the button jumped ' + worst.toFixed(1) + 'px in one frame (' + worstAt + '), over the ' +
    MAX_STEP + 'px bound — something is placing it from a state or a clock the drawn pose has ' +
    'already moved past');

  // ── 5. the floor, and his head, read off the actual pixels ──
  await start(0.5);
  await clickMan();
  assert.ok(await waitFor((b) => b.st === 'down', 2000), 'he did not go down for the ink check');
  const heap = await page.evaluate(() => {
    const e = window.__e, c = e.c, ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    const x0 = Math.max(0, Math.round(e.pX - 70)), x1 = Math.min(w, Math.round(e.pX + 70));
    let lowest = -1;
    for (let y = h - 1; y >= 0 && lowest < 0; y--) {
      for (let x = x0; x < x1; x++) if (data[(y * w + x) * 4 + 3] > 8) { lowest = y; break; }
    }
    return { lowest, feetY: h - 6 };
  });
  assert.ok(heap.lowest - heap.feetY <= FLOOR_SLACK,
    'the heap paints ' + (heap.lowest - heap.feetY) + 'px below the floor line (bound ' +
    FLOOR_SLACK + '). The hero canvas only has 6px of room down there, so he is being cut off ' +
    'square at the bottom edge');

  // Back to an untouched carry. See note 4 at the top: a loose backstop on the disc swallowing
  // him, not a check on the exact hold height.
  await start(0.5);
  const carry = await page.evaluate(() => {
    const e = window.__e, c = e.c, ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    const x0 = Math.max(0, Math.round(e.pX - 30)), x1 = Math.min(w, Math.round(e.pX + 30));
    let top = -1;
    for (let y = 0; y < h && top < 0; y++) {
      for (let x = x0; x < x1; x++) if (data[(y * w + x) * 4 + 3] > 8) { top = y; break; }
    }
    return { top, discTop: e.pBY - window.__evFigDebug.playR, st: e.pSt };
  });
  assert.strictEqual(carry.st, 'carry', 'expected an untouched carry for the head check');
  assert.ok(carry.discTop - carry.top >= HEAD_CLEAR,
    'only ' + Math.round(carry.discTop - carry.top) + 'px of him shows above the button he is ' +
    'carrying (want ' + HEAD_CLEAR + '). The disc has grown, or the hold has risen, far enough ' +
    'that he is disappearing behind his own cargo');

  console.log('beam-play-pass: PASS (both endings reach their end; worst one-frame button move ' +
    worst.toFixed(1) + 'px; heap sits ' + (heap.lowest - heap.feetY) + 'px past the floor line; ' +
    Math.round(carry.discTop - carry.top) + 'px of him shows above the button)');
  await browser.close();
})();
