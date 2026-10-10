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

  var LABELS = ["Housing", "Schools", "Transit", "Taxes", "Climate", "Policing"];
  var YOU    = [0.95, 0.55, 0.80, 0.00, 0.70, 0.45];   // index 3 deliberately empty
  var LEADER = [0.58, 0.72, 0.45, 0.00, 0.78, 0.30];

  // The still of the live app. Decoding is async, so the renderer is told to
  // wait via window.EVArt.ready before it asks for frame 0.
  var shot = new Image();
  var shotReady = new Promise(function (res) { shot.onload = res; shot.onerror = res; });
  if (window.EVCompassShot) shot.src = window.EVCompassShot;
  else res0();
  function res0() { /* no still available; drawLiveScreen degrades to a caption */ }

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

  // Chapter 4: one spoke, one dot, one idea.
  //
  // This scene gets its own geometry rather than reusing geom(). A single
  // upward spoke drawn at the six-axis scale is a short stub near the top of
  // the frame with its label clipped off the edge — there is no reason for one
  // spoke to be as small as one of six.
  function spokeGeom(W, H) { return { cx: W * 0.60, cy: H * 0.62, r: H * 0.40 }; }

  function drawSpokeGrowing(ctx, t, W, H, scene) {
    var g = spokeGeom(W, H), accent = scene.accent || "#FFD426";
    var tipY = g.cy - g.r;

    ctx.save();
    ctx.globalAlpha = fade(t, 0.1, 0.5);
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(1, H * 0.0045);
    ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.cx, tipY); ctx.stroke();
    ctx.restore();

    // ticks, so "further out" reads as a scale and not a drift
    ctx.save();
    ctx.globalAlpha = fade(t, 0.5, 0.5) * 0.8;
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(1, H * 0.003);
    for (var k = 1; k <= 4; k++) {
      var y = g.cy - g.r * (k / 4);
      ctx.beginPath();
      ctx.moveTo(g.cx - W * 0.012, y); ctx.lineTo(g.cx + W * 0.012, y);
      ctx.stroke();
    }
    ctx.restore();

    var travel = ease((t - 1.0) / 2.2) * 0.88;
    if (travel > 0) {
      var dy = g.cy - g.r * travel;
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.cx, dy);
      ctx.strokeStyle = accent; ctx.lineWidth = H * 0.010; ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(g.cx, dy, H * 0.016, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = fade(t, 0.3, 0.5);
    ctx.textAlign = "center";
    ctx.fillStyle = FG;
    ctx.font = "600 " + Math.round(H * 0.050) + "px " + FONT;
    ctx.fillText(scene.issue || LABELS[0], g.cx, tipY - H * 0.055);
    ctx.restore();

    // The two ends of the scale, named. This is the idea the chapter is for.
    ctx.save();
    ctx.globalAlpha = fade(t, 2.2, 0.8);
    ctx.textAlign = "left";
    ctx.font = "500 " + Math.round(H * 0.030) + "px " + FONT;
    ctx.fillStyle = MUTED;
    ctx.fillText("barely moves me", g.cx + W * 0.030, g.cy - H * 0.005);
    ctx.fillStyle = accent;
    ctx.fillText("decides my vote", g.cx + W * 0.030, tipY + H * 0.015);
    ctx.restore();
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
      var a = scene.ring ? fade(t, i * 0.05, 0.3) : fade(t, 0.3 + i * 0.9, 0.45);
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
      dot(ctx, g, k, YOU[k], H, accent);
    }

    if (stage === "dots") return;

    var grow = stage === "outline" ? ease(t / 1.8) : 1;
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(2, H * 0.006);
    ctx.globalAlpha = grow;
    polygon(ctx, g, YOU);
    ctx.stroke();
    if (stage === "filled") {
      ctx.globalAlpha = 0.18 * fade(t, 0.1, 0.8);
      ctx.fillStyle = accent;
      ctx.fill();
    }
    ctx.restore();
  }

  // Chapter 6: the leader's shape over yours.
  function drawCompassOverlay(ctx, t, W, H, scene) {
    var g = geom(W, H), accent = scene.accent || "#FFD426";
    var stage = scene.stage || "second";
    var LEAD = "#1DA8C6";

    axes(ctx, g, H, g.n);
    for (var i = 0; i < g.n; i++) {
      label(ctx, g, i, H, (stage === "empty" && i === 3) ? DIM : MUTED);
    }

    // your shape, always present
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(2, H * 0.006);
    ctx.globalAlpha = stage === "alone" ? 1 : 0.85;
    polygon(ctx, g, YOU); ctx.stroke();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = accent; ctx.fill();
    ctx.restore();
    for (var d1 = 0; d1 < g.n; d1++) if (YOU[d1] > 0) dot(ctx, g, d1, YOU[d1], H, accent);

    if (stage === "alone") return;

    var appear = stage === "second" ? fade(t, 0.3, 1.2) : 1;
    ctx.save();
    ctx.globalAlpha = appear;
    ctx.strokeStyle = LEAD;
    ctx.lineWidth = Math.max(2, H * 0.006);
    ctx.setLineDash([H * 0.018, H * 0.012]);
    polygon(ctx, g, LEADER); ctx.stroke();
    ctx.restore();

    if (stage === "overlap" || stage === "gap" || stage === "empty") {
      var both = [];
      for (var m = 0; m < g.n; m++) both.push(Math.min(YOU[m], LEADER[m]));
      ctx.save();
      ctx.globalAlpha = 0.34 * (stage === "overlap" ? fade(t, 0.2, 1.0) : 1);
      ctx.fillStyle = "#43D07E";
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
      ctx.fillText("you care more", (a.x + b.x) / 2 + W * 0.075, (a.y + b.y) / 2);
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

  // Chapter 7: the three pillars, then the formula.
  function drawPillarFormula(ctx, t, W, H, scene) {
    var cols = [
      { name: "Inform",  c: "#FFD426" },
      { name: "Connect", c: "#2BD9D9" },
      { name: "Empower", c: "#FF4019" }
    ];
    var bw = W * 0.21, bh = H * 0.16, gap = W * 0.035;
    var total = bw * 3 + gap * 2;
    var x0 = (W - total) / 2, y0 = H * 0.26;

    cols.forEach(function (col, i) {
      var a = fade(t, 0.2 + i * 0.55, 0.5);
      if (a <= 0) return;
      // `highlight` names either a pillar or a term in the formula. Dim the
      // other pillars only when it names a pillar — otherwise highlighting
      // "sValues" dims all three, since none of them match.
      var pillarPicked = cols.some(function (c) { return c.name === scene.highlight; });
      var dimmed = pillarPicked && scene.highlight !== col.name;
      ctx.save();
      ctx.globalAlpha = a * (dimmed ? 0.28 : 1);
      ctx.fillStyle = col.c;
      ctx.fillRect(x0 + i * (bw + gap), y0, bw, bh);
      ctx.fillStyle = "#111113";
      ctx.font = "700 " + Math.round(H * 0.045) + "px " + FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(col.name, x0 + i * (bw + gap) + bw / 2, y0 + bh / 2);
      ctx.restore();
    });

    if (scene.formula) {
      var f = fade(t, 0.4, 0.8);
      ctx.save();
      ctx.globalAlpha = f;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = "700 " + Math.round(H * 0.058) + "px " + FONT;
      var y = y0 + bh + H * 0.16;
      if (scene.highlight === "sValues") {
        var pre = "sFacts + ", mid = "sValues", post = " = sSolutions";
        var wPre = ctx.measureText(pre).width, wMid = ctx.measureText(mid).width,
            wPost = ctx.measureText(post).width;
        var left = W / 2 - (wPre + wMid + wPost) / 2;
        ctx.textAlign = "left";
        ctx.fillStyle = MUTED; ctx.fillText(pre, left, y);
        ctx.fillStyle = scene.accent || "#FFD426"; ctx.fillText(mid, left + wPre, y);
        ctx.fillStyle = MUTED; ctx.fillText(post, left + wPre + wMid, y);
      } else {
        ctx.fillStyle = FG;
        ctx.fillText("sFacts + sValues = sSolutions", W / 2, y);
      }
      ctx.restore();
    }
  }

  // Chapter 8: a few seconds of the real screen, to prove the thing exists.
  function drawLiveScreen(ctx, t, W, H, scene) {
    var a = fade(t, 0.2, 0.8);
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
    drawBallot: drawBallot,
    drawBoxes: drawBoxes,
    drawMarkers: drawMarkers,
    drawSpokeGrowing: drawSpokeGrowing,
    drawCompassBuilding: drawCompassBuilding,
    drawCompassOverlay: drawCompassOverlay,
    drawPillarFormula: drawPillarFormula,
    drawLiveScreen: drawLiveScreen
  });
  window.EVArt.ready = shotReady;
})();
