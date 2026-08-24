// The copy catalog and the selector, driven against a fixture page that loads nothing but
// ev-copy.en.js and ev-lines.js. Selection is the part of this feature most likely to be
// changed by someone editing copy, so it is tested away from the canvas entirely.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/tests/lines/fixture.html';

async function makePage(browser) {
  const page = await browser.newPage();
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  return page;
}

(async function () {
  const browser = await chromium.launch();
  const page = await makePage(browser);

  // ── the catalog exists and holds the greeter's lines
  const cat = await page.evaluate(function () {
    return {
      hasEn: window.EVCopy.has('en'),
      hello: window.EVCopy.get('greet.hello'),
      buttons: window.EVCopy.get('greet.buttons'),
      gone: window.EVCopy.get('greet.buttons.gone'),
      back: window.EVCopy.get('greet.back'),
      missing: window.EVCopy.get('greet.nope')
    };
  });
  assert.ok(cat.hasEn, 'the English catalog must be registered');
  assert.strictEqual(cat.hello, 'Hi there. Welcome to Empowered Vote.');
  assert.strictEqual(cat.buttons, 'Press one of those buttons up there to start exploring.');
  assert.ok(/back up the page/.test(cat.gone), 'the scrolled-off nudge must not say "press": ' + cat.gone);
  assert.ok(/\{name\}/.test(cat.back), 'the welcome-back line must carry the {name} token');
  assert.strictEqual(cat.missing, null, 'an unknown id must be null, not undefined or a throw');

  // ── no line may shout. The site does not, and neither does he.
  const shouty = await page.evaluate(function () {
    return window.EVCopy.ids().filter(function (id) { return /!/.test(window.EVCopy.get(id)); });
  });
  assert.deepStrictEqual(shouty, [], 'exclamation marks in: ' + shouty.join(', '));

  // ── an unknown locale falls back to English rather than going silent
  const fb = await page.evaluate(function () {
    window.EVCopy.setLocale('de');
    return window.EVCopy.get('greet.hello');
  });
  assert.strictEqual(fb, 'Hi there. Welcome to Empowered Vote.',
    'an unregistered locale must fall back to en, not return null');

  console.log('01-select: PASS');
  await page.close();
  await browser.close();
})();
