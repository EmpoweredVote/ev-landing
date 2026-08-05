# Fallacy Finders Tease Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Fallacy Finders showcase button, carried upside down at full size, as a third load in the hero beam crew's rotation — teasing an unfinished feature without giving it a button in the tool list.

**Architecture:** One new load key (`button`) in the existing `beam` mode of `ev-figures.js`. Its dimensions are measured off the live `.showcase-logos .logo-trigger` at layout time, the artwork is drawn as `Path2D` data generated from two new SVG lockups (an `<img>` would taint the canvas — see Task 1), and the carriers' gap, walk speed and pose all switch on `e.load === 'button'`. No `index.html` change.

**Tech Stack:** Vanilla ES5-style JS on `<canvas>` (no build step), the `leremy-rig.js` pose library, Playwright `.cjs` test scripts run directly with `node`.

## Global Constraints

- **`index.html` must not change.** No sixth `.logo-trigger`, no commented-out markup, no `--crew-clear` change, no CSS. Verified by `git diff --stat` in the final task.
- **The card is never scaled to fit the hero content.** Full measured size only. The single permitted scale is the viewport-width guard (`canvasW - 20`).
- **Measured facts, from `tests/layout` instrumentation at 320/360/480/768/1024/1280/1600px:** crew headroom from feet to `.hero .meta-row` last-line bottom is **93px at every width**; crew ink is **81px** tall; the real button is **340×102** at ≥1025px and **390×90** at 1024px.
- **The card overlaps the meta-row by ~19–40px and that is intended.** The `pointer-events: none` canvases keep the "see our books" link clickable throughout.
- Match surrounding code style: `var`, function declarations, explanatory comments that say *why*. No new dependencies.
- The two SVG lockups are the single source of artwork for both the carried card and the eventual real button.

---

### Task 1: The lockup SVGs  ✅ DONE (commit 60aeeaa)

**Files:**
- Create: `icons/fallacy-finders-logo-lg-light.svg`
- Create: `icons/fallacy-finders-logo-lg-dark.svg`

