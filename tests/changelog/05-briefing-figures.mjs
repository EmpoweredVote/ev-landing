// The "By the numbers" helper compares only whole-number figures on the allow-list,
// and SKIPS a figure whose key is missing from either edition.  Uses the real
// 2026-10-29 -> 2026-11-03 editions, where stances_served became stances_live.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractFigures, parseCount, roundDown, compareFigures, editionHtml, previousReadable } from '../../changelog/briefing-figures.mjs';

const allow = JSON.parse(readFileSync('changelog/figures.json', 'utf8')).figures;
const listed = ['Essentials', 'Compass', 'Read & Rank', 'Treasury Tracker', 'Civic Trivia Championships'];
for (const [k, v] of Object.entries(allow)) assert.ok(listed.includes(v.product), `${k} maps to a listed product`);
assert.ok(!('stances' in allow), 'the stored-rows total (counts drafts) is never allowed');

assert.equal(parseCount('31,540'), 31540);
assert.equal(parseCount('2.2 million'), null);
assert.equal(parseCount('~900'), null);
assert.equal(roundDown(1343), 1300);
assert.equal(roundDown(31540), 31000);
assert.equal(roundDown(219), 210);
assert.equal(roundDown(42), 42);

const f = extractFigures('<b data-auto="stances_live">31,540</b> <span data-auto="stances_live">1</span><i data-auto="asof">November 6, 2026</i>');
assert.deepEqual(f, { stances_live: '31,540', asof: 'November 6, 2026' }, 'first value per key wins');

const before = extractFigures(editionHtml('2026-10-29'));
const after = extractFigures(editionHtml('2026-11-03'));
assert.ok('stances_served' in before && !('stances_live' in before));
const res = compareFigures(before, after, allow);
assert.ok(res.skipped.some((s) => s.key === 'stances_live'), 'renamed figure is skipped, not compared');
assert.ok(!res.moves.some((m) => m.key === 'stances_live'));

const synthetic = compareFigures({ stances_live: '30,000', trivia_active: '3,300' }, { stances_live: '31,343', trivia_active: '3,150' }, allow);
assert.deepEqual(synthetic.moves.map((m) => [m.key, m.direction, m.say]), [
  ['stances_live', 'up', 'up by more than 1,300'],
  ['trivia_active', 'down', 'down 150'],
], 'moves reported, drops reported plainly, rounded down only when rounding changes the number');
const small = compareFigures({ pols_curated: '13,615', budget_entities: '11,192' }, { pols_curated: '13,617', budget_entities: '11,192' }, allow);
assert.deepEqual(small.moves.map((m) => [m.key, m.say, m.total]), [['pols_curated', 'up 2', 'more than 13,000']], 'even two new people count; no change, no move');

assert.equal(editionHtml('2026-10-30'), null, 'an edition left as a forwarder has no figures');
assert.equal(previousReadable('2026-10-30'), '2026-10-29');
assert.ok(editionHtml(previousReadable('9999-01-01')), 'the current edition is readable through briefing/index.html');
console.log('ok: briefing figures');
