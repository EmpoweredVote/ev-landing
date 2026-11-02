// ─── EV dialogue engine ───
// Decides WHICH line a Bobit says. Owns three things and nothing else: the context (facts
// about this visitor and this moment), the predicates that turn those facts into tags, and
// the selection that picks a line id from a tag set.
//
// It holds no words — those are in ev-copy.<lang>.js — and it knows nothing about canvas,
// poses or bubbles. ev-figures.js reports what only it can see (has a tool been highlighted,
// is the button column still on screen) as per-call facts; this file decides what that means.
(function () {
  "use strict";
  if (window.EVLines) return;   // idempotence guard, same pattern as ev-quotes.js

  var MET_KEY = 'ev:greeted';   // "this browser has been here before" — written by ev-figures.js

  // Read EAGERLY, at load. Lazily is wrong: the context is first built when he speaks, by
  // which point a visitor who hovered a tool on the way down has already had this flag
  // written by noteToolsFound() — and would be told "welcome back" on their first visit.
  var wasReturning = (function () {
    try { return localStorage.getItem(MET_KEY) === '1'; } catch (err) { return false; }
  })();

  // ?evlines=halloween,evening pins the tags for this page load. Two jobs: looking at a
  // seasonal line in June, and making date-dependent selection deterministic in tests
  // without mocking a clock.
  var forced = (function () {
    var m = /[?&]evlines=([^&#]*)/.exec(window.location.search);
    if (!m) return null;
    var list = decodeURIComponent(m[1]).split(',').map(function (s) { return s.trim(); })
                 .filter(function (s) { return s.length; });
    return list.length ? list : null;
  })();

  function force(tags) { forced = (tags && tags.length) ? tags : null; }

  // ?evdays=7 pins the DAY COUNT for this page load. Separate lever from ?evlines= on
  // purpose, and the separation is the whole point: ?evlines= decides which tags are true,
  // ?evdays= decides what number the sentence carries. Folding the two together would mean
  // ?evdays=0 silently switched on the election-day tag — and with it the entire polling
  // place on the landing page — which is a lever nobody asked for.
  //
  // Anything that is not a non-negative integer is DISCARDED rather than coerced. Without
  // that guard `?evdays=abc` reaches {days} as NaN and the greeter says "Election Day is
  // NaN days away"; parseInt alone would also take "1e3" as 1 and " 7" as 7.
  var forcedDays = (function () {
    var m = /[?&]evdays=([^&#]*)/.exec(window.location.search);
    if (!m) return null;
    var raw = decodeURIComponent(m[1]);
    if (!/^\d+$/.test(raw)) return null;
    var n = parseInt(raw, 10);
    return isFinite(n) ? n : null;
  })();

  // ── FEDERAL ELECTION DAY ────────────────────────────────────────────────────────────
  // The first Tuesday after the first Monday in November of an even-numbered year. Written
  // as the rule rather than as a table of dates, because a table is something a person has
  // to remember to extend and the failure when they forget is SILENT: the countdown simply
  // never appears again, in an off year, on a page nobody is watching. The rule has been
  // federal law since 1845 and costs six lines. Verified against 2022 (8 Nov), 2024 (5 Nov),
  // 2026 (3 Nov) and 2028 (7 Nov) in tests/lines/02-predicates.cjs.
  //
  // LOCAL time throughout, like every other date window in this file: a visitor's Election
  // Day is the one where they are standing.
  function federalElectionDay(year) {
    if (year % 2 !== 0) return null;              // no federal general election in an odd year
    var d = new Date(year, 10, 1);                // 1 November
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);   // walk to the first Monday
    d.setDate(d.getDate() + 1);                   // the Tuesday after it
    return d;
  }

  // The next one that has not happened yet. Looking FORWARD is what makes the count below
  // total — never null, never negative — so {days} can never render as an empty string or
  // as a minus number, and no caller has to defend against either.
  function nextElectionDay(now) {
    var y = now.getFullYear();
    var today = new Date(y, now.getMonth(), now.getDate());
    for (var i = 0; i <= 3; i++) {
      var e = federalElectionDay(y + i);
      if (e && e >= today) return e;
    }
    return null;   // unreachable: an even year is at most 2 away
  }

  // Calendar days between two LOCAL midnights, so a visitor at 23:50 and one at 00:10 on the
  // same date are told the same number.
  //
  // Math.round, not Math.floor, and the usual argument for it is backwards. The instinct is
  // that DST ending inside the window (the first Sunday in November) makes a floor read low.
  // It does not: falling back makes a day LONGER — 31 Oct to 3 Nov 2026 is 73 hours, and
  // floor and round both give 3. The off-by-one is across a SHORT day, i.e. spring forward,
  // which a countdown ending in November never crosses. Round is used anyway because it is
  // right whichever way a transition falls, and being right by rule rather than by
  // coincidence costs nothing. There is deliberately no test for the DST case: one driving
  // 31 Oct and asserting 3 would pass identically against the floor it is meant to rule out,
  // which is worse than no test.
  function daysUntilElection(now) {
    var e = nextElectionDay(now);
    if (!e) return null;
    var a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((e - a) / 86400000);
  }

  // Third Monday in January.
  function isMlkDay(d) {
    if (d.getMonth() !== 0) return false;
    if (d.getDay() !== 1) return false;
    return d.getDate() >= 15 && d.getDate() <= 21;
  }

  // Named booleans over the context. Every future condition — "it is Election Day", "they
  // have three or more Compass sessions" — is one entry here plus one fact, and selection
  // does not change. Date windows are LOCAL time on purpose: a visitor's Halloween is the
  // one where they are standing, not UTC's.
  var PREDICATES = {
    'morning':      function (c) { return c.hour < 12; },
    'afternoon':    function (c) { return c.hour >= 12 && c.hour < 17; },
    'evening':      function (c) { return c.hour >= 17; },

    'halloween':    function (c) { return c.now.getMonth() === 9 && c.now.getDate() >= 25; },
    'holidays':     function (c) {
                      var m = c.now.getMonth(), d = c.now.getDate();
                      return (m === 11 && d >= 18) || (m === 0 && d === 1);
                    },
    'mlk-day':      function (c) { return isMlkDay(c.now); },

    // The countdown, as three tags rather than one. `when` is an AND with no arithmetic in
    // it, so the only way the catalog can hold a singular sentence ("tomorrow") and a plural
    // one ("{days} days away") is for each to have its own name. That is the same reason
    // `needs-tools` exists as the inverse of `tools-found`: the engine deliberately cannot
    // express either, and a name is cheaper than making it able to.
    //
    // 30 days is "about a month out". daysToElection is total (see above), so none of these
    // needs a null branch, and in an odd year it is a number in the hundreds and all three
    // are simply false — the same self-switching the Halloween window has.
    'election-day':      function (c) { return c.daysToElection === 0; },
    'election-tomorrow': function (c) { return c.daysToElection === 1; },
    'election-soon':     function (c) { return c.daysToElection >= 2 && c.daysToElection <= 30; },

    'first-visit':  function (c) { return !c.returning; },
    'returning':    function (c) { return !!c.returning; },
    'logged-in':    function (c) { return !!c.loggedIn; },
    'guest':        function (c) { return !c.loggedIn; },
    'named':        function (c) { return !!c.name; },

    'tools-found':  function (c) { return !!c.toolsFound; },
    // The inverse, as its own name, so the button nudge can be written as a positive
    // condition. `when` is an AND with no negation, by design — there is nothing to reason
    // about in a list of things that must all be true — so an inverse needs its own entry.
    'needs-tools':  function (c) { return !c.toolsFound; },
    'buttons-gone': function (c) { return c.buttonsVisible === false; },

    // A fine pointer means a mouse. Asked once at load: a device does not sprout a mouse
    // mid-visit, and a hybrid laptop reports fine while the trackpad is in use, which is the
    // answer we want for "can you press a right mouse button".
    'desktop':      function (c) { return !!c.finePointer; },
    'touch':        function (c) { return !c.finePointer; }
  };

  // The locale we have copy for. navigator.language is "en-US"; we key on the base.
  function pickLocale() {
    var lang = (window.navigator && (navigator.language || navigator.userLanguage)) || 'en';
    var base = String(lang).toLowerCase().split('-')[0];
    var locale = base;
    if (!(window.EVCopy && window.EVCopy.has(base))) {
      locale = (window.EVCopy && window.EVCopy.BASE) || 'en';
    }
    // Apply the picked locale so get() resolves against it, not the default. Without this
    // call the seam looks finished and silently is not: a second language file can register
    // an 'es' pack, has(), ids() and everything else will see it exists, and EVCopy.get()
    // will still resolve every id against 'en' forever, because nothing ever told it the
    // active locale changed. That failure mode is the dangerous kind — no error, no warning,
    // just English text under a Spanish navigator.language, discovered only by someone
    // reading Spanish and noticing it never arrives.
    //
    // Side effect worth being honest about: context() is documented above as facts, not
    // decisions — but this line mutates EVCopy's active locale as a side effect of merely
    // building a facts object. That is a real deviation from the stated contract, tolerated
    // here because pickLocale() has to run before resolve() calls get(), and context() is
    // the only function that runs on every call to resolve().
    if (window.EVCopy) {
      window.EVCopy.setLocale(locale);
    }
    return locale;
  }

  // Facts, not decisions. `facts` is what only the caller can know, merged over the ambient
  // ones — without it this file would have to reach into ev-figures.js for featureEverOn,
  // which a module claiming to know nothing about canvas cannot do.
  // Read once at load, like wasReturning: matchMedia is cheap but this never changes within a
  // page, and asking once keeps context() a plain read of stored values.
  var finePointer = (function () {
    try { return !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches); }
    catch (err) { return true; }   // no matchMedia: assume a mouse, the older-browser case
  })();

  function context(facts) {
    var sess = window.EVSession || {};
    var c = {
      finePointer: finePointer,
      now: (facts && facts.now) || new Date(),
      locale: pickLocale(),
      loggedIn: !!sess.loggedIn,
      name: sess.name || null,
      returning: wasReturning,
      toolsFound: false,
      buttonsVisible: undefined
    };
    if (facts) for (var k in facts) if (Object.prototype.hasOwnProperty.call(facts, k)) c[k] = facts[k];
    c.hour = c.now.getHours();
    // Set BEFORE the early return below, so a forced tag set still carries a real number —
    // a preview pinned with ?evlines=election-soon has to render a day count, not a blank.
    //
    // This is the REAL count and ?evdays= deliberately does not touch it. The predicates
    // below derive from this fact, so an override here would move the tags with it, and
    // ?evdays=0 would switch on election-day and with it the whole polling place. ?evdays=
    // is a RENDER lever: fill() applies it to {days} and nothing else reads it. Keeping the
    // fact honest is what lets the two levers stay independent — ?evlines= decides which
    // tags are true, ?evdays= decides what number the sentence carries.
    c.daysToElection = daysUntilElection(c.now);

    if (forced) { c.tags = forced.slice(); return c; }
    c.tags = [];
    for (var name in PREDICATES) {
      if (Object.prototype.hasOwnProperty.call(PREDICATES, name) && PREDICATES[name](c)) c.tags.push(name);
    }
    return c;
  }

  var speakers = {};
  var picks = {};   // an id array's chosen index, held for the session

  function register(who, def) { speakers[who] = def; }

  function beatOf(who, at) {
    var def = speakers[who];
    if (!def || !def.beats) return null;
    for (var i = 0; i < def.beats.length; i++) if (def.beats[i].at === at) return def.beats[i];
    return null;
  }

  function matches(line, tags) {
    if (!line.when || !line.when.length) return true;    // no condition: the fallback
    for (var i = 0; i < line.when.length; i++) {
      if (tags.indexOf(line.when[i]) === -1) return false;   // `when` is an AND
    }
    return true;
  }

  // Which of an id array to use. Chosen once and held, so he does not change his mind
  // between beats or on a re-render — but does vary between visits.
  function pickId(id, key) {
    if (!id) return null;
    if (typeof id === 'string') return id;
    if (!id.length) return null;
    if (!(key in picks)) picks[key] = Math.floor(Math.random() * id.length);
    return id[picks[key]];
  }

  // The one substitution the catalog supports. A single named token, so a translator can
  // move it within the sentence — Spanish and German both need to — without this file
  // having to parse anything.
  function fill(text, c) {
    if (!text) return text;
    // {days} is the countdown's number. ?evdays= is applied HERE and only here: the fact on
    // the context stays the real derived count, because the predicates read it and an
    // override there would drag the tags along with it (?evdays=0 would switch on
    // election-day, and with it the whole polling place). Two levers, one job each.
    var days = (forcedDays != null) ? forcedDays : c.daysToElection;
    return text
      .replace(/\{name\}/g, c.name || '')
      .replace(/\{days\}/g, (days == null) ? '' : String(days));
  }

  // A POOL is the second and last selection shape: the entries in it are unordered, and one
  // of the ones that fit is drawn at random. Ordinary `lines` stay first-match-wins, because
  // the button nudge is a priority decision. A pool is for the tips, where nothing outranks
  // anything and the point is that a returning visitor gets a different line.
  //
  // The draw is held for the page's lifetime, keyed by beat and position, for a reason that
  // is not tidiness: resolve() is called again by the debug surface and could be called again
  // by a future caller. Re-drawing would let the text and its pointing target disagree.
  function pickPool(members, tags, key) {
    if (key in picks) return picks[key];
    var fit = [], i;
    for (i = 0; i < members.length; i++) if (matches(members[i], tags)) fit.push(members[i]);
    if (!fit.length) return null;
    picks[key] = fit[Math.floor(Math.random() * fit.length)];
    return picks[key];
  }

  // `matched` distinguishes a deliberate silence (a line with id:null) from no line having
  // matched at all. Both are quiet to the visitor; only the second is an authoring gap.
  //
  // `aim` is a CSS selector naming what the speaker should point at while saying this line.
  // null means "whatever you point at by default" — for the greeter, the tool buttons.
  function resolve(who, at, facts) {
    var c = context(facts);
    var beat = beatOf(who, at);
    if (!beat || !beat.lines) return { id: null, text: null, matched: false, aim: null };
    for (var i = 0; i < beat.lines.length; i++) {
      var line = beat.lines[i];
      if (line.pool) {
        // A pool entry matches when at least one of its members does; the draw picks among
        // exactly those. An empty fit falls through to the next line rather than going silent,
        // so a pool whose every member is gated off is a gap, not a hidden mute.
        var drawn = pickPool(line.pool, c.tags, who + '|' + at + '|' + i);
        if (!drawn) continue;
        line = drawn;
      } else if (!matches(line, c.tags)) {
        continue;
      }
      var id = pickId(line.id, who + '|' + at + '|' + i + '|id');
      if (!id) return { id: null, text: null, matched: true, aim: null };
      var text = window.EVCopy ? window.EVCopy.get(id) : null;
      if (text == null) {
        // A copy typo should be findable, not silent, and not fatal.
        if (window.console && console.warn) console.warn('EVLines: no copy for id "' + id + '"');
        return { id: id, text: null, matched: true, aim: null };
      }
      return { id: id, text: fill(text, c), matched: true, aim: line.aim || null };
    }
    return { id: null, text: null, matched: false, aim: null };
  }

  function say(who, at, facts) { return resolve(who, at, facts).text; }

  // PREDICATES is exported even though nothing in shipped code or in the test suites reads
  // it back off window.EVLines — resolve()/context() close over the local variable directly.
  // It is public on purpose, for two reasons that are not "an accident nobody cleaned up":
  // it is the debug handle a person opens in devtools to see the exact live tag functions
  // (not a description of them, the functions), and the README points a future author here
  // as the place to add a new condition. If a later change makes this genuinely private,
  // that is fine, but it should be a deliberate removal, not a drive-by "unused export" cut.
  window.EVLines = {
    context: context, force: force, PREDICATES: PREDICATES,
    // Public for the same reason PREDICATES is: it is the handle a person opens in devtools
    // to check the date rule against a real calendar, and the tests assert it directly.
    federalElectionDay: federalElectionDay,
    register: register, resolve: resolve, say: say
  };

  // ── THE GREETER ──────────────────────────────────────────────────────────────────────
  // Two beats, matching what his body does: a welcome while he waves, then a nudge toward
  // the tool buttons when his arm lands on them. ORDER IS PRIORITY — the first line whose
  // tags are all active wins, so a season outranks a time of day because it is listed
  // above it. There is no scoring to reason about.
  register('greeter', {
    beats: [
      { at: 'wave', lines: [
          { id: 'greet.halloween', when: ['halloween'] },
          // THE COUNTDOWN SITS HERE, and both ends of that position are decisions.
          //
          // Below Halloween, which is the ask: 25-31 October is the takeover's greeting and
          // 1 November falls back to the countdown with nothing to switch over. The windows
          // cannot actually overlap for election-day (Election Day is always 2-8 November),
          // but writing it in priority order keeps the list reading correctly out loud,
          // which is the property this whole file is organised around.
          //
          // ABOVE greet.back, and that is the one that matters. A signed-in returning
          // visitor matches greet.back ahead of everything under it, so a countdown placed
          // below would be invisible to exactly the people who come back most often.
          { id: 'greet.election.day',      when: ['election-day'] },
          { id: 'greet.election.tomorrow', when: ['election-tomorrow'] },
          { id: ['greet.election.soon', 'greet.election.soon.b', 'greet.election.soon.c'],
                                           when: ['election-soon'] },
          { id: 'greet.holidays',  when: ['holidays'] },
          // An id ARRAY draws one at random per page load and holds it for that load. Three
          // openers per case, so a visitor who arrives twice is not read the same sentence
          // twice. `greet.hello` stays single: in production one of morning/afternoon/evening
          // is always true, so it is only ever reached when a test pins tags without one.
          { id: ['greet.back', 'greet.back.b', 'greet.back.c'],                when: ['named', 'returning'] },
          { id: ['greet.morning', 'greet.morning.b', 'greet.morning.c'],       when: ['morning'] },
          { id: ['greet.afternoon', 'greet.afternoon.b', 'greet.afternoon.c'], when: ['afternoon'] },
          { id: ['greet.evening', 'greet.evening.b', 'greet.evening.c'],       when: ['evening'] },
          { id: 'greet.hello' }
      ]},
      // tools-found is FIRST, so it beats everything: highlighting a tool is the only
      // demonstrated knowledge here, as against the assumed kind. A signed-in or returning
      // visitor deliberately gets the same nudge as a stranger — being on the site before
      // is not evidence of having seen the buttons.
      // Beat 2 is the nudge OR a tip. The nudge is for a first-time visitor who has not
      // touched a tool: that is the only person it helps, and telling anyone else where the
      // buttons are implies they failed to notice. Everyone else gets a tip, drawn at random.
      //
      // `first-visit` is read from storage at page load, so hovering a tool part-way down
      // cannot flip someone out of it mid-visit and skip their nudge.
      { at: 'point', lines: [
          { id: 'greet.buttons.gone', when: ['first-visit', 'needs-tools', 'buttons-gone'] },
          { id: 'greet.buttons',      when: ['first-visit', 'needs-tools'] },
          { pool: [
              // One idea, two devices. A phone has no right mouse button, and telling someone
              // to press one is the small wrongness that makes the rest sound careless.
              { id: 'tip.poof.desktop', when: ['desktop'] },
              { id: 'tip.poof.touch',   when: ['touch'] },

              { id: 'tip.compass.calibrate' },
              { id: 'tip.compass.visual' },
              { id: 'tip.compass.what' },
              { id: 'tip.readrank' },

              { id: 'tip.privacy' },
              { id: 'tip.citizens-first' },
              // He points at the hero headline while saying it — the line ends on "right up
              // there at the top", which is a promise to indicate something.
              { id: 'tip.values', aim: '.hero h1' },
              { id: 'tip.equation' },

              { id: 'tip.oversight' },
              { id: 'tip.local' },
              { id: 'tip.wealth' },

              // The banner is position:sticky, so this target is on screen whenever he speaks.
              { id: 'tip.feedback', aim: '#profile-btn' },
              { id: 'tip.briefing' },
              { id: 'tip.mindmap' },
              { id: 'tip.newsletter' },

              { id: 'tip.readers' },
              { id: 'tip.gig' },
              { id: 'tip.wip' },
              { id: 'tip.best' }
          ]}
      ]}
    ]
  });
})();
