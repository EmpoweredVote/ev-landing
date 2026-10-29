// Episode 4 — Civic Trivia Championships. Inform pillar, so the accent is the
// same Inform yellow as episodes 1 to 3.
//
// EVERY SECOND IN THIS FILE IS PROVISIONAL. Episodes 1 to 3 read their
// in-scene seconds off `build/<ep>/words.md`, which is written by split.mjs
// from a real recording. There is no recording of this script yet, so each
// beat here was ESTIMATED from its position in its own line at 2.6 words per
// second — the pace of the three finished takes. They are good enough to
// judge a scratch cut and they are not measurements.
//
// After the first record: run the voice and split steps, then re-read every
// number below out of words.md, relative to that line's own cut start. Do not
// shift them by a delta. A delta applied to a second is a guess about where a
// word is.
//
// One scene per narration line, in order. That one-to-one rule is what makes a
// re-time a single number instead of a re-edit.
//
// The three states of an optional field are the same here as everywhere:
// undefined means "not in this scene", 0 means "already on screen", and a
// positive number means "arrives then". A scene that keeps something from the
// scene before says so with an explicit 0 rather than leaving the field out.
//
// The viewer is purple, the colour the live compass paints YOU and the colour
// episodes 1 to 3 used for the same person.
const VIEWER = '#7C6B9E';

