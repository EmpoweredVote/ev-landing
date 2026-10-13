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
| 2b. Cut | `engine/split.mjs` | the same per-line files, cut out of a take Chris recorded |
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

## Cutting a recorded take into lines

`voice.mjs` writes one file per line because it speaks each line on its own.
A person reads them in one continuous take, so the numbering has to be
recovered from the words:

```bash
# one take per episode
node tools/video/engine/split.mjs tools/video/episodes/treasury audio/DJI_35.WAV

# a pickup: the lines fluffed the first time, recorded again. Later takes win.
node tools/video/engine/split.mjs tools/video/episodes/essentials take.WAV pickup.WAV

# see the plan without writing anything
node tools/video/engine/split.mjs tools/video/episodes/compass take.WAV --dry
```

Output is `build/<episode>/vo/`, the same shape `voice.mjs` writes, so nothing
downstream knows or cares which voice it got. Each line also gets its `.txt`,
which is what stops a later `--voice` run from speaking over a real recording,
and `vo/_source.json` records which seconds of which take each line came from.

`engine/transcribe.py` does the listening, through `faster-whisper`, and caches
its result beside the build so re-running the cut is seconds rather than
minutes. The default model is `small.en`. **Do not drop it to `base.en`**: the
smaller model is twice as fast and it silently drops words. On the Treasury take
it ended a line four words early, which downstream reads as "he never finished
that line", and the line is there.

`engine/align.mjs` decides where each line is, and it is tested without audio
in `tests/video/14-align.cjs`. Three things it has to get right, each of which
the obvious implementation gets wrong:

- **A fluffed line is read again**, so the LAST complete reading wins. That is
  what the recording script tells the reader will happen.
- **A title card's words sit inside the sign-off.** "This is Treasury Tracker"
  is contained in "That is Treasury Tracker. Go follow your money", so a
  per-line search cuts the title card out of the closing line nine minutes
  later and drags every line between them out of order. The take is therefore
  aligned against the whole script at once, not line by line.
- **A line can simply not have been read.** It is named and the run stops. A
  missing per-line WAV is a silent desync: the build resyncs the voice to the
  picture and the end of the episode is cut off, with nothing looking wrong.

Two things it reports rather than hides. A line read with a long pause in the
middle is kept whole — half a line is worse — and the pause is named, because
the file holds it. And per-line files whose numbers the script no longer has
are deleted, so a line brought back under an old number cannot quietly keep the
synthesized voice while everything around it is the real reading.

### When the words cannot settle it

A reader who starts a line, stops, and starts again leaves two readings on the
tape. Usually the alignment finds the second one. Sometimes it cannot, because
the recogniser writes the two attempts down as one: on the Compass take it gave
the word "the" a length of 1.48 seconds, put the whole stumble inside it, and
handed back a word stream with no pause and no repeat in it.

The silence is the only witness, and the silence does not say enough on its own.
Across the three Compass/Essentials/Treasury takes, eight cuts open with speech,
a long silence, and then more speech. Three are false starts. The other five are
a reader pausing in the middle of a sentence — "Most budget coverage only ...
ever shows you the first one" — where trimming to the silence would throw away
the opening of the line. No rule separates them.

So the splitter prints the suspects and cuts none of them:

```
may open on a false start — listen, then pin in cuts.json if it is one:
  L003 (1.301s of silence at 48.09s, speech again at 49.39s)
```

Listen to those seconds. If it is a false start, write the cut down in the
episode's `cuts.json`, which is optional and holds only the lines the ear had to
settle:

```json
{
  "L003": {
    "take": "DJI_34_20261011_091753.WAV",
    "start": 49.35,
    "_heard": "46.95-48.05 is 'So you do what the-', then 1.4s of nothing."
  }
}
```

