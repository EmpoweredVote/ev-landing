# Bobit Video Series Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pipeline that turns a written script into a finished silent MP4 animated with the Bobits, and use it to produce episode 1, Empowered Compass.

**Architecture:** A browser page loads the live `leremy-rig.js` and draws one scene at an exact time `t`. A Node script steps that page frame by frame under Playwright and pipes every frame straight into ffmpeg, so no PNG ever lands on disk. Scene durations are not written by hand — they are measured from a free text-to-speech pass over the script, one audio file per narration line.

**Tech Stack:** Node 24 (ESM for tooling, CommonJS `.cjs` for tests to match the repo), Playwright 1.62.1 (Chromium), ffmpeg/ffprobe (already on PATH), Python 3.14 with `edge-tts` (one new free dependency, no account or key), plain browser JavaScript for the drawing layer.

**Spec:** `docs/superpowers/specs/2026-10-10-bobit-video-series-design.md`

## Global Constraints

- Output is **1920 × 1080 at 30 fps**. Every scene, every export.
- **Dark theme.** Stage background `#111113`. Figure palette, in tone order: `#1DA8C6`, `#FF6B52`, `#FFD740`, `#43D07E`, `#B49BFF`, `#FF9A4D`.
- **Pillar accents:** Inform `#FFD426`, Connect `#2BD9D9`, Empower `#FF4019`. Episode 1 is Inform.
- **At most 3 Bobits on screen in any scene.**
- **The renderer must never load `ev-figures.js`.** It randomizes its cast per page load and runs on `requestAnimationFrame`. Both are fatal to reproducible video.
- **No PNG frame is ever written to disk.** Frames are piped to ffmpeg's stdin.
- **New poses go in `ev-anim-extras.js`**, never in the video tool. That file is LF-terminated — preserve LF when editing it.
- **All build output lives under `tools/video/build/` and is git-ignored.** `render.yaml` sets `staticPublishPath: ./`, so anything committed is deployed publicly on every push.
- **Tests are plain `.cjs` files under `tests/video/`**, no test framework, `require('playwright')` and `require('assert')`, exit code is the result. They join the full suite picked up by `for f in tests/*/*.cjs`, so each one must finish in seconds, not minutes.
- Playwright resolves from the repo's own `node_modules`. If `require.resolve('playwright')` throws, set `NODE_PATH=C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules`.

### Two refinements to the spec, made while planning

1. **`art` scenes reference their draw function by name, not by reference.** The spec's example wrote `draw: drawSpokeGrowing`. A scene object has to cross into the browser as JSON, and a function cannot. Instead an episode ships `art.js`, a browser script that assigns `window.EVArt = { drawSpokeGrowing, ... }`, and the scene says `art: 'drawSpokeGrowing'`.
2. **Line durations come from one audio file per line, not from word-boundary events.** Synthesizing each line separately and measuring the file with `ffprobe` gives the same number more simply and with nothing to parse. The spec's intent — measure, never estimate — is unchanged.

## Review Focus

- **A scene naming a `vo` id that is not in `timings.json`** must abort the build and name the id. Silently rendering a zero-length scene desynchronises everything after it. *Test in Task 6.*
- **Cumulative frame drift across many scenes.** Rounding each scene's duration to whole frames independently drifts up to half a frame per scene — a full second of lip-sync error over 60 scenes. Frame boundaries must be computed from cumulative time. *Test in Task 6.*
- **A cast entry naming an animation that is not in `LeremyRig.ANIMATIONS`** must abort and name it. Drawing nothing produces a scene that looks like a background bug. *Test in Task 3.*
- **Narration text containing quotes, em dashes and ampersands** must reach the speech engine intact. Shell-quoting a sentence is how that breaks. *Test in Task 5.*
- **ffmpeg failing part-way through a pipe** must make the build exit non-zero. A truncated MP4 plays fine for its first half and looks like a successful render. *Test in Task 7.*

---

## File Structure

```
tools/video/
  engine/
    stage.html        the render page: canvas + rig + extras + stage.js
    stage.js          browser: draws one scene at one t. The only drawing code.
    cast.js           browser: figure placement, ground offsets, path interpolation
    script.mjs        node: parse script.md -> lines
    voice.mjs         node: lines -> per-line audio + timings.json + vo.wav
    timing.mjs        node: timings.json + episode -> frame-accurate scene spans
    render.mjs        node: one scene -> one MP4 (Playwright -> ffmpeg pipe)
    build.mjs         node: orchestrate. cache, join, mux, timing sheet, contact sheet
  episodes/
    compass/
      script.md       narration lines + direction notes
      art.js          browser: window.EVArt draw functions for this episode
      episode.mjs     node: the scene list
  build/              ALL output. git-ignored.

tests/video/
  01-stage-loads.cjs
  02-determinism.cjs
  03-cast.cjs
  04-art.cjs
  05-script.cjs
  06-timing.cjs
  07-render.cjs
  08-build.cjs
  09-alpha.cjs
  10-poses.cjs
  fixtures/
    scene-fixtures.js
    script-fixture.md
```

`stage.js` and `cast.js` are the only files that draw. `render.mjs` and `build.mjs` never touch a canvas. That split is what makes Task 2's determinism test meaningful: if drawing has no state outside `(scene, t)`, the same inputs cannot produce different pixels.

---

### Task 1: Scaffold and the render page

**Files:**
- Create: `tools/video/engine/stage.html`
- Create: `tools/video/engine/stage.js`
- Modify: `.gitignore`
- Test: `tests/video/01-stage-loads.cjs`

**Interfaces:**
- Consumes: `leremy-rig.js` (`window.LeremyRig`), `ev-anim-extras.js`
- Produces: `window.EVStage.init(w, h)` sizes the canvas and returns nothing; `window.EVStage.renderFrame(scene, t)` draws one frame. Both are called from Playwright via `page.evaluate`.

- [ ] **Step 1: Add the build directory to .gitignore**

Append to `.gitignore`:

```
# Video pipeline output — frames, audio, MP4s. Never commit: render.yaml
# publishes the whole repo, so a committed episode ships on every deploy.
tools/video/build/
```

- [ ] **Step 2: Write the failing test**

Create `tests/video/01-stage-loads.cjs`:

```js
// The render page must load the LIVE rig and the extras, and expose EVStage.
// It must NOT load ev-figures.js — that file randomizes its cast per load and
// runs its own rAF loop, which would make every render different.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/tools/video/engine/stage.html';

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);

  const probe = await page.evaluate(() => ({
    rig: !!window.LeremyRig,
    anims: window.LeremyRig ? Object.keys(window.LeremyRig.ANIMATIONS).length : 0,
    hasPonder: !!(window.LeremyRig && window.LeremyRig.ANIMATIONS.ponder),
    stage: typeof window.EVStage === 'object' && typeof window.EVStage.renderFrame === 'function',
    figures: !!window.__evFigDebug,
    scripts: Array.from(document.scripts).map(s => s.getAttribute('src'))
  }));

  assert.ok(probe.rig, 'LeremyRig must be loaded');
  assert.ok(probe.anims >= 26, 'the rig must carry its full animation set, got ' + probe.anims);
  assert.ok(probe.hasPonder, 'ev-anim-extras.js must be loaded (ponder is one of its poses)');
  assert.ok(probe.stage, 'window.EVStage.renderFrame must exist');
  assert.ok(!probe.figures, 'ev-figures.js must NOT be loaded into the render page');
  assert.ok(!probe.scripts.some(s => /ev-figures/.test(s || '')), 'no ev-figures script tag');
  assert.deepStrictEqual(errors, [], 'the render page must throw nothing: ' + errors.join('; '));

  await browser.close();
  console.log('PASS 01-stage-loads');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd "C:/ev-landing/ev-landing-main" && node tests/video/01-stage-loads.cjs`
Expected: FAIL — the page does not exist yet.

- [ ] **Step 4: Create the render page**

Create `tools/video/engine/stage.html`:

```html
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>EV video stage</title>
<style>
  html, body { margin: 0; padding: 0; background: #111113; overflow: hidden; }
  canvas { display: block; }
</style>
</head>
<body>
<canvas id="stage"></canvas>
<script src="../../../leremy-rig.js"></script>
<script src="../../../ev-anim-extras.js"></script>
<script src="cast.js"></script>
<script src="stage.js"></script>
</body>
</html>
```

- [ ] **Step 5: Create the stage skeleton**

Create `tools/video/engine/cast.js` as a placeholder that Task 3 fills in:

```js
// Figure placement for video scenes. Filled in by Task 3.
(function () {
  "use strict";
  if (window.EVCast) return;
  window.EVCast = {};
})();
```

Create `tools/video/engine/stage.js`:

```js
// Draws exactly one frame of one scene at exactly one time t.
//
// This file and cast.js are the ONLY code in the pipeline that draws. Keeping
// every other module away from the canvas is what makes the determinism test
// in tests/video/02-determinism.cjs meaningful: if the pixels depend only on
// (scene, t), then the same pair cannot ever produce two different frames.
(function () {
  "use strict";
  if (window.EVStage) return;

  var BG = "#111113";
  var canvas = null, ctx = null, W = 0, H = 0;

  function init(w, h) {
    canvas = document.getElementById("stage");
    canvas.width = w; canvas.height = h;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx = canvas.getContext("2d");
    W = w; H = h;
  }

  function renderFrame(scene, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (scene.alpha) ctx.clearRect(0, 0, W, H);
    else { ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); }
    // Scene types arrive in Task 2 (title, stage) and Task 4 (art).
  }

  window.EVStage = { init: init, renderFrame: renderFrame };
})();
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd "C:/ev-landing/ev-landing-main" && node tests/video/01-stage-loads.cjs`
Expected: `PASS 01-stage-loads`

- [ ] **Step 7: Commit**

```bash
git add .gitignore tools/video/engine/stage.html tools/video/engine/stage.js tools/video/engine/cast.js tests/video/01-stage-loads.cjs
git commit -m "feat(video): a render page that loads the live rig and nothing that randomizes"
```

---

### Task 2: Title and stage scene types, and the determinism guarantee

**Files:**
- Modify: `tools/video/engine/stage.js`
- Create: `tests/video/fixtures/scene-fixtures.js`
- Test: `tests/video/02-determinism.cjs`

**Interfaces:**
- Consumes: `window.EVStage.init`, `window.EVStage.renderFrame` from Task 1.
- Produces: the scene object shape every later task writes —
  `{ id: string, type: 'title'|'stage'|'art', dur: number, vo: string, accent: string, headline?: string, sub?: string, bullets?: [{ t: number, text: string }], cast?: CastEntry[], art?: string, alpha?: boolean }`.

- [ ] **Step 1: Write the fixture scenes**

Create `tests/video/fixtures/scene-fixtures.js`:

```js
// Shared scene fixtures. Plain CommonJS so .cjs tests can require it, and the
// objects are pure JSON so they can be handed to page.evaluate unchanged.
module.exports = {
  title: {
    id: 'fx-title', type: 'title', dur: 2, vo: 'L001', accent: '#FFD426',
    headline: 'Empowered Compass', sub: 'Inform Pillar'
  },
  stage: {
    id: 'fx-stage', type: 'stage', dur: 3, vo: 'L002', accent: '#FFD426',
    headline: 'Who are these people?',
    cast: [ { at: [0.5, 0.80], anim: 'confused', tone: 0, scale: 1 } ]
  },
  walker: {
    id: 'fx-walk', type: 'stage', dur: 4, vo: 'L003', accent: '#2BD9D9',
    cast: [ { at: [0.2, 0.80], anim: 'stroll', tone: 1, scale: 1, path: [[0.2, 0.80], [0.8, 0.80]] } ]
  },
  bullets: {
    id: 'fx-bullets', type: 'stage', dur: 6, vo: 'L004', accent: '#FF4019',
    headline: 'Three pillars',
    bullets: [ { t: 0.5, text: 'Inform' }, { t: 2.0, text: 'Connect' }, { t: 3.5, text: 'Empower' } ],
    cast: [ { at: [0.82, 0.82], anim: 'present', tone: 2, scale: 0.8 } ]
  }
};
```

