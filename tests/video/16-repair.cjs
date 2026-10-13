// The recogniser can lose a whole reading, and the loss is silent.
//
// On the Treasury take `small.en` transcribed nothing between 196.58s and
// 207.18s. There were 5.04 seconds of speech in there — a complete second
// reading of L012 — and `align.mjs`, which can only see words, reported a
// 10.6s hole in a 20.5s line. That reads as a line the speaker abandoned
// halfway, and it put a re-record into the episode design that was not needed.
//
// Running a bigger model does not fix it. `medium.en` recovers all three of
// `small.en`'s losses on that take and loses FOUR different ones, each also
// one half of a line that was read twice. The models drop different halves of
// the same kind of pair.
//
// What does fix it: a gap in the word stream that is NOT silent is speech the
// transcript lost, and transcribing that span ON ITS OWN recovers it — a few
// seconds of audio has none of the long-file context that makes a model skip.
//
// Everything below is the deciding, with no audio in it. The slicing and the
// transcribing live in split.mjs; these are the three pure functions they use.
const assert = require('assert');
const { pathToFileURL } = require('url');
const path = require('path');

const ROOT = 'C:/ev-landing/ev-landing-main';

// A word stream the way the recogniser hands one over: a word every 0.4s,
// each 0.3s long. `end` is where the last one finishes.
function say(from, text) {
  const out = [];
  let t = from;
  for (const w of text.split(' ')) {
    out.push({ w, s: +t.toFixed(2), e: +(t + 0.3).toFixed(2) });
    t += 0.4;
  }
  return out;
}
const end = ws => ws[ws.length - 1].e;

