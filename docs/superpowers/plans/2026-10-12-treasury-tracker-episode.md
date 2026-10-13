# Treasury Tracker Episode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build episode 3 of the Bobit series — Treasury Tracker — as
`tools/video/episodes/treasury/episode.mjs` and `art.js`, cut against a final
re-split of Chris's recording, and hand Chris a scratch cut to review.

**Architecture:** One scene per narration line, 37 scenes in ten chapters.
`episode.mjs` is the scene list and holds no durations; `timing.mjs` measures
those from the voice. `art.js` is a browser IIFE of pure
`(ctx, t, W, H, scene)` draw functions registered on `window.EVArt`. Chapters 2
to 5 are nineteen consecutive scenes of ONE object, so one `icicle()` primitive
draws every budget bar and the chapters differ only in what they do to it. Two
generated asset files (`brand.js`, `screen.js`, `screen-tall.js`) carry the
lockup and the two live captures as `data:` URIs.

**Tech Stack:** Node ESM for `episode.mjs` and the tools; ES5-style browser
IIFE for `art.js` (it runs in Playwright's page context and in a `vm` sandbox);
Playwright for captures and for every pixel test; ffmpeg via `build.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-12-treasury-tracker-episode-design.md`

## Global Constraints

- **Nothing under `tools/video/build/` is ever committed.** `render.yaml` sets
  `staticPublishPath: ./`; a committed MP4 ships on every deploy.
- **`audio/` is git-ignored and stays that way.** 248 MB of WAVs.
- **Every embedded still is JPEG, never PNG.** `screen*.js` is committed and
  served on every deploy.
- **Every image is a `data:` URI, never an `img.src` path.** An SVG or PNG
  loaded by path under `file://` taints the canvas permanently and every later
  `getImageData` throws, which breaks `tests/video/03-cast.cjs` and `04-art.cjs`.
- **No scene lengths are written in `episode.mjs`.** `hold` adds a beat after a
  line. Everything else is measured by `timing.mjs`.
- **Every in-scene second is read off the recording**, from
  `build/treasury/vo/<take>.WAV.words.json`, relative to that line's cut start.
  Never guessed, never carried over from a previous cut.
- **Nothing is invented and presented as the product's.** Every figure, label,
  colour and heading in `art.js` is one that renders on
  `treasurytracker.empowered.vote`. Where the real data is dull — Los Angeles
  budgets and actuals are identical, variance `—` — the drawing shows that.
- **No party letters anywhere.** Series rule from episode 2.
- **Anything printed inside a box goes through `fitLabel()`.** It shrinks
  rather than clips or wraps.
- **Every optional second asks for its field by name:** `at(scene, 'openAt', t,
  dur)`, never `since(t, scene.openAt || 0, dur)`. A field nobody set reads as
  zero and zero means "already on screen".
- **Accent `#FFD426`** (Inform pillar, the same yellow as episodes 1 and 2).
- **Stage is 1920x1080 at 30fps**, drawn on near-black; the lower third stays
  clear because the cast draws on top.
- **Both live captures are taken in dark theme.** The site defaults to light.
- Commit messages end with:
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

## Review Focus

These are the five ways this episode most likely breaks for a viewer, none of
which the existing suite catches. Each has its test added to the task that owns
the code, named in that task's steps.

1. **An optional field inherited as `0` puts something on screen one to two
   scenes early.** Nineteen `continues: true` scenes inherit fields from each
   other; the three-state trap cost episode 2 four early arrivals. — Task 4.
2. **A segment too narrow to hold its name prints over its neighbours.** Los
   Angeles's smallest top-level segment is 2% of the bar — 29px of 1352 — and
   "Harbor and Port Enterprise Fund" is 31 characters. — Task 4.
3. **Something fades in again at a cut inside the nineteen-scene run.** That is
   the exact fault `continues` exists to stop, and it reads as a blink. — Task 6.
4. **The four level bars disagree with their own printed totals.** `drawLevels`
   draws four governments whose totals span $21.5B to $7,195.8B; a bar scaled to
   the wrong denominator is a lie the viewer cannot see. — Task 6.
5. **The close pans backwards at the cut.** `close-follow` must open where
   `close-screen` stopped — its rate times its MEASURED length, not a round
   number. At 0.25 instead of 0.264 episode 2 jumped fifty pixels up. — Task 8.

---

## File Structure

| File | New? | Responsibility |
|---|---|---|
| `tools/video/episodes/treasury/script.md` | exists | the 37 narration lines. Only L012's text changes, and only if Chris re-words the pickup. |
| `tools/video/episodes/treasury/cuts.json` | exists | the pins the ear had to settle. Grows if the re-split needs more. |
| `tools/video/episodes/treasury/embed-brand.mjs` | **create** | embeds the Treasury lockup and symbol as `data:` URIs |
| `tools/video/episodes/treasury/brand.js` | **generated** | `window.EVTreasuryLogo`, `window.EVTreasurySymbol` |
| `tools/video/episodes/treasury/grab-screen.mjs` | **create** | captures the live site in dark theme; writes a `data:` URI file |
| `tools/video/episodes/treasury/screen.js` | **generated** | `window.EVTreasuryShot` — the LA budget page |
| `tools/video/episodes/treasury/screen-tall.js` | **generated** | `window.EVTreasuryTallShot` — the tall capture the close pans down |
| `tools/video/episodes/treasury/capture-data.mjs` | **create** | prints every live figure the episode draws, so the data block is auditable and refreshable |
| `tools/video/episodes/treasury/episode.mjs` | **create** | the scene list: 37 scenes, ten chapters, no durations |
| `tools/video/episodes/treasury/art.js` | **create** | the data block, the shared helpers, `icicle()`, and twelve draw functions |
| `tests/video/16-treasury.cjs` | **create** | the five Review Focus failures, as pixel questions |

**Why the data lives inside `art.js` and not in its own file.**
`tests/video/12-episode.cjs` runs `art.js` alone in a `vm` sandbox whose only
global is a stub `window`. A `data.js` loaded beside it at build time would be
`undefined` in that sandbox, and the test would pass against a file that cannot
draw. The generated asset files are the exception — `art.js` reads them through
`load()`, which resolves immediately when the global is missing and degrades the
drawing instead of hanging the render.

**Load order matters and is not alphabetical by accident.** `build.mjs` sorts
the episode's `.js` files and loads `art.js` LAST, so `brand.js`, `screen.js`
and `screen-tall.js` have defined their globals before `art.js` runs its
module-level `load()` calls. Any scratch script that renders a frame must copy
that order. Loading `art.js` first is why a pan frame once rendered as a
hostname on an empty stage, and nothing failed.

---

## Task 1: Recover the lost readings, take Chris's edits into the script, re-split

**REVISED 2026-10-12, after listening. There is no re-record.** This task was
written as "Chris re-records L012, then we re-split". He does not have to. L012
was read TWICE and the `small.en` transcript of the whole take silently dropped
the second reading — 5.04 seconds of clean speech transcribed as nothing, which
`align.mjs` then reported as a 10.6s hole in an unusable 20.5s line. The second
reading is there, on the tape, and it is good.

**Two rules from Chris, 2026-10-12, that decide every ambiguous case here:**

1. **What he changes in the booth is a script edit, not a mistake.** Where his
   read differs from the written line, the LINE changes. He edits toward plainer
   speech — contractions, present tense, shorter sentences, less flourish —
   because the written version "started sounding very AI". Only a genuine flub,
   cough or mess-up gets overruled.
2. **Default to the last take.** He reads a line repeatedly and tries to end on
   a good one, so the latest complete reading wins. This is already
   `align.mjs`'s rule; it is now also the tie-breaker for anything this task
   finds by hand.

And one fact about how he works that the pipeline was not built for: **he does
not pause between attempts.** "Waiting 2 seconds is not how I work." The
splitter's false-start detector looks for a long silence, so his restarts — a
second or less apart, sometimes overlapping the previous attempt's tail — are
not detected and the two readings are cut as one line.

**Files:**
- Modify: `tools/video/episodes/treasury/script.md` (Chris's booth edits)
- Modify: `tools/video/episodes/treasury/cuts.json` (pins for the recovered readings)
- Modify: `tools/video/engine/transcribe.py` and/or `split.mjs` only if Step 2 shows the bigger model is the right default
- Produce: `tools/video/build/treasury/vo/` and `words.md` (git-ignored)

**Interfaces:**
- Consumes: nothing.
- Produces: `build/treasury/words.md`, one section per line, shaped
  `## L014  cut 118.42 -> 131.07  (12.65s, take <name>, match 0.95)` followed by
  every word as `word[s.ss]`, seconds from THAT line's cut start. Tasks 3 to 8
  read every `*At` second out of this file and nowhere else.

- [ ] **Step 1: Find every place the transcript lost audio**

A gap in the word stream that is not silent is speech the recogniser dropped.
This is the check that found L012, and it generalises — run it before trusting
any take.

```js
// scratchpad/lostaudio.mjs
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const TAKE = 'audio/DJI_35_20261011_092809.WAV';
const WORDS = 'tools/video/build/treasury/vo/DJI_35_20261011_092809.WAV.words.json';
const words = JSON.parse(readFileSync(WORDS, 'utf8')).words;

// ffmpeg writes silencedetect to STDERR and exits 0, so execFileSync's catch
// never sees it and the scan silently finds nothing. spawnSync hands back both
// streams whatever the exit code. This bug cost a first pass that reported
// "no lost audio" over a take with three lost passes in it.
function silentSeconds(from, len) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-ss', String(from),
    '-t', String(len), '-i', TAKE, '-af', 'silencedetect=noise=-45dB:d=0.20',
    '-f', 'null', '-'], { encoding: 'utf8' });
  const out = (r.stderr || '') + (r.stdout || '');
  const marks = [];
  for (const m of out.matchAll(/silence_start: (-?[\d.]+)/g)) marks.push(['s', Math.max(0, +m[1])]);
  for (const m of out.matchAll(/silence_end: ([\d.]+)/g)) marks.push(['e', Math.min(len, +m[1])]);
  marks.sort((a, b) => a[1] - b[1]);
  let silent = 0, openAt = 0, open = true;   // a gap between words begins in silence
  for (const [k, v] of marks) {
    if (k === 's') { openAt = v; open = true; }
    else if (open) { silent += Math.max(0, v - openAt); open = false; }
  }
  if (open) silent += Math.max(0, len - openAt);
  return Math.min(len, silent);
}

const lost = [];
for (let i = 1; i < words.length; i++) {
  const len = words[i].s - words[i - 1].e;
  if (len <= 2.0) continue;
  const sound = len - silentSeconds(words[i - 1].e, len);
  if (sound > 0.8) lost.push({ from: words[i - 1].e, to: words[i].s, len, sound,
    before: words[i - 1].w.trim(), after: words[i].w.trim() });
}
lost.sort((a, b) => b.sound - a.sound);
console.log('gaps holding sound the transcript has no words for:', lost.length);
for (const g of lost) {
  console.log('  ' + g.from.toFixed(2) + '-' + g.to.toFixed(2) + '  gap ' +
    g.len.toFixed(2) + 's, sound ' + g.sound.toFixed(2) + 's   "' +
    g.before + '" ... "' + g.after + '"');
}
```

Run: `node "$TMP/lostaudio.mjs" 2>/dev/null`

Expected on the `small.en` transcript, exactly these three:

```
  196.58-207.18  gap 10.60s, sound 5.04s   "publish." ... "Arranged,"
  241.02-247.46  gap  6.44s, sound 2.00s   "department." ... "Most"
  228.30-230.72  gap  2.42s, sound 1.46s   "place." ... "And"
```

- [ ] **Step 2: Hear what is in each one, and decide whether the model changes**

Slice each span out and transcribe it on its own. A short slice does not have
the long-file context that makes the recogniser skip:

```bash
ffmpeg -hide_banner -loglevel error -ss <FROM> -t <LEN> \
  -i audio/DJI_35_20261011_092809.WAV -ac 1 -ar 16000 "$TMP/slice.wav" -y
py tools/video/engine/transcribe.py "$TMP/slice.wav" "$TMP/slice.json" --model small.en
```

**`py`, not `python`.** `split.mjs:101` spawns `python`, which on this machine
resolves to the Microsoft Store shim and fails. It has not bitten yet only
because the cached `words.json` means no transcription runs. It will bite on
the first fresh take.

What the three slices hold, already heard on 2026-10-12:

| Span | What is on the tape |
|---|---|
| 196.58–207.18 | a **complete second reading of L012**: "That's the whole trick. It's not new data. It's the same data the government already published" |
| 228.30–230.72 | a stutter-repeat inside **L014**: "money out, how the money is spent, money out." — he restarts the sentence |
| 241.02–247.46 | an abandoned start of **L015**: "Most budget coverage only have..." The splitter already cuts L015 at 247.46, past it, so this one needs nothing. |

A full re-transcription at `medium.en` is running to see whether the bigger
model recovers all three at source. If it does, change the default in
`transcribe.py` and re-split; the pins below then shrink to whatever is left.
If it does not, pin by hand. Either way the words must come from the audio, not
from a guess.

- [ ] **Step 3: Take Chris's booth edits into `script.md`**

Compare the written line against what he actually said, for every line the
matcher scored under about 0.90. These are his edits and the script is what
changes. Confirmed on 2026-10-12:

| Line | Written | What he said |
|---|---|---|
| L002 | "Almost nobody ever finds out what happened next. Not because it is a secret. Because the answer is long, and dull, and written for auditors." | "Almost nobody ever finds what happens next. Not because it's a secret, but because the answer is long and dull and written for auditors." |
| L003 | "...But it is usually a few hundred pages, and it is full of lines that read..." | "...but it's usually a few hundred pages and it's full of lines that read..." |
| L012 | "That is the whole trick. It is not new data. It is the same data the government already published, arranged so a person can follow it instead of exploring spreadsheets." | "That's the whole trick. It's not new data. It's the same data the government already published. Arranged, so a person can follow it instead of exploring spreadsheets." |
| L032 | "It is worth saying what this is for." | "It's worth saying what this is for." |

**Do not change what the recogniser merely rendered differently.** L036 and
L038 scored 0.727 and 0.8 only because it wrote the spoken address as
"TreasuryTracker .Empowered .Vote"; he said what is written. L003's fund and
account numbers come back as digits because the recogniser normalises them, not
because he read them differently — leave them spelled out.

A closer script is not cosmetic: `align.mjs` matches the take against the WHOLE
script at once, so every line it fits better makes every neighbouring line fit
better too.

- [ ] **Step 4: Pin what is left, and say what is on the tape**

For L012, pin the START to the second reading. Per Chris's rule the last
complete reading wins, and `silencedetect` puts its first sound at 201.04 —
the recogniser's 200.60 is the known artefact of stretching the first word back
across the silence in front of it.

```json
  "L012": {
    "take": "DJI_35_20261011_092809.WAV",
    "start": 201.04,
    "_heard": "190.3-196.2 is a complete reading ending 'this is the same data governments already publish', then 4.3s of nothing. 201.04 starts the SECOND reading, 'That's the whole trick...', which runs into 'Arranged, so a person can follow it' at 207.25 with only a 0.68s sentence break. The small.en transcript of the whole take has no words at all between 196.58 and 207.18, which is why this looked like a 10.6s hole."
  }
```

L014 needs the same treatment if the re-split still reports its 2.42s pause:
the repeat is at 228.10–230.90 and the keeper is whatever follows it.

A pin is the last word on where its line starts or stops; everything else about
the line is still measured. A pin naming a line the script does not have stops
the run. Say in `_heard` what is actually on the tape — a bare number is a
decision nobody can check later.

- [ ] **Step 5: Re-split**

```bash
node tools/video/engine/split.mjs tools/video/episodes/treasury \
  audio/DJI_35_20261011_092809.WAV
```

Expected: 37 per-line `.wav` and `.txt` files, plus `_source.json`. L012 is now
about 10s with no hole. The three lines the splitter always reports as possible
false starts — L006 (2.489s), L007 (1.412s), L017 (2.137s) — are already judged
in `cuts.json` as the reader pausing mid-sentence, with the words on both sides
joining up; they are reported every run because they are not pinned, which is
correct. **L006 is worth one more listen anyway:** its cut is 16.81s, longer
than its words need, which is the shape of a line read twice.

- [ ] **Step 6: Measure every join from the AUDIO**

Use the same `silentSeconds` helper from Step 1 — with `spawnSync`, for the
same reason — over each per-line WAV, and report `previous tail + 0.45 + this
head` for every pair.

Expected: every join between 0.45s and about 0.60s. The Compass re-split came
out 0.52 to 0.58. Anything over 0.65s is dead air a listener will hear and name;
Chris has named two before. Fix a long join by pinning the cut, never by
trimming the WAV.

- [ ] **Step 7: Write the word sheet**

```js
// scratchpad/words.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const dir = 'tools/video/build/treasury';
const raw = JSON.parse(readFileSync(dir + '/vo/_source.json', 'utf8'));
const lines = Array.isArray(raw) ? raw : (raw.lines || Object.values(raw));
const cache = {};
function words(take) {
  if (!cache[take]) {
    cache[take] = JSON.parse(
      readFileSync(dir + '/vo/' + take + '.words.json', 'utf8')).words;
  }
  return cache[take];
}

let out = '# Treasury word sheet - every in-scene second is read from here.\n';
for (const L of lines) {
  out += '\n## ' + L.id + '  cut ' + L.start.toFixed(2) + ' -> ' + L.end.toFixed(2) +
         '  (' + (L.end - L.start).toFixed(2) + 's, take ' + L.take +
         ', match ' + L.match + ')\n';
  const w = words(L.take).filter(x => x.e > L.start && x.s < L.end);
  out += w.map(x => x.w.trim() + '[' + (x.s - L.start).toFixed(2) + ']').join(' ') + '\n';
}
writeFileSync(dir + '/words.md', out, 'utf8');
console.log('wrote words.md,', lines.length, 'lines');
```

Run it, then `head -20 tools/video/build/treasury/words.md`.

Expected: 37 sections, each opening with its cut and its measured length. Every
later task quotes from this file and never from memory.

- [ ] **Step 8: Write up the lost-reading check in the pipeline README**

This is the second recogniser failure the series has paid for — the first was
`base.en` ending a line four words early, which is why the default is
`small.en`. This one is worse: a whole 5-second reading transcribed as nothing,
presented downstream as a line needing a re-record. The README's "When the
words cannot settle it" section is where it goes, with the `spawnSync` trap and
the `py`-not-`python` note.

- [ ] **Step 9: Commit**

```bash
git add tools/video/episodes/treasury/script.md \
        tools/video/episodes/treasury/cuts.json \
        tools/video/README.md
git commit -m "fix(video): Treasury L012 was read twice, not broken

<what the lost-audio scan found, and what each pin hears>

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: The lockup, the two captures, and the live data dump

This task has no dependency on Task 1 and can run while Chris is recording. It
runs EARLY on purpose: `sceneHash` includes `codeKey`, and `codeKey` digests
every `.js` in the episode directory, so refreshing an asset after the art is
written invalidates every rendered scene and costs a full rebuild. Settle the
assets first.

**Files:**
- Create: `tools/video/episodes/treasury/embed-brand.mjs`
- Create: `tools/video/episodes/treasury/grab-screen.mjs`
- Create: `tools/video/episodes/treasury/capture-data.mjs`
- Generate: `tools/video/episodes/treasury/brand.js`, `screen.js`, `screen-tall.js`

**Interfaces:**
- Consumes: nothing.
- Produces, for Task 3 onward:
  - `window.EVTreasuryLogo`, `window.EVTreasurySymbol` — `data:image/svg+xml` URIs
  - `window.EVTreasuryShot` — `data:image/jpeg` of the LA budget page, 1440x900
  - `window.EVTreasuryTallShot` — `data:image/jpeg` of the same page, 1440x2400
  - a printed data dump, pasted into Task 3's data block

- [ ] **Step 1: Write `embed-brand.mjs`**

The Treasury brand pack's dark files already exist at the two paths below —
confirmed on disk. Create
`tools/video/episodes/treasury/embed-brand.mjs`:

```js
// Embeds the Treasury Tracker brand lockup as a data: URI for the title card.
//
// A data URI, not a path to the SVG. An SVG loaded through img.src under
// file:// taints the canvas permanently and every later getImageData throws,
// which would break the pixel assertions in tests/video/03-cast.cjs and
// 04-art.cjs. Measured in this repo before: file:// src-ref taints, data: does
// not. See tools/video/README.md.
//
// The DARK variants are the right ones here: the video stage is near-black.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..', '..', '..');

const ASSETS = {
  EVTreasuryLogo:   'brand/treasury-tracker/Logo/SVG/treasury-tracker-logo-dark.svg',
  EVTreasurySymbol: 'brand/treasury-tracker/Symbol/SVG/treasury-tracker-symbol-dark.svg'
};

const lines = ['// GENERATED by embed-brand.mjs. Re-run it if the brand pack changes.'];
let total = 0;
for (const [name, rel] of Object.entries(ASSETS)) {
  const buf = await readFile(path.join(ROOT, rel));
  total += buf.length;
  lines.push('// ' + rel);
  lines.push('window.' + name + ' = "data:image/svg+xml;base64,' + buf.toString('base64') + '";');
}
await writeFile(path.join(HERE, 'brand.js'), lines.join('\n') + '\n', 'utf8');
console.log('wrote brand.js from', Object.keys(ASSETS).length, 'assets,',
  Math.round(total / 1024), 'KB of SVG');
```

- [ ] **Step 2: Run it and check the output is a data URI, not a path**

Run: `node tools/video/episodes/treasury/embed-brand.mjs`

Expected: `wrote brand.js from 2 assets, <n> KB of SVG`.

Run: `head -c 200 tools/video/episodes/treasury/brand.js`

Expected: the first global's value begins `data:image/svg+xml;base64,`. If any
value is a file path, the canvas will taint and four tests will start throwing.

- [ ] **Step 3: Write `grab-screen.mjs`**

Create `tools/video/episodes/treasury/grab-screen.mjs`:

```js
// Grabs one still of the live Treasury Tracker app and writes it as a data: URI.
//
// A data URI, not a .png next to the page, on purpose. An image loaded through
// img.src under file:// taints the canvas permanently, and from then on every
// getImageData on it throws — which would break the pixel assertions in
// tests/video/03-cast.cjs and 04-art.cjs. A data: URI does not taint.
//
//   node grab-screen.mjs [url] [--out <file>] [--global <name>]
//                        [--height <px>] [--from <image>] [--note <text>]
//
// No login is needed: Treasury Tracker is public data, unlike episode 1's
// calibrated compass. The capture can be taken headlessly.
//
// DARK THEME IS NOT OPTIONAL. The live site defaults to light and the episode
// is drawn on near-black; a light capture dropped into a dark episode is the
// brightest thing in five minutes. The theme is seeded before the first paint.
//
// The default target is Los Angeles FY2024, the government the episode spends
// five minutes teaching, on the year every level of its breadcrumb carries as
// a whole budget. FY2025 exists for California and the federal view and does
// NOT exist for Los Angeles: asking for year=2025 silently rewrites the page
// to dataset=salaries and the Money In and Money Out cards lose their figures.

import { createRequire } from 'node:module';
import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function flag(name, fallback) {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : fallback;
}
const taken = new Set();
for (const n of ['out', 'global', 'height', 'from', 'note']) {
  const i = args.indexOf('--' + n);
  if (i >= 0) { taken.add(i); taken.add(i + 1); }
}
const OUT = flag('out', 'screen.js');
const GLOBAL = flag('global', 'EVTreasuryShot');
const HEIGHT = +flag('height', 900);
const FROM = flag('from', null);
const NOTE = flag('note', null);
const TARGET = args.filter((a, i) => !taken.has(i) && !a.startsWith('--'))[0] ||
  'https://treasurytracker.empowered.vote/?entity=los-angeles-ca&year=2024&dataset=operating';

// --from embeds a picture that already exists instead of taking one. --note is
// written into the generated file beside the source, because a still nobody
// can regenerate has to say where it came from.
if (FROM) {
  const held = await readFile(FROM);
  await writeFile(path.join(HERE, OUT),
    '// GENERATED by grab-screen.mjs --from. NOT reproducible by re-running:\n' +
    '// ' + FROM + '\n' +
    (NOTE ? '// ' + NOTE + '\n' : '') +
    'window.' + GLOBAL + ' = "data:image/jpeg;base64,' + held.toString('base64') + '";\n',
    'utf8');
  console.log('wrote ' + OUT + ',', Math.round(held.length / 1024), 'KB from', FROM);
  process.exit(0);
}

const DARK = () => {
  try { localStorage.setItem('ev:color-scheme', 'dark'); } catch (e) { /* private mode */ }
};

const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(DARK);
await page.goto(TARGET, { waitUntil: 'networkidle' });

// The chart is fetched after the first paint, so networkidle alone can catch
// the skeleton. Wait for a real segment to be named, then let the bars settle.
try {
  await page.getByText(/Government & Public Safety|Money Out|Social Security/)
    .first().waitFor({ timeout: 20000 });
} catch (e) {
  console.warn('no segment was named within 20s — look at the still before trusting it');
}
await page.waitForTimeout(3500);

// JPEG, not PNG, and this is a size decision rather than a quality one.
// screen.js is COMMITTED — a fresh checkout has to build the same episode —
// and render.yaml serves the whole repo, so this file ships on every deploy.
const buf = await page.screenshot({ type: 'jpeg', quality: 90, fullPage: true,
  clip: { x: 0, y: 0, width: 1440, height: HEIGHT } });
await browser.close();

await writeFile(path.join(HERE, OUT),
  '// GENERATED by grab-screen.mjs. Re-run it to refresh the still.\n' +
  '//   node grab-screen.mjs ' + TARGET + ' --out ' + OUT +
  ' --global ' + GLOBAL + ' --height ' + HEIGHT + '\n' +
  (NOTE ? '// ' + NOTE + '\n' : '') +
  'window.' + GLOBAL + ' = "data:image/jpeg;base64,' + buf.toString('base64') + '";\n',
  'utf8');
console.log('wrote ' + OUT + ',', Math.round(buf.length / 1024), 'KB from', TARGET);
```

- [ ] **Step 4: Take both captures**

```bash
node tools/video/episodes/treasury/grab-screen.mjs
node tools/video/episodes/treasury/grab-screen.mjs \
  --out screen-tall.js --global EVTreasuryTallShot --height 2400
```

`--out` is a BARE filename: it resolves against the script's own directory.
Passing a path produces a doubled path and `ENOENT`.

Expected: two files written, each a few hundred KB. If either is over about
600 KB, drop `quality` to 85 and take it again — the file ships on every deploy.

- [ ] **Step 5: LOOK at both captures before trusting them**

Green output proves nothing is visible. Decode each one and open it:

```bash
node -e "const fs=require('fs');for(const[f,g]of[['screen.js','EVTreasuryShot'],['screen-tall.js','EVTreasuryTallShot']]){const s=fs.readFileSync('tools/video/episodes/treasury/'+f,'utf8');const b=s.split('base64,')[1].split('\"')[0];fs.writeFileSync(process.env.TMP+'/'+g+'.jpg',Buffer.from(b,'base64'));console.log(g,'->',process.env.TMP+'/'+g+'.jpg')}"
```

Read both JPEGs. Check four things:
- The background is near-black. A light capture fails this task.
- The bar segments are there, not a loading skeleton.
- The year reads **FY 2024**.
- The tall one actually holds more page than the short one — it is the only
  reason `close-follow` has anything to pan down.

- [ ] **Step 6: Write `capture-data.mjs`**

The data block in Task 3 must be auditable and refreshable. Create
`tools/video/episodes/treasury/capture-data.mjs`:

```js
// Prints every live figure this episode draws, so the data block in art.js can
// be checked against the product rather than trusted.
//
// Nothing here is written into art.js automatically. A figure that changes
// because the site changed is a decision — the narration may no longer be true
// of it — and a script that silently rewrites the episode's facts would hide
// that. Run this, read it, and edit art.js by hand.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = 'https://treasurytracker.empowered.vote/';
const DARK = () => {
  try { localStorage.setItem('ev:color-scheme', 'dark'); } catch (e) {}
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
await page.addInitScript(DARK);

async function segments(entity, year, dataset) {
  await page.goto(BASE + '?entity=' + entity + '&year=' + year + '&dataset=' + dataset,
    { waitUntil: 'networkidle' });
  await page.waitForTimeout(4500);
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (Math.round(r.height) !== 64 || r.width < 5) continue;
      const title = (el.getAttribute('title') || '').split('\n');
      out.push({
        label: (el.innerText || '').trim().split('\n')[0] || title[0] || '',
        gov: title[0] || '', amount: title[1] || '', share: title[2] || '',
        px: Math.round(r.width), colour: getComputedStyle(el).backgroundColor
      });
    }
    // the current row only; ancestors compress to 32px and are filtered out above
    return out.filter((s, i, a) => a.findIndex(x => x.gov === s.gov) === i);
  });
}

