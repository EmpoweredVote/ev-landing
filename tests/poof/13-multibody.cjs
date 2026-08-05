// Several entries draw more than one figure: paddlepair and cartwheel are two players, the beam crew
// and the letter carriers are two carriers, a patrol can be escorting a toddler, and the kite flyer and
// yo-yo player each draw a prop well away from their own body.
//
// The gag replaces an entry's whole draw with ONE figure — the abduction does it, and drawFlee does it.
// So every one of those extra bodies used to blink out of existence: grab one paddle player and his
// partner vanished, poof anyone near the parent-and-toddler and the toddler went with him. Only the dog
// survived, and only because it had its own special case.
//
// The whole suite was green through all of that, which is why this file exists. It asserts PIXELS, not
// just that a mates array has the right length — a mate that is tracked in state and drawn nowhere is
// exactly the bug.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const RELOADS = 30;

function installProbe() {
  // is anything painted in a vertical band around this canvas-local x?
  window.__inkAtX = function (e, x, halfW) {
    if (!e.c.parentNode) return false;
    var sw = e.c.width, sh = e.c.height, rx = sw / e.w;
    var x0 = Math.max(0, Math.round((x - halfW) * rx));
    var w = Math.min(sw - x0, Math.round(halfW * 2 * rx));
    if (w <= 0) return false;
    var d;
    try { d = e.ctx.getImageData(x0, 0, w, sh).data; } catch (err) { return false; }
    for (var i = 3; i < d.length; i += 4) if (d[i] > 8) return true;
    return false;
  };
}

async function open(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  await page.waitForFunction(() => !!window.__evFigDebug);
  await page.waitForTimeout(1150);
  await page.evaluate(installProbe);
  page.__errs = errs;
  return page;
}

// Find an on-screen entry that draws 2+ bodies and scroll it into view.
async function pickMulti(page) {
  return page.evaluate(() => {
    const d = window.__evFigDebug;
    for (let i = 0; i < d.entries.length; i++) {
      const e = d.entries[i];
      if (!e.w || e.gone || e.spec.mode === 'why') continue;
      if ((e._bodies || []).length > 1) { e.c.scrollIntoView({ block: 'center', behavior: 'instant' }); return i; }
    }
    return null;
  });
}

// ── A: grab ONE body; the others must still be there, and painted ─────────────────────────────
async function scenarioAbduct(browser) {
  const page = await open(browser);
  const i = await pickMulti(page);
  if (i == null) { await page.close(); return null; }
  await page.waitForTimeout(450);

  const pressed = await page.evaluate(t => {
    const d = window.__evFigDebug, e = d.entries[t];
    const r = e.c.getBoundingClientRect();
    const b0 = e._bodies[0];
    for (let dy = 16; dy < 80; dy += 4) {
      if (d.bobitAt(r.left + b0.x, r.top + b0.floor - dy) === e) {
        document.dispatchEvent(new MouseEvent('mousedown', {
          button: 2, clientX: r.left + b0.x, clientY: r.top + b0.floor - dy, bubbles: true
        }));
        return { mode: e.spec.mode, bodies: e._bodies.length, grabbedX: b0.x };
      }
    }
    return null;
  }, i);
  if (!pressed) { await page.close(); return null; }

  await page.waitForTimeout(1300);       // well into the rise
  const mid = await page.evaluate(t => {
    const e = window.__evFigDebug.entries[t];
    if (!e.ab) return null;
    return {
      ab: e.ab, abX: e.abX,
      mates: (e.abMates || []).map(m => ({ x: m.x, small: !!m.small, painted: window.__inkAtX(e, m.x, 16) })),
      grabPainted: window.__inkAtX(e, e.abX, 16)
    };
  }, i);
  await page.evaluate(() => document.dispatchEvent(new MouseEvent('mouseup', { button: 2, bubbles: true })));
  const errs = page.__errs.slice();
  await page.close();
  return { pressed, mid, errs };
}

