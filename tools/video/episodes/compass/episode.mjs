// Episode 1 — Empowered Compass. Inform Pillar, so the accent is Inform yellow.
//
// Scene durations are NOT written here. They are measured from the voice track
// and filled in by timing.mjs. A scene's `hold` adds a deliberate pause AFTER
// its line, in seconds, for a moment that needs to breathe.
//
// One scene per narration line, in order. That one-to-one rule is what makes a
// re-time a single number instead of a re-edit.
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
    { key: 'fit',   name: 'Where it fits' },
    { key: 'live',  name: 'Close — the live product' },
    { key: 'close', name: 'Close' }
  ],
  scenes: [
    // ── 0. Cold open ────────────────────────────────────────────────────
    { id: 'open-ballot', type: 'art', vo: 'L001', art: 'drawBallot',
      cast: [{ at: [0.22, 0.90], anim: 'confused', tone: 0 }] },

    { id: 'open-spent', type: 'art', vo: 'L002', art: 'drawBallot', dim: true,
      cast: [{ at: [0.22, 0.90], anim: 'spent', tone: 0 }] },

    { id: 'open-letters', type: 'art', vo: 'L003', art: 'drawBallot', dim: true, letters: true,
      cast: [{ at: [0.22, 0.90], anim: 'confused', tone: 0 }] },

    { id: 'open-ponder', type: 'art', vo: 'L004', art: 'drawBallot', dim: true, letters: true,
      cast: [{ at: [0.22, 0.90], anim: 'ponder', tone: 0 }] },

    // ── 1. Title ────────────────────────────────────────────────────────
    // The product's own lockup, not type. Its mark is a radar chart, which is
    // the same figure chapters 4-6 draw.
    { id: 'title', type: 'art', art: 'drawTitleCard', vo: 'L005', hold: 0.9,
      name: 'Empowered Compass', sub: 'Inform Pillar' },

    // ── 2. Why: voter driven, not party driven ──────────────────────────
    { id: 'why-drop', type: 'art', vo: 'L006', art: 'drawBoxes', stage: 'drop',
      cast: [{ at: [0.26, 0.88], anim: 'bored', tone: 0, scale: 0.9 },
             { at: [0.72, 0.88], anim: 'bored', tone: 1, scale: 0.9 }] },

    { id: 'why-disagree', type: 'art', vo: 'L007', art: 'drawBoxes', stage: 'hold',
      cast: [{ at: [0.20, 0.88], anim: 'notlistening', tone: 0, scale: 0.9, flip: true },
             { at: [0.78, 0.88], anim: 'notlistening', tone: 1, scale: 0.9 }] },

    { id: 'why-agree', type: 'art', vo: 'L008', art: 'drawBoxes', stage: 'hold',
      cast: [{ at: [0.26, 0.88], anim: 'stroll', tone: 0, scale: 0.9, path: [[0.26, 0.88], [0.44, 0.88]] },
             { at: [0.72, 0.88], anim: 'stroll', tone: 1, scale: 0.9, flip: true, path: [[0.72, 0.88], [0.56, 0.88]] }] },

    { id: 'why-fade', type: 'art', vo: 'L009', art: 'drawBoxes', stage: 'fade',
      cast: [{ at: [0.44, 0.88], anim: 'present', tone: 0, scale: 0.9 },
             { at: [0.58, 0.88], anim: 'present', tone: 1, scale: 0.9, flip: true }] },

    { id: 'why-start', type: 'stage', vo: 'L010', headline: 'Start from you',
      cast: [{ at: [0.70, 0.88], anim: 'present', tone: 0 }] },

    { id: 'why-driven', type: 'stage', vo: 'L011', headline: 'Voter driven, not party driven',
      cast: [{ at: [0.74, 0.88], anim: 'showTo', tone: 2 }] },

    { id: 'why-define', type: 'stage', vo: 'L012', headline: 'Vote-worthy issues',
      bullets: [{ t: 0.6, text: 'Not every opinion you hold' },
                { t: 3.2, text: 'The few that change your vote' }],
      cast: [{ at: [0.80, 0.88], anim: 'present', tone: 0, scale: 0.9 }] },

    { id: 'why-goal', type: 'stage', vo: 'L013',
      headline: 'Turn your priorities into a picture',
      cast: [{ at: [0.76, 0.88], anim: 'showTo', tone: 2 }] },

    // ── 3. How: calibrate ───────────────────────────────────────────────
    { id: 'cal-start', type: 'art', vo: 'L014', art: 'drawMarkers', count: 1,
      headline: 'Calibrate',
      cast: [{ at: [0.24, 0.90], anim: 'tap', tone: 0, prop: { phone: true } }] },

    { id: 'cal-which', type: 'art', vo: 'L015', art: 'drawMarkers', count: 2,
      headline: 'Which issues?',
      cast: [{ at: [0.24, 0.90], anim: 'tap', tone: 0, prop: { phone: true } }] },

    { id: 'cal-where', type: 'art', vo: 'L016', art: 'drawMarkers', count: 3,
      headline: 'And how hard you hold them',
      cast: [{ at: [0.24, 0.90], anim: 'tap', tone: 0, prop: { phone: true } }] },

    { id: 'cal-yours', type: 'art', vo: 'L017', art: 'drawMarkers', count: 3,
      headline: 'You choose the issues',
      cast: [{ at: [0.24, 0.90], anim: 'present', tone: 0 }] },

    { id: 'cal-shape', type: 'art', vo: 'L018', art: 'drawMarkers', count: 6, ring: true,
      cast: [{ at: [0.22, 0.90], anim: 'present', tone: 0 }] },

    // ── 4. How: one spoke ───────────────────────────────────────────────
    { id: 'spoke-one', type: 'art', vo: 'L019', art: 'drawSpokeGrowing', issue: 'Housing',
      cast: [{ at: [0.18, 0.90], anim: 'showTo', tone: 2 }] },

    { id: 'spoke-line', type: 'art', vo: 'L020', art: 'drawSpokeGrowing', issue: 'Housing',
      cast: [{ at: [0.18, 0.90], anim: 'showTo', tone: 2 }] },

    { id: 'spoke-far', type: 'art', vo: 'L021', art: 'drawSpokeGrowing', issue: 'Housing',
      cast: [{ at: [0.18, 0.90], anim: 'present', tone: 2 }] },

    { id: 'spoke-rule', type: 'art', vo: 'L022', art: 'drawSpokeGrowing', issue: 'Housing',
      cast: [{ at: [0.18, 0.90], anim: 'present', tone: 2 }] },

    // ── 5. How: the shape ───────────────────────────────────────────────
    { id: 'shape-spokes', type: 'art', vo: 'L023', art: 'drawCompassBuilding', stage: 'spokes',
      cast: [{ at: [0.16, 0.90], anim: 'showTo', tone: 0 }] },

    { id: 'shape-dots', type: 'art', vo: 'L024', art: 'drawCompassBuilding', stage: 'dots',
      cast: [{ at: [0.16, 0.90], anim: 'showTo', tone: 0 }] },

    { id: 'shape-outline', type: 'art', vo: 'L025', art: 'drawCompassBuilding', stage: 'outline',
      cast: [{ at: [0.16, 0.90], anim: 'present', tone: 0 }] },

    { id: 'shape-read', type: 'art', vo: 'L026', art: 'drawCompassBuilding', stage: 'filled',
      cast: [{ at: [0.14, 0.90], anim: 'present', tone: 0, scale: 0.95 },
             { at: [0.30, 0.90], anim: 'showTo', tone: 2, scale: 0.95 }] },

    // ── 6. What: the overlay ────────────────────────────────────────────
    { id: 'lay-alone', type: 'art', vo: 'L027', art: 'drawCompassOverlay', stage: 'alone',
      cast: [{ at: [0.16, 0.90], anim: 'present', tone: 0 }] },

    { id: 'lay-second', type: 'art', vo: 'L028', art: 'drawCompassOverlay', stage: 'second',
      headline: 'Their shape, your spokes',
      cast: [{ at: [0.16, 0.90], anim: 'showTo', tone: 0 }] },

    { id: 'lay-overlap', type: 'art', vo: 'L029', art: 'drawCompassOverlay', stage: 'overlap',
      headline: 'Where you agree',
      cast: [{ at: [0.16, 0.90], anim: 'present', tone: 0 }] },

    { id: 'lay-gap', type: 'art', vo: 'L030', art: 'drawCompassOverlay', stage: 'gap',
      cast: [{ at: [0.16, 0.90], anim: 'showTo', tone: 2 }] },

    { id: 'lay-empty', type: 'art', vo: 'L031', art: 'drawCompassOverlay', stage: 'empty',
      cast: [{ at: [0.16, 0.90], anim: 'present', tone: 0 }] },

    { id: 'lay-letter', type: 'art', vo: 'L032', art: 'drawCompassOverlay', stage: 'hold',
      cast: [{ at: [0.14, 0.90], anim: 'showTo', tone: 2, scale: 0.95 },
             { at: [0.30, 0.90], anim: 'present', tone: 0, scale: 0.95 }] },

    { id: 'lay-yours', type: 'art', vo: 'L033', art: 'drawCompassOverlay', stage: 'hold',
      headline: 'You read it yourself',
      cast: [{ at: [0.16, 0.90], anim: 'present', tone: 0 }] },

    // ── 7. Where it fits ────────────────────────────────────────────────
    { id: 'fit-pillars', type: 'art', vo: 'L034', art: 'drawPillarFormula',
      cast: [{ at: [0.12, 0.92], anim: 'present', tone: 0, scale: 0.8 }] },

    { id: 'fit-inform', type: 'art', vo: 'L035', art: 'drawPillarFormula', highlight: 'Inform',
      cast: [{ at: [0.12, 0.92], anim: 'showTo', tone: 2, scale: 0.8 }] },

    { id: 'fit-formula', type: 'art', vo: 'L036', art: 'drawPillarFormula', formula: true,
      cast: [{ at: [0.12, 0.92], anim: 'present', tone: 0, scale: 0.8 }] },

    { id: 'fit-values', type: 'art', vo: 'L037', art: 'drawPillarFormula', formula: true,
      highlight: 'sValues',
      cast: [{ at: [0.12, 0.92], anim: 'showTo', tone: 2, scale: 0.8 }] },

    // ── 8. Close ────────────────────────────────────────────────────────
    { id: 'live-screen', type: 'art', vo: 'L038', art: 'drawLiveScreen', hold: 1.2 },

    { id: 'live-use', type: 'art', vo: 'L039', art: 'drawLiveScreen',
      cast: [{ at: [0.16, 0.95], anim: 'present', tone: 0, scale: 0.65 }] },

    { id: 'close', type: 'stage', vo: 'L040', hold: 1.0,
      headline: 'compass.empowered.vote',
      cast: [{ at: [0.42, 0.88], anim: 'cheer', tone: 0 },
             { at: [0.60, 0.88], anim: 'cheer', tone: 2 }] }
  ]
};
