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
      // Punctuation follows the JFK Library text exactly: no comma after "Democratic
      // answer", and an EN dash before "let us accept" (reprints substitute an em dash or a
      // full stop). He closes on a poet's verse — deliberately NOT included, since those are
      // another author's words and the bubble attributes everything in it to the speaker.
      text: "Let us not seek the Republican answer or the Democratic answer but the right answer. Let us not seek to fix the blame for the past – let us accept our own responsibility for the future.",
      who: "John F. Kennedy",
      where: "Loyola College Alumni Banquet, Baltimore, 18 February 1958",
      href: "https://www.jfklibrary.org/archives/other-resources/john-f-kennedy-speeches/baltimore-md-19580218"
    },

    // ── Added 3 August 2026. Same rule as above: the text is what the linked page says, not what
    //    circulates. Six of these twelve are misquoted in the wild and were corrected against the
    //    source — see presidential_quotes.md for which and how. Array order is chronological and
    //    carries no meaning; deal() shuffles.

    {
      // Elision marks the omitted "natural to party dissension, which in different ages and
      // countries has perpetrated the most horrid enormities" — a full clause, so it gets an ellipsis.
      text: "The alternate domination of one faction over another, sharpened by the spirit of revenge natural to party dissension… is itself a frightful despotism.",
      who: "George Washington",
      where: "Farewell Address, 19 September 1796",
      href: "https://www.govinfo.gov/content/pkg/CDOC-105sdoc22/html/CDOC-105sdoc22.htm"
    },
    {
      // "the interest and the duty", not "the interest and duty" — the second article is in the
      // source and is dropped in nearly every reproduction.
      text: "The common and continual mischiefs of the spirit of party are sufficient to make it the interest and the duty of a wise people to discourage and restrain it.",
      who: "George Washington",
      where: "Farewell Address, 19 September 1796",
      href: "https://www.govinfo.gov/content/pkg/CDOC-105sdoc22/html/CDOC-105sdoc22.htm"
    },
    {
      // "WHEREVER the people are well informed", not "whenever", and "well informed" is unhyphenated.
      // The "whenever … well-informed" version is the one in circulation and it is wrong on both
      // counts. The extract runs on from a preceding clause, so the initial capital is ours.
      text: "Wherever the people are well informed they can be trusted with their own government.",
      who: "Thomas Jefferson",
      where: "to Richard Price, 8 January 1789",
      href: "https://tjrs.monticello.org/letter/118"
    },
    {
      // Jefferson's spelling is "enquiry", twice — not "inquiry". And this is from the draft he
      // decided NOT to send, noting at its foot: "On further consideration, this letter was not
      // sent, mr Wendover's character & calling being entirely unknown." The sent version omits
      // the passage entirely, so `where` has to say draft or the citation is a fiction.
      text: "Difference of opinion leads to enquiry, and enquiry to truth; and that, I am sure, is the ultimate and sincere object of us both.",
      who: "Thomas Jefferson",
      where: "draft letter to Peter H. Wendover, 13 March 1815 (not sent)",
      href: "https://founders.archives.gov/documents/Jefferson/03-08-02-0270-0002"
    },
    {
      // Colon after "ignorance", not a semicolon, and Madison capitalises "Governors" — the
      // circulating version lowercases it and swaps the colon out.
      text: "Knowledge will forever govern ignorance: And a people who mean to be their own Governors, must arm themselves with the power which knowledge gives.",
      who: "James Madison",
      where: "to W. T. Barry, 4 August 1822",
      href: "https://press-pubs.uchicago.edu/founders/documents/v1ch18s35.html"
    },
    {
      // The circulating version ellipsises the middle away as "The ultimate rulers of our
      // democracy… are the voters of this country", which quietly deletes the whole point: the
      // list of officials who are NOT the ultimate rulers. Kept in full.
      text: "Let us never forget that government is ourselves and not an alien power over us. The ultimate rulers of our democracy are not a President and Senators and Congressmen and Government officials but the voters of this country.",
      who: "Franklin D. Roosevelt",
      where: "Address at Marietta, Ohio, 8 July 1938",
      href: "https://www.presidency.ucsb.edu/documents/address-marietta-ohio"
    },
    {
      // Second sentence kept: it is the payoff, it is in the source, and without it the first
      // sentence is a complaint rather than an argument.
      text: "Democracy cannot succeed unless those who express their choice are prepared to choose wisely. The real safeguard of democracy, therefore, is education.",
      who: "Franklin D. Roosevelt",
      where: "Message for American Education Week, 27 September 1938",
      href: "https://www.presidency.ucsb.edu/documents/message-for-american-education-week"
    },
    {
      text: "The point of voting is to exercise an intelligent choice. This means that every citizen must try to inform himself on the great problems of the day, to get the facts and debate them.",
      who: "Harry S. Truman",
      where: "Address Before the National Conference on Citizenship, 17 September 1952",
      href: "https://www.presidency.ucsb.edu/documents/address-before-the-national-conference-citizenship"
    },
    {
      // Same speech as above. The source reads "has a duty--a moral duty--to try"; the version in
      // circulation flattens that to "has a moral duty to try", losing the correction he is making
      // mid-sentence. Em dashes here are the Public Papers' "--" set properly.
      text: "But in a democracy, everyone engaged in politics has a duty—a moral duty—to try to keep public debate reasonable and based on a fair discussion of the issues.",
      who: "Harry S. Truman",
      where: "Address Before the National Conference on Citizenship, 17 September 1952",
      href: "https://www.presidency.ucsb.edu/documents/address-before-the-national-conference-citizenship"
    },
    {
      // The source sentence opens "For politics ought to be…"; dropping a conjunction needs no
      // ellipsis. What the popular truncation drops is the qualifier after "citizen", which is
      // most of the sentence and all of its meaning, so it stays.
      text: "Politics ought to be the part-time profession of every citizen who would protect the rights and privileges of free people and who would preserve what is good and fruitful in our national heritage.",
      who: "Dwight D. Eisenhower",
      where: "Address Recorded for the Republican Lincoln Day Dinners, 28 January 1954",
      href: "https://www.presidency.ucsb.edu/documents/address-recorded-for-the-republican-lincoln-day-dinners"
    },
    {
      // "they CAN be solved by man" — the widely-quoted "may be solved" softens it into something
      // he didn't say. "manmade" is one word in the Public Papers, which is what this link shows;
      // the JFK Library transcript hyphenates it. Text follows the link, as everywhere else here.
      // The ellipsis stands in for "And man can be as big as he wants."
      text: "Our problems are manmade—therefore, they can be solved by man… No problem of human destiny is beyond human beings.",
      who: "John F. Kennedy",
      where: "Commencement Address at American University, 10 June 1963",
      href: "https://www.presidency.ucsb.edu/documents/commencement-address-american-university-washington"
    },
    {
      // Full sentence: the famous short form lops off "Freedom is a fragile thing and it's", which
      // is where the image lives. Said as Governor of California, not as President — `where` says
      // so, the same way the Kennedy entry above names his 1958 Senate-era speech.
      text: "Freedom is a fragile thing and it's never more than one generation away from extinction. It is not ours by way of inheritance; it must be fought for and defended constantly by each generation, for it comes only once to a people.",
      who: "Ronald Reagan",
      where: "Inaugural Address as Governor of California, 5 January 1967",
      href: "https://www.reaganlibrary.gov/archives/speech/january-5-1967-inaugural-address-public-ceremony"
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