**Interfaces:**
- Produces: `icons/fallacy-finders-logo-lg-{light,dark}.svg` (the eventual real button's artwork) and
  `tools/gen-fallacy-card-art.mjs`, whose stdout is the `FF_ART` block Task 4 pastes into `ev-figures.js`.
  `FF_ART` is `{x0, y0, w, h, light, dark, evenodd, roles, d}` — one shared geometry, colours as roles.

**What actually happened**, since it changed Task 4: the seam check found the raw brand art out of family
(symbol right edge at x=330 vs the others' average 303; ink filling all 64px where the others sit at
55–63), fixed with a `viewBox="0 -7 530 183"` pad that moves no path. And an `<img>` of the SVG turned out
to **taint** the canvas under `file://`, which would break `beam-clears-metarow.cjs` permanently — so the
card draws `Path2D` data instead. Verified against the browser's own SVG rendering: 0% colour mismatch.

- [x] **Step 1: Copy the brand artwork into `icons/`** — done
- [x] **Step 2: Confirm both carry an intrinsic size** — done (`width="530" height="183"` after Step 3)
- [x] **Step 3: Normalise into the family** — done

Measured all five lockups at `height:64px` in a 340px column. The raw brand art was out of family:

| lockup | rendered W | ink H | ink right edge x |
|---|---|---|---|
| essentials | 262 | 56 | 302 |
| readrank | 189 | 62 | 306 |
| treasury-tracker | 214 | 55 | 313 |
| ctc | 287 | 63 | 292 |
| **fallacy-finders (raw)** | 172 | **64** | **330** |
| **fallacy-finders (padded)** | 186 | **60** | **304** |

Fixed with `viewBox="0 -7 530 183"` (was `"0 0 453 169"`) — a pure box change; the `d` attributes are
byte-identical to `brand/fallacy-finders/`. Family averages are ink H 59 and right edge 303.

- [x] **Step 4: Build the canvas artwork generator** — done, `tools/gen-fallacy-card-art.mjs`

Added because the card cannot use an `<img>`. Emits an ~11KB `FF_ART` block: one shared geometry (the two
variants agree exactly at 1dp and differ only in the wordmark teal), colours as roles, `evenodd` indices,
and the `x0/y0` viewBox origin. `--check` re-verifies the variants still agree and throws if a future
brand update reshapes one of them.

- [x] **Step 5: Commit** — done, `60aeeaa`

---

### Task 2: The heavy-hold gait

**Files:**
- Modify: `leremy-rig.js` — add to `ANIMATIONS` near `carry` (line 622) and to `ORDER` (line 1057)

**Interfaces:**
- Consumes: `makeGait({label, mood, speed, stride, hunch, knee, arm, bob, head})` at `leremy-rig.js:1035`; `clone(REST)`; `wave(t, hz)`.
- Produces: `ANIMATIONS.hefty.frame(t)` returning a pose object. Consumed by Task 6 as `A.hefty`.

Sign conventions in this rig, worth stating because two of them are counter-intuitive: **positive `bob` is downward** (the ball gag uses `bob += 12` for "a big downward lurch"), **negative `hunch` folds forward** (`heave` uses `-42` for a deep fold), and **positive `headTilt` looks up** (`painhop` runs `-22` at the foot to `+18` after the ball).

- [ ] **Step 1: Write the failing test**

Create `tests/layout/hefty-pose.cjs`. This runs in a browser, not bare Node: `leremy-rig.js` is an IIFE that reads `window.LeremyRig` on its very first line and exposes the pose table only via that global, so there is no way to `require` it.

```js
// The heavy-hold gait exists and actually reads as strained: folded further forward than the
// normal carry, head tipped back, arms hanging straighter, and a downward lurch on the
// planted foot rather than the slight rise a normal walk has.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html';

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  await page.waitForFunction(() => !!(window.LeremyRig && window.LeremyRig.ANIMATIONS));

  const r = await page.evaluate(() => {
    const A = window.LeremyRig.ANIMATIONS;
    if (!A.hefty) return { missing: true };
    let maxBob = -Infinity;
    for (let t = 0; t < 4; t += 0.02) maxBob = Math.max(maxBob, A.hefty.frame(t).bob);
    return {
      carry: A.carry.frame(0.5), hefty: A.hefty.frame(0.5), maxBob,
      inOrder: window.LeremyRig.ORDER.indexOf('hefty') >= 0
    };
  });

  assert.ok(!r.missing, 'ANIMATIONS.hefty is missing');
  assert.ok(r.hefty.hunch < r.carry.hunch,
    'hefty should fold further forward than carry (hunch ' + r.hefty.hunch + ' vs ' + r.carry.hunch + ')');
  assert.ok(r.hefty.headTilt > r.carry.headTilt,
    'hefty should tip the head back (headTilt ' + r.hefty.headTilt + ' vs ' + r.carry.headTilt + ')');
  assert.ok(Math.abs(r.hefty.armRU) < Math.abs(r.carry.armRU),
    'hefty arms should hang straighter (armRU ' + r.hefty.armRU + ' vs ' + r.carry.armRU + ')');
  assert.ok(r.maxBob > 8,
    'hefty should lurch downward on the planted foot (max bob ' + r.maxBob + ')');
  assert.ok(r.inOrder, 'hefty is missing from ORDER, so the pose browser will not list it');

  console.log('hefty-pose: PASS');
  await browser.close();
})();
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node tests/layout/hefty-pose.cjs`
Expected: FAIL — `ANIMATIONS.hefty is missing`

- [ ] **Step 3: Add the gait**

In `leremy-rig.js`, immediately after the `carry:` entry (ends line 627):

```js
  // Hauling something far too big and heavy for one figure to manage: the beam crew's Fallacy
  // Finders button is a ~340x102 slab, taller than they are. Shorter steps than `carry`, folded
  // deeper, head tipped BACK to see past the load, arms hanging nearly straight so the hands sit
  // as low as the rig allows, and a real downward lurch each time the planted foot takes it.
  hefty: (() => {
    const g = makeGait({ label: "Heavy haul", mood: "…who ordered the big one?", speed: 1.5, stride: 12, hunch: -26, knee: 16, arm: 0, bob: 2, head: 8 });
    const base = g.frame;
    g.frame = (t) => {
      const p = base(t);
      p.armRU = 2; p.armRF = 1; p.armLU = -2; p.armLF = -1;   // straight down: lowest hands the rig gives
      const plant = Math.max(0, -Math.sin(t * 1.5 * Math.PI));
      p.bob += plant * 11;                                     // sags onto the weight-bearing leg
      p.lean = -4;
      return p;
    };
    return g;
  })(),
```

Then add `"hefty"` to `ORDER` (line 1057) directly after `"carry"`, so it shows up in the pose browser.

- [ ] **Step 4: Run the test to confirm it passes**

Run: `node tests/layout/hefty-pose.cjs`
Expected: `hefty-pose: PASS`

- [ ] **Step 5: Commit**

```bash
git add leremy-rig.js tests/layout/hefty-pose.cjs
git commit -m "feat(rig): a hefty gait for hauling something oversized"
```

---

### Task 3: Measure the button, expose it for testing

**Files:**
- Modify: `ev-figures.js` — new helper near `BEAM_LOADS` (line 1564); debug hook (line 3549)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `buttonCardSize(e, w)` returning `{w: number, h: number}` — the carried card's pixel size. `w` is the beam canvas width. Consumed by Tasks 4, 6, 7. Also `window.__evFigDebug.buttonCardSize`.

- [ ] **Step 1: Write the failing test**

Create `tests/layout/button-card-size.cjs`:

```js
// The carried card is the REAL button, measured live — but only where that measurement means
// something. At <=900px the button is 178-250px tall because it holds a paragraph of .m-desc
// body text the carried prop does not have; copying that height would give the crew a near-square
// empty slab taller than the whole 240px canvas. Below 901px we use the desktop 340:102 shape.
//
// Measured button boxes: 340x102 at >=1025px, 390x90 at 1024px, 560x178 at 768px, 280x250 at 320px.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const DESKTOP_RATIO = 340 / 102;

(async function () {
  const browser = await chromium.launch();
  const failures = [];

  for (const width of [320, 360, 480, 768, 1024, 1280, 1600]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
    await page.goto(URL);
    await page.waitForFunction(() => !!window.__evFigDebug);
    await page.waitForTimeout(400);

    const r = await page.evaluate(() => {
      const d = window.__evFigDebug;
      const beam = d.entries.filter(e => e.spec.mode === 'beam')[0];
      const btn = document.querySelector('.showcase-logos .logo-trigger').getBoundingClientRect();
      return {
        card: d.buttonCardSize(beam, beam.w),
        button: { w: Math.round(btn.width), h: Math.round(btn.height) },
        canvasW: beam.w
      };
    });

    const c = r.card, wide = width >= 901;
    if (c.w > r.canvasW - 20) {
      failures.push(width + 'px: card ' + c.w + 'px is wider than the viewport guard (' + (r.canvasW - 20) + ')');
    }
    if (wide) {
      // matches the real button exactly
      if (Math.abs(c.w - r.button.w) > 1 || Math.abs(c.h - r.button.h) > 1) {
        failures.push(width + 'px: card ' + c.w + 'x' + c.h + ' should equal the button ' +
          r.button.w + 'x' + r.button.h);
      }
    } else {
      // desktop shape, NOT the tall mobile button
      const ratio = c.w / c.h;
      if (Math.abs(ratio - DESKTOP_RATIO) > 0.05) {
        failures.push(width + 'px: card ratio ' + ratio.toFixed(2) + ' should be the desktop ' +
          DESKTOP_RATIO.toFixed(2) + ' (got ' + c.w + 'x' + c.h + ')');
      }
      if (c.h > 120) failures.push(width + 'px: card ' + c.h + 'px tall — copied the mobile text card');
    }
    await page.close();
  }

  assert.deepStrictEqual(failures, [], 'button card sizing:\n  ' + failures.join('\n  '));
  console.log('button-card-size: PASS');
  await browser.close();
})();
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node tests/layout/button-card-size.cjs`
Expected: FAIL — `d.buttonCardSize is not a function`

- [ ] **Step 3: Implement the measurement**

In `ev-figures.js`, replace the `BEAM_LOADS` line (1564):

```js
    var BEAM_LOADS = ['circle', 'line', 'button'];   // the ball, the yellow line, the Fallacy Finders button (no notched triangle); beamPick avoids repeats

    // The button load is the REAL showcase button, so its size is measured off the DOM rather than
    // hardcoded — the tool list is a `minmax(0, 340px)` grid track with two breakpoints, so the box
    // is 340x102 on a wide screen and 390x90 in the 1024 band.
    //
    // Below 901px the measurement is deliberately IGNORED. There the button goes full-width and
    // shows its `.m-desc` description inline, so it measures 178-250px tall; that height belongs to
    // a paragraph of body text the carried prop does not have, and copying it would hand the crew a
    // near-square empty slab taller than their whole 240px canvas. The desktop shape is used instead.
    var CARD_FALLBACK = { w: 340, h: 102 };          // also the <=900px shape, and the last resort
    function buttonCardSize(e, w) {
      if (!('_btnEl' in e)) e._btnEl = document.querySelector('.showcase-logos .logo-trigger');
      var cw = CARD_FALLBACK.w, ch = CARD_FALLBACK.h;
      if (e._btnEl && window.innerWidth >= 901) {
        var br = e._btnEl.getBoundingClientRect();
        if (br.width > 20 && br.height > 20) { cw = br.width; ch = br.height; }
      }
      // Never wider than the viewport. Uniform, so the button's proportions survive — this is the
      // ONLY scaling applied, and it only engages below ~360px.
      var cap = w - 20;
      if (cw > cap) { ch *= cap / cw; cw = cap; }
      return { w: cw, h: ch };
    }
```

Add to the debug hook (line 3549 block), after `propOf: propOf,`:

```js
      buttonCardSize: buttonCardSize,
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `node tests/layout/button-card-size.cjs`
Expected: `button-card-size: PASS`

- [ ] **Step 5: Commit**

```bash
git add ev-figures.js tests/layout/button-card-size.cjs
git commit -m "feat(figures): measure the real showcase button for the crew's new load"
```

---

### Task 4: Draw the card

**Files:**
- Modify: `ev-figures.js` — image cache near `buttonCardSize`; new `drawButtonCard()`; load branch at line 3397-3428

**Interfaces:**
- Consumes: `buttonCardSize(e, w)` (Task 3); `cssVar(name, fallback)`; `S`.
- Produces: `drawButtonCard(ctx, cx, cy, cw, ch)` — draws the card centred on `(cx, cy)`, rotated 180°. Consumed by Task 6.

- [ ] **Step 1: Add the image cache and the draw function**

In `ev-figures.js`, after `buttonCardSize`:

First paste the generated `FF_ART` block. Produce it with:

```bash
node tools/gen-fallacy-card-art.mjs
```

and paste its output directly above `buttonCardSize`. It is ~11KB and self-documenting; do not hand-edit it.

**Do not use an `<img>` of the SVG here.** Drawing an SVG loaded by `src` onto a canvas taints it, unconditionally under `file://`, and every pixel test in `tests/` runs from `file://`. A tainted beam canvas makes `tests/layout/beam-clears-metarow.cjs` throw `SecurityError` forever, because it reads pixels off that exact canvas. Measured:

| origin | `img.src` file ref | data URI |
|---|---|---|
| `file://` | draws, **taints** → `SecurityError` | draws, clean |
| `http://` | draws, clean | draws, clean |

`Path2D` carries no origin and cannot taint. Then the draw function:

```js
    // The button as the crew carries it: UPSIDE DOWN. The whole card is rotated 180 degrees, which
    // is the gag — the sign for the next feature is being carried in and nobody has established
    // which way up it goes. The logo hugs one end rather than sitting centred, faithful to the real
    // buttons, which right-align their content so the five icons line up in the column. Because of
    // the rotation that end reads opposite in world space, and it swaps as the crew reverses.
    function drawButtonCard(ctx, cx, cy, cw, ch) {
      var k = ch / 102;                   // the real button is 102px tall at >=1025px
      var pad = 24 * k;                   // its own 24px padding
      var logoH = 64 * k;                 // its own 64px logo box
      if (!FF_PATHS) FF_PATHS = FF_ART.d.map(function (d) { return new Path2D(d); });
      var pal = (document.documentElement.getAttribute('data-theme') === 'dark') ? FF_ART.dark : FF_ART.light;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI);                // <- the joke
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 16 * k);
      else ctx.rect(-cw / 2, -ch / 2, cw, ch);
      ctx.fillStyle = cssVar('--card', '#FFFFFF'); ctx.fill();
      ctx.strokeStyle = cssVar('--border', '#C9C6BE'); ctx.lineWidth = 1; ctx.stroke();
      // the lockup, hugging one end, scaled to the button's logo box
      var lw = logoH * (FF_ART.w / FF_ART.h);
      var maxW = cw - pad * 2;
      var ls = (lw > maxW) ? (maxW / lw) : 1;
      var s = (logoH * ls) / FF_ART.h;
      ctx.translate(cw / 2 - pad - lw * ls, -logoH * ls / 2);
      ctx.scale(s, s);
      ctx.translate(-FF_ART.x0, -FF_ART.y0);   // the lockups carry a normalising viewBox offset
      for (var i = 0; i < FF_PATHS.length; i++) {
        ctx.fillStyle = pal[FF_ART.roles[i]];
        ctx.fill(FF_PATHS[i], FF_ART.evenodd.indexOf(i) >= 0 ? 'evenodd' : 'nonzero');
      }
      ctx.restore();
    }
```

Note there is no longer any "not yet decoded" fallback state — path data is synchronous, so the card is never blank.

- [ ] **Step 2: Verify it renders**

Because the artwork is path data, this works from `file://` with no server.


Open `index.html#figdebug` in a browser, and in the console:

```js
var d = window.__evFigDebug, b = d.entries.filter(e => e.spec.mode === 'beam')[0];
b.scene = 'carry'; b.load = 'button';
```

Expected: the crew is carrying a large upside-down Fallacy Finders button within a few seconds.

- [ ] **Step 3: Commit**

```bash
git add ev-figures.js
git commit -m "feat(figures): draw the Fallacy Finders button, upside down"
```

---

### Task 5: Put it in the rotation

**Files:**
- Modify: `ev-figures.js:2945-2961` (`beamPick`)

**Interfaces:**
- Consumes: `BEAM_LOADS` (Task 3).
- Produces: `beamPick` cycling three loads. No new symbols.

- [ ] **Step 1: Write the failing test**

Create `tests/layout/beam-load-cycle.cjs`:

This drives the **real** `beamPick`, which means exposing it on the debug hook — extracting it from source with a regex would pass against a copy of the function rather than the one that ships.

```js
// The crew alternates carries with specials (the light gag, the letter carriers) and never repeats
// an action back to back. Adding a third load must preserve both properties AND actually reach the
// new load — a 3-cycle that silently never yields 'button' would leave the whole feature invisible
// while every other assertion stayed green.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const LOADS = ['circle', 'line', 'button'];

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  await page.waitForFunction(() => !!window.__evFigDebug);

  const seq = await page.evaluate(() => {
    const d = window.__evFigDebug;
    // a throwaway entry, so pinning it does not disturb the crew actually on the page
    const e = { dir: 1, lastLoad: 'circle', lastAction: 'circle', lastSpecial: 'light',
                carryRun: 1, scene: 'carry', load: 'circle' };
    const out = [];
    for (let i = 0; i < 300; i++) { d.beamPick(e, 1280); out.push(e.lastAction); }
    return out;
  });

  const seen = {};
  seq.forEach(a => { seen[a] = (seen[a] || 0) + 1; });
  for (const l of LOADS) assert.ok(seen[l] > 0, 'load "' + l + '" never came up in 300 passes');
  for (let i = 1; i < seq.length; i++) {
    assert.notStrictEqual(seq[i], seq[i - 1], 'action ' + seq[i] + ' repeated back to back at ' + i);
  }
  console.log('beam-load-cycle: PASS (' + Object.keys(seen).map(k => k + '=' + seen[k]).join(' ') + ')');
  await browser.close();
})();
```

This requires `beamPick: beamPick,` added to the `window.__evFigDebug` block at `ev-figures.js:3549` as part of Step 3.

- [ ] **Step 2: Run it to confirm it fails**

Run: `node tests/layout/beam-load-cycle.cjs`
Expected: FAIL — `load "button" never came up in 200 passes`

- [ ] **Step 3: Replace the two-load flip-flop**

In `beamPick` (`ev-figures.js:2952`), replace:

```js
        a = (e.lastLoad === 'circle') ? 'line' : 'circle';       // the other load (never repeats)
```

with:

```js
        // advance around BEAM_LOADS so a third load gets a turn; still never repeats the last one
        var li = BEAM_LOADS.indexOf(e.lastLoad);
        a = BEAM_LOADS[(li + 1) % BEAM_LOADS.length];
```

Update the comment block above `beamPick` (lines 2940-2944), which says "Loads (circle/line) ... each alternate too", to name the three loads and say they rotate.

Then expose it for the test, in the `window.__evFigDebug` block at line 3549:

```js
      beamPick: beamPick,
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `node tests/layout/beam-load-cycle.cjs`
Expected: `beam-load-cycle: PASS (circle=N line=N button=N)`

- [ ] **Step 5: Commit**

```bash
git add ev-figures.js tests/layout/beam-load-cycle.cjs
git commit -m "feat(figures): rotate three carry loads instead of two"
```

---

### Task 6: Carry it — gap, low hold, faster walk

**Files:**
- Modify: `ev-figures.js:3287-3448` (the `spec.mode === 'beam'` branch)

**Interfaces:**
- Consumes: `buttonCardSize` (Task 3), `drawButtonCard` (Task 4), `A.hefty` (Task 2).
- Produces: `e._cardRect = {x, y, w, h}` — the card's canvas-space box while the button load is up, `null` otherwise. Consumed by Tasks 7 and 9.

Geometry, from the measured numbers in Global Constraints: headroom feet-to-row is 93px and the hands sit ~22-31px above the floor even folded, so a 90-102px card tops out 112-133px up and **overlaps the meta-row by ~19-40px**. Carrying it as low as the rig allows recovers ~10px of that; the rest is accepted. Walking faster is the other half of the mitigation — 1.7x cuts a pass over the 627px row from ~32s to ~19s.

- [ ] **Step 1: Derive the per-load geometry**

At the top of the `beam` branch, replace line 3292:

```js
          var speedB = 30, halfGap = 24, endMargin = 110;
```

with:

```js
          var isBtn = (e.load === 'button');
          var card = isBtn ? buttonCardSize(e, w) : null;
          // The button is a ~340x102 slab, so the crew stands at its ENDS rather than shoulder to
          // shoulder, and the whole card has to clear the screen edge before they turn around —
          // otherwise the far end pops out of nothing. It is also walked FASTER, not slower: it
          // overlaps the meta-row on the way past (see docs/superpowers/specs/2026-08-05-...),
          // and pace is what keeps that brief. The strain lives in the pose, not the speed — a
          // figure hustling under something too heavy is a truer read than one crawling.
          var speedB = isBtn ? 51 : 30;
          var halfGap = isBtn ? (card.w / 2 - 8) : 24;
          var endMargin = isBtn ? (card.w / 2 + 110) : 110;
```

- [ ] **Step 2: Draw the card in the load branch**

In the load-drawing chain, before `} else if (e.load === 'triangle') {` (line 3397), insert:

```js
          } else if (isBtn) {
            // Held as low as the rig's hands reach, so it eats as little of the meta-row as possible.
            var cardCY = feetY - 20 - card.h / 2;
            e._cardRect = { x: (fx + bx2) / 2 - card.w / 2, y: cardCY - card.h / 2, w: card.w, h: card.h };
            drawButtonCard(ctx, (fx + bx2) / 2, cardCY, card.w, card.h);
```

Immediately after the whole `if (e.propGone) { ... } else if ... else { line load }` chain closes (after line 3428), add:

```js
          if (!isBtn) e._cardRect = null;
```

- [ ] **Step 3: Use the hefty gait**

In the pose selection (line 3442-3445), replace:

```js
          } else {
            poseF = A.carry.frame(tt);
            poseB = A.carry.frame(tt + 0.16);
          }