A pin is the last word on where its line starts or stops; everything else about
the line is still measured. Give `start`, `end`, or both. A pinned line is not
reported again. A pin naming a line the script does not have stops the run,
because a pin that silently does nothing is how a cut stays wrong after somebody
has fixed it. Say in `_heard` what is actually on the tape before the pinned
second: a bare number is a decision nobody can check later.

### The recogniser can lose a whole reading

**A gap in the word stream is not evidence of silence.** On the Treasury take
the `small.en` transcript holds no words at all between 196.58s and 207.18s,
so `align.mjs` reported a 10.6s hole inside a 20.53s L012 and the line was
written up as unusable and needing a re-record. It needed neither.
`silencedetect` over the same span finds **5.04 seconds of sound**, and
transcribing that slice on its own returns a complete second reading of the
line. The reader had simply read it twice.

Three gaps on that one take held speech the transcript had no words for:

| Span | What was actually on the tape |
|---|---|
| 196.58–207.18 | a whole second reading of L012 |
| 228.30–230.72 | a stutter-repeat inside L014 — "money out, how the money is spent, money out." |
| 241.02–247.46 | an abandoned start of L015 — "Most budget coverage only have..." |

This is the second time a recogniser has cost this series real work. The first
was `base.en` ending a line four words early, which is why the default model is
`small.en`. This one is worse, because the failure does not look like a
failure: it looks like a reader who stopped mid-line.

**The splitter repairs this by itself, and says so.** After transcribing a
take it asks which gaps in the word stream the tape was speaking through, cuts
each one out with a little air either side, transcribes that slice on its own —
where there is no long file to skip over — and splices the words back. The
deciding is three pure functions in `engine/repair.mjs`, tested without any
audio in `tests/video/16-repair.cjs`; the slicing is in `split.mjs`.

A gap counts as lost speech when it is longer than 2.0s and holds more than
0.8s of sound. Below that it is a breath, a chair or a lip noise — the head of
the Essentials take holds 0.30s of it across fifteen seconds of nothing, and
reporting that would send somebody to listen to silence.

The run says what it found, and this is worth reading rather than scrolling
past, because it is telling you the reader read a line twice:

```
the transcript has no words for 3 span(s) the tape was speaking through —
transcribing each one on its own:
  196.58–207.18s (5.04s of sound): "That's the whole trick. It's not new data. It's the same data the government already published"
  241.02–247.46s (2.00s of sound): "Most budget coverage only have"
  228.30–230.72s (1.46s of sound): "money out, how the money is spent, money out."
recovered 31 words the first pass lost
```

Words a slice transcribes that fall OUTSIDE its own span are dropped. The air
around the slice is there to give the model context, and it lets the model run
on into the next line and hand back words that are already in the stream;
keeping those would say a line was read twice when it was read once, which is
the fault this exists to undo.

The repaired stream is what gets cached, and the cache carries a `repair`
version. Bump `REPAIR` in `split.mjs` when the pass changes what it returns,
or an old word stream is silently reused.

**Two traps this cost on the way in**, both worth knowing before touching it.

`ffmpeg` writes `silencedetect` to **stderr** and exits **0**. `execFileSync`
only hands back stderr by throwing, so a catch-block version of this scan reads
an empty string, finds nothing, and says the take is clean. Use `spawnSync` and
read `.stderr` whatever the exit code. The first run of this scan reported "no
lost audio" over the take that had three.

`split.mjs` used to spawn `python` outright. On a Windows box where only the
`py` launcher is installed that resolves to the Microsoft Store shim, which
prints an advert and exits non-zero. It stayed hidden for as long as a cached
`words.json` meant no transcription ran — and the repair pass transcribes once
per lost span, so it would have surfaced immediately. It now probes `python`,
`py` and `python3` once and uses whichever answers as Python 3.

**Why it happens at all.** The reader does not pause between attempts. Chris:
"I typically won't with VO as I often need to intuit the feedback into my next
run immediately, and waiting 2 seconds is not how I work." The false-start
detector below looks for a long silence, so a restart a second later is not a
false start as far as it is concerned, and the two readings are cut as one line.