(async function () {
  const { lostSpans, offsetWords, spliceWords } =
    await import(pathToFileURL(path.join(ROOT, 'tools/video/engine/repair.mjs')).href);

  // ---- lostSpans: which gaps hold speech the transcript has no words for ----

  // A gap the tape was silent through is a pause, not a loss. This is the
  // common case and it must stay quiet: most gaps over two seconds are the
  // reader breathing between lines.
  {
    const a = say(1, 'the whole budget becomes one shape');
    const b = say(12, 'and every department is a slice');
    const silences = [[end(a), 12], [end(b), 20]];
    assert.deepStrictEqual(lostSpans([...a, ...b], silences, 20), [],
      'a silent gap is a pause and must not be reported');
  }

  // A gap the tape was NOT silent through is a reading the transcript lost.
  {
    const a = say(1, 'that is the whole trick');          // ends 2.9
    const b = say(18, 'arranged so a person can follow it');
    const silences = [[2.9, 10], [15, 18], [end(b), 25]]; // speech 10->15
    const lost = lostSpans([...a, ...b], silences, 25);
    assert.strictEqual(lost.length, 1, 'the gap holding 5s of sound must be reported');
    assert.ok(Math.abs(lost[0].sound - 5.0) < 0.01,
      'it must report how much sound is in the gap, got ' + lost[0].sound);
    assert.strictEqual(lost[0].before, 'trick');
    assert.strictEqual(lost[0].after, 'arranged');
  }

  // A short gap is a sentence break even when it is full of speech, because a
  // sentence break IS speech on both sides. Only a gap long enough to hold a
  // lost reading is worth slicing.
  {
    const a = say(1, 'money out');                        // 1.0 -> 1.7
    const b = say(2.8, 'how the money is spent');         // gap 1.1s
    assert.deepStrictEqual(lostSpans([...a, ...b], [], end(b)), [],
      'a gap under the minimum is not a lost reading');
  }

  // A trace of sound is a breath, a chair or a lip noise. The head of the
  // Essentials take holds 0.30s of it across fifteen seconds of nothing, and
  // reporting that as a lost reading sends somebody to listen to silence.
  {
    const a = say(1, 'none of them talk to each other');  // ends 3.7
    const b = say(20, 'so to answer one plain question');
    const silences = [[3.7, 19.8], [19.9, 20], [end(b), 30]];   // 0.1s of sound
    assert.deepStrictEqual(lostSpans([...a, ...b], silences, 30), [],
      'a trace of sound is not a lost reading');
  }

  // Speech BEFORE the first word the recogniser placed. A take that opens on a
  // reading the model skipped has nothing in front of it to anchor a gap, so
  // the head of the take is a span of its own.
  {
    const w = say(20, 'here are some of the jobs on your ballot');
    const silences = [[0, 2], [8, 20], [end(w), 40]];     // speech 2 -> 8
    const lost = lostSpans(w, silences, 40);
    assert.strictEqual(lost.length, 1, 'speech before the first word must be reported');
    assert.strictEqual(lost[0].from, 0);
    assert.strictEqual(lost[0].before, null, 'nothing precedes the head of a take');
    assert.strictEqual(lost[0].after, 'here');
    assert.ok(Math.abs(lost[0].sound - 6.0) < 0.01, 'got ' + lost[0].sound);
  }

  // And after the last word, for the same reason: a sign-off read twice where
  // the model kept only the first.
  {
    const w = say(1, 'that is treasury tracker go follow your money');
    const lost = lostSpans(w, [[end(w), 30]], 38);        // speech 30 -> 38
    assert.strictEqual(lost.length, 1, 'speech after the last word must be reported');
    assert.strictEqual(lost[0].after, null, 'nothing follows the tail of a take');
    assert.ok(Math.abs(lost[0].sound - 8.0) < 0.01, 'got ' + lost[0].sound);
  }

  // Two losses in one take are both reported, loudest first, because whoever
  // reads the list listens in that order.
  {
    const w = [...say(1, 'one'), ...say(20, 'two'), ...say(40, 'three')];
    const silences = [[1.5, 12], [20.5, 36], [40.3, 50]]; // 8.2s, then 4.2s
    const lost = lostSpans(w, silences, 50);
    assert.strictEqual(lost.length, 2, 'both losses must be reported');
    assert.ok(lost[0].sound > lost[1].sound, 'the biggest loss is reported first');
  }

  // ---- offsetWords: a slice is transcribed from its own zero ----
  {
    const slice = [{ w: 'arranged', s: 0.42, e: 0.98 }, { w: 'so', s: 1.10, e: 1.30 }];
    const moved = offsetWords(slice, 200.6);
    assert.deepStrictEqual(moved, [
      { w: 'arranged', s: 201.02, e: 201.58 },
      { w: 'so', s: 201.70, e: 201.90 }
    ]);
    assert.deepStrictEqual(slice,
      [{ w: 'arranged', s: 0.42, e: 0.98 }, { w: 'so', s: 1.10, e: 1.30 }],
      'offsetWords must not mutate what it was given');
  }

  // ---- spliceWords: putting the recovered reading back ----

  // The recovered words land between the words either side of the gap, in time
  // order, so align.mjs sees one stream it cannot tell from a clean take.
  {
    const words = [...say(1, 'that is the whole trick'), ...say(18, 'a budget answers more')];
    const found = offsetWords(say(0.4, 'that is the whole trick again'), 10);
    const out = spliceWords(words, [{ from: 9.5, to: 17.5, words: found }]);
    for (let i = 1; i < out.length; i++) {
      assert.ok(out[i].s >= out[i - 1].s,
        'the spliced stream must be in time order, broke at ' + i + ' (' + out[i].w + ')');
    }
    assert.strictEqual(out.length, words.length + found.length);
    assert.ok(out.some(x => x.w === 'again'), 'the recovered words must be in the stream');
  }

  // A repair that recovers nothing changes nothing. The model is allowed to
  // come back empty from a slice that turns out to be a cough.
  {
    const words = say(1, 'that is the whole trick');
    assert.deepStrictEqual(spliceWords(words, [{ from: 9.5, to: 17.5, words: [] }]), words);
  }

  // Anything the slice transcribes that lands OUTSIDE its own span is dropped.
  // A slice is cut with a little air around it so the model has context, which
  // lets it run on into the next line and hand back words that are already in
  // the stream. Keeping them would say a line was read twice when it was read
  // once — the very fault this exists to undo.
  {
    const words = [...say(1, 'that is the whole trick'), ...say(18, 'a budget answers more')];
    const found = [
      { w: 'recovered', s: 10.2, e: 10.5 },
      { w: 'words', s: 10.6, e: 10.9 },
      { w: 'a', s: 17.6, e: 17.8 },        // past the span: already in the stream
      { w: 'budget', s: 18.0, e: 18.3 }    // past the span: already in the stream
    ];
    const out = spliceWords(words, [{ from: 9.5, to: 17.5, words: found }]);
    assert.strictEqual(out.filter(x => x.w === 'budget').length, 1,
      'the slice ran into the next line and its words were kept, so "budget" is in twice');
    assert.strictEqual(out.length, words.length + 2, 'only the two inside the span are kept');
  }

  // Several repairs in one pass, given in any order, all land correctly.
  {
    const words = [...say(1, 'alpha'), ...say(20, 'beta'), ...say(40, 'gamma')];
    const a = offsetWords(say(0.5, 'first recovery'), 10);
    const b = offsetWords(say(0.5, 'second recovery'), 30);
    const out = spliceWords(words, [{ from: 29, to: 39, words: b }, { from: 9, to: 19, words: a }]);
    for (let i = 1; i < out.length; i++) {
      assert.ok(out[i].s >= out[i - 1].s, 'out of order at ' + i);
    }
    assert.ok(out.some(x => x.w === 'first') && out.some(x => x.w === 'second'));
  }

  console.log('PASS 16-repair (lostSpans, offsetWords, spliceWords)');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
