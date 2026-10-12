// A recorded take -> which seconds hold which numbered line.
//
// The pipeline's other path writes one audio file per line because it speaks
// each line on its own. A human reads them in one continuous take, so the
// numbering has to be recovered from the words. That is all this file does:
// it takes a word stream with timings (from `transcribe.py`) and the episode's
// own lines, and says where each line is. It never touches audio.
//
// It aligns the whole take against the whole script in one pass, rather than
// hunting each line down on its own. Searching line by line looks simpler and
// loses on real material: the windows around a line that was read twice
// overlap each other, so the two readings cannot be told apart, and a line
// whose best window straddles its neighbour pushes that neighbour out. The
// whole-take alignment has no such choice to make — every spoken word belongs
// to at most one line, and the order follows from that.
//
// Three things it has to get right:
//
//   A fluffed line is read again, so the LAST complete reading is the one to
//   keep. That is the instruction the recording script gives the reader, so it
//   is the rule the cut follows: where two readings fit equally well, the
//   alignment takes the later one.
//
//   A title card's words sit inside the sign-off — "This is Treasury Tracker"
//   is contained in "That is Treasury Tracker. Go follow your money" — so a
//   per-line search cuts the title card out of the closing line nine minutes
//   later. Here the sign-off's words are already spoken for.
//
//   A line can simply not have been read. Filling it from whatever matched
//   best would put a neighbour's words under a scene that is not theirs, and
//   nothing downstream could tell.

const MATCH = 2;        // a spoken word that is the script's word
const MISS = -1;        // a spoken word where the script has a different one
const HEARD = 0;        // a spoken word the script does not have (a second take)
const UNSAID = -1;      // a script word nobody spoke
const FLOOR = 0.5;      // below this share of its words, a line was not read