**And the rule that settles which one to keep:** default to the LAST take. The
reader is trying to end on a good one, so the latest complete reading wins. That
is already what `align.mjs` does for a line it can see twice, and now that the
repair pass puts the second reading back in the stream, it is what decides these
too — automatically, with no pin.

**A read that differs from the script is usually an edit, not a mistake.**
Chris's booth changes are script changes: contractions, present tense, shorter
sentences, less flourish. Where the match score is low, compare the written line
with what was said and move the SCRIPT, unless it is a genuine flub, cough or
mess-up. A closer script is not cosmetic either — the take is aligned against
the whole script at once, so every line that fits better makes its neighbours
fit better too.

### Nobody speaks during a silence

`cutPoints` used to move a cut outward only, because the recogniser's word
boundary lands a tenth of a second inside the first consonant. It goes wrong
the other way too: on a line the reader began quietly, or after a long pause,
the recogniser puts the first word up to a second before any sound, and the cut
then opens on a second of room tone. Essentials had 1.84 s of nothing between
"search the donors by name" and "and kept separate from all of it", and a
dozen more joins over a second.

The silence settles it. If the recogniser's start lies INSIDE a silence that the
line reads out of, the line cannot have begun there — it began where that
silence ended, and the same at the other end. That one rule took every join in
the episode down to the 0.45 s the splitter puts between lines on purpose, with
no pins at all. It only ever moves a cut inward, and only to a boundary the
audio itself drew.

### The cut that holds all of the line but the beginning

The splitter also prints the cuts that do not hold their whole line:

```
cut does not hold the whole line — listen, then pin in cuts.json:
  L003 opens 3 word(s) in — "the information exists" is not in the cut
```

This is the fault that hides best, and it is NOT the same as a false start.
Where a reader pauses between the first sentence of a line and the rest, the
window that reads best can be the rest on its own — every word in it is the
line's, in order, and the match score barely moves. Essentials L003 came out as
"It is just kept in a dozen places. The city clerk has the council…" at a match
of 0.923, which is the score of a line that is fine. "The information exists."
was recorded, is in the script, and was in no WAV. Everything downstream — the
scene's length, every word time read off it, the picture built against those
times — was then built on a line that is not the line, and nothing anywhere
said so.

`clipped()` in `align.mjs` answers one question per cut: how many of the line's
own words are missing from each end. A count of words is a thing a person can
check against the tape in ten seconds. It reports rather than cuts, for the same
reason the false-start check does — a reader who drops a word is ordinary, and
only the ear can say whether what is missing was said. Contractions are expanded
before the comparison, because the script writes "It is worth saying" and the
recogniser writes "It's", and a warning that fires on lines that are fine is a
warning nobody reads.

The level is left alone except for one gain, the same for every line and every
take, that lifts the loudest take to -3 dBFS. Dynamics are a mix decision and
belong in Resolve, not here. `--no-gain` turns even that off.
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

> The cache key digests EVERY `.js` file in the episode directory, not just
> `art.js` — `screen.js` and `brand.js` are in it too. So refreshing the live
> still or the lockup re-renders all 37 scenes, exactly as an `art.js` edit
> does. Worth knowing before deciding to swap a capture at the end of a review
> round: it costs a full build, so batch it with whatever else is outstanding.

| Field | Used by | Meaning |
|---|---|---|
| `continues` | every draw function, via `arrive()` | the picture was already on screen, so nothing in it fades in again |
| `headlineAt` | the shared overlay | the second the words that say the headline are spoken |
| `headlineY` | the shared overlay | how far down the frame the headline sits, 0.22 if unsaid; the bullets follow it |
| `stage` | `drawCalibrate`, `drawSpokeGrowing`, `drawCompassBuilding`, `drawCompassOverlay`, `drawSourceCard` | how far through the idea this scene is |
| `settled` | `drawLiveScreen` | this scene continues the one before it, so show the end state at once |
| `issue` | `drawSpokeGrowing` | the label on the single spoke |
| `enter` | `drawBallot` | this scene starts outside the polling place and goes in |
| `dim`, `letters` | `drawBallot` | the SECOND the names start to fade, and the second the party discs land. Zero means it happened before this scene |
| `name`, `sub` | `drawTitleCard` | fallback wording if the lockup is missing, and the line beneath it |

