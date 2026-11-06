// The page renders with zero entries and with many: grouped by week (Monday start),
// newest first, posts inside each week newest first, text escaped.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderEntries, groupByWeek, weekStart, dayHeading } from '../../changelog/render.mjs';

assert.match(renderEntries([]), /cl-empty/, 'zero entries shows the empty note');
assert.doesNotMatch(renderEntries([]), /cl-week/);

assert.equal(weekStart('2026-11-06'), '2026-11-02', 'Friday belongs to the week starting Monday');
assert.equal(weekStart('2026-11-02'), '2026-11-02', 'Monday starts its own week');
assert.equal(weekStart('2026-11-08'), '2026-11-02', 'Sunday ends the week');
assert.equal(dayHeading('2026-11-03'), 'Tuesday, November 3');

const fixture = JSON.parse(readFileSync('tests/changelog/fixture-many.json', 'utf8'));
const weeks = groupByWeek(fixture);
assert.deepEqual(weeks.map((w) => w.week), ['2026-11-09', '2026-11-02', '2026-10-26']);
assert.deepEqual(weeks[0].posts.map((p) => p.date), ['2026-11-13', '2026-11-10']);
assert.equal(weeks[0].posts[0].entries[0].product, 'Compass', 'same-day order is kept as written');

// Order must not depend on file order.
const shuffled = [...fixture].reverse();
assert.deepEqual(groupByWeek(shuffled).map((w) => w.posts.map((p) => p.date)), weeks.map((w) => w.posts.map((p) => p.date)));

const html = renderEntries(fixture);
assert.equal((html.match(/<li class="cl-item">/g) || []).length, fixture.length, 'every entry renders');
assert.equal((html.match(/<section class="cl-week"/g) || []).length, 3);
assert.ok(html.indexOf('Week of November 9, 2026') < html.indexOf('Week of November 2, 2026'), 'newest week first');
assert.ok(html.includes('&lt;b&gt;works&lt;/b&gt; on small phones &amp; tablets'), 'text is escaped');
assert.ok(html.includes('id="2026-11-13"'), 'each post has a date anchor the feed links to');
assert.ok(html.includes('Read the briefing'), 'numbers bullet links the briefing');

// The page wires that renderer to entries.json, and follows the site's rules.
const page = readFileSync('changelog/index.html', 'utf8');
assert.ok(page.includes("from '/changelog/render.mjs'"), 'page uses the shared renderer');
assert.ok(page.includes("fetch('/changelog/entries.json'"), 'page reads entries.json');
assert.ok(page.includes('<script src="/analytics.js"></script>'), 'subdirectory page uses the absolute analytics include');
assert.ok(page.includes('<link rel="canonical" href="https://empowered.vote/changelog" />'));
assert.ok(page.includes('href="/changelog/feed.xml"'), 'page links the feed');
console.log('ok: renders with 0 and with many entries');
