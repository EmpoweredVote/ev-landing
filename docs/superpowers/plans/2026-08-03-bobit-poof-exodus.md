# Bobit Poof & Exodus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hold right-click on any Bobit for 3s and he vanishes in a puff of smoke; everyone else freezes, then flees off-screen with their arms flailing, dropping off short perches into a heap and limping the rest of the way.

**Architecture:** A generic hit-test reads canvas alpha, so no mode needs its own hitbox. Smoke draws on one fixed full-viewport overlay canvas rather than the victim's own (most mode branches `return` early, so there is no clean post-figure hook, and a 190px canvas would clip the burst). A single global `POOF` phase machine drives the whole sequence; per-figure flee state hangs off each entry like `e.cw`/`e.df`/`e.qs` already do.

**Tech Stack:** Vanilla ES5-style browser JS, no build step, no dependencies. Verification via globally-installed Playwright over `file://`.

**Spec:** `docs/superpowers/specs/2026-08-03-bobit-poof-exodus-design.md`

## Global Constraints

- **No build step, no dependencies.** Static site.
- **Match the surrounding style:** `var` only (never `let`/`const`) in `ev-figures.js`; `leremy-rig.js` uses `const`/arrow functions, so match *that* file when editing it. Function expressions, no classes.
- **Never reassign `flip`** for a fleeing figure's own sake — direction comes from `e.flDir`, and the draw call passes `flip` derived from it. (Unrelated to the quote readers' no-turn rule, but the same discipline.)
- **The three `why` figures are excluded everywhere:** they never flee and `bobitAt()` must never return one. They are content — the code hides an `<img>` to draw them.
- **All canvas sizing goes through the existing `fitW`/`fitLeft` helpers** (`ev-figures.js:379`). A widened flee canvas that skips them reintroduces the phone horizontal-scroll bug fixed on 2026-08-02.
- **`getImageData` is safe on these canvases** — pure vectors, never tainted, and it already works under `file://`.
- **Test scripts must be `.cjs`.** `package.json` sets `"type": "module"` and `NODE_PATH` is only consulted by CommonJS `require()`; an `.mjs` test cannot resolve the global Playwright.
- **Playwright invocation:**
  ```bash
  NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/poof/<script>.cjs
  ```
- **Every test page must block outbound requests**, or PostHog and fonts hang the run:
  ```js
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  ```
- **Known gotchas, all hit before in this repo:**
  - `index.html` sets `scroll-behavior: smooth`, so `scrollIntoView` **animates**. Always pass `{behavior: 'instant'}` and settle before measuring a rect for a hit-test, or every synthesized press misses.
  - The draw loop culls off-viewport canvases (`ev-figures.js:1791`), so an off-screen canvas paints **nothing** — scroll a figure into view before measuring its ink.
  - In the rig, **0° points straight DOWN and 90° is horizontal**. Raising an arm angle swings a limb outward, not upward. Arms overhead is ~±170°.
  - Do not stub `Math.random`; PostHog's inline init consumes from the sequence.
  - `page.reload()` for a fresh random cast — re-navigating to the same `#figdebug` URL is a same-document hash change and does not re-run the script.

## File Structure

| File | Responsibility |
|---|---|
| `leremy-rig.js` (modify) | `drawSmoke()` — a puff primitive with no knowledge of the gag, beside `drawBook`/`drawCane`/`drawDog`. Exported on `window.LeremyRig`. |
| `ev-figures.js` (modify) | A fenced `POOF` section: alpha hit-test, press detection, the global phase machine, the smoke overlay canvas, and the per-figure flee/pratfall machine. |
| `index.html` (modify) | One CSS rule: `body.ev-poofing` suppresses the touch callout and text selection while a hold is in flight. |
| `tests/poof/*.cjs` (new) | Playwright verification, one script per task. |

### Deviation from the spec: one runner per entry

The spec says "multi-figure scenes flee as individuals". **This plan gives each *entry* one fleeing
figure**, so the beam pair, the paddleball pair and the cartwheeler + helper each leave as a single
runner rather than scattering separately.

Why: an entry is one canvas with one state bag. Finding where the *second* figure currently stands means
per-mode knowledge — `e.gA`/`e.gB` for the beam, `e._ppSXL`/`e._ppSXR` for the paddle pair, `e.hp` for
the cartwheel helper — which is the same reach-into-every-mode coupling that this design avoids in the
hit-test. The generic alternative, clustering the canvas's ink columns, breaks on props: the kite would
become a "runner" and sprint off on human legs.

**The dog is the exception and gets Task 7**, because the spec promises him explicitly and he already
has his own `run` pose in `drawDog`, so he can leave as himself rather than as a stick figure.

If the pairs leaving as one reads badly on screen, per-mode runner seeding is a contained follow-up —
but it should be judged on the real thing first.

---

### Task 1: `drawSmoke` puff primitive

**Files:**
- Modify: `leremy-rig.js` (add beside `drawBook`, which ends at line 315; export at line 1191)
- Test: `tests/poof/01-smoke.cjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `LeremyRig.drawSmoke(ctx, x, y, spread, alpha, seed, t)` — draws 9 grey puffs centred on `(x, y)`, scattered within roughly `spread` pixels, at overall opacity `alpha` (0–1). `seed` (any integer) makes the scatter deterministic; `t` (seconds) drifts the puffs. Draws nothing when `alpha <= 0` or `spread <= 0`. Returns nothing.

- [ ] **Step 1: Write the failing test**

Create `tests/poof/01-smoke.cjs`:

```js
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');

