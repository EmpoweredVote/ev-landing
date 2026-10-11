// Shared scene fixtures. Plain CommonJS so .cjs tests can require it, and the
// objects are pure JSON so they can be handed to page.evaluate unchanged.
module.exports = {
  title: {
    id: 'fx-title', type: 'title', dur: 2, vo: 'L001', accent: '#FFD426',
    headline: 'Empowered Compass', sub: 'Inform Pillar'
  },
  stage: {
    id: 'fx-stage', type: 'stage', dur: 3, vo: 'L002', accent: '#FFD426',
    headline: 'Who are these people?',
    cast: [ { at: [0.5, 0.80], anim: 'confused', tone: 0, scale: 1 } ]
  },
  walker: {
    id: 'fx-walk', type: 'stage', dur: 4, vo: 'L003', accent: '#2BD9D9',
    cast: [ { at: [0.2, 0.80], anim: 'stroll', tone: 1, scale: 1, path: [[0.2, 0.80], [0.8, 0.80]] } ]
  },
  bullets: {
    id: 'fx-bullets', type: 'stage', dur: 6, vo: 'L004', accent: '#FF4019',
    headline: 'Three pillars',
    bullets: [ { t: 0.5, text: 'Inform' }, { t: 2.0, text: 'Connect' }, { t: 3.5, text: 'Empower' } ],
    cast: [ { at: [0.82, 0.82], anim: 'present', tone: 2, scale: 0.8 } ]
  }
};
