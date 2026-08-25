// THE GREETER'S HEADROOM ON A PHONE. Below 901px the tool buttons collapse into one
// full-width column that ends directly above the `.hero .meta-row` he stands on. With the
// 48px of margin that row used to carry, his upper body crossed the last card and his bubble
// sat squarely on top of it — the Civic Trivia card was completely hidden whenever he spoke,
// which is how Chris found this. The row now holds 190px open below 901px.
//
// The number is derived (see the comment on the rule in index.html), so this test asserts the
// two things that derivation was FOR, not the number itself: his painted figure stays below
// the last card, and a bubble of ordinary height does too. Change the figure's scale or the
// bubble's offset and this is what should complain.
//
// The longest four tips are deliberately out of scope. tip.readrank is 144px tall at 390 and
// does reach into the card's bottom edge; clearing those too would have cost a 260px band of
// mostly-empty hero on a phone, and was weighed and declined. They no longer COVER the card,
// which was the complaint.
const { chromium } = require('playwright');
const assert = require('assert');

const BASE = 'file:///C:/ev-landing/ev-landing-main/index.html';
// 390 and 430 are the two phone widths the greeter shots already use; 768 is the top of the
// single-column range, where the same rule has to hold for a much wider card.
const WIDTHS = [390, 430, 768];
// The daylight the rule is built to leave between the card and an ordinary bubble. Measured at
// 12px across all three widths — the card, the figure and the bubble all move together, so this
// is not a per-width fudge. A couple of px of slack for sub-pixel layout.
const MIN_GAP = 8;

async function makePage(browser, width) {
  const page = await browser.newPage({ viewport: { width: width, height: 844 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.addInitScript(function () {
    try { sessionStorage.removeItem('ev:greeted:session'); } catch (e) {}
    try { localStorage.removeItem('ev:greeted'); } catch (e) {}
    document.addEventListener('DOMContentLoaded', function () {
      document.documentElement.style.scrollBehavior = 'auto';
    });
  });
  await page.goto(BASE + '?evlines=first-visit,guest,needs-tools#figdebug');
  await page.waitForTimeout(400);
  return page;
}

// Into his firing window, the same walk the greeter suite uses. Returning false here is a
// finding in itself: pushing him 142px down the page moves that window, and a rule that
// silenced him would be a worse bug than the overlap it fixed.
async function scrollDownInto(page) {
  for (let i = 0; i < 140; i++) {
    const at = await page.evaluate(function () {
      var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
      var top = e.c.getBoundingClientRect().top, ih = window.innerHeight;
      var btn = document.querySelector('.showcase-logos').getBoundingClientRect().bottom;
      if (top > 70 && top + e.h < ih - 8 && btn > ih * 0.45 && window.scrollY >= 60) return true;
      window.scrollBy(0, 30);
      return false;
    });
    if (at) return true;
    await page.waitForTimeout(40);
  }
  return false;
}

(async function () {
  const browser = await chromium.launch();
  const observed = [];

  for (const width of WIDTHS) {
    const page = await makePage(browser, width);
    assert.ok(await scrollDownInto(page),
      width + ': he can no longer reach his firing window — the extra headroom pushed it off');

    // beat 2 is the nudge here (tags are pinned), which is one line at every width tested and
    // so is the "ordinary bubble" the 190px was sized for
    await page.waitForFunction(function () {
      var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
      return e.giBeat === 2;
    }, null, { timeout: 9000 });
    await page.waitForTimeout(250);

    const m = await page.evaluate(function () {
      var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
      var cards = document.querySelectorAll('.showcase-logos .logo-trigger');
      var last = cards[cards.length - 1].getBoundingClientRect();
      var can = e.c.getBoundingClientRect();
      var bub = document.querySelector('.ev-quote');
      var r = bub ? bub.getBoundingClientRect() : null;
      return {
        card: Math.round(last.bottom),
        canvas: Math.round(can.top),
        bubble: r ? Math.round(r.top) : null,
        height: r ? Math.round(r.height) : null,
        text: bub ? bub.querySelector('.say').textContent : null
      };
    });
    await page.close();

    assert.ok(m.bubble != null, width + ': no bubble was open to measure');
    observed.push(width + ': card ' + m.card + ', canvas ' + m.canvas + ', bubble ' + m.bubble +
                  ' (h' + m.height + ') → gaps ' + (m.canvas - m.card) + '/' + (m.bubble - m.card));

    // 1. his CANVAS — not just his figure — starts below the last card. The canvas is the
    //    honest bound: it is what the poof smoke, the shadow and any future gesture live in.
    assert.ok(m.canvas - m.card >= MIN_GAP,
      width + ': he stands on the last card — canvas top ' + m.canvas + ' vs card bottom ' + m.card);

    // 2. and so does what he says
    assert.ok(m.bubble - m.card >= MIN_GAP,
      width + ': his bubble covers the last card — bubble top ' + m.bubble +
      ' vs card bottom ' + m.card + ' (' + m.height + 'px bubble: "' + m.text + '")');
  }

  observed.forEach(function (line) { console.log('  ' + line); });
  console.log('greeter-clear: PASS');
  await browser.close();
})();
