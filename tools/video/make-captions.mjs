/**
 * make-captions.mjs — subtitles for a built episode, timed off the real read.
 *
 *   node tools/video/make-captions.mjs tools/video/episodes/compass
 *
 * Writes build/<ep>/<ep>.srt and build/<ep>/<ep>.vtt. Both are for YouTube and
 * LinkedIn, which take an upload rather than reading the burned-in picture.
 *
 * Where the times come from
 * -------------------------
 * Three files already in the build hold everything needed, so no second here is
 * estimated:
 *
 *   timings.json          each line's length, measured from its own WAV
 *   vo/_source.json       which seconds of which take each line was cut from
 *   vo/<take>.words.json  every spoken word of that take, with its seconds
 *
 * planFrames() then gives the frame-snapped scene start, which is where the
 * build puts each line's audio in vo-synced.wav. A word spoken at take time t
 * inside line L therefore lands in the film at
 *
 *   scene.start + (t - source.start)
 *
 * The recogniser's words and the script's words are NOT the same list — a read
 * agrees with the page on 80 to 100 per cent of its words. So the script's text
 * is what the caption says, and the recogniser only supplies anchors: a script
 * word that matches a spoken word takes its clock, and the rest are spread
 * between their neighbours. The caption therefore never shows a mis-heard word,
 * and never drifts far from the voice either.
 *
 * A line that was trimmed mid-read (split.mjs `keep` spans) breaks the single
 * offset above. No episode has one, so this refuses rather than quietly timing
 * such a line wrong.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { planFrames } from './engine/timing.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// Caption shape. YouTube renders about 42 characters to a row and shows two.
const MAX_CHARS = 74;   // one cue, both rows together
const ROW_CHARS = 42;   // one row
const MIN_CHARS = 26;   // do not break a sentence off shorter than this
const MIN_DUR = 1.1;    // a cue has to stay up long enough to read
const MAX_DUR = 6.5;

const APOS = /[‘’]/g;
const norm = (w) => w.toLowerCase().replace(APOS, "'").replace(/[^a-z0-9']/g, '');

// Script words <- spoken words, by Needleman-Wunsch over the two word lists.
// A greedy walk is not enough. Where the recogniser drops the first words of a
// line the greedy version starts out of phase, and it then matches a common
// word like "you" to the WRONG "you" several seconds later: compass L003 came
// out with its first sentence held for 4.4 seconds and its last three words
// sharing 0.3. A global alignment cannot go out of phase like that.
function anchor(script, spoken) {
  const m = script.length, n = spoken.length;
  const MATCH = 2, MISS = -1, GAP = -1;
  const sc = [], mv = [];
  for (let i = 0; i <= m; i++) {
    sc.push(new Float64Array(n + 1));
    mv.push(new Int8Array(n + 1));
    sc[i][0] = i * GAP;
    mv[i][0] = 1;                                   // 1 = take a script word
  }
  for (let j = 0; j <= n; j++) { sc[0][j] = j * GAP; mv[0][j] = 2; }
  mv[0][0] = 0;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const diag = sc[i - 1][j - 1] + (script[i - 1] === spoken[j - 1].n ? MATCH : MISS);
      const up = sc[i - 1][j] + GAP;
      const left = sc[i][j - 1] + GAP;
      // A tie goes to the diagonal so equal words pair up rather than drifting.
      if (diag >= up && diag >= left) { sc[i][j] = diag; mv[i][j] = 3; }
      else if (up >= left) { sc[i][j] = up; mv[i][j] = 1; }
      else { sc[i][j] = left; mv[i][j] = 2; }
    }
  }
  const at = new Array(m).fill(null);
  let i = m, j = n;
  while (i > 0 || j > 0) {
    const move = mv[i][j];
    if (move === 3) {
      if (script[i - 1] === spoken[j - 1].n) at[i - 1] = spoken[j - 1];
      i--; j--;
    } else if (move === 1) i--;
    else j--;
  }
  return at;
}

// The recogniser's word clock is right most of the time and badly smeared some
// of the time — around compass L003 it put "the" and "ballot" at a second and a
// half each and ran two seconds ahead of the energy onset the cut was made on.
// So an anchor is only kept when it is believable: inside the line it belongs
// to, no longer than a word takes to say, and later than the anchor before it.
const WORD_CEILING = 0.9;
function keepAnchors(at, from, to) {
  let last = from - 0.001;
  for (let i = 0; i < at.length; i++) {
    const a = at[i];
    if (!a) continue;
    const bad = a.e - a.s > WORD_CEILING || a.s < from - 0.001 || a.e > to + 0.001 || a.s < last;
    if (bad) at[i] = null; else last = a.s;
  }
  return at;
}

// Every script word gets a start and an end: anchored where it can be, spread
// evenly between anchors where it cannot.
function timeWords(tokens, at, from, to) {
  const n = tokens.length;
  const t = new Array(n);
  const idx = [];
  for (let i = 0; i < n; i++) if (at[i]) idx.push(i);

  if (!idx.length) {
    // Nothing matched. Fall back to a character-weighted spread.
    const total = tokens.reduce((s, w) => s + w.length + 1, 0);
    let c = 0;
    for (let i = 0; i < n; i++) {
      const s = from + (to - from) * (c / total);
      c += tokens[i].length + 1;
      t[i] = { s, e: from + (to - from) * (c / total) };
    }
    return t;
  }

  for (const i of idx) t[i] = { s: at[i].s, e: at[i].e };

  // Before the first anchor, after the last, and in each hole between two.
  const spread = (lo, hi, a, b) => {
    const span = b - a;
    const steps = hi - lo + 2;
    for (let i = lo; i <= hi; i++) {
      const k = i - lo + 1;
      t[i] = { s: a + span * (k / steps), e: a + span * ((k + 1) / steps) };
    }
  };
  const first = idx[0], last = idx[idx.length - 1];
  if (first > 0) spread(0, first - 1, from, t[first].s);
  if (last < n - 1) spread(last + 1, n - 1, t[last].e, to);
  for (let k = 0; k + 1 < idx.length; k++) {
    if (idx[k + 1] > idx[k] + 1) spread(idx[k] + 1, idx[k + 1] - 1, t[idx[k]].e, t[idx[k + 1]].s);
  }
  return t;
}

// Two rows at most, split as evenly as the words allow.
function wrap(text) {
  if (text.length <= ROW_CHARS) return text;
  const words = text.split(' ');
  let best = null;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
    if (a.length > ROW_CHARS || b.length > ROW_CHARS) continue;
    const score = Math.abs(a.length - b.length);
    if (!best || score < best.score) best = { score, rows: a + '\n' + b };
  }
  return best ? best.rows : text;
}

const ENDS = /[.!?:][")\]]?$/;
const CLAUSE = /[,;—-]$/;

function cues(tokens, t, from, to) {
  // Groups are token index ranges, not strings, so a later pass can move a word
  // from one cue to the next and still know what second that word was said.
  const groups = [];
  const say = (g) => tokens.slice(g.a, g.b + 1).join(' ');
  let start = 0;
  for (let i = 0; i < tokens.length; i++) {
    const len = tokens.slice(start, i + 1).join(' ').length;
    const nextLen = i + 1 < tokens.length ? len + 1 + tokens[i + 1].length : Infinity;
    const dur = t[i].e - t[start].s;
    const hard = nextLen > MAX_CHARS || dur > MAX_DUR;
    const soft = len >= MIN_CHARS &&
      (ENDS.test(tokens[i]) || (CLAUSE.test(tokens[i]) && nextLen > ROW_CHARS));
    if (i === tokens.length - 1 || hard || soft) {
      groups.push({ a: start, b: i });
      start = i + 1;
    }
  }

  // A break taken on width can leave the tail of a sentence stranded — compass
  // had "stance." and "vote." alone on screen for under a second. First try to
  // give the runt back whole; where no neighbour has room, take words off the
  // neighbour instead, which costs the runt nothing and keeps both readable.
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (say(g).length >= MIN_CHARS) continue;
    const prev = i > 0 ? groups[i - 1] : null;
    const next = i + 1 < groups.length ? groups[i + 1] : null;
    const room = (o) => o && say(o).length + 1 + say(g).length <= MAX_CHARS;
    if (room(prev) && (!room(next) || say(prev).length <= say(next).length)) {
      prev.b = g.b; groups.splice(i, 1); i = Math.max(-1, i - 2);
    } else if (room(next)) {
      next.a = g.a; groups.splice(i, 1); i--;
    } else if (prev) {
      // Walk the boundary back one word at a time, while both sides stay legal.
      while (g.a > prev.a + 1 && say(g).length < MIN_CHARS) {
        const moved = { a: g.a - 1, b: g.b };
        if (say(moved).length > MAX_CHARS) break;
        if (say({ a: prev.a, b: prev.b - 1 }).length < MIN_CHARS) break;
        g.a--; prev.b--;
      }
    }
  }

  const out = groups.map((g) => ({ s: t[g.a].s, e: t[g.b].e, text: say(g) }));

  // Keep every cue inside its own line, and give a short one room to be read
  // without running into the cue after it.
  for (const c of out) { c.s = Math.max(from, c.s); c.e = Math.min(to, Math.max(c.e, c.s)); }
  for (let i = 0; i < out.length; i++) {
    if (out[i].e - out[i].s < MIN_DUR) {
      const roof = i + 1 < out.length ? out[i + 1].s : to;
      out[i].e = Math.min(roof, out[i].s + MIN_DUR);
    }
  }
  return out.filter((c) => c.e > c.s);
}

const stamp = (sec, sep) => {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' +
    String(s).padStart(2, '0') + sep + String(ms % 1000).padStart(3, '0');
};

const episodeDir = path.resolve(process.argv[2] || path.join(HERE, 'episodes/compass'));
const mod = await import(pathToFileURL(path.join(episodeDir, 'episode.mjs')).href + '?v=' + Date.now());
const episode = mod.default;
const outDir = path.resolve(path.join(episodeDir, '..', '..', 'build', episode.id));

const timings = JSON.parse(await readFile(path.join(outDir, 'timings.json'), 'utf8'));
const source = JSON.parse(await readFile(path.join(outDir, 'vo/_source.json'), 'utf8'));
const planned = planFrames(episode, timings);
const byLine = new Map(timings.lines.map((l) => [l.id, l]));
const srcOf = new Map(source.lines.map((l) => [l.id, l]));

const takes = new Map();
for (const t of source.takes) {
  const j = JSON.parse(await readFile(path.join(outDir, 'vo', t.file + '.words.json'), 'utf8'));
  takes.set(t.file, j.words.map((w) => ({ n: norm(w.w), s: w.s, e: w.e })));
}

const all = [];
let anchored = 0, words = 0;
for (const scene of planned) {
  const line = byLine.get(scene.vo);
  const src = srcOf.get(scene.vo);
  if (!src) throw new Error(scene.vo + ' is not in vo/_source.json; re-split the take.');
  if (src.keep) throw new Error(scene.vo + ' was trimmed mid-read; this script cannot time it.');

  const from = scene.start, to = scene.start + line.dur;
  // A quarter second either side, so a word the energy onset cuts into is still
  // offered to the aligner. Anything that cannot be believed is dropped after.
  const spoken = (takes.get(src.take) || [])
    .filter((w) => w.e > src.start - 0.25 && w.s < src.end + 0.25)
    .map((w) => ({ n: w.n, s: from + (w.s - src.start), e: from + (w.e - src.start) }));

  const tokens = line.text.trim().split(/\s+/);
  const at = keepAnchors(anchor(tokens.map(norm), spoken), from, to);
  anchored += at.filter(Boolean).length;
  words += tokens.length;
  all.push(...cues(tokens, timeWords(tokens, at, from, to), from, to));
}

const srt = all.map((c, i) =>
  (i + 1) + '\n' + stamp(c.s, ',') + ' --> ' + stamp(c.e, ',') + '\n' + wrap(c.text) + '\n').join('\n');
const vtt = 'WEBVTT\n\n' + all.map((c) =>
  stamp(c.s, '.') + ' --> ' + stamp(c.e, '.') + '\n' + wrap(c.text) + '\n').join('\n');

await writeFile(path.join(outDir, episode.id + '.srt'), srt, 'utf8');
await writeFile(path.join(outDir, episode.id + '.vtt'), vtt, 'utf8');

const last = all[all.length - 1];
console.log(episode.id + ': ' + all.length + ' cues across ' + planned.length + ' lines');
console.log('  anchored on the read: ' + anchored + '/' + words +
  ' words (' + (100 * anchored / words).toFixed(1) + '%)');
console.log('  last cue out at ' + stamp(last.e, '.'));
console.log('  ' + path.join(outDir, episode.id + '.srt'));
console.log('  ' + path.join(outDir, episode.id + '.vtt'));