```

with:

```js
          } else if (isBtn) {
            poseF = A.hefty.frame(tt);
            poseB = A.hefty.frame(tt + 0.16);
          } else {
            poseF = A.carry.frame(tt);
            poseB = A.carry.frame(tt + 0.16);
          }
```

- [ ] **Step 4: Check it by eye**

At `index.html#figdebug`, scroll to the meta-row and wait for the button pass (or force it as in Task 4 Step 2).

Expected: two figures at the card's ends, folded and heads tipped back, walking noticeably brisker than the ball pass, card held low. The card overlaps the meta-row text as designed.

- [ ] **Step 5: Commit**

```bash
git add ev-figures.js
git commit -m "feat(figures): the crew hauls the button low and brisk"
```

---

### Task 7: The drop gag — a rigid card pivots

**Files:**
- Modify: `ev-figures.js:3390` (`dropOK`), and the card draw added in Task 6

**Interfaces:**
- Consumes: `e.dF` / `e.dB` (existing per-end drop amounts, 0..1), `drawButtonCard` (Task 4), `e._cardRect` (Task 6).
- Produces: no new symbols.

- [ ] **Step 1: Extend `dropOK`**

Replace line 3390:

```js
          var kB = Math.min(1, dt * 6), dropOK = e.load === 'line';
```

