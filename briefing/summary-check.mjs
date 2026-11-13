// Checks the "What changed since <day>" list at the top of a briefing edition.
//
//   node briefing/summary-check.mjs                       # the current edition
//   node briefing/summary-check.mjs briefing/2026-11-17/index.html
//
// This list replaced the public changelog on 2026-11-13 (ev-cto decision 0039), and
// this script replaces the changelog's word check (changelog/rules.mjs, decision 0036).
// The rules are in briefing/README.md, "What changed since <day>".
//
// Unlike voice-check.mjs, a failure here BLOCKS publishing.  Every rule is about what
// must never appear in public: a party name, red or blue, a funder, a security
// weakness, data we "made up", an internal word.  Fix or remove the line and run it
// again.  Never reword a line only to get past the check: if the subject itself is the
// problem (a security detail, draft work, an unannounced funder), remove the line.
//
// Pure rules in checkSummary(); the file reading is at the bottom, so the tests can
// call checkSummary() on a string.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

export const SPECIAL = {
  PLATFORM: 'Platform-wide',
  NOT_LAUNCHED: 'Not launched yet',
  SECURITY: 'Security and privacy',
};
export const MAX_ROWS = 6;         // product rows, Not launched yet included
export const MAX_LINES_PER_ROW = 3;
export const MAX_SENTENCES = 2;
export const MAX_WORDS = 50;
export const MIND_MAP_PATH = '/maps/purpose-map.html';

// Each group: [label, regex].  A hit on a line is a problem.
// The repo is public, so there is no list of funder names here.  The words a funder
// credit needs are blocked instead, unless the line names an organisation in
// briefing/announced-funders.txt.  briefing/blocked-names.txt adds names to refuse.
export const BANNED = {
  party: [
    ['party name', /\bdemocrat\w*|\brepublican\w*|\bGOP\b|\blibertarian\w*|\bgreen party\b|\bworking families\b|\bconstitution party\b|\bDNC\b|\bRNC\b|\bMAGA\b/i],
    ['left/right label', /\b(left|right)[- ]wing\b/i],
  ],
  colour: [
    ['red or blue', /\b(red|blue|reds|blues|purple state|purple states)\b/i],
  ],
  funder: [
    ['grant', /\bgrant(s|ee|ees|or|ors|maker|makers)?\b/i],
    ['funder', /\bfunders?\b|\bfunded by\b|\bsponsor(s|ed|ship)?\b|\bphilanthrop\w*|\bdonors?\b/i],
    ['foundation', /\bfoundations?\b/i],
  ],
  security: [
    ['security word outside "Security and privacy"', /\bsecur(e|ity|ed|ing)\b/i],
  ],
  securityDetail: [
    ['security detail', /\bvulnerab\w*|\bexploit\w*|\bRLS\b|\bsecrets?\b|\bpasswords?\b|\btokens?\b|\bkeys?\b|\bCVE\b|\bbreach\w*|\bleak\w*|\bXSS\b|\bCSRF\b|\binjection\b|\battack\w*|\bhack\w*|\bholes?\b|\bexposed\b|\bunauthori[sz]ed\b/i],
  ],
  invented: [
    ['invented-data word', /\bmade[- ]up\b|\binvent(ed|ing)\b|\bfake[ds]?\b|\bfabricat\w*|\bhallucinat\w*/i],
  ],
  unpublished: [
    ['draft content', /\bdrafts?\b|\bseason \d\b/i],
  ],
  jargon: [
    ['internal term', /\breasoning texts?\b|\brungs?\b|\bstages?\b|\bsource store\b|\bgates?\b|\bseed(ing|ed)\b|\bbackfill\w*|\brefactor\w*|\bmigrations?\b|\bendpoints?\b|\bschemas?\b|\brepos?\b|\brepositor(y|ies)\b|\bcommits?\b|\bPRs?\b|\bpull requests?\b|\bpipelines?\b|\bcron\b|\bdeploy(s|ed|ing|ment)?\b|\bloaders?\b|\bstance rows?\b|\breadable\b|\bstrat(um|a)\b|\bcodebook\b|\bprovenance\b/i],
  ],
};