- [ ] **Step 2: Write the failing test**

Create `tests/video/02-determinism.cjs`:

```js
// The premise of the whole pipeline: pixels depend on (scene, t) and nothing
// else. The interesting failure is not "the same call twice differs" — it is
// hidden state, where rendering t=1.5 AFTER t=99 differs from rendering t=1.5
// cold. That is what a stray accumulator or a Math.random would look like.
const { chromium } = require('playwright');
const assert = require('assert');
const crypto = require('crypto');
const FX = require('./fixtures/scene-fixtures.js');

const URL = 'file:///C:/ev-landing/ev-landing-main/tools/video/engine/stage.html';
const W = 480, H = 270;

function hash(buf) { return crypto.createHash('sha1').update(buf).digest('hex'); }

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  await page.evaluate(([w, h]) => window.EVStage.init(w, h), [W, H]);

  async function shot(scene, t) {
    await page.evaluate(([s, tt]) => window.EVStage.renderFrame(s, tt), [scene, t]);
    return await page.screenshot({ type: 'png' });
  }

  for (const key of ['title', 'stage', 'walker', 'bullets']) {
    const scene = FX[key];
    const cold = hash(await shot(scene, 1.5));
    await shot(scene, 99);
    await shot(FX.title, 7);
    const warm = hash(await shot(scene, 1.5));
    assert.strictEqual(warm, cold, key + ': t=1.5 must not depend on what was drawn before it');
  }

  // And the picture must actually move, or the determinism above is vacuous.
  const a = hash(await shot(FX.walker, 0.0));
  const b = hash(await shot(FX.walker, 2.0));
  assert.notStrictEqual(a, b, 'a walking Bobit must look different at t=0 and t=2');

  // A bullet that has not been reached yet must not be on screen.
  const early = hash(await shot(FX.bullets, 0.2));
  const late = hash(await shot(FX.bullets, 4.0));
  assert.notStrictEqual(early, late, 'bullets must reveal over time');

  assert.deepStrictEqual(errors, [], 'no page errors: ' + errors.join('; '));
  await browser.close();
  console.log('PASS 02-determinism');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node tests/video/02-determinism.cjs`
Expected: FAIL — `renderFrame` draws only a background, so every hash matches and the "must actually move" assertion fails.

- [ ] **Step 4: Implement the title and stage scene types**

Replace the body of `renderFrame` in `tools/video/engine/stage.js` and add the helpers below it:

```js
  var FG = "#F2F2F2", MUTED = "#9A9AA0";
  var FONT = '"Figtree", "Segoe UI", system-ui, sans-serif';

  function renderFrame(scene, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (scene.alpha) ctx.clearRect(0, 0, W, H);
    else { ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); }

    if (scene.type === "title") return drawTitle(scene, t);
    if (scene.type === "stage") return drawStageScene(scene, t);
    if (scene.type === "art") return drawArtScene(scene, t);
    throw new Error("unknown scene type: " + scene.type + " (scene " + scene.id + ")");
  }

  // Ease a value in over `dur` seconds starting at `t0`. Returns 0..1.
  function fade(t, t0, dur) {
    if (t <= t0) return 0;
    if (t >= t0 + dur) return 1;
    var x = (t - t0) / dur;
    return x * x * (3 - 2 * x);          // smoothstep
  }

  function drawTitle(scene, t) {
    var a = fade(t, 0.15, 0.5);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = "center";
    ctx.fillStyle = scene.accent || FG;
    ctx.font = "700 " + Math.round(H * 0.11) + "px " + FONT;
    ctx.fillText(scene.headline || "", W / 2, H * 0.50);
    if (scene.sub) {
      ctx.fillStyle = MUTED;
      ctx.font = "500 " + Math.round(H * 0.045) + "px " + FONT;
      ctx.fillText(scene.sub, W / 2, H * 0.60);
    }
    ctx.restore();
  }

  function drawStageScene(scene, t) {
    if (scene.headline) {
      ctx.save();
      ctx.globalAlpha = fade(t, 0.1, 0.45);
      ctx.textAlign = "left";
      ctx.fillStyle = FG;
      ctx.font = "700 " + Math.round(H * 0.072) + "px " + FONT;
      ctx.fillText(scene.headline, W * 0.08, H * 0.22);
      ctx.restore();
    }
    (scene.bullets || []).forEach(function (b, i) {
      var a = fade(t, b.t, 0.4);
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = scene.accent || FG;
      ctx.beginPath();
      ctx.arc(W * 0.09, H * (0.36 + i * 0.10) - H * 0.012, H * 0.011, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = FG;
      ctx.textAlign = "left";
      ctx.font = "500 " + Math.round(H * 0.048) + "px " + FONT;
      ctx.fillText(b.text, W * 0.13, H * (0.36 + i * 0.10));
      ctx.restore();
    });
    window.EVCast.drawAll(ctx, scene, t, W, H);
  }

  function drawArtScene(scene, t) {
    var fn = window.EVArt && window.EVArt[scene.art];
    if (!fn) throw new Error("unknown art function: " + scene.art + " (scene " + scene.id + ")");
    fn(ctx, t, W, H, scene);
    window.EVCast.drawAll(ctx, scene, t, W, H);
  }
```

Task 3 supplies `window.EVCast.drawAll`. Until then, add a no-op to `cast.js` so this task's test can run:

```js
  window.EVCast = { drawAll: function () {} };
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node tests/video/02-determinism.cjs`
Expected: `PASS 02-determinism`

The `walker` fixture passes on the bullet-and-title motion alone at this stage; Task 3 makes its Bobit move.

- [ ] **Step 6: Commit**

```bash
git add tools/video/engine/stage.js tools/video/engine/cast.js tests/video/02-determinism.cjs tests/video/fixtures/scene-fixtures.js
git commit -m "feat(video): title and stage scenes, and a test that hidden state cannot survive"
```

---

### Task 3: Placing Bobits — ground line, scale, path, props

**Files:**
- Modify: `tools/video/engine/cast.js`
- Test: `tests/video/03-cast.cjs`

**Interfaces:**
- Consumes: `window.LeremyRig.{ANIMATIONS, CFG, computePose, draw, drawShadow}`.
- Produces: `window.EVCast.drawAll(ctx, scene, t, W, H)`, and `window.EVCast.TONES` — the six dark-theme hex strings in tone order.
- Cast entry shape, relied on by every episode: `{ at: [xFrac, groundYFrac], anim: string, tone: 0..5, scale?: number (default 1), flip?: boolean, path?: [[x0,y0],[x1,y1]], prop?: { book?, phone?, mega?, cane?, laptop?, chair?, desk? }, shadow?: boolean (default true) }`.

**Why this task exists on its own.** The rig's `computePose` puts the **pelvis** at the origin, not the feet. A figure drawn at `y = groundY` floats a whole leg length above the floor, and nothing in a passing test would say so. The rig's own stage solves it with two constants: a standing figure's pelvis sits 128px above the shadow, a seated one 200px, both at scale 1. This task encodes that and then checks it against the actual pixels.

- [ ] **Step 1: Write the failing test**

Create `tests/video/03-cast.cjs`:

```js
// Where a Bobit's FEET land. The rig places the pelvis at the origin, so a
// naive placement floats the figure a leg-length off the ground and every
// scene still renders, still passes, and still looks broken. So this test
// asks the pixels, per the lesson already paid for in this repo.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/tools/video/engine/stage.html';
const W = 800, H = 450;

function sceneWith(cast) {
  return { id: 'fx', type: 'stage', dur: 2, vo: 'L001', accent: '#FFD426', cast: cast };
}

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  await page.evaluate(([w, h]) => window.EVStage.init(w, h), [W, H]);

  // Return the lowest and the horizontal centre of every pixel that is not the
  // #111113 background, ignoring the soft shadow ellipse by requiring a strong
  // difference from the background.
  async function ink(scene, t) {
    return await page.evaluate(([s, tt]) => {
      window.EVStage.renderFrame(s, tt);
      const c = document.getElementById('stage');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let lo = -1, minX = 1e9, maxX = -1, n = 0;
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          const i = (y * c.width + x) * 4;
          const diff = Math.abs(d[i] - 0x11) + Math.abs(d[i + 1] - 0x11) + Math.abs(d[i + 2] - 0x13);
          if (diff > 60) { lo = y; if (x < minX) minX = x; if (x > maxX) maxX = x; n++; }
        }
      }
      return { lo, minX, maxX, n };
    }, [scene, t]);
  }

  // 1. Feet land on the ground line, standing.
  const groundFrac = 0.80;
  const stand = await ink(sceneWith([{ at: [0.5, groundFrac], anim: 'present', tone: 0 }]), 1.0);
  assert.ok(stand.n > 200, 'the figure must actually be drawn, got ' + stand.n + ' ink pixels');
  const want = Math.round(H * groundFrac);
  assert.ok(Math.abs(stand.lo - want) <= 6,
    'standing feet must land on the ground line: lowest ink ' + stand.lo + ', ground ' + want);

  // 2. A seated pose also lands on the ground line, not 72px off it.
  const sit = await ink(sceneWith([{ at: [0.5, groundFrac], anim: 'sit', tone: 0 }]), 1.0);
  assert.ok(Math.abs(sit.lo - want) <= 10,
    'seated feet must land on the ground line too: lowest ink ' + sit.lo + ', ground ' + want);

  // 3. Scale shrinks the figure but keeps the feet down.
  const small = await ink(sceneWith([{ at: [0.5, groundFrac], anim: 'present', tone: 0, scale: 0.5 }]), 1.0);
  assert.ok(Math.abs(small.lo - want) <= 6, 'a scaled figure keeps its feet on the ground');
  assert.ok(small.n < stand.n * 0.6, 'scale 0.5 must draw substantially less ink');

  // 4. A path moves the figure across the scene.
  const walk = [{ at: [0.2, groundFrac], anim: 'stroll', tone: 1, path: [[0.2, groundFrac], [0.8, groundFrac]] }];
  const begin = await ink(sceneWith(walk), 0.0);
  const end = await ink(sceneWith(walk), 2.0);           // scene dur is 2
  const cBegin = (begin.minX + begin.maxX) / 2, cEnd = (end.minX + end.maxX) / 2;
  assert.ok(cEnd - cBegin > W * 0.4,
    'a path must carry the figure across: centre moved ' + Math.round(cEnd - cBegin) + 'px');

  // 5. More than three Bobits is a stated limit, so it must fail, not render.
  let tooMany = null;
  try {
    await page.evaluate(s => window.EVStage.renderFrame(s, 0), sceneWith([
      { at: [0.2, 0.8], anim: 'present', tone: 0 }, { at: [0.4, 0.8], anim: 'present', tone: 1 },
      { at: [0.6, 0.8], anim: 'present', tone: 2 }, { at: [0.8, 0.8], anim: 'present', tone: 3 }
    ]));
  } catch (e) { tooMany = String(e); }
  assert.ok(tooMany && /limit is 3/.test(tooMany), 'a fourth Bobit must abort, got: ' + tooMany);

  // 6. An unknown animation name must abort loudly, naming itself.
  let threw = null;
  try {
    await page.evaluate(s => window.EVStage.renderFrame(s, 0),
      sceneWith([{ at: [0.5, 0.8], anim: 'moonwalk', tone: 0 }]));
  } catch (e) { threw = String(e); }
  assert.ok(threw && /moonwalk/.test(threw),
    'an unknown animation must throw and name itself, got: ' + threw);

  assert.deepStrictEqual(errors.filter(e => !/moonwalk|limit is 3/.test(e)), [],
    'no unexpected page errors');
  await browser.close();
  console.log('PASS 03-cast');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/video/03-cast.cjs`