for (const [entity, year] of [['los-angeles-ca', 2021], ['los-angeles-ca', 2022],
                              ['los-angeles-ca', 2023], ['los-angeles-ca', 2024],
                              ['los-angeles-county-ca', 2024], ['california-ca', 2024],
                              ['united-states-us', 2024]]) {
  const segs = await segments(entity, year, 'operating');
  console.log('### ' + entity + ' FY' + year + '  (' + segs.length + ' segments)');
  for (const s of segs) {
    console.log('   ' + s.label.padEnd(34) + s.amount.padEnd(10) + s.share.padEnd(5) +
      s.colour.padEnd(20) + ' gov: ' + s.gov);
  }
}
await browser.close();
```

- [ ] **Step 7: Run it and keep the output**

Run: `node tools/video/episodes/treasury/capture-data.mjs | tee "$TMP/treasury-data.txt"`

Expected: seven blocks. Compare the Los Angeles FY2024 block against the data
block written in Task 3. They must agree segment for segment. If they do not,
the site changed and that is a finding for Chris, not a number to quietly edit.

- [ ] **Step 8: Commit the tools and the generated assets**

```bash
git add tools/video/episodes/treasury/embed-brand.mjs \
        tools/video/episodes/treasury/grab-screen.mjs \
        tools/video/episodes/treasury/capture-data.mjs \
        tools/video/episodes/treasury/brand.js \
        tools/video/episodes/treasury/screen.js \
        tools/video/episodes/treasury/screen-tall.js
