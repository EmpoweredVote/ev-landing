// Episode 1 — Empowered Compass. Inform Pillar, so the accent is Inform yellow.
//
// Scene durations are NOT written here. They are measured from the voice track
// and filled in by timing.mjs. A scene's `hold` adds a deliberate pause AFTER
// its line, in seconds, for a moment that needs to breathe.
//
// One scene per narration line, in order. That one-to-one rule is what makes a
// re-time a single number instead of a re-edit.
// The compass paints YOUR shape purple and a compared civic leader's green.
// A Bobit that stands for one of them is drawn in that same colour, so the
// screenshot the episode ends on agrees with the five minutes before it. These
// are the live legend's dark-theme values (EV-CompassV2 CombinedPage.jsx).
const YOU = '#7C6B9E';
const LEADER = '#6DD28C';

export default {
  id: 'compass',
  title: 'Empowered Compass',
  accent: '#FFD426',
  fps: 30,
  width: 1920,
  height: 1080,
  // Readable names for the scene-id prefixes, used by the recording script.
  chapters: [
    { key: 'open',  name: 'Cold open' },
    { key: 'title', name: 'Title card' },
    { key: 'why',   name: 'Why — voter driven, not party driven' },
    { key: 'cal',   name: 'How — calibrate' },
    { key: 'spoke', name: 'How — one spoke' },
    { key: 'shape', name: 'How — the shape' },
    { key: 'lay',   name: 'What — lay their shape over yours' },
    { key: 'src',   name: 'Says who — where a stance comes from' },
    { key: 'live',  name: 'Close — the live product' },
    { key: 'close', name: 'Close' }
  ],
  scenes: [
    // ── 0. Cold open ────────────────────────────────────────────────────
    // `enter` makes this the one scene that starts on the street. Two cast
    // entries, not one: the same person walks up to the door and stops being
    // drawn as they go in, then stands at the booth. One entry cannot do that,
    // because a figure that keeps being drawn stands on the threshold for the
    // rest of the line.
    { id: 'open-ballot', type: 'art', vo: 'L001', art: 'drawBallot', enter: true, dim: 7.4,
      cast: [{ anim: 'stroll', color: YOU, show: [0, 3.5],
               path: [{ t: 0, at: [0.06, 0.90] }, { t: 3.3, at: [0.50, 0.90] }] },
             { at: [0.44, 0.93], anim: 'ponder', color: YOU, show: [4.3, 99] }] },

    // `continues` from here on: the booth and the ballot are already on
    // screen, so nothing fades in again at the cut. Only what is NEW in a
    // scene has a time against it.
    { id: 'open-spent', type: 'art', vo: 'L002', art: 'drawBallot',
      continues: true, dim: 0,
      cast: [{ at: [0.44, 0.93], anim: 'spent', color: YOU }] },

    // The party letters arrive on the ballot that is already there, as "you
    // look for the letter next to the name" is said — 2.7s into the line.
    { id: 'open-letters', type: 'art', vo: 'L003', art: 'drawBallot',
      continues: true, dim: 0, letters: 2.7,
      cast: [{ at: [0.44, 0.93], anim: 'confused', color: YOU }] },

    { id: 'open-ponder', type: 'art', vo: 'L004', art: 'drawBallot',
      continues: true, dim: 0, letters: 0,
      cast: [{ at: [0.44, 0.93], anim: 'ponder', color: YOU }] },

    // ── 1. Title ────────────────────────────────────────────────────────
    // The product's own lockup, not type. Its mark is a radar chart, which is
    // the same figure chapters 4-6 draw.
    { id: 'title', type: 'art', art: 'drawTitleCard', vo: 'L005', hold: 0.9,
      name: 'Empowered Compass' },

    // ── 2. Why: voter driven, not party driven ──────────────────────────
    { id: 'why-drop', type: 'art', vo: 'L006', art: 'drawBoxes', stage: 'drop',
      cast: [{ at: [0.26, 0.88], anim: 'bored', tone: 0, scale: 0.9 },
             { at: [0.72, 0.88], anim: 'bored', tone: 1, scale: 0.9 }] },

    // "Put two people in the SAME box": both of them stand inside the left
    // box, turned to face each other, arguing. Both boxes stay on screen for
    // the whole chapter and only the people move, so "the same box" and "two
    // different boxes" are told by where the figures are rather than by
    // redrawing the set each time. They face each other here — `notlistening`
    // turned back to back, which is a different argument from this one.
    { id: 'why-disagree', type: 'art', vo: 'L007', art: 'drawBoxes', stage: 'hold',
      cast: [{ at: [0.19, 0.88], anim: 'elderangry', tone: 0, scale: 0.9 },
             { at: [0.33, 0.88], anim: 'elderangry', tone: 1, scale: 0.9, flip: true }] },

    // "Two people in DIFFERENT boxes": one in each, reaching toward the other
    // across the gap. They stay put — the line is that the boxes make the
    // agreement hard to see, so the boxes have to still be between them.
    { id: 'why-agree', type: 'art', vo: 'L008', art: 'drawBoxes', stage: 'hold',
      cast: [{ at: [0.26, 0.88], anim: 'showTo', tone: 0, scale: 0.9 },
             { at: [0.72, 0.88], anim: 'showTo', tone: 1, scale: 0.9, flip: true }] },

    // The boxes go. Only then do the two of them walk to each other, slowly,
    // and start talking — so the walk reads as a consequence of the boxes
    // going rather than as something that happened to coincide with it.
    { id: 'why-fade', type: 'art', vo: 'L009', art: 'drawBoxes', stage: 'fade',
      cast: [{ tone: 0, scale: 0.9,
               anim: [{ t: 0, anim: 'standstill' }, { t: 1.6, anim: 'stroll' },
                      { t: 5.8, anim: 'friendly' }],
               path: [{ t: 0, at: [0.26, 0.88] }, { t: 1.6, at: [0.26, 0.88] },
                      { t: 5.8, at: [0.42, 0.88] }, { t: 9.4, at: [0.42, 0.88] }] },
             { tone: 1, scale: 0.9, flip: true,
               anim: [{ t: 0, anim: 'standstill' }, { t: 1.6, anim: 'stroll' },
                      { t: 5.8, anim: 'friendly' }],
               path: [{ t: 0, at: [0.72, 0.88] }, { t: 1.6, at: [0.72, 0.88] },
                      { t: 5.8, at: [0.56, 0.88] }, { t: 9.4, at: [0.56, 0.88] }] }] },

    // The product's mark in the corner instead of a line of type. Through
    // this chapter the viewer stands in ONE place at ONE size: four scenes at
    // four different x positions read as the figure jumping about, which is
    // the first thing a reviewer noticed and the hardest to stop seeing.
    { id: 'why-start', type: 'art', vo: 'L010', art: 'drawBrandMark',
      cast: [{ at: [0.78, 0.88], anim: 'present', color: YOU, scale: 0.95 }] },

    // The person on screen through this chapter is the viewer, and the viewer
    // is purple everywhere else in the episode. A tone-palette yellow here
    // introduced a second character the narration never mentions.
    // The headline sits low in the frame, clear of the mark above it. At the
    // default height the two were a few pixels apart and read as one block.
    { id: 'why-driven', type: 'art', vo: 'L011', art: 'drawBrandMark', continues: true,
      headline: 'Voter driven, not party driven', headlineAt: 0.3, headlineY: 0.44,
      cast: [{ at: [0.78, 0.88], anim: 'present', color: YOU, scale: 0.95 }] },

    // Each line of type arrives with the words that say it, not before. The
    // seconds are measured off the recording: "Not every opinion you hold"
    // begins 4.2s into the line and "just the few" at 5.9s.
    // Every line of type waits for the words that say it. "vote-worthy
    // issues" is spoken 2.3s in, "Not every opinion you hold" at 4.2s and
    // "just the few" at 5.9s, all read off the recording.
    { id: 'why-define', type: 'art', vo: 'L012', art: 'drawBrandMark', continues: true,
      headline: 'Vote-worthy issues', headlineAt: 2.4, headlineY: 0.36,
      bullets: [{ t: 4.3, text: 'Not every opinion you hold' },
                { t: 6.0, text: 'The few that change your vote' }],
      cast: [{ at: [0.78, 0.88], anim: 'present', color: YOU, scale: 0.95 }] },

    { id: 'why-goal', type: 'art', vo: 'L013', art: 'drawBrandMark', continues: true,
      headline: 'Turn your priorities into a picture', headlineAt: 3.4, headlineY: 0.40,
      cast: [{ at: [0.78, 0.88], anim: 'present', color: YOU, scale: 0.95 }] },

    // ── 3. How: calibrate ───────────────────────────────────────────────
    // The questionnaire on the left, the compass on the right, and every
    // answer putting something on it. No headline on these: the card already
    // carries the question in words, and a headline over it says it twice.
    { id: 'cal-start', type: 'art', vo: 'L014', art: 'drawCalibrate', stage: 'ask',
      cast: [{ at: [0.53, 0.97], anim: 'tap', color: YOU, scale: 0.60,
               prop: { phone: true } }] },

    { id: 'cal-which', type: 'art', vo: 'L015', art: 'drawCalibrate', stage: 'names',
      continues: true,
      cast: [{ at: [0.53, 0.97], anim: 'tap', color: YOU, scale: 0.60,
               prop: { phone: true } }] },

    { id: 'cal-where', type: 'art', vo: 'L016', art: 'drawCalibrate', stage: 'dots',
      continues: true,
      cast: [{ at: [0.53, 0.97], anim: 'tap', color: YOU, scale: 0.60,
               prop: { phone: true } }] },

    { id: 'cal-yours', type: 'art', vo: 'L017', art: 'drawCalibrate', stage: 'choose',
      continues: true,
      cast: [{ at: [0.53, 0.97], anim: 'present', color: YOU, scale: 0.60 }] },

    { id: 'cal-shape', type: 'art', vo: 'L018', art: 'drawCalibrate', stage: 'shape',
      continues: true,
      cast: [{ color: YOU, scale: 0.60,
               anim: [{ t: 0, anim: 'stroll' }, { t: 3.0, anim: 'present' }],
               path: [{ t: 0, at: [0.53, 0.97] }, { t: 3.0, at: [0.18, 0.95] },
                      { t: 7.5, at: [0.18, 0.95] }] }] },

    // ── 4. How: one spoke ───────────────────────────────────────────────
    // One idea built over four beats, not the same reveal played four times.
    // The viewer stands at [0.18, 0.95] from the end of the chapter before
    // this one until the end of the chapter after it. Nothing about the
    // figure changes at these cuts except what it is doing.
    { id: 'spoke-one', type: 'art', vo: 'L019', art: 'drawSpokeGrowing', issue: 'Housing',
      stage: 'name', continues: true,
      cast: [{ at: [0.18, 0.95], anim: 'showTo', color: YOU, scale: 0.60 }] },

    { id: 'spoke-line', type: 'art', vo: 'L020', art: 'drawSpokeGrowing', issue: 'Housing',
      stage: 'ladder', continues: true,
      cast: [{ at: [0.18, 0.95], anim: 'showTo', color: YOU, scale: 0.60 }] },

    { id: 'spoke-far', type: 'art', vo: 'L021', art: 'drawSpokeGrowing', issue: 'Housing',
      stage: 'spectrum', continues: true,
      cast: [{ at: [0.18, 0.95], anim: 'showTo', color: YOU, scale: 0.60 }] },

    { id: 'spoke-rule', type: 'art', vo: 'L022', art: 'drawSpokeGrowing', issue: 'Housing',
      stage: 'hold', continues: true,
      cast: [{ at: [0.18, 0.95], anim: 'present', color: YOU, scale: 0.60 }] },

    // ── 5. How: the shape ───────────────────────────────────────────────
    { id: 'shape-spokes', type: 'art', vo: 'L023', art: 'drawCompassBuilding', stage: 'spokes',
      cast: [{ at: [0.18, 0.95], anim: 'showTo', color: YOU, scale: 0.60 }] },

    { id: 'shape-dots', type: 'art', vo: 'L024', art: 'drawCompassBuilding', stage: 'dots',
      continues: true,
      cast: [{ at: [0.18, 0.95], anim: 'showTo', color: YOU, scale: 0.60 }] },

    { id: 'shape-outline', type: 'art', vo: 'L025', art: 'drawCompassBuilding', stage: 'outline',
      continues: true,
      cast: [{ at: [0.18, 0.95], anim: 'present', color: YOU, scale: 0.60 }] },

    // One person, not two. The line is "a shape you recognise as YOURS", and a
    // second figure in a colour that means nothing invites the viewer to ask
    // who they are instead of looking at the shape.
    { id: 'shape-read', type: 'art', vo: 'L026', art: 'drawCompassBuilding', stage: 'filled',
      continues: true,
      cast: [{ at: [0.18, 0.95], anim: 'present', color: YOU, scale: 0.60 }] },

    // ── 6. What: the overlay ────────────────────────────────────────────
    // The second person arrives here and stays to the end of chapter 7. They
    // are drawn in the leader green for the same reason their shape is: the
    // viewer has to be able to tell, at a glance, which of the two is them.
    // The leader WALKS ON, from off the left edge. Appearing at full size
    // beside you between one frame and the next reads as a glitch; somebody
    // arriving reads as somebody arriving.
    // The leader walks on from off the left edge and then stands at [0.34].
    // The viewer does not move at all, here or for the rest of the episode.
    { id: 'lay-alone', type: 'art', vo: 'L027', art: 'drawCompassOverlay', stage: 'alone',
      continues: true,
      cast: [{ at: [0.18, 0.95], anim: 'present', color: YOU, scale: 0.60 },
             { color: LEADER, scale: 0.60,
               anim: [{ t: 0, anim: 'stroll' }, { t: 2.7, anim: 'standstill' }],
               path: [{ t: 0, at: [-0.08, 0.95] }, { t: 2.7, at: [0.34, 0.95] },
                      { t: 4.3, at: [0.34, 0.95] }] }] },

    { id: 'lay-second', type: 'art', vo: 'L028', art: 'drawCompassOverlay', stage: 'second',
      headline: 'Their shape, your spokes', headlineAt: 2.1,
      cast: [{ at: [0.18, 0.95], anim: 'showTo', color: YOU, scale: 0.60 },
             { at: [0.34, 0.95], anim: 'present', color: LEADER, scale: 0.60 }] },

    { id: 'lay-overlap', type: 'art', vo: 'L029', art: 'drawCompassOverlay', stage: 'overlap',
      headline: 'Where you agree', headlineAt: 0.3,
      cast: [{ at: [0.18, 0.95], anim: 'present', color: YOU, scale: 0.60 },
             { at: [0.34, 0.95], anim: 'friendly', color: LEADER, scale: 0.60 }] },

    { id: 'lay-gap', type: 'art', vo: 'L030', art: 'drawCompassOverlay', stage: 'gap',
      cast: [{ at: [0.18, 0.95], anim: 'showTo', color: YOU, scale: 0.60 },
             { at: [0.34, 0.95], anim: 'shrug', color: LEADER, scale: 0.60 }] },

    { id: 'lay-empty', type: 'art', vo: 'L031', art: 'drawCompassOverlay', stage: 'empty',
      cast: [{ at: [0.18, 0.95], anim: 'present', color: YOU, scale: 0.60 },
             { at: [0.34, 0.95], anim: 'standstill', color: LEADER, scale: 0.60 }] },

    // No headline. The line is about what the tool does NOT do, and a title
    // over it is one more thing to read while that is being said.
    { id: 'lay-yours', type: 'art', vo: 'L033', art: 'drawCompassOverlay', stage: 'hold',
      cast: [{ at: [0.18, 0.95], anim: 'present', color: YOU, scale: 0.60 },
             { at: [0.34, 0.95], anim: 'standstill', color: LEADER, scale: 0.60 }] },

    // ── 7. Says who ─────────────────────────────────────────────────────
    // One card built over four beats. `stage` is what stops the four scenes
    // replaying one reveal — see the note on drawSourceCard.
    // "Where did their dot come from?" — the viewer does not know, and says
    // so: `confused` is the head-scratch. The compass is not on screen in this
    // beat, because the beat is the question, not the answer.
    { id: 'src-ask', type: 'art', vo: 'L034', art: 'drawSourceCard', stage: 'ask',
      cast: [{ at: [0.18, 0.95], anim: 'confused', color: YOU, scale: 0.60 },
             { at: [0.34, 0.95], anim: 'standstill', color: LEADER, scale: 0.60 }] },

    { id: 'src-stance', type: 'art', vo: 'L035', art: 'drawSourceCard', stage: 'stance',
      cast: [{ at: [0.18, 0.95], anim: 'showTo', color: YOU, scale: 0.60 },
             { at: [0.34, 0.95], anim: 'present', color: LEADER, scale: 0.60 }] },

    { id: 'src-refs', type: 'art', vo: 'L036', art: 'drawSourceCard', stage: 'refs',
      continues: true,
      cast: [{ at: [0.18, 0.95], anim: 'present', color: YOU, scale: 0.60 },
             { at: [0.34, 0.95], anim: 'standstill', color: LEADER, scale: 0.60 }] },

    { id: 'src-scale', type: 'art', vo: 'L037', art: 'drawSourceCard', stage: 'scale',
      continues: true,
      cast: [{ at: [0.18, 0.95], anim: 'present', color: YOU, scale: 0.60 },
             { at: [0.34, 0.95], anim: 'standstill', color: LEADER, scale: 0.60 }] },

    // ── 8. Close ────────────────────────────────────────────────────────
    { id: 'live-screen', type: 'art', vo: 'L038', art: 'drawLiveScreen', hold: 1.2 },

    // "Calibrate once. After that, every election, you hold your shape up
    // against whoever is asking" — so this scene shows the browse view, where
    // the calibrated compass is held against a city's worth of sitting
    // officials. It is a different picture from the one before it, so it does
    // NOT carry `settled`: the screen crosses rather than cutting, which is
    // the one place in the episode where a change of shot is the point.
    { id: 'live-use', type: 'art', vo: 'L039', art: 'drawLiveScreen',
      shot: 'browse', host: 'essentials.empowered.vote',
      cast: [{ at: [0.18, 0.95], anim: 'present', color: YOU, scale: 0.60 }] },

    // "That's the Empowered Compass" cuts back to the product's own lockup —
    // the same card the episode opened on, now carrying the address — with
    // one purple Bobit cheering under it. One, and purple: the episode has
    // been about the viewer's own compass from the first frame.
    { id: 'close', type: 'art', vo: 'L040', art: 'drawTitleCard', hold: 1.0,
      name: 'Empowered Compass', sub: 'compass.empowered.vote',
      cast: [{ at: [0.50, 0.95], anim: 'cheer', color: YOU, scale: 0.85 }] }
  ]
};
