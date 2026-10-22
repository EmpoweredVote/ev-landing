// The play triangle beside the Essentials and Compass tiles, and the lightbox it opens.
//
// Three things here are easy to break without noticing.
//
// 1. The triangle must not touch its own lockup. The tool lockups are not one shape —
//    Essentials is more than four times as wide as it is tall — so there is no room
//    inside the tile, and the first attempt at this sat squarely on the word
//    "empowered". The gutter on `.showcase-logos` is what buys the space, and the
//    test asserts the button ENDS before the tile STARTS rather than trusting a
//    number, because both move with the breakpoint.
//
// 2. All five tiles must keep one left edge. The gutter pads the whole column for
//    that reason; padding only the two rows that have a film would stagger the set.
//
// 3. Closing must actually release the film. `hidden` alone leaves the <video>
//    holding its source and, on a slow line, still downloading. The close path
//    removes the source and calls load(), and this checks the attribute is gone.
//
// Below 901px the tiles become full-width stacked cards with the lockup top-left, so
// the triangle moves to the empty top-right corner and the gutter is dropped. A
// tooltip needs a pointer to rest, so it is not rendered on a touch screen.
//
// Needs Playwright, which is not a repo dependency:
//   NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" \
//     node tests/layout/explainer-lightbox.cjs
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html';
const FILMS = ['essentials', 'compass'];

