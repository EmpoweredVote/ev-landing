// Figure placement for video scenes.
//
// The rig's computePose puts the PELVIS at the origin, so a scene authored
// against the ground has to be converted. The rig's own stage does this with
// two constants -- 128px for a standing figure, 200px for a seated one -- but
// neither survives here. Measured against the real poses, a standing figure's
// deepest foot is 108-115px below the pelvis depending on the animation, and a
// SEATED one is only 63-70px: the rig's 200 is the height of the plinth it
// draws underneath, which the video stage has no equivalent for. Using it put
// a sitting Bobit 130px in the air.
//
// So the lift is measured per animation instead: sample the whole cycle, take
// the deepest the foot ever goes, and add half a leg width for the capsule's
// round cap. The deepest point of the cycle touches the floor and a lifted
// foot rises off it, which is what walking looks like.
(function () {
  "use strict";
  if (window.EVCast && window.EVCast.drawAll && window.EVCast.TONES) return;

  var TONES = ["#1DA8C6", "#FF6B52", "#FFD740", "#43D07E", "#B49BFF", "#FF9A4D"];

  // animation name -> deepest foot below the pelvis at scale 1. Memoized: it is
  // a pure function of the animation, so the cache cannot make two renders of
  // the same frame differ.
  var FOOT = {};
  function footDepth(name, anim) {
    if (FOOT[name] != null) return FOOT[name];
    var R = window.LeremyRig, lo = -1e9;
    for (var i = 0; i <= 200; i++) {
      var j = R.computePose(anim.frame(i * 0.02), R.CFG, { x: 0, y: 0 });
      var f = Math.max(j.fR.y, j.fL.y);
      if (f > lo) lo = f;
    }
    FOOT[name] = lo + R.CFG.legW / 2;
    return FOOT[name];
  }

  function lerp(a, b, u) { return a + (b - a) * u; }

  function drawOne(ctx, entry, scene, t, W, H) {
    var R = window.LeremyRig;
    var anim = R.ANIMATIONS[entry.anim];
    if (!anim) throw new Error("unknown animation: " + entry.anim + " (scene " + scene.id + ")");

    var scale = entry.scale == null ? 1 : entry.scale;
    var u = scene.dur > 0 ? Math.max(0, Math.min(1, t / scene.dur)) : 0;
    var p0 = entry.path ? entry.path[0] : entry.at;
    var p1 = entry.path ? entry.path[1] : entry.at;
    var xFrac = lerp(p0[0], p1[0], u);
    var gFrac = lerp(p0[1], p1[1], u);

    var cx = xFrac * W;
    var groundY = gFrac * H;
    var lift = footDepth(entry.anim, anim) * scale;
    var pelvisY = groundY - lift;

    if (entry.shadow !== false) {
      R.drawShadow(ctx, cx, groundY, 66 * scale, "rgba(0,0,0,0.38)");
    }

    var pose = anim.frame(t);
    var opts = { color: TONES[(entry.tone || 0) % TONES.length], time: t };
    if (anim.mega) { opts.mega = true; opts.arm = anim.arm; opts.megaColor = scene.accent || "#FFD426"; }
    if (anim.book) opts.book = true;
    if (anim.swirl) opts.swirl = true;
    if (anim.laptop) opts.laptop = true;
    var prop = entry.prop || {};
    Object.keys(prop).forEach(function (k) { opts[k] = prop[k]; });
    if (opts.chair && !opts.chairColor) opts.chairColor = "#3A3A42";
    if (opts.desk && !opts.deskColor) opts.deskColor = "#3A3A42";
    if (opts.laptop && !opts.screenColor) opts.screenColor = "#1A1A20";

    ctx.save();
    ctx.translate(cx, pelvisY);
    ctx.scale(entry.flip ? -scale : scale, scale);
    var j = R.computePose(pose, R.CFG, { x: 0, y: 0 });
    R.draw(ctx, j, R.CFG, opts);
    ctx.restore();
  }

  function drawAll(ctx, scene, t, W, H) {
    var cast = scene.cast || [];
    if (cast.length > 3) {
      throw new Error("scene " + scene.id + " has " + cast.length + " Bobits; the limit is 3");
    }
    cast.forEach(function (e) { drawOne(ctx, e, scene, t, W, H); });
  }

  window.EVCast = { drawAll: drawAll, TONES: TONES, footDepth: footDepth };
})();
