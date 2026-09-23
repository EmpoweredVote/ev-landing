// The briefing's tables, on real phones.
//
// WHY THIS EXISTS. /briefing shipped on 2026-09-22 with feature tables that
// needed 2.1 screens of sideways dragging at 390px, and the check written that
// day PASSED -- it asserted `documentElement.scrollWidth > clientWidth`, and the
// page never overflowed. `.tablebox` carries `overflow-x:auto`, so the box
// scrolled inside a page that stayed exactly as wide as the viewport. A
// page-overflow assertion cannot see a table scrolling inside a container built
// to let it scroll.
//
// So this asserts the thing that was actually wrong: every table against ITS OWN
// container, plus any element sticking out past the viewport. Both editions,
// portrait and landscape, on WebKit as well as Chromium -- iOS Safari is WebKit
// and nothing in this repo had ever been tested on it.
//
// The cases here are not decorative. Each one caught a distinct real defect:
//   iPhone SE / Galaxy S9+ (320px)  -- the coverage table's nowrap <th>, then a
//                                      minmax() floor wider than the container
//   iPhone 14/15 landscape (~660px) -- .cols split two-up into columns NARROWER
//                                      than the same phone gets in portrait
//   iPad gen 7 portrait (810px)     -- the breakpoint, where the real table fits
const { chromium, webkit, devices } = require('playwright');
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const CASES = [
  ['iPhone SE', webkit],
  ['iPhone 14', webkit],
  ['iPhone 15', webkit],
  ['Pixel 7', chromium],
  ['Galaxy S9+', chromium],
  ['iPad (gen 7)', webkit],
];

const loc = (r) => pathToFileURL(path.resolve(__dirname, '../..', r)).href;
const PAGES = [
  ['current', loc('briefing/index.html')],
  ['archived', loc('briefing/2026-09-11/index.html')],
];

(async () => {
  const failures = [];

  for (const [devName, engine] of CASES) {
    const br = await engine.launch();
    for (const [pageName, url] of PAGES) {
      for (const landscape of [false, true]) {
        const d = devices[devName];
        const viewport = landscape
          ? { width: d.viewport.height, height: d.viewport.width }
          : d.viewport;
        const ctx = await br.newContext({ ...d, viewport });
        const p = await ctx.newPage();
        const pageErrors = [];
        p.on('pageerror', (e) => pageErrors.push(e.message));
        await p.goto(url);
        await p.waitForTimeout(250);

        const r = await p.evaluate(() => {
          const de = document.documentElement;
          const vw = de.clientWidth;
          return {
            vw,
            pageOver: de.scrollWidth - de.clientWidth,
            // each table measured against the box that holds it
            tableOver: [...document.querySelectorAll('.tablebox')].map((bx) =>
              Math.round(bx.querySelector('table').scrollWidth - bx.clientWidth)
            ),
            // anything at all reaching past the right edge
            stickOut: [...document.querySelectorAll('body *')]
              .filter((el) => {
                const rc = el.getBoundingClientRect();
                return rc.width > 0 && rc.right > vw + 1;
              })
              .slice(0, 5)
              .map((el) => el.tagName + '.' + String(el.className || '').slice(0, 30)),
            // the column headings must not snap mid-word
            thLines: [...document.querySelectorAll('.tablebox:not(.features) th')].map((th) => {
              const cs = getComputedStyle(th);
              const lh = parseFloat(cs.lineHeight) || 16;
              const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
              return Math.round((th.clientHeight - pad) / lh);
            }),
          };
        });

        const where = `${devName} ${pageName} ${landscape ? 'landscape' : 'portrait'} (${r.vw}px)`;
        if (r.pageOver > 0) failures.push(`${where}: page overflows by ${r.pageOver}px`);
        r.tableOver.forEach((o, i) => {
          if (o > 0) failures.push(`${where}: table ${i} is ${o}px wider than its box`);
        });
        if (r.stickOut.length) failures.push(`${where}: past the right edge -> ${r.stickOut.join(', ')}`);
        if (r.thLines.some((n) => n > 1)) {
          failures.push(`${where}: a coverage heading wrapped mid-word (lines: ${r.thLines.join(',')})`);
        }
        if (pageErrors.length) failures.push(`${where}: page error -> ${pageErrors.join('; ')}`);

        await ctx.close();
      }
    }
    await br.close();
  }

  if (failures.length) {
    console.error('briefing tables do not fit:\n  ' + failures.join('\n  '));
  }
  assert.deepStrictEqual(failures, [], 'briefing tables must fit their container on every device');
  console.log(`OK briefing tables fit on ${CASES.length} devices x 2 editions x 2 orientations`);
})();