**Nothing arrives twice.** One scene is one narration line, so a single idea
runs across four or five cuts with the picture barely changing under them. Every
draw function fades its contents in from its own `t = 0`, which is right the
first time and wrong every time after: the ballot the viewer is already looking
at blinks out and fades back in at the cut, four times in the first thirty
seconds. A scene that carries on from the one before says `continues: true`, and
`arrive(scene, t, …)` returns 1 instead of a fade. What is NEW in the scene
keeps its own timing — that is the point of the flag, so the party letters can
land on a ballot that does not.

A field that names a second needs the same care, and `since(t, t0, dur)` is it.
A scene carrying on from the one before still has to say WHEN each thing on it
arrived, and the honest answer for everything already on screen is "before this
scene started", which is zero. Read as the start of a fade, zero makes the thing
ramp up from nothing again at the cut — which is how the party discs kept
respawning for three scenes after the one that brought them in, under a
`continues` flag that was doing its job everywhere else. Only a POSITIVE time
animates.

**A field that nobody set is a THIRD state, and `since` cannot see it.** It has
no second, so it reads as zero, and zero means "already on screen" — so a thing
that should not be in this scene at all is drawn from its first frame. In
episode 2 that put the mini compass, the stance drawer, the blank topic and the
coverage message between one and two scenes ahead of the lines that introduce
them, and every one of them looked deliberate. The three states are:

| | |
|---|---|
| absent | the scene never names the field |
| `0` | it was on screen before this scene started |
| `> 0` | it arrives at that second |

So an optional thing asks for its field BY NAME — `at(scene, 'compassAt', t,
dur)` rather than `since(t, scene.compassAt \|\| 0, dur)` — and a scene that
wants to keep something writes an explicit `0`, the way episode 1 writes `dim:
0` and `letters: 0`. The explicit zero is not noise; it is the scene saying
out loud that it inherited the thing.

The same zero bites a second time wherever it is used as a CLOCK ORIGIN rather
than as a flag. `searchAt` opens the donor search and also starts the query
typing itself in, `ease((t - searchAt - 0.4) / 0.9)`. The three later scenes
inherit the field as `0` — correctly, "it was already there" — and the typing
clock read that as "start typing at t = 0.4", so the word typed itself in again
in the outside-spending scene and again in the filings scene. One query, three
scenes, typed three times. Anything that animates from a field's value has to
ask whether the field is positive before it runs, not just whether it exists.

**Two lists that have to stay in step are one list.** Episode 2's ballot had
`JOBS` — the offices — and `TOUCHES` — what each office decides — as two arrays
read at the same index. They are not in the same order and never could be: the
offices arrive in the order chapter 1 reads them out and the labels arrive in
the order chapter 7 reads THOSE out, which is the point of the chapter. So
zoning hung off the assessor, the school day off the water board, and every one
of the five labels pointed at the wrong row. It is one array now, and each row
owns both of its seconds. This is the same rule as "write a fact down once",
read from the other end: if two structures must agree, they are one structure.

The same rule covers the cast, and there it is just arithmetic: a figure at
`[0.74, 0.88]` in one scene and `[0.80, 0.88]` at `scale: 0.9` in the next
teleports, and across four scenes it reads as the thing that is wrong with the
video. Hold one position and one scale for a whole chapter and change only
`anim`; where the figure genuinely has to move, give it a `path` and let it
walk.

