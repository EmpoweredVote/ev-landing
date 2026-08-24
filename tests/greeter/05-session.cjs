// The banner auth block is the only thing on the page that knows who you are. It used to
// keep that to itself, and ev-figures.js read a boolean off the DOM by checking whether the
// logout menu item was visible — which works as a yes/no and can never carry a name.
//
// Every test here aborts all http(s), so silent SSO and /account/me cannot run. A signed-in
// visitor is a seeded ev_token: that drives decodeName() synchronously, and refreshName()'s
// fetch failing is a path the existing code already handles by keeping the JWT-derived name.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

// An unsigned JWT with the payload we want. Nothing verifies the signature client-side;
// decodeName() only base64-decodes the middle segment.
function token(payload) {
  const b64 = function (o) {
    return Buffer.from(JSON.stringify(o)).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64(payload) + '.x';
}

async function makePage(browser, init) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  if (init) await page.addInitScript(init);
  await page.goto(URL);
  await page.waitForTimeout(400);
  return page;
}

(async function () {
  const browser = await chromium.launch();

  // ── logged out: published, and published as a definite no rather than left undefined
  {
    const page = await makePage(browser);
    const s = await page.evaluate(function () { return window.EVSession; });
    assert.ok(s, 'EVSession must exist even when nobody is signed in');
    assert.strictEqual(s.loggedIn, false, 'logged out must be an explicit false');
    assert.strictEqual(s.name, null, 'logged out must have no name');
    await page.close();
  }

  // ── signed in: the name reaches EVSession, not just the menu
  {
    const t = token({ display_name: 'Chris Cantrell' });
    // Built by hand rather than via makePage(): the token has to be seeded by an init
    // script that TAKES AN ARGUMENT, which makePage's fixed signature cannot pass along.
    const p2 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await p2.route('**/*', function (r) {
      return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
    });
    await p2.addInitScript(function (tok) {
      try { localStorage.setItem('ev_token', tok); } catch (e) {}
    }, t);
    await p2.goto(URL);
    await p2.waitForTimeout(500);
    const s = await p2.evaluate(function () { return window.EVSession; });
    assert.strictEqual(s.loggedIn, true, 'a stored token must publish loggedIn');
    assert.strictEqual(s.name, 'Chris Cantrell', 'the JWT display_name must reach EVSession');
    // and the menu still agrees — this replaces a DOM scrape, it does not break it
    const menu = await p2.evaluate(function () {
      return {
        hidden: document.getElementById('menu-logout').hidden,
        text: document.getElementById('menu-username').textContent
      };
    });
    assert.strictEqual(menu.hidden, false, 'the logout item must still be shown');
    assert.strictEqual(menu.text, 'Chris Cantrell', 'the menu must still show the name');
    await p2.close();
  }

  // ── the change is announced, because auth resolves after the page does
  {
    const page = await makePage(browser, function () {
      window.__evSessionEvents = [];
      window.addEventListener('ev:session', function () {
        window.__evSessionEvents.push({
          loggedIn: window.EVSession.loggedIn, name: window.EVSession.name
        });
      });
    });
    const ev = await page.evaluate(function () { return window.__evSessionEvents; });
    assert.ok(ev.length >= 1, 'resolving to logged-out must still announce itself');
    assert.strictEqual(ev[ev.length - 1].loggedIn, false);
    await page.close();
  }

  // ── a name arriving late must not rewrite a bubble already on screen
  {
    const page = await makePage(browser);
    // put a say-bubble up by hand, then flip the session under it
    const before = await page.evaluate(function () {
      window.EVQuotes.open({ headX: 400, headY: 400, tone: 4, quote: { text: 'Hi there. Welcome to Empowered Vote.' } });
      return document.querySelector('.ev-quote .say').textContent;
    });
    await page.evaluate(function () {
      window.EVSession = { loggedIn: true, name: 'Chris' };
      window.dispatchEvent(new CustomEvent('ev:session'));
    });
    await page.waitForTimeout(300);
    const after = await page.evaluate(function () {
      return document.querySelector('.ev-quote .say').textContent;
    });
    assert.strictEqual(after, before, 'a bubble on screen must not be rewritten mid-sentence');
    await page.close();
  }

  console.log('05-session: PASS');
  await browser.close();
})();
