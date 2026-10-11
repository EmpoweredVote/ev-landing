# Bobit video series — design

**Date:** 2026-10-10
**Status:** approved, ready for implementation planning

## Summary

A series of 3–10 minute videos, one per section of the Purpose map, explaining the why, how and
what of each idea. The Bobits carry the explanation — they act out the scenarios rather than
illustrate them. Chris records narration only, and records it last.

This spec covers two things:

1. **The episode pipeline.** Built once, used for every episode. Script in, finished silent MP4 out.
2. **Episode 1, Empowered Compass.** The proof that the pipeline works.

The pipeline's defining constraint is that **the picture is cut to a real voice track, not to
guesses.** A free text-to-speech pass produces a scratch narration and, with it, the exact start and
end time of every line. Scene durations are read from those numbers. Chris then re-records against a
locked picture and a timing sheet.

## Why the old process can't grow

The three existing videos — *What's Empowered Vote?*, *How can you know the truth in their heart?*
and *How to Create Solutions that Last Forever* — were made by recording Chris on camera with a DJI
lav mic, then building every graphic by hand in DaVinci Resolve. That works, and it does not scale to
23 platform features. Every graphic is a one-off. Nothing is reusable. A copy change is a re-edit.

Meanwhile `leremy-rig.js` already contains a complete, time-driven figure animation system that the
landing page, the Purpose map and the decks all share. Twenty-six named animations, props for a
megaphone, book, phone, cane, chair, desk and laptop. It has never been pointed at video.

Every animation in the rig is `frame(t)` — a pure function of time. That is the whole reason this
pipeline can exist. A renderer can ask for the pose at exactly 4.3667 seconds and get the same answer
every time.

## Scope

**In scope:** the five-step pipeline; the episode file format; three scene types; the direction
rules for the series; new poses in `ev-anim-extras.js`; episode 1 end to end.

**Out of scope:** episodes 2 and later, which are writing work rather than engineering. Also out of
scope: linking finished videos back into the Purpose map. That is a one-line change per node — add a
`v:` field to `map-data.json`, exactly as the three existing videos already do — and belongs with the
episode that needs it.

## Architecture

Five steps. Each writes a file the next reads, so work can stop and be inspected at any point.

| Step | Input | Output |
|---|---|---|
| 1. Write | the map node | `script.md` — narration lines plus a direction note per line |
| 2. Voice | `script.md` | scratch MP3 and `timings.json` — start and end of every line |
| 3. Time | `timings.json` | `episode.mjs` — scenes, durations filled from the real voice |
| 4. Render | `episode.mjs` | one MP4 per scene, cached |
| 5. Join | the scene MP4s | the delivered files |

### Step 1 — Write

`script.md` holds numbered narration lines. Each line carries a one-sentence direction note naming
what the Bobits are doing while it is read. One line is one scene. That one-to-one rule is what makes
re-timing cheap later.

The source material for a feature episode is the feature's own map node, which already encodes the
structure: `Inspiration` is the why, `Goal` and `Summary` are the how and the what.

### Step 2 — Voice

`edge-tts` renders the script to MP3. It emits `WordBoundary` events, so the step also writes
`timings.json`: for each line, its start time, end time and word count.

This is the step that makes the rest honest. We do not estimate that a sentence takes six seconds. We
measure that it takes 6.233 seconds and cut the picture to that.

Fallback if the network is unavailable: the Windows `System.Speech.Synthesis` voice through
PowerShell. It is offline, it needs no install at all, and it also reports word boundaries. Quality is
worse, which does not matter for a track that gets replaced.

### Step 3 — Time

The author writes `episode.mjs` with a `vo` reference per scene instead of a duration. A build step
resolves each `vo` reference against `timings.json` and fills in the duration. Durations are never
typed by hand.

### Step 4 — Render

A Node script opens a canvas page in Playwright, loads `leremy-rig.js` and `ev-anim-extras.js`,
and steps the scene one frame at a time at an exact `t`. Each frame is captured and **piped straight
into ffmpeg's stdin** as `image2pipe`. No PNG is ever written to disk. A 10-minute episode at 30 fps
is 18,000 frames; as files that is several gigabytes, and piped it is nothing.

The renderer does **not** use `ev-figures.js`. That file randomizes its cast per page load and runs on
`requestAnimationFrame`, which is correct for the landing page and fatal for reproducible video. The
renderer calls `LeremyRig.computePose` and `LeremyRig.draw` directly.

