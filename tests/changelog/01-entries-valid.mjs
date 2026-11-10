// changelog/entries.json is valid, sorted newest first, and every entry passes the
// word check as committed (a run that left a rejected entry in the file did not run
// the check).  last-run.json carries a full timestamp and a real briefing edition.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { checkEntries, listedProducts, isSortedNewestFirst } from '../../changelog/rules.mjs';
import { loadBlockedNames, loadAnnouncedFunders, loadPublishedThrough } from '../../changelog/check-entries.mjs';
import { LISTED } from './listed-fixture.js';

const entries = JSON.parse(readFileSync('changelog/entries.json', 'utf8'));
assert.ok(Array.isArray(entries), 'entries.json is an array');
assert.ok(isSortedNewestFirst(entries), 'entries.json is sorted newest first');

// The real home page: it must list at least one product, each with a link.  Which
// products it lists is the founders' choice and changes; this test does not pin it.
const listed = listedProducts(readFileSync('index.html', 'utf8'));
assert.ok(listed.length > 0, 'the home page lists at least one product');
for (const p of listed) assert.match(p.href || '', /^https:\/\//, `${p.name} has an https link`);
const { dropped } = checkEntries(entries, {
  listed,
  extraNames: loadBlockedNames('changelog/blocked-names.txt'),
  announcedFunders: loadAnnouncedFunders('changelog/announced-funders.txt'),
  publishedThrough: loadPublishedThrough('changelog/last-run.json'),
});
assert.deepEqual(dropped.map((d) => `${d.index}: ${d.reasons.join('; ')}`), [], 'every committed entry passes the check');

const last = JSON.parse(readFileSync('changelog/last-run.json', 'utf8'));
assert.match(last.through, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/, 'last-run "through" is a full UTC timestamp');
assert.match(last.edition, /^\d{4}-\d{2}-\d{2}$/);
assert.ok(existsSync(`briefing/${last.edition}/index.html`), `briefing edition ${last.edition} exists`);
if (entries[0]) assert.ok(entries[0].date <= last.through.slice(0, 10), 'no entry is dated after the last run');

// The fixture used by the other tests must itself be clean, or they test nothing.
const fixture = JSON.parse(readFileSync('tests/changelog/fixture-many.json', 'utf8'));
assert.deepEqual(checkEntries(fixture, { listed: LISTED }).dropped.map((d) => d.reasons), []);
assert.ok(isSortedNewestFirst(fixture));
console.log(`ok: ${entries.length} entries valid and sorted`);