git commit -m "feat(video): Treasury assets — the lockup and two dark captures

Both stills are JPEG data: URIs. screen.js is committed and render.yaml
serves the whole repo, so a PNG would ship on every deploy; and an image
loaded by path under file:// taints the canvas for every later test.

Taken in dark theme, on FY2024 — the newest year Los Angeles has as a
whole budget.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: The skeleton — scene list, data block, helpers, chapter 1 and the title

**Needs Task 1** (for the seconds) **and Task 2** (for the lockup).

**Files:**
- Create: `tools/video/episodes/treasury/episode.mjs`
- Create: `tools/video/episodes/treasury/art.js`
- Test: `tests/video/12-episode.cjs` (exists; runs over every episode automatically)

**Interfaces:**
- Consumes: `build/treasury/words.md` (Task 1); `window.EVTreasuryLogo` (Task 2).
- Produces, for Tasks 4 to 8:
  - `episode.mjs` default export `{ id: 'treasury', title, accent, fps, width, height, chapters: [{key, name}], scenes: [...] }`
  - in `art.js`, module-private: `ease(x)`, `fade(t,t0,dur)`, `arrive(scene,t,t0,dur)`,
    `since(t,t0,dur)`, `at(scene,key,t,dur)`, `atIndex(arr,i,t,dur)`, `roundRect`,
    `wrapLines`, `wrap`, `panel`, `money(n)`, `moneyFull(n)`, `label`, `fitLabel`,
    and the data constants `LA_OUT`, `LA_IN`, `LA_CARDS`, `LA_DRILL`, `LA_ITEMS`,
    `LA_YEARS`, `LEVELS`, `FED_OUT`, `METHOD`, `SOURCE`, `WORDING`, `WHICHSET`
  - registered on `window.EVArt`: `drawStub`, `drawDocument`, `drawTitleCard`

- [ ] **Step 1: Write `episode.mjs` with all ten chapters and all 37 scenes**

Create `tools/video/episodes/treasury/episode.mjs`. The header and the scene
ids are fixed by the spec; the shape copies `episodes/essentials/episode.mjs`.

