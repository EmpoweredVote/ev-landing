// Episode 1 art: the compass, drawn rather than screen-recorded so it does not
// age with the real UI. Every function is a pure function of (t, scene) — no
// module-level mutable state, or the determinism guarantee is void here.
//
// Everything is sized from W and H so the same code renders correctly in the
// 320x180 test fixtures and at 1920x1080, and the lower third is left clear so
// a Bobit can stand in front of the graph.
(function () {
  "use strict";
  var FG = "#F2F2F2", MUTED = "#9A9AA0", GRID = "#33333D", DIM = "#5A5A68";
  var FONT = '"Figtree", "Segoe UI", system-ui, sans-serif';

  // The product's own two colours, not a decorative choice. The live compass
  // legend (EV-CompassV2 src/pages/CombinedPage.jsx) paints YOUR shape purple
  // and the civic leader you compare against green, and this episode ends on a
  // screenshot of exactly that. Drawing them in anything else would teach a
  // colour language for five minutes and then contradict it.
  //
  // These are the dark-theme values; the stage is #111113.
  var YOU_C  = "#7C6B9E";    // you
  var LEAD_C = "#6DD28C";    // the civic leader laid over you
  var BOTH_C = "#749E95";    // the two of them mixed: where you already agree

  var LABELS = ["Housing", "Schools", "Transit", "Taxes", "Climate", "Policing"];
  var YOU    = [0.95, 0.55, 0.80, 0.00, 0.70, 0.45];   // index 3 deliberately empty
  var LEADER = [0.58, 0.72, 0.45, 0.00, 0.78, 0.30];

  // Images are decoded asynchronously, so the renderer is told to wait via
  // window.EVArt.ready before it asks for frame 0. A missing asset resolves
  // immediately rather than hanging the render — the drawing degrades instead.
  function load(uri) {
    var img = new Image();
    var ready = new Promise(function (res) {
      if (!uri) return res();
      img.onload = res; img.onerror = res;
    });
    if (uri) img.src = uri;
    return { img: img, ready: ready };
  }
  var shotA = load(window.EVCompassShot);
  var logoA = load(window.EVCompassLogo);
  var shot = shotA.img, logo = logoA.img;

  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function fade(t, t0, dur) { return ease((t - t0) / dur); }

  // Shared geometry: centre, radius, six axes, held above the lower third.
  function geom(W, H) {
    return { cx: W * 0.64, cy: H * 0.40, r: Math.min(W, H) * 0.26, n: 6 };
  }
  function axisPoint(g, i, frac) {
    var a = -Math.PI / 2 + (i / g.n) * Math.PI * 2;
    return { x: g.cx + Math.cos(a) * g.r * frac, y: g.cy + Math.sin(a) * g.r * frac };
  }
  function label(ctx, g, i, H, color) {
    var p = axisPoint(g, i, 1.16);
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = "600 " + Math.round(H * 0.030) + "px " + FONT;
    ctx.textAlign = i === 0 ? "center" : (p.x < g.cx ? "right" : (p.x > g.cx ? "left" : "center"));
    ctx.textBaseline = "middle";
    ctx.fillText(LABELS[i], p.x, p.y);
    ctx.restore();
  }
  function polygon(ctx, g, vals, frac) {
    ctx.beginPath();
    for (var i = 0; i < g.n; i++) {
      var p = axisPoint(g, i, vals[i] * (frac == null ? 1 : frac));
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
  }
  function axes(ctx, g, H, upTo) {
    ctx.save();
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(1, H * 0.0035);
    for (var i = 0; i < g.n; i++) {
      if (i >= upTo) break;
      var tip = axisPoint(g, i, 1);
      ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    }
    ctx.restore();
  }
  function dot(ctx, g, i, frac, H, color) {
    var d = axisPoint(g, i, frac);
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(d.x, d.y, H * 0.013, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // A rounded rectangle path. ctx.roundRect exists in this Chromium, but the
  // episode also renders in the test fixtures, so the path is built by hand.
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // Word wrap against a measured width. The card holds a real sentence off the
  // stance ladder, and that sentence is longer than one line at any size.
  function wrap(ctx, text, x, y, maxW, lineH) {
    var words = text.split(" "), line = "", n = 0;
    for (var i = 0; i < words.length; i++) {
      var next = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(next).width > maxW && line) {
        ctx.fillText(line, x, y + n * lineH); n++; line = words[i];
      } else { line = next; }
    }
    if (line) ctx.fillText(line, x, y + n * lineH);
    return n + 1;
  }

  // Chapter 4: one spoke, one dot, one idea.
  //
  // This scene gets its own geometry rather than reusing geom(). A single
  // upward spoke drawn at the six-axis scale is a short stub near the top of
  // the frame with its label clipped off the edge — there is no reason for one
  // spoke to be as small as one of six.
  function spokeGeom(W, H) { return { cx: W * 0.60, cy: H * 0.62, r: H * 0.40 }; }

  // `stage` says how far through the idea this scene is, the way
  // drawCompassBuilding does. Without it four consecutive scenes each replayed
  // the dot sliding out from zero, so the viewer watched the same reveal four
  // times across four cuts. A scene that continues the one before it starts
  // where that one ended.
  //
  //   axis   the line appears
  //   ticks  the stops appear on it
  //   travel the dot slides out
  //   hold   the dot rests, and the two ends of the ladder are named
  //
  // Five stops, because the real topic has five. A spoke records WHICH answer
  // you picked off a ladder of solutions -- it does not measure how strongly
  // you feel about the issue. Labelling the ends "barely moves me" and "decides
  // my vote", as this did, taught the viewer the wrong model of the product.
  function drawSpokeGrowing(ctx, t, W, H, scene) {
    var g = spokeGeom(W, H), accent = scene.accent || "#FFD426";
    var stage = scene.stage || "travel";
    var at = ["axis", "ticks", "travel", "hold"].indexOf(stage);
    var DOT = 0.88, STOPS = 5;
    var tipY = g.cy - g.r * DOT;   // the top STOP, not the top of the geometry

    // the axis
    ctx.save();
    ctx.globalAlpha = at === 0 ? fade(t, 0.1, 0.5) : 1;
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(1, H * 0.0045);
    ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.cx, tipY); ctx.stroke();
    ctx.restore();

    // the issue's name, with the axis from the first beat onward
    ctx.save();
    ctx.globalAlpha = at === 0 ? fade(t, 0.3, 0.5) : 1;
    ctx.textAlign = "center";
    ctx.fillStyle = FG;
    ctx.font = "600 " + Math.round(H * 0.050) + "px " + FONT;
    ctx.fillText(scene.issue || LABELS[0], g.cx, tipY - H * 0.075);
    ctx.restore();

    // ticks, so "further out" reads as a scale and not a drift
    if (at >= 1) {
      ctx.save();
      ctx.globalAlpha = (at === 1 ? fade(t, 0.15, 0.6) : 1) * 0.8;
      ctx.strokeStyle = GRID;
      ctx.lineWidth = Math.max(1, H * 0.0045);
      for (var k = 0; k < STOPS; k++) {
        var y = g.cy - g.r * DOT * (k / (STOPS - 1));
        ctx.beginPath();
        ctx.moveTo(g.cx - W * 0.018, y); ctx.lineTo(g.cx + W * 0.018, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // the dot: travelling in its own beat, at rest in every beat after it
    if (at >= 2) {
      var travel = at === 2 ? ease((t - 0.4) / 2.4) * DOT : DOT;
      if (travel > 0) {
        var dy = g.cy - g.r * travel;
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.cx, dy);
        ctx.strokeStyle = YOU_C; ctx.lineWidth = H * 0.010; ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = YOU_C;
        ctx.beginPath(); ctx.arc(g.cx, dy, H * 0.016, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    // The two ends of the scale, named. This is the idea the chapter is for.
    if (at >= 2) {
      ctx.save();
      ctx.globalAlpha = at === 2 ? fade(t, 1.8, 0.8) : 1;
      ctx.textAlign = "left";
      ctx.font = "500 " + Math.round(H * 0.030) + "px " + FONT;
      ctx.fillStyle = MUTED;
      ctx.fillText(scene.nearEnd || "government builds it", g.cx + W * 0.030, g.cy - H * 0.005);
      ctx.fillStyle = MUTED;
      ctx.fillText(scene.farEnd || "let the market decide", g.cx + W * 0.030,
        tipY + H * 0.015);
      ctx.restore();
    }
  }

  // Chapter 1: the title card, as the product's own lockup.
  //
  // The brand mark happens to BE a radar chart — a hexagon of six spokes with
  // yellow vertex dots — which is the same figure chapters 4 to 6 draw. Using
  // the real lockup here makes that rhyme deliberate instead of accidental.
  function drawTitleCard(ctx, t, W, H, scene) {
    var a = fade(t, 0.15, 0.7);
    var grow = 0.975 + 0.025 * a;          // a small settle, not a zoom

    if (!logo.complete || !logo.naturalWidth) {
      // The lockup is missing. Say the name in type rather than show nothing.
      // `name`, not `headline`: a headline is drawn by the shared headline
      // code too, and the card would carry the words twice.
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = "center";
      ctx.fillStyle = scene.accent || "#FFD426";
      ctx.font = "800 " + Math.round(H * 0.105) + "px " + FONT;
      ctx.fillText(scene.name || "Empowered Compass", W / 2, H * 0.47);
      ctx.restore();
    } else {
      var w = W * 0.52 * grow;
      var h = w * (logo.naturalHeight / logo.naturalWidth);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.drawImage(logo, (W - w) / 2, H * 0.44 - h / 2, w, h);
      ctx.restore();
    }

    if (scene.sub) {
      ctx.save();
      ctx.globalAlpha = fade(t, 0.55, 0.6);
      ctx.textAlign = "center";
      ctx.fillStyle = MUTED;
      ctx.font = "500 " + Math.round(H * 0.030) + "px " + FONT;
      ctx.fillText(scene.sub, W / 2, H * 0.62);
      ctx.restore();
    }
  }

  // Chapter 0: the ballot. A column of names that stop meaning anything, and
  // the single letter we reach for instead.
  function drawBallot(ctx, t, W, H, scene) {
    var n = 8;
    var x = W * 0.54, w = W * 0.30;
    var y0 = H * 0.10, rowH = H * 0.070, barH = H * 0.034;

    ctx.save();
    ctx.globalAlpha = fade(t, 0.1, 0.5);
    ctx.fillStyle = MUTED;
    ctx.font = "600 " + Math.round(H * 0.026) + "px " + FONT;
    ctx.textAlign = "left";
    ctx.fillText("YOUR BALLOT", x, y0 - H * 0.022);
    ctx.restore();

    for (var i = 0; i < n; i++) {
      var a = fade(t, 0.2 + i * 0.07, 0.35);
      if (a <= 0) continue;
      // The further down the ballot, the less the name means. That fade IS the
      // point of the chapter, so it is in the drawing, not just the narration.
      var known = scene.dim ? Math.max(0.12, 1 - i / (n - 1)) : 1;
      ctx.save();
      ctx.globalAlpha = a * known;
      ctx.fillStyle = FG;
      ctx.fillRect(x, y0 + i * rowH, w * (0.55 + 0.4 * ((i * 37) % 10) / 10), barH);
      ctx.restore();

      if (scene.letters) {
        var la = fade(t, 0.5 + i * 0.09, 0.3);
        if (la <= 0) continue;
        var letter = (i * 37) % 10 < 5 ? "D" : "R";
        ctx.save();
        ctx.globalAlpha = la;
        ctx.fillStyle = scene.accent || "#FFD426";
        ctx.beginPath();
        ctx.arc(x - W * 0.028, y0 + i * rowH + barH / 2, H * 0.022, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111113";
        ctx.font = "700 " + Math.round(H * 0.026) + "px " + FONT;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(letter, x - W * 0.028, y0 + i * rowH + barH / 2);
        ctx.restore();
      }
    }
  }

  // Chapter 2: the bundle. Two boxes, each with a letter, each holding a Bobit.
  function drawBoxes(ctx, t, W, H, scene) {
    var stage = scene.stage || "hold";
    var boxes = [
      { cx: W * 0.26, letter: "D", c: "#1DA8C6" },
      { cx: W * 0.72, letter: "R", c: "#FF6B52" }
    ];
    var bw = W * 0.30, top = H * 0.26, bottom = H * 0.90;

    var a = stage === "drop" ? fade(t, 0.2, 0.9)
          : stage === "fade" ? 1 - fade(t, 0.3, 1.0)
          : 1;
    if (a <= 0) return;
    var drop = stage === "drop" ? (1 - fade(t, 0.2, 0.9)) * H * 0.22 : 0;

    boxes.forEach(function (b) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = b.c;
      ctx.lineWidth = Math.max(2, H * 0.006);
      ctx.strokeRect(b.cx - bw / 2, top - drop, bw, bottom - top);
      ctx.globalAlpha = a * 0.08;
      ctx.fillStyle = b.c;
      ctx.fillRect(b.cx - bw / 2, top - drop, bw, bottom - top);
      ctx.globalAlpha = a;
      ctx.fillStyle = b.c;
      ctx.font = "700 " + Math.round(H * 0.060) + "px " + FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(b.letter, b.cx, top - drop + H * 0.080);
      ctx.restore();
    });
  }

  // Chapter 3: calibration markers landing one at a time.
  function drawMarkers(ctx, t, W, H, scene) {
    var accent = scene.accent || "#FFD426";
    var count = scene.count == null ? 3 : scene.count;
    var spots = [
      { x: 0.60, y: 0.30 }, { x: 0.74, y: 0.42 }, { x: 0.56, y: 0.52 },
      { x: 0.80, y: 0.26 }, { x: 0.68, y: 0.58 }, { x: 0.86, y: 0.46 }
    ];
    for (var i = 0; i < Math.min(count, spots.length); i++) {
      // Markers land one at a time while they are being answered, but in the
      // gather beat they are already there — the motion is the ring, not the
      // arrival, and staggering them again would start the scene nearly empty.
      // `settled` means this scene continues the one before it: the markers
      // are already there, and staggering them in again would replay the
      // same arrival the viewer just watched.
      var a = scene.settled ? 1
        : (scene.ring ? fade(t, i * 0.05, 0.3) : fade(t, 0.3 + i * 0.9, 0.45));
      if (a <= 0) continue;
      var p = spots[i];
      var px = p.x * W, py = p.y * H;
      if (scene.ring) {
        // Chapter 3's last beat: the markers gather into the ring the compass
        // is about to become, so the cut to the spoke scene is not a jump.
        var ang = -Math.PI / 2 + (i / Math.min(count, spots.length)) * Math.PI * 2;
        var u = fade(t, 0.3, 1.2);
        px = px + (W * 0.64 + Math.cos(ang) * Math.min(W, H) * 0.22 - px) * u;
        py = py + (H * 0.42 + Math.sin(ang) * Math.min(W, H) * 0.22 - py) * u;
      }
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(px, py, H * 0.016, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a * 0.25;
      ctx.beginPath(); ctx.arc(px, py, H * 0.034, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // Chapter 5: the shape assembles. scene.stage picks how far along it is.
  function drawCompassBuilding(ctx, t, W, H, scene) {
    var g = geom(W, H), accent = scene.accent || "#FFD426";
    var stage = scene.stage || "spokes";

    var shown = stage === "spokes" ? Math.min(g.n, Math.floor(ease(t / 2.4) * g.n + 0.001)) : g.n;
    axes(ctx, g, H, shown);
    for (var i = 0; i < shown; i++) label(ctx, g, i, H, i === 3 ? DIM : MUTED);

    if (stage === "spokes") return;

    var upTo = stage === "dots" ? ease(t / 2.4) * g.n : g.n;
    for (var k = 0; k < g.n; k++) {
      if (k >= upTo || YOU[k] === 0) continue;
      dot(ctx, g, k, YOU[k], H, YOU_C);
    }

    if (stage === "dots") return;

    var grow = stage === "outline" ? ease(t / 1.8) : 1;
    ctx.save();
    ctx.strokeStyle = YOU_C;
    ctx.lineWidth = Math.max(2, H * 0.006);
    ctx.globalAlpha = grow;
    polygon(ctx, g, YOU);
    ctx.stroke();
    if (stage === "filled") {
      ctx.globalAlpha = 0.22 * fade(t, 0.1, 0.8);
      ctx.fillStyle = YOU_C;
      ctx.fill();
    }
    ctx.restore();
  }

  // Chapter 6: the leader's shape over yours.
  function drawCompassOverlay(ctx, t, W, H, scene) {
    var g = geom(W, H), accent = scene.accent || "#FFD426";
    var stage = scene.stage || "second";

    axes(ctx, g, H, g.n);
    for (var i = 0; i < g.n; i++) {
      label(ctx, g, i, H, (stage === "empty" && i === 3) ? DIM : MUTED);
    }

    // your shape, always present
    ctx.save();
    ctx.strokeStyle = YOU_C;
    ctx.lineWidth = Math.max(2, H * 0.006);
    ctx.globalAlpha = stage === "alone" ? 1 : 0.85;
    polygon(ctx, g, YOU); ctx.stroke();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = YOU_C; ctx.fill();
    ctx.restore();
    for (var d1 = 0; d1 < g.n; d1++) if (YOU[d1] > 0) dot(ctx, g, d1, YOU[d1], H, YOU_C);

    if (stage === "alone") return;

    var appear = stage === "second" ? fade(t, 0.3, 1.2) : 1;
    ctx.save();
    ctx.globalAlpha = appear;
    ctx.strokeStyle = LEAD_C;
    ctx.lineWidth = Math.max(2, H * 0.006);
    ctx.setLineDash([H * 0.018, H * 0.012]);
    polygon(ctx, g, LEADER); ctx.stroke();
    ctx.restore();

    if (stage === "overlap" || stage === "gap" || stage === "empty") {
      var both = [];
      for (var m = 0; m < g.n; m++) both.push(Math.min(YOU[m], LEADER[m]));
      ctx.save();
      ctx.globalAlpha = 0.34 * (stage === "overlap" ? fade(t, 0.2, 1.0) : 1);
      ctx.fillStyle = BOTH_C;
      polygon(ctx, g, both); ctx.fill();
      ctx.restore();
    }

    if (stage === "gap") {
      // the one spoke where the viewer reaches well past the leader
      var a = axisPoint(g, 0, LEADER[0]), b = axisPoint(g, 0, YOU[0]);
      ctx.save();
      ctx.globalAlpha = fade(t, 0.2, 0.8);
      ctx.strokeStyle = "#FF6B52";
      ctx.lineWidth = Math.max(3, H * 0.010);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.fillStyle = "#FF6B52";
      ctx.font = "600 " + Math.round(H * 0.028) + "px " + FONT;
      ctx.textAlign = "center";
      ctx.fillText("different answers", (a.x + b.x) / 2 + W * 0.085, (a.y + b.y) / 2);
      ctx.restore();
    }

    if (stage === "empty") {
      var e = axisPoint(g, 3, 1.0);
      ctx.save();
      ctx.globalAlpha = fade(t, 0.2, 0.8);
      ctx.strokeStyle = DIM;
      ctx.setLineDash([H * 0.010, H * 0.010]);
      ctx.lineWidth = Math.max(1, H * 0.004);
      ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(e.x, e.y); ctx.stroke();
      ctx.restore();
    }
  }

  // Chapter 7: where a stance comes from.
  //
  // This is the chapter that answers "says who?". Every beat shares one frame
  // — the two shapes small on the left, a card on the right — so the four
  // scenes build one card instead of replaying one reveal four times.
  //
  //   ask     the shapes, one of the leader's dots ringed, an empty card
  //   stance  the topic and the answer picked off the ladder
  //   refs    the written reasoning, then the numbered references
  //   scale   the counts, over the dimmed card
  //
  // The reasoning body is drawn as rules rather than sentences on purpose. A
  // written-out record for a named person would be a claim about that person,
  // and inventing one to illustrate how carefully the real ones are made would
  // undo the point of the chapter. The reference hosts are real; they are the
  // four most-cited hosts in the live table.
  function drawSourceCard(ctx, t, W, H, scene) {
    var accent = scene.accent || "#FFD426";
    var stage = scene.stage || "refs";
    var at = ["ask", "stance", "refs", "scale"].indexOf(stage);

    // The compass, small, on the left. Same shapes as chapter 6, so the viewer
    // reads this as the same picture rather than a new one.
    var g = { cx: W * 0.21, cy: H * 0.36, r: Math.min(W, H) * 0.15, n: 6 };
    var RING = 0;                       // the spoke whose stance we open up
    ctx.save();
    ctx.globalAlpha = (at === 0 ? fade(t, 0.1, 0.5) : 1) * (at === 3 ? 0.35 : 1);
    axes(ctx, g, H, g.n);
    ctx.strokeStyle = YOU_C; ctx.lineWidth = Math.max(1, H * 0.004);
    polygon(ctx, g, YOU); ctx.stroke();
    ctx.strokeStyle = LEAD_C; ctx.lineWidth = Math.max(1, H * 0.005);
    polygon(ctx, g, LEADER); ctx.stroke();
    var p = axisPoint(g, RING, LEADER[RING]);
    ctx.fillStyle = LEAD_C;
    ctx.beginPath(); ctx.arc(p.x, p.y, H * 0.011, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha *= 0.6;
    ctx.strokeStyle = LEAD_C; ctx.lineWidth = Math.max(1, H * 0.003);
    ctx.beginPath(); ctx.arc(p.x, p.y, H * 0.026, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // The card.
    var x = W * 0.42, cw = W * 0.50, y = H * 0.10, ch = H * 0.58;
    ctx.save();
    ctx.globalAlpha = (at === 0 ? fade(t, 0.5, 0.6) : 1) * (at === 3 ? 0.5 : 1);
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(1, H * 0.003);
    roundRect(ctx, x, y, cw, ch, H * 0.018);
    ctx.stroke();
    ctx.restore();

    var pad = W * 0.026, tx = x + pad, cy = y + H * 0.065;

    // The topic, and the answer picked off the ladder.
    if (at === 1 || at === 2) {
      ctx.save();
      ctx.globalAlpha = at === 1 ? fade(t, 0.15, 0.6) : 1;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = LEAD_C;
      ctx.font = "600 " + Math.round(H * 0.026) + "px " + FONT;
      ctx.fillText("CIVIC LEADER  ·  HOUSING", tx, cy);
      ctx.fillStyle = FG;
      ctx.font = "700 " + Math.round(H * 0.038) + "px " + FONT;
      wrap(ctx, "Build no public housing, but set binding rules on the " +
        "private market like rent caps.", tx, cy + H * 0.062, cw - pad * 2, H * 0.050);
      ctx.restore();
    }

    // The written reasoning, as rules, then the references, as rows.
    if (at === 2) {
      var ry = cy + H * 0.195;
      ctx.save();
      ctx.globalAlpha = fade(t, 0.1, 0.5);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = MUTED;
      ctx.font = "600 " + Math.round(H * 0.022) + "px " + FONT;
      ctx.fillText("WHY WE PLACED THEM HERE", tx, ry - H * 0.028);
      ctx.strokeStyle = GRID;
      ctx.lineWidth = Math.max(2, H * 0.009);
      ctx.lineCap = "round";
      [0.90, 0.96, 0.62].forEach(function (frac, i) {
        var yy = ry + i * H * 0.034;
        ctx.beginPath();
        ctx.moveTo(tx, yy); ctx.lineTo(tx + (cw - pad * 2) * frac, yy);
        ctx.stroke();
      });
      ctx.restore();

      var hosts = ["ontheissues.org", "en.wikipedia.org", "congress.gov",
                   "leginfo.legislature.ca.gov"];
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      hosts.forEach(function (host, i) {
        var a = fade(t, 0.9 + i * 0.45, 0.4);
        if (a <= 0) return;
        var yy = ry + H * 0.115 + i * H * 0.054;
        ctx.globalAlpha = a;
        ctx.fillStyle = MUTED;
        ctx.font = "600 " + Math.round(H * 0.024) + "px " + FONT;
        ctx.fillText(String(i + 1), tx, yy);
        ctx.fillStyle = accent;
        ctx.globalAlpha = a * 0.75;
        ctx.fillRect(tx + W * 0.016, yy - H * 0.011, H * 0.022, H * 0.022);
        ctx.globalAlpha = a;
        ctx.fillStyle = "#6FD2E8";
        ctx.font = "500 " + Math.round(H * 0.028) + "px " + FONT;
        ctx.fillText(host, tx + W * 0.016 + H * 0.034, yy);
      });
      ctx.restore();
    }

    // The counts, over the dimmed card. Measured 2026-10-10 in one query run,
    // so the three read consistently with each other; spoken as "tens of
    // thousands", so the picture does not age faster than the narration.
    if (at >= 3) {
      var counts = [
        { n: "39,000", what: "researched positions" },
        { n: "4,200",  what: "civic leaders" },
        { n: "69,000", what: "references behind them" }
      ];
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      counts.forEach(function (c, i) {
        var a = fade(t, 0.15 + i * 0.5, 0.45);
        if (a <= 0) return;
        var yy = y + H * 0.155 + i * H * 0.165;
        ctx.globalAlpha = a;
        ctx.fillStyle = accent;
        ctx.font = "700 " + Math.round(H * 0.090) + "px " + FONT;
        ctx.fillText(c.n, tx, yy);
        ctx.fillStyle = FG;
        ctx.font = "500 " + Math.round(H * 0.032) + "px " + FONT;
        ctx.fillText(c.what, tx, yy + H * 0.042);
      });
      ctx.restore();
    }
  }

  // Chapter 8: a few seconds of the real screen, to prove the thing exists.
  function drawLiveScreen(ctx, t, W, H, scene) {
    var a = scene.settled ? 1 : fade(t, 0.2, 0.8);
    var pad = W * 0.12;
    var boxW = W - pad * 2;
    var x = pad, y = H * 0.12;

    if (!shot.complete || !shot.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = MUTED;
      ctx.textAlign = "center";
      ctx.font = "600 " + Math.round(H * 0.040) + "px " + FONT;
      ctx.fillText("compass.empowered.vote", W / 2, H * 0.45);
      ctx.restore();
      return;
    }

    var boxH = boxW * (shot.naturalHeight / shot.naturalWidth);
    var maxH = H * 0.62;   // still clears the Bobit standing in front of it
    if (boxH > maxH) { boxH = maxH; boxW = boxH * (shot.naturalWidth / shot.naturalHeight); x = (W - boxW) / 2; }

    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(shot, x, y, boxW, boxH);
    ctx.strokeStyle = scene.accent || "#FFD426";
    ctx.lineWidth = Math.max(2, H * 0.005);
    ctx.strokeRect(x, y, boxW, boxH);
    ctx.fillStyle = MUTED;
    ctx.textAlign = "center";
    ctx.font = "600 " + Math.round(H * 0.032) + "px " + FONT;
    ctx.fillText("compass.empowered.vote", W / 2, y + boxH + H * 0.055);
    ctx.restore();
  }

  window.EVArt = Object.assign(window.EVArt || {}, {
    drawTitleCard: drawTitleCard,
    drawBallot: drawBallot,
    drawBoxes: drawBoxes,
    drawMarkers: drawMarkers,
    drawSpokeGrowing: drawSpokeGrowing,
    drawCompassBuilding: drawCompassBuilding,
    drawCompassOverlay: drawCompassOverlay,
    drawSourceCard: drawSourceCard,
    drawLiveScreen: drawLiveScreen
  });
  window.EVArt.ready = Promise.all([shotA.ready, logoA.ready]);
})();