export function normalise(text) {
  return String(text)
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// Similarity of two word lists, 0 to 1: twice the longest common subsequence
// over the combined length. Word order matters, which is the point — the same
// words in a different order are not a reading of the line.
export function ratio(a, b) {
  const n = a.length, m = b.length;
  if (!n || !m) return 0;
  let prev = new Uint16Array(m + 1);
  let cur = new Uint16Array(m + 1);
  for (let i = 1; i <= n; i++) {
    const ai = a[i - 1];
    for (let j = 1; j <= m; j++) {
      cur[j] = ai === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    const t = prev; prev = cur; cur = t;
    cur.fill(0);
  }
  return (2 * prev[m]) / (n + m);
}

// Align one take against one episode.
//
// `stream` is [{ w, s, e }] — a word and the seconds it starts and ends.
// Returns the seconds each line occupies, and the lines the take does not hold.
export function alignTake(stream, lines, opts = {}) {
  const floor = opts.floor == null ? FLOOR : opts.floor;

  const spoken = [];
  for (const it of stream) {
    const w = normalise(it.w)[0];
    if (w) spoken.push({ w, s: it.s, e: it.e });
  }
  // Every line's words laid end to end, remembering which line each came from.
  const want = [], owner = [];
  lines.forEach((l, li) => {
    for (const w of normalise(l.text)) { want.push(w); owner.push(li); }
  });

  const n = spoken.length, m = want.length;
  if (!n || !m) {
    return { cuts: [], missing: lines.map(l => l.id) };
  }

  // Needleman-Wunsch over words. Four moves: the spoken word is the script's
  // word, it is a different word, it is a word the script does not have (the
  // reader said it twice, or cleared their throat), or a script word was never
  // spoken.
  //
  // Passing over a spoken word is FREE. That is what makes the second reading
  // of a line as good as the first instead of worse by however many words the
  // first one cost to skip, which is what lets the tie-break below reach it.
  // Leaving a script word unspoken is not free, so the alignment will not drop
  // a line it can find.
  const score = new Float32Array((n + 1) * (m + 1));
  const from = new Uint8Array((n + 1) * (m + 1));   // 1 diagonal, 2 spoken-only, 3 script-only
  const at = (i, j) => i * (m + 1) + j;

  for (let i = 1; i <= n; i++) { score[at(i, 0)] = i * HEARD; from[at(i, 0)] = 2; }
  for (let j = 1; j <= m; j++) { score[at(0, j)] = j * UNSAID; from[at(0, j)] = 3; }

  for (let i = 1; i <= n; i++) {
    const wi = spoken[i - 1].w;
    for (let j = 1; j <= m; j++) {
      const same = wi === want[j - 1];
      const diag = score[at(i - 1, j - 1)] + (same ? MATCH : MISS);
      const skipHeard = score[at(i - 1, j)] + HEARD;
      const skipWant = score[at(i, j - 1)] + UNSAID;
      // Where the words are the same, a tie goes to the DIAGONAL: take the
      // match here. That is "read it again and the second take counts".
      //
      // It reads backwards, so it is worth saying why. Skipping a spoken word
      // is free, so every reading of a line scores the same and the choice
      // between them is this tie alone. The traceback walks from the END of
      // the take toward the start and stops at the first cell that says
      // "match here". Preferring skipHeard on a tie writes "no match here"
      // into every late cell, so the walk goes straight past the reading the
      // reader finished on and lands on the first one — which is the fluff
      // whenever the reader went again for a reason the words do not show.
      // Preferring the diagonal stops the walk at the LAST reading instead.
      //
      // Only a real match takes the tie. A diagonal step on two DIFFERENT
      // words carries a penalty and is a last resort, so it keeps its old
      // place behind skipHeard; letting it win a tie would spend a script
      // word on a spoken word that is not it.
      let best, dir;
      if (same) { best = diag; dir = 1; if (skipHeard > best) { best = skipHeard; dir = 2; } }
      else { best = skipHeard; dir = 2; if (diag > best) { best = diag; dir = 1; } }
      if (skipWant > best) { best = skipWant; dir = 3; }
      score[at(i, j)] = best;
      from[at(i, j)] = dir;
    }
  }

  // Walk it back: for each line, the spoken words that carried it.
  const got = lines.map(() => []);
  let i = n, j = m;
  while (i > 0 || j > 0) {
    const dir = (i === 0) ? 3 : (j === 0) ? 2 : from[at(i, j)];
    if (dir === 1) {
      if (spoken[i - 1].w === want[j - 1]) got[owner[j - 1]].push(i - 1);
      i--; j--;
    } else if (dir === 2) i--;
    else j--;
  }

  const size = new Array(lines.length).fill(0);
  owner.forEach(li => { size[li]++; });

  const cuts = [], missing = [];
  let after = 0;
  for (let li = 0; li < lines.length; li++) {
    const all = got[li].reverse();
    // Whether the line was read at all is a question about every word of it
    // that was heard; where exactly it starts and stops is a separate question,
    // answered by refine() inside the region those words mark out.
    const read = size[li] ? all.length / size[li] : 0;
    if (read < floor || !all.length) { missing.push(lines[li].id); continue; }
    const tgt = [];
    for (let k = 0; k < m; k++) if (owner[k] === li) tgt.push(want[k]);
    const win = refine(spoken, tgt, Math.max(after, all[0]), all[all.length - 1]);
    if (!win) { missing.push(lines[li].id); continue; }
    after = win.i;
    cuts.push({
      id: lines[li].id,
      start: spoken[win.i].s,
      end: spoken[win.j].e,
      score: Math.round(win.raw * 1000) / 1000,
      hole: win.hole
    });
  }
  return { cuts, missing };
}

// The body of a reading, not its outermost matches.
//
// The whole-take alignment says WHICH part of the take holds a line; it is bad
// at saying exactly where that line starts and stops. Two readings of the same
// line cost it nothing to mix — the first half from the attempt the reader
// abandoned, the second half from the one they finished — and the span then
// covers the pause between them, so the cut file opens with a false start and
// several seconds of room tone.
//
// So each line is settled inside the region the alignment put it in: the
// window of spoken words that reads most like the line, and where two windows
// read alike, the LATER one. That is "read it again and the second take
// counts", and it is the one rule here the reader was actually given.
const NEAR = 0.02;      // two windows this close are the same quality
const EDGE = 6;         // words of room to look either side of the region
const HOLE = 1.5;       // a pause this long inside a window crosses a boundary
const SAME = 5;         // windows starting this close are one reading, not two
const WORSE = 0.15;     // how much worse a hole-free window may read before
                        // the hole is accepted as part of the reading

// The first and last words of `a` that carry `b`'s own order. Everything
// outside them is a false start, a word said twice, or the beginning of the
// line next door — words the window picked up on its way past, not words of
// this line. The exact boundary in the AUDIO is not settled here: cutPoints
// pushes it out to the silence around the reading, which is what restores a
// trailing word the recogniser wrote down wrong.
function bounds(a, b) {
  const n = a.length, m = b.length;
  const d = [];
  for (let i = 0; i <= n; i++) d.push(new Uint16Array(m + 1));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      d[i][j] = a[i - 1] === b[j - 1]
        ? d[i - 1][j - 1] + 1
        : Math.max(d[i - 1][j], d[i][j - 1]);
    }
  }
  let i = n, j = m, first = -1, last = -1;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      if (last < 0) last = i - 1;
      first = i - 1;
      i--; j--;
    } else if (d[i - 1][j] >= d[i][j - 1]) i--;
    else j--;
  }
  return first < 0 ? [0, n - 1] : [first, last];
}

