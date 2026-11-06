// check-entries rejects a sample of every banned group from decision 0036, plus
// unlisted products, bad links and the per-post caps.  The CLI drops rejected entries
// and exits 0; it exits non-zero only on a broken file.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkEntries, entryProblems, listedProducts } from '../../changelog/rules.mjs';

const listed = listedProducts(readFileSync('index.html', 'utf8'));
assert.deepEqual(listed.map((p) => p.name).sort(),
  ['Civic Trivia Championships', 'Compass', 'Essentials', 'Read & Rank', 'Treasury Tracker'],
  'the home page lists these five products (update this test when one is linked or unlinked)');

const ok = (text, extra = {}) => ({ date: '2026-11-06', product: 'Compass', text, ...extra });
const problems = (e, names, announced) => entryProblems(e, { listed, extraNames: names || [], announcedFunders: announced || [] });
const rejects = (text, group) => {
  const r = problems(ok(text));
  assert.ok(r.some((x) => x.startsWith(group + ':')), `expected "${text}" to be rejected as ${group}; got ${JSON.stringify(r)}`);
};

assert.deepEqual(problems(ok('Some stance explanations on Compass were hard to read. They are fixed.')), []);

// Party names
for (const t of ['Democrats asked for this.', 'Republican officials now show up.', 'GOP primary results are in.', 'Libertarian candidates appear.', 'The Green Party now has a page.', 'A note on the DNC.']) rejects(t, 'party');
// Red or blue as political colour
for (const t of ['Red states now load faster.', 'Blue districts got a fix.', 'The map is less red now.']) rejects(t, 'colour');
// Funder and grant names, without naming anyone (this repo is public)
for (const t of ['Thanks to our grant, Treasury grew.', 'Funded by a generous partner.', 'The Example Foundation helped.', 'Our funders asked for it.', 'Sponsored by a friend.']) rejects(t, 'funder');
assert.ok(problems(ok('Thanks to Acme Civic Partners.'), ['Acme Civic Partners']).some((x) => x.startsWith('funder:')), 'blocked-names.txt names are rejected');
// An organisation whose grant is announced may be thanked; nobody else.
assert.deepEqual(problems(ok('Thanks to a grant from the Acme Foundation, Treasury grew.'), [], ['Acme Foundation']), [], 'announced funder may be thanked');
assert.ok(problems(ok('Thanks to a grant from the Other Foundation.'), [], ['Acme Foundation']).some((x) => x.startsWith('funder:')), 'an unannounced funder is still blocked');
// Security: the word is allowed only under "Security and privacy"; detail words never are.
rejects('We made Compass more secure.', 'security');
const sec = (text, extra = {}) => ({ date: '2026-11-06', product: 'Security and privacy', text, ...extra });
assert.deepEqual(problems(sec('We fixed a set of security warnings on our backend database.')), [], 'general security entry passes');
assert.deepEqual(problems(sec('We tightened privacy settings on our sign-in.', { link: '/privacy' })), [], 'security entry may link the privacy policy');
assert.ok(problems(sec('Better security.', { link: 'https://compass.empowered.vote' })).some((x) => /privacy policy/.test(x)), 'and nothing else');
for (const t of ['A vulnerability is gone.', 'Patched an exploit.', 'RLS is on.', 'Rotated a secret.', 'Password resets work.', 'Tokens last longer.', 'A new API key.', 'CVE patched.', 'No breach here.', 'Fixed a leak.', 'Closed a security hole.', 'Stopped an attack.']) {
  assert.ok(problems(sec(t)).some((x) => x.startsWith('securityDetail:')), `security detail rejected even under Security and privacy: ${t}`);
  rejects(t, 'securityDetail');
}
// Words implying we invented data
for (const t of ['Some names were made up.', 'We removed invented department names.', 'No more fake totals.', 'A fabricated figure is gone.']) rejects(t, 'invented');
// Draft content
rejects('The draft gun-policy season grew.', 'unpublished');
// Internal terms
for (const t of ['We rewrote the reasoning texts.', 'Rung 3 moved.', 'Stage 5 finished.', 'The source store grew.', 'A new gate.', 'Seeding Boise.', 'A big backfill.', 'We merged 40 commits.']) rejects(t, 'jargon');

// Length: one sentence, two at most
assert.ok(problems(ok('One. Two. Three.')).some((x) => /3 sentences/.test(x)));
assert.deepEqual(problems(ok('The U.S. House votes load. That is all.')), [], 'abbreviations are not sentence ends');
assert.ok(problems(ok(Array(60).fill('word').join(' ') + '.')).some((x) => /60 words/.test(x)));
assert.ok(problems(ok('Nice work 🎉.')).includes('emoji'));