export default {
  id: 'ctc',
  title: 'Civic Trivia Championships',
  accent: '#FFD426',
  fps: 30,
  width: 1920,
  height: 1080,
  // Readable names for the scene-id prefixes, used by the recording script and
  // by the contact sheet. Anything that groups scenes takes this list and
  // never keeps its own copy.
  chapters: [
    { key: 'quiz',   name: 'The test you were made to fear' },
    { key: 'title',  name: 'Title card' },
    { key: 'game',   name: 'How a game runs' },
    { key: 'learn',  name: 'Being wrong is the lesson' },
    { key: 'coll',   name: 'The collections' },
    { key: 'crowd',  name: 'The crowd' },
    { key: 'why',    name: 'Why a trivia game' },
    { key: 'close',  name: 'Close' }
  ],
  scenes: [
    // ── 1. The test you were made to fear ───────────────────────────────
    // The desk is held from the first frame; what arrives is the three
    // subjects, as he names them. The viewer keeps ONE position and scale for
    // the whole chapter — four scenes at four x positions reads as the figure
    // jumping about, which was the first note on episode 1.
    { id: 'quiz-desk', type: 'art', vo: 'L001', art: 'drawDesk', stage: 'paper',
      // "three" 3.51, "how" 4.99, "checks" 6.77
      topicAt: [3.51, 4.99, 6.77],
      // No `cast` here any more. The pupil has a desk in FRONT of him, and the
      // engine draws the cast after the art, so a cast figure can never have
      // anything in front of him. `drawDesk` draws him instead and `seat` is
      // his pose. Two classmates come with him; they are the room, not cues.
      seat: 'read' },

    // The mark lands on "passed" (1.52) and the paper leaves on "again" (4.18),
    // which is the last word of what he never had to use.
    { id: 'quiz-marked', type: 'art', vo: 'L002', art: 'drawDesk', stage: 'marked',
      continues: true, topicAt: [0, 0, 0], markAt: 1.52, goneAt: 4.18,
      // Still sitting. He used to stand up between these two lines for no
      // reason anybody watching could have named.
      seat: 'sit' },

    // The desk goes and a ballot replaces it. The table is drawn from the first
    // frame, so `ballotAt` is free to be a word rather than a hedge against an
    // empty picture: 2.57 plus its 0.6s arrival lands it exactly on "ballot"
    // (3.17). `dustAt` is the drift over it, on "under" (9.35). (An older note
    // here claimed dustAt was where the ballot finished arriving. It is not —
    // read the stage === "ballot" block in art.js.)
    { id: 'quiz-ballot', type: 'art', vo: 'L003', art: 'drawDesk', stage: 'ballot',
      ballotAt: 2.57, dustAt: 9.35,
      cast: [{ at: [0.72, 0.93], anim: 'confused', color: VIEWER, scale: 0.95 }] },

    // The paper turns over and is the live game screen on the other side. "Not"
    // at 1.67 is the turn, and it takes 0.9s — so the screen is face-up at
    // 2.57, and he does not say "a game show" until 3.44. That 0.9s of the
    // screen simply standing there is wanted: the viewer reads the clock and
    // the score before the words name what they are looking at.
    { id: 'quiz-turn', type: 'art', vo: 'L004', art: 'drawDesk', stage: 'turn',
      turnAt: 1.67 },

    // ── 2. Title ────────────────────────────────────────────────────────
    // The product's own lockup, not a line of type. The name lands at 2.18 of a
    // 3.20s line, so the card has to be standing before that: it fades in over
    // the first half second.
    { id: 'title', type: 'art', vo: 'L005', art: 'drawTitleCard', hold: 0.25,
      name: 'Civic Trivia Championships' },

    // ── 3. How a game runs ──────────────────────────────────────────────
    // Two scenes of ONE object. The second carries `continues: true`, so the
    // card never blinks out and fades back in at a cut — the exact fault
    // `continues` exists to stop.
    //
    // The card arrives with the line; the four options go down across "four
    // answers" (4.16) and the clock lands on "25" (5.52).
    { id: 'game-card', type: 'art', vo: 'L006', art: 'drawQuestion', stage: 'card',
      optAt: [4.16, 4.35, 4.54, 4.73], clockAt: 5.52 },

    // The clock is already on screen and does not arrive again. What this
    // scene adds is the two bonus bands painted onto it, each on ITS OWN
    // NUMBER rather than on the word "inside": "10" 3.04, "20" 5.56. The band
    // is a mark on a dial, so it has to arrive with the quantity it marks.
    { id: 'game-clock', type: 'art', vo: 'L007', art: 'drawQuestion', stage: 'clock',
      continues: true, optAt: [0, 0, 0, 0], clockAt: 0, bandAt: [3.04, 5.56] },

    // ── 4. Being wrong is the lesson ────────────────────────────────────
    // The question card returns and opens into the explanation panel. "an
    // explanation of why it's the right answer" at 5.37 is where the reasoning
    // fills in. The card shows the right answer only. The line that answered
    // the wrong option you picked was cut, so the correction block was cut
    // with it — a panel nobody is talking about is a panel the eye reads as
    // the subject.
    { id: 'learn-open', type: 'art', vo: 'L008', art: 'drawLearn', stage: 'answer',
      openAt: 0.80, whyAt: 5.37 },

    // "a named source" starts at 1.76, and the link arrives under it a beat
    // later — "a link you can open" is 3.06 to 3.78.
    { id: 'learn-source', type: 'art', vo: 'L009', art: 'drawLearn', stage: 'source',
      continues: true, openAt: 0, whyAt: 0, srcAt: 1.76 },

    // The flag is the only new thing; everything else was already there. On
    // "flag", 2.07.
    { id: 'learn-flag', type: 'art', vo: 'L010', art: 'drawLearn', stage: 'flag',
      continues: true, openAt: 0, whyAt: 0, srcAt: 0, flagAt: 2.07,
      cast: [{ at: [0.80, 0.94], anim: 'offer', color: VIEWER, scale: 0.80 }] },

    // ── 5. The collections ──────────────────────────────────────────────
    // A shelf of cards. They arrive across the first half of the line and the
    // word "collections" lands at 3.35, by which time the shelf is full — the
    // sixth card is deliberately ON that word rather than before it, and the
    // other five are stepped back from it at 0.35s each.
    { id: 'coll-shelf', type: 'art', vo: 'L011', art: 'drawCollections', stage: 'shelf',
      cardAt: [1.60, 1.95, 2.30, 2.65, 3.00, 3.35] },

    // The same cards sort into three bands, on "federal" 0.73, "state" 1.41 and
    // "city" 2.19. `fedAt` is the SECOND "federal", 3.27 — the one in "the
    // federal collection is a good place to start", not the one in the list.
    { id: 'coll-tiers', type: 'art', vo: 'L012', art: 'drawCollections', stage: 'tiers',
      continues: true, bandAt: [0.73, 1.41, 2.19], fedAt: 3.27 },

    // One city card opens on the word "collection" (0.44). The four things he
    // lists — council, budget, measures, history — arrive as he says them,
    // each cued on ITS OWN "its" rather than on the noun, so the noun is up by
    // the time he reaches it.
    // The spacing is uneven on purpose: he says "its council, its budget, its
    // measures" quickly and then slows right down for "its own particular
    // history", which is the whole point of the list.
    { id: 'coll-city', type: 'art', vo: 'L013', art: 'drawCollections', stage: 'city',
      continues: true, openAt: 0.44, qAt: [3.06, 3.86, 4.42, 5.34] },

    // ── 6. The crowd ────────────────────────────────────────────────────
    // An empty field under the city card. ONE figure arrives, on "start"
    // (2.39), so the flash is clearing under "showing up". This is the chapter
    // the series has been earning: the product's own crowd is made of the same
    // Bobits the episode is drawn in.
    // The crowd is one continuous scene cut into five narration lines, so the
    // population and the tableau are carried ACROSS the cuts by hand:
    // `have` is who was already standing when a line opened and `builtFrom`
    // is what was already up. Each pair has to agree with the line before it
    // — `tests/video/15-continuity.cjs` checks exactly that, because a gap
    // here is a crowd that silently shrinks between two sentences.
    //
    // THE SPAWN TIMES ARE ONE PER FIGURE and they sit on words. A bobit
    // arrives when he is spoken about; a flash with nothing being said is a
    // special effect.
    { id: 'crowd-first', type: 'art', vo: 'L014', art: 'drawCrowd', stage: 'first',
      cardAt: 0.3, have: 0, spawnAt: [2.39], builtFrom: 0, builtTo: 0 },

    // Four arrive across "they stay and hang out, they come back for another
    // round", and then NOBODY arrives for three seconds while he says "and
    // they're still standing there" — which is the one thing in the line that
    // is about the crowd NOT changing. The fifth lands on "another" (7.63),
    // because that is the word that puts him there.
    { id: 'crowd-gather', type: 'art', vo: 'L015', art: 'drawCrowd', continues: true,
      stage: 'gather', cardAt: 0,
      have: 1, spawnAt: [1.13, 2.19, 3.31, 4.61, 7.63],
      builtFrom: 0, builtTo: 0 },

    // Six answered, six standing, and the margins go up. `builtTo: 13` is
    // deliberate rather than round: thirteen lines is the cabin, the whole
    // tree and the scaffold, which is the most of the tableau that reads as
    // SOMETHING at this size. Stopping at a structure boundary is the point
    // — stopping mid-treehouse looks like a bug.
    // `buildAt` is 2.11, on "about" — the last word before "and start
    // building something", so the first lines are going up AS he says it
    // rather than after. The raise takes a second, which lands it at 3.11,
    // and the high five is the beat after that. Both sit in the 0.45s of
    // silence the timing leaves after the line, which is where a celebration
    // belongs: he has stopped talking and the thing is standing.
    { id: 'crowd-build', type: 'art', vo: 'L016', art: 'drawCrowd', continues: true,
      stage: 'build', cardAt: 0,
      have: 6, spawnAt: [0.25, 1.03],
      builtFrom: 0, builtTo: 13, buildAt: 2.11,
      fiveAt: 3.40 },

    { id: 'crowd-leave', type: 'art', vo: 'L018', art: 'drawCrowd', continues: true,
      stage: 'leave', cardAt: 0,
      have: 8, spawnAt: [],
      builtFrom: 13, builtTo: 13,
      // "that one leaves" — on "that", 2.88, so the walk is under "leaves".
      leaveAt: 2.88 },

    { id: 'crowd-account', type: 'art', vo: 'L019', art: 'drawCrowd', continues: true,
      stage: 'account', cardAt: 0,
      have: 8, spawnAt: [0.69, 1.91, 2.57],
      builtFrom: 13, builtTo: 21, buildAt: 0.5,
      // The room cheers on "sign" (6.67) — the turn in the line — and the two
      // captions arrive on "progress" (8.45), by which time both halves of
      // the comparison have been said and the labels are a summary rather
      // than a spoiler.
      cheerAt: 6.67, splitAt: 8.45,
      cast: [{ at: [0.50, 0.955], anim: 'present', color: VIEWER, scale: 0.58 }] },

    { id: 'why-ask', type: 'art', vo: 'L020', art: 'drawWhy', stage: 'ask',
      // On "why", 0.88.
      askAt: 0.88,
      cast: [{ at: [0.22, 0.94], anim: 'ponder', color: VIEWER, scale: 0.85 }] },

    //   lineAt  0      "A" is at 0.08, so the quote is arriving as he opens it
    //   fromAt  7.24   "James", the first word of the attribution
    //   condAt  14.78  "It", the first word of the claim. He pauses a beat
    //                  after it — "is" is not until 15.44 — so the yellow
    //                  line lands into that pause rather than racing it
    { id: 'why-idea', type: 'art', vo: 'L021', art: 'drawWhy', stage: 'idea',
      lineAt: 0, fromAt: 7.24, condAt: 14.78 },

    // The expiry. The card arrives at 0.95, on "evolving", the mayor question
    // lands on it at 3.47 ("Who"), the retirement at 7.05 ("expires") and the
    // replacement at 9.25 ("replacement").
    //
    // `cardAt` is the one cue in this film that is NOT on the word it belongs
    // to. It draws the panel and the "has an end date" caption together, and
    // the caption's own words are at 2.17 — but the panel is the only thing
    // this scene has, so putting the pair there left seconds of black while he
    // says "and the collections are evolving". A caption a beat ahead
    // of the sentence that makes its claim is the cheaper of the two faults.
    // Splitting the two into separate cues is the proper fix and costs an
    // art.js change, which re-renders all 24 scenes.
    //
    // NO newsAt. That cue draws the caption "and the news collections are written
    // nightly", and the line stopped saying it on 2026-10-26. A caption that makes a
    // claim the voice does not make is exactly what the chapter note forbids, and it
    // would be the only unsaid claim in the film. drawWhy still honours newsAt, so this
    // is one field away if the sentence ever comes back.
    { id: 'why-expire', type: 'art', vo: 'L024', art: 'drawWhy', stage: 'expire',
      cardAt: 0.95, qAt: 3.47, expireAt: 7.05, newAt: 9.25 },

    // ── 8. Close ────────────────────────────────────────────────────────
    // The real page, panned rather than held, the same shape as the closes of
    // episodes 2 and 3.
    //
    // A PAN IS MEASURED AGAINST THE SCENE, NOT THE LINE: the scene is the
    // voice plus the 0.45s gap timing.mjs leaves after every line. Reading it
    // off the voice alone jumped the page at the cut in both earlier
    // episodes, back when the two closing scenes shared one picture and the
    // second had to start where the first stopped. They no longer do, so
    // nothing depends on that arithmetic any more — but a pan that is still
    // travelling at the cut would show it, so it is written down.
    //
    // Two stills, not one panned across both lines, because the two lines say
    // different things. L025 is "it's live today" and shows the place you
    // arrive at; L026 is "pick a collection, five questions" and shows the
    // thing being played. They were captured in one sitting off Chris's own
    // browser and they follow each other: Santa Monica is the collection
    // selected on the home page, and the question held under L026 is about
    // the Santa Monica City Council.
    //
    // close-follow therefore does NOT continue — it cuts. `continues: true`
    // suppresses the fade, which is right when a scene keeps the same picture
    // and wrong when it changes it.
    //
    // panRate here is "fraction of the available travel per second", and the
    // travel is whatever the picture has over the box. screen.js is 1440x1428
    // in a box 1190x756, so 424px of it hangs below the frame; 0.17/s walks
    // 88% of that down over the 5.18s of this scene, about 72px a second,
    // which is a person scrolling rather than a slide moving. The 12% it
    // never reaches is the footer, and nothing is lost by stopping above it.
    // screen-play.js is cut
    // to the box's own ratio and has no travel at all, so L026 is held.
    { id: 'close-screen', type: 'art', vo: 'L025', art: 'drawLiveScreen',
      host: 'ctc.empowered.vote',
      panFrom: 0, panRate: 0.17 },
    { id: 'close-follow', type: 'art', vo: 'L026', art: 'drawLiveScreen', shot: 'play',
      host: 'ctc.empowered.vote',
      panFrom: 0, panRate: 0,
      cast: [{ at: [0.09, 0.97], anim: 'present', color: VIEWER, scale: 0.75 }] },
    { id: 'close-card', type: 'art', vo: 'L027', art: 'drawTitleCard', hold: 1.0,
      name: 'Civic Trivia Championships', sub: 'ctc.empowered.vote',
      cast: [{ at: [0.38, 0.95], anim: 'cheer', color: VIEWER, scale: 0.85 },
             { at: [0.62, 0.95], anim: 'cheer', color: '#43D07E', scale: 0.85, rate: 0.9, phase: 0.4 }] }
  ]
};
