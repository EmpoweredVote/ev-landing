# The Bobit video pipeline

Turns a written script into a finished silent MP4 animated with the Bobits.
Chris records narration last, against a locked picture.

Design: `docs/superpowers/specs/2026-10-10-bobit-video-series-design.md`

## Nothing under `build/` is ever committed

`render.yaml` sets `staticPublishPath: ./`, so the whole repo is served
publicly and redeployed on every push. A committed MP4 ships on every deploy.
`tools/video/build/` is git-ignored; keep it that way.

## The five steps

```bash
# everything at once (first run on an episode)
node tools/video/engine/build.mjs tools/video/episodes/compass --voice

# after a copy change to the artwork or the scene list (reuses the voice)
node tools/video/engine/build.mjs tools/video/episodes/compass

# re-render exactly one scene
node tools/video/engine/build.mjs tools/video/episodes/compass --only spoke-one

# export every scene with a transparent background, to cut in Resolve
node tools/video/engine/build.mjs tools/video/episodes/compass --alpha
```

| Step | File | What it does |
|---|---|---|
| 1. Write | `script.md` | numbered narration lines, each with a direction note |
| 2. Voice | `engine/voice.mjs` | one audio file per line via `edge-tts`, measured with `ffprobe` |
| 3. Time | `engine/timing.mjs` | scene durations, in whole frames, from the measured voice |
| 4. Render | `engine/render.mjs` | one MP4 per scene; frames are piped to ffmpeg, never written |
| 5. Join | `engine/build.mjs` | concat, mux the scratch voice, timing sheet, contact sheet |

Output lands in `tools/video/build/<episode>/`:

- `<id>-scratch.mp4` — picture plus the AI voice. Watch this to judge the episode.
- `<id>-silent.mp4` — the same picture, no audio. This is what goes into Resolve.
- `<id>-timing.md` — every line with its in and out time, to match pace when re-recording.
- `<id>-contact.png` — one frame per scene, in a grid. **Look at this before calling an episode done.**

## Durations are measured, never typed

An episode file carries no scene lengths. Each scene names a narration line with
`vo`, and `timing.mjs` reads that line's real length out of `timings.json`.

`hold` adds seconds AFTER a line, for a beat that needs to breathe. The voice
track is re-assembled to match, so a hold cannot push the audio ahead of the
picture.

Frame boundaries are rounded cumulatively, never per scene. Rounding each scene
on its own drifts up to half a frame per scene, and the errors add: over sixty
scenes that is a full second of lip-sync error, arriving so gradually that
nothing looks wrong until the last chapter. `tests/video/06-timing.cjs` guards it.

## A scene

```js
{ id: 'spoke-one', type: 'art', vo: 'L019', art: 'drawSpokeGrowing',
  issue: 'Housing', headline: 'One issue',
  cast: [{ at: [0.18, 0.90], anim: 'showTo', tone: 2 }] }
```

Three types, and no more:

- **`title`** — a card. `headline`, `sub`.
- **`stage`** — the workhorse. `headline`, `bullets: [{ t, text }]`, `cast`.
- **`art`** — the escape hatch. `art: '<name>'` resolved against `window.EVArt`,
  which the episode's own `art.js` registers. May also carry a `headline` and a
  `cast`, both drawn on top.

A scene inherits `accent` from the episode unless it sets its own.

## A cast entry

```js
{ at: [xFrac, groundYFrac], anim: 'stroll', tone: 0, scale: 1, flip: false,
  path: [[0.2, 0.9], [0.8, 0.9]], prop: { phone: true }, shadow: true }
```

**`at` is the GROUND LINE, not the pelvis.** The rig's `computePose` puts the
pelvis at the origin, so placing a figure at `y` directly leaves it floating a
leg-length in the air. `cast.js` measures each animation's deepest foot across
its whole cycle and lifts by that, so the deepest point of the cycle touches the
floor and a lifted foot rises off it.

Do not reach for the rig's own constants (128 standing, 200 seated). The 200 is
the height of the plinth the rig draws under a seated figure; the video stage has
no plinth, and using it hangs a sitting Bobit 130px in the air.

Three Bobits per scene, at most. A fourth aborts the render.

`tone` indexes the dark palette: `#1DA8C6`, `#FF6B52`, `#FFD740`, `#43D07E`,
`#B49BFF`, `#FF9A4D`.

## Adding a pose

Poses go in **`ev-anim-extras.js` at the repo root**, never in this tool. That
file is the canonical home for poses layered on `leremy-rig.js`, so a pose
invented for a video becomes available to the landing page and the mind map too.

It exists twice, byte-identical. The Purpose map's `build.js` inlines its own
copy, so after editing the root one:

```bash
cp ev-anim-extras.js C:/Strategy/tools/purpose-map/ev-anim-extras.js
```

`ev-anim-extras.js` is LF-terminated. Preserve that.

Because the file is shared, **a pose change runs the whole repo suite**, not just
`tests/video`:

```bash
for f in tests/*/*.cjs; do echo "== $f"; node "$f"; echo "exit $?"; done > suite.log 2>&1
```

Run it detached — it takes about 40 minutes and exceeds the foreground limit.
Do not pipe it through `head` or `tail`; that buffers the whole run and reads as
a hang.

## The live screen still

`episodes/compass/screen.js` is **generated**. Refresh it with:

```bash
node tools/video/episodes/compass/grab-screen.mjs [url]
```

It writes the screenshot as a `data:` URI, not a `.png` beside the page, and that
is not cosmetic. An image loaded through `img.src` under `file://` taints the
canvas permanently, and from then on every `getImageData` on it throws — which
would break the pixel assertions in `tests/video/03-cast.cjs` and `04-art.cjs`
the moment the episode rendered. A `data:` URI does not taint.

The current capture is the calibration onboarding screen. Reaching a calibrated
radar needs a logged-in session; re-run the script from a logged-in browser to
replace it.

## Writing an `art.js`

A browser IIFE that extends `window.EVArt` with `function (ctx, t, W, H, scene)`
entries. Rules:

- Pure functions of `(t, scene)`. No module-level mutable state, or the
  determinism guarantee is void for that episode.
- Size everything from `W` and `H`. The same code renders at 320x180 in the test
  fixtures and at 1920x1080 in the episode.
- Use `scene.accent`, never a literal colour.
- Leave the lower third clear. The cast draws on top of the art.
- If the art needs an image decoded first, expose `window.EVArt.ready` as a
  promise; the renderer waits on it before frame 0.

## Why `ev-figures.js` is not loaded

It randomizes its cast per page load and runs its own `requestAnimationFrame`
loop. Both are right for the landing page and fatal for reproducible video.
`tests/video/01-stage-loads.cjs` asserts it stays out.