with:

```js
          // the line and the button can both be set down; a rigid triangle or a ball cannot
          var kB = Math.min(1, dt * 6), dropOK = (e.load === 'line' || isBtn);
```

- [ ] **Step 2: Make the card pivot rather than sag**

Replace the card draw from Task 6 Step 2 with a version that rotates. The line load lets its two ends drop independently because it is a rope; a rigid card cannot, so a dropped end swings the whole card about the end still held.

```js
          } else if (isBtn) {
            // Rigid, so it cannot sag like the line: dropping one end swings the WHOLE card about
            // the end still held. Both ends down => it lies flat on the floor.
            var cardCY = feetY - 20 - card.h / 2;
            var groundCY = feetY - 3 - card.h / 2;
            var dropF = e.dF, dropB = e.dB;
            if (e._pickup > 0) {                       // heaving it back up: front leads, back hitches
              var pB = 1.6 - e._pickup;
              dropF = 1 - smooth01(Math.max(0, pB - 0.6) / 1.0);
              dropB = 1 - smooth01(Math.max(0, pB - 0.8) / 1.0);
            }
            var yEndF = cardCY + (groundCY - cardCY) * dropF;
            var yEndB = cardCY + (groundCY - cardCY) * dropB;
            var tilt = Math.atan2(yEndF - yEndB, Math.abs(fx - bx2)) * (fx > bx2 ? 1 : -1);
            var cCX = (fx + bx2) / 2, cCY = (yEndF + yEndB) / 2;
            e._cardRect = { x: cCX - card.w / 2, y: cCY - card.h / 2, w: card.w, h: card.h };
            ctx.save();
            ctx.translate(cCX, cCY); ctx.rotate(tilt); ctx.translate(-cCX, -cCY);
            drawButtonCard(ctx, cCX, cCY, card.w, card.h);
            ctx.restore();
```

