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
            // Anything at all reaching past the right edge -- EXCEPT the jump
            // strip's own items. That strip is a deliberate horizontal scroller,
            // so labels sitting off its right edge are the feature working.
            // Exempting a scroll container is exactly what hid the original bug,
            // so the exemption is paid for by the .jump assertions below: the
            // strip itself must fit the viewport and stay one line tall.
            stickOut: [...document.querySelectorAll('body *')]
              .filter((el) => {
                if (el.closest('.jump ul')) return false;
                const rc = el.getBoundingClientRect();
                return rc.width > 0 && rc.right > vw + 1;
              })
              .slice(0, 5)
              .map((el) => el.tagName + '.' + String(el.className || '').slice(0, 30)),
            // ---- the jump strip ---------------------------------------------
            jump: (() => {
              const n = document.querySelector('.jump');
              if (!n) return null;
              const r = n.getBoundingClientRect();
              const links = [...n.querySelectorAll('a')];
              return {
                overViewport: Math.round(r.right - vw),
                height: Math.round(r.height),
                links: links.length,
                // a link pointing at an id that is not on the page
                broken: links.filter((a) => !document.getElementById(a.getAttribute('href').slice(1)))
                             .map((a) => a.getAttribute('href')),
                // the strip must be able to reach every label
                scrollable: n.querySelector('ul').scrollWidth <= n.querySelector('ul').clientWidth ||
                            getComputedStyle(n.querySelector('ul')).overflowX === 'auto',
              };
            })(),
            // the column headings must not snap mid-word
            thLines: [...document.querySelectorAll('.tablebox:not(.features) th')].map((th) => {
              const cs = getComputedStyle(th);
              const lh = parseFloat(cs.lineHeight) || 16;
              const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
              return Math.round((th.clientHeight - pad) / lh);
            }),
            // ---- things that DEGRADE instead of overflowing -----------------
            // A grid track squashed to nothing does not overflow anything; it
            // just stops meaning something, so the viewport checks above are
            // blind to it. Both of these were found by looking, on 2026-09-23.
            //
            // The visitor bar is the whole point of "How many arrive". It was
            // 4px wide on a 320px phone, because .ecorow reserved 200px of fixed
            // track plus 30px of gaps out of a 234px row.
            barTrack: (() => {
              const t = document.querySelector('.ecorow .etrack');
              return t ? Math.round(t.getBoundingClientRect().width) : null;
            })(),
            // A map tile cannot shrink below its own two-letter label, so the
            // 11-column grid pushed past the CARD while staying inside the
            // VIEWPORT -- invisible to any viewport-based assertion.
            mapSpillPastCard: (() => {
              const m = document.querySelector('.usmap');
              if (!m) return null;
              const pr = m.parentElement.getBoundingClientRect().right;
              const tiles = [...m.querySelectorAll('.st')];
              return Math.round(Math.max(...tiles.map((t) => t.getBoundingClientRect().right)) - pr);
            })(),
            // The Road Ahead label is a fixed 110px column beside the prose. At
            // 320px that left the text ~110px: three or four words a line.
            horizonProseShare: (() => {
              const h = document.querySelector('.horizon');
              if (!h) return null;
              const prose = h.querySelector('p');
              return Math.round((prose.getBoundingClientRect().width / h.getBoundingClientRect().width) * 100);
            })(),
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
        if (r.barTrack !== null && r.barTrack < 60) {
          failures.push(`${where}: visitor bar track squashed to ${r.barTrack}px (needs >=60)`);
        }
        if (r.mapSpillPastCard !== null && r.mapSpillPastCard > 0) {
          failures.push(`${where}: map tiles spill ${r.mapSpillPastCard}px past their card`);
        }
        if (r.horizonProseShare !== null && r.horizonProseShare < 55) {
          failures.push(`${where}: Road Ahead prose gets only ${r.horizonProseShare}% of its row`);
        }
        if (r.jump) {
          if (r.jump.overViewport > 0) failures.push(`${where}: jump strip is ${r.jump.overViewport}px past the viewport`);
          // One line. Eight labels WRAP to three lines at 320px, and a ~100px
          // sticky bar would eat a third of the screen it exists to help read.
          if (r.jump.height > 60) failures.push(`${where}: jump strip is ${r.jump.height}px tall (should be one line)`);
          if (r.jump.broken.length) failures.push(`${where}: jump links point nowhere -> ${r.jump.broken.join(', ')}`);
          if (!r.jump.scrollable) failures.push(`${where}: jump strip overflows without being scrollable`);
          if (r.jump.links < 6) failures.push(`${where}: jump strip has only ${r.jump.links} links`);
        }
        if (pageErrors.length) failures.push(`${where}: page error -> ${pageErrors.join('; ')}`);

        // Follow a link and check where it actually lands. A sticky bar sitting
        // on top of the heading you just jumped to reads as the link being
        // broken, and it is one forgotten `scroll-margin-top` away at all times.
        if (r.jump) {
          const target = await p.evaluate(() => {
            const a = document.querySelector('.jump a[href="#reach"], .jump a[href="#data"]');
            if (!a) return null;
            a.click();
            return a.getAttribute('href').slice(1);
          });
          if (target) {
            await p.waitForTimeout(250);
            const landed = await p.evaluate((id) => {
              const h = document.getElementById(id).getBoundingClientRect();
              const strip = document.querySelector('.jump').getBoundingClientRect();
              const marked = document.querySelector('.jump a[aria-current="true"]');
              return { clearance: Math.round(h.top - strip.bottom),
                       marked: marked ? marked.getAttribute('href') : null };
            }, target);
            if (landed.clearance < 0) {
              failures.push(`${where}: jumping to #${target} puts the heading ${-landed.clearance}px under the sticky strip`);
            }
            if (landed.marked !== '#' + target) {
              failures.push(`${where}: after jumping to #${target} the strip marks ${landed.marked}`);
            }
          }
        }

        await ctx.close();
      }
    }
    await br.close();
  }

  if (failures.length) {
    console.error('briefing tables do not fit:\n  ' + failures.join('\n  '));
  }
  assert.deepStrictEqual(failures, [], 'briefing tables must fit their container on every device');
  console.log(`OK briefing layout holds on ${CASES.length} devices x 2 editions x 2 orientations`);
})();
