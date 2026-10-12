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
    // 30 seconds, not 4. A review measured `fall` at 107.5px over a 4-second
    // window against 117.0px over 30 — its deepest moment arrives late, so a
    // short window would have sunk that figure 9.5px through the floor. The
    // loop runs once per animation and the result is memoized.
    var R = window.LeremyRig, lo = -1e9;
    for (var i = 0; i <= 1500; i++) {
      var j = R.computePose(anim.frame(i * 0.02), R.CFG, { x: 0, y: 0 });
      var f = Math.max(j.fR.y, j.fL.y);
      if (f > lo) lo = f;
    }
    FOOT[name] = lo + R.CFG.legW / 2;
    return FOOT[name];
  }

  function lerp(a, b, u) { return a + (b - a) * u; }

  // What the figure is doing at time t, and how long it has been doing it.
  //
  // `anim` is usually one name for the whole scene. It may instead be a list
  // of [{ t, anim }] because one narration line can describe a sequence — "you
  // get to your polling booth, work your way down your ballot" is one line and
  // two actions — and one scene is one line, which is the rule that makes a
  // re-time a single number. Each keyframe's animation plays from ITS own
  // zero: an animation joined halfway through starts mid-stride.
  function acting(entry, t) {
    if (!Array.isArray(entry.anim)) return { name: entry.anim, since: t };
    var k = entry.anim[0];
    for (var i = 0; i < entry.anim.length; i++) {
      if (t >= entry.anim[i].t) k = entry.anim[i]; else break;
    }
    return { name: k.anim, since: Math.max(0, t - (k.t || 0)) };
  }

  // Where the figure is at time t, as fractions of the frame.
  //
  // Two forms. `[[x, y], [x, y]]` runs the whole scene, which is what most
  // scenes want. `[{ t, at: [x, y] }, ...]` names waypoints in seconds, so a
  // figure can cross to somewhere and then stay there instead of drifting for
  // the length of the line.
  function placed(entry, scene, t) {
    var path = entry.path;
    if (!path) return entry.at;
    if (Array.isArray(path[0])) {
      var u = scene.dur > 0 ? Math.max(0, Math.min(1, t / scene.dur)) : 0;
      return [lerp(path[0][0], path[1][0], u), lerp(path[0][1], path[1][1], u)];
    }
    if (t <= path[0].t) return path[0].at;
    for (var i = 1; i < path.length; i++) {
      if (t <= path[i].t) {
        var span = path[i].t - path[i - 1].t;
        var v = span > 0 ? (t - path[i - 1].t) / span : 1;
        return [lerp(path[i - 1].at[0], path[i].at[0], v),
                lerp(path[i - 1].at[1], path[i].at[1], v)];
      }
    }
    return path[path.length - 1].at;
  }

  function drawOne(ctx, entry, scene, t, W, H) {
    var R = window.LeremyRig;
    // `show` is [from, to] in seconds: outside it the figure is not drawn at
    // all. A figure that walks through a door has to stop being drawn when it
    // goes in, or it stands on the threshold for the rest of the line.
    if (entry.show && (t < entry.show[0] || t > entry.show[1])) return;

    var act = acting(entry, t);
    var anim = R.ANIMATIONS[act.name];
    if (!anim) throw new Error("unknown animation: " + act.name + " (scene " + scene.id + ")");

    var scale = entry.scale == null ? 1 : entry.scale;
    var where = placed(entry, scene, t);
    var xFrac = where[0];
    var gFrac = where[1];

    var cx = xFrac * W;
    var groundY = gFrac * H;
    var lift = footDepth(act.name, anim) * scale;
    var pelvisY = groundY - lift;

    if (entry.shadow !== false) {
      R.drawShadow(ctx, cx, groundY, 66 * scale, "rgba(0,0,0,0.38)");
    }

    var pose = anim.frame(act.since);
    // `color` beats `tone`. The tone palette is the house set of six; an
    // episode that has to draw a figure in a colour the PRODUCT owns -- the
    // compass's purple "you" and green "them" -- names the hex instead.
    // `time` drives props that are synced to the animation (the paddleball's
    // ball, the swirl), so it follows the same clock the pose does.
    var opts = { color: entry.color || TONES[(entry.tone || 0) % TONES.length], time: act.since };
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