**State changes belong inside the line that describes them, not at the cut after
it.** `dim` was true or false, so the down-ballot names were bright for one
scene and faint in the next with nothing in between. It is now the second they
start to fade, which is while "somewhere past the top of it the names stop
meaning anything" is being said. Any flag that names a state is suspect for the
same reason.

**Type waits for the voice.** `headlineAt` is the second the narration reaches
the words on screen, read off the recording — `vo/<take>.words.json` has every
word's start. Type that appears before the voice gets there is read ahead of the
voice, and from then on the viewer is reading instead of listening.

### A re-split invalidates every one of those seconds

Every in-scene second is measured from its line's cut START, so re-splitting a
take moves all of them — by that line's own delta, which is different for every
line. The 2026-10-12 Compass re-split moved 30 of 39 lines by more than 0.08s,
from 0.004s up to 0.98s. There is no single offset to apply, and a line that
barely moved sitting next to one that moved a second is exactly how a re-time
gets half done.

**They are not only in `episode.mjs`.** That file holds `headlineAt`, the bullet
`t`s, `dim` and `letters`, and they are easy to find. `art.js` holds as many
again, buried inside draw functions as bare numbers — the second a ladder's
rungs appear, the second a dot moves to the end of a spectrum it has just been
told about, the second a card clears. Re-timing Compass meant 8 numbers in
`episode.mjs` and 19 in `art.js` — and the last 5 of those 19 turned up only in a
final sweep, after the rest had been done and a build started. Grep both for
`fade(t,`, `ease((t -`, `ease(t /` and every `+ i *` style stagger, and decide
about each hit, BEFORE building.

**Read the word again; do not apply the delta.** The delta only tells you WHICH
word to go and look for: subtract it from the old value to find what that number
used to mark, then set the new value from where that word is now. The two agree
most of the time, and the times they do not are the point — Compass L029's cut
moved 0.5s later, which put its old `headlineAt` at minus 0.2s, before the scene
it belongs to even starts.

Print the words against the new cuts rather than reading `_source.json` by eye:

```js
const w = words[line.take].filter(x => x.e > line.start && x.s < line.end);
for (const x of w) out += `${x.w.trim()}[${(x.s - line.start).toFixed(2)}] `;
```

**The recogniser's time for the FIRST word of a line is not evidence.** It
stretches that word back across the silence in front of it — the same artefact
the cut rule in "Nobody speaks during a silence" exists to undo. On the Compass
take it put "If" at 294.74s when `silencedetect` shows no sound at all between
292.5s and 295.54s. Ask the audio, not the transcript, before deciding a pinned
cut has eaten a word:

```bash
ffmpeg -ss 292.5 -t 6 -i take.WAV -af silencedetect=noise=-45dB:d=0.08 -f null -
```

**And check what no longer FITS.** A shorter line breaks any animation whose
duration was chosen against the old one. Compass L023 came out 0.46s shorter,
its eight spokes grew over a fixed 2.4s, and the last one never arrived — it
popped in at the cut instead, on a scene that draws all eight. Nothing failed
and no test went red. Walk every `t /` divisor and every late cast beat against
the new duration before building.

**A box is as big as what is in it.** The source card was a fixed height, and
the fourth reference printed below its own border; the questionnaire card was a
fixed row height, and a ten-item list ran off the bottom of the frame. Both now
measure their contents first — the question is wrapped with `wrapLines()` before
the box is drawn, and the card either grows to fit or tightens its rows against
a floor. A number somebody chose once, for the content there was at the time, is
a bug waiting for the next line of copy.

Episode 2 found the same fault three more times, in three different functions,
and fixed each one where it happened — which is why it happened again somewhere
else. The ballot was `H * 0.70` tall with five rows under the fold and the sixth
printed off the bottom of the paper. The profile's district line ran out through
the side of the card. The reasoning drawer was wrapped to the PANEL's width and
printed past its own border and the panel's. So there is now one `fitLabel()`
beside `label()` — same arguments plus the width of the box — and anything
printed inside a box goes through it. It shrinks rather than clips or wraps: a
clipped word is a word cut in half, and a line that wraps changes the height of
whatever holds it. **Where the same fault turns up twice, the fix is a shared
function, not a second patch.**