- [ ] **Step 3: Lengthen the pickup for the weight**

At line 3372, replace:

```js
              if (e.load === 'line' && (e.dF > 0.25 || e.dB > 0.25)) e._pickup = 1.2;   // bend down & lift, don't snap
```

with:

```js
              // bend down & lift, don't snap — the button takes longer, it is much heavier
              if (dropOK && (e.dF > 0.25 || e.dB > 0.25)) e._pickup = (e.load === 'button') ? 1.6 : 1.2;
```

- [ ] **Step 4: Check both ends by hand**

At `index.html#figdebug` during a button pass: hover the leading carrier — his end swings down, the card tilts, his partner holds it annoyed. Move away — they heave it back up without a snap. Hover both in turn — it goes flat on the floor.

- [ ] **Step 5: Commit**

```bash
git add ev-figures.js
git commit -m "feat(figures): setting the button down pivots it, it does not sag"
```

---

### Task 8: The poof drops it

**Files:**
- Modify: `ev-figures.js:885-889` (`propOf`), `:916` (`drawGroundProp`), `:1167` (`HEAVY_PROP`)
- Modify: `tests/poof/12-drop-beat.cjs:16`

**Interfaces:**
- Consumes: `e.load`.
- Produces: prop kind `'card'`.

- [ ] **Step 1: Write the failing test**

