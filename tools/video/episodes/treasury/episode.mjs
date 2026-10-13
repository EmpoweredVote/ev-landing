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
  // Readable names for the scene-id prefixes, used by the recording script and
  // by the contact sheet. Anything that groups scenes takes this list and
  // never keeps its own copy.
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
    // The stub is held from the first frame; what arrives is the ONE line on
    // it. "There's a line on it" lands at 5.19, which is when it lights.
    { id: 'stub-line', type: 'art', vo: 'L001', art: 'drawStub', lineAt: 5.19,
      cast: [{ at: [0.74, 0.93], anim: 'read', color: VIEWER, scale: 0.95 }] },

    // The stub is already on screen and the line is already lit, so this scene
    // names `lineAt: 0` — explicitly "it was already there", never undefined.
    // A field nobody set reads as zero and zero means the same thing, which is
    // why the convention is to say it rather than let it happen.
    { id: 'stub-look', type: 'art', vo: 'L002', art: 'drawStub', continues: true,
      lineAt: 0,
      cast: [{ at: [0.74, 0.93], anim: 'ponder', color: VIEWER, scale: 0.95 }] },

    // The document lands beside the figure. The three fund codes arrive as he
    // reads them — "Fund" 6.68, "Department" 9.44, "account" 10.90 — and they
    // are the codes he actually says. drawDocument prints FUND 010 because
    // that is what is on the tape; they are imaginary examples either way, so
    // the only thing that matters is that the prop agrees with the narration.
    //
    // The viewer holds the SAME position and scale through the whole chapter.
    // Four scenes at four x positions read as the figure jumping about, which
    // was the first thing a reviewer noticed on episode 1.
    { id: 'stub-doc', type: 'art', vo: 'L003', art: 'drawDocument',
      codeAt: [6.68, 9.44, 10.90],
      cast: [{ at: [0.74, 0.93], anim: 'standstill', color: VIEWER, scale: 0.95 }] },

    // The document is already there and does not land again. Only the figure
    // changes — it has read enough.
    { id: 'stub-tired', type: 'art', vo: 'L004', art: 'drawDocument', continues: true,
      codeAt: [0, 0, 0],
      cast: [{ at: [0.74, 0.93], anim: 'exhausted', color: VIEWER, scale: 0.95 }] },

    // ── 2. Title ────────────────────────────────────────────────────────
    // The product's own lockup, not a line of type. The line is 2.26s and the
    // name lands at 1.35, so the card has to be up before that: it fades in
    // over the first half second and the name is read onto a card already
    // standing. `hold` gives it a quarter second after the voice stops.
    { id: 'title', type: 'art', vo: 'L005', art: 'drawTitleCard', hold: 0.25,
      name: 'Treasury Tracker' },

    // ── 3. The budget as a picture ──────────────────────────────────────
    // The document is still on screen and becomes the bar, in the order the
    // sentence gives it: "draws it in a way that anyone can read" at 5.82, "the
    // whole budget becomes one shape" at 9.30, "and every department is a
    // slice of it" at 11.66, "sized by what it actually receives" at 14.18.
    // Four clauses, four things happening, none of them early.
    { id: 'bar-collapse', type: 'art', vo: 'L006', art: 'drawBudgetBar', stage: 'collapse',
      collapseAt: 5.82, shapeAt: 9.30, sliceAt: 11.66, sizeAt: 14.18 },

    // The two largest are named as he reaches the answer — "the answer" at
    // 6.51, "anybody asks" at 8.15 — so the question at 9.77 lands on a
    // picture that already answers it.
    { id: 'bar-named', type: 'art', vo: 'L007', art: 'drawBudgetBar', stage: 'named',
      continues: true, nameAt: [6.51, 8.15] },

    // "it opens" at 1.90. The second drill — "a division breaks into programs"
    // — at 5.24. The crumb is not named here, so it draws from `opened`.
    { id: 'bar-open', type: 'art', vo: 'L008', art: 'drawBudgetBar', stage: 'open',
      continues: true, openAt: 1.90, deeperAt: 5.24 },

    // The bar is already open and does not open again: openAt 0 says so. The
    // trail builds from 0.33 ("keep going") and is named at 3.43 ("the trail at
    // the top"), which is what crumbAt marks.
    { id: 'bar-trail', type: 'art', vo: 'L009', art: 'drawBudgetBar', stage: 'trail',
      continues: true, openAt: 0, deeperAt: 0, crumbAt: 0.33 },

    // "you reach the line items" 1.70; the rows arrive under it; "what was
    // budgeted" 2.84 and "what was actually spent" 4.58 are the two columns,
    // and the header has to be up before either.
    { id: 'bar-items', type: 'art', vo: 'L010', art: 'drawLineItems', continues: true,
      headAt: 1.70, rowAt: [2.00, 2.30, 2.60, 2.90, 3.20, 3.50] },

    // "one step further" 2.34 opens the panel; "who was paid" 5.06, "how much"
    // 6.38, "and when" 7.40 light the three columns in the order he says them.
    { id: 'bar-payments', type: 'art', vo: 'L011', art: 'drawPayments', continues: true,
      panelAt: 2.34, rowAt: [3.54, 3.78, 4.02, 4.26, 4.50],
      colAt: [5.06, 6.38, 7.40] },

    { id: 'bar-trick', type: 'art', vo: 'L012', art: 'drawBudgetBar', stage: 'whole',
      continues: true,
      cast: [{ at: [0.78, 0.94], anim: 'present', color: VIEWER, scale: 0.85 }] },

    // ── 4. More than one question ───────────────────────────────────────
    // Two cards at full strength and a third faint, which is what "a third
    // joins them faintly" means. It names no cardAt at all, so nothing lights.
    { id: 'three-cards', type: 'art', vo: 'L013', art: 'drawThreeCards', stage: 'two',
      continues: true },

    // `cardAt` is indexed by CARD — Money In, Money Out, Employees — and NOT by
    // the order he names them. He says "money out" at 0.33, "money in" at 2.17
    // and "a third" at 8.41, so the array is out of order on purpose and the
    // comment is the only thing standing between this and episode 2's bug.
    //
    // Those first two seconds exist because the repair pass recovered them:
    // small.en stamped fourteen words of this line on one timestamp.
    { id: 'three-named', type: 'art', vo: 'L014', art: 'drawThreeCards', stage: 'named',
      continues: true, cardAt: [2.17, 0.33, 8.41] },

    // "Spending without revenue" at 2.54 is when the second bar joins the
    // first, which is the whole of this line's picture.
    { id: 'three-half', type: 'art', vo: 'L015', art: 'drawThreeCards', stage: 'half',
      continues: true, inAt: 2.54 },

    // ── 5. Across time ──────────────────────────────────────────────────
    // The line is three seconds long. "Change the year" at 0.17, "the whole
    // shape redraws" from 1.15 — so the change starts on the instruction and
    // is still moving while he describes it.
    { id: 'years-change', type: 'art', vo: 'L016', art: 'drawYears', stage: 'change',
      continues: true, changeAt: 0.57 },

    // The four columns arrive while he says "Several years tells you how it is
    // evolving" (5.09 to 7.37), so the picture is complete before the sentence
    // that reads it. Then "What grew" at 8.45 and "what shrank" at 9.45.
    { id: 'years-across', type: 'art', vo: 'L017', art: 'drawYears', stage: 'across',
      continues: true, colAt: [5.09, 5.65, 6.21, 6.77],
      grewAt: 8.45, shrankAt: 9.45 },

    // ── 6. Across levels ────────────────────────────────────────────────
    // The CITY is already on screen and has been for five chapters, so it is
    // explicitly 0 rather than 0.29 where he says the word: a scene that opens
    // on an empty frame and builds the thing the viewer is already looking at
    // is a hole at the cut. What ARRIVES is the other three, on "not the only
    // government", 1.17 to 1.73. The line is 2.64s; nothing can be slow here.
    // ringAt is indexed by LEVELS order, outermost first.
    { id: 'levels-city', type: 'art', vo: 'L018', art: 'drawLevels', stage: 'nest',
      continues: true, ringAt: [1.73, 1.45, 1.17, 0] },

    // He names them INWARDS — "a city" 0.56, "a county" 1.25, "a state" 1.99,
    // "a federal government" 2.76 — and LEVELS is ordered OUTWARDS. So rowAt is
    // reversed on purpose. This is the same index-order trap as cardAt, and the
    // same fault episode 2 shipped. The city is 0 for the same reason as above:
    // it is already there, and he is naming it rather than introducing it.
    { id: 'levels-four', type: 'art', vo: 'L019', art: 'drawLevels', stage: 'column',
      continues: true, rowAt: [2.76, 1.99, 1.25, 0] },

    // "Do you want to see what the money is for, or who spends it" starts at
    // 2.81, which is when the toggle appears.
    { id: 'levels-fed', type: 'art', vo: 'L020', art: 'drawLevels', stage: 'federal',
      continues: true, toggleAt: 2.81 },

    // "by purpose" at 2.86, "and by department" at 3.70 — the second picture
    // arrives on the second half of the phrase, not on the first.
    { id: 'levels-two', type: 'art', vo: 'L021', art: 'drawLevels', stage: 'twoways',
      continues: true, secondAt: 3.70 },

    // "and into dollars per person" at 4.58 is the switch.
    { id: 'levels-person', type: 'art', vo: 'L023', art: 'drawLevels', stage: 'person',
      continues: true, shrinkAt: 4.58 },

    // ── 7. Where the numbers come from ──────────────────────────────────
    { id: 'src-ask', type: 'art', vo: 'L024', art: 'drawSourceCard', stage: 'ask',
      cast: [{ at: [0.78, 0.94], anim: 'ponder', color: VIEWER, scale: 0.85 }] },
    { id: 'src-line', type: 'art', vo: 'L025', art: 'drawSourceCard', stage: 'line',
      continues: true },
    { id: 'src-wording', type: 'art', vo: 'L026', art: 'drawSourceCard', stage: 'wording',
      continues: true },
    // The panel OPENS here, which is the beat, so this scene does not continue.
    { id: 'src-method', type: 'art', vo: 'L027', art: 'drawSourceCard', stage: 'method' },
    { id: 'src-why', type: 'art', vo: 'L028', art: 'drawSourceCard', stage: 'method',
      continues: true, openAt: 0,
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
             { anim: [{ t: 0, anim: 'toddlemarch' }, { t: 1.1, anim: 'annoyed' }],
               color: VIEWER, scale: 0.85, flip: true,
               path: [{ t: 0, at: [1.12, 0.94] }, { t: 1.1, at: [0.70, 0.94] }] }] },
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
    // is. There is ONE capture — the whole Los Angeles page, 1440x2274 — and
    // both scenes pan down it, which is the same shape episode 2's close has.
    // `close-follow` opens where `close-screen` stopped: its rate times its
    // MEASURED length, filled in from timings.json rather than rounded.
    { id: 'close-screen', type: 'art', vo: 'L036', art: 'drawLiveScreen',
      host: 'treasurytracker.empowered.vote',
      panFrom: 0, panRate: 0.06 },
    { id: 'close-follow', type: 'art', vo: 'L037', art: 'drawLiveScreen', continues: true,
      host: 'treasurytracker.empowered.vote',
      panFrom: 0, panRate: 0.085,
      cast: [{ at: [0.09, 0.97], anim: 'present', color: VIEWER, scale: 0.75 },
             { at: [0.91, 0.97], anim: 'ponder', color: VIEWER, scale: 0.75, flip: true }] },
    { id: 'close-card', type: 'art', vo: 'L038', art: 'drawTitleCard', hold: 1.0,
      name: 'Treasury Tracker', sub: 'treasurytracker.empowered.vote',
      cast: [{ at: [0.42, 0.95], anim: 'cheer', color: VIEWER, scale: 0.85 },
             { at: [0.58, 0.95], anim: 'cheer', color: VIEWER, scale: 0.85, flip: true }] }
  ]
};
