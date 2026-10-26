#!/usr/bin/env node
// Counts the tells that made an edition read as corporate.
//
// This is a PROSE check, not a fact check, and the two fail differently. A wrong
// number must never be published. A long sentence must never stop an edition
// going out: a stale current edition is worse than a clumsy new one. So when this
// script exits 1 the answer is to rewrite the prose and run it again, never to
// publish nothing.
//
// Every threshold is set from the 2026-10-23 edition, which is the one that read
// badly. All six fire on it. The rules themselves are in README.md, under
// "How to write it", with the sentences that earned each one.
//
//   node briefing/voice-check.mjs                     # the current edition
//   node briefing/voice-check.mjs briefing/2026-10-23/index.html
import fs from 'fs';

const file = process.argv[2] || 'briefing/index.html';

// Narrative only. Stat tiles, table cells and nav labels are short by design and
// would drag every average down; 180 characters is comfortably longer than the
// longest of those and shorter than the shortest real paragraph.
const MIN_PARA = 180;

const THRESHOLDS = {
  selfRef:   5,      // "this page", outside the one navigation sentence
  meanWords: 18,     // mean sentence length
  longest:   35,     // no sentence longer than this
  words:     4400,   // ~4,000 of narrative, plus a tenth of grace
};

let html = fs.readFileSync(file, 'utf8');
html = html.replace(/<style[\s\S]*?<\/style>/g, '')
           .replace(/<script[\s\S]*?<\/script>/g, '')
           .replace(/<!--[\s\S]*?-->/g, '');
const text = html
  .replace(/<(p|li|h[1-6]|td|th|div|section)[^>]*>/g, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—')
  .replace(/&hellip;/g, '...').replace(/&rarr;/g, '->')
  .replace(/&[a-z]+;/g, ' ').replace(/&#\d+;/g, '')
  .replace(/[ \t]+/g, ' ').replace(/\n /g, '\n');

const paras = text.split('\n').filter(l => l.trim().length > MIN_PARA);
const prose = paras.join(' ');
const sentences = prose.split(/(?<=[.!?])\s+/)
                       .map(s => s.trim())
                       .filter(s => s.length > 20);
const lengths = sentences.map(s => s.split(/\s+/).length);
const words = lengths.reduce((a, b) => a + b, 0);

const count = re => (prose.match(re) || []).length;
// The page is allowed to say where it lives. That sentence is not the problem.
const selfRef = count(/\bthis page\b/gi) - count(/\bthis page (?:is the current|always lives|at the top)/gi);
const dashes = count(/—/g);
const semis = count(/;/g);
const mean = words / (sentences.length || 1);
const over = sentences.filter(s => s.split(/\s+/).length > THRESHOLDS.longest);
const longest = Math.max(0, ...lengths);

const rows = [
  ['narrative words',          words,              words <= THRESHOLDS.words,     '<= ' + THRESHOLDS.words],
  ['mean sentence',            mean.toFixed(1),    mean <= THRESHOLDS.meanWords,  '<= ' + THRESHOLDS.meanWords],
  ['longest sentence',         longest,            longest <= THRESHOLDS.longest, '<= ' + THRESHOLDS.longest],
  ['sentences over ' + THRESHOLDS.longest + 'w', over.length, over.length === 0,  '0'],
  ['"this page"',              selfRef,            selfRef <= THRESHOLDS.selfRef, '<= ' + THRESHOLDS.selfRef],
  ['em dashes',                dashes,             dashes <= paras.length,        '<= ' + paras.length + ' (one a paragraph)'],
  ['semicolons',               semis,              semis <= paras.length / 2,     '<= ' + Math.floor(paras.length / 2)],
];

console.log(file + '  —  ' + paras.length + ' narrative paragraphs, ' + sentences.length + ' sentences\n');
for (const [name, value, ok, want] of rows) {
  console.log((ok ? '  ok  ' : '  !!  ') + String(name).padEnd(22) + String(value).padStart(7) + '   want ' + want);
}

if (over.length) {
  console.log('\nThe long ones, longest first:');
  over.sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length)
      .slice(0, 6)
      .forEach(s => console.log('  [' + s.split(/\s+/).length + 'w] ' + s.slice(0, 150) + (s.length > 150 ? '…' : '')));
}

const failed = rows.filter(r => !r[2]);
if (failed.length) {
  console.log('\nFAIL: ' + failed.length + ' of ' + rows.length + ' — rewrite the prose and run this again.');
  console.log('      See "How to write it" in briefing/README.md. Do NOT skip the edition over this.');
  process.exit(1);
}
console.log('\nvoice-check: PASS');