Expected: FAIL — `EVCast.drawAll` is a no-op, so `stand.n` is 0.

- [ ] **Step 3: Implement cast placement**

Replace `tools/video/engine/cast.js` entirely:

```js
// Figure placement for video scenes.
//
// The rig's computePose puts the PELVIS at the origin. Its own stage shows the
// offsets to the floor: a standing figure's pelvis sits 128px above the shadow
// line, a seated one 200px, both at scale 1 (leremy-rig.js drawStage, oy 372
// and 300 against a ground of 500). Scenes are authored against the GROUND, so
// this module converts.
(function () {
  "use strict";
  if (window.EVCast && window.EVCast.drawAll && window.EVCast.TONES) return;

  var TONES = ["#1DA8C6", "#FF6B52", "#FFD740", "#43D07E", "#B49BFF", "#FF9A4D"];
  var PELVIS_ABOVE_GROUND = { standing: 128, seated: 200 };

  function lerp(a, b, u) { return a + (b - a) * u; }

  function drawOne(ctx, entry, scene, t, W, H) {
    var R = window.LeremyRig;
    var anim = R.ANIMATIONS[entry.anim];
    if (!anim) throw new Error("unknown animation: " + entry.anim + " (scene " + scene.id + ")");

    var scale = entry.scale == null ? 1 : entry.scale;
    var u = scene.dur > 0 ? Math.max(0, Math.min(1, t / scene.dur)) : 0;
    var p0 = entry.path ? entry.path[0] : entry.at;
    var p1 = entry.path ? entry.path[1] : entry.at;
    var xFrac = lerp(p0[0], p1[0], u);
    var gFrac = lerp(p0[1], p1[1], u);

    var cx = xFrac * W;
    var groundY = gFrac * H;
    var lift = (anim.seated ? PELVIS_ABOVE_GROUND.seated : PELVIS_ABOVE_GROUND.standing) * scale;
    var pelvisY = groundY - lift;

    if (entry.shadow !== false) {
      R.drawShadow(ctx, cx, groundY, 66 * scale, "rgba(0,0,0,0.38)");
    }

    var pose = anim.frame(t);
    var opts = { color: TONES[(entry.tone || 0) % TONES.length], time: t };
    if (anim.mega) { opts.mega = true; opts.arm = anim.arm; opts.megaColor = scene.accent || "#FFD426"; }
    if (anim.book) opts.book = true;
    if (anim.swirl) opts.swirl = true;
    if (anim.laptop) opts.laptop = true;
    var prop = entry.prop || {};
    Object.keys(prop).forEach(function (k) { opts[k] = prop[k]; });
    if (opts.chair && !opts.chairColor) opts.chairColor = "#3A3A42";
    if (opts.desk && !opts.deskColor) opts.deskColor = "#3A3A42";
    if (opts.laptop && !opts.screenColor) opts.screenColor = "#1A1A20";

    ctx.save();
    ctx.translate(cx, pelvisY);
    ctx.scale(entry.flip ? -scale : scale, scale);
    var j = R.computePose(pose, R.CFG, { x: 0, y: 0 });
    R.draw(ctx, j, R.CFG, opts);
    ctx.restore();
  }

  function drawAll(ctx, scene, t, W, H) {
    var cast = scene.cast || [];
    if (cast.length > 3) {
      throw new Error("scene " + scene.id + " has " + cast.length + " Bobits; the limit is 3");
    }
    cast.forEach(function (e) { drawOne(ctx, e, scene, t, W, H); });
  }

  window.EVCast = { drawAll: drawAll, TONES: TONES, PELVIS_ABOVE_GROUND: PELVIS_ABOVE_GROUND };
})();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/video/03-cast.cjs`
Expected: `PASS 03-cast`

If the standing assertion is off by a constant, read the real number out of the failure message and correct `PELVIS_ABOVE_GROUND.standing` — do not widen the tolerance. The tolerance is 6px because a shoe should land on the floor.

- [ ] **Step 5: Re-run Task 2's test**

Run: `node tests/video/02-determinism.cjs`
Expected: `PASS 02-determinism` — the walker fixture now moves because of the figure, not only the text.

- [ ] **Step 6: Commit**

```bash
git add tools/video/engine/cast.js tests/video/03-cast.cjs
git commit -m "feat(video): place Bobits by the ground line, and prove it with pixels"
```

---

### Task 4: The `art` escape hatch

**Files:**
- Create: `tests/video/fixtures/art-fixture.js`
- Test: `tests/video/04-art.cjs`
- Modify: `tools/video/engine/stage.html` (accept an injected art script)

**Interfaces:**
- Consumes: `drawArtScene` from Task 2, which already resolves `scene.art` against `window.EVArt`.
- Produces: the contract every episode's `art.js` follows — a browser IIFE that assigns `window.EVArt`, whose values are `function (ctx, t, W, H, scene)`.

- [ ] **Step 1: Write the fixture art script**

Create `tests/video/fixtures/art-fixture.js`:

```js
// The shape every episode's art.js follows: a browser IIFE that registers
// named draw functions on window.EVArt. The renderer injects this file into
// the page, and a scene names the function it wants with `art: '<name>'`.
(function () {
  "use strict";
  window.EVArt = Object.assign(window.EVArt || {}, {
    growingBar: function (ctx, t, W, H, scene) {
      var u = Math.max(0, Math.min(1, t / (scene.dur || 1)));
      ctx.fillStyle = scene.accent || "#FFD426";
      ctx.fillRect(W * 0.1, H * 0.45, W * 0.8 * u, H * 0.08);
    }
  });
})();
```

- [ ] **Step 2: Write the failing test**

Create `tests/video/04-art.cjs`:

```js
// An art scene draws from an injected per-episode script, selected by NAME.
// A scene object crosses into the browser as JSON, so it cannot carry a
// function; naming one is the whole mechanism, and an unknown name must say so.
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');

const ROOT = 'C:/ev-landing/ev-landing-main';
const URL = 'file:///' + ROOT + '/tools/video/engine/stage.html';
const W = 400, H = 225;

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  await page.addScriptTag({ path: path.join(ROOT, 'tests/video/fixtures/art-fixture.js') });
  await page.evaluate(([w, h]) => window.EVStage.init(w, h), [W, H]);

  const scene = {
    id: 'fx-art', type: 'art', dur: 2, vo: 'L001', accent: '#FFD426', art: 'growingBar',
    cast: [{ at: [0.5, 0.92], anim: 'present', tone: 0, scale: 0.4 }]
  };

  async function inkCount(t) {
    return await page.evaluate(([s, tt]) => {
      window.EVStage.renderFrame(s, tt);
      const c = document.getElementById('stage');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (Math.abs(d[i] - 0x11) + Math.abs(d[i + 1] - 0x11) + Math.abs(d[i + 2] - 0x13) > 60) n++;
      }
      return n;
    }, [scene, t]);
  }

  const early = await inkCount(0.2);
  const late = await inkCount(2.0);
  assert.ok(early > 0, 'the art scene must draw something at t=0.2');
  assert.ok(late > early * 1.5, 'the bar must grow: ' + early + ' -> ' + late);

  // The cast still draws on top of art.
  const noCast = Object.assign({}, scene, { cast: [] });
  const withoutFigure = await page.evaluate(([s]) => {
    window.EVStage.renderFrame(s, 2.0);
    const c = document.getElementById('stage');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - 0x11) + Math.abs(d[i + 1] - 0x11) + Math.abs(d[i + 2] - 0x13) > 60) n++;
    }
    return n;
  }, [noCast]);
  assert.ok(late > withoutFigure, 'the Bobit must draw on top of the art, not be swallowed by it');

  // An unknown art name aborts and names itself.
  let threw = null;
  try {
    await page.evaluate(s => window.EVStage.renderFrame(s, 0), Object.assign({}, scene, { art: 'nope' }));
  } catch (e) { threw = String(e); }
  assert.ok(threw && /nope/.test(threw), 'an unknown art name must throw and name itself, got: ' + threw);

  assert.deepStrictEqual(errors.filter(e => !/nope/.test(e)), [], 'no unexpected page errors');
  await browser.close();
  console.log('PASS 04-art');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node tests/video/04-art.cjs`
Expected: FAIL — `window.EVArt` is undefined until the fixture is injected and `drawArtScene` has never been exercised.

- [ ] **Step 4: Make it pass**

`drawArtScene` already exists from Task 2 and already reads `window.EVArt`. The only change needed is to guarantee `window.EVArt` is an object before any episode script loads. Add this line at the top of the IIFE in `tools/video/engine/stage.js`:

```js
  window.EVArt = window.EVArt || {};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node tests/video/04-art.cjs`
Expected: `PASS 04-art`

- [ ] **Step 6: Commit**

```bash
git add tools/video/engine/stage.js tests/video/04-art.cjs tests/video/fixtures/art-fixture.js
git commit -m "feat(video): art scenes draw from a named per-episode registry"
```

---

### Task 5: Parse the script, and speak it

**Files:**
- Create: `tools/video/engine/script.mjs`
- Create: `tools/video/engine/voice.mjs`
- Create: `tests/video/fixtures/script-fixture.md`
- Test: `tests/video/05-script.cjs`

**Interfaces:**
- Produces: `parseScript(text) -> [{ id, text, direction }]` from `script.mjs`.
- Produces: `speak(lines, outDir, opts) -> Promise<timings>` from `voice.mjs`, where `timings` is `{ gap: number, lines: [{ id, text, start, dur }], total: number }`, written as `timings.json`.

- [ ] **Step 1: Write the fixture script**

Create `tests/video/fixtures/script-fixture.md`:

```markdown
# Fixture script

## L001
> Direction: a Bobit alone in a voting booth, confused.
Who are these people?

## L002
> Direction: the camera holds.
It's a fair question — and "fair" is the word that matters here.
Ampersands & em dashes must survive the trip.

## L003
> Direction: nothing moves.
One more line.
```

- [ ] **Step 2: Write the failing test**

Create `tests/video/05-script.cjs`:

```js
// Parsing is pure and is tested without the network. The speech step itself is
// verified by running it, not by mocking a vendor. What IS tested here is the
// thing that breaks quietly: punctuation surviving the trip to the engine.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/ev-landing/ev-landing-main';

(async function () {
  const { parseScript } = await import('file:///' + ROOT + '/tools/video/engine/script.mjs');
  const text = fs.readFileSync(path.join(ROOT, 'tests/video/fixtures/script-fixture.md'), 'utf8');
  const lines = parseScript(text);

  assert.strictEqual(lines.length, 3, 'three lines, got ' + lines.length);
  assert.deepStrictEqual(lines.map(l => l.id), ['L001', 'L002', 'L003']);
  assert.strictEqual(lines[0].text, 'Who are these people?');
  assert.ok(/voting booth/.test(lines[0].direction), 'the direction note must be captured');
  assert.ok(!/Direction/.test(lines[0].text), 'the direction note must NOT leak into the narration');

  // The punctuation case. These characters are exactly what shell-quoting eats.
  assert.ok(lines[1].text.includes('"fair"'), 'double quotes must survive: ' + lines[1].text);
  assert.ok(lines[1].text.includes('—'), 'em dash must survive: ' + lines[1].text);
  assert.ok(lines[1].text.includes('&'), 'ampersand must survive: ' + lines[1].text);
  assert.ok(lines[1].text.includes('Ampersands & em dashes'), 'a wrapped line must join with a space');
  assert.ok(!/\n/.test(lines[1].text), 'a multi-line body must be joined into one string');

  // A heading that is not a line id is a hard error, not a silently skipped line.
  assert.throws(() => parseScript('## notanid\nhello\n'), /notanid/,
    'an unparsable line heading must throw and name itself');

  // Duplicate ids would silently overwrite a scene's timing.
  assert.throws(() => parseScript('## L001\na\n\n## L001\nb\n'), /L001/,
    'a duplicate line id must throw and name itself');

  console.log('PASS 05-script');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node tests/video/05-script.cjs`
