// Finding the readings the recogniser lost, and putting them back.
//
// A gap in the word stream is not evidence of silence. On the Treasury take
// `small.en` transcribed nothing at all between 196.58s and 207.18s, and
// `align.mjs` — which can only see words — reported a 10.6s hole inside a
// 20.5s L012. That reads as a line the speaker abandoned halfway, and it put a
// re-record into the episode design. There were 5.04 seconds of speech in
// there: a complete second reading of the line, better than the first.
//
// Running a bigger model is not the fix. `medium.en` recovers all three of
// `small.en`'s losses on that take and loses FOUR different ones — each, like
// the first three, one half of a line that was read twice. Whatever the model,
// a long file makes it skip; a few seconds on its own does not.
//
// So: any gap that is not silent is a span to transcribe again, by itself, and
// splice back. `align.mjs` then sees one stream it cannot tell from a clean
// take, and "the last complete reading wins" does the rest with no pins.
//
// Why the reader leaves these at all: he does not pause between attempts.
// "I typically won't with VO as I often need to intuit the feedback into my
// next run immediately, and waiting 2 seconds is not how I work." The
// false-start detector in align.mjs looks for a long silence, so a restart a
// second later is invisible to it and the two readings are cut as one line.
//
// Nothing here touches audio. `split.mjs` does the slicing and the
// transcribing; these are the decisions, and they are tested without a
// microphone in tests/video/16-repair.cjs.

// A gap under this is a sentence break, not room for a lost reading.
const MINGAP = 2.0;
// Less sound than this is a breath, a chair or a lip noise. The head of the
// Essentials take holds 0.30s of it across fifteen seconds of nothing.
const MINSOUND = 0.8;

// How many of these seconds the tape was actually making a noise.
// `silences` is the [[start, end], ...] that split.mjs's silences() returns.
function soundIn(silences, from, to) {
  const len = Math.max(0, to - from);
  if (len <= 0) return 0;
  let silent = 0;
  for (const [a, b] of silences) {
    const lo = Math.max(a, from), hi = Math.min(b, to);
    if (hi > lo) silent += hi - lo;
  }
  return Math.max(0, len - Math.min(len, silent));
}

/**
 * The spans where the tape was speaking and the transcript has no words.
 *
 * The head and the tail of the take count: a take that opens on a reading the
 * model skipped has nothing in front of it to anchor a gap, and a sign-off
 * read twice can lose the second one off the end.
 *
 * Returns [{ from, to, sound, before, after }], loudest first — whoever reads
 * the list listens in that order. `before` and `after` are the words either
 * side, or null at the ends of the take.
 */
export function lostSpans(words, silences, duration, opts = {}) {
  const minGap = opts.minGap == null ? MINGAP : opts.minGap;
  const minSound = opts.minSound == null ? MINSOUND : opts.minSound;
  if (!words || !words.length) return [];

  const spans = [];
  if (words[0].s > minGap) {
    spans.push({ from: 0, to: words[0].s, before: null, after: words[0].w.trim() });
  }
  for (let i = 1; i < words.length; i++) {
    const from = words[i - 1].e, to = words[i].s;
    if (to - from > minGap) {
      spans.push({ from, to, before: words[i - 1].w.trim(), after: words[i].w.trim() });
    }
  }
  const last = words[words.length - 1].e;
  if (duration - last > minGap) {
    spans.push({ from: last, to: duration, before: words[words.length - 1].w.trim(), after: null });
  }

  return spans
    .map(s => ({ ...s, sound: soundIn(silences, s.from, s.to) }))
    .filter(s => s.sound > minSound)
    .sort((a, b) => b.sound - a.sound);
}

/**
 * A slice is transcribed from its own zero, so its word times have to come
 * back in take time or they splice into the wrong minute.
 */
export function offsetWords(words, start) {
  return (words || []).map(w => ({
    w: w.w,
    s: +(w.s + start).toFixed(2),
    e: +(w.e + start).toFixed(2)
  }));
}

/**
 * Put the recovered readings back, in time order.
 *
 * Anything a slice transcribed that falls OUTSIDE its own span is dropped. A
 * slice is cut with a little air around it so the model has context, which
 * lets it run on into the next line and hand back words that are already in
 * the stream. Keeping those would say a line was read twice when it was read
 * once — the very fault this exists to undo.
 */
export function spliceWords(words, repairs) {
  const found = [];
  for (const r of repairs || []) {
    for (const w of r.words || []) {
      if (w.s >= r.from && w.s < r.to) found.push(w);
    }
  }
  if (!found.length) return words.slice();
  return words.concat(found).sort((a, b) => a.s - b.s || a.e - b.e);
}
