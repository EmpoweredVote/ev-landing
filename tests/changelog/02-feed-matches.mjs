// changelog/feed.xml is exactly what build-feed.mjs makes from entries.json, so the
// feed never says something the page does not.  Also checks the feed builder itself.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildFeed } from '../../changelog/build-feed.mjs';

const entries = JSON.parse(readFileSync('changelog/entries.json', 'utf8'));
assert.equal(readFileSync('changelog/feed.xml', 'utf8'), buildFeed(entries),
  'feed.xml is stale: run `node changelog/build-feed.mjs`');

const fixture = JSON.parse(readFileSync('tests/changelog/fixture-many.json', 'utf8'));
const xml = buildFeed(fixture);
assert.equal(xml, buildFeed(fixture), 'same input, same feed (no clock in the output)');
assert.equal((xml.match(/<item>/g) || []).length, fixture.length, 'one item per entry');
assert.equal((xml.match(/<category>highlight<\/category>/g) || []).length, fixture.filter((e) => e.highlight).length);
assert.ok(xml.includes('&lt;b&gt;works&lt;/b&gt;') && !xml.includes('<b>works'), 'entry text is escaped');
assert.ok(xml.includes('https://empowered.vote/briefing/2026-11-13'), 'site-relative links become absolute');
assert.ok(xml.includes('<lastBuildDate>Fri, 13 Nov 2026 12:00:00 +0000</lastBuildDate>'));
const guids = xml.match(/<guid[^>]*>[^<]+/g);
assert.equal(new Set(guids).size, guids.length, 'guids are unique');
assert.ok(!buildFeed([]).includes('<item>') && !buildFeed([]).includes('lastBuildDate'), 'empty feed is valid and empty');
console.log('ok: feed matches entries.json');