```js
// Episode 3 — Treasury Tracker. Inform pillar, so the accent is the same
// Inform yellow as episodes 1 and 2.
//
// Scene durations are NOT written here. They are measured from the voice track
// and filled in by timing.mjs. A scene's `hold` adds a deliberate pause AFTER
// its line, in seconds, for a moment that needs to breathe.
//
// One scene per narration line, in order. That one-to-one rule is what makes a
// re-time a single number instead of a re-edit. There is no L022; the script
// skips it and 37 is the correct count.
//
// EVERY SECOND IN THIS FILE IS READ OFF THE RECORDING, out of
// build/treasury/words.md, relative to that line's own cut start. Type that
// arrives before the voice gets there is read ahead of the voice, and from
// then on the viewer is reading instead of listening.
//
// Chapters 2 to 5 are nineteen consecutive scenes of ONE object: the bar is
// built in `bar`, split three ways in `three`, re-timed in `years` and stacked
// in `levels`. Every scene after `bar-collapse` carries `continues: true`.
// Nineteen scenes is nineteen chances for the picture to blink out and fade
// back in at a cut, which is the exact fault `continues` was added to stop.
//
// The viewer is purple, the colour the live compass paints YOU and the colour
// episodes 1 and 2 used for the same person.
const VIEWER = '#7C6B9E';

export default {
  id: 'treasury',
  title: 'Treasury Tracker',
  accent: '#FFD426',
  fps: 30,
  width: 1920,
  height: 1080,
  chapters: [
    { key: 'stub',   name: 'The money leaves' },
    { key: 'title',  name: 'Title card' },
    { key: 'bar',    name: 'The budget as a picture' },
    { key: 'three',  name: 'More than one question' },
    { key: 'years',  name: 'Across time' },
    { key: 'levels', name: 'Across levels' },
    { key: 'src',    name: 'Where the numbers come from' },
    { key: 'cover',  name: 'What we cover' },
    { key: 'why',    name: 'What this is for' },
    { key: 'close',  name: 'Close' }
  ],
  scenes: [
    // ── 1. The money leaves and nothing comes back ──────────────────────
    { id: 'stub-line', type: 'art', vo: 'L001', art: 'drawStub',
      cast: [{ at: [0.74, 0.93], anim: 'read', color: VIEWER, scale: 0.95 }] },
    { id: 'stub-look', type: 'art', vo: 'L002', art: 'drawStub', continues: true,
      cast: [{ at: [0.74, 0.93], anim: 'ponder', color: VIEWER, scale: 0.95 }] },
    { id: 'stub-doc', type: 'art', vo: 'L003', art: 'drawDocument',
      cast: [{ at: [0.74, 0.93], anim: 'standstill', color: VIEWER, scale: 0.95 }] },
    { id: 'stub-tired', type: 'art', vo: 'L004', art: 'drawDocument', continues: true,
      cast: [{ at: [0.74, 0.93], anim: 'exhausted', color: VIEWER, scale: 0.95 }] },

    // ── 2. Title ────────────────────────────────────────────────────────
    { id: 'title', type: 'art', vo: 'L005', art: 'drawTitleCard', hold: 0.25,
      name: 'Treasury Tracker' },

    // ── 3. The budget as a picture ──────────────────────────────────────
    { id: 'bar-collapse', type: 'art', vo: 'L006', art: 'drawBudgetBar', stage: 'collapse' },
    { id: 'bar-named', type: 'art', vo: 'L007', art: 'drawBudgetBar', stage: 'named',
      continues: true },
    { id: 'bar-open', type: 'art', vo: 'L008', art: 'drawBudgetBar', stage: 'open',
      continues: true },
    { id: 'bar-trail', type: 'art', vo: 'L009', art: 'drawBudgetBar', stage: 'trail',
      continues: true },
    { id: 'bar-items', type: 'art', vo: 'L010', art: 'drawLineItems', continues: true },
    { id: 'bar-payments', type: 'art', vo: 'L011', art: 'drawPayments', continues: true },
    { id: 'bar-trick', type: 'art', vo: 'L012', art: 'drawBudgetBar', stage: 'whole',
      continues: true,
      cast: [{ at: [0.78, 0.94], anim: 'present', color: VIEWER, scale: 0.85 }] },

    // ── 4. More than one question ───────────────────────────────────────
    { id: 'three-cards', type: 'art', vo: 'L013', art: 'drawThreeCards', stage: 'two',
      continues: true },
    { id: 'three-named', type: 'art', vo: 'L014', art: 'drawThreeCards', stage: 'named',
      continues: true },
    { id: 'three-half', type: 'art', vo: 'L015', art: 'drawThreeCards', stage: 'half',
      continues: true },

    // ── 5. Across time ──────────────────────────────────────────────────
    { id: 'years-change', type: 'art', vo: 'L016', art: 'drawYears', stage: 'change',
      continues: true },
    { id: 'years-across', type: 'art', vo: 'L017', art: 'drawYears', stage: 'across',
      continues: true },

    // ── 6. Across levels ────────────────────────────────────────────────
    { id: 'levels-city', type: 'art', vo: 'L018', art: 'drawLevels', stage: 'nest',
      continues: true },
    { id: 'levels-four', type: 'art', vo: 'L019', art: 'drawLevels', stage: 'column',
      continues: true },
    { id: 'levels-fed', type: 'art', vo: 'L020', art: 'drawLevels', stage: 'federal',
      continues: true },
    { id: 'levels-two', type: 'art', vo: 'L021', art: 'drawLevels', stage: 'twoways',
      continues: true },
    { id: 'levels-person', type: 'art', vo: 'L023', art: 'drawLevels', stage: 'person',
      continues: true },

    // ── 7. Where the numbers come from ──────────────────────────────────
    { id: 'src-ask', type: 'art', vo: 'L024', art: 'drawSourceCard', stage: 'ask',
      cast: [{ at: [0.78, 0.94], anim: 'ponder', color: VIEWER, scale: 0.85 }] },
    { id: 'src-line', type: 'art', vo: 'L025', art: 'drawSourceCard', stage: 'line',
      continues: true },
    { id: 'src-wording', type: 'art', vo: 'L026', art: 'drawSourceCard', stage: 'wording',
      continues: true },
    { id: 'src-method', type: 'art', vo: 'L027', art: 'drawSourceCard', stage: 'method' },
    { id: 'src-why', type: 'art', vo: 'L028', art: 'drawSourceCard', stage: 'method',
      continues: true,
      cast: [{ at: [0.78, 0.94], anim: 'present', color: VIEWER, scale: 0.85 }] },

    // ── 8. What we actually cover ───────────────────────────────────────
    { id: 'cover-alpha', type: 'art', vo: 'L029', art: 'drawCoverage', stage: 'alpha',
      cast: [{ at: [0.76, 0.94], anim: 'standstill', color: VIEWER, scale: 0.90 }] },
    { id: 'cover-map', type: 'art', vo: 'L030', art: 'drawCoverage', stage: 'map',
      continues: true,
      cast: [{ at: [0.76, 0.94], anim: 'standstill', color: VIEWER, scale: 0.90 }] },
    { id: 'cover-search', type: 'art', vo: 'L031', art: 'drawCoverage', stage: 'search',
      cast: [{ at: [0.76, 0.94], anim: 'offer', color: VIEWER, scale: 0.90 }] },

    // ── 9. What this is for ─────────────────────────────────────────────
    // The second figure WALKS ON at L033 and stays to the end. Appearing at
    // full size between one frame and the next reads as a glitch; somebody
    // arriving reads as somebody arriving. The script supplies its reason —
    // "Not to make you angry about a line item" — so the second Bobit IS that
    // reaction, and by L035 both are calm.
    { id: 'why-calm', type: 'art', vo: 'L032', art: 'drawBudgetBar', stage: 'whole',
      cast: [{ at: [0.30, 0.94], anim: 'standstill', color: VIEWER, scale: 0.85 }] },
    { id: 'why-angry', type: 'art', vo: 'L033', art: 'drawBudgetBar', stage: 'whole',
      continues: true,
      cast: [{ at: [0.30, 0.94], anim: 'standstill', color: VIEWER, scale: 0.85 },
             { anim: 'annoyed', color: VIEWER, scale: 0.85, flip: true,
               path: [{ t: 0, at: [1.12, 0.94] }, { t: 1.6, at: [0.70, 0.94] }] }] },
    { id: 'why-zoom', type: 'art', vo: 'L034', art: 'drawBudgetBar', stage: 'zoom',
      continues: true,
      cast: [{ at: [0.30, 0.94], anim: 'standstill', color: VIEWER, scale: 0.85 },
             { at: [0.70, 0.94], anim: 'annoyed', color: VIEWER, scale: 0.85, flip: true }] },
    { id: 'why-democracy', type: 'art', vo: 'L035', art: 'drawBudgetBar', stage: 'whole',
      continues: true,
      cast: [{ at: [0.30, 0.94], anim: 'present', color: VIEWER, scale: 0.85 },
             { at: [0.70, 0.94], anim: 'ponder', color: VIEWER, scale: 0.85, flip: true }] },

    // ── 10. Close ───────────────────────────────────────────────────────
    // The real page, panned rather than held. The rates are fractions of the
    // travel per second, so the pan does not need to be told how long its line
    // is. `close-follow` opens where `close-screen` stopped — its rate times
    // its MEASURED length. Filled in at Task 8, not guessed.
    { id: 'close-screen', type: 'art', vo: 'L036', art: 'drawLiveScreen',
      shot: 'tall', host: 'treasurytracker.empowered.vote',
      panFrom: 0, panRate: 0.06 },
    { id: 'close-follow', type: 'art', vo: 'L037', art: 'drawLiveScreen', continues: true,
      shot: 'tall', host: 'treasurytracker.empowered.vote',
      panFrom: 0, panRate: 0.085,
      cast: [{ at: [0.09, 0.97], anim: 'present', color: VIEWER, scale: 0.75 },
             { at: [0.91, 0.97], anim: 'ponder', color: VIEWER, scale: 0.75, flip: true }] },
    { id: 'close-card', type: 'art', vo: 'L038', art: 'drawTitleCard', hold: 1.0,
      name: 'Treasury Tracker', sub: 'treasurytracker.empowered.vote',
      cast: [{ at: [0.42, 0.95], anim: 'cheer', color: VIEWER, scale: 0.85 },
             { at: [0.58, 0.95], anim: 'cheer', color: VIEWER, scale: 0.85, flip: true }] }
  ]
};
```

- [ ] **Step 2: Run the structure test and watch it fail on the missing `art.js`**

Run: `node tests/video/12-episode.cjs`

Expected: FAIL — `ENOENT` on `tools/video/episodes/treasury/art.js`. The test
walks every directory that has an `episode.mjs`, so Treasury is already in its
set. If it passes, `episode.mjs` was not written where the test looks.

- [ ] **Step 3: Write the `art.js` header, the data block and the helpers**

Create `tools/video/episodes/treasury/art.js`. Open it with the header and the
data. Every figure below was read off the live site on 2026-10-12 and can be
re-read with `capture-data.mjs`.

```js
// Episode 3 art — Treasury Tracker.
//
// Every function is a pure function of (ctx, t, W, H, scene). No module-level
// mutable state, or the determinism guarantee in tests/video/02-determinism.cjs
// is void for this episode. Everything is sized from W and H so the same code
// renders at 320x180 in the fixtures and at 1920x1080 in the episode, and the
// lower third is left clear because the cast draws on top.
//
// WHAT IS ON SCREEN IS REAL. Every figure, label, colour and heading below was
// read off treasurytracker.empowered.vote on 2026-10-12 and can be re-read with
// capture-data.mjs beside this file. This episode's own closing argument is
// that we show our work, so a segment invented to make a picture balance would
// undo it.
(function () {
  "use strict";
  var FG = "#F2F2F2", MUTED = "#9A9AA0", GRID = "#33333D", DIM = "#5A5A68";
  var CARD = "#1A1A20", EDGE = "#2C2C36";
  var FONT = '"Figtree", "Segoe UI", system-ui, sans-serif';
  // The product's own page is near-black and its cards are #212326; the stage
  // is darker still, so the drawn chart sits on the stage and keeps the card.
  var ONSEG = "#10131A";                   // type printed ON a bright segment

  // ── Los Angeles FY2024, Money Out ──────────────────────────────────────
  // The whole top level, nine segments, in the order and the colours the live
  // chart draws them. `label` is what the page prints. `gov` is the
  // government's OWN wording, which the page keeps in each segment's title —
  // that difference is not decoration, it IS L026, and the two are written
  // once here rather than twice in two draw functions.
  //
  // FY2024 and not FY2025: Los Angeles has no FY2025 budget. Asking the live
  // site for year=2025 silently rewrites the page to dataset=salaries and the
  // Money In and Money Out figures disappear. See the spec.
  var LA_OUT = [
    { label: "Government & Public Safety",      gov: "General Government and Public Safety",      amt: 5.60e9,  pct: 26, c: "#3AABB8" },
    { label: "City Electric Utility",           gov: "Electric Enterprise Fund",                  amt: 4.50e9,  pct: 21, c: "#FF5740" },
    { label: "Roads & Community Development",   gov: "Transportation and Community Development",  amt: 3.50e9,  pct: 16, c: "#FED12E" },
    { label: "City Airport",                    gov: "Airport Enterprise Fund",                   amt: 2.20e9,  pct: 10, c: "#9788B8" },
    { label: "Health, Parks & Recreation",      gov: "Health and Culture and Leisure",            amt: 1.70e9,  pct:  8, c: "#74B589" },
    { label: "City Water Utility",              gov: "Water Enterprise Fund",                     amt: 1.50e9,  pct:  7, c: "#59B0C4" },
    { label: "Debt Payments & Major Projects",  gov: "Debt Service and Capital Outlay",           amt: 1.30e9,  pct:  6, c: "#C2674A" },
    { label: "City Sewer & Wastewater",         gov: "Sewer Enterprise Fund",                     amt: 756.8e6, pct:  4, c: "#D4940B" },
    { label: "Harbor and Port Enterprise Fund", gov: "Harbor and Port Enterprise Fund",           amt: 461.1e6, pct:  2, c: "#4D8FC2" }
  ];

  // Money In, same year, same palette order. Only the five the page labels are
  // listed; the rest are too narrow for a name on the real chart too.
  var LA_IN = [
    { label: "Tax Revenue",           amt: 6.5e9, c: "#3AABB8" },
    { label: "City Electric Utility", amt: 5.2e9, c: "#FF5740" },
    { label: "City Airport",          amt: 2.4e9, c: "#FED12E" },
    { label: "Service Fees",          amt: 2.0e9, c: "#9788B8" },
    { label: "City Water Utility",    amt: 1.8e9, c: "#74B589" }
  ];

  // The three cards above the chart, in the product's own words.
  var LA_CARDS = [
    { head: "Money In",  amt: 21.6e9, sub: "Where funds come from" },
    { head: "Money Out", amt: 21.5e9, sub: "How funds are spent" },
    { head: "Employees", amt: 7.4e9,  sub: "Employee compensation" }
  ];

  // One drill, all the way to the line items. The breadcrumb is the page's.
  var LA_DRILL = {
    crumb: ["United States", "California", "Los Angeles County", "Los Angeles",
            "Budget", "Government & Public Safety", "Public Safety"],
    level1: [
      { label: "Public Safety",      amt: 4.80e9,  c: "#3AABB8" },
      { label: "General Government", amt: 765.1e6, c: "#FF5740" }
    ]
  };

  // The line items under Public Safety, as filed. BUDGETED AND ACTUAL ARE THE
  // SAME NUMBER and the variance column reads a dash — that is what Los
  // Angeles reports, and the page's own legend says "On Budget". Two identical
  // columns is a duller picture than a drifting one and it is the true one.
  var LA_ITEMS = {
    head: "Detailed breakdown of 6 expenditures in Public Safety",
    cols: ["DESCRIPTION", "BUDGETED", "ACTUAL", "VARIANCE"],
    rows: [
      { desc: "Police_Current Expenditures",                     budget: 3260624265, actual: 3260624265 },
      { desc: "Fire_Current Expenditures",                       budget:  846784379, actual:  846784379 },
      { desc: "Emergency Medical Services_Current Expenditures", budget:  435033126, actual:  435033126 },
      { desc: "Street Lighting_Current Expenditures",            budget:  139093425, actual:  139093425 },
      { desc: "Animal Regulation_Current Expenditures",          budget:   69104971, actual:   69104971 },
      { desc: "Disaster Preparedness_Current Expenditures",      budget:   50677794, actual:   50677794 }
    ],
    total: 4801317960,
    legend: ["Under Budget", "On Budget", "Over Budget"]
  };

  // Four years of the same two segments. FY2021's TOTAL is the one figure this
  // block does not carry — read it from Task 2's capture dump and write it in.
  // Do not infer it from a share.
  var LA_YEARS = [
    { year: 2021, total: 0,      roads: { amt: 2.2e9, pct: 13 }, electric: { amt: 3.9e9, pct: 22 } },
    { year: 2022, total: 18.4e9, roads: { amt: 2.4e9, pct: 13 }, electric: { amt: 4.4e9, pct: 24 } },
    { year: 2023, total: 19.5e9, roads: { amt: 2.5e9, pct: 13 }, electric: { amt: 4.7e9, pct: 24 } },
    { year: 2024, total: 21.5e9, roads: { amt: 3.5e9, pct: 16 }, electric: { amt: 4.5e9, pct: 21 } }
  ];

  // The four governments, FY2024, outermost first. `perPerson` is the figure
  // the page itself computes and prints; it is not divided here.
  var LEVELS = [
    { name: "United States",      out: 7195.8e9, people: 340335000, perPerson: null },
    { name: "California",         out:  190.3e9, people: null,      perPerson: "$4,818" },
    { name: "Los Angeles County", out:   37.6e9, people: null,      perPerson: "$3,752" },
    { name: "Los Angeles",        out:   21.5e9, people: 3878704,   perPerson: "$5,548" }
  ];

  // The federal top level, FY2024, by what it is for. Nine named segments is
  // as many as the frame holds; the real chart has more below Transportation
  // and the drawing says so rather than ending silently.
  var FED_OUT = [
    { label: "Social Security",          amt: 1460.9e9, c: "#3AABB8" },
    { label: "Interest on the debt",     amt: 1133.0e9, c: "#FF5740" },
    { label: "Health care programs",     amt:  911.3e9, c: "#FED12E" },
    { label: "Medicare",                 amt:  874.1e9, c: "#9788B8" },
    { label: "National defense",         amt:  873.5e9, c: "#74B589" },
    { label: "Income support programs",  amt:  670.5e9, c: "#59B0C4" },
    { label: "Veterans benefits",        amt:  329.2e9, c: "#C2674A" },
    { label: "Education & job training", amt:  306.4e9, c: "#D4940B" },
    { label: "Transportation",           amt:  136.6e9, c: "#4D8FC2" }
  ];
  // The federal toggles, in the product's own words.
  var FED_TOGGLE = ["What it's for", "Who spends it"];
  var FED_SCALE = ["$", "Per person"];

  // The method panel on the federal view. SEVEN REAL HEADINGS — the four L027
  // names and three it does not claim. The BODY under each one stays as
  // rule-lines and is never written out: a drawn sentence presented as the
  // product's own words is a claim, and inventing one to show how careful the
  // real ones are would undo the chapter. Episode 1's source card is drawn the
  // same way for the same reason.
  var METHOD = {
    head: "How to read these numbers",
    rows: ["What we count",
           "Why the spending visual totals more than the official number",
           "Negative money isn't hidden",
           "Partial year",
           "How deep the data goes",
           "Can these numbers be audited?",
           "Scale modes"]
  };

  var SOURCE = { name: "CA State Controller - Expenditures", asOf: "as of 2026-08-20" };
  var WORDING = { gov: "Government-reported", ours: "computed by Treasury Tracker" };
  var WHICHSET = [
    { name: "All Funds · actuals",          years: "FY2003–24" },
    { name: "Total Governmental · actuals", years: "FY2017–24" }
  ];
  // What the site says when it does not have a government. Confirmed live.
  var NOTFOUND = "We couldn't find a government matching";
```

