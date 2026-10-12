// Cutting a real take into numbered lines. These are the four ways the obvious
// implementation gets it wrong, and the one way the cut points go wrong.
//
// 1. A fluffed line is read again. The later reading is the one to keep, and
//    "first match wins" keeps the fluff.
// 2. A title card's words sit INSIDE the closing line: "This is Treasury
//    Tracker" is contained in "That is Treasury Tracker. Go follow your money".
//    "Last match wins" therefore cuts the title card out of the sign-off, nine
//    minutes later, and every line between them is pushed out of order.
// 3. A line genuinely not read must be reported, not silently filled with a
//    neighbour.
// 4. The lines that ARE placed must run in script order. A take is read in
//    order; a cut list that is not in order is a mis-match, not a performance.
// 5. A cut point belongs in the silence around a line, not at the recogniser's
//    word boundary, which lands a tenth of a second inside the first consonant.
const assert = require('assert');

const ROOT = 'C:/ev-landing/ev-landing-main';

// Build a word stream the way the recogniser hands one over: a word, and the
// seconds it starts and ends. Half a second a word, a gap between utterances.
function stream(utterances) {
  const out = [];
  let t = 1.0;
  for (const u of utterances) {
    for (const w of u.split(/\s+/)) {
      out.push({ w, s: Math.round(t * 100) / 100, e: Math.round((t + 0.4) * 100) / 100 });
      t += 0.5;
    }
    t += 2.0;
  }
  return out;
}

function ids(cuts) { return cuts.map(c => c.id); }

// A word stream copied out of a real transcript: "word|start|end", several to
// a source line so the fixture stays readable. Tests that use one are pinning
// behaviour against material the synthetic stream above cannot produce —
// recogniser spellings, merged words, a reader's own pauses.
function words(rows) {
  const out = [];
  for (const row of rows) {
    for (const tok of row.split(/\s+/)) {
      if (!tok) continue;
      const p = tok.split('|');
      out.push({ w: p[0], s: Number(p[1]), e: Number(p[2]) });
    }
  }
  return out;
}

