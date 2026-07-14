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

    // when a hero tool is highlighted, the presenter Bobit points straight at THAT tool
    var featureOn = false, featureCX = 0, featureCY = 0;
    var logosWrap = document.querySelector('.showcase-logos');
    if (logosWrap) {
      var aimAt = function (el) { var r = el.getBoundingClientRect(); featureOn = true; featureCX = r.left + r.width / 2; featureCY = r.top + r.height / 2; };
      logosWrap.addEventListener('mouseleave', function () { featureOn = false; });
      logosWrap.addEventListener('focusout', function () { featureOn = false; });
      logosWrap.querySelectorAll('.logo-trigger').forEach(function (tr) {
        tr.addEventListener('mouseenter', function () { aimAt(tr); });
        tr.addEventListener('focus', function () { aimAt(tr); });
      });
    }

    // click to shove a rope Bobit / tip over a toddler
    document.addEventListener('click', function (ev) {
      entries.forEach(function (e) {
        // toddler: click him and he falls; the adult turns and throws up an arm
        if (e.spec.mode === 'patrol' && e.spec.toddler && e._toddSX != null && !e._fall && !e.greet) {
          if (Math.abs(ev.clientX - e._toddSX) < 42 && Math.abs(ev.clientY - e._toddSY) < 72) { e._fall = 4.5; return; }
        }
        if (e.spec.mode !== 'rope' || !e.w || e._ropeSX == null) return;
        if (Math.abs(ev.clientX - e._ropeSX) > 55 || Math.abs(ev.clientY - e._ropeSY) > 82) return;
        if (e.rphase === 'sit') { e.rphase = 'break'; e.breakT = 0; return; }   // frame breaks out from under him
        if (e.rphase === 'hang') {
          var dir = ev.clientX > e._ropeSX ? 1 : -1;      // push away from the click
          e.vel = Math.max(-1.9, Math.min(1.9, (e.vel || 0) + dir * 1.6));   // capped so the swing stays in frame
          e.scramble = 1;                                 // startled — scrambles like he might fall
        }
      });
    }, { passive: true });

    function cssVar(name, fallback) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    }

    // Brand-derived figure palettes — no hard red/blue.
    // Light mode: brighter, vivid set. Dark mode: the dark-theme brand variants.
    // 0 teal · 1 coral · 2 gold · 3 green · 4 purple · 5 orange — tuned per theme for legibility.
    // Light values are deep enough to read on the near-white bg (esp. the gold, ~3:1);
    // dark values are bright.
    var FIG_COLORS = {
      light: ['#007D99', '#FF5740', '#B8860B', '#2E9E5B', '#7A4FD0', '#E0641C'],
      dark:  ['#1DA8C6', '#FF6B52', '#FFD740', '#43D07E', '#B49BFF', '#FF9A4D']
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
    // ── Randomized casting: each page load staffs every section from a pool,
    //    so you get a different batch of Bobits every visit. ──
    // tone: 0 = teal/blue · 1 = coral/red · 2 = marigold/yellow
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    function chance(p) { return Math.random() < p; }
    var GAITS = ['stroll', 'strut', 'sneak', 'trudge', 'shuffle'];   // no stiff march / frantic scurry in the rotation
    var GSPEED = { stroll: 32, strut: 40, scurry: 62, march: 34, sneak: 22, trudge: 16, shuffle: 20 };
    var IDLES = ['bored', 'sassy', 'confused', 'standstill', 'present'];
    var SEATS = ['sit', 'read'];
    var TONES = [0, 1, 2, 3, 4, 5];   // full palette (teal/coral/gold/green/purple/orange)

    function walker(anchor, opt) {
      opt = opt || {};
      var withTot = opt.allowToddler && chance(0.5);
      var g = withTot ? pick(['stroll', 'shuffle']) : pick(GAITS);   // gentle gait when escorting a toddler
      var s = { mode: 'patrol', anchor: anchor, edge: 'top', anim: g, speed: withTot ? 12 : GSPEED[g], tone: (opt.tone != null ? opt.tone : pick(TONES)) };
      if (withTot) { s.toddler = true; s.toddlerTone = pick(TONES); s.toddlerStyle = pick(['waddle', 'march']); }
      return s;
    }
    // one figure (or none) for a note-card top edge
    function noteSlot(anchor, opt) {
      opt = opt || {};
      var r = Math.random();
      if (r < 0.45) return walker(anchor, opt);
      if (r < 0.74) return { mode: 'seat', anchor: anchor, edge: 'top', x: pick([0.14, 0.5, 0.82]), anim: pick(SEATS), tone: (opt.seatTone != null ? opt.seatTone : pick(TONES)) };
      if (r < 0.9 || opt.always) return { mode: 'stand', anchor: anchor, edge: 'top', x: pick([0.2, 0.5, 0.8]), anim: pick(IDLES), tone: pick(TONES) };
      return null;   // sometimes empty
    }

    function buildCast() {
      var out = [];
      var add = function (s) { if (s) out.push(s); };
      add({ mode: 'beam', anchor: '.hero', edge: 'bottom', tone: 0 });                                    // hero crew — always
      add({ mode: 'stand', anchor: '.hero .meta-row', edge: 'top', x: 0.9, anim: 'present', tone: 0, presenter: true });  // proud host under the logo
      add({ mode: 'why', anchor: '.why-grid .why-item:nth-of-type(1) .why-icon', anim: 'spent', color: '--yellow' });       // fixed (content)
      add({ mode: 'why', anchor: '.why-grid .why-item:nth-of-type(2) .why-icon', anim: 'notlistening', color: '--teal' });
      add({ mode: 'why', anchor: '.why-grid .why-item:nth-of-type(3) .why-icon', anim: 'witsend', color: '--coral' });
      add(noteSlot('.note.n-alpha', { allowToddler: true, always: true }));  // Note 1 always hosts a Bobit (moved off Note 2)
      add(noteSlot('.note.n-ai', {}));                                       // Note 2 (n-team) intentionally left clear
      add(noteSlot('.note.n-money', {}));
      // watch top — an elder, or a random walker
      add(chance(0.5)
        ? { mode: 'patrol', anchor: 'section.watch', edge: 'top', anim: 'elder', speed: 15, tone: pick(TONES), hoverAnim: 'elderangry' }
        : walker('section.watch', {}));
      // watch thumbnail corner — peeker, idler, or hover-jumper
      var pr = Math.random(), pk = { mode: 'stand', anchor: '.watch-grid .watch-card:nth-of-type(2) .watch-thumb', edge: 'top', x: 0.96, tone: pick(TONES) };
      if (pr < 0.6) { pk.anim = 'peek'; pk.hoverAnim = 'shrug'; }  // peek (hover: shrug)
      else { pk.anim = pick(IDLES); }                             // idle (hover: wave). Only the footer stander jumps.
      add(pk);
      if (chance(0.85)) add({ mode: 'rope', anchor: '.watch-grid .watch-card:nth-of-type(3) .watch-thumb', tone: pick(TONES) });
      // footer pair — always present so the meet-and-greet keeps happening
      add(walker('footer', { tone: 0 }));
      add({ mode: 'stand', anchor: 'footer', edge: 'top', x: 0.06, anim: pick(['standstill', 'bored', 'sassy']), hover: 'jump', tone: 1 });
      return out;
    }

    var SPECS = buildCast();

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
      // per-figure wave variation: alternating hand + a spread of speeds (so waves aren't uniform)
      var wv = { hand: (i % 2 === 0 ? 'R' : 'L'), hz: 1.25 + (i % 4) * 0.28 };
      entries.push({ spec: spec, el: el, c: c, ctx: c.getContext('2d'), phase: i * 2.13, w: 0, h: 0, ci: (spec.mode === 'why' ? 0 : ci++), lt: 0, greet: 0, linger: 0, _wave: wv });
    });

    // footer pair: the strolling Bobit greets the standing one when he walks up
    var footWalk = null, footStand = null;
    entries.forEach(function (e) {
      if (e.spec.anchor === 'footer' && e.spec.mode === 'patrol') footWalk = e;
      if (e.spec.anchor === 'footer' && e.spec.mode === 'stand') footStand = e;
    });

    function smooth01(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
    var BEAM_LOADS = ['circle'];   // the crew just hauls the ball now (no triangle/line swapping)
    function nextLoad(cur) { var o = BEAM_LOADS.filter(function (x) { return x !== cur; }); return o.length ? o[Math.floor(Math.random() * o.length)] : cur; }

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
          var wV = 150;
          sizeCanvas(e, wV, h);
          var leftV = r.right + sx - wV / 2;                                  // centered on the note's right edge
          var maxLeftV = sx + document.documentElement.clientWidth - wV - 4;  // but never past the viewport (no h-scroll)
          if (leftV > maxLeftV) leftV = maxLeftV;
          e.c.style.left = leftV + 'px';
          e.c.style.top = (r.top + sy + (r.height - h) / 2) + 'px';
          return;
        }
        if (spec.mode === 'rope') {
          var wR = 350;                                                       // room for the frame bar + long swing
          sizeCanvas(e, wR, 300);
          var leftR = r.right + sx - 220;                                     // pivot (x=250) ~30px right of the video edge (over the chasm)
          var maxLeftR = sx + document.documentElement.clientWidth - wR - 4;  // never past the viewport (no h-scroll)
          if (leftR > maxLeftR) leftR = maxLeftR;
          if (leftR < sx + 4) leftR = sx + 4;
          e.c.style.left = leftR + 'px';
          e.c.style.top = (r.top + sy - 44) + 'px';                          // frame up near the Talks line
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

      // ── footer meet-and-greet: a call-and-response, not a synchronized wave ──
      // Stage 1: the stander spots the walker coming and waves FIRST (walker still moving).
      // Stage 2: the walker arrives, stops, and returns the wave ~0.9s later (overlaps, not in sync).
      if (footWalk && footWalk.w && footStand && footStand.w) {
        footWalk._cool = Math.max(0, (footWalk._cool || 0) - dt);
        var fwr = footWalk.c.getBoundingClientRect();
        if (fwr.top < window.innerHeight && fwr.bottom > 0) {          // only when the footer is on screen
          var padF = 70, spanF = footWalk.w - padF * 2;
          var ttF = footWalk.lt + footWalk.phase;
          var uF = (ttF * footWalk.spec.speed / spanF) % 2; if (uF < 0) uF += 2;
          var walkerX = fwr.left + padF + (uF < 1 ? uF : 2 - uF) * spanF;
          var standX = footStand.c.getBoundingClientRect().left + footStand.w / 2;
          var distF = Math.abs(walkerX - standX);
          var towardStander = uF > 1;                                   // moving left, toward the far-left stander
          if (towardStander && footWalk._cool <= 0 && !footWalk.greet) {
            if (distF < 104 && !footStand.wave) footStand.wave = 0.001; // red waves first, from a step away
            if (distF < 58) {                                           // blue reaches him, stops, returns the wave
              footWalk.greet = 0.001; footWalk.linger = 1.6; footWalk._meet = true;
              footWalk._cool = 6;                                       // don't repeat until he's looped back
            }
          }
        }
      }

      entries.forEach(function (e) {
        var spec = e.spec, ctx = e.ctx, w = e.w, h = e.h;
        if (!w) return;
        // skip offscreen canvases
        var cr = e.c.getBoundingClientRect();
        if (cr.bottom < -40 || cr.top > window.innerHeight + 40) return;
        ctx.clearRect(0, 0, w, h);
        var feetY = h - 6;
        var col = figColor(spec.tone != null ? spec.tone : e.ci);
        var hoverable = spec.mode === 'stand' || spec.mode === 'patrol' || spec.mode === 'seat';
        // per-entry clock freezes while greeting, so patrols resume where they stopped
        if (e.greet) e.greet += dt;
        if (e._fall > 0) e._fall = Math.max(0, e._fall - dt);
        e.lt += dt * ((e.greet || e._fall > 0) ? 0 : 1);
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
            if (e.linger <= 0) { e.greet = 0; e._meet = false; }
          }
        }

        if (spec.mode === 'why') {
          var color = spec.color === '--yellow' ? figColor(2) : cssVar(spec.color, ink);   // legible gold instead of faint --yellow
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
          var oyS = feetY - 112 * S;
          if (spec.presenter) {
            R.drawShadow(ctx, w / 2, feetY, 16, shadow);
            if (e.greet) {
              drawFig(ctx, w / 2, oyS, S, true, A[spec.hoverAnim || 'greet'].frame(e.greet, e._wave), { color: col });
            } else if (featureOn) {
              // aim a straight arm directly at the highlighted tool's on-screen position
              var ox = cr.left + w / 2, oy = cr.top + oyS - 26;   // ~shoulder
              var Adeg = Math.atan2(-(featureCX - ox), (featureCY - oy)) * 180 / Math.PI;
              var pp = Object.assign({}, R.REST);
              pp.lean = -3; pp.headTilt = -8; pp.bob = 1 + Math.sin(tt * 2) * 1.2;
              pp.armRU = Adeg - pp.lean; pp.armRF = Adeg - pp.lean + Math.sin(tt * 3) * 2;
              pp.armLU = -12; pp.armLF = -7;              // other arm at his side
              drawFig(ctx, w / 2, oyS, S, true, pp, { color: col });
            } else {
              drawFig(ctx, w / 2, oyS, S, true, A.standstill.frame(tt), { color: col });   // arms at side while the EV logo is up
            }
            return;
          }
          var animSt, ptSt, flipSt = false;
          if (spec.hover === 'jump') {
            if (e.greet) { animSt = A.jump; ptSt = e.greet; }
            else if (e.wave > 0) { e.wave += dt; if (e.wave > 2.2) e.wave = 0; animSt = A.greet; ptSt = e.wave; }  // greets the walker (starts before he stops)
            else { animSt = A.standstill; ptSt = tt; }
          }
          else { animSt = e.greet ? A[spec.hoverAnim || 'greet'] : A[spec.anim]; ptSt = e.greet ? e.greet : tt; }
          R.drawShadow(ctx, w / 2, feetY, 16, shadow);
          drawFig(ctx, w / 2, oyS, S, flipSt, animSt.frame(ptSt, e._wave), { color: col });
          return;
        }
        if (spec.mode === 'seat') {
          var animSe = e.greet ? A.greetseat : A[spec.anim];
          var ptSe = e.greet ? e.greet : tt;
          var seatY = h - 42;   // matches the seat line set in reposition(); leaves room for dangling legs
          drawFig(ctx, w / 2, seatY, S, spec.x > 0.5, animSe.frame(ptSe, e._wave), { color: col, book: (!e.greet && spec.anim === 'read') });
          return;
        }
        if (spec.mode === 'patrol') {
          var SEQ = 4.5;   // toddler fall-and-recover length (matches SEQ_FALL in the rig)
          // toddler in front (adult trails); click him -> he falls, the parent scoops him back up
          if (spec.toddler) {
            var TS = S * 0.62;
            var tTgt = (e._dirR ? 1 : -1) * 48;                       // leads farther ahead, so the adult is clearly behind
            e._toff = (e._toff == null) ? tTgt : e._toff + (tTgt - e._toff) * Math.min(1, dt * 5);
            var toddX = figX + e._toff;
            e._toddSX = cr.left + toddX; e._toddSY = cr.top + feetY - 26;   // for click hit-testing
            var totCol = figColor(spec.toddlerTone != null ? spec.toddlerTone : 1);
            var standYtot = feetY - 112 * TS, groundYtot = feetY - 8 * TS;
            R.drawShadow(ctx, toddX, feetY, 10, shadow);
            if (e._fall > 0) {
              var ft = SEQ - e._fall;                                 // elapsed
              var ky;                                                 // 0 standing .. 1 on the ground
              if (ft < 0.7) ky = smooth01(ft / 0.7);                  // topple down (slow)
              else if (ft < SEQ - 0.9) ky = 1;                        // sit
              else ky = 1 - smooth01((ft - (SEQ - 0.9)) / 0.9);       // lifted back to standing
              drawFig(ctx, toddX, standYtot + (groundYtot - standYtot) * ky, TS, !e._dirR, A.fall.frame(ft), { color: totCol });
            } else {
              var totAnim = spec.toddlerStyle === 'march' ? A.toddlemarch : A.toddle;
              drawFig(ctx, toddX, standYtot, TS, !e._dirR, totAnim.frame(tt * 1.1 + 1.7), { color: totCol });
            }
          }
          R.drawShadow(ctx, figX, feetY, 16, shadow);
          var animP, ptP, flipP, parentX = figX;
          if (spec.toddler && e._fall > 0) {
            var ft2 = SEQ - e._fall;
            animP = A.scold; ptP = ft2;
            flipP = e._dirR ? false : true;                           // face the fallen kid (ahead in travel dir)
            var reach = ft2 < 1.8 ? 0 : smooth01((ft2 - 1.8) / 1.2);  // step toward the kid to reach him
            parentX = figX + e._toff * 0.5 * reach;
          } else {
            animP = e.greet ? A[spec.hoverAnim || 'greet'] : A[spec.anim];
            ptP = e.greet ? e.greet : tt;
            // when greeting, face the viewer — unless it's the footer meet, then turn to face the stander (left)
            flipP = e.greet ? (e._meet ? true : false) : !e._dirR;
          }
          var pPose = animP.frame(ptP, e._wave);
          if (spec.toddler && spec.toddlerStyle === 'march' && !e.greet && !e._fall) {
            pPose.armRU = Math.max(pPose.armRU, 44); pPose.armLU = Math.min(pPose.armLU, -44);   // catch-ready
          }
          drawFig(ctx, parentX, feetY - 112 * S, S, flipP, pPose, { color: col, cane: animP.cane });
          return;
        }
        if (spec.mode === 'beam') {
          // The crew hauls a load ALL the way off one edge, dwells off-screen,
          // then walks back carrying a different load (yellow line ↔ red triangle).
          var speedB = 30, halfGap = 24, endMargin = 110;
          if (e.bx == null) { e.bx = w * 0.5; e.dir = 1; e.load = 'circle'; e.dwell = 0; }
          var fx = e.bx + e.dir * halfGap;      // front (leading) carrier
          var bx2 = e.bx - e.dir * halfGap;     // back carrier
          // hover: a carrier drops his end (line only) and waves; partner holds, annoyed
          var nearF = Math.abs(mx - (cr.left + fx)) < 36;
          var nearB = Math.abs(mx - (cr.left + bx2)) < 36;
          var inY = my > cr.top + h - 92 && my < cr.top + h + 6;
          // ── ball gag: hovering while carrying the CIRCLE drops it on the front guy's foot ──
          if (e.load === 'circle' && (nearF || nearB) && inY && !e.gagOn) { e.gagOn = true; e.gagT = 0; e.gF = fx; e.gB = bx2; e.gdir = e.dir; }
          if (e.gagOn) {
            e.gagT += dt; var gt = e.gagT, gdir = e.gdir, ballR = 16;
            var carryYg = feetY - 97 * S, footYg = feetY - 6;
            var LAND = 0.5, TORN_END = 2.7, CHASE_F = 3.4;
            var ballX, ballY;
            if (gt < LAND) { ballX = e.gF; ballY = carryYg + (footYg - ballR - carryYg) * smooth01(gt / LAND); }   // drops onto his foot
            else { var rt = gt - LAND; ballX = e.gF - gdir * (16 * rt + 6 * rt * rt); ballY = footYg - ballR; }    // then rolls slowly back
            // front guy: keeps CARRYING as it falls; only hops in pain once it LANDS; then chases
            var frontX = e.gF, frontPose, frontFlip = gdir < 0;
            if (gt < LAND) frontPose = A.carry.frame(tt);
            else if (gt < CHASE_F) frontPose = A.painhop.frame(gt - LAND);
            else { var ct = gt - CHASE_F; frontX = e.gF - gdir * (52 * ct + 24 * ct * ct); frontPose = A.scurry.frame(gt); frontFlip = gdir > 0; }
            // back guy: keeps carrying, then TORN (looks friend<->ball), then chases too
            var backX = e.gB, backPose, backFlip = gdir < 0;
            if (gt < LAND) backPose = A.carry.frame(tt + 0.16);
            else if (gt < TORN_END) backPose = A.holdannoyed.frame(gt - LAND);
            else { var bt = gt - TORN_END; backX = e.gB - gdir * (64 * bt + 28 * bt * bt); backPose = A.scurry.frame(gt); backFlip = gdir > 0; }
            ctx.fillStyle = cssVar('--coral', '#FF5740');
            ctx.beginPath(); ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2); ctx.fill();
            R.drawShadow(ctx, frontX, feetY, 15, shadow); R.drawShadow(ctx, backX, feetY, 15, shadow);
            drawFig(ctx, frontX, feetY - 112 * S, S, frontFlip, frontPose, { color: col });
            drawFig(ctx, backX, feetY - 112 * S, S, backFlip, backPose, { color: col });
            if (ballX < -70 || ballX > w + 70 || gt > 12) {   // track them until all the way off-screen, then respawn
              e.gagOn = false; e.greet = 0; e.wF = e.wB = false;
              e.dir = gdir; e.bx = gdir > 0 ? -endMargin : w + endMargin; e.dwell = 0.8;
            }
            return;
          }
          if ((nearF || nearB) && inY) {
            if (!e.greet) e.greet = 0.001;
            if (nearF) e.wF = true;
            if (nearB) e.wB = true;
            e.linger = 2.0;
          } else if (e.greet) {
            e.linger -= dt;
            if (e.linger <= 0) {
              if (e.load === 'line' && (e.dF > 0.25 || e.dB > 0.25)) e._pickup = 1.2;   // bend down & lift, don't snap
              e.greet = 0; e.wF = e.wB = false;
            }
          }
          if (e._pickup > 0) e._pickup = Math.max(0, e._pickup - dt);
          // advance (frozen while greeting, picking up, or dwelling off-screen); swap load at each off-screen turn
          if (!e.greet && !(e._pickup > 0)) {
            if (e.dwell > 0) e.dwell -= dt;
            else {
              e.bx += e.dir * speedB * dt;
              if (e.bx > w + endMargin) { e.dir = -1; e.load = nextLoad(e.load); e.dwell = 1.1; }
              else if (e.bx < -endMargin) { e.dir = 1; e.load = nextLoad(e.load); e.dwell = 1.1; }
            }
            fx = e.bx + e.dir * halfGap; bx2 = e.bx - e.dir * halfGap;
          }
          var goingR = e.dir > 0;
          // drop/raise each end (line load only — a rigid triangle isn't dropped)
          e.dF = e.dF || 0; e.dB = e.dB || 0;
          var kB = Math.min(1, dt * 6), dropOK = e.load === 'line';
          e.dF += (((e.greet && e.wF && dropOK) ? 1 : 0) - e.dF) * kB;
          e.dB += (((e.greet && e.wB && dropOK) ? 1 : 0) - e.dB) * kB;
          var carryY = feetY - 97 * S, groundY = feetY - 3;
          if (e.load === 'triangle') {
            // logo-style red triangle: tip forward, a MEDIUM notch bitten out of the mid back edge
            var baseX = bx2, tipX = fx + e.dir * 4, cyT = carryY, halfT = 18, notch = 11;
            ctx.fillStyle = cssVar('--coral', '#FF5740');
            ctx.beginPath();
            ctx.moveTo(baseX, cyT - halfT);            // top back corner
            ctx.lineTo(tipX, cyT);                     // tip
            ctx.lineTo(baseX, cyT + halfT);            // bottom back corner
            ctx.lineTo(baseX, cyT + notch);            // up the flat base to the notch
            ctx.arc(baseX, cyT, notch, Math.PI / 2, -Math.PI / 2, true);  // medium semicircle bite
            ctx.lineTo(baseX, cyT - halfT);            // remaining flat base up to the top corner
            ctx.closePath(); ctx.fill();
          } else if (e.load === 'circle') {
            // the logo's red circle
            ctx.fillStyle = cssVar('--coral', '#FF5740');
            ctx.beginPath(); ctx.arc((fx + bx2) / 2, carryY, 16, 0, Math.PI * 2); ctx.fill();
          } else {   // line load
            ctx.strokeStyle = figColor(2);   // legible gold on light, bright yellow on dark
            ctx.lineWidth = 5; ctx.lineCap = 'round';
            if (e._pickup > 0) {
              // being picked up: line lifts off the ground as they straighten
              var pe = 1.2 - e._pickup, lift = pe < 0.6 ? 0 : (pe - 0.6) / 0.6;
              var yPick = groundY + (carryY - groundY) * smooth01(lift);
              ctx.beginPath(); ctx.moveTo(fx + e.dir * 12, yPick); ctx.lineTo(bx2 - e.dir * 12, yPick); ctx.stroke();
            } else {
              var yF = carryY + (groundY - carryY) * e.dF;
              var yB = carryY + (groundY - carryY) * e.dB;
              ctx.beginPath(); ctx.moveTo(fx + e.dir * 12, yF); ctx.lineTo(bx2 - e.dir * 12, yB); ctx.stroke();
            }
          }
          R.drawShadow(ctx, fx, feetY, 15, shadow);
          R.drawShadow(ctx, bx2, feetY, 15, shadow);
          var poseF, poseB, flipF = !goingR, flipB = !goingR;
          if (e._pickup > 0) {
            // both crouch to grab the dropped line and lift it together
            var peP = 1.2 - e._pickup;
            poseF = A.heave.frame(peP); poseB = A.heave.frame(peP);
          } else if (e.greet) {
            var holdPose = A.holdannoyed.frame(e.greet);
            poseF = e.wF ? A.greet.frame(e.greet, { hand: 'R', hz: 1.5 }) : holdPose;
            poseB = e.wB ? A.greet.frame(e.greet, { hand: 'L', hz: 1.95 }) : holdPose;
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
          // Climb UP (limbs synced to the rise, so each pull ratchets him up a notch),
          // pause at the top, then RAPPEL down in kick-off bounces (limb cycle reversed).
          var topY = 48, botY = h - 46, travel = botY - topY;
          var STEPS = 5;
          var upDur = STEPS * 1.7, topPause = 0.6, downDur = 1.9;
          var Tc = upDur + topPause + downDur;
          var phc = ((tt % Tc) + Tc) % Tc;
          var y3, poseC;
          if (phc < upDur) {
            var pu = phc / upDur;
            poseC = A.climb.frame(phc);                         // limbs cycle in real time
            var sp = pu * STEPS;                                // ratchet: body bumps up once per limb cycle
            y3 = botY - ((Math.floor(sp) + smooth01(sp - Math.floor(sp))) / STEPS) * travel;
          } else if (phc < upDur + topPause) {
            y3 = topY; poseC = A.climb.frame(upDur);            // reached the top, brief settle
          } else {
            var pd = (phc - upDur - topPause) / downDur;        // 0..1 descent
            poseC = A.climb.frame(upDur - pd * downDur * 2.2);  // reverse the limb cycle → reaching downward
            var seg = pd * 2, si = Math.floor(seg), sf = seg - si;
            y3 = topY + ((si + (1 - (1 - sf) * (1 - sf))) / 2) * travel;   // two kick-off drops
          }
          drawFig(ctx, w / 2, y3, S, false, poseC, { color: col });
          return;
        }
        if (spec.mode === 'rope') {
          // Two-step: he sits on a horizontal frame bar; click BREAKS it and he grabs
          // the rope and dangles; then clicking/pushing him swings him (pendulum).
          var pivotX = 250, barY = 46, barLen = 145;   // pivot far right (over the chasm); frame extends LEFT
          var grey = cssVar('--border', '#C9C6BE');
          ctx.strokeStyle = grey; ctx.lineCap = 'round';
          e.rphase = e.rphase || 'sit';
          var handAbove = 148 * S;                        // hands sit this far above the pelvis in the rope pose

          if (e.rphase === 'sit') {
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(pivotX, 0); ctx.lineTo(pivotX, barY); ctx.stroke();               // suspender holds the right end
            ctx.beginPath(); ctx.moveTo(pivotX, barY); ctx.lineTo(pivotX - barLen, barY); ctx.stroke();   // frame extends LEFT
            var sitX = pivotX - barLen + 16;              // he sits on the LEFT end
            e._ropeSX = cr.left + sitX; e._ropeSY = cr.top + barY + 18;
            drawFig(ctx, sitX, barY, S, false, A.sit.frame(tt, e._wave), { color: col });
            return;
          }

          // swingAng = rope's angle LEFT of straight-down. break: 90deg->0 (swings down & right); hang: pendulum
          var swingAng, bow = 0;
          if (e.rphase === 'break') {
            e.breakT = (e.breakT || 0) + dt;
            var bk = Math.min(1, e.breakT / 0.85);
            swingAng = (Math.PI / 2) * (1 - smooth01(bk));
            if (bk >= 1) { e.rphase = 'hang'; e.ang = 0; e.vel = 0; e.scramble = 1; }   // grabs on, startled
          } else {
            e.ang = e.ang || 0; e.vel = e.vel || 0;
            e.vel += (-9 * e.ang - 0.9 * e.vel) * dt;
            e.ang += e.vel * dt;
            if (e.scramble > 0) e.scramble = Math.max(0, e.scramble - dt / 1.1);
            swingAng = e.ang;
            bow = Math.max(-22, Math.min(22, e.vel * 9));
          }
          var handX = pivotX - Math.sin(swingAng) * barLen;
          var handY = barY + Math.cos(swingAng) * barLen;
          ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.moveTo(pivotX, 0); ctx.lineTo(pivotX, barY); ctx.stroke();                 // suspender stays
          ctx.beginPath(); ctx.moveTo(pivotX, barY);
          ctx.quadraticCurveTo((pivotX + handX) / 2 + bow, (barY + handY) / 2, handX, handY); ctx.stroke();
          var poseR = A.rope.frame(tt);
          if (e.scramble > 0) {
            var scr = e.scramble, fl = Math.sin(tt * 34);
            poseR.legRF += fl * 28 * scr; poseR.legLF += -fl * 28 * scr;
            poseR.headTilt += Math.sin(tt * 27) * 12 * scr; poseR.bob += Math.sin(tt * 31) * 3 * scr;
          }
          e._ropeSX = cr.left + handX; e._ropeSY = cr.top + handY + 40;   // hit test tracks the swing
          drawFig(ctx, handX, handY + handAbove, S, false, poseR, { color: col });   // hangs UPRIGHT below his hands
          return;
        }
      });
    }

    reposition();
    setInterval(tick, 1000 / 50);
    setInterval(reposition, 700);
    window.addEventListener('resize', reposition);

    // opt-in debug handle (no effect unless the page is loaded with #figdebug)
    if (location.hash === '#figdebug') window.__evFigDebug = { entries: entries, footWalk: footWalk, footStand: footStand };
  });
})();