Then the helpers. They are the same set episodes 1 and 2 converged on, and they
are copied rather than imported because `art.js` is a browser IIFE that also
runs inside a `vm` sandbox with no module loader. Copy `load`, `ease`, `fade`,
`arrive`, `since`, `at`, `atIndex`, `roundRect`, `wrapLines`, `wrap`, `panel`,
`money`, `moneyFull`, `label` and `fitLabel` verbatim from
`tools/video/episodes/essentials/art.js` lines 206–332, changing only the two
asset globals:

```js
  var logoA = load(window.EVTreasuryLogo);
  var shotA = load(window.EVTreasuryShot);
  var tallA = load(window.EVTreasuryTallShot);
  var logo = logoA.img, shot = shotA.img, tall = tallA.img;
```

- [ ] **Step 4: Write `drawStub`, `drawDocument` and `drawTitleCard`**

`drawStub(ctx, t, W, H, scene)` — a pay stub held at the left of the frame, the
figure at 0.74 of the width. Rows of grey rule-lines for the earnings table and
ONE row picked out in the accent: the tax line. Its label is the one word the
chapter is about, and it arrives on `scene.lineAt` if the scene names it.
`drawStub` serves both `stub-line` (the line is picked out) and `stub-look`
(`continues: true`, nothing arrives again; only the figure changes).

`drawDocument(ctx, t, W, H, scene)` — the budget document landing beside the
figure, dense and unreadable on purpose: a tall page of rule-lines at about 11
lines per hundred of H, with four of them carrying real-looking fund codes in
the product's own register — `fund 101`, `department 08`, `account 42010` — the
three the narration actually says. It lands with a drop: `ease` on y from
`-H * 0.3` to its resting y over `arrive(scene, t, 0.1, 0.5)`.

`drawTitleCard(ctx, t, W, H, scene)` — the lockup from `window.EVTreasuryLogo`,
centred, `scene.name` under it, and `scene.sub` under that when the scene names
one. Copy the structure from `essentials/art.js` `drawTitleCard`; it is the
same card with a different logo. It serves `title` and `close-card`.

Register the three:

```js
  window.EVArt = Object.assign(window.EVArt || {}, {
    drawStub: drawStub,
    drawDocument: drawDocument,
    drawTitleCard: drawTitleCard
  });
  window.EVArt.ready = Promise.all([logoA.ready, shotA.ready, tallA.ready]);
})();
```

- [ ] **Step 5: Run the structure test and watch it fail on the nine unregistered names**

Run: `node tests/video/12-episode.cjs`

Expected: FAIL — `scene "bar-collapse" names art "drawBudgetBar", which art.js
does not register`. That failure is the point: it proves the test sees this
episode and that `episode.mjs` and `art.js` are checked against each other.
Tasks 4 to 8 each take one line off that list.

- [ ] **Step 6: Write the frame-grab script and LOOK at chapter 1**

Green tests prove nothing is *visible*. Write `frames.mjs` into the scratchpad:

```js
import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'C:/ev-landing/ev-landing-main';
const EP = path.join(ROOT, 'tools/video/episodes/treasury');
const OUT = process.env.TMP + '/tframes';
const W = 1920, H = 1080;

// The build loads the episode's .js files sorted, with art.js LAST, so the
// asset globals exist before art.js runs its module-level load() calls. A
// script that loads art.js first renders the fallback and nothing fails.
const FILES = ['brand.js', 'screen-tall.js', 'screen.js', 'art.js'];

const episode = (await import(pathToFileURL(path.join(EP, 'episode.mjs')).href)).default;
const byId = new Map(episode.scenes.map(s => [s.id, s]));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', e => console.error('PAGE ERROR', String(e)));
await page.goto('file:///' + ROOT + '/tools/video/engine/stage.html');
for (const f of FILES) await page.addScriptTag({ path: path.join(EP, f) });
await page.evaluate(() => (window.EVArt && window.EVArt.ready) || null);
await page.evaluate(([w, h]) => window.EVStage.init(w, h), [W, H]);

import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });
for (const arg of process.argv.slice(2)) {
  const [id, ts] = arg.split('@');
  const scene = Object.assign({}, byId.get(id), { dur: 12, accent: episode.accent });
  if (!byId.has(id)) { console.error('no scene', id); continue; }
  for (const s of (ts || '1').split(',')) {
    await page.evaluate(([sc, tt]) => window.EVStage.renderFrame(sc, tt), [scene, +s]);
    const file = OUT + '/' + id + '-' + s + '.png';
    await page.locator('canvas').screenshot({ path: file });
    console.log(file);
  }
}
await browser.close();
```

Run it (Playwright resolves from the global npx cache):

```bash
NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" \
  node "$TMP/frames.mjs" stub-line@1,3 stub-doc@0.3,1.5 title@1
```

Read every PNG it writes. Check: the stub is legible at 1920x1080, the picked
line reads as picked, the document lands rather than appearing, and the lockup
is the Treasury one and not a grey box — a grey box means `brand.js` holds a
path instead of a `data:` URI, or the load order is wrong.

- [ ] **Step 7: Commit**

```bash
git add tools/video/episodes/treasury/episode.mjs tools/video/episodes/treasury/art.js
git commit -m "feat(video): Treasury scene list, data block and chapter 1

Thirty-seven scenes, ten chapters, no durations — timing.mjs measures
those. Every figure in the data block was read off the live site on
2026-10-12 and can be re-read with capture-data.mjs.

12-episode.cjs fails on the nine draw functions not written yet, which is
the list the next five tasks work through.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: The one budget bar — `icicle()`, `drawBudgetBar`, `drawLineItems`, `drawPayments`

This is the task the episode stands on. Nineteen scenes draw this object.

**Files:**
- Modify: `tools/video/episodes/treasury/art.js`
- Create: `tests/video/16-treasury.cjs`

**Interfaces:**
- Consumes: `LA_OUT`, `LA_DRILL`, `LA_ITEMS`, `fitLabel`, `money`, `at`, `arrive` (Task 3).
- Produces: `icicle(ctx, rows, opts) -> number` (the y below the last row);
  `breadcrumb(ctx, parts, shown, x, y, W, H, alpha)`;
  `window.EVArt.drawBudgetBar`, `.drawLineItems`, `.drawPayments`.

- [ ] **Step 1: Write `icicle()`**

Add to `art.js`, above the draw functions:

```js
  // ── The one budget bar ─────────────────────────────────────────────────
  // Every bar in chapters 2 to 5 is drawn by this. The real component
  // (BudgetIcicle, C:\treasury-tracker) is a COLUMN of horizontal bars: each
  // ancestor level compressed, the current level at full height, segments
  // across the whole width sized by money, a breadcrumb above. Measured off
  // the live chart on 2026-10-12 at a 1600px viewport: ancestor rows 32px,
  // current row 64px, bar 1352px wide. Those are the proportions below.
  //
  // Nothing else in this file draws a bar. Three chapters use this and differ
  // only in what they hand it. Episode 2 learned why the hard way: two arrays
  // read at the same index were never in the same order, and every label sat
  // on the wrong row.
  //
  //   rows  [{ segs: [{label, amt, c}], current: bool }]  ancestors first
  //   o     { x, y, w, H, alpha, labelAlpha, minLabelPx, openIndex, openGrow }
  //
  // Returns the y below the last row, so a caller can put line items under the
  // bar without keeping a second copy of the row heights.
  var ROW_ANC = 32 / 1080, ROW_CUR = 64 / 1080, ROW_GAP = 4 / 1080;
  function icicle(ctx, rows, o) {
    var H = o.H, w = o.w, x = o.x, y = o.y;
    var alpha = o.alpha == null ? 1 : o.alpha;
    var gap = Math.max(1, H * ROW_GAP);
    // A label only where the label FITS. The smallest real segment is 2% of
    // the bar — 29px of 1352 — and "Harbor and Port Enterprise Fund" is
    // thirty-one characters. Printing it anyway writes over two neighbours.
    var minLabel = o.minLabelPx == null ? w * 0.075 : o.minLabelPx;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var h = Math.max(2, Math.round(H * (row.current ? ROW_CUR : ROW_ANC)));
      var total = 0, i;
      for (i = 0; i < row.segs.length; i++) total += row.segs[i].amt;
      var cx = x;
      for (i = 0; i < row.segs.length; i++) {
        var s = row.segs[i];
        var sw = total > 0 ? w * (s.amt / total) : 0;
        // One segment opening toward the full width, the rest closing. Only on
        // the current row, and only while openGrow is running.
        if (row.current && o.openIndex != null && o.openGrow > 0) {
          sw = o.openIndex === i ? sw + (w - sw) * o.openGrow : sw * (1 - o.openGrow);
        }
        ctx.fillStyle = s.c;
        ctx.fillRect(Math.round(cx), Math.round(y), Math.max(0, Math.round(sw) - 1), h);
        if (row.current && sw >= minLabel) {
          ctx.save();
          ctx.globalAlpha = alpha * (o.labelAlpha == null ? 1 : o.labelAlpha);
          fitLabel(ctx, s.label, cx + h * 0.22, y + h * 0.44, sw - h * 0.44,
                   H * 0.019, ONSEG, "700", "left");
          fitLabel(ctx, money(s.amt), cx + h * 0.22, y + h * 0.80, sw - h * 0.44,
                   H * 0.019, "rgba(16,19,26,0.78)", "600", "left");
          ctx.restore();
        }
        cx += sw;
      }
      y += h + gap;
    }
    ctx.restore();
    return y;
  }

  // The trail above the bar. `shown` is how many parts are visible, so L009
  // can build it one step at a time without a second copy of the list.
  function breadcrumb(ctx, parts, shown, x, y, W, H, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    var size = H * 0.020, cx = x;
    for (var i = 0; i < parts.length && i < shown; i++) {
      var last = i === Math.min(shown, parts.length) - 1;
      ctx.font = (last ? "700" : "500") + " " + Math.round(size) + "px " + FONT;
      ctx.fillStyle = last ? FG : MUTED;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(parts[i], cx, y);
      cx += ctx.measureText(parts[i]).width;
      if (!last) {
        ctx.fillStyle = DIM;
        ctx.fillText("  /  ", cx, y);
        cx += ctx.measureText("  /  ").width;
      }
    }
    ctx.restore();
  }
