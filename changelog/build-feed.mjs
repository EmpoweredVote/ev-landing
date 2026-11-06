#!/usr/bin/env node
// Builds changelog/feed.xml (RSS 2.0) from changelog/entries.json.
//
//   node changelog/build-feed.mjs
//
// Run it after every edit to entries.json.  The output depends only on entries.json
// (no clock), so running it twice gives the same file and a test can check that the
// committed feed matches the data.  One <item> per entry; the newsletter picks the
// ones carrying the "highlight" category.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { escapeHtml, longDate } from './render.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SITE = 'https://empowered.vote';
const PAGE = `${SITE}/changelog`;
const MAX_ITEMS = 100;

const xml = (s) => escapeHtml(s).replace(/&#39;/g, '&apos;');

function rfc822(date) {
  // Posts go out in the morning, US time; noon UTC keeps every reader on the right day.
  return new Date(date + 'T12:00:00Z').toUTCString().replace('GMT', '+0000');
}

export function itemId(e) {
  return createHash('sha1').update(`${e.date}\n${e.product}\n${e.text}`).digest('hex').slice(0, 12);
}

function absolute(link) {
  return link.startsWith('/') ? SITE + link : link;
}

export function buildFeed(entries) {
  const items = entries.slice(0, MAX_ITEMS).map((e) => {
    const desc = e.link ? `${e.text} ${absolute(e.link)}` : e.text;
    return [
      '    <item>',
      `      <title>${xml(`${e.product}: ${e.text}`)}</title>`,
      `      <link>${PAGE}#${e.date}</link>`,
      `      <guid isPermaLink="false">empowered-vote-changelog-${e.date}-${itemId(e)}</guid>`,
      `      <pubDate>${rfc822(e.date)}</pubDate>`,
      `      <category>${xml(e.product)}</category>`,
      e.highlight ? '      <category>highlight</category>' : null,
      `      <description>${xml(desc)}</description>`,
      '    </item>',
    ].filter(Boolean).join('\n');
  });
  const newest = entries[0] ? `\n    <lastBuildDate>${rfc822(entries[0].date)}</lastBuildDate>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Empowered Vote changelog</title>
    <link>${PAGE}</link>
    <atom:link href="${PAGE}/feed.xml" rel="self" type="application/rss+xml" />
    <description>What changed on Empowered Vote, every Tuesday and Friday.</description>
    <language>en-us</language>${newest}
${items.join('\n')}${items.length ? '\n' : ''}  </channel>
</rss>
`;
}

export function describeNewest(entries) {
  return entries[0] ? `newest post ${longDate(entries[0].date)}` : 'no entries yet';
}

function main() {
  const entries = JSON.parse(readFileSync(join(here, 'entries.json'), 'utf8'));
  writeFileSync(join(here, 'feed.xml'), buildFeed(entries));
  console.log(`Wrote changelog/feed.xml: ${Math.min(entries.length, MAX_ITEMS)} items, ${describeNewest(entries)}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
