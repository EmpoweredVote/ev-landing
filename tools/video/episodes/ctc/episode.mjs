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
      topicAt: [3.38, 4.78, 6.16],
      cast: [{ at: [0.72, 0.93], anim: 'read', color: VIEWER, scale: 0.95 }] },

    // The mark lands on "you passed the test" and the paper leaves after it.
    { id: 'quiz-marked', type: 'art', vo: 'L002', art: 'drawDesk', stage: 'marked',
      continues: true, topicAt: [0, 0, 0], markAt: 1.68, goneAt: 4.14,
      cast: [{ at: [0.72, 0.93], anim: 'bored', color: VIEWER, scale: 0.95 }] },

    // The desk goes and a ballot replaces it. The table is drawn from the first
    // frame, so `ballotAt` is free to be a word rather than a hedge against an
    // empty picture: 2.52 plus its 0.6s arrival lands it exactly on "a ballot".
    // `dustAt` is the drift over it, on "under years of dust". (An older note
    // here claimed dustAt was where the ballot finished arriving. It is not —
    // read the stage === "ballot" block in art.js.)
    { id: 'quiz-ballot', type: 'art', vo: 'L003', art: 'drawDesk', stage: 'ballot',
      ballotAt: 2.52, dustAt: 9.22,
      cast: [{ at: [0.72, 0.93], anim: 'confused', color: VIEWER, scale: 0.95 }] },

    // The paper turns over and is a game card on the other side. "Not" at 1.92
    // is the turn, and it takes 0.9s — so the card is face-up at 2.82, before
    // "game show" at 3.36.
    { id: 'quiz-turn', type: 'art', vo: 'L004', art: 'drawDesk', stage: 'turn',
      turnAt: 1.92 },

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
    // answers" (4.11) and the clock lands on "25" (5.15).
    { id: 'game-card', type: 'art', vo: 'L006', art: 'drawQuestion', stage: 'card',
      optAt: [4.11, 4.30, 4.49, 4.68], clockAt: 5.15 },

    // The clock is already on screen and does not arrive again. What this
    // scene adds is the two bonus bands painted onto it: "inside the first ten
    // seconds" 2.94, "inside twenty" 6.38.
    { id: 'game-clock', type: 'art', vo: 'L007', art: 'drawQuestion', stage: 'clock',
      continues: true, optAt: [0, 0, 0, 0], clockAt: 0, bandAt: [2.94, 6.38] },

    // ── 4. Being wrong is the lesson ────────────────────────────────────
    // The question card returns and opens into the explanation panel. "an
    // explanation of why it's the right answer" at 4.58 is where the reasoning
    // fills in. The card shows the right answer only. The line that answered
    // the wrong option you picked was cut, so the correction block was cut
    // with it — a panel nobody is talking about is a panel the eye reads as
    // the subject.
    { id: 'learn-open', type: 'art', vo: 'L008', art: 'drawLearn', stage: 'answer',
      openAt: 0.80, whyAt: 4.58 },

    // "A named source" at 2.27, and the link under it a beat later.
    { id: 'learn-source', type: 'art', vo: 'L009', art: 'drawLearn', stage: 'source',
      continues: true, openAt: 0, whyAt: 0, srcAt: 2.27 },

    // The flag is the only new thing; everything else was already there.
    { id: 'learn-flag', type: 'art', vo: 'L010', art: 'drawLearn', stage: 'flag',
      continues: true, openAt: 0, whyAt: 0, srcAt: 0, flagAt: 2.00,
      cast: [{ at: [0.80, 0.94], anim: 'offer', color: VIEWER, scale: 0.80 }] },

    // ── 5. The collections ──────────────────────────────────────────────
    // A shelf of cards. They arrive across the first half of the line and the
    // word "collections" lands at 2.87, by which time the shelf is full — the
    // sixth card is deliberately ON that word rather than before it.
    { id: 'coll-shelf', type: 'art', vo: 'L011', art: 'drawCollections', stage: 'shelf',
      cardAt: [1.12, 1.47, 1.82, 2.17, 2.52, 2.87] },

    // The same cards sort into three bands, on "federal" 0.67, "state" 1.51 and
    // "city" 2.21. `fedAt` is the second mention, "The federal collection", 3.67.
    { id: 'coll-tiers', type: 'art', vo: 'L012', art: 'drawCollections', stage: 'tiers',
      continues: true, bandAt: [0.67, 1.51, 2.21], fedAt: 3.67 },

    // One city card opens. The four things he lists — council, budget,
    // measures, history — arrive as he says them.
    // The spacing is uneven on purpose: he says "council, its budget, its
    // measures" quickly and then slows for "its own particular history".
    { id: 'coll-city', type: 'art', vo: 'L013', art: 'drawCollections', stage: 'city',
      continues: true, openAt: 1.00, qAt: [2.84, 3.70, 4.30, 5.84] },

    // ── 6. The crowd ────────────────────────────────────────────────────
    // An empty field under the city card. ONE figure walks in, on "start"
    // (2.14), so his 0.7s walk finishes under "showing up". This is the chapter
    // the series has been earning: the product's own crowd is made of the same
    // Bobits the episode is drawn in.
    { id: 'crowd-first', type: 'art', vo: 'L014', art: 'drawCrowd', stage: 'first',
      arriveAt: 2.14 },

    // More arrive while he explains that they stay. The first is already there
    // and is explicitly 0.
    //
    // These five are SPACED, not placed on words, and that is deliberate: the
    // whole-file transcript mis-stamped this line's opening (see cuts.json), so
    // its word times cluster at 2.04/2.26/2.64 and are not a measurement of
    // anything. The three sentences really begin at 0.16, 2.74 and 5.02, read
    // off the silence; the arrivals are laid out inside that.
    { id: 'crowd-gather', type: 'art', vo: 'L015', art: 'drawCrowd', stage: 'gather',
      continues: true, arriveAt: 0, moreAt: [1.30, 2.40, 3.30, 4.40, 5.60] },

    // "start building something" at 3.13 is where the tableau begins to go up.
    { id: 'crowd-build', type: 'art', vo: 'L016', art: 'drawCrowd', stage: 'build',
      continues: true, arriveAt: 0, moreAt: [0, 0, 0, 0, 0], buildAt: 3.13 },

    // And one walks off, on "that one leaves" at 2.94.
    { id: 'crowd-leave', type: 'art', vo: 'L018', art: 'drawCrowd', stage: 'leave',
      continues: true, arriveAt: 0, moreAt: [0, 0, 0, 0, 0], buildAt: 0, leaveAt: 2.94 },

    // The signed-out and signed-in halves, side by side. The field stays.
    { id: 'crowd-account', type: 'art', vo: 'L019', art: 'drawCrowd', stage: 'account',
      continues: true, arriveAt: 0, moreAt: [0, 0, 0, 0, 0], buildAt: 0, splitAt: 3.78,
      cast: [{ at: [0.18, 0.95], anim: 'present', color: VIEWER, scale: 0.80 }] },

    // ── 7. Why a trivia game ────────────────────────────────────────────
    // The chapter that says why the thing needs to exist, which is a
    // different question from how it works. Everything it claims is a cron
    // job that runs; the script header names each one.
    //
    // The question is asked and then left standing. "why a trivia game" at
    // 0.96 — he reads this line fast, and it is only 3.93s long.
    { id: 'why-ask', type: 'art', vo: 'L020', art: 'drawWhy', stage: 'ask',
      askAt: 0.96,
      cast: [{ at: [0.22, 0.94], anim: 'ponder', color: VIEWER, scale: 0.85 }] },

    // THESE THREE TIMES ARE PROVISIONAL. L021 is a pickup: the line changed
    // from a Jefferson paraphrase to a sourced Madison quote on 2026-10-27 and
    // has not been read onto tape yet. Every other cue in this file sits on a
    // word in build/ctc/words.md; these three are estimates from the shape of
    // the sentence, and they are wrong until the pickup is split and this
    // scene is re-timed off the real word sheet. Nothing else in the film
    // depends on them — the scene is cut to the voice, whatever the voice is.
    //
    // Where each one belongs when the words arrive:
    //   lineAt  the quote prints as he starts speaking it
    //   fromAt  the source block, on "James Madison wrote that"
    //   condAt  the yellow claim, on "It is the condition of one"
    { id: 'why-idea', type: 'art', vo: 'L021', art: 'drawWhy', stage: 'idea',
      lineAt: 0.30, fromAt: 7.10, condAt: 14.90 },

    // The expiry. The card arrives at 0.90, on "the collections are evolving",
    // the mayor question lands on it at 3.17, the retirement at 7.53
    // ("expires") and the replacement at 9.97.
    //
    // `cardAt` is the one cue in this film that is NOT on the word it belongs
    // to. It draws the panel and the "has an end date" caption together, and
    // the caption's own words are at 2.17 — but the panel is the only thing
    // this scene has, so putting the pair there left 2.2 seconds of black
    // while he says "and the collections are evolving". A caption 0.7s ahead
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
      cardAt: 0.90, qAt: 3.17, expireAt: 7.53, newAt: 9.97 },

    // ── 8. Close ────────────────────────────────────────────────────────
    // The real page, panned rather than held, the same shape as the closes of
    // episodes 2 and 3. `panFrom` for the second scene is where the first one
    // stopped: panRate times the length of the SCENE, which is the voice plus
    // the 0.45s gap timing.mjs leaves after every line — NOT the voice alone.
    // Getting that wrong jumped the page back up at the cut in both earlier
    // episodes. L025 is 4.917s of voice, so the scene is 5.367s, and
    // 0.06 x 5.367 = 0.3220.
    //
    // There is no screen.js beside this episode yet. drawLiveScreen degrades
    // to the empty frame and the host name until grab-screen.mjs has run.
    { id: 'close-screen', type: 'art', vo: 'L025', art: 'drawLiveScreen',
      host: 'ctc.empowered.vote',
      panFrom: 0, panRate: 0.06 },
    { id: 'close-follow', type: 'art', vo: 'L026', art: 'drawLiveScreen', continues: true,
      host: 'ctc.empowered.vote',
      panFrom: 0.3220, panRate: 0.085,
      cast: [{ at: [0.09, 0.97], anim: 'present', color: VIEWER, scale: 0.75 }] },
    { id: 'close-card', type: 'art', vo: 'L027', art: 'drawTitleCard', hold: 1.0,
      name: 'Civic Trivia Championships', sub: 'ctc.empowered.vote',
      cast: [{ at: [0.38, 0.95], anim: 'cheer', color: VIEWER, scale: 0.85 },
             { at: [0.62, 0.95], anim: 'cheer', color: '#43D07E', scale: 0.85, rate: 0.9, phase: 0.4 }] }
  ]
};