```

- [ ] **Step 2: Write `drawBudgetBar` with its five stages**

`drawBudgetBar(ctx, t, W, H, scene)` reads `scene.stage`:

| stage | scenes | what it draws |
|---|---|---|
| `collapse` | `bar-collapse` | the document's rule-lines gather into one row. `u = ease(t / 2.2)`; the lines converge to the bar's y and the segments appear across it as `u` runs. Ends as `LA_OUT` at one current row. |
| `named` | `bar-named` | the same row, `continues: true`, and the TWO largest segments gain their names at `scene.nameAt[0]` and `[1]` through `atIndex`. Nothing else arrives. |
| `open` | `bar-open` | `openIndex: 0`, `openGrow: ease((t - scene.openAt) / 1.1)` through `at(scene, 'openAt', t, 1.1)`; the first row compresses to an ancestor and `LA_DRILL.level1` becomes the current row. |
| `trail` | `bar-trail` | the breadcrumb builds: `shown` steps up through `LA_DRILL.crumb` on `scene.crumbAt`, an array of one second per part. |
| `whole` | `bar-trick`, `why-calm`, `why-angry`, `why-democracy` | one row, `LA_OUT`, nothing arriving. The scene the cast stands in front of. |
| `zoom` | `why-zoom` | the inverse of `open`: one segment fills the frame at `t = 0` and the whole bar grows back around it as `ease(t / 2.4)` runs. |

The bar's box: `x = W * 0.08`, `w = W * 0.84`, first row `y = H * 0.30`.
That leaves the lower third clear for the cast.

- [ ] **Step 3: Write `drawLineItems`**

`drawLineItems(ctx, t, W, H, scene)` draws the inherited bar through `icicle()`
with the Public Safety row current, then the table under it from `LA_ITEMS`:
`cols` as a header rule, then six rows arriving one at a time on
`atIndex(scene.rowAt, i, t, 0.3)`, each as description / budgeted / actual /
variance. Description goes through `fitLabel` at 46% of the table width —
"Emergency Medical Services_Current Expenditures" is 46 characters and it is
real, underscore and all.

**Both money columns print the same number and the variance column prints an
em dash.** That is what Los Angeles files. Do not stage a variance to make the
column look alive; L010 says what was budgeted and what was spent, and here
they are equal.

- [ ] **Step 4: Confirm a live transactions panel exists, and capture it**

**L011 is the one line in this episode whose claim is not yet verified against
the live site, and it must be before it is drawn.** The component
(`LinkedTransactionsPanel.tsx`) is mounted at three call sites in the Treasury
app, and the app's own source says, in `src/data/linkedTransactionsView.ts`:
"App-wide only two entities carry any `transactions` rows at all". Los Angeles
is not one of them — its leaf shows Line Item Details and no transactions.
Bloomington, Indiana and Dane County, Wisconsin both reach a panel.

Drill one of them to a leaf and capture a real panel — vendor names, amounts
and dates:

```bash
node tools/video/episodes/treasury/capture-data.mjs   # for the shape
```

then drive the page by hand with a scratch Playwright script: open
`?entity=bloomington-in&year=2024&dataset=operating`, click
`Services and Charges`, then `Other Services and Charges`, and read what
appears under the line-item table.

- **If a panel with real rows appears:** write down four or five rows and use
  them, and have `drawPayments` NAME the government it is showing. The
  narration already allows this — "where the records support it" — but the
  picture must not imply Los Angeles publishes them.
- **If no panel appears for either entity:** STOP. Report it to Chris. L011
  then claims something a viewer cannot find, and the answer is to cut or
  re-record the line, not to draw a table of invented payees.

- [ ] **Step 5: Write `drawPayments`**

`drawPayments(ctx, t, W, H, scene)` — the inherited bar, then a panel of
transactions: a payee, an amount and a date per row, with the government named
above the panel, arriving on `atIndex(scene.rowAt, i, t, 0.3)`. Payee goes
through `fitLabel`.

- [ ] **Step 6: Read the four scenes' seconds off the word sheet and fill them in**

Open `tools/video/build/treasury/words.md` and read these, each relative to its
own line's cut start:

| scene | field | the word it marks |
|---|---|---|
| `bar-named` | `nameAt[0]`, `nameAt[1]` | "What" and "mostly" in "What is this government mostly doing?" |
| `bar-open` | `openAt` | "press" in "you press a slice and it opens" |
| `bar-trail` | `crumbAt[0..6]` | spread across "keep going until the slices stop dividing", one per crumb, ending before "where in the budget you are standing" |
| `bar-items` | `rowAt[0..5]` | "budgeted" and "spent" carry two of them; the rest fall between |
| `bar-payments` | `rowAt[0..4]` | "Who was paid", "how much", "and when" |

Never guess one, and never carry one over from an earlier cut. Every in-scene
second is relative to its line's cut START, so a re-split invalidates all of
them.

- [ ] **Step 7: Write `tests/video/16-treasury.cjs` with the first two Review Focus checks**

Copy the harness from `tests/video/15-continuity.cjs` — same stage, same
`file://` URL, same load order — and point `EP_DIR` at `treasury`. Add:

```js
  // REVIEW FOCUS 1 — a field nobody set reads as zero, and zero means
  // "already on screen". Episode 2 put four things on screen one to two
  // scenes early exactly this way. A scene that does NOT name a field must
  // draw nothing for it, at t = 0 or at any other t.
  {
    const scene = sceneAt('bar-collapse');       // names no openAt, no crumbAt
    const early = await pixels(scene, 0.05);
    assert.ok(!hasBreadcrumbText(early),
      'bar-collapse names no crumbAt and must draw no breadcrumb');
  }

  // REVIEW FOCUS 2 — a segment too narrow to hold its name must not print it.
  // Los Angeles's smallest top-level segment is 2% of the bar: 29px of 1352,
  // and "Harbor and Port Enterprise Fund" is thirty-one characters.
  {
    const scene = sceneAt('bar-named');
    const shot = await pixels(scene, 6);
    const rightEdge = columnOfInk(shot, Math.round(W * 0.92));
    assert.ok(rightEdge.textPixels === 0,
      'the 2% segment printed a label over its neighbours');
  }
```

The helpers those two checks use, and the three later ones in Tasks 6 and 8,
are written ONCE at the top of the file. The canvas is pure vector plus `data:`
URIs, so `getImageData` is readable — an image loaded by PATH would taint it
permanently, which is why every asset in this episode is a `data:` URI.

```js
const ROOT = 'C:/ev-landing/ev-landing-main';
const EP_DIR = path.join(ROOT, 'tools/video/episodes/treasury');
const URL = 'file:///' + ROOT + '/tools/video/engine/stage.html';
const W = 640, H = 360;

const episode = (await import(pathToFileURL(path.join(EP_DIR, 'episode.mjs')).href)).default;
const byId = new Map(episode.scenes.map(s => [s.id, s]));
const timings = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'tools/video/build/treasury/timings.json'), 'utf8'));

// Named sceneAt, not at: art.js already has an at(scene, key, t, dur) and two
// different things with one name in one episode is how a reviewer loses an
// afternoon.
const sceneAt = (id, extra) =>
  Object.assign({}, byId.get(id), { dur: 8, accent: episode.accent }, extra);

// The canvas as raw RGBA at one moment. Everything below reads this.
async function pixels(scene, t) {
  return page.evaluate(([sc, tt]) => {
    window.EVStage.renderFrame(sc, tt);
    const c = document.querySelector('canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    return { w: c.width, h: c.height, data: Array.from(d.data) };
  }, [scene, t]);
}

// How much of the frame is drawn on at all — anything brighter than the stage.
// A scene that is still fading in has visibly less of it.
function ink(shot) {
  let n = 0;
  for (let i = 0; i < shot.data.length; i += 4) {
    if (shot.data[i] + shot.data[i + 1] + shot.data[i + 2] > 120) n++;
  }
  return n;
}
const inkCount = async (scene, t) => ink(await pixels(scene, t));

// The breadcrumb sits in a band above the bar and nothing else draws there,
// so ink in that band IS the breadcrumb.
function hasBreadcrumbText(shot) {
  const y0 = Math.round(shot.h * 0.22), y1 = Math.round(shot.h * 0.27);
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < shot.w; x++) {
      const i = (y * shot.w + x) * 4;
      if (shot.data[i] + shot.data[i + 1] + shot.data[i + 2] > 240) return true;
    }
  }
  return false;
}

// One column of the frame, and how much type is in it. Type on a segment is
// near-black (#10131A) against a bright segment, so it is the DARK pixels
// inside a lit column that give a label away.
function columnOfInk(shot, x) {
  let lit = 0, textPixels = 0;
  for (let y = 0; y < shot.h; y++) {
    const i = (y * shot.w + x) * 4;
    const sum = shot.data[i] + shot.data[i + 1] + shot.data[i + 2];
    if (sum > 200) lit++;
    else if (lit > 0 && sum < 110) textPixels++;
  }
  return { lit, textPixels };
}

// The widest run of one colour in a row, as a fraction of the bar's width.
// The bar spans x = W*0.08 to W*0.92; a segment is a run of equal pixels.
function widestSegmentFraction(shot, rowIndex) {
  const y = Math.round(shot.h * (0.34 + rowIndex * 0.12));
  const x0 = Math.round(shot.w * 0.08), x1 = Math.round(shot.w * 0.92);
  let best = 0, run = 0, prev = null;
  for (let x = x0; x < x1; x++) {
    const i = (y * shot.w + x) * 4;
    const key = shot.data[i] + ',' + shot.data[i + 1] + ',' + shot.data[i + 2];
    if (key === prev) run++; else { prev = key; run = 1; }
    if (run > best) best = run;
  }
  return best / (x1 - x0);
}
```

The two checks above then read `sceneAt('bar-collapse')` and
`sceneAt('bar-named')` rather than `at(...)`.

- [ ] **Step 8: Run both tests**

```bash
node tests/video/12-episode.cjs
node tests/video/16-treasury.cjs
```

Expected: `12-episode` still fails, now naming only `drawThreeCards`,
`drawYears`, `drawLevels`, `drawSourceCard`, `drawCoverage` and
`drawLiveScreen`. `16-treasury` passes.

- [ ] **Step 9: Grab frames and LOOK at the whole chapter**

```bash
NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" \
  node "$TMP/frames.mjs" bar-collapse@0.5,1.5,2.5 bar-named@2,7 bar-open@1,3,5 \
                         bar-trail@1,4,8 bar-items@2,6 bar-payments@2,6 bar-trick@2
```

Read all of them. Check the five things a test cannot: the bar is recognisably
the product's chart; the ancestor row is visibly thinner than the current one;
no label crosses a segment edge; the breadcrumb does not run off the frame at
seven parts; and nothing fades in again between `bar-named` and `bar-trick`.

- [ ] **Step 10: Commit**

