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

  // ── selection. A fresh page each time: register() is cumulative by design.
  const sel = await makePage(browser);
  const cases = await sel.evaluate(function () {
    var out = {};
    window.EVLines.register('t', {
      beats: [
        { at: 'one', lines: [
            { id: 'a', when: ['x', 'y'] },   // both tags required
            { id: 'b', when: ['x'] },
            { id: 'c' }                       // fallback
        ]},
        { at: 'two', lines: [
            { id: null, when: ['quiet'] },    // deliberate silence
            { id: 'd' }
        ]}
      ]
    });
    window.EVCopy.register('en', { a: 'A', b: 'B', c: 'C', d: 'D' });

    function at(tags, beat) {
      window.EVLines.force(tags);
      return window.EVLines.resolve('t', beat || 'one');
    }
    out.both     = at(['x', 'y']).text;
    out.partial  = at(['x']).text;
    out.neither  = at(['z']).text;
    out.andOrder = at(['y']).text;              // y alone must NOT satisfy ['x','y']
    out.silence  = at(['quiet'], 'two');
    out.nudge    = at([], 'two');
    out.noBeat   = window.EVLines.resolve('t', 'nope');
    out.noWho    = window.EVLines.resolve('nobody', 'one');
    window.EVLines.force(null);
    return out;
  });

  assert.strictEqual(cases.both, 'A', 'both tags present must take the first line');
  assert.strictEqual(cases.partial, 'B', 'one of two tags must fall through to the single-tag line');
  assert.strictEqual(cases.neither, 'C', 'no tags must reach the fallback');
  assert.strictEqual(cases.andOrder, 'C', 'when is an AND: y alone must not match [x,y]');

  // A matched silence and an authoring gap are both quiet to the visitor. Only the second
  // is a bug, so they must be distinguishable here.
  assert.strictEqual(cases.silence.text, null, 'id:null must produce no text');
  assert.strictEqual(cases.silence.matched, true, 'id:null is a MATCH, not a miss');
  assert.strictEqual(cases.nudge.text, 'D', 'without the quiet tag the nudge is said');
  assert.strictEqual(cases.noBeat.matched, false, 'an unknown beat matches nothing');
  assert.strictEqual(cases.noWho.matched, false, 'an unknown speaker matches nothing');

  // ── an id array picks one of the set, and holds it for the session
  const rand = await sel.evaluate(function () {
    window.EVLines.register('r', { beats: [{ at: 'one', lines: [{ id: ['p', 'q', 'r'] }] }] });
    window.EVCopy.register('en', { p: 'P', q: 'Q', r: 'R' });
    var first = window.EVLines.say('r', 'one');
    var again = [];
    for (var i = 0; i < 8; i++) again.push(window.EVLines.say('r', 'one'));
    return { first: first, again: again };
  });
  assert.ok(['P', 'Q', 'R'].includes(rand.first), 'an id array must pick from the set, got: ' + rand.first);
  assert.ok(rand.again.every(function (v) { return v === rand.first; }),
    'the pick must hold for the session, got: ' + rand.again.join(','));

  // ── {name} is filled from the session
  const named = await sel.evaluate(function () {
    window.EVSession = { loggedIn: true, name: 'Chris' };
    window.EVLines.register('n', { beats: [{ at: 'one', lines: [{ id: 'greet.back' }] }] });
    return window.EVLines.say('n', 'one');
  });
  assert.strictEqual(named, 'Welcome back, Chris.', 'the {name} token must be substituted');
  await sel.close();

  // ── the greeter's own beats are registered by ev-lines.js itself
  const greeter = await makePage(browser);
  const g = await greeter.evaluate(function () {
    function say(tags, beat) { window.EVLines.force(tags); return window.EVLines.say('greeter', beat); }
    return {
      hello:   say(['first-visit', 'guest'], 'wave'),
      morning: say(['morning', 'guest'], 'wave'),
      spooky:  say(['halloween', 'morning'], 'wave'),
      buttons: say([], 'point'),
      gone:    say(['buttons-gone'], 'point'),
      found:   say(['tools-found'], 'point'),
      bothFG:  say(['tools-found', 'buttons-gone'], 'point'),
      // regression guard: a returning or signed-in visitor gets the SAME nudge as a
      // stranger. A personalized one was tried and cut; it is the obvious thing to add back.
      backNudge: say(['returning', 'logged-in', 'named'], 'point')
    };
  });
  assert.strictEqual(g.hello, 'Hi there. Welcome to Empowered Vote.');
  assert.strictEqual(g.morning, 'Good morning. Welcome to Empowered Vote.');
  assert.strictEqual(g.spooky, 'Happy Halloween. Welcome to Empowered Vote.',
    'the season must outrank the time of day');
  assert.strictEqual(g.buttons, 'Press one of those buttons up there to start exploring.');
  assert.ok(/back up the page/.test(g.gone), 'a scrolled-off column changes the nudge');
  assert.strictEqual(g.found, null, 'having found the tools means no nudge at all');
  assert.strictEqual(g.bothFG, null, 'tools-found must outrank buttons-gone');
  assert.strictEqual(g.backNudge, 'Press one of those buttons up there to start exploring.',
    'a known visitor must get the same nudge as a stranger');
  await greeter.close();

  console.log('01-select: PASS');
  await page.close();
  await browser.close();
})();
