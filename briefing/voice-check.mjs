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
// badly. All six fire on it.  The last four (numbers, insider words, repeats and AI
// habits) were added 2026-11-13, set from the 2026-11-13 edition, which passed the
// first seven and was still hard for a reader outside the team to follow. The rules themselves are in README.md, under
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
  dense:     5,      // sentences carrying three or more numbers (dates and years don't count)
  insider:   3,      // insider words a reader outside the team can't decode
  repeats:   0,      // figures printed three or more times in the narrative
  habits:    1,      // AI writing habits (README, "How to write it")
};

// Words that mean something to the team and nothing to a reader.  Use the plain
// word from the table in README.md, "How to write it", or define it in a sentence.
const INSIDER = /\b(?:readable|draft season|stratum|strata|codebook|partition(?:s|ed)?|denominator|buckets?|loaders?|provenance|corpus|derivation|seeding|seeded|backfill|pipeline|cohort)\b/gi;

// Habits from VOICE.md section 9: "X isn't Y" contrasts, surprise words, and
// "counted, not guessed" pairs.  Bold labels are counted from the HTML below.
const HABITS = /\bisn['\u2019]t (?:always|the same as)\b|\bafter all\b|\bit turns out\b|\bhere['\u2019]s the thing\b|\bthe catch\b|\b\w+ed, not \w+ed\b/gi;

let html = fs.readFileSync(file, 'utf8');
// A bold label of four words or fewer opening a paragraph or bullet ("<b>Quality checks.</b>").
const boldLabels = (html.match(/<(?:p|li)\b[^>]*>\s*<b>(?:[^<\s]+\s){0,3}[^<\s]+[.:]<\/b>/g) || []).length;
html = html.replace(/<style[\s\S]*?<\/style>/g, '')
           // The method note opens on a click and is meant to be dense; the edition
           // picker is navigation.  Neither is narrative.  Cell labels aren't prose.
           .replace(/<details[\s\S]*?<\/details>/g, '')
           .replace(/<span class="clabel">[^<]*<\/span>/g, '')
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

// Numbers per sentence, after taking out dates and years, which read as words.
const MONTHS = '(?:January|February|March|April|May|June|July|August|September|October|November|December)';
const numbersIn = s => (s.replace(new RegExp(MONTHS + '\\s+\\d{1,2}(?:,\\s*\\d{4})?', 'g'), ' ')
                         .replace(/\b(?:19|20)\d\d\b/g, ' ')
                         .replace(/\b(?:Season|Phase|version|v)\s*\d+(?:\.\d+)?/gi, ' ')
                         .match(/\d[\d,.]*%?/g) || []).length;
const dense = sentences.filter(s => numbersIn(s) >= 3);
const insiderHits = prose.match(INSIDER) || [];
const habitHits = (prose.match(HABITS) || []).length + boldLabels;
// A figure of 1,000 or more printed three or more times.  Stat tiles are not in
// the prose, so the summary and one section can each carry a headline number.
const figures = {};
for (const f of prose.match(/\b\d{1,3}(?:,\d{3})+\b/g) || []) figures[f] = (figures[f] || 0) + 1;
const repeated = Object.entries(figures).filter(([, n]) => n >= 3);

const rows = [
  ['narrative words',          words,              words <= THRESHOLDS.words,     '<= ' + THRESHOLDS.words],
  ['mean sentence',            mean.toFixed(1),    mean <= THRESHOLDS.meanWords,  '<= ' + THRESHOLDS.meanWords],
  ['longest sentence',         longest,            longest <= THRESHOLDS.longest, '<= ' + THRESHOLDS.longest],
  ['sentences over ' + THRESHOLDS.longest + 'w', over.length, over.length === 0,  '0'],
  ['"this page"',              selfRef,            selfRef <= THRESHOLDS.selfRef, '<= ' + THRESHOLDS.selfRef],
  ['em dashes',                dashes,             dashes <= paras.length,        '<= ' + paras.length + ' (one a paragraph)'],
  ['semicolons',               semis,              semis <= paras.length / 2,     '<= ' + Math.floor(paras.length / 2)],
  ['sentences with 3+ numbers', dense.length,      dense.length <= THRESHOLDS.dense,    '<= ' + THRESHOLDS.dense],
  ['insider words',            insiderHits.length, insiderHits.length <= THRESHOLDS.insider, '<= ' + THRESHOLDS.insider],
  ['figures said 3+ times',    repeated.length,    repeated.length <= THRESHOLDS.repeats, String(THRESHOLDS.repeats)],
  ['AI writing habits',        habitHits,          habitHits <= THRESHOLDS.habits, '<= ' + THRESHOLDS.habits],
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

if (dense.length > THRESHOLDS.dense) {
  console.log('\nThe densest sentences:');
  dense.sort((a, b) => numbersIn(b) - numbersIn(a)).slice(0, 5)
       .forEach(s => console.log('  [' + numbersIn(s) + ' numbers] ' + s.slice(0, 150) + (s.length > 150 ? '…' : '')));
}
if (insiderHits.length > THRESHOLDS.insider) {
  const tally = {};
  insiderHits.forEach(w => { w = w.toLowerCase(); tally[w] = (tally[w] || 0) + 1; });
  console.log('\nInsider words: ' + Object.entries(tally).map(([w, n]) => w + ' ' + n).join(', '));
}
if (repeated.length) console.log('\nSaid three or more times: ' + repeated.map(([f, n]) => f + ' (' + n + ')').join(', '));

const failed = rows.filter(r => !r[2]);
if (failed.length) {
  console.log('\nFAIL: ' + failed.length + ' of ' + rows.length + ' — rewrite the prose and run this again.');
  console.log('      See "How to write it" in briefing/README.md. Do NOT skip the edition over this.');
  process.exit(1);
}
console.log('\nvoice-check: PASS');
