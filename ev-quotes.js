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

  window.EVQuotes = { QUOTES: QUOTES, deal: deal };
})();