const EMOJI = /\p{Extended_Pictographic}/u;

export function decode(s) {
  return s.replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&rarr;/g, '→')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

// Products a voter can reach: every a.logo-trigger on the home page.
export function listedProducts(indexHtml) {
  const out = [];
  for (const tag of indexHtml.match(/<a\b[^>]*class="[^"]*\blogo-trigger\b[^"]*"[^>]*>/g) || []) {
    const name = /data-name="([^"]+)"/.exec(tag);
    const href = /href="([^"]+)"/.exec(tag);
    if (name) out.push({ name: decode(name[1]), href: href ? href[1] : null });
  }
  return out;
}

export function slug(name) {
  return String(name).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function countSentences(text) {
  const t = text.replace(/\b[A-Z]\.(?=[A-Z]\.|\s)/g, 'X').replace(/\d\.\d/g, '0');
  return Math.max(1, (t.match(/[.!?]+(?=\s|$)/g) || []).length);
}

// Pulls the list apart: [{ tag, tagClass, lines: [{ text, links: [href] }] }].
export function parseSummary(html) {
  const start = html.search(/<ul class="since">/);
  if (start < 0) return null;
  // Walk nested <ul>/<li> to find the end of the outer list.
  const re = /<(\/?)ul\b[^>]*>/g;
  re.lastIndex = start;
  let depth = 0, end = -1, m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) { end = m.index; break; }
  }
  if (end < 0) return null;
  const inner = html.slice(start + '<ul class="since">'.length, end);
  const rows = [];
  for (const row of inner.split(/<\/ul>\s*<\/li>/).map((r) => r.trim()).filter(Boolean)) {
    const tagM = /<span class="tag(?: ([^"]*))?">([\s\S]*?)<\/span>/.exec(row);
    const lines = [];
    const body = row.slice(row.indexOf('<ul>') + 4);
    for (const li of body.split(/<li>/).slice(1)) {
      const raw = li.replace(/<\/li>[\s\S]*$/, '');
      const links = [...raw.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((x) => x[1]);
      const text = decode(raw.replace(/<a\b[\s\S]*?<\/a>/g, ''));
      lines.push({ text, links });
    }
    rows.push({ tag: tagM ? decode(tagM[2]) : null, tagClass: tagM ? (tagM[1] || '') : '', lines });
  }
  return rows;
}

