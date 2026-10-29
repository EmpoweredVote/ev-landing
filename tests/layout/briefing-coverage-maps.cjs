// The briefing's three coverage maps, and the tabs over them.
//
// WHY THIS EXISTS.  Until 2026-10-29 /briefing carried one map, and `refresh.mjs`
// filled it with a single global regex over every `.st` tile on the page.  Three
// maps now draw the same 52 boxes and differ only in what fills them, which makes
// two failures possible that nothing else here would catch:
//
//   1. A map filled from the WRONG DATASET looks perfectly fine.  Fifty-two gold
//      boxes with plausible numbers in the tooltips is exactly what a correct map
//      looks like, so the only honest check is that each map's tiles disagree with
//      the other two -- a tab that has quietly become a copy of its neighbour.
//   2. A LEGEND that has drifted from the map above it.  That has happened before,
//      with one map: the legend accounted for one tile fewer than the page showed.
//      Three legends is three times the chance, so each one is counted against the
//      tiles actually drawn in its own pane rather than against a number typed in.
//
// It also holds the two things the tabs must not cost us: every pane still renders
// with JavaScript off (the maps are the data, the tabs are only a convenience), and
// nothing spills out of its container on a 320px phone, where the three labels do
// not fit on one row and an earlier draft stacked 132px of chrome above the map.
const { chromium, webkit, devices } = require('playwright');
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const PAGE = pathToFileURL(path.resolve(__dirname, '../../briefing/index.html')).href;
const KINDS = ['stances', 'treasury', 'seeded'];
const TILES = 52;

// Narrow phones first: 320px is where the tab strip has to give way, and the iPhone
// SE is the WebKit case -- nothing in this repo was tested on iOS Safari until the
// briefing tables were.
const SMALL = [
  ['320px', chromium, { viewport: { width: 320, height: 900 } }],
  ['iPhone SE', webkit, devices['iPhone SE']],
];