**Per-scene rendering and caching.** Each scene renders to its own MP4 in `build/<episode>/scenes/`,
keyed by a hash of its definition. An unchanged scene is not re-rendered. Changing scene 7 costs one
scene's render time, not the episode's.

**The alpha path.** The same loop, with the canvas cleared instead of filled and the output set to
ProRes 4444 or a PNG sequence, exports a single scene with a transparent background. This is the
fallback Chris asked to keep open: if the finished-episode output disappoints, the same engine hands
him per-scene clips to cut in Resolve, with no rebuild.

### Step 5 — Join

ffmpeg concatenates the scene MP4s. Hard cuts, no transitions — see "Direction rules" below. The step
produces three deliverables per episode:

| File | Purpose |
|---|---|
| `<episode>-scratch.mp4` | picture plus the AI voice. Chris watches this to judge the episode. |
| `<episode>-silent.mp4` | the same picture, no audio. This is what goes into Resolve. |
| `<episode>-timing.md` | every line with its in and out time, to match pace when re-recording. |

## The episode file format

An episode is one ES module exporting a plain object. Scenes are a flat list.

```js
export default {
  id: 'compass',
  title: 'Empowered Compass',
  accent: '#FFD426',          // the Inform Pillar
  fps: 30, width: 1920, height: 1080,
  scenes: [
    { id: 'open-01', type: 'stage', vo: 'L001',
      headline: 'Who are these people?',
      cast: [ { at: [0.5, 0.78], anim: 'confused', tone: 0 } ] },

    { id: 'how-spoke', type: 'art', vo: 'L014',
      draw: drawSpokeGrowing,
      cast: [ { at: [0.18, 0.80], anim: 'showTo', tone: 2 } ] },
  ]
}
```

A cast entry holds a position (as a fraction of the frame), an animation name from
`LeremyRig.ANIMATIONS`, a colour tone index, an optional prop from the rig's `opts`, and an optional
`path` — two points the figure is linearly interpolated between across the scene, which is how a
walk cycle actually travels.

### Three scene types, and no more

- **`title`** — a card. The open and the chapter breaks.
- **`stage`** — the workhorse. Bobits act in front of a headline and optional bullets with reveal
  times.
- **`art`** — the escape hatch. The episode supplies `draw(ctx, t, w, h)` for a one-off diagram, and
  may still place Bobits in front of it. The Compass spider graph is an `art` scene.

### Deliberately left out

**Cross-dissolves between scenes.** Hard cuts are cheaper to render and far easier to re-time, and
Resolve adds a dissolve in seconds if one is ever wanted.

**Animation changes inside a scene.** To change a pose, cut to a new scene. This keeps a scene a pure
function of `t` with no internal state, which is what makes the determinism test meaningful.

## Direction rules

**Dark theme throughout.** Near-black stage, the rig's dark figure palette: `#1DA8C6` teal,
`#FF6B52` coral, `#FFD740` gold, `#43D07E` green, `#B49BFF` purple, `#FF9A4D` orange.

**One accent colour per episode, taken from its pillar.** Inform `#FFD426`, Connect `#2BD9D9`,
Empower `#FF4019`. Across the series a viewer learns the colour code without being told it.

1. Three Bobits on screen at most. Usually one or two.
2. One idea per scene. To change a pose, cut.
3. On-screen text is a short phrase, never the narration. The voice carries the sentence.
4. Bobits never speak in full sentences. They act. A speech bubble holds a few words at most.
5. 1920 × 1080, 30 fps.

**New poses go into `ev-anim-extras.js`, not into the video tool.** That file is already the canonical
home for poses layered on the rig, and it is already inlined by the Purpose map build. A pose invented
for a video becomes available to the mind map and the landing page for free.

Episode 1 needs two: **`tap`**, for answering a questionnaire, and **`showTo`**, for a figure
presenting a chart beside it.

## Episode 1 — Empowered Compass

Source node: `What › Empowered.Vote › Civic Platform split across 3 Pillars › Inform Pillar ›
Empowered Compass`. Inspiration: *Voter Driven over Party Driven*. Goal: *Create a visual
representation for the civic priorities of citizens and leaders*. Live today at
compass.empowered.vote.

Nine chapters, about seven minutes. **These durations are estimates and are superseded by step 2.**

