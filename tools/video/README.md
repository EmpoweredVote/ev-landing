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
- `<id>-recording-script.md` — the words to read into a microphone, with the line
  numbers the edit keys off. Direction notes are deliberately left out.
- `<id>-contact.png` — one frame per scene, in a grid. **Look at this before calling an episode done.**

`--alpha` produces something different: per-scene ProRes 4444 clips in
`scenes-alpha/`, and nothing else. No join, no voice, no contact sheet — the
clips *are* the deliverable, which is the point of that fallback. Alpha and
opaque keep separate directories and separate cache keys, so one can never be
served in place of the other.

## What the build refuses

The build aborts, naming the thing, rather than producing something that looks
right. Each of these is a silent desync if it gets through:

| Refusal | Why |
|---|---|
| a scene names a `vo` id not in `timings.json` | the scene would have no length |
| two scenes name the same line | the line would be spoken twice |
| a line no scene names | it would be recorded, land in the voice track, and never appear |
| a per-line WAV is missing while others exist | the resync would be skipped and the end of the episode cut off |
| a WAV's real length disagrees with `timings.json` by more than a frame | the scene was planned from a stale number |
| a rendered scene holds the wrong frame count | ffmpeg can exit 0 having written a short file |
| the joined picture does not hold the planned frames | a scene is short |
| the scratch cut and the picture differ by more than a frame | the voice has been trimmed to fit |

`tests/video/12-episode.cjs` makes the first three of those checks again without
rendering or speaking anything, and adds four the build cannot make: a scene
naming a draw function `art.js` does not register, a draw function no scene
uses, a scene whose id prefix is not a named chapter, and a named chapter no
scene belongs to. Run it after any edit to `script.md`, `episode.mjs` or
`art.js` — it costs under a second and it is the cheapest way to learn that a
line was deleted.

The chapter half of that is not cosmetic. Everything that groups scenes for a
human — the recording script, the review contact sheet — walks the chapter list
and shows what it can name. A renamed chapter key left four finished scenes out
of the review page while the page still looked complete, so **anything that
groups scenes takes the chapter list from `episode.chapters` and never keeps its
own copy**, and says loudly, at the top, when a scene matched nothing.

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

An art scene may carry any extra fields its draw function reads; they are part
of the cache key, so changing one re-renders that scene. The Compass episode
uses these:

| Field | Used by | Meaning |
|---|---|---|
| `stage` | `drawSpokeGrowing`, `drawCompassBuilding`, `drawCompassOverlay`, `drawSourceCard` | how far through the idea this scene is |
| `settled` | `drawMarkers`, `drawLiveScreen` | this scene continues the one before it, so show the end state at once |
| `issue` | `drawSpokeGrowing` | the label on the single spoke |
| `nearEnd`, `farEnd` | `drawSpokeGrowing` | the two ends of the answer ladder, named |
| `count`, `ring` | `drawMarkers` | how many markers, and whether they gather into the compass ring |
| `dim`, `letters` | `drawBallot` | fade the names down the ballot; show the party letter beside each |
| `name`, `sub` | `drawTitleCard` | fallback wording if the lockup is missing, and the line beneath it |

**A scene that continues another must say so.** Four consecutive scenes calling
one draw function each replay its animation from zero, so the viewer watches the
same reveal four times. `stage` and `settled` are how a scene says "start where
the last one ended".

**A spoke records which answer, not how strongly.** A topic in the live product
carries a ladder of named solutions — Housing runs from "government is the main
provider" to "rely on the market" in five steps — and a dot's distance along the
spoke is the step the person picked. It is not a measure of how much the issue
matters to them. `drawSpokeGrowing` used to label its ends "barely moves me" and
"decides my vote", which taught the viewer the wrong model of the product in the
one chapter built to teach the right one.

A scene inherits `accent` from the episode unless it sets its own.

## A cast entry

```js
{ at: [xFrac, groundYFrac], anim: 'stroll', tone: 0, scale: 1, flip: false,
  color: '#7C6B9E', path: [[0.2, 0.9], [0.8, 0.9]],
  prop: { phone: true }, shadow: true }
```

**`at` is the GROUND LINE, not the pelvis.** The rig's `computePose` puts the
pelvis at the origin, so placing a figure at `y` directly leaves it floating a
leg-length in the air. `cast.js` measures each animation's deepest foot across
its whole cycle and lifts by that, so the deepest point of the cycle touches the
floor and a lifted foot rises off it.

Do not reach for the rig's own constants (128 standing, 200 seated). The 200 is
the height of the plinth the rig draws under a seated figure; the video stage has
no plinth, and using it hangs a sitting Bobit 130px in the air.

The sample window is 30 seconds. It was 4, and `fall` reaches its deepest point
late enough that the short window missed it by 9.5px — the figure sank through
the floor at exactly the moment it lands.

Three Bobits per scene, at most. A fourth aborts the render.

`tone` indexes the house palette: `#1DA8C6`, `#FF6B52`, `#FFD740`, `#43D07E`,
`#B49BFF`, `#FF9A4D`. `color` overrides it with an exact hex, and beats `tone`
if both are given.

**When a Bobit stands for something the product draws, take the product's
colour, not a tone.** Episode 1 ends on a screenshot of the live compass, where
your shape is purple and the civic leader you compare against is green:

| | | source |
|---|---|---|
| you | `#7C6B9E` | the live legend, `EV-CompassV2 src/pages/CombinedPage.jsx` |
| a compared civic leader | `#6DD28C` | same, dark-theme value |
| where the two overlap | `#749E95` | the two of them mixed |

Those three are named at the top of `episodes/compass/art.js` and again in
`episode.mjs`, and `tests/video/13-colours.cjs` reads them back out of the
rendered pixels. It exists because the same two shapes are drawn by three
different functions, and they once disagreed: chapter 6 drew the leader teal
while chapter 7 drew them Inform yellow. The accent is the episode's brand
colour. It is not a shape colour, and the test fails if the compass outline is
painted in it.

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
node tools/video/episodes/compass/grab-screen.mjs [url] [--profile <dir>]
```

It writes the screenshot as a `data:` URI, not a `.png` beside the page, and that
is not cosmetic. An image loaded through `img.src` under `file://` taints the
canvas permanently, and from then on every `getImageData` on it throws — which
would break the pixel assertions in `tests/video/03-cast.cjs` and `04-art.cjs`
the moment the episode rendered. A `data:` URI does not taint.

A fresh browser reaches only the calibration onboarding screen, because a
compass nobody has answered has no shape to draw — which made the closing shot
of episode 1 a picture of the sign-up step. `--profile` borrows a Chrome
user-data-dir that HAS answered, and the still then shows a real calibrated
radar.

**Point it at a COPY of the profile, never the live one.** Chrome holds a
single-instance lock on a directory it is running in, and the copy keeps the
script from writing into a browser somebody is using. Four things need to come
across, and nothing else:

```
Local State
Default/Preferences
Default/Network/Cookies
Default/Local Storage/leveldb
```

The script dismisses two things that are correct product behaviour and wrong in
a still: the coach-mark tour, which dims the whole page behind it, and the
sign-up prompt, which is the only element in the frame about us rather than
about the compass. The sign-up prompt is hidden by matching the INNERMOST
element holding its text — every ancestor up to the root also contains that
text, and hiding all of them writes a blank white still that still looks like a
successful run.

`episodes/compass/brand.js` is generated the same way, by `embed-brand.mjs`,
from the dark variants in `brand/compass/`. Both files are committed on purpose:
without them a fresh checkout builds a different episode, because the capture
would have to be re-taken against a site that changes. They are 124KB together,
which is text, not media.

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