(async function () {
  const A = await import('file:///' + ROOT + '/tools/video/engine/align.mjs');

  // ---- 1. a clean read -------------------------------------------------
  {
    const lines = [
      { id: 'L001', text: 'Look at a pay stub.' },
      { id: 'L002', text: 'Almost nobody finds out what happened next.' },
      { id: 'L003', text: 'This is Treasury Tracker.' }
    ];
    const ws = stream([
      'look at a pay stub',
      'almost nobody finds out what happened next',
      'this is treasury tracker'
    ]);
    const { cuts, missing } = A.alignTake(ws, lines);
    assert.deepStrictEqual(missing, [], 'nothing is missing from a clean read');
    assert.deepStrictEqual(ids(cuts), ['L001', 'L002', 'L003']);
    for (let i = 1; i < cuts.length; i++) {
      assert.ok(cuts[i].start > cuts[i - 1].end, 'cuts must run in order');
    }
  }

  // ---- 2. a fluffed line, read again -----------------------------------
  {
    const lines = [
      { id: 'L001', text: 'Look at a pay stub.' },
      { id: 'L002', text: 'Almost nobody finds out what happened next.' },
      { id: 'L003', text: 'This is Treasury Tracker.' }
    ];
    const ws = stream([
      'look at a pay stub',
      'almost nobody finds out what',             // stops short
      'almost nobody finds out what happened next',
      'this is treasury tracker'
    ]);
    const { cuts, missing } = A.alignTake(ws, lines);
    assert.deepStrictEqual(missing, []);
    const l2 = cuts.find(c => c.id === 'L002');
    assert.ok(l2.start > 6.0,
      'the later reading of L002 wins; got one starting at ' + l2.start);
    // and the whole line, not the half he abandoned
    assert.ok(l2.end - l2.start > 2.5, 'the kept reading must be the complete one');
  }

  // ---- 3. a title card whose words sit inside the sign-off --------------
  {
    const lines = [
      { id: 'L005', text: 'This is Treasury Tracker.' },
      { id: 'L006', text: 'Treasury Tracker takes that document and draws it.' },
      { id: 'L038', text: 'That is Treasury Tracker. Go follow your money.' }
    ];
    const ws = stream([
      'this is treasury tracker',
      'treasury tracker takes that document and draws it',
      'that is treasury tracker go follow your money'
    ]);
    const { cuts, missing } = A.alignTake(ws, lines);
    assert.deepStrictEqual(missing, [], 'all three were read');
    assert.deepStrictEqual(ids(cuts), ['L005', 'L006', 'L038']);
    const l5 = cuts.find(c => c.id === 'L005');
    const l38 = cuts.find(c => c.id === 'L038');
    assert.ok(l5.end < l38.start,
      'the title card must come from the top of the take, not out of the sign-off');
    assert.ok(l5.start < 4.0, 'L005 starts near the top; got ' + l5.start);
  }

  // ---- 4. a line that was never read -----------------------------------
  {
    const lines = [
      { id: 'L004', text: 'So to answer one plain question, who represents me.' },
      { id: 'L005', text: 'This is Empowered Essentials.' },
      { id: 'L006', text: 'Essentials starts from one piece of information.' },
      { id: 'L037', text: 'That is Empowered Essentials. Go find out who is on your ballot.' }
    ];
    const ws = stream([
      'so to answer one plain question who represents me',
      'essentials starts from one piece of information',
      'that is empowered essentials go find out who is on your ballot'
    ]);
    const { cuts, missing } = A.alignTake(ws, lines);
    assert.deepStrictEqual(missing, ['L005'],
      'the skipped title card is reported, not filled from the sign-off');
    assert.deepStrictEqual(ids(cuts), ['L004', 'L006', 'L037']);
  }

  // ---- 5. cut points sit in the silence --------------------------------
  {
    // Two lines, speech 1.0-3.0 and 5.0-7.0, silence either side and between.
    const spans = [
      { id: 'L001', start: 1.12, end: 2.90 },
      { id: 'L002', start: 5.08, end: 6.95 }
    ];
    const silences = [[0, 0.98], [3.05, 4.96], [7.02, 9.0]];
    const cut = A.cutPoints(spans, silences, 9.0);

    assert.strictEqual(cut.length, 2);
    assert.ok(cut[0].start < 1.12 && cut[0].start >= 0.98 - 0.11,
      'the file opens in the silence before the line, not inside its first word');
    assert.ok(cut[0].end > 2.90 && cut[0].end <= 3.05 + 0.11,
      'and closes in the silence after it');
    assert.ok(cut[0].end < cut[1].start, 'two line files must never overlap');
    assert.ok(cut[1].end <= 9.0, 'a cut cannot run past the end of the take');
    // the file is the line, not the line plus the whole gap
    assert.ok(cut[0].end - cut[0].start < 2.6,
      'a line file holds the line, not the pause that follows it');
  }

  // ---- 6. a join with no silence in it still produces two files ---------
  {
    const spans = [
      { id: 'L019', start: 1.00, end: 2.50 },
      { id: 'L020', start: 2.55, end: 4.00 }      // read straight on, 0.05s apart
    ];
    const silences = [[0, 0.9], [4.1, 6.0]];
    const cut = A.cutPoints(spans, silences, 6.0);
    assert.strictEqual(cut.length, 2);
    assert.ok(cut[0].end <= cut[1].start, 'the two files must not overlap');
    assert.ok(cut[0].end > 2.40 && cut[1].start < 2.70,
      'with no silence to aim at, the cut falls between the two readings');
  }

  // ---- 7. one stray word must not stretch a line across the take ----------
  {
    // The reader starts the line, stops after a word, waits, and starts again.
    // Both halves match the script, so "first matched word to last matched
    // word" spans the pause as well, and the cut file opens with a false start
    // and six seconds of room tone. The span has to be the body of the
    // reading, not its outermost matches.
    const lines = [{ id: 'L001', text: 'Look at a pay stub.' }];
    const ws = [
      { w: 'look', s: 1.0, e: 1.4 },
      { w: 'look', s: 9.0, e: 9.4 },
      { w: 'at', s: 9.5, e: 9.9 },
      { w: 'a', s: 10.0, e: 10.4 },
      { w: 'pay', s: 10.5, e: 10.9 },
      { w: 'stub', s: 11.0, e: 11.4 }
    ];
    const { cuts, missing } = A.alignTake(ws, lines);
    assert.deepStrictEqual(missing, []);
    assert.ok(cuts[0].start > 8.0,
      'the span must start at the real reading, not the false start; got ' + cuts[0].start);
    assert.ok(cuts[0].end - cuts[0].start < 3.0,
      'and must not carry the pause between them; got ' + (cuts[0].end - cuts[0].start) + 's');
  }

  // ---- 8. a reading holds no long pause inside it ------------------------
  {
    // A window is a run of consecutive spoken words, and a run of words can
    // still span a four-second pause — so the "best match" for a line can be
    // its abandoned first half, the pause, and the first half of the reading
    // that replaced it. The words all match and the file is unusable.
    const lines = [{ id: 'L001', text: 'Look at a pay stub or a property tax bill.' }];
    const ws = [];
    let t = 1.0;
    for (const w of 'look at a pay stub'.split(' ')) { ws.push({ w, s: t, e: t + 0.4 }); t += 0.5; }
    t += 5.0;                                        // he stops, and starts again
    for (const w of 'look at a pay stub or a property tax bill'.split(' ')) {
      ws.push({ w, s: t, e: t + 0.4 }); t += 0.5;
    }
    const { cuts } = A.alignTake(ws, lines);
    assert.strictEqual(cuts.length, 1);
    const held = ws.filter(w => w.s >= cuts[0].start - 0.01 && w.e <= cuts[0].end + 0.01);
    let worst = 0;
    for (let k = 1; k < held.length; k++) worst = Math.max(worst, held[k].s - held[k - 1].e);
    assert.ok(worst < 2.0,
      'the chosen reading must not have a pause in the middle of it; found ' + worst + 's');
    assert.ok(cuts[0].start > 6.0, 'and it is the complete reading, not the abandoned one');
  }

  // ---- 9. a line read in two halves is still kept whole ------------------
  {
    // The other side of case 8. Here there is no complete reading WITHOUT a
    // pause in it: the reader lost their place in the middle and picked the
    // line up ten seconds later. Dropping the pause means dropping half the
    // line, so the span has to hold both halves, and the caller is told.
    const lines = [{ id: 'L012', text: 'That is the whole trick. It is not new data, arranged so a person can follow it.' }];
    const ws = [];
    let t = 1.0;
    for (const w of 'that is the whole trick it is not new data'.split(' ')) {
      ws.push({ w, s: t, e: t + 0.4 }); t += 0.5;
    }
    t += 10.0;
    for (const w of 'arranged so a person can follow it'.split(' ')) {
      ws.push({ w, s: t, e: t + 0.4 }); t += 0.5;
    }
    const { cuts, missing } = A.alignTake(ws, lines);
    assert.deepStrictEqual(missing, []);
    assert.ok(cuts[0].start < 2.0 && cuts[0].end > 16.0,
      'both halves must be inside the span: got ' + cuts[0].start + '-' + cuts[0].end);
    assert.ok(cuts[0].hole > 9.0,
      'and the caller is told how long the pause inside it is; got ' + cuts[0].hole);
  }

  // ---- 10. the span holds the line, and nothing either side of it --------
  {
    // The window that reads most like the line can still open on the three
    // words of a false start and close on the first words of the line after
    // it, because reaching further picked up one more match on the way. What
    // is kept has to begin and end on a word of the line itself.
    const lines = [{ id: 'L003', text: 'Your city publishes its budget but it is usually long.' }];
    const ws = [];
    let t = 1.0;
    for (const w of ('but it usually your city publishes its budget but it is usually long ' +
                     'technically you can read it').split(' ')) {
      ws.push({ w, s: t, e: t + 0.4 }); t += 0.5;
    }
    const { cuts } = A.alignTake(ws, lines);
    assert.strictEqual(cuts.length, 1);
    const held = ws.filter(w => w.s >= cuts[0].start - 0.01 && w.e <= cuts[0].end + 0.01)
      .map(w => w.w).join(' ');
    assert.strictEqual(held, 'your city publishes its budget but it is usually long',
      'the span must be the line and nothing else; got "' + held + '"');
  }

  // ---- 11. the real case: a false start, and numbers the recogniser mangles
  {
    // Lifted from the Treasury take. The reader starts the line, stops after
    // seven words, and reads it again. The recogniser writes "fund 010" for
    // "fund one-oh-one" and "it's" for "it is", so NO window of this line
    // scores above 0.66 and the scoring alone cannot tell the false start from
    // the reading. What settles it is that the first seven words are not part
    // of the line's own order, so they are trimmed off the front.
    const said = ("Your city publishes its budget, but it usually, your city publishes its budget, but it's usually a few hundred pages and it's full of lines that read Fund 010, Department 08, account 42010. Technically you can read it, but technically it's carrying a lot of").split(' ');
    const ws = said.map((w, i) => ({ w, s: 1 + i * 0.5, e: 1 + i * 0.5 + 0.4 }));
    const lines = [{
      id: 'L003',
      text: 'Your city publishes its budget. But it is usually a few hundred pages, ' +
            'and it is full of lines that read: fund one-oh-one, department zero-eight, ' +
            'account four-two-zero-one-zero.'
    }];
    const { cuts } = A.alignTake(ws, lines);
    const held = ws.filter(w => w.s >= cuts[0].start - 0.01 && w.e <= cuts[0].end + 0.01);
    assert.ok(/^your city publishes/i.test(held.map(w => w.w).join(' ')),
      'the span must open on the reading, not the false start; got "' +
      held.slice(0, 5).map(w => w.w).join(' ') + '"');
    assert.ok(!/technically/i.test(held.map(w => w.w).join(' ')),
      'and must not run on into the line after it');
  }

  // ---- 12. the cut opens on the silence beside the line, not an earlier one
  {
    // The trim in case 11 leaves the span starting at the reading rather than
    // at the false start before it. If the cut is then pushed back to ANY
    // earlier silence, the false start comes straight back in — here, eight
    // seconds of it. The silence it opens into has to be the one beside the
    // reading.
    // Nothing to aim at near the line: the reader ran the false start straight
    // into the reading, so the pause between them never dropped quiet enough
    // to count as silence.
    const spans = [{ id: 'L026', start: 12.0, end: 20.0 }];
    const silences = [[0, 3.0], [3.4, 3.9], [20.4, 24.0]];
    const cut = A.cutPoints(spans, silences, 24.0);
    assert.ok(cut[0].start > 11.0,
      'the cut must open in the silence beside the line; got ' + cut[0].start);
  }

  // ---- 13. a trailing word the recogniser lost is still in the file ------
  {
    // "account four-two-zero-one-zero" comes back as "account 42010", so the
    // alignment ends the line at "account" and the number is outside the span.
    // The reader took a breath before the number, and that breath is long
    // enough to register as silence — so a cut that stops at the FIRST silence
    // stops before the number and the file ends mid-sentence. It has to carry
    // on to the pause that actually separates two lines.
    const spans = [{ id: 'L003', start: 2.0, end: 6.0 }];
    const silences = [[0, 1.9], [6.1, 6.5], [8.2, 11.0]];   // a breath, then the real gap
    const cut = A.cutPoints(spans, silences, 11.0);
    assert.ok(cut[0].end > 8.0,
      'the cut must run past the breath to the pause between lines; got ' + cut[0].end);
    assert.ok(cut[0].end < 8.6, 'but it must not run into the next line');
  }

  // ---- 14. a line read right, then read again ---------------------------
  {
    // Test 2 covers the reading the reader ABANDONED: the second one scores
    // higher, so any tie-break finds it. This is the case that one misses —
    // the first reading was complete, and the reader went again anyway,
    // because of a noise, a stumbled word, a delivery they did not like.
    // The two readings score the SAME, so which one is kept is decided
    // entirely by the tie-break, and the instruction on the recording script
    // says the last one counts. Taken from the Compass take, where this line
    // was read four times and the cut kept the first.
    const lines = [
      { id: 'L006', text: 'A party is a coalition.' },
      { id: 'L007', text: 'Put two people in the same box and they will still disagree about plenty. The box does not promise otherwise.' },
      { id: 'L008', text: 'And if you have two people in different boxes they tend to agree about plenty.' }
    ];
    const ws = stream([
      'a party is a coalition',
      'put two people in the same box and they will still disagree about plenty the box does not promise otherwise',
      'put two people in the same box and they will still disagree plenty',
      'put two people in the same box and they will still disagree plenty',
      'put two people in the same box and they will still disagree about plenty the box does not promise otherwise',
      'and if you have two people in different boxes they tend to agree about plenty'
    ]);
    const { cuts, missing } = A.alignTake(ws, lines);
    assert.deepStrictEqual(missing, []);
    const l7 = cuts.find(c => c.id === 'L007');
    // the fourth reading: the last word in the take that opens this line
    let last = -1;
    for (let k = 0; k < ws.length; k++) if (ws[k].w === 'put') last = k;
    assert.strictEqual(l7.start, ws[last].s,
      'the LAST complete reading wins, not the first; expected ' + ws[last].s +
      ', got ' + l7.start);
    assert.ok(l7.end - l7.start > 9.0,
      'and it must be the complete reading, not the short one; got ' + (l7.end - l7.start));
    // the line after it is still found, and still after it
    const l8 = cuts.find(c => c.id === 'L008');
    assert.ok(l8.start > l7.end, 'L008 must still follow L007');
  }

  // ---- 15. a cut that opens on a false start ----------------------------
  {
    // A reader starts a line, stops, and reads it again. Three of these are in
    // the three takes, and NO rule finds all three: the recogniser writes the
    // two attempts down as one, so in the worst case it reports the 1.4s of
    // silence as part of the word "the" and the transcript shows nothing at
    // all. Worse, the pattern a rule would key on — speech, a long silence,
    // more speech, all inside one line — is far more often a reader pausing
    // mid-sentence, which must NOT be cut. Five of those are in these takes.
    //
    // So this reports and does not act. The silence is a place to listen, the
    // ear decides, and `cuts.json` records the decision.
    const spans = [
      { id: 'L003', start: 46.80, end: 56.10 },   // false start, 1.3s in
      { id: 'L004', start: 58.50, end: 65.78 },   // clean
      { id: 'L012', start: 70.00, end: 90.00 },   // long pause, but late
      // A SHORT line's own closing gap begins inside the first 2.5 seconds.
      // The silence has to be one the reader read out of — speech, silence,
      // speech — so a silence still running when the line ends is the gap
      // after it, and the next line's business.
      { id: 'L023', start: 95.00, end: 97.60 }
    ];
    const silences = [[48.09, 49.39], [59.10, 59.55], [82.00, 84.00], [97.45, 99.80]];
    const flags = A.openingPause(spans, silences);
    assert.deepStrictEqual(flags.map(f => f.id), ['L003'],
      'only the span whose long silence is near its OPENING is a suspect');
    assert.strictEqual(flags[0].at, 48.09);
    assert.ok(Math.abs(flags[0].dur - 1.3) < 1e-6);
    assert.ok(Math.abs(flags[0].resume - 49.39) < 1e-6,
      'it must say where the speech starts again, which is where a cut would go');
  }

  // ---- 16. a pinned cut overrides what the alignment found ---------------
  {
    const spans = [{ id: 'L003', start: 46.80, end: 56.10 }];
    const pinned = A.applyPins(spans, { L003: { start: 49.35 } });
    assert.strictEqual(pinned.spans[0].start, 49.35, 'the pin wins');
    assert.strictEqual(pinned.spans[0].end, 56.10, 'and leaves the rest alone');
    assert.deepStrictEqual(pinned.used, ['L003']);
    assert.deepStrictEqual(pinned.unknown, [], 'L003 is a line, so nothing is unknown');
    // a pin for a line that is not in the cut is reported, never ignored
    const stray = A.applyPins(spans, { L099: { start: 1 } });
    assert.deepStrictEqual(stray.unknown, ['L099']);
  }

  // ---- 17. the opening words of a line are not shaved off ----------------
  {
    // Compass L022 came out of the cut as "...the answer that fits you best",
    // with "You choose" missing — audible as a line starting mid-word. Two
    // rules compound to produce it, and neither is wrong on its own:
    //
    //   The recogniser heard one word fewer than the page has, so the window
    //   that reads BEST has to reach one word into the next line to be wide
    //   enough. Reaching there crosses the three-second pause between the two
    //   lines, so the pause filter throws that window out, correctly.
    //
    //   What is left are three narrower windows that read exactly alike,
    //   starting at "you", at "choose" and at "the". The tie went to the
    //   latest of them, and the latest one starts two words into the line.
    //
    // "The later one wins" is about a line READ TWICE: it picks between
    // readings, and readings are far apart. Two windows a word apart are one
    // reading seen through two widths, and there the earliest start is the one
    // that still has the beginning of the line in it.
    //
    // The word stream is the real one, from the Compass take, 319s to 352s.
    const ws = words([
      "We|319.12|319.64 sort|319.64|319.92 common|319.92|320.28 answers|320.28|320.62",
      "along|320.62|320.94 a|320.94|321.08 spectrum.|321.08|321.38 For|321.88|322.00",
      "instance,|322.00|322.16 with|322.36|322.52 housing,|322.52|322.90 at|323.12|323.22",
      "one|323.22|323.44 end,|323.44|323.70 we|323.92|324.10 have|324.10|324.20",
      "the|324.20|324.34 government|324.34|324.62 not|324.62|324.96 intervening|324.96|325.42",
      "and|325.42|326.06 letting|326.06|326.22 the|326.22|326.38 market|326.38|326.60",
      "decide.|326.60|327.04 And|327.54|327.66 at|327.66|327.76 the|327.76|327.88",
      "other|327.88|328.08 end,|328.08|328.38 we|328.60|328.84 have|328.84|328.96",
      "the|328.96|329.08 government|329.08|329.30 building|329.30|329.74 low|329.74|330.04",
      "-income|330.04|330.36 housing.|330.36|330.80 You|333.90|334.42 choose|334.42|334.76",
      "the|334.76|335.08 answer|335.08|335.34 that|335.34|335.50 fits|335.50|335.74",
      "you|335.74|336.08 best.|336.08|336.38 Or|336.90|337.16 you|337.16|337.32",
      "write|337.32|337.50 your|337.50|337.68 own.|337.68|337.92 Your|338.50|338.72",
      "dot|338.72|339.02 sits|339.02|339.44 on|339.44|339.88 that|339.88|340.10",
      "answer.|340.10|340.48 The|341.06|341.24 spoke|341.24|341.48 is|341.48|341.70",
      "not|341.70|341.86 measuring|341.86|342.20 how|342.20|342.46 strongly|342.46|342.92",
      "you|342.92|343.16 feel.|343.16|343.40 It's|343.88|344.14 recording|344.14|344.52",
      "what|344.52|344.84 solution|344.84|345.28 you|345.28|345.74 want.|345.74|346.14",
      "Then|349.02|349.58 do|349.58|349.80 that|349.80|350.02 for|350.02|350.22",
      "each|350.22|350.50 issue|350.50|350.98 on|350.98|351.28 your|351.28|351.44",
      "list.|351.44|351.80"
    ]);
    const lines = [
      { id: 'L021', text: 'We sort common answers along a spectrum. For instance with housing, at one end we have the government not intervening and letting the markets decide, and at the other end we have the government building low income housing.' },
      { id: 'L022', text: 'You choose the answer that fits you best, or you write your own. Your dot sits on that answer. The spoke is not measuring how strongly you feel. It is recording which solution you want.' },
      { id: 'L023', text: 'Then do that for each issue on your list.' }
    ];
    const { cuts, missing } = A.alignTake(ws, lines);
    assert.deepStrictEqual(missing, []);
    const l22 = cuts.find(c => c.id === 'L022');
    assert.strictEqual(l22.start, 333.90,
      'L022 must begin on "You", not two words into itself; got ' + l22.start);
    const l21 = cuts.find(c => c.id === 'L021');
    assert.ok(l21.end <= 333.90, 'and L021 must still end before it');
    const l23 = cuts.find(c => c.id === 'L023');
    assert.ok(l23.start >= 349.0, 'and L023 must still start on "Then"');
  }

  console.log('PASS 14-align');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
