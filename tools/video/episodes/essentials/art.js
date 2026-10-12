// Episode 2 art — Empowered Essentials.
//
// Every function is a pure function of (ctx, t, W, H, scene). No module-level
// mutable state, or the determinism guarantee in tests/video/02-determinism.cjs
// is void for this episode. Everything is sized from W and H so the same code
// renders at 320x180 in the fixtures and at 1920x1080 in the episode, and the
// lower third is left clear because the cast draws on top.
//
// WHAT IS ON SCREEN IS REAL. Chapters 3 to 5 show one sitting official, read
// out of the live platform on 2026-10-12, and chapter 4's comparison shows two
// real campaigns. An invented profile would teach a product that does not
// exist, and this episode's own closing argument is that we show our work.
(function () {
  "use strict";
  var FG = "#F2F2F2", MUTED = "#9A9AA0", GRID = "#33333D", DIM = "#5A5A68";
  var CARD = "#1A1A20", EDGE = "#2C2C36";
  var FONT = '"Figtree", "Segoe UI", system-ui, sans-serif';

  // ── The money bands ────────────────────────────────────────────────────
  // The product's own colours and its own labels, from the shipped component
  // essentials/src/components/CampaignFinance/CompositionBar.jsx. A viewer who
  // watches this and then opens the page has to see the same green mean the
  // same thing. These are the Tailwind values that component names: green-500,
  // blue-500, purple-500, amber-500.
  //
  // The component draws a FIFTH band, "Other" — transfers between committees,
  // interest and refunds. The recorded narration says four groups, so four is
  // what is drawn. The bands are scaled to their own sum, which is 99% of this
  // campaign's receipts, so the picture is the proportion and the printed
  // amounts are the filed figures.
  var BANDS = [
    { label: "Grassroots donors", sub: "$200 or less", c: "#22C55E" },
    { label: "Large individual donors", sub: "more than $200", c: "#3B82F6" },
    { label: "PACs & committees", sub: null, c: "#A855F7" },
    { label: "Self-funding", sub: null, c: "#F59E0B" }
  ];

  // ── The official chapters 3 to 5 are about ─────────────────────────────
  // Jacqui Irwin, read out of the live platform. She is here rather than a
  // member of Congress for one reason that decides the episode: a senator's
  // voting record in this platform is procedural roll calls — "On the Cloture
  // Motion H.R. 6644" — with no bill attached, and chapter 5 promises the
  // bill, what it did, and which way they went. Hers are real bills.
  //
  // No party. The live Essentials profile does not put a letter on a person
  // and neither does this episode: the chapter's argument is that the page
  // shows a record, and a party badge invites the viewer to read the record
  // off the badge instead.
  var WHO = {
    name: "Jacqui Irwin",
    seat: "Assembly Member",
    district: "Assembly District 42, California",
    term: "Term began December 2022"
  };
  // The ballot banner, in the product's own words (essentials Profile.jsx:172
  // and :177). Her Assembly seat is on the November 3 2026 ballot and she is
  // not on it: she is an active candidate for U.S. Representative, District 26,
  // in the same election. That is what makes the seat open.
  var BALLOT = { head: "This seat is on the ballot", sub: "Open seat · Election: November 3, 2026" };

  // ── The stance ladder ──────────────────────────────────────────────────
  // Affordable Housing, read off inform.compass_stances_current, shortened to
  // fit a rung and in the live order: value 1 at the top, value 5 at the
  // bottom. The full sentences are on the page; the shape of the ladder is
  // what this chapter teaches.
  var LADDER = [
    "The government builds and runs it",
    "A big public sector holds prices down",
    "Binding rules on the private market",
    "Subsidies and tax breaks, no mandates",
    "Leave it to the market"
  ];
  // Her answer is value 4. Written once: the ladder highlights PICK, the mini
  // compass puts her dot on the same rung, and chapter 5 lays this same stance
  // beside a vote. In episode 1 the same fact lived in three places until they
  // disagreed on screen.
  var PICK = 3;                                     // zero-based index of value 4
  var TOPIC = "Affordable Housing";
  var REASONING = "Voted NO on SB 9, YES on SB 423, YES on AB 1287. Opposed blanket " +
                  "upzoning but supports targeted housing supply tools.";
  var SOURCES = ["leginfo.legislature.ca.gov — SB 9 roll call",
                 "leginfo.legislature.ca.gov — SB 423 roll call",
                 "leginfo.legislature.ca.gov — AB 1287 roll call"];
  // A topic she has no answer on, so chapter 3 ends on a real blank rather
  // than a staged one. A state legislator has no federal border record, and
  // the platform holds none for her.
  var BLANK_TOPIC = "Border Security";

  // ── The compass colours ────────────────────────────────────────────────
  // The same three as episode 1, because the mini compass on an Essentials
  // profile is the same component: you purple, them green, and a spoke where
  // you both picked the same answer yellow and an eighth larger.
  // (ev-ui src/RadarChartCore.jsx, dark theme.)
  var YOU_C = "#7C6B9E", THEM_C = "#6DD28C", SAME_C = "#FED12E", SAME_R = 8 / 7;
  var YOU_FILL = "rgba(124, 107, 158, 0.40)", THEM_FILL = "rgba(110, 210, 140, 0.30)";

  // ── Her money ──────────────────────────────────────────────────────────
  // FEC 2026, committee H6CA26266. Amounts in dollars; the bar is drawn from
  // these four and the total is printed as filed.
  var MONEY = { total: 822382, v: [17494, 634338, 164050, 0] };
  // The committees that gave, from her California filings. Organisations, not
  // the individual donors the same table holds: the names of private people
  // are public record on the page and still do not need to be six feet tall.
  var COMMITTEES = [
    { name: "California Teachers Association — ABC", amt: 21800 },
    { name: "SoCal Pipe Trades District Council #16 PAC", amt: 21400 },
    { name: "Google LLC and affiliated entities", amt: 14000 },
    { name: "Airbnb Inc", amt: 13500 },
    { name: "Peace Officers Research Assn of CA PAC", amt: 13300 },
    { name: "PhRMA PAC", amt: 12800 }
  ];

  // ── The two campaigns chapter 4 compares ───────────────────────────────
  // Real, and chosen because their totals are within six tenths of one per
  // cent of each other while the money behind them has almost nothing in
  // common. One is paid for by committees, the other by the candidate. They
  // are one of each party, which is why this pair and not another — but the
  // parties are not NAMED, here or anywhere else in the episode, for the same
  // reason the profile carries no letter. The lesson is about composition, and
  // a letter beside a bar turns it into a lesson about a side.
  var PAIR = [
    { name: "John Garamendi", total: 489135, v: [0.02, 0.30, 0.68, 0.00] },
    { name: "Janak Joshi", total: 485987, v: [0.16, 0.10, 0.02, 0.72] }
  ];

  // ── Her record ─────────────────────────────────────────────────────────
  // Real bills and real positions from the platform's legislative votes. SB 9,
  // SB 423 and AB 1287 are the three her housing stance cites, which is the
  // whole point of the chapter that puts the two records side by side.
  var VOTES = [
    { no: "SB 16", title: "Ending Street Homelessness Act", pos: "yea" },
    { no: "AB 1287", title: "Density bonus: affordable housing", pos: "yea" },
    { no: "SB 9", title: "Upzoning and lot splitting", pos: "nay" },
    { no: "SB 423", title: "Multifamily housing streamlining", pos: "yea" },
    { no: "AB 113", title: "Budget Act of 2025", pos: "yea" }
  ];

  // The offices chapter 2 hands back for one address, grouped the way the live
  // results page groups them. These are the real Los Angeles rows from the
  // still this episode closes on, which is why the closing shot agrees with
  // the drawing that came nine minutes before it.
  var LEVELS = [
    { band: "Local", rows: ["Mayor", "City Council, District 14", "City Attorney", "City Controller"] },
    { band: "School", rows: ["Board of Education, District 2"] },
    { band: "County and state", rows: ["County Supervisor, District 1", "County Assessor",
                                       "State Assembly, District 54", "State Senate, District 24"] },
    { band: "Federal", rows: ["U.S. Representative, District 34", "U.S. Senate"] }
  ];

  // The boundaries chapter 2 grows around one address, in the order and at the
  // seconds the recording names them.
  var BOUNDS = [
    { name: "City", at: 3.48 }, { name: "School district", at: 4.10 },
    { name: "County", at: 5.06 }, { name: "State house district", at: 5.98 },
    { name: "State senate district", at: 7.06 }, { name: "Congressional district", at: 8.68 }
  ];

  // Chapter 1's ballot, and chapter 7's. One row per office, and the row owns
  // BOTH of its seconds: `at` is when chapter 1 names it, `touchAt` is when
  // chapter 7 says what it decides. Those were two parallel arrays, and
  // parallel arrays in the same order as each other is exactly what they were
  // not: zoning hung off the assessor, the school day off the water board, and
  // every one of the five labels pointed at the wrong row.
  //
  // The City Council is on the ballot from the first frame and is not read
  // out. The line says "here are SOME of the jobs that are on your ballot", a
  // real ballot carries more rows than a narrator lists, and it is the row
  // that decides zoning — which is the first thing chapter 7 names.
  //
  // "Your school day" is on TWO rows. A school board and a community college
  // board both decide one, so the label arrives beside both on the same word
  // and both rows light together. One office, one label is the usual case,
  // not a rule — and five labels for six rows was the thing that made the
  // Community College Trustee look forgotten.
  var JOBS = [
    { name: "City Council, District 14",   at: 0,    touch: "Your zoning",                    touchAt: 4.31 },
    { name: "County Assessor",             at: 2.63, touch: "What your house is assessed at", touchAt: 7.83 },
    { name: "Water District Board",        at: 3.77, touch: "Your water bill",                touchAt: 6.33 },
    { name: "Community College Trustee",   at: 5.29, touch: "Your school day",                touchAt: 5.33 },
    { name: "Superior Court Judge",        at: 7.33, touch: "Who hears your case",            touchAt: 10.00 },
    { name: "School Board, Seat 4",        at: 8.65, touch: "Your school day",                touchAt: 5.33 }
  ];
  // Chapter 1's scatter: where the answer is kept today. Each card is a PAIR —
  // the office that keeps the record and the record it keeps — because the
  // line is "the city clerk HAS the council", and that sentence is about the
  // link between the two. Eight cards with eight single nouns on them had the
  // custodian and the record as separate objects, so the one thing the line
  // says was the one thing the picture did not.
  //
  // The first four are named in the recording, on the second they are named.
  // The other four arrive together at the end, under "none of them talk to
  // each other", to make a dozen out of four: before that the viewer is meant
  // to be following one card at a time, not reading a wall.
  var SITES = [
    { keeper: "City Clerk",                  holds: "The council",         at: 4.10 },
    { keeper: "County",                      holds: "The assessor",        at: 6.00 },
    { keeper: "State",                       holds: "The legislature",     at: 8.16 },
    { keeper: "Federal Election Commission", holds: "The money",           at: 10.10 },
    { keeper: "School District",             holds: "The school board",    at: 11.68 },
    { keeper: "Court Clerk",                 holds: "The judges",          at: 11.86 },
    { keeper: "Water District",              holds: "The water board",     at: 12.04 },
    { keeper: "Registrar of Voters",         holds: "Your ballot",         at: 12.22 }
  ];

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
  var shotA = load(window.EVEssentialsShot);
  var logoA = load(window.EVEssentialsLogo);
  var shot = shotA.img, logo = logoA.img;

  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function fade(t, t0, dur) { return ease((t - t0) / dur); }
  // An entrance, unless the thing is already on screen. A scene that carries
  // on from the one before says `continues: true` and nothing in it fades in
  // again — the blink at every cut is the first thing a reviewer sees.
  function arrive(scene, t, t0, dur) { return scene.continues ? 1 : fade(t, t0, dur); }
  // The same idea for one thing inside a scene. Zero means "it was already
  // there", not "it starts now": only a POSITIVE time animates.
  function since(t, t0, dur) { return t0 > 0 ? fade(t, t0, dur) : 1; }

  // A thing inside a scene has THREE states, not two, and the missing third
  // one put the mini compass, the source drawer and the coverage message two
  // scenes early in the first cut of this episode:
  //
  //   undefined   not in this scene at all
  //   0           already on screen before this scene started
  //   > 0         arrives at that second
  //
  // `since` cannot tell the first two apart, because a field nobody set reads
  // as zero and zero means "already there". So every optional thing asks for
  // its field by NAME, and a scene that wants to keep something says so with
  // an explicit 0 — which is the same convention episode 1 uses for `dim` and
  // `letters`.
  function at(scene, key, t, dur) {
    var t0 = scene[key];
    if (t0 == null) return 0;
    return since(t, t0, dur);
  }
  // The same three states for one entry of an array field, such as the second
  // a single money band is named.
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
  // One panel, one border, one radius, everywhere. Six hand-rolled panels
  // drift apart by a pixel each and the frame stops looking built.
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
  function money(n) {
    if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return "$" + Math.round(n / 1000) + "k";
    return "$" + n;
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
  // One line of type that does not fit its card is this episode's most
  // repeated fault: the district under a name ran off the profile, the
  // reasoning ran out of its drawer, the longest custodian ran off its sheet.
  // Each was fixed where it happened, which is why it happened again
  // somewhere else. Anything printed inside a box goes through here, and the
  // caller passes the width of the box rather than hoping.
  //
  // It shrinks rather than clips or wraps: a clipped word is a word cut in
  // half, and a line that wraps changes the height of whatever holds it.
  var MINSIZE = 0.55;                              // never smaller than this share
  function fitLabel(ctx, s, x, y, maxW, size, color, weight, align) {
    ctx.font = (weight || "500") + " " + Math.round(size) + "px " + FONT;
    var got = ctx.measureText(s).width;
    if (got > maxW) size = Math.max(size * MINSIZE, size * maxW / got);
    label(ctx, s, x, y, size, color, weight, align);
    return size;
  }
  // A portrait stand-in: the product shows a photograph, and this episode does
  // not ship one. A grey plate with a shoulders-and-head silhouette says "a
  // person's picture goes here" without putting a drawn face on a real person.
  function portrait(ctx, x, y, w, h, H, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#262630";
    roundRect(ctx, x, y, w, h, H * 0.012); ctx.fill();
    // Inside the plate. The shoulders are drawn past its bottom edge on
    // purpose — that is what makes it read as a crop of a photograph rather
    // than a bust floating in a box — but without the clip they were a grey
    // shape cut off square against the card behind it.
    roundRect(ctx, x, y, w, h, H * 0.012); ctx.clip();
    ctx.fillStyle = "#3A3A46";
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.36, w * 0.20, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 1.02, w * 0.34, h * 0.30, 0, Math.PI, 0);
    ctx.fill();
    ctx.restore();
  }

  // ── Chapter 1 and chapter 7: the ballot ────────────────────────────────
  //
  // One function, two chapters. The episode opens on this column and comes
  // back to it eight minutes later to argue about its bottom half, and the
  // viewer has to recognise it as the same object — so the geometry is fixed
  // here and never nudged by a scene. The top of the column is the three
  // offices anybody can name; the bottom is the five the narration reads out.
  //
  // `stage` says which beat this is:
  //   jobs    the jobs arrive as they are spoken (L001)
  //   names   the top three light as they are named, the rest stay dim (L002)
  //   lower   the bottom half is brighter than the top (L031, L034)
  //   labels  what each of those offices decides, beside it (L032)
  var TOP = ["President", "Governor", "U.S. Senator"];
  // The column is as tall as its rows, not as tall as a number somebody chose.
  // It was H * 0.70 with five rows under the fold, and the sixth printed off
  // the bottom of the paper — the last job the narrator reads out, hanging in
  // mid-air below the card that was supposed to hold it.
  function ballotBox(W, H) {
    var rowH = H * 0.066;
    var head = H * 0.115;                           // the title and its rule
    var fold = H * 0.018, afterFold = H * 0.028;    // the dashed line and its air
    var foot = H * 0.030;
    return {
      x: W * 0.16, y: H * 0.035, w: W * 0.30,
      h: head + TOP.length * rowH + fold + afterFold + JOBS.length * rowH + foot,
      rowH: rowH, head: head, fold: fold, afterFold: afterFold
    };
  }
  function drawBallot(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.6);
    if (a <= 0) return;
    var b = ballotBox(W, H), stage = scene.stage || "jobs";
    var lower = stage === "lower" || stage === "labels";

    panel(ctx, b.x, b.y, b.w, b.h, H, a);
    ctx.save();
    ctx.globalAlpha = a;
    label(ctx, "OFFICIAL BALLOT", b.x + b.w / 2, b.y + H * 0.055, H * 0.026, MUTED, "700", "center");
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = Math.max(1, H * 0.002);
    ctx.beginPath();
    ctx.moveTo(b.x + b.w * 0.08, b.y + H * 0.075);
    ctx.lineTo(b.x + b.w * 0.92, b.y + H * 0.075);
    ctx.stroke();
    ctx.restore();

    // The three anybody can name. In the scene that says so they light one at
    // a time, on the second each is spoken; everywhere else they are simply
    // there, at full strength above the fold and dimmed below it.
    var rowH = b.rowH, top0 = b.y + b.head;
    for (var i = 0; i < TOP.length; i++) {
      var ta = 1;
      if (stage === "names") ta = 0.30 + 0.70 * since(t, (scene.nameAt || [])[i] || 0, 0.35);
      if (lower) ta = 0.32;
      ballotRow(ctx, b, top0 + i * rowH, rowH, H, a * ta, TOP[i], true);
    }

    // The fold is AIR, not a rule. A dashed line across the paper drew the eye
    // to itself and cut the column in two, and the column is one object: the
    // argument of chapter 7 is about where you stop reading, which the dimmed
    // top three say on their own.
    var foldY = top0 + TOP.length * rowH + b.fold;
    var jy = foldY + b.afterFold;
    for (var k = 0; k < JOBS.length; k++) {
      // In the opening line each job appears on the second it is said, except
      // the row nobody reads out, which is on the paper from the first frame.
      // After that they are already on screen, and a zero start means "was
      // there".
      var ja = stage === "jobs" ? since(t, JOBS[k].at, 0.35) : 1;
      if (stage === "names") ja *= 0.5;
      if (ja <= 0) continue;
      // The row itself takes the accent when its label arrives. A rule out to
      // the right of the card lines up with the row, which is not the same
      // thing as pointing at it: with six rows in a column the eye has to be
      // told which one, and colouring the office is how every other chapter
      // in this episode says "this one, now".
      var hot = stage === "labels" && JOBS[k].touch
        ? since(t, JOBS[k].touchAt, 0.4) : 0;
      ballotRow(ctx, b, jy + k * rowH, rowH, H, a * ja, JOBS[k].name, false,
                hot > 0.5 ? (scene.accent || "#FFD426") : null);

      // Chapter 7 hangs what the office decides off ITS OWN row, arriving on
      // the words that say it. The order on screen is therefore the order of
      // the sentence and not the order of the ballot — zoning at the top,
      // then the school day five rows down, then back up to the water board.
      // That is the point: each label touches the office that decides it.
      if (stage === "labels" && JOBS[k].touch) {
        var la = since(t, JOBS[k].touchAt, 0.4);
        if (la <= 0) continue;
        ctx.save();
        ctx.globalAlpha = a * la;
        ctx.strokeStyle = scene.accent || "#FFD426";
        ctx.lineWidth = Math.max(1, H * 0.003);
        var y0 = jy + k * rowH + rowH * 0.5;
        ctx.beginPath();
        ctx.moveTo(b.x + b.w + W * 0.012, y0);
        ctx.lineTo(b.x + b.w + W * 0.055, y0);
        ctx.stroke();
        fitLabel(ctx, JOBS[k].touch, b.x + b.w + W * 0.068, y0 + H * 0.012,
                 W - (b.x + b.w + W * 0.068) - W * 0.04, H * 0.038, FG, "600", "left");
        ctx.restore();
      }
    }
  }
  // One line of the ballot: the office in small type, and a bar standing in
  // for the name under it. A bar, not a name: inventing five candidates would
  // put five people on a real ballot who are not on one.
  function ballotRow(ctx, b, y, rowH, H, alpha, name, bright, hot) {
    ctx.save();
    ctx.globalAlpha = alpha;
    // Up to the ballot's own oval, and no further. "Community College Trustee"
    // is twice the length of "Governor" and at one fixed size it ran under it.
    fitLabel(ctx, name, b.x + b.w * 0.08, y + rowH * 0.42, b.w * 0.68,
             H * 0.030, hot || FG, hot ? "700" : "600");
    ctx.fillStyle = bright ? DIM : GRID;
    roundRect(ctx, b.x + b.w * 0.08, y + rowH * 0.56, b.w * 0.52, rowH * 0.16, H * 0.006);
    ctx.fill();
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(1, H * 0.0022);
    var r = rowH * 0.15;
    ctx.beginPath();
    ctx.arc(b.x + b.w * 0.86, y + rowH * 0.52, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Chapter 1: the information exists, in a dozen places ───────────────
  //
  // Loose sheets, each a different custodian and each a different shape,
  // because the point of the line is that none of them agree with each other.
  // The positions are a hash of the index, not Math.random: a random scatter
  // would be a different picture on every render and the determinism test
  // would fail on this episode alone.
  // One sheet per cell of a four by two grid, nudged off centre by a hash of
  // its index. A free scatter was tried and two of the longest names landed on
  // top of each other — "State Legislature" across "Federal Election
  // Commission" — which is the one thing a picture about scattered records
  // must not do. The cell keeps them apart; the nudge keeps them from looking
  // like a filing system.
  function sheetAt(i, W, H) {
    var cols = 4, col = i % cols, row = Math.floor(i / cols);
    var h1 = Math.sin(i * 12.9898) * 43758.5453;
    var h2 = Math.sin(i * 78.233) * 12345.6789;
    var h3 = Math.sin(i * 39.425) * 24680.1357;
    var jx = (h1 - Math.floor(h1)) - 0.5;
    var jy = (h2 - Math.floor(h2)) - 0.5;
    var fr = h3 - Math.floor(h3);
    var cw = 0.21, chh = 0.26;
    return {
      x: W * (0.06 + col * cw + jx * 0.030),
      y: H * (0.09 + row * chh + jy * 0.035),
      w: W * (0.155 + fr * 0.020),
      h: H * (0.175 + (1 - fr) * 0.020),
      rot: (fr - 0.5) * 0.26
    };
  }
  function drawScatter(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var accent = scene.accent || "#FFD426";

    // What the viewer is looking at, said once, on "it is just kept in a dozen
    // places". Four seconds pass before the first card is named, and without
    // this the frame is empty for all of them.
    if (scene.stage !== "middle") {
      var ha = at(scene, "headAt", t, 0.45);
      if (ha > 0) {
        ctx.save();
        ctx.globalAlpha = a * ha;
        label(ctx, "WHERE THE ANSWER IS KEPT TODAY", W / 2, H * 0.072,
              H * 0.030, MUTED, "700", "center");
        ctx.restore();
      }
    }

    // The cards do not arrive again in the second scene — the viewer is
    // already looking at them. They RECEDE, over the first half second of it,
    // so the figure standing in the middle of them is the new thing. A flat
    // step from full strength to two thirds at the cut is a flicker, and a
    // re-fade is the whole pile arriving twice.
    var back = scene.stage === "middle" ? 1 - 0.38 * ease(t / 0.6) : 1;
    for (var i = 0; i < SITES.length; i++) {
      var sa = scene.stage === "middle" ? 1 : since(t, SITES[i].at, 0.4);
      if (sa <= 0) continue;
      sheetCard(ctx, sheetAt(i, W, H), SITES[i], H, a * sa * back, accent);
    }
  }
  // One custodian and the one record it keeps, on one card.
  //
  // `where` is the sheet's geometry, so chapter 2 can hand the same card a
  // position on its way to the list and get the same drawing.
  function sheetCard(ctx, s, site, H, alpha, accent) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
    ctx.rotate(s.rot);
    if (s.scale) ctx.scale(s.scale, s.scale);
    ctx.fillStyle = CARD;
    roundRect(ctx, -s.w / 2, -s.h / 2, s.w, s.h, H * 0.010);
    ctx.fill();
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = Math.max(1, H * 0.0025);
    ctx.stroke();
    // The keeper in small caps at the top, a rule, and under it the thing it
    // keeps, in the type that carries the sentence. One card, so the link
    // between the two is the card and needs no arrow.
    fitLabel(ctx, site.keeper.toUpperCase(), 0, -s.h / 2 + H * 0.038,
             s.w * 0.86, H * 0.024, MUTED, "700", "center");
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = Math.max(1, H * 0.002);
    ctx.beginPath();
    ctx.moveTo(-s.w * 0.40, -s.h / 2 + H * 0.055);
    ctx.lineTo(s.w * 0.40, -s.h / 2 + H * 0.055);
    ctx.stroke();
    fitLabel(ctx, site.holds, 0, -s.h / 2 + H * 0.098, s.w * 0.86,
             H * 0.032, FG, "700", "center");
    // Lines of nothing in particular: a form, not a document anybody can read.
    ctx.fillStyle = GRID;
    for (var r = 0; r < 3; r++) {
      var lw = s.w * (0.66 - (r % 3) * 0.16);
      roundRect(ctx, -s.w / 2 + s.w * 0.14, -s.h / 2 + H * 0.118 + r * H * 0.018,
                lw, H * 0.008, H * 0.004);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── The title card, and the close ──────────────────────────────────────
  // The product's own lockup, not a line of type. `sub` is the address, which
  // only the closing card carries.
  function drawTitleCard(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.15, 0.55);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    var drawn = false;
    if (logo.naturalWidth) {
      var lw = W * 0.46, lh = lw * (logo.naturalHeight / logo.naturalWidth);
      var maxH = H * 0.30;
      if (lh > maxH) { lh = maxH; lw = lh * (logo.naturalWidth / logo.naturalHeight); }
      ctx.drawImage(logo, (W - lw) / 2, H * 0.34 - lh / 2, lw, lh);
      drawn = true;
    }
    if (!drawn) {
      label(ctx, scene.name || "Empowered Essentials", W / 2, H * 0.38,
            H * 0.090, scene.accent || "#FFD426", "700", "center");
    }
    if (scene.sub) {
      label(ctx, scene.sub, W / 2, H * 0.54, H * 0.044, MUTED, "600", "center");
    }
    ctx.restore();
  }

  // ── Chapter 2: one address ─────────────────────────────────────────────
  // The search bar the real page opens with, with the address typing itself in
  // and the words "where you live" landing under it when they are spoken.
  function drawAddress(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var bw = W * 0.56, bx = (W - bw) / 2, by = H * 0.26, bh = H * 0.11;
    panel(ctx, bx, by, bw, bh, H, a, EDGE);
    ctx.save();
    ctx.globalAlpha = a;
    // A pin, then the address, typed one character at a time between the
    // second the line starts and the second it names the idea.
    ctx.fillStyle = scene.accent || "#FFD426";
    ctx.beginPath();
    ctx.arc(bx + W * 0.030, by + bh * 0.46, H * 0.012, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx + W * 0.030 - H * 0.010, by + bh * 0.52);
    ctx.lineTo(bx + W * 0.030 + H * 0.010, by + bh * 0.52);
    ctx.lineTo(bx + W * 0.030, by + bh * 0.72);
    ctx.closePath();
    ctx.fill();
    var full = "200 N Spring St, Los Angeles, CA 90012";
    var n = Math.round(full.length * ease((t - 0.6) / 2.2));
    label(ctx, full.slice(0, Math.max(0, n)), bx + W * 0.050, by + bh * 0.62, H * 0.042, FG, "600");
    if (n < full.length && Math.floor(t * 2) % 2 === 0) {
      ctx.fillStyle = FG;
      ctx.fillRect(bx + W * 0.050 + ctx.measureText(full.slice(0, Math.max(0, n))).width + H * 0.006,
                   by + bh * 0.30, Math.max(2, H * 0.004), bh * 0.40);
    }
    var wa = at(scene, "saidAt", t, 0.4);
    if (wa > 0) {
      ctx.globalAlpha = a * wa;
      label(ctx, "Where you live", W / 2, by + bh + H * 0.11, H * 0.060, FG, "700", "center");
    }
    ctx.restore();
  }

  // ── Chapter 2: the stack of boundaries ─────────────────────────────────
  //
  // One point, and six outlines growing around it on the seconds they are
  // named. The outlines are deliberately irregular and deliberately not
  // concentric: the line says they overlap, are different shapes, and almost
  // none of them line up, and a set of neat rings would say the opposite.
  //
  // The names go in a column on the right rather than on the outlines
  // themselves. Six labels inside six nested shapes land on top of each other,
  // and the one thing this picture cannot afford is to be unreadable.
  var TONES = ["#1DA8C6", "#FF6B52", "#FFD740", "#43D07E", "#B49BFF", "#FF9A4D"];

  // A district line is not a circle and it is not a scribble. It is a chain of
  // long straight runs with right-angle jogs in it, because it was drawn down
  // section lines, section lines meet at right angles, and where it is not a
  // section line it is a road or a creek. Six soft rings around one point read
  // as a dartboard — which is the one thing the line "they overlap, they are
  // different shapes, and almost none of them line up" cannot have on screen.
  //
  // So each outline is built as a ring of vertices at uneven radii, and then
  // every other edge is broken into an L: a horizontal run and a vertical one
  // instead of a diagonal. That one step is what makes it read as a surveyed
  // boundary rather than a blob.
  //
  // `hash` is a fixed function of the seed and the index, never Math.random:
  // a different picture on every render would fail the determinism test.
  function hash(a, b) {
    var x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function boundaryPath(ctx, cx, cy, r, ar, rot, seed) {
    var n = 9 + Math.floor(hash(seed, 7) * 4);        // 9 to 12 corners
    var pts = [];
    for (var i = 0; i < n; i++) {
      var ang = rot + (i / n) * Math.PI * 2 + (hash(seed, i) - 0.5) * 0.22;
      var rr = r * (0.80 + 0.40 * hash(seed, i + 40));
      pts.push({ x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr * ar });
    }
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var k = 0; k < n; k++) {
      var p = pts[k], q = pts[(k + 1) % n];
      // Every other edge turns a corner instead of cutting across, and which
      // way it turns first alternates, so the outline does not drift into a
      // staircase all leaning the same way.
      if (k % 2 === 0) {
        if (k % 4 === 0) ctx.lineTo(q.x, p.y); else ctx.lineTo(p.x, q.y);
      }
      ctx.lineTo(q.x, q.y);
    }
    ctx.closePath();
  }
  // Where each boundary sits. The address is NOT the centre of any of them —
  // nobody lives in the middle of six districts at once — so each one is hung
  // off the point at its own angle, far enough to be visibly its own shape and
  // near enough that the point is still inside it.
  function boundaryPlace(i, H) {
    var away = H * (0.008 + i * 0.020);
    var dir = 0.8 + i * 1.95;
    return {
      ox: Math.cos(dir) * away,
      oy: Math.sin(dir) * away * 0.7,
      r: H * (0.105 + i * 0.042),
      ar: 0.70 + hash(i + 1, 3) * 0.34,
      rot: hash(i + 1, 11) * Math.PI * 2
    };
  }
  function drawBoundaries(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    // Left of centre, because the legend has the right quarter of the frame
    // and the congressional district is wider than the city by a factor of
    // three. The outlines run off the top of the frame and are meant to: a
    // district that stops politely inside the picture is a shape, not a place.
    var cx = W * 0.36, cy = H * 0.44;
    for (var i = 0; i < BOUNDS.length; i++) {
      var ba = since(t, BOUNDS[i].at, 0.5);
      if (ba <= 0) continue;
      var pl = boundaryPlace(i, H);
      ctx.save();
      ctx.globalAlpha = a * ba;
      ctx.strokeStyle = TONES[i % TONES.length];
      ctx.lineWidth = Math.max(1.5, H * 0.0035);
      ctx.lineJoin = "miter";
      boundaryPath(ctx, cx + pl.ox, cy + pl.oy, pl.r * (0.88 + 0.12 * ba),
                   pl.ar, pl.rot, i + 1);
      ctx.stroke();
      ctx.restore();

      // The legend row, in the same colour as its outline.
      var ly = H * 0.22 + i * H * 0.072;
      ctx.save();
      ctx.globalAlpha = a * ba;
      ctx.fillStyle = TONES[i % TONES.length];
      roundRect(ctx, W * 0.70, ly - H * 0.022, H * 0.026, H * 0.026, H * 0.006);
      ctx.fill();
      label(ctx, BOUNDS[i].name, W * 0.70 + H * 0.044, ly, H * 0.036, FG, "600");
      ctx.restore();
    }
    // The address itself, under everything, from the first frame: the whole
    // chapter is about what sits on top of one point.
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = FG;
    ctx.lineWidth = Math.max(1.5, H * 0.003);
    ctx.beginPath();
    ctx.arc(cx, cy, H * 0.024, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = FG;
    ctx.beginPath();
    ctx.arc(cx, cy, H * 0.011, 0, Math.PI * 2);
    ctx.fill();
    // Haloed, not plated. Six outlines cross this point and the words sat on
    // top of whichever one ran through them — but a filled plate behind the
    // words rubs out an arc of the smallest district, which then reads as a
    // broken line. A halo that follows the letters hides only the letters.
    ctx.font = "600 " + Math.round(H * 0.030) + "px " + FONT;
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.lineWidth = H * 0.012;
    ctx.strokeStyle = "#111113";
    ctx.strokeText("Your address", cx, cy + H * 0.062);
    ctx.fillStyle = FG;
    ctx.fillText("Your address", cx, cy + H * 0.062);
    ctx.restore();
  }

  // ── Chapter 2: every office that comes with the address ────────────────
  //
  // This is the chapter's payoff and it is built to BE one. Chapter 1 left a
  // dozen record-keepers scattered across the frame and a figure standing in
  // the middle of them with no way through. So this scene starts from the one
  // thing the viewer gives us — the address — brings those same cards back,
  // and then gathers them into one list under the product's own lockup.
  //
  // The cards are the same cards: `sheetAt` and `sheetCard` are chapter 1's,
  // so what travels is literally what was scattered. Drawing a fresh set of
  // boxes would have said "here is another list" instead of "here is that
  // list, collected".
  //
  // Two columns, four bands, in the order the live results page groups them:
  // local at the top, federal at the bottom. `stage`:
  //   list        the address, the gather, then the rows and the bands (L008)
  //   candidates  the people asking for the seats arrive beside them (L009)
  //   full        the finished list, nothing new (L010)
  function officeColumns() {
    return [[LEVELS[0], LEVELS[1]], [LEVELS[2], LEVELS[3]]];
  }
  // Where the gathered cards are going, and where the lockup and the list sit
  // once they get there. One function so the travel and the destination
  // cannot disagree.
  function officeHead(W, H) {
    return { cx: W / 2, pinY: H * 0.062, markY: H * 0.105, listY: H * 0.225 };
  }
  function drawOffices(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var cols = officeColumns();
    var colW = W * 0.37, rowH = H * 0.082, gap = W * 0.06;
    var x0 = (W - (colW * 2 + gap)) / 2;
    var head = officeHead(W, H);
    var bandsAt = scene.bandsAt == null ? 0 : scene.bandsAt;
    var rowsAt = scene.rowsAt == null ? 0 : scene.rowsAt;
    var seen = 0;                                     // rows so far, for the stagger

    drawGather(ctx, t, W, H, scene, a, head);

    for (var c = 0; c < cols.length; c++) {
      var x = x0 + c * (colW + gap), y = head.listY;
      for (var g = 0; g < cols[c].length; g++) {
        var grp = cols[c][g];
        var ga = since(t, bandsAt, 0.4);
        // "Local at the top" and "federal at the bottom" are said two seconds
        // apart, so the two band names they name brighten when they are said
        // rather than all four arriving together.
        var mark = 0;
        if (grp.band === "Local") mark = at(scene, "markTop", t, 0.35);
        if (grp.band === "Federal") mark = at(scene, "markBottom", t, 0.35);
        ctx.save();
        ctx.globalAlpha = a * ga;
        label(ctx, grp.band.toUpperCase(), x, y, H * 0.028,
              mark > 0.5 ? (scene.accent || "#FFD426") : MUTED, "700");
        ctx.restore();
        y += H * 0.038;

        for (var r = 0; r < grp.rows.length; r++) {
          var ra = rowsAt ? since(t, rowsAt + seen * 0.22, 0.35) : 1;
          seen++;
          if (ra <= 0) { y += rowH; continue; }
          officeRow(ctx, x, y, colW, rowH, H, a * ra, grp.rows[r]);

          // An election is running, so the people asking for the seat appear
          // beside the person holding it. Not every row: only the seats with a
          // contest, which is what the live page does.
          if (scene.candAt != null && (r % 2 === 0)) {
            var ca = scene.candAt > 0 ? since(t, scene.candAt + seen * 0.12, 0.4) : 1;
            if (ca > 0) {
              ctx.save();
              ctx.globalAlpha = a * ca;
              var cx2 = x + colW * 0.665 + (1 - ca) * W * 0.03;
              ctx.fillStyle = "#20202A";
              roundRect(ctx, cx2, y + rowH * 0.18, colW * 0.28, rowH * 0.56, H * 0.010);
              ctx.fill();
              ctx.strokeStyle = scene.accent || "#FFD426";
              ctx.lineWidth = Math.max(1, H * 0.0022);
              ctx.stroke();
              label(ctx, "Candidate", cx2 + colW * 0.14, y + rowH * 0.56,
                    H * 0.024, scene.accent || "#FFD426", "700", "center");
              ctx.restore();
            }
          }
          y += rowH;
        }
        // Air under a band before the next band's name. At 0.022 the word
        // SCHOOL sat on the bottom edge of the card above it.
        y += H * 0.042;
      }
    }
  }

  // The address, the keepers coming back, and the moment they become a list.
  //
  // `addressAt` the pin and the street, `sheetsAt` the cards returning,
  // `rowsAt` the second they start travelling — which is the same second the
  // list begins to arrive, so one hands over to the other instead of the
  // screen holding both.
  function drawGather(ctx, t, W, H, scene, a, head) {
    var accent = scene.accent || "#FFD426";

    // The pin and the street. On the continuing scenes it carries no time of
    // its own and is simply there.
    var pa = scene.addressAt == null ? 1 : since(t, scene.addressAt, 0.4);
    if (pa > 0) {
      ctx.save();
      ctx.globalAlpha = a * pa;
      ctx.fillStyle = accent;
      var px = head.cx - W * 0.20;
      ctx.beginPath();
      ctx.arc(px, head.pinY - H * 0.012, H * 0.013, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px - H * 0.011, head.pinY - H * 0.005);
      ctx.lineTo(px + H * 0.011, head.pinY - H * 0.005);
      ctx.lineTo(px, head.pinY + H * 0.016);
      ctx.closePath();
      ctx.fill();
      label(ctx, "200 N Spring St, Los Angeles, CA 90012",
            px + H * 0.030, head.pinY + H * 0.012, H * 0.036, FG, "600");
      ctx.restore();
    }

    // The product's own lockup over the list it just made. This is the one
    // place in the episode where the mark earns its keep mid-film: the cards
    // go in scattered and what they come out of is Essentials.
    var ma = at(scene, "rowsAt", t, 0.6);
    if (ma > 0 && logo.naturalWidth) {
      var lw = W * 0.15, lh = lw * (logo.naturalHeight / logo.naturalWidth);
      ctx.save();
      ctx.globalAlpha = a * ma;
      ctx.drawImage(logo, head.cx - lw / 2, head.markY, lw, lh);
      ctx.restore();
    }

    // The cards. They arrive scattered, then every one of them travels to the
    // same point under the lockup and shrinks out of sight as the list takes
    // its place. A card that simply faded would say they were dismissed; a
    // card that travels says they were collected.
    if (scene.sheetsAt == null) return;
    var to = { x: head.cx, y: head.listY - H * 0.010 };
    for (var i = 0; i < SITES.length; i++) {
      var sa = since(t, scene.sheetsAt + i * 0.10, 0.35);
      if (sa <= 0) continue;
      // Each card leaves a tenth of a second after the one before it, so the
      // gather is a sweep rather than a snap.
      var k = ease((t - ((scene.rowsAt || 0) + i * 0.07)) / 0.85);
      if (k >= 1) continue;
      var s = sheetAt(i, W, H);
      var at2 = {
        x: s.x + (to.x - (s.x + s.w / 2)) * k,
        y: s.y + (to.y - (s.y + s.h / 2)) * k,
        w: s.w, h: s.h, rot: s.rot * (1 - k), scale: 1 - 0.75 * k
      };
      sheetCard(ctx, at2, SITES[i], H, a * sa * (1 - k * k), accent);
    }
  }

  function officeRow(ctx, x, y, w, h, H, alpha, name) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = CARD;
    roundRect(ctx, x, y, w * 0.64, h * 0.86, H * 0.012);
    ctx.fill();
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = Math.max(1, H * 0.002);
    ctx.stroke();
    portrait(ctx, x + w * 0.02, y + h * 0.10, h * 0.52, h * 0.62, H, 1);
    // The office on one line and its district under it, which is how the live
    // card sets them. On one line the longest of these — "U.S. Representative,
    // District 34" — ran past the card and under the candidate chip; clipping
    // it instead only traded the overlap for a word cut in half.
    var tx = x + w * 0.02 + h * 0.52 + w * 0.025;
    var cut = name.lastIndexOf(", ");
    if (cut < 0) {
      label(ctx, name, tx, y + h * 0.52, H * 0.030, FG, "600");
    } else {
      label(ctx, name.slice(0, cut), tx, y + h * 0.40, H * 0.030, FG, "600");
      label(ctx, name.slice(cut + 2), tx, y + h * 0.70, H * 0.026, MUTED, "500");
    }
    ctx.restore();
  }

  // ── Chapter 3: the profile ─────────────────────────────────────────────
  //
  // One card and one panel, built over six lines. The card never moves and
  // never redraws its contents: `continues` holds it still while each new
  // thing arrives on its own second. `stage`:
  //   card     who they are, which seat, when the term began (L011)
  //   ballot   the banner that says the seat is on the next ballot (L012)
  //   ladder   the stance ladder, with their answer marked (L013)
  //   compass  their shape drawn over yours, in the corner (L014)
  //   sources  the reasoning, and the sources under it (L015)
  //   blank    a topic with no evidence, left empty (L016)
  //
  // Everything on it is read out of the live platform. The portrait is the one
  // exception and it is a plate, not a drawing: a hand-drawn face on a real
  // person is a different claim from a photograph of them.
  function profileCard(W, H) { return { x: W * 0.07, y: H * 0.09, w: W * 0.36, h: H * 0.58 }; }

  function drawProfile(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var c = profileCard(W, H);
    var accent = scene.accent || "#FFD426";

    panel(ctx, c.x, c.y, c.w, c.h, H, a);
    portrait(ctx, c.x + W * 0.018, c.y + H * 0.035, c.w * 0.26, c.h * 0.30, H, a);
    ctx.save();
    ctx.globalAlpha = a;
    var tx = c.x + W * 0.018 + c.w * 0.26 + W * 0.018;
    // Everything here is measured against the room it has, which is the card's
    // right edge less its own padding. The district line is the long one —
    // "Assembly District 42, California" — and it printed past the border of
    // the card it was supposed to be inside.
    var room = c.x + c.w - W * 0.018 - tx;
    fitLabel(ctx, WHO.name, tx, c.y + H * 0.085, room, H * 0.048, FG, "700");
    fitLabel(ctx, WHO.seat, tx, c.y + H * 0.125, room, H * 0.034, MUTED, "600");
    fitLabel(ctx, WHO.district, tx, c.y + H * 0.160, room, H * 0.030, MUTED, "500");
    fitLabel(ctx, WHO.term, tx, c.y + H * 0.208, room, H * 0.028, MUTED, "500");
    ctx.restore();

    // The ballot banner, in the product's own two lines.
    var ba = at(scene, "ballotAt", t, 0.45);
    if (scene.stage !== "card" && ba > 0) {
      var by = c.y + H * 0.255, bh = H * 0.105;
      ctx.save();
      ctx.globalAlpha = a * ba;
      ctx.fillStyle = "rgba(255, 212, 38, 0.12)";
      roundRect(ctx, c.x + W * 0.014, by, c.w - W * 0.028, bh, H * 0.012);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(1, H * 0.0025);
      ctx.stroke();
      label(ctx, BALLOT.head, c.x + W * 0.032, by + H * 0.042, H * 0.034, accent, "700");
      label(ctx, BALLOT.sub, c.x + W * 0.032, by + H * 0.080, H * 0.028, FG, "500");
      ctx.restore();
    }

    // Their compass over yours, in the corner of the card, in the product's
    // own three colours. Same spokes, same scale — which is the line.
    var ca = at(scene, "compassAt", t, 0.5);
    if (ca > 0) {
      miniCompass(ctx, c.x + c.w * 0.72, c.y + c.h * 0.80, H * 0.090, H, a * ca, ca);
      ctx.save();
      ctx.globalAlpha = a * ca;
      label(ctx, "Their compass,", c.x + W * 0.028, c.y + c.h * 0.74, H * 0.030, MUTED, "600");
      label(ctx, "over yours", c.x + W * 0.028, c.y + c.h * 0.79, H * 0.030, MUTED, "600");
      ctx.fillStyle = YOU_C;
      roundRect(ctx, c.x + W * 0.028, c.y + c.h * 0.84, H * 0.022, H * 0.022, H * 0.005);
      ctx.fill();
      label(ctx, "You", c.x + W * 0.028 + H * 0.034, c.y + c.h * 0.86, H * 0.026, FG, "500");
      ctx.fillStyle = THEM_C;
      roundRect(ctx, c.x + W * 0.028, c.y + c.h * 0.89, H * 0.022, H * 0.022, H * 0.005);
      ctx.fill();
      label(ctx, "Them", c.x + W * 0.028 + H * 0.034, c.y + c.h * 0.91, H * 0.026, FG, "500");
      ctx.restore();
    }

    if (scene.stage === "card" || scene.stage === "ballot") return;
    drawLadder(ctx, t, W, H, scene, a, accent);
  }

  // The stance ladder. Five named solutions, their answer marked, and — when
  // the line reaches it — the reasoning and the sources opening under the rung
  // they picked, the way the page opens them.
  //
  // The panel is measured from its contents rather than given a height. The
  // reasoning is a real sentence and it wraps to a different number of lines
  // at every width this renders at.
  function drawLadder(ctx, t, W, H, scene, a, accent) {
    var x = W * 0.49, w = W * 0.44, y = H * 0.12;
    var rowH = H * 0.070, pad = H * 0.034;
    // The panel has its own arrival. `continues` holds the card still, which
    // is right for the card and wrong for the thing that is new in this
    // scene: without a time of its own the whole ladder would snap on at the
    // cut, a third of a second before the line that introduces it.
    var here = at(scene, "ladderAt", t, 0.5);
    if (here <= 0) return;
    a *= here;
    var open = at(scene, "sourcesAt", t, 0.5);
    var blank = at(scene, "blankAt", t, 0.45);

    // Measure first: the open drawer is as tall as the sentence inside it.
    //
    // And as WIDE as the drawer, which is a narrower thing than the panel.
    // The text is inset W*0.068 from the panel's left edge and the drawer's
    // own right edge is W*0.025 inside the panel's, so wrapping to the panel
    // width ran the first line of the reasoning out through the side of both
    // boxes. The 0.043 is that right edge plus the same inset on the left.
    var textX = x + W * 0.068;
    var reasonW = w - W * 0.111;
    ctx.save();
    ctx.font = "500 " + Math.round(H * 0.030) + "px " + FONT;
    var reasonLines = wrapLines(ctx, REASONING, reasonW);
    ctx.restore();
    var drawerH = open > 0
      ? (reasonLines.length * H * 0.040 + SOURCES.length * H * 0.036 + H * 0.060) * open
      : 0;
    var blankH = blank > 0 ? (H * 0.105) * blank : 0;
    var panelH = pad * 2 + H * 0.050 + LADDER.length * rowH + drawerH + blankH;

    panel(ctx, x, y, w, panelH, H, a);
    ctx.save();
    ctx.globalAlpha = a;
    label(ctx, TOPIC.toUpperCase(), x + W * 0.022, y + pad + H * 0.026, H * 0.028, MUTED, "700");
    ctx.restore();

    var ry = y + pad + H * 0.050;
    for (var i = 0; i < LADDER.length; i++) {
      var picked = i === PICK;
      ctx.save();
      ctx.globalAlpha = a;
      // The rung itself: a dot on a rail, and the solution beside it.
      ctx.strokeStyle = GRID;
      ctx.lineWidth = Math.max(1, H * 0.003);
      if (i < LADDER.length - 1) {
        ctx.beginPath();
        ctx.moveTo(x + W * 0.034, ry + rowH * 0.42);
        ctx.lineTo(x + W * 0.034, ry + rowH * 1.42);
        ctx.stroke();
      }
      ctx.fillStyle = picked ? accent : GRID;
      ctx.beginPath();
      ctx.arc(x + W * 0.034, ry + rowH * 0.42, H * (picked ? 0.016 : 0.010), 0, Math.PI * 2);
      ctx.fill();
      fitLabel(ctx, LADDER[i], x + W * 0.055, ry + rowH * 0.50, w - W * 0.077,
               H * 0.032, picked ? FG : MUTED, picked ? "700" : "500");
      ctx.restore();
      ry += rowH;

      // The drawer opens under the rung they picked, not at the bottom of the
      // panel: the reasoning belongs to that answer and to no other.
      if (picked && open > 0) {
        ctx.save();
        ctx.globalAlpha = a * open;
        ctx.fillStyle = "#15151B";
        roundRect(ctx, x + W * 0.050, ry - H * 0.010, w - W * 0.075,
                  drawerH / Math.max(open, 0.001) * open - H * 0.004, H * 0.012);
        ctx.fill();
        ctx.fillStyle = FG;
        ctx.font = "500 " + Math.round(H * 0.030) + "px " + FONT;
        ctx.textAlign = "left";
        var ly = ry + H * 0.030;
        for (var k = 0; k < reasonLines.length; k++) {
          ctx.fillText(reasonLines[k], textX, ly + k * H * 0.040);
        }
        var sy = ly + reasonLines.length * H * 0.040 + H * 0.012;
        for (var s = 0; s < SOURCES.length; s++) {
          ctx.fillStyle = accent;
          ctx.font = "700 " + Math.round(H * 0.024) + "px " + FONT;
          ctx.fillText(String(s + 1), textX, sy + s * H * 0.036);
          fitLabel(ctx, SOURCES[s], textX + W * 0.016, sy + s * H * 0.036,
                   reasonW - W * 0.016, H * 0.026, MUTED, "500");
        }
        ctx.restore();
        ry += drawerH;
      }
    }

    // And where there is no evidence, nothing. An empty rail with the topic's
    // name and no dot on it: the page's own way of saying it does not know.
    if (blank > 0) {
      ctx.save();
      ctx.globalAlpha = a * blank;
      ctx.strokeStyle = EDGE;
      ctx.lineWidth = Math.max(1, H * 0.002);
      ctx.setLineDash([H * 0.010, H * 0.010]);
      ctx.beginPath();
      ctx.moveTo(x + W * 0.022, ry + H * 0.012);
      ctx.lineTo(x + w - W * 0.022, ry + H * 0.012);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, BLANK_TOPIC.toUpperCase(), x + W * 0.022, ry + H * 0.055, H * 0.028, MUTED, "700");
      label(ctx, "No stance — we have no evidence", x + W * 0.022, ry + H * 0.092,
            H * 0.030, DIM, "500");
      ctx.restore();
    }
  }

  // Six spokes, your shape and theirs, in the colours the live chart uses.
  // Both are filled and translucent, so where they lie over each other the two
  // fills make the third colour by themselves — that overlap IS the product's
  // picture of agreement, and nothing draws a separate shape over the top of
  // it. Where you both picked the same answer, one yellow dot an eighth larger
  // replaces the two, which is again what the live chart does.
  var MINI_YOU = [0.80, 0.55, 0.70, 0.45, 0.85, 0.60];
  var MINI_THEM = [0.55, 0.55, 0.40, 0.75, 0.50, 0.85];
  function miniPoint(cx, cy, r, i, n, frac) {
    var ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(ang) * r * frac, y: cy + Math.sin(ang) * r * frac };
  }
  function miniShape(ctx, cx, cy, r, vals, grow) {
    ctx.beginPath();
    for (var i = 0; i < vals.length; i++) {
      var p = miniPoint(cx, cy, r, i, vals.length, vals[i] * grow);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
  }
  function miniCompass(ctx, cx, cy, r, H, alpha, grow) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(1, H * 0.002);
    for (var i = 0; i < MINI_YOU.length; i++) {
      var tip = miniPoint(cx, cy, r, i, MINI_YOU.length, 1);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    }
    ctx.fillStyle = YOU_FILL; ctx.strokeStyle = YOU_C;
    ctx.lineWidth = Math.max(1.5, H * 0.0028);
    miniShape(ctx, cx, cy, r, MINI_YOU, grow); ctx.fill(); ctx.stroke();
    ctx.fillStyle = THEM_FILL; ctx.strokeStyle = THEM_C;
    miniShape(ctx, cx, cy, r, MINI_THEM, grow); ctx.fill(); ctx.stroke();
    for (var k = 0; k < MINI_YOU.length; k++) {
      var same = Math.abs(MINI_YOU[k] - MINI_THEM[k]) < 1e-6;
      var p = miniPoint(cx, cy, r, k, MINI_YOU.length, MINI_YOU[k] * grow);
      ctx.fillStyle = same ? SAME_C : YOU_C;
      ctx.beginPath();
      ctx.arc(p.x, p.y, H * 0.008 * (same ? SAME_R : 1), 0, Math.PI * 2);
      ctx.fill();
      if (!same) {
        var q = miniPoint(cx, cy, r, k, MINI_THEM.length, MINI_THEM[k] * grow);
        ctx.fillStyle = THEM_C;
        ctx.beginPath();
        ctx.arc(q.x, q.y, H * 0.008, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ── Chapter 4: who paid for the campaign ───────────────────────────────
  //
  // The bar sits in the same place for the whole chapter and never moves. Each
  // line adds to it: the bands, then two other campaigns under it, then the
  // committees, the search, and outside spending kept apart from all of it.
  //
  // `stage`:
  //   bar      one bar, unlabelled, filling from the left (L017)
  //   bands    it divides, and each band is named as it is spoken (L018)
  //   two      two other campaigns, the same size, split differently (L019)
  //   donors   the committees that gave, and a search over the donors (L020)
  //   outside  outside spending, in its own block, apart (L021)
  //   filings  where all of it comes from (L022)
  // The bar sits lower than it did: the chapter now carries its own title,
  // "Transparent Motivations", and the question under it. Everything in the
  // chapter is measured off this box, so moving it moves the legend, the
  // committee list, the search and the outside block with it.
  function moneyBar(W, H) { return { x: W * 0.12, y: H * 0.250, w: W * 0.76, h: H * 0.085 }; }

  function drawMoney(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var b = moneyBar(W, H), accent = scene.accent || "#FFD426";
    var stage = scene.stage || "bar";
    var sum = MONEY.v[0] + MONEY.v[1] + MONEY.v[2] + MONEY.v[3];

    moneyHeader(ctx, t, W, H, scene, a, accent);

    // The comparison is an aside and it gets the whole frame. Keeping her bar
    // on screen under two other people's bars asks the viewer which of the
    // three the line is about, and the answer is the two.
    if (stage === "two") return drawPair(ctx, t, W, H, scene, a);

    // An empty bar is not a picture of anything. The opening line of the
    // chapter used to fill one from the left with nothing in it for six
    // seconds, which asked the viewer to watch a loading bar. The bar now
    // arrives with the line that puts something ON it — `barAt`, which is
    // "sorted into four groups" — and before that the chapter's title holds
    // the frame on its own.
    var bar = at(scene, "barAt", t, 0.5);
    if (bar <= 0) return;

    ctx.save();
    ctx.globalAlpha = a * bar;
    ctx.fillStyle = "#202028";
    roundRect(ctx, b.x, b.y, b.w, b.h, H * 0.012);
    ctx.fill();
    ctx.restore();

    // The split is drawn as four clipped segments of one rounded bar so the
    // ends stay round.
    ctx.save();
    ctx.globalAlpha = a * bar;
    roundRect(ctx, b.x, b.y, b.w, b.h, H * 0.012);
    ctx.clip();
    var cursor = b.x;
    for (var i = 0; i < BANDS.length; i++) {
      var share = MONEY.v[i] / sum;
      var segW = b.w * share;
      // Each band takes its own colour on the second it is said; before that
      // its share of the bar is there in grey, so the proportions do not
      // jump about as the colours land.
      var named = atIndex(scene.bandAt, i, t, 0.4);
      ctx.fillStyle = named > 0 ? BANDS[i].c : DIM;
      ctx.globalAlpha = a * bar * (named > 0 ? 0.25 + 0.75 * named : 1);
      ctx.fillRect(cursor, b.y, Math.max(0, segW) + 1, b.h);
      cursor += segW;
    }
    ctx.restore();

    // Whose money this is, over the bar. Without it the bar is a statistic
    // about nobody, and the chapter before it was about a person.
    {
      ctx.save();
      ctx.globalAlpha = a * at(scene, "whoseAt", t, 0.4);
      label(ctx, WHO.name + " · " + moneyFull(MONEY.total) + " raised",
            b.x, b.y - H * 0.030, H * 0.034, MUTED, "600");
      ctx.restore();
    }

    // The legend: four rows in two columns, each arriving with its band.
    {
      for (var k = 0; k < BANDS.length; k++) {
        var la = atIndex(scene.bandAt, k, t, 0.4);
        if (la <= 0) continue;
        var col = k % 2, row = Math.floor(k / 2);
        var lx = b.x + col * (b.w / 2), ly = b.y + b.h + H * 0.075 + row * H * 0.085;
        ctx.save();
        ctx.globalAlpha = a * la;
        ctx.fillStyle = BANDS[k].c;
        roundRect(ctx, lx, ly - H * 0.026, H * 0.026, H * 0.026, H * 0.006);
        ctx.fill();
        label(ctx, BANDS[k].label, lx + H * 0.042, ly, H * 0.034, FG, "600");
        var amt = moneyFull(MONEY.v[k]) + (BANDS[k].sub ? "  ·  " + BANDS[k].sub : "");
        label(ctx, amt, lx + H * 0.042, ly + H * 0.038, H * 0.028, MUTED, "500");
        ctx.restore();
      }
    }

    // Each of these three lines adds to the one before it and takes nothing
    // away. A thing that is on screen and then simply is not reads as a fault
    // in the film, so the later stages keep drawing the earlier ones.
    if (stage === "donors" || stage === "outside" || stage === "filings") {
      drawDonors(ctx, t, W, H, scene, a, accent);
    }
    if (stage === "outside" || stage === "filings") drawOutside(ctx, t, W, H, scene, a, accent);
    if (stage === "filings") drawFilings(ctx, t, W, H, scene, a, accent);
  }

  // The chapter's own title, and the question under it.
  //
  // "Transparent Motivations" is what this part of the product is FOR, and the
  // chapter opened on an empty bar instead of saying it. The title holds the
  // frame for the whole of the first line and then stays for the chapter, so
  // every later picture — the bands, the two campaigns, the committees — is
  // visibly under the same heading.
  // It is CENTRED, and it does not move for the rest of the chapter. The
  // first line of the chapter has nothing under the heading yet, so that
  // scene is a chapter card — which only reads as one if the words are in
  // the middle of the frame rather than tucked into a corner with an empty
  // two thirds beside them.
  function moneyHeader(ctx, t, W, H, scene, a, accent) {
    var cx = W / 2;
    var ta = at(scene, "titleAt", t, 0.5);
    if (ta > 0) {
      ctx.save();
      ctx.globalAlpha = a * ta;
      label(ctx, "Transparent Motivations", cx, H * 0.105, H * 0.062, FG, "700", "center");
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(2, H * 0.004);
      ctx.beginPath();
      ctx.moveTo(cx - W * 0.05, H * 0.131);
      ctx.lineTo(cx + W * 0.05, H * 0.131);
      ctx.stroke();
      ctx.restore();
    }
    var qa = at(scene, "askAt", t, 0.45);
    if (qa > 0) {
      ctx.save();
      ctx.globalAlpha = a * qa;
      label(ctx, "Who paid for the campaign?", cx, H * 0.180, H * 0.042, MUTED, "600", "center");
      ctx.restore();
    }
  }

  // Two real campaigns, within six tenths of one per cent of each other on the
  // total, and almost nothing alike underneath. They are drawn to the SAME
  // length on purpose — that is the line — and the totals are printed beside
  // them so the equality is a fact rather than a drawing decision.
  function drawPair(ctx, t, W, H, scene, a) {
    var b = moneyBar(W, H);
    for (var p = 0; p < PAIR.length; p++) {
      var pa = scene.pairAt == null ? 0 : since(t, scene.pairAt + p * 0.5, 0.45);
      if (pa <= 0) continue;
      var y = H * 0.295 + p * H * 0.255, h = H * 0.095;
      ctx.save();
      ctx.globalAlpha = a * pa;
      label(ctx, PAIR[p].name, b.x, y - H * 0.016, H * 0.032, FG, "600");
      label(ctx, moneyFull(PAIR[p].total), b.x + b.w, y - H * 0.016, H * 0.032, MUTED, "600", "right");
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = a * pa;
      roundRect(ctx, b.x, y, b.w, h, H * 0.012);
      ctx.clip();
      var cur = b.x;
      for (var i = 0; i < BANDS.length; i++) {
        var segW = b.w * PAIR[p].v[i];
        ctx.fillStyle = BANDS[i].c;
        ctx.fillRect(cur, y, segW + 1, h);
        cur += segW;
      }
      ctx.restore();
    }

    // The key, once, under both. This scene does not continue the one before
    // it, so the named legend went with it, and four colours with nothing to
    // read them by is a picture of nothing. One row, short names, no figures:
    // the amounts are beside the bars and the point here is the shape.
    var ka = scene.pairAt == null ? 0 : since(t, scene.pairAt + 0.9, 0.5);
    if (ka > 0) {
      var kw = b.w / BANDS.length;
      ctx.save();
      ctx.globalAlpha = a * ka;
      for (var k = 0; k < BANDS.length; k++) {
        var kx = b.x + k * kw, ky = H * 0.715;
        ctx.fillStyle = BANDS[k].c;
        roundRect(ctx, kx, ky - H * 0.024, H * 0.026, H * 0.026, H * 0.006);
        ctx.fill();
        fitLabel(ctx, BANDS[k].label, kx + H * 0.040, ky, kw - H * 0.060,
                 H * 0.030, MUTED, "600");
      }
      ctx.restore();
    }
  }

  // The committees, opened one by one, and a search over the donors. These are
  // organisations, which is what the line is about: the same table holds the
  // names of private people, and they are public record on the page without
  // needing to be six feet tall in a film.
  function drawDonors(ctx, t, W, H, scene, a, accent) {
    var x = W * 0.12, y = H * 0.615, w = W * 0.40;
    // Whose filings these are, said once and left there. The bar above is the
    // FEDERAL campaign; these six committees are off the California filings.
    // An unlabelled list under a federal total invites the viewer to read
    // these names as the people who gave that $822,382. It is one person's
    // money and two different filings, and the picture has to say so.
    //
    // The label turns from grey to the accent when the narration reaches
    // "state and local from their own disclosure systems", which is the same
    // device the money bands and the office bands use: existing type takes a
    // colour as the words arrive, rather than new type appearing.
    if (scene.listAt != null) {
      var named = atIndex(scene.srcAt, 1, t, 0.45);
      ctx.save();
      ctx.globalAlpha = a;
      label(ctx, "COMMITTEES THAT GAVE · CALIFORNIA FILINGS", x, y - H * 0.032,
            H * 0.026, named > 0.5 ? accent : MUTED, "700");
      ctx.restore();
    }
    for (var i = 0; i < COMMITTEES.length; i++) {
      var ca = scene.listAt == null ? 0 : (scene.listAt > 0 ? since(t, scene.listAt + i * 0.28, 0.35) : 1);
      if (ca <= 0) continue;
      var ry = y + i * H * 0.046;
      ctx.save();
      ctx.globalAlpha = a * ca;
      ctx.fillStyle = BANDS[2].c;                      // PAC purple: this is that band
      ctx.beginPath();
      ctx.arc(x + H * 0.012, ry - H * 0.008, H * 0.009, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, COMMITTEES[i].name, x + H * 0.034, ry, H * 0.029, FG, "500");
      label(ctx, moneyFull(COMMITTEES[i].amt), x + w, ry, H * 0.029, MUTED, "600", "right");
      ctx.restore();
    }
    var sa = at(scene, "searchAt", t, 0.45);
    if (sa > 0) {
      var sx = W * 0.58, sw = W * 0.30, sy = H * 0.605, sh = H * 0.080;
      panel(ctx, sx, sy, sw, sh, H, a * sa, EDGE);
      ctx.save();
      ctx.globalAlpha = a * sa;
      ctx.strokeStyle = MUTED;
      ctx.lineWidth = Math.max(1.5, H * 0.003);
      ctx.beginPath();
      ctx.arc(sx + W * 0.025, sy + sh * 0.46, H * 0.013, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + W * 0.025 + H * 0.010, sy + sh * 0.46 + H * 0.010);
      ctx.lineTo(sx + W * 0.025 + H * 0.022, sy + sh * 0.46 + H * 0.024);
      ctx.stroke();
      // Typed once, in the scene that opens the field. The three later scenes
      // inherit it with `searchAt: 0` — "it was already there" — and a zero
      // start fed to the typing clock means "start typing at t = 0.4", so the
      // word typed itself in again in the outside-spending scene and again in
      // the filings scene. Three scenes, one query, typed three times.
      var q = "teachers";
      var n = scene.searchAt > 0
        ? Math.round(q.length * ease((t - scene.searchAt - 0.4) / 0.9))
        : q.length;
      label(ctx, q.slice(0, Math.max(0, n)) || "Search donors by name",
            sx + W * 0.050, sy + sh * 0.60, H * 0.034, n > 0 ? FG : DIM, "500");
      ctx.restore();
    }
  }

  // Outside spending, in its own block, with a rule between it and everything
  // above. The separation is the point of the line, so it is drawn as a
  // separation and not as one more row in the same list.
  //
  // No figure is printed. The platform holds no outside-spending total for
  // this campaign, and a number nobody filed is not something to draw.
  function drawOutside(ctx, t, W, H, scene, a, accent) {
    var oa = at(scene, "outsideAt", t, 0.5);
    if (oa <= 0) return;
    var x = W * 0.58, y = H * 0.725, w = W * 0.30, h = H * 0.135;
    ctx.save();
    ctx.globalAlpha = a * oa;
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = Math.max(1, H * 0.002);
    ctx.setLineDash([H * 0.012, H * 0.012]);
    ctx.beginPath();
    ctx.moveTo(x, y - H * 0.022);
    ctx.lineTo(x + w, y - H * 0.022);
    ctx.stroke();
    ctx.restore();
    panel(ctx, x, y, w, h, H, a * oa, accent);
    ctx.save();
    ctx.globalAlpha = a * oa;
    label(ctx, "OUTSIDE SPENDING", x + W * 0.020, y + H * 0.042, H * 0.028, accent, "700");
    ctx.fillStyle = MUTED;
    ctx.font = "500 " + Math.round(H * 0.026) + "px " + FONT;
    ctx.textAlign = "left";
    wrap(ctx, "Spent for or against, by groups the candidate does not control.",
         x + W * 0.020, y + H * 0.080, w - W * 0.040, H * 0.034);
    ctx.restore();
  }

  // Where all of it comes from. Not a new picture: each source is a tag on
  // the thing it actually produced. The bar is this campaign's federal
  // filing, so the Commission's name goes on the bar; the committee list is
  // off her California filings, so that source goes on the list. A viewer who
  // reads the tag learns which number came from where, which a pair of rows
  // in the middle of the frame would not have told them.
  function drawFilings(ctx, t, W, H, scene, a, accent) {
    var b = moneyBar(W, H);
    var fa = atIndex(scene.srcAt, 0, t, 0.45);
    if (fa > 0) {
      ctx.save();
      ctx.globalAlpha = a * fa;
      label(ctx, "Source: Federal Election Commission", b.x + b.w, b.y - H * 0.030,
            H * 0.030, accent, "600", "right");
      ctx.restore();
    }
    // The second source needs no tag of its own: the committee list already
    // carries its provenance as a heading, and that heading takes the accent
    // when this line names it. Two labels for one fact is how they start
    // disagreeing.
  }

  // ── Chapter 5: the record ──────────────────────────────────────────────
  //
  // `stage`:
  //   votes    the bills, what they did, and which way they went (L023)
  //   compare  one stance beside one vote, and the distance left to you (L024)
  function drawRecord(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var accent = scene.accent || "#FFD426";
    if (scene.stage === "compare") return drawCompare(ctx, t, W, H, scene, a, accent);

    var x = W * 0.14, w = W * 0.72, y = H * 0.20, rowH = H * 0.085;
    // The three columns the line names, each lighting as it is said.
    var heads = [
      { s: "BILL", at: (scene.colAt || [])[0] || 0, x: x },
      { s: "WHAT IT DID", at: (scene.colAt || [])[1] || 0, x: x + w * 0.20 },
      { s: "VOTE", at: (scene.colAt || [])[2] || 0, x: x + w * 0.86 }
    ];
    for (var h = 0; h < heads.length; h++) {
      var ha = since(t, heads[h].at, 0.35);
      if (ha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = a * ha;
      label(ctx, heads[h].s, heads[h].x, y, H * 0.026, accent, "700");
      ctx.restore();
    }
    for (var i = 0; i < VOTES.length; i++) {
      var ra = scene.rowAt == null ? 0 : (scene.rowAt > 0 ? since(t, scene.rowAt + i * 0.22, 0.35) : 1);
      if (ra <= 0) continue;
      voteRow(ctx, x, y + H * 0.030 + i * rowH, w, rowH, H, a * ra, VOTES[i]);
    }
  }
  function voteRow(ctx, x, y, w, h, H, alpha, v) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = CARD;
    roundRect(ctx, x, y, w, h * 0.84, H * 0.012);
    ctx.fill();
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = Math.max(1, H * 0.002);
    ctx.stroke();
    label(ctx, v.no, x + w * 0.025, y + h * 0.54, H * 0.034, FG, "700");
    label(ctx, v.title, x + w * 0.20, y + h * 0.54, H * 0.032, MUTED, "500");
    // Yes and no are not red and green here. The episode's one rule about
    // colour is that a colour means what the product says it means, and the
    // product does not paint a vote as good or bad.
    var yes = v.pos === "yea";
    ctx.fillStyle = yes ? "rgba(67, 208, 126, 0.16)" : "rgba(255, 107, 82, 0.16)";
    roundRect(ctx, x + w * 0.855, y + h * 0.20, w * 0.11, h * 0.44, H * 0.010);
    ctx.fill();
    label(ctx, yes ? "YES" : "NO", x + w * 0.855 + w * 0.055, y + h * 0.52,
          H * 0.030, yes ? "#43D07E" : "#FF6B52", "700", "center");
    ctx.restore();
  }

  // The two halves arrive when the line names them — what they say at the top
  // of the sentence, what they voted for four words later — and only the join
  // waits for "puts both on one page". The vote panel used to wait for that
  // join, which left two thirds of the frame empty for the first six seconds
  // of an eleven second line.
  function drawCompare(ctx, t, W, H, scene, a, accent) {
    var pw = W * 0.40, y = H * 0.21;
    var lx = W * 0.06, rx = W - W * 0.06 - pw;
    var sa = at(scene, "sayAt", t, 0.5);
    var da = at(scene, "didAt", t, 0.5);
    var ja = at(scene, "bothAt", t, 0.6);

    // Both panels are the same height, and that height is measured from
    // whichever side needs more. Neither record is the authority over the
    // other, so neither gets the bigger box.
    ctx.save();
    ctx.font = "700 " + Math.round(H * 0.040) + "px " + FONT;
    var stanceLines = wrapLines(ctx, LADDER[PICK], pw - W * 0.048);
    ctx.restore();
    var ph = Math.max(H * 0.125 + stanceLines.length * H * 0.052,
                      H * 0.115 + 3 * H * 0.070) + H * 0.020;

    if (sa > 0) {
      panel(ctx, lx, y, pw, ph, H, a * sa, ja > 0.5 ? accent : null);
      ctx.save();
      ctx.globalAlpha = a * sa;
      label(ctx, "WHAT THEY SAY", lx + W * 0.024, y + H * 0.050, H * 0.028, MUTED, "700");
      label(ctx, TOPIC, lx + W * 0.024, y + H * 0.098, H * 0.032, MUTED, "600");
      ctx.fillStyle = FG;
      ctx.font = "700 " + Math.round(H * 0.040) + "px " + FONT;
      ctx.textAlign = "left";
      for (var k = 0; k < stanceLines.length; k++) {
        ctx.fillText(stanceLines[k], lx + W * 0.024, y + H * 0.170 + k * H * 0.052);
      }
      ctx.restore();
    }

    if (da > 0) {
      panel(ctx, rx, y, pw, ph, H, a * da, ja > 0.5 ? accent : null);
      ctx.save();
      ctx.globalAlpha = a * da;
      label(ctx, "WHAT THEY DID", rx + W * 0.024, y + H * 0.050, H * 0.028, MUTED, "700");
      for (var i = 0; i < 3; i++) {
        var v = VOTES[i + 1];                          // the three the stance cites
        var ry = y + H * 0.120 + i * H * 0.070;
        label(ctx, v.no, rx + W * 0.024, ry, H * 0.034, FG, "700");
        label(ctx, v.title, rx + W * 0.024, ry + H * 0.034, H * 0.026, MUTED, "500");
        var yes = v.pos === "yea";
        label(ctx, yes ? "YES" : "NO", rx + pw - W * 0.024, ry + H * 0.014,
              H * 0.030, yes ? "#43D07E" : "#FF6B52", "700", "right");
      }
      ctx.restore();
    }

    // One page: a rule joining the two, drawn when the line says so. The
    // distance between the two records is what the viewer is invited to read,
    // so nothing here measures it for them.
    if (ja > 0) {
      ctx.save();
      ctx.globalAlpha = a * ja;
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(2, H * 0.004);
      ctx.beginPath();
      ctx.moveTo(lx + pw, y + ph / 2);
      ctx.lineTo(rx, y + ph / 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Chapter 6: what we actually cover ──────────────────────────────────
  //
  // A coarse silhouette of the lower 48, traced by hand. It is deliberately
  // not a real boundary file and the areas that light up are deliberately not
  // real places. Naming the alpha communities would be accurate for a week:
  // the next line of the script says both lists grow every week, and a film
  // that names them is wrong the moment it is true.
  //
  // `stage`:
  //   alpha        the outline, almost empty (L025)
  //   congress     one layer, filled everywhere (L026)
  //   communities  individual areas light (L027)
  //   stances      a smaller set light again, brighter (L028)
  //   grow         one more, slowly (L029)
  //   missing      the message the site shows when yours is not there (L030)
  // The country as a tile grid — one square per state, in roughly the place
  // that state sits. A hand-traced silhouette was tried first and read as a
  // lumpy arrow: a coarse outline of a real coastline is worse than an
  // obvious abstraction, because it looks like an attempt at the real thing
  // that failed. A tile grid is unmistakably a diagram, and lighting one
  // square is a cleaner way to say "this place" than a blob on a coastline.
  //
  // Eleven columns by eight rows, [col, row], top left to bottom right.
  var TILES = [
    [0, 0], [10, 0],
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [7, 1], [9, 1], [10, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2],
    [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3],
    [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4],
    [3, 5], [4, 5], [5, 5], [6, 5], [7, 5],
    [3, 6], [7, 6],
    [0, 7]
  ];
  var COLS = 11, ROWS = 8;
  // The communities that light up, as tiles. Which ones they are means
  // nothing — naming the real places would be accurate for a week, and the
  // next line of the script says both lists grow every week. The first five
  // are the smaller set that also carries stances, and the last is the one
  // that arrives slowly.
  var SPOTS = [
    [0, 3], [5, 2], [9, 2], [3, 6], [0, 1],
    [7, 6], [2, 3], [7, 5], [10, 2], [4, 1], [1, 4], [6, 4]
  ];
  var WITH_STANCES = 5;                              // the first five of them
  // The map is held high and kept narrow, because three legend lines hang
  // under it and a figure stands to its right. A map sized to the frame put
  // the last legend line under the Bobit's feet.
  function mapBox(W, H) { return { x: W * 0.18, y: H * 0.07, w: W * 0.56, h: H * 0.46 }; }
  // One square cell, so a state is a square and not a letterbox.
  function cellOf(m) {
    var c = Math.min(m.w / COLS, m.h / ROWS);
    return { c: c, x: m.x + (m.w - c * COLS) / 2, y: m.y + (m.h - c * ROWS) / 2 };
  }
  function tileRect(m, col, row) {
    var g = cellOf(m), pad = g.c * 0.10;
    return { x: g.x + col * g.c + pad, y: g.y + row * g.c + pad, s: g.c - pad * 2 };
  }
  function drawCoverage(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var m = mapBox(W, H), accent = scene.accent || "#FFD426";
    var fillA = at(scene, "congressAt", t, 0.7);

    // Every tile, always: the country does not arrive, only what we know
    // about it does. Unlit, a tile is an outline; the congressional layer
    // fills all of them, because that layer really is everywhere.
    for (var i = 0; i < TILES.length; i++) {
      var r = tileRect(m, TILES[i][0], TILES[i][1]);
      ctx.save();
      ctx.globalAlpha = a;
      if (fillA > 0) {
        ctx.fillStyle = "rgba(29, 168, 198, " + (0.45 * fillA).toFixed(3) + ")";
        roundRect(ctx, r.x, r.y, r.s, r.s, r.s * 0.18);
        ctx.fill();
      }
      ctx.strokeStyle = fillA > 0 ? "#1DA8C6" : "#3E3E4C";
      ctx.lineWidth = Math.max(1, H * 0.0028);
      roundRect(ctx, r.x, r.y, r.s, r.s, r.s * 0.18);
      ctx.stroke();
      ctx.restore();
    }

    // The curated communities, as whole tiles in the accent. A community is
    // not a state, and the tile is not claiming it is: it is where on the map
    // to look.
    for (var k = 0; k < SPOTS.length; k++) {
      var late = k === SPOTS.length - 1;
      var when = late ? scene.newAt : scene.spotsAt;
      if (when == null) continue;
      var sa = when > 0
        ? since(t, when + (late ? 0 : k * 0.18), late ? 1.6 : 0.45)
        : 1;
      if (sa <= 0) continue;
      var sr = tileRect(m, SPOTS[k][0], SPOTS[k][1]);
      ctx.save();
      ctx.globalAlpha = a * sa;
      ctx.fillStyle = accent;
      roundRect(ctx, sr.x, sr.y, sr.s, sr.s, sr.s * 0.18);
      ctx.fill();
      // A smaller set again: the ones whose local officials carry stances.
      // A ring on the same tile, not a second tile somewhere else, so it is
      // visibly the same place being said twice.
      var st = k < WITH_STANCES ? at(scene, "stancesAt", t, 0.5) : 0;
      if (st > 0) {
        ctx.globalAlpha = a * st;
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = Math.max(1.5, H * 0.004);
        roundRect(ctx, sr.x - sr.s * 0.18, sr.y - sr.s * 0.18,
                  sr.s * 1.36, sr.s * 1.36, sr.s * 0.26);
        ctx.stroke();
      }
      ctx.restore();
    }

    // The legend, built one line at a time, each line arriving with the layer
    // it describes.
    var ly = m.y + m.h + H * 0.055;
    if (fillA > 0) legendRow(ctx, m.x, ly, H, a * fillA, "#1DA8C6", false,
      "Congress, and the people running for the House — everywhere");
    var legendA = at(scene, "spotsAt", t, 0.6);
    if (legendA > 0) legendRow(ctx, m.x, ly + H * 0.052, H, a * legendA, accent, false,
      "Alpha communities — every office, curated by hand");
    var stLegend = at(scene, "stancesAt", t, 0.6);
    if (stLegend > 0) legendRow(ctx, m.x, ly + H * 0.104, H, a * stLegend, "#FFFFFF", true,
      "and of those, the ones with stances on local officials");

    // What the site says when your area is not one of them. Under the legend,
    // not over the map: the line it belongs to now starts two seconds in
    // rather than five, and a card in the middle of the frame would cover the
    // map that the five lines before it spent the whole chapter building.
    var ma = at(scene, "missingAt", t, 0.5);
    if (ma > 0) {
      var cw = W * 0.44, ch = H * 0.165, cx2 = (W - cw) / 2, cy2 = H * 0.755;
      panel(ctx, cx2, cy2, cw, ch, H, a * ma, EDGE);
      ctx.save();
      ctx.globalAlpha = a * ma;
      label(ctx, "We do not cover your area yet", cx2 + W * 0.028, cy2 + H * 0.058,
            H * 0.040, FG, "700");
      label(ctx, "Your members of Congress are below.", cx2 + W * 0.028,
            cy2 + H * 0.105, H * 0.030, MUTED, "500");
      ctx.restore();
    }
  }
  // One legend line: a swatch and a sentence. A ring for the layer that is
  // drawn as a ring, a filled square for the layers that are filled.
  function legendRow(ctx, x, y, H, alpha, color, ring, s) {
    ctx.save();
    ctx.globalAlpha = alpha;
    if (ring) {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, H * 0.003);
      roundRect(ctx, x, y - H * 0.024, H * 0.026, H * 0.026, H * 0.007);
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      roundRect(ctx, x, y - H * 0.024, H * 0.026, H * 0.026, H * 0.007);
      ctx.fill();
    }
    label(ctx, s, x + H * 0.044, y, H * 0.030, FG, "500");
    ctx.restore();
  }

  // ── Chapter 7: won with the fewest votes ───────────────────────────────
  //
  // One dot is one voter. The two fields are drawn at the same dot size and
  // the same spacing, so the difference between them is the only thing on
  // screen that is doing any arguing.
  // `you` is how far in the viewer's own dot has arrived, 0 to 1. It is the
  // FIRST dot of the field — top left, where the eye starts — and it is the
  // same purple the viewer wears everywhere else in the series. One dot in
  // each field, the same size as every other dot: the argument of the line is
  // that one vote is a bigger share of the small field than of the big one,
  // and making the purple dot larger would make that argument for it. It
  // lands from a little larger and settles to the same size as its
  // neighbours, because one dot in two and a half thousand needs the eye
  // brought to it and must not still be shouting once it is there.
  function dotField(ctx, x, y, cols, rows, gap, r, H, alpha, color, you) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (var i = (you > 0 ? 1 : 0); i < cols * rows; i++) {
      var c = i % cols, w = Math.floor(i / cols);
      ctx.beginPath();
      ctx.arc(x + c * gap, y + w * gap, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Drawn last, and at its own strength. The congressional field is held at
    // 85% so the council field reads as the brighter of the two, and a three
    // pixel purple dot dimmed to 85% on this background cannot be found.
    if (you > 0) {
      ctx.save();
      ctx.globalAlpha = you;
      ctx.fillStyle = YOU_C;
      ctx.beginPath();
      ctx.arc(x, y, r * (1 + 0.8 * (1 - you)), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  function drawTurnout(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var accent = scene.accent || "#FFD426";
    var gap = H * 0.0095, r = H * 0.0030;

    // The federal seat first, and it keeps going past the edge of the type:
    // the size of it is the whole point.
    // One informed voter, in both fields at once. Same dot, same person, two
    // very different shares of the thing being decided — which is the whole
    // argument of the chapter, made by the picture rather than by a number.
    var you = at(scene, "youAt", t, 0.55);

    var fa = at(scene, "bigAt", t, 0.6);
    if (fa > 0) {
      dotField(ctx, W * 0.46, H * 0.16, 62, 44, gap, r, H, a * fa * 0.85, MUTED, you);
      ctx.save();
      ctx.globalAlpha = a * fa;
      label(ctx, "A congressional seat", W * 0.46, H * 0.12, H * 0.036, MUTED, "700");
      label(ctx, "hundreds of thousands of votes", W * 0.46, H * 0.635, H * 0.030, MUTED, "500");
      ctx.restore();
    }
    var sa = at(scene, "smallAt", t, 0.5);
    if (sa > 0) {
      dotField(ctx, W * 0.14, H * 0.16, 14, 14, gap * 1.8, r * 1.9, H, a * sa, accent, you);
      ctx.save();
      ctx.globalAlpha = a * sa;
      label(ctx, "A council seat", W * 0.14, H * 0.12, H * 0.036, accent, "700");
      label(ctx, "a couple of hundred people", W * 0.14, H * 0.435, H * 0.030, FG, "500");
      ctx.restore();
    }
  }

  // ── Chapter 8: the live product ────────────────────────────────────────
  //
  // The real page, panned rather than held. Thirteen seconds on one static
  // frame is a slide; the still is 1440x2100 for this reason and the pan runs
  // down it at a fixed rate, so the picture does not need to be told how long
  // its line is. `panFrom` is where this scene starts, in fractions of the
  // travel, and `panRate` is fractions per second.
  function drawLiveScreen(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var accent = scene.accent || "#FFD426";
    var bw = W * 0.72, bx = (W - bw) / 2, by = H * 0.05, bh = H * 0.70;

    if (!shot.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = a;
      label(ctx, "essentials.empowered.vote", W / 2, H * 0.45, H * 0.050, MUTED, "600", "center");
      ctx.restore();
      return;
    }
    var scale = bw / shot.naturalWidth;
    var full = shot.naturalHeight * scale;
    var travel = Math.max(0, full - bh);
    var frac = Math.max(0, Math.min(1, (scene.panFrom || 0) + t * (scene.panRate || 0)));

    ctx.save();
    ctx.globalAlpha = a;
    roundRect(ctx, bx, by, bw, bh, H * 0.014);
    ctx.clip();
    ctx.drawImage(shot, bx, by - travel * frac, bw, full);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(2, H * 0.004);
    roundRect(ctx, bx, by, bw, bh, H * 0.014);
    ctx.stroke();
    label(ctx, "essentials.empowered.vote", W / 2, by + bh + H * 0.075,
          H * 0.038, MUTED, "600", "center");
    ctx.restore();
  }

  window.EVArt = Object.assign(window.EVArt || {}, {
    drawBallot: drawBallot,
    drawScatter: drawScatter,
    drawTitleCard: drawTitleCard,
    drawAddress: drawAddress,
    drawBoundaries: drawBoundaries,
    drawOffices: drawOffices,
    drawProfile: drawProfile,
    drawMoney: drawMoney,
    drawRecord: drawRecord,
    drawCoverage: drawCoverage,
    drawTurnout: drawTurnout,
    drawLiveScreen: drawLiveScreen
  });
  window.EVArt.ready = Promise.all([shotA.ready, logoA.ready]);
})();
