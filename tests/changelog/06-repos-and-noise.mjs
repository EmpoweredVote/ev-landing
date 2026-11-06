// REPOS.md parses, maps every repo to a product, and the noise filter drops what
// decision 0036 says to skip.  Also: the home page footer and sitemap carry /changelog.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseRepos, noiseReason, dropRevertPairs } from '../../changelog/read-commits.mjs';

const repos = parseRepos(readFileSync('changelog/REPOS.md', 'utf8'));
const names = repos.map((r) => r.repo);
for (const want of ['ev-accounts', 'CompassV2', 'essentials', 'treasury-tracker', 'civic-spaces', 'Civic-Trivia-Championships',
  'fallacy-finders', 'empowered-validation-quests', 'focused-communities', 'on-the-record', 'Empowered-Listening', 'empowered-badges', 'ev-ui', 'ev-landing']) {
  assert.ok(names.includes(`EmpoweredVote/${want}`), `REPOS.md lists ${want}`);
}
for (const never of ['ev-cto', 'ev-marketer', 'ev-analytics']) assert.ok(!names.some((n) => n.endsWith('/' + never)), `REPOS.md leaves out ${never}`);
assert.equal(new Set(names).size, names.length, 'no repo twice');
assert.ok(repos.every((r) => r.product), 'every repo has a product');

const n = (subject, author = 'someone') => noiseReason({ subject, author });
for (const s of ['chore: tidy', 'ci: cache', 'test: more', 'docs(briefing): x', 'chore(deps): Bump x from 1 to 2', 'Merge pull request #1 from a/b', 'merge: main into the redesign', 'Bump vite from 5 to 6']) assert.ok(n(s), `noise: ${s}`);
assert.ok(n('feat: anything', 'dependabot[bot]'), 'bot author');
for (const s of ['feat(compass): a thing', 'fix(mckinney): source real department names', 'data(essentials): merge duplicates', 'perf: faster']) assert.equal(n(s), null, `kept: ${s}`);

const commits = [{ subject: 'feat: a' }, { subject: 'Revert "feat: a"' }, { subject: 'feat: b' }, { subject: 'Revert "feat: old"' }];
assert.deepEqual(dropRevertPairs(commits).map((c) => c.subject), ['feat: b', 'Revert "feat: old"'], 'a change and its revert in one window cancel');

const home = readFileSync('index.html', 'utf8');
const footer = home.slice(home.lastIndexOf('<footer'));
assert.ok(footer.includes('<a href="/changelog">Changelog</a>'), 'home page footer links the changelog');
assert.ok(readFileSync('sitemap.xml', 'utf8').includes('<loc>https://empowered.vote/changelog</loc>'), 'sitemap lists /changelog');
console.log('ok: repos and noise');