function refine(spoken, tgt, lo, hi) {
  const n = tgt.length;
  lo = Math.max(0, lo - EDGE);
  hi = Math.min(spoken.length - 1, hi + EDGE);
  const widths = new Set();
  for (const f of [0.8, 0.9, 1, 1.08, 1.16]) widths.add(Math.max(1, Math.round(n * f)));

  const seen = [];
  let top = 0;
  for (const L of widths) {
    for (let i = lo; i + L - 1 <= hi; i++) {
      const raw = ratio(spoken.slice(i, i + L).map(x => x.w), tgt);
      let hole = 0;
      for (let k = i + 1; k <= i + L - 1; k++) {
        hole = Math.max(hole, spoken[k].s - spoken[k - 1].e);
      }
      if (raw > top) top = raw;
      seen.push({ raw, i, j: i + L - 1, hole: Math.round(hole * 100) / 100 });
    }
  }
  if (!seen.length) return null;

  // A run of consecutive spoken words can still span a long pause, so the best
  // match for a line can be its abandoned first half, the pause, and the first
  // half of the reading that replaced it. Prefer a window with no pause in it.
  // But a reader who loses their place mid-line and picks it up ten seconds
  // later has no pause-free reading at all, and half a line is worse than a
  // long one, so the pause is accepted when avoiding it costs real words.
  const clean = seen.filter(w => w.hole <= HOLE);
  let pool = seen;
  if (clean.length) {
    const cleanTop = clean.reduce((a, w) => Math.max(a, w.raw), 0);
    if (cleanTop >= top - WORSE) { pool = clean; top = cleanTop; }
  }
  // Of everything that reads as well as the best window, the LAST one — that
  // is the second take. Starting at the same word, the one that reads best,
  // and failing that the shorter one: a window that reads as well while
  // reaching further has reached into the line next door.
  // Windows that read as well as the best one. Those starting within a few
  // words of each other are the same reading seen through different widths,
  // not different attempts — so they are grouped first, the LAST group is the
  // last attempt, and inside it the best-reading window wins. Without the
  // grouping, "take the latest start" quietly shaves the opening sentence off
  // a line whenever a shorter window scores a hair's breadth lower.
  const near = pool.filter(w => w.raw >= top - NEAR).sort((a, b) => a.i - b.i);
  if (!near.length) return null;
  let group = [near[0]];
  for (let k = 1; k < near.length; k++) {
    if (near[k].i - near[k - 1].i > SAME) group = [];
    group.push(near[k]);
  }
  // Inside the group the EARLIEST start wins a tie, which is the opposite of
  // the rule that chose the group. Both are the same instruction read at two
  // scales. "The later reading counts" decides between READINGS, and readings
  // are seconds apart — that is what the grouping above has already settled.
  // Two windows one word apart are not two readings; they are one reading seen
  // through two widths, and preferring the later of those starts the line two
  // words into itself. Compass L022 came out as "...the answer that fits you
  // best", with "You choose" cut off, for exactly that reason.
  let best = null;
  for (const w of group) {
    if (!best
      || w.raw > best.raw
      || (w.raw === best.raw && w.i < best.i)
      || (w.raw === best.raw && w.i === best.i && w.j < best.j)) best = w;
  }
  if (!best) return null;

  const [a, b] = bounds(spoken.slice(best.i, best.j + 1).map(x => x.w), tgt);
  const i = best.i + a, j = best.i + b;
  let hole = 0;
  for (let k = i + 1; k <= j; k++) hole = Math.max(hole, spoken[k].s - spoken[k - 1].e);
  return { raw: best.raw, i, j, hole: Math.round(hole * 100) / 100 };
}