| # | Chapter | Est. | What you see |
|---|---|---|---|
| 0 | Cold open | 0:40 | A Bobit in a voting booth. A column of names it does not know. `confused`, then `spent`. |
| 1 | Title | 0:08 | "Empowered Compass" on Inform yellow. |
| 2 | Why | 1:30 | Voter driven over party driven. Two Bobits are sorted into two labelled boxes. The labels come off. What each one cares about does not match its box. |
| 3 | How — calibrate | 1:20 | A Bobit answers a questionnaire (`tap`, phone prop). Each answer drops a marker. |
| 4 | How — the spoke | 1:10 | `art`. One issue becomes one spoke. Strength of feeling sets distance along it. |
| 5 | How — the shape | 1:00 | `art`. Every spoke draws. The outline closes. This shape is your compass. |
| 6 | What | 1:50 | `art`. A leader's compass lays over yours. Agreement and gaps are visible at a glance. Two Bobits compare. |
| 7 | Where it fits | 0:45 | Compass is one Inform Pillar tool among several. The formula appears: sFacts + sValues = sSolutions. |
| 8 | Close | 0:30 | Live today at compass.empowered.vote. Bobits `cheer`. |

**The compass is drawn, not screen-recorded.** Chapters 4–6 use `art` scenes in the Bobit visual
language. Two reasons: the real UI will change and a drawn compass will not date the episode; and a
drawn compass can grow one spoke at a time and hold still while the voice explains it, which the app
cannot. Chapter 8 carries a few seconds of the real screen, to prove the thing exists.

## File layout

```
tools/video/
  engine/            renderer, scene types, voice step, join step
  episodes/
    compass/
      script.md      narration + direction notes
      episode.mjs    scenes
      art.mjs        the episode's own art-scene draw functions
  build/             ALL output — git-ignored
```

Three reasons this lives in `ev-landing` rather than `Strategy`:

- `leremy-rig.js` is here. The engine loads the live rig with no copy to keep in sync.
- This repo has a git remote, so the work is backed up. The `Strategy` repo has none.
- `tools/` already holds generators of exactly this kind (`gen-sticks.mjs`, `og-card/`, `bubble-rig/`).

**One caution.** `render.yaml` sets `staticPublishPath: ./`, so the entire repo is served publicly and
deployed on every push. The engine is text and harmless. Media must never be committed, or it inflates
every deploy. Add `tools/video/build/` to `.gitignore` in the first commit, before any render runs.

## Verification

Three automated checks:

1. **Determinism.** Render a fixture scene twice at three fixed timestamps. The pixel checksums must
   match. This is the test that protects the whole premise.
2. **Timing.** The sum of scene durations equals the voice track length to within 0.2 s.
3. **No errors.** The render page throws nothing. A silent script failure once left six suites in this
   repo passing vacuously for two commits; an explicit page-error assertion is the cheap guard.

And one check no test can perform. The renderer also writes a **contact sheet** — one frame per scene
in a grid. A human looks at that image before an episode is called done. Green tests do not prove a
Bobit is visible, standing on the ground, or clear of the text. That lesson is already paid for in
this repo's history and is not re-learned here.

## Risks

| Risk | Mitigation |
|---|---|
| Chris's final read does not match the scratch pace | One scene per narration line. Re-timing is one number plus a one-scene re-render, not a re-edit. The timing sheet gives each line's in and out. |
| `edge-tts` calls a Microsoft endpoint and needs the network | Free, no account, no key. Offline fallback is the Windows `System.Speech` voice, which also reports word boundaries. |
| A 10-minute render is slow | Scenes are hashed and cached; only changed scenes re-render. Frames are piped, never written. |
| The three scene types prove too few | `art` accepts any draw function. Chapters 4–6 already work this way. |
| The finished-episode output disappoints | The alpha path exports per-scene clips with transparency for a Resolve cut, using the same engine and no rebuild. |

## Dependencies

One new: `pip install edge-tts` — free, no account, no key.

Already present and verified on this machine: ffmpeg (N-125365), Python 3.14.3, Node v24.13.0,
Playwright 1.62.1. Playwright is a **global** npm install, reached via
`NODE_PATH=C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules`.

## Later, not now

- Episodes 2+. The 23 platform features are the obvious backlog; the `Why` and `How` branches of the
  map are already covered by the three existing videos.
- Attaching each finished video to its map node via `v:` in `map-data.json`.
- Cross-dissolves, if hard cuts prove too abrupt in practice.