Create `tests/poof/14-card-prop.cjs`:

```js
// When the room drops what it is holding, the crew's 340px button must not become the little 7px
// circle that stands in for the ball and the line. It is also the heaviest thing anybody on the
// page is carrying, so it belongs in HEAVY_PROP and should land on a foot.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  await page.waitForFunction(() => !!window.__evFigDebug);
  await page.waitForTimeout(600);

  const r = await page.evaluate(() => {
    const d = window.__evFigDebug;
    const beam = d.entries.filter(e => e.spec.mode === 'beam')[0];
    beam.scene = 'carry';
    const out = {};
    beam.load = 'button'; out.button = d.propOf(beam).kind;
    beam.load = 'circle'; out.circle = d.propOf(beam).kind;
    beam.load = 'line';   out.line = d.propOf(beam).kind;

    // the ground form must actually paint something card-shaped, not nothing
    const c = document.createElement('canvas'); c.width = 60; c.height = 40;
    const g = c.getContext('2d');
    d.__gp(g, 'card', 30, 38, '#000', 1);
    const px = g.getImageData(0, 0, 60, 40).data;
    let minX = 99, maxX = -1, minY = 99, maxY = -1;
    for (let y = 0; y < 40; y++) for (let x = 0; x < 60; x++) {
      if (px[(y * 60 + x) * 4 + 3] > 8) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    out.inkW = maxX - minX; out.inkH = maxY - minY;
    return out;
  });

  assert.strictEqual(r.button, 'card', 'the button load should report kind "card", got ' + r.button);
  assert.strictEqual(r.circle, 'beamload', 'the ball should still be "beamload", got ' + r.circle);
  assert.strictEqual(r.line, 'beamload', 'the line should still be "beamload", got ' + r.line);
  assert.ok(r.inkW > 6, 'the dropped card painted nothing (ink width ' + r.inkW + ')');
  assert.ok(r.inkW > r.inkH, 'a dropped card should lie WIDER than tall (' + r.inkW + 'x' + r.inkH + ')');

  console.log('14-card-prop: PASS');
  await browser.close();
})();
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node tests/poof/14-card-prop.cjs`
Expected: FAIL — `the button load should report kind "card", got beamload`

