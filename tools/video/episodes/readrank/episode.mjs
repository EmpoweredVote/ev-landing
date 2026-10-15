// Episode 5 — Read & Rank. Inform pillar, so the accent is the same Inform
// yellow as episodes 1 to 4.
//
// EVERY SECOND IN THIS FILE IS PROVISIONAL, for the same reason as episode 4
// and with the same remedy. The finished episodes read their in-scene seconds
// off `build/<ep>/words.md`, written by split.mjs from a real recording. There
// is no recording of this script yet, so each beat below was ESTIMATED from
// its position in its own line at 2.6 words per second. Re-read every one of
// them off words.md after the first record, relative to that line's own cut
// start, rather than shifting them by a delta.
//
// One scene per narration line, in order.
//
// The three states of an optional field: undefined is "not in this scene", 0
// is "already on screen", a positive number is "arrives then". A scene that
// keeps something says so with an explicit 0.
//
// NOTHING IN THIS EPISODE CARRIES A PARTY. Not a letter, not a colour, not a
// rosette — including chapter 1, where the whole point is what a label does to
// a reader. The card there carries a NAME and nothing else, because a drawn
// party badge is the thing the product exists to take away, and a film that
// prints one to complain about it has still printed one.
//
// From chapter 4 on, the worked example is the 2024 Indiana Governor race that
// ships in `src/data/mockData.ts`: three real candidates, their real answers,
// their real sources. The script's header says why, and what that material
// made impossible to draw.
//
// The viewer is purple, the colour the live compass paints YOU and the colour
// every episode before this used for the same person.
const VIEWER = '#7C6B9E';

