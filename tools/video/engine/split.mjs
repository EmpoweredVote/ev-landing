// A recorded take -> one audio file per numbered line, and a timings.json the
// rest of the pipeline cannot tell from a synthesized one.
//
//   node tools/video/engine/split.mjs tools/video/episodes/treasury audio/DJI_35.WAV
//   node tools/video/engine/split.mjs tools/video/episodes/essentials take.WAV pickup.WAV
//
// Several takes may be given for one episode. They are read in the order
// given and a LATER take wins: that is how a pickup works, where the reader
// goes back and records the two lines they fluffed. A pickup only overrides a
// line it reads clearly (see OVERRIDE), so a thirty-second file cannot quietly
// claim half an episode.
//
// Output is `build/<episode>/vo/` — the same shape `voice.mjs` writes, so
// `timing.mjs`, `render.mjs` and `build.mjs` need no knowledge that a person
// read these rather than a machine. Each line also gets its `.txt`, which is
// what stops a later `--voice` run from speaking over a real recording.
//
// What this refuses to do:
//
//   It will not invent a line. A line no take holds is named and the run
//   stops, because a missing per-line WAV is a silent desync: the build
//   resyncs the voice track to the picture and the end of the episode is cut
//   off, and nothing in the output looks wrong.
//
//   It will not write a WAV whose real length disagrees with timings.json.
//   Every file is probed after it is written and the probed length is what
//   goes in the sheet.

import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, stat, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScript } from './script.mjs';
import { alignTake, cutPoints, openingPause, applyPins, clipped } from './align.mjs';
import { lostSpans, offsetWords, spliceWords, movedCuts, wordSheet } from './repair.mjs';

const NOISE = -40;        // dB; below this counts as silence
const MINSIL = 0.35;      // seconds; shorter than this is a pause inside a line
const GAP = 0.45;         // seconds between lines in the joined vo.wav
const OVERRIDE = 0.75;    // a later take must read this well to beat an earlier one
const PEAK = -3;          // dBFS the whole set is lifted to, unless --no-gain
const PAD = 0.6;          // air either side of a repair slice, so the model has context
// Bumped when the repair pass changes what it returns, so a cached word stream
// from an older run is re-made instead of silently reused.
const REPAIR = 1;

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { err += d; });
    p.on('error', reject);
    p.on('close', code => code === 0
      ? resolve({ out: out.trim(), err })
      : reject(new Error(cmd + ' exited ' + code + ': ' + (err || out).slice(-2000))));
  });
}

async function probeDuration(file) {
  const { out } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', file]);
  const n = Number(out);
  if (!Number.isFinite(n) || n <= 0) throw new Error('ffprobe gave no duration for ' + file);
  return n;
}

async function probePeak(file) {
  const { err } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file,
    '-af', 'volumedetect', '-f', 'null', '-']).catch(e => ({ err: String(e) }));
  const m = /max_volume:\s*(-?[\d.]+) dB/.exec(err || '');
  if (!m) throw new Error('could not measure the peak of ' + file);
  return Number(m[1]);
}

// ffmpeg reports silence as start/end pairs on stderr. The last region may be
// open-ended when the take finishes quiet, so it is closed at the duration.
async function silences(file, duration, noise, minsil) {
  const { err } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file,
    '-af', `silencedetect=noise=${noise}dB:d=${minsil}`, '-f', 'null', '-']);
  const out = [];
  let open = null;
  for (const m of err.matchAll(/silence_(start|end):\s*(-?[\d.]+)/g)) {
    if (m[1] === 'start') open = Math.max(0, Number(m[2]));
    else if (open !== null) { out.push([open, Number(m[2])]); open = null; }
  }
  if (open !== null) out.push([open, duration]);
  return out;
}