- [ ] **Step 3: Implement the three changes**

`propOf` (line 888) — replace `return { kind: 'beamload', x: null, y: null };` with:

```js
        // the button is a 340px slab, not a ball — it gets its own dropped form
        if (e.load === 'button') return { kind: 'card', x: null, y: null };
        return { kind: 'beamload', x: null, y: null };
```

`drawGroundProp` (line 916) — extend the branch:

```js
      } else if (kind === 'card') {
        // the button, face down on the floor: a wide, shallow rounded slab
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x - 11, y - 6, 22, 6, 2);
        else ctx.rect(x - 11, y - 6, 22, 6);
        ctx.stroke();
      } else if (kind === 'beamload' || kind === 'light') {
```

`HEAVY_PROP` (line 1167):

```js
    var HEAVY_PROP = { ball: 1, beamload: 1, letter: 1, card: 1 };
```

Update its comment above to mention the button as the heaviest of them.

`tests/poof/12-drop-beat.cjs:16` — that test keeps its own copy of the heavy list, so:

```js
const HEAVY = ['ball', 'beamload', 'letter', 'card'];
```

- [ ] **Step 4: Run both tests**

Run: `node tests/poof/14-card-prop.cjs && node tests/poof/12-drop-beat.cjs`
Expected: both PASS

- [ ] **Step 5: Commit**

```bash
git add ev-figures.js tests/poof/14-card-prop.cjs tests/poof/12-drop-beat.cjs
git commit -m "feat(poof): a dropped button is a slab, and it is heavy"
```

---

### Task 9: Reconcile the meta-row guardrail

**Files:**
- Modify: `tests/layout/beam-clears-metarow.cjs`

**Interfaces:**
- Consumes: `e._cardRect` (Task 6), `e.load`.

`beam-clears-metarow.cjs` asserts the `carry` scene never rises into the meta-row text, having deliberately carved out `light` and `letters` as gags that reach up on purpose. The button load now overlaps by ~19-40px by design, so it fails at every width. A blanket exemption would drop the coverage the test exists for, so instead: the **figures** keep the original hard assertion, and the **card** gets its own bound.

- [ ] **Step 1: Extend the test**

In the sampling loop (line 56), replace:

```js
        if ((beam.scene || 'carry') !== 'carry') continue;   // gags are allowed to reach up
```

with:

```js
        if ((beam.scene || 'carry') !== 'carry') continue;   // gags are allowed to reach up
        // The button load is a THIRD deliberate reach-up, alongside light and letters: it is the
        // real showcase button at full size (340x102 measured), and the crew only has 93px of
        // headroom, so it covers part of this row on the way past. Intentional — see
        // docs/superpowers/specs/2026-08-05-fallacy-finders-tease-design.md. The figures still have
        // to clear the row, so this samples the pixels only when the card is NOT up, and the card
        // is bounded separately below.
        if (beam.load === 'button') { buttonSamples++; continue; }
```

