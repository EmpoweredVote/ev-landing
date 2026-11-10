// A fixed list of products for the rule tests.  The tests must not depend on what the
// real home page links today: on 2026-11-08 Read & Rank left it, the old tests broke,
// and the Tuesday routine (rightly) refused to publish.  Only 01-entries-valid reads
// the real index.html, and only to check the committed entries.
export const LISTED = [
  { name: 'Essentials', href: 'https://essentials.empowered.vote' },
  { name: 'Compass', href: 'https://compass.empowered.vote' },
  { name: 'Read & Rank', href: 'https://readrank.empowered.vote' },
  { name: 'Treasury Tracker', href: 'https://treasurytracker.empowered.vote' },
  { name: 'Civic Trivia Championships', href: 'https://ctc.empowered.vote' },
];