// `python` is not a command on every machine. A Windows box with only the
// launcher installed resolves it to the Microsoft Store shim, which exits
// non-zero after printing an advert. Probed once and remembered, because the
// repair pass below calls it once per lost span.
let PYTHON = null;
async function python() {
  if (PYTHON) return PYTHON;
  for (const cmd of ['python', 'py', 'python3']) {
    try {
      const { out } = await run(cmd, ['-c', 'import sys; print(sys.version_info[0])']);
      if (out.trim() === '3') { PYTHON = cmd; return cmd; }
    } catch (e) { /* try the next one */ }
  }
  throw new Error('no python 3 on PATH: tried python, py, python3 — faster-whisper needs one');
}

async function transcribe(wav, out, model) {
  const py = path.join(path.dirname(fileURLToPath(import.meta.url)), 'transcribe.py');
  await run(await python(), [py, wav, out, '--model', model]);
  return JSON.parse(await readFile(out, 'utf8')).words || [];
}

// A gap in the word stream is NOT evidence of silence. Whatever the model, a
// long file makes it skip, and what it skips is usually one half of a line the
// reader read twice — which downstream looks like a line abandoned mid-
// sentence. See repair.mjs for what this cost before it existed.
//
// So every gap that the tape was speaking through is transcribed again on its
// own, where there is no long-file context to skip over, and spliced back.
async function repairLost(wav, ws, sil, duration, model, cacheDir) {
  const spans = lostSpans(ws, sil, duration);
  if (!spans.length) return ws;

  console.log(`the transcript has no words for ${spans.length} span(s) the tape was ` +
    `speaking through — transcribing each one on its own:`);
  const slice = path.join(cacheDir, '_repair.wav');
  const out = path.join(cacheDir, '_repair.json');
  const repairs = [];
  for (const sp of spans) {
    const from = Math.max(0, sp.from - PAD);
    const to = Math.min(duration, sp.to + PAD);
    await run('ffmpeg', ['-hide_banner', '-nostats', '-y', '-ss', String(from),
      '-t', String(to - from), '-i', wav, '-ac', '1', '-ar', '16000', slice]);
    const got = offsetWords(await transcribe(slice, out, model), from);
    const kept = got.filter(w => w.s >= sp.from && w.s < sp.to);
    console.log(`  ${sp.from.toFixed(2)}–${sp.to.toFixed(2)}s (${sp.sound.toFixed(2)}s of sound): ` +
      (kept.length ? '"' + kept.map(x => x.w.trim()).join(' ') + '"' : 'no words — not speech'));
    repairs.push({ from: sp.from, to: sp.to, words: got });
  }
  await unlink(slice).catch(() => {});
  await unlink(out).catch(() => {});

  const merged = spliceWords(ws, repairs);
  const gained = merged.length - ws.length;
  console.log(`recovered ${gained} word${gained === 1 ? '' : 's'} the first pass lost`);
  return merged;
}

// Transcribing ten minutes of speech is the slow step, so the result is kept
// beside the build and reused until the take itself changes.
async function words(wav, cacheDir, model, opts = {}) {
  const st = await stat(wav);
  const key = path.basename(wav).replace(/[^\w.-]+/g, '_') + '.words.json';
  const cache = path.join(cacheDir, key);
  if (existsSync(cache)) {
    const held = JSON.parse(await readFile(cache, 'utf8'));
    // noise and minsil are part of the key because the repair pass SPLICES
    // words into the cached stream, and which spans it repairs comes from the
    // silences those two thresholds decide. Re-running with --noise would
    // otherwise read back a stream repaired under the old threshold and hand
    // cutPoints two inconsistent views of one tape.
    if (held.size === st.size && held.mtime === st.mtimeMs && held.model === model &&
        held.repair === REPAIR && held.noise === opts.noise && held.minsil === opts.minsil) {
      return held.words;
    }
  }
  const tmp = cache + '.tmp';
  let got = await transcribe(wav, tmp, model);
  if (opts.silences) got = await repairLost(wav, got, opts.silences, opts.duration, model, cacheDir);
  await writeFile(cache, JSON.stringify(
    { size: st.size, mtime: st.mtimeMs, model, repair: REPAIR,
      noise: opts.noise, minsil: opts.minsil, words: got }), 'utf8');
  await unlink(tmp).catch(() => {});
  return got;
}

