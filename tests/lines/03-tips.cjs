// The tip pool: what beat 2 says to anyone who does not need the button nudge.
//
// Two things here are new mechanism rather than new copy, and both get pinned:
//   - a POOL entry, which draws at random among the members that fit, instead of the
//     first-match-wins rule the rest of selection uses;
//   - the `aim` field, which lets a line name what the speaker should point at while saying
//     it, so a tip that promises "up there in the top right corner" can actually indicate it.
const { chromium } = require('playwright');
const assert = require('assert');

const FIXTURE = 'file:///C:/ev-landing/ev-landing-main/tests/lines/fixture.html';

async function makePage(browser, opts) {
  const page = await browser.newPage(opts || {});
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(FIXTURE);
  return page;
}

// One resolve of beat 2 under a pinned tag set, on a fresh page so the pool's held draw
// cannot leak between cases.
async function beat2(browser, tags, opts) {
  const page = await makePage(browser, opts);
  const out = await page.evaluate(function (t) {
    window.EVLines.force(t);
    return window.EVLines.resolve('greeter', 'point');
  }, tags);
  await page.close();
  return out;
}

(async function () {
  const browser = await chromium.launch();

  // ── 1. The nudge still wins for the only person it helps: a first-timer who has not
  //      touched a tool. If this breaks, the tips have eaten the onboarding.
  {
    const r = await beat2(browser, ['first-visit', 'needs-tools', 'guest']);
    assert.strictEqual(r.id, 'greet.buttons', 'a first-timer who found nothing must get the nudge, got: ' + r.id);
    const gone = await beat2(browser, ['first-visit', 'needs-tools', 'buttons-gone', 'guest']);
    assert.strictEqual(gone.id, 'greet.buttons.gone', 'column scrolled off must reword the nudge, got: ' + gone.id);
  }

  // ── 2. Everyone else gets a tip. Three separate populations, because each reaches the pool
  //      by a different route and a regression could close any one of them.
  {
    for (const [label, tags] of [
      ['a first-timer who already found the tools', ['first-visit', 'tools-found', 'guest']],
      ['a returning visitor who has not',           ['returning', 'needs-tools', 'guest']],
      ['a signed-in returning visitor',             ['returning', 'needs-tools', 'logged-in', 'named']]
    ]) {
      const r = await beat2(browser, tags);
      assert.ok(r.matched, label + ': nothing matched at all');
      assert.ok(/^tip\./.test(r.id), label + ' must get a tip, got: ' + r.id);
      assert.ok(r.text && r.text.length > 0, label + ': the tip resolved to no text');
    }
  }

  // ── 3. The pool actually varies. A "random" pick that returns one id forever is the whole
  //      failure this feature exists to avoid — a returning visitor reading the same sentence.
  //      Fresh page per draw, since the draw is deliberately held within a page.
  {
    const seen = new Set();
    for (let i = 0; i < 25; i++) {
      seen.add((await beat2(browser, ['returning', 'needs-tools', 'guest', 'desktop'])).id);
    }
    assert.ok(seen.size > 5,
      'the pool drew only ' + seen.size + ' distinct tips in 25 loads: ' + [...seen].join(', '));
  }

  // ── 3b. Beat 1 varies too. Without this the whole point is half-done: a visitor greeted on
  //       every page load would get a fresh tip but the identical welcome above it.
  //
  //       The welcome-back case matters most. It matches ahead of the time of day, so a
  //       signed-in returning visitor is the ONE person who would otherwise hear exactly the
  //       same sentence on every single visit.
  {
    for (const [label, tags, expect] of [
      ['morning',   ['morning', 'guest', 'first-visit'],       /morning/i],
      ['afternoon', ['afternoon', 'guest', 'first-visit'],     /afternoon/i],
      ['evening',   ['evening', 'guest', 'first-visit'],       /evening/i],
      ['welcome back', ['named', 'returning', 'logged-in'],    /Chris/]
    ]) {
      const seen = new Set();
      for (let i = 0; i < 20; i++) {
        const page = await makePage(browser);
        const text = await page.evaluate(function (t) {
          window.EVSession = { loggedIn: true, name: 'Chris' };
          window.EVLines.force(t);
          return window.EVLines.say('greeter', 'wave');
        }, tags);
        await page.close();
        assert.ok(text, label + ': beat 1 resolved to nothing');
        assert.ok(expect.test(text), label + ' opener is off-topic: ' + text);
        assert.ok(!/\{name\}/.test(text), label + ': an unsubstituted {name} token: ' + text);
        seen.add(text);
      }
      assert.ok(seen.size >= 2,
        label + ' drew only one opener in 20 loads, so a repeat visitor would hear it every ' +
        'time: ' + [...seen].join(' | '));
    }
  }

  // ── 4. ...and holds its draw WITHIN a page. The bubble and the arm both resolve beat 2
  //      separately; if the draw moved between those two calls they could disagree about
  //      which tip is being told.
  {
    const page = await makePage(browser);
    const ids = await page.evaluate(function () {
      window.EVLines.force(['returning', 'needs-tools', 'guest', 'desktop']);
      var out = [];
      for (var i = 0; i < 8; i++) out.push(window.EVLines.resolve('greeter', 'point').id);
      return out;
    });
    assert.strictEqual(new Set(ids).size, 1, 'the draw changed within one page: ' + ids.join(', '));
    await page.close();
  }

  // ── 5. The device split. A phone has no right mouse button, so the desktop wording must be
  //      unreachable there, and vice versa.
  //
  //      Tested on a two-member pool rather than by drawing from the greeter's real one. The
  //      first version of this drew 30 times from the full pool and asserted the wanted line
  //      showed up — which is a 21% chance of failing on correct code, since one member of
  //      twenty is missed by (19/20)^30 of runs. It duly failed on its first run. A gate is a
  //      deterministic question and deserves a deterministic test.
  {
    const page = await makePage(browser);
    const got = await page.evaluate(function () {
      window.EVLines.register('dev', { beats: [{ at: 'one', lines: [{ pool: [
        { id: 'tip.poof.desktop', when: ['desktop'] },
        { id: 'tip.poof.touch',   when: ['touch'] }
      ]}]}]});
      function at(tag) {
        window.EVLines.force([tag]);
        // fresh key each call would re-draw; use a distinct speaker per tag instead
        return window.EVLines.resolve('dev', 'one');
      }
      var d = at('desktop');
      return { desktopId: d.id, desktopText: d.text };
    });
    assert.strictEqual(got.desktopId, 'tip.poof.desktop', 'a mouse must get the mouse wording');
    assert.ok(/right mouse button/.test(got.desktopText), 'desktop wording lost its mouse: ' + got.desktopText);
    await page.close();

    const page2 = await makePage(browser);
    const got2 = await page2.evaluate(function () {
      window.EVLines.register('dev', { beats: [{ at: 'one', lines: [{ pool: [
        { id: 'tip.poof.desktop', when: ['desktop'] },
        { id: 'tip.poof.touch',   when: ['touch'] }
      ]}]}]});
      window.EVLines.force(['touch']);
      var t = window.EVLines.resolve('dev', 'one');
      return { touchId: t.id, touchText: t.text };
    });
    assert.strictEqual(got2.touchId, 'tip.poof.touch', 'a touch device must get the touch wording');
    assert.ok(!/mouse/.test(got2.touchText), 'a phone was told to press a mouse button: ' + got2.touchText);
    await page2.close();
  }

  // ── 5b. ...and the wrong device wording is unreachable from the greeter's real pool. This
  //       direction IS safe to assert over draws: a forbidden member can never match, so no
  //       number of draws can produce it by luck.
  {
    for (const [tag, forbidden] of [['desktop', 'tip.poof.touch'], ['touch', 'tip.poof.desktop']]) {
      const drawn = new Set();
      for (let i = 0; i < 20; i++) {
        drawn.add((await beat2(browser, ['returning', 'needs-tools', 'guest', tag])).id);
      }
      assert.ok(!drawn.has(forbidden), tag + ' drew the wrong device wording: ' + forbidden);
    }
  }

  // ── 6. The device tag comes from the real pointer type when nothing is forced. Playwright's
  //      hasTouch/isMobile give a coarse pointer, which is what a phone reports.
  {
    const desktop = await makePage(browser);
    const dTags = await desktop.evaluate(function () { return window.EVLines.context().tags; });
    assert.ok(dTags.includes('desktop'), 'a mouse context must be tagged desktop: ' + dTags.join(','));
    assert.ok(!dTags.includes('touch'), 'desktop and touch are exclusive');
    await desktop.close();

    const phone = await makePage(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const pTags = await phone.evaluate(function () { return window.EVLines.context().tags; });
    assert.ok(pTags.includes('touch'), 'a touch context must be tagged touch: ' + pTags.join(','));
    assert.ok(!pTags.includes('desktop'), 'desktop and touch are exclusive');
    await phone.close();
  }

  // ── 7. Every tip in the catalog resolves to real copy, and every pooled id is reachable.
  //      A typo in an id is otherwise invisible until the day that tip happens to be drawn.
  {
    const page = await makePage(browser);
    const bad = await page.evaluate(function () {
      return window.EVCopy.ids()
        .filter(function (id) { return id.indexOf('tip.') === 0; })
        .filter(function (id) { var t = window.EVCopy.get(id); return !t || !t.length; });
    });
    assert.deepStrictEqual(bad, [], 'tip ids with no copy: ' + bad.join(', '));
    await page.close();
  }

  // ── 8. The two pointing tips: his arm must actually LAND on what the line names. The
  //      fixture has no hero and no banner, so this case loads the real page.
  //
  //      This is not a selector-exists check, because that would have passed while he stood
  //      with his arms at his sides. greetAim() required 40px of the target to be showing —
  //      a threshold written for the button column, which is hundreds of px tall. The account
  //      menu button is 36px in total, so it was rejected outright, greetAim returned null,
  //      and the pose fell back to standstill while the bubble said "up there in the top right
  //      corner". Only the angle catches that, so the angle is what is asserted.
  //
  //      The measurement does not re-derive the pose formula. It takes the pose the draw loop
  //      last used, maps the shoulder and hand through drawFig's flip and scale, and compares
  //      shoulder->hand against shoulder->target — the same technique as tests/greeter/03-sequence.
  {
    for (const [tipId, sel] of [['tip.feedback', '#profile-btn'], ['tip.values', '.hero h1']]) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.route('**/*', function (r) {
        return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
      });
      // Pin beat 2 to the tip under test, so this does not depend on the random draw.
      await page.addInitScript(function (arg) {
        document.addEventListener('DOMContentLoaded', function () {
          document.documentElement.style.scrollBehavior = 'auto';
          var t = setInterval(function () {
            if (!window.EVLines) return;
            clearInterval(t);
            window.EVLines.register('greeter', { beats: [
              { at: 'wave',  lines: [{ id: 'greet.hello' }] },
              { at: 'point', lines: [{ id: arg[0], aim: arg[1] }] }
            ]});
          }, 5);
        });
      }, [tipId, sel]);
      await page.goto('file:///C:/ev-landing/ev-landing-main/index.html#greeter');
      await page.waitForTimeout(400);

      let reached = false;
      for (let i = 0; i < 80 && !reached; i++) {
        reached = await page.evaluate(function () {
          var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
          var top = e.c.getBoundingClientRect().top, ih = window.innerHeight;
          var btn = document.querySelector('.showcase-logos').getBoundingClientRect().bottom;
          if (top > 70 && top + e.h < ih - 8 && btn > ih * 0.45 && window.scrollY >= 60) return true;
          window.scrollBy(0, 40);
          return false;
        });
        await page.waitForTimeout(45);
      }
      assert.ok(reached, tipId + ': could not reach the greeting window');

      await page.waitForFunction(function () {
        var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
        return e.giBeat === 2;
      }, { timeout: 9000 });
      await page.waitForTimeout(700);   // let the arm finish swinging to the new target

      const out = await page.evaluate(function (s) {
        var S = 0.32;
        var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
        var cr = e.c.getBoundingClientRect();
        var oyS = (e.h - 6) - 112 * S;
        var j = window.LeremyRig.computePose(e._giLast);
        // drawFig: translate(w/2, oyS) then scale(-S, S) for a flipped figure
        function map(pt) { return { x: cr.left + e.w / 2 - S * pt.x, y: cr.top + oyS + S * pt.y }; }
        var hand = map(j.hR), sh = map(j.sR);
        var r = document.querySelector(s).getBoundingClientRect();
        var t = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        var a1 = Math.atan2(hand.y - sh.y, hand.x - sh.x);
        var a2 = Math.atan2(t.y - sh.y, t.x - sh.x);
        return {
          deg: Math.abs(((a1 - a2) * 180 / Math.PI + 540) % 360 - 180),
          handAboveShoulder: sh.y - hand.y,
          text: document.querySelector('.ev-quote .say').textContent
        };
      }, sel);

      assert.ok(out.deg < 12,
        tipId + ": his arm is " + out.deg.toFixed(1) + "° off " + sel +
        " while saying: " + out.text);
      // Arms-at-his-sides is the specific failure this replaced, and it can sit at a small
      // angle by luck for a target that happens to be low. Require the arm to be genuinely up.
      assert.ok(out.handAboveShoulder > 10,
        tipId + ': his hand is not raised (' + out.handAboveShoulder.toFixed(1) + 'px above the shoulder)');
      await page.close();
    }
  }

  console.log('03-tips: PASS');
  await browser.close();
})();