// Listed products only
assert.ok(problems({ ...ok('A new home for local talk.'), product: 'Civic Spaces' }).some((x) => /not linked from the home page/.test(x)), 'unlisted product rejected');
assert.ok(problems({ ...ok('Better arguments.'), product: 'Focused Communities' }).some((x) => /not linked/.test(x)));
assert.deepEqual(problems({ ...ok('Not launched yet: progress on Civic Spaces.'), product: 'Not launched yet', link: '/maps/purpose-map.html' }), []);
assert.ok(problems({ ...ok('Not launched yet: progress on Civic Spaces.'), product: 'Not launched yet', link: 'https://civicspaces.empowered.vote' }).length, 'not-launched bullet cannot link an unlisted app');
assert.ok(problems({ ...ok('Not launched yet: progress.'), product: 'Not launched yet', link: '/maps/purpose-map.html#civic-spaces' }).length === 0, 'the whole map, any anchor, is allowed');
assert.ok(problems(ok('See it.', { link: 'https://example.com/x' })).some((x) => /does not link/.test(x)), 'links only to empowered.vote or a listed app');
assert.deepEqual(problems(ok('See it.', { link: 'https://compass.empowered.vote' })), []);
assert.ok(problems({ ...ok('More than 32,000 stances.'), product: 'By the numbers', link: '/maps/purpose-map.html' }).length, 'numbers bullet must link the briefing');

// Shape
assert.ok(problems({ ...ok('x.'), date: '2026-02-30' }).some((x) => /date/.test(x)));
assert.ok(problems({ ...ok('x.'), highlight: 'yes' }).some((x) => /highlight/.test(x)));
assert.ok(problems({ ...ok('x.'), extra: 1 }).some((x) => /unknown field/.test(x)));

// Caps: 2 per product, 6 per post, plus one numbers and one not-launched bullet
const day = [
  ok('One.'), ok('Two.'), ok('Three.'),
  { ...ok('Four.'), product: 'Essentials' }, { ...ok('Five.'), product: 'Essentials' },
  { ...ok('Six.'), product: 'Treasury Tracker' }, { ...ok('Seven.'), product: 'Treasury Tracker' },
  { ...ok('Eight.'), product: 'Read & Rank' },
  { ...ok('Nine.'), product: 'Civic Trivia Championships' },
  { ...ok('More than 32,000 stances.'), product: 'By the numbers', link: '/briefing/2026-11-06' },
  { ...ok('Again.'), product: 'By the numbers', link: '/briefing/2026-11-06' },
  { ...ok('Not launched yet: Civic Spaces.'), product: 'Not launched yet' },
  { ...ok('Not launched yet: again.'), product: 'Not launched yet' },
  sec('We fixed security warnings on our backend database.'),
  sec('We improved security again.'),
];
const { kept, dropped } = checkEntries(day, { listed });
assert.deepEqual(kept.map((e) => e.text), ['One.', 'Two.', 'Four.', 'Five.', 'Six.', 'Seven.', 'More than 32,000 stances.', 'Not launched yet: Civic Spaces.', 'We fixed security warnings on our backend database.']);
assert.deepEqual(dropped.map((d) => d.entry.text), ['Three.', 'Eight.', 'Nine.', 'Again.', 'Not launched yet: again.', 'We improved security again.']);
assert.equal(checkEntries([...day.slice(0, 2).map((e) => ({ ...e, date: '2026-11-03' })), ok('Three.')], { listed }).dropped.length, 0, 'caps are per post date');

// The CLI: drops, explains, rewrites, exits 0; a broken file exits non-zero.
const dir = mkdtempSync(join(tmpdir(), 'cl-check-'));
const f = join(dir, 'entries.json');
writeFileSync(f, JSON.stringify([ok('Clean and fine.'), ok('A security fix.')])); // security word under Compass
let r = spawnSync(process.execPath, ['changelog/check-entries.mjs', '--file', f], { encoding: 'utf8' });
assert.equal(r.status, 0, r.stderr);
assert.match(r.stdout, /DROPPED entry 1 .*\n\s+- security: security word outside "Security and privacy" "security"/);
assert.deepEqual(JSON.parse(readFileSync(f, 'utf8')).map((e) => e.text), ['Clean and fine.']);
writeFileSync(f, JSON.stringify([ok('A security fix.')]));
r = spawnSync(process.execPath, ['changelog/check-entries.mjs', '--file', f, '--dry'], { encoding: 'utf8' });
assert.equal(r.status, 0);
assert.equal(JSON.parse(readFileSync(f, 'utf8')).length, 1, '--dry changes nothing');
writeFileSync(f, '{ not json');
r = spawnSync(process.execPath, ['changelog/check-entries.mjs', '--file', f], { encoding: 'utf8' });
assert.notEqual(r.status, 0, 'broken JSON exits non-zero');
writeFileSync(f, '{"date":"2026-11-06"}');
r = spawnSync(process.execPath, ['changelog/check-entries.mjs', '--file', f], { encoding: 'utf8' });
assert.notEqual(r.status, 0, 'a non-array exits non-zero');
console.log('ok: every banned group is rejected');