Expected: FAIL — `script.mjs` does not exist.

- [ ] **Step 4: Write the parser**

Create `tools/video/engine/script.mjs`:

```js
// script.md -> narration lines.
//
// Format:
//   ## L001
//   > Direction: what the Bobits are doing while this is read.
//   The narration text, which may wrap over several lines.
//
// One line is one scene. That one-to-one rule is what makes a re-time cost a
// single number instead of an edit.

const ID = /^##\s+(\S+)\s*$/;
const DIRECTION = /^>\s*Direction:\s*(.*)$/i;

export function parseScript(text) {
  const out = [];
  const seen = new Set();
  let cur = null;

  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();

    if (/^#\s/.test(line)) continue;                       // the document title
    const head = line.match(ID);
    if (head) {
      const id = head[1];
      if (!/^L\d{3,}$/.test(id)) {
        throw new Error('bad line id "' + id + '": expected L001, L002, ...');
      }
      if (seen.has(id)) throw new Error('duplicate line id "' + id + '"');
      seen.add(id);
      cur = { id, text: '', direction: '', parts: [] };
      out.push(cur);
      continue;
    }
    if (!cur) continue;

    const dir = line.match(DIRECTION);
    if (dir) { cur.direction = dir[1].trim(); continue; }
    if (!line.trim()) continue;
    cur.parts.push(line.trim());
  }

  for (const l of out) {
    l.text = l.parts.join(' ');
    delete l.parts;
    if (!l.text) throw new Error('line ' + l.id + ' has a heading but no narration');
  }
  return out;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node tests/video/05-script.cjs`
Expected: `PASS 05-script`

- [ ] **Step 6: Install edge-tts**

Run: `python -m pip install edge-tts`
Expected: a successful install. Confirm with `python -m edge_tts --list-voices | head -3`.

If this fails on Python 3.14, fall back to the offline Windows voice in Step 7's `--engine sapi` branch and say so in the commit message.

- [ ] **Step 7: Write the speech step**

Create `tools/video/engine/voice.mjs`:

```js
// Narration lines -> one audio file per line, measured, then joined.
//
// Each line is synthesized ON ITS OWN and measured with ffprobe. That is where
// scene durations come from. Nothing in this pipeline estimates how long a
// sentence takes to say.
//
// The text is handed to the speech engine through a UTF-8 FILE, never through
// a shell argument. Quotes, em dashes and ampersands are ordinary in this copy
// and shell-quoting is exactly how they get mangled.

import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const VOICE = 'en-US-AndrewMultilingualNeural';
const GAP = 0.45;                       // seconds of silence between lines

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { err += d; });
    p.on('error', reject);
    p.on('close', code => code === 0
      ? resolve(out.trim())
      : reject(new Error(cmd + ' exited ' + code + ': ' + err.slice(-2000))));
  });
}

export async function probeDuration(file) {
  const out = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', file]);
  const n = Number(out);
  if (!Number.isFinite(n) || n <= 0) throw new Error('ffprobe gave no duration for ' + file);
  return n;
}

async function synth(line, dir, engine) {
  const txt = path.join(dir, line.id + '.txt');
  const mp3 = path.join(dir, line.id + '.mp3');
  const wav = path.join(dir, line.id + '.wav');
  await writeFile(txt, line.text, 'utf8');

  if (engine === 'sapi') {
    // Offline fallback. PowerShell reads the SAME file, so punctuation is
    // never handed to a command line here either.
    await run('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      'Add-Type -AssemblyName System.Speech; ' +
      '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; ' +
      '$s.SetOutputToWaveFile("' + wav.replace(/\\/g, '\\\\') + '"); ' +
      '$s.Speak([IO.File]::ReadAllText("' + txt.replace(/\\/g, '\\\\') + '", [Text.Encoding]::UTF8)); ' +
      '$s.Dispose()']);
  } else {
    await run('python', ['-m', 'edge_tts', '--voice', VOICE, '--file', txt, '--write-media', mp3]);
    await run('ffmpeg', ['-y', '-v', 'error', '-i', mp3, '-ar', '48000', '-ac', '1', wav]);
  }
  return wav;
}

export async function speak(lines, outDir, opts = {}) {
  const engine = opts.engine || 'edge';
  const gap = opts.gap == null ? GAP : opts.gap;
  const dir = path.join(outDir, 'vo');
  await mkdir(dir, { recursive: true });

  const silence = path.join(dir, '_gap.wav');
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi',
    '-i', 'anullsrc=r=48000:cl=mono', '-t', String(gap), silence]);

  const out = { gap, lines: [], total: 0 };
  const concat = [];
  let clock = 0;

  for (const line of lines) {
    const wav = await synth(line, dir, engine);
    const dur = await probeDuration(wav);
    out.lines.push({ id: line.id, text: line.text, direction: line.direction, start: clock, dur });
    concat.push(wav, silence);
    clock += dur + gap;
  }
  out.total = clock;

  const listFile = path.join(dir, '_concat.txt');
  await writeFile(listFile,
    concat.map(f => "file '" + f.replace(/\\/g, '/') + "'").join('\n') + '\n', 'utf8');
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0',
    '-i', listFile, '-c', 'copy', path.join(outDir, 'vo.wav')]);

  await writeFile(path.join(outDir, 'timings.json'), JSON.stringify(out, null, 2), 'utf8');
  return out;
}

export async function loadTimings(outDir) {
  return JSON.parse(await readFile(path.join(outDir, 'timings.json'), 'utf8'));
}
```

- [ ] **Step 8: Run the speech step against the fixture by hand**

```bash
cd "C:/ev-landing/ev-landing-main"
node -e "
import('./tools/video/engine/script.mjs').then(async (S) => {
  const V = await import('./tools/video/engine/voice.mjs');
  const fs = await import('node:fs/promises');
  const lines = S.parseScript(await fs.readFile('tests/video/fixtures/script-fixture.md','utf8'));
  const t = await V.speak(lines, 'tools/video/build/_fixture');
  console.log(JSON.stringify(t.lines.map(l => [l.id, l.dur.toFixed(3)])), 'total', t.total.toFixed(3));
});
"
```

Expected: three durations, each plausible for its sentence length, and a `tools/video/build/_fixture/vo.wav` you can play. **Listen to it.** Confirm line L002 says "fair" and the ampersand reads as "and" — that is the punctuation check no assertion can make.

- [ ] **Step 9: Commit**

```bash
git add tools/video/engine/script.mjs tools/video/engine/voice.mjs tests/video/05-script.cjs tests/video/fixtures/script-fixture.md
git commit -m "feat(video): parse the script and measure every line, never estimate one"
```

---

### Task 6: Frame-accurate scene timing

**Files:**
- Create: `tools/video/engine/timing.mjs`
- Test: `tests/video/06-timing.cjs`

**Interfaces:**
- Consumes: `timings.json` from Task 5; an episode object with a `scenes` array.
- Produces: `planFrames(episode, timings) -> [{ ...scene, dur, startFrame, frames, start, end }]`. `dur` on the returned scene is the **frame-aligned** duration, which is what the renderer and the timing sheet both use.

**Why this task exists on its own.** A scene lasting 1.0167 seconds is 30.5 frames. Round each scene independently and the error is up to half a frame per scene — over sixty scenes that is up to a second of drift between picture and voice, arriving gradually so it looks like nothing until the last chapter is visibly off. The fix is to round the **cumulative boundaries**, never the individual durations, so every error cancels at the next cut.

- [ ] **Step 1: Write the failing test**

Create `tests/video/06-timing.cjs`:

```js
// The drift test. Independently rounding each scene to whole frames is the
// obvious implementation and it is wrong: the errors accumulate instead of
// cancelling. These durations are chosen to round the same way every time.
const assert = require('assert');

const ROOT = 'C:/ev-landing/ev-landing-main';

function fakeTimings(n, dur, gap) {
  const lines = [];
  let clock = 0;
  for (let i = 1; i <= n; i++) {
    const id = 'L' + String(i).padStart(3, '0');
    lines.push({ id, text: 'line ' + i, start: clock, dur });
    clock += dur + gap;
  }
  return { gap, lines, total: clock };
}

(async function () {
  const { planFrames } = await import('file:///' + ROOT + '/tools/video/engine/timing.mjs');

  // 60 scenes, each 1.0333333s of speech plus a 0.45s gap. That span is exactly
  // 44.5 frames -- the worst case for rounding. These numbers are chosen, not
  // arbitrary: verified by hand, cumulative rounding lands dead on 2670 frames
  // (0ms out) while independent per-scene rounding gives 2640 (a full second
  // out). A span that rounds cleanly would let the wrong implementation pass.
  const N = 60, DUR = 1.0333333, GAP = 0.45, FPS = 30;
  const timings = fakeTimings(N, DUR, GAP);
  const episode = {
    id: 'drift', fps: FPS, width: 1920, height: 1080,
    scenes: timings.lines.map(l => ({ id: 's-' + l.id, type: 'stage', vo: l.id }))
  };

  const planned = planFrames(episode, timings);
  assert.strictEqual(planned.length, N);

  // 1. Scenes are contiguous: no gap, no overlap, measured in FRAMES.
  let frame = 0;
  for (const s of planned) {
    assert.strictEqual(s.startFrame, frame, s.id + ' must start where the last one ended');
    assert.ok(s.frames >= 1, s.id + ' must be at least one frame long');
    frame += s.frames;
  }

  // 2. No cumulative drift. The last scene must end within ONE frame of the
  //    real voice track length, not within sixty.
  const endSeconds = frame / FPS;
  assert.ok(Math.abs(endSeconds - timings.total) <= 1 / FPS + 1e-9,
    'cumulative drift: picture ends at ' + endSeconds.toFixed(3) +
    's, voice at ' + timings.total.toFixed(3) + 's');

  // 3. Each scene's reported duration is the frame-aligned one, so the timing
  //    sheet and the render cannot disagree.
  for (const s of planned) {
    assert.ok(Math.abs(s.dur - s.frames / FPS) < 1e-9, s.id + ': dur must be frames/fps');
    assert.ok(Math.abs(s.end - s.start - s.dur) < 1e-9, s.id + ': start/end must match dur');
  }

  // 4. A scene naming a vo id that does not exist must abort and name it.
  const broken = { ...episode, scenes: [...episode.scenes, { id: 's-bad', type: 'stage', vo: 'L999' }] };
  assert.throws(() => planFrames(broken, timings), /L999/,
    'a missing vo id must throw and name itself');

  // 5. A scene with an explicit hold still gets whole frames.
  const held = { ...episode, scenes: [{ id: 'hold', type: 'title', vo: 'L001', hold: 2.5 }] };
  const h = planFrames(held, timings);
  assert.strictEqual(h[0].frames, Math.round((DUR + GAP + 2.5) * FPS),
    'a scene spans its line, the gap after it, and any explicit hold');

  console.log('PASS 06-timing');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/video/06-timing.cjs`
Expected: FAIL — `timing.mjs` does not exist.

- [ ] **Step 3: Implement cumulative frame planning**

Create `tools/video/engine/timing.mjs`:

