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
  var LA_IN = [
    { label: "Tax Revenue",           amt: 6.5e9, c: "#3AABB8" },
    { label: "City Electric Utility", amt: 5.2e9, c: "#FF5740" },
    { label: "City Airport",          amt: 2.4e9, c: "#FED12E" },
    { label: "Service Fees",          amt: 2.0e9, c: "#9788B8" },
    { label: "City Water Utility",    amt: 1.8e9, c: "#74B589" }
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

  // Four years of EVERY top-level segment, in LA_OUT's order, so "change the
  // year and the whole shape redraws" can redraw the whole shape rather than
  // two of it. `amt` in billions; `pct` is the share the page prints.
  //
  // One thing the live chart does that this does not: it re-sorts the segments
  // by size each year, so Water and Health swap places between FY2022 and
  // FY2023. Re-sorting mid-animation would be a frame of chaos and would stop
  // the viewer following any one segment, which is the whole point of the
  // chapter. Each segment therefore keeps its place and its colour, and only
  // its width moves. The year that is on screen longest — FY2024, every other
  // chapter — is exact.
  var YEAR_ROWS = [
    { year: 2021, total: 17.3e9,
      amt: [4.70, 3.90, 2.20, 1.60, 1.40, 1.30, 1.20, 0.6163, 0.4539, 0.0368],
      pct: [27.4, 22.5, 12.6,  9.0,  7.8,  7.5,  6.8,  3.6,    2.6,    0.2] },
    { year: 2022, total: 18.4e9,
      amt: [4.90, 4.40, 2.40, 1.70, 1.40, 1.50, 1.00, 0.6731, 0.4442, 0.0433],
      pct: [26.4, 23.6, 13.1,  9.4,  7.6,  8.1,  5.5,  3.7,    2.4,    0.2] },
    { year: 2023, total: 19.5e9,
      amt: [5.00, 4.70, 2.50, 2.10, 1.50, 1.50, 0.8985, 0.8014, 0.5127, 0.0559],
      pct: [25.5, 24.1, 12.9, 10.5,  7.9,  7.6,  4.6,    4.1,    2.6,    0.3] },
    { year: 2024, total: 21.5e9,
      amt: [5.60, 4.50, 3.50, 2.20, 1.70, 1.50, 1.30, 0.7568, 0.4611, 0.0659],
      pct: [25.9, 20.8, 16.1, 10.2,  7.7,  7.2,  6.2,  3.5,    2.1,    0.3] }
  ];
  // The two the closing sentence is about. Roads rises and Electric falls back:
  // "what grew, what shrank". The real four values, neither series smoothed and
  // neither pair chosen to flatter the line.
  var GREW = 2, SHRANK = 1;              // indices into LA_OUT

  // One year's segments, in LA_OUT's order, ready for icicle().
  function yearSegs(i) {
    var row = YEAR_ROWS[i], out = [];
    for (var k = 0; k < LA_OUT.length; k++) {
      out.push({ label: LA_OUT[k].label, c: LA_OUT[k].c, amt: row.amt[k] * 1e9, pct: row.pct[k] });
    }
    return out;
  }
  // The same, between two years, so a year change is a move rather than a cut.
  function yearSegsBetween(a, b, u) {
    var A = YEAR_ROWS[a], B = YEAR_ROWS[b], out = [];
    for (var k = 0; k < LA_OUT.length; k++) {
      var amt = (A.amt[k] + (B.amt[k] - A.amt[k]) * u) * 1e9;
      out.push({ label: LA_OUT[k].label, c: LA_OUT[k].c, amt: amt,
                 pct: A.pct[k] + (B.pct[k] - A.pct[k]) * u });
    }
    return out;
  }

  // The four governments, FY2024, outermost first. `perPerson` is the figure
  // the page itself computes and prints; nothing here divides.
  var LEVELS = [
    { name: "United States",      out: 7195.8e9, perPerson: null },
    { name: "California",         out:  190.3e9, perPerson: "$4,818" },
    { name: "Los Angeles County", out:   37.6e9, perPerson: "$3,752" },
    { name: "Los Angeles",        out:   21.5e9, perPerson: "$5,548" }
  ];

  // The federal top level, FY2024, by what it is for. Nine named segments is as
  // many as the frame holds honestly; the real chart has more below
  // Transportation and drawLevels says so rather than ending silently.
  var FED_OUT = [
    { label: "Social Security",          amt: 1460.9e9, c: "#3AABB8" },
    { label: "Interest on the debt",     amt: 1133.0e9, c: "#FF5740" },
    { label: "Health care programs",     amt:  911.3e9, c: "#FED12E" },
    { label: "Medicare",                 amt:  874.1e9, c: "#9788B8" },
    { label: "National defense",         amt:  873.5e9, c: "#74B589" },
    { label: "Income support programs",  amt:  670.5e9, c: "#59B0C4" },
    { label: "Veterans benefits",        amt:  329.2e9, c: "#C2674A" },
    { label: "Education & job training", amt:  306.4e9, c: "#D4940B" },
    { label: "Transportation",           amt:  136.6e9, c: "#4D8FC2" }
  ];
  // The federal toggles, in the product's own words.
  var FED_TOGGLE = ["What it's for", "Who spends it"];
  var FED_SCALE = ["$", "Per person"];

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
  var BASIS = "Top-level descriptions from GASB Statement No. 34 — Basic Financial Statements.";
  // What the site says when it does not have a government. Confirmed live.
  var NOTFOUND = "We couldn't find a government matching";

  // The fund codes chapter 1's document is full of. These are the codes Chris
  // reads aloud — imaginary examples either way, so the only thing that matters
  // is that the prop agrees with the narration.
  var CODES = ["FUND 010", "DEPARTMENT 08", "ACCOUNT 42010"];

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
      var h = Math.max(2, Math.round(H * (row.current ? ROW_CUR : ROW_ANC)));
      var total = 0, i;
      for (i = 0; i < row.segs.length; i++) total += row.segs[i].amt;
      var cx = x;
      for (i = 0; i < row.segs.length; i++) {
        var s = row.segs[i];
        var sw = total > 0 ? w * (s.amt / total) : 0;
        // `divide` runs 0 -> 1 as one undivided bar becomes its segments: at 0
        // every segment is an equal slice of plain grey, at 1 it is sized and
        // coloured. This is L006's "every department is a slice of it, sized by
        // what it actually receives", in that order.
        if (o.divide != null && o.divide < 1) {
          sw = (w / row.segs.length) * (1 - o.divide) + sw * o.divide;
        }
        // One segment opening toward the full width, the rest closing.
        if (row.current && o.openIndex != null && o.openGrow > 0) {
          sw = o.openIndex === i ? sw + (w - sw) * o.openGrow : sw * (1 - o.openGrow);
        }
        ctx.fillStyle = o.divide != null && o.divide < 0.5 ? GRID : s.c;
        ctx.fillRect(Math.round(cx), Math.round(y), Math.max(0, Math.round(sw) - 1), h);
        if (row.current && sw >= minLabel && fits(ctx, s.label, sw - h * 0.30, H * 0.022) &&
            (o.labelAlpha == null || o.labelAlpha > 0)) {
          ctx.save();
          ctx.globalAlpha = alpha * (o.labelAlpha == null ? 1 : o.labelAlpha);
          fitLabel(ctx, s.label, cx + h * 0.15, y + h * 0.42, sw - h * 0.30,
                   H * 0.022, ONSEG, "700", "left");
          fitLabel(ctx, money(s.amt), cx + h * 0.15, y + h * 0.72, sw - h * 0.30,
                   H * 0.021, "rgba(16,19,26,0.78)", "600", "left");
          ctx.restore();
        }
        cx += sw;
      }
      y += h + gap;
    }
    ctx.restore();
    return y;
  }

  // The trail above the bar. `shown` is how many parts are visible, so L009 can
  // build it one step at a time without a second copy of the list.
  function breadcrumb(ctx, parts, shown, x, y, W, H, alpha) {
    if (alpha <= 0 || shown <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    var size = H * 0.020, cx = x;
    var n = Math.min(shown, parts.length);
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
      // Divided at sliceAt, sized at sizeAt: the two halves of the sentence.
      var divided = at(scene, 'sliceAt', t, 0.9);
      var sized = at(scene, 'sizeAt', t, 1.2);
      barHead(ctx, W, H, a * shaped, CHART_HEAD, CHART_SUB);
      opts.alpha = a * shaped;
      opts.divide = Math.max(divided * 0.5, sized);
      opts.labelAlpha = sized;
      rows = [{ segs: LA_OUT, current: true }];
      icicle(ctx, rows, opts);
      return;
    }

    if (stage === 'named') {
      // The two largest gain their names as he reaches the answer, so the
      // question that follows lands on a picture that already answers it.
      barHead(ctx, W, H, a, CHART_HEAD, CHART_SUB);
      rows = [{ segs: LA_OUT, current: true }];
      opts.labelAlpha = 0;                      // the names are drawn below
      icicle(ctx, rows, opts);
      var total = 0, k;
      for (k = 0; k < LA_OUT.length; k++) total += LA_OUT[k].amt;
      var cx = box.x, rowH = Math.round(H * ROW_CUR);
      for (k = 0; k < LA_OUT.length; k++) {
        var segW = box.w * (LA_OUT[k].amt / total);
        if (k < 2) {
          var on = atIndex(scene.nameAt, k, t, 0.4);
          if (on > 0) {
            ctx.save();
            ctx.globalAlpha = a * on;
            fitLabel(ctx, LA_OUT[k].label, cx + rowH * 0.22, box.y + rowH * 0.44,
                     segW - rowH * 0.44, H * 0.022, ONSEG, "700", "left");
            fitLabel(ctx, money(LA_OUT[k].amt) + "  ·  " + LA_OUT[k].pct + "%",
                     cx + rowH * 0.22, box.y + rowH * 0.82, segW - rowH * 0.44,
                     H * 0.020, "rgba(16,19,26,0.80)", "600", "left");
            ctx.restore();
          }
        }
        cx += segW;
      }
      return;
    }

    if (stage === 'open' || stage === 'trail') {
      // The first row compresses to an ancestor and its first segment's
      // children become the current row. "it opens" 1.90, then one level
      // deeper at 5.24.
      var opened = at(scene, 'openAt', t, 0.9);
      var deeper = at(scene, 'deeperAt', t, 0.9);
      barHead(ctx, W, H, a, CHART_HEAD, null);
      if (opened <= 0) {
        icicle(ctx, [{ segs: LA_OUT, current: true }], opts);
        return;
      }
      rows = [{ segs: LA_OUT, current: false }, { segs: LA_DRILL.level1, current: true }];
      opts.labelAlpha = opened;
      icicle(ctx, rows, opts);
      crumbShown = stage === 'trail'
        ? Math.floor(1 + (LA_DRILL.crumb.length - 1) *
            Math.max(0, Math.min(1, at(scene, 'crumbAt', t, 2.0))))
        : 5 + Math.round(deeper);
      crumbAlpha = a * (stage === 'trail' ? at(scene, 'crumbAt', t, 0.4) : opened);
      breadcrumb(ctx, LA_DRILL.crumb, crumbShown, box.x, box.y - H * 0.038, W, H, crumbAlpha);
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
    var below = icicle(ctx, [{ segs: LA_OUT, current: false },
                             { segs: LA_DRILL.level1, current: true }],
                       { x: box.x, y: box.y, w: box.w, H: H, alpha: a });
    barHead(ctx, W, H, a, CHART_HEAD, null);
    breadcrumb(ctx, LA_DRILL.crumb, LA_DRILL.crumb.length, box.x, box.y - H * 0.038, W, H, a);

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
    var below = icicle(ctx, [{ segs: LA_OUT, current: false },
                             { segs: LA_DRILL.level1, current: true }],
                       { x: box.x, y: box.y, w: box.w, H: H, alpha: a });
    barHead(ctx, W, H, a, CHART_HEAD, null);
    breadcrumb(ctx, LA_DRILL.crumb, LA_DRILL.crumb.length, box.x, box.y - H * 0.038, W, H, a);

    var open = at(scene, 'panelAt', t, 0.5);
    if (open <= 0) return;
    var py = below + H * 0.045, ph = H * 0.30;
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

    var rowH = H * 0.034;
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
  function cardBox(W, H, i) {
    var box = barBox(W, H);
    var gap = W * 0.02, w = (box.w - gap * 2) / 3;
    return { x: box.x + i * (w + gap), y: H * 0.085, w: w, h: H * 0.135 };
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
    barHead(ctx, W, H, a, CHART_HEAD, CHART_SUB);
    icicle(ctx, [{ segs: LA_OUT, current: true }],
           { x: box.x, y: box.y, w: box.w, H: H, alpha: a });

    for (var i = 0; i < LA_CARDS.length; i++) {
      var c = LA_CARDS[i], b = cardBox(W, H, i);
      // The third card is present and FAINT from the first scene — "a third
      // joins them faintly" — and only lights when he names it. `cardAt` is
      // indexed by CARD, in this array's order, NOT by the order the script
      // names them: he says money out first, and reading the two arrays at the
      // same index put every label on the wrong row in episode 2.
      var base = (stage === 'two' && i === 2) ? 0.35 : 1;
      var on = stage === 'named' ? atIndex(scene.cardAt, i, t, 0.4) : 0;
      var strength = Math.max(base, on);
      panel(ctx, b.x, b.y, b.w, b.h, H, a * strength,
            on > 0.5 ? (scene.accent || "#FFD426") : EDGE);
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
  function drawYears(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var box = barBox(W, H);

    if (scene.stage === 'across') {
      // Four years side by side, one column each, and the two the closing
      // sentence is about picked out of the rest.
      barHead(ctx, W, H, a, "Los Angeles, FY2021 to FY2024", CHART_SUB);
      var colW = (box.w - W * 0.018 * 3) / 4;
      for (var y = 0; y < YEAR_ROWS.length; y++) {
        var on = atIndex(scene.colAt, y, t, 0.35);
        if (on <= 0) continue;
        var cx = box.x + y * (colW + W * 0.018);
        ctx.save();
        ctx.globalAlpha = a * on;
        label(ctx, "FY" + YEAR_ROWS[y].year, cx, box.y - H * 0.014,
              H * 0.022, MUTED, "700");
        ctx.restore();
        // A vertical stack: each segment's share of that year, top to bottom.
        var segs = yearSegs(y), total = 0, k;
        for (k = 0; k < segs.length; k++) total += segs[k].amt;
        var cy = box.y, colH = H * 0.34;
        for (k = 0; k < segs.length; k++) {
          var sh = colH * (segs[k].amt / total);
          var pick = (k === GREW && at(scene, 'grewAt', t, 0.4) > 0) ||
                     (k === SHRANK && at(scene, 'shrankAt', t, 0.4) > 0);
          ctx.save();
          ctx.globalAlpha = a * on * (pick ? 1 : (k === GREW || k === SHRANK ? 1 : 0.22));
          ctx.fillStyle = segs[k].c;
          ctx.fillRect(Math.round(cx), Math.round(cy), Math.round(colW),
                       Math.max(1, Math.round(sh) - 1));
          ctx.restore();
          if ((k === GREW || k === SHRANK) && sh > H * 0.028) {
            ctx.save();
            ctx.globalAlpha = a * on;
            fitLabel(ctx, segs[k].pct.toFixed(1) + "%", cx + colW * 0.06,
                     cy + sh * 0.62, colW * 0.88, H * 0.021, ONSEG, "700");
            ctx.restore();
          }
          cy += sh;
        }
      }
      // Which two the eye is meant to follow, named once under the columns.
      var namedGrew = at(scene, 'grewAt', t, 0.4), namedShrank = at(scene, 'shrankAt', t, 0.4);
      var ly = box.y + H * 0.385;
      if (namedGrew > 0) {
        ctx.save(); ctx.globalAlpha = a * namedGrew;
        ctx.fillStyle = LA_OUT[GREW].c;
        ctx.fillRect(box.x, ly - H * 0.016, H * 0.020, H * 0.020);
        label(ctx, LA_OUT[GREW].label + " grew, 12.6% to 16.1%",
              box.x + H * 0.030, ly, H * 0.022, FG, "600");
        ctx.restore();
      }
      if (namedShrank > 0) {
        ctx.save(); ctx.globalAlpha = a * namedShrank;
        ctx.fillStyle = LA_OUT[SHRANK].c;
        ctx.fillRect(box.x, ly + H * 0.022, H * 0.020, H * 0.020);
        label(ctx, LA_OUT[SHRANK].label + " fell back, 22.5% to 20.8%",
              box.x + H * 0.030, ly + H * 0.038, H * 0.022, FG, "600");
        ctx.restore();
      }
      return;
    }

    // 'change': the year steps and every segment moves with it.
    var u = at(scene, 'changeAt', t, 1.3);
    var segsNow = u <= 0 ? yearSegs(2) : yearSegsBetween(2, 3, u);
    var shown = u < 0.5 ? YEAR_ROWS[2] : YEAR_ROWS[3];
    barHead(ctx, W, H, a, CHART_HEAD, CHART_SUB);
    icicle(ctx, [{ segs: segsNow, current: true }],
           { x: box.x, y: box.y, w: box.w, H: H, alpha: a });
    ctx.save();
    ctx.globalAlpha = a;
    label(ctx, "FY" + shown.year, box.x + box.w, box.y - H * 0.040,
          H * 0.030, scene.accent || "#FFD426", "700", "right");
    label(ctx, money(shown.total) + " spent", box.x + box.w, box.y - H * 0.012,
          H * 0.021, MUTED, "600", "right");
    ctx.restore();
  }

  window.EVArt = Object.assign(window.EVArt || {}, {
    drawStub: drawStub,
    drawDocument: drawDocument,
    drawTitleCard: drawTitleCard,
    drawBudgetBar: drawBudgetBar,
    drawLineItems: drawLineItems,
    drawPayments: drawPayments,
    drawThreeCards: drawThreeCards,
    drawYears: drawYears
  });
  window.EVArt.ready = Promise.all([logoA.ready, shotA.ready]);
})();