Declare `var buttonSamples = 0;` beside `var worst = null, carrySamples = 0;` (line 53) and return it.

Then, after the existing `gap` check (line 97), add a card bound. The card may eat this row, but it must never climb past it into the tool list above:

```js
      if (r.cardTop !== null && r.cardTop < r.showcaseBottom) {
        failures.push(width + 'px: the carried button rises past the meta-row into the showcase ' +
          '(card top ' + r.cardTop + ' vs showcase bottom ' + r.showcaseBottom + ')');
      }
      if (r.cardTop !== null && r.cardOverlap > 48) {
        failures.push(width + 'px: the carried button eats ' + r.cardOverlap + 'px of the meta-row, ' +
          'budget is 48 (card ' + r.cardW + 'x' + r.cardH + ')');
      }
```

Capture the card's geometry inside the same loop, converting its canvas-space `y` to CSS with the same scaling `inkTopCss` uses. Declare `var cardTop = null, cardW = null, cardH = null;` beside the other accumulators, and in the `beam.load === 'button'` branch from Step 1, before the `continue`:

```js
        if (beam._cardRect) {
          var qq = c.getBoundingClientRect();
          var tCss = qq.top + beam._cardRect.y * (qq.height / c.height);
          if (cardTop === null || tCss < cardTop) cardTop = tCss;
          cardW = Math.round(beam._cardRect.w); cardH = Math.round(beam._cardRect.h);
        }
```

Then add to the `page.evaluate` return block:

```js
        buttonSamples: buttonSamples,
        cardTop: cardTop === null ? null : Math.round(cardTop),
        cardOverlap: cardTop === null ? null : Math.round(lastLineBottom - cardTop),
        cardW: cardW, cardH: cardH,
        showcaseBottom: Math.round(document.querySelector('.showcase').getBoundingClientRect().bottom)
```

- [ ] **Step 2: Force the button load so the test actually observes it**

A 60-sample loop at 100ms may never see a button pass, which would leave the new assertions untested while the suite went green. Before the loop, pin it:

```js
      beam.scene = 'carry'; beam.load = 'button'; beam.dwell = 0;
```

and sample the card for the first half of the loop, then set `beam.load = 'line'` and sample the figures for the second half. Assert both `carrySamples` and `buttonSamples` are non-zero.

- [ ] **Step 3: Run it**

Run: `node tests/layout/beam-clears-metarow.cjs`
Expected: `beam-clears-metarow: PASS (320/360/480/768/1280px)`

If the card-overlap budget fails, do not raise the 48px budget to make it green — that budget is the design claim. Re-check the hold height in Task 6 Step 2 first.

- [ ] **Step 4: Commit**

```bash
git add tests/layout/beam-clears-metarow.cjs
git commit -m "test(layout): bound the carried button's reach into the meta-row"
```

---

### Task 10: Full verification

**Files:**
- Modify: `docs/superpowers/specs/2026-08-05-fallacy-finders-tease-design.md` (status + measured numbers)

- [ ] **Step 1: Run every test**

```bash
cd C:/ev-landing/ev-landing-main
for t in tests/layout/*.cjs tests/poof/*.cjs tests/quotes/*.cjs; do
  echo "=== $t"; node "$t" || echo "FAILED: $t";
done
```

Expected: no `FAILED:` lines. `tests/poof/shots.cjs` and `tests/quotes/shots.cjs` are screenshot generators, not assertions — they only need to not throw.

- [ ] **Step 2: Confirm `index.html` is untouched**

Run: `git diff --stat main -- index.html`
Expected: empty output. If anything shows, revert it — the constraint is absolute.

- [ ] **Step 3: Look at the pixels**

Green tests do not prove a Bobit is visible. Screenshot the button pass at three widths, from `file://`:


Capture at 1280, 1024 and 375 with the button load pinned, and confirm by eye:
- the logo is legible and unmistakably upside down
- the card reads as the same object as the buttons in the tool list
- both figures are at its ends, folded, heads back
- the drop tilts the card rather than bending it
- the theme toggle swaps the card artwork

Save to `screenshots/New/fallacy-button-{1280,1024,375}.png`.

- [ ] **Step 4: Update the spec**

The spec already carries the measured geometry (93px headroom, 340×102 and 390×90 buttons, ~19–40px
overlap, the faster walk and why). So this step is only:

- set `**Status:** implemented`
- record the **actual** measured card overlap per width from Task 9's output, replacing the ~19–40px
  estimate with what the guardrail test reported
- note any place the implementation had to deviate

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-08-05-fallacy-finders-tease-design.md screenshots/New
git commit -m "docs(spec): Fallacy Finders tease shipped, with measured geometry"
```