export default {
  id: 'readrank',
  title: 'Read & Rank',
  accent: '#FFD426',
  fps: 30,
  width: 1920,
  height: 1080,
  chapters: [
    { key: 'label',  name: 'The labels come off' },
    { key: 'title',  name: 'Title card' },
    { key: 'turn',   name: 'The question turned around' },
    { key: 'race',   name: 'Pick a race' },
    { key: 'blind',  name: 'Reading blind' },
    { key: 'rank',   name: 'Ranking your pile' },
    { key: 'reveal', name: 'The reveal' },
    { key: 'src',    name: 'Where the words come from' },
    { key: 'honest', name: 'What exists today' },
    { key: 'after',  name: 'Afterwards' },
    { key: 'close',  name: 'Close' }
  ],
  scenes: [
    // ── 1. The labels come off ──────────────────────────────────────────
    // The test the chapter borrows. Both cups stand from the first frame: an
    // almost empty table for four seconds is a hole, and the line is about
    // the labels, not about cups arriving. "The labels come off" is 3.08.
    { id: 'label-cups', type: 'art', vo: 'L001', art: 'drawTaste', stage: 'cups',
      cupAt: [0.30, 0.75], plainAt: 3.08,
      cast: [{ at: [0.80, 0.94], anim: 'ponder', color: VIEWER, scale: 0.95 }] },

    // The choice at 1.54, and the two names only at 4.62, on "after you have
    // picked it". The gap between those numbers IS the argument of the
    // chapter, so nothing fills it.
    { id: 'label-pick', type: 'art', vo: 'L002', art: 'drawTaste', stage: 'reveal',
      continues: true, cupAt: [0, 0], plainAt: 0, pickAt: 1.54, labelAt: 4.62,
      cast: [{ at: [0.80, 0.94], anim: 'offer', color: VIEWER, scale: 0.95 }] },

    // A ballot beside it, read the other way round. This scene does NOT
    // continue: the cups are gone and the card is a different object. The
    // name at 3.08 carries the "1", and the paragraph is only reached at
    // 9.60, on "before you reach the first line".
    { id: 'label-card', type: 'art', vo: 'L003', art: 'drawNameCard', stage: 'named',
      nameAt: 3.08, firstAt: 3.08, secondAt: 9.60,
      cast: [{ at: [0.78, 0.93], anim: 'read', color: VIEWER, scale: 0.95 }] },

    // The name lifts off and the paragraph comes up to full. 6.54 is "take
    // the labels off", which is the first line of the film the viewer is
    // asked to answer.
    { id: 'label-lift', type: 'art', vo: 'L004', art: 'drawNameCard', stage: 'lift',
      continues: true, nameAt: 0, firstAt: 0, secondAt: 0, liftAt: 6.54 },

    // ── 2. Title ────────────────────────────────────────────────────────
    { id: 'title', type: 'art', vo: 'L005', art: 'drawTitleCard', hold: 0.25,
      name: 'Read & Rank' },

    // ── 3. The question turned around ───────────────────────────────────
    // The chapter that says why the product exists, which is a different
    // question from how it works. It replaced the pizza practice round, which
    // is leaving the app.
    //
    // The other way of doing this: candidates first, and a percentage handed
    // back. The row lands on "the candidates" at 2.69 and the match chip on
    // "a name with a percentage" at 8.08.
    { id: 'turn-them', type: 'art', vo: 'L006', art: 'drawTurn', stage: 'them',
      rowAt: 0.40, downAt: 2.69, matchAt: 8.08 },

    // The arrow turns. "This one starts at you" at 1.92, the window at 3.85,
    // "whose team they are on" at 8.46.
    { id: 'turn-you', type: 'art', vo: 'L007', art: 'drawTurn', stage: 'you',
      continues: true, rowAt: 0, downAt: 0, matchAt: 0,
      upAt: 1.92, windowAt: 3.85, teamAt: 8.46 },

    // One card, blind. He names the two absences fast — 0.38 and 1.54 — so
    // they cannot fade slowly, and the words arrive under them at 2.69.
    { id: 'turn-card', type: 'art', vo: 'L008', art: 'drawTurn', stage: 'card',
      gapAt: [0.38, 1.54], wordsAt: 2.69, mineAt: 4.23 },

    // The two questions, printed. The old one at 3.46, the new one at 5.77,
    // and the new one is the only one left bright.
    { id: 'turn-ask', type: 'art', vo: 'L009', art: 'drawTurn', stage: 'ask',
      oldAt: 3.46, newAt: 5.77,
      cast: [{ at: [0.82, 0.94], anim: 'present', color: VIEWER, scale: 0.80 }] },

    // ── 4. Pick a race ──────────────────────────────────────────────────
    // Three races, named in the order he names them: mayor, council seat,
    // governor, from 2.56.
    { id: 'race-list', type: 'art', vo: 'L010', art: 'drawRaces', stage: 'list',
      raceAt: [2.56, 3.30, 4.10] },

    // The address field arrives first and the list shortens under it; "or you
    // can ignore that" at 5.63 brings the rest back.
    { id: 'race-address', type: 'art', vo: 'L011', art: 'drawRaces', stage: 'address',
      continues: true, raceAt: [0, 0, 0], addrAt: 1.10, filterAt: 3.20, allAt: 5.63 },

    // The race opens into its questions. "the question, not the candidate" at
    // 3.33 is where one of them is picked out of the row.
    { id: 'race-open', type: 'art', vo: 'L012', art: 'drawRaces', stage: 'open',
      continues: true, raceAt: [0, 0, 0], openAt: 0.80, pickAt: 3.33 },

    // ── 5. Reading blind ────────────────────────────────────────────────
    // One question, three answers, nothing on them. The answers arrive from
    // "Under it are the answers" at 2.17.
    { id: 'blind-card', type: 'art', vo: 'L013', art: 'drawBlind', stage: 'card',
      quoteAt: [2.17, 2.80, 3.43] },

    // The three absences, named one at a time and drawn as three empty places
    // on the card rather than as three crossed-out things. He says them fast —
    // name 0.25, photograph 1.02, party 1.79 — so they cannot fade slowly.
    { id: 'blind-nothing', type: 'art', vo: 'L014', art: 'drawBlind', stage: 'nothing',
      continues: true, quoteAt: [0, 0, 0], gapAt: [0.25, 1.02, 1.79] },

    // The structural guard, which is the strongest claim in the film and the
    // one most worth drawing honestly: a payload arrives, is rebuilt, and only
    // the words survive the rebuild. 3.71 is "The page takes what the server
    // sends"; 9.87 is "so a name cannot reach your screen by accident".
    { id: 'blind-guard', type: 'art', vo: 'L015', art: 'drawBlind', stage: 'guard',
      continues: true, quoteAt: [0, 0, 0], gapAt: [0, 0, 0],
      inAt: 3.71, sieveAt: 6.20, outAt: 9.87 },

    // A different card: one with a single answer on it, lifted out and
    // dropped. "One voice is not a comparison" at 4.87 is the drop.
    { id: 'blind-one', type: 'art', vo: 'L016', art: 'drawBlind', stage: 'one',
      loneAt: 1.20, dropAt: 4.87 },

    // Back to the three-answer card. The one the viewer does not agree with is
    // left behind at 4.48 — the third answer, which is the one that says it is
    // not ready yet. See the art file: the choice is made on what the answer
    // says, not on who said it.
    { id: 'blind-leave', type: 'art', vo: 'L017', art: 'drawBlind', stage: 'leave',
      quoteAt: [0.60, 0.90, 1.20], leaveAt: 4.48,
      cast: [{ at: [0.80, 0.94], anim: 'ponder', color: VIEWER, scale: 0.80 }] },

    // ── 6. Ranking your pile ────────────────────────────────────────────
    // The line is 3.3s and describes one action, so the action is the scene.
    { id: 'rank-pile', type: 'art', vo: 'L018', art: 'drawRank', stage: 'pile',
      pileAt: 0.80 },

    // The pile goes into an order. "The one you most want first" at 2.94.
    { id: 'rank-order', type: 'art', vo: 'L019', art: 'drawRank', stage: 'order',
      continues: true, pileAt: 0, orderAt: 2.94 },

    // The two settle level on one rank at 2.17, on "you can tie them".
    { id: 'rank-tie', type: 'art', vo: 'L020', art: 'drawRank', stage: 'tie',
      continues: true, pileAt: 0, orderAt: 0, tieAt: 2.17 },

    // The ranked choice line, which is the chapter's payoff: the thing the
    // viewer just did, named. 2.17 is "You have just done ranked choice
    // voting".
    { id: 'rank-rcv', type: 'art', vo: 'L021', art: 'drawRank', stage: 'rcv',
      continues: true, pileAt: 0, orderAt: 0, tieAt: 0, rcvAt: 2.17,
      cast: [{ at: [0.80, 0.94], anim: 'present', color: VIEWER, scale: 0.80 }] },

    // ── 7. The reveal ───────────────────────────────────────────────────
    // The names arrive on the answers that were ranked. The line is short and
    // the arrival is the whole of it, so it starts almost at once.
    { id: 'reveal-names', type: 'art', vo: 'L022', art: 'drawReveal', stage: 'names',
      continues: true, nameAt: 0.70 },

    // The ballot assembles, ordered by agreement, from 2.94.
    { id: 'reveal-ballot', type: 'art', vo: 'L023', art: 'drawReveal', stage: 'ballot',
      continues: true, nameAt: 0, sortAt: 2.94 },

    // The grid: people down the side, questions across the top. The columns
    // land on "every question across the top" at 5.25 and the marks fill after
    // them. The caption under it says whose verdicts these are, and it is not
    // optional — see the script header.
    { id: 'reveal-grid', type: 'art', vo: 'L024', art: 'drawReveal', stage: 'grid',
      continues: true, nameAt: 0, sortAt: 0, gridAt: 2.00, colAt: 5.25, markAt: 7.40 },

    // The row of the person agreed with once. 3.70 is "Everybody who is
    // running is on your ballot", and the row must be visibly PRESENT rather
    // than faded: the line is that the page does not drop it.
    { id: 'reveal-rest', type: 'art', vo: 'L025', art: 'drawReveal', stage: 'rest',
      continues: true, nameAt: 0, sortAt: 0, gridAt: 0, colAt: 0, markAt: 0,
      restAt: 3.70 },

    // Nothing arrives. The figure looks at what it built and the frame holds,
    // which is the only way a line about being surprised can play.
    { id: 'reveal-think', type: 'art', vo: 'L026', art: 'drawReveal', stage: 'rest',
      continues: true, nameAt: 0, sortAt: 0, gridAt: 0, colAt: 0, markAt: 0, restAt: 0,
      cast: [{ at: [0.80, 0.94], anim: 'confused', color: VIEWER, scale: 0.80 }] },

    // ── 8. Where the words come from ────────────────────────────────────
    // One revealed answer, alone, and the question asked about it.
    { id: 'src-ask', type: 'art', vo: 'L027', art: 'drawSource', stage: 'ask',
      askAt: 1.80,
      cast: [{ at: [0.80, 0.94], anim: 'ponder', color: VIEWER, scale: 0.80 }] },

    // The four kinds, in his order and on his words: 2.17, 3.33, 5.25, 6.40.
    { id: 'src-four', type: 'art', vo: 'L028', art: 'drawSource', stage: 'four',
      continues: true, askAt: 0, kindAt: [2.17, 3.33, 5.25, 6.40] },

    // The excerpt inside the original. The full quote opens at 7.17, "After
    // the reveal", and the highlight showing where the excerpt sat follows it.
    { id: 'src-excerpt', type: 'art', vo: 'L029', art: 'drawSource', stage: 'excerpt',
      continues: true, askAt: 0, kindAt: [0, 0, 0, 0], fullAt: 7.17, markAt: 9.60 },

    { id: 'src-line', type: 'art', vo: 'L030', art: 'drawSource', stage: 'line',
      continues: true, askAt: 0, kindAt: [0, 0, 0, 0], fullAt: 0, markAt: 0,
      lineAt: 1.40 },

    // ── 9. What exists today ────────────────────────────────────────────
    // Plain and level, like every honesty chapter in this series.
    { id: 'honest-say', type: 'art', vo: 'L031', art: 'drawCoverage', stage: 'say',
      cast: [{ at: [0.76, 0.94], anim: 'standstill', color: VIEWER, scale: 0.90 }] },

    // The map fills for the reading and stays mostly empty for the material:
    // "The material does not exist wherever you are" at 5.25.
    { id: 'honest-map', type: 'art', vo: 'L032', art: 'drawCoverage', stage: 'map',
      continues: true, readAt: 1.60, matAt: 5.25,
      cast: [{ at: [0.76, 0.94], anim: 'standstill', color: VIEWER, scale: 0.90 }] },

    // A long race beside a short one, and the question that nobody can be
    // compared on taken out of the short one at 9.48.
    { id: 'honest-short', type: 'art', vo: 'L033', art: 'drawCoverage', stage: 'short',
      continues: true, readAt: 0, matAt: 0, pairAt: 1.60, cutAt: 9.48,
      cast: [{ at: [0.76, 0.94], anim: 'offer', color: VIEWER, scale: 0.90 }] },

    // ── 10. Afterwards ──────────────────────────────────────────────────
    // The top-ranked issue is carried across to a compass at 8.71.
    { id: 'after-compass', type: 'art', vo: 'L034', art: 'drawAfter', stage: 'compass',
      topAt: 2.40, crossAt: 8.71 },

    // The revealed name, with the link out. The three things a profile carries
    // arrive together at 6.02 — record, funding, votes — because he says them
    // as one list and three separate arrivals would outrun him.
    { id: 'after-essentials', type: 'art', vo: 'L035', art: 'drawAfter', stage: 'essentials',
      continues: true, topAt: 0, crossAt: 0, profileAt: 2.60, holdsAt: 6.02 },

    // ── 11. Close ───────────────────────────────────────────────────────
    // `panFrom` on the second scene is where the first stopped: panRate times
    // the SCENE length, which is the voice plus the 0.45s gap, not the voice.
    // Provisional with everything else here.
    //
    // There is no screen.js beside this episode yet. drawLiveScreen degrades
    // to the empty frame and the host name until grab-screen.mjs has run.
    { id: 'close-screen', type: 'art', vo: 'L036', art: 'drawLiveScreen',
      host: 'readrank.empowered.vote',
      panFrom: 0, panRate: 0.06 },
    { id: 'close-follow', type: 'art', vo: 'L037', art: 'drawLiveScreen', continues: true,
      host: 'readrank.empowered.vote',
      panFrom: 0.2496, panRate: 0.085,
      cast: [{ at: [0.09, 0.97], anim: 'present', color: VIEWER, scale: 0.75 }] },
    { id: 'close-card', type: 'art', vo: 'L038', art: 'drawTitleCard', hold: 1.0,
      name: 'Read & Rank', sub: 'readrank.empowered.vote',
      cast: [{ at: [0.38, 0.95], anim: 'cheer', color: VIEWER, scale: 0.85 },
             { at: [0.62, 0.95], anim: 'cheer', color: '#1DA8C6', scale: 0.85, rate: 0.9, phase: 0.4 }] }
  ]
};
