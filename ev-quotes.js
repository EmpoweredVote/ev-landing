// ─── EV quote bubbles ───
// Owns the presidential-quote pool and the speech bubbles that seated readers open.
// Deliberately knows nothing about the leremy rig: ev-figures.js decides WHO speaks
// and WHEN, this file owns WHAT they say and the DOM that shows it.
//
// Every href below was checked on 2026-08-02; see presidential_quotes.md for the
// verification notes and the two attributions that had to be corrected.
(function () {
  "use strict";
  if (window.EVQuotes) return;   // idempotence guard, same pattern as leremy-rig.js

  var QUOTES = [
    {
      text: "If we mean to support the Liberty and Independence which it has cost us so much blood and treasure to establish, we must drive far away the dæmon of party spirit and local reproach.",
      who: "George Washington",
      where: "to Gov. Arthur Fenner, 4 June 1790",
      href: "https://tile.loc.gov/storage-services/service/mss/mgw/mgw2/022/022.pdf#page=118"
    },
    {
      text: "Let me… warn you in the most solemn manner against the baneful effects of the spirit of party. It serves always to distract the public councils and enfeeble the public administration.",
      who: "George Washington",
      where: "Farewell Address, 19 September 1796",
      href: "https://www.govinfo.gov/content/pkg/CDOC-105sdoc22/html/CDOC-105sdoc22.htm"
    },
    {
      text: "There is nothing I dread So much, as a Division of the Republick into two great Parties, each arranged under its Leader, and concerting Measures in opposition to each other.",
      who: "John Adams",
      where: "to Jonathan Jackson, 2 October 1780",
      href: "https://www.masshist.org/publications/adams-papers/index.php/volume/PJA10/pageid/PJA10p193"
    },
    {
      text: "Cherish therefore the spirit of our people, and keep alive their attention. Do not be too severe upon their errors, but reclaim them by enlightening them. If once they become inattentive to the public affairs, you and I, and Congress, and Assemblies, judges and governors shall all become wolves.",
      who: "Thomas Jefferson",
      where: "to Edward Carrington, 16 January 1787",
      href: "https://press-pubs.uchicago.edu/founders/documents/amendI_speechs8.html"
    },
    {
      text: "I think by far the most important bill in our whole code is that for the diffusion of knowledge among the people. No other sure foundation can be devised for the preservation of freedom, and happiness.",
      who: "Thomas Jefferson",
      where: "to George Wythe, 13 August 1786",
      href: "https://tjrs.monticello.org/letter/1283"
    },
    {
      text: "I know no safe depository of the ultimate powers of the society but the people themselves… the remedy is not to take it from them, but to inform their discretion by education.",
      who: "Thomas Jefferson",
      where: "to William C. Jarvis, 28 September 1820",
      href: "https://tjrs.monticello.org/letter/382"
    },
    {
      text: "Let us not despair but act. Let us not seek the Republican answer or the Democratic answer but the right answer. Let us not seek to fix the blame for the past — let us accept our own responsibility for the future.",
      who: "John F. Kennedy",
      where: "Loyola College Alumni Banquet, Baltimore, 18 February 1958",
      href: "https://www.jfklibrary.org/archives/other-resources/john-f-kennedy-speeches/baltimore-md-19580218"
    }
  ];

  // Fisher-Yates over 0..n-1
  function shuffled(n) {
    var a = [], i, j, t;
    for (i = 0; i < n; i++) a.push(i);
    for (i = n - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Deal one distinct quote to each reader, in random order, until the pool runs out.
  // Readers left over keep spec.quote undefined and fall back to a wave/shrug.
  function deal(readers) {
    var pool = shuffled(QUOTES.length);
    var order = shuffled(readers.length);
    var n = Math.min(pool.length, order.length), i;
    for (i = 0; i < n; i++) readers[order[i]].quote = QUOTES[pool[i]];
    return n;
  }

  var live = [];   // open bubble handles
  var LIFE = 12;   // seconds a bubble survives untouched

  function place(h) {
    var el = h.el;
    var w = el.offsetWidth, hh = el.offsetHeight;
    var sx = window.scrollX || window.pageXOffset || 0;
    var docW = document.documentElement.clientWidth;
    var left = h.headX - w / 2;
    var maxL = sx + docW - w - 8;
    if (left > maxL) left = maxL;
    if (left < sx + 8) left = sx + 8;
    el.style.left = left + "px";
    el.style.top = (h.headY - hh - 14) + "px";
    // the tail slides along the bottom edge so it keeps pointing at his head even
    // when the bubble has been clamped sideways; kept clear of the rounded corners
    var tx = h.headX - left;
    if (tx < 18) tx = 18;
    if (tx > w - 18) tx = w - 18;
    h.tail.style.left = (tx - 11) + "px";
    h.tailIn.style.left = (tx - 8) + "px";
  }

  function open(anchor) {
    var el = document.createElement("div");
    el.className = "ev-quote";
    el.setAttribute("role", "note");
    el.style.setProperty("--tone", anchor.tone);

    var q = document.createElement("q");
    q.textContent = anchor.quote.text;

    var at = document.createElement("div");
    at.className = "attrib";
    at.appendChild(document.createTextNode("— "));
    var a = document.createElement("a");
    a.href = anchor.quote.href;
    a.target = "_blank";
    a.rel = "noopener";
    a.title = "Open the source";
    a.textContent = anchor.quote.who;
    at.appendChild(a);
    var where = document.createElement("span");
    where.className = "where";
    where.textContent = anchor.quote.where;
    at.appendChild(where);

    var tail = document.createElement("span"); tail.className = "tail";
    var tailIn = document.createElement("span"); tailIn.className = "tail-in";

    el.appendChild(q);
    el.appendChild(at);
    el.appendChild(tail);
    el.appendChild(tailIn);

    var h = {
      el: el, tail: tail, tailIn: tailIn,
      headX: anchor.headX, headY: anchor.headY,
      quote: anchor.quote,
      life: 0, held: false, pointerIn: false, focusIn: false,
      setHeld: function (v) { h.held = !!v; }
    };

    // a click inside the bubble must not read as a click-off-to-dismiss
    el.addEventListener("click", function (ev) { ev.stopPropagation(); });
    el.addEventListener("mouseenter", function () { h.pointerIn = true; });
    el.addEventListener("mouseleave", function () { h.pointerIn = false; });
    el.addEventListener("focusin", function () { h.focusIn = true; });
    el.addEventListener("focusout", function () { h.focusIn = false; });

    document.body.appendChild(el);
    place(h);
    live.push(h);
    // let layout settle so the fade actually animates from opacity 0
    window.requestAnimationFrame(function () { el.classList.add("in"); });
    return h;
  }

  function close(h) {
    var i = live.indexOf(h);
    if (i < 0) return;               // already closing; never double-remove
    live.splice(i, 1);
    h.el.classList.remove("in");
    window.setTimeout(function () {
      if (h.el.parentNode) h.el.parentNode.removeChild(h.el);
    }, 260);
  }

  function closeAll() {
    var all = live.slice();
    for (var i = 0; i < all.length; i++) close(all[i]);
    return all;
  }

  function openCount() { return live.length; }

  // Advance every open bubble's clock. Returns the handles that expired, so the caller
  // can send those readers back to their books.
  function tick(dt) {
    var closed = [], i, h, paused;
    for (i = live.length - 1; i >= 0; i--) {
      h = live[i];
      // any of these means the reader is still reading: over the bubble, over the
      // Bobit (the figure code's job, via setHeld), or tabbed into the link
      paused = h.held || h.pointerIn || h.focusIn;
      if (paused) continue;
      h.life += dt;
      if (h.life >= LIFE) { closed.push(h); close(h); }
    }
    return closed;
  }

  window.EVQuotes = {
    QUOTES: QUOTES, deal: deal, LIFE: LIFE,
    open: open, close: close, closeAll: closeAll, openCount: openCount, tick: tick
  };
})();
