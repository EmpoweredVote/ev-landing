// ───────────────────────────────────────────────────────────
// EV Landing — stick-figure inhabitants
// Overlays 14 tiny leremy-rig figures on the page: patrolling
// borders, sitting on cards, climbing edges, hanging off ropes.
// Requires leremy-rig.js (window.LeremyRig) loaded first.
// ───────────────────────────────────────────────────────────
(function () {
  if (window.__evFigures) return; window.__evFigures = true;

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  onReady(function () {
    var R = window.LeremyRig;
    if (!R) return;
    var CFG = R.CFG, A = R.ANIMATIONS;
    var DPR = Math.min(1.5, window.devicePixelRatio || 1);
    var S = 0.32;                       // tiny-figure scale
    var FIG_H = 150;                    // canvas height for edge-standing figures

    // pointer tracking for hover reactions
    var mx = -1e4, my = -1e4;
    document.addEventListener('mousemove', function (ev) { mx = ev.clientX; my = ev.clientY; }, { passive: true });

    // click to shove a rope Bobit — swings it like a vine, then damps to rest
    document.addEventListener('click', function (ev) {
      entries.forEach(function (e) {
        if (e.spec.mode !== 'rope' || !e.w) return;
        var cr = e.c.getBoundingClientRect();
        var py = e.h - 70, Lh = py - 148 * S;
        var bodyX = cr.left + e.w / 2 + Math.sin(e.ang || 0) * Lh;
        if (Math.abs(ev.clientX - bodyX) < 60 && ev.clientY > cr.top && ev.clientY < cr.top + py + 30) {
          var dir = ev.clientX < bodyX ? 1 : -1;          // push away from the click
          e.vel = Math.max(-5, Math.min(5, (e.vel || 0) + dir * 2.6));
        }
      });
    }, { passive: true });

    function cssVar(name, fallback) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    }

    // Brand-derived figure palettes — no hard red/blue.
    // Light mode: brighter, vivid set. Dark mode: the dark-theme brand variants.
    var FIG_COLORS = {
      light: ['#007D99', '#FF5740', '#E8A400'],   // bright teal, coral, marigold
      dark:  ['#1DA8C6', '#FF6B52', '#FFD740']    // dark-theme teal, coral, yellow
    };
    function figColor(i) {
      var th = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      var pal = FIG_COLORS[th];
      return pal[i % pal.length];
    }

    // ---- broken-image fallbacks (brand assets not present in this preview copy) ----
    function imgFallback(img) {
      img.style.display = 'none';
      var banner = img.closest('.banner-logo, .ev-logo');
      if (banner && !banner.__fb) {
        banner.__fb = true;
        var sp = document.createElement('span');
        sp.textContent = 'EMPOWERED VOTE';
        sp.style.cssText = 'font-weight:800;letter-spacing:.14em;font-size:.95rem;color:var(--heading);white-space:nowrap;';
        banner.appendChild(sp);
      }
      var lt = img.closest('.logo-trigger');
      if (lt && !lt.querySelector('.wordmark') && !lt.__fb) {
        lt.__fb = true;
        var w = document.createElement('span');
        w.className = 'wordmark';
        w.textContent = img.alt || '';
        lt.appendChild(w);
      }
    }
    document.querySelectorAll('img').forEach(function (img) {
      if (img.complete && img.naturalWidth === 0 && img.src) imgFallback(img);
      else img.addEventListener('error', function () { imgFallback(img); });
    });

    // ---- figure specs ----
    var SPECS = [
      { mode: 'beam',   anchor: '.hero',                edge: 'bottom' },                     // 2 workers + beam
      { mode: 'stand',  anchor: '.hero .meta-row',      edge: 'top', x: 0.90, anim: 'bored' },
      { mode: 'why',    anchor: '.why-grid .why-item:nth-of-type(1) .why-icon', anim: 'spent', color: '--yellow' },
      { mode: 'why',    anchor: '.why-grid .why-item:nth-of-type(2) .why-icon', anim: 'notlistening', color: '--teal' },
      { mode: 'why',    anchor: '.why-grid .why-item:nth-of-type(3) .why-icon', anim: 'witsend', color: '--coral' },
      { mode: 'patrol', anchor: '.note.n-alpha',        edge: 'top', anim: 'stroll', speed: 34 },
      { mode: 'seat',   anchor: '.note.n-team',         edge: 'top', x: 0.80, anim: 'read' },
      { mode: 'vclimb', anchor: '.note.n-ai' },
      { mode: 'seat',   anchor: '.note.n-money',        edge: 'top', x: 0.10, anim: 'sit' },
      { mode: 'patrol', anchor: 'section.watch',        edge: 'top', anim: 'stroll', speed: 26 },
      { mode: 'stand',  anchor: '.watch-grid .watch-card:nth-of-type(2) .watch-thumb', edge: 'top', x: 0.96, anim: 'peek' },
      { mode: 'rope',   anchor: 'section.watch .wrap',  x: 0.96 },
      { mode: 'patrol', anchor: 'footer',               edge: 'top', anim: 'strut', speed: 46 },
      { mode: 'stand',  anchor: 'footer',               edge: 'top', x: 0.06, anim: 'jump', hover: 'jump' },
    ];

    var entries = [];
    var ci = 0;
    SPECS.forEach(function (spec, i) {
      var el = document.querySelector(spec.anchor);
      if (!el) return;
      var c = document.createElement('canvas');
      c.style.cssText = 'position:absolute;pointer-events:none;z-index:60;';
      if (spec.mode === 'why') {
        c.style.position = 'static';
        var img = el.querySelector('img'); if (img) img.style.display = 'none';
        el.style.height = 'auto';
        el.appendChild(c);
      } else if (spec.mode === 'banner') {
        c.style.cssText = 'position:absolute;left:26%;margin-left:-60px;bottom:-30px;pointer-events:none;z-index:5;';
        el.appendChild(c);
      } else {
        document.body.appendChild(c);
      }
      entries.push({ spec: spec, el: el, c: c, ctx: c.getContext('2d'), phase: i * 2.13, w: 0, h: 0, ci: (spec.mode === 'why' ? 0 : ci++), lt: 0, greet: 0, linger: 0 });
    });

    function sizeCanvas(e, w, h) {
      if (e.w !== w || e.h !== h) {
        e.w = w; e.h = h;
        e.c.width = Math.round(w * DPR); e.c.height = Math.round(h * DPR);
        e.c.style.width = w + 'px'; e.c.style.height = h + 'px';
      }
      e.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function reposition() {
      var sy = window.scrollY || window.pageYOffset;
      var sx = window.scrollX || window.pageXOffset;
      entries.forEach(function (e) {
        var spec = e.spec;
        if (spec.mode === 'why') { sizeCanvas(e, 190, 215); return; }
        if (spec.mode === 'banner') { sizeCanvas(e, 120, 96); return; }
        if (spec.mode === 'crosser') { sizeCanvas(e, window.innerWidth, 110); return; }
        var r = e.el.getBoundingClientRect();
        if (spec.mode === 'vclimb') {
          var h = Math.min(300, Math.max(200, r.height));
          sizeCanvas(e, 170, h);
          e.c.style.left = (r.right + sx - 85) + 'px';
          e.c.style.top = (r.top + sy + (r.height - h) / 2) + 'px';
          return;
        }
        if (spec.mode === 'rope') {
          sizeCanvas(e, 170, 250);
          e.c.style.left = (r.left + sx + r.width * spec.x - 85) + 'px';
          e.c.style.top = (r.top + sy - 10) + 'px';
          return;
        }
        if (spec.mode === 'seat') {
          // taller canvas + seat line 42px above the bottom so dangling shins clear the edge
          var hSe = 180;
          sizeCanvas(e, 190, hSe);
          var edgeYSe = (spec.edge === 'bottom' ? r.bottom : r.top) + sy;
          e.c.style.left = (r.left + sx + r.width * spec.x - 95) + 'px';
          e.c.style.top = (edgeYSe - (hSe - 42)) + 'px';
          return;
        }
        var full = (spec.mode === 'beam' || spec.mode === 'patrol');
        var w = full ? Math.max(300, r.width) : 190;
        sizeCanvas(e, w, FIG_H);
        var edgeY = (spec.edge === 'bottom' ? r.bottom : r.top) + sy;
        var left = full ? (r.left + sx) : (r.left + sx + r.width * spec.x - w / 2);
        e.c.style.left = left + 'px';
        e.c.style.top = (edgeY - (FIG_H - 6)) + 'px';
      });
    }

    function drawFig(ctx, x, y, s, flip, pose, opts) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(flip ? -s : s, s);
      var j = R.computePose(pose, CFG, { x: 0, y: 0 });
      R.draw(ctx, j, CFG, opts);
      ctx.restore();
    }

    var t = 0, last = performance.now();
    var inkCache = '#1C1C1C', inkTick = 1;

    function tick() {
      var now = performance.now();
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      t += dt;
      if ((inkTick += dt) > 0.5) { inkTick = 0; inkCache = cssVar('--heading', '#1C1C1C'); }
      var ink = inkCache;
      var shadow = 'rgba(127,127,127,0.18)';

      entries.forEach(function (e) {
        var spec = e.spec, ctx = e.ctx, w = e.w, h = e.h;
        if (!w) return;
        // skip offscreen canvases
        var cr = e.c.getBoundingClientRect();
        if (cr.bottom < -40 || cr.top > window.innerHeight + 40) return;
        ctx.clearRect(0, 0, w, h);
        var feetY = h - 6;
        var col = figColor(e.ci);
        var hoverable = spec.mode === 'stand' || spec.mode === 'patrol' || spec.mode === 'seat';
        // per-entry clock freezes while greeting, so patrols resume where they stopped
        if (e.greet) e.greet += dt;
        e.lt += dt * (e.greet ? 0 : 1);
        var tt = e.lt + e.phase;
        // current figure x within the canvas
        var figX = w / 2;
        if (spec.mode === 'patrol') {
          var pad = 70, span = w - pad * 2;
          var u = (tt * spec.speed / span) % 2; if (u < 0) u += 2;
          e._tri = u < 1 ? u : 2 - u;
          e._dirR = u < 1;
          figX = pad + e._tri * span;
        }
        // hover: stop, look at you curiously, wave — then go about the day
        if (hoverable) {
          if (Math.abs(mx - (cr.left + figX)) < 36 && my > cr.top + h - 92 && my < cr.top + h + 6) {
            if (!e.greet) e.greet = 0.001;
            e.linger = 1.6;
          } else if (e.greet) {
            e.linger -= dt;
            if (e.linger <= 0) e.greet = 0;
          }
        }

        if (spec.mode === 'why') {
          var color = cssVar(spec.color, ink);
          var anim = A[spec.anim];
          var ws = 0.62;
          // ground line shared with the standing why-figures (their feet land at ~h-8);
          // seat the chair Bobit so its castor base (~68px below pelvis, local) rests on it
          var py0 = anim.chair ? (h - 8 - 68 * ws) : anim.seated ? (h - 10 - 8 * ws) : (h - 8 - 112 * ws);
          // desk extends to the right of the figure, so nudge the origin left to center the scene
          var ox = anim.chair ? (w / 2 - 18) : w / 2;
          if (anim.seated && !anim.chair) {
            // simple bench under the seated figure
            ctx.fillStyle = cssVar('--border', '#E5E7EB');
            ctx.fillRect(w / 2 - 16, h - 10, 32, 8);
          }
          // furniture (desk/chair) drawn in a muted neutral; screen picks up --bg
          var furn = cssVar('--border', '#B4B0A6');
          drawFig(ctx, ox, py0, ws, false, anim.frame(tt),
            { color: color, swirl: anim.swirl, laptop: anim.laptop, book: anim.book, time: tt,
              chair: anim.chair, desk: anim.desk, chairColor: furn, deskColor: furn,
              screenColor: cssVar('--bg', '#FFFFFF') });
          return;
        }
        if (spec.mode === 'banner') {
          // sits on the banner's bottom edge, legs dangling over the page,
          // head tracking your cursor
          var sB = 0.24;
          var edgeYB = h - 30;                       // banner bottom edge in canvas coords
          var poseBn = A.sit.frame(tt);
          if (mx > -9000) {
            var dxB = mx - (cr.left + w / 2);
            poseBn.headTilt = Math.max(-38, Math.min(38, -dxB * 0.12));
          }
          drawFig(ctx, w / 2, edgeYB - 8 * sB, sB, false, poseBn, { color: col });
          return;
        }
        if (spec.mode === 'crosser') {
          if (!e.active) {
            e.wait -= dt;
            if (e.wait <= 0) {
              var gaits = ['stroll', 'shuffle', 'strut', 'scurry', 'trudge', 'sneak', 'march'];
              var dirC = Math.random() < 0.5 ? 1 : -1;
              var g = gaits[Math.floor(Math.random() * gaits.length)];
              e.active = {
                dir: dirC,
                x: dirC > 0 ? -50 : w + 50,
                gait: g,
                speed: g === 'scurry' ? 120 : (g === 'trudge' || g === 'shuffle' || g === 'sneak' ? 34 : 55),
                ciX: Math.floor(Math.random() * 3)
              };
            }
            return;
          }
          var av = e.active;
          // hover: stop and greet, then carry on
          if (Math.abs(mx - av.x) < 36 && my > cr.top + h - 92 && my < cr.top + h + 6) {
            if (!e.greet) e.greet = 0.001;
            e.linger = 1.6;
          } else if (e.greet) {
            e.linger -= dt;
            if (e.linger <= 0) e.greet = 0;
          }
          if (!e.greet) av.x += av.dir * av.speed * dt;
          if (av.x < -60 || av.x > w + 60) {
            e.active = null;
            e.greet = 0;
            e.wait = 14 + Math.random() * 22;   // next wanderer in a while
            return;
          }
          var colC = figColor(av.ciX);
          R.drawShadow(ctx, av.x, feetY, 16, shadow);
          var animC = e.greet ? A.greet : A[av.gait];
          drawFig(ctx, av.x, feetY - 112 * S, S, e.greet ? false : av.dir < 0, animC.frame(e.greet ? e.greet : tt), { color: colC });
          return;
        }
        if (spec.mode === 'stand') {
          var animSt, ptSt;
          if (spec.hover === 'jump') { animSt = e.greet ? A.jump : A.standstill; ptSt = e.greet ? e.greet : tt; }
          else { animSt = e.greet ? A.greet : A[spec.anim]; ptSt = e.greet ? e.greet : tt; }
          R.drawShadow(ctx, w / 2, feetY, 16, shadow);
          drawFig(ctx, w / 2, feetY - 112 * S, S, false, animSt.frame(ptSt), { color: col });
          return;
        }
        if (spec.mode === 'seat') {
          var animSe = e.greet ? A.greetseat : A[spec.anim];
          var ptSe = e.greet ? e.greet : tt;
          var seatY = h - 42;   // matches the seat line set in reposition(); leaves room for dangling legs
          drawFig(ctx, w / 2, seatY, S, spec.x > 0.5, animSe.frame(ptSe), { color: col, book: (!e.greet && spec.anim === 'read') });
          return;
        }
        if (spec.mode === 'patrol') {
          R.drawShadow(ctx, figX, feetY, 16, shadow);
          var animP = e.greet ? A.greet : A[spec.anim];
          var ptP = e.greet ? e.greet : tt;
          drawFig(ctx, figX, feetY - 112 * S, S, e.greet ? false : !e._dirR, animP.frame(ptP), { color: col });
          return;
        }
        if (spec.mode === 'beam') {
          var pad2 = 90, span2 = w - pad2 * 2;
          var u2 = (tt * 30 / span2) % 2; if (u2 < 0) u2 += 2;
          var tri2 = u2 < 1 ? u2 : 2 - u2;
          var goingR = u2 < 1, dir = goingR ? 1 : -1;
          var fx = pad2 + tri2 * span2;
          var bx2 = fx - dir * 46;
          // hover on a carrier → that one drops HIS end and waves; his partner
          // keeps holding, looking back and forth, annoyed. Hover both → both drop.
          var nearF = Math.abs(mx - (cr.left + fx)) < 36;
          var nearB = Math.abs(mx - (cr.left + bx2)) < 36;
          var inY = my > cr.top + h - 92 && my < cr.top + h + 6;
          if ((nearF || nearB) && inY) {
            if (!e.greet) e.greet = 0.001;
            if (nearF) e.wF = true;
            if (nearB) e.wB = true;
            e.linger = 2.0;
          } else if (e.greet) {
            e.linger -= dt;
            if (e.linger <= 0) { e.greet = 0; e.wF = e.wB = false; }
          }
          // each end drops / is picked back up independently
          e.dF = e.dF || 0; e.dB = e.dB || 0;
          var k = Math.min(1, dt * 6);
          e.dF += (((e.greet && e.wF) ? 1 : 0) - e.dF) * k;
          e.dB += (((e.greet && e.wB) ? 1 : 0) - e.dB) * k;
          var carryY = feetY - 97 * S, groundY = feetY - 3;
          var yF = carryY + (groundY - carryY) * e.dF;
          var yB = carryY + (groundY - carryY) * e.dB;
          // the yellow line they're building (same as the "see our books" underline)
          ctx.strokeStyle = cssVar('--yellow', '#FED12E');
          ctx.lineWidth = 5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(fx + dir * 12, yF); ctx.lineTo(bx2 - dir * 12, yB); ctx.stroke();
          R.drawShadow(ctx, fx, feetY, 15, shadow);
          R.drawShadow(ctx, bx2, feetY, 15, shadow);
          var poseF, poseB, flipF = !goingR, flipB = !goingR;
          if (e.greet) {
            var wavPose = A.greet.frame(e.greet);
            var holdPose = A.holdannoyed.frame(e.greet);
            poseF = e.wF ? wavPose : holdPose;
            poseB = e.wB ? wavPose : holdPose;
            flipF = e.wF ? false : (bx2 < fx);   // holder turns toward his partner
            flipB = e.wB ? false : (fx < bx2);
          } else {
            poseF = A.carry.frame(tt);
            poseB = A.carry.frame(tt + 0.16);
          }
          drawFig(ctx, fx, feetY - 112 * S, S, flipF, poseF, { color: col });
          drawFig(ctx, bx2, feetY - 112 * S, S, flipB, poseB, { color: col });
          return;
        }
        if (spec.mode === 'vclimb') {
          var u3 = (tt * 0.10) % 2; if (u3 < 0) u3 += 2;
          var tri3 = u3 < 1 ? u3 : 2 - u3;
          var y3 = (h - 50) - tri3 * (h - 100);
          drawFig(ctx, w / 2, y3, S, false, A.climb.frame(tt), { color: col });
          return;
        }
        if (spec.mode === 'rope') {
          var py = h - 70;
          var Lh = py - 148 * S;                 // pivot(top) -> hands, i.e. pendulum length
          // damped pendulum: click adds velocity (see the click handler above), gravity pulls back
          e.ang = e.ang || 0; e.vel = e.vel || 0;
          e.vel += (-9 * e.ang - 0.9 * e.vel) * dt;   // k=9 (~2s period), light damping -> stops after ~7s
          e.ang += e.vel * dt;
          var s = Math.sin(e.ang), cSw = Math.cos(e.ang);
          var handX = w / 2 + s * Lh, handY = cSw * Lh;   // swung hand position
          // rope curves like a vine — control point bows perpendicular, proportional to speed (whip)
          var bow = Math.max(-26, Math.min(26, e.vel * 10));
          var mxr = (w / 2 + handX) / 2, myr = handY / 2;
          ctx.strokeStyle = cssVar('--border', '#E5E7EB');
          ctx.lineWidth = 3.5; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(w / 2, 0);
          ctx.quadraticCurveTo(mxr + cSw * bow, myr - s * bow, handX, handY);
          ctx.stroke();
          // the Bobit hangs off the rope end, rotated with the swing
          ctx.save();
          ctx.translate(w / 2, 0); ctx.rotate(e.ang); ctx.translate(-w / 2, 0);
          drawFig(ctx, w / 2, py, S, false, A.rope.frame(tt), { color: col });
          ctx.restore();
          return;
        }
      });
    }

    reposition();
    setInterval(tick, 1000 / 50);
    setInterval(reposition, 700);
    window.addEventListener('resize', reposition);
  });
})();
