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
      topicAt: [4.87, 6.40, 8.10],
      cast: [{ at: [0.72, 0.93], anim: 'read', color: VIEWER, scale: 0.95 }] },

    // The mark lands on "you passed the test" and the paper leaves after it.
    { id: 'quiz-marked', type: 'art', vo: 'L002', art: 'drawDesk', stage: 'marked',
      continues: true, topicAt: [0, 0, 0], markAt: 2.94, goneAt: 4.60,
      cast: [{ at: [0.72, 0.93], anim: 'bored', color: VIEWER, scale: 0.95 }] },

    // The desk goes and a ballot replaces it. `dustAt` is the one beat here
    // that is not a word: it is where the ballot has finished arriving, so the
    // frame is never empty between the two props.
    { id: 'quiz-ballot', type: 'art', vo: 'L003', art: 'drawDesk', stage: 'ballot',
      ballotAt: 1.20, dustAt: 8.33,
      cast: [{ at: [0.72, 0.93], anim: 'confused', color: VIEWER, scale: 0.95 }] },

    // The paper turns over and is a game card on the other side. "Not a test"
    // at 2.56 is the turn; the card is face-up by the time he says "game show".
    { id: 'quiz-turn', type: 'art', vo: 'L004', art: 'drawDesk', stage: 'turn',
      turnAt: 2.56 },

    // ── 2. Title ────────────────────────────────────────────────────────
    // The product's own lockup, not a line of type. The name lands about two
    // thirds of the way through a 2.6s line, so the card has to be standing
    // before that: it fades in over the first half second.
    { id: 'title', type: 'art', vo: 'L005', art: 'drawTitleCard', hold: 0.25,
      name: 'Civic Trivia Championships' },

    // ── 3. How a game runs ──────────────────────────────────────────────
    // Two scenes of ONE object. The second carries `continues: true`, so the
    // card never blinks out and fades back in at a cut — the exact fault
    // `continues` exists to stop.
    //
    // The card arrives with the line; the four options land on "four answers"
    // and the clock on "twenty-five seconds". Both beats sit 1.15s later than
    // the first estimate, because the line now opens with "Matches are quick".
    { id: 'game-card', type: 'art', vo: 'L006', art: 'drawQuestion', stage: 'card',
      optAt: [3.32, 3.60, 3.88, 4.16], clockAt: 5.35 },

    // The clock is already on screen and does not arrive again. What this
    // scene adds is the two bonus bands painted onto it: "inside the first ten
    // seconds" 2.94, "inside twenty" 7.17.
    { id: 'game-clock', type: 'art', vo: 'L007', art: 'drawQuestion', stage: 'clock',
      continues: true, optAt: [0, 0, 0, 0], clockAt: 0, bandAt: [2.94, 7.17] },

    // ── 4. Being wrong is the lesson ────────────────────────────────────
    // The question card returns and opens into the explanation panel. "an
    // explanation why it is the right answer" at 6.79 is where the reasoning
    // fills in. The card shows the right answer only. The line that answered
    // the wrong option you picked was cut, so the correction block was cut
    // with it — a panel nobody is talking about is a panel the eye reads as
    // the subject.
    { id: 'learn-open', type: 'art', vo: 'L008', art: 'drawLearn', stage: 'answer',
      openAt: 0.80, whyAt: 6.79 },

    // "A named source" at 2.94, and the link under it a beat later.
    { id: 'learn-source', type: 'art', vo: 'L009', art: 'drawLearn', stage: 'source',
      continues: true, openAt: 0, whyAt: 0, srcAt: 2.94 },

    // The flag is the only new thing; everything else was already there.
    { id: 'learn-flag', type: 'art', vo: 'L010', art: 'drawLearn', stage: 'flag',
      continues: true, openAt: 0, whyAt: 0, srcAt: 0, flagAt: 3.33,
      cast: [{ at: [0.80, 0.94], anim: 'offer', color: VIEWER, scale: 0.80 }] },

    // ── 5. The collections ──────────────────────────────────────────────
    // A shelf of cards. They arrive across the first half of the line and the
    // word "collections" lands at 4.10, by which time the shelf is full.
    { id: 'coll-shelf', type: 'art', vo: 'L011', art: 'drawCollections', stage: 'shelf',
      cardAt: [1.10, 1.45, 1.80, 2.15, 2.50, 2.85] },

    // The same cards sort into three bands. He names them from the top of the
    // line, so the first band is at 0.25 and the other two follow him.
    { id: 'coll-tiers', type: 'art', vo: 'L012', art: 'drawCollections', stage: 'tiers',
      continues: true, bandAt: [0.25, 1.20, 2.10], fedAt: 4.20 },

    // One city card opens. The four things he lists — council, budget,
    // measures, history — arrive as he says them.
    { id: 'coll-city', type: 'art', vo: 'L013', art: 'drawCollections', stage: 'city',
      continues: true, openAt: 1.50, qAt: [2.94, 3.70, 4.46, 5.22] },

    // ── 6. The crowd ────────────────────────────────────────────────────
    // An empty field under the city card. ONE figure walks in, on "start
    // showing up" at 3.85. This is the chapter the series has been earning: the
    // product's own crowd is made of the same Bobits the episode is drawn in.
    { id: 'crowd-first', type: 'art', vo: 'L014', art: 'drawCrowd', stage: 'first',
      arriveAt: 3.85 },

    // More arrive while he explains that they stay. The first is already there
    // and is explicitly 0.
    { id: 'crowd-gather', type: 'art', vo: 'L015', art: 'drawCrowd', stage: 'gather',
      continues: true, arriveAt: 0, moreAt: [2.17, 4.00, 5.60, 7.10, 8.40] },

    // "start building something" at 4.48 is where the tableau begins to go up.
    { id: 'crowd-build', type: 'art', vo: 'L016', art: 'drawCrowd', stage: 'build',
      continues: true, arriveAt: 0, moreAt: [0, 0, 0, 0, 0], buildAt: 4.48 },

    // A question is dealt that the field has no figure for: 2.56.
    { id: 'crowd-unseen', type: 'art', vo: 'L017', art: 'drawCrowd', stage: 'unseen',
      continues: true, arriveAt: 0, moreAt: [0, 0, 0, 0, 0], buildAt: 0, dealAt: 2.56 },

    // And one walks off, on "then that one leaves" at 4.23.
    { id: 'crowd-leave', type: 'art', vo: 'L018', art: 'drawCrowd', stage: 'leave',
      continues: true, arriveAt: 0, moreAt: [0, 0, 0, 0, 0], buildAt: 0, leaveAt: 4.23 },

    // The signed-out and signed-in halves, side by side. The field stays.
    { id: 'crowd-account', type: 'art', vo: 'L019', art: 'drawCrowd', stage: 'account',
      continues: true, arriveAt: 0, moreAt: [0, 0, 0, 0, 0], buildAt: 0, splitAt: 4.20,
      cast: [{ at: [0.18, 0.95], anim: 'present', color: VIEWER, scale: 0.80 }] },

    // ── 7. Why a trivia game ────────────────────────────────────────────
    // The chapter that says why the thing needs to exist, which is a
    // different question from how it works. Everything it claims is a cron
    // job that runs; the script header names each one.
    //
    // The question is asked and then left standing. "why a trivia game" at
    // 2.31.
    { id: 'why-ask', type: 'art', vo: 'L020', art: 'drawWhy', stage: 'ask',
      askAt: 2.31,
      cast: [{ at: [0.22, 0.94], anim: 'ponder', color: VIEWER, scale: 0.85 }] },

    // One printed line, held. It arrives at 2.31, on "a nation cannot be both
    // ignorant and free", and the last four words of the line are picked out
    // at 13.46 — "the condition of one" is the claim, not the decoration.
    { id: 'why-idea', type: 'art', vo: 'L021', art: 'drawWhy', stage: 'idea',
      lineAt: 2.31, condAt: 13.46 },

    // Separate people, and then the same card in every pair of hands. The
    // split at 1.92, the shared card at 11.92.
    { id: 'why-shared', type: 'art', vo: 'L022', art: 'drawWhy', stage: 'shared',
      splitAt: 1.92, sameAt: 11.92 },

    // A shelf of general quizzes at 2.31, and the gap where a local one would
    // be at 5.77.
    { id: 'why-gap', type: 'art', vo: 'L023', art: 'drawWhy', stage: 'gap',
      shelfAt: 2.31, gapAt: 5.77 },

    // The expiry. The card with a date on it at 2.31, the mayor question on
    // it at 3.08, the retirement at 8.46, the replacement at 10.77, and the
    // nightly news line at 14.23.
    { id: 'why-expire', type: 'art', vo: 'L024', art: 'drawWhy', stage: 'expire',
      cardAt: 2.31, qAt: 3.08, expireAt: 8.46, newAt: 10.77, newsAt: 14.23 },

    // ── 8. Close ────────────────────────────────────────────────────────
    // The real page, panned rather than held, the same shape as the closes of
    // episodes 2 and 3. `panFrom` for the second scene is where the first one
    // stopped: panRate times the length of the SCENE, which is the voice plus
    // the 0.45s gap timing.mjs leaves after every line — NOT the voice alone.
    // Getting that wrong jumped the page back up at the cut in both earlier
    // episodes. These two numbers are provisional with the rest and must be
    // recomputed from the real line lengths.
    //
    // There is no screen.js beside this episode yet. drawLiveScreen degrades
    // to the empty frame and the host name until grab-screen.mjs has run.
    { id: 'close-screen', type: 'art', vo: 'L025', art: 'drawLiveScreen',
      host: 'ctc.empowered.vote',
      panFrom: 0, panRate: 0.06 },
    { id: 'close-follow', type: 'art', vo: 'L026', art: 'drawLiveScreen', continues: true,
      host: 'ctc.empowered.vote',
      panFrom: 0.3192, panRate: 0.085,
      cast: [{ at: [0.09, 0.97], anim: 'present', color: VIEWER, scale: 0.75 }] },
    { id: 'close-card', type: 'art', vo: 'L027', art: 'drawTitleCard', hold: 1.0,
      name: 'Civic Trivia Championships', sub: 'ctc.empowered.vote',
      cast: [{ at: [0.38, 0.95], anim: 'cheer', color: VIEWER, scale: 0.85 },
             { at: [0.62, 0.95], anim: 'cheer', color: '#43D07E', scale: 0.85, rate: 0.9, phase: 0.4 }] }
  ]
};
