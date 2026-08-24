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

    'first-visit':  function (c) { return !c.returning; },
    'returning':    function (c) { return !!c.returning; },
    'logged-in':    function (c) { return !!c.loggedIn; },
    'guest':        function (c) { return !c.loggedIn; },
    'named':        function (c) { return !!c.name; },

    'tools-found':  function (c) { return !!c.toolsFound; },
    'buttons-gone': function (c) { return c.buttonsVisible === false; }
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
  function context(facts) {
    var sess = window.EVSession || {};
    var c = {
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
    return text.replace(/\{name\}/g, c.name || '');
  }

  // `matched` distinguishes a deliberate silence (a line with id:null) from no line having
  // matched at all. Both are quiet to the visitor; only the second is an authoring gap.
  function resolve(who, at, facts) {
    var c = context(facts);
    var beat = beatOf(who, at);
    if (!beat || !beat.lines) return { id: null, text: null, matched: false };
    for (var i = 0; i < beat.lines.length; i++) {
      if (!matches(beat.lines[i], c.tags)) continue;
      var id = pickId(beat.lines[i].id, who + '|' + at + '|' + i);
      if (!id) return { id: null, text: null, matched: true };
      var text = window.EVCopy ? window.EVCopy.get(id) : null;
      if (text == null) {
        // A copy typo should be findable, not silent, and not fatal.
        if (window.console && console.warn) console.warn('EVLines: no copy for id "' + id + '"');
        return { id: id, text: null, matched: true };
      }
      return { id: id, text: fill(text, c), matched: true };
    }
    return { id: null, text: null, matched: false };
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
          { id: 'greet.holidays',  when: ['holidays'] },
          { id: 'greet.back',      when: ['named', 'returning'] },
          { id: 'greet.morning',   when: ['morning'] },
          { id: 'greet.afternoon', when: ['afternoon'] },
          { id: 'greet.evening',   when: ['evening'] },
          { id: 'greet.hello' }
      ]},
      // tools-found is FIRST, so it beats everything: highlighting a tool is the only
      // demonstrated knowledge here, as against the assumed kind. A signed-in or returning
      // visitor deliberately gets the same nudge as a stranger — being on the site before
      // is not evidence of having seen the buttons.
      { at: 'point', lines: [
          { id: null,                 when: ['tools-found'] },
          { id: 'greet.buttons.gone', when: ['buttons-gone'] },
          { id: 'greet.buttons' }
      ]}
    ]
  });
})();
