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

  // Four years of the same two segments, with each year's whole-budget total.
  // Roads rises and Electric falls back, which is what the tape says — "what
  // grew, what shrank". These are the real four values; a prettier pair was not
  // chosen and neither series is smoothed.
  var LA_YEARS = [
    { year: 2021, total: 17.3e9, roads: { amt: 2.2e9, pct: 12.6 }, electric: { amt: 3.9e9, pct: 22.5 } },
    { year: 2022, total: 18.4e9, roads: { amt: 2.4e9, pct: 13.1 }, electric: { amt: 4.4e9, pct: 23.6 } },
    { year: 2023, total: 19.5e9, roads: { amt: 2.5e9, pct: 12.9 }, electric: { amt: 4.7e9, pct: 24.1 } },
    { year: 2024, total: 21.5e9, roads: { amt: 3.5e9, pct: 16.1 }, electric: { amt: 4.5e9, pct: 20.8 } }
  ];

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
  // The note the live chart prints under its top level.
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

  window.EVArt = Object.assign(window.EVArt || {}, {
    drawStub: drawStub,
    drawDocument: drawDocument,
    drawTitleCard: drawTitleCard
  });
  window.EVArt.ready = Promise.all([logoA.ready, shotA.ready]);
})();