// ── B: poof somebody ELSE; a multi-body entry must flee with all of its bodies ─────────────────
async function scenarioFlee(browser) {
  const page = await open(browser);
  const i = await pickMulti(page);
  if (i == null) { await page.close(); return null; }
  await page.waitForTimeout(450);

  const before = await page.evaluate(t => {
    const e = window.__evFigDebug.entries[t];
    return { mode: e.spec.mode, bodies: e._bodies.length };
  }, i);

  const armed = await page.evaluate(t => {
    const d = window.__evFigDebug;
    const v = d.entries.find((e, j) => j !== t && e.w && !e.gone && e.spec.mode !== 'why');
    if (!v) return false;
    d.poof.victim = v; d.poof.phase = 'holding'; d.poof.t = 2.9;
    return true;
  }, i);
  if (!armed) { await page.close(); return null; }

  await page.waitForFunction(() => window.__evFigDebug.poof.phase === 'fleeing', { timeout: 12000 });
  await page.waitForTimeout(300);

  const fleeing = await page.evaluate(t => {
    const e = window.__evFigDebug.entries[t];
    if (e.gone || !e.fl) return { culled: true };
    return {
      culled: false, fl: e.fl,
      mates: (e.flMates || []).map(m => ({ x: m.x, small: !!m.small, painted: window.__inkAtX(e, m.x, 18) })),
      selfPainted: window.__inkAtX(e, e.flX, 18)
    };
  }, i);

  const cleared = await page.evaluate(() => new Promise(res => {
    const t0 = performance.now();
    (function step() {
      if (window.__evFigDebug.poof.phase === 'cleared') return res(true);
      if (performance.now() - t0 > 30000) return res(false);
      requestAnimationFrame(step);
    })();
  }));
  const errs = page.__errs.slice();
  await page.close();
  return { before, fleeing, cleared, errs };
}

(async function () {
  const browser = await chromium.launch();

  let a = null;
  for (let n = 0; n < RELOADS && !a; n++) a = await scenarioAbduct(browser);
  assert.ok(a, 'no cast in ' + RELOADS + ' loads had a grabbable multi-body entry on screen');
  assert.deepStrictEqual(a.errs, [], 'abduct: page errors');
  assert.ok(a.mid, 'abduct: the press did not start an abduction');
  assert.strictEqual(a.mid.mates.length, a.pressed.bodies - 1,
    'abduct: ' + a.pressed.mode + ' draws ' + a.pressed.bodies + ' bodies but only ' +
    a.mid.mates.length + ' survived as mates — the rest blinked out when the abduction took the canvas');
  // he must be drawn where the BODY was, not at the ink midpoint (which spans a kite/yo-yo and its prop)
  assert.ok(Math.abs(a.mid.abX - a.pressed.grabbedX) <= 6,
    'abduct: grabbed the body at x ' + a.pressed.grabbedX.toFixed(1) + ' but he is being drawn at ' +
    a.mid.abX.toFixed(1) + ' — he teleported sideways on the grab');
  assert.ok(a.mid.grabPainted, 'abduct: nothing painted at the abducted figure');
  a.mid.mates.forEach((m, k) => {
    assert.ok(m.painted,
      'abduct: mate ' + k + ' is tracked at x ' + m.x.toFixed(1) + ' but nothing is painted there — ' +
      'he exists in state and nowhere on screen');
  });

  let b = null;
  for (let n = 0; n < RELOADS && !b; n++) {
    const r = await scenarioFlee(browser);
    if (r && !r.fleeing.culled) b = r;
  }
  assert.ok(b, 'no cast in ' + RELOADS + ' loads had a multi-body entry survive to flee');
  assert.deepStrictEqual(b.errs, [], 'flee: page errors');
  assert.strictEqual(b.fleeing.mates.length, b.before.bodies - 1,
    'flee: ' + b.before.mode + ' draws ' + b.before.bodies + ' bodies but fled with only ' +
    b.fleeing.mates.length + ' mate(s) — drawFlee draws one figure, so the rest simply stopped existing');
  b.fleeing.mates.forEach((m, k) => {
    assert.ok(m.painted,
      'flee: mate ' + k + ' is tracked at x ' + m.x.toFixed(1) + ' but nothing is painted there');
  });
  assert.ok(b.cleared, 'flee: the exodus never cleared — a mate may be holding the entry open forever');

  console.log('  abduct: ' + a.pressed.mode + ' kept ' + a.mid.mates.length + ' of ' +
    (a.pressed.bodies - 1) + ' mate(s), all painted; grab anchored within ' +
    Math.abs(a.mid.abX - a.pressed.grabbedX).toFixed(1) + 'px of the body');
  console.log('  flee:   ' + b.before.mode + ' fled with ' + b.fleeing.mates.length + ' mate(s), all painted');
  console.log('13-multibody: PASS');
  await browser.close();
})();