```bash
git add tools/video/episodes/treasury/art.js tests/video/16-treasury.cjs
git commit -m "feat(video): the Treasury bar, drawn once

icicle() is the only thing in this episode that draws a budget bar.
Three chapters use it and differ only in what they hand it. The real
component compresses ancestors to 32px and gives the current row 64;
those proportions are measured off the live chart, not chosen.

A segment narrower than its own name prints no name. The smallest real
one is 2% of the bar and its name is thirty-one characters.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Chapters 3 and 4 — `drawThreeCards` and `drawYears`

Both re-use the bar from Task 4. Neither draws one of its own.

**Files:**
- Modify: `tools/video/episodes/treasury/art.js`
- Modify: `tools/video/episodes/treasury/episode.mjs` (the seconds only)

**Interfaces:**
- Consumes: `icicle`, `LA_CARDS`, `LA_IN`, `LA_OUT`, `LA_YEARS`, `atIndex`, `at`.
- Produces: `window.EVArt.drawThreeCards`, `.drawYears`.

- [ ] **Step 1: Write `drawThreeCards`**

`drawThreeCards(ctx, t, W, H, scene)` draws the inherited bar low in the frame
through `icicle()` and three cards above it, from `LA_CARDS`, in the product's
own words and order: Money In $21.6B / Where funds come from; Money Out $21.5B
/ How funds are spent; Employees $7.4B / Employee compensation.

| stage | scene | what it does |
|---|---|---|
| `two` | `three-cards` | Money In and Money Out at full strength; Employees at `0.35` alpha. The narration says "a third" only at L014, so the third card is present and faint, which is what "a third joins them faintly" means. |
| `named` | `three-named` | each card lights as it is named, through `atIndex(scene.cardAt, i, t, 0.35)`. **`cardAt` is indexed by CARD, in `LA_CARDS` order — In, Out, Employees — and NOT by the order the script names them,** which is out, in, then the workforce. Two arrays read at the same index that were never in the same order put every label on the wrong row in episode 2. Read all three seconds off the word sheet. |
| `half` | `three-half` | the Money Out bar alone, then the Money In bar joining it under it, on `at(scene, 'inAt', t, 0.6)`. Both drawn by `icicle()`; `LA_IN` is the second row's segs. |

The third card is where the three-state trap bites. `three-cards` must name
`cardAt` as `undefined`, not as `[0, 0, 0]`: a field nobody set reads as zero
and zero means "already lit".

- [ ] **Step 2: Fill in `three-*` seconds from the word sheet**

| scene | field | the word it marks |
|---|---|---|
| `three-cards` | — | nothing arrives; the scene inherits |
| `three-named` | `cardAt[0]` — the **Money In** card | the words "Money in", which the script says SECOND |
| `three-named` | `cardAt[1]` — the **Money Out** card | the words "Money out", which the script says FIRST |
| `three-named` | `cardAt[2]` — the **Employees** card | "a third" |
| `three-half` | `inAt` | "Spending without revenue" |

- [ ] **Step 3: Write `drawYears`**

`drawYears(ctx, t, W, H, scene)` reads `scene.stage`:

- `change` (`years-change`): one bar, `LA_OUT`, and the year label above it
  stepping 2021 → 2022 → 2023 → 2024 on `scene.yearAt`, an array of seconds.
  Every segment's width eases between the two years' shares as it changes —
  that is the whole beat, "change the year and the whole shape redraws". Use
  the shares in `LA_YEARS` for the two segments it carries and hold the others
  at their FY2024 widths; **say so in a comment**, because a width that moves
  without a number behind it is the fault this episode is about. If the other
  seven segments' four-year shares are wanted, `capture-data.mjs` already
  prints them and they belong in `LA_YEARS` rather than in the draw function.
- `across` (`years-across`): four small bars side by side, one per year, each
  labelled FY2021 to FY2024, with the two segments the data carries picked out
  and the rest grey. Roads & Community Development goes 13, 13, 13, 16 per
  cent; City Electric Utility goes 22, 24, 24, 21. **Draw the real four
  values.** One rises and one falls back, which is what the tape says — "what
  grew, what shrank". Do not pick a prettier pair, and do not smooth either
  series.

- [ ] **Step 4: Fill in `years-*` seconds and check what still FITS**

| scene | field | the word it marks |
|---|---|---|
| `years-change` | `yearAt[0..2]` | spread across "Change the year, and the whole shape redraws" |
| `years-across` | `colAt[0..3]` | "One year", "Several years", "What grew", "what shrank" |

Then walk every divisor against the MEASURED length of each line in
`words.md`. A shorter line breaks any animation whose duration was chosen
against a longer one: Compass L023 came out 0.46s shorter, its eight spokes
grew over a fixed 2.4s, and the eighth never arrived — it popped in at the cut
instead. Nothing failed and no test went red.

- [ ] **Step 5: Run the tests and grab frames**

```bash
node tests/video/12-episode.cjs
NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" \
  node "$TMP/frames.mjs" three-cards@1,4 three-named@2,5,9 three-half@2,6 \
                         years-change@1,3,5 years-across@2,6
```

Expected: `12-episode` now names only `drawLevels`, `drawSourceCard`,
`drawCoverage` and `drawLiveScreen`. Read every frame. Check the third card is
faint in `three-cards` and lit in `three-named`, and that the four year columns
are readable at 1920x1080 rather than four grey smudges.

- [ ] **Step 6: Commit**

```bash
git add tools/video/episodes/treasury/art.js tools/video/episodes/treasury/episode.mjs
git commit -m "feat(video): Treasury chapters 3 and 4 — three questions, four years

Both re-use icicle(); neither draws a bar of its own. The four-year
columns carry the real shares — Roads 13/13/13/16, Electric 22/24/24/21
— so one rises and one falls back, which is what the recording says.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Chapter 5 — `drawLevels`

Five scenes, four governments, and the chapter where a wrong denominator would
be invisible.

**Files:**
- Modify: `tools/video/episodes/treasury/art.js`
- Modify: `tools/video/episodes/treasury/episode.mjs` (the seconds only)
- Modify: `tests/video/16-treasury.cjs`

**Interfaces:**
- Consumes: `icicle`, `LEVELS`, `FED_OUT`, `FED_TOGGLE`, `FED_SCALE`, `at`, `atIndex`.
- Produces: `window.EVArt.drawLevels`.

- [ ] **Step 1: Write `drawLevels` with its five stages**

| stage | scene | what it draws |
|---|---|---|
| `nest` | `levels-city` | the city bar shrinks and sits inside a county bar, then a state, then a federal — four nested rectangles, each arriving on `atIndex(scene.ringAt, i, t, 0.4)` |
| `column` | `levels-four` | the four bars in a column, **drawn identically**, one `icicle()` row each, labelled with the government's name and its total |
| `federal` | `levels-fed` | the federal bar alone, `FED_OUT`, with the two-item toggle above it from `FED_TOGGLE`, in the product's own words |
| `twoways` | `levels-two` | the same total redrawn twice: by purpose above, by department below. **The department split is not in the data block.** Capture it first with `capture-data.mjs` against `?entity=united-states-us&dataset=operating` with "Who spends it" selected, add it to the data block as `FED_BY_DEPT`, and draw the real one. |
| `person` | `levels-person` | the enormous figure shrinking into a per-person one. $7,195.8B becomes the per-person figure the page itself prints. **The page computes it; this episode does not divide.** If the federal view prints no per-person figure, the scene shows the toggle changing and the number the page shows, whatever it is. |

Each bar is scaled to **its own government's total**, which is the honest
drawing: the chapter's claim is that all four are drawn the same way, not that
they are the same size. Print each total beside its bar so the viewer can see
which denominator each one used.

- [ ] **Step 2: Fill in `levels-*` seconds from the word sheet**

| scene | field | the word it marks |
|---|---|---|
| `levels-city` | `ringAt[0..3]` | "city", "county", "state", "federal" in L018/L019 — L018 names only "your city", so the other three arrive in `levels-four` |
| `levels-four` | `rowAt[0..3]` | "a city, a county, a state and a federal government" |
| `levels-fed` | `toggleAt` | "Do you want to see" |
| `levels-two` | `secondAt` | "By purpose, and by department" |
| `levels-person` | `shrinkAt` | "out of raw dollars and into dollars per person" |

- [ ] **Step 3: Add Review Focus 3 and 4 to `tests/video/16-treasury.cjs`**

```js
  // REVIEW FOCUS 3 — nothing fades in again inside the nineteen-scene run.
  // Every scene from bar-named to levels-person carries continues: true, and
  // a thing that re-enters at a cut is the exact fault continues exists to
  // stop. At t = 0.02 a continuing scene must already be at full strength.
  for (const id of ['bar-named', 'bar-open', 'bar-trail', 'bar-items',
                    'bar-payments', 'bar-trick', 'three-cards', 'three-named',
                    'three-half', 'years-change', 'years-across', 'levels-city',
                    'levels-four', 'levels-fed', 'levels-two', 'levels-person']) {
    const early = await inkCount(sceneAt(id), 0.02);
    const later = await inkCount(sceneAt(id), 1.20);
    assert.ok(early > later * 0.80,
      id + ' is still fading in at t=0.02 — it carries continues and must not');
  }

  // REVIEW FOCUS 4 — the four level bars must each be scaled to their OWN
  // total. Four governments spanning $21.5B to $7,195.8B share one picture,
  // and a bar scaled to the wrong denominator is a lie the viewer cannot see.
  // Each bar's widest segment, as a fraction of the bar, must match that
  // government's own largest share to within two per cent.
  {
    const shot = await pixels(sceneAt('levels-four'), 6);
    for (const [row, expected] of [[0, 0.203], [3, 0.26]]) {   // US 20.3%, LA 26%
      const got = widestSegmentFraction(shot, row);
      assert.ok(Math.abs(got - expected) < 0.02,
        'level row ' + row + ' is scaled to the wrong total: ' + got.toFixed(3));
    }
  }
```

- [ ] **Step 4: Run the tests and grab frames**

```bash
node tests/video/12-episode.cjs
node tests/video/16-treasury.cjs
NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" \
  node "$TMP/frames.mjs" levels-city@1,3,5 levels-four@2,6 levels-fed@2,5 \
                         levels-two@2,6 levels-person@2,6
```

Read every frame. Check the four bars read as four of the same object, that
each total is printed beside its own bar, and that the federal toggle uses the
product's exact words.

- [ ] **Step 5: Commit**

```bash
git add tools/video/episodes/treasury/art.js tools/video/episodes/treasury/episode.mjs \
        tests/video/16-treasury.cjs
git commit -m "feat(video): Treasury chapter 5 — four governments, one chart

Each bar is scaled to its own total and prints it, which is the honest
drawing of a claim about four governments that differ by a factor of
three hundred. A test pins two of the four shares against the live
figures.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Chapters 6 and 7 — `drawSourceCard` and `drawCoverage`

**Files:**
- Modify: `tools/video/episodes/treasury/art.js`
- Modify: `tools/video/episodes/treasury/episode.mjs` (the seconds only)

**Interfaces:**
- Consumes: `SOURCE`, `WORDING`, `WHICHSET`, `METHOD`, `NOTFOUND`, `LA_OUT`, `panel`, `fitLabel`, `wrapLines`.
- Produces: `window.EVArt.drawSourceCard`, `.drawCoverage`.

- [ ] **Step 1: Write `drawSourceCard` with its four stages**

| stage | scenes | what it draws |
|---|---|---|
| `ask` | `src-ask` | the chart, dimmed, with the figure in front of it. Nothing new arrives. |
| `line` | `src-line` | the source line under the chart, in the product's own text: `SOURCE.name` then `· SOURCE.asOf`, with the link glyph the page uses. Arrives on `at(scene, 'lineAt', t, 0.4)`. |
| `wording` | `src-wording` | two descriptions side by side, chipped `WORDING.gov` and `WORDING.ours`. The LEFT one carries a segment's `gov` string and the RIGHT one its `label` — the same two strings `LA_OUT` already holds, which is why they are in the data block together. Use "City Electric Utility" against "Electric Enterprise Fund": the difference is plain at a glance. |
| `method` | `src-method`, `src-why` | the federal method panel. `METHOD.head` as the panel's heading, then all seven of `METHOD.rows` as real headings, each with two or three rule-lines under it standing for its body. |

**The method panel's body stays rule-lines.** Nothing under a heading is
written out. A drawn sentence presented as the product's own words is a claim,
and inventing one in order to show how careful the real ones are would undo the
chapter. Episode 1 draws its source card the same way for the same reason.

`src-method` does NOT carry `continues: true` — the panel opens, which is the
beat. `src-why` does, because the panel is already open.

- [ ] **Step 2: Write `drawCoverage` with its three stages**

| stage | scene | what it draws |
|---|---|---|
| `alpha` | `cover-alpha` | a map of the country behind the figure, mostly unfilled, and the word the script says: "in alpha". |
| `map` | `cover-map` | the federal layer fills completely on `at(scene, 'fedAt', t, 0.8)`, then individual places light above it on `atIndex(scene.cityAt, i, t, 0.25)` — one per "city by city, county by county, state by state". Then the four verbs the script lists — Find the filing. Read it. Map it. Check it. — arriving on `scene.verbAt`. |
| `search` | `cover-search` | a plain message card carrying the product's real words: `NOTFOUND`. Confirmed live — an entity the site does not have returns that, rather than quietly showing somebody else's budget, which is exactly what L031 claims. |

The map is a shape, not a dataset. Draw it as a simple outline with lit and
unlit regions; do not label individual states with coverage claims this episode
has not verified. Light the places the episode has actually shown — Los
Angeles, Los Angeles County, California, and whichever government Task 4's
`drawPayments` ended up naming.

- [ ] **Step 3: Fill in `src-*` and `cover-*` seconds from the word sheet**

| scene | field | the word it marks |
|---|---|---|
| `src-line` | `lineAt` | "Every view names its source" |
| `src-wording` | `leftAt`, `rightAt` | "it stays their wording", "we summarised one" |
| `src-method` | `openAt`, `rowAt[0..3]` | "the method is written out in full", then the four claims |
| `cover-map` | `fedAt`, `cityAt[0..2]`, `verbAt[0..3]` | "for anybody", "city by city / county by county / state by state", "Find the filing. Read it. Map it. Check it." |
| `cover-search` | `cardAt` | "the site says so plainly" |

`src-why` names none of these fields at all — it inherits an open panel. Do
not give it `openAt: 0` out of symmetry unless the panel is meant to be
already-open-and-not-animating, which here it is; if you set it, set it
explicitly to `0` and say why in a comment.

- [ ] **Step 4: Run the tests and grab frames**

```bash
node tests/video/12-episode.cjs
node tests/video/16-treasury.cjs
NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" \
  node "$TMP/frames.mjs" src-ask@2 src-line@2,5 src-wording@2,6 src-method@1,4,8 \
                         src-why@2 cover-alpha@1 cover-map@2,6,10 cover-search@2