```js
// Scene durations, in whole frames, with no accumulated drift.
//
// The tempting implementation rounds each scene on its own:
//     frames = Math.round(scene.dur * fps)
// which is wrong. Each scene absorbs up to half a frame of error and the
// errors ADD. Sixty scenes later the picture can sit a second away from the
// voice, having drifted so gradually that nothing looks wrong until the end.
//
// So round the cumulative BOUNDARIES instead. Every scene's start frame is
// derived from absolute time, and its length is the distance to the next
// boundary. Error never leaves the scene it was born in.

export function planFrames(episode, timings) {
  const fps = episode.fps || 30;
  const byId = new Map(timings.lines.map(l => [l.id, l]));
  const gap = timings.gap == null ? 0 : timings.gap;

  // 1. Absolute, unrounded span for each scene.
  const spans = [];
  let clock = 0;
  for (const scene of episode.scenes) {
    const line = byId.get(scene.vo);
    if (!line) {
      throw new Error('scene "' + scene.id + '" names vo id "' + scene.vo +
        '" which is not in timings.json');
    }
    const dur = line.dur + gap + (scene.hold || 0);
    spans.push({ scene, start: clock, end: clock + dur });
    clock += dur;
  }

  // 2. Round the boundaries, not the durations.
  const out = [];
  for (let i = 0; i < spans.length; i++) {
    const startFrame = Math.round(spans[i].start * fps);
    const endFrame = i === spans.length - 1
      ? Math.round(spans[i].end * fps)
      : Math.round(spans[i + 1].start * fps);
    const frames = Math.max(1, endFrame - startFrame);
    out.push({
      ...spans[i].scene,
      startFrame,
      frames,
      start: startFrame / fps,
      end: (startFrame + frames) / fps,
      dur: frames / fps
    });
  }
  return out;
}

export function timingSheet(episode, planned) {
  const rows = planned.map(s => {
    const mmss = x => String(Math.floor(x / 60)).padStart(2, '0') + ':' +
      (x % 60).toFixed(2).padStart(5, '0');
    return '| ' + s.vo + ' | ' + mmss(s.start) + ' | ' + mmss(s.end) + ' | ' +
      s.dur.toFixed(2) + ' | ' + s.id + ' |';
  });
  return [
    '# ' + episode.title + ' — timing sheet',
    '',
    'Read against the locked picture. Each line starts at the time below.',
    '',
    '| Line | In | Out | Length | Scene |',
    '|---|---|---|---|---|',
    ...rows,
    ''
  ].join('\n');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/video/06-timing.cjs`
Expected: `PASS 06-timing`

- [ ] **Step 5: Commit**

```bash
git add tools/video/engine/timing.mjs tests/video/06-timing.cjs
git commit -m "feat(video): round cumulative frame boundaries so sync cannot drift"
```

---

### Task 7: Render one scene to one MP4

**Files:**
- Create: `tools/video/engine/render.mjs`
- Test: `tests/video/07-render.cjs`

**Interfaces:**
- Consumes: `stage.html`, `EVStage.init`/`renderFrame`, a planned scene from Task 6.
- Produces: `renderScene({ scene, episode, outFile, artFiles, alpha }) -> Promise<{ file, frames }>`, and `openStage(episode, artFiles) -> { page, browser, errors, close }` so `build.mjs` can render many scenes in one browser. `artFiles` is an ORDERED list, because an episode's generated assets must load before the art module that reads them.

- [ ] **Step 1: Write the failing test**

Create `tests/video/07-render.cjs`:

```js
// One scene in, one MP4 out, with the frame count the plan asked for. And the
// failure that matters: if ffmpeg dies part-way, the build must fail. A
// truncated MP4 plays its first half perfectly and looks like a success.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/ev-landing/ev-landing-main';
const OUT = path.join(ROOT, 'tools/video/build/_test');

function probe(file, entries) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', entries, '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' });
  return out.trim().split('\n');
}

(async function () {
  fs.mkdirSync(OUT, { recursive: true });
  const { renderScene } = await import('file:///' + ROOT + '/tools/video/engine/render.mjs');

  const episode = { id: 'test', title: 'Test', accent: '#FFD426', fps: 30, width: 640, height: 360 };
  const scene = {
    id: 'fx', type: 'stage', vo: 'L001', dur: 1, frames: 30, startFrame: 0,
    accent: '#FFD426', headline: 'Hello',
    cast: [{ at: [0.5, 0.85], anim: 'stroll', tone: 0, scale: 0.6, path: [[0.3, 0.85], [0.7, 0.85]] }]
  };

  const file = path.join(OUT, 'scene.mp4');
  const res = await renderScene({ scene, episode, outFile: file });

  assert.ok(fs.existsSync(file), 'the MP4 must exist');
  assert.strictEqual(res.frames, 30, 'the renderer must emit exactly the planned frame count');
  const [w, h, nb] = probe(file, 'stream=width,height,nb_frames');
  assert.strictEqual(Number(w), 640, 'width');
  assert.strictEqual(Number(h), 360, 'height');
  assert.strictEqual(Number(nb), 30, 'the file must hold 30 frames, got ' + nb);

  // No PNG may be left behind. Frames are piped, never written.
  const strays = fs.readdirSync(OUT).filter(f => /\.png$/i.test(f));
  assert.deepStrictEqual(strays, [], 'no PNG frames may be written to disk: ' + strays.join(', '));

  // An ffmpeg that cannot possibly succeed must surface as a rejection.
  let failed = false;
  try {
    await renderScene({ scene, episode, outFile: path.join(OUT, 'nope.mp4'),
      ffmpegArgs: ['-c:v', 'definitely-not-a-codec'] });
  } catch (e) { failed = true; }
  assert.ok(failed, 'a failing ffmpeg must reject, not resolve with a truncated file');

  console.log('PASS 07-render');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/video/07-render.cjs`
Expected: FAIL — `render.mjs` does not exist.

- [ ] **Step 3: Implement the renderer**

Create `tools/video/engine/render.mjs`:

```js
// One scene -> one MP4. Frames are piped straight into ffmpeg's stdin and
// never written to disk: a ten-minute episode is 18,000 PNGs, which is several
// gigabytes as files and nothing at all as a pipe.

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGE_URL = 'file:///' + path.join(HERE, 'stage.html').replace(/\\/g, '/');

function playwright() {
  try { return require('playwright'); }
  catch {
    const alt = 'C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules';
    return require(path.join(alt, 'playwright'));
  }
}

// stdin.write returns false when the kernel buffer is full. Ignoring that and
// pushing 18,000 PNG buffers at it is how a render quietly eats all the memory
// on the machine.
function writeAsync(stream, buf) {
  return new Promise((resolve, reject) => {
    const onErr = e => { stream.off('drain', onDrain); reject(e); };
    const onDrain = () => { stream.off('error', onErr); resolve(); };
    stream.once('error', onErr);
    if (stream.write(buf)) { stream.off('error', onErr); resolve(); }
    else stream.once('drain', onDrain);
  });
}

export async function openStage(episode, artFiles = []) {
  const { chromium } = playwright();
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: episode.width, height: episode.height },
    deviceScaleFactor: 1
  });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(STAGE_URL);
  for (const f of artFiles) await page.addScriptTag({ path: f });
  if (artFiles.length) {
    // An episode's art may need an image decoded before the first frame. If it
    // exposes a promise as window.EVArt.ready, wait for it -- otherwise frame 0
    // renders against a half-loaded asset and nothing in the output says so.
    await page.evaluate(() => (window.EVArt && window.EVArt.ready) || null);
  }
  await page.evaluate(([w, h]) => window.EVStage.init(w, h), [episode.width, episode.height]);
  return {
    page, browser, errors,
    close: () => browser.close()
  };
}

export async function renderScene({ scene, episode, outFile, artFiles = [], alpha = false,
                                    stage = null, ffmpegArgs = null }) {
  await mkdir(path.dirname(outFile), { recursive: true });
  const own = !stage;
  const st = stage || await openStage(episode, artFiles);
  const fps = episode.fps || 30;
  const frames = scene.frames || Math.round(scene.dur * fps);

  const codec = ffmpegArgs ? ffmpegArgs : (alpha
    ? ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le']
    : ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p']);

  const ff = spawn('ffmpeg', ['-y', '-v', 'error',
    '-f', 'image2pipe', '-vcodec', 'png', '-framerate', String(fps), '-i', '-',
    ...codec, '-r', String(fps), outFile], { stdio: ['pipe', 'ignore', 'pipe'] });

  let ffErr = '';
  ff.stderr.on('data', d => { ffErr += d; });
  const done = new Promise((resolve, reject) => {
    ff.on('error', reject);
    ff.on('close', code => code === 0
      ? resolve()
      : reject(new Error('ffmpeg exited ' + code + ' on scene ' + scene.id + ': ' + ffErr.slice(-2000))));
  });
  // A dead ffmpeg makes every later write throw EPIPE; swallow that so the
  // close handler above reports the real reason instead.
  ff.stdin.on('error', () => {});

  const withAlpha = alpha ? { ...scene, alpha: true } : scene;
  try {
    for (let i = 0; i < frames; i++) {
      if (ff.exitCode !== null) break;
      const t = i / fps;
      await st.page.evaluate(([s, tt]) => window.EVStage.renderFrame(s, tt), [withAlpha, t]);
      const buf = await st.page.screenshot({ type: 'png', omitBackground: alpha });
      await writeAsync(ff.stdin, buf);
    }
    ff.stdin.end();
    await done;
  } finally {
    if (own) await st.close();
  }

  if (st.errors.length) {
    throw new Error('page errors while rendering ' + scene.id + ': ' + st.errors.join('; '));
  }
  return { file: outFile, frames };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/video/07-render.cjs`
Expected: `PASS 07-render`

- [ ] **Step 5: Look at the output**

```bash
ffmpeg -y -v error -i "tools/video/build/_test/scene.mp4" -vf "select=eq(n\,15)" -frames:v 1 "tools/video/build/_test/mid.png"
```

Open `tools/video/build/_test/mid.png` and confirm a Bobit is visible, standing on the ground, with "Hello" above it. Green tests do not prove a figure is on screen.

- [ ] **Step 6: Commit**

```bash
git add tools/video/engine/render.mjs tests/video/07-render.cjs
git commit -m "feat(video): pipe frames into ffmpeg, and fail loudly when ffmpeg does"
```

---

### Task 8: The build — cache, join, mux, timing sheet, contact sheet

**Files:**
- Create: `tools/video/engine/build.mjs`
- Test: `tests/video/08-build.cjs`

**Interfaces:**
- Consumes: `parseScript`, `speak`, `loadTimings`, `planFrames`, `timingSheet`, `openStage`, `renderScene`.
- Produces: a CLI — `node tools/video/engine/build.mjs <episodeDir> [--voice] [--alpha] [--only <sceneId>]` — and `buildEpisode(episodeDir, opts) -> Promise<{ silent, scratch, sheet, contact }>`.

- [ ] **Step 1: Write the failing test**

Create `tests/video/08-build.cjs`:

```js
// The orchestrator, run against a tiny two-scene fixture episode with a
// pre-made timings.json so the test needs no network and no speech engine.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/ev-landing/ev-landing-main';
const EP = path.join(ROOT, 'tools/video/build/_epfixture');
const OUT = path.join(ROOT, 'tools/video/build/_epfixture-out');

function probe(file, entries) {
  return execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', entries, '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' }).trim();
}

(async function () {
  fs.rmSync(EP, { recursive: true, force: true });
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(EP, { recursive: true });

  fs.writeFileSync(path.join(EP, 'episode.mjs'), `
