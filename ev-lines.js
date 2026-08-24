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
    // Apply the picked locale so get() resolves against it, not the default.
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

  window.EVLines = { context: context, force: force, PREDICATES: PREDICATES };
})();
