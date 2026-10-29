// Episode 4 art — Civic Trivia Championships.
//
// Every function is a pure function of (ctx, t, W, H, scene). No module-level
// mutable state, or the determinism guarantee in tests/video/02-determinism.cjs
// is void for this episode. Everything is sized from W and H so the same code
// renders at 320x180 in the fixtures and at 1920x1080 in the episode, and the
// lower third is left clear because the cast draws on top.
//
// WHAT IS ON SCREEN IS REAL.
//
// The question on the card is q001 of the shipped fallback bank
// (`EV-Accounts/backend/src/trivia/data/questions.ts`): its text, its four
// options in their real order, its real correct index, the real correction
// written for the option the player picks in this episode, and its real named
// source. That bank is what the engine serves when the database answers with
// nothing, so it is live content rather than an illustration.
//
// The collection names, tiers and theme colours are the real ones. The theme
// colours are dark by design — they are page backgrounds in the product — so
// they are lightened here to be read on a near-black stage, and only the hue
// is carried across.
//
// The clock is 25 seconds and the two bonus bands are at 15s and 5s remaining,
// which is `calculateSpeedBonus` in `services/scoreService.ts`. The wager
// ceiling is half the score, which is `WagerScreen.tsx`. Neither is rounded
// for the picture.
(function () {
  "use strict";
  var FG = "#F2F2F2", MUTED = "#9A9AA0", GRID = "#33333D", DIM = "#5A5A68";
  var CARD = "#1A1A20", EDGE = "#2C2C36";
  // The cast's purple, repeated here because chapter 1 draws the viewer as art
  // rather than as cast and so cannot read it off the scene.
  var VIEWER_TONE = "#7C6B9E";
  var FONT = '"Figtree", "Segoe UI", system-ui, sans-serif';
  var YELLOW = "#FFD426", GOOD = "#43D07E", BAD = "#FF6B52";
  // Type printed ON a bright surface. Never white: every bright colour used
  // below is light enough that white type on it would disappear.
  var ONBRIGHT = "#10131A";

  // ── The question, exactly as the engine serves it ──────────────────────
  // q001, `fallbackQuestions`. correct is 1 ("10"); the player in this episode
  // picks 2 ("12"), which is the option whose correction is quoted below.
  var Q = {
    text: "How many amendments are in the Bill of Rights?",
    options: ["8", "10", "12", "15"],
    correct: 1,
    why: "The Bill of Rights consists of the first 10 amendments to the U.S. Constitution, ratified in 1791.",
    source: "U.S. Constitution — National Archives",
    url: "archives.gov/founding-docs/bill-of-rights"
  };

  // ── The Madison quote, exactly as its source prints it ────────────────
  // Madison to W. T. Barry, 4 August 1822. Text from Hunt's *Writings of
  // James Madison*, vol. 9, as printed at
  // press-pubs.uchicago.edu/founders/documents/v1ch18s35.html, which is the
  // link the citation names and the one `presidential_quotes.md` carries.
  //
  // TWO CHARACTERS THE CIRCULATING VERSION CHANGES, AND THIS MUST NOT: the
  // mark after "ignorance" is a COLON, not a semicolon, and Madison writes a
  // capital G on "Governors". Verified at the link on 2026-10-27.
  //
  // Madison's own hand reads "Knowlege ... for ever". This is the modernised
  // edition, which is what the citation points at, so quote and source agree.
  // Do not mix the two: the manuscript spelling with Hunt's citation would be
  // a sourced quote that is not at the source.
  //
  // Printed from "A people", not from "Knowledge": Chris cut the first clause
  // so the screen carries one sentence instead of two. The fragment is a whole
  // sentence of Madison's and says the thing on its own, and the source line
  // under it points at the letter the rest of it is in. The one silent change
  // is the capital A, which Madison wrote lowercase after "ignorance: And".
  var MADISON = {
    quote: "“A people who mean to be their own Governors, must arm themselves " +
           "with the power which knowledge gives.”",
    who:   "JAMES MADISON",
    where: "letter to W. T. Barry · 4 August 1822"
  };

  // Real collections, with their real tiers. The hue is theirs; the lightness
  // is ours, for a dark stage.
  var COLLECTIONS = [
    { name: "US Civics",       tier: "federal", c: "#5B8DEF" },
    { name: "California",      tier: "state",   c: "#D9A14B" },
    { name: "Massachusetts",   tier: "state",   c: "#6E9BC4" },
    { name: "Los Angeles, CA", tier: "city",    c: "#3FA9D6" },
    { name: "Bloomington, IN", tier: "city",    c: "#E0645C" },
    { name: "Cambridge, MA",   tier: "city",    c: "#7FA8D4" }
  ];

  // What a city collection asks about, in the words of the real topic rows for
  // the los-angeles-ca collection.
  var CITY_TOPICS = ["City Government", "LA County Government", "Local Services", "Civic History"];

  // The quizzes that already exist, for the shelf in chapter 7. They are
  // general civics, which is the point: the gap beside them is local.
  var GENERAL = [
    "The three branches",
    "How a bill becomes a law",
    "The Constitution",
    "The fifty states"
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
  var logoA = load(window.EVCtcLogo);
  // TWO stills, because the close makes two different claims. screen.js is
  // the home page and screen-play.js is a question being answered; a scene
  // names which one it wants with `shot`. Both are optional: either global
  // missing degrades to the empty frame, which is what this episode drew
  // for its whole first cut.
  var shotA = load(window.EVCtcShot);
  var playA = load(window.EVCtcPlayShot);
  var logo = logoA.img, shot = shotA.img, play = playA.img;

  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function fade(t, t0, dur) { return ease((t - t0) / dur); }
  // An entrance, unless the thing is already on screen. A scene that carries
  // on from the one before says `continues: true` and nothing in it fades in
  // again — the blink at every cut is the first thing a reviewer sees.
  function arrive(scene, t, t0, dur) { return scene.continues ? 1 : fade(t, t0, dur); }
  function since(t, t0, dur) { return t0 > 0 ? fade(t, t0, dur) : 1; }

  // A thing inside a scene has THREE states, not two:
  //   undefined   not in this scene at all
  //   0           already on screen before this scene started
  //   > 0         arrives at that second
  // `since` cannot tell the first two apart, because a field nobody set reads
  // as zero and zero means "already there". So every optional thing asks for
  // its field by NAME, and a scene that keeps something says so with an
  // explicit 0.
  function at(scene, key, t, dur) {
    var t0 = scene[key];
    if (t0 == null) return 0;
    return since(t, t0, dur);
  }
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
  function label(ctx, s, x, y, size, color, weight, align) {
    ctx.fillStyle = color;
    ctx.font = (weight || "500") + " " + Math.round(size) + "px " + FONT;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s, x, y);
  }
  // The split, without drawing. A box that grows to hold its sentence has to
  // know how many lines that sentence took before it draws the box.
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
  // One stick figure, small, drawn flat. This is NOT the rig: the crowd in
  // chapter 6 is tens of figures and the cast is capped at three, so the crowd
  // is drawn here as a diagram of a crowd. Keeping it visibly simpler than a
  // Bobit is deliberate — a near-copy of the rig at a quarter size reads as a
  // broken rig.
  function glyph(ctx, x, groundY, h, color, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1, h * 0.09);
    ctx.lineCap = "round";
    var headR = h * 0.17, hipY = groundY - h * 0.42, shoulderY = groundY - h * 0.72;
    ctx.beginPath(); ctx.arc(x, shoulderY - headR * 1.25, headR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, shoulderY); ctx.lineTo(x, hipY);
    ctx.moveTo(x, hipY); ctx.lineTo(x - h * 0.15, groundY);
    ctx.moveTo(x, hipY); ctx.lineTo(x + h * 0.15, groundY);
    ctx.moveTo(x, shoulderY + h * 0.05); ctx.lineTo(x - h * 0.17, shoulderY + h * 0.22);
    ctx.moveTo(x, shoulderY + h * 0.05); ctx.lineTo(x + h * 0.17, shoulderY + h * 0.22);
    ctx.stroke();
    ctx.restore();
  }

  // ── Chapter 1: the desk ────────────────────────────────────────────────
  // One prop through four scenes. The board is drawn left of centre because
  // the class sits on the right of frame and faces it.
  //
  // THE FIRST TWO STAGES ARE A CLASSROOM, and that was a note: the pupil used
  // to be a figure standing beside a table. He sits at a desk now, facing the
  // lesson, with two more of the class at desks behind him. The third stage
  // is twenty years later at a polling place and has no desks in it, so it
  // keeps the cast entry it always had.
  function drawDesk(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var stage = scene.stage || "paper";
    var cx = W * 0.38, deskY = H * 0.70, deskW = W * 0.42;

    ctx.save();
    ctx.globalAlpha = a;

    if (stage !== "ballot") {
      // What the lesson is ON. It was a table with a sheet propped on it; it
      // is a board on a stand now, because a lesson a class is facing has to
      // be up where a class can see it.
      ctx.fillStyle = GRID;
      ctx.fillRect(cx - H * 0.010, deskY, H * 0.020, H * 0.19);
      ctx.fillRect(cx - deskW * 0.22, deskY + H * 0.17, deskW * 0.44, H * 0.016);
    }

    if (stage === "paper" || stage === "marked") {
      var gone = at(scene, "goneAt", t, 0.6);
      var slide = gone * W * 0.55;
      var pw = W * 0.26, ph = H * 0.34;
      var px = cx - pw / 2 - slide, py = deskY - ph;
      ctx.save();
      ctx.globalAlpha = a * (1 - gone * 0.85);
      ctx.fillStyle = "#E8E6DF";
      roundRect(ctx, px, py, pw, ph, H * 0.008); ctx.fill();
      // The three subjects he names, written on the paper as a test's
      // headings. They arrive on his words, not together.
      ctx.fillStyle = "#44434A";
      for (var i = 0; i < 3; i++) {
        var av = atIndex(scene.topicAt, i, t, 0.45);
        if (av <= 0) continue;
        ctx.save();
        ctx.globalAlpha = a * av * (1 - gone * 0.85);
        var txt = ["Three branches of government", "How a bill becomes a law", "Checks and balances"][i];
        ctx.font = "600 " + Math.round(H * 0.022) + "px " + FONT;
        ctx.textAlign = "left";
        wrap(ctx, txt, px + pw * 0.08, py + ph * 0.24 + i * ph * 0.24, pw * 0.84, H * 0.028);
        ctx.restore();
      }
      // The mark. A grade, not a tick: the line is that you passed it.
      var mk = at(scene, "markAt", t, 0.3);
      if (mk > 0) {
        ctx.save();
        ctx.globalAlpha = a * mk * (1 - gone * 0.85);
        ctx.translate(px + pw * 0.74, py + ph * 0.12);
        ctx.rotate(-0.18);
        label(ctx, "A", 0, 0, H * 0.062, "#C8402F", "700", "center");
        ctx.restore();
      }
      ctx.restore();
    }

    if (stage === "ballot") {
      // A different table, and a ballot on it. `dustAt` is the beat where the
      // ballot has finished arriving, so the frame is never empty between the
      // two props.
      var bv = at(scene, "ballotAt", t, 0.6);
      ctx.fillStyle = GRID;
      ctx.fillRect(cx - deskW / 2, deskY, deskW, H * 0.018);
      if (bv > 0) {
        var bw = W * 0.24, bh = H * 0.36;
        var bx = cx - bw / 2, by = deskY - bh - H * 0.01;
        ctx.save();
        ctx.globalAlpha = a * bv;
        ctx.fillStyle = "#E8E6DF";
        roundRect(ctx, bx, by, bw, bh, H * 0.008); ctx.fill();
        ctx.fillStyle = "#6C6B73";
        for (var r = 0; r < 7; r++) {
          var ry = by + bh * 0.16 + r * bh * 0.11;
          ctx.fillRect(bx + bw * 0.10, ry, bw * 0.50, H * 0.008);
          ctx.strokeStyle = "#9B9AA2";
          ctx.lineWidth = Math.max(1, H * 0.002);
          ctx.strokeRect(bx + bw * 0.72, ry - H * 0.004, H * 0.016, H * 0.016);
        }
        ctx.restore();
      }
      // The dust: a faint drift over the ballot, for "twenty years of dust".
      var dv = at(scene, "dustAt", t, 0.8);
      if (dv > 0) {
        ctx.save();
        ctx.globalAlpha = a * dv * 0.5;
        ctx.fillStyle = MUTED;
        for (var d = 0; d < 14; d++) {
          var phase = (t * 0.25 + d * 0.37) % 1;
          var dx = cx - W * 0.11 + ((d * 97) % 220) / 220 * W * 0.22;
          var dy = deskY - H * 0.36 + phase * H * 0.33;
          ctx.globalAlpha = a * dv * 0.45 * (1 - phase);
          ctx.beginPath(); ctx.arc(dx, dy, H * 0.0035, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }

    // The class, in front of the board and after it, so a pupil can overlap it.
    if (stage === "paper" || stage === "marked") classroom(ctx, t, W, H, a, scene);

    if (stage === "turn") {
      // The paper turns over and is a game card on the other side. One
      // object, one rotation: the squash through the middle is what makes it
      // read as a turn rather than as a cut.
      var tv = at(scene, "turnAt", t, 0.9);
      var pw2 = W * 0.26, ph2 = H * 0.34;
      var sx = Math.abs(Math.cos(Math.PI * tv));
      ctx.save();
      ctx.translate(cx, deskY - ph2 / 2);
      ctx.scale(Math.max(0.04, sx), 1);
      if (tv < 0.5) {
        ctx.fillStyle = "#E8E6DF";
        roundRect(ctx, -pw2 / 2, -ph2 / 2, pw2, ph2, H * 0.008); ctx.fill();
      } else {
        ctx.fillStyle = CARD;
        roundRect(ctx, -pw2 / 2, -ph2 / 2, pw2, ph2, H * 0.014); ctx.fill();
        ctx.strokeStyle = YELLOW; ctx.lineWidth = Math.max(2, H * 0.004); ctx.stroke();
        // What is on the other side of the test paper is the GAME, and it has
        // to look like the game. It used to be a yellow question mark in a
        // yellow box, which is the universal symbol for "a quiz thing" and
        // tells a viewer nothing about this one. Chris: "can it look more
        // exciting — and more accurate to CTC — than a yellow question mark
        // in a yellow box?"
        //
        // So it is the live game's own screen, drawn small: the score, the
        // ring counting down from twenty-five, the question number, the
        // progress bar under them, and a question beginning to arrive. Drawn
        // only once the card is more than half turned, because a screen read
        // through a 30% horizontal squash is a smear.
        if (sx > 0.55) gameFace(ctx, pw2, ph2, H, Math.min(1, (sx - 0.55) / 0.3));
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // The live game screen, small, drawn around the origin inside a card
  // `cw` by `ch`. Every number on it is the engine's: twenty-five seconds is
  // the round clock, five is `TOTAL_QUESTIONS` in services/questionService.ts,
  // and the question is `Q`, which is q001 out of `fallbackQuestions`.
  function gameFace(ctx, cw, ch, H, v) {
    var pad = cw * 0.07;
    ctx.save();
    ctx.globalAlpha = v;

    // SCORE and QUESTION, the two chips either side of the clock.
    function chip(x, cap, val, tone) {
      var w = cw * 0.22, h = ch * 0.15;
      ctx.fillStyle = "#13131A";
      roundRect(ctx, x, -ch / 2 + pad, w, h, H * 0.008); ctx.fill();
      ctx.strokeStyle = EDGE; ctx.lineWidth = Math.max(1, H * 0.0018); ctx.stroke();
      label(ctx, cap, x + w / 2, -ch / 2 + pad + h * 0.38, H * 0.013, GOOD, "700", "center");
      label(ctx, val, x + w / 2, -ch / 2 + pad + h * 0.86, H * 0.026, tone, "700", "center");
    }
    chip(-cw / 2 + pad, "SCORE", "0", FG);
    chip(cw / 2 - pad - cw * 0.22, "QUESTION", "1/5", FG);

    // The ring. `clockFace` is the same one chapter 2 uses, so the shape a
    // viewer sees here is the shape they see when the round actually starts.
    clockFace(ctx, 0, -ch / 2 + pad + ch * 0.075, ch * 0.105, H, v, [0, 0], false, 0);

    // The progress bar: five segments, the first one filled.
    // Below the clock's own readout, which hangs under the dial. At 0.20 the
    // bar ran straight through the number.
    var by = -ch / 2 + pad + ch * 0.29, bw = (cw - pad * 2) / 5;
    for (var i = 0; i < 5; i++) {
      ctx.fillStyle = i === 0 ? GOOD : EDGE;
      ctx.fillRect(-cw / 2 + pad + i * bw + bw * 0.04, by, bw * 0.92, H * 0.005);
    }

    // The question, arriving.
    label(ctx, "BILL OF RIGHTS", 0, ch * 0.02, H * 0.015, GOOD, "700", "center");
    ctx.font = "700 " + Math.round(H * 0.022) + "px " + FONT;
    ctx.textAlign = "center";
    ctx.fillStyle = FG;
    wrap(ctx, Q.text, 0, ch * 0.10, cw * 0.84, H * 0.028);

    // Two tiles, so the shape of a four-answer round is on screen without the
    // card turning into a wall of type at this size.
    for (var k = 0; k < 2; k++) {
      var tw = (cw - pad * 2) * 0.47;
      var tx = -cw / 2 + pad + k * (tw + (cw - pad * 2) * 0.06);
      ctx.fillStyle = "#13131A";
      roundRect(ctx, tx, ch * 0.24, tw, ch * 0.13, H * 0.007); ctx.fill();
      ctx.strokeStyle = EDGE; ctx.lineWidth = Math.max(1, H * 0.0018); ctx.stroke();
      label(ctx, "AB".charAt(k), tx + tw * 0.12, ch * 0.325, H * 0.016, DIM, "700");
      label(ctx, Q.options[k], tx + tw * 0.30, ch * 0.325, H * 0.020, MUTED, "600");
    }
    ctx.restore();
  }

  // ── Title card ─────────────────────────────────────────────────────────
  function drawTitleCard(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.45);
    if (a <= 0) return;
    // The lockup sits high when something goes under it and centred when
    // nothing does.
    var midY = scene.sub ? H * 0.34 : H * 0.44;
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
      label(ctx, scene.name || "Civic Trivia Championships", W / 2, midY,
            H * 0.072, scene.accent || YELLOW, "700", "center");
    }
    if (scene.sub) label(ctx, scene.sub, W / 2, H * 0.54, H * 0.044, MUTED, "600", "center");
    ctx.restore();
  }

  // ── The question card ──────────────────────────────────────────────────
  // One object across chapters 2 and 8. Everything that can arrive inside it
  // asks for its own field by name.
  function cardBox(W, H) {
    var w = W * 0.52, h = H * 0.50;
    return { x: (W - w) / 2, y: H * 0.14, w: w, h: h };
  }
  // The clock: a 25-second arc. `bandAt` paints the two bonus bands onto it,
  // at 15s and 5s remaining, which is where scoreService changes its mind.
  function clockFace(ctx, cx, cy, r, H, alpha, bands, running, t) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(3, H * 0.010);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

    // Band 1: the first ten seconds, worth +50. Band 2: up to twenty, +25.
    var TOP = -Math.PI / 2;
    function band(from, to, color, av) {
      if (av <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha * av;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(3, H * 0.010);
      ctx.beginPath();
      ctx.arc(cx, cy, r, TOP + Math.PI * 2 * from, TOP + Math.PI * 2 * to);
      ctx.stroke();
      ctx.restore();
    }
    band(0, 10 / 25, GOOD, bands ? bands[0] : 0);
    band(10 / 25, 20 / 25, YELLOW, bands ? bands[1] : 0);

    if (bands && bands[0] > 0) {
      label(ctx, "+50", cx - r * 1.35, cy - r * 0.35, H * 0.024, GOOD, "700", "right");
    }
    if (bands && bands[1] > 0) {
      label(ctx, "+25", cx - r * 1.35, cy + r * 0.45, H * 0.024, YELLOW, "700", "right");
    }

    // The hand. It only moves where the scene says the clock is running,
    // because a clock ticking under a line about something else pulls the eye
    // off the line.
    var frac = running ? Math.min(1, t / 25) : 0.12;
    ctx.strokeStyle = FG;
    ctx.lineWidth = Math.max(2, H * 0.005);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(TOP + Math.PI * 2 * frac) * r * 0.72,
               cy + Math.sin(TOP + Math.PI * 2 * frac) * r * 0.72);
    ctx.stroke();
    label(ctx, String(Math.max(0, 25 - Math.round(running ? t : 3))), cx, cy + r * 1.55,
          H * 0.026, MUTED, "600", "center");
    ctx.restore();
  }

  function drawQuestion(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var stage = scene.stage || "card";
    var b = cardBox(W, H);

    ctx.save();
    ctx.globalAlpha = a;

    // The card itself, for every other stage.
    panel(ctx, b.x, b.y, b.w, b.h, H, a, EDGE);
    ctx.fillStyle = FG;
    ctx.font = "700 " + Math.round(H * 0.040) + "px " + FONT;
    ctx.textAlign = "left";
    // 0.58, not 0.76: the clock and its two bonus labels live in the top right
    // of the card, and a question wrapped wider than this runs under them.
    wrap(ctx, Q.text, b.x + b.w * 0.06, b.y + b.h * 0.18, b.w * 0.58, H * 0.050);

    // Four options. `optAt` is indexed by option, in the engine's own order.
    for (var i = 0; i < 4; i++) {
      var ov = atIndex(scene.optAt, i, t, 0.35);
      if (ov <= 0) continue;
      // Two by two, in the engine's own option order: A and B on the top row,
      // C and D under them.
      var ow = b.w * 0.40, ox = b.x + b.w * 0.06 + (i % 2) * (ow + b.w * 0.06);
      var oy = b.y + b.h * 0.40 + Math.floor(i / 2) * b.h * 0.26;
      ctx.save();
      ctx.globalAlpha = a * ov;
      ctx.fillStyle = CARD;
      roundRect(ctx, ox, oy, ow, b.h * 0.18, H * 0.012); ctx.fill();
      ctx.strokeStyle = EDGE;
      ctx.lineWidth = Math.max(1, H * 0.0025); ctx.stroke();
      label(ctx, "ABCD".charAt(i), ox + ow * 0.08, oy + b.h * 0.115,
            H * 0.030, DIM, "700", "left");
      label(ctx, Q.options[i], ox + ow * 0.22, oy + b.h * 0.115,
            H * 0.034, FG, "600", "left");
      ctx.restore();
    }

    // The clock, top right of the card. It does not tick: a hand sweeping
    // under a line about something else pulls the eye off the line.
    var cv = at(scene, "clockAt", t, 0.4);
    if (cv > 0) {
      var bands = [atIndex(scene.bandAt, 0, t, 0.4), atIndex(scene.bandAt, 1, t, 0.4)];
      clockFace(ctx, b.x + b.w * 0.88, b.y + b.h * 0.20, H * 0.055, H,
                a * cv, bands, false, 0);
    }

    ctx.restore();
  }

  // ── Chapter 3: the explanation ─────────────────────────────────────────
  function drawLearn(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    // The card holds an answer, an explanation and a source, and nothing
    // else. It was H*0.62 tall when a correction panel sat in the middle of
    // it; that line was cut, so the card closes up rather than keeping an
    // empty band the eye reads as something missing.
    var b = { x: W * 0.20, y: H * 0.18, w: W * 0.60, h: H * 0.46 };

    ctx.save();
    ctx.globalAlpha = a;
    var ov = at(scene, "openAt", t, 0.5);
    if (ov <= 0) { ctx.restore(); return; }
    ctx.globalAlpha = a * ov;
    panel(ctx, b.x, b.y, b.w, b.h, H, 1, EDGE);

    // The right answer, named, and under it the explanation the engine ships
    // with the question.
    label(ctx, "CORRECT ANSWER", b.x + b.w * 0.06, b.y + b.h * 0.12, H * 0.022, MUTED, "700");
    label(ctx, "B  ·  " + Q.options[Q.correct], b.x + b.w * 0.06, b.y + b.h * 0.22,
          H * 0.042, GOOD, "700");

    var wv = at(scene, "whyAt", t, 0.5);
    if (wv > 0) {
      ctx.save();
      ctx.globalAlpha = a * ov * wv;
      ctx.fillStyle = FG;
      ctx.font = "500 " + Math.round(H * 0.028) + "px " + FONT;
      ctx.textAlign = "left";
      wrap(ctx, Q.why, b.x + b.w * 0.06, b.y + b.h * 0.33, b.w * 0.88, H * 0.038);
      ctx.restore();
    }

    var sv = at(scene, "srcAt", t, 0.5);
    if (sv > 0) {
      ctx.save();
      ctx.globalAlpha = a * ov * sv;
      var sy = b.y + b.h * 0.88;
      ctx.strokeStyle = EDGE;
      ctx.lineWidth = Math.max(1, H * 0.002);
      ctx.beginPath();
      ctx.moveTo(b.x + b.w * 0.06, sy - H * 0.030);
      ctx.lineTo(b.x + b.w * 0.94, sy - H * 0.030);
      ctx.stroke();
      label(ctx, Q.source, b.x + b.w * 0.06, sy, H * 0.024, FG, "600");
      label(ctx, Q.url, b.x + b.w * 0.06, sy + H * 0.032, H * 0.022, "#5B8DEF", "500");
      ctx.restore();
    }

    var fv = at(scene, "flagAt", t, 0.4);
    if (fv > 0) {
      ctx.save();
      ctx.globalAlpha = a * ov * fv;
      var fx = b.x + b.w * 0.92, fy = b.y + b.h * 0.10;
      ctx.strokeStyle = YELLOW; ctx.fillStyle = YELLOW;
      ctx.lineWidth = Math.max(2, H * 0.004);
      ctx.beginPath();
      ctx.moveTo(fx, fy - H * 0.030); ctx.lineTo(fx, fy + H * 0.026); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx, fy - H * 0.030);
      ctx.lineTo(fx + W * 0.022, fy - H * 0.018);
      ctx.lineTo(fx, fy - H * 0.006);
      ctx.closePath(); ctx.fill();
      label(ctx, "Flag this question", fx - W * 0.012, fy + H * 0.055, H * 0.020, YELLOW, "600", "right");
      ctx.restore();
    }

    ctx.restore();
  }

  // ── Chapter 5: the collections ─────────────────────────────────────────
  function drawCollections(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var stage = scene.stage || "shelf";

    ctx.save();
    ctx.globalAlpha = a;

    var cw = W * 0.19, ch = H * 0.17;
    // 'shelf' lays them out in two rows; 'tiers' sorts the same six into
    // three bands. The cards do not re-enter between the two — they move.
    for (var i = 0; i < COLLECTIONS.length; i++) {
      var col = COLLECTIONS[i];
      var av = atIndex(scene.cardAt, i, t, 0.4);
      if (scene.continues) av = 1;
      if (av <= 0) continue;

      var x, y;
      if (stage === "shelf") {
        x = W * 0.14 + (i % 3) * (cw + W * 0.045);
        y = H * 0.24 + Math.floor(i / 3) * (ch + H * 0.07);
      } else {
        // Sorted: federal top, state middle, city bottom.
        var tierIdx = col.tier === "federal" ? 0 : col.tier === "state" ? 1 : 2;
        var within = 0, seen = 0;
        for (var j = 0; j < COLLECTIONS.length; j++) {
          if (COLLECTIONS[j].tier !== col.tier) continue;
          if (j === i) within = seen;
          seen++;
        }
        var bv = atIndex(scene.bandAt, tierIdx, t, 0.5);
        if (bv <= 0) continue;
        x = W * 0.30 + within * (cw + W * 0.03);
        y = H * 0.20 + tierIdx * (ch + H * 0.045);
        av = bv;
      }

      // In 'city' only the one city card stays, opened.
      if (stage === "city" && col.name !== "Los Angeles, CA") {
        var ov = at(scene, "openAt", t, 0.6);
        av = av * (1 - ov);
      }
      if (av <= 0) continue;

      ctx.save();
      ctx.globalAlpha = a * av;
      panel(ctx, x, y, cw, ch, H, 1, EDGE);
      ctx.fillStyle = col.c;
      roundRect(ctx, x, y, cw, H * 0.012, H * 0.006); ctx.fill();
      label(ctx, col.name, x + cw * 0.08, y + ch * 0.48, H * 0.026, FG, "700");
      label(ctx, col.tier, x + cw * 0.08, y + ch * 0.76, H * 0.022, MUTED, "600");
      ctx.restore();
    }

    if (stage === "tiers") {
      var names = ["FEDERAL", "STATE", "CITY"];
      for (var n = 0; n < 3; n++) {
        var nv = atIndex(scene.bandAt, n, t, 0.5);
        if (nv <= 0) continue;
        ctx.save();
        ctx.globalAlpha = a * nv * 0.8;
        label(ctx, names[n], W * 0.27, H * 0.20 + n * (ch + H * 0.045) + ch * 0.55,
              H * 0.024, MUTED, "700", "right");
        ctx.restore();
      }
      var fv = at(scene, "fedAt", t, 0.5);
      if (fv > 0) {
        ctx.save();
        ctx.globalAlpha = a * fv;
        ctx.strokeStyle = YELLOW;
        ctx.lineWidth = Math.max(2, H * 0.004);
        roundRect(ctx, W * 0.30 - H * 0.008, H * 0.20 - H * 0.008,
                  cw + H * 0.016, ch + H * 0.016, H * 0.020);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (stage === "city") {
      var ov2 = at(scene, "openAt", t, 0.6);
      if (ov2 > 0) {
        var bx = W * 0.26, by = H * 0.22, bw = W * 0.48, bh = H * 0.44;
        ctx.save();
        ctx.globalAlpha = a * ov2;
        panel(ctx, bx, by, bw, bh, H, 1, "#3FA9D6");
        label(ctx, "Los Angeles, CA", bx + bw * 0.05, by + bh * 0.16, H * 0.038, FG, "700");
        for (var q = 0; q < CITY_TOPICS.length; q++) {
          var qv = atIndex(scene.qAt, q, t, 0.4);
          if (qv <= 0) continue;
          ctx.save();
          ctx.globalAlpha = a * ov2 * qv;
          var qy = by + bh * 0.32 + q * bh * 0.16;
          ctx.fillStyle = "#3FA9D6";
          ctx.fillRect(bx + bw * 0.05, qy - H * 0.018, Math.max(2, H * 0.004), H * 0.026);
          label(ctx, CITY_TOPICS[q], bx + bw * 0.08, qy, H * 0.030, FG, "600");
          ctx.restore();
        }
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // ── Chapter 6: the crowd ───────────────────────────────────
  // The product's own mechanic, drawn with the product's own unit: one figure
  // per question answered correctly. `grantBobit` on a right answer,
  // `revokeBobit` on a wrong one — both are in routes/game.ts, and the film
  // shows both because the app does both.
  //
  // THESE ARE RIGGED BOBITS, NOT STAMPS, AND THAT WAS A NOTE. The first cut
  // drew the crowd as flat glyphs because the cast is capped at three and the
  // crowd is twenty; Chris watched it and said what the picture was actually
  // saying: "I'd rather have them spawn with purple smoke and be real bobits
  // instead of stamps of stick people that don't move." He is right, and the
  // cap was never the obstacle — the cap is on `scene.cast`, which is the
  // authored foreground. An art function may drive the rig itself, which is
  // all `cast.js` does, so this one does too.
  //
  // Everything here is a pure function of (i, t). That is not a style
  // preference: `tests/video/02-determinism.cjs` renders the same frame twice
  // and compares bytes, so a crowd that reached for Math.random would fail the
  // episode rather than look slightly different. Per-figure variety comes from
  // `jit`, a hash of the figure's index.
  //
  // The layout is the live collection page's, because that is the other half
  // of the note: the question card sits up top, the floor is under it, and the
  // TABLEAU rises in the two margins either side. Figures therefore spawn
  // below the answers, which is where the app puts them.

  // A figure's own number, stable for the life of the chapter. Index and a
  // channel in, 0..1 out.
  function jit(i, k) {
    var x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  // The crowd's colours are the house six. The cast's purple is deliberately
  // NOT among them: the viewer has to stay findable in his own crowd.
  var CROWD_TONES = ["#FFD426", "#1DA8C6", "#43D07E", "#FF9A4D", "#FF6B52", "#E86FC4"];

  // The flash a bobit arrives in. Purple because that is what the app does,
  // and because every other bright colour in this chapter already means
  // something — yellow is the crowd, green is right, red is wrong.
  var SPAWN_PURPLE = "#B49BFF";

  // One rigged figure, placed by its FEET. `cast.js` works out how far the
  // deepest foot of an animation falls below the pelvis and lifts by that; the
  // same call is reused here rather than re-derived, so a crowd figure and a
  // cast figure standing on the same line stand on the same line.
  function rigFig(ctx, name, cx, groundY, scale, color, tt, flip, alpha, prop) {
    var R = window.LeremyRig, anim = R.ANIMATIONS[name];
    if (!anim || alpha <= 0) return;
    var lift = window.EVCast.footDepth(name, anim) * scale;
    var opts = { color: color, time: tt };
    if (anim.book) opts.book = true;
    if (prop) for (var k in prop) if (prop.hasOwnProperty(k)) opts[k] = prop[k];
    ctx.save();
    ctx.globalAlpha = alpha;
    R.drawShadow(ctx, cx, groundY, 62 * scale, "rgba(0,0,0,0.32)");
    ctx.translate(cx, groundY - lift);
    ctx.scale(flip ? -scale : scale, scale);
    R.draw(ctx, R.computePose(anim.frame(tt), R.CFG, { x: 0, y: 0 }), R.CFG, opts);
    ctx.restore();
  }

  // ── School furniture ───────────────────────────────────────────────────
  // The rig HAS a `desk` prop and this does not use it, which is worth saying
  // out loud: the rig's desk is an office desk with a monitor on it, and its
  // `chair` is an office swivel chair. Both are right for the pose they were
  // drawn for (`witsend`, somebody at work) and both are wrong in a classroom.
  //
  // Drawn in two halves on purpose. The seat goes down BEFORE the figure and
  // the desk goes down AFTER, so the figure sits in front of his chair and
  // behind his desk. That is the whole reason this chapter stopped using
  // `scene.cast` for the pupils: the engine draws the cast after the art, so
  // a cast figure can never have anything in front of him.
  //
  // Everything is in rig units times `s`, the same units the figure is drawn
  // in, so a desk scales with its pupil instead of drifting off him.
  function schoolSeat(ctx, fx, groundY, s, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.lineWidth = 7 * s;
    ctx.beginPath();
    ctx.moveTo(fx - 10 * s, groundY - 56 * s); ctx.lineTo(fx + 46 * s, groundY - 56 * s);
    ctx.moveTo(fx + 30 * s, groundY - 56 * s); ctx.lineTo(fx + 30 * s, groundY - 120 * s);
    ctx.stroke();
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.moveTo(fx + 34 * s, groundY - 54 * s); ctx.lineTo(fx + 34 * s, groundY);
    ctx.moveTo(fx - 4 * s, groundY - 54 * s);  ctx.lineTo(fx - 4 * s, groundY);
    ctx.stroke();
    ctx.restore();
  }
  function schoolDesk(ctx, fx, groundY, s, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // The top is slanted away from the pupil, which is the one line that makes
    // a rectangle read as a school desk rather than as a table.
    ctx.lineWidth = 8 * s;
    ctx.beginPath();
    ctx.moveTo(fx - 108 * s, groundY - 98 * s);
    ctx.lineTo(fx - 20 * s, groundY - 84 * s);
    ctx.stroke();
    ctx.lineWidth = 6 * s;
    ctx.beginPath();
    ctx.moveTo(fx - 100 * s, groundY - 96 * s); ctx.lineTo(fx - 100 * s, groundY);
    ctx.moveTo(fx - 28 * s, groundY - 85 * s);  ctx.lineTo(fx - 28 * s, groundY);
    ctx.moveTo(fx - 100 * s, groundY - 34 * s); ctx.lineTo(fx - 28 * s, groundY - 34 * s);
    ctx.stroke();
    ctx.restore();
  }

  // The room. One pupil is the viewer and the rest are the rest of the class,
  // because Chris asked the obvious question about the first shot: "can there
  // be other Bobits in desks behind them because it’s at a school?"
  //
  // They RECEDE: further back is higher in frame, smaller, and dimmer. Three
  // is enough. A full class drawn at this size is a texture, and a texture
  // behind the one figure the film is about pulls the eye off him.
  var CLASS_ROW = [
    { x: 0.645, g: 0.945, s: 1.05, dim: 1.00, anim: null,    ph: 0.0 },
    { x: 0.800, g: 0.880, s: 0.80, dim: 0.58, anim: "read",  ph: 2.7 },
    { x: 0.908, g: 0.833, s: 0.63, dim: 0.38, anim: "sit",   ph: 5.1 }
  ];
  function classroom(ctx, t, W, H, a, scene) {
    var seat = scene.seat || "read";
    for (var i = 0; i < CLASS_ROW.length; i++) {
      var r = CLASS_ROW[i];
      var fx = W * r.x, gy = H * r.g, s = r.s * H * 0.00085;
      var al = a * r.dim;
      var tone = i === 0 ? VIEWER_TONE : (i === 1 ? "#1DA8C6" : "#FF9A4D");
      schoolSeat(ctx, fx, gy, s, GRID, al);
      // Facing LEFT, at the board. `flip` mirrors the figure, and the
      // furniture is authored for a pupil who faces left, so it is not
      // mirrored with him.
      rigFig(ctx, i === 0 ? seat : r.anim, fx, gy, s, tone, t * 0.8 + r.ph, true, al);
      schoolDesk(ctx, fx, gy, s, GRID, al);
    }
  }


  // Where figure `i` lives, and how big it is. Spread across the middle band
  // only: the margins belong to the tableau, and a bobit standing in front of
  // the mast reads as part of it.
  //
  // The spread is golden-ratio rather than a modulo. `(i * 53) % 61` put four
  // of the first eight within a figure's width of each other and left a hole
  // in the middle of the field; this is the fix the first cut already carried
  // and it is kept.
  function crowdSpot(i, W, H, groundY) {
    var u = (i * 0.6180339887) % 1;
    var depth = jit(i, 3);
    return {
      x: W * 0.265 + u * W * 0.47,
      // Nearer figures stand lower and bigger. A flat rank of identical
      // figures is a fence.
      y: groundY - depth * H * 0.045,
      scale: H * (0.00058 - depth * 0.00009)
    };
  }

  // What figure `i` is doing, as a name and a clock. Pure.
  //
  // The order of the tests IS the priority: a spawning figure is landing
  // whatever else is happening, a cheering room beats a pair's high five, and
  // a five beats standing about. Reordering these changes the scene.
  function crowdAct(i, i_age, t, scene, paired) {
    // Landing out of the flash — the END of the jump, not the start of it.
    // The cycle is about 1.5s long and the figure is in the air from 0.8 to
    // 1.3; played from its own zero he CROUCHES and springs, which out of a
    // puff of smoke reads as a shape, not a person. Mapped onto 1.05..1.55 he
    // comes down and lands, which is what arriving looks like.
    if (i_age != null && i_age < 0.75) return { name: "jump", tt: 1.05 + i_age * 0.67 };

    var cheer = at(scene, "cheerAt", t, 0.35);
    if (cheer > 0.5) return { name: "cheer", tt: t + jit(i, 7) * 2 };

    if (paired) return { name: paired, tt: t * 1.0 + jit(i, 11) * 0.3 };

    // Idle. One in three wanders; the rest stand and breathe. A crowd where
    // nobody moves is a crowd of posters, which was the other half of the note.
    var pick = jit(i, 5);
    if (pick < 0.34) return { name: "stroll", tt: t * 0.55 + jit(i, 6) * 4, wander: true };
    if (pick < 0.62) return { name: "bored", tt: t * 0.8 + jit(i, 6) * 4 };
    return { name: "present", tt: t * 0.7 + jit(i, 6) * 4 };
  }

  // The answered question, as the app draws it: category over the question,
  // four lettered tiles, the right one filled green. This is `Q`, which is
  // q001 out of `fallbackQuestions`, so the card is the engine's own.
  function answeredCard(ctx, W, H, v) {
    var cw = W * 0.44, cx = (W - cw) / 2, cy = H * 0.055, ch = H * 0.285;
    ctx.save();
    ctx.globalAlpha = v;
    panel(ctx, cx, cy, cw, ch, H, 1, EDGE);
    label(ctx, "BILL OF RIGHTS", W / 2, cy + H * 0.040, H * 0.020, GOOD, "700", "center");
    ctx.font = "700 " + Math.round(H * 0.030) + "px " + FONT;
    ctx.textAlign = "center";
    ctx.fillStyle = FG;
    wrap(ctx, Q.text, W / 2, cy + H * 0.082, cw * 0.84, H * 0.038);

    var tw = cw * 0.44, th = H * 0.052, gap = cw * 0.04;
    for (var k = 0; k < 4; k++) {
      var col = k % 2, row = (k - col) / 2;
      var tx = cx + cw * 0.04 + col * (tw + gap), ty = cy + H * 0.150 + row * (th + H * 0.016);
      var right = k === Q.correct;
      ctx.globalAlpha = v * (right ? 1 : 0.45);
      ctx.fillStyle = right ? GOOD : CARD;
      roundRect(ctx, tx, ty, tw, th, H * 0.010); ctx.fill();
      if (!right) { ctx.strokeStyle = EDGE; ctx.lineWidth = Math.max(1, H * 0.002); ctx.stroke(); }
      label(ctx, "ABCD"[k], tx + tw * 0.08, ty + th * 0.64, H * 0.020,
            right ? ONBRIGHT : DIM, "700");
      label(ctx, Q.options[k], tx + tw * 0.20, ty + th * 0.64, H * 0.024,
            right ? ONBRIGHT : MUTED, right ? "700" : "500");
    }
    ctx.globalAlpha = v;
    ctx.restore();
  }

  function drawCrowd(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var T = window.EVTableau;
    var groundY = H * 0.845;

    ctx.save();
    ctx.globalAlpha = a;

    // The card the figures are standing under. It holds for the whole chapter
    // because the chapter is about what answering it DOES.
    var card = at(scene, "cardAt", t, 0.5);
    if (card > 0) answeredCard(ctx, W, H, a * card);

    // The floor, and the collection this crowd belongs to.
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(2, H * 0.004);
    ctx.beginPath();
    ctx.moveTo(W * 0.04, groundY); ctx.lineTo(W * 0.96, groundY); ctx.stroke();
    label(ctx, "Los Angeles, CA", W / 2, H * 0.040, H * 0.026, MUTED, "700", "center");

    // ── The tableau, in both margins ──
    //
    // `builtFrom` is what is already standing when the scene opens and
    // `builtTo` is what is standing when it ends, so a scene that raises
    // nothing states the same number twice and the cue can stay absent.
    var from = scene.builtFrom || 0;
    var to = scene.builtTo == null ? from : scene.builtTo;
    var raise = scene.buildAt == null ? (to > from ? 1 : 0) : at(scene, "buildAt", t, 1.0);
    var built = from + (to - from) * raise;
    if (built > 0) {
      // 1000 rig units high has to fit between the floor and the card. Solved
      // from the frame rather than chosen, so the mast clears the crowd and
      // stops short of the answers.
      var tscale = (groundY - H * 0.355) / 1000;
      T.drawStack(ctx, "left",  built, W * 0.145, groundY, tscale, { alpha: a });
      T.drawStack(ctx, "right", built, W * 0.855, groundY, tscale, { alpha: a, flag: YELLOW });
    }

    // ── The crowd ──
    //
    // `have` is how many were already standing when the scene opened, and
    // `spawnAt` is one second per figure that arrives DURING it. The two
    // together are the population, which is why neither is optional once the
    // chapter has anybody in it.
    var have = scene.have || 0;
    var spawn = scene.spawnAt || [];
    var pop = have + spawn.length;

    // Pair the room off for a high five, left-first, the way CTC's own
    // `pairUp` does it: the left partner reaches RIGHT. Pairs are taken in
    // index order over the figures that are actually standing, so the pairing
    // cannot change between two renders of the same frame.
    //
    // AND THE PAIR HAS TO CLOSE THE GAP. `HIGHFIVE_GAP` is part of the pose,
    // not a layout detail: the two hands land about 83 rig units off each
    // figure's centre line, so partners standing anywhere else reach past each
    // other. The first cut of this scene did exactly that — sixteen arms up
    // and not one hand touching. So each partner steps to its half of the
    // pair's midpoint, arriving as the arms come up.
    //
    // `maxGap` is what stops a figure sprinting across the field to find a
    // partner. CTC's own `pairUp` takes the same argument for the same reason.
    var five = at(scene, "fiveAt", t, 0.4);
    var partner = {}, stepTo = {}, pairDepth = {};
    if (five > 0) {
      var standing = [];
      for (var q = 0; q < pop; q++) {
        var bq = q < have ? null : spawn[q - have];
        if (bq != null && t < bq + 0.75) continue;
        var sp = crowdSpot(q, W, H, groundY);
        standing.push({ i: q, x: sp.x, y: sp.y, scale: sp.scale });
      }
      standing.sort(function (p, r) { return p.x - r.x; });
      for (var q2 = 0; q2 + 1 < standing.length; q2 += 2) {
        var Lp = standing[q2], Rp = standing[q2 + 1];
        // AND THE PAIR HAS TO STAND AT THE SAME DEPTH. The crowd is spread
        // over a shallow depth — nearer figures stand lower and bigger — and
        // two neighbours can be most of that spread apart. Spaced correctly
        // but at different depths their hands pass thirty pixels above and
        // below each other, which is what the first cut of this did and what
        // a frame grab, not the code, showed. So the right partner steps onto
        // the LEFT one's line and matches his size for the length of the
        // five: two people slapping hands are at arm's length, which means
        // they are standing in the same place.
        var want = window.LeremyRig.HIGHFIVE_GAP * Lp.scale;
        if (Rp.x - Lp.x > want * 3) { q2 -= 1; continue; }   // too far: he waves alone
        var mid = (Lp.x + Rp.x) / 2;
        partner[Lp.i] = "highfiveR"; stepTo[Lp.i] = mid - want / 2;
        partner[Rp.i] = "highfiveL"; stepTo[Rp.i] = mid + want / 2;
        pairDepth[Lp.i] = { y: Lp.y, scale: Lp.scale };
        pairDepth[Rp.i] = { y: Lp.y, scale: Lp.scale };
      }
    }

    for (var i = 0; i < pop; i++) {
      var born = i < have ? null : spawn[i - have];
      var age = born == null ? null : t - born;
      if (age != null && age < 0) continue;

      var spot = crowdSpot(i, W, H, groundY);
      var act = crowdAct(i, age, t, scene, partner[i]);
      // A partner eases onto his pair's line as the arms come up, and back off
      // it when the five is over, so nobody teleports between depths.
      if (pairDepth[i]) {
        spot = {
          x: spot.x,
          y: spot.y + (pairDepth[i].y - spot.y) * five,
          scale: spot.scale + (pairDepth[i].scale - spot.scale) * five
        };
      }
      var x = spot.x;
      // A wanderer drifts inside a stride of home and turns round at the ends,
      // which is what makes it a person loitering rather than a person leaving.
      var flip = jit(i, 9) > 0.5;
      if (stepTo[i] != null) {
        x = x + (stepTo[i] - x) * five;
        // NOT FLIPPED, and this cost a frame grab to find. The pose already
        // says which arm goes up — the left partner plays highfiveR and
        // reaches right — so mirroring the figure as well reverses it, and
        // the pair end up reaching the SAME way with their hands eighty
        // pixels apart. It read as two people waving at something offscreen.
        flip = false;
      } else if (act.wander) {
        var sway = Math.sin(t * 0.33 + jit(i, 8) * 6.28);
        x += sway * W * 0.012;
        flip = sway < 0;
      }

      // The flash. It is drawn UNDER the figure and outlives him by a beat, so
      // he reads as having come out of it rather than as having been hidden
      // behind it.
      if (age != null && age < 0.85) {
        var pv = age < 0.18 ? age / 0.18 : Math.max(0, 1 - (age - 0.18) / 0.67);
        window.LeremyRig.drawSmoke(ctx, x, spot.y - H * 0.036, H * 0.080 * (0.55 + age),
                                   a * pv * 1.15, i + 3, t, SPAWN_PURPLE);
      }
      if (age != null && age < 0.16) continue;

      var tone = CROWD_TONES[Math.floor(jit(i, 1) * CROWD_TONES.length) % CROWD_TONES.length];
      rigFig(ctx, act.name, x, spot.y, spot.scale, tone, act.tt, flip, a);
    }

    // The question the field has no figure for: dealt face-up, marked new.
    var deal = at(scene, "dealAt", t, 0.5);
    if (deal > 0) {
      ctx.save();
      ctx.globalAlpha = a * deal;
      var dw = W * 0.26, dh = H * 0.11, dx = (W - dw) / 2, dy = H * 0.375;
      panel(ctx, dx, dy, dw, dh, H, 1, YELLOW);
      label(ctx, "NOT YET EARNED", dx + dw * 0.06, dy + dh * 0.38, H * 0.022, YELLOW, "700");
      label(ctx, "a question you have never got right", dx + dw * 0.06, dy + dh * 0.76,
            H * 0.024, MUTED, "500");
      ctx.restore();
    }

    // And one walks off, for a question that was right once and is wrong now.
    // He is a real figure too, and he TRUDGES: the app takes the bobit back,
    // and the picture should not make that look like a stroll.
    var leave = at(scene, "leaveAt", t, 0.9);
    if (leave > 0) {
      var lx = W * 0.30 + leave * W * 0.26;
      rigFig(ctx, "trudge", lx, groundY - H * 0.012, H * 0.00048, BAD,
             t * 0.9, false, a * (1 - leave * 0.75));
    }

    // Signed out, signed in.
    var split = at(scene, "splitAt", t, 0.6);
    if (split > 0) {
      ctx.save();
      ctx.globalAlpha = a * split;
      label(ctx, "signed out  ·  kept in this browser", W * 0.28, H * 0.935,
            H * 0.024, MUTED, "600", "center");
      label(ctx, "signed in  ·  follows you, with your level", W * 0.72, H * 0.935,
            H * 0.024, YELLOW, "600", "center");
      ctx.restore();
    }

    ctx.restore();
  }

  // ── Chapter 7: why a trivia game ───────────────────────────────────────
  // The argument chapter. Nothing here is a screenshot of the product,
  // because none of it is a feature: it is the reason the features are worth
  // building. Every claim it draws is a cron job that runs — the script
  // header names each one by file.
  //
  // Empowered Badges is not drawn and not named. It is designed and not
  // built, and this series does not put an unbuilt thing on screen.
  function drawWhy(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var stage = scene.stage || "ask";

    ctx.save();
    ctx.globalAlpha = a;

    if (stage === "ask") {
      var av = at(scene, "askAt", t, 0.6);
      if (av > 0) {
        ctx.save();
        ctx.globalAlpha = a * av;
        label(ctx, "why a trivia game?", W * 0.56, H * 0.46,
              H * 0.056, MUTED, "600", "center");
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    if (stage === "idea") {
      // A QUOTE NOW, AND MARKED AS ONE.
      //
      // What this used to print was "A nation cannot be both ignorant and
      // free." — set deliberately WITHOUT quotation marks, because the voice
      // was paraphrasing Jefferson and a picture must not pretend to quote
      // what is only being summarised. The marks were the right call for the
      // wrong line: the voice still said "Jefferson's argument was", and that
      // is the half a viewer cannot check. Chris sourced it and it is not what
      // Jefferson wrote.
      //
      // So it is Madison's own words, the marks go on, and the source arrives
      // under them. The source block IS the change — "visually explain where
      // the quote came from" — not decoration under a line that would be fine
      // alone.
      var lv = at(scene, "lineAt", t, 0.8);
      var fv = at(scene, "fromAt", t, 0.7);
      var cv2 = at(scene, "condAt", t, 0.8);

      // The quote is measured whether or not it is drawn yet, because the
      // source hangs off its LAST line. Measured and not assumed, and the
      // measuring is why the box is 0.84 and not 0.76: the fixtures render at
      // 320x180 and the episode at 1920x1080, and at 0.76 this quote broke to
      // two lines on the fixture and three on the film, orphaning "gives."
      // 0.84 is in the middle of a band where both sizes break identically.
      // Set for the two lines the truncated quote wraps to. nq is counted,
      // not assumed, and everything under the quote hangs off it, so a
      // rewrap at another size moves the source and the claim with it
      // instead of running them into each other.
      var qTop = H * 0.34, qLine = H * 0.070, nq;
      ctx.save();
      ctx.font = "700 " + Math.round(H * 0.052) + "px " + FONT;
      ctx.textAlign = "center";
      if (lv > 0) {
        ctx.globalAlpha = a * lv;
        ctx.fillStyle = FG;
        nq = wrap(ctx, MADISON.quote, W / 2, qTop, W * 0.84, qLine);
      } else {
        nq = wrapLines(ctx, MADISON.quote, W * 0.84).length;
      }
      ctx.restore();

      var sy = qTop + nq * qLine;

      if (fv > 0) {
        ctx.save();
        ctx.globalAlpha = a * fv;
        ctx.strokeStyle = DIM;
        ctx.lineWidth = Math.max(1, H * 0.0025);
        ctx.beginPath();
        ctx.moveTo(W / 2 - W * 0.035, sy + H * 0.022);
        ctx.lineTo(W / 2 + W * 0.035, sy + H * 0.022);
        ctx.stroke();
        label(ctx, MADISON.who, W / 2, sy + H * 0.072, H * 0.030, FG, "700", "center");
        label(ctx, MADISON.where, W / 2, sy + H * 0.114, H * 0.026, MUTED, "500", "center");
        ctx.restore();
      }

      if (cv2 > 0) {
        ctx.save();
        ctx.globalAlpha = a * cv2;
        label(ctx, "an informed citizen is the condition of one", W / 2, sy + H * 0.214,
              H * 0.034, YELLOW, "700", "center");
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    if (stage === "shared") {
      // Four people holding four different cards, and then one card. The
      // figures are the flat glyph, not the rig, for the reason given above
      // the glyph.
      var sp = at(scene, "splitAt", t, 0.6);
      var sm = at(scene, "sameAt", t, 0.9);
      if (sp <= 0) { ctx.restore(); return; }
      var groundY = H * 0.70, gh = H * 0.20;
      for (var i = 0; i < 4; i++) {
        var gx2 = W * (0.22 + i * 0.17);
        glyph(ctx, gx2, groundY, gh, sm > 0.5 ? YELLOW : MUTED, a * sp);
        ctx.save();
        ctx.globalAlpha = a * sp;
        // The card is held, which means it overlaps the arm at chest height.
        // Floated above the head it reads as a hat, which is what the first
        // version of this drew.
        var cwd = W * 0.085, chg = H * 0.055;
        var cx2 = gx2 + gh * 0.10, cy2 = groundY - gh * 0.74;
        ctx.fillStyle = sm > 0.5 ? YELLOW : CARD;
        roundRect(ctx, cx2, cy2, cwd, chg, H * 0.008); ctx.fill();
        ctx.strokeStyle = sm > 0.5 ? YELLOW : EDGE;
        ctx.lineWidth = Math.max(1, H * 0.0025); ctx.stroke();
        // Four different facts, then the same one. The glyph on the card is a
        // mark, not type: at this size type is a smudge.
        ctx.fillStyle = sm > 0.5 ? ONBRIGHT : DIM;
        var marks = sm > 0.5 ? 2 : (i % 3) + 1;
        for (var m = 0; m < marks; m++) {
          ctx.fillRect(cx2 + cwd * 0.14, cy2 + chg * (0.26 + m * 0.24),
                       cwd * 0.72, H * 0.006);
        }
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = a * sp * 0.9;
      label(ctx, sm > 0.5 ? "the same set of facts" : "different facts, the same argument",
            W / 2, H * 0.84, H * 0.032, sm > 0.5 ? YELLOW : MUTED,
            sm > 0.5 ? "700" : "600", "center");
      ctx.restore();
      ctx.restore();
      return;
    }

    if (stage === "gap") {
      // A shelf of general quizzes, and the empty place beside them. The gap
      // is drawn as an absence rather than as a complaint.
      var shv = at(scene, "shelfAt", t, 0.6);
      var gpv = at(scene, "gapAt", t, 0.7);
      // Five boxes across, the fifth one empty. They have to be sized for
      // five: at the width the four alone wanted, the gap ran off the frame.
      var bw = W * 0.155, bh = H * 0.15, gap = W * 0.018;
      var x0 = (W - (bw * 5 + gap * 4)) / 2;
      for (var k = 0; k < GENERAL.length; k++) {
        if (shv <= 0) break;
        ctx.save();
        ctx.globalAlpha = a * shv * (gpv > 0.4 ? 0.45 : 1);
        var bx = x0 + k * (bw + gap), byy = H * 0.34;
        panel(ctx, bx, byy, bw, bh, H, 1, EDGE);
        ctx.fillStyle = MUTED;
        ctx.font = "600 " + Math.round(H * 0.026) + "px " + FONT;
        ctx.textAlign = "left";
        wrap(ctx, GENERAL[k], bx + bw * 0.08, byy + bh * 0.36, bw * 0.84, H * 0.032);
        ctx.restore();
      }
      if (gpv > 0) {
        ctx.save();
        ctx.globalAlpha = a * gpv;
        var ex = x0 + 4 * (bw + gap), ey = H * 0.34;
        ctx.strokeStyle = YELLOW;
        ctx.setLineDash([H * 0.012, H * 0.010]);
        ctx.lineWidth = Math.max(2, H * 0.004);
        roundRect(ctx, ex, ey, bw, bh, H * 0.014);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = YELLOW;
        ctx.font = "700 " + Math.round(H * 0.026) + "px " + FONT;
        ctx.textAlign = "left";
        wrap(ctx, "Who runs your city", ex + bw * 0.08, ey + bh * 0.36, bw * 0.84, H * 0.032);
        label(ctx, "nobody makes this one", ex + bw / 2, ey + bh + H * 0.055,
              H * 0.026, MUTED, "600", "center");
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    if (stage === "expire") {
      // A question with an end date, retiring, and its replacement arriving.
      // No date is printed: a drawn date is a figure that goes stale, which
      // is the fault this very chapter is about.
      var cdv = at(scene, "cardAt", t, 0.6);
      var qv2 = at(scene, "qAt", t, 0.5);
      var exv = at(scene, "expireAt", t, 0.8);
      var nwv = at(scene, "newAt", t, 0.8);
      var nsv = at(scene, "newsAt", t, 0.6);
      var cw2 = W * 0.34, ch2 = H * 0.17, cx3 = W * 0.14;
      if (cdv > 0) {
        ctx.save();
        ctx.globalAlpha = a * cdv * (1 - exv * 0.72);
        var cy3 = H * 0.30 + exv * H * 0.14;
        panel(ctx, cx3, cy3, cw2, ch2, H, 1, exv > 0.4 ? DIM : EDGE);
        if (qv2 > 0) {
          label(ctx, "Who is your mayor?", cx3 + cw2 * 0.07, cy3 + ch2 * 0.42,
                H * 0.034, exv > 0.4 ? MUTED : FG, "700");
        }
        label(ctx, exv > 0.4 ? "expired" : "has an end date",
              cx3 + cw2 * 0.07, cy3 + ch2 * 0.76,
              H * 0.026, exv > 0.4 ? BAD : MUTED, "600");
        ctx.restore();
      }
      if (nwv > 0) {
        ctx.save();
        ctx.globalAlpha = a * nwv;
        var nx = cx3 + cw2 + W * 0.06, ny2 = H * 0.30;
        panel(ctx, nx, ny2, cw2, ch2, H, 1, YELLOW);
        label(ctx, "Who is your mayor?", nx + cw2 * 0.07, ny2 + ch2 * 0.42,
              H * 0.034, FG, "700");
        label(ctx, "written again, with the answer that is true now",
              nx + cw2 * 0.07, ny2 + ch2 * 0.76, H * 0.024, YELLOW, "600");
        ctx.restore();
      }
      if (nsv > 0) {
        ctx.save();
        ctx.globalAlpha = a * nsv;
        label(ctx, "and the news collections are written nightly", W / 2, H * 0.72,
              H * 0.032, MUTED, "600", "center");
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    ctx.restore();
  }

  // ── The live screen ────────────────────────────────────────────────────
  // A tall capture is not shrunk to fit a box; it is clipped into one and
  // scrolled, off `panFrom` (fractions of the travel) and `panRate` (fractions
  // per second), so the picture is never told how long its line is.
  //
  // Until grab-screen.mjs has run there is no capture, and this degrades to
  // the frame and the host name rather than to an empty stage.
  function drawLiveScreen(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var host = scene.host || "ctc.empowered.vote";
    var boxW = W * 0.62, x = (W - boxW) / 2, y = H * 0.10, maxH = H * 0.70;
    var img = scene.shot === "play" ? play : shot;

    // The pan is a consequence of the picture's shape, not a setting. A
    // still taller than maxH/boxW has somewhere to travel and panRate moves
    // it; one that is flatter fills the width and `travel` is 0, so the same
    // code holds it still however the scene is cued. screen-play.js is cut
    // to exactly that ratio on purpose: it fills the identical box the home
    // page fills, so the cut between the two scenes does not resize the frame.
    if (img.naturalWidth) {
      var full = boxW * (img.naturalHeight / img.naturalWidth);
      var boxH = Math.min(full, maxH);
      var travel = full - boxH;
      var frac = Math.max(0, Math.min(1, (scene.panFrom || 0) + t * (scene.panRate || 0)));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.rect(x, y, boxW, boxH); ctx.clip();
      ctx.drawImage(img, x, y - travel * frac, boxW, full);
      ctx.restore();
      frameAndHost(ctx, x, y, boxW, boxH, H, W, a, host, scene);
      return;
    }

    ctx.save();
    ctx.globalAlpha = a * 0.6;
    ctx.fillStyle = CARD;
    roundRect(ctx, x, y, boxW, maxH, H * 0.014); ctx.fill();
    label(ctx, "screen capture pending", W / 2, y + maxH / 2, H * 0.030, DIM, "600", "center");
    ctx.restore();
    frameAndHost(ctx, x, y, boxW, maxH, H, W, a, host, scene);
  }
  function frameAndHost(ctx, x, y, boxW, boxH, H, W, a, host, scene) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = scene.accent || YELLOW;
    ctx.lineWidth = Math.max(2, H * 0.005);
    ctx.strokeRect(x, y, boxW, boxH);
    ctx.fillStyle = MUTED;
    ctx.textAlign = "center";
    ctx.font = "600 " + Math.round(H * 0.032) + "px " + FONT;
    ctx.fillText(host, W / 2, y + boxH + H * 0.055);
    ctx.restore();
  }

  window.EVArt = Object.assign(window.EVArt || {}, {
    drawDesk: drawDesk,
    drawTitleCard: drawTitleCard,
    drawQuestion: drawQuestion,
    drawLearn: drawLearn,
    drawCollections: drawCollections,
    drawCrowd: drawCrowd,
    drawWhy: drawWhy,
    drawLiveScreen: drawLiveScreen
  });
  window.EVArt.ready = Promise.all([logoA.ready, shotA.ready, playA.ready]);
})();