export default {
  id: 'epfixture', title: 'Fixture', accent: '#FFD426',
  fps: 30, width: 320, height: 180,
  scenes: [
    { id: 'a', type: 'title', vo: 'L001', headline: 'One' },
    { id: 'b', type: 'stage', vo: 'L002', headline: 'Two',
      cast: [{ at: [0.5, 0.85], anim: 'present', tone: 0, scale: 0.35 }] }
  ]
};
`, 'utf8');

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'timings.json'), JSON.stringify({
    gap: 0.2,
    lines: [
      { id: 'L001', text: 'One.', direction: '', start: 0, dur: 0.6 },
      { id: 'L002', text: 'Two.', direction: '', start: 0.8, dur: 0.6 }
    ],
    total: 1.6
  }), 'utf8');

  const { buildEpisode } = await import('file:///' + ROOT + '/tools/video/engine/build.mjs');
  const r1 = await buildEpisode(EP, { outDir: OUT, voice: false });

  assert.ok(fs.existsSync(r1.silent), 'the silent MP4 must exist');
  assert.ok(fs.existsSync(r1.sheet), 'the timing sheet must exist');
  assert.ok(fs.existsSync(r1.contact), 'the contact sheet must exist');

  // The joined picture is as long as the planned frames, not longer.
  const nb = Number(probe(r1.silent, 'stream=nb_frames'));
  assert.strictEqual(nb, Math.round(1.6 * 30), 'joined frames, got ' + nb);

  // The contact sheet holds one frame per scene.
  const cw = Number(probe(r1.contact, 'stream=width'));
  assert.ok(cw >= 320 * 2, 'the contact sheet must be at least two scenes wide, got ' + cw);

  // The timing sheet names every line with an in-point.
  const sheet = fs.readFileSync(r1.sheet, 'utf8');
  assert.ok(/L001/.test(sheet) && /L002/.test(sheet), 'every line appears in the sheet');
  assert.ok(/00:00\.00/.test(sheet), 'the first line starts at zero');

  // Caching: a second build with nothing changed re-renders no scene.
  const before = fs.statSync(path.join(OUT, 'scenes', 'b.mp4')).mtimeMs;
  const r2 = await buildEpisode(EP, { outDir: OUT, voice: false });
  const after = fs.statSync(path.join(OUT, 'scenes', 'b.mp4')).mtimeMs;
  assert.strictEqual(after, before, 'an unchanged scene must not re-render');
  assert.strictEqual(r2.rendered.length, 0, 're-render list must be empty, got ' + r2.rendered);

  // Change one scene; only that one re-renders.
  const src = fs.readFileSync(path.join(EP, 'episode.mjs'), 'utf8');
  fs.writeFileSync(path.join(EP, 'episode.mjs'), src.replace("headline: 'Two'", "headline: 'Dos'"), 'utf8');
  const r3 = await buildEpisode(EP, { outDir: OUT, voice: false });
  assert.deepStrictEqual(r3.rendered, ['b'], 'only the changed scene re-renders, got ' + r3.rendered);

  console.log('PASS 08-build');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/video/08-build.cjs`
Expected: FAIL — `build.mjs` does not exist.

- [ ] **Step 3: Implement the orchestrator**

Create `tools/video/engine/build.mjs`:

```js
// Orchestrates an episode: measure the voice, plan the frames, render the
// scenes that changed, join them, mux the scratch track, and write the two
// things a human reads — the timing sheet and the contact sheet.

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseScript } from './script.mjs';
import { speak, loadTimings } from './voice.mjs';
import { planFrames, timingSheet } from './timing.mjs';
import { openStage, renderScene } from './render.mjs';

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d; });
    p.on('error', reject);
    p.on('close', c => c === 0 ? resolve() : reject(new Error(cmd + ' exited ' + c + ': ' + err.slice(-2000))));
  });
}

function sceneHash(scene, episode) {
  return createHash('sha1')
    .update(JSON.stringify({ scene, w: episode.width, h: episode.height, fps: episode.fps }))
    .digest('hex').slice(0, 16);
}

export async function buildEpisode(episodeDir, opts = {}) {
  const episodeFile = path.join(episodeDir, 'episode.mjs');
  // Cache-bust the module so a rebuild in one process sees an edited episode.
  const mod = await import(pathToFileURL(episodeFile).href + '?v=' + Date.now());
  const episode = mod.default;

  const outDir = opts.outDir || path.join(episodeDir, '..', '..', 'build', episode.id);
  const sceneDir = path.join(outDir, 'scenes');
  await mkdir(sceneDir, { recursive: true });

  if (opts.voice) {
    const lines = parseScript(await readFile(path.join(episodeDir, 'script.md'), 'utf8'));
    await speak(lines, outDir, opts);
  }
  const timings = await loadTimings(outDir);
  const planned = planFrames(episode, timings);

  // Load order matters: screen.js defines the data URIs that art.js reads at
  // registration time, so it must come first. An explicit list beats globbing,
  // which would silently depend on alphabetical ordering.
  const artFiles = ['screen.js', 'art.js']
    .map(f => path.join(episodeDir, f))
    .filter(existsSync);

  // Which scenes need rendering: the ones whose hash has no file.
  const wanted = planned.filter(s => !opts.only || s.id === opts.only);
  const todo = [];
  for (const s of wanted) {
    const h = sceneHash(s, episode);
    const hashFile = path.join(sceneDir, s.id + '.hash');
    const mp4 = path.join(sceneDir, s.id + '.mp4');
    const have = existsSync(mp4) && existsSync(hashFile) &&
      (await readFile(hashFile, 'utf8')).trim() === h;
    if (!have) todo.push({ scene: s, hash: h, mp4, hashFile });
  }

  const rendered = [];
  if (todo.length) {
    const stage = await openStage(episode, artFiles);
    try {
      for (const job of todo) {
        await renderScene({ scene: job.scene, episode, outFile: job.mp4, stage, alpha: !!opts.alpha });
        await writeFile(job.hashFile, job.hash, 'utf8');
        rendered.push(job.scene.id);
        console.log('rendered', job.scene.id, job.scene.frames, 'frames');
      }
    } finally { await stage.close(); }
  }

  // Join.
  const listFile = path.join(outDir, '_scenes.txt');
  await writeFile(listFile,
    planned.map(s => "file '" + path.join(sceneDir, s.id + '.mp4').replace(/\\/g, '/') + "'").join('\n') + '\n',
    'utf8');
  const silent = path.join(outDir, episode.id + '-silent.mp4');
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', silent]);

  // Mux the scratch voice, when there is one.
  let scratch = null;
  const vo = path.join(outDir, 'vo.wav');
  if (existsSync(vo)) {
    scratch = path.join(outDir, episode.id + '-scratch.mp4');
    await run('ffmpeg', ['-y', '-v', 'error', '-i', silent, '-i', vo,
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', scratch]);
  }

  // The timing sheet.
  const sheet = path.join(outDir, episode.id + '-timing.md');
  await writeFile(sheet, timingSheet(episode, planned), 'utf8');

  // The contact sheet: one frame per scene, in a grid. This is the artifact a
  // human looks at. Green tests do not prove a Bobit is visible, on the ground
  // or clear of the text.
  const contact = path.join(outDir, episode.id + '-contact.png');
  const cols = Math.min(4, planned.length);
  const stills = path.join(outDir, '_stills');
  await rm(stills, { recursive: true, force: true });
  await mkdir(stills, { recursive: true });
  for (let i = 0; i < planned.length; i++) {
    const s = planned[i];
    await run('ffmpeg', ['-y', '-v', 'error', '-i', path.join(sceneDir, s.id + '.mp4'),
      '-vf', 'select=eq(n\\,' + Math.floor(s.frames / 2) + ')', '-frames:v', '1',
      path.join(stills, String(i).padStart(3, '0') + '.png')]);
  }
  const names = (await readdir(stills)).sort();
  await run('ffmpeg', ['-y', '-v', 'error', '-pattern_type', 'sequence',
    '-i', path.join(stills, '%03d.png'),
    '-filter_complex', 'scale=' + episode.width + ':' + episode.height +
      ',tile=' + cols + 'x' + Math.ceil(names.length / cols) + ':padding=8:color=0x222228',
    '-frames:v', '1', contact]);

  return { silent, scratch, sheet, contact, rendered, planned };
}

// CLI
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2];
  if (!dir) { console.error('usage: build.mjs <episodeDir> [--voice] [--alpha] [--only <id>]'); process.exit(2); }
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
  buildEpisode(dir, {
    voice: process.argv.includes('--voice'),
    alpha: process.argv.includes('--alpha'),
    only
  }).then(r => {
    console.log('silent  ', r.silent);
    if (r.scratch) console.log('scratch ', r.scratch);
    console.log('timing  ', r.sheet);
    console.log('contact ', r.contact, '  <- LOOK AT THIS BEFORE CALLING IT DONE');
  }).catch(e => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/video/08-build.cjs`
Expected: `PASS 08-build`

- [ ] **Step 5: Commit**

```bash
git add tools/video/engine/build.mjs tests/video/08-build.cjs
git commit -m "feat(video): build an episode, cache by scene, and print a contact sheet to look at"
```

---

### Task 9: The alpha export path

**Files:**
- Test: `tests/video/09-alpha.cjs`

**Interfaces:**
- Consumes: `renderScene({ alpha: true })` from Task 7, which already passes `omitBackground` to the screenshot and selects the ProRes 4444 codec.

**Why this task exists.** This is the fallback Chris asked to keep open: if the finished-episode output disappoints, the same engine hands him per-scene clips with transparency to cut in Resolve, with no rebuild. An untested fallback is not a fallback.

- [ ] **Step 1: Write the failing test**

Create `tests/video/09-alpha.cjs`:

```js
// The Resolve fallback: a single scene exported with a real alpha channel.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = 'C:/ev-landing/ev-landing-main';
const OUT = path.join(ROOT, 'tools/video/build/_alpha');

(async function () {
  fs.mkdirSync(OUT, { recursive: true });
  const { renderScene } = await import('file:///' + ROOT + '/tools/video/engine/render.mjs');

  const episode = { id: 'alpha', fps: 30, width: 320, height: 180 };
  const scene = {
    id: 'a', type: 'stage', vo: 'L001', dur: 0.5, frames: 15, accent: '#FFD426',
    cast: [{ at: [0.5, 0.9], anim: 'present', tone: 0, scale: 0.35 }]
  };

  const file = path.join(OUT, 'a.mov');
  await renderScene({ scene, episode, outFile: file, alpha: true });

  const pix = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=pix_fmt', '-of', 'default=nw=1:nk=1', file],
    { encoding: 'utf8' }).trim();
  assert.strictEqual(pix, 'yuva444p10le', 'the export must carry an alpha channel, got ' + pix);

  // And the alpha must actually be transparent somewhere — a file can carry an
  // alpha plane that is opaque everywhere, which is useless in a Resolve cut.
  const png = path.join(OUT, 'a.png');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', file, '-frames:v', '1', png]);
  // metadata=print writes to STDERR, so execFileSync's return value (stdout)
  // would be empty and this would pass or fail for the wrong reason.
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', png,
    '-vf', 'alphaextract,signalstats,metadata=print:key=lavfi.signalstats.YMIN',
    '-f', 'null', '-'], { encoding: 'utf8' });
  const report = (r.stdout || '') + (r.stderr || '');
  assert.ok(/YMIN=0(\b|\.)/.test(report),
    'some pixel must be fully transparent; alphaextract reported: ' + report.slice(-300));

  console.log('PASS 09-alpha');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
```

- [ ] **Step 2: Run the test**

Run: `node tests/video/09-alpha.cjs`
Expected: this may already PASS from Task 7's implementation. If it fails on `pix_fmt`, confirm this ffmpeg build has `prores_ks` with `ffmpeg -hide_banner -encoders | grep prores`. If it fails on the transparency check, the cause is `scene.alpha` not reaching `renderFrame` — verify `renderScene` spreads `{ ...scene, alpha: true }` as written in Task 7.

- [ ] **Step 3: Commit**

```bash
git add tests/video/09-alpha.cjs
git commit -m "test(video): prove the transparent per-scene export Resolve would need"
```

---

### Task 10: Two new Bobit poses — `tap` and `showTo`

**Files:**
- Modify: `ev-anim-extras.js` (repo root, **LF line endings — preserve them**)
- Modify: `C:/Strategy/tools/purpose-map/ev-anim-extras.js` (a byte-identical copy; the Purpose map build reads its own)
- Test: `tests/video/10-poses.cjs`