(async () => {
  const failures = [];
  const br = await chromium.launch();

  // ---- the three maps themselves -------------------------------------------
  {
    const page = await (await br.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
    await page.goto(PAGE, { waitUntil: 'load' });

    const maps = await page.$$eval('.usmap', (els) => els.map((e) => ({
      kind: e.dataset.map,
      titles: [...e.querySelectorAll('.st')].map((t) => t.title),
      tiers: [...e.querySelectorAll('.st')].map((t) => [...t.classList].find((c) => /^t\d$/.test(c))),
      abbrs: [...e.querySelectorAll('.st')].map((t) => t.textContent.trim()),
      coords: [...e.querySelectorAll('.st')].map((t) => t.getAttribute('style')),
    })));

    assert.deepStrictEqual(maps.map((m) => m.kind), KINDS, 'the page must carry exactly these three maps, in this order');

    for (const m of maps) {
      if (m.titles.length !== TILES) failures.push(`${m.kind}: ${m.titles.length} tiles, not ${TILES}`);
      if (m.titles.some((t) => !t)) failures.push(`${m.kind}: a tile has no tooltip, so its number cannot be read`);
    }

    // The boxes are the constant.  Same jurisdictions, same grid cells, every map --
    // that is the whole promise of putting the three behind tabs rather than side by side.
    for (const m of maps.slice(1)) {
      if (String(m.abbrs) !== String(maps[0].abbrs)) failures.push(`${m.kind}: different jurisdictions from the stance map`);
      if (String(m.coords) !== String(maps[0].coords)) failures.push(`${m.kind}: tiles sit in different grid cells from the stance map`);
    }

    // ...and the fill is the variable.  Two maps with identical shading are the
    // signature of one of them being written from the other's numbers.
    for (let i = 0; i < maps.length; i++) {
      for (let j = i + 1; j < maps.length; j++) {
        if (String(maps[i].tiers) === String(maps[j].tiers)) {
          failures.push(`${maps[i].kind} and ${maps[j].kind} are shaded identically, tile for tile — one is reading the other's dataset`);
        }
        if (String(maps[i].titles) === String(maps[j].titles)) {
          failures.push(`${maps[i].kind} and ${maps[j].kind} have identical tooltips`);
        }
      }
    }

    // Each legend against the tiles drawn in its OWN pane, in tier order.
    const panes = await page.$$eval('.mappane', (ps) => ps.map((p) => ({
      kind: p.querySelector('.usmap').dataset.map,
      legend: [...p.querySelectorAll('.legend [data-auto]')].map((s) => Number(s.textContent.trim())),
      drawn: ['t3', 't2', 't1', 't0'].map((t) => p.querySelectorAll('.usmap .' + t).length),
    })));
    assert.strictEqual(panes.length, 3, 'one pane per map');
    for (const p of panes) {
      if (p.legend.length !== 4) failures.push(`${p.kind}: legend has ${p.legend.length} tiers, not 4`);
      else if (String(p.legend) !== String(p.drawn)) {
        failures.push(`${p.kind}: legend says [${p.legend}] where the map draws [${p.drawn}]`);
      }
      const sum = p.drawn.reduce((a, b) => a + b, 0);
      if (sum !== TILES) failures.push(`${p.kind}: tiers cover ${sum} tiles, not ${TILES}`);
    }

    // ---- the tabs ------------------------------------------------------------
    const state = () => page.evaluate(() => ({
      selected: [...document.querySelectorAll('.maptabs [role="tab"]')].map((t) => t.getAttribute('aria-selected')),
      order: [...document.querySelectorAll('.maptabs [role="tab"]')].map((t) => t.tabIndex),
      shown: [...document.querySelectorAll('.mappane')].map((p) => getComputedStyle(p).display !== 'none'),
      focused: document.activeElement.id,
    }));

    let s = await state();
    if (String(s.shown) !== String([true, false, false])) failures.push(`on load the panes are ${s.shown}, not the first alone`);
    if (String(s.selected) !== String(['true', 'false', 'false'])) failures.push(`on load aria-selected is ${s.selected}`);
    // Only the selected tab in the tab order, per the ARIA tabs pattern: Tab out of
    // the strip should land in the panel, not walk three buttons.
    if (String(s.order) !== String([0, -1, -1])) failures.push(`tabIndex is ${s.order}, not [0,-1,-1]`);

    for (let i = 0; i < KINDS.length; i++) {
      await page.click('#mtab-' + KINDS[i]);
      s = await state();
      const want = KINDS.map((_, j) => j === i);
      if (String(s.shown) !== String(want)) failures.push(`clicking ${KINDS[i]} shows ${s.shown}, not ${want}`);
    }

    await page.focus('#mtab-seeded');
    await page.keyboard.press('ArrowRight');           // wraps off the end
    s = await state();
    if (String(s.shown) !== String([true, false, false])) failures.push('ArrowRight off the last tab must wrap to the first');
    if (s.focused !== 'mtab-stances') failures.push(`ArrowRight left focus on ${s.focused}`);
    await page.keyboard.press('End');
    if (String((await state()).shown) !== String([false, false, true])) failures.push('End must select the last tab');
    await page.keyboard.press('Home');
    if (String((await state()).shown) !== String([true, false, false])) failures.push('Home must select the first tab');
  }

  // ---- script off: the maps are the data, the tabs are a convenience --------
  {
    const ctx = await br.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 1000 } });
    const page = await ctx.newPage();
    await page.goto(PAGE, { waitUntil: 'load' });
    const off = await page.evaluate(() => ({
      shown: [...document.querySelectorAll('.mappane')].map((p) => getComputedStyle(p).display !== 'none'),
      // Each pane carries its own heading so the stacked rendering reads as three
      // maps rather than one very long one.  The script hides those, not the stylesheet.
      headed: [...document.querySelectorAll('.mapttl')].every((h) => getComputedStyle(h).display !== 'none' && h.textContent.trim()),
    }));
    if (off.shown.some((v) => !v)) failures.push(`with JavaScript off the panes are ${off.shown}; all three must render`);
    if (!off.headed) failures.push('with JavaScript off each pane must keep its own visible heading');
    await ctx.close();
  }
  await br.close();

  // ---- phones: every pane open, nothing past its container -----------------
  for (const [name, engine, opts] of SMALL) {
    const b = await engine.launch();
    const ctx = await b.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(PAGE, { waitUntil: 'load' });
    const bad = await page.evaluate(() => {
      // Open every pane first: a hidden pane takes its overflow out of the page with it.
      document.querySelectorAll('.mappane').forEach((p) => { p.hidden = false; });
      const out = [];
      document.querySelectorAll('.usmap, .maptabs').forEach((el) => {
        const box = el.getBoundingClientRect(), par = el.parentElement.getBoundingClientRect();
        // 1px of slack: a real miss here is tens of pixels, and sub-pixel layout
        // rounding on a 320px grid of 11 columns is not a defect.
        if (box.right > par.right + 1 || box.left < par.left - 1) {
          out.push(`${el.className}${el.dataset.map ? ' ' + el.dataset.map : ''} by ${Math.round(Math.max(box.right - par.right, par.left - box.left))}px`);
        }
      });
      // The strip must stay a strip.  Three stacked 44px rows fit the container and
      // overflow nothing, and they still put 132px of chrome above the first tile.
      const tabs = document.querySelector('.maptabs').getBoundingClientRect().height;
      return { out, tabs: Math.round(tabs) };
    });
    for (const o of bad.out) failures.push(`${name}: ${o} spills out of its container`);
    if (bad.tabs > 60) failures.push(`${name}: the tab strip is ${bad.tabs}px tall — it has wrapped into stacked rows`);
    await b.close();
  }

  if (failures.length) {
    console.error('briefing coverage maps:\n  ' + failures.join('\n  '));
  }
  assert.deepStrictEqual(failures, [], 'the three coverage maps must stay three distinct, legible maps');
  console.log(`OK 3 maps x ${TILES} tiles, legends reconcile, tabs + keyboard, script-off fallback, ${SMALL.length} phones`);
})();
