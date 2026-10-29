// What the crowd builds, lifted from the app that builds it.
//
// Chris, on the first cut of chapter 5: "they build something as bobits — look
// within CTC to give a better replica of the things they build." They do, and
// it is not a generic pyramid. The live collection page raises a TABLEAU in the
// two margins beside the question card: twenty-five lines, six structures, one
// line per question answered right.
//
// BLUEPRINT BELOW IS CTC'S OWN, COPIED NOT REDRAWN, from
//   C:\Project Test\frontend\src\features\collection\tableau\blueprint.ts
// so that a viewer who plays the game sees the thing they already built. Its
// rig is kept as well: x runs -200..200 from the stack's centre line, y runs
// 0..1000 UP from the floor the crowd walks on. If the app's blueprint changes,
// this is a copy and will not notice — which is a cost worth paying, because
// the alternative is the film importing from a repo it cannot see.
//
// ENDPOINT 1 IS THE JOINT. Every line is lashed to its anchor at (x1, y1) and
// the raise pivots about that point, so a line authored the other way round
// rises from the wrong end. ANCHOR 0 MEANS THE GROUND; any other anchor is a
// LOWER line number, because nothing may be lashed to something not up yet.
//
// What this file does NOT copy is the build cycle. The app's crew fetches,
// hauls, raises and lashes over about fourteen seconds a line; the film has
// thirty-seven seconds for the whole chapter and is cut to a narration line, so
// a line here goes up in one pivot. The shape is the app's, the pace is the
// film's.
(function () {
  "use strict";

  var TOTAL_LINES = 25;

  var STRUCTURES = [
    { key: "cabin",     label: "Cabin",         side: "left",  from: 1,  to: 4 },
    { key: "tree",      label: "Tree",          side: "right", from: 5,  to: 9 },
    { key: "scaffold",  label: "Scaffold",      side: "left",  from: 10, to: 13 },
    { key: "treehouse", label: "Treehouse",     side: "right", from: 14, to: 17 },
    { key: "lookout",   label: "Lookout",       side: "left",  from: 18, to: 21 },
    { key: "mast",      label: "Mast and flag", side: "right", from: 22, to: 25 }
  ];

  var BLUEPRINT = [
    // ① CABIN, on the ground. Posts and rafters, peaked roof.
    { n: 1,  kind: "stick", side: "left",  structure: "cabin", anchor: 0,
      x1: -80, y1: 0,   x2: -80, y2: 150, w: 16 },
    { n: 2,  kind: "stick", side: "left",  structure: "cabin", anchor: 0,
      x1:  80, y1: 0,   x2:  80, y2: 150, w: 16 },
    { n: 3,  kind: "stick", side: "left",  structure: "cabin", anchor: 1,
      x1: -80, y1: 150, x2:   0, y2: 225, w: 14 },
    { n: 4,  kind: "stick", side: "left",  structure: "cabin", anchor: 2,
      x1:  80, y1: 150, x2:   0, y2: 225, w: 14 },

    // ② TREE, on the ground.
    { n: 5,  kind: "stick", side: "right", structure: "tree", anchor: 0,
      x1: 0, y1: 0,   x2: 0,    y2: 760, w: 44, w2: 26 },
    { n: 6,  kind: "stick", side: "right", structure: "tree", anchor: 5, perch: true,
      x1: 0, y1: 230, x2: -158, y2: 230, w: 17, w2: 9 },
    { n: 7,  kind: "stick", side: "right", structure: "tree", anchor: 5, perch: true,
      x1: 0, y1: 430, x2:  142, y2: 430, w: 17, w2: 9 },
    { n: 8,  kind: "stick", side: "right", structure: "tree", anchor: 5, perch: true,
      x1: 0, y1: 640, x2: -112, y2: 640, w: 17, w2: 9 },
    // The green curl: endpoints are the crown and the nominal top of the loops.
    { n: 9,  kind: "string", side: "right", structure: "tree", anchor: 5,
      x1: 0, y1: 760, x2: 0, y2: 940, w: 11 },

    // ③ SCAFFOLD, straddling the cabin roof. Feet sit ON the rafters.
    { n: 10, kind: "stick", side: "left", structure: "scaffold", anchor: 3,
      x1: -50, y1: 178, x2: -50, y2: 560, w: 14 },
    { n: 11, kind: "stick", side: "left", structure: "scaffold", anchor: 4,
      x1:  50, y1: 178, x2:  50, y2: 560, w: 14 },
    { n: 12, kind: "stick", side: "left", structure: "scaffold", anchor: 10, perch: true,
      x1: -50, y1: 370, x2:  50, y2: 370, w: 13 },
    { n: 13, kind: "stick", side: "left", structure: "scaffold", anchor: 10, perch: true,
      x1: -50, y1: 540, x2:  50, y2: 540, w: 13 },

    // ④ TREEHOUSE, lashed into the tree's lowest branch.
    { n: 14, kind: "stick", side: "right", structure: "treehouse", anchor: 6, perch: true,
      x1: -10,  y1: 245, x2: -160, y2: 245, w: 18 },
    { n: 15, kind: "stick", side: "right", structure: "treehouse", anchor: 14,
      x1: -150, y1: 245, x2: -150, y2: 330, w: 12 },
    { n: 16, kind: "stick", side: "right", structure: "treehouse", anchor: 14,
      x1: -25,  y1: 245, x2: -25,  y2: 330, w: 12 },
    { n: 17, kind: "stick", side: "right", structure: "treehouse", anchor: 15, perch: true,
      x1: -150, y1: 330, x2: -25,  y2: 330, w: 12 },

    // ⑤ LOOKOUT, a hut on the scaffold's top brace. Echoes the cabin on purpose.
    { n: 18, kind: "stick", side: "left", structure: "lookout", anchor: 13,
      x1: -50, y1: 540, x2: -50, y2: 650, w: 13 },
    { n: 19, kind: "stick", side: "left", structure: "lookout", anchor: 13,
      x1:  50, y1: 540, x2:  50, y2: 650, w: 13 },
    { n: 20, kind: "stick", side: "left", structure: "lookout", anchor: 18,
      x1: -50, y1: 650, x2:   0, y2: 712, w: 13 },
    { n: 21, kind: "stick", side: "left", structure: "lookout", anchor: 19,
      x1:  50, y1: 650, x2:   0, y2: 712, w: 13 },

    // ⑥ MAST AND FLAG, rising from the treehouse rail, clear of the canopy.
    { n: 22, kind: "stick", side: "right", structure: "mast", anchor: 17,
      x1: -150, y1: 330, x2: -150, y2: 880, w: 13, w2: 8 },
    { n: 23, kind: "stick", side: "right", structure: "mast", anchor: 22,
      x1: -150, y1: 790, x2:    0, y2: 560, w: 7 },
    { n: 24, kind: "stick", side: "right", structure: "mast", anchor: 22,
      x1: -150, y1: 838, x2: -190, y2: 838, w: 10, w2: 6 },
    // The pennant: a stick that tapers to a point, which is all a flag needs.
    { n: 25, kind: "stick", side: "right", structure: "mast", anchor: 22,
      x1: -150, y1: 872, x2:  -80, y2: 856, w: 26, w2: 2 }
  ];

  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  // How far up line `n` is, given how many lines are built. `built` is
  // fractional on purpose: the caller drives it off a cue, and the fraction is
  // what raises the newest line rather than snapping it.
  //
  // RAISE_SHARE is the slice of one line's turn spent pivoting. The rest is the
  // line standing there while the next one is fetched, which is what keeps a
  // run of them from looking like a zip being done up.
  var RAISE_SHARE = 0.55;
  function raiseOf(n, built) {
    var k = built - (n - 1);
    if (k <= 0) return 0;
    if (k >= RAISE_SHARE) return 1;
    return ease(k / RAISE_SHARE);
  }

  // A line's two ends in CANVAS space. `up` is 0..1: at 0 the free end lies
  // along the ground pointing away from the joint, at 1 it is where the
  // blueprint puts it. Pivoting about the joint is what makes a post look
  // raised rather than grown.
  //
  // `mirror` is -1 for the left stack. The blueprint is authored once and the
  // left stack is the right one's mirror in PLACEMENT, so a structure keyed to
  // the left side is still authored in its own coordinates and only the sign of
  // x changes here.
  function ends(line, up, ox, groundY, scale, mirror) {
    var jx = ox + line.x1 * scale * mirror;
    var jy = groundY - line.y1 * scale;
    var dx = (line.x2 - line.x1) * scale * mirror;
    var dy = -(line.y2 - line.y1) * scale;
    var len = Math.sqrt(dx * dx + dy * dy);
    // Flat on the ground, lying away from the joint, pointing outboard.
    var flatX = len * (line.x2 >= line.x1 ? 1 : -1) * mirror;
    var a0 = Math.atan2(0, flatX || 1);
    var a1 = Math.atan2(dy, dx);
    // Shortest way round, so a post never swings through the floor.
    var d = a1 - a0;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    var a = a0 + d * up;
    return { jx: jx, jy: jy, fx: jx + Math.cos(a) * len, fy: jy + Math.sin(a) * len };
  }

  // The curl at the crown of the tree. A scribble, not a segment — the app says
  // the same thing about it, and for the same reason: a straight green stick
  // reads as an aerial.
  function curl(ctx, e, w, up) {
    var loops = 2.4, steps = 44;
    var dx = e.fx - e.jx, dy = e.fy - e.jy;
    var len = Math.sqrt(dx * dx + dy * dy) * up;
    var ux = dx / (len || 1), uy = dy / (len || 1);
    ctx.lineWidth = w;
    ctx.beginPath();
    for (var i = 0; i <= steps; i++) {
      var u = i / steps;
      var along = len * u;
      var swing = Math.sin(u * loops * Math.PI * 2) * len * 0.22 * (1 - u * 0.4);
      var px = e.jx + ux * along - uy * swing;
      var py = e.jy + uy * along + ux * swing;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Draw one stack. `built` counts lines on BOTH sides, because the player
  // answers one question and one line goes up — the sides alternate by
  // structure, not by turn.
  function drawStack(ctx, side, built, ox, groundY, scale, opts) {
    opts = opts || {};
    var mirror = side === "left" ? -1 : 1;
    var wood = opts.wood || "#8A6A45";
    var green = opts.green || "#43D07E";
    var flag = opts.flag || "#FFD740";
    var alpha = opts.alpha == null ? 1 : opts.alpha;

    ctx.save();
    ctx.lineCap = "round";
    for (var i = 0; i < BLUEPRINT.length; i++) {
      var L = BLUEPRINT[i];
      if (L.side !== side) continue;
      var up = raiseOf(L.n, built);
      if (up <= 0) continue;
      var e = ends(L, up, ox, groundY, scale, mirror);
      ctx.globalAlpha = alpha;
      if (L.kind === "string") {
        ctx.strokeStyle = green;
        curl(ctx, e, Math.max(1, L.w * scale), up);
        continue;
      }
      ctx.strokeStyle = L.n === 25 ? flag : wood;
      // The taper, done as two passes rather than a polygon: a trunk 44 units
      // thick at the root and 26 at the crown is the difference between a tree
      // and a pole, and nothing here is big enough on screen to need more.
      var w1 = Math.max(1, L.w * scale);
      var w2 = Math.max(1, (L.w2 == null ? L.w : L.w2) * scale);
      ctx.lineWidth = w1;
      ctx.beginPath();
      ctx.moveTo(e.jx, e.jy);
      ctx.lineTo(e.jx + (e.fx - e.jx) * 0.5, e.jy + (e.fy - e.jy) * 0.5);
      ctx.stroke();
      ctx.lineWidth = w2;
      ctx.beginPath();
      ctx.moveTo(e.jx + (e.fx - e.jx) * 0.45, e.jy + (e.fy - e.jy) * 0.45);
      ctx.lineTo(e.fx, e.fy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Where a bobit may stand to be working on line `n`: at its joint, on the
  // ground. Used by the crowd so the builders are at the thing they are
  // building rather than scattered near it.
  function jointOf(n, ox, groundY, scale) {
    for (var i = 0; i < BLUEPRINT.length; i++) {
      if (BLUEPRINT[i].n !== n) continue;
      var L = BLUEPRINT[i];
      var mirror = L.side === "left" ? -1 : 1;
      return { x: ox + L.x1 * scale * mirror, side: L.side };
    }
    return null;
  }

  window.EVTableau = {
    TOTAL_LINES: TOTAL_LINES,
    STRUCTURES: STRUCTURES,
    BLUEPRINT: BLUEPRINT,
    raiseOf: raiseOf,
    drawStack: drawStack,
    jointOf: jointOf
  };
})();
