// Prints every live figure this episode draws, so the data block in art.js can
// be checked against the product rather than trusted.
//
// Nothing here is written into art.js automatically. A figure that changes
// because the site changed is a decision — the narration may no longer be true
// of it — and a script that silently rewrites the episode's facts would hide
// that. Run this, read it, and edit art.js by hand.
//
//   node capture-data.mjs [--entity <slug>] [--years 2021,2022,2023,2024]
//
// TWO sources are read for each page and joined, because neither is complete
// on its own:
//
//   the BAR      gives order and colour, and drops any segment too narrow to
//                measure — Los Angeles's tenth is 0.3% of the budget and four
//                pixels wide
//   the CARDS    give every segment, its friendly label, the government's OWN
//                wording underneath it, the amount and the share
//
// The first capture of this episode read only the bar and came back with nine
// segments. There are ten.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = 'https://treasurytracker.empowered.vote/';
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };

const DARK = () => {
  try { localStorage.setItem('ev:color-scheme', 'dark'); } catch (e) { /* private mode */ }
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
await page.addInitScript(DARK);

async function read(entity, year, dataset) {
  await page.goto(BASE + '?entity=' + entity + '&year=' + year + '&dataset=' + dataset,
    { waitUntil: 'networkidle' });
  await page.waitForTimeout(4500);
  return page.evaluate(() => {
    // The bar: every box exactly 64px tall is a segment of the CURRENT row.
    // Ancestor rows are 32px and are not wanted here.
    const bar = [];
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (Math.round(r.height) !== 64 || r.width < 1) continue;
      const title = (el.getAttribute('title') || '').split('\n');
      bar.push({
        gov: title[0] || '',
        px: Math.round(r.width),
        colour: getComputedStyle(el).backgroundColor
      });
    }
    // The cards under the bar. Each is a link-ish block whose text runs
    // label / gov wording / amount · share / description.
    const cards = [];
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length === 0) continue;
      const txt = (el.innerText || '').trim();
      const m = /^([^\n]+)\n([^\n]+)\n(\$[\d.,]+[BMK]?)\n?\s*•?\s*([\d.]+)%/.exec(txt);
      if (!m) continue;
      if (cards.some(c => c.label === m[1])) continue;
      cards.push({ label: m[1], gov: m[2], amount: m[3], share: +m[4] });
    }
    const body = document.body.innerText;
    return {
      bar, cards,
      total: (body.match(/spent \$[\d.]+ (billion|million|trillion)/) || ['-'])[0],
      perPerson: (body.match(/\$[\d,]+ per person/) || ['-'])[0],
      cardRow: (body.match(/Money In\n\$[\d.,]+[BMK]?|Money Out\n\$[\d.,]+[BMK]?|Employees\n\$[\d.,]+[BMK]?/g) || []),
      // The source line wraps: the name, then "· as of <date>" on its own
      // line. Matching within one line finds nothing and says so silently.
      source: ((body.match(/([^\n]+)\n· as of (\d{4}-\d{2}-\d{2})/) || [])
        .slice(1, 3).join(' · as of ')) || '-',
      whichSet: (body.match(/FY\d{4}[–-]\d{2,4}/g) || []),
      latest: (body.match(/Latest available[^\n]*/) || ['-'])[0],
      note: (body.match(/Top-level descriptions from[^\n]*/) || ['-'])[0]
    };
  });
}

const ENTITY = flag('entity', null);
const TARGETS = ENTITY
  ? flag('years', '2024').split(',').map(y => [ENTITY, +y])
  : [['los-angeles-ca', 2021], ['los-angeles-ca', 2022], ['los-angeles-ca', 2023],
     ['los-angeles-ca', 2024], ['los-angeles-county-ca', 2024],
     ['california-ca', 2024], ['united-states-us', 2024]];

for (const [entity, year] of TARGETS) {
  const r = await read(entity, year, 'operating');
  console.log('\n### ' + entity + '  FY' + year);
  console.log('   total: ' + r.total + '   per person: ' + r.perPerson);
  console.log('   cards: ' + JSON.stringify(r.cardRow));
  console.log('   source: ' + r.source);
  console.log('   which set: ' + JSON.stringify(r.whichSet) + '   ' + r.latest);
  console.log('   note: ' + r.note);
  console.log('   segments (' + r.cards.length + ' from cards, ' + r.bar.length + ' drawn in the bar):');
  for (const c of r.cards) {
    const hit = r.bar.find(b => b.gov === c.gov);
    console.log('     ' + c.label.padEnd(32) + c.amount.padEnd(9) +
      String(c.share).padStart(5) + '%  ' +
      (hit ? hit.colour.padEnd(20) + String(hit.px).padStart(5) + 'px' : '(too narrow to measure)') +
      '   gov: ' + c.gov);
  }
}
await browser.close();