```

Expected: `12-episode` now names only `drawLiveScreen`. Read every frame and
check the seven method headings all fit the panel, and that none of them has a
sentence under it.

- [ ] **Step 5: Commit**

```bash
git add tools/video/episodes/treasury/art.js tools/video/episodes/treasury/episode.mjs
git commit -m "feat(video): Treasury chapters 6 and 7 — the method, and what we cover

The method panel prints the seven real headings from the federal view and
rule-lines under each. Nothing under a heading is written out: a drawn
sentence presented as the product's own words is a claim, and inventing
one to show how careful the real ones are would undo the chapter.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Chapters 8 and 9 — the second Bobit, the zoom, and the close

**Files:**
- Modify: `tools/video/episodes/treasury/art.js`
- Modify: `tools/video/episodes/treasury/episode.mjs`
- Modify: `tests/video/16-treasury.cjs`

**Interfaces:**
- Consumes: `icicle`, `drawBudgetBar` stage `zoom` (Task 4), `window.EVTreasuryTallShot`, `window.EVTreasuryShot`.
- Produces: `window.EVArt.drawLiveScreen`.

- [ ] **Step 1: Write `drawLiveScreen`, copied unchanged from episode 1**

There is ONE way to pan a screen in this series and this episode does not
invent a second. Copy `drawLiveScreen` from
`tools/video/episodes/compass/art.js` lines 1348–1391 verbatim, changing only
which globals it chooses between:

```js
  function drawLiveScreen(ctx, t, W, H, scene) {
    var pic = scene.shot === 'tall' && tall.naturalWidth ? tall : shot;
    var host = scene.host || 'treasurytracker.empowered.vote';
    // ... the rest unchanged: the fallback, maxH, full, boxH, travel, frac,
    // the clip, the drawImage at y - travel * frac, the border and the host.
  }
```

The shared window is what makes a short shot behave: a picture that already
fits has no travel and draws exactly as it did before the pan existed.

- [ ] **Step 2: Walk the second Bobit on, and check the path against the measured line**

`why-angry` walks the second figure in from `[1.12, 0.94]` to `[0.70, 0.94]`
over 1.6s. Read L033's length from `words.md` first. The line is short — "Not
to make you angry about a line item. Angry is easy." — and a 1.6s walk inside a
3s line is most of the scene. If the measured line is under about 3.5s, shorten
the walk to `t: 1.1` so the figure is standing still while the point is made.

Appearing at full size between one frame and the next reads as a glitch;
somebody arriving reads as somebody arriving. The figure must still be WALKING
for the whole path, so give it `anim: [{ t: 0, anim: 'toddlemarch' }, { t: 1.1,
anim: 'annoyed' }]` rather than holding `annoyed` while it slides.

- [ ] **Step 3: Set `close-follow`'s `panFrom` from the MEASURED length, not a round number**

This is Review Focus 5. `close-screen` starts at `panFrom: 0` and runs at
`panRate: 0.06`. Where it stops is its rate times its own measured duration:

```bash
node -e "const t=require('./tools/video/build/treasury/timings.json');const d=t['L036'].dur||t['L036'];console.log('close-follow panFrom =', (0.06*d).toFixed(3), 'from L036 dur', d)"
```

Write that number into `close-follow`'s `panFrom` with a comment saying where
it came from. Episode 2 used 0.25 instead of its real 0.264 and the page jumped
fifty pixels back up at the cut, which is the one thing a continuous pan must
not do.

- [ ] **Step 4: Add Review Focus 5 to `tests/video/16-treasury.cjs`**

```js
  // REVIEW FOCUS 5 — the close must not pan backwards at the cut. The last
  // frame of close-screen and the first frame of close-follow are the same
  // moment in the page, so the same row of pixels must be in the same place.
  {
    const a = sceneAt('close-screen'), b = sceneAt('close-follow');
    const endA = (a.panFrom || 0) + (a.panRate || 0) * timings.L036.dur;
    const startB = b.panFrom || 0;
    assert.ok(Math.abs(endA - startB) < 0.004,
      'close-follow opens at ' + startB + ' but close-screen stopped at ' +
      endA.toFixed(3) + ' — the page will jump at the cut');
  }
```

- [ ] **Step 5: Run everything and grab the last frames**

```bash
node tests/video/12-episode.cjs
node tests/video/16-treasury.cjs
NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" \
  node "$TMP/frames.mjs" why-calm@1 why-angry@0.3,1.2,2.5 why-zoom@0.5,2,4 \
                         why-democracy@2 close-screen@0.5,6 close-follow@0.2,6 close-card@1
```

Expected: `12-episode` PASSES for the first time — 37 scenes, 38 lines, 12 art
entries. Read every frame. Check the second figure is mid-stride at 1.2s and
standing at 2.5s, and that `close-screen@6` and `close-follow@0.2` show the
same part of the page.

- [ ] **Step 6: Commit**

```bash
git add tools/video/episodes/treasury/art.js tools/video/episodes/treasury/episode.mjs \
        tests/video/16-treasury.cjs
git commit -m "feat(video): Treasury chapters 8 and 9, and the close

drawLiveScreen is episode 1's, unchanged — one way to pan a screen in
this series, not a second. close-follow opens where close-screen stopped,
which is its rate times its MEASURED length and not a round number, and a
test now fails if the two ever disagree.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Build it, look at it, and hand it to Chris

**Files:**
- No source changes expected. Anything this task finds goes back to the task that owns it.

- [ ] **Step 1: Run the whole video suite before building**

```bash
for f in tests/video/*.cjs; do echo "== $f"; node "$f" || echo "FAILED $f"; done
```

Expected: every file prints PASS. `13-colours.cjs` and `15-continuity.cjs` are
scoped to the Compass directory and must still pass untouched; `12-episode.cjs`
now reports three episodes.

- [ ] **Step 2: Build**

```bash
node tools/video/engine/build.mjs tools/video/episodes/treasury
```

A foreground build is capped at 600s and will be killed part way. Run it again
and it finishes, because each pass keeps the scenes it already rendered. A
37-scene build is about 13 minutes, so expect two or three passes.

Do NOT pass `--voice`. The per-line `.txt` files from the re-split are what
stop a `--voice` run from speaking over Chris's real recording, but the flag is
not needed and not wanted here.

- [ ] **Step 3: Check the build's own refusals and the stale count**

Expected in the output: `stale scenes: none`, and the joined picture holding
the planned frames. The build aborts and names the thing rather than producing
something that looks right — a WAV whose real length disagrees with
`timings.json` by more than a frame, a rendered scene with the wrong frame
count, a scratch cut and a picture differing by more than a frame. Any of those
is a real fault; do not re-run until it is understood.

- [ ] **Step 4: LOOK at the contact sheet**

```bash
node -e "console.log('file:///' + require('path').resolve('tools/video/build/treasury/treasury-contact.png').replace(/\\\\/g,'/'))"
```

Read it. One frame per scene, in a grid. This is the cheapest place to see the
two things tests never catch: a scene that is visually the same as its
neighbour, and a chapter that reads flat. Chapters 2 to 5 are nineteen scenes
of one object — if they read as nineteen copies of one picture rather than one
object being worked on, that is a review finding to raise now, not after Chris
watches it.

- [ ] **Step 5: Confirm nothing under `build/` is staged**

```bash
git status --short
```

Expected: no `tools/video/build/` path appears. `render.yaml` serves the whole
repo and a committed MP4 ships on every deploy.

- [ ] **Step 6: Hand Chris the three links**

Chris reviews from the scratch cut, the contact sheet and the timing sheet, as
`file:///` links, all three together:

- `tools/video/build/treasury/treasury-scratch.mp4`
- `tools/video/build/treasury/treasury-contact.png`
- `tools/video/build/treasury/treasury-timing.md`

Say in the handover: the finished running time against 5:06 and 5:26 for
episodes 1 and 2 — that is the question he parked on 2026-10-12 and chose to
answer off the stitched cut; which government `drawPayments` shows and why it
is not Los Angeles; and the longest join the re-split left.

---

## Risks

| Risk | Handling |
|---|---|
| **L011 may have no live panel to draw.** Only two entities carry transaction rows app-wide, and Los Angeles is not one. | Task 4 Step 4 verifies it before a line is drawn and STOPS if it cannot. The answer is Chris's — cut the line or name the other government — not a table of invented payees. |
| A recogniser that drops a whole reading | Found and fixed in Task 1: L012 needed no re-record. The lost-audio scan runs before any take is trusted, and the README carries it. |
| The episode runs long — near 6:20 against 5:06 and 5:26 | Chris chose on 2026-10-12 to judge it from the stitched cut. Task 9 Step 6 puts the number in front of him. |
| A re-split after any art is written | Every in-scene second dies. If it happens, re-read every one from `words.md`; do not apply a delta. Grep both files for `fade(t,`, `ease((t -`, `ease(t /` and every `+ i *` stagger. Compass needed 8 numbers in `episode.mjs` and 19 in `art.js`, and the last 5 turned up only in a final sweep after a build had started. |
| An asset refresh after the art is written | `codeKey` digests every `.js` in the directory, so it invalidates every scene and costs a full rebuild. That is why Task 2 runs before Task 3. |
| Nineteen scenes of one object reads flat | Task 9 Step 4 asks the contact sheet. It is a review finding, not a build failure. |
| The live figures change under us | `capture-data.mjs` re-reads them all. A changed figure is a decision — the narration may no longer be true of it — so it goes to Chris, never silently into `art.js`. |
| A faithful icicle is dense at 1920x1080 | The real component compresses ancestors and gives the current row the height. Los Angeles's top level is NINE segments, not seven: the two smallest are 4% and 2%, and `icicle()` prints no label narrower than its own name needs. |

## Verification

- `tests/video/12-episode.cjs` — scene and line pairing, chapter keys, every
  named draw function registered and every registered one used. Under a second,
  and the cheapest way to learn a line was dropped.
- `tests/video/16-treasury.cjs` — the five Review Focus failures, as pixel
  questions, because the complaints they came from were pixel complaints.
- The full video suite before any commit that touches `art.js`.
- The contact sheet, looked at.
- Chris reviews the scratch cut, the contact sheet and the timing sheet.
