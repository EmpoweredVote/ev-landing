// The greeting itself: wave, then a straight arm actually aimed at the button column, then
// the bubble — and each of the five ways to make it go away, after which he must go back to
// being an ordinary host who points at whatever you highlight.
//
// The aim assertion deliberately does NOT re-derive the pose formula. It computes his hand
// and shoulder positions from the pose the draw loop last used (via the rig itself), maps
// them through drawFig's flip+scale, and measures the angle between "shoulder -> hand" and
// "shoulder -> buttons". That fails if the arm is aimed anywhere else, including if the
// flip's sign convention is wrong — which is the mistake this geometry invites.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

// evaluated in the page: where his hand/shoulder are, and where he is pointing
const PROBE = function (sel) {
  var S = 0.32;
  var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
  var cr = e.c.getBoundingClientRect();
  var oyS = (e.h - 6) - 112 * S;
  var j = window.LeremyRig.computePose(e._giLast);
  // drawFig: translate(w/2, oyS) then scale(-S, S) for a flipped figure
  function map(p) { return { x: cr.left + e.w / 2 - S * p.x, y: cr.top + oyS + S * p.y }; }
  var hand = map(j.hR), sh = map(j.sR), handL = map(j.hL), shL = map(j.sL), head = map(j.H);
  var t = null, ang = null;
  if (sel) {
    var r = document.querySelector(sel).getBoundingClientRect();
    t = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    var a1 = Math.atan2(hand.y - sh.y, hand.x - sh.x);
    var a2 = Math.atan2(t.y - sh.y, t.x - sh.x);
    ang = Math.abs(((a1 - a2) * 180 / Math.PI + 540) % 360 - 180);
  }
  return {
    gi: e.gi == null ? null : e.gi,
    done: !!e.giDone,
    hasHandle: !!e.gh,
    bubbles: document.querySelectorAll('.ev-quote').length,
    aimErr: ang,
    handAboveShoulder: sh.y - hand.y,
    highestHand: Math.min(hand.y, handL.y),
    headTop: head.y,
    shoulderY: Math.min(sh.y, shL.y)
  };
};

async function greeted(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.addInitScript(function () {
    try { localStorage.removeItem('ev:greeted'); } catch (e) {}
    document.addEventListener('DOMContentLoaded', function () {
      document.documentElement.style.scrollBehavior = 'auto';
    });
  });
  await page.goto(URL);
  await page.waitForTimeout(400);
  // into his firing window: risen into view, buttons still up there (see GREET_* in ev-figures.js)
  for (let i = 0; i < 80; i++) {
    const at = await page.evaluate(function () {
      var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
      var top = e.c.getBoundingClientRect().top, ih = window.innerHeight;
      var btn = document.querySelector('.showcase-logos').getBoundingClientRect().bottom;
      return top > 70 && top + e.h < ih - 8 && btn > ih * 0.45 && window.scrollY >= 60;
    });
    if (at) break;
    await page.evaluate(function () { window.scrollBy(0, 40); });
    await page.waitForTimeout(50);
  }
  return page;
}

async function openBubble(browser) {
  const page = await greeted(browser);
  await page.waitForSelector('.ev-quote.in', { timeout: 6000 });
  return page;
}

async function assertGone(page, label) {
  await page.waitForTimeout(700);   // 260ms fade-out + 350ms settle
  const s = await page.evaluate(PROBE, null);
  assert.strictEqual(s.bubbles, 0, label + ': bubble still in the DOM');
  assert.ok(!s.hasHandle, label + ': dangling bubble handle left on him');
  assert.strictEqual(s.gi, null, label + ': stuck in greeting state ' + s.gi);
  assert.ok(s.done, label + ': should be marked as having greeted');
}

(async function () {
  const browser = await chromium.launch();

  // ── the wave comes first, and the bubble does not jump the gun
  {
    const page = await greeted(browser);
    await page.waitForTimeout(900);
    const w = await page.evaluate(PROBE, null);
    assert.strictEqual(w.gi, 'wave', 'he should still be waving 0.9s in, not ' + w.gi);
    assert.strictEqual(w.bubbles, 1, 'he should already be talking 0.9s in, mid-wave');
    assert.ok(w.highestHand < w.shoulderY - 15,
      'a wave needs a hand up: highest hand ' + w.highestHand + ' vs shoulder ' + w.shoulderY);

    // ── the wave finishes and he turns to point at the buttons, still talking
    await page.waitForFunction(function () {
      var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
      return e.gi === 'hold';
    }, { timeout: 6000 });
    const p = await page.evaluate(PROBE, '.showcase-logos');
    assert.strictEqual(p.gi, 'hold', 'he holds the point while talking');
    assert.ok(p.aimErr < 12, 'his arm must point at the button column, off by ' + p.aimErr + ' deg');
    assert.ok(p.handAboveShoulder > 0, 'pointing "up there" means the hand is above the shoulder');
    // the raised arm must not stab into his own bubble
    const clear = await page.evaluate(function () {
      var el = document.querySelector('.ev-quote');
      return el.getBoundingClientRect().bottom;
    });
    assert.ok(p.highestHand > clear - 1,
      'his pointing hand reaches into the bubble: hand ' + p.highestHand + ' vs bubble bottom ' + clear);
    await page.close();
  }

  // ── 1. click the Bobit (the asked-for dismissal)
  {
    const page = await openBubble(browser);
    const at = await page.evaluate(function () {
      var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
      return { x: e._prSX, y: e._prFY - 40 };
    });
    await page.mouse.click(at.x, at.y);
    await assertGone(page, 'clicked him');
    await page.close();
  }

  // ── 2. tap the bubble itself. A quote bubble deliberately swallows this (it holds a link);
  //      his does not, because on a phone it sits on top of the card it is talking about and
  //      a tap that did nothing would read as broken.
  {
    const page = await openBubble(browser);
    const has = await page.evaluate(function () {
      var el = document.querySelector('.ev-quote');
      var r = el.getBoundingClientRect();
      return { say: el.classList.contains('ev-say'), x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    assert.ok(has.say, 'a greeting bubble must carry .ev-say so it can be styled as tappable');
    await page.mouse.click(has.x, has.y);
    await assertGone(page, 'tapped the bubble');
    await page.close();
  }

  // ── 3. click somewhere else entirely
  {
    const page = await openBubble(browser);
    await page.mouse.click(20, 500);
    await assertGone(page, 'clicked off');
    await page.close();
  }

  // ── 4. Escape
  {
    const page = await openBubble(browser);
    await page.keyboard.press('Escape');
    await assertGone(page, 'pressed Escape');
    await page.close();
  }

  // ── 5. go and highlight a tool: he has done his job, and his arm hands straight over to
  //      pointing at what you highlighted
  {
    const page = await openBubble(browser);
    await page.hover('.showcase-logos .logo-trigger:nth-child(5)');
    await assertGone(page, 'highlighted a tool');
    const aim = await page.evaluate(PROBE, '.showcase-logos .logo-trigger:nth-child(5)');
    assert.ok(aim.aimErr < 12,
      'after the greeting he must point at the highlighted tool, off by ' + aim.aimErr + ' deg');
    await page.close();
  }

  console.log('03-sequence: PASS');
  await browser.close();
})();
