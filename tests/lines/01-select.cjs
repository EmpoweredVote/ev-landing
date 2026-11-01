// The copy catalog and the selector, driven against a fixture page that loads nothing but
// ev-copy.en.js and ev-lines.js. Selection is the part of this feature most likely to be
// changed by someone editing copy, so it is tested away from the canvas entirely.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/tests/lines/fixture.html';

async function makePage(browser, query) {
  const page = await browser.newPage();
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL + (query || ''));
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

  // ── Tone, as it stands today. This is a RECORD OF A DECISION, not a law: Chris is exploring
  //    the greeter's voice and asked that this rule track that exploration rather than fence
  //    it. It began as "no exclamation marks anywhere", which was too strict once the tips
  //    arrived — a tip can be warm. Two rules survive that change:
  //      - a greeting never shouts. "Hi there!" is the register the whole site avoids, and it
  //        is the first thing a stranger reads.
  //      - no line stacks them. The old hardcoded greeting had two in one sentence, which is
  //        what made it read louder than everything around it.
  //    When the tone moves, move these numbers with it.
  const tone = await page.evaluate(function () {
    var loud = [], stacked = [];
    window.EVCopy.ids().forEach(function (id) {
      var n = (window.EVCopy.get(id).match(/!/g) || []).length;
      if (n > 0 && id.indexOf('greet.') === 0) loud.push(id);
      if (n > 1) stacked.push(id);
    });
    return { loud: loud, stacked: stacked };
  });
  assert.deepStrictEqual(tone.loud, [], 'a greeting must not shout: ' + tone.loud.join(', '));
  assert.deepStrictEqual(tone.stacked, [], 'more than one "!" in: ' + tone.stacked.join(', '));

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
  // Still exact: this registers its own speaker with the single id 'greet.back', so it tests
  // substitution rather than the greeter's draw. The greeter's own welcome-back lines are an
  // array now, and 03-tips covers that they vary.
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
      // Beat 2 is the nudge ONLY for a first-time visitor who has not touched a tool.
      // Everyone else gets a tip, so these tag sets are now specific on purpose.
      buttons: say(['first-visit', 'needs-tools'], 'point'),
      gone:    say(['first-visit', 'needs-tools', 'buttons-gone'], 'point'),
      // Having found the tools used to mean silence. It now means a tip: the nudge is the
      // thing they no longer need, not the conversation.
      found:   say(['first-visit', 'tools-found'], 'point'),
      foundId: window.EVLines.resolve('greeter', 'point').id,
      // Still the guard it always was, restated for the new gate: when the nudge IS shown,
      // it is the same sentence for everyone. A personalized nudge was tried and cut, and it
      // is the obvious thing for someone to add back.
      sameNudge: say(['first-visit', 'needs-tools', 'logged-in', 'named'], 'point'),
      // A returning visitor is past the nudge entirely.
      returningId: (function () {
        window.EVLines.force(['returning', 'needs-tools', 'guest']);
        return window.EVLines.resolve('greeter', 'point').id;
      })()
    };
  });
  assert.strictEqual(g.hello, 'Hi there. Welcome to Empowered Vote.');
  // One of three, not one exact string: beat 1 draws per page load so a visitor who arrives
  // twice is not read the same sentence twice. Pinning one wording here would make adding a
  // fourth opener a test failure, which is the opposite of what this file should encourage.
  assert.ok(/^(Good morning\.|Morning\.)/.test(g.morning),
    'a morning greeting must open on the morning, got: ' + g.morning);
  assert.strictEqual(g.spooky, 'Happy Halloween. Welcome to Empowered Vote.',
    'the season must outrank the time of day');
  assert.strictEqual(g.buttons, 'Press one of those buttons up there to start exploring.');
  assert.ok(/back up the page/.test(g.gone), 'a scrolled-off column changes the nudge');
  assert.ok(g.found && g.found.length, 'having found the tools must yield a tip, not silence');
  assert.ok(/^tip\./.test(g.foundId), 'expected a tip id, got: ' + g.foundId);
  assert.strictEqual(g.sameNudge, 'Press one of those buttons up there to start exploring.',
    'the nudge must read the same for a known visitor as for a stranger');
  assert.ok(/^tip\./.test(g.returningId), 'a returning visitor must be past the nudge, got: ' + g.returningId);
  await greeter.close();

  // ── THE COUNTDOWN ───────────────────────────────────────────────────────────────────
  // The day count comes from the real clock via `now`, so these drive dates rather than
  // pinning a number: that exercises the whole wire (date rule -> fact -> tag -> {days}),
  // not just the substitution at the end of it.
  const el = await makePage(browser);
  const ec = await el.evaluate(function () {
    function say(tags, beat, now) {
      window.EVLines.force(tags);
      return window.EVLines.say('greeter', beat, now ? { now: now } : undefined);
    }
    return {
      soon:     say(['election-soon'], 'wave', new Date(2026, 9, 22, 12)),   // 12 days out
      tomorrow: say(['election-tomorrow'], 'wave', new Date(2026, 10, 2, 12)),
      day:      say(['election-day'], 'wave', new Date(2026, 10, 3, 12)),
      // Halloween outranks the countdown -- the ask, and the reason file order IS priority.
      both:     say(['halloween', 'election-soon'], 'wave', new Date(2026, 9, 28, 12)),
      // ...and the countdown outranks the welcome-back, or the people who return most often
      // are the one group that never hears it.
      back:     say(['named', 'returning', 'election-soon'], 'wave', new Date(2026, 9, 22, 12)),
      // Far out: no election tag at all, and he still gives the ordinary opener rather than
      // falling through to nothing. A beat that matches nothing is an authoring gap.
      plain:    say(['morning'], 'wave', new Date(2026, 5, 10, 9))
    };
  });

  assert.ok(/\b12 days\b/.test(ec.soon), 'the real count must render into the line: ' + ec.soon);
  assert.ok(!/\{days\}/.test(ec.soon), 'no unsubstituted token may survive: ' + ec.soon);
  assert.ok(/tomorrow/i.test(ec.tomorrow), 'the day before says tomorrow, not a number: ' + ec.tomorrow);
  assert.ok(!/\b1 days\b/.test(ec.tomorrow), 'nothing may ever say "1 days": ' + ec.tomorrow);
  assert.ok(/Election Day/i.test(ec.day), 'the day itself says so: ' + ec.day);
  assert.ok(!/\d/.test(ec.day), 'the day-of line carries no number at all: ' + ec.day);
  assert.ok(/Halloween/i.test(ec.both), 'Halloween must win when both are true: ' + ec.both);
  assert.ok(/\b12 days\b/.test(ec.back), 'a signed-in returning visitor still gets the countdown: ' + ec.back);
  assert.ok(ec.plain && ec.plain.length, 'with no election tag he must still speak');
  assert.ok(!/Election Day/i.test(ec.plain), 'and must not mention the election: ' + ec.plain);

  // ── No line may tell anyone to go and vote. We are antipartisan by design and the
  //    greeter's register is warm, not instructional: "Election Day is 12 days away" is a
  //    fact, "Don't forget to vote!" is a nag, and a nag from us reads as a side being
  //    taken. "Empowered Vote" is the organisation's name, so it is discounted first.
  const voteCheck = await el.evaluate(function () {
    var out = [];
    var ids = window.EVCopy.ids().filter(function (i) { return i.indexOf('greet.election.') === 0; });
    for (var i = 0; i < ids.length; i++) out.push([ids[i], window.EVCopy.get(ids[i])]);
    return out;
  });
  assert.ok(voteCheck.length >= 3, 'expected the election copy to exist, found ' + voteCheck.length);
  for (const [id, text] of voteCheck) {
    const stripped = text.replace(/Empowered Vote/g, '');
    assert.ok(!/\bvote\b/i.test(stripped), id + ' must not instruct anyone to vote: ' + text);
    assert.ok(!/!\s*$/.test(text.trim()) || !/vote/i.test(text), id + ' reads as a nag: ' + text);
  }
  await el.close();

  // ── ?evdays= renders a pinned number WITHOUT moving a tag, and a junk value is ignored
  //    rather than reaching the sentence. Without the guard ?evdays=abc puts "Election Day
  //    is NaN days away" in his mouth; parseInt alone would also take "1e3" as 1.
  const pin = await makePage(browser, '?evdays=7');
  const pinned = await pin.evaluate(function () {
    window.EVLines.force(['election-soon']);
    return window.EVLines.say('greeter', 'wave', { now: new Date(2026, 9, 22, 12) });
  });
  assert.ok(/\b7 days\b/.test(pinned), '?evdays=7 must render 7, not the real 12: ' + pinned);

  for (const bad of ['abc', '', '-5', '1.5', '1e3', 'NaN']) {
    const bp = await makePage(browser, '?evdays=' + encodeURIComponent(bad));
    const line = await bp.evaluate(function () {
      window.EVLines.force(['election-soon']);
      return window.EVLines.say('greeter', 'wave', { now: new Date(2026, 9, 22, 12) });
    });
    assert.ok(/\b12 days\b/.test(line),
      '?evdays=' + JSON.stringify(bad) + ' must be ignored and the real count used: ' + line);
    assert.ok(!/NaN|undefined|null/.test(line),
      '?evdays=' + JSON.stringify(bad) + ' leaked into the sentence: ' + line);
    await bp.close();
  }
  await pin.close();

  console.log('01-select: PASS');
  await page.close();
  await browser.close();
})();
