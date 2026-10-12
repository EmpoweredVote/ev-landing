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

const NOISE = -40;        // dB; below this counts as silence
const MINSIL = 0.35;      // seconds; shorter than this is a pause inside a line
const GAP = 0.45;         // seconds between lines in the joined vo.wav
const OVERRIDE = 0.75;    // a later take must read this well to beat an earlier one
const PEAK = -3;          // dBFS the whole set is lifted to, unless --no-gain

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

// Transcribing ten minutes of speech is the slow step, so the result is kept
// beside the build and reused until the take itself changes.
async function words(wav, cacheDir, model) {
  const st = await stat(wav);
  const key = path.basename(wav).replace(/[^\w.-]+/g, '_') + '.words.json';
  const cache = path.join(cacheDir, key);
  if (existsSync(cache)) {
    const held = JSON.parse(await readFile(cache, 'utf8'));
    if (held.size === st.size && held.mtime === st.mtimeMs && held.model === model) {
      return held.words;
    }
  }
  const tmp = cache + '.tmp';
  const py = path.join(path.dirname(fileURLToPath(import.meta.url)), 'transcribe.py');
  await run('python', [py, wav, tmp, '--model', model]);
  const got = JSON.parse(await readFile(tmp, 'utf8'));
  await writeFile(cache, JSON.stringify(
    { size: st.size, mtime: st.mtimeMs, model, words: got.words }), 'utf8');
  return got.words;
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
    const ws = await words(wav, voDir, model);
    const sil = await silences(wav, duration, noise, minsil);
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