**Interfaces:**
- Produces: `LeremyRig.ANIMATIONS.tap` and `LeremyRig.ANIMATIONS.showTo`, each `{ label, mood, frame(t) }`, registered into `ANIMATIONS` and pushed onto `ORDER` by the existing loop at the end of the file.

**Note on the duplicate.** `ev-anim-extras.js` exists twice, byte-identical: once at the repo root and once in `C:/Strategy/tools/purpose-map/`. The Purpose map's `build.js` inlines the Strategy copy, so a pose added only to the root copy will not reach the map. Update both. (Making the map build read the root copy, as it already does for `leremy-rig.js`, is a worthwhile separate change and is out of scope here.)

- [ ] **Step 1: Write the failing test**

Create `tests/video/10-poses.cjs`:

```js
// New poses must be registered, must animate, and must not produce NaN joints
// — a NaN angle draws nothing at all and reads like a missing figure.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/tools/video/engine/stage.html';

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);

  const probe = await page.evaluate(() => {
    const R = window.LeremyRig;
    const out = {};
    for (const name of ['tap', 'showTo']) {
      const a = R.ANIMATIONS[name];
      if (!a) { out[name] = { missing: true }; continue; }
      const finite = [];
      const samples = [];
      for (let i = 0; i <= 40; i++) {
        const t = i * 0.1;
        const p = a.frame(t);
        const j = R.computePose(p, R.CFG, { x: 0, y: 0 });
        const vals = Object.values(j).flatMap(v => [v.x, v.y]);
        finite.push(vals.every(Number.isFinite));
        samples.push(Math.round(j.hR.x) + ',' + Math.round(j.hR.y));
      }
      out[name] = {
        missing: false,
        label: a.label,
        allFinite: finite.every(Boolean),
        distinct: new Set(samples).size,
        inOrder: R.ORDER.indexOf(name) >= 0
      };
    }
    return out;
  });

  for (const name of ['tap', 'showTo']) {
    const p = probe[name];
    assert.ok(!p.missing, name + ' must be registered in ANIMATIONS');
    assert.ok(p.label, name + ' must carry a label for the rig browser');
    assert.ok(p.allFinite, name + ' must produce finite joints at every sampled time');
    assert.ok(p.distinct > 3, name + ' must actually animate; got ' + p.distinct + ' distinct hand positions');
    assert.ok(p.inOrder, name + ' must be pushed onto ORDER so the pose browser lists it');
  }

  await browser.close();
  console.log('PASS 10-poses');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/video/10-poses.cjs`
Expected: FAIL — `tap` is missing.

- [ ] **Step 3: Add the poses**

In `ev-anim-extras.js`, inside the `EXTRAS` object, after `offer`, add:

```js
    // Thumbing a phone or tapping through a questionnaire. The off hand holds
    // the device (pair it with prop {phone:true}); the near hand taps.
    tap: { label: "Tap", mood: "answering, one at a time", frame: function (t) {
      var p = Object.assign({}, base.frame(t));
      var s = osc(t, 1.25);
      p.armLU = 46;  p.armLF = -118;              // off hand holds the phone up
      p.armRU = 40 + s * 2;  p.armRF = -104 + s * 9;  // near hand taps at it
      p.headTilt = 16;
      p.hunch = (p.hunch || 0) + 3;
      return p;
    } },
    // Presenting a chart standing beside the figure: near arm swept out and
    // level, head turned to what it is showing. Slower than `offer`.
    showTo: { label: "Show to", mood: "look at this with me", frame: function (t) {
      var p = Object.assign({}, base.frame(t));
      var s = osc(t, 0.38);
      p.armRU = 96 + s * 4;  p.armRF = 74 + s * 5;
      p.armLU = 8;  p.armLF = 14;
      p.headTilt = -13 + s * 2;
      p.lean = (p.lean || 0) + 2;
      return p;
    } },
```

- [ ] **Step 4: Copy to the Strategy build's copy**

```bash
cp "C:/ev-landing/ev-landing-main/ev-anim-extras.js" "C:/Strategy/tools/purpose-map/ev-anim-extras.js"
diff "C:/ev-landing/ev-landing-main/ev-anim-extras.js" "C:/Strategy/tools/purpose-map/ev-anim-extras.js" && echo IDENTICAL
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node tests/video/10-poses.cjs`
Expected: `PASS 10-poses`

- [ ] **Step 6: Look at the poses**

```bash
node -e "
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:900,height:400}});
  await p.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await p.goto('file:///C:/ev-landing/ev-landing-main/tools/video/engine/stage.html');
  await p.evaluate(([w,h])=>window.EVStage.init(w,h),[900,400]);
  await p.evaluate(()=>window.EVStage.renderFrame({id:'poses',type:'stage',dur:2,accent:'#FFD426',
    cast:[{at:[0.3,0.92],anim:'tap',tone:0,scale:0.8,prop:{phone:true}},
          {at:[0.7,0.92],anim:'showTo',tone:2,scale:0.8}]},0.9));
  await p.screenshot({path:'tools/video/build/_poses.png'});
  await b.close();
})();
"
```

Open `tools/video/build/_poses.png`. Confirm the tapping figure is holding a phone and reaching for it, and the presenting figure's arm is level and sweeping to its own right. Adjust the angles until it reads. This is the step the test cannot do for you.

- [ ] **Step 7: Run the FULL repo suite, detached**

Per this repo's standing rule, every `.cjs` under `tests/*/` runs before a commit that touches shared code — and `ev-anim-extras.js` is shared with the landing page and the Purpose map.

```bash
cd "C:/ev-landing/ev-landing-main" && for f in tests/*/*.cjs; do echo "== $f"; node "$f"; echo "exit $?"; done > tools/video/build/_suite.log 2>&1; echo done
```

Run this with `run_in_background: true`. It takes roughly 35 minutes. Do not pipe it through `head` or `tail` — that buffers the whole run and reads as a hang. When the notification arrives, read the log.

Expected: every file exits 0. The run rewrites about 20 tracked PNGs under `screenshots/` as a side effect; that is artifacts, not work, and must not be staged.

- [ ] **Step 8: Commit**

```bash
git add ev-anim-extras.js tests/video/10-poses.cjs
git commit -m "feat(bobits): two poses for the video series, tap and showTo"
```

Then, in the Strategy repo: `cd C:/Strategy && git add tools/purpose-map/ev-anim-extras.js && git commit -m "feat(map): pick up the tap and showTo poses"`

---

### Task 11: Episode 1 — the script

**Files:**
- Create: `tools/video/episodes/compass/script.md`

**Interfaces:**
- Produces: line ids `L001`…`L0NN` that Task 13's `episode.mjs` references by `vo`.

- [ ] **Step 1: Write the script**

Create `tools/video/episodes/compass/script.md`. Follow the nine chapters in the spec. Target six to eight minutes of narration — roughly 900 to 1,200 words. Source material: the map node at `What › Empowered.Vote › Civic Platform split across 3 Pillars › Inform Pillar › Empowered Compass` in `C:/Strategy/tools/purpose-map/map-data.json`, whose `Inspiration`, `Goal` and `Summary` children are the why, how and what.

Rules for the writing:

- One `## Lnnn` block is one scene. Keep each to one or two sentences. A block that needs three sentences is two scenes.
- Every block carries a `> Direction:` note naming what the Bobits do while it is read. That note is the brief for Task 13.
- Collaborator-first register: our own vocabulary is allowed — Pillars, sFacts, Empowered Compass — but define each term the first time it appears.
- It must also work for a stranger who found the video on its own. Nothing may depend on having watched another episode.
- The close names `compass.empowered.vote` and the formula `sFacts + sValues = sSolutions`.

The opening blocks, as a worked example of the format and register:

```markdown
# Empowered Compass — episode script

## L001
> Direction: a Bobit alone at a voting booth, a tall column of unfamiliar names beside it. `confused`.
Here is a thing that happens to almost everyone. You get to the booth, you work your way down the ballot, and somewhere past the top of it the names stop meaning anything.

## L002
> Direction: the same Bobit, shoulders dropping. `spent`.
You are not uninformed. You are out of time. There were forty races and you had a lunch break.

## L003
> Direction: cut to the title card on Inform yellow.
This is Empowered Compass, and this is the problem it is built for.
```

- [ ] **Step 2: Read it aloud and time it**

Read the whole script aloud at a normal pace with a stopwatch. If it runs under five minutes or over nine, cut or expand before spending a render on it.

- [ ] **Step 3: Generate the voice and check the measured length**

```bash
cd "C:/ev-landing/ev-landing-main"
node -e "
Promise.all([import('./tools/video/engine/script.mjs'), import('./tools/video/engine/voice.mjs'), import('node:fs/promises')])
 .then(async ([S, V, fs]) => {
   const lines = S.parseScript(await fs.readFile('tools/video/episodes/compass/script.md','utf8'));
   const t = await V.speak(lines, 'tools/video/build/compass');
   console.log(lines.length, 'lines,', (t.total/60).toFixed(2), 'minutes');
 });
"
```

Expected: between 5 and 9 minutes. Listen to `tools/video/build/compass/vo.wav` end to end.

- [ ] **Step 4: Commit**

```bash
git add tools/video/episodes/compass/script.md
git commit -m "content(compass): the episode one script, with a direction note per line"
```

---

### Task 12: Episode 1 — the compass art

**Files:**
- Create: `tools/video/episodes/compass/grab-screen.mjs`
- Create: `tools/video/episodes/compass/screen.js` (generated by the above; commit it)
- Create: `tools/video/episodes/compass/art.js`

**Interfaces:**
- Produces: `window.EVArt.{ drawSpokeGrowing, drawCompassBuilding, drawCompassOverlay, drawPillarFormula, drawLiveScreen }`, each `function (ctx, t, W, H, scene)`, plus `window.EVArt.ready`, a promise the renderer awaits before frame 0.

**What each one shows:**

| Function | Chapter | Behaviour over `t` |
|---|---|---|
| `drawSpokeGrowing` | 4 | One labelled axis from centre. A dot slides out along it as `t` rises, and a caption names the issue. Shows that distance means strength of feeling. |
| `drawCompassBuilding` | 5 | Six axes. One dot appears per axis in turn, then the polygon joining them draws edge by edge and fills at low opacity. |
| `drawCompassOverlay` | 6 | The viewer's finished polygon holds still. A second polygon in the accent colour fades in over it. Where they agree, the overlap is filled; where they do not, the gap is left dark. |
| `drawPillarFormula` | 7 | `sFacts + sValues = sSolutions`, with the three pillar blocks in Inform yellow, Connect teal and Empower red appearing in turn. |
| `drawLiveScreen` | 8 | A still of the real compass.empowered.vote, fading up inside a rounded frame. This is the spec's few seconds of proof that the product exists. |

- [ ] **Step 1: Capture the live Compass screen**

Create `tools/video/episodes/compass/grab-screen.mjs`:

```js
// Grabs one still of the live Compass app and writes it as a data: URI.
//
// A data URI, not a .png next to the page, on purpose. An image loaded through
// img.src under file:// taints the canvas permanently, and from then on every
// getImageData on it throws -- which would break the pixel assertions in
// tests/video/03-cast.cjs and 04-art.cjs the moment this episode is rendered.
// A data: URI does not taint. This is a documented trap in this repo.

import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL_ = 'https://compass.empowered.vote/';

const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => localStorage.setItem('ev:color-scheme', 'dark'));
await page.goto(URL_, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);                 // let any chart finish drawing
const buf = await page.screenshot({ type: 'png' });
await browser.close();

await writeFile(path.join(HERE, 'screen.js'),
  '// GENERATED by grab-screen.mjs. Re-run it to refresh the still.\n' +
  'window.EVCompassShot = "data:image/png;base64,' + buf.toString('base64') + '";\n',
  'utf8');
console.log('wrote screen.js,', Math.round(buf.length / 1024), 'KB');
```

Run it:

