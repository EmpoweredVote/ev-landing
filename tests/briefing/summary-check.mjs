// briefing/summary-check.mjs: the "What changed since <day>" list passes when it
// follows the rules, and fails on each kind of line it must never publish.
// Plain node, no browser.  Carries over the cases from the retired changelog check.
import assert from 'node:assert/strict';
import { checkSummary, listedProducts, parseSummary } from '../../briefing/summary-check.mjs';

const listed = listedProducts(
  '<a class="logo-trigger" data-tool="essentials" data-name="Essentials"\n href="https://essentials.empowered.vote">'
  + '<a class="logo-trigger" data-name="Compass" href="https://compass.empowered.vote">'
  + '<a class="logo-trigger" data-name="Treasury Tracker" href="https://treasurytracker.empowered.vote">'
  + '<a class="logo-trigger" data-name="Civic Trivia Championships" href="https://ctc.empowered.vote">'
  + '<a class="other" data-name="Nope">');
assert.deepEqual(listed.map((p) => p.name), ['Essentials', 'Compass', 'Treasury Tracker', 'Civic Trivia Championships']);

const slug = (t) => t.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const more = (href, label = 'Take a look') => ` <a class="since-more" href="${href}">${label}<span aria-hidden="true"> &rarr;</span></a>`;
const row = (tag, lines, link) => `<li><span class="tag tag--${slug(tag)}">${tag}</span><ul>`
  + lines.map((l, i) => `<li>${l}${i === lines.length - 1 && link ? more(link) : ''}</li>`).join('') + '</ul></li>';
const page = (...rows) => `<h3>What changed since Tuesday</h3>\n<ul class="since">${rows.join('')}</ul>\n<p>after</p>`;
const ctx = { listed, blockedNames: ['Acme Trust'], announcedFunders: ['Example Fund'] };
const check = (html, c = ctx) => checkSummary(html, c);

const good = page(
  row('Essentials', ['You can now look up Santa Cruz and Marin County.', 'When a new officeholder&rsquo;s term begins, your lookup shows them that day.'], 'https://essentials.empowered.vote'),
  row('Treasury Tracker', ['Reno and Washoe County are now on Treasury Tracker.'], 'https://treasurytracker.empowered.vote'),
  row('Civic Trivia', ['35 new questions, mostly on world news.'], 'https://ctc.empowered.vote'),
  row('Security and privacy', ['We fixed a set of security warnings on our backend database.'], '/privacy'),
  row('Not launched yet', ['We also made progress on Read &amp; Rank and the next season of Compass.'], '/maps/purpose-map.html'),
);
assert.deepEqual(check(good), []);
assert.equal(parseSummary(good).length, 5);
assert.equal(parseSummary(good)[0].lines[1].text, "When a new officeholder's term begins, your lookup shows them that day.");

const fails = (html, re, why) => {
  const p = check(html);
  assert.ok(p.some((x) => re.test(x)), `${why}: expected ${re}, got ${JSON.stringify(p)}`);
};
const one = (text, tag = 'Essentials', link) => page(row(tag, [text], link));

// Words that must never be published.
for (const t of ['Democrats asked for this.', 'Republican officials now show up.', 'GOP primary results are in.', 'The Green Party now has a page.']) fails(one(t), /party:/, t);
for (const t of ['Red states now load faster.', 'The map is less blue now.']) fails(one(t), /colour:/, t);
for (const t of ['Thanks to a grant, budgets load faster.', 'Funded by our friends.', 'A foundation helped.', 'Our sponsors asked for this.']) fails(one(t), /funder:/, t);
fails(one('This work was paid for by Acme Trust.'), /blocked name/, 'blocked name');
assert.deepEqual(check(one('Thanks to an Example Fund grant, Plano is on Treasury Tracker.', 'Treasury Tracker')), [], 'announced funder may be thanked');
fails(one('We made sign-in more secure.'), /security word outside/, 'security word in a product row');
for (const t of ['We fixed a vulnerability in sign-in.', 'Tokens are now rotated.', 'Nothing was exposed.', 'We closed a security hole.']) fails(one(t, 'Security and privacy', '/privacy'), /security detail/, t);
for (const t of ['We removed department names we had made up.', 'Some figures were fabricated.']) fails(one(t), /invented-data/, t);
for (const t of ['The draft season grew.', 'Season 3 now has 2,994 positions.']) fails(one(t), /unpublished:/, t);
for (const t of ['A new loader imports Reno.', 'We merged 12 pull requests.', 'The pipeline was refactored.', 'A readable position count rose.']) fails(one(t), /jargon:/, t);
fails(one('Big news today!'), /exclamation/, 'exclamation');
fails(one('New cities 🎉.'), /emoji/, 'emoji');
fails(one('One.  Two.  Three.'), /3 sentences/, 'three sentences');
fails(one(Array(52).fill('word').join(' ') + '.'), /words; at most/, 'long line');

// Shape and order.
fails(page(row('Not launched yet', ['We also made progress on Compass.'], '/maps/purpose-map.html'), row('Essentials', ['New cities.'])), /must be the last row/, 'not-launched last');
fails(one('We added 670 positions to the next season of Compass.', 'Not launched yet'), /no counts/, 'not-launched counts');
fails(page(row('Essentials', ['A.']), row('Essentials', ['B.'])), /two rows/, 'duplicate product');
fails(one('Election winners are in.', 'Election results'), /isn't a product the home page links/, 'unlisted tag');
fails(one('Numbers moved.', 'By the numbers'), /isn't a product/, 'no numbers row');
fails(page(row('Essentials', ['A.', 'B.', 'C.', 'D.'])), /4 updates/, 'too many lines');
fails(page(...['Essentials', 'Compass', 'Treasury Tracker', 'Civic Trivia', 'Platform-wide', 'Security and privacy', 'Not launched yet'].map((t) => row(t, ['A line.']))), /7 rows/, 'too many rows');
fails(page('<li><span class="tag">Essentials</span><ul><li>A.</li></ul></li>'), /tag--essentials/, 'tag class');

// Links.
fails(one('New cities.', 'Essentials', 'https://example.com'), /goes outside/, 'outside link');
fails(one('New cities.', 'Essentials', '/changelog'), /retired changelog/, 'changelog link');
fails(one('Progress on Compass.', 'Not launched yet', 'https://compass.empowered.vote'), /links only \/maps/, 'not-launched link');
fails(page(`<li><span class="tag tag--essentials">Essentials</span><ul><li>A.${more('https://essentials.empowered.vote')}</li><li>B.${more('https://essentials.empowered.vote')}</li></ul></li>`), /2 links/, 'two links');

// No list at all.
fails('<p>no list</p>', /No "What changed/, 'missing list');

console.log('summary-check: all cases passed');