(async function () {
  const browser = await chromium.launch();
  const failures = [];
  const seen = [];

  function want(cond, msg) { if (!cond) failures.push(msg); }

  // ---------------------------------------------------------------- desktop
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', function (e) { errors.push(String(e)); });
    await page.addInitScript(function (t) { localStorage.setItem('ev:color-scheme', t); }, theme);
    await page.route('**/*', function (r) {
      return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
    });
    await page.goto(URL);

    const n = await page.locator('.play-btn[data-film]').count();
    want(n === 2, theme + ': expected 2 play buttons, found ' + n);

    for (const film of FILMS) {
      const g = await page.evaluate(function (f) {
        var btn = document.querySelector('.play-btn[data-film="' + f + '"]');
        var tile = btn.closest('.tool-row').querySelector('.logo-trigger');
        var b = btn.getBoundingClientRect(), t = tile.getBoundingClientRect();
        return { bRight: b.right, bLeft: b.left, tLeft: t.left, label: btn.getAttribute('aria-label') };
      }, film);
      want(g.bRight <= g.tLeft + 1,
        theme + '/' + film + ': triangle overlaps its tile (ends ' + Math.round(g.bRight) +
        ', tile starts ' + Math.round(g.tLeft) + ')');
      want(g.bLeft >= 0,
        theme + '/' + film + ': triangle is off the left of the viewport (' + Math.round(g.bLeft) + ')');
      want(g.label === 'Watch Explainer Video',
        theme + '/' + film + ': aria-label is "' + g.label + '"');
      seen.push(theme + '/' + film + ': button ' + Math.round(g.bLeft) + '-' + Math.round(g.bRight) +
        ', tile from ' + Math.round(g.tLeft));
    }

    const lefts = await page.evaluate(function () {
      return Array.prototype.map.call(document.querySelectorAll('.logo-trigger'), function (e) {
        return Math.round(e.getBoundingClientRect().left);
      });
    });
    want(new Set(lefts).size === 1, theme + ': the five tiles do not share a left edge (' + lefts.join(', ') + ')');

    // tooltip, which must also stay on screen
    await page.locator('.play-btn[data-film="essentials"]').hover();
    await page.waitForTimeout(350);
    const tip = await page.evaluate(function () {
      var t = document.querySelector('.play-btn[data-film="essentials"] .play-tip');
      return { opacity: getComputedStyle(t).opacity, left: t.getBoundingClientRect().left, text: t.textContent };
    });
    want(tip.opacity === '1', theme + ': tooltip did not appear on hover (opacity ' + tip.opacity + ')');
    want(tip.left >= 0, theme + ': tooltip is clipped by the viewport (' + Math.round(tip.left) + ')');
    want(tip.text === 'Watch Explainer Video', theme + ': tooltip reads "' + tip.text + '"');

    // open, and check it loaded the film the button names
    for (const film of FILMS) {
      await page.click('.play-btn[data-film="' + film + '"]');
      await page.waitForTimeout(250);
      const o = await page.evaluate(function () {
        var v = document.getElementById('ev-lb-video');
        return {
          hidden: document.getElementById('ev-lb').hidden,
          src: v.getAttribute('src'),
          poster: v.getAttribute('poster'),
          tracks: v.textTracks.length,
          locked: document.body.style.overflow,
          focused: document.activeElement.className
        };
      });
      want(o.hidden === false, theme + '/' + film + ': lightbox did not open');
      want(o.src === 'video/' + film + '.mp4', theme + '/' + film + ': loaded "' + o.src + '"');
      want(o.poster === 'video/' + film + '.jpg', theme + '/' + film + ': poster "' + o.poster + '"');
      want(o.tracks === 1, theme + '/' + film + ': expected 1 caption track, found ' + o.tracks);
      want(o.locked === 'hidden', theme + '/' + film + ': the page behind can still scroll');
      want(/ev-lb-close/.test(o.focused), theme + '/' + film + ': focus did not move into the dialog');

      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      const c = await page.evaluate(function () {
        var v = document.getElementById('ev-lb-video');
        return {
          hidden: document.getElementById('ev-lb').hidden,
          src: v.getAttribute('src'),
          paused: v.paused,
          locked: document.body.style.overflow,
          back: document.activeElement.getAttribute('data-film')
        };
      });
      want(c.hidden === true, theme + '/' + film + ': Escape did not close the lightbox');
      want(c.src === null && c.paused, theme + '/' + film + ': the film was not released on close (src ' + c.src + ')');
      want(c.locked === '', theme + '/' + film + ': the page was left unscrollable');
      want(c.back === film, theme + '/' + film + ': focus did not return to the triangle (' + c.back + ')');
    }

    // a click on the backdrop closes too
    await page.click('.play-btn[data-film="essentials"]');
    await page.waitForTimeout(200);
    await page.click('.ev-lb-backdrop', { position: { x: 20, y: 20 } });
    await page.waitForTimeout(250);
    want(await page.evaluate(function () { return document.getElementById('ev-lb').hidden; }),
      theme + ': a click outside the film did not close it');

    // the tile itself is untouched: it still opens the app
    const href = await page.getAttribute('.logo-trigger[data-tool="essentials"]', 'href');
    want(href === 'https://essentials.empowered.vote', theme + ': the tile link changed to ' + href);

    want(errors.length === 0, theme + ': page errors: ' + errors.join(' | '));
    await page.close();
  }

  // ------------------------------------------------------------------ phone
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true
  });
  const mobileErrors = [];
  page.on('pageerror', function (e) { mobileErrors.push(String(e)); });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);

  const m = await page.evaluate(function () {
    var btn = document.querySelector('.play-btn[data-film="essentials"]');
    var row = btn.closest('.tool-row');
    var tile = row.querySelector('.logo-trigger');
    var b = btn.getBoundingClientRect(), t = tile.getBoundingClientRect();
    // the lockup actually being shown in this theme, not its hidden twin
    var logo = Array.prototype.filter.call(row.querySelectorAll('img'), function (i) {
      return i.getBoundingClientRect().width > 0;
    })[0];
    return {
      gutter: getComputedStyle(document.querySelector('.showcase-logos')).paddingLeft,
      bLeft: b.left, bRight: b.right, bTop: b.top,
      tLeft: t.left, tRight: t.right, tTop: t.top,
      logoRight: logo ? logo.getBoundingClientRect().right : null,
      tip: getComputedStyle(row.querySelector('.play-tip')).display,
      pageW: document.documentElement.scrollWidth,
      viewW: document.documentElement.clientWidth
    };
  });
  want(m.gutter === '0px', 'phone: the desktop gutter is still applied (' + m.gutter + ')');
  want(m.bLeft >= m.tLeft && m.bRight <= m.tRight, 'phone: the triangle is outside its card');
  want(m.logoRight !== null && m.bLeft >= m.logoRight,
    'phone: the triangle overlaps the lockup (logo ends ' + Math.round(m.logoRight) +
    ', button starts ' + Math.round(m.bLeft) + ')');
  want(m.bTop - m.tTop < 40, 'phone: the triangle is not at the top of the card (' + Math.round(m.bTop - m.tTop) + 'px down)');
  want(m.tip === 'none', 'phone: a tooltip is rendered on a touch screen (' + m.tip + ')');
  want(m.pageW <= m.viewW, 'phone: the page scrolls sideways (' + m.pageW + ' vs ' + m.viewW + ')');
  seen.push('phone: button ' + Math.round(m.bLeft) + '-' + Math.round(m.bRight) +
    ', logo ends ' + Math.round(m.logoRight) + ', card ' + Math.round(m.tLeft) + '-' + Math.round(m.tRight));

  await page.tap('.play-btn[data-film="essentials"]');
  await page.waitForTimeout(300);
  want(await page.evaluate(function () { return !document.getElementById('ev-lb').hidden; }),
    'phone: a tap did not open the lightbox');
  const box = await page.locator('.ev-lb-close').boundingBox();
  want(box.x >= 0 && box.y >= 0,
    'phone: the close button is off screen (' + Math.round(box.x) + ', ' + Math.round(box.y) + ')');
  want(mobileErrors.length === 0, 'phone: page errors: ' + mobileErrors.join(' | '));
  await page.close();

  console.log(seen.join('\n'));
  assert.deepStrictEqual(failures, [], 'explainer lightbox:\n  ' + failures.join('\n  '));
  console.log('explainer-lightbox: PASS (1440px light/dark, 390px touch)');
  await browser.close();
})();