```bash
cd "C:/ev-landing/ev-landing-main"
node tools/video/episodes/compass/grab-screen.mjs
```

Expected: `screen.js` is written, a few hundred KB. Open the data URI in a browser to confirm the capture shows a calibrated compass and not a loading state or a cookie banner. If it does, add a `page.click` for the banner before the screenshot and re-run.

- [ ] **Step 2: Write the art module**

Create `tools/video/episodes/compass/art.js`. Constraints that apply to every function in it:

- Each must be a **pure function of `(t, scene)`**. No module-level mutable state, or Task 2's determinism guarantee is void for this episode.
- Use `scene.accent` for the accent colour, never a literal, so the file still works if the episode's pillar changes.
- Size everything from `W` and `H`, never in absolute pixels, so the same art renders correctly in the 320x180 test fixtures and at 1920x1080.
- **Leave the lower third clear of artwork.** The cast draws on top, and a Bobit standing in front of the graph is the point of chapter 6.

Here is the module skeleton with `drawSpokeGrowing` and `drawLiveScreen` written out, as the worked pattern for the other three:

```js
// Episode 1 art: the compass, drawn rather than screen-recorded so it does not
// age with the real UI. Every function is a pure function of (t, scene).
(function () {
  "use strict";
  var FG = "#F2F2F2", MUTED = "#9A9AA0", GRID = "#2E2E36";

  // The still of the live app. Decoding is async, so the renderer is told to
  // wait via window.EVArt.ready before it asks for frame 0.
  var shot = new Image();
  var shotReady = new Promise(function (res) { shot.onload = res; shot.onerror = res; });
  if (window.EVCompassShot) shot.src = window.EVCompassShot;

  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function fade(t, t0, dur) { return ease((t - t0) / dur); }

  // Geometry shared by every compass drawing: centre, radius, six axes. Kept
  // above the lower third so a Bobit can stand in front of it.
  function geom(W, H) {
    return { cx: W * 0.62, cy: H * 0.42, r: Math.min(W, H) * 0.30, n: 6 };
  }
  function axisPoint(g, i, frac) {
    var a = -Math.PI / 2 + (i / g.n) * Math.PI * 2;
    return { x: g.cx + Math.cos(a) * g.r * frac, y: g.cy + Math.sin(a) * g.r * frac };
  }

  function drawSpokeGrowing(ctx, t, W, H, scene) {
    var g = geom(W, H);
    var accent = scene.accent || "#FFD426";

    // the axis itself
    ctx.save();
    ctx.globalAlpha = fade(t, 0.1, 0.5);
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(1, H * 0.004);
    var tip = axisPoint(g, 0, 1);
    ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    ctx.restore();

    // tick marks, so "further out" reads as a scale and not a drift
    ctx.save();
    ctx.globalAlpha = fade(t, 0.5, 0.5) * 0.7;
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(1, H * 0.003);
    for (var k = 1; k <= 4; k++) {
      var p = axisPoint(g, 0, k / 4);
      ctx.beginPath();
      ctx.moveTo(p.x - W * 0.012, p.y); ctx.lineTo(p.x + W * 0.012, p.y);
      ctx.stroke();
    }
    ctx.restore();

    // the dot sliding out
    var travel = ease((t - 1.0) / 2.2) * 0.85;
    if (travel > 0) {
      var d = axisPoint(g, 0, travel);
      ctx.save();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(d.x, d.y, H * 0.016, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(d.x, d.y);
      ctx.strokeStyle = accent; ctx.lineWidth = H * 0.008; ctx.stroke();
      ctx.restore();
    }

    // the label
    ctx.save();
    ctx.globalAlpha = fade(t, 0.3, 0.5);
    ctx.textAlign = "center";
    ctx.fillStyle = FG;
    ctx.font = "600 " + Math.round(H * 0.042) + "px " + '"Figtree", "Segoe UI", system-ui, sans-serif';
    ctx.fillText(scene.issue || "Housing", g.cx, g.cy - g.r - H * 0.05);
    ctx.fillStyle = MUTED;
    ctx.font = "500 " + Math.round(H * 0.030) + "px " + '"Figtree", "Segoe UI", system-ui, sans-serif';
    ctx.fillText("how strongly you feel", g.cx, g.cy - g.r - H * 0.012);
    ctx.restore();
  }

  function drawLiveScreen(ctx, t, W, H, scene) {
    if (!shot.complete || !shot.naturalWidth) return;
    var a = fade(t, 0.2, 0.8);
    var pad = W * 0.10;
    var boxW = W - pad * 2;
    var boxH = boxW * (shot.naturalHeight / shot.naturalWidth);
    var x = pad, y = H * 0.14;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = scene.accent || "#FFD426";
    ctx.lineWidth = Math.max(2, H * 0.005);
    ctx.strokeRect(x, y, boxW, boxH);
    ctx.drawImage(shot, x, y, boxW, boxH);
    ctx.restore();
  }

  // drawCompassBuilding, drawCompassOverlay and drawPillarFormula follow the
  // same shape: derive everything from (t, scene, W, H), reuse geom/axisPoint,
  // and keep the lower third empty.

  window.EVArt = Object.assign(window.EVArt || {}, {
    drawSpokeGrowing: drawSpokeGrowing,
    drawLiveScreen: drawLiveScreen
    // + drawCompassBuilding, drawCompassOverlay, drawPillarFormula
  });
  window.EVArt.ready = shotReady;
})();
```

- [ ] **Step 3: Look at every function across its whole span**

```bash
cd "C:/ev-landing/ev-landing-main"
node -e "
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:960,height:540}});
  await p.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await p.goto('file:///C:/ev-landing/ev-landing-main/tools/video/engine/stage.html');
  await p.addScriptTag({path:'tools/video/episodes/compass/screen.js'});
  await p.addScriptTag({path:'tools/video/episodes/compass/art.js'});
  await p.evaluate(()=>window.EVArt.ready);
  await p.evaluate(([w,h])=>window.EVStage.init(w,h),[960,540]);
  const fns=['drawSpokeGrowing','drawCompassBuilding','drawCompassOverlay','drawPillarFormula','drawLiveScreen'];
  for (const fn of fns) for (const t of [0.1,1.5,3.0,5.0]) {
    await p.evaluate(([f,tt])=>window.EVStage.renderFrame({id:f,type:'art',dur:6,accent:'#FFD426',art:f,cast:[]},tt),[fn,t]);
    await p.screenshot({path:'tools/video/build/_art-'+fn+'-'+t+'.png'});
  }
  await b.close();
})();
"
```

Open all twenty PNGs. Confirm each reads at a glance, the text is legible, nothing is clipped at the edges, and the lower third is clear. Fix and repeat until it reads. This is the step no test can do.

- [ ] **Step 4: Confirm the screen still does not taint the canvas**

The data URI exists so the pixel tests keep working. Prove it rather than trusting it:

```bash
node tests/video/03-cast.cjs && node tests/video/04-art.cjs
```

Expected: both PASS. If either now throws a `SecurityError` from `getImageData`, the still is being loaded by URL somewhere instead of as a data URI.

- [ ] **Step 5: Commit**

```bash
git add tools/video/episodes/compass/grab-screen.mjs tools/video/episodes/compass/screen.js tools/video/episodes/compass/art.js
git commit -m "feat(compass): the compass diagrams, drawn so they do not age with the UI"
```

### Task 13: Episode 1 — assemble, render, and deliver

**Files:**
- Create: `tools/video/episodes/compass/episode.mjs`
- Create: `tools/video/README.md`

Chapter 8 uses `{ type: 'art', art: 'drawLiveScreen' }` with a `hold` of about a second, so the real screen is on display long enough to register.

- [ ] **Step 1: Write the episode**

Create `tools/video/episodes/compass/episode.mjs`. Every `vo` must be a line id from Task 11's script, in order, with none skipped and none repeated. Every scene's content comes from that line's `> Direction:` note.

```js
// Episode 1 — Empowered Compass. Inform Pillar, so the accent is Inform yellow.
//
// Scene durations are NOT written here. They are measured from the voice track
// and filled in by timing.mjs. A scene's `hold` adds a deliberate pause AFTER
// its line, in seconds, for a moment that needs to breathe.
export default {
  id: 'compass',
  title: 'Empowered Compass',
  accent: '#FFD426',
  fps: 30,
  width: 1920,
  height: 1080,
  scenes: [
    { id: 'open-01', type: 'stage', vo: 'L001',
      headline: 'Who are these people?',
      cast: [{ at: [0.5, 0.86], anim: 'confused', tone: 0 }] },

    { id: 'open-02', type: 'stage', vo: 'L002',
      cast: [{ at: [0.5, 0.86], anim: 'spent', tone: 0 }] },

    { id: 'title', type: 'title', vo: 'L003', hold: 0.8,
      headline: 'Empowered Compass', sub: 'Inform Pillar' },

    // ... one scene per remaining line, following its direction note.
  ]
};
```

- [ ] **Step 2: Build the episode**

```bash
cd "C:/ev-landing/ev-landing-main"
node tools/video/engine/build.mjs tools/video/episodes/compass
```

Expected: every scene renders, then the silent MP4, the scratch MP4, the timing sheet and the contact sheet are all written under `tools/video/build/compass/`.

- [ ] **Step 3: Look at the contact sheet**

Open `tools/video/build/compass/compass-contact.png`. Check every tile: a Bobit is visible where one is cast, standing on the ground, not overlapping the headline, and the right colour for its tone. Fix any scene and rebuild — only the changed scene re-renders.

- [ ] **Step 4: Watch the scratch cut end to end**

Open `tools/video/build/compass/compass-scratch.mp4` and watch all of it. Specifically check the thing the spec flagged as least certain: **chapter 2, the Bobits sorted into labelled boxes.** It is the strongest idea in the episode if it lands and the most confusing if it does not. If it does not read, cut it and move its point into chapter 3 rather than shipping a confusing minute.

- [ ] **Step 5: Verify picture and voice have not drifted**

```bash
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "tools/video/build/compass/compass-silent.mp4"
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "tools/video/build/compass/vo.wav"
```

Expected: the two numbers differ by less than 0.04 seconds, one frame. If they do not, Task 6 has a bug — do not paper over it in the editor.

- [ ] **Step 6: Write the tool's README**

Create `tools/video/README.md` covering: the five steps and the command for each; the scene object shape with a worked example of all three types; the cast entry shape including that `at` is the **ground line**, not the pelvis; how to add a pose (in `ev-anim-extras.js`, and copy it to the Strategy map); how to export a scene with alpha for Resolve; how to refresh the live still with `grab-screen.mjs` and why it is a data URI; and a plain statement that nothing under `build/` may ever be committed, because `render.yaml` publishes the whole repo.

- [ ] **Step 7: Run the FULL repo suite, detached**

```bash
cd "C:/ev-landing/ev-landing-main" && for f in tests/*/*.cjs; do echo "== $f"; node "$f"; echo "exit $?"; done > tools/video/build/_suite.log 2>&1; echo done
```

Run with `run_in_background: true`. Roughly 35 minutes, plus the new `tests/video/` files. Wait for the notification, then read the log. Every file must exit 0.

- [ ] **Step 8: Commit**

```bash
git add tools/video/episodes/compass/episode.mjs tools/video/README.md
git commit -m "feat(compass): episode one assembled, rendered and checked against its voice"
```

- [ ] **Step 9: Deliver**

Give Chris the three files from `tools/video/build/compass/`:

- `compass-scratch.mp4` — picture plus the AI voice. He watches this to judge the episode.
- `compass-silent.mp4` — the same picture, no audio. This is what goes into Resolve.
- `compass-timing.md` — every line with its in and out time, to match pace when re-recording.

Say plainly which chapters you are least sure of, and remind him that if the finished-episode route disappoints, `build.mjs --alpha` gives him every scene as a transparent clip to cut himself.
