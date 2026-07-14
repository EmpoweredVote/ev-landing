// ─── Leremy Rig (idempotent, single controller) ───
(function(){
"use strict";
if (window.LeremyRig) return; // __LEREMY_IIFE__ guard: no second eval / competing interval
// ───────────────────────────────────────────────────────────
// Leremy Rig — articulated stick-figure engine
// A skeleton of joints (forward kinematics) rendered as thick
// round-capped capsules + a filled head, to match the "leremy"
// Noun Project pictogram style. Poses are procedural functions of
// time, so every loop stays perfectly on-model.
// ───────────────────────────────────────────────────────────

const D = Math.PI / 180;

// Proportions tuned to the reference figure: big head, short WIDE
// torso block, long thick limbs. Everything scales from head radius R.
const CFG = {
  R: 30,          // head radius
  gap: 9,         // neck gap between head and torso
  torsoLen: 74,   // shoulder -> hip
  torsoW: 24,     // torso bar width (slim rounded capsule)
  neckW: 22,      // narrower at the neck (taper)
  armW: 12,       // limb thickness
  upperArm: 42,
  foreArm: 40,
  legW: 14,
  thigh: 56,
  shin: 54,
  shoulderHalf: 5,  // limbs attach inside the torso capsule (no shoulder bumps)
  hipHalf: 4,
};

// angle convention: 0° points straight DOWN. +ve rotates toward
// viewer's right (clockwise on screen). vec returns a unit dir.
function vec(a) { const r = a * D; return { x: Math.sin(r), y: Math.cos(r) }; }
function add(p, v, l) { return { x: p.x + v.x * l, y: p.y + v.y * l }; }
function lerp(a, b, t) { return a + (b - a) * t; }

// Compute all joint world positions from a pose.
// pose angles are RELATIVE to the torso lean, so leaning carries limbs.
function computePose(pose, cfg = CFG, origin = { x: 0, y: 0 }) {
  const lean = pose.lean || 0;
  const hunch = pose.hunch || 0;             // forward spine curl (deg)
  const spineA = 180 + lean;                 // pelvis -> up
  const P = { x: origin.x, y: origin.y + (pose.bob || 0) };  // pelvis

  // curved spine: lower half curls a little, upper half curls fully
  const M = add(P, vec(spineA + hunch * 0.4), cfg.torsoLen * 0.55);  // mid spine
  const upA = spineA + hunch;                // upper-body direction
  const N = add(M, vec(upA), cfg.torsoLen * 0.45);          // neck
  const shoulderC = add(M, vec(upA), cfg.torsoLen * 0.35);
  const H = add(N, vec(upA + (pose.headTilt || 0)), cfg.gap + cfg.R); // head center

  const perpR = upA - 90, perpL = upA + 90;
  const sR = add(shoulderC, vec(perpR), cfg.shoulderHalf); // viewer-right shoulder
  const sL = add(shoulderC, vec(perpL), cfg.shoulderHalf); // viewer-left shoulder

  const ub = lean + hunch;                   // arms hang from the curled upper body
  const eR = add(sR, vec(ub + pose.armRU), cfg.upperArm);
  const hR = add(eR, vec(ub + pose.armRF), cfg.foreArm);
  const eL = add(sL, vec(ub + pose.armLU), cfg.upperArm);
  const hL = add(eL, vec(ub + pose.armLF), cfg.foreArm);

  const pperpR = spineA - 90, pperpL = spineA + 90;
  const hipR = add(P, vec(pperpR), cfg.hipHalf);
  const hipL = add(P, vec(pperpL), cfg.hipHalf);
  const kR = add(hipR, vec(lean + pose.legRU), cfg.thigh);
  const fR = add(kR, vec(lean + pose.legRF), cfg.shin);
  const kL = add(hipL, vec(lean + pose.legLU), cfg.thigh);
  const fL = add(kL, vec(lean + pose.legLF), cfg.shin);

  return { P, M, N, H, shoulderC, sR, sL, eR, hR, eL, hL, hipR, hipL, kR, kL, fR, fL, lean, spineA };
}

function capsule(ctx, a, b, w) {
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

// Draw the figure. opts: { color, mega, megaColor, arm ('R'|'L') for prop }
function draw(ctx, j, cfg = CFG, opts = {}) {
  const color = opts.color || "#172B4D";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  // which arm holds the prop -> draw it as the FRONT arm
  const megaArm = opts.arm || "R";

  // office chair sits BEHIND the figure (draw first so the body occludes it)
  if (opts.chair) drawChair(ctx, j, opts.chairColor || color);

  // back leg + back arm first (viewer-left = back by convention)
  capsule(ctx, j.hipL, j.kL, cfg.legW);
  capsule(ctx, j.kL, j.fL, cfg.legW);
  if (megaArm !== "L") { capsule(ctx, j.sL, j.eL, cfg.armW); capsule(ctx, j.eL, j.hL, cfg.armW); }

  // torso — tapered filled block (wide at shoulders, narrower at waist)
  drawTorso(ctx, j, cfg);

  // front leg
  capsule(ctx, j.hipR, j.kR, cfg.legW);
  capsule(ctx, j.kR, j.fR, cfg.legW);

  // front arm
  if (megaArm === "L") { capsule(ctx, j.sL, j.eL, cfg.armW); capsule(ctx, j.eL, j.hL, cfg.armW); }
  else { capsule(ctx, j.sR, j.eR, cfg.armW); capsule(ctx, j.eR, j.hR, cfg.armW); }

  // head
  ctx.beginPath();
  ctx.arc(j.H.x, j.H.y, cfg.R, 0, Math.PI * 2);
  ctx.fill();

  // megaphone in the prop hand
  if (opts.mega) {
    const hand = megaArm === "L" ? j.hL : j.hR;
    const elb = megaArm === "L" ? j.eL : j.eR;
    drawMegaphone(ctx, hand, elb, j.H, opts.megaColor || "#FFD426");
  }

  // open book between the hands, tilted for a reading perspective
  if (opts.book) {
    const mx = (j.hR.x + j.hL.x) / 2, my = (j.hR.y + j.hL.y) / 2;
    drawBook(ctx, mx, my, color, -0.24);
  }

  // Charlie Brown exhaustion swirl over the head
  if (opts.swirl) drawSwirl(ctx, j.H, cfg.R, color, opts.time || 0);

  // laptop resting on the knees
  if (opts.laptop) drawLaptop(ctx, j.kR, j.kL, color);

  // desk in FRONT of the figure (draw last so it sits over the legs)
  if (opts.desk) drawDesk(ctx, j, opts.deskColor || color, opts.screenColor);
}

// office swivel chair, seen in profile behind a seated figure facing right.
// backrest rises up-and-back (left); a post drops to a splayed castor base.
function drawChair(ctx, j, color) {
  const P = j.P;                       // pelvis = seat center
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  // seat pad
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(P.x - 26, P.y + 12); ctx.lineTo(P.x + 20, P.y + 12); ctx.stroke();
  // backrest, reclined slightly back
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(P.x - 22, P.y + 10); ctx.lineTo(P.x - 34, P.y - 52); ctx.stroke();
  // gas post
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(P.x - 3, P.y + 14); ctx.lineTo(P.x - 3, P.y + 46); ctx.stroke();
  // splayed base legs to castors
  ctx.lineWidth = 5;
  const base = { x: P.x - 3, y: P.y + 46 };
  const cast = [[-34, 60], [2, 64], [34, 60]];
  cast.forEach(function (c) {
    ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(P.x + c[0], P.y + c[1]); ctx.stroke();
    ctx.beginPath(); ctx.arc(P.x + c[0], P.y + c[1], 4, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

// a desk in front of a seated figure (facing right): tabletop over the knees,
// a front leg to the floor, and a monitor angled back toward the figure.
function drawDesk(ctx, j, color, screenColor) {
  const kneeY = Math.min(j.kR.y, j.kL.y);
  const topY = kneeY - 10;
  const x0 = 40, x1 = 98;               // desk spans out in front of the figure
  const groundY = Math.max(j.fR.y, j.fL.y) + 6;
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  // tabletop
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(x0, topY); ctx.lineTo(x1, topY); ctx.stroke();
  // front leg
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x1 - 4, topY + 3); ctx.lineTo(x1 - 4, groundY); ctx.stroke();
  // monitor: stand + screen tilted back toward the figure
  const mx = x0 + 30;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(mx, topY); ctx.lineTo(mx, topY - 14); ctx.stroke();
  ctx.save();
  ctx.translate(mx, topY - 14);
  ctx.rotate(-0.18);
  ctx.fillStyle = screenColor || "#FFFFFF";
  ctx.strokeStyle = color; ctx.lineWidth = 3.5;
  roundRectPath(ctx, -6, -30, 34, 30, 4);
  ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSwirl(ctx, H, R, color, t) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  const cx = H.x, cy = H.y - R - 24;
  const rot = t * 1.1;
  ctx.beginPath();
  for (let a = 0; a <= Math.PI * 4.6; a += 0.14) {
    const r = 3 + a * 1.5;
    const x = cx + Math.cos(a + rot) * r;
    const y = cy + Math.sin(a + rot) * r * 0.55;   // squashed scribble-spiral
    if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawLaptop(ctx, kR, kL, color) {
  const x = (kR.x + kL.x) / 2, y = Math.min(kR.y, kL.y) - 6;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  // base on the knees
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x + 24, y); ctx.stroke();
  // screen tilted away from the figure
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x + 22, y); ctx.lineTo(x + 32, y - 38); ctx.stroke();
  ctx.restore();
}

function drawBook(ctx, x, y, color, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot || 0);
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.lineJoin = "round";
  // near page slightly larger — cheap perspective
  ctx.beginPath();
  ctx.moveTo(0, -2); ctx.lineTo(-21, -12); ctx.lineTo(-21, 4); ctx.lineTo(0, 13); ctx.closePath();
  ctx.moveTo(0, -2); ctx.lineTo(27, -9); ctx.lineTo(27, 8); ctx.lineTo(0, 13); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawTorso(ctx, j, cfg) {
  // curved spine: rounded capsule bent through the mid-spine point
  ctx.lineCap = "round";
  ctx.lineWidth = cfg.torsoW;
  ctx.beginPath();
  ctx.moveTo(j.P.x, j.P.y);
  ctx.quadraticCurveTo(j.M.x, j.M.y, j.shoulderC.x, j.shoulderC.y);
  ctx.stroke();
}

function drawMegaphone(ctx, hand, elbow, head, color) {
  // orient the cone from the hand toward the mouth (near head)
  const dx = head.x - hand.x, dy = (head.y + 6) - hand.y;
  const ang = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(ang);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineJoin = "round";
  // handle stub
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-6, -7, 14, 14, 4) : ctx.rect(-6, -7, 14, 14); ctx.fill();
  // cone opening away from mouth (bell points out, mouth end small)
  const L = 40, r0 = 7, r1 = 22;
  ctx.beginPath();
  ctx.moveTo(6, -r0);
  ctx.lineTo(6 + L, -r1);
  ctx.lineTo(6 + L, r1);
  ctx.lineTo(6, r0);
  ctx.closePath();
  ctx.lineWidth = 3; ctx.stroke(); ctx.fill();
  ctx.restore();
}

// ── ground shadow ──────────────────────────────────────────
function drawShadow(ctx, cx, groundY, w, color = "rgba(23,43,77,0.10)") {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, groundY, w, w * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── skeleton overlay (proof-of-concept view) ───────────────
function drawSkeleton(ctx, j, cfg = CFG, accent = "#00C7B1") {
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.lineWidth = 2.5;
  const bones = [
    [j.P, j.M], [j.M, j.N], [j.N, j.H],
    [j.sL, j.eL], [j.eL, j.hL], [j.sR, j.eR], [j.eR, j.hR],
    [j.hipL, j.kL], [j.kL, j.fL], [j.hipR, j.kR], [j.kR, j.fR],
    [j.sL, j.sR],
  ];
  ctx.setLineDash([]);
  bones.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); });
  const joints = [j.P, j.N, j.shoulderC, j.sL, j.eL, j.hL, j.sR, j.eR, j.hR, j.hipL, j.kL, j.fL, j.hipR, j.kR, j.fR];
  joints.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); });
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(j.H.x, j.H.y, cfg.R, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// ── REST pose ──────────────────────────────────────────────
// convention: RIGHT limb (viewer-right) splays with +angle (rightward),
// LEFT limb with -angle. up = ±180.
const REST = {
  lean: 0, headTilt: 0, bob: 0,
  armRU: 15, armRF: 11, armLU: -15, armLF: -11,
  legRU: 7, legRF: 3, legLU: -7, legLF: -3,
};

const clone = (o) => Object.assign({}, o);
const wave = (t, f, ph = 0) => Math.sin(t * f * Math.PI * 2 + ph);

// ── ANIMATIONS ─────────────────────────────────────────────
// each: { label, mood, mega?, arm?, frame(t) -> pose }   (t in seconds)
const ANIMATIONS = {
  bored: {
    label: "Bored", mood: "…is this still loading?",
    frame(t) {
      const p = clone(REST);
      const br = wave(t, 0.28);              // slow breathing
      p.bob = br * 3 + 2;
      p.headTilt = 12 + wave(t, 0.18) * 6;   // head lolls to the side
      p.lean = wave(t, 0.13) * 2;
      p.armRU = 13 + br * 3; p.armRF = 9 + br * 2;
      p.armLU = -13 - br * 2; p.armLF = -9 - br * 2;
      const shift = wave(t, 0.13);
      p.legRU = 7 + shift * 3; p.legLU = -7 + shift * 3;   // idle weight-shift
      return p;
    },
  },
  friendly: {
    label: "Friendly wave", mood: "hey there! 👋",
    frame(t) {
      const p = clone(REST);
      p.bob = wave(t, 0.9) * 2.5 + 1;
      p.headTilt = -6 + wave(t, 0.9) * 3;
      // right arm up and waving (up-and-out to the right)
      p.armRU = 150;
      p.armRF = 152 + wave(t, 1.6) * 24;
      p.armLU = -18; p.armLF = -14;
      return p;
    },
  },
  present: {
    label: "Presenting", mood: "…and THAT's the plan.",
    frame(t) {
      const p = clone(REST);
      p.lean = -3;
      p.bob = wave(t, 0.5) * 2;
      p.headTilt = -6;
      // right arm extended, pointing out toward the content
      p.armRU = 88 + wave(t, 0.5) * 6;
      p.armRF = 94 + wave(t, 0.5) * 8;
      // left hand on hip (elbow out, hand back toward waist)
      p.armLU = -52; p.armLF = 132;
      return p;
    },
  },
  shrug: {
    label: "Shrug", mood: "don't ask me ¯\\_(ツ)_/¯",
    frame(t) {
      const p = clone(REST);
      // shrug pulse every ~3.5s: up, hold a beat, drop
      const c = ((t % 3.5) + 3.5) % 3.5;
      const sh = Math.min(1, Math.max(0, c / 0.5)) * Math.min(1, Math.max(0, (2.2 - c) / 0.6));
      p.bob = 2 - sh * 4;
      p.hunch = -3 - sh * 4;
      p.headTilt = wave(t, 0.2) * 4 + sh * 12;   // head cocks with the shrug
      // elbows pin to the sides, forearms swing out palms-up
      p.armRU = 15 + sh * 30; p.armRF = 11 + sh * 130;
      p.armLU = -15 - sh * 30; p.armLF = -11 - sh * 130;
      return p;
    },
  },
  confused: {
    label: "Confused", mood: "wait… what does this button do?",
    frame(t) {
      const p = clone(REST);
      const br = wave(t, 0.3);
      p.bob = br * 2;
      p.lean = -2;
      p.hunch = -5;
      p.headTilt = -10 + wave(t, 0.12) * 8;      // puzzling side to side
      // scratching the crown: elbow flared WAY out, forearm folded back over the head
      p.armRU = 122 + wave(t, 0.25) * 4;
      p.armRF = 218 + wave(t, 2.2) * 9;          // scratch-scratch wiggle
      // left hand on hip
      p.armLU = -52; p.armLF = 132;
      // weight on one leg
      p.legRU = 4; p.legLU = -14; p.legLF = -8;
      return p;
    },
  },
  spent: {
    label: "Spent", mood: "that… was a LOT of research", swirl: true,
    frame(t) {
      // strong still silhouette, minimal motion: doubled over,
      // hands braced on the thighs, catching breath
      const p = clone(REST);
      const br = wave(t, 0.25);                  // slow heavy breathing only
      p.lean = 5;
      p.hunch = -(44 + br * 3);                  // deep forward fold
      p.headTilt = -8 + br * 2;                  // head hanging
      p.bob = 4 + br * 1.5;
      // arms straight down, hands braced on the thighs
      p.armRU = 58; p.armRF = 26;
      p.armLU = 46; p.armLF = 18;
      // knees buckled
      p.legRU = 14; p.legRF = -20;
      p.legLU = -4; p.legLF = -16;
      return p;
    },
  },
  notlistening: {
    label: "Not listening", mood: "la la la, can't hear you",
    frame(t) {
      // strong still: both hands clamped over the ears, elbows flared wide.
      // Motion is just breathing + an occasional emphatic head shake.
      const p = clone(REST);
      const br = wave(t, 0.28);
      p.bob = 1 + br * 1.5;
      p.hunch = -4;
      // head shake burst every ~3.2s
      const c = ((t % 3.2) + 3.2) % 3.2;
      const win = c < 0.9 ? Math.sin(Math.PI * c / 0.9) : 0;
      p.headTilt = Math.sin(t * 22) * 10 * win;
      // hands ON the ears: elbows flared out horizontally, forearms folded
      // tightly back in so the hands press the sides of the head
      p.armRU = 105 + br * 2; p.armRF = 194;
      p.armLU = -105 - br * 2; p.armLF = -194;
      // planted stance
      p.legRU = 10; p.legLU = -10;
      return p;
    },
  },
  witsend: {
    label: "Wits' end", mood: "you have GOT to be kidding me", seated: true, chair: true, desk: true,
    frame(t) {
      // profile: reclined back in an office chair at a desk, slumped away from
      // the monitor. Every few seconds a hand drags down the face. At wits' end.
      const p = clone(REST);
      const br = wave(t, 0.3);
      p.lean = 2;
      p.hunch = 22 + br * 2;                    // reclined back into the chair
      p.bob = 2 + br * 1.2;
      // hand-drag-down-the-face gesture every ~6s
      const c = ((t % 6) + 6) % 6;
      const drag = c < 2.2 ? Math.sin(Math.PI * (c / 2.2)) : 0;   // 0 -> 1 -> 0
      p.headTilt = 24 + br * 3 - drag * 12;     // head thrown back, dips as the hand covers it
      // right arm limp on the armrest, sweeps up to the face during the drag
      p.armRU = 26 + br * 2 + drag * 122;
      p.armRF = 14 + drag * 150;
      // left arm hangs limp
      p.armLU = -30 - br * 2; p.armLF = -18;
      // legs out under the desk, lazy alternating foot bounce
      p.legRU = 82; p.legRF = 18 + wave(t, 0.5) * 4;
      p.legLU = 74; p.legLF = 10 + wave(t, 0.5, Math.PI) * 4;
      return p;
    },
  },
  exhausted: {
    label: "Exhausted", mood: "I. Am. So. Tired.",
    frame(t) {
      const p = clone(REST);
      const br = wave(t, 0.35);              // heavy slow breathing
      p.lean = 15 + br * 3;
      p.bob = br * 5 + 6;
      p.headTilt = 26 + br * 5;              // head hangs
      // arms dangle heavily
      p.armRU = 8 + br * 4; p.armRF = 6 + br * 3;
      p.armLU = -8 - br * 4; p.armLF = -6 - br * 3;
      // knees slightly buckled
      p.legRU = 9; p.legRF = -3; p.legLU = -9; p.legLF = 3;
      return p;
    },
  },
  sassy: {
    label: "Sassy", mood: "oh, we're doing THIS?",
    frame(t) {
      const p = clone(REST);
      p.lean = -6;
      p.bob = wave(t, 0.7) * 2;
      p.headTilt = -16 + wave(t, 0.7) * 3;
      // left hand firmly on hip
      p.armLU = -52; p.armLF = 132;
      // right arm gestures dismissively now and then
      const g = Math.max(0, wave(t, 0.4));
      p.armRU = 30 + g * 34;
      p.armRF = 24 + g * 54 + wave(t, 1.2) * 10;
      // cocked hip: weight on right leg, left leg kicked out
      p.legRU = 4; p.legLU = -18; p.legLF = -12;
      return p;
    },
  },
  // ── gait explorer: lateral walks, pitched FORWARD (negative hunch = toward travel) ──
  stroll:  makeGait({ label: "Stroll", mood: "just moseying…", speed: 2.0, stride: 24, hunch: -12, knee: 30, arm: 14, bob: 3, head: -5 }),
  shuffle: makeGait({ label: "Shuffle", mood: "five more minutes…", speed: 1.5, stride: 10, hunch: -20, knee: 12, arm: 5, bob: 1.5, head: -9 }),
  strut:   makeGait({ label: "Strut", mood: "yeah, I own this ledge.", speed: 2.2, stride: 30, hunch: -8, knee: 34, arm: 26, bob: 4, head: -6 }),
  scurry:  makeGait({ label: "Scurry", mood: "late late late late", speed: 4.6, stride: 15, hunch: -24, knee: 26, arm: 8, bob: 2, head: -7 }),
  march:   makeGait({ label: "March", mood: "hup, two, three, four", speed: 2.4, stride: 34, hunch: -2, knee: 6, arm: 30, bob: 5, head: 0 }),
  sneak:   makeGait({ label: "Sneak", mood: "shhh… nobody saw that", speed: 1.3, stride: 22, hunch: -32, knee: 52, arm: 10, bob: 6, head: -11 }),
  trudge:  makeGait({ label: "Trudge", mood: "why is this site SO long", speed: 1.1, stride: 13, hunch: -26, knee: 16, arm: 6, bob: 5, head: -15 }),
  carry: (() => {
    const g = makeGait({ label: "Carrying", mood: "beam coming through!", speed: 1.8, stride: 18, hunch: -14, knee: 22, arm: 0, bob: 2.5, head: -6 });
    const base = g.frame;
    g.frame = (t) => { const p = base(t); p.armRU = 16; p.armRF = 6; p.armLU = -16; p.armLF = -6; return p; };
    return g;
  })(),
  climb: {
    label: "Climb", mood: "up we go…",
    frame(t) {
      const p = clone(REST);
      // spiderman wall-climb: limbs spread wide, moving one at a time —
      // right hand → left foot → left hand → right foot
      const step = (ph) => {
        const x = (((t * 0.55 + ph) % 1) + 1) % 1;
        return x < 0.2 ? (1 - Math.cos((x / 0.2) * Math.PI)) / 2 : 1 - (x - 0.2) / 0.8;
      };
      const rh = step(0), lf = step(0.25), lh = step(0.5), rf = step(0.75);
      p.hunch = -10;
      p.headTilt = 16;                         // eyes on the next hold
      p.bob = -(rh + lf + lh + rf) * 1.6;
      // arms out on wide diagonals, each ratcheting up on its beat
      p.armRU = 108 + rh * 52; p.armRF = 124 + rh * 50;
      p.armLU = -108 - lh * 52; p.armLF = -124 - lh * 50;
      // frog-wide legs, knee climbing on its beat
      p.legRU = 34 + rf * 26;
      p.legRF = p.legRU - 46 - rf * 16;
      p.legLU = -34 - lf * 26;
      p.legLF = p.legLU + 46 + lf * 16;
      return p;
    },
  },
  rope: {
    label: "Rope climb", mood: "hand over hand…", rope: true,
    frame(t) {
      const p = clone(REST);
      const sw = Math.sin(t * 1.3 * Math.PI);   // hand-over-hand alternation
      p.hunch = -6;
      p.headTilt = 14;                          // looking up the rope
      p.bob = -Math.abs(sw) * 7;                // body hitches up on each pull
      p.lean = sw * 2;                          // slight sway
      // both hands overhead on the rope, alternating grips
      p.armRU = 168 + sw * 12; p.armRF = 176 + sw * 8;
      p.armLU = -168 + sw * 12; p.armLF = -176 + sw * 8;
      // legs wrapped: knees bent, ankles pinching the rope
      p.legRU = 22 + sw * 6; p.legRF = p.legRU - 68;
      p.legLU = -14 - sw * 6; p.legLF = p.legLU + 62;
      return p;
    },
  },
  peek: {
    label: "Peeking over", mood: "how far down IS that…",
    frame(t) {
      const p = clone(REST);
      // careful lean-out every ~5s: creep in, hold, pull back
      const c = ((t % 5) + 5) % 5;
      const pk = Math.min(1, Math.max(0, c / 1.2)) * Math.min(1, Math.max(0, (4.2 - c) / 0.8));
      p.bob = pk * 2;
      p.hunch = -(10 + pk * 26);                // craning forward over the edge
      p.headTilt = -(8 + pk * 14) + wave(t, 2.5) * pk * 2;  // looking down, tiny wobble
      // arms trail behind for counterbalance
      p.armRU = -18 - pk * 40; p.armRF = -14 - pk * 30;
      p.armLU = -26 - pk * 45; p.armLF = -20 - pk * 35;
      // front foot toes the edge, back leg planted
      p.legRU = 14 + pk * 6; p.legRF = 8;
      p.legLU = -16 - pk * 10; p.legLF = -6;
      return p;
    },
  },
  jump: {
    label: "Jump", mood: "wheee!",
    frame(t) {
      const p = clone(REST);
      const T = 1.6, ph = (((t % T) + T) % T) / T;
      const e = (a, b, x) => Math.min(1, Math.max(0, (x - a) / (b - a)));
      const crouch = e(0.05, 0.3, ph) - e(0.38, 0.52, ph);   // wind up, then release
      const airT = e(0.38, 0.92, ph);
      const air = Math.sin(Math.PI * airT);                   // airborne arc
      const land = Math.sin(Math.PI * e(0.9, 1.0, ph));       // landing absorb
      p.bob = crouch * 14 - air * 48 + land * 6;
      p.hunch = -8 + crouch * -14 + air * 6 - land * 6;
      p.headTilt = crouch * -6 + air * 10;
      // arms swing back on crouch, throw up in the air
      p.armRU = 15 + crouch * 35 - air * 155; p.armRF = 10 + crouch * 20 - air * 150;
      p.armLU = -15 - crouch * 35 + air * 155; p.armLF = -10 - crouch * 20 + air * 150;
      // asymmetric tuck — lead leg pulls high, trail leg stays long (no heel-click)
      p.legRU = 8 + crouch * 30 + air * 46; p.legRF = 4 - crouch * 55 - air * 80 - land * 16;
      p.legLU = -8 - crouch * 30 + air * 14; p.legLF = -4 + crouch * 55 + air * 32 + land * 16;
      return p;
    },
  },
  sit: {
    label: "Hanging out", mood: "nice view up here", seated: true,
    frame(t) {
      const p = clone(REST);
      const br = wave(t, 0.3);
      p.lean = 3;
      p.hunch = -(8 + br * 2);                 // relaxed round back (forward)
      p.bob = br * 1.5;
      // bored + curious: slow scan, occasional lean-in peek over the edge
      const peek = Math.max(0, wave(t, 0.07, 1)) ** 6;
      p.hunch -= peek * 18;
      p.headTilt = wave(t, 0.09) * 16 + peek * 12;
      p.armRU = 26 + br * 2; p.armRF = 10;
      p.armLU = -22 - br * 2; p.armLF = -8;
      // seated: thighs out front, shins dangling, lazy alternating kick
      p.legRU = 82; p.legRF = 6 + wave(t, 0.45) * 14;
      p.legLU = 74; p.legLF = 4 + wave(t, 0.45, Math.PI) * 14;
      return p;
    },
  },
  read: {
    label: "Reading", mood: "just one more chapter…", seated: true, book: true,
    frame(t) {
      const p = clone(REST);
      const br = wave(t, 0.28);
      p.lean = 4;
      p.hunch = -(22 + br * 3);               // curled FORWARD over the book
      p.bob = br * 1.5;
      p.headTilt = -(12 + br * 2);            // eyes down on the page
      // page-flip twitch every few seconds
      const flip = Math.max(0, wave(t, 0.18)) ** 10;
      // relaxed asymmetric hold in front of the curled body
      p.armRU = 62 + br * 2; p.armRF = 132 + flip * 26;
      p.armLU = 42 - br * 2; p.armLF = 108 + br * 3;
      // seated, one lazy bounce
      p.legRU = 78; p.legRF = 12 + wave(t, 0.3) * 6;
      p.legLU = 70; p.legLF = 5;
      return p;
    },
  },
  holdannoyed: {
    label: "Holding (annoyed)", mood: "you CANNOT be serious",
    frame(t) {
      // still gripping his end of the line, head swiveling in exasperation
      // between the slacker and you
      const p = clone(REST);
      const look = Math.min(1, t / 0.35);
      p.bob = 0.5;
      p.armRU = 16; p.armRF = 6;
      p.armLU = -16; p.armLF = -6;
      p.headTilt = wave(t, 0.5) * 20 * look;
      p.hunch = -4 * look;
      p.legRU = 9; p.legLU = -9;
      return p;
    },
  },
  annoyed: {
    label: "Annoyed", mood: "seriously? we're CARRYING here",
    frame(t) {
      // exasperated partner: both hands on hips, head swiveling
      // between the slacker and you
      const p = clone(REST);
      const look = Math.min(1, t / 0.35);
      p.bob = 1;
      p.hunch = -6 * look;
      p.headTilt = wave(t, 0.4) * 16 * look;
      p.armRU = 15 + 37 * look; p.armRF = 11 - 143 * look;
      p.armLU = -15 - 37 * look; p.armLF = -11 + 143 * look;
      return p;
    },
  },
  greet: {
    label: "Greet", mood: "oh! hi there",
    frame(t) {
      // hover reaction: snap to attention, curious head cock, then a wave
      const p = clone(REST);
      const look = Math.min(1, t / 0.35);
      p.bob = 1 + wave(t, 0.9) * 1.5;
      p.hunch = -4 * look;
      p.headTilt = -12 * look + wave(t, 0.5) * 3;
      const wv = Math.min(1, Math.max(0, (t - 0.55) / 0.3));
      p.armRU = 15 + 137 * wv;
      p.armRF = 11 + 143 * wv + (t > 0.9 ? wave(t, 1.6) * 24 : 0);
      return p;
    },
  },
  greetseat: {
    label: "Greet (seated)", mood: "oh! hi there", seated: true,
    frame(t) {
      const p = clone(REST);
      const look = Math.min(1, t / 0.35);
      p.bob = wave(t, 0.9) * 1.2;
      p.hunch = -6 * look;
      p.headTilt = -16 * look + wave(t, 0.5) * 3;
      const wv = Math.min(1, Math.max(0, (t - 0.55) / 0.3));
      p.armRU = 26 + 126 * wv;
      p.armRF = 10 + 144 * wv + (t > 0.9 ? wave(t, 1.6) * 24 : 0);
      p.armLU = -22; p.armLF = -8;
      p.legRU = 82; p.legRF = 10;
      p.legLU = 74; p.legLF = 6;
      return p;
    },
  },
  standstill: {
    label: "Standing by", mood: "\u2026",
    frame(t) {
      const p = clone(REST);
      p.bob = wave(t, 0.3) * 1.5;
      p.headTilt = wave(t, 0.08) * 6;
      return p;
    },
  },
};

// lateral gait generator: legs scissor front/back in profile, hunch carries the upper body
function makeGait(g) {
  return {
    label: g.label, mood: g.mood,
    frame(t) {
      const p = clone(REST);
      const sw = Math.sin(t * g.speed * Math.PI);
      p.bob = -Math.abs(sw) * g.bob + 2;
      p.lean = -2;
      p.hunch = g.hunch + wave(t, g.speed / 4) * 3;
      p.headTilt = g.head + wave(t, g.speed / 2) * 3;
      p.legRU = sw * g.stride;
      p.legLU = -sw * g.stride;
      p.legRF = p.legRU - Math.max(0, sw) * g.knee;   // knee bends as leg swings forward
      p.legLF = p.legLU - Math.max(0, -sw) * g.knee;
      p.armRU = 4 - sw * g.arm; p.armRF = 2 - sw * g.arm * 0.6;
      p.armLU = -4 + sw * g.arm; p.armLF = -2 + sw * g.arm * 0.6;
      return p;
    },
  };
}
ANIMATIONS.walk = ANIMATIONS.stroll;   // scene walker + old references

const ORDER = ["bored", "friendly", "present", "shrug", "confused", "spent", "notlistening", "witsend", "exhausted", "sassy", "stroll", "shuffle", "strut", "scurry", "march", "sneak", "trudge", "climb", "rope", "peek", "jump", "carry", "sit", "read"];

// ── singleton animation controller ─────────────────────────
// Owns its own rAF + state so it is immune to React re-mounts.
const RT = { animKey: "friendly", playing: true, speed: 1, showSkel: false, clock: 0, scene: 0 };
let stageC = null, sceneC = null, running = false, last = 0;

function attach(stage, scene) {
  stageC = stage; sceneC = scene;
  last = performance.now();
  if (!running) { running = true; setInterval(tick, 1000 / 60); }
  tick(); // paint an immediate first frame
}
function setAnim(k) { RT.animKey = k; RT.clock = 0; tick(); }
function setPlaying(p) { RT.playing = p; tick(); }
function setSpeed(s) { RT.speed = s; tick(); }
function setSkel(v) { RT.showSkel = v; tick(); }

function tick() {
  const now = performance.now();
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.1) dt = 0.1;
  if (RT.playing) RT.clock += dt * RT.speed;
  RT.scene += dt * RT.speed;
  try {
    if (stageC && stageC.isConnected) drawStage(stageC);
    if (sceneC && sceneC.isConnected) drawScene(sceneC);
  } catch (e) { /* keep the interval alive */ }
}

function fit(c) {
  const dpr = window.devicePixelRatio || 1;
  const w = c.clientWidth, h = c.clientHeight;
  if (w && h && (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr))) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function figure(ctx, ox, oy, s, flip, pose, opts, skel) {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(flip ? -s : s, s);
  const j = computePose(pose, CFG, { x: 0, y: 0 });
  draw(ctx, j, CFG, opts);
  if (skel) drawSkeleton(ctx, j, CFG);
  ctx.restore();
}

function drawStage(c) {
  const { ctx, w } = fit(c);
  ctx.clearRect(0, 0, w, 560);
  const anim = ANIMATIONS[RT.animKey] || ANIMATIONS.friendly;
  const pose = anim.frame(RT.clock);
  const oy = anim.seated ? 300 : 372;
  drawShadow(ctx, w / 2, 500, 66);
  if (anim.seated) {
    // simple plinth to sit on
    ctx.fillStyle = "#E4E2DC";
    roundRect(ctx, w / 2 - 58, oy + 12, 116, 500 - (oy + 12), 10);
    ctx.fill();
  }
  if (anim.rope) {
    // the rope, hanging from above down to the hands
    ctx.strokeStyle = "#C9C6BE"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(w / 2, 46); ctx.lineTo(w / 2, oy - 148); ctx.stroke();
  }
  figure(ctx, w / 2, oy, 1, false, pose,
    { color: "#172B4D", mega: anim.mega, arm: anim.arm, megaColor: "#FFB800", book: anim.book, swirl: anim.swirl, laptop: anim.laptop, time: RT.clock }, RT.showSkel);
}

function roundRect(ctx, x, y, w, h, r, topOnly) {
  ctx.beginPath();
  if (topOnly) {
    ctx.moveTo(x, y + h); ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r); ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h); ctx.closePath();
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawScene(c) {
  const { ctx, w, h } = fit(c);
  ctx.clearRect(0, 0, w, h);
  const bx = 40, by = 190, bw = w - 80, bh = 92, barTop = by;
  ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = "#E4E2DC"; ctx.lineWidth = 1.5;
  roundRect(ctx, bx, by, bw, bh, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#F2F0EA"; roundRect(ctx, bx, by, bw, 30, 14, true); ctx.fill();
  ["#FB6933", "#FFD426", "#00C7B1"].forEach((col, i) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx + 20 + i * 18, by + 15, 5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = "#FBFBF9"; roundRect(ctx, bx + 84, by + 6, bw - 120, 18, 9); ctx.fill();
  ctx.fillStyle = "#B4B0A6"; ctx.font = "600 10px Manrope, sans-serif";
  ctx.fillText("empowered.vote", bx + 96, by + 19);
  ctx.fillStyle = "#EEEBE3";
  roundRect(ctx, bx + 20, by + 46, bw * 0.5, 8, 4); ctx.fill();
  roundRect(ctx, bx + 20, by + 62, bw * 0.34, 8, 4); ctx.fill();

  // ── tiny figures hanging out on the window (Fraggle-style) ──
  const s = 0.34, span = bw - 320;
  const feetY = barTop + 2;

  // 1. construction crew — two workers hauling a border-colored beam along the top
  const u = RT.scene * 0.055;
  const frac = ((u % 2) + 2) % 2;
  const tri = frac < 1 ? frac : 2 - frac;
  const goingRight = frac < 1;
  const dir = goingRight ? 1 : -1;
  const fx = bx + 130 + tri * (span - 60);
  const cx2 = fx - dir * 52;
  // the beam they're carrying (same color as the window border)
  const beamY = feetY - 97 * s;
  ctx.strokeStyle = "#E4E2DC"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(fx + dir * 14, beamY); ctx.lineTo(cx2 - dir * 14, beamY); ctx.stroke();
  drawShadow(ctx, fx, feetY, 24 * s * 2, "rgba(23,43,77,.10)");
  drawShadow(ctx, cx2, feetY, 24 * s * 2, "rgba(23,43,77,.10)");
  figure(ctx, fx, feetY - 112 * s, s, !goingRight, ANIMATIONS.carry.frame(RT.scene), { color: "#172B4D" }, false);
  figure(ctx, cx2, feetY - 112 * s, s, !goingRight, ANIMATIONS.carry.frame(RT.scene + 0.16), { color: "#172B4D" }, false);

  // 2. sitter — perched up top, legs dangling, lazy kicks
  const sx = bx + bw - 150;
  drawShadow(ctx, sx, feetY, 24 * s * 2, "rgba(23,43,77,.10)");
  figure(ctx, sx, feetY - 8 * s, s, true, ANIMATIONS.sit.frame(RT.scene + 3.1), { color: "#172B4D" }, false);

  // 3. reader — sitting on the left corner, nose in a book
  const lx = bx + 46;
  drawShadow(ctx, lx, feetY, 24 * s * 2, "rgba(23,43,77,.10)");
  figure(ctx, lx, feetY - 8 * s, s, false, ANIMATIONS.read.frame(RT.scene + 7.4), { color: "#172B4D", book: true }, false);

  // 4. climber — scales the right edge, hops off at the top, hangs out, repeat
  const T = 9, cph = ((RT.scene / T) % 1 + 1) % 1;
  const edgeX = bx + bw + 6 * s;
  const topPelvis = by - 2, botPelvis = by + bh - 6;
  if (cph < 0.5) {
    // climbing up the edge
    const k = cph / 0.5;
    figure(ctx, edgeX, botPelvis - k * (botPelvis - topPelvis), s, false, ANIMATIONS.climb.frame(RT.scene), { color: "#172B4D" }, false);
  } else if (cph < 0.62) {
    // leap off onto the ledge
    const k = (cph - 0.5) / 0.12;
    const jx = edgeX - k * 44;
    const jy = topPelvis - Math.sin(Math.PI * k) * 20 + k * (feetY - 112 * s - topPelvis);
    figure(ctx, jx, jy, s, true, ANIMATIONS.jump.frame((0.42 + k * 0.5) * 1.6), { color: "#172B4D" }, false);
  } else {
    // landed: hang out on the corner, a little smug
    const lx2 = edgeX - 44;
    drawShadow(ctx, lx2, feetY, 24 * s * 2, "rgba(23,43,77,.10)");
    figure(ctx, lx2, feetY - 112 * s, s, true, ANIMATIONS.bored.frame(RT.scene), { color: "#172B4D" }, false);
  }
}


// ── classic-script global (loaded once via <script src>) ──
window.LeremyRig = { CFG, REST, ANIMATIONS, ORDER, computePose, draw, drawShadow, drawSkeleton, attach, setAnim, setPlaying, setSpeed, setSkel };

})();