// Name every cut that moved since the last split, so a re-time is a decision
// rather than a discovery. Reads the _source.json already beside the build;
// nothing to compare against is a first split and says nothing.
async function reportMoved(voDir, now) {
  const f = path.join(voDir, '_source.json');
  // build/ is git-ignored, so "no record" is the normal state of a fresh clone
  // or a second machine — exactly where somebody is most likely to re-split
  // without knowing what it costs. Saying nothing there is the silent failure
  // this whole report exists to prevent.
  if (!existsSync(f)) {
    console.log('\nno previous split beside this build, so this run cannot say ' +
      'what moved.\nIf episode.mjs or art.js already carry seconds, re-read every ' +
      'one of them.\n');
    return;
  }
  let was = null;
  try {
    const held = JSON.parse(await readFile(f, 'utf8'));
    was = Array.isArray(held) ? held : held.lines;
  } catch (e) {
    console.log('\nthe previous split record is unreadable, so this run cannot ' +
      'say what moved.\n');
    return;
  }

  const moved = movedCuts(was, now);
  if (!moved.length) return;

  console.log(`\n${moved.length} cut${moved.length === 1 ? '' : 's'} MOVED since the last split. ` +
    `Every in-scene second in episode.mjs and art.js is measured from its line's\n` +
    `cut start, so each of these invalidates the numbers written against it:`);
  for (const m of moved.slice(0, 40)) {
    if (m.what !== 'moved') { console.log(`  ${m.id}  ${m.what.toUpperCase()}`); continue; }
    const d = n => (n >= 0 ? '+' : '') + n.toFixed(3) + 's';
    console.log(`  ${m.id}  start ${d(m.dStart)}, end ${d(m.dEnd)}   ` +
      `(${m.from.start.toFixed(2)}–${m.from.end.toFixed(2)} -> ${m.to.start.toFixed(2)}–${m.to.end.toFixed(2)})`);
  }
  if (moved.length > 40) console.log(`  ...and ${moved.length - 40} more`);
  console.log('Read the word again; do not apply the delta. See "A re-split invalidates\n' +
    'every one of those seconds" in tools/video/README.md.\n');
}