// Where to cut, in seconds.
//
// The recogniser's first word boundary is not the start of the sound: it lands
// a tenth of a second inside the first consonant, which clips every line. So
// each cut is pushed out to the silence the reader left around the line, and
// only falls back to the word boundary where there is no silence to aim at —
// two lines run together, which happens a few times in any real take.
//
// `silences` is [[start, end], ...] as ffmpeg's silencedetect reports them.
export function cutPoints(spans, silences, duration, opts = {}) {
  const pad = opts.pad == null ? 0.10 : opts.pad;
  const reach = opts.reach == null ? 0.35 : opts.reach;
  // How far a cut may travel to find silence. Back is short: the audio before
  // a line is usually the false start the alignment just trimmed off, and
  // reaching for a silence further back brings it all the way in again — the
  // reader who ran the false start into the reading left no silence between
  // them to stop at. Forward is longer: the audio after a line is usually the
  // end of the same line, a word the recogniser wrote down wrong and dropped.
  const back = opts.back == null ? 0.45 : opts.back;
  const on = opts.on == null ? 2.5 : opts.on;
  // A pause shorter than this is a breath inside a line, not the gap between
  // two of them. A cut that stops at the first breath stops in mid-sentence
  // whenever the recogniser mangled the last words — "account 42010" for
  // "account four-two-zero-one-zero" — and the file ends with the number
  // missing.
  const between = opts.between == null ? 0.7 : opts.between;
  const out = [];

  for (let i = 0; i < spans.length; i++) {
    const sp = spans[i];
    const floorT = i ? spans[i - 1].end : 0;
    const ceilT = i + 1 < spans.length ? spans[i + 1].start : duration;

    // the silence the line starts out of, if there is one
    let onset = sp.start;
    for (const [a, b] of silences) {
      if (b <= sp.start + reach && b >= Math.max(floorT - reach, sp.start - back) && b > a) {
        onset = Math.min(sp.start, b);
      }
    }
    // the silence it stops into
    let offset = sp.end;
    for (const [a, b] of silences) {
      if (a >= sp.end - reach && a <= Math.min(ceilT + reach, sp.end + on) && b - a >= between) {
        offset = Math.max(sp.end, a); break;
      }
    }

    out.push({
      id: sp.id,
      start: Math.max(0, onset - pad),
      end: Math.min(duration, offset + pad)
    });
  }

  // Two line files must never overlap. Where they would, the boundary goes
  // halfway between the end of one reading and the start of the next.
  for (let i = 1; i < out.length; i++) {
    if (out[i].start < out[i - 1].end) {
      const mid = (spans[i - 1].end + spans[i].start) / 2;
      out[i - 1].end = Math.min(out[i - 1].end, mid);
      out[i].start = Math.max(out[i].start, mid);
      if (out[i].start < out[i - 1].end) out[i].start = out[i - 1].end;
    }
  }

  return out.map(c => ({
    id: c.id,
    start: Math.round(c.start * 1000) / 1000,
    end: Math.round(c.end * 1000) / 1000
  }));
}

// Lines that may open on a reading the reader abandoned.
//
// This reports. It does not cut, and the reason is worth keeping: of the eight
// spans in the three Compass/Essentials/Treasury takes that open with speech,
// a long silence, and then more speech, only three are false starts. The other
// five are a reader pausing in the middle of a sentence — "Most budget
// coverage only ... ever shows you the first one" — and trimming those would
// throw away the opening of the line.
//
// Nor can the recogniser separate them. It writes two attempts down as one:
// on Compass L003 it gave the word "the" a length of 1.48 seconds and put the
// whole stumble inside it, so the word stream shows no pause and no repeat.
// The silence is the only witness, and the silence says "listen here", not
// "cut here".
//
// `silences` is [[start, end], ...], as cutPoints takes it.
const OPENS = 2.5;      // a silence this far into a span is still its opening
const STALL = 1.2;      // and this long is longer than a reader's own pause
export function openingPause(spans, silences, opts = {}) {
  const opens = opts.opens == null ? OPENS : opts.opens;
  const stall = opts.stall == null ? STALL : opts.stall;
  const out = [];
  for (const s of spans) {
    for (const [a, b] of silences) {
      if (a < s.start || a > s.start + opens) continue;
      // The reader has to have read OUT of it: speech, silence, speech, all
      // inside the one line. A silence still running when the line ends is
      // the gap after it, which every line has and no line owns.
      if (b >= s.end) continue;
      if (b - a < stall) continue;
      out.push({ id: s.id, at: a, dur: Math.round((b - a) * 1000) / 1000, resume: b });
      break;
    }
  }
  return out;
}

// What the ear decided, written down.
//
// Some cuts cannot be found from the words, so the episode may carry a
// `cuts.json` naming the seconds by hand. A pin is the last word on where its
// line starts or stops; everything else about the line is still measured.
// A pin for a line that is not in the cut is handed back rather than dropped,
// because a pin that silently does nothing is how a cut stays wrong after
// somebody has fixed it.
export function applyPins(spans, pins = {}) {
  const used = [], ids = new Set(spans.map(s => s.id));
  const out = spans.map(s => {
    const p = pins[s.id];
    if (!p) return s;
    used.push(s.id);
    return {
      ...s,
      start: p.start == null ? s.start : p.start,
      end: p.end == null ? s.end : p.end
    };
  });
  const unknown = Object.keys(pins).filter(k => !k.startsWith('_') && !ids.has(k));
  return { spans: out, used, unknown };
}
