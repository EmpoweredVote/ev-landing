// Episode 5 art — Read & Rank.
//
// Every function is a pure function of (ctx, t, W, H, scene). No module-level
// mutable state, or the determinism guarantee in tests/video/02-determinism.cjs
// is void for this episode. Everything is sized from W and H so the same code
// renders at 320x180 in the fixtures and at 1920x1080 in the episode, and the
// lower third is left clear because the cast draws on top.
//
// WHAT IS ON SCREEN IS REAL, AND NO CANDIDATE IS INVENTED.
//
// This episode has a problem the other four do not. Its subject is quotations
// from real people, and a drawn card has to carry words. Writing a plausible
// housing position for a nobody would be inventing a candidate's position in a
// film whose whole argument is that you should read what people actually said.
//
// So the mechanic — reading blind, agreeing, ranking, revealing — is shown on
// the 2024 Indiana Governor race that ships in `src/data/mockData.ts` as the
// offline fallback: three real candidates, their real answers on cannabis,
// their real named sources. Every quote below is a CONTIGUOUS substring of the
// shipped text, shortened only so that a card can hold it — the same thing the
// product does to build a blind excerpt, and never a reworded one.
//
// The shipped fixture carries a FOURTH identity for the same office. That
// person did not run for Governor of Indiana in 2024. The film uses the three
// who did, and the fixture should be corrected in read-rank.
//
// The viewer drawn here agrees with two of the three answers and leaves the
// third. The one left behind is the answer that says it is not ready yet,
// which is a choice about what the answer SAYS. Nothing in this file chooses
// by who said it, and no row of the reveal grid is empty — see the script.
//
// Chapter 1's card carries a name and a paragraph and NO PARTY MARK. The name
// is "A. Candidate", which is visibly not a person. A party badge drawn to
// complain about party badges is still a party badge on screen, and no episode
// in this series prints one.
//
// The four source kinds in chapter 7 are the four `SourceExplainer.tsx` names,
// in its order. The blindness guard in chapter 4 is `sanitizeRacePayload` in
// `src/data/api.ts`, and the dropped single-voice question beside it is that
// function's own `quotes.length >= 2` filter.
(function () {
  "use strict";
  var FG = "#F2F2F2", MUTED = "#9A9AA0", GRID = "#33333D", DIM = "#5A5A68";
  var CARD = "#1A1A20", EDGE = "#2C2C36";
  var FONT = '"Figtree", "Segoe UI", system-ui, sans-serif';
  var YELLOW = "#FFD426", GOOD = "#43D07E", BAD = "#FF6B52", LINK = "#5B8DEF";
  var ONBRIGHT = "#10131A";
  // The same purple the cast is drawn in, for the one box on screen that
  // stands for the person watching.
  var VIEWER = "#7C6B9E";

  // ── The race, as it ships ──────────────────────────────────────────────
  // MOCK_TOPICS[0].question and three of MOCK_QUOTES, each shortened to a
  // contiguous run of its own shipped text. Index 1 is the answer the viewer
  // leaves behind, because `drawBlind` fades the middle card.
  var RACE_Q = "Should Indiana legalize marijuana — medicinal, recreational, or both?";
  var ROLE = "2024 Indiana Governor";
  var RACE = [
    { by: "Jennifer McCormick", role: ROLE,
      text: "About 80% of residents support legalization. My plan calls for a conversation on medical use before adult use." },
    { by: "Mike Braun", role: ROLE,
      text: "I would have to think about adult use; on medicinal use we are probably ready. On both counts I am going to listen to law enforcement." },
    { by: "Donald Rainwater", role: ROLE,
      text: "We can make cannabis legal in all forms — medicinal and recreational — right now, and expunge all nonviolent cannabis-related offenses." }
  ];
  // Who the viewer agreed with, in the order they ranked them. Two agreed,
  // one left. A three-candidate race cannot also show an unranked remainder;
  // the script says so where it lists what this film does not draw.
  var AGREED = [0, 2];
  var LEFT = [1];

  // The three topics of this race, as MOCK_TOPICS titles them, shortened to a
  // column head. These are topic names, never positions.
  var TOPICS = ["Cannabis", "Education", "Abortion"];

  // What the drawn viewer did with each answer, by ballot row and topic.
  // 1 and 2 are the ranks they gave on the cannabis question; "y" is an
  // agreement they did not rank; "n" is an answer they left behind.
  var VERDICTS = [
    [1, "n", "y"],   // McCormick — agreed twice, ranked first
    [2, "n", "n"],   // Rainwater — agreed once, ranked second
    ["n", "y", "n"]  // Braun     — agreed once, on a different question
  ];

  // The source line under the revealed answer, which is q-101's own. That
  // quote is the one the fixture carries a full `verbatimText` and an editor's
  // note for, so it is the one the excerpt chapter opens.
  var SOURCE = { name: "WISH-TV Governor's Debate", date: "Aug 28, 2024" };

  // Offices, not races. A named real race would be a coverage claim, and
  // coverage is chapter 8's job to state carefully.
  var OFFICES = [
    { name: "Mayor", sub: "city" },
    { name: "City Council, District 4", sub: "city" },
    { name: "Governor", sub: "state" }
  ];

  // SourceExplainer.tsx, its four kinds, in its order.
  var KINDS = [
    "Official candidate statements",
    "Verbatim debate transcripts",
    "Video-clipped debate excerpts",
    "Verified news reporting"
  ];

  // ── Helpers ────────────────────────────────────────────────────────────
  function load(uri) {
    var img = new Image();
    var ready = new Promise(function (res) {
      if (!uri) return res();
      img.onload = res; img.onerror = res;
    });
    if (uri) img.src = uri;
    return { img: img, ready: ready };
  }
  var logoA = load(window.EVReadRankLogo);
  var shotA = load(window.EVReadRankShot);
  var logo = logoA.img, shot = shotA.img;

  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function fade(t, t0, dur) { return ease((t - t0) / dur); }
  function arrive(scene, t, t0, dur) { return scene.continues ? 1 : fade(t, t0, dur); }
  function since(t, t0, dur) { return t0 > 0 ? fade(t, t0, dur) : 1; }
  // Three states, not two: undefined is "not in this scene", 0 is "already on
  // screen", a positive number is "arrives then".
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
  function wrap(ctx, s, x, y, maxW, lineH, maxLines) {
    var lines = wrapLines(ctx, s, maxW);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] += "…";
    }
    for (var i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + i * lineH);
    return lines.length;
  }
  // The empty place where a name, a photograph or a party would be. Drawn as
  // an absence rather than as a crossed-out thing: a struck-through party
  // badge is still a party badge.
  function emptySlot(ctx, x, y, w, h, H, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = DIM;
    ctx.setLineDash([H * 0.008, H * 0.008]);
    ctx.lineWidth = Math.max(1, H * 0.0025);
    roundRect(ctx, x, y, w, h, H * 0.008);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ── Chapter 1: the name reads it first ─────────────────────────────────
  // ── Chapter 1: the blind tasting ───────────────────────────────────────
  // Two cups with nothing written on them, and the names put back only after
  // the choice. NOTHING HERE IS A BRAND. The tags read "the one you always
  // buy" and "the other one", because the chapter is about the order the
  // reading happens in and not about a drink. The cup that wins is the one
  // the taster did not expect, which is the whole reason the test is run
  // with the labels off.
  function drawTaste(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;

    var tableY = H * 0.64;
    var cw = W * 0.125, chh = H * 0.23;
    var cx = [W * 0.31, W * 0.55];
    var tags = ["the one you always buy", "the other one"];
    var picked = 1;                       // the cup the taster did not expect

    ctx.save();
    ctx.globalAlpha = a;

    // The table. One rule, wide enough to hold both cups and no wider.
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = Math.max(2, H * 0.005);
    ctx.beginPath();
    ctx.moveTo(W * 0.19, tableY);
    ctx.lineTo(W * 0.67, tableY);
    ctx.stroke();

    var pick = at(scene, "pickAt", t, 0.5);
    var lab = at(scene, "labelAt", t, 0.6);

    for (var i = 0; i < 2; i++) {
      var cv = atIndex(scene.cupAt, i, t, 0.45);
      if (cv <= 0) continue;
      var x = cx[i], top = tableY - chh;
      var chosen = i === picked && pick > 0;
      ctx.save();
      ctx.globalAlpha = a * cv;

      // The cup: a plain tapered beaker, nothing printed on it. The outline
      // is DIM and not EDGE — an EDGE outline on this background is a hole in
      // the frame rather than a cup.
      var halfAt = function (y) {
        var k = (y - top) / chh;
        return cw * (0.50 - 0.14 * k);
      };
      ctx.beginPath();
      ctx.moveTo(x - halfAt(top), top);
      ctx.lineTo(x + halfAt(top), top);
      ctx.lineTo(x + halfAt(tableY), tableY);
      ctx.lineTo(x - halfAt(tableY), tableY);
      ctx.closePath();
      ctx.fillStyle = CARD;
      ctx.fill();

      // What is in it, and the two cups hold exactly the same thing to look
      // at. A difference drawn here would be a clue, and a clue is a label.
      var liqY = top + chh * 0.34;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x - halfAt(liqY), liqY);
      ctx.lineTo(x + halfAt(liqY), liqY);
      ctx.lineTo(x + halfAt(tableY), tableY);
      ctx.lineTo(x - halfAt(tableY), tableY);
      ctx.closePath();
      ctx.fillStyle = GRID;
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(x - halfAt(top), top);
      ctx.lineTo(x + halfAt(top), top);
      ctx.lineTo(x + halfAt(tableY), tableY);
      ctx.lineTo(x - halfAt(tableY), tableY);
      ctx.closePath();
      ctx.strokeStyle = chosen ? YELLOW : DIM;
      ctx.lineWidth = Math.max(2, H * 0.005);
      ctx.stroke();

      ctx.restore();

      // The name, under the table, and only at `labelAt`. The cup that was
      // chosen carries its name in the accent; the other one is muted.
      if (lab > 0) {
        ctx.save();
        ctx.globalAlpha = a * cv * lab;
        label(ctx, tags[i], x, tableY + H * 0.070, H * 0.028,
              chosen ? YELLOW : MUTED, chosen ? "700" : "600", "center");
        ctx.restore();
      }
    }

    // The tick over the cup that won, before either name is known.
    if (pick > 0) {
      ctx.save();
      ctx.globalAlpha = a * pick;
      var tx = cx[picked], ty = tableY - chh - H * 0.075;
      ctx.strokeStyle = YELLOW;
      ctx.lineWidth = Math.max(3, H * 0.008);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tx - W * 0.016, ty);
      ctx.lineTo(tx - W * 0.004, ty + H * 0.022);
      ctx.lineTo(tx + W * 0.018, ty - H * 0.020);
      ctx.stroke();
      ctx.restore();
    }

    // "no labels", over the pair, while there is nothing else to read.
    var pv = at(scene, "plainAt", t, 0.6);
    if (pv > 0 && lab <= 0) {
      ctx.save();
      ctx.globalAlpha = a * pv;
      label(ctx, "no labels", (cx[0] + cx[1]) / 2, H * 0.32,
            H * 0.044, MUTED, "600", "center");
      ctx.restore();
    }

    ctx.restore();
  }

  function drawNameCard(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var b = { x: W * 0.10, y: H * 0.16, w: W * 0.48, h: H * 0.46 };

    ctx.save();
    ctx.globalAlpha = a;
    panel(ctx, b.x, b.y, b.w, b.h, H, 1, EDGE);

    var lift = at(scene, "liftAt", t, 0.8);
    var first = at(scene, "firstAt", t, 0.4);
    var second = at(scene, "secondAt", t, 0.4);

    // The name. It lifts off the card at the end of the chapter, which is the
    // question the whole film asks.
    var nv = at(scene, "nameAt", t, 0.5);
    if (nv > 0) {
      ctx.save();
      ctx.globalAlpha = a * nv * (1 - lift);
      var ny = b.y + b.h * 0.18 - lift * H * 0.14;
      label(ctx, "A. Candidate", b.x + b.w * 0.07, ny, H * 0.044, FG, "700");
      label(ctx, "Housing", b.x + b.w * 0.07, ny + H * 0.042, H * 0.026, MUTED, "600");
      if (first > 0) {
        ctx.save();
        ctx.globalAlpha = a * nv * first * (1 - lift);
        ctx.strokeStyle = YELLOW;
        ctx.lineWidth = Math.max(2, H * 0.004);
        roundRect(ctx, b.x + b.w * 0.05, ny - H * 0.040, b.w * 0.52, H * 0.062, H * 0.010);
        ctx.stroke();
        label(ctx, "1", b.x + b.w * 0.60, ny, H * 0.034, YELLOW, "700");
        ctx.restore();
      }
      ctx.restore();
    }

    // The paragraph. It is faint until the reader reaches it, fainter still
    // while the name is doing the reading for them, and full once the name
    // has gone. Three states, read in that order:
    //   base   0.35, and 1.0 once `secondAt` or `liftAt` has passed
    //   lift   the name is gone, so the paragraph is all there is
    var para = 0.35 + 0.65 * Math.max(second, lift);
    ctx.save();
    ctx.globalAlpha = a * Math.max(0.18, Math.min(1, para));
    ctx.fillStyle = lift > 0.5 ? FG : MUTED;
    ctx.font = "500 " + Math.round(H * 0.026) + "px " + FONT;
    ctx.textAlign = "left";
    // Four paragraph rules, not sentences. There is no real quotation to put
    // here and there will not be an invented one.
    for (var i = 0; i < 5; i++) {
      // The block rises into the space the name left, so the card does not
      // end the chapter with a hole where the name used to be.
      ctx.fillRect(b.x + b.w * 0.07,
                   b.y + b.h * 0.42 + i * H * 0.042 - lift * H * 0.075,
                   b.w * (i === 4 ? 0.42 : 0.78), H * 0.012);
    }
    ctx.restore();

    if (second > 0 && lift <= 0) {
      ctx.save();
      ctx.globalAlpha = a * second;
      label(ctx, "2", b.x + b.w * 0.90, b.y + b.h * 0.455, H * 0.034, MUTED, "700", "right");
      ctx.restore();
    }

    if (lift > 0) {
      ctx.save();
      ctx.globalAlpha = a * lift;
      label(ctx, "what would you make of it now?", b.x + b.w + W * 0.05,
            b.y + b.h * 0.50, H * 0.032, YELLOW, "600");
      ctx.restore();
    }

    ctx.restore();
  }

  // ── Title card ─────────────────────────────────────────────────────────
  function drawTitleCard(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.45);
    if (a <= 0) return;
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
      label(ctx, scene.name || "Read & Rank", W / 2, midY,
            H * 0.080, scene.accent || YELLOW, "700", "center");
    }
    if (scene.sub) label(ctx, scene.sub, W / 2, H * 0.54, H * 0.044, MUTED, "600", "center");
    ctx.restore();
  }

  // ── A quote card ───────────────────────────────────────────────────────
  // One shape for the whole film: blind in chapters 2 to 5, named from
  // chapter 6 on. `named` is what the reveal turns on.
  function quoteCard(ctx, W, H, x, y, w, h, q, o) {
    o = o || {};
    panel(ctx, x, y, w, h, H, o.alpha == null ? 1 : o.alpha,
          o.accent || (o.kept ? YELLOW : EDGE));
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;

    var top = y + h * 0.16;
    if (o.named) {
      label(ctx, q.by, x + w * 0.07, top, H * 0.028, FG, "700");
      label(ctx, q.role, x + w * 0.07, top + H * 0.030, H * 0.020, MUTED, "500");
    } else if (o.slots) {
      // The three absences, each one its own empty place on the card. They
      // are spaced so that no two of them touch: at the first spacing the
      // name slot and the photograph slot met and read as one dashed box.
      var sa = o.alpha == null ? 1 : o.alpha;
      emptySlot(ctx, x + w * 0.07, top - H * 0.026, w * 0.28, H * 0.034, H, sa * (o.slots[0] || 0));
      emptySlot(ctx, x + w * 0.42, top - H * 0.026, H * 0.034, H * 0.034, H, sa * (o.slots[1] || 0));
      emptySlot(ctx, x + w * 0.56, top - H * 0.026, w * 0.18, H * 0.034, H, sa * (o.slots[2] || 0));
    }

    ctx.fillStyle = o.kept ? FG : "#D6D4CE";
    ctx.font = "500 " + Math.round(H * 0.024) + "px " + FONT;
    ctx.textAlign = "left";
    // How many lines this card can hold, measured, not assumed. A fixed four
    // put an ellipsis through the middle of a real quotation on the widest
    // card in the film — in an episode whose argument is that you should read
    // what somebody actually said.
    var lineH = H * 0.032;
    var ty = top + (o.named || o.slots ? H * 0.075 : H * 0.030);
    var room = Math.max(2, Math.floor(((y + h - H * 0.018) - ty) / lineH) + 1);
    wrap(ctx, q.text, x + w * 0.07, ty, w * 0.86, lineH, room);

    if (o.rank) {
      ctx.save();
      ctx.fillStyle = YELLOW;
      ctx.beginPath();
      ctx.arc(x + w * 0.94, y + h * 0.20, H * 0.022, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, String(o.rank), x + w * 0.94, y + h * 0.20 + H * 0.010,
            H * 0.026, ONBRIGHT, "700", "center");
      ctx.restore();
    }
    ctx.restore();
  }

  // ── Chapter 2: the question turned around ──────────────────────────────
  // The chapter that says why the product exists. It is an argument, not a
  // demonstration, so nothing here is a candidate's words: the first real
  // quote is held back for chapter 4, where the mechanic starts.
  //
  // No name on the match chip. "A. Candidate" is chapter 1's card and is
  // visibly not a person, which is the only name this film prints before the
  // reveal.
  function drawTurn(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var stage = scene.stage || "them";

    ctx.save();
    ctx.globalAlpha = a;

    if (stage === "ask") {
      // The two questions, printed. The old one goes grey as the new one
      // lands, because the whole chapter is that they are not the same
      // question.
      var oldV = at(scene, "oldAt", t, 0.5);
      var newV = at(scene, "newAt", t, 0.6);
      if (oldV > 0) {
        ctx.save();
        ctx.globalAlpha = a * oldV * (1 - newV * 0.55);
        label(ctx, "Which candidate do I fit?", W * 0.50, H * 0.36,
              H * 0.052, MUTED, "600", "center");
        ctx.restore();
      }
      if (newV > 0) {
        ctx.save();
        ctx.globalAlpha = a * newV;
        label(ctx, "How do these candidates fit me?", W * 0.50, H * 0.52,
              H * 0.058, YELLOW, "700", "center");
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    if (stage === "card") {
      // One card with the two things taken off it, and nothing on it but
      // what was said. The body is rules rather than a quotation: see above.
      var cx = W * 0.30, cy = H * 0.20, cw = W * 0.40, ch = H * 0.37;
      panel(ctx, cx, cy, cw, ch, H, 1, EDGE);
      var g0 = atIndex(scene.gapAt, 0, t, 0.3);
      var g1 = atIndex(scene.gapAt, 1, t, 0.3);
      emptySlot(ctx, cx + cw * 0.06, cy + H * 0.045, cw * 0.34, H * 0.042, H, a * g0);
      emptySlot(ctx, cx + cw * 0.46, cy + H * 0.045, cw * 0.20, H * 0.042, H, a * g1);
      if (g0 > 0) {
        ctx.save(); ctx.globalAlpha = a * g0 * 0.9;
        label(ctx, "no name", cx + cw * 0.06, cy - H * 0.012, H * 0.024, MUTED, "600");
        ctx.restore();
      }
      if (g1 > 0) {
        ctx.save(); ctx.globalAlpha = a * g1 * 0.9;
        label(ctx, "no team", cx + cw * 0.46, cy - H * 0.012, H * 0.024, MUTED, "600");
        ctx.restore();
      }
      var words = at(scene, "wordsAt", t, 0.6);
      if (words > 0) {
        ctx.save();
        ctx.globalAlpha = a * words;
        ctx.fillStyle = FG;
        for (var r = 0; r < 5; r++) {
          ctx.fillRect(cx + cw * 0.06, cy + H * 0.125 + r * H * 0.046,
                       cw * (r === 4 ? 0.44 : 0.88), H * 0.013);
        }
        ctx.restore();
      }
      var mine = at(scene, "mineAt", t, 0.5);
      if (mine > 0) {
        ctx.save();
        ctx.globalAlpha = a * mine;
        label(ctx, "and what you make of it", W * 0.50, cy + ch + H * 0.070,
              H * 0.032, YELLOW, "700", "center");
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    // Stages "them" and "you" are one picture with the arrow running the
    // other way. The three blocks at the top are candidates in the abstract —
    // this is what every other tool does, not what this one does.
    var row = at(scene, "rowAt", t, 0.5);
    var down = at(scene, "downAt", t, 0.6);
    var up = at(scene, "upAt", t, 0.7);
    var win = at(scene, "windowAt", t, 0.6);
    var team = at(scene, "teamAt", t, 0.5);

    var bw = W * 0.17, bh = H * 0.15, gap = W * 0.035;
    var x0 = (W - (bw * 3 + gap * 2)) / 2, by = H * 0.14;
    for (var i = 0; i < 3; i++) {
      if (row <= 0) break;
      ctx.save();
      ctx.globalAlpha = a * row;
      var bx = x0 + i * (bw + gap);
      panel(ctx, bx, by, bw, bh, H, 1, win > 0.4 ? YELLOW : EDGE);
      // A head and shoulders, flat: a candidate, with nothing said about them.
      ctx.fillStyle = win > 0.4 ? YELLOW : DIM;
      ctx.beginPath();
      ctx.arc(bx + bw / 2, by + bh * 0.36, H * 0.028, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx + bw / 2, by + bh * 0.96, H * 0.050, Math.PI, 0);
      ctx.fill();
      if (team > 0) {
        ctx.save();
        ctx.globalAlpha = a * row * team;
        emptySlot(ctx, bx + bw * 0.30, by + bh * 1.10, bw * 0.40, H * 0.030, H, 1);
        ctx.restore();
      }
      ctx.restore();
    }
    if (team > 0) {
      ctx.save();
      ctx.globalAlpha = a * team * 0.9;
      label(ctx, "whose team they are on", W / 2, by + bh + H * 0.072,
            H * 0.026, MUTED, "600", "center");
      ctx.restore();
    }

    // The viewer, drawn as the box the arrow points at or away from.
    var yw = W * 0.20, yh = H * 0.11, yx = (W - yw) / 2, yy = H * 0.62;
    ctx.save();
    ctx.globalAlpha = a * Math.max(down, up, 0.001);
    panel(ctx, yx, yy, yw, yh, H, 1, VIEWER);
    label(ctx, "you", yx + yw / 2, yy + yh * 0.64, H * 0.040, FG, "700", "center");
    ctx.restore();

    // One arrow, pointed by whichever beat is live. Down is the other tools:
    // candidates in, a verdict out. Up is this one.
    var dir = up > 0.4 ? -1 : 1;
    var av2 = Math.max(down, up);
    if (av2 > 0) {
      // The arrow starts well below the caption under the row. At the first
      // spacing its head landed on that caption and read as pointing at it.
      var ay0 = by + bh + H * 0.16, ay1 = yy - H * 0.03;
      var from = dir > 0 ? ay0 : ay1, to = dir > 0 ? ay1 : ay0;
      ctx.save();
      ctx.globalAlpha = a * av2;
      ctx.strokeStyle = dir > 0 ? DIM : YELLOW;
      ctx.lineWidth = Math.max(3, H * 0.007);
      ctx.beginPath();
      ctx.moveTo(W / 2, from);
      ctx.lineTo(W / 2, to);
      ctx.stroke();
      ctx.fillStyle = dir > 0 ? DIM : YELLOW;
      ctx.beginPath();
      ctx.moveTo(W / 2, to);
      ctx.lineTo(W / 2 - H * 0.018, to - dir * H * 0.030);
      ctx.lineTo(W / 2 + H * 0.018, to - dir * H * 0.030);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    var match = at(scene, "matchAt", t, 0.5);
    if (match > 0 && up <= 0.4) {
      ctx.save();
      ctx.globalAlpha = a * match;
      var mw = W * 0.26, mh = H * 0.10, mx = W / 2 + yw * 0.70, my = yy + H * 0.005;
      panel(ctx, mx, my, mw, mh, H, 1, EDGE);
      label(ctx, "A. Candidate", mx + mw * 0.07, my + mh * 0.44, H * 0.030, FG, "700");
      label(ctx, "87% match", mx + mw * 0.07, my + mh * 0.82, H * 0.026, MUTED, "600");
      ctx.restore();
    }
    if (win > 0) {
      ctx.save();
      ctx.globalAlpha = a * win;
      label(ctx, "read what they would do", W / 2, by - H * 0.035,
            H * 0.030, YELLOW, "700", "center");
      ctx.restore();
    }

    ctx.restore();
  }

  // ── Chapter 3: pick a race ─────────────────────────────────────────────
  function drawRaces(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;

    ctx.save();
    ctx.globalAlpha = a;

    var addr = at(scene, "addrAt", t, 0.5);
    if (addr > 0) {
      ctx.save();
      ctx.globalAlpha = a * addr;
      var aw = W * 0.44, ax = (W - aw) / 2, ay = H * 0.14;
      panel(ctx, ax, ay, aw, H * 0.075, H, 1, YELLOW);
      label(ctx, "your address", ax + aw * 0.04, ay + H * 0.048, H * 0.030, MUTED, "500");
      ctx.restore();
    }

    var filter = at(scene, "filterAt", t, 0.5);
    var all = at(scene, "allAt", t, 0.5);
    var rw = W * 0.40, rh = H * 0.12;
    for (var i = 0; i < OFFICES.length; i++) {
      var rv = atIndex(scene.raceAt, i, t, 0.45);
      if (scene.continues) rv = 1;
      if (rv <= 0) continue;
      // While the address filter is on, only the first one stays bright. "or
      // you can ignore that" brings the rest back.
      var faded = filter > 0.5 && all < 0.5 && i > 0 ? 0.25 : 1;
      var pick = at(scene, "pickAt", t, 0.5);
      ctx.save();
      ctx.globalAlpha = a * rv * faded;
      var x = (W - rw) / 2, y = H * 0.26 + i * (rh + H * 0.03);
      panel(ctx, x, y, rw, rh, H, 1, EDGE);
      label(ctx, OFFICES[i].name, x + rw * 0.05, y + rh * 0.45, H * 0.034, FG, "700");
      label(ctx, OFFICES[i].sub, x + rw * 0.05, y + rh * 0.78, H * 0.022, MUTED, "600");
      ctx.restore();

      // The chosen race opens into its questions, and one of them is picked
      // out: the question, not the candidate, is the unit.
      var ov = at(scene, "openAt", t, 0.6);
      if (i === 0 && ov > 0) {
        for (var q = 0; q < 4; q++) {
          ctx.save();
          ctx.globalAlpha = a * ov * (pick > 0.5 && q !== 1 ? 0.3 : 1);
          var qx = (W - rw) / 2 + rw + W * 0.04;
          var qy = H * 0.26 + q * (H * 0.075);
          panel(ctx, qx, qy, W * 0.20, H * 0.058, H,
                1, pick > 0.5 && q === 1 ? YELLOW : EDGE);
          label(ctx, "question " + (q + 1), qx + W * 0.02, qy + H * 0.038,
                H * 0.024, pick > 0.5 && q === 1 ? YELLOW : MUTED, "600");
          ctx.restore();
        }
      }
    }

    ctx.restore();
  }

  // ── Chapter 4: reading blind ───────────────────────────────────────────
  function drawBlind(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var stage = scene.stage || "card";

    ctx.save();
    ctx.globalAlpha = a;

    if (stage === "guard") {
      // What the server sent, what the page keeps, and the rebuild between
      // them. The point of the picture is that the dropped fields never reach
      // the right-hand side, so the sieve is drawn as a wall and not a filter
      // the eye can see through.
      var iv = at(scene, "inAt", t, 0.5);
      var sv = at(scene, "sieveAt", t, 0.5);
      var ov = at(scene, "outAt", t, 0.5);
      var fields = ["text", "candidateToken", "name", "photo", "party", "sourceName"];
      var keep = [true, true, false, false, false, false];
      for (var f = 0; f < fields.length; f++) {
        if (iv <= 0) break;
        ctx.save();
        ctx.globalAlpha = a * iv;
        var fy = H * 0.24 + f * H * 0.075;
        panel(ctx, W * 0.10, fy, W * 0.20, H * 0.056, H, 1, EDGE);
        label(ctx, fields[f], W * 0.12, fy + H * 0.037, H * 0.024,
              keep[f] ? FG : MUTED, "600");
        ctx.restore();
      }
      if (sv > 0) {
        ctx.save();
        ctx.globalAlpha = a * sv;
        ctx.fillStyle = YELLOW;
        ctx.fillRect(W * 0.40, H * 0.20, Math.max(3, H * 0.008), H * 0.50);
        label(ctx, "rebuilt", W * 0.405, H * 0.18, H * 0.024, YELLOW, "700");
        ctx.restore();
      }
      if (ov > 0) {
        var kept = 0;
        for (var g = 0; g < fields.length; g++) {
          if (!keep[g]) continue;
          ctx.save();
          ctx.globalAlpha = a * ov;
          var ky = H * 0.30 + kept * H * 0.085;
          panel(ctx, W * 0.52, ky, W * 0.22, H * 0.060, H, 1, YELLOW);
          label(ctx, fields[g], W * 0.545, ky + H * 0.040, H * 0.024, FG, "700");
          ctx.restore();
          kept++;
        }
        ctx.save();
        ctx.globalAlpha = a * ov * 0.8;
        label(ctx, "everything else never arrives", W * 0.52, H * 0.60,
              H * 0.024, MUTED, "500");
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    if (stage === "one") {
      // A question with one answer on it, lifted out and dropped.
      var lv = at(scene, "loneAt", t, 0.5);
      var dv = at(scene, "dropAt", t, 0.8);
      if (lv > 0) {
        ctx.save();
        ctx.globalAlpha = a * lv * (1 - dv * 0.85);
        var lx = W * 0.34, ly = H * 0.26 + dv * H * 0.30;
        ctx.translate(0, 0);
        label(ctx, "one answer, nobody to compare it with", W / 2, H * 0.20,
              H * 0.028, MUTED, "600", "center");
        quoteCard(ctx, W, H, lx, ly, W * 0.32, H * 0.22, RACE[0],
                  { alpha: a * lv * (1 - dv * 0.85), slots: [1, 1, 1] });
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    // The question, and the answers under it with nothing on them.
    label(ctx, RACE_Q, W / 2, H * 0.17, H * 0.038, FG, "700", "center");
    var slots = [atIndex(scene.gapAt, 0, t, 0.35),
                 atIndex(scene.gapAt, 1, t, 0.35),
                 atIndex(scene.gapAt, 2, t, 0.35)];
    var leave = at(scene, "leaveAt", t, 0.7);
    // Tall enough to hold the longest of the three answers whole, with the
    // three empty slots above it. These are real quotations: a card that
    // ellipses one has broken the only promise this episode makes.
    var cw = W * 0.26, ch = H * 0.30;
    for (var i = 0; i < 3; i++) {
      var qv = atIndex(scene.quoteAt, i, t, 0.45);
      if (scene.continues && scene.quoteAt == null) qv = 1;
      if (qv <= 0) continue;
      var x = W * 0.12 + i * (cw + W * 0.035), y = H * 0.22;
      var gone = leave > 0 && i === 1 ? leave : 0;
      quoteCard(ctx, W, H, x, y + gone * H * 0.10, cw, ch, RACE[i],
                { alpha: a * qv * (1 - gone * 0.75), slots: slots });
    }
    if (slots[0] > 0) {
      // One line under the whole row, not one caption under each card. Spread
      // across the three cards they read as one absence per candidate, which
      // is not what they say: every card is missing all three.
      var names = ["no name", "no photograph", "no party"];
      var sep = "   ·   ";
      ctx.save();
      ctx.font = "600 " + Math.round(H * 0.026) + "px " + FONT;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      var widths = [ctx.measureText(names[0]).width,
                    ctx.measureText(names[1]).width,
                    ctx.measureText(names[2]).width];
      var sepW = ctx.measureText(sep).width;
      var totalW = widths[0] + widths[1] + widths[2] + sepW * 2;
      var cxs = (W - totalW) / 2, cys = H * 0.58;
      for (var s2 = 0; s2 < 3; s2++) {
        if (slots[s2] > 0) {
          ctx.save();
          ctx.globalAlpha = a * slots[s2] * 0.85;
          ctx.fillStyle = MUTED;
          ctx.fillText(names[s2], cxs, cys);
          ctx.restore();
        }
        cxs += widths[s2];
        if (s2 < 2 && slots[s2 + 1] > 0) {
          ctx.save();
          ctx.globalAlpha = a * slots[s2 + 1] * 0.5;
          ctx.fillStyle = DIM;
          ctx.fillText(sep, cxs, cys);
          ctx.restore();
        }
        cxs += sepW;
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // ── Chapter 5: ranking ─────────────────────────────────────────────────
  function drawRank(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;

    ctx.save();
    ctx.globalAlpha = a;

    var pile = at(scene, "pileAt", t, 0.6);
    var order = at(scene, "orderAt", t, 0.7);
    var tie = at(scene, "tieAt", t, 0.6);
    var rcv = at(scene, "rcvAt", t, 0.5);
    if (pile <= 0) { ctx.restore(); return; }

    // Two cards, because the viewer agreed with two of the three answers.
    // There is no unranked remainder under them: a three-candidate race
    // cannot show one at the same time as a left-behind answer, and the
    // script says so rather than the picture pretending otherwise.
    var cw = W * 0.36, ch = H * 0.17, top = H * 0.26;
    for (var i = 0; i < AGREED.length; i++) {
      var q = RACE[AGREED[i]];
      // Stacked while it is a pile; spread into an order afterwards.
      var x = W * 0.32 + (1 - order) * i * W * 0.012;
      var y = top + order * i * (ch + H * 0.045) + (1 - order) * i * H * 0.014;
      // Tied, both of them first. `tieWithPrev` in the app gives the second
      // card the same number as the one above it, which is what is drawn.
      var rank = order > 0.5 ? (tie > 0.5 ? 1 : i + 1) : 0;
      quoteCard(ctx, W, H, x, y, cw, ch, q, { alpha: a * pile, kept: true, rank: rank });
    }

    if (tie > 0) {
      ctx.save();
      ctx.globalAlpha = a * tie;
      // A bracket down the left of the two cards, and the word beside it.
      var y0 = top + H * 0.030, y1 = top + (ch + H * 0.045) + ch - H * 0.030;
      ctx.strokeStyle = YELLOW;
      ctx.lineWidth = Math.max(2, H * 0.005);
      ctx.beginPath();
      ctx.moveTo(W * 0.300, y0);
      ctx.lineTo(W * 0.288, y0);
      ctx.lineTo(W * 0.288, y1);
      ctx.lineTo(W * 0.300, y1);
      ctx.stroke();
      label(ctx, "tied", W * 0.278, (y0 + y1) / 2 + H * 0.010,
            H * 0.028, YELLOW, "700", "right");
      ctx.restore();
    }

    if (rcv > 0) {
      ctx.save();
      ctx.globalAlpha = a * rcv;
      label(ctx, "this is ranked choice voting", W / 2, H * 0.90,
            H * 0.034, YELLOW, "700", "center");
      ctx.restore();
    }

    ctx.restore();
  }

  // ── Chapter 6: the reveal ──────────────────────────────────────────────
  function drawReveal(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;

    ctx.save();
    ctx.globalAlpha = a;

    var nv = at(scene, "nameAt", t, 0.7);
    var sort = at(scene, "sortAt", t, 0.8);
    var grid = at(scene, "gridAt", t, 0.6);
    var col = at(scene, "colAt", t, 0.5);
    var mark = at(scene, "markAt", t, 0.6);
    var rest = at(scene, "restAt", t, 0.6);

    if (grid <= 0) {
      // The ranked cards, with their names arriving on them. Two of them, so
      // they are centred rather than run from the left edge, and tall enough
      // to hold the longer answer whole under its name.
      var cw = W * 0.26, ch = H * 0.32, gapR = W * 0.035;
      var x0R = (W - (AGREED.length * cw + (AGREED.length - 1) * gapR)) / 2;
      for (var i = 0; i < AGREED.length; i++) {
        var x = x0R + i * (cw + gapR);
        var y = H * 0.22 - sort * (i === 0 ? 0 : H * 0.02);
        quoteCard(ctx, W, H, x, y, cw, ch, RACE[AGREED[i]],
                  { alpha: a, kept: true, named: nv > 0.3, rank: sort > 0.4 ? i + 1 : 0 });
      }
      if (sort > 0) {
        ctx.save();
        ctx.globalAlpha = a * sort;
        label(ctx, "your ballot", W / 2, H * 0.17, H * 0.034, YELLOW, "700", "center");
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    // The grid: everyone who is running down the side, every question across
    // the top. The rows are in ballot order and the marks are VERDICTS, which
    // is the drawn viewer's reading and nobody else's. The caption under the
    // grid says so, and it is the reason no row here is a row of crosses: a
    // still frame of one would read as this organisation's verdict on a real
    // person.
    var rows = [RACE[AGREED[0]], RACE[AGREED[1]], RACE[LEFT[0]]];
    var shown = rest > 0.5 ? 3 : 2;
    var gx = W * 0.20, gy = H * 0.30, cellW = W * 0.13, rowH = H * 0.095;
    var markX = gx + W * 0.26;

    for (var c = 0; c < TOPICS.length; c++) {
      if (col <= 0) break;
      ctx.save();
      ctx.globalAlpha = a * col;
      label(ctx, TOPICS[c], markX + c * cellW + cellW / 2, gy - H * 0.022,
            H * 0.026, MUTED, "700", "center");
      ctx.restore();
    }

    for (var r = 0; r < shown; r++) {
      var last = r === 2;
      ctx.save();
      ctx.globalAlpha = a * grid * (last ? rest : 1);
      label(ctx, rows[r].by, gx, gy + r * rowH + rowH * 0.6, H * 0.030, FG, "700");
      ctx.restore();
      for (var c2 = 0; c2 < TOPICS.length; c2++) {
        var mv = mark * (last ? rest : 1);
        if (mv <= 0) continue;
        ctx.save();
        ctx.globalAlpha = a * mv;
        var mx = markX + c2 * cellW + cellW / 2;
        var my = gy + r * rowH + rowH * 0.55;
        // A rank number where the viewer ranked that answer, a check where
        // they agreed without ranking it, a cross where they left it behind.
        var v = VERDICTS[r][c2];
        if (v === "y") {
          label(ctx, "✓", mx, my, H * 0.032, GOOD, "700", "center");
        } else if (v === "n") {
          label(ctx, "✕", mx, my, H * 0.030, BAD, "700", "center");
        } else {
          ctx.fillStyle = YELLOW;
          ctx.beginPath(); ctx.arc(mx, my - H * 0.009, H * 0.020, 0, Math.PI * 2); ctx.fill();
          label(ctx, String(v), mx, my, H * 0.024, ONBRIGHT, "700", "center");
        }
        ctx.restore();
      }
    }

    if (mark > 0) {
      ctx.save();
      ctx.globalAlpha = a * mark * 0.8;
      // Under the rows that are actually showing, not under the three the
      // grid will eventually hold: a caption left floating in space reads as
      // a separate statement instead of a label on the grid.
      label(ctx, "these verdicts are yours, not ours", gx,
            gy + shown * rowH + H * 0.080, H * 0.024, MUTED, "600");
      ctx.restore();
    }

    if (rest > 0) {
      ctx.save();
      ctx.globalAlpha = a * rest * 0.85;
      label(ctx, "still on your ballot", gx, gy + 3 * rowH + H * 0.035,
            H * 0.024, YELLOW, "700");
      ctx.restore();
    }

    ctx.restore();
  }

  // ── Chapter 7: where the words come from ───────────────────────────────
  function drawSource(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;

    ctx.save();
    ctx.globalAlpha = a;

    var ask = at(scene, "askAt", t, 0.5);
    var full = at(scene, "fullAt", t, 0.6);
    var mark = at(scene, "markAt", t, 0.6);
    var line = at(scene, "lineAt", t, 0.5);

    // The excerpt card, top left, named: this is after the reveal. It is
    // RACE[2] rather than the top of the ballot, because q-101 is the quote
    // the fixture carries a full `verbatimText` and an editor's note for. A
    // chapter about showing the cut opens the quote that has one.
    quoteCard(ctx, W, H, W * 0.10, H * 0.22, W * 0.32, H * 0.24, RACE[2],
              { alpha: a, kept: true, named: true });

    if (ask > 0) {
      ctx.save();
      ctx.globalAlpha = a * ask;
      label(ctx, "where did this come from?", W * 0.10, H * 0.17,
            H * 0.030, YELLOW, "700");
      ctx.restore();
    }

    // The four kinds occupy the right half, and so does the full original.
    // They hand over: the list goes as the quote opens, or the top of the
    // list shows through the panel that covers it.
    for (var k = 0; k < KINDS.length; k++) {
      var kv = atIndex(scene.kindAt, k, t, 0.4) * (1 - full);
      if (kv <= 0) continue;
      ctx.save();
      ctx.globalAlpha = a * kv;
      var ky = H * 0.24 + k * H * 0.085;
      ctx.fillStyle = YELLOW;
      ctx.fillRect(W * 0.50, ky - H * 0.018, Math.max(2, H * 0.004), H * 0.028);
      label(ctx, KINDS[k], W * 0.525, ky, H * 0.030, FG, "600");
      ctx.restore();
    }

    if (full > 0) {
      // The whole original, with the excerpt highlighted inside it. The
      // excerpt is a contiguous substring of the full quote — `verbatimText`
      // in data/api.ts — so the highlight is one run, never two.
      ctx.save();
      ctx.globalAlpha = a * full;
      var fx = W * 0.50, fy = H * 0.22, fw = W * 0.40, fh = H * 0.34;
      panel(ctx, fx, fy, fw, fh, H, 1, EDGE);
      label(ctx, "the full original", fx + fw * 0.05, fy + H * 0.045,
            H * 0.024, MUTED, "700");
      ctx.fillStyle = MUTED;
      for (var i = 0; i < 6; i++) {
        var hot = mark > 0.4 && i >= 2 && i <= 3;
        ctx.save();
        ctx.globalAlpha = a * full * (hot ? mark : 0.55);
        ctx.fillStyle = hot ? YELLOW : MUTED;
        ctx.fillRect(fx + fw * 0.05, fy + H * 0.085 + i * H * 0.040,
                     fw * (i === 5 ? 0.46 : 0.90), H * 0.014);
        ctx.restore();
      }
      if (mark > 0.4) {
        ctx.save();
        ctx.globalAlpha = a * full * mark;
        label(ctx, "what you read", fx + fw * 0.05, fy + fh * 0.94,
              H * 0.022, YELLOW, "700");
        ctx.restore();
      }
      ctx.restore();
    }

    if (line > 0) {
      ctx.save();
      ctx.globalAlpha = a * line;
      label(ctx, SOURCE.name + "  ·  " + SOURCE.date, W * 0.10, H * 0.52, H * 0.024, FG, "600");
      label(ctx, "open the original", W * 0.10, H * 0.56, H * 0.022, LINK, "500");
      ctx.restore();
    }

    ctx.restore();
  }

  // ── Chapter 8: what exists today ───────────────────────────────────────
  function drawCoverage(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;

    ctx.save();
    ctx.globalAlpha = a;

    var read = at(scene, "readAt", t, 0.7);
    var mat = at(scene, "matAt", t, 0.7);
    var pair = at(scene, "pairAt", t, 0.6);
    var cut = at(scene, "cutAt", t, 0.7);

    if (pair > 0) {
      // A long race beside a short one. The short one loses a question before
      // the viewer ever sees it, which is why it is short.
      var bw = W * 0.26, bh = H * 0.070;
      for (var i = 0; i < 5; i++) {
        ctx.save();
        ctx.globalAlpha = a * pair;
        panel(ctx, W * 0.14, H * 0.26 + i * (bh + H * 0.018), bw, bh, H, 1, EDGE);
        label(ctx, "question " + (i + 1), W * 0.16, H * 0.26 + i * (bh + H * 0.018) + bh * 0.62,
              H * 0.024, MUTED, "600");
        ctx.restore();
      }
      for (var j = 0; j < 3; j++) {
        var dropped = j === 2 && cut > 0;
        ctx.save();
        ctx.globalAlpha = a * pair * (dropped ? 1 - cut * 0.85 : 1);
        panel(ctx, W * 0.56, H * 0.26 + j * (bh + H * 0.018) + (dropped ? cut * H * 0.06 : 0),
              bw, bh, H, 1, dropped ? BAD : EDGE);
        label(ctx, dropped ? "one voice only" : "question " + (j + 1),
              W * 0.58, H * 0.26 + j * (bh + H * 0.018) + bh * 0.62 + (dropped ? cut * H * 0.06 : 0),
              H * 0.024, dropped ? BAD : MUTED, "600");
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = a * pair * 0.85;
      label(ctx, "a race with answers", W * 0.14 + bw / 2, H * 0.22, H * 0.026, MUTED, "700", "center");
      label(ctx, "a race without them", W * 0.56 + bw / 2, H * 0.22, H * 0.026, MUTED, "700", "center");
      ctx.restore();
      ctx.restore();
      return;
    }

    // The map. The reading works everywhere; the material does not exist
    // everywhere, and the two layers are drawn as two layers.
    var cx = W * 0.50, cy = H * 0.44, rw = W * 0.34, rh = H * 0.36;
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(2, H * 0.004);
    roundRect(ctx, cx - rw / 2, cy - rh / 2, rw, rh, H * 0.03); ctx.stroke();

    if (read > 0) {
      ctx.save();
      ctx.globalAlpha = a * read * 0.30;
      ctx.fillStyle = YELLOW;
      roundRect(ctx, cx - rw / 2, cy - rh / 2, rw, rh, H * 0.03); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = a * read;
      label(ctx, "the reading works here", cx, cy - rh / 2 - H * 0.030,
            H * 0.026, MUTED, "600", "center");
      ctx.restore();
    }
    if (mat > 0) {
      var spots = [[0.28, 0.32], [0.62, 0.46], [0.46, 0.74]];
      for (var s = 0; s < spots.length; s++) {
        ctx.save();
        ctx.globalAlpha = a * mat;
        ctx.fillStyle = YELLOW;
        ctx.beginPath();
        ctx.arc(cx - rw / 2 + rw * spots[s][0], cy - rh / 2 + rh * spots[s][1],
                H * 0.013, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = a * mat;
      label(ctx, "the answers exist here", cx, cy + rh / 2 + H * 0.055,
            H * 0.026, YELLOW, "700", "center");
      ctx.restore();
    }

    ctx.restore();
  }

  // ── Chapter 9: afterwards ──────────────────────────────────────────────
  function drawAfter(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;

    ctx.save();
    ctx.globalAlpha = a;

    var top = at(scene, "topAt", t, 0.6);
    var cross = at(scene, "crossAt", t, 0.7);
    var prof = at(scene, "profileAt", t, 0.6);
    var holds = at(scene, "holdsAt", t, 0.6);

    if (prof > 0) {
      // The revealed name, and the link out to the full profile. This is the
      // shipped link: `essentialsUrl` on the ballot entry, rendered by
      // PoliticianIdentityCard. It carries no verdicts — see the script.
      ctx.save();
      ctx.globalAlpha = a * prof;
      var pw = W * 0.34, ph = H * 0.20, px = W * 0.33, py = H * 0.26;
      panel(ctx, px, py, pw, ph, H, 1, YELLOW);
      label(ctx, RACE[AGREED[0]].by, px + pw * 0.07, py + ph * 0.34, H * 0.038, FG, "700");
      label(ctx, "open their full profile", px + pw * 0.07, py + ph * 0.66,
            H * 0.026, LINK, "600");
      ctx.restore();
      if (holds > 0) {
        var what = ["their record", "their funding", "their votes"];
        for (var i = 0; i < 3; i++) {
          ctx.save();
          ctx.globalAlpha = a * holds;
          label(ctx, what[i], W * 0.50, H * 0.56 + i * H * 0.050,
                H * 0.030, MUTED, "600", "center");
          ctx.restore();
        }
      }
      ctx.restore();
      return;
    }

    if (top > 0) {
      ctx.save();
      ctx.globalAlpha = a * top;
      var tw = W * 0.30, th = H * 0.12, tx = W * 0.14, ty = H * 0.34;
      panel(ctx, tx, ty, tw, th, H, 1, YELLOW);
      label(ctx, "what you ranked first", tx + tw * 0.06, ty + th * 0.40,
            H * 0.022, MUTED, "600");
      label(ctx, TOPICS[0], tx + tw * 0.06, ty + th * 0.82, H * 0.034, FG, "700");
      ctx.restore();
    }
    if (cross > 0) {
      ctx.save();
      ctx.globalAlpha = a * cross;
      ctx.strokeStyle = YELLOW;
      ctx.lineWidth = Math.max(2, H * 0.005);
      ctx.beginPath();
      ctx.moveTo(W * 0.46, H * 0.40);
      ctx.lineTo(W * 0.46 + W * 0.08 * cross, H * 0.40);
      ctx.stroke();
      var cw = W * 0.28, chh = H * 0.12, cx2 = W * 0.58, cy2 = H * 0.34;
      panel(ctx, cx2, cy2, cw, chh, H, cross, YELLOW);
      label(ctx, "your Compass", cx2 + cw * 0.06, cy2 + chh * 0.40,
            H * 0.022, MUTED, "600");
      label(ctx, "start there next time", cx2 + cw * 0.06, cy2 + chh * 0.82,
            H * 0.030, FG, "700");
      ctx.restore();
    }

    ctx.restore();
  }

  // ── The live screen ────────────────────────────────────────────────────
  function drawLiveScreen(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.5);
    if (a <= 0) return;
    var host = scene.host || "readrank.empowered.vote";
    var boxW = W * 0.62, x = (W - boxW) / 2, y = H * 0.10, maxH = H * 0.70;

    if (shot.naturalWidth) {
      var full = boxW * (shot.naturalHeight / shot.naturalWidth);
      var boxH = Math.min(full, maxH);
      var travel = full - boxH;
      var frac = Math.max(0, Math.min(1, (scene.panFrom || 0) + t * (scene.panRate || 0)));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.rect(x, y, boxW, boxH); ctx.clip();
      ctx.drawImage(shot, x, y - travel * frac, boxW, full);
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
    drawTaste: drawTaste,
    drawNameCard: drawNameCard,
    drawTitleCard: drawTitleCard,
    drawTurn: drawTurn,
    drawRaces: drawRaces,
    drawBlind: drawBlind,
    drawRank: drawRank,
    drawReveal: drawReveal,
    drawSource: drawSource,
    drawCoverage: drawCoverage,
    drawAfter: drawAfter,
    drawLiveScreen: drawLiveScreen
  });
  window.EVArt.ready = Promise.all([logoA.ready, shotA.ready]);
})();