export async function split(episodeDir, takes, opts = {}) {
  const model = opts.model || 'small.en';
  const noise = opts.noise == null ? NOISE : opts.noise;
  const minsil = opts.minsil == null ? MINSIL : opts.minsil;
  const gap = opts.gap == null ? GAP : opts.gap;

  const epDir = path.resolve(episodeDir);
  const id = path.basename(epDir);
  const outDir = path.resolve(opts.out || path.join(epDir, '..', '..', 'build', id));
  const voDir = path.join(outDir, 'vo');
  await mkdir(voDir, { recursive: true });

  const lines = parseScript(await readFile(path.join(epDir, 'script.md'), 'utf8'));

  // Cuts the ear settled, which the words cannot. Optional; see align.mjs.
  const pinFile = path.join(epDir, 'cuts.json');
  const pins = existsSync(pinFile) ? JSON.parse(await readFile(pinFile, 'utf8')) : {};
  const known = new Set(lines.map(l => l.id));
  const stray = Object.keys(pins).filter(k => !k.startsWith('_') && !known.has(k));
  if (stray.length) {
    throw new Error('cuts.json pins ' + stray.join(', ') + ', which the script does not have' +
      ' — a pin that matches nothing is how a cut stays wrong after somebody has fixed it');
  }

  // ---- where each line sits, in each take ----
  const reads = new Map();                       // line id -> {take, start, end, score}
  const perTake = [];
  const silByTake = [];
  const wordsByTake = [];
  const usedPins = [];
  for (let t = 0; t < takes.length; t++) {
    const wav = path.resolve(takes[t]);
    const duration = await probeDuration(wav);
    // The silences come first: the repair pass inside words() needs them to
    // know which gaps in the transcript the tape was speaking through.
    const sil = await silences(wav, duration, noise, minsil);
    const ws = await words(wav, voDir, model,
      { duration, silences: sil, noise: noise, minsil: minsil });
    wordsByTake[t] = ws;
    const { cuts, missing } = alignTake(ws, lines);
    const mine = {};
    for (const [k, v] of Object.entries(pins)) {
      if (k.startsWith('_')) continue;
      if (v.take && v.take !== path.basename(wav)) continue;
      mine[k] = v;
    }
    const pinned = applyPins(cutPoints(cuts, sil, duration), mine);
    const points = pinned.spans;
    for (const pid of pinned.used) usedPins.push(`${pid} in ${path.basename(wav)}`);
    const byId = new Map(points.map(p => [p.id, p]));

    for (const c of cuts) {
      const held = reads.get(c.id);
      if (held && c.score < OVERRIDE) continue;  // a pickup must read the line clearly
      const p = byId.get(c.id);
      reads.set(c.id, { take: t, wav, start: p.start, end: p.end, score: c.score, hole: c.hole || 0 });
    }
    perTake.push({ wav, duration, read: cuts.length, missing, silences: sil.length });
    silByTake.push(sil);
    wordsByTake.push(ws);
    console.log(`take ${t + 1}: ${path.basename(wav)}  ${(duration / 60).toFixed(1)} min, ` +
      `${cuts.length} of ${lines.length} lines`);
  }

  // A pin that matched no take is a pin that did nothing. The stray check above
  // catches a pin naming a line the script does not have; this catches one
  // naming a take that was not passed — after a rename, a re-encode, or a
  // forgotten pickup. align.mjs puts it plainly: a pin that silently does
  // nothing is how a cut stays wrong after somebody has fixed it.
  const pinned = Object.keys(pins).filter(k => !k.startsWith('_'));
  const landed = new Set(usedPins.map(u => u.split(' ')[0]));
  const idle = pinned.filter(id => !landed.has(id));
  if (idle.length) {
    throw new Error('cuts.json pins ' + idle.join(', ') + ', and no take passed to ' +
      'this run matched — check the "take" filename in each. A pin that silently ' +
      'does nothing is how a cut stays wrong after somebody has fixed it.');
  }

  // A line the reader broke in half and picked up seconds later is kept whole
  // — half a line is worse — but the file then holds the pause, so it is named
  // here rather than left to be discovered in the cut.
  const broken = lines.filter(l => (reads.get(l.id) || {}).hole > 1.5)
    .map(l => `${l.id} (${reads.get(l.id).hole}s)`);
  if (broken.length) {
    console.log('read with a pause in the middle, and kept whole: ' + broken.join(', '));
  }

  if (usedPins.length) console.log('cut by hand from cuts.json: ' + usedPins.join(', '));

  // A line whose cut OPENS with speech, then a long silence, then more speech.
  // Sometimes that is a reading the reader abandoned and the cut holds the
  // stumble; more often it is a reader pausing mid-sentence, which must be
  // left alone. Nothing here can tell those apart — see openingPause — so the
  // seconds are printed and the ear decides. A line already pinned has been
  // decided, so it is not raised again.
  const suspectBy = new Map();
  for (const l of lines) {
    const r = reads.get(l.id);
    if (!r || pins[l.id]) continue;
    if (!suspectBy.has(r.take)) suspectBy.set(r.take, []);
    suspectBy.get(r.take).push({ id: l.id, start: r.start, end: r.end });
  }
  const suspects = [];
  for (const [t, spans] of suspectBy) {
    for (const f of openingPause(spans, silByTake[t] || [])) {
      suspects.push(`${f.id} (${f.dur}s of silence at ${f.at.toFixed(2)}s` +
        `, speech again at ${f.resume.toFixed(2)}s)`);
    }
  }
  if (suspects.length) {
    console.log('may open on a false start — listen, then pin in cuts.json if it is one:');
    for (const x of suspects) console.log('  ' + x);
  }

  // A cut that does not hold the whole line it is named after. The words are
  // there on the tape, in the script, and in no WAV — see `clipped`. Reported
  // per take, against the cut that was actually chosen, so a pin that fixed
  // one of these stops it being raised again.
  // A pinned line has already been decided by the ear, so it is not raised
  // again — the same rule the false-start report follows, and for the same
  // reason: a warning that keeps firing after somebody has answered it is a
  // warning that gets ignored on the line where it matters.
  const short = [];
  const byTake = new Map();
  for (const l of lines) {
    const r = reads.get(l.id);
    if (!r || pins[l.id]) continue;
    if (!byTake.has(r.take)) byTake.set(r.take, []);
    byTake.get(r.take).push({ id: l.id, start: r.start, end: r.end });
  }
  for (const [t, spans] of byTake) {
    for (const c of clipped(spans, wordsByTake[t] || [], lines)) {
      if (c.head) short.push(`${c.id} opens ${c.head} word(s) in — "${c.headWords}" is not in the cut`);
      if (c.tail) short.push(`${c.id} stops ${c.tail} word(s) early — "${c.tailWords}" is not in the cut`);
    }
  }
  if (short.length) {
    console.log('cut does not hold the whole line — listen, then pin in cuts.json:');
    for (const x of short) console.log('  ' + x);
  }

  const absent = lines.filter(l => !reads.has(l.id)).map(l => l.id);
  if (absent.length) {
    throw new Error('no take holds ' + absent.join(', ') +
      ' — record the missing line(s) and pass the pickup as another take');
  }

  // ---- one gain for the whole set, so the episodes still match each other ----
  let gainDb = 0;
  if (opts.gain !== false) {
    const peaks = [];
    for (const t of perTake) peaks.push(await probePeak(t.wav));
    gainDb = Math.round(((opts.peak == null ? PEAK : opts.peak) - Math.max(...peaks)) * 100) / 100;
    console.log(`gain: ${gainDb >= 0 ? '+' : ''}${gainDb} dB on every line ` +
      `(loudest take peaked at ${Math.max(...peaks)} dBFS)`);
  }

  // ---- what this re-split would change, before it changes it ----
  //
  // A re-split is never a no-op, and the danger is that nothing says so. Every
  // in-scene second in episode.mjs and art.js is measured from its line's cut
  // START, so a cut that moves invalidates every number written against that
  // line. Episode 1 paid a session for exactly this.
  //
  // It happens with no code change at all: re-transcribing the Compass take
  // with the same model and the same file gave 1236 words where the committed
  // cuts came from 1220, and L020 ran 11.5 seconds longer.
  await reportMoved(voDir, lines.map(l => {
    const r = reads.get(l.id);
    return { id: l.id, start: r.start, end: r.end };
  }));

  if (opts.dry) {
    for (const l of lines) {
      const r = reads.get(l.id);
      console.log(`  ${l.id}  take ${r.take + 1}  ${r.start.toFixed(2)}–${r.end.toFixed(2)}s ` +
        `(${(r.end - r.start).toFixed(2)}s, match ${r.score})`);
    }
    return { lines: [], total: 0, dry: true };
  }

  // ---- cut ----
  const timings = { gap, source: 'recorded', takes: takes.map(t => path.basename(t)), lines: [], total: 0 };
  const concat = [];
  const silence = path.join(voDir, '_gap.wav');
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi',
    '-i', 'anullsrc=r=48000:cl=mono', '-t', String(gap), silence]);

  let clock = 0;
  for (const line of lines) {
    const r = reads.get(line.id);
    const wav = path.join(voDir, line.id + '.wav');
    const filters = ['aresample=48000'];
    if (gainDb) filters.push(`volume=${gainDb}dB`);
    // -ss and -t before -i would seek on the input and lose sample accuracy on
    // a long file; after -i, ffmpeg decodes and trims exactly where asked.
    await run('ffmpeg', ['-y', '-v', 'error', '-i', r.wav,
      '-ss', String(r.start), '-to', String(r.end),
      '-af', filters.join(','), '-ac', '1', '-c:a', 'pcm_s16le', wav]);
    const dur = await probeDuration(wav);
    await writeFile(path.join(voDir, line.id + '.txt'), line.text, 'utf8');
    timings.lines.push({ id: line.id, text: line.text, direction: line.direction, start: clock, dur });
    concat.push(wav, silence);
    clock += dur + gap;
  }
  timings.total = clock;

  // Anything numbered that the script no longer has. The synthesized voice
  // leaves a .wav, a .txt and an .mp3 per line, and a line deleted from the
  // script leaves all three behind: the .txt is what `voice.mjs` calls a cache
  // hit, so a line brought back under that number later would be spoken by the
  // machine while every line around it is the real reading, and nothing would
  // say so.
  const keep = new Set(lines.map(l => l.id));
  const strays = [];
  for (const name of await readdir(voDir)) {
    const m = /^(L\d+)\.(wav|txt|mp3)$/.exec(name);
    if (m && !keep.has(m[1])) { await unlink(path.join(voDir, name)); strays.push(name); }
  }
  if (strays.length) {
    console.log(`removed ${strays.length} file(s) for lines the script no longer has: ` +
      [...new Set(strays.map(f => f.split('.')[0]))].join(', '));
  }

  const listFile = path.join(voDir, '_concat.txt');
  await writeFile(listFile,
    concat.map(f => "file '" + f.replace(/\\/g, '/') + "'").join('\n') + '\n', 'utf8');
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0',
    '-i', listFile, '-c', 'copy', path.join(outDir, 'vo.wav')]);

  // The word sheet. EVERY in-scene second in episode.mjs is read off this, so
  // it is derived here rather than kept by hand: a hand-written one goes on
  // printing the cut seconds it was written against while the cuts underneath
  // it move, and it reads exactly like a measurement while it does it.
  const wordsFor = {};
  for (let i = 0; i < perTake.length; i++) {
    wordsFor[path.basename(perTake[i].wav)] = wordsByTake[i] || [];
  }
  await writeFile(path.join(outDir, 'words.md'), wordSheet(lines.map(l => {
    const r = reads.get(l.id);
    return { id: l.id, take: path.basename(r.wav), start: r.start, end: r.end,
             match: r.score, hole: r.hole };
  }), wordsFor, id), 'utf8');

  await writeFile(path.join(outDir, 'timings.json'), JSON.stringify(timings, null, 2), 'utf8');
  // Which seconds of which take each line came from. Not read by the pipeline;
  // it is the record you need when a line sounds wrong and you want the take.
  await writeFile(path.join(voDir, '_source.json'), JSON.stringify({
    takes: perTake.map(t => ({ file: path.basename(t.wav), duration: t.duration })),
    gainDb,
    lines: lines.map(l => {
      const r = reads.get(l.id);
      return { id: l.id, take: path.basename(r.wav), start: r.start, end: r.end, match: r.score, hole: r.hole };
    })
  }, null, 2), 'utf8');

  return timings;
}

const invoked = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const argv = process.argv.slice(2);
  const opts = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry') opts.dry = true;
    else if (a === '--no-gain') opts.gain = false;
    else if (a === '--model') opts.model = argv[++i];
    else if (a === '--peak') opts.peak = Number(argv[++i]);
    else if (a === '--noise') opts.noise = Number(argv[++i]);
    else if (a === '--out') opts.out = argv[++i];
    else positional.push(a);
  }
  if (positional.length < 2) {
    console.error('usage: split.mjs <episode dir> <take.wav> [more takes...] ' +
      '[--dry] [--no-gain] [--model small.en] [--peak -3] [--noise -40]');
    process.exit(2);
  }
  const [epDir, ...takes] = positional;
  split(epDir, takes, opts).then(t => {
    if (!t.dry) {
      console.log(`${t.lines.length} lines, ${(t.total / 60).toFixed(1)} min of voice`);
    }
  }).catch(e => { console.error(String(e.message || e)); process.exit(1); });
}