// Returns a list of problems.  Empty means the list passes.
export function checkSummary(html, { listed, blockedNames = [], announcedFunders = [] }) {
  const rows = parseSummary(html);
  if (!rows) return ['No "What changed since <day>" list (<ul class="since">) found.'];
  const problems = [];
  const names = listed.map((p) => p.name);
  const hosts = new Set(['empowered.vote', 'www.empowered.vote']);
  for (const p of listed) { try { hosts.add(new URL(p.href).host); } catch { /* relative */ } }
  const isListed = (tag) => names.some((n) => n === tag || n.startsWith(tag + ' '));
  const seen = new Set();

  if (!rows.length) problems.push('The list is empty.  Leave it out only if nothing changed; otherwise write it.');
  if (rows.length > MAX_ROWS) problems.push(`${rows.length} rows; at most ${MAX_ROWS}.  Group harder.`);

  rows.forEach((row, i) => {
    const where = `row ${i + 1} (${row.tag || 'no tag'})`;
    if (!row.tag) { problems.push(`${where}: no <span class="tag"> product tag.`); return; }
    if (seen.has(row.tag)) problems.push(`${where}: "${row.tag}" has two rows.  Put all its updates in one.`);
    seen.add(row.tag);
    const special = Object.values(SPECIAL).includes(row.tag);
    if (!special && !isListed(row.tag)) {
      problems.push(`${where}: "${row.tag}" isn't a product the home page links (${names.join(', ')}), or ${Object.values(SPECIAL).join(', ')}.  Election results go under Essentials; unreleased work under Not launched yet.`);
    }
    if (!row.tagClass.split(/\s+/).includes(`tag--${slug(row.tag)}`)) problems.push(`${where}: the tag needs class "tag tag--${slug(row.tag)}".`);
    if (!row.lines.length) problems.push(`${where}: no updates.`);
    if (row.lines.length > MAX_LINES_PER_ROW) problems.push(`${where}: ${row.lines.length} updates; at most ${MAX_LINES_PER_ROW}.`);
    if (row.tag === SPECIAL.NOT_LAUNCHED) {
      if (i !== rows.length - 1) problems.push(`${where}: Not launched yet must be the last row.`);
      if (row.lines.length > 1) problems.push(`${where}: Not launched yet is one line.`);
    }
    if (row.tag === SPECIAL.SECURITY && row.lines.length > 1) problems.push(`${where}: Security and privacy is one line.`);

    const allLinks = row.lines.flatMap((l) => l.links);
    if (allLinks.length > 1) problems.push(`${where}: ${allLinks.length} links; one per row, at the end of its last update.`);
    for (const href of allLinks) {
      let u;
      try { u = new URL(href, 'https://empowered.vote'); } catch { problems.push(`${where}: bad link "${href}".`); continue; }
      if (!hosts.has(u.host)) problems.push(`${where}: link "${href}" goes outside empowered.vote and the listed products.`);
      if (/^\/changelog/.test(u.pathname) && u.host.endsWith('empowered.vote')) problems.push(`${where}: no links to the retired changelog.`);
      if (row.tag === SPECIAL.NOT_LAUNCHED && u.pathname !== MIND_MAP_PATH) problems.push(`${where}: Not launched yet links only ${MIND_MAP_PATH}.`);
      if (row.tag === SPECIAL.SECURITY && u.pathname !== '/privacy') problems.push(`${where}: Security and privacy links only /privacy.`);
    }

    row.lines.forEach((line, j) => {
      const at = `${where}, line ${j + 1}`;
      const text = line.text;
      const lower = text.toLowerCase();
      const thanks = announcedFunders.some((n) => n && lower.includes(n.toLowerCase()));
      for (const [group, pats] of Object.entries(BANNED)) {
        if (group === 'security' && row.tag === SPECIAL.SECURITY) continue;
        if (group === 'funder' && thanks) continue;
        for (const [label, rx] of pats) {
          const hit = rx.exec(text);
          if (hit) problems.push(`${at}: ${group}: ${label} "${hit[0]}"`);
        }
      }
      for (const n of blockedNames) if (n && lower.includes(n.toLowerCase())) problems.push(`${at}: blocked name "${n}"`);
      if (EMOJI.test(text)) problems.push(`${at}: emoji`);
      if (/!/.test(text)) problems.push(`${at}: exclamation mark`);
      if (row.tag === SPECIAL.NOT_LAUNCHED && /\d/.test(text)) problems.push(`${at}: Not launched yet gives no counts.`);
      const s = countSentences(text);
      if (s > MAX_SENTENCES) problems.push(`${at}: ${s} sentences; at most ${MAX_SENTENCES}.`);
      const w = text.split(/\s+/).filter(Boolean).length;
      if (w > MAX_WORDS) problems.push(`${at}: ${w} words; at most ${MAX_WORDS}.`);
    });
  });
  return problems;
}

export function readList(path) {
  try {
    return readFileSync(path, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  } catch { return []; }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const here = dirname(fileURLToPath(import.meta.url));
  const file = process.argv[2] || join(here, 'index.html');
  const html = readFileSync(file, 'utf8');
  const listed = listedProducts(readFileSync(join(here, '..', 'index.html'), 'utf8'));
  if (!listed.length) {
    console.error('summary-check: found no products on the home page (a.logo-trigger).  Fix the check before trusting it.');
    process.exit(2);
  }
  const problems = checkSummary(html, {
    listed,
    blockedNames: readList(join(here, 'blocked-names.txt')),
    announcedFunders: readList(join(here, 'announced-funders.txt')),
  });
  console.log(`${file}  —  "What changed" list, products listed: ${listed.map((p) => p.name).join(', ')}`);
  if (!problems.length) { console.log('summary-check: PASS'); process.exit(0); }
  for (const p of problems) console.log('  !!  ' + p);
  console.log(`summary-check: FAIL (${problems.length}) — fix or remove those lines and run it again.  Do not publish until it passes.`);
  process.exit(1);
}
