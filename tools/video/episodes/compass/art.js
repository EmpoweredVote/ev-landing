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

  // The chart's own paint, copied from the component the closing screenshot
  // shows: ev-ui src/RadarChartCore.jsx. Your shape and theirs are both filled
  // and translucent, and where they lie over each other the two fills make a
  // third colour by themselves — that overlap IS the live picture of agreement,
  // so nothing here draws a separate "both" polygon on top of it.
  var YOU_FILL  = "rgba(124, 107, 158, 0.40)";
  var LEAD_FILL = "rgba(110, 210, 140, 0.30)";
  // And where you and they picked the SAME answer on a spoke, the live chart
  // paints that dot yellow and draws it one eighth larger. That is the product's
  // own sign for "you two agree here", so the episode uses it and no other.
  var SAME_C = "#FED12E";
  var SAME_R = 8 / 7;
  // The one red this episode uses, for both halves of the comparison: the
  // arrows that pick out where the two of them agree, and the line that marks
  // where they do not. Two reds would read as two different kinds of remark.
  var MARK_C = "#FF6B52";

  // The eight topics of the live Green Lens, in lens order, from
  // EV-CompassV2 src/components/admin/GreenLensCoverage.jsx. Two of the real
  // short titles are trimmed to fit a spoke label — "Public Safety Approach"
  // and "Economic Development Incentives" — and nothing else is changed. An
  // invented topic set would teach the viewer a product that does not exist.
  var LABELS = ["Housing", "Homelessness", "Residential Zoning", "Civil Rights",
                "Public Safety", "Voting Rights", "Economic Development",
                "Transportation"];
  // Every spoke on the compass is answered. A topic drawn as a spoke, with its
  // name printed around the ring, and then no dot on it, says the viewer
  // declined to answer a question the picture is still asking — which is not
  // what the narration means by "the issues you never put on your list". Those
  // issues are not spokes at all, so they are drawn as the chips below,
  // outside the ring, and every spoke carries a dot.
  // The questionnaire offers more issues than the compass ends up carrying.
  // A list where every row gets ticked is not a choice, and "you choose which
  // issues" is the line it plays under. Two of these are offered, passed over,
  // and never become spokes — so they are NOT in LABELS, and nothing on the
  // compass refers to them.
  var ASK_ORDER = ["Housing", "Homelessness", "Immigration", "Residential Zoning",
                   "Civil Rights", "Public Safety", "Gun rights", "Voting Rights",
                   "Economic Development", "Transportation"];
  // Which rows those are is read back off LABELS rather than written down a
  // second time, so a topic cannot be a spoke and a skipped row at once.
  var ASK_SKIP = ASK_ORDER
    .map(function (n, i) { return LABELS.indexOf(n) < 0 ? i : -1; })
    .filter(function (i) { return i >= 0; });
  // The question the second card asks. It is the question the viewer's choice
  // actually answers, and it is longer than the card is wide, so the card
  // wraps it and grows to hold the lines.
  // "The issues you never put on your list." Two of them are the rows the
  // viewer visibly passed over on the questionnaire, so the chapter that says
  // this and the chapter that showed it name the same issues. Naming three
  // other topics here made the earlier scene a loose end.
  var OFF_LIST = ASK_SKIP.map(function (i) { return ASK_ORDER[i]; })
                   .concat(["Parks and recreation"]);
  var HOUSING_Q = "What should the government's approach be to develop affordable housing?";
  // The four most-cited reference hosts in the live table. Written here rather
  // than inside the draw, because the card's height is measured from them.
  var HOSTS = ["ontheissues.org", "en.wikipedia.org", "congress.gov",
               "leginfo.legislature.ca.gov"];
  // Every value sits ON a rung. A spoke records WHICH answer was picked off a
  // ladder of solutions, so a dot between two rungs would be an answer nobody
  // was offered — and chapter 4 opens one of these spokes up and names its
  // rungs, so a value off the ladder there is visibly wrong.
  var STOPS = 5;
  function rung(k) { return 0.18 + k * 0.18; }     // 0.18 .. 0.90
  var YOU    = [rung(3), rung(2), rung(3), rung(4), rung(1), rung(3), rung(2), rung(2)];
  var LEADER = [rung(1), rung(2), rung(1), rung(4), rung(3), rung(3), rung(0), rung(0)];

  // The five Housing answers, in ladder order from the centre outward. A spoke
  // records WHICH solution you want, not how strongly you want it, so these are
  // five solutions and not five intensities. Chapter 3 offers them on a card,
  // chapter 4 opens the spoke up and names its two ends from this same list.
  var HOUSING = ["Let the market decide",
                 "Cut the rules that block building",
                 "Require affordable units in new builds",
                 "Public money for low-income housing",
                 "The government builds it"];
  // The rung this viewer chose on Housing, written down once. The card
  // highlights HOUSING[PICKED], the compass puts the Housing dot at
  // rung(PICKED), and chapter 4 travels its dot to the same place.
  var PICKED = 3;
  // And the rung the compared civic leader sits on, which chapter 7 opens up.
  // It is read back off LEADER so the ladder and the shape cannot disagree.
  var LEADER_RUNG = Math.round((LEADER[0] - 0.18) / 0.18);
  // Three spokes where the two of them landed on the same answer: 1, 3 and 5.
  function sameAnswer(i) {
    return YOU[i] > 0 && LEADER[i] > 0 && Math.abs(YOU[i] - LEADER[i]) < 1e-6;
  }

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

  // An entrance, unless the thing is already on screen.
  //
  // A scene is one narration line, so a single idea runs across four or five
  // cuts and the picture under them barely changes. Every draw function fades
  // its contents in from its own t=0, which is right the first time and wrong
  // every time after: the ballot the viewer is already looking at blinks out
  // and fades back in at the cut, four times in the first thirty seconds. A
  // scene that carries on from the one before it says `continues: true`, and
  // everything that was already there is simply there.
  //
  // What is NEW in the scene keeps its own fade. That is the whole point of
  // the flag: the party letters can arrive on a ballot that does not.
  function arrive(scene, t, t0, dur) {
    return scene.continues ? 1 : fade(t, t0, dur);
  }

  // The same idea for one thing inside a scene rather than the whole scene.
  //
  // A scene that carries on still has to say WHEN each thing on it arrived,
  // and the honest answer for everything already on screen is "before this
  // scene started", which is zero. Read as the start of a fade, zero makes the
  // thing ramp up from nothing again at the cut — the very blink `continues`
  // was added to stop, and the reason the party letters kept respawning. So
  // only a POSITIVE time animates; zero is simply there.
  function since(t, t0, dur) { return t0 > 0 ? fade(t, t0, dur) : 1; }

  // Shared geometry: centre, radius, six axes, held above the lower third.
  function geom(W, H) {
    // Eight spokes, and eight labels want more room around the circle than six
    // did, so the radius comes in a little. The centre sits RIGHT of where six
    // spokes needed it, not left: the eighth label is the long one on the
    // upper left, and at the old centre "Transportation" ran into the scene
    // headline, which is drawn at the same height on the same line.
    return { cx: W * 0.66, cy: H * 0.40, r: Math.min(W, H) * 0.235, n: 8 };
  }
  function axisPoint(g, i, frac) {
    var a = -Math.PI / 2 + (i / g.n) * Math.PI * 2;
    return { x: g.cx + Math.cos(a) * g.r * frac, y: g.cy + Math.sin(a) * g.r * frac };
  }
  // A spoke's name, outside its tip. Two of the eight are two words long and
  // would otherwise run off the frame or across the circle, so a long name is
  // broken at its last space and set on two lines.
  function label(ctx, g, i, H, color, alpha) {
    var p = axisPoint(g, i, 1.14);
    var size = Math.round(H * 0.026);
    var text = LABELS[i], lines = [text];
    if (text.length > 13) {
      var cut = text.lastIndexOf(" ");
      if (cut > 0) lines = [text.slice(0, cut), text.slice(cut + 1)];
    }
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = color;
    ctx.font = "600 " + size + "px " + FONT;
    // Straight up or straight down, centre it; otherwise push it away from the
    // circle so the name never sits on top of its own spoke.
    var dx = p.x - g.cx;
    ctx.textAlign = Math.abs(dx) < g.r * 0.2 ? "center" : (dx < 0 ? "right" : "left");
    ctx.textBaseline = "middle";
    var top = p.y - (lines.length - 1) * size * 0.6;
    for (var k = 0; k < lines.length; k++) {
      ctx.fillText(lines[k], p.x, top + k * size * 1.2);
    }
    ctx.restore();
  }
  // A spoke with no answer on it is not a corner of the shape. The narration
  // is explicit about this — "the issues you never put on your list stay off
  // the picture entirely" — and a radar that runs such a spoke in to the
  // centre says the opposite: it draws a deep notch, which reads as a strong
  // opinion of zero rather than as a topic that is not on the list. So a zero
  // is skipped and the shape closes across it.
  function polygon(ctx, g, vals, frac) {
    ctx.beginPath();
    var first = true;
    for (var i = 0; i < g.n; i++) {
      if (!vals[i]) continue;
      var p = axisPoint(g, i, vals[i] * (frac == null ? 1 : frac));
      if (first) { ctx.moveTo(p.x, p.y); first = false; } else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
  }
  function axes(ctx, g, H, upTo) {
    ctx.save();
    ctx.lineWidth = Math.max(1, H * 0.0035);
    ctx.strokeStyle = GRID;
    for (var i = 0; i < g.n; i++) {
      if (i >= upTo) break;
      var tip = axisPoint(g, i, 1);
      ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    }
    ctx.restore();
  }
  // `agreed` paints the dot the live chart's yellow and swells it, which is
  // what the product does on a spoke where you and they picked the same answer.
  function dot(ctx, g, i, frac, H, color, agreed) {
    var d = axisPoint(g, i, frac);
    ctx.save();
    ctx.fillStyle = agreed ? SAME_C : color;
    ctx.beginPath();
    ctx.arc(d.x, d.y, H * 0.013 * (agreed ? SAME_R : 1), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // A short arrow along spoke `i`, running OUTWARD and stopping at the dot at
  // `frac`. Outward, not inward: the spoke's name sits just past the rim, and
  // an arrow coming in from outside crosses it.
  function arrowTo(ctx, g, i, frac, H, alpha) {
    var tail = axisPoint(g, i, Math.max(0.08, frac - 0.44));
    var head = axisPoint(g, i, Math.max(0.06, frac - 0.16));
    var ang = Math.atan2(head.y - tail.y, head.x - tail.x);
    var hs = H * 0.024;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = MARK_C;
    ctx.fillStyle = MARK_C;
    ctx.lineWidth = Math.max(2, H * 0.007);
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(head.x, head.y); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(head.x + Math.cos(ang) * hs, head.y + Math.sin(ang) * hs);
    ctx.lineTo(head.x + Math.cos(ang + 2.5) * hs, head.y + Math.sin(ang + 2.5) * hs);
    ctx.lineTo(head.x + Math.cos(ang - 2.5) * hs, head.y + Math.sin(ang - 2.5) * hs);
    ctx.closePath(); ctx.fill();
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
    var lines = wrapLines(ctx, text, maxW);
    for (var i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + i * lineH);
    return lines.length;
  }
  // The same split, without drawing. A box that grows to hold its question has
  // to know how many lines that question took before it draws the box.
  function wrapLines(ctx, text, maxW) {
    var words = text.split(" "), out = [], line = "";
    for (var i = 0; i < words.length; i++) {
      var next = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(next).width > maxW && line) { out.push(line); line = words[i]; }
      else { line = next; }
    }
    if (line) out.push(line);
    return out;
  }

  // Chapter 4: one spoke, one dot, one idea.
  //
  // This scene gets its own geometry rather than reusing geom(). A single
  // upward spoke drawn at the six-axis scale is a short stub near the top of
  // the frame with its label clipped off the edge — there is no reason for one
  // spoke to be as small as one of six.
  function spokeGeom(W, H) { return { cx: W * 0.60, cy: H * 0.62, r: H * 0.40 }; }

  // The compass this one spoke belongs to, small, in the corner: the ring, all
  // eight axes, and the one being opened up drawn bright. Without it the
  // chapter is four scenes of a line and a dot, and the viewer has no reason
  // to connect them to the shape they were just shown. The dot lands here at
  // the same fraction as on the large spoke, so the large one reads as this
  // one, enlarged.
  function miniCompass(ctx, t, W, H, scene, travel) {
    var m = { cx: W * 0.165, cy: H * 0.30, r: Math.min(W, H) * 0.105, n: 8 };
    ctx.save();
    ctx.globalAlpha = arrive(scene, t, 0.1, 0.6);

    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(1, H * 0.0025);
    ctx.beginPath(); ctx.arc(m.cx, m.cy, m.r, 0, Math.PI * 2); ctx.stroke();
    for (var i = 0; i < m.n; i++) {
      var tip = axisPoint(m, i, 1);
      ctx.strokeStyle = i === 0 ? MUTED : GRID;
      ctx.lineWidth = Math.max(1, H * (i === 0 ? 0.0045 : 0.0025));
      ctx.beginPath(); ctx.moveTo(m.cx, m.cy); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    }
    if (travel > 0) {
      ctx.fillStyle = YOU_C;
      var d = axisPoint(m, 0, travel);
      ctx.beginPath(); ctx.arc(d.x, d.y, H * 0.011, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = MUTED;
    ctx.font = "700 " + Math.round(H * 0.019) + "px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("YOUR COMPASS", m.cx, m.cy + m.r + H * 0.052);
    ctx.restore();
  }

  // `stage` says how far through the idea this scene is, the way
  // drawCompassBuilding does. Without it four consecutive scenes each replayed
  // the dot sliding out from zero, so the viewer watched the same reveal four
  // times across four cuts. A scene that continues the one before it starts
  // where that one ended.
  //
  //   name      the issue is named, beside the compass it belongs to
  //   ladder    the line draws out, the stops appear, the answers are named
  //   spectrum  the dot moves to one end of the ladder, then to the other
  //   hold      it settles on the answer this viewer picked
  //
  // The five answers are printed ON the rungs rather than only at the two
  // ends. The line says "the realistic answers to it set out in order along
  // the line", and two labels with three unnamed ticks between them is not
  // that. It also makes the next beat legible: when the dot moves, the viewer
  // can read what it moved to.
  //
  // A spoke records WHICH answer you picked off a ladder of solutions -- it
  // does not measure how strongly you feel about the issue. Labelling the ends
  // "barely moves me" and "decides my vote", as this did, taught the viewer
  // the wrong model of the product.
  function drawSpokeGrowing(ctx, t, W, H, scene) {
    var g = spokeGeom(W, H), accent = scene.accent || "#FFD426";
    var stage = scene.stage || "ladder";
    var at = ["name", "ladder", "spectrum", "hold"].indexOf(stage);
    var tipY = g.cy - g.r * rung(STOPS - 1);
    function rungY(k) { return g.cy - g.r * rung(k); }

    // Where the dot is, and which answer is lit, at this moment of this beat.
    //
    // The seconds are read off the recording. In the spectrum beat the
    // narration names one end of the ladder and then the other, so the dot
    // goes to each as it is named: "letting the market decide" lands at 7.0s,
    // "the government building low-income housing" at 10.1s. Moving the dot
    // with the words is the whole point of the beat -- the viewer watches the
    // line change length as the answer changes, which is what choosing a
    // different answer does.
    var at2 = -1, pos = null;
    if (at === 2) {
      if (t >= 9.4) { at2 = STOPS - 1; pos = rung(0) + ease((t - 9.4) / 1.2) * (rung(STOPS - 1) - rung(0)); }
      else if (t >= 5.7) { at2 = 0; pos = rung(0); }
    } else if (at >= 3) {
      at2 = PICKED;
      pos = rung(STOPS - 1) + ease(t / 1.4) * (rung(PICKED) - rung(STOPS - 1));
    }

    miniCompass(ctx, t, W, H, scene, at >= 3 ? rung(PICKED) : 0);

    // the issue's name
    ctx.save();
    ctx.globalAlpha = at === 0 ? arrive(scene, t, 0.3, 0.5) : 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = FG;
    ctx.font = "600 " + Math.round(H * 0.050) + "px " + FONT;
    ctx.fillText(scene.issue || LABELS[0], g.cx, tipY - H * 0.075);
    ctx.restore();

    if (at < 1) return;

    // the axis, drawn out from the centre as "a line running out from a
    // centre point" is said
    var grow = at === 1 ? ease((t - 4.4) / 1.4) : 1;
    if (grow <= 0) return;
    ctx.save();
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(1, H * 0.0045);
    ctx.beginPath();
    ctx.moveTo(g.cx, g.cy);
    ctx.lineTo(g.cx, g.cy + (tipY - g.cy) * grow);
    ctx.stroke();
    ctx.restore();

    // the stops, so "further out" reads as a scale and not a drift
    for (var k = 0; k < STOPS; k++) {
      var ta = at === 1 ? fade(t, 6.4 + k * 0.08, 0.4) : 1;
      if (ta <= 0) continue;
      ctx.save();
      ctx.globalAlpha = ta * 0.8;
      ctx.strokeStyle = GRID;
      ctx.lineWidth = Math.max(1, H * 0.0045);
      ctx.beginPath();
      ctx.moveTo(g.cx - W * 0.016, rungY(k)); ctx.lineTo(g.cx + W * 0.016, rungY(k));
      ctx.stroke();
      ctx.restore();
    }

    // the five answers, named, one at a time
    for (var m = 0; m < STOPS; m++) {
      var la = at === 1 ? fade(t, 7.4 + m * 0.55, 0.4) : 1;
      if (la <= 0) continue;
      var lit = m === at2;
      ctx.save();
      ctx.globalAlpha = la * (at2 < 0 || lit ? 1 : 0.42);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = lit ? FG : MUTED;
      ctx.font = (lit ? "600 " : "500 ") + Math.round(H * 0.027) + "px " + FONT;
      ctx.fillText(HOUSING[m], g.cx + W * 0.032, rungY(m));
      ctx.restore();
    }

    if (pos == null) return;

    // the dot, and the length of line behind it -- the thing that changes
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.cx, g.cy - g.r * pos);
    ctx.strokeStyle = YOU_C; ctx.lineWidth = H * 0.010; ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = YOU_C;
    ctx.beginPath(); ctx.arc(g.cx, g.cy - g.r * pos, H * 0.016, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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

  // Chapter 0: the polling place.
  //
  // The line is "you get to your polling booth, work your way down your
  // ballot", which is a journey and then a task. So the scene is both: the
  // door first, then what is behind it. `enter` marks the one scene that
  // starts outside; the three after it are already inside and carry on with
  // the same booth, so the chapter never cuts back to the street.
  //
  // The offices are real and the names are not. A ballot's offices are public
  // facts; its candidates are living people, and inventing eight of them to
  // illustrate a point about ballots would put a party letter beside a
  // real-sounding name. So the OFFICES are what the viewer can read, and the
  // names are bars — which is also what the narration says happens: the names
  // stop meaning anything, while the races are still right there.
  var OFFICES = ["President", "Governor", "U.S. Senator", "U.S. Representative",
                 "State Assembly", "County Assessor", "Superior Court Judge",
                 "Water District Board"];
  // Party colours, as a ballot prints them: a letter in a coloured disc beside
  // the name. Ordinary political blue and red, not the EV accent — the point
  // of the chapter is that this letter is the thing the viewer reaches for,
  // so it has to look like that thing and not like the episode's own colour.
  var DEM = "#2563EB", REP = "#DC2626";

  var ENTER = 3.4;          // seconds outside, before the door
  var SWAP  = 0.7;          // how long the cut from street to booth takes

  // A ballot paper dropping into a ballot box: the sign over the door, and
  // again on the box standing inside. Sized by `s`, so one function serves
  // the small pictogram and the larger box on the floor.
  function ballotBox(ctx, cx, cy, s, color, withPaper) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(1.5, s * 0.07);
    roundRect(ctx, cx - s * 0.5, cy - s * 0.26, s, s * 0.76, s * 0.10);
    ctx.stroke();
    ctx.beginPath();                                   // the slot, inside the lid
    ctx.moveTo(cx - s * 0.20, cy - s * 0.12);
    ctx.lineTo(cx + s * 0.20, cy - s * 0.12);
    ctx.lineWidth = Math.max(2, s * 0.09);
    ctx.stroke();
    if (withPaper) {                                   // the sheet going in
      ctx.lineWidth = Math.max(1.5, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.17, cy - s * 0.34);
      ctx.lineTo(cx - s * 0.17, cy - s * 0.86);
      ctx.lineTo(cx + s * 0.21, cy - s * 0.86);
      ctx.lineTo(cx + s * 0.21, cy - s * 0.34);
      ctx.stroke();
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.09, cy - s * 0.70); ctx.lineTo(cx + s * 0.13, cy - s * 0.70);
      ctx.moveTo(cx - s * 0.09, cy - s * 0.56); ctx.lineTo(cx + s * 0.13, cy - s * 0.56);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Outside: a lit doorway with the sign over it.
  function drawEntrance(ctx, t, W, H, scene, alpha) {
    var accent = scene.accent || "#FFD426";
    var dx = W * 0.47, dw = W * 0.17, dy = H * 0.34, dh = H * 0.56;
    ctx.save();
    ctx.globalAlpha = alpha * fade(t, 0.05, 0.5);

    ctx.strokeStyle = GRID;                            // the ground line
    ctx.lineWidth = Math.max(2, H * 0.005);
    ctx.beginPath();
    ctx.moveTo(W * 0.04, dy + dh); ctx.lineTo(W * 0.96, dy + dh); ctx.stroke();

    ctx.fillStyle = "#1A1A20";                         // the doorway, open
    roundRect(ctx, dx, dy, dw, dh, H * 0.012); ctx.fill();
    ctx.strokeStyle = MUTED;
    ctx.lineWidth = Math.max(2, H * 0.006);
    ctx.stroke();
    var glow = ctx.createLinearGradient(0, dy, 0, dy + dh);
    glow.addColorStop(0, "rgba(255, 212, 38, 0.18)");  // warmer inside than out
    glow.addColorStop(1, "rgba(255, 212, 38, 0.02)");
    ctx.fillStyle = glow;
    roundRect(ctx, dx, dy, dw, dh, H * 0.012); ctx.fill();

    var sw = W * 0.22, sh = H * 0.15;                  // the sign over it
    var sx = dx + dw / 2 - sw / 2, sy = H * 0.15;
    ctx.globalAlpha = alpha * fade(t, 0.35, 0.6);
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(2, H * 0.004);
    roundRect(ctx, sx, sy, sw, sh, H * 0.014); ctx.stroke();
    ballotBox(ctx, sx + sw * 0.25, sy + sh * 0.70, H * 0.085, accent, true);
    ctx.fillStyle = accent;
    ctx.font = "800 " + Math.round(H * 0.050) + "px " + FONT;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("VOTE", sx + sw * 0.46, sy + sh * 0.52);
    ctx.restore();
  }

  // Inside: the booth the figure stepped into. A curtain rail across the top,
  // a curtain gathered at each end, and a shelf for the ballot to stand on.
  function drawBooth(ctx, t, W, H, scene, alpha) {
    var lx = W * 0.26, rx = W * 0.97, rail = H * 0.06, shelf = H * 0.80;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(2, H * 0.006);
    ctx.beginPath(); ctx.moveTo(lx, rail); ctx.lineTo(rx, rail); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx, rail); ctx.lineTo(lx, shelf); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx, rail); ctx.lineTo(rx, shelf); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx, shelf); ctx.lineTo(rx, shelf); ctx.stroke();

    // The curtain is drawn as folds rather than a slab, so it reads as cloth
    // at a glance instead of as another panel.
    [[lx, 1], [rx, -1]].forEach(function (c) {
      var x0 = c[0], dir = c[1], fold = W * 0.012;
      ctx.strokeStyle = "#3A3A46";
      ctx.lineWidth = Math.max(2, H * 0.009);
      for (var k = 0; k < 4; k++) {
        var fx = x0 + dir * fold * (k + 0.6);
        ctx.beginPath();
        ctx.moveTo(fx, rail + H * 0.006);
        ctx.quadraticCurveTo(fx + dir * fold * 0.6, (rail + shelf) / 2, fx, shelf - H * 0.004);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  function drawBallot(ctx, t, W, H, scene) {
    var inside = scene.enter ? fade(t, ENTER, SWAP) : 1;
    if (inside < 1) drawEntrance(ctx, t, W, H, scene, 1 - inside);
    if (inside <= 0) return;
    drawBooth(ctx, t, W, H, scene, inside);

    // Inside the booth the clock restarts: nothing on the ballot has been
    // looked at until the figure is standing at it.
    var tt = scene.enter ? Math.max(0, t - ENTER - SWAP * 0.5) : t;
    var n = OFFICES.length;
    var x = W * 0.52, w = W * 0.30;
    var y0 = H * 0.15, rowH = H * 0.074, barH = H * 0.028;

    ctx.save();
    ctx.globalAlpha = inside * arrive(scene, tt, 0.05, 0.4);
    ctx.fillStyle = MUTED;
    ctx.font = "600 " + Math.round(H * 0.024) + "px " + FONT;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("YOUR BALLOT", x, y0 - H * 0.048);
    ctx.restore();

    ctx.save();                                        // the box, standing by
    ctx.globalAlpha = inside * arrive(scene, tt, 0.2, 0.5);
    // Clear of the curtain gathered at the booth's left edge: at W*0.335 the
    // box sat exactly on the folds and read as part of them.
    ballotBox(ctx, W * 0.385, H * 0.66, H * 0.16, MUTED, false);
    ctx.restore();

    for (var i = 0; i < n; i++) {
      var a = arrive(scene, tt, 0.15 + i * 0.16, 0.35);
      if (a <= 0) continue;
      // The further down the ballot, the less any of it means. The top three
      // races are the ones everybody can name; by the bottom the office is a
      // whisper and the name is a grey bar. That fade IS the chapter, so it is
      // drawn and not only narrated.
      var top3 = i < 3;
      // `dim` is the second the names start losing their meaning, and the
      // narration describes that while it happens -- "somewhere past the top
      // of it the names stop meaning anything". Scenes after it pass 0:
      // already dim. As a true/false flag it was a state the next cut jumped
      // to, which is half of why the ballot blinked at every cut.
      var sink = scene.dim == null ? 0 : since(tt, scene.dim, 1.6);
      var known = 1 - sink * (1 - Math.max(0.16, 1 - i / (n - 1)));
      var yRow = y0 + i * rowH;

      ctx.save();
      ctx.globalAlpha = inside * a * (top3 ? 1 : Math.max(0.3, known));
      ctx.fillStyle = top3 ? FG : MUTED;
      ctx.font = (top3 ? "700 " : "500 ") + Math.round(H * (top3 ? 0.027 : 0.022)) + "px " + FONT;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(OFFICES[i], x, yRow - H * 0.008);
      ctx.restore();

      ctx.save();                                      // the name, unreadable
      ctx.globalAlpha = inside * a * known;
      ctx.fillStyle = top3 ? FG : DIM;
      ctx.fillRect(x + W * 0.038, yRow + H * 0.006,
                   w * (0.46 + 0.34 * ((i * 37) % 10) / 10), barH);
      ctx.restore();

      if (scene.letters != null) {
        // `letters` is the second the first disc lands. The scene that brings
        // them in gives a time; the scenes after it pass 0, because by then
        // they are simply on the ballot. This is what `continues` is for: the
        // letters arrive on a ballot that does not.
        var la = since(tt, scene.letters > 0 ? scene.letters + i * 0.10 : 0, 0.3);
        if (la <= 0) continue;
        var dem = (i * 37) % 10 < 5;
        var cy = yRow + H * 0.006 + barH / 2;
        var cxx = x + W * 0.016;
        ctx.save();
        ctx.globalAlpha = inside * la;
        ctx.fillStyle = dem ? DEM : REP;
        ctx.beginPath(); ctx.arc(cxx, cy, H * 0.020, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "800 " + Math.round(H * 0.025) + "px " + FONT;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(dem ? "D" : "R", cxx, cy + H * 0.001);
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

  // Chapter 3: calibration.
  //
  // The narration says the compass is built "through a quick questionnaire",
  // and then says what the questionnaire asks: which issues belong on your
  // list, and where you land on each one. So the chapter shows the
  // questionnaire and the compass at the same time, side by side, and every
  // answer on the left puts something on the right. A compass that simply
  // appeared would leave the questionnaire as a word.
  //
  // Chapter 5 builds the same compass again, deliberately: chapter 3 is what
  // calibrating PRODUCES, chapter 4 opens up one spoke, and chapter 5 is the
  // construction. They must not look alike, which is why only this one carries
  // the card.
  //
  //   ask     the card alone: a question, its answers, one of them chosen
  //   names   the ring and spokes appear, and the eight topics land on them
  //   dots    your answer lands on each spoke in turn
  //   choose  the outline closes around the dots
  //   shape   the card goes and the finished shape is filled
  //

  function ring(ctx, g, H, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(1, H * 0.003);
    ctx.beginPath(); ctx.arc(g.cx, g.cy, g.r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // The questionnaire card. `rows` is what is being answered; `lit` is the row
  // the cursor is resting on, `ticked` how many have been answered, and
  // `skips` the rows the viewer passed over.
  //
  // The card has no kicker. "FIRST" and "SECOND" over two of these said out
  // loud what the narration was already saying, in the accent colour, at the
  // top of the one thing on screen the viewer is meant to read.
  function card(ctx, t, W, H, scene, opts) {
    var x = W * 0.045, w = W * 0.305, y = H * 0.14, pad = H * 0.034;
    var BOTTOM = H * 0.95;              // the card may grow down to here

    ctx.save();
    // The question is a real question and runs longer than the card is wide,
    // so it is wrapped FIRST and the card is built around the lines it took.
    // Set on one line it ran out through the right-hand edge of its own box.
    ctx.font = "600 " + Math.round(H * 0.030) + "px " + FONT;
    var qLines = wrapLines(ctx, opts.question, w - pad * 2);
    var head = pad + H * 0.052 + qLines.length * H * 0.040;

    // The rows take what is left. Ten issues at the row height five answers
    // use would put the last of them under the bottom of the frame, so a long
    // list tightens rather than overflowing.
    var rowH = Math.min(H * 0.072, (BOTTOM - y - head - pad) / opts.rows.length);
    var h = head + opts.rows.length * rowH + pad;

    ctx.globalAlpha = opts.alpha;
    ctx.fillStyle = "#17171C";
    roundRect(ctx, x, y, w, h, H * 0.016); ctx.fill();
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(1, H * 0.0035);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = FG;
    ctx.font = "600 " + Math.round(H * 0.030) + "px " + FONT;
    for (var q = 0; q < qLines.length; q++) {
      ctx.fillText(qLines[q], x + pad, y + pad + H * 0.040 + q * H * 0.040);
    }

    for (var i = 0; i < opts.rows.length; i++) {
      var ry = y + head + i * rowH;
      // Two kinds of question, and they must not look alike. "Which issues
      // belong on your list" takes many answers and gets boxes you tick; "where
      // do you land on housing" takes exactly one and gets a radio, because a
      // ladder of solutions rendered as four ticks says you chose four of them.
      var on = i === opts.lit;
      var done = opts.single ? i === opts.pick
               : (i < opts.ticked && (opts.skips || []).indexOf(i) < 0);
      ctx.globalAlpha = opts.alpha * (on || done ? 1 : 0.55);
      if (on) {                                        // the cursor resting
        ctx.fillStyle = "rgba(255, 212, 38, 0.12)";
        roundRect(ctx, x + pad * 0.5, ry - H * 0.004, w - pad, rowH - H * 0.012, H * 0.010);
        ctx.fill();
      }
      // the box you tick, filled once answered
      var bx = x + pad, by = ry + H * 0.008, bs = H * 0.026;
      ctx.strokeStyle = done ? YOU_C : MUTED;
      ctx.lineWidth = Math.max(1.5, H * 0.003);
      if (opts.single) {
        ctx.beginPath();
        ctx.arc(bx + bs / 2, by + bs / 2, bs / 2, 0, Math.PI * 2);
        ctx.stroke();
        if (done) {
          ctx.fillStyle = YOU_C;
          ctx.beginPath();
          ctx.arc(bx + bs / 2, by + bs / 2, bs * 0.30, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        roundRect(ctx, bx, by, bs, bs, H * 0.006);
        ctx.stroke();
        if (done) {
          ctx.fillStyle = YOU_C;
          roundRect(ctx, bx, by, bs, bs, H * 0.006); ctx.fill();
          ctx.strokeStyle = "#17171C";
          ctx.lineWidth = Math.max(2, H * 0.004);
          ctx.beginPath();
          ctx.moveTo(bx + bs * 0.24, by + bs * 0.52);
          ctx.lineTo(bx + bs * 0.44, by + bs * 0.72);
          ctx.lineTo(bx + bs * 0.78, by + bs * 0.28);
          ctx.stroke();
        }
      }
      ctx.fillStyle = done ? FG : MUTED;
      ctx.font = "500 " + Math.round(H * 0.024) + "px " + FONT;
      ctx.fillText(opts.rows[i], bx + bs + H * 0.020, ry + H * 0.030);
    }
    ctx.restore();
  }

  function drawCalibrate(ctx, t, W, H, scene) {
    var g = geom(W, H);
    var stage = scene.stage || "ask";
    var at = ["ask", "names", "dots", "choose", "shape"].indexOf(stage);

    // ---- the card -------------------------------------------------------
    var cardAlpha = stage === "shape" ? 1 - fade(t, 0.1, 0.7) : arrive(scene, t, 0.05, 0.5);
    if (cardAlpha > 0) {
      if (stage === "ask") {
        // The cursor walks down the answers and settles on one of them.
        var walk = Math.min(HOUSING.length - 1, Math.floor(ease(t / 2.6) * HOUSING.length));
        var chosen = t > 3.0;
        card(ctx, t, W, H, scene, {
          alpha: cardAlpha, question: HOUSING_Q,
          rows: HOUSING, single: true,
          lit: chosen ? PICKED : walk, pick: chosen ? PICKED : -1
        });
      } else if (stage === "names") {
        card(ctx, t, W, H, scene, {
          alpha: cardAlpha,
          question: "What issues do you prioritize?",
          rows: ASK_ORDER, lit: -1, skips: ASK_SKIP,
          ticked: Math.max(0, Math.floor((t - 0.60) / 0.38) + 1)
        });
      } else {
        card(ctx, t, W, H, scene, {
          alpha: cardAlpha, question: HOUSING_Q,
          rows: HOUSING, single: true, lit: PICKED, pick: PICKED
        });
      }
    }

    if (at < 1) return;

    // ---- the compass, built out of those answers ------------------------
    var frame = stage === "names" ? arrive(scene, t, 0.15, 0.6) : 1;
    ring(ctx, g, H, frame * 0.9);
    axes(ctx, g, H, g.n);

    // Each name lands as its own answer is ticked on the card, so the two
    // halves of the frame are plainly the same act. Which row that is comes
    // from ASK_ORDER, because two of the rows never become spokes.
    for (var i = 0; i < g.n; i++) {
      var row = ASK_ORDER.indexOf(LABELS[i]);
      var la = stage === "names" ? fade(t, 0.65 + row * 0.38, 0.3) : 1;
      if (la <= 0) continue;
      label(ctx, g, i, H, MUTED, la);
    }

    if (at < 2) return;

    // Your answers land on the spokes one at a time: "for each topic, where
    // do you actually land".
    var upTo = stage === "dots" ? Math.floor((t - 0.45) / 0.62) + 1 : g.n;
    for (var k = 0; k < g.n; k++) {
      if (k >= upTo || YOU[k] === 0) continue;
      dot(ctx, g, k, YOU[k], H, YOU_C);
    }

    if (at < 3) return;

    // The outline closes, and only in the last beat is it filled — that fill
    // is "what comes out the other side".
    var grow = stage === "choose" ? ease((t - 3.0) / 2.2) : 1;
    if (grow <= 0) return;
    ctx.save();
    ctx.globalAlpha = grow;
    if (stage === "shape") {
      // "What comes out the other side" -- the answers become one shape, so
      // the colour floods in rather than being there at the cut.
      ctx.globalAlpha = fade(t, 0.5, 1.6);
      ctx.fillStyle = YOU_FILL;
      polygon(ctx, g, YOU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = YOU_C;
    ctx.lineWidth = Math.max(2, H * 0.0055);
    polygon(ctx, g, YOU); ctx.stroke();
    ctx.restore();
  }
  // Chapter 5: the shape assembles. scene.stage picks how far along it is.
  function drawCompassBuilding(ctx, t, W, H, scene) {
    var g = geom(W, H), accent = scene.accent || "#FFD426";
    var stage = scene.stage || "spokes";

    var shown = stage === "spokes" ? Math.min(g.n, Math.floor(ease(t / 2.4) * g.n + 0.001)) : g.n;
    axes(ctx, g, H, shown);
    for (var i = 0; i < shown; i++) label(ctx, g, i, H, MUTED);

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
      label(ctx, g, i, H, MUTED);
    }

    // Your shape, always present: filled and outlined exactly as the live
    // chart fills and outlines it.
    ctx.save();
    ctx.fillStyle = YOU_FILL;
    polygon(ctx, g, YOU); ctx.fill();
    ctx.strokeStyle = YOU_C;
    ctx.lineWidth = Math.max(2, H * 0.0055);
    ctx.stroke();
    ctx.restore();

    if (stage === "alone") {
      for (var d0 = 0; d0 < g.n; d0++) if (YOU[d0] > 0) dot(ctx, g, d0, YOU[d0], H, YOU_C);
      return;
    }

    // Theirs over yours: filled, not a dashed outline. A dashed line reads as
    // "provisional", and a researched record is the opposite of provisional.
    // Two translucent fills over one another make the third colour that the
    // live chart makes, and that shared area is the picture of agreement.
    var appear = stage === "second" ? fade(t, 0.3, 1.2) : 1;
    ctx.save();
    ctx.globalAlpha = appear;
    ctx.fillStyle = LEAD_FILL;
    polygon(ctx, g, LEADER); ctx.fill();
    ctx.strokeStyle = LEAD_C;
    ctx.lineWidth = Math.max(2, H * 0.0045);
    ctx.stroke();
    ctx.restore();

    // The dots go on last so neither fill dims them. A spoke where the two of
    // them chose the same answer carries one yellow dot, not two overlapping
    // ones — the same thing the live chart draws.
    for (var d1 = 0; d1 < g.n; d1++) {
      var agreed = sameAnswer(d1);
      if (LEADER[d1] > 0 && !agreed) dot(ctx, g, d1, LEADER[d1], H, LEAD_C);
      if (YOU[d1] > 0) {
        dot(ctx, g, d1, YOU[d1], H, YOU_C, agreed && appear > 0.6);
      }
    }

    // "Where the two shapes cover the same ground, you agree." Three spokes
    // carry the live chart's yellow agreement dot, and three small yellow dots
    // on a chart holding two filled shapes are easy to miss, so an arrow runs
    // out to each one as the words are said — 2.1s in, which is where "the
    // same ground" lands on the recording.
    if (stage === "overlap") {
      var shown = 0;
      for (var s0 = 0; s0 < g.n; s0++) {
        if (!sameAnswer(s0)) continue;
        var aa = fade(t, 2.1 + shown * 0.35, 0.4);
        shown++;
        if (aa > 0) arrowTo(ctx, g, s0, YOU[s0], H, aa);
      }
    }

    if (stage === "gap") {
      // the one spoke where the viewer reaches well past the leader
      var a = axisPoint(g, 0, LEADER[0]), b = axisPoint(g, 0, YOU[0]);
      ctx.save();
      ctx.globalAlpha = fade(t, 0.2, 0.8);
      ctx.strokeStyle = MARK_C;
      ctx.lineWidth = Math.max(3, H * 0.010);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.fillStyle = MARK_C;
      ctx.font = "600 " + Math.round(H * 0.028) + "px " + FONT;
      ctx.textAlign = "center";
      ctx.fillText("different answers", (a.x + b.x) / 2 + W * 0.085, (a.y + b.y) / 2);
      ctx.restore();
    }

    // "The issues you never put on your list stay off the picture entirely."
    // They are not faint spokes — they are not spokes. So they sit outside the
    // ring as named chips with nothing joining them to it, which is what being
    // off the picture looks like.
    if (stage === "empty") {
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = "500 " + Math.round(H * 0.024) + "px " + FONT;
      for (var q = 0; q < OFF_LIST.length; q++) {
        var a = fade(t, 0.35 + q * 0.45, 0.4);
        if (a <= 0) continue;
        // Above the two of them, not beside them: set to the right of the
        // figures the chips read as a third thing standing next to the
        // compass rather than as a note about the compass.
        var cy2 = H * 0.40 + q * H * 0.072, cx2 = W * 0.055;
        var tw = ctx.measureText(OFF_LIST[q]).width;
        ctx.globalAlpha = a * 0.55;
        ctx.strokeStyle = DIM;
        ctx.lineWidth = Math.max(1, H * 0.003);
        ctx.setLineDash([H * 0.008, H * 0.008]);
        roundRect(ctx, cx2 - H * 0.016, cy2 - H * 0.022,
                  tw + H * 0.052, H * 0.044, H * 0.022);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = DIM;
        ctx.fillText(OFF_LIST[q], cx2 + H * 0.010, cy2);
      }
      ctx.restore();
    }
  }

  // The product's own lockup, small, in the top-left corner.
  //
  // A scene whose only graphic is a line of type is a slide, and the viewer
  // reads it instead of listening. Where the narration turns to what the
  // product does, the mark says whose idea this is without putting a sentence
  // on screen for somebody to read ahead of the voice.
  function drawBrandMark(ctx, t, W, H, scene) {
    var a = arrive(scene, t, 0.1, 0.6);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    if (logo.complete && logo.naturalWidth) {
      var w = W * 0.19;
      ctx.drawImage(logo, W * 0.065, H * 0.085, w, w * (logo.naturalHeight / logo.naturalWidth));
    } else {
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = scene.accent || "#FFD426";
      ctx.font = "800 " + Math.round(H * 0.040) + "px " + FONT;
      ctx.fillText("Empowered Compass", W * 0.065, H * 0.135);
    }
    ctx.restore();
  }

  // Chapter 7: where a stance comes from.
  //
  // This is the chapter that answers "says who?". Every beat shares one frame
  // so the four scenes build one card instead of replaying one reveal.
  //
  //   ask     the question, and nothing yet that answers it
  //   stance  the ladder, with your answer and theirs marked on it
  //   refs    the written reasoning, then the numbered references
  //   scale   the counts, over the dimmed card
  //
  // The answer is shown as the LADDER, with both dots on it, rather than as a
  // sentence. The chapter before this one spent four scenes teaching that a
  // stance IS a rung on a ladder of solutions; answering "where did their dot
  // come from" with a paragraph throws that away at the moment it pays off.
  // Your rung is purple and theirs is green, the same two colours the shapes
  // have carried since chapter 6.
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
    var RING = 0;                       // the spoke whose stance we open up
    // The counts beat clears the card away instead of holding it underneath.
    // At a tenth of its brightness a full page of words is still a page of
    // words, and three numbers that size want the frame to themselves.
    // It holds through "that is most of the work behind this tool", which is
    // still about the card, and clears in the beat of silence before the first
    // number is named.
    var sink = at === 3 ? 1 - fade(t, 1.9, 0.8) : 1;

    // The two shapes, small, on the left — the SAME picture chapter 6 ended
    // on, filled and in the product's colours. It was an outline of a stale
    // six-spoke compass, which read as a different, emptier chart than the one
    // the viewer had been looking at for a minute.
    //
    // Not in the first beat. That beat asks where their dot came from, and the
    // honest picture of a question with no answer yet is no picture.
    if (at >= 1 && sink > 0) {
      var g = { cx: W * 0.20, cy: H * 0.33, r: Math.min(W, H) * 0.135, n: 8 };
      ctx.save();
      ctx.globalAlpha = (at === 1 ? arrive(scene, t, 0.1, 0.6) : 1) * sink;
      axes(ctx, g, H, g.n);
      ctx.fillStyle = YOU_FILL;
      polygon(ctx, g, YOU); ctx.fill();
      ctx.strokeStyle = YOU_C; ctx.lineWidth = Math.max(1, H * 0.004);
      ctx.stroke();
      ctx.fillStyle = LEAD_FILL;
      polygon(ctx, g, LEADER); ctx.fill();
      ctx.strokeStyle = LEAD_C; ctx.lineWidth = Math.max(1, H * 0.004);
      ctx.stroke();
      // the one dot this chapter is about, ringed
      var p = axisPoint(g, RING, LEADER[RING]);
      ctx.fillStyle = LEAD_C;
      ctx.beginPath(); ctx.arc(p.x, p.y, H * 0.012, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha *= 0.7;
      ctx.strokeStyle = LEAD_C; ctx.lineWidth = Math.max(1, H * 0.003);
      ctx.beginPath(); ctx.arc(p.x, p.y, H * 0.028, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // The card, sized by what goes in it rather than by a number somebody
    // chose once. Written as a fixed height it was a little too short, and the
    // fourth reference printed below its own border.
    var x = W * 0.42, cw = W * 0.52, y = H * 0.075;
    var pad = W * 0.026, tx = x + pad, cy = y + H * 0.060;
    var ly = cy + H * 0.062, lrow = H * 0.060;
    var ry = ly + STOPS * lrow + H * 0.055;
    var lastRef = ry + H * 0.098 + (HOSTS.length - 1) * H * 0.046;
    var ch = lastRef + H * 0.050 - y;

    ctx.save();
    ctx.globalAlpha = (at === 0 ? fade(t, 0.3, 0.6) : 1) * sink;
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(1, H * 0.003);
    roundRect(ctx, x, y, cw, ch, H * 0.018);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = (at === 0 ? fade(t, 0.5, 0.6) : 1) * sink;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = LEAD_C;
    ctx.font = "600 " + Math.round(H * 0.025) + "px " + FONT;
    ctx.fillText("CIVIC LEADER  ·  HOUSING", tx, cy);
    ctx.restore();

    // The ladder, with both answers on it. The first beat opens on the rungs
    // alone, and the two answers land 6.1s in, under "this is where this
    // person stands" — read off the recording. Held back to the next line,
    // the viewer looked at an unanswered ladder through the whole sentence
    // that says where the person stands.
    var mark = at >= 1 ? 1 : fade(t, 6.1, 0.7);
    for (var k = 0; k < STOPS; k++) {
      var yy = ly + k * lrow;
      var mine = mark >= 0.5 && k === PICKED, theirs = mark >= 0.5 && k === LEADER_RUNG;
      ctx.save();
      ctx.globalAlpha = (at === 0 ? fade(t, 0.7 + k * 0.1, 0.4) : 1) * sink;
      if (mine || theirs) {
        ctx.globalAlpha *= mark;
        ctx.fillStyle = mine ? YOU_FILL : LEAD_FILL;
        roundRect(ctx, tx - H * 0.012, yy - H * 0.024,
                  cw - pad * 2 + H * 0.024, H * 0.050, H * 0.010);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(tx + H * 0.014, yy, H * 0.013, 0, Math.PI * 2);
      if (mine || theirs) { ctx.fillStyle = mine ? YOU_C : LEAD_C; ctx.fill(); }
      else { ctx.strokeStyle = DIM; ctx.lineWidth = Math.max(1.5, H * 0.003); ctx.stroke(); }
      ctx.fillStyle = (mine || theirs) ? FG : MUTED;
      ctx.font = ((mine || theirs) ? "600 " : "500 ") + Math.round(H * 0.026) + "px " + FONT;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(HOUSING[k], tx + H * 0.042, yy);
      if (mine || theirs) {
        ctx.fillStyle = mine ? YOU_C : LEAD_C;
        ctx.font = "700 " + Math.round(H * 0.021) + "px " + FONT;
        ctx.textAlign = "right";
        ctx.fillText(mine ? "YOU" : "THEM", x + cw - pad, yy);
      }
      ctx.restore();
    }

    // The written reasoning, as rules, then the references, as rows.
    if (at >= 2) {
      ctx.save();
      ctx.globalAlpha = (at === 2 ? fade(t, 0.1, 0.5) : 1) * sink;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = MUTED;
      ctx.font = "600 " + Math.round(H * 0.021) + "px " + FONT;
      ctx.fillText("WHY WE PLACED THEM HERE", tx, ry - H * 0.022);
      ctx.strokeStyle = GRID;
      ctx.lineWidth = Math.max(2, H * 0.008);
      ctx.lineCap = "round";
      [0.90, 0.96, 0.62].forEach(function (frac, i) {
        var yy2 = ry + i * H * 0.028;
        ctx.beginPath();
        ctx.moveTo(tx, yy2); ctx.lineTo(tx + (cw - pad * 2) * frac, yy2);
        ctx.stroke();
      });
      ctx.restore();

      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      HOSTS.forEach(function (host, i) {
        var a = (at === 2 ? fade(t, 2.6 + i * 0.55, 0.4) : 1) * sink;
        if (a <= 0) return;
        var yy3 = ry + H * 0.098 + i * H * 0.046;
        ctx.globalAlpha = a;
        ctx.fillStyle = MUTED;
        ctx.font = "600 " + Math.round(H * 0.022) + "px " + FONT;
        ctx.fillText(String(i + 1), tx, yy3);
        ctx.fillStyle = accent;
        ctx.globalAlpha = a * 0.75;
        ctx.fillRect(tx + W * 0.014, yy3 - H * 0.010, H * 0.020, H * 0.020);
        ctx.globalAlpha = a;
        ctx.fillStyle = "#6FD2E8";
        ctx.font = "500 " + Math.round(H * 0.025) + "px " + FONT;
        ctx.fillText(host, tx + W * 0.014 + H * 0.030, yy3);
      });
      ctx.restore();
    }
    // The counts, over the card turned almost all the way down. The card is
    // full by this beat -- a ladder, three rules and four references -- and at
    // anything brighter the numbers land on top of readable words and both
    // become unreadable. What is wanted underneath is the texture of a lot of
    // work, not a second thing to read.
    //
    // Measured 2026-10-10 in one query run, so the three read consistently
    // with each other; spoken as "tens of thousands", so the picture does not
    // age faster than the narration.
    if (at >= 3) {
      // Each number arrives on the words that name it, read off the
      // recording: "tens of thousands of positions" at 3.0s, "across thousands
      // of officials" at 4.5s, "tens of thousands of references" at 6.9s. Put
      // up on a cadence of their own they were all three on screen before the
      // sentence about them had started.
      var counts = [
        { at: 3.0, n: "39,000", what: "researched positions" },
        { at: 4.5, n: "4,200",  what: "civic leaders" },
        { at: 6.9, n: "69,000", what: "references behind them" }
      ];
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      counts.forEach(function (c, i) {
        var a = fade(t, c.at, 0.45);
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
    drawBrandMark: drawBrandMark,
    drawCalibrate: drawCalibrate,
    drawSpokeGrowing: drawSpokeGrowing,
    drawCompassBuilding: drawCompassBuilding,
    drawCompassOverlay: drawCompassOverlay,
    drawSourceCard: drawSourceCard,
    drawLiveScreen: drawLiveScreen
  });
  window.EVArt.ready = Promise.all([shotA.ready, logoA.ready]);
})();
