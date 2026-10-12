// Episode 2 — Empowered Essentials. Inform pillar, so the accent is the same
// Inform yellow as episode 1.
//
// Scene durations are NOT written here. They are measured from the voice track
// and filled in by timing.mjs. A scene's `hold` adds a deliberate pause AFTER
// its line, in seconds, for a moment that needs to breathe.
//
// One scene per narration line, in order. That one-to-one rule is what makes a
// re-time a single number instead of a re-edit.
//
// EVERY SECOND IN THIS FILE IS READ OFF THE RECORDING. The times against
// `bandAt`, `nameAt`, `ladderAt` and the rest are the seconds the narrator
// reaches those words, taken from vo/<take>.words.json. Type that arrives
// before the voice gets there is read ahead of the voice, and from then on the
// viewer is reading instead of listening.
//
// The viewer is purple everywhere, which is the colour the live compass paints
// YOU and the colour episode 1 used for the same person. A figure that stands
// for nobody is left out instead of being given a colour of its own.
const VIEWER = '#7C6B9E';

export default {
  id: 'essentials',
  title: 'Empowered Essentials',
  accent: '#FFD426',
  fps: 30,
  width: 1920,
  height: 1080,
  // Readable names for the scene-id prefixes, used by the recording script and
  // by the contact sheet. Anything that groups scenes takes this list and
  // never keeps its own copy.
  chapters: [
    { key: 'open',   name: 'The offices nobody can name' },
    { key: 'title',  name: 'Title card' },
    { key: 'where',  name: 'One address, every office' },
    { key: 'who',    name: 'The profile' },
    { key: 'money',  name: 'Who paid for the campaign' },
    { key: 'record', name: 'The record' },
    { key: 'cover',  name: 'What we actually cover' },
    { key: 'why',    name: 'Why the bottom of the ballot' },
    { key: 'close',  name: 'Close' }
  ],
  scenes: [
    // ── 1. The offices nobody can name ──────────────────────────────────
    // The five jobs arrive as they are spoken. Their seconds live in art.js
    // beside the names, because the name and the moment it is said are one
    // fact and splitting them across two files is how they drift apart.
    { id: 'open-jobs', type: 'art', vo: 'L001', art: 'drawBallot', stage: 'jobs',
      cast: [{ at: [0.74, 0.93], anim: 'read', color: VIEWER, scale: 0.95 }] },

    // `continues` from here: the ballot is already on screen and nothing in it
    // fades in again at the cut. Only what is NEW has a time against it — here
    // the three offices anybody can name, lighting as each is named.
    { id: 'open-named', type: 'art', vo: 'L002', art: 'drawBallot', stage: 'names',
      continues: true, nameAt: [1.17, 2.21, 3.35],
      cast: [{ at: [0.74, 0.93], anim: 'confused', color: VIEWER, scale: 0.95 }] },

    // The custodians, each arriving as the recording names it. Their seconds
    // live in art.js beside the names, for the same reason the jobs' do.
    // `headAt` is "it is just kept in a dozen places" — four seconds pass
    // before the first card is named and the frame was empty for all of them.
    //
    // The viewer holds the SAME position through the whole chapter. Four
    // scenes at four different x positions read as the figure jumping about,
    // which was the first thing a reviewer noticed in episode 1.
    { id: 'open-scatter', type: 'art', vo: 'L003', art: 'drawScatter', stage: 'scatter',
      headAt: 1.58,
      cast: [{ at: [0.74, 0.93], anim: 'standstill', color: VIEWER, scale: 0.95 }] },

    // The cards are already on screen and they do not arrive again; they
    // recede, inside this scene, so the figure standing among them is what is
    // new. See drawScatter.
    { id: 'open-witsend', type: 'art', vo: 'L004', art: 'drawScatter', stage: 'middle',
      continues: true,
      cast: [{ at: [0.74, 0.93], anim: 'witsend', color: VIEWER, scale: 0.95 }] },

    // ── 2. Title ────────────────────────────────────────────────────────
    // The product's own lockup, not a line of type. The hold was 0.9, which
    // put a second and a half of nothing after a two-second card.
    { id: 'title', type: 'art', vo: 'L005', art: 'drawTitleCard', hold: 0.25,
      name: 'Empowered Essentials' },

    // ── 3. One address, every office ────────────────────────────────────
    // "Where you live" lands at 3.68, which is when the words are said.
    { id: 'where-address', type: 'art', vo: 'L006', art: 'drawAddress', saidAt: 3.68,
      cast: [{ at: [0.80, 0.93], anim: 'tap', color: VIEWER, scale: 0.90 }] },

    // Six boundaries, each on the second it is named. No cast: the picture is
    // a diagram for three lines and a figure in front of it is one more thing
    // to look at while six shapes are arriving.
    { id: 'where-bounds', type: 'art', vo: 'L007', art: 'drawBoundaries' },

    // The chapter's payoff, in the order the sentence gives it. "We take the
    // address" at 0.05 is the pin; "work out every boundary that contains it"
    // at 1.62 brings chapter 1's scattered record-keepers back; "and hand back
    // every office" at 4.30 is when they travel, and the list and the lockup
    // land where they went. Then the band names at 7.42, "grouped by level",
    // and "local at the top" and "federal at the bottom" two seconds apart.
    { id: 'where-list', type: 'art', vo: 'L008', art: 'drawOffices', stage: 'list',
      addressAt: 0.05, sheetsAt: 1.62,
      rowsAt: 4.30, bandsAt: 7.28, markTop: 8.52, markBottom: 9.72 },

    // "The people asking for those seats" at 1.79. The address and the lockup
    // are inherited, so they carry no time; the cards are spent, so this scene
    // does not name them at all.
    { id: 'where-cands', type: 'art', vo: 'L009', art: 'drawOffices', stage: 'candidates',
      continues: true, addressAt: 0, rowsAt: 0, bandsAt: 0, markTop: 0, markBottom: 0,
      candAt: 1.79 },

    // The figure comes back in the gap between the two columns, low, so it
    // does not stand on the list it is presenting.
    { id: 'where-more', type: 'art', vo: 'L010', art: 'drawOffices', stage: 'full',
      continues: true, addressAt: 0, rowsAt: 0, bandsAt: 0, markTop: 0, markBottom: 0,
      candAt: 0,
      cast: [{ at: [0.50, 0.97], anim: 'present', color: VIEWER, scale: 0.80 }] },

    // ── 4. The profile ──────────────────────────────────────────────────
    // Six lines, one card, nothing redrawn. No cast in this chapter or the
    // next: the card and the ladder take the full width, and a figure in
    // front of a page of type is in the way of the type.
    { id: 'who-card', type: 'art', vo: 'L011', art: 'drawProfile', stage: 'card' },

    // The banner lands on "the page says so", at 1.93.
    { id: 'who-ballot', type: 'art', vo: 'L012', art: 'drawProfile', stage: 'ballot',
      continues: true, ballotAt: 1.93 },

    // "Where they stand" is said at 1.06, so the ladder arrives then.
    { id: 'who-ladder', type: 'art', vo: 'L013', art: 'drawProfile', stage: 'ladder',
      continues: true, ballotAt: 0, ladderAt: 1.06 },

    // "Theirs is drawn over yours" at 2.66.
    { id: 'who-compass', type: 'art', vo: 'L014', art: 'drawProfile', stage: 'compass',
      continues: true, ballotAt: 0, ladderAt: 0, compassAt: 2.66 },

    // The drawer opens under the rung they picked on "the reasoning", at
    // 1.42, and the numbered sources come with it.
    { id: 'who-sources', type: 'art', vo: 'L015', art: 'drawProfile', stage: 'sources',
      continues: true, ballotAt: 0, ladderAt: 0, compassAt: 0, sourcesAt: 1.42 },

    // "We leave it empty" at 1.87, in the SECOND reading of the line — it was
    // read twice, both complete, and the last reading is the one the reader
    // was told would count. The blank is a real one: the platform holds no
    // stance for her on that topic.
    { id: 'who-blank', type: 'art', vo: 'L016', art: 'drawProfile', stage: 'blank',
      continues: true, ballotAt: 0, ladderAt: 0, compassAt: 0, sourcesAt: 0, blankAt: 1.87 },

    // ── 5. Who paid for the campaign ────────────────────────────────────
    // The chapter's title, not an empty bar. "Transparent Motivations" is
    // what this part of the product is for, and it holds the frame while the
    // line gets to the question it is the answer to — "who paid for the
    // campaign?", at 3.98. The bar arrives in the NEXT scene, with the line
    // that puts something on it.
    { id: 'money-bar', type: 'art', vo: 'L017', art: 'drawMoney', stage: 'bar',
      titleAt: 0.10, askAt: 3.98 },

    // The bar arrives on "sorted into four groups" — 1.38 — and her name and
    // total a moment earlier, on "raised". Each band then takes its colour
    // and its name on the second it is spoken: grassroots 3.52, large
    // individual 5.78, PACs 7.66, the candidate's own money 9.72.
    { id: 'money-bands', type: 'art', vo: 'L018', art: 'drawMoney', stage: 'bands',
      continues: true, titleAt: 0, askAt: 0, whoseAt: 0.60, barAt: 1.38,
      bandAt: [3.52, 5.78, 7.66, 9.72] },

    // The comparison is an aside and it takes the whole frame, so this scene
    // deliberately does NOT continue. Two real campaigns, six tenths of one
    // per cent apart on the total.
    //
    // Both bars arrive on "Those proportions" — 0.09 — and stay for the whole
    // line. They used to wait for "two campaigns" at 3.88, which left the
    // frame empty for the first four seconds of the line that is ABOUT them.
    { id: 'money-two', type: 'art', vo: 'L019', art: 'drawMoney', stage: 'two',
      titleAt: 0, askAt: 0, pairAt: 0.09 },

    // Back to her bar, which means this scene does not continue either: it
    // fades the whole picture back in rather than snapping to it. The bands
    // are already named, so their times are zero — "was there", not "starts
    // now".
    { id: 'money-donors', type: 'art', vo: 'L020', art: 'drawMoney', stage: 'donors',
      titleAt: 0, askAt: 0, whoseAt: 0, barAt: 0, bandAt: [0, 0, 0, 0], listAt: 0.34, searchAt: 3.72 },

    // "Outside spending" — 3.30.
    { id: 'money-outside', type: 'art', vo: 'L021', art: 'drawMoney', stage: 'outside',
      continues: true, titleAt: 0, askAt: 0, whoseAt: 0, barAt: 0, bandAt: [0, 0, 0, 0], listAt: 0, searchAt: 0,
      outsideAt: 2.35 },

    // The Commission at 3.69, state and local disclosure at 5.43. Each is a
    // tag on the thing it produced, not a new panel.
    { id: 'money-filings', type: 'art', vo: 'L022', art: 'drawMoney', stage: 'filings',
      continues: true, titleAt: 0, askAt: 0, whoseAt: 0, barAt: 0, bandAt: [0, 0, 0, 0], listAt: 0, searchAt: 0,
      outsideAt: 0, srcAt: [3.69, 5.43],
      cast: [{ at: [0.945, 0.96], anim: 'showTo', color: VIEWER, scale: 0.72, flip: true }] },

    // ── 6. The record ───────────────────────────────────────────────────
    // The three columns light as the line names them: the bill at 3.02, what
    // it did at 3.98, which way they went at 5.46.
    { id: 'record-votes', type: 'art', vo: 'L023', art: 'drawRecord', stage: 'votes',
      rowAt: 0.80, colAt: [3.02, 3.98, 5.46] },

    // What she says beside what she did. The three bills on the right are the
    // three her housing stance cites, which is the only reason this pair is
    // worth putting on one page.
    // "What somebody says they believe" at 0.05, "what they voted for" at
    // 1.69, "puts both on one page" at 5.37. Each half arrives with its own
    // half of the sentence and the rule joining them waits for the clause
    // that joins them.
    { id: 'record-compare', type: 'art', vo: 'L024', art: 'drawRecord', stage: 'compare',
      sayAt: 0.05, didAt: 1.69, bothAt: 5.37 },

    // ── 7. What we actually cover ───────────────────────────────────────
    // The viewer stands in one place for the whole chapter and only the
    // animation changes.
    { id: 'cover-alpha', type: 'art', vo: 'L025', art: 'drawCoverage', stage: 'alpha',
      cast: [{ at: [0.84, 0.95], anim: 'standstill', color: VIEWER, scale: 0.80 }] },

    // "Any address in the United States" at 1.08.
    { id: 'cover-congress', type: 'art', vo: 'L026', art: 'drawCoverage', stage: 'congress',
      continues: true, congressAt: 1.08,
      cast: [{ at: [0.84, 0.95], anim: 'present', color: VIEWER, scale: 0.80 }] },

    // "Our alpha communities" at 3.88.
    { id: 'cover-communities', type: 'art', vo: 'L027', art: 'drawCoverage', stage: 'communities',
      continues: true, congressAt: 0, spotsAt: 3.88,
      cast: [{ at: [0.84, 0.95], anim: 'present', color: VIEWER, scale: 0.80 }] },

    // The ring lands on the word "stances", at 1.97.
    { id: 'cover-stances', type: 'art', vo: 'L028', art: 'drawCoverage', stage: 'stances',
      continues: true, congressAt: 0, spotsAt: 0, stancesAt: 1.97,
      cast: [{ at: [0.84, 0.95], anim: 'present', color: VIEWER, scale: 0.80 }] },

    // One more, and slowly: the line is that they grow slowly on purpose, so
    // the last area takes a second and a half to come up rather than landing.
    { id: 'cover-grow', type: 'art', vo: 'L029', art: 'drawCoverage', stage: 'grow',
      continues: true, congressAt: 0, spotsAt: 0, stancesAt: 0, newAt: 0.84,
      cast: [{ at: [0.84, 0.95], anim: 'standstill', color: VIEWER, scale: 0.80 }] },

    // "The site says so" at 1.97.
    { id: 'cover-missing', type: 'art', vo: 'L030', art: 'drawCoverage', stage: 'missing',
      continues: true, congressAt: 0, spotsAt: 0, stancesAt: 0, newAt: 0, missingAt: 1.97,
      cast: [{ at: [0.84, 0.95], anim: 'offer', color: VIEWER, scale: 0.80 }] },

    // ── 8. Why the bottom of the ballot ─────────────────────────────────
    // The ballot comes back after eight minutes away, so it arrives rather
    // than continuing. Its geometry has not moved since the first scene,
    // which is the point: it is the same object.
    { id: 'why-lower', type: 'art', vo: 'L031', art: 'drawBallot', stage: 'lower' },

    // What each office decides, hung off its own row as it is said.
    { id: 'why-labels', type: 'art', vo: 'L032', art: 'drawBallot', stage: 'labels',
      continues: true },

    // The congressional field is already there and the council seat lands on
    // "a Council seat" — 2.62. The viewer's own dot, in BOTH fields, lands on
    // "one informed voter" — 8.20.
    { id: 'why-votes', type: 'art', vo: 'L033', art: 'drawTurnout',
      bigAt: 0.50, smallAt: 2.62, youAt: 8.20 },

    { id: 'why-ponder', type: 'art', vo: 'L034', art: 'drawBallot', stage: 'lower', hold: 0.4,
      cast: [{ at: [0.76, 0.93], anim: 'ponder', color: VIEWER, scale: 0.90 }] },

    // ── 9. Close ────────────────────────────────────────────────────────
    // The real page, panned rather than held. The rates are fractions of the
    // travel per second, so the pan does not need to be told how long its
    // line is: this one covers a quarter of the page, and the next picks up
    // where it left off and runs to the bottom.
    { id: 'close-screen', type: 'art', vo: 'L035', art: 'drawLiveScreen',
      panFrom: 0, panRate: 0.06 },

    // 0.264 is where the scene before it stopped — its rate times its measured
    // length — not a round number. At 0.25 the page jumped fifty pixels back
    // up at the cut, which is the one thing a continuous pan must not do.
    { id: 'close-use', type: 'art', vo: 'L036', art: 'drawLiveScreen', continues: true,
      panFrom: 0.264, panRate: 0.085,
      cast: [{ at: [0.07, 0.97], anim: 'present', color: VIEWER, scale: 0.75 },
             { at: [0.93, 0.97], anim: 'friendly', color: VIEWER, scale: 0.75, flip: true }] },

    // Back to the product's own lockup, now carrying the address, with two
    // voters cheering under it.
    { id: 'close-card', type: 'art', vo: 'L037', art: 'drawTitleCard', hold: 1.0,
      name: 'Empowered Essentials', sub: 'essentials.empowered.vote',
      cast: [{ at: [0.42, 0.95], anim: 'cheer', color: VIEWER, scale: 0.85 },
             { at: [0.58, 0.95], anim: 'cheer', color: VIEWER, scale: 0.85, flip: true }] }
  ]
};