// counts pixels with alpha > 8 on a scratch canvas
const COVERAGE = `(function (args) {
  var c = document.createElement('canvas');
  c.width = 400; c.height = 300;
  var g = c.getContext('2d');
  window.LeremyRig.drawSmoke(g, args.x, args.y, args.spread, args.alpha, args.seed, args.t);
  var d = g.getImageData(0, 0, c.width, c.height).data;
  var n = 0, sum = 0;
  for (var i = 3; i < d.length; i += 4) { if (d[i] > 8) { n++; sum += d[i]; } }
  return { pixels: n, meanAlpha: n ? sum / n : 0 };
})`;

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto('about:blank');
  await page.addScriptTag({ path: path.join(__dirname, '..', '..', 'leremy-rig.js') });

  assert.ok(await page.evaluate(function () { return typeof window.LeremyRig.drawSmoke === 'function'; }),
    'LeremyRig must export drawSmoke');

  const base = { x: 200, y: 200, spread: 30, alpha: 0.8, seed: 7, t: 0 };

  // draws something
  const small = await page.evaluate(COVERAGE, base);
  assert.ok(small.pixels > 200, 'a puff should paint a meaningful area, got ' + small.pixels);

  // a bigger spread covers more ground
  const big = await page.evaluate(COVERAGE, Object.assign({}, base, { spread: 70 }));
  assert.ok(big.pixels > small.pixels * 1.5,
    'spread 70 should cover much more than spread 30 (' + big.pixels + ' vs ' + small.pixels + ')');

  // alpha scales opacity, not area
  const faint = await page.evaluate(COVERAGE, Object.assign({}, base, { alpha: 0.2 }));
  assert.ok(faint.meanAlpha < small.meanAlpha * 0.6,
    'lower alpha must be fainter (' + faint.meanAlpha + ' vs ' + small.meanAlpha + ')');

  // nothing at all when invisible or unspread
  for (const dead of [{ alpha: 0 }, { alpha: -1 }, { spread: 0 }]) {
    const r = await page.evaluate(COVERAGE, Object.assign({}, base, dead));
    assert.strictEqual(r.pixels, 0, 'must draw nothing for ' + JSON.stringify(dead));
  }

  // deterministic for a given seed, different across seeds
  const a1 = await page.evaluate(COVERAGE, Object.assign({}, base, { seed: 3 }));
  const a2 = await page.evaluate(COVERAGE, Object.assign({}, base, { seed: 3 }));
  const b1 = await page.evaluate(COVERAGE, Object.assign({}, base, { seed: 4 }));
  assert.strictEqual(a1.pixels, a2.pixels, 'same seed must produce the same puff');
  assert.notStrictEqual(a1.pixels, b1.pixels, 'different seeds should scatter differently');

  // does not leave the context dirtied for the next caller
  const clean = await page.evaluate(function () {
    var c = document.createElement('canvas'); c.width = 50; c.height = 50;
    var g = c.getContext('2d');
    window.LeremyRig.drawSmoke(g, 25, 25, 10, 0.5, 1, 0);
    return { alpha: g.globalAlpha, fill: g.fillStyle };
  });
  assert.strictEqual(clean.alpha, 1, 'drawSmoke must restore globalAlpha');

  console.log('01-smoke: PASS');
  await browser.close();
})();
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/poof/01-smoke.cjs
```

Expected: FAIL — `LeremyRig must export drawSmoke`.

- [ ] **Step 3: Add `drawSmoke` to `leremy-rig.js`**

Insert immediately after `drawBook` closes (after line 315). Note this file uses `const`/arrow style, unlike `ev-figures.js`.

```js
// A puff of smoke: soft grey blobs scattered around (x, y), growing with `spread` and fading
// with `alpha`. One function serves both the slow build-up under a doomed Bobit and the burst
// when he goes — only spread and alpha differ. The scatter is derived from `seed` rather than
// Math.random so a given frame is reproducible in tests; `t` (seconds) drifts the puffs so the
// cloud churns instead of sitting still. Grey #8A8F98 reads against both themes' grounds.
function drawSmoke(ctx, x, y, spread, alpha, seed, t) {
  if (!(alpha > 0) || !(spread > 0)) return;
  const N = 9;
  ctx.save();
  ctx.fillStyle = "#8A8F98";
  for (let i = 0; i < N; i++) {
    const ang = ((seed * 37 + i * 61) % 360) * D;          // deterministic angle
    const rad = 0.35 + (((seed * 13 + i * 29) % 100) / 100) * 0.65;
    const drift = Math.sin(t * (0.7 + i * 0.13) + i) * spread * 0.14;
    const px = x + Math.cos(ang) * spread * rad + drift;
    const py = y - Math.abs(Math.sin(ang)) * spread * rad * 0.85 - spread * 0.2;
    const pr = spread * (0.26 + rad * 0.3);
    ctx.globalAlpha = Math.min(1, alpha) * (0.4 + rad * 0.45);
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
```

- [ ] **Step 4: Export it**

Change line 1191 to include `drawSmoke`:

```js
window.LeremyRig = { CFG, REST, ANIMATIONS, ORDER, computePose, draw, drawShadow, drawSmoke, drawSkeleton, attach, setAnim, setPlaying, setSpeed, setSkel };
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/poof/01-smoke.cjs
```

Expected: `01-smoke: PASS`

- [ ] **Step 6: Commit**

```bash
git add leremy-rig.js tests/poof/01-smoke.cjs
git commit -m "feat(poof): drawSmoke puff primitive in the rig"
```

---

### Task 2: Alpha hit-test and long-press detection

**Files:**
- Modify: `ev-figures.js` (new POOF section after the click listener, which closes at line 111; debug hook at line 2262)
- Modify: `index.html` (one CSS rule)
- Test: `tests/poof/02-press.cjs`

**Interfaces:**
- Consumes: `entries` (module-scope array; each has `.c` canvas, `.ctx`, `.w`, `.spec`).
- Produces:
  - `bobitAt(px, py)` — screen coords in, the topmost entry whose painted pixels are under that point, or `null`. Never returns a `why` entry.
  - `POOF` — module-scope state `{ phase, t, victim, armed, sx, sy }`. `phase` is one of `'idle'`, `'holding'`, `'fizzle'`, `'poof'`, `'stunned'`, `'fleeing'`, `'cleared'`.
  - `poofStart(e)`, `poofCancel()` — begin/abort a hold.
  - `POOF_HOLD = 3.0`, `POOF_BURST = 0.6`, `POOF_STUN = 1.0` (seconds).
  - Debug hook gains `poof: POOF` and `bobitAt: bobitAt`.

This task wires input only — reaching `POOF_HOLD` sets `phase = 'poof'` and nothing visual happens yet. Tasks 3–6 add the consequences.

- [ ] **Step 1: Write the failing test**

Create `tests/poof/02-press.cjs`:

```js
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

async function load(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  await page.waitForTimeout(1200);
  return page;
}

// a point that is definitely ON painted ink, and one definitely off it but inside the same canvas
async function points(page) {
  return page.evaluate(function () {
    var es = window.__evFigDebug.entries.filter(function (e) {
      return e.spec.mode !== 'why' && e.w;
    });
    for (var i = 0; i < es.length; i++) {
      var e = es[i];
      e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
      var r = e.c.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      var g = e.ctx, d;
      try { d = g.getImageData(0, 0, e.c.width, e.c.height).data; } catch (err) { continue; }
      var sx = e.c.width / r.width, sy = e.c.height / r.height;
      var hit = null;
      for (var y = e.c.height - 1; y >= 0 && !hit; y--) {
        for (var x = 0; x < e.c.width; x++) {
          if (d[(y * e.c.width + x) * 4 + 3] > 8) { hit = { x: r.left + x / sx, y: r.top + y / sy }; break; }
        }
      }
      if (hit) return { hit: hit, empty: { x: r.left + 2, y: r.top + 2 }, mode: e.spec.mode };
    }
    return null;
  });
}

(async function () {
  const browser = await chromium.launch();
  let page = await load(browser);

  // the hit-test finds ink and rejects the empty box around it
  const pts = await points(page);
  assert.ok(pts, 'no painted Bobit found to test against');
  const probe = await page.evaluate(function (p) {
    var d = window.__evFigDebug;
    var onInk = d.bobitAt(p.hit.x, p.hit.y);
    var onEmpty = d.bobitAt(p.empty.x, p.empty.y);
    var offPage = d.bobitAt(4, 4);
    return { onInk: !!onInk, onInkMode: onInk && onInk.spec.mode, onEmpty: !!onEmpty, offPage: !!offPage };
  }, pts);
  assert.ok(probe.onInk, 'bobitAt must find a Bobit on painted ink');
  assert.strictEqual(probe.onEmpty, false, 'bobitAt must reject the empty space inside the canvas');
  assert.strictEqual(probe.offPage, false, 'bobitAt must reject a point with no Bobit');

  // why figures are never returned
  const whyProbe = await page.evaluate(function () {
    var why = window.__evFigDebug.entries.filter(function (e) { return e.spec.mode === 'why'; })[0];
    if (!why) return 'no-why';
    why.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    var r = why.c.getBoundingClientRect();
    var found = false;
    for (var y = 0; y < r.height; y += 4) {
      for (var x = 0; x < r.width; x += 4) {
        if (window.__evFigDebug.bobitAt(r.left + x, r.top + y)) { found = true; break; }
      }
      if (found) break;
    }
    return found;
  });
  assert.notStrictEqual(whyProbe, true, 'a why figure must never be returned by bobitAt');

  // a 3s right-press fires; the phase machine leaves 'holding'
  await page.evaluate(function (p) {
    var el = document.elementFromPoint(p.hit.x, p.hit.y) || document.body;
    el.dispatchEvent(new MouseEvent('mousedown', { button: 2, buttons: 2, clientX: p.hit.x, clientY: p.hit.y, bubbles: true }));
  }, pts);
  await page.waitForTimeout(400);
  assert.strictEqual(await page.evaluate(function () { return window.__evFigDebug.poof.phase; }), 'holding',
    'a right-press on a Bobit must start a hold');

  await page.waitForTimeout(3000);
  assert.notStrictEqual(await page.evaluate(function () { return window.__evFigDebug.poof.phase; }), 'holding',
    'the hold must complete after 3s');
  await page.close();

  // releasing at 2.5s cancels — no poof
  page = await load(browser);
  const pts2 = await points(page);
  await page.evaluate(function (p) {
    (document.elementFromPoint(p.hit.x, p.hit.y) || document.body)
      .dispatchEvent(new MouseEvent('mousedown', { button: 2, buttons: 2, clientX: p.hit.x, clientY: p.hit.y, bubbles: true }));
  }, pts2);
  await page.waitForTimeout(2500);
  await page.evaluate(function () {
    document.dispatchEvent(new MouseEvent('mouseup', { button: 2, bubbles: true }));
  });
  await page.waitForTimeout(1500);
  const afterEarly = await page.evaluate(function () { return window.__evFigDebug.poof.phase; });
  assert.ok(afterEarly === 'idle' || afterEarly === 'fizzle',
    'releasing at 2.5s must cancel, got ' + afterEarly);

  // Escape cancels too
  await page.evaluate(function (p) {
    (document.elementFromPoint(p.hit.x, p.hit.y) || document.body)
      .dispatchEvent(new MouseEvent('mousedown', { button: 2, buttons: 2, clientX: p.hit.x, clientY: p.hit.y, bubbles: true }));
  }, pts2);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  const afterEsc = await page.evaluate(function () { return window.__evFigDebug.poof.phase; });
  assert.ok(afterEsc === 'idle' || afterEsc === 'fizzle', 'Escape must cancel, got ' + afterEsc);

  // contextmenu suppressed on a Bobit, allowed elsewhere
  const menus = await page.evaluate(function (p) {
    function tryMenu(x, y) {
      var el = document.elementFromPoint(x, y) || document.body;
      el.dispatchEvent(new MouseEvent('mousedown', { button: 2, buttons: 2, clientX: x, clientY: y, bubbles: true }));
      var ev = new MouseEvent('contextmenu', { clientX: x, clientY: y, bubbles: true, cancelable: true });
      el.dispatchEvent(ev);
      document.dispatchEvent(new MouseEvent('mouseup', { button: 2, bubbles: true }));
      return ev.defaultPrevented;
    }
    var onBobit = tryMenu(p.hit.x, p.hit.y);
    var offBobit = tryMenu(4, 4);
    return { onBobit: onBobit, offBobit: offBobit };
  }, pts2);
  assert.strictEqual(menus.onBobit, true, 'contextmenu must be suppressed on a Bobit');
  assert.strictEqual(menus.offBobit, false, 'contextmenu must work everywhere else');

  console.log('02-press: PASS');
  await browser.close();
})();
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/poof/02-press.cjs
```

Expected: FAIL — `window.__evFigDebug.bobitAt` is not a function.

- [ ] **Step 3: Add the POOF section to `ev-figures.js`**

Insert immediately after the `keydown`/Escape listener for quote bubbles closes (just after line 111, before `function cssVar`).

```js
    // ══ POOF & EXODUS ═══════════════════════════════════════════════════════════════════
    // Hold the right mouse button (or one finger) on any Bobit for 3s: smoke gathers, he
    // vanishes, everyone else freezes for a beat and then bolts off-screen. The page stays
    // empty until reload.
    var POOF_HOLD = 3.0, POOF_BURST = 0.6, POOF_STUN = 1.0;
    var POOF = { phase: 'idle', t: 0, victim: null, armed: false, sx: 0, sy: 0 };

    // Which Bobit is under this point? The canvases are pointer-events:none and only two modes
    // bother to store a hitbox, so rather than add one to all fourteen we ask the pixels:
    // convert the point into canvas space and read its alpha. Non-zero means the pointer is on
    // painted ink — an actual figure, not the empty box around him — and any mode added later
    // inherits this for free. These canvases draw vectors only, so they are never tainted.
    function bobitAt(px, py) {
      for (var i = entries.length - 1; i >= 0; i--) {          // topmost first
        var e = entries[i];
        if (!e.w || e.spec.mode === 'why') continue;           // why figures are content, not inhabitants
        var r = e.c.getBoundingClientRect();
        if (px < r.left || px > r.right || py < r.top || py > r.bottom) continue;
        var kx = e.c.width / r.width, ky = e.c.height / r.height;
        var pad = Math.max(2, Math.round(6 * kx));             // a few px of slop around thin limbs
        var x0 = Math.max(0, Math.round((px - r.left) * kx) - pad);
        var y0 = Math.max(0, Math.round((py - r.top) * ky) - pad);
        var bw = Math.min(e.c.width - x0, pad * 2 + 1);
        var bh = Math.min(e.c.height - y0, pad * 2 + 1);
        if (bw <= 0 || bh <= 0) continue;
        var d;
        try { d = e.ctx.getImageData(x0, y0, bw, bh).data; } catch (err) { continue; }
        for (var k = 3; k < d.length; k += 4) if (d[k] > 8) return e;
      }
      return null;
    }

    function poofStart(e) {
      if (POOF.phase !== 'idle' || !e) return;
      POOF.phase = 'holding'; POOF.t = 0; POOF.victim = e;
      document.body.classList.add('ev-poofing');   // suppresses the touch callout while holding
    }
    function poofCancel() {
      if (POOF.phase !== 'holding') return;
      POOF.phase = 'fizzle'; POOF.t = 0;           // smoke thins out, nobody vanishes
      document.body.classList.remove('ev-poofing');
    }

    // ── mouse ──
    document.addEventListener('mousedown', function (ev) {
      if (ev.button !== 2) { POOF.armed = false; return; }
      var e = bobitAt(ev.clientX, ev.clientY);
      POOF.armed = !!e;                            // gates contextmenu suppression
      if (e) poofStart(e);
    }, true);
    // Firefox fires contextmenu on mousedown (mid-hold), Chrome on mouseup (as the gag lands),
    // so suppression is keyed off `armed` rather than the phase. Cleared here so a later
    // right-click on ordinary page content still gets its menu.
    document.addEventListener('contextmenu', function (ev) {
      if (!POOF.armed) return;
      ev.preventDefault();
      POOF.armed = false;
    });
    document.addEventListener('mouseup', function (ev) { if (ev.button === 2) poofCancel(); });
    document.addEventListener('mousemove', function (ev) {
      if (POOF.phase !== 'holding') return;
      if (bobitAt(ev.clientX, ev.clientY) !== POOF.victim) poofCancel();
    }, { passive: true });
    window.addEventListener('blur', poofCancel);
    document.addEventListener('mouseleave', poofCancel);
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') poofCancel(); });

    // ── touch: a 3s hold does the same. No preventDefault on touchstart, so a scroll that
    //    happens to begin on a Bobit still scrolls — a >10px move cancels instead. ──
    document.addEventListener('touchstart', function (ev) {
      if (ev.touches.length !== 1) { poofCancel(); return; }
      var t = ev.touches[0];
      var e = bobitAt(t.clientX, t.clientY);
      POOF.armed = !!e;
      POOF.sx = t.clientX; POOF.sy = t.clientY;
      if (e) poofStart(e);
    }, { passive: true });
    document.addEventListener('touchmove', function (ev) {
      if (POOF.phase !== 'holding' || !ev.touches.length) return;
      var t = ev.touches[0];
      if (Math.abs(t.clientX - POOF.sx) > 10 || Math.abs(t.clientY - POOF.sy) > 10) poofCancel();
    }, { passive: true });
    document.addEventListener('touchend', poofCancel);
    document.addEventListener('touchcancel', poofCancel);

    // Advance the phase machine. Called once per frame from tick(); the visual consequences are
    // added in later tasks, this only moves the phases along.
    function poofTick(dt) {
      if (POOF.phase === 'idle' || POOF.phase === 'cleared') return;
      POOF.t += dt;
      if (POOF.phase === 'holding') {
        if (POOF.t >= POOF_HOLD) {
          POOF.phase = 'poof'; POOF.t = 0;
          document.body.classList.remove('ev-poofing');
        }
      } else if (POOF.phase === 'fizzle') {
        if (POOF.t >= 0.4) { POOF.phase = 'idle'; POOF.t = 0; POOF.victim = null; }
      } else if (POOF.phase === 'poof') {
        if (POOF.t >= POOF_BURST) { POOF.phase = 'stunned'; POOF.t = 0; }
      } else if (POOF.phase === 'stunned') {
        if (POOF.t >= POOF_STUN) { POOF.phase = 'fleeing'; POOF.t = 0; }
      }
    }
    // ══ end POOF ════════════════════════════════════════════════════════════════════════
```

- [ ] **Step 4: Call `poofTick` from the frame loop**

In `tick()` (line 1753), immediately after `var dt = Math.min(0.1, (now - last) / 1000); last = now;`, add:

```js
      poofTick(dt);
```

- [ ] **Step 5: Expose it on the debug hook**

Extend line 2262:

```js
    if (location.hash === '#figdebug') window.__evFigDebug = {
      entries: entries, footWalk: footWalk, footStand: footStand,
      quoteGlance: quoteGlance, quoteHold: quoteHold, quoteShrugSeat: quoteShrugSeat,
      poof: POOF, bobitAt: bobitAt
    };
```

- [ ] **Step 6: Add the touch-callout CSS to `index.html`**

Insert immediately before `</style>`:

```css
        /* while a poof hold is in flight, stop the long-press callout / text selection from
           interrupting it — scoped in TIME rather than to specific elements, because the
           figure canvases are pointer-events:none and the touch lands on whatever is beneath */
        body.ev-poofing {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
        }
```

- [ ] **Step 7: Run the test to verify it passes**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/poof/02-press.cjs
```

Expected: `02-press: PASS`

- [ ] **Step 8: Commit**

```bash
git add ev-figures.js index.html tests/poof/02-press.cjs
git commit -m "feat(poof): alpha hit-test and 3s long-press detection"
```

---

### Task 3: Smoke overlay, build-up and burst

**Files:**
- Modify: `ev-figures.js` (POOF section)
- Test: `tests/poof/03-smoke-overlay.cjs`

**Interfaces:**
- Consumes: `LeremyRig.drawSmoke` (Task 1); `POOF`, `poofTick` (Task 2).
- Produces:
  - `poofOverlay()` — lazily creates and returns the single fixed full-viewport smoke canvas (`position:fixed; inset:0; pointer-events:none; z-index:61`).
  - `poofDrawSmoke()` — clears and redraws the overlay for the current phase. Called from `tick()` after the figure loop.
  - `POOF.vx` / `POOF.vy` — the victim's last known screen position (his canvas centre and floor), frozen when he vanishes.
  - Debug hook gains `poofOverlay: poofOverlay`.

A dedicated overlay rather than the victim's own canvas: most mode branches `return` early so there is no clean post-figure hook, and a 190px canvas would clip the burst.

- [ ] **Step 1: Write the failing test**

Create `tests/poof/03-smoke-overlay.cjs`:

```js
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

// alpha coverage of the smoke overlay
const SMOKE = `(function () {
  var c = window.__evFigDebug.poofOverlay();
  var g = c.getContext('2d');
  var d = g.getImageData(0, 0, c.width, c.height).data;
  var n = 0;
  for (var i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
  return n;
})`;

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  await page.waitForTimeout(1200);

  // pick a visible Bobit and start a hold on him directly (input is covered by 02)
  const ok = await page.evaluate(function () {
    var e = window.__evFigDebug.entries.filter(function (x) {
      return x.spec.mode !== 'why' && x.w;
    })[0];
    e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    return !!e;
  });
  assert.ok(ok);
  await page.waitForTimeout(400);

  const before = await page.evaluate(SMOKE);
  assert.strictEqual(before, 0, 'no smoke before a hold starts');

  await page.evaluate(function () {
    var d = window.__evFigDebug;
    var e = d.entries.filter(function (x) { return x.spec.mode !== 'why' && x.w; })[0];
    d.poof.phase = 'holding'; d.poof.t = 0; d.poof.victim = e;
  });

  await page.waitForTimeout(900);
  const early = await page.evaluate(SMOKE);
  await page.waitForTimeout(1400);
  const later = await page.evaluate(SMOKE);
  assert.ok(early > 0, 'smoke should be visible early in the hold');
  assert.ok(later > early * 1.4,
    'smoke must thicken over the hold (' + early + ' -> ' + later + ')');

  // let it complete: the burst should be bigger still, then clear away
  await page.waitForFunction(function () { return window.__evFigDebug.poof.phase !== 'holding'; }, { timeout: 4000 });
  const burst = await page.evaluate(SMOKE);
  assert.ok(burst > later, 'the burst must be larger than the build-up (' + later + ' -> ' + burst + ')');

  // the victim is gone
  await page.waitForFunction(function () {
    var p = window.__evFigDebug.poof;
    return p.phase === 'stunned' || p.phase === 'fleeing' || p.phase === 'cleared';
  }, { timeout: 4000 });
  const victimGone = await page.evaluate(function () {
    var v = window.__evFigDebug.poof.victim;
    return { removed: !v || !v.c.parentNode || v.gone === true };
  });
  assert.ok(victimGone.removed, 'the victim must be removed once the cloud clears');

  // and the smoke eventually clears
  await page.waitForTimeout(1200);
  assert.strictEqual(await page.evaluate(SMOKE), 0, 'smoke must clear after the burst');

  console.log('03-smoke-overlay: PASS');
  await browser.close();
})();
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/poof/03-smoke-overlay.cjs
```

Expected: FAIL — `window.__evFigDebug.poofOverlay is not a function`.

- [ ] **Step 3: Add the overlay and its drawing to the POOF section**

Insert before `function poofTick`:

```js
    // One fixed full-viewport canvas for all smoke. Not the victim's own canvas: most mode
    // branches return early so there is no clean post-figure hook, and a 190px canvas would
    // clip the burst. Fixed positioning means we work in screen coords, which is what the
    // victim's rect gives us anyway.
    var _poofC = null;
    function poofOverlay() {
      if (!_poofC) {
        _poofC = document.createElement('canvas');
        _poofC.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:61;';
        document.body.appendChild(_poofC);
      }
      var vw = document.documentElement.clientWidth, vh = window.innerHeight;
      if (_poofC.__w !== vw || _poofC.__h !== vh) {
        _poofC.__w = vw; _poofC.__h = vh;
        _poofC.width = Math.round(vw * DPR); _poofC.height = Math.round(vh * DPR);
        _poofC.style.width = vw + 'px'; _poofC.style.height = vh + 'px';
      }
      return _poofC;
    }

    function poofDrawSmoke() {
      if (!_poofC && POOF.phase !== 'holding' && POOF.phase !== 'poof' && POOF.phase !== 'fizzle') return;
      var c = poofOverlay(), g = c.getContext('2d');
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.clearRect(0, 0, c.__w, c.__h);

      // follow the victim while he is still there, then hold his last spot
      if (POOF.victim && POOF.victim.c.parentNode) {
        var r = POOF.victim.c.getBoundingClientRect();
        POOF.vx = r.left + r.width / 2;
        POOF.vy = r.bottom - 8;
      }
      if (POOF.vx == null) return;

      var seed = 11;
      if (POOF.phase === 'holding') {
        var k = Math.min(1, POOF.t / POOF_HOLD);
        R.drawSmoke(g, POOF.vx, POOF.vy, 12 + k * k * 46, 0.12 + k * 0.7, seed, POOF.t);
      } else if (POOF.phase === 'fizzle') {
        var f = Math.max(0, 1 - POOF.t / 0.4);
        R.drawSmoke(g, POOF.vx, POOF.vy, 20 * f, 0.5 * f, seed, POOF.t);
      } else if (POOF.phase === 'poof') {
        var b = Math.min(1, POOF.t / POOF_BURST);
        R.drawSmoke(g, POOF.vx, POOF.vy - 10, 58 + b * 70, 1 - b, seed, POOF.t);
      }
    }
```

- [ ] **Step 4: Remove the victim at the start of the burst**

In `poofTick`, extend the `holding → poof` transition so the victim stops being drawn and any open quote bubble closes:

```js
      if (POOF.phase === 'holding') {
        if (POOF.t >= POOF_HOLD) {
          POOF.phase = 'poof'; POOF.t = 0;
          document.body.classList.remove('ev-poofing');
          // freeze his last position for the burst, then take him off the page
          var vr = POOF.victim.c.getBoundingClientRect();
          POOF.vx = vr.left + vr.width / 2; POOF.vy = vr.bottom - 8;
          POOF.victim.gone = true;
          if (POOF.victim.c.parentNode) POOF.victim.c.parentNode.removeChild(POOF.victim.c);
          if (window.EVQuotes) window.EVQuotes.closeAll();
        }
      }
```

- [ ] **Step 5: Skip `gone` entries in the draw loop and in reposition**

In `reposition()` (line 390) add as the first line inside `entries.forEach(function (e) {`:

```js
        if (e.gone) return;
```

In the draw loop (line 1786) add immediately after `var spec = e.spec, ctx = e.ctx, w = e.w, h = e.h;`:

```js
        if (e.gone) return;
```

- [ ] **Step 6: Draw the smoke each frame**

In `tick()`, immediately after the `entries.forEach(...)` draw loop closes and before the `window.EVQuotes.tick(dt)` block, add:

```js
      poofDrawSmoke();
```

- [ ] **Step 7: Expose the overlay on the debug hook**

Add `poofOverlay: poofOverlay` to the `__evFigDebug` object.

- [ ] **Step 8: Run the test to verify it passes**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/poof/03-smoke-overlay.cjs
```

Expected: `03-smoke-overlay: PASS`

- [ ] **Step 9: Commit**

```bash
git add ev-figures.js tests/poof/03-smoke-overlay.cjs
git commit -m "feat(poof): smoke overlay, build-up and burst; victim removed"
```

---

### Task 4: The stun freeze

**Files:**
- Modify: `ev-figures.js` (draw loop at line 1786)
- Test: `tests/poof/04-stun.cjs`

**Interfaces:**
- Consumes: `POOF.phase` (Task 2).
- Produces: nothing new. While `POOF.phase === 'stunned'`, every figure's `dt` is 0 inside the draw loop.

**This must freeze both layers.** The obvious move — extending the existing `e.lt += dt * (…)` gate — only freezes `tt`, the gait clock. Scene machines advance their own timers straight off `dt` (`e.dfT += dt`, `e.cwT += dt`, `e.ktT += dt`, `e.qsT += dt`), so a `tt`-only freeze leaves the dog fetching and the cartwheeler spinning while everyone else stands still. Shadowing `dt` with a local inside the loop callback freezes both at once and touches two lines instead of ten.

- [ ] **Step 1: Write the failing test**

Create `tests/poof/04-stun.cjs`:

```js
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
  // scroll everything into view at least once so scene machines have initialised
  await page.evaluate(async function () {
    for (var y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y); await new Promise(function (r) { setTimeout(r, 100); });
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);

  // freeze the page in the stunned phase and sample twice
  const r = await page.evaluate(async function () {
    var d = window.__evFigDebug;
    var others = d.entries.filter(function (e) { return e.spec.mode !== 'why' && !e.gone; });
    // hold the phase there for the duration of the measurement
    d.poof.victim = others[0];
    d.poof.phase = 'stunned'; d.poof.t = 0;
    var hold = setInterval(function () { d.poof.phase = 'stunned'; d.poof.t = 0; }, 50);

    function snap() {
      return others.map(function (e) {
        return [e.lt, e.qsT, e.cwT, e.dfT, e.ktT, e.yoT, e.rl, e.phT]
          .map(function (v) { return v == null ? '-' : (typeof v === 'number' ? v.toFixed(4) : v); })
          .join(',');
      }).join('|');
    }
    var a = snap();
    await new Promise(function (res) { setTimeout(res, 700); });
    var b = snap();
    clearInterval(hold);
    return { same: a === b, a: a.slice(0, 200), b: b.slice(0, 200), n: others.length };
  });

  assert.ok(r.n > 0, 'no figures to test');
  assert.ok(r.same,
    'stunned figures must not advance ANY clock — gait or scene.\n  before: ' + r.a + '\n  after:  ' + r.b);

  // and they resume afterwards
  const resumed = await page.evaluate(async function () {
    var d = window.__evFigDebug;
    d.poof.phase = 'idle'; d.poof.t = 0;
    var e = d.entries.filter(function (x) { return x.spec.mode !== 'why' && !x.gone; })[0];
    e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    await new Promise(function (res) { setTimeout(res, 300); });
    var before = e.lt;
    await new Promise(function (res) { setTimeout(res, 500); });
    return e.lt > before;
  });
  assert.ok(resumed, 'clocks must resume once the stun is over');

  console.log('04-stun: PASS');
  await browser.close();
})();
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/poof/04-stun.cjs
```

Expected: FAIL — `stunned figures must not advance ANY clock`.

- [ ] **Step 3: Freeze `dt` inside the draw loop**

In `tick()`, immediately before the `entries.forEach(function (e) {` that starts the draw loop (line 1786), capture the frame delta under a different name:

```js
      var dtFrame = dt;   // the per-entry `dt` below is shadowed so the stun can zero it
```

Then as the first lines inside that callback, after `var spec = e.spec, ctx = e.ctx, w = e.w, h = e.h;` and the `e.gone` guard:

```js
        // Stunned: zero this figure's dt. Shadowing the outer `dt` freezes the gait clock AND
        // every scene machine at once (they all advance off dt: e.dfT, e.cwT, e.ktT, e.qsT),
        // which extending the e.lt gate would not do.
        var dt = (POOF.phase === 'stunned') ? 0 : dtFrame;
```

**Note for the implementer:** `var dt` here deliberately shadows the outer `dt` for the whole callback — that is the mechanism, not an accident. Every existing `dt` reference inside the callback picks up the local automatically. Do not rename the existing references.

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/poof/04-stun.cjs
```

Expected: `04-stun: PASS`

- [ ] **Step 5: Check nothing else regressed**

```bash
cd /c/ev-landing/ev-landing-main && for t in tests/quotes/*.cjs tests/layout/*.cjs; do NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node $t 2>&1 | tail -1; done
```

Expected: every line `PASS`.

- [ ] **Step 6: Commit**

```bash
git add ev-figures.js tests/poof/04-stun.cjs
git commit -m "feat(poof): stun freezes gait clocks and scene machines together"
```

---

### Task 5: The flee

**Files:**
- Modify: `ev-figures.js` (POOF section + draw loop dispatch)
- Test: `tests/poof/05-flee.cjs`

**Interfaces:**
- Consumes: `POOF` (Task 2); `fitW`/`fitLeft`/`sizeCanvas` (`ev-figures.js:361`–`386`); `drawFig` (line 481); `A.scurry`.
- Produces:
  - `fleePose(t, seed)` — scurry legs plus arms overhead, flailing erratically.
  - `poofArmFlee(e)` — widens `e`'s canvas to the viewport and seeds `e.fl`, `e.flT`, `e.flX`, `e.flDir`, `e.flFloor`, `e.flLedgeL`, `e.flLedgeR`, `e.flSeed`. Removes the canvas outright if it is currently culled.
  - `drawFlee(e, ctx, w, h, tt, col, dt)` — draws one fleeing figure and advances `e.fl`. Sub-phases in this task: `'run'` then removal. Task 6 adds `'drop'`/`'heap'`/`'getup'`/`'limp'`.
  - `POOF.phase` reaches `'cleared'` once every participant is gone.

- [ ] **Step 1: Write the failing test**

Create `tests/poof/05-flee.cjs`:

```js
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

async function run(browser, width) {
  const page = await browser.newPage({ viewport: { width: width, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  await page.waitForTimeout(1200);

  // trigger from the phase machine directly; input is covered by task 02
  await page.evaluate(function () {
    var d = window.__evFigDebug;
    var e = d.entries.filter(function (x) { return x.spec.mode !== 'why' && x.w; })[0];
    e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    d.poof.victim = e; d.poof.phase = 'holding'; d.poof.t = 2.9;
  });

  // participants should start moving toward an edge
  await page.waitForFunction(function () { return window.__evFigDebug.poof.phase === 'fleeing'; }, { timeout: 8000 });
  const moving = await page.evaluate(async function () {
    var d = window.__evFigDebug;
    function xs() {
      return d.entries.filter(function (e) { return e.spec.mode !== 'why' && !e.gone && e.flX != null; })
        .map(function (e) { return { x: e.flX, dir: e.flDir }; });
    }
    var a = xs();
    await new Promise(function (r) { setTimeout(r, 500); });
    var b = xs();
    var advanced = 0;
    for (var i = 0; i < Math.min(a.length, b.length); i++) {
      if ((b[i].x - a[i].x) * b[i].dir > 4) advanced++;
    }
    return { n: a.length, advanced: advanced };
  });
  assert.ok(moving.n > 0, width + 'px: nobody entered the flee');
  assert.ok(moving.advanced > 0, width + 'px: fleeing figures must move toward their edge');

  // no horizontal page scroll while the widened canvases are live
  const overflow = await page.evaluate(function () {
    return { scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth };
  });
  assert.ok(overflow.scrollW <= overflow.clientW,
    width + 'px: the widened flee canvases caused horizontal scroll (' +
    overflow.scrollW + ' > ' + overflow.clientW + ')');

  // everyone leaves; only the why figures remain
  await page.waitForFunction(function () {
    return window.__evFigDebug.poof.phase === 'cleared';
  }, { timeout: 20000 });

  const end = await page.evaluate(function () {
    var d = window.__evFigDebug;
    var left = d.entries.filter(function (e) { return !e.gone && e.c.parentNode; });
    return {
      remainingModes: left.map(function (e) { return e.spec.mode; }).sort(),
      whyStillThere: d.entries.filter(function (e) { return e.spec.mode === 'why' && e.c.parentNode; }).length
    };
  });
  assert.deepStrictEqual([...new Set(end.remainingModes)], ['why'],
    width + 'px: only the why figures may remain, found ' + end.remainingModes.join(','));
  assert.strictEqual(end.whyStillThere, 3, width + 'px: all three why illustrations must stay');

  await page.close();
}

(async function () {
  const browser = await chromium.launch();
  await run(browser, 1280);
  await run(browser, 360);   // narrow: also guards the overflow regression
  console.log('05-flee: PASS');
  await browser.close();
})();
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/poof/05-flee.cjs
```

Expected: FAIL — `nobody entered the flee`.

- [ ] **Step 3: Add the flee pose and arming to the POOF section**

Insert before `function poofTick`:

```js
    var FLEE_SPEED = 190, FLEE_DROP = 50;

    // Arms straight overhead, flailing. Legs come from scurry so the run reads as a proper
    // panicked sprint. Remember 0deg is straight DOWN in this rig and 90 is horizontal, so
    // overhead is ~±170. Two non-harmonic frequencies plus a per-figure seed keep the group
    // from flailing in unison.
    function fleePose(t, seed) {
      var p = A.scurry.frame(t);
      var f1 = Math.sin(t * 11 + seed), f2 = Math.sin(t * 7.3 + seed * 2.1);
      p.armRU = 168 + f1 * 16; p.armRF = 150 + f2 * 30;
      p.armLU = -168 + f2 * 16; p.armLF = -150 + f1 * 30;
      p.headTilt = 8 + f2 * 7;
      p.hunch = -6 + f1 * 3;
      return p;
    }

    // Widen this figure's canvas to the viewport so he can actually reach a screen edge — on
    // his own ~190px canvas he would vanish at an invisible box edge mid-screen. Transparent
    // and pointer-events:none, so the extra area costs nothing and captures nothing. Width
    // goes through fitW/fitLeft or a widened canvas reintroduces the phone h-scroll bug.
    function poofArmFlee(e) {
      var cr = e.c.getBoundingClientRect();
      // already scrolled out of sight: the draw loop culls it, so it would never tick and the
      // page would never finish clearing. Nobody is watching — just take it away.
      if (cr.bottom < -40 || cr.top > window.innerHeight + 40) {
        e.gone = true;
        if (e.c.parentNode) e.c.parentNode.removeChild(e.c);
        return;
      }
      var sx = window.scrollX || window.pageXOffset || 0;
      var sy = window.scrollY || window.pageYOffset || 0;
      var floorDoc = cr.bottom + sy - 6;                 // keep his feet where they were
      var ar = e.el.getBoundingClientRect();             // his perch
      var figScreenX = cr.left + e.w / 2;

      var newW = fitW(document.documentElement.clientWidth);
      var newH = e.h + FLEE_DROP + 40;                   // room to fall below the ledge
      sizeCanvas(e, newW, newH);
      var newLeft = fitLeft(sx, e.w, sx);
      e.c.style.left = newLeft + 'px';
      e.c.style.top = (floorDoc - (newH - 6)) + 'px';   // floor line stays exactly where it was

      e.fl = 'run'; e.flT = 0;
      e.flX = figScreenX - newLeft + sx;                 // canvas-local x
      e.flDir = (figScreenX < document.documentElement.clientWidth / 2) ? -1 : 1;
      e.flFloor = newH - 6;                              // canvas-local floor line
      e.flLedgeL = ar.left + sx - newLeft;               // perch ends, canvas-local
      e.flLedgeR = ar.right + sx - newLeft;
      e.flSeed = (e.ci % 7) + 1;
      e.flYOff = 0;
    }

    // Draw one fleeing figure. `run` is all this task needs; task 6 adds the pratfall.
    function drawFlee(e, ctx, w, h, tt, col, dt) {
      e.flT += dt;
      if (e.fl === 'run') {
        e.flX += FLEE_SPEED * e.flDir * dt;
        if (e.flDir > 0 ? (e.flX > e.flLedgeR) : (e.flX < e.flLedgeL)) {
          // ran out of ledge — task 6 turns this into a drop
        }
      }
      R.drawShadow(ctx, e.flX, e.flFloor + e.flYOff, 15, 'rgba(127,127,127,0.18)');
      drawFig(ctx, e.flX, e.flFloor + e.flYOff, S, e.flDir < 0, fleePose(e.flT, e.flSeed), { color: col });
      // gone once he is clear of the canvas, which spans the viewport. 60px comfortably
      // exceeds the widest figure (~36px at S=0.32) so nobody is culled mid-stride.
      if (e.flX < -60 || e.flX > w + 60) {
        e.gone = true;
        if (e.c.parentNode) e.c.parentNode.removeChild(e.c);
      }
    }
```

- [ ] **Step 4: Arm the flee and detect the cleared state in `poofTick`**

Replace the `stunned` branch and add a `fleeing` branch:

```js
      } else if (POOF.phase === 'stunned') {
        if (POOF.t >= POOF_STUN) {
          POOF.phase = 'fleeing'; POOF.t = 0;
          entries.forEach(function (e) {
            if (e.gone || e.spec.mode === 'why') return;
            poofArmFlee(e);
          });
        }
      } else if (POOF.phase === 'fleeing') {
        var left = 0;
        entries.forEach(function (e) {
          if (e.spec.mode === 'why') return;
          if (!e.gone) left++;
        });
        if (!left) { POOF.phase = 'cleared'; POOF.t = 0; }
      }
```

- [ ] **Step 5: Dispatch to `drawFlee` from the draw loop**

In the draw loop, immediately after the `var dt = (POOF.phase === 'stunned') ? 0 : dtFrame;` line from Task 4, add:

```js
        if (e.fl && spec.mode !== 'why') {
          ctx.clearRect(0, 0, w, h);
          drawFlee(e, ctx, w, h, e.lt + e.phase, figColor(spec.tone != null ? spec.tone : e.ci), dt);
          return;
        }
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/poof/05-flee.cjs
```

Expected: `05-flee: PASS`

- [ ] **Step 7: Commit**

```bash
git add ev-figures.js tests/poof/05-flee.cjs
git commit -m "feat(poof): the exodus — widened canvases, flailing run off-screen"
```

---

### Task 6: The pratfall — drop, heap, getup, limp

**Files:**
- Modify: `ev-figures.js` (`drawFlee`)
- Test: `tests/poof/06-pratfall.cjs`

**Interfaces:**
- Consumes: `drawFlee`, `e.fl*` (Task 5); `cwHeap(t)` (line 719); `A.fall`, `A.standstill`; `lerpPose` (line 280); `smooth01` (line 278).
- Produces: `e.fl` also takes `'drop'`, `'heap'`, `'getup'`, `'limp'`. No new exports.

Whether a figure drops is pure geometry and needs no extra test: if his perch reaches past the viewport edge in his flee direction, `e.flX` never crosses `flLedgeR`/`flLedgeL` and he simply runs off. A figure on a narrow card crosses it and falls.

- [ ] **Step 1: Write the failing test**

Create `tests/poof/06-pratfall.cjs`:

```js
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
  await page.waitForTimeout(1200);

  // record every flee sub-phase each figure passes through
  await page.evaluate(function () {
    var d = window.__evFigDebug;
    d.__seen = {};
    d.__watch = setInterval(function () {
      d.entries.forEach(function (e, i) {
        if (!e.fl) return;
        d.__seen[i] = d.__seen[i] || [];
        var s = d.__seen[i];
        if (s[s.length - 1] !== e.fl) s.push(e.fl);
      });
    }, 40);
    var e0 = d.entries.filter(function (x) { return x.spec.mode !== 'why' && x.w; })[0];
    e0.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    d.poof.victim = e0; d.poof.phase = 'holding'; d.poof.t = 2.9;
  });

  await page.waitForFunction(function () {
    return window.__evFigDebug.poof.phase === 'cleared';
  }, { timeout: 30000 });

  const seen = await page.evaluate(function () {
    clearInterval(window.__evFigDebug.__watch);
    return Object.keys(window.__evFigDebug.__seen)
      .map(function (k) { return window.__evFigDebug.__seen[k]; });
  });

  assert.ok(seen.length > 0, 'no flee sequences recorded');

  // at least one figure should have run out of ledge and done the whole pratfall
  const full = seen.filter(function (s) {
    return s.indexOf('drop') >= 0 && s.indexOf('heap') >= 0 &&
           s.indexOf('getup') >= 0 && s.indexOf('limp') >= 0;
  });
  assert.ok(full.length > 0,
    'expected at least one drop>heap>getup>limp, saw: ' + JSON.stringify(seen));

  // and the order must be right wherever it happened
  full.forEach(function (s) {
    const idx = ['drop', 'heap', 'getup', 'limp'].map(function (k) { return s.indexOf(k); });
    for (let i = 1; i < idx.length; i++) {
      assert.ok(idx[i] > idx[i - 1], 'pratfall out of order: ' + s.join('>'));
    }
    assert.strictEqual(s[0], 'run', 'a pratfall must start from the run: ' + s.join('>'));
  });

  // every recorded sequence must be one of the two legal shapes
  seen.forEach(function (s) {
    const uniq = s.join('>');
    const legal = /^run$/.test(uniq) || /^run>drop>heap>getup>limp$/.test(uniq);
    assert.ok(legal, 'unexpected flee sequence: ' + uniq);
  });

  console.log('06-pratfall: PASS (' + full.length + ' of ' + seen.length + ' took the fall)');
  await browser.close();
})();
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/poof/06-pratfall.cjs
```

Expected: FAIL — `expected at least one drop>heap>getup>limp`.

- [ ] **Step 3: Replace `drawFlee` with the full sub-machine**

```js
    // HEAP_YOFF exists because drawFig's `rot` pivots about the figure's FEET, so tipping him
    // ~83deg would swing him around that point rather than lay him down. The cartwheel gag
    // solves the same problem with its `lieY`; this is the equivalent nudge.
    var HEAP_HOLD = 1.0, DROP_SECS = 0.45, GETUP_SECS = 0.9, HEAP_YOFF = 14;

    // He limps off favouring his right leg — same trick as the beam ball-gag's foot-drop: a
    // stiff knee, a shortened step and a weight-bearing hitch on the injured plant.
    function limpPose(t, seed) {
      var p = A.scurry.frame(t * 0.55);
      var plant = Math.max(0, Math.sin(t * 3.4));
      p.legRF += 40;                       // knee barely bends
      p.legRU -= 12;                       // shorter step
      p.bob += plant * 9;
      p.lean += plant * 5;
      p.headTilt = -8 + plant * 6;
      p.armRU = 40 + Math.sin(t * 2 + seed) * 8;   // arms are down now: the panic became pain
      p.armRF = 96;
      p.armLU = -26; p.armLF = -18;
      return p;
    }

    function drawFlee(e, ctx, w, h, tt, col, dt) {
      e.flT += dt;
      var pose, rot = 0, yOff = e.flYOff || 0;

      if (e.fl === 'run') {
        e.flX += FLEE_SPEED * e.flDir * dt;
        pose = fleePose(e.flT, e.flSeed);
        // ran off the end of his perch? then there is nothing under him
        if (e.flDir > 0 ? (e.flX > e.flLedgeR) : (e.flX < e.flLedgeL)) {
          e.fl = 'drop'; e.flT = 0;
        }
      } else if (e.fl === 'drop') {
        var k = Math.min(1, e.flT / DROP_SECS);
        e.flX += FLEE_SPEED * 0.55 * e.flDir * dt;      // carries forward as he falls
        yOff = FLEE_DROP * k * k;                        // accelerating
        pose = A.fall.frame(e.flT * 1.6);
        rot = e.flDir * 0.5 * k;
        if (k >= 1) { e.fl = 'heap'; e.flT = 0; yOff = FLEE_DROP; }
      } else if (e.fl === 'heap') {
        yOff = FLEE_DROP + HEAP_YOFF;                    // lie ON the ground, not pivoted above it
        pose = cwHeap(e.flT);
        rot = e.flDir * 1.45 + Math.sin(e.flT * 6) * 0.1;   // lying over, twitching
        if (e.flT >= HEAP_HOLD) { e.fl = 'getup'; e.flT = 0; }
      } else if (e.fl === 'getup') {
        var g = smooth01(Math.min(1, e.flT / GETUP_SECS));
        yOff = FLEE_DROP + HEAP_YOFF * (1 - g);          // eases back onto his feet as he rises
        pose = lerpPose(cwHeap(0), A.standstill.frame(0), g);
        rot = (e.flDir * 1.45) * (1 - g);                // rotates upright, slowly
        if (e.flT >= GETUP_SECS) { e.fl = 'limp'; e.flT = 0; }
      } else {                                            // 'limp'
        yOff = FLEE_DROP;
        e.flX += FLEE_SPEED * 0.45 * e.flDir * dt;        // about half speed now
        pose = limpPose(e.flT, e.flSeed);
      }

      e.flYOff = yOff;
      var groundY = e.flFloor + yOff;
      R.drawShadow(ctx, e.flX, groundY, 15, 'rgba(127,127,127,0.18)');
      drawFig(ctx, e.flX, groundY, S, e.flDir < 0, pose, { color: col, rot: rot });

      if (e.flX < -60 || e.flX > w + 60) {
        e.gone = true;
        if (e.c.parentNode) e.c.parentNode.removeChild(e.c);
      }
    }
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/poof/06-pratfall.cjs
```

Expected: `06-pratfall: PASS (n of m took the fall)`

- [ ] **Step 5: Run every suite**

```bash
cd /c/ev-landing/ev-landing-main && for t in tests/poof/*.cjs tests/quotes/*.cjs tests/layout/*.cjs; do NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node $t 2>&1 | tail -1 || echo "FAILED: $t"; done
```

Expected: every line `PASS`, no `FAILED`.

- [ ] **Step 6: Watch it once, at both themes**

Create `tests/poof/shots.cjs`:

```js
const { chromium } = require('playwright');

(async function () {
  const browser = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.route('**/*', function (r) {
      return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
    });
    await page.addInitScript(function (t) { localStorage.setItem('ev:color-scheme', t); }, theme);
    await page.goto('file:///C:/ev-landing/ev-landing-main/index.html#figdebug');
    await page.waitForFunction(function () { return !!window.__evFigDebug; });
    await page.waitForTimeout(1200);
    await page.evaluate(function () {
      var d = window.__evFigDebug;
      var e = d.entries.filter(function (x) { return x.spec.mode !== 'why' && x.w; })[0];
      e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
      d.poof.victim = e; d.poof.phase = 'holding'; d.poof.t = 2.2;
    });
    for (const [ms, label] of [[500, 'smoke'], [900, 'burst'], [1600, 'stunned'], [2400, 'fleeing'], [4200, 'pratfall']]) {
      await page.waitForTimeout(ms === 500 ? 500 : 700);
      await page.screenshot({ path: 'screenshots/poof-' + theme + '-' + label + '.png' });
      console.log('wrote screenshots/poof-' + theme + '-' + label + '.png');
    }
    await page.close();
  }
  await browser.close();
})();
```

Run it and look at all ten frames. Check: the smoke reads as smoke against both grounds; the burst hides him rather than sitting beside him; the flailing arms are clearly overhead and not in unison; the heap looks like a crumpled figure lying down rather than a broken pose; the limp is visibly lopsided.

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/poof/shots.cjs
```

- [ ] **Step 7: Commit**

```bash
git add ev-figures.js tests/poof/06-pratfall.cjs tests/poof/shots.cjs screenshots/poof-*.png
git commit -m "feat(poof): pratfall — drop off a short perch, heap, slow getup, limp off"
```

---

### Task 7: The dog runs too

**Files:**
- Modify: `ev-figures.js` (`poofArmFlee`, `drawFlee`)
- Test: `tests/poof/07-dog.cjs`

**Interfaces:**
- Consumes: `drawDog(ctx, x, groundY, face, color, st, tt, opts)` (`ev-figures.js:822`) — `st` `'run'` is the
  running pose, already used by the fetch machine at line 1093; `e.dogX` / `e.dogFace` hold the dog's
  canvas-local x and facing. `poofArmFlee`/`drawFlee` from Tasks 5–6.
- Produces: `e.flDog = { x, dir }` on a `dogfetch` entry, drawn alongside the fleeing owner.

The dog leaves as himself rather than as a stick figure, and he is faster than his owner — which is both
true to a dog and funnier.

- [ ] **Step 1: Write the failing test**

Create `tests/poof/07-dog.cjs`:

```js
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

(async function () {
  const browser = await chromium.launch();
  let found = false;

  // dogfetch is one of three footer options, so reload until it is cast
  for (let attempt = 0; attempt < 14 && !found; attempt++) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.route('**/*', function (r) {
      return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
    });
    await page.goto(URL);
    await page.waitForFunction(function () { return !!window.__evFigDebug; });

    const has = await page.evaluate(function () {
      var e = window.__evFigDebug.entries.filter(function (x) { return x.spec.mode === 'dogfetch'; })[0];
      if (!e) return false;
      e.c.scrollIntoView({ block: 'center', behavior: 'instant' });   // scene only ticks when visible
      return true;
    });
    if (!has) { await page.close(); continue; }
    found = true;

    await page.waitForFunction(function () {
      var e = window.__evFigDebug.entries.filter(function (x) { return x.spec.mode === 'dogfetch'; })[0];
      return e && e.df != null;                                       // fetch machine has initialised
    }, { timeout: 8000 });

    await page.evaluate(function () {
      var d = window.__evFigDebug;
      var e = d.entries.filter(function (x) { return x.spec.mode !== 'why' && x.w; })[0];
      d.poof.victim = e; d.poof.phase = 'holding'; d.poof.t = 2.9;
    });
    await page.waitForFunction(function () { return window.__evFigDebug.poof.phase === 'fleeing'; }, { timeout: 9000 });

    const dog = await page.evaluate(async function () {
      var e = window.__evFigDebug.entries.filter(function (x) { return x.spec.mode === 'dogfetch'; })[0];
      if (!e || e.gone) return { skipped: true };
      var a = e.flDog ? e.flDog.x : null;
      await new Promise(function (r) { setTimeout(r, 500); });
      var b = e.flDog ? e.flDog.x : null;
      return { seeded: a !== null, moved: a !== null && b !== null && Math.abs(b - a) > 10,
               dir: e.flDog && e.flDog.dir, ownerX: e.flX };
    });

    if (dog.skipped) { await page.close(); found = false; continue; }
    assert.ok(dog.seeded, 'the dog must be seeded a flee of his own (e.flDog)');
    assert.ok(dog.moved, 'the dog must run');

    await page.waitForFunction(function () {
      return window.__evFigDebug.poof.phase === 'cleared';
    }, { timeout: 25000 });
    console.log('07-dog: PASS');
    await page.close();
  }

  assert.ok(found, 'dogfetch never appeared in 14 casts — rerun; it is one of three footer options');
  await browser.close();
})();
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/poof/07-dog.cjs
```

Expected: FAIL — `the dog must be seeded a flee of his own (e.flDog)`.

- [ ] **Step 3: Seed the dog in `poofArmFlee`**

Add just before the closing brace of `poofArmFlee`, after `e.flYOff = 0;`:

```js
      // The dog bolts too, as himself rather than as a stick figure — he already has a run
      // pose. Same direction as his owner, a shade faster, which is both true to a dog and
      // funnier. dogX is canvas-local and survives the resize since the left edge moved to sx.
      if (e.spec.mode === 'dogfetch' && e.dogX != null) {
        e.flDog = { x: e.dogX + (cr.left + sx - newLeft), dir: e.flDir };
      }
```

- [ ] **Step 4: Draw and advance him in `drawFlee`**

Add immediately before the `if (e.flX < -60 || e.flX > w + 60)` removal check:

```js
      if (e.flDog) {
        e.flDog.x += FLEE_SPEED * 1.25 * e.flDog.dir * dt;
        var dogCol = figColor(e.spec.tone2 != null ? e.spec.tone2 : 5);
        drawDog(ctx, e.flDog.x, e.flFloor, e.flDog.dir, dogCol, 'run', e.flT * 1.4, {});
        if (e.flDog.x < -80 || e.flDog.x > w + 80) e.flDog = null;
      }
```

- [ ] **Step 5: Hold the canvas until the dog is clear too**

Change the removal check so an entry is not removed while its dog is still on screen:

```js
      if ((e.flX < -60 || e.flX > w + 60) && !e.flDog) {
        e.gone = true;
        if (e.c.parentNode) e.c.parentNode.removeChild(e.c);
      }
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/poof/07-dog.cjs
```

Expected: `07-dog: PASS`

- [ ] **Step 7: Run every suite**

```bash
cd /c/ev-landing/ev-landing-main && for t in tests/poof/*.cjs tests/quotes/*.cjs tests/layout/*.cjs; do NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node $t 2>&1 | tail -1 || echo "FAILED: $t"; done
```

Expected: every line `PASS`, no `FAILED`.

- [ ] **Step 8: Commit**

```bash
git add ev-figures.js tests/poof/07-dog.cjs
git commit -m "feat(poof): the dog bolts too, as a dog"
```

---

## Before this ships

- [ ] Watch the whole thing once in a real browser at desktop **and** phone width, including a
      genuine 3-second right-press rather than a scripted phase jump. The tests prove the state
      machine; only your eyes prove it is funny.
- [ ] Confirm right-click still opens the normal browser menu everywhere that is not a Bobit —
      especially over links and images, which is where suppressing it would be most annoying.
- [ ] Confirm on a real phone that a scroll starting on a Bobit still scrolls and does not fire
      the gag.