**Write a fact down once.** The Compass episode's Housing ladder is five named
solutions, the viewer picks one of them, and three separate chapters draw that
pick: a questionnaire card highlights it, the compass puts a dot on that spoke,
and the spoke chapter blows the same spoke up and names its two ends. They were
three numbers until they disagreed on screen — the card said "public money for
low-income housing" while the spoke put the dot on "let the market decide". Now
`HOUSING`, `rung()` and `PICKED` at the top of `art.js` are the only statement
of it and all three read from them.

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

### A scene is one line, and a line can be a sequence

One scene is one narration line. That rule is what makes a re-time a single
number, and it does not bend. But a line can describe a sequence — "you get to
your polling booth, work your way down your ballot" is one line and two acts —
so a cast entry can change what it is doing partway through:

```js
{ anim: [{ t: 0, anim: 'stroll' }, { t: 1.6, anim: 'friendly' }],
  path: [{ t: 0,   at: [0.26, 0.88] },
         { t: 1.6, at: [0.26, 0.88] },
         { t: 5.8, at: [0.42, 0.88] }],
  show: [0, 3.5] }
```

- **`anim`** as a list names what is being done from each second onward. Each
  keyframe's animation plays from ITS own zero, so a figure that starts walking
  at 1.6s starts at the beginning of a stride rather than joining one halfway
  through.
- **`path`** as `[{ t, at }]` names waypoints in seconds. The two-point form
  `[[x, y], [x, y]]` still runs the whole scene, which is what most scenes want;
  waypoints are for a figure that has to cross to somewhere and then stay there
  instead of drifting for the length of the line.
- **`show: [from, to]`** is the seconds the figure is drawn at all. A figure
  that walks through a door has to stop being drawn when it goes in, or it
  stands on the threshold for the rest of the line. Two entries in the same
  colour, one ending where the other begins, is how someone goes in one place
  and comes out in another.

`tone` indexes the house palette: `#1DA8C6`, `#FF6B52`, `#FFD740`, `#43D07E`,
`#B49BFF`, `#FF9A4D`. `color` overrides it with an exact hex, and beats `tone`
if both are given.

**A figure whose colour means nothing invites the viewer to ask who it is.**
Episode 1 drew the viewer purple everywhere and then put a palette-yellow figure
in three scenes, and a reviewer's first note on each was "I don't know why he is
there". If a figure stands for the viewer, paint it the viewer's colour; if it
stands for nobody, leave it out.

**When a Bobit stands for something the product draws, take the product's
colour, not a tone.** Episode 1 ends on a screenshot of the live compass, where
your shape is purple and the civic leader you compare against is green:

| | | source |
|---|---|---|
| you | `#7C6B9E` | the live legend, `EV-CompassV2 src/pages/CombinedPage.jsx` |
| a compared civic leader | `#6DD28C` | same, dark-theme value |
| you both picked the same answer | `#FED12E` | `ev-ui src/RadarChartCore.jsx` |

The first two are named at the top of `episodes/compass/art.js` and again in
`episode.mjs`, and `tests/video/13-colours.cjs` reads them back out of the
rendered pixels. It exists because the same two shapes are drawn by three
different functions, and they once disagreed: chapter 6 drew the leader teal
while chapter 7 drew them Inform yellow. The accent is the episode's brand
colour. It is not a shape colour, and the test fails if the compass outline is
painted in it.

The two shapes are both FILLED and translucent, with the fills and strokes the
live chart uses, so where they lie over each other the two make a third colour
by themselves. That overlap is the product's own picture of agreement, so
nothing draws a separate "both" polygon over the top of it. Where you and the
leader picked the SAME answer on a spoke, one yellow dot replaces the two, an
eighth larger — again, what the live chart does.
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
