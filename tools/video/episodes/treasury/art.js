// Episode 3 art — Treasury Tracker.
//
// Every function is a pure function of (ctx, t, W, H, scene). No module-level
// mutable state, or the determinism guarantee in tests/video/02-determinism.cjs
// is void for this episode. Everything is sized from W and H so the same code
// renders at 320x180 in the fixtures and at 1920x1080 in the episode, and the
// lower third is left clear because the cast draws on top.
//
// WHAT IS ON SCREEN IS REAL. Every figure, label, colour and heading below was
// read off treasurytracker.empowered.vote on 2026-10-12 and can be re-read with
// capture-data.mjs beside this file. This episode's own closing argument is
// that we show our work, so a segment invented to make a picture balance would
// undo it.
(function () {
  "use strict";
  var FG = "#F2F2F2", MUTED = "#9A9AA0", GRID = "#33333D", DIM = "#5A5A68";
  var CARD = "#1A1A20", EDGE = "#2C2C36";
  var FONT = '"Figtree", "Segoe UI", system-ui, sans-serif';
  // Type printed ON a bright chart segment. The live page uses near-black for
  // this, not white: every segment colour below is light enough that white type
  // on it would disappear.
  var ONSEG = "#10131A";

  // ── Los Angeles FY2024, Money Out ──────────────────────────────────────
  // The whole top level, TEN segments, in the order and the colours the live
  // chart draws them. `label` is what the page prints. `gov` is the
  // government's OWN wording, which the page keeps under each label — that
  // difference is not decoration, it IS L026, and the two are written once here
  // rather than twice in two draw functions.
  //
  // Ten, not nine: the first capture read only the bar and missed the last one,
  // which is 0.3% of the budget and four pixels wide at 1352px. capture-data.mjs
  // reads the detail cards as well for exactly that reason.
  //
  // FY2024 and not FY2025: Los Angeles has no FY2025 budget. Asking the live
  // site for year=2025 silently rewrites the page to dataset=salaries and the
  // Money In and Money Out figures disappear.
  var LA_OUT = [
    { label: "Government & Public Safety",     gov: "General Government and Public Safety",     amt: 5.60e9,  pct: 25.9, c: "#3AABB8" },
    { label: "City Electric Utility",          gov: "Electric Enterprise Fund",                 amt: 4.50e9,  pct: 20.8, c: "#FF5740" },
    { label: "Roads & Community Development",  gov: "Transportation and Community Development", amt: 3.50e9,  pct: 16.1, c: "#FED12E" },
    { label: "City Airport",                   gov: "Airport Enterprise Fund",                  amt: 2.20e9,  pct: 10.2, c: "#9788B8" },
    { label: "Health, Parks & Recreation",     gov: "Health and Culture and Leisure",           amt: 1.70e9,  pct:  7.7, c: "#74B589" },
    { label: "City Water Utility",             gov: "Water Enterprise Fund",                    amt: 1.50e9,  pct:  7.2, c: "#59B0C4" },
    { label: "Debt Payments & Major Projects", gov: "Debt Service and Capital Outlay",          amt: 1.30e9,  pct:  6.2, c: "#C2674A" },
    { label: "City Sewer & Wastewater",        gov: "Sewer Enterprise Fund",                    amt: 756.8e6, pct:  3.5, c: "#D4940B" },
    { label: "City Harbor or Port",            gov: "Harbor and Port Enterprise Fund",          amt: 461.1e6, pct:  2.1, c: "#4D8FC2" },
    { label: "Other City Business Activities", gov: "Other Enterprise Fund",                    amt:  65.9e6, pct:  0.3, c: "#8F9EBC" }
  ];

  // Money In, same year, same palette order. Only the five the page labels are
  // listed; the rest are too narrow for a name on the real chart too.
  //
  // "Everything else" is the sixth, and it is not decoration. icicle() scales a
  // row to the sum of what it is HANDED, so five segments adding to $17.9B under
  // a card printing $21.6B would draw every one of them 21% too wide and lose
  // $3.7B without a mark. This bar is on screen from L014 on, so it needs the
  // remainder for the same reason FED_OUT does.
  var LA_IN = [
    { label: "Tax Revenue",           amt: 6.5e9, c: "#3AABB8" },
    { label: "City Electric Utility", amt: 5.2e9, c: "#FF5740" },
    { label: "City Airport",          amt: 2.4e9, c: "#FED12E" },
    { label: "Service Fees",          amt: 2.0e9, c: "#9788B8" },
    { label: "City Water Utility",    amt: 1.8e9, c: "#74B589" },
    { label: "Everything else",       amt: 3.7e9, c: "#59B0C4" }
  ];

  // The three cards above the chart, in the product's own words and order.
  // Indexed by CARD, not by the order the script names them — the script says
  // money out first. Two arrays read at the same index that were never in the
  // same order put every label on the wrong row in episode 2.
  var LA_CARDS = [
    { head: "Money In",  amt: 21.6e9, sub: "Where funds come from" },
    { head: "Money Out", amt: 21.5e9, sub: "How funds are spent" },
    { head: "Employees", amt: 7.4e9,  sub: "Employee compensation" }
  ];

  // Employee compensation, department by department: what the live page draws
  // when the Employees card is chosen. Read on 2026-10-13 from the FY2024
  // salaries budget; the 46 departments add to $7,352,642,554, which is the
  // $7.4B the card prints.
  //
  // Only the twelve the bar can label are listed by name. The rest are rolled
  // into "Everything else" rather than dropped, because icicle scales a row to
  // the sum of what it is handed and a short table draws every segment too
  // wide — the fault that made every federal segment 7.5% wrong.
  var LA_STAFF = [
    { label: "Water and Power",     amt: 2120531853, c: "#3AABB8" },
    { label: "Police",              amt: 1727460783, c: "#FF5740" },
    { label: "Fire",                amt:  814652107, c: "#FED12E" },
    { label: "Airports",            amt:  360702576, c: "#9788B8" },
    { label: "Sanitation",          amt:  350666022, c: "#74B589" },
    { label: "Parks & Recreation",  amt:  227361251, c: "#59B0C4" },
    { label: "Transportation",      amt:  185126089, c: "#C2674A" },
    { label: "City Attorney",       amt:  161250991, c: "#D4940B" },
    { label: "General Services",    amt:  146386988, c: "#4D8FC2" },
    { label: "Harbor",              amt:  136119145, c: "#8F9EBC" },
    { label: "Street Services",     amt:  129338611, c: "#3AABB8" },
    { label: "Building & Safety",   amt:  125534407, c: "#FF5740" },
    { label: "Everything else",     amt:  867511723, c: "#5A5A68" }
  ];

  // One drill, all the way to the line items. The breadcrumb is the page's.
  var LA_DRILL = {
    crumb: ["United States", "California", "Los Angeles County", "Los Angeles",
            "Budget", "Government & Public Safety", "Public Safety"],
    level1: [
      { label: "Public Safety",      amt: 4.80e9,  c: "#3AABB8" },
      { label: "General Government", amt: 765.1e6, c: "#FF5740" }
    ]
  };

  // The line items under Public Safety, as filed. BUDGETED AND ACTUAL ARE THE
  // SAME NUMBER and the variance column reads a dash — that is what Los Angeles
  // reports, and the page's own legend says "On Budget". Two identical columns
  // is a duller picture than a drifting one and it is the true one.
  var LA_ITEMS = {
    head: "Detailed breakdown of 6 expenditures in Public Safety",
    cols: ["DESCRIPTION", "BUDGETED", "ACTUAL", "VARIANCE"],
    rows: [
      { desc: "Police_Current Expenditures",                     budget: 3260624265, actual: 3260624265 },
      { desc: "Fire_Current Expenditures",                       budget:  846784379, actual:  846784379 },
      { desc: "Emergency Medical Services_Current Expenditures", budget:  435033126, actual:  435033126 },
      { desc: "Street Lighting_Current Expenditures",            budget:  139093425, actual:  139093425 },
      { desc: "Animal Regulation_Current Expenditures",          budget:   69104971, actual:   69104971 },
      { desc: "Disaster Preparedness_Current Expenditures",      budget:   50677794, actual:   50677794 }
    ],
    total: 4801317960,
    legend: ["Under Budget", "On Budget", "Over Budget"]
  };

  // Public Safety's programmes: the THIRD row of the drill, and the same six
  // rows the line-item table under the bar prints. L008 is "the department
  // breaks into its divisions, a division breaks into its programs" — two
  // drills — and only the first was drawn, so the second half of the sentence
  // had no picture and the line items that followed arrived from a level the
  // viewer had never been shown.
  //
  // Derived from LA_ITEMS rather than typed again. Two copies of six numbers is
  // how a bar stops agreeing with the table beneath it, and they are the same
  // six numbers: they add to $4,801,317,960, which is Public Safety.
  //
  // "_Current Expenditures" is the account type in the filing, not the name of
  // the programme, so the segment carries the programme and the table below
  // keeps the filing's own wording in full.
  var DRILL_C = ["#3AABB8", "#FF5740", "#FED12E", "#9788B8", "#74B589", "#59B0C4"];
  LA_DRILL.level2 = [];
  for (var li = 0; li < LA_ITEMS.rows.length; li++) {
    LA_DRILL.level2.push({
      label: LA_ITEMS.rows[li].desc.split("_")[0],
      amt: LA_ITEMS.rows[li].budget,
      c: DRILL_C[li % DRILL_C.length]
    });
  }

  // FIVE years of EVERY top-level segment, in LA_OUT's order, so "change the
  // year and the whole shape redraws" can redraw the whole shape rather than
  // two of it. `amt` in dollars, exactly as the API reports it; `pct` is the
  // share the page prints.
  //
  // Read on 2026-10-13 from api.empowered.vote/api/treasury, the all_funds
  // operating budget for each year — the same scope the page draws, which is
  // why FY2024 here is the same $21,517,484,103 LA_OUT adds up to. The first
  // version of this table was read off the rendered bar and rounded to two
  // figures; these are the filed numbers.
  //
  // FY2020 is here because the year picker in L016 opens on it: Chris asked
  // for a year to be chosen on screen rather than implied, and 2020 is the
  // earliest year the live picker offers for Los Angeles that still carries a
  // Money Out budget.
  //
  // One thing the live chart does that this does not: it re-sorts the segments
  // by size each year, so Water and Health swap places between FY2022 and
  // FY2023. Re-sorting mid-animation would be a frame of chaos and would stop
  // the viewer following any one segment, which is the whole point of the
  // chapter. Each segment therefore keeps its place and its colour, and only
  // its width moves.
  var YEAR_ROWS = [
    { year: 2020, total: 16988602989,
      amt: [4737622598, 3816544856, 2005479186, 1684906626, 1383307429,
            1184168094, 976500715, 678494397, 469441000, 52138088],
      pct: [27.9, 22.5, 11.8, 9.9, 8.1, 7.0, 5.7, 4.0, 2.8, 0.3] },
    { year: 2021, total: 17310021336,
      amt: [4744356917, 3886406011, 2185683267, 1558198506, 1351162513,
            1293736555, 1183412819, 616340044, 453878000, 36846704],
      pct: [27.4, 22.5, 12.6, 9.0, 7.8, 7.5, 6.8, 3.6, 2.6, 0.2] },
    { year: 2022, total: 18439009336,
      amt: [4860582084, 4352657000, 2417638611, 1742406864, 1404751112,
            1487766000, 1012591665, 673122000, 444157000, 43337000],
      pct: [26.4, 23.6, 13.1, 9.4, 7.6, 8.1, 5.5, 3.7, 2.4, 0.2] },
    { year: 2023, total: 19535449964,
      amt: [4975852376, 4698985919, 2523153705, 2050092709, 1542508905,
            1476344788, 898480702, 801431812, 512682940, 55916108],
      pct: [25.5, 24.1, 12.9, 10.5, 7.9, 7.6, 4.6, 4.1, 2.6, 0.3] },
    { year: 2024, total: 21517484103,
      amt: [5566403825, 4469616159, 3465929518, 2203928039, 1660295337,
            1538668516, 1328902295, 756821264, 461054977, 65864173],
      pct: [25.9, 20.8, 16.1, 10.2, 7.7, 7.2, 6.2, 3.5, 2.1, 0.3] }
  ];


  // One year's segments, in LA_OUT's order, ready for icicle().
  function yearSegs(i) {
    var row = YEAR_ROWS[i], out = [];
    for (var k = 0; k < LA_OUT.length; k++) {
      out.push({ label: LA_OUT[k].label, c: LA_OUT[k].c, amt: row.amt[k], pct: row.pct[k] });
    }
    return out;
  }
  // The same, between two years, so a year change is a move rather than a cut.
  function yearSegsBetween(a, b, u) {
    var A = YEAR_ROWS[a], B = YEAR_ROWS[b], out = [];
    for (var k = 0; k < LA_OUT.length; k++) {
      var amt = A.amt[k] + (B.amt[k] - A.amt[k]) * u;
      out.push({ label: LA_OUT[k].label, c: LA_OUT[k].c, amt: amt,
                 pct: A.pct[k] + (B.pct[k] - A.pct[k]) * u });
    }
    return out;
  }

  // The four governments, FY2024, outermost first. `perPerson` is the figure
  // the page itself computes and prints; nothing here divides.
  // `segs` is filled in after the segment tables are declared, below.
  var LEVELS = [
    { name: "United States",      out: 7195.8e9, perPerson: null,     segs: null },
    { name: "California",         out:  190.3e9, perPerson: "$4,818", segs: null },
    { name: "Los Angeles County", out:   37.6e9, perPerson: "$3,752", segs: null },
    { name: "Los Angeles",        out:   21.5e9, perPerson: "$5,548", segs: null }
  ];

  // The federal top level, FY2024, by what it is for. Nine named segments is as
  // many as the frame holds, and the tenth entry is the rest of the budget by
  // subtraction so the bar is scaled to the whole of it.
  var FED_OUT = [
    { label: "Social Security",          amt: 1460.9e9, c: "#3AABB8" },
    { label: "Interest on the debt",     amt: 1133.0e9, c: "#FF5740" },
    { label: "Health care programs",     amt:  911.3e9, c: "#FED12E" },
    { label: "Medicare",                 amt:  874.1e9, c: "#9788B8" },
    { label: "National defense",         amt:  873.5e9, c: "#74B589" },
    { label: "Income support programs",  amt:  670.5e9, c: "#59B0C4" },
    { label: "Veterans benefits",        amt:  329.2e9, c: "#C2674A" },
    { label: "Education & job training", amt:  306.4e9, c: "#D4940B" },
    { label: "Transportation",           amt:  136.6e9, c: "#4D8FC2" },
    // The nine above sum to $6,695.5B. Money Out is $7,195.8B, and icicle
    // scales every row to the sum of what it is handed — so without this the
    // bar drew each segment 7.5% too wide while printing a total it was not
    // scaled to. The spec's own rule: a drawn segment must never silently
    // stand for several, so the remainder is named and sized.
    { label: "Everything else",          amt:  500.3e9, c: "#55555F" }
  ];
  // The federal toggles, in the product's own words.
  var FED_TOGGLE = ["What it's for", "Who spends it"];
  var FED_SCALE = ["$", "Per person"];
  // What the page itself prints in per-person mode. Coarse, because the page
  // rounds it that way — and that coarseness is L023's point: a share of it is
  // a number a person can hold. Nothing here divides anything.
  var FED_PERPERSON = ["$4K", "$3K", "$3K", "$3K", "$3K", "$2K", "$1K", "$1K", "$402"];

  // The same federal money by WHO SPENDS IT. A genuinely different picture: by
  // purpose Social Security leads at $1,460.9B, by department Health and Human
  // Services leads at $1,902.3B. That is L021's whole claim and it is true.
  var FED_BY_DEPT = [
    { label: "Health and Human Services",     amt: 1902.3e9, c: "#3AABB8" },
    { label: "Social Security Administration", amt: 1519.7e9, c: "#FF5740" },
    { label: "The Treasury",                  amt: 1382.1e9, c: "#FED12E" },
    { label: "Defense — Military Programs",   amt:  829.1e9, c: "#9788B8" },
    { label: "Veterans Affairs",              amt:  334.4e9, c: "#74B589" },
    { label: "Education",                     amt:  273.1e9, c: "#59B0C4" },
    { label: "Agriculture",                   amt:  209.3e9, c: "#C2674A" },
    { label: "Personnel Management",          amt:  126.2e9, c: "#D4940B" },
    { label: "Transportation",                amt:  118.4e9, c: "#4D8FC2" },
    { label: "Homeland Security",             amt:  105.2e9, c: "#8F9EBC" },
    // Same arithmetic: the ten above sum to $6,799.8B of the same $7,195.8B.
    { label: "Everything else",               amt:  396.0e9, c: "#55555F" }
  ];

  // Los Angeles County and California, FY2024, their whole top levels. Read off
  // the bar's own title attributes rather than the detail cards: the cards miss
  // any segment a few pixels wide, and a bar drawn from an incomplete list
  // misstates every proportion in it. These sum to 99.4% and 100.2%, which is
  // the page's own rounding.
  var COUNTY_OUT = [
    { label: "Public Protection",                amt: 9.40e9,  c: "#3AABB8" },
    { label: "Public Assistance",                amt: 9.10e9,  c: "#FF5740" },
    { label: "Ways, Health & Sanitation",        amt: 8.30e9,  c: "#FED12E" },
    { label: "Hospitals",                        amt: 6.30e9,  c: "#9788B8" },
    { label: "General Government",               amt: 2.00e9,  c: "#74B589" },
    { label: "Debt & Major Projects",            amt: 816.1e6, c: "#59B0C4" },
    { label: "Shared Services",                  amt: 807.9e6, c: "#C2674A" },
    { label: "Education, Recreation & Culture",  amt: 705.4e6, c: "#D4940B" },
    { label: "Water Utility",                    amt: 118.5e6, c: "#4D8FC2" },
    { label: "Airport",                          amt:  20.0e6, c: "#8F9EBC" }
  ];
  var STATE_OUT = [
    { label: "Education",                     amt: 86.4e9,  c: "#3AABB8" },
    { label: "Health & Human Services",       amt: 64.1e9,  c: "#FF5740" },
    { label: "Corrections & Rehabilitation",  amt: 14.5e9,  c: "#FED12E" },
    { label: "General Government",            amt: 10.4e9,  c: "#9788B8" },
    { label: "Natural Resources",             amt:  6.4e9,  c: "#74B589" },
    { label: "Interest & Fiscal Charges",     amt:  3.0e9,  c: "#59B0C4" },
    { label: "Bond & Lease Principal",        amt:  3.0e9,  c: "#C2674A" },
    { label: "Business, Services & Housing",  amt:  1.1e9,  c: "#D4940B" },
    { label: "Transportation",                amt:  1.0e9,  c: "#4D8FC2" },
    { label: "Capital Outlay",                amt: 254.5e6, c: "#8F9EBC" }
  ];

  // The method panel on the federal view. SEVEN REAL HEADINGS — the four L027
  // names and three it does not claim. The BODY under each one stays as
  // rule-lines and is never written out: a drawn sentence presented as the
  // product's own words is a claim, and inventing one to show how careful the
  // real ones are would undo the chapter. Episode 1's source card is drawn the
  // same way for the same reason.
  var METHOD = {
    head: "How to read these numbers",
    rows: ["What we count",
           "Why the spending visual totals more than the official number",
           "Negative money isn't hidden",
           "Partial year",
           "How deep the data goes",
           "Can these numbers be audited?",
           "Scale modes"]
  };

  // Every level cites a DIFFERENT document. Chapter 6 claims "every view names
  // its source", so one reused line would make that chapter say something false.
  var SOURCES = {
    "Los Angeles":      { name: "CA State Controller - Expenditures", asOf: "as of 2026-08-20" },
    "Los Angeles County": { name: "CA State Controller - County Expenditures", asOf: "as of 2026-06-16" },
    "California":       { name: "California State ACFR — General Fund", asOf: "as of 2024-06-30" },
    "United States":    { name: "OMB Historical Tables", asOf: "as of 2026-06-12" }
  };
  var WORDING = { gov: "Government-reported", ours: "computed by Treasury Tracker" };
  // The chart's own heading and blurb, and the note it prints under its top
  // level. All three are the live page's words.
  var CHART_HEAD = "How Los Angeles spends its budget";
  var CHART_SUB = "Each segment shows the share of the total budget.";
  // One heading per card, because the three cards are a selector and the bar
  // under them changes with it. Leaving "How Los Angeles spends its budget"
  // above the Money In bar labelled revenue as spending, which is the exact
  // confusion L015 says this chapter exists to prevent.
  var CARD_HEAD = {
    "in":    ["Where Los Angeles's budget comes from",
              "Each segment shows the share of all funds received."],
    "out":   [CHART_HEAD, CHART_SUB],
    "staff": ["What Los Angeles pays the people who work for it",
              "Each segment is one department's share of the payroll."]
  };
  var BASIS = "Top-level descriptions from GASB Statement No. 34 — Basic Financial Statements.";
  // What the site says when it does not have a government. Confirmed live.
  var NOTFOUND = "We couldn't find a government matching";

  // The fund codes chapter 1's document is full of. These are the codes Chris
  // reads aloud — imaginary examples either way, so the only thing that matters
  // is that the prop agrees with the narration.
  var CODES = ["FUND 010", "DEPARTMENT 08", "ACCOUNT 42010"];

  // Each level's own segments, hung on LEVELS now that all four tables exist.
  // One list per government, so drawLevels cannot pair a name with somebody
  // else's bar — the fault episode 2 shipped when two arrays were read at the
  // same index and were never in the same order.
  LEVELS[0].segs = FED_OUT;
  LEVELS[1].segs = STATE_OUT;
  LEVELS[2].segs = COUNTY_OUT;
  LEVELS[3].segs = LA_OUT;

  // ── Helpers ────────────────────────────────────────────────────────────
  // Images decode asynchronously, so the renderer waits on window.EVArt.ready
  // before frame 0. A missing asset resolves at once rather than hanging the
  // render: the drawing degrades instead.
  function load(uri) {
    var img = new Image();
    var ready = new Promise(function (res) {
      if (!uri) return res();
      img.onload = res; img.onerror = res;
    });
    if (uri) img.src = uri;
    return { img: img, ready: ready };
  }
  var logoA = load(window.EVTreasuryLogo);
  var shotA = load(window.EVTreasuryShot);
  var logo = logoA.img, shot = shotA.img;

  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function fade(t, t0, dur) { return ease((t - t0) / dur); }
  // An entrance, unless the thing is already on screen. A scene that carries on
  // from the one before says `continues: true` and nothing in it fades in again
  // — the blink at every cut is the first thing a reviewer sees.
  function arrive(scene, t, t0, dur) { return scene.continues ? 1 : fade(t, t0, dur); }
  // The same idea for one thing inside a scene. Zero means "it was already
  // there", not "it starts now": only a POSITIVE time animates.
  function since(t, t0, dur) { return t0 > 0 ? fade(t, t0, dur) : 1; }

  // A thing inside a scene has THREE states, not two, and the missing third one
  // put four things on screen one to two scenes early in episode 2:
  //
  //   undefined   not in this scene at all
  //   0           already on screen before this scene started
  //   > 0         arrives at that second
  //
  // `since` cannot tell the first two apart, because a field nobody set reads
  // as zero and zero means "already there". So every optional thing asks for
  // its field by NAME, and a scene that wants to keep something says so with an
  // explicit 0.
  function at(scene, key, t, dur) {
    var t0 = scene[key];
    if (t0 == null) return 0;
    return since(t, t0, dur);
  }
  // The same three states for one entry of an array field.
  function atIndex(arr, i, t, dur) {
    if (!arr || arr[i] == null) return 0;
    return since(t, arr[i], dur);
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // The split, without drawing. A box that grows to hold its sentence has to
  // know how many lines that sentence took before it draws the box. A fixed
  // height is a bug waiting for the next line of copy.
  function wrapLines(ctx, s, maxW) {
    var words = String(s).split(" "), out = [], line = "";
    for (var i = 0; i < words.length; i++) {
      var next = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(next).width > maxW && line) { out.push(line); line = words[i]; }
      else { line = next; }
    }
    if (line) out.push(line);
    return out;
  }
  function wrap(ctx, s, x, y, maxW, lineH) {
    var lines = wrapLines(ctx, s, maxW);
    for (var i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + i * lineH);
    return lines.length;
  }
  // One panel, one border, one radius, everywhere. Six hand-rolled panels drift
  // apart by a pixel each and the frame stops looking built.
  function panel(ctx, x, y, w, h, H, alpha, accent) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = CARD;
    roundRect(ctx, x, y, w, h, H * 0.018); ctx.fill();
    ctx.strokeStyle = accent || EDGE;
    ctx.lineWidth = Math.max(1, H * 0.0025);
    ctx.stroke();
    ctx.restore();
  }
  // The product's own short form: $21.5B, $756.8M, $65.9M.
  function money(n) {
    if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return "$" + Math.round(n / 1e3) + "K";
    return "$" + Math.round(n);
  }
  function moneyFull(n) {
    var s = String(Math.round(n)), out = "";
    for (var i = 0; i < s.length; i++) {
      out += s.charAt(i);
      var left = s.length - 1 - i;
      if (left > 0 && left % 3 === 0) out += ",";
    }
    return "$" + out;
  }
  function label(ctx, s, x, y, size, color, weight, align) {
    ctx.fillStyle = color;
    ctx.font = (weight || "500") + " " + Math.round(size) + "px " + FONT;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s, x, y);
  }
  // The same, but it never prints wider than the room it was given.
  //
  // One line of type that does not fit its card is this series' most repeated
  // fault — four times across two episodes, each fixed where it happened, which
  // is why it happened again somewhere else. Anything printed inside a box goes
  // through here, and the caller passes the width of the box rather than hoping.
  //
  // It shrinks rather than clips or wraps: a clipped word is a word cut in half,
  // and a line that wraps changes the height of whatever holds it.
  var MINSIZE = 0.55;
  // Would this label fit at all, even shrunk as far as fitLabel will go?
  //
  // fitLabel shrinks and then prints whatever is left, which is right inside a
  // card that is always big enough. It is wrong on a chart segment: a segment
  // is as wide as its share of the money, the smallest real one is 0.3% of the
  // budget, and a label printed into it runs under the next segment and is cut
  // in half by it. So the chart asks first and prints nothing where the answer
  // is no — which is exactly what the live page does.
  function fits(ctx, s, maxW, size) {
    ctx.font = "700 " + Math.round(size * MINSIZE) + "px " + FONT;
    return ctx.measureText(s).width <= maxW;
  }
  function fitLabel(ctx, s, x, y, maxW, size, color, weight, align) {
    ctx.font = (weight || "500") + " " + Math.round(size) + "px " + FONT;
    var got = ctx.measureText(s).width;
    if (got > maxW) size = Math.max(size * MINSIZE, size * maxW / got);
    label(ctx, s, x, y, size, color, weight, align);
    return size;
  }
  // ── A segment's own name ───────────────────────────────────────────────
  // A chart segment is as wide as its share of the money, so most names do not
  // fit on one line in it. fitLabel's answer is to shrink, and shrink is what
  // shipped: "Roads & Community Development" set at MINSIZE on a segment 16% of
  // the bar wide — legible on a 1920 canvas and unreadable on the phone most of
  // this will be watched on.
  //
  // A segment has the HEIGHT for two lines and does not have the width for one,
  // so the name takes two lines before it takes a smaller size. Below SEG_MIN
  // it is not printed at all: a name set at two thirds is a name nobody reads,
  // and a name that runs under its neighbour is worse than no name.
  var SEG_MIN = 0.74;

  // The split point that makes the two lines as even as possible. Greedy
  // wrapping puts "Development" alone on line two and sets the whole label to
  // the width of line one, which is the thing being avoided.
  function split2(ctx, s) {
    var words = String(s).split(" ");
    if (words.length < 2) return null;
    var best = null, bestW = Infinity;
    for (var k = 1; k < words.length; k++) {
      var a = words.slice(0, k).join(" "), b = words.slice(k).join(" ");
      var w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
      if (w < bestW) { bestW = w; best = [a, b]; }
    }
    return { lines: best, width: bestW };
  }

  // Draw a segment's name, and its amount where there is a row tall enough to
  // carry one. Returns false where the name does not fit at all, so the caller
  // can leave the segment bare rather than print into its neighbour.
  function segLabel(ctx, name, amt, x, y, w, h, size, two) {
    ctx.font = "700 " + Math.round(size) + "px " + FONT;
    var oneW = ctx.measureText(name).width;
    var s1 = oneW > 0 ? Math.min(1, w / oneW) : 1;
    var pair = two ? split2(ctx, name) : null;
    var s2 = pair && pair.width > 0 ? Math.min(1, w / pair.width) : 0;

    var lines, scale;
    // Nearly fitting on one line counts as fitting: "City Airport" set as
    // "City" over "Airport" to save four per cent is two lines for nothing.
    if (s1 >= 0.92) { lines = [name]; scale = Math.min(1, s1); }
    else if (s2 >= s1) { lines = pair.lines; scale = s2; }
    else { lines = [name]; scale = s1; }
    if (scale < SEG_MIN) return false;

    var px = Math.round(size * scale);
    var lead = px * 1.2;                       // between the two name lines

    // THREE registers have to fit in the row: name line one, name line two
    // where there is one, and the amount. A row drawn at rowScale 0.60 is two
    // thirds of the height the main bar's row is, and the fixed baselines that
    // fit three registers in one put the amount straight through the second
    // line of the name in the other — which is what the four-government frame
    // shipped looking like.
    //
    // So the baselines come from the room there is. The amount stays on one
    // baseline for the whole row wherever it can, because a row of segments
    // whose figures sit at three heights stops reading as a row.
    var amtY = h * 0.82;
    var top = h * (lines.length === 2 ? 0.30 : (amt ? 0.44 : 0.62));
    if (lines.length === 2 && amt) {
      var need = top + lead + px * 1.05;
      if (need > amtY) amtY = Math.min(h - px * 0.28, need);
      if (need > amtY) top = amtY - lead - px * 1.05;
      // Still no room: the row is too short to carry a name on two lines at
      // all, so it carries one line or none, which fits() already decides.
      if (top < px * 0.95) {
        if (s1 < SEG_MIN) return false;
        lines = [name];
        px = Math.round(size * Math.min(1, s1));
        top = h * 0.44;
        amtY = h * 0.82;
      }
    }

    ctx.fillStyle = ONSEG;
    ctx.font = "700 " + px + "px " + FONT;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(lines[0], x, y + top);
    if (lines.length === 2) ctx.fillText(lines[1], x, y + top + lead);
    if (amt) {
      fitLabel(ctx, amt, x, y + amtY, w, size * 0.95,
               "rgba(16,19,26,0.78)", "600", "left");
    }
    return true;
  }

  // A row of grey rule-lines standing for text nobody is meant to read. Used by
  // the budget document, and by the method panel, where writing the real body
  // out would be inventing the product's own words.
  function ruleLines(ctx, x, y, w, n, lineH, alpha, seed) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = GRID;
    for (var i = 0; i < n; i++) {
      // deterministic widths: tests/video/02-determinism.cjs renders the same
      // frame twice and compares, so Math.random() here would fail the episode.
      var k = (seed + i * 7919) % 13;
      var ww = w * (0.55 + k * 0.034);
      ctx.fillRect(x, y + i * lineH, ww, Math.max(1, lineH * 0.30));
    }
    ctx.restore();
  }

  // ── The one budget bar ─────────────────────────────────────────────────
  // Every bar in chapters 2 to 5 is drawn by this. The real component is
  // BudgetIcicle in C:\treasury-tracker, and the live page draws it as a COLUMN
  // of horizontal bars: each ancestor level compressed, the current level at
  // full height, segments across the whole width sized by money, a breadcrumb
  // above. Measured off the live chart on 2026-10-12 at a 1600px viewport:
  // ancestor rows 32px, current row 64px, bar 1352px wide. Those are the
  // proportions below, as fractions of a 1080-tall frame.
  //
  // Nothing else in this file draws a bar. Three chapters use this and differ
  // only in what they hand it. Episode 2 learned why the hard way: two arrays
  // read at the same index were never in the same order, and every label sat on
  // the wrong row.
  //
  //   rows  [{ segs: [{label, amt, c}], current: bool }]  ancestors first
  //   o     { x, y, w, H, alpha, labelAlpha, minLabelPx, openIndex, openGrow,
  //           divide }
  //
  // Returns the y below the last row, so a caller can put line items under the
  // bar without keeping a second copy of the row heights.
  // The live page draws the current row at 64px and each ancestor at 32px, in a
  // 1600-wide browser window. Those pixel heights are not copied: 64px of a
  // 1080-tall frame is a stripe, and this picture has to carry a chapter at
  // arm's length rather than sit in a page full of other things. What IS kept
  // is the RATIO — an ancestor is half the height of the current row — because
  // that ratio is the component's idea: where you are is twice as important as
  // where you have been. Everything is scaled by the same factor, so the
  // proportions the spec calls faithful are the proportions on screen.
  var SCALE = 2.2;
  var ROW_ANC = (32 / 1080) * SCALE, ROW_CUR = (64 / 1080) * SCALE, ROW_GAP = 6 / 1080;
  // Everything that was NOT chosen, as a fraction of its own strength. A drill
  // that leaves the row above it untouched never says which segment was
  // opened, which is the first thing a viewer asks of the picture.
  var DIMMED = 0.26;

  // Where one segment sits inside its own row, as two fractions of the row's
  // width. The drill animates out of this span, so the child row is seen to
  // come from the segment it came from.
  function spanOf(segs, i) {
    var total = 0, before = 0, k;
    for (k = 0; k < segs.length; k++) total += segs[k].amt;
    for (k = 0; k < i; k++) before += segs[k].amt;
    if (!(total > 0)) return [0, 1];
    return [before / total, (before + segs[i].amt) / total];
  }

  function icicle(ctx, rows, o) {
    var H = o.H, w = o.w, x = o.x, y = o.y;
    var alpha = o.alpha == null ? 1 : o.alpha;
    var gap = Math.max(1, H * ROW_GAP);
    // A label only where the label FITS. The smallest real segment is 0.3% of
    // the bar — four pixels of 1352 — and "Other City Business Activities" is
    // thirty characters. Printing it anyway writes over its neighbours.
    var minLabel = o.minLabelPx == null ? w * 0.075 : o.minLabelPx;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      // `current` is a NUMBER, not a flag: a row that is becoming an ancestor
      // because the drill went one level deeper has to travel between the two
      // heights rather than halve between one frame and the next. true and
      // false still read as 1 and 0, so every caller that names a flag is
      // unchanged.
      var cur = row.current === true ? 1 : (row.current ? row.current : 0);
      var alive = row.alive == null ? 1 : row.alive;
      var h = Math.max(0, Math.round(H * (ROW_ANC + (ROW_CUR - ROW_ANC) * cur) *
                                     (o.rowScale == null ? 1 : o.rowScale) * alive));
      if (h <= 0) continue;
      var total = 0, i;
      for (i = 0; i < row.segs.length; i++) total += row.segs[i].amt;

      // A row that has just been opened out of one segment of the row above
      // starts the width of THAT segment and grows to the full bar. Without
      // this the children appear full width under an untouched parent and the
      // frame never shows the expansion it is describing.
      var rx = x, rw = w;
      if (row.growFrom && row.growFrom.u < 1) {
        var sp = row.growFrom.span, u = row.growFrom.u;
        rx = x + w * sp[0] * (1 - u);
        rw = w * (sp[1] - sp[0]) * (1 - u) + w * u;
      }

      var cx = rx;
      for (i = 0; i < row.segs.length; i++) {
        var s = row.segs[i];
        var sw = total > 0 ? rw * (s.amt / total) : 0;
        // `divide` runs 0 -> 1 as one undivided bar becomes its segments: at 0
        // every segment is an equal slice of plain grey, at 1 it is sized and
        // coloured. This is L006's "every department is a slice of it, sized by
        // what it actually receives", in that order.
        if (o.divide != null && o.divide < 1) {
          sw = (rw / row.segs.length) * (1 - o.divide) + sw * o.divide;
        }
        // One segment opening toward the full width, the rest closing.
        if (cur >= 1 && o.openIndex != null && o.openGrow > 0) {
          sw = o.openIndex === i ? sw + (rw - sw) * o.openGrow : sw * (1 - o.openGrow);
        }
        // Everything that was not chosen steps back, by the same amount the
        // choice itself arrived by, so the dimming and the drill are one move.
        var strength = 1;
        if (row.focus != null && row.focus !== i) {
          strength = 1 - (row.focusAmt == null ? 1 : row.focusAmt) * (1 - DIMMED);
        }
        // The colour FADES UP over the same move that sizes the segment. It
        // used to flip from grey to colour at divide 0.5, which read as the
        // bar resizing a second time — "the sections of the bar move when they
        // are colored, and then they move again when we put labels on it".
        // There is one move now, and nothing moves after it.
        var dv = o.divide == null ? 1 : o.divide;
        ctx.globalAlpha = alpha * strength;
        ctx.fillStyle = GRID;
        ctx.fillRect(Math.round(cx), Math.round(y), Math.max(0, Math.round(sw) - 1), h);
        if (dv > 0) {
          ctx.globalAlpha = alpha * strength * dv;
          ctx.fillStyle = s.c;
          ctx.fillRect(Math.round(cx), Math.round(y), Math.max(0, Math.round(sw) - 1), h);
          ctx.globalAlpha = alpha * strength;
        }

        // The name, on the current row AND on the ancestors above it. Dropping
        // every ancestor label is how the drill lost the one word that made it
        // a drill: the row above has to keep saying "Government & Public
        // Safety" or the row below is children of nothing.
        var labelOn = o.labelAlpha == null ? 1 : o.labelAlpha;
        if (sw >= minLabel && labelOn > 0) {
          var pad = Math.max(4, h * 0.15);
          ctx.save();
          ctx.globalAlpha = alpha * strength * labelOn;
          // `shown` is a figure the PAGE prints that is not this segment's
          // dollar amount — the per-person mode's own rounding, for one. The
          // bar is still sized by the money either way, so the shape does not
          // change when the scale does, which is what the live toggle does.
          segLabel(ctx, s.label, cur >= 0.5 ? (s.shown || money(s.amt)) : null,
                   cx + pad, y, sw - pad * 2, h,
                   H * (cur >= 0.5 ? 0.022 : 0.017), cur >= 0.5);
          ctx.restore();
        }
        cx += sw;
      }
      ctx.globalAlpha = alpha;
      y += h + gap * alive;
    }
    ctx.restore();
    return y;
  }

  // The trail above the bar. `shown` is how many parts are visible, so L009 can
  // build it one step at a time without a second copy of the list.
  function breadcrumb(ctx, parts, shown, x, y, W, H, alpha, glow) {
    if (alpha <= 0 || shown <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    var size = H * 0.020, cx = x;
    var n = Math.min(shown, parts.length);
    // L009 is "the trail at the top always tells you where you are standing",
    // and by then the trail is already complete — there is nothing left for it
    // to build. So the beat is the trail being POINTED AT rather than grown: a
    // rule under it, drawn in the accent, arriving as he says the words.
    if (glow > 0) {
      var wTot = 0, g;
      ctx.font = "500 " + Math.round(size) + "px " + FONT;
      for (g = 0; g < n; g++) {
        ctx.font = (g === n - 1 ? "700 " : "500 ") + Math.round(size) + "px " + FONT;
        wTot += ctx.measureText(parts[g]).width;
        if (g < n - 1) wTot += ctx.measureText("  /  ").width;
      }
      ctx.save();
      ctx.globalAlpha = alpha * glow;
      ctx.fillStyle = "#FFD426";
      ctx.fillRect(x, y + size * 0.42, wTot * glow, Math.max(1, H * 0.003));
      ctx.restore();
    }
    for (var i = 0; i < n; i++) {
      var last = i === n - 1;
      ctx.font = (last ? "700" : "500") + " " + Math.round(size) + "px " + FONT;
      ctx.fillStyle = last ? FG : MUTED;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(parts[i], cx, y);
      cx += ctx.measureText(parts[i]).width;
      if (!last) {
        ctx.fillStyle = DIM;
        ctx.fillText("  /  ", cx, y);
        cx += ctx.measureText("  /  ").width;
      }
    }
    ctx.restore();
  }

  // Where the bar lives in the frame. One place, because three chapters draw
  // into it and a second copy drifts.
  function barBox(W, H) {
    return { x: W * 0.08, w: W * 0.84, y: H * 0.34, H: H };
  }

  // The chart's own heading, in the product's words, above the bar. The live
  // page carries one and the frame needs one: a bar alone in 1920x1080 reads as
  // a stripe with no subject.
  function barHead(ctx, W, H, alpha, head, sub) {
    if (alpha <= 0) return;
    var box = barBox(W, H);
    ctx.save();
    ctx.globalAlpha = alpha;
    fitLabel(ctx, head, box.x, box.y - H * 0.075, box.w, H * 0.034, FG, "700");
    if (sub) fitLabel(ctx, sub, box.x, box.y - H * 0.040, box.w, H * 0.021, MUTED, "500");
    ctx.restore();
  }

  // A swirl over a figure's head: the one piece of cartoon shorthand in the
  // series, and it earns its place on L004 — "technically is carrying a lot of
  // weight in that sentence" is the line where the reader gives up, and a
  // figure standing still says nothing about that.
  //
  // Positioned off the cast entry's own `at`, which is where its FEET are, so
  // the swirl and the figure cannot drift apart when either one moves. 0.255 of
  // the frame above the feet is just clear of the head at scale 1.
  function confusion(ctx, W, H, at, figScale, t, alpha) {
    if (alpha <= 0) return;
    var cx = at[0] * W, cy = at[1] * H - H * 0.255 * figScale;
    var r = H * 0.038 * figScale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = MUTED;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(2, H * 0.005 * figScale);
    // Two and a bit turns of a spiral, drawn as one path, rotating slowly.
    ctx.beginPath();
    var turns = 2.4, steps = 72, spin = t * 0.9;
    for (var i = 0; i <= steps; i++) {
      var u = i / steps;
      var ang = spin + u * turns * Math.PI * 2;
      var rad = r * (0.18 + 0.82 * u);
      var px = cx + Math.cos(ang) * rad * 1.35;
      var py = cy + Math.sin(ang) * rad * 0.62;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ── Chapter 1: the money leaves ────────────────────────────────────────
  // A pay stub held at the left of the frame, with ONE line on it picked out:
  // the line where the money goes. The stub is a prop, so its rows are rule-
  // lines — the only words on it are the ones the narration is about.
  function drawStub(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var w = W * 0.34, h = H * 0.56, x = W * 0.17, y = H * 0.17;

    panel(ctx, x, y, w, h, H, a, EDGE);
    ctx.save();
    ctx.globalAlpha = a;
    label(ctx, "EARNINGS STATEMENT", x + w * 0.07, y + h * 0.12, H * 0.022, MUTED, "700");
    ctx.fillStyle = EDGE;
    ctx.fillRect(x + w * 0.07, y + h * 0.16, w * 0.86, Math.max(1, H * 0.002));
    ctx.restore();

    // Eight rows of nothing-in-particular, and the one that matters.
    var rowH = h * 0.085, top = y + h * 0.24, mark = 4;
    for (var i = 0; i < 8; i++) {
      if (i === mark) continue;
      ruleLines(ctx, x + w * 0.07, top + i * rowH, w * 0.50, 1, rowH, a * 0.75, i * 3);
      ctx.save();
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = GRID;
      ctx.fillRect(x + w * 0.72, top + i * rowH, w * 0.21, Math.max(1, rowH * 0.30));
      ctx.restore();
    }

    // The line where your money leaves you. It lights when he says so.
    var lit = at(scene, 'lineAt', t, 0.45);
    var ly = top + mark * rowH;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = scene.accent || "#FFD426";
    ctx.globalAlpha = a * (0.18 + 0.22 * lit);
    roundRect(ctx, x + w * 0.04, ly - rowH * 0.34, w * 0.92, rowH * 1.08, H * 0.006);
    ctx.fill();
    ctx.globalAlpha = a;
    fitLabel(ctx, "TAX WITHHELD", x + w * 0.07, ly + rowH * 0.30, w * 0.52,
             H * 0.024, lit > 0.5 ? (scene.accent || "#FFD426") : MUTED, "700");
    fitLabel(ctx, "-$412.60", x + w * 0.93, ly + rowH * 0.30, w * 0.24,
             H * 0.024, lit > 0.5 ? (scene.accent || "#FFD426") : MUTED, "700", "right");
    ctx.restore();
  }

  // The budget document: a few hundred pages of lines nobody reads, landing
  // heavily beside the figure. It is DENSE on purpose — the point of the shot
  // is that it is unreadable — and the only legible things on it are the three
  // fund codes, which arrive as they are spoken.
  function drawDocument(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    // It drops in. Already-on-screen scenes inherit it at rest.
    var drop = scene.continues ? 1 : ease(t / 0.75);
    var w = W * 0.40, h = H * 0.74, x = W * 0.14;
    var rest = H * 0.13, y = rest - (1 - drop) * H * 0.42;

    panel(ctx, x, y, w, h, H, a, EDGE);
    ctx.save();
    ctx.globalAlpha = a;
    label(ctx, "ANNUAL BUDGET", x + w * 0.06, y + h * 0.075, H * 0.026, MUTED, "700");
    label(ctx, "FISCAL YEAR 2024 · 412 PAGES", x + w * 0.06, y + h * 0.115,
          H * 0.019, DIM, "600");
    ctx.fillStyle = EDGE;
    ctx.fillRect(x + w * 0.06, y + h * 0.145, w * 0.88, Math.max(1, H * 0.002));
    ctx.restore();

    // Two columns of rule-lines, tight enough to read as a wall of type.
    var top = y + h * 0.20, lineH = h * 0.0295, rows = 24;
    ruleLines(ctx, x + w * 0.06, top, w * 0.40, rows, lineH, a * 0.8, 3);
    ruleLines(ctx, x + w * 0.54, top, w * 0.40, rows, lineH, a * 0.8, 11);

    // The three codes he reads aloud, each landing on its own word.
    var cy = y + h * 0.60;
    for (var i = 0; i < CODES.length; i++) {
      var on = atIndex(scene.codeAt, i, t, 0.3);
      if (on <= 0) continue;
      ctx.save();
      ctx.globalAlpha = a * on;
      var bw = w * 0.88, bh = h * 0.072, bx = x + w * 0.06, by = cy + i * (bh + h * 0.018);
      ctx.fillStyle = "#101014";
      roundRect(ctx, bx, by, bw, bh, H * 0.006); ctx.fill();
      ctx.strokeStyle = EDGE;
      ctx.lineWidth = Math.max(1, H * 0.0018);
      ctx.stroke();
      fitLabel(ctx, CODES[i], bx + bw * 0.04, by + bh * 0.70, bw * 0.92,
               H * 0.030, FG, "700");
      ctx.restore();
    }

    // L004's own picture: the reader has stopped taking it in. swirlAt is
    // where it starts turning, over the head of whichever figure the scene
    // placed — read off the cast entry, so the two cannot drift apart when
    // either one moves.
    var fig = (scene.cast && scene.cast[0]) || null;
    if (fig && fig.at) {
      confusion(ctx, W, H, fig.at, fig.scale == null ? 1 : fig.scale, t,
                a * at(scene, 'swirlAt', t, 0.7));
    }
  }

  // ── Title card ─────────────────────────────────────────────────────────
  // The product's own lockup, not a line of type. Serves the title and the
  // close, where it carries the address underneath.
  function drawTitleCard(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.45);
    if (a <= 0) return;
    // The lockup sits high when something goes under it and centred when
    // nothing does. The Treasury lockup is wide and short — wordmark beside
    // symbol — so holding it at the close card's height on the title card
    // leaves half a frame of nothing below it.
    var midY = scene.sub ? H * 0.34 : H * 0.46;
    ctx.save();
    ctx.globalAlpha = a;
    var drawn = false;
    if (logo.naturalWidth) {
      var lw = W * 0.46, lh = lw * (logo.naturalHeight / logo.naturalWidth);
      var maxH = H * 0.30;
      if (lh > maxH) { lh = maxH; lw = lh * (logo.naturalWidth / logo.naturalHeight); }
      ctx.drawImage(logo, (W - lw) / 2, midY - lh / 2, lw, lh);
      drawn = true;
    }
    if (!drawn) {
      label(ctx, scene.name || "Treasury Tracker", W / 2, midY,
            H * 0.090, scene.accent || "#FFD426", "700", "center");
    }
    if (scene.sub) {
      label(ctx, scene.sub, W / 2, H * 0.54, H * 0.044, MUTED, "600", "center");
    }
    ctx.restore();
  }

  // ── Chapter 2: the budget as a picture ─────────────────────────────────
  // Six scenes of one object. Every second below is read off words.md and
  // named in episode.mjs; nothing here chooses its own moment.
  // LA_OUT with the share printed beside the money on the segments that have
  // been named. A segment's `shown` is icicle's own hook for a figure the page prints that
  // is not simply the amount, so this needs no second label pass and cannot
  // disagree with the bar it sits on.
  function withShares(segs, nameAt, t) {
    if (!nameAt) return segs;
    var out = segs.slice();
    for (var i = 0; i < nameAt.length && i < out.length; i++) {
      if (atIndex(nameAt, i, t, 0.4) <= 0.5) continue;
      out[i] = Object.assign({}, out[i],
        { shown: money(out[i].amt) + '  ·  ' + out[i].pct + '%' });
    }
    return out;
  }

  function drawBudgetBar(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var box = barBox(W, H);
    var stage = scene.stage || 'whole';
    var crumbShown = 0, crumbAlpha = 0;
    var rows, opts = { x: box.x, y: box.y, w: box.w, H: H, alpha: a };

    if (stage === 'collapse') {
      // The document is still here, and it becomes the bar. "draws it in a way
      // that anyone can read" 5.82, "becomes one shape" 9.30, "every
      // department" 11.66, "sized by what it actually receives" 14.18.
      var leaving = 1 - at(scene, 'collapseAt', t, 1.4);
      if (leaving > 0.01) {
        ctx.save();
        ctx.globalAlpha = a * leaving;
        var dw = W * 0.40, dh = H * 0.62, dx = (W - dw) / 2, dy = H * 0.16;
        panel(ctx, dx, dy, dw, dh, H, 1, EDGE);
        ruleLines(ctx, dx + dw * 0.07, dy + dh * 0.10, dw * 0.38, 18, dh * 0.046, 0.9, 3);
        ruleLines(ctx, dx + dw * 0.55, dy + dh * 0.10, dw * 0.38, 18, dh * 0.046, 0.9, 11);
        ctx.restore();
      }
      var shaped = at(scene, 'shapeAt', t, 1.0);
      if (shaped <= 0) return;
      // ONE move. The bar divides into its true sizes and its own colours in a
      // single pass at sliceAt, and the names arrive at sizeAt over a picture
      // that has stopped moving. It used to size halfway at sliceAt and the
      // rest of the way at sizeAt, which is two resizes for one sentence:
      // "we should not need to change the sizes of the sections on the bar
      // during that sequence".
      var divided = at(scene, 'sliceAt', t, 1.1);
      var sized = at(scene, 'sizeAt', t, 0.8);
      barHead(ctx, W, H, a * shaped, CHART_HEAD, CHART_SUB);
      opts.alpha = a * shaped;
      opts.divide = divided;
      opts.labelAlpha = sized;
      rows = [{ segs: LA_OUT, current: true }];
      icicle(ctx, rows, opts);
      return;
    }

    if (stage === 'named') {
      // EVERY name stays. This stage used to print only the two largest, so at
      // the cut out of bar-collapse — which ends with all five labelled — the
      // other three blinked out and came back a chapter later: "at 1:02, all
      // the labels go away and start spawning in slower".
      //
      // What arrives here is the SHARE on the two he names: "$5.6B · 25.9%"
      // where the bar was printing "$5.6B". The picture already answers the
      // question, which is what the line says about it.
      barHead(ctx, W, H, a, CHART_HEAD, CHART_SUB);
      icicle(ctx, [{ segs: withShares(LA_OUT, scene.nameAt, t), current: true }], opts);
      return;
    }

    if (stage === 'open' || stage === 'trail') {
      // TWO drills, because the line is two: "the department breaks into its
      // divisions. A division breaks into its programs." The second half used
      // to have no picture at all, and the line items in L010 then arrived out
      // of a level the viewer had never been shown.
      //
      // Everything that was not pressed steps back, at the same moment and by
      // the same amount the press happens, so the frame says which segment was
      // opened. Without it the children appear across the full width under a
      // parent row that still looks untouched, and the picture no longer reads
      // as an expansion of anything.
      var opened = at(scene, 'openAt', t, 0.9);
      var deeper = at(scene, 'deeperAt', t, 0.9);
      barHead(ctx, W, H, a, CHART_HEAD, null);
      if (opened <= 0) {
        // Still the bar L007 left on screen, shares and all.
        icicle(ctx, [{ segs: withShares(LA_OUT, [0, 0], t), current: true }], opts);
        return;
      }
      var OPENED = 0;        // Government & Public Safety, in LA_OUT
      var DEEPER = 0;        // Public Safety, inside it
      rows = [
        { segs: LA_OUT, current: false, focus: OPENED, focusAmt: opened },
        { segs: LA_DRILL.level1, current: 1 - deeper, alive: opened,
          focus: deeper > 0 ? DEEPER : null, focusAmt: deeper,
          growFrom: { span: spanOf(LA_OUT, OPENED), u: opened } }
      ];
      if (deeper > 0) {
        rows.push({ segs: LA_DRILL.level2, current: true, alive: deeper,
                    growFrom: { span: spanOf(LA_DRILL.level1, DEEPER), u: deeper } });
      }
      opts.labelAlpha = opened;
      icicle(ctx, rows, opts);

      // 5 parts before anything opens, 6 at the first drill, 7 at the second.
      // The trail is complete by the end of L008, so L009's own beat is the
      // rule under it rather than another part.
      crumbShown = 5 + Math.round(opened) + Math.round(deeper);
      breadcrumb(ctx, LA_DRILL.crumb, crumbShown, box.x, box.y - H * 0.038, W, H,
                 a, stage === 'trail' ? at(scene, 'crumbAt', t, 1.2) : 0);
      return;
    }

    if (stage === 'zoom') {
      // The inverse of open: one segment fills the frame and the whole bar
      // grows back around it. "That same number inside the whole picture."
      barHead(ctx, W, H, a, CHART_HEAD, CHART_SUB);
      var out = at(scene, 'zoomAt', t, 2.2);
      opts.openIndex = 6;                        // Debt Payments: a small one
      opts.openGrow = 1 - out;
      opts.labelAlpha = out;
      icicle(ctx, [{ segs: LA_OUT, current: true }], opts);
      return;
    }

    // 'whole': the bar, nothing arriving, the scene the cast stands in front of.
    barHead(ctx, W, H, a, CHART_HEAD, CHART_SUB);
    var end = icicle(ctx, [{ segs: LA_OUT, current: true }], opts);
    ctx.save(); ctx.globalAlpha = a;
    fitLabel(ctx, BASIS, box.x, end + H * 0.035, box.w, H * 0.018, DIM, "500");
    ctx.restore();
  }

  // The line items under Public Safety, as filed. BUDGETED AND ACTUAL ARE THE
  // SAME NUMBER and the variance column is a dash — that is what Los Angeles
  // reports, and the page's own legend says "On Budget". Two identical columns
  // is a duller picture than a drifting one and it is the true one.
  function drawLineItems(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var box = barBox(W, H);
    var below = icicle(ctx, [{ segs: LA_OUT, current: false, focus: 0 },
                             { segs: LA_DRILL.level1, current: false, focus: 0 },
                             { segs: LA_DRILL.level2, current: true }],
                       { x: box.x, y: box.y, w: box.w, H: H, alpha: a });
    barHead(ctx, W, H, a, CHART_HEAD, null);
    breadcrumb(ctx, LA_DRILL.crumb, LA_DRILL.crumb.length, box.x, box.y - H * 0.038, W, H, a, 0);

    var ty = below + H * 0.045;
    var colX = [box.x, box.x + box.w * 0.52, box.x + box.w * 0.70, box.x + box.w * 0.88];
    ctx.save();
    ctx.globalAlpha = a * at(scene, 'headAt', t, 0.4);
    for (var c = 0; c < LA_ITEMS.cols.length; c++) {
      label(ctx, LA_ITEMS.cols[c], colX[c], ty, H * 0.017, MUTED, "700",
            c === 0 ? "left" : "right");
    }
    ctx.fillStyle = EDGE;
    ctx.fillRect(box.x, ty + H * 0.010, box.w, Math.max(1, H * 0.002));
    ctx.restore();

    var rowH = H * 0.038;
    for (var i = 0; i < LA_ITEMS.rows.length; i++) {
      var on = atIndex(scene.rowAt, i, t, 0.25);
      if (on <= 0) continue;
      var r = LA_ITEMS.rows[i], y = ty + H * 0.045 + i * rowH;
      ctx.save();
      ctx.globalAlpha = a * on;
      fitLabel(ctx, r.desc, colX[0], y, box.w * 0.48, H * 0.019, FG, "500");
      fitLabel(ctx, moneyFull(r.budget), colX[1], y, box.w * 0.16, H * 0.019, FG, "600", "right");
      fitLabel(ctx, moneyFull(r.actual), colX[2], y, box.w * 0.16, H * 0.019, FG, "600", "right");
      label(ctx, "—", colX[3], y, H * 0.019, MUTED, "600", "right");
      ctx.restore();
    }
  }

  // The individual payments. The claim is real — the panel is in the shipped
  // app and the live page says "every level lets you dig deeper until you reach
  // individual line items and transactions" — but the ROWS of a real one are
  // not in hand, and only two governments in the product carry any.
  //
  // So the columns are the product's three real fields and the rows are
  // rule-lines. Drawing an invented payee would be the same fault as writing
  // out the method panel's body: a name presented as a government's record is a
  // claim, and inventing one to show how specific the real ones are would undo
  // the chapter this episode is building toward.
  function drawPayments(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var box = barBox(W, H);
    var below = icicle(ctx, [{ segs: LA_OUT, current: false, focus: 0 },
                             { segs: LA_DRILL.level1, current: false, focus: 0 },
                             { segs: LA_DRILL.level2, current: true }],
                       { x: box.x, y: box.y, w: box.w, H: H, alpha: a });
    barHead(ctx, W, H, a, CHART_HEAD, null);
    breadcrumb(ctx, LA_DRILL.crumb, LA_DRILL.crumb.length, box.x, box.y - H * 0.038, W, H, a, 0);

    // The bar above is three rows deep now, so the panel is shorter by the row
    // that was added and its rows are closer together. The numbers are the
    // frame's, not a taste: 0.27 of the height starting at 0.657 reaches 0.927,
    // and the cast in chapter 9 stands at 0.94.
    var open = at(scene, 'panelAt', t, 0.5);
    if (open <= 0) return;
    var py = below + H * 0.045, ph = H * 0.27;
    panel(ctx, box.x, py, box.w, ph, H, a * open, EDGE);

    ctx.save();
    ctx.globalAlpha = a * open;
    label(ctx, "Linked transactions", box.x + box.w * 0.02, py + H * 0.038,
          H * 0.022, FG, "700");
    ctx.restore();

    // Three columns, each lighting as he names it: who was paid, how much, when.
    var cols = [{ head: "PAID TO", x: box.x + box.w * 0.02, align: "left" },
                { head: "AMOUNT", x: box.x + box.w * 0.72, align: "right" },
                { head: "DATE", x: box.x + box.w * 0.96, align: "right" }];
    for (var c = 0; c < cols.length; c++) {
      var on = atIndex(scene.colAt, c, t, 0.35);
      if (on <= 0) continue;
      ctx.save();
      ctx.globalAlpha = a * open * on;
      label(ctx, cols[c].head, cols[c].x, py + H * 0.072, H * 0.017,
            scene.accent || "#FFD426", "700", cols[c].align);
      ctx.restore();
    }

    var rowH = H * 0.030;
    for (var i = 0; i < 5; i++) {
      var ron = atIndex(scene.rowAt, i, t, 0.22);
      if (ron <= 0) continue;
      var y = py + H * 0.095 + i * rowH;
      ruleLines(ctx, box.x + box.w * 0.02, y, box.w * 0.44, 1, rowH, a * open * ron * 0.9, i * 5);
      ruleLines(ctx, box.x + box.w * 0.58, y, box.w * 0.14, 1, rowH, a * open * ron * 0.9, i * 7);
      ruleLines(ctx, box.x + box.w * 0.84, y, box.w * 0.12, 1, rowH, a * open * ron * 0.9, i * 11);
    }
  }

  // ── Chapter 3: more than one question ──────────────────────────────────
  // The three cards the live page puts above the chart, in its own words. The
  // bar carries on underneath: this chapter does not draw one of its own.
  // The cards sit higher and shorter than they did: they used to end at 0.22
  // of the frame with the chart heading at 0.265 and the bar at 0.34, and the
  // three of them crowded. 0.055 to 0.165 leaves a tenth of the frame of air
  // between the cards and the heading under them.
  function cardBox(W, H, i) {
    var box = barBox(W, H);
    var gap = W * 0.022, w = (box.w - gap * 2) / 3;
    return { x: box.x + i * (w + gap), y: H * 0.055, w: w, h: H * 0.110 };
  }
  // Which picture a card stands for. Money In is a bar of its own; Employees
  // is not a bar at all but a SHARE of Money Out, so it is drawn differently
  // and named differently.
  function cardMode(i) { return i === 0 ? "in" : i === 2 ? "staff" : "out"; }

  // Employee compensation against the money the city spends: $7.4B of $21.5B.
  // Read from LA_CARDS so the bar and the card above it can never disagree.
  // #EA580C is the colour the live page fills the Money Out card with when
  // Employees is chosen, measured off it on 2026-10-13.
  var STAFF_C = "#EA580C";
  function staffShare() { return LA_CARDS[2].amt / LA_CARDS[1].amt; }

  // The bar under the three cards, for whichever card is selected.
  //
  // The Employees bar FLATTENS the departments. An orange band laid over the
  // coloured segments would say the first three and a half departments ARE the
  // payroll, and they are not — employee compensation is spread across every
  // one of them. Flat, the bar is simply "all the money the city spends", and
  // the orange is the part of it that pays people, which is what it is.
  function cardBar(ctx, W, H, alpha, mode) {
    if (alpha <= 0) return;
    var box = barBox(W, H);
    if (mode !== "staff") {
      icicle(ctx, [{ segs: mode === "in" ? LA_IN : LA_OUT, current: true }],
             { x: box.x, y: box.y, w: box.w, H: H, alpha: alpha });
      return;
    }
    // Choosing Employees on the live page swaps the dataset: the bar becomes
    // what the city pays its workforce, department by department. The first
    // version of this drew an orange block over a third of the budget bar,
    // which was the wrong picture twice over — it said the first three and a
    // half departments ARE the payroll, and it answered a question the page
    // answers differently.
    icicle(ctx, [{ segs: LA_STAFF, current: true }],
           { x: box.x, y: box.y, w: box.w, H: H, alpha: alpha });
  }

  function drawThreeCards(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var box = barBox(W, H);
    var stage = scene.stage || 'two';

    if (stage === 'half') {
      // The money-out bar alone, then the money-in bar joining it underneath.
      // Both are drawn by icicle(); only what they are handed differs.
      barHead(ctx, W, H, a, CHART_HEAD, CHART_SUB);
      var joined = at(scene, 'inAt', t, 0.7);
      var rows = [{ segs: LA_OUT, current: true }];
      if (joined > 0) rows.push({ segs: LA_IN, current: true });
      var opts = { x: box.x, y: box.y, w: box.w, H: H, alpha: a };
      icicle(ctx, rows, opts);
      var rowH = Math.round(H * ROW_CUR), gapH = Math.max(1, H * ROW_GAP);
      ctx.save();
      ctx.globalAlpha = a;
      label(ctx, "MONEY OUT", box.x, box.y - H * 0.012, H * 0.019, MUTED, "700");
      if (joined > 0) {
        ctx.globalAlpha = a * joined;
        label(ctx, "MONEY IN", box.x, box.y + rowH + gapH - H * 0.012,
              H * 0.019, MUTED, "700");
      }
      ctx.restore();
      return;
    }

    // 'two' and 'named': the bar below, the three cards above.
    //
    // The cards are a SELECTOR, not three lamps. The live page shows ONE of
    // Money In, Money Out and Employees at a time and the chart under them is
    // whichever is chosen. Lighting each card as it was named and leaving it
    // lit ended the line with all three on, and the bar below had never
    // changed — which is the one thing the line says the tool does.
    //
    // `cardAt` is indexed by CARD, in LA_CARDS' order — Money In, Money Out,
    // Employees — NOT by the order the script names them. He says money out
    // first. Reading two arrays at the same index that were never in the same
    // order put every label on the wrong row in episode 2.
    var pick = -1, pickT = -1e9, prev = -1, prevT = -1e9, p;
    if (stage === 'named' && scene.cardAt) {
      for (p = 0; p < scene.cardAt.length; p++) {
        var tp = scene.cardAt[p];
        if (tp == null || t < tp) continue;
        if (tp > pickT) { prev = pick; prevT = pickT; pick = p; pickT = tp; }
        else if (tp > prevT) { prev = p; prevT = tp; }
      }
    }
    // Half a second to change over, which is about as fast as a click feels.
    var swap = pick < 0 ? 1 : ease(Math.min(1, Math.max(0, (t - pickT) / 0.5)));
    var nowMode = cardMode(pick), wasMode = cardMode(prev);
    if (nowMode === wasMode) swap = 1;

    if (swap >= 1) {
      barHead(ctx, W, H, a, CARD_HEAD[nowMode][0], CARD_HEAD[nowMode][1]);
      cardBar(ctx, W, H, a, nowMode);
    } else {
      barHead(ctx, W, H, a * (1 - swap), CARD_HEAD[wasMode][0], CARD_HEAD[wasMode][1]);
      barHead(ctx, W, H, a * swap, CARD_HEAD[nowMode][0], CARD_HEAD[nowMode][1]);
      cardBar(ctx, W, H, a * (1 - swap), wasMode);
      cardBar(ctx, W, H, a * swap, nowMode);
    }

    for (var i = 0; i < LA_CARDS.length; i++) {
      var c = LA_CARDS[i], b = cardBox(W, H, i);
      // The third card is present and FAINT from the first scene — "a third
      // joins them faintly" — and only lights when it is selected. Gating this
      // on stage === 'two' meant it jumped to full strength at the cut into
      // 'named', 8.4s before he says "a third".
      var base = (i === 2) ? 0.35 : 0.72;
      var on = i === pick ? Math.max(swap, 0.35) : 0;
      var strength = Math.max(base, on);
      panel(ctx, b.x, b.y, b.w, b.h, H, a * strength,
            i === pick ? (scene.accent || "#FFD426") : EDGE);

      // With Employees chosen, the live page fills the RIGHT-HAND third of the
      // Money Out card with an orange gradient: the share of what the city
      // spends that pays the people who work for it. Measured off the live
      // page — 150px of a 443px card, 33.9%, fading leftward from
      // rgba(234,88,12,0.3). Chris asked for the left third; the product does
      // it on the right, and the card is the product's.
      if (i === 1 && nowMode === "staff") {
        var fw = b.w * staffShare();
        var g = ctx.createLinearGradient(b.x + b.w - fw, 0, b.x + b.w, 0);
        g.addColorStop(0, "rgba(234,88,12,0.10)");
        g.addColorStop(1, "rgba(234,88,12,0.48)");
        ctx.save();
        ctx.globalAlpha = a * swap;
        ctx.fillStyle = g;
        roundRect(ctx, b.x + b.w - fw, b.y, fw, b.h, H * 0.018);
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = a * strength;
      fitLabel(ctx, c.head, b.x + b.w * 0.07, b.y + b.h * 0.30, b.w * 0.86,
               H * 0.024, MUTED, "700");
      fitLabel(ctx, money(c.amt), b.x + b.w * 0.07, b.y + b.h * 0.66, b.w * 0.86,
               H * 0.046, FG, "700");
      fitLabel(ctx, c.sub, b.x + b.w * 0.07, b.y + b.h * 0.89, b.w * 0.86,
               H * 0.019, DIM, "500");
      ctx.restore();
    }
  }

  // ── Chapter 4: across time ─────────────────────────────────────────────
  // The same bar, re-timed. Every width below comes from YEAR_ROWS, which is
  // every top-level segment in all four years as the live page reports them.
  // The year control the live page puts above the chart, as a drop-down that
  // is seen to be used. "Change the year" was a bar that redrew itself with
  // nothing on screen doing the changing, so the sentence described an action
  // the picture never showed.
  function yearPicker(ctx, W, H, a, open, picked, chosen) {
    var box = barBox(W, H);
    var bw = W * 0.135, bh = H * 0.052;
    var bx = box.x + box.w - bw, by = box.y - H * 0.088;
    ctx.save();
    ctx.globalAlpha = a;
    panel(ctx, bx, by, bw, bh, H, a, open > 0 ? (chosen || "#FFD426") : EDGE);
    fitLabel(ctx, "FY " + picked, bx + bw * 0.09, by + bh * 0.66, bw * 0.62,
             H * 0.026, FG, "700");
    // the little chevron, pointing down shut and up open
    ctx.strokeStyle = MUTED;
    ctx.lineWidth = Math.max(2, H * 0.0028);
    ctx.lineCap = "round";
    var ax = bx + bw * 0.84, ay = by + bh * 0.5, aw = bw * 0.055, ah = bh * 0.14;
    var dir = open > 0.5 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(ax - aw, ay - ah * dir);
    ctx.lineTo(ax, ay + ah * dir);
    ctx.lineTo(ax + aw, ay - ah * dir);
    ctx.stroke();
    ctx.restore();
    if (open <= 0) return;

    // The list, newest first, the way the picker orders it.
    var rows = YEAR_ROWS.length, rh = H * 0.046;
    var ly = by + bh + H * 0.006, lh = rows * rh + H * 0.012;
    ctx.save();
    ctx.globalAlpha = a * open;
    panel(ctx, bx, ly, bw, lh, H, a * open, EDGE);
    for (var i = 0; i < rows; i++) {
      var yr = YEAR_ROWS[rows - 1 - i].year;
      var ry = ly + H * 0.006 + i * rh;
      if (yr === picked) {
        ctx.fillStyle = "rgba(255,212,38,0.14)";
        roundRect(ctx, bx + bw * 0.04, ry, bw * 0.92, rh, H * 0.008);
        ctx.fill();
      }
      fitLabel(ctx, String(yr), bx + bw * 0.10, ry + rh * 0.70, bw * 0.80,
               H * 0.024, yr === picked ? (chosen || "#FFD426") : MUTED,
               yr === picked ? "700" : "600");
    }
    ctx.restore();
  }

  function drawYears(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var box = barBox(W, H);

    if (scene.stage === 'across') {
      // FIVE years, each a bar of its own, stacked down the frame in the same
      // shape as the bar above them — so the cut into this scene is seamless
      // and the eye can run one colour down the column. They used to be
      // vertical columns side by side, which made the chapter change its own
      // grammar halfway through.
      //
      // FY2020 is already on screen: L016 chose it in the picker. The other
      // four arrive while he says "several years tells you how it is evolving".
      var arrived = [], anyNew = 0, y;
      for (y = 0; y < YEAR_ROWS.length; y++) {
        arrived[y] = y === 0 ? 1 : atIndex(scene.colAt, y - 1, t, 0.35);
        if (y > 0) anyNew = Math.max(anyNew, arrived[y]);
      }
      barHead(ctx, W, H, a,
              anyNew > 0.5 ? "Los Angeles, FY2020 to FY2024" : CHART_HEAD, CHART_SUB);

      // Every row shrinks together as the stack fills: one full-height bar at
      // the cut, five ancestor-height bars once they are all in. Shrinking
      // only the new ones would step the first bar's height at the join.
      var rows = [];
      for (y = 0; y < YEAR_ROWS.length; y++) {
        if (arrived[y] <= 0) continue;
        rows.push({ segs: yearSegs(y), current: 1 - anyNew, alive: arrived[y] });
      }
      icicle(ctx, rows, { x: box.x, y: box.y, w: box.w, H: H, alpha: a,
                          minLabelPx: box.w * 0.15 });

      // The year, in the gutter beside its own bar. Read off the same row
      // heights icicle used, so a label cannot drift off its bar.
      var rowH = H * (ROW_ANC + (ROW_CUR - ROW_ANC) * (1 - anyNew));
      var gap = Math.max(1, H * ROW_GAP), cy = box.y;
      for (y = 0; y < YEAR_ROWS.length; y++) {
        if (arrived[y] <= 0) continue;
        var h = rowH * arrived[y];
        ctx.save();
        ctx.globalAlpha = a * arrived[y];
        label(ctx, "FY" + YEAR_ROWS[y].year, box.x - W * 0.012,
              cy + h * 0.60, H * 0.021, y === YEAR_ROWS.length - 1 ? FG : MUTED,
              "700", "right");
        ctx.restore();
        cy += h + gap * arrived[y];
      }
      return;
    }

    // 'change': the picker opens, FY2020 is chosen, and the bar redraws.
    // changeAt is "change the year"; the list opens there and the choice lands
    // a beat later, which is when the shape starts moving.
    var opened = at(scene, 'changeAt', t, 0.35);
    var chose = at(scene, 'chooseAt', t, 0.25);
    var u = at(scene, 'redrawAt', t, 1.1);
    var segsNow = u <= 0 ? yearSegs(YEAR_ROWS.length - 1)
                         : yearSegsBetween(YEAR_ROWS.length - 1, 0, u);
    barHead(ctx, W, H, a, CHART_HEAD, CHART_SUB);
    icicle(ctx, [{ segs: segsNow, current: true }],
           { x: box.x, y: box.y, w: box.w, H: H, alpha: a });
    // The list closes again once the choice is made, the way a picker does.
    yearPicker(ctx, W, H, a, Math.max(0, opened - chose),
               chose > 0.5 ? YEAR_ROWS[0].year : YEAR_ROWS[YEAR_ROWS.length - 1].year,
               scene.accent);
    ctx.save();
    ctx.globalAlpha = a;
    label(ctx, money(u < 0.5 ? YEAR_ROWS[YEAR_ROWS.length - 1].total : YEAR_ROWS[0].total) +
          " spent", box.x + box.w, box.y - H * 0.012, H * 0.021, MUTED, "600", "right");
    ctx.restore();
  }

  // ── Chapter 5: across levels ───────────────────────────────────────────
  // Four governments whose totals span $21.5B to $7,195.8B. Each bar is scaled
  // to its OWN total, which is the honest drawing of the claim: the chapter
  // says all four are drawn the same WAY, not that they are the same size. Each
  // total is printed beside its bar so the viewer can see which denominator it
  // used — a bar scaled to the wrong one is a lie nobody can see.
  function drawLevels(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var box = barBox(W, H);
    var stage = scene.stage || 'column';
    var i, on;

    if (stage === 'nest') {
      // The address bar, which is how the live page actually moves between
      // governments: United States / California / Los Angeles County / Los
      // Angeles, each one a link, the one you are on picked out. Click any
      // part and the chart becomes that government's.
      //
      // What was here was four nested rounded rectangles with the city inside
      // them. It read as a diagram of containment that nothing in the product
      // draws, and it did not say what the chapter needs it to say: that these
      // are four places you can go.
      barHead(ctx, W, H, a, "Four governments, one taxpayer", null);
      var cy = H * 0.46, pad = W * 0.016, gapw = W * 0.020;
      ctx.font = "700 " + Math.round(H * 0.030) + "px " + FONT;
      var widths = [], total = 0;
      for (i = 0; i < LEVELS.length; i++) {
        widths[i] = ctx.measureText(LEVELS[i].name).width + pad * 2;
        total += widths[i];
      }
      total += gapw * (LEVELS.length - 1);
      var cx2 = (W - total) / 2, chipH = H * 0.078;
      for (i = 0; i < LEVELS.length; i++) {
        on = atIndex(scene.ringAt, i, t, 0.45);
        var here = i === LEVELS.length - 1;          // Los Angeles: where we are
        if (on > 0) {
          ctx.save();
          ctx.globalAlpha = a * on;
          ctx.fillStyle = here ? "rgba(255,212,38,0.12)" : CARD;
          roundRect(ctx, cx2, cy - chipH / 2, widths[i], chipH, H * 0.012);
          ctx.fill();
          ctx.strokeStyle = here ? (scene.accent || "#FFD426") : EDGE;
          ctx.lineWidth = Math.max(1, H * 0.0025);
          ctx.stroke();
          fitLabel(ctx, LEVELS[i].name, cx2 + pad, cy + H * 0.010,
                   widths[i] - pad * 2, H * 0.030, here ? FG : MUTED, "700");
          ctx.restore();
        }
        if (i < LEVELS.length - 1) {
          var sepOn = Math.min(on, atIndex(scene.ringAt, i + 1, t, 0.45));
          if (sepOn > 0) {
            ctx.save();
            ctx.globalAlpha = a * sepOn;
            label(ctx, "/", cx2 + widths[i] + gapw / 2, cy + H * 0.010,
                  H * 0.030, DIM, "500", "center");
            ctx.restore();
          }
        }
        cx2 += widths[i] + gapw;
      }
      ctx.save();
      ctx.globalAlpha = a * atIndex(scene.ringAt, 0, t, 0.45);
      label(ctx, "Press any one of them and the chart becomes that government's.",
            W / 2, cy + H * 0.105, H * 0.022, DIM, "500", "center");
      ctx.restore();
      return;
    }

    if (stage === 'column') {
      // Four bars, drawn identically, each scaled to its own total.
      barHead(ctx, W, H, a, "Four governments, drawn the same way", null);
      // Four bars in one frame: each row is drawn at 0.60 of the height it
      // has elsewhere, and the gap is wider than the row so a bar never covers
      // the next government's name. The RATIO between rows is untouched —
      // every one of the four is the same size as the others, which is the
      // claim the chapter is making.
      var rowGap = H * 0.125;
      for (i = 0; i < LEVELS.length; i++) {
        on = atIndex(scene.rowAt, i, t, 0.4);
        if (on <= 0) continue;
        var ly = box.y - H * 0.03 + i * rowGap;
        ctx.save();
        ctx.globalAlpha = a * on;
        label(ctx, LEVELS[i].name, box.x, ly - H * 0.012, H * 0.022, FG, "700");
        label(ctx, money(LEVELS[i].out) + " out", box.x + box.w, ly - H * 0.012,
              H * 0.021, MUTED, "600", "right");
        ctx.restore();
        icicle(ctx, [{ segs: LEVELS[i].segs, current: true }],
               { x: box.x, y: ly, w: box.w, H: H, alpha: a * on,
                 rowScale: 0.60, minLabelPx: box.w * 0.16 });
      }
      return;
    }

    if (stage === 'federal' || stage === 'twoways' || stage === 'person') {
      var perPerson = stage === 'person' ? at(scene, 'shrinkAt', t, 1.0) : 0;
      barHead(ctx, W, H, a, "United States, FY2024", CHART_SUB);

      // The toggle, in the product's own words. Which side is live depends on
      // the beat: by purpose until "and by department", then both are shown.
      var second = stage === 'twoways' ? at(scene, 'secondAt', t, 0.8) : 0;
      var pair = stage === 'person' ? FED_SCALE : FED_TOGGLE;
      var liveRight = stage === 'person' ? perPerson > 0.5 : second > 0.5;
      drawToggle(ctx, W, H, box.x + box.w, box.y - H * 0.052,
                 pair, liveRight, a * (stage === 'federal'
                   ? at(scene, 'toggleAt', t, 0.5) : 1), scene);

      // By purpose, always. In per-person mode the same bar carries the page's
      // own per-person figures instead of the dollar ones.
      var segs = FED_OUT;
      if (perPerson > 0.5) {
        segs = [];
        for (i = 0; i < FED_OUT.length; i++) {
          segs.push({ label: FED_OUT[i].label, c: FED_OUT[i].c, amt: FED_OUT[i].amt,
                      shown: FED_PERPERSON[i] });
        }
      }
      icicle(ctx, [{ segs: segs, current: true }],
             { x: box.x, y: box.y, w: box.w, H: H, alpha: a });

      if (stage === 'twoways' && second > 0) {
        // The same total again, by department. A different picture of one
        // number: $1,460.9B leads by purpose, $1,902.3B by department.
        var y2 = box.y + H * 0.175;
        ctx.save();
        ctx.globalAlpha = a * second;
        label(ctx, "BY DEPARTMENT", box.x, y2 - H * 0.012, H * 0.019, MUTED, "700");
        ctx.restore();
        icicle(ctx, [{ segs: FED_BY_DEPT, current: true }],
               { x: box.x, y: y2, w: box.w, H: H, alpha: a * second });
        ctx.save();
        ctx.globalAlpha = a;
        label(ctx, "BY PURPOSE", box.x, box.y - H * 0.012, H * 0.019, MUTED, "700");
        ctx.restore();
      }

      if (stage === 'person') {
        ctx.save();
        ctx.globalAlpha = a;
        // Nothing here divides anything. Before the switch this is the page's
        // own Money Out; after it, the page's own per-person figure for the
        // largest segment. An episode about showing your work does not get to
        // do arithmetic off screen and present the answer as the product's.
        var big = perPerson > 0.5 ? FED_PERPERSON[0] : money(LEVELS[0].out);
        fitLabel(ctx, perPerson > 0.5 ? "Social Security, your share" : "Money out",
                 box.x, box.y + H * 0.205, box.w * 0.46, H * 0.021, MUTED, "700");
        fitLabel(ctx, big, box.x, box.y + H * 0.262, box.w * 0.6,
                 H * 0.055, scene.accent || "#FFD426", "700");
        ctx.restore();
      }
      return;
    }
  }

  // The product's own two-state toggle: a pill with the live half filled.
  function drawToggle(ctx, W, H, right, y, pair, liveRight, alpha, scene) {
    if (alpha <= 0) return;
    ctx.font = "700 " + Math.round(H * 0.020) + "px " + FONT;
    var pad = W * 0.012;
    var w0 = ctx.measureText(pair[0]).width + pad * 2;
    var w1 = ctx.measureText(pair[1]).width + pad * 2;
    var h = H * 0.044, x = right - (w0 + w1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = CARD;
    roundRect(ctx, x, y, w0 + w1, h, h / 2); ctx.fill();
    ctx.strokeStyle = EDGE; ctx.lineWidth = Math.max(1, H * 0.002); ctx.stroke();
    ctx.fillStyle = scene.accent || "#FFD426";
    roundRect(ctx, liveRight ? x + w0 : x, y, liveRight ? w1 : w0, h, h / 2);
    ctx.fill();
    label(ctx, pair[0], x + w0 / 2, y + h * 0.66, H * 0.020,
          liveRight ? MUTED : ONSEG, "700", "center");
    label(ctx, pair[1], x + w0 + w1 / 2, y + h * 0.66, H * 0.020,
          liveRight ? ONSEG : MUTED, "700", "center");
    ctx.restore();
  }

  // ── Chapter 6: where the numbers come from ─────────────────────────────
  function drawSourceCard(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var box = barBox(W, H);
    var stage = scene.stage || 'ask';

    if (stage === 'method') {
      // The federal method panel. SEVEN REAL HEADINGS — the four L027 names
      // and three it does not claim — over rule-lines. Nothing under a heading
      // is written out: a drawn sentence presented as the product's own words
      // is a claim, and inventing one in order to show how careful the real
      // ones are would undo the chapter. Episode 1's source card is drawn the
      // same way for the same reason.
      // The chart stays underneath until the panel covers it. src-method
      // carries continues: true now, so the bar does not fade out at the cut,
      // fade back in, and then be covered — "3:50 is pretty wonky, you despawn
      // the bar, spawn it again, and then have it go away".
      var open = at(scene, 'openAt', t, 0.7);
      barHead(ctx, W, H, a * (1 - open), CHART_HEAD, null);
      if (open < 1) {
        icicle(ctx, [{ segs: LA_OUT, current: true }],
               { x: box.x, y: box.y, w: box.w, H: H, alpha: a * (1 - open) });
      }
      if (open <= 0) return;
      var shownRows = METHOD.rows.slice(0, 4);
      var pw = box.w, px = box.x, py = H * 0.20, rowH = H * 0.098;
      var ph = H * 0.055 + shownRows.length * rowH;
      panel(ctx, px, py, pw, ph, H, a * open, EDGE);
      ctx.save();
      ctx.globalAlpha = a * open;
      fitLabel(ctx, METHOD.head, px + pw * 0.025, py + H * 0.042, pw * 0.95,
               H * 0.030, FG, "700");
      ctx.restore();
      for (var r = 0; r < shownRows.length; r++) {
        // Every heading here is one he names. Three more real ones used to
        // stand underneath from the moment the panel opened, with nothing said
        // about them — "let's remove those bottom 3 as they don't spawn
        // elegantly". METHOD still carries all seven; the panel shows four.
        var on = atIndex(scene.rowAt, r, t, 0.3);
        if (on <= 0) continue;
        var ry = py + H * 0.072 + r * rowH;
        ctx.save();
        ctx.globalAlpha = a * open * on;
        ctx.fillStyle = scene.accent || "#FFD426";
        ctx.fillRect(px + pw * 0.025, ry + H * 0.004, H * 0.004, H * 0.024);
        fitLabel(ctx, shownRows[r], px + pw * 0.045, ry + H * 0.024,
                 pw * 0.93, H * 0.023, FG, "600");
        ctx.restore();
        ruleLines(ctx, px + pw * 0.045, ry + H * 0.036, pw * 0.86, 2,
                  H * 0.021, a * open * on * 0.8, r * 7);
      }
      return;
    }

    // Every other stage keeps the chart and puts something under it.
    //
    // 'ask' used to draw the whole chart at 0.45, labels included, so the one
    // thing on screen during a line about trusting a chart was a chart nobody
    // could read. The FILL steps back; the type does not.
    barHead(ctx, W, H, a, CHART_HEAD, null);
    // The chart steps back behind the filing when it opens, so a document
    // lying across the right-hand half of the bar reads as being ON TOP of it
    // rather than as a bar that has been cut in half.
    var docOpen = stage === 'line' ? at(scene, 'lineAt', t, 0.6) : 0;
    var dim = (stage === 'ask' ? 0.70 : 1) * (1 - 0.55 * docOpen);
    icicle(ctx, [{ segs: LA_OUT, current: true }],
           { x: box.x, y: box.y, w: box.w, H: H, alpha: a * dim, labelAlpha: 1 });
    var under = box.y + H * ROW_CUR + H * 0.045;

    // The source line the live page prints under the chart. It is HERE, in
    // grey, from the moment the chapter starts — "a light grey [line] that is
    // under the bar graph" — and L025 turns it white as he says where the
    // numbers come from. A line that arrives at the moment it is named is a
    // line the viewer reads instead of listening to him.
    var src = SOURCES["Los Angeles"];
    var white = stage === 'line' ? at(scene, 'whiteAt', t, 0.5) : 0;
    if (stage === 'ask' || stage === 'line') {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = "600 " + Math.round(H * 0.024) + "px " + FONT;
      var txt = src.name + "  ·  " + src.asOf;
      var tw = ctx.measureText(txt).width + W * 0.028;
      panel(ctx, box.x, under, tw, H * 0.052, H,
            a * (0.45 + 0.55 * white), white > 0.5 ? (scene.accent || "#FFD426") : EDGE);
      label(ctx, txt, box.x + W * 0.014, under + H * 0.035, H * 0.024,
            white > 0.5 ? FG : DIM, "600");
      label(ctx, "↗", box.x + tw - W * 0.012, under + H * 0.035,
            H * 0.024, white > 0.5 ? (scene.accent || "#FFD426") : DIM, "700");
      ctx.restore();
    }

    if (stage === 'ask') {
      // The chapter's question, printed as one. It is the only line in the
      // episode that is a question to the viewer rather than a description.
      var titled = at(scene, 'titleAt', t, 0.5);
      if (titled > 0) {
        ctx.save();
        ctx.globalAlpha = a * titled;
        fitLabel(ctx, "Where did these numbers come from?", W / 2, H * 0.135,
                 W * 0.80, H * 0.052, FG, "800", "center");
        ctx.restore();
      }
      return;
    }

    if (stage === 'line') {
      // Pressing the source line opens the filing it names. "Every view names
      // its source" is the claim, and a named source you cannot reach is a
      // citation rather than a source, so the document itself rises over the
      // chart as he says it.
      //
      // Its BODY is rule-lines. The filing is real and its name is on the
      // panel; writing out sentences and presenting them as a state
      // controller's words would be inventing a public record, which is the
      // one thing this chapter exists to argue against.
      var on = docOpen;
      if (on <= 0) return;
      var dw = W * 0.46, dx = box.x + box.w - dw, dy = H * 0.16, dh = H * 0.56;
      ctx.save();
      ctx.globalAlpha = a * on;
      panel(ctx, dx, dy, dw, dh, H, a * on, scene.accent || "#FFD426");
      fitLabel(ctx, src.name, dx + dw * 0.07, dy + H * 0.062, dw * 0.86,
               H * 0.028, FG, "700");
      fitLabel(ctx, src.asOf, dx + dw * 0.07, dy + H * 0.095, dw * 0.86,
               H * 0.020, MUTED, "500");
      ctx.fillStyle = EDGE;
      ctx.fillRect(dx + dw * 0.07, dy + H * 0.115, dw * 0.86, Math.max(1, H * 0.002));
      ctx.restore();
      ruleLines(ctx, dx + dw * 0.07, dy + H * 0.145, dw * 0.86, 14,
                H * 0.028, a * on * 0.9, 17);
      return;
    }

    if (stage === 'wording') {
      // The same segment, twice: the government's own wording and ours, each
      // under the chip the page puts on it. Both strings already live together
      // on LA_OUT, which is why the chapter cannot pair the wrong two.
      var seg = LA_OUT[1];                       // City Electric Utility
      var pair = [{ chip: WORDING.gov, text: seg.gov, key: 'leftAt' },
                  { chip: WORDING.ours, text: seg.label, key: 'rightAt' }];
      var cw = (box.w - W * 0.025) / 2;
      for (var i = 0; i < 2; i++) {
        var lit = at(scene, pair[i].key, t, 0.45);
        if (lit <= 0) continue;
        var cxp = box.x + i * (cw + W * 0.025);
        panel(ctx, cxp, under, cw, H * 0.145, H, a * lit, EDGE);
        ctx.save();
        ctx.globalAlpha = a * lit;
        ctx.fillStyle = i === 0 ? "#2A3340" : "#3A3222";
        roundRect(ctx, cxp + cw * 0.04, under + H * 0.022, cw * 0.56, H * 0.036, H * 0.018);
        ctx.fill();
        fitLabel(ctx, pair[i].chip, cxp + cw * 0.07, under + H * 0.047, cw * 0.50,
                 H * 0.019, i === 0 ? "#8FB4D9" : (scene.accent || "#FFD426"), "700");
        fitLabel(ctx, pair[i].text, cxp + cw * 0.04, under + H * 0.100, cw * 0.92,
                 H * 0.028, FG, "600");
        ctx.restore();
      }
      return;
    }
    // 'ask': the chart alone, dimmed, with the figure in front of it.
  }

  // ── Chapter 7: what we actually cover ──────────────────────────────────
  // The map is a shape, not a dataset. It is drawn as a grid of cells standing
  // for the country, with the ones this episode has actually shown lit and the
  // rest dark. No cell is labelled with a coverage claim that has not been
  // checked — the chapter is about being honest on exactly this point.
  // The country, as the standard state tile grid: eleven columns, eight rows,
  // every state in roughly its own place. The old map was a 16x7 rectangle
  // with four cells lit, which said the product covers four towns.
  //
  // It covers 8,925 governments in all 51 states — read on 2026-10-13 from
  // api.empowered.vote/api/treasury/cities, counting every entity that carries
  // at least one year of data. The counts are nothing like even: Pennsylvania
  // has 2,620 and nineteen states have exactly one, which is a true and more
  // interesting picture than a scatter of identical blocks. So a cell's
  // BRIGHTNESS is its state's count, on a log scale, and the caption carries
  // the number.
  var MAP_COLS = 11, MAP_ROWS = 8;
  var MAP_GRID = [
    ["AK", "",   "",   "",   "",   "",   "",   "",   "",   "",   "ME"],
    ["",   "",   "",   "",   "",   "",   "",   "",   "VT", "NH", "MA"],
    ["WA", "ID", "MT", "ND", "MN", "IL", "WI", "MI", "NY", "CT", "RI"],
    ["OR", "NV", "WY", "SD", "IA", "IN", "OH", "PA", "NJ", "",   ""],
    ["CA", "UT", "CO", "NE", "MO", "KY", "WV", "VA", "MD", "DE", ""],
    ["AZ", "NM", "KS", "AR", "TN", "NC", "SC", "DC", "",   "",   ""],
    ["",   "",   "OK", "LA", "MS", "AL", "GA", "",   "",   "",   ""],
    ["HI", "",   "TX", "",   "",   "",   "",   "FL", "",   "",   ""]
  ];
  var MAP_COUNT = {
    PA: 2620, MI: 1857, MN: 944, NY: 780, IN: 660, CA: 538, FL: 480, MA: 357,
    OH: 342, VA: 162, SC: 60, TX: 17, UT: 16, WA: 13, OR: 11, NC: 7, AZ: 6,
    GA: 5, CO: 5, SD: 3, MS: 3, ND: 3, KS: 3, WI: 3, KY: 2, MD: 2, TN: 2,
    AL: 1, AK: 1, AR: 1, CT: 1, DE: 1, HI: 1, ID: 1, IL: 1, IA: 1, LA: 1,
    ME: 1, MO: 1, MT: 1, NE: 1, NV: 1, NH: 1, NJ: 1, NM: 1, OK: 1, RI: 1,
    VT: 1, WV: 1, WY: 1
  };
  var MAP_TOTAL = "8,925 governments, in all 51 states";

  function drawCoverage(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var stage = scene.stage || 'alpha';

    if (stage === 'search') {
      // A plain message card, in the product's real words. Confirmed live: an
      // entity the site does not have returns this, rather than quietly
      // showing somebody else's budget, which is exactly what L031 claims.
      var on = at(scene, 'cardAt', t, 0.5);
      if (on <= 0) return;
      var pw = W * 0.56, px = (W - pw) / 2 - W * 0.06, py = H * 0.28;
      panel(ctx, px, py, pw, H * 0.26, H, a * on, EDGE);
      ctx.save();
      ctx.globalAlpha = a * on;
      // The search box above it, with a city typed in.
      ctx.fillStyle = "#101014";
      roundRect(ctx, px + pw * 0.05, py + H * 0.035, pw * 0.90, H * 0.062, H * 0.010);
      ctx.fill();
      ctx.strokeStyle = EDGE; ctx.lineWidth = Math.max(1, H * 0.002); ctx.stroke();
      fitLabel(ctx, "Springfield", px + pw * 0.09, py + H * 0.077, pw * 0.80,
               H * 0.026, MUTED, "500");
      fitLabel(ctx, NOTFOUND + "...", px + pw * 0.05, py + H * 0.155, pw * 0.90,
               H * 0.028, FG, "600");
      ruleLines(ctx, px + pw * 0.05, py + H * 0.185, pw * 0.70, 2, H * 0.026, a * on * 0.8, 5);
      ctx.restore();
      return;
    }

    // 'alpha' and 'map': the country, state by state.
    var gx = W * 0.07, gy = H * 0.21, gw = W * 0.40;
    var cell = gw / MAP_COLS, gh = cell * MAP_ROWS;
    var fed = stage === 'map' ? at(scene, 'fedAt', t, 0.9) : 0;
    var cityOn = stage === 'map' ? atIndex(scene.cityAt, 0, t, 0.8) : 0;
    ctx.save();
    for (var r = 0; r < MAP_ROWS; r++) {
      for (var c = 0; c < MAP_COLS; c++) {
        var code = MAP_GRID[r][c];
        if (!code) continue;
        var n = MAP_COUNT[code] || 0;
        var cxp = gx + c * cell + 1, cyp = gy + r * cell + 1, cw = cell - 2;
        ctx.globalAlpha = a * (0.55 + 0.45 * fed);
        ctx.fillStyle = "#1C1C22";
        ctx.fillRect(cxp, cyp, cw, cw);
        if (n > 0 && cityOn > 0) {
          // Log scale, because the counts run from 1 to 2,620 and a linear
          // one would light Pennsylvania and leave forty-nine states black.
          // The floor of 0.30 is there so a state with one government still
          // reads as covered, which it is.
          var lit = 0.30 + 0.70 * (Math.log(n) / Math.log(2620));
          ctx.globalAlpha = a * cityOn * lit;
          ctx.fillStyle = scene.accent || "#FFD426";
          ctx.fillRect(cxp, cyp, cw, cw);
        }
      }
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = a;
    fitLabel(ctx, "Treasury Tracker is in alpha", gx, gy - H * 0.062,
             gw * 1.4, H * 0.034, FG, "700");
    if (cityOn > 0) {
      ctx.globalAlpha = a * cityOn;
      fitLabel(ctx, MAP_TOTAL, gx, gy - H * 0.026, gw * 1.4, H * 0.024,
               scene.accent || "#FFD426", "600");
    }
    if (fed > 0) {
      ctx.globalAlpha = a * fed;
      label(ctx, "The federal budget is there for anybody.", gx, gy + gh + H * 0.052,
            H * 0.024, MUTED, "600");
    }
    ctx.restore();

    // The four verbs, each on the second he says it. One line of work per
    // government, which is the honest answer to "why is my city not in yet".
    var verbs = ["Find the filing.", "Read it.", "Map it.", "Check it."];
    for (var v = 0; v < verbs.length; v++) {
      var vo = atIndex(scene.verbAt, v, t, 0.3);
      if (vo <= 0) continue;
      ctx.save();
      ctx.globalAlpha = a * vo;
      // A fixed column, not one measured off the map: the map is narrower
      // now that it is the state grid, and "just to the right of it" put the
      // verbs in the middle of the frame.
      label(ctx, verbs[v], W * 0.56, gy + H * 0.055 + v * H * 0.058,
            H * 0.028, FG, "600");
      ctx.restore();
    }
  }

  // ── The close: the real screen, panned ─────────────────────────────────
  // This is episode 1's drawLiveScreen, unchanged but for which global it
  // reads. There is ONE way to pan a screen in this series and this episode
  // does not invent a second: `panFrom` is a fraction of the travel and
  // `panRate` is fractions per second, so the pan is never told how long its
  // line is. A picture that already fits has no travel and draws exactly as it
  // did before the pan existed.
  function drawLiveScreen(ctx, t, W, H, scene) {
    var host = scene.host || 'treasurytracker.empowered.vote';
    // `arrive`, not a bare fade. Episode 1 gates this on `settled` and episode
    // 2 on `arrive`; copying episode 1's version brought a function that cannot
    // see `continues`, so close-follow faded up from black at the very cut its
    // panFrom was calculated to make continuous. `settled` still works, for
    // whatever sets it.
    var a = scene.settled ? 1 : arrive(scene, t, 0.2, 0.8);
    var pad = W * 0.12;
    var boxW = W - pad * 2;
    var x = pad, y = H * 0.12;

    if (!shot.complete || !shot.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = MUTED;
      ctx.textAlign = "center";
      ctx.font = "600 " + Math.round(H * 0.040) + "px " + FONT;
      ctx.fillText(host, W / 2, H * 0.45);
      ctx.restore();
      return;
    }

    var maxH = H * 0.62;   // still clears the Bobit standing in front of it
    var full = boxW * (shot.naturalHeight / shot.naturalWidth);
    var boxH = Math.min(full, maxH);
    var travel = full - boxH;
    var frac = Math.max(0, Math.min(1, (scene.panFrom || 0) + t * (scene.panRate || 0)));

    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.rect(x, y, boxW, boxH);
    ctx.clip();
    ctx.drawImage(shot, x, y - travel * frac, boxW, full);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = scene.accent || "#FFD426";
    ctx.lineWidth = Math.max(2, H * 0.005);
    ctx.strokeRect(x, y, boxW, boxH);
    ctx.fillStyle = MUTED;
    ctx.textAlign = "center";
    ctx.font = "600 " + Math.round(H * 0.032) + "px " + FONT;
    ctx.fillText(host, W / 2, y + boxH + H * 0.055);
    ctx.restore();
  }

  window.EVArt = Object.assign(window.EVArt || {}, {
    drawStub: drawStub,
    drawDocument: drawDocument,
    drawTitleCard: drawTitleCard,
    drawLiveScreen: drawLiveScreen,
    drawBudgetBar: drawBudgetBar,
    drawLineItems: drawLineItems,
    drawPayments: drawPayments,
    drawThreeCards: drawThreeCards,
    drawYears: drawYears,
    drawLevels: drawLevels,
    drawSourceCard: drawSourceCard,
    drawCoverage: drawCoverage
  });
  window.EVArt.ready = Promise.all([logoA.ready, shotA.ready]);
})();
