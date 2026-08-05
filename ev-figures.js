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
      var hitQuote = false;
      entries.forEach(function (e) {
        // toddler: click him and he falls; the adult turns and throws up an arm
        if (e.spec.mode === 'patrol' && e.spec.toddler && e._toddSX != null && !e._fall && !e.greet) {
          if (Math.abs(ev.clientX - e._toddSX) < 42 && Math.abs(ev.clientY - e._toddSY) < 72) { e._fall = 4.5; return; }
        }
        // light-gag Bobit: click him and he waves briefly, then gets right back to work
        if (e.spec.mode === 'beam' && e.scene === 'light' && e._lgSX != null && !(e.lightWave > 0)) {
          if (Math.abs(ev.clientX - e._lgSX) < 42 && Math.abs(ev.clientY - e._lgSY) < 72) { e.lightWave = 1.4; return; }
        }
        // cartwheeler: click him → flag him; at the END of his next cartwheel he falls into a heap
        if (e.spec.mode === 'cartwheel' && e._cwSX != null && !e.cwHurt && (e.cw === 'walk' || e.cw === 'cwheel' || e.cw === 'stand' || e.cw === 'headshake')) {
          if (Math.abs(ev.clientX - e._cwSX) < 40 && Math.abs(ev.clientY - e._cwSY) < 84) { e.cwHurt = true; return; }
        }
        // dog-fetch: click the dog → he drops the ball & rolls over; click the owner → the mega throw
        if (e.spec.mode === 'dogfetch' && e._dogSX != null && !e.mega && !e.megaPending && !(e.dogRoll > 0)) {
          if (Math.abs(ev.clientX - e._dogSX) < 24 && Math.abs(ev.clientY - e._dogSY) < 34) {
            e.dogRoll = DOG_ROLL_SECS;
            if (e.bHeld === 'dog') { e.bHeld = 'ground'; e.bX = e.dogX; e.bY = e.h - 6 - 7; }   // drop what he was carrying
            return;
          }
          if (Math.abs(ev.clientX - e._thSX) < 34 && Math.abs(ev.clientY - e._thSY) < 72) {
            e.megaPending = true;   // he waits for the dog to bring the ball back, THEN hurls it off-screen
            return;
          }
        }
        // yo-yo: click the player → "walk the dog" (lets it to the floor, it rolls, then snaps back up)
        if (e.spec.mode === 'yoyo' && e._yoSX != null && e.yo === 'throw') {
          if (Math.abs(ev.clientX - e._yoSX) < 28 && Math.abs(ev.clientY - e._yoSY) < 60) { e.yo = 'wd_down'; e.yoT = 0; return; }
        }
        // kite: click the kite → a loop; click the flyer → the kite spins & falls, then he relaunches it
        if (e.spec.mode === 'kite' && e._kiteSX != null) {
          if (e.kt === 'fly' && Math.abs(ev.clientX - e._kiteSX) < 26 && Math.abs(ev.clientY - e._kiteSY) < 26) { e.kt = 'loop'; e.ktT = 0; return; }
          if ((e.kt === 'fly' || e.kt === 'loop') && Math.abs(ev.clientX - e._kgSX) < 28 && Math.abs(ev.clientY - e._kgSY) < 56) { e.kt = 'spin'; e.ktT = 0; return; }
        }
        // letter carriers (a beam-crew pass): click the v-carrier → v drops over his eyes; click the e-carrier → sets it down, waves, rolls it off
        if (e.spec.mode === 'beam' && e.scene === 'letters' && e._lFY != null) {
          if (e.vSt === 'walk' && Math.abs(ev.clientX - e._vSX) < 36 && ev.clientY > e._lFY - 104 && ev.clientY < e._lFY + 8) { e.vSt = 'fall'; e.vT = 0; return; }
          if (e.eSt === 'walk' && Math.abs(ev.clientX - e._eSX) < 36 && ev.clientY > e._lFY - 84 && ev.clientY < e._lFY + 8) { e.eSt = 'drop'; e.eT = 0; return; }
        }
        // phone-sitter: click him → pocket the phone (hang out); click again → take it back out
        if (e.spec.mode === 'seat' && e.spec.phone && e._phSX != null) {
          if (Math.abs(ev.clientX - e._phSX) < 40 && ev.clientY > e._phFY - 104 && ev.clientY < e._phFY + 8) {
            if (e.ph === 'absorbed') { e.ph = 'pocket'; e.phT = 0; }
            else if (e.ph === 'hangout') { e.ph = 'draw'; e.phT = 0; }
            return;   // ignore clicks landing mid-transition
          }
        }
        // seated reader: click → he looks up and his bubble opens; click again → back to his
        // book. No quote reached him → an apologetic shrug instead.
        if (e.spec.mode === 'seat' && e.spec.anim === 'read' && !e.spec.phone && e._qSX != null) {
          if (Math.abs(ev.clientX - e._qSX) < 40 && ev.clientY > e._qFY - 104 && ev.clientY < e._qFY + 8) {
            hitQuote = true;
            if (e.qs === 'read') {
              if (e.spec.quote) { e.qs = 'lookup'; e.qsT = 0; }
              else { e.qs = 'shrug'; e.qsT = 0; }
            } else if (e.qs === 'hold') {
              if (e.qh) { window.EVQuotes.close(e.qh); e.qh = null; }
              e.qs = 'resume'; e.qsT = 0;
            }
            return;   // mid-transition clicks are ignored
          }
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
      // NB: the `return`s above only exit the forEach callback, so dismissal has to happen
      // out here. Clicking anywhere that isn't a reader (or a bubble, which stops
      // propagation) closes every open quote and sends those readers back to their books.
      if (!hitQuote && window.EVQuotes && window.EVQuotes.openCount()) {
        window.EVQuotes.closeAll();
        entries.forEach(function (e) {
          if (e.qh) { e.qh = null; e.qs = 'resume'; e.qsT = 0; }
        });
      }
    }, { passive: true });

    // Esc dismisses every open quote bubble
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape') return;
      if (!window.EVQuotes || !window.EVQuotes.openCount()) return;
      window.EVQuotes.closeAll();
      entries.forEach(function (e) {
        if (e.qh) { e.qh = null; e.qs = 'resume'; e.qsT = 0; }
      });
    });

    // ══ POOF & EXODUS ═══════════════════════════════════════════════════════════════════
    // Hold the right mouse button (or one finger) on any Bobit for 3s: smoke gathers, he
    // vanishes, everyone else freezes for a beat and then bolts off-screen. The page stays
    // empty until reload.
    var POOF_HOLD = 3.0, POOF_BURST = 0.6, POOF_STUN = 1.0;
    // fx/fy: where the press landed, as a FRACTION of the victim's canvas rect. The smoke is
    // re-projected through his live rect every frame, so it sits on the figure the user actually
    // grabbed instead of the canvas centre — most modes (patrol, cartwheel, kite, paddlepair,
    // yoyo, dogfetch) draw well off-centre, so the centre could be hundreds of px of blank page
    // away from him. Fractions rather than pixels so a canvas resize can't strand the cloud.
    // 0.5 / 1.0 (centre, floor) is the fallback when the phase is driven directly, e.g. by tests.
    var POOF = { phase: 'idle', t: 0, victim: null, armed: false, sx: 0, sy: 0, fx: 0.5, fy: 1, breakLines: null };

    // Which Bobit is under this point? The canvases are pointer-events:none and only two modes
    // bother to store a hitbox, so rather than add one to all fourteen we ask the pixels:
    // convert the point into canvas space and read its alpha. Non-zero means the pointer is on
    // painted ink — an actual figure, not the empty box around him — and any mode added later
    // inherits this for free. These canvases draw vectors only, so they are never tainted.
    function bobitAt(px, py) {
      for (var i = entries.length - 1; i >= 0; i--) {          // topmost first
        var e = entries[i];
        if (!e.w || e.gone || e.spec.mode === 'why') continue; // why figures are content, not inhabitants
        var r = e.c.getBoundingClientRect();
        if (px < r.left || px > r.right || py < r.top || py > r.bottom) continue;
        var kx = e.c.width / r.width, ky = e.c.height / r.height;
        var pad = Math.max(2, Math.round(6 * kx));             // a few px of slop around thin limbs
        var x0 = Math.max(0, Math.round((px - r.left) * kx) - pad);
        var y0 = Math.max(0, Math.round((py - r.top) * ky) - pad);
        var bw = Math.min(e.c.width - x0, pad * 2 + 1);
        var bh = Math.min(e.c.height - y0, pad * 2 + 1);
        if (bw <= 0 || bh <= 0) continue;
        var d;
        try { d = e.ctx.getImageData(x0, y0, bw, bh).data; } catch (err) { continue; }
        for (var k = 3; k < d.length; k += 4) if (d[k] > 8) return e;
      }
      return null;
    }

    function poofStart(e, px, py) {
      if (POOF.phase !== 'idle' || !e) return;
      if (e.ab) return;                            // still picking himself up from the last grab
      POOF.phase = 'holding'; POOF.t = 0; POOF.victim = e;
      POOF.vx = null; POOF.vy = null;
      POOF.fx = 0.5; POOF.fy = 1;
      if (px != null) {
        var r = e.c.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          POOF.fx = (px - r.left) / r.width;
          POOF.fy = (py - r.top) / r.height;
        }
      }
      document.body.classList.add('ev-poofing');   // suppresses the touch callout while holding
      abductStart(e);                              // he drops what he is holding and starts to rise (poofTick also guards this)
    }
    function poofCancel() {
      if (POOF.phase !== 'holding') return;
      POOF.phase = 'fizzle'; POOF.t = 0;           // smoke thins out, nobody vanishes
      document.body.classList.remove('ev-poofing');
      // His recovery is owned by the entry, not by POOF, so it outlives the 0.4s fizzle: the smoke
      // goes away and THEN he finishes picking himself up.
      if (POOF.victim) abductRelease(POOF.victim);
    }

    // ── mouse ──
    document.addEventListener('mousedown', function (ev) {
      if (ev.button !== 2) { POOF.armed = false; return; }
      var e = bobitAt(ev.clientX, ev.clientY);
      POOF.armed = !!e;                            // gates contextmenu suppression
      if (e) poofStart(e, ev.clientX, ev.clientY);
    }, true);
    // Firefox fires contextmenu on mousedown (mid-hold), Chrome on mouseup (as the gag lands),
    // so suppression is keyed off `armed` rather than the phase. Cleared here so a later
    // right-click on ordinary page content still gets its menu.
    document.addEventListener('contextmenu', function (ev) {
      if (!POOF.armed) return;
      ev.preventDefault();
      POOF.armed = false;
    });
    document.addEventListener('mouseup', function (ev) { if (ev.button === 2) poofCancel(); });
    document.addEventListener('mousemove', function (ev) {
      if (POOF.phase !== 'holding') return;
      // Once he leaves the ground he slides out from under the cursor, so this would cancel the hold
      // by itself and the gag could never complete. Releasing the button is the cancel from there on.
      // Still applies during 'letgo', when he has not moved yet — dragging off him in the first third
      // of a second is a genuine "no, not that one".
      if (POOF.victim && POOF.victim.ab && POOF.victim.ab !== 'letgo') return;
      if (bobitAt(ev.clientX, ev.clientY) !== POOF.victim) poofCancel();
    }, { passive: true });
    window.addEventListener('blur', poofCancel);
    document.addEventListener('mouseleave', poofCancel);
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') poofCancel(); });

    // ── touch: a 3s hold does the same. No preventDefault on touchstart, so a scroll that
    //    happens to begin on a Bobit still scrolls — a >10px move cancels instead. ──
    document.addEventListener('touchstart', function (ev) {
      if (ev.touches.length !== 1) { poofCancel(); return; }
      var t = ev.touches[0];
      var e = bobitAt(t.clientX, t.clientY);
      POOF.armed = !!e;
      POOF.sx = t.clientX; POOF.sy = t.clientY;
      if (e) poofStart(e, t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchmove', function (ev) {
      if (POOF.phase !== 'holding' || !ev.touches.length) return;
      var t = ev.touches[0];
      if (Math.abs(t.clientX - POOF.sx) > 10 || Math.abs(t.clientY - POOF.sy) > 10) poofCancel();
    }, { passive: true });
    document.addEventListener('touchend', poofCancel);
    document.addEventListener('touchcancel', poofCancel);

    // One fixed full-viewport canvas for all smoke. Not the victim's own canvas: most mode
    // branches return early so there is no clean post-figure hook, and a 190px canvas would
    // clip the burst. Fixed positioning means we work in screen coords, which is what the
    // victim's rect gives us anyway.
    var _poofC = null;
    function poofOverlay() {
      if (!_poofC) {
        _poofC = document.createElement('canvas');
        _poofC.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:61;';
        document.body.appendChild(_poofC);
      }
      var vw = document.documentElement.clientWidth, vh = window.innerHeight;
      if (_poofC.__w !== vw || _poofC.__h !== vh) {
        _poofC.__w = vw; _poofC.__h = vh;
        _poofC.width = Math.round(vw * DPR); _poofC.height = Math.round(vh * DPR);
        _poofC.style.width = vw + 'px'; _poofC.style.height = vh + 'px';
      }
      return _poofC;
    }

    // The overlay carries two things now: the smoke, and everything the room dropped. Either one alone
    // is reason enough to keep it alive.
    function poofDrawSmoke(dtFrame) {
      var ph = POOF.phase;
      var wantSmoke = (ph === 'holding' || ph === 'poof' || ph === 'fizzle');
      var wantDrops = DROPS.length > 0;
      if (!wantSmoke && !wantDrops) {
        // Nothing will ever paint here again this phase: drop the overlay rather than leave a
        // fixed full-viewport canvas in the DOM being clearRect-ed ~50x a second forever. A
        // later hold recreates it. ("~6s cleared: nothing left painting.")
        if (_poofC) {
          if (_poofC.parentNode) _poofC.parentNode.removeChild(_poofC);
          _poofC = null;
        }
        return;
      }
      var c = poofOverlay(), g = c.getContext('2d');
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.clearRect(0, 0, c.__w, c.__h);
      if (wantDrops) drawDrops(g, dtFrame);
      if (!wantSmoke) return;

      // Follow the victim while he is still there, then hold his last spot. The anchor is the
      // press point re-projected through his LIVE rect, so it stays on him rather than on the
      // middle of a canvas he may not be standing in the middle of.
      if (POOF.victim && POOF.victim.c.parentNode) {
        var r = POOF.victim.c.getBoundingClientRect();
        POOF.vx = r.left + POOF.fx * r.width;
        POOF.vy = r.top + POOF.fy * r.height;
        // While he is being abducted the press-point fraction is the wrong anchor twice over: the cloud
        // would stay on the floor he left, and the canvas growth shifts the fraction anyway. drawAbduct
        // publishes his actual torso position each frame, so ask for that instead.
        if (POOF.victim.ab && POOF.victim.abBodyY != null) {
          POOF.vx = r.left + POOF.victim.abBodyX;
          POOF.vy = r.top + POOF.victim.abBodyY;
        }
      }
      if (POOF.vx == null) return;

      var seed = 11;
      if (POOF.phase === 'holding') {
        var k = Math.min(1, POOF.t / POOF_HOLD);
        // Capped and then tightened, rather than swelling the whole way. The original 12 + k*k*46 grew
        // to a 58px radius, which at this figure's 84px height buried him — measured against the
        // screenshots, the spread eagle and the shimmy were invisible behind it right when they are the
        // entire point of the build-up. Peaks at 34 and draws back to ~22 through the shimmy.
        var draw = 12 + k * k * 22;
        if (k > 0.7) draw *= 1 - (k - 0.7) * 1.2;
        R.drawSmoke(g, POOF.vx, POOF.vy, draw, 0.12 + k * 0.7, seed, POOF.t);
      } else if (POOF.phase === 'fizzle') {
        var f = Math.max(0, 1 - POOF.t / 0.4);
        R.drawSmoke(g, POOF.vx, POOF.vy, 20 * f, 0.5 * f, seed, POOF.t);
      } else if (POOF.phase === 'poof') {
        var b = Math.min(1, POOF.t / POOF_BURST);
        R.drawSmoke(g, POOF.vx, POOF.vy - 10, 58 + b * 70, 1 - b, seed, POOF.t);
      }
    }

    // Where a figure actually is, in his own canvas — asked of the pixels rather than inferred from a
    // canvas dimension. `cr.left + e.w/2` only holds for canvas-centred modes (stand, seat, ...); patrol
    // walks, and crosser, paddlepair, cartwheel, dogfetch, kite and yoyo all draw well off-centre.
    // `e.h - 6` is only the floor for modes that draw at feetY = h - 6 — a seated reader is at h - 42
    // with his shins dangling and the rope Bobit hangs in mid-air, and assuming h - 6 TELEPORTED both of
    // them. The ink's bottom edge is where he visibly is, whatever his mode does.
    //
    // Both callers must run this BEFORE resizing the canvas: after the resize the old ink is gone.
    // (Two-figure scenes: the ink spans both, so midX lands between them — accepted by both callers.)
    // Returns canvas-LOCAL css px; the fallbacks are the old per-mode guesses.
    function scanInk(e) {
      var out = { midX: e.w / 2, floor: e.h - 6, top: 0, found: false };
      try {
        var scanW = e.c.width, scanH = e.c.height;
        var img = e.ctx.getImageData(0, 0, scanW, scanH).data;
        var minX = -1, maxX = -1, maxY = -1, minY = -1;
        for (var yy = 0; yy < scanH; yy++) {
          var rowBase = yy * scanW * 4;
          for (var xx = 0; xx < scanW; xx++) {
            if (img[rowBase + xx * 4 + 3] > 8) {
              if (minX < 0 || xx < minX) minX = xx;
              if (xx > maxX) maxX = xx;
              if (minY < 0) minY = yy;
              if (yy > maxY) maxY = yy;
            }
          }
        }
        if (minX >= 0) {
          var rx = scanW / e.w, ry = scanH / e.h;
          out.midX = (minX + maxX) / 2 / rx;
          out.floor = maxY / ry;
          out.top = minY / ry;
          out.found = true;
        }
      } catch (err) { /* tainted or zero-size: keep the fallbacks */ }
      return out;
    }

    var FLEE_SPEED = 190, FLEE_DROP = 50, RAISE_SECS = 0.45;

    // ── Where a falling Bobit lands ────────────────────────────────────────────────────────────
    // The page's full-bleed 1px rules — the lines that run right across the screen between
    // sections. They are the only horizontal surfaces a figure can crumple onto and read as having
    // landed on something; FLEE_DROP's flat 50px is anchored to nothing and drops him onto an
    // invisible plane in the middle of a section.
    //
    // An explicit selector list, NOT a sweep of the DOM for wide borders: the note cards are 1232px
    // of a 1280px viewport, so any width threshold loose enough to catch the real rules also catches
    // four card interiors, and a figure would land on the inside edge of a box instead of on a line
    // across the page. Whichever edge of each element actually carries a border is the line.
    var BREAK_SELECTORS = 'header.site-banner, header.hero, section.why, section.how, section.watch, footer';

    // DOCUMENT coords, measured once when the cast is armed. Document rather than viewport because a
    // fleeing canvas stays position:absolute in document space so you can scroll down and watch a
    // faller land — see poofArmFlee. The page does not reflow during an exodus, so one reading holds
    // for the whole run at any scroll position.
    function sectionBreakLines() {
      var sy = window.scrollY || window.pageYOffset;
      var ys = [];
      document.querySelectorAll(BREAK_SELECTORS).forEach(function (el) {
        var cs = getComputedStyle(el), r = el.getBoundingClientRect();
        if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') ys.push(r.top + sy);
        if (parseFloat(cs.borderBottomWidth) > 0 && cs.borderBottomStyle !== 'none') ys.push(r.bottom + sy);
      });
      ys.sort(function (a, b) { return a - b; });
      return ys.filter(function (y, i) { return i === 0 || y - ys[i - 1] > 2; });   // dedupe shared edges
    }

    // Nearest break line more than MIN_FALL below him, or null to keep the flat FLEE_DROP. The 24px
    // floor is what stops a figure already standing ON a line from choosing it and playing a 2px
    // pratfall; null covers the footer cast and anyone below the last rule.
    var MIN_FALL = 24;
    function breakLineBelow(lines, floorDocY) {
      for (var i = 0; i < lines.length; i++) if (lines[i] > floorDocY + MIN_FALL) return lines[i];
      return null;
    }

    // Modes with nothing under them at all. The rope Bobit sits on a frame bar he paints himself and
    // then hangs off a rope — both mid-air — so the whole mode counts rather than a check against
    // e.rphase that would have to stay in sync with it. vclimb is not in the current cast but its
    // draw branch is live, so it is covered rather than left as a trap.
    //
    // This is a per-mode predicate and not a measurement because measuring cannot work: every figure
    // is placed with edge:'top', which puts his feet exactly on his anchor's top edge, so the rope
    // hanger's ink bottom and a thumbnail stander's ink bottom are THE SAME NUMBER. (Fourth defect in
    // this feature from inferring footing off a dimension that only holds for some modes — see the
    // header of tests/poof/08-flee-floor.cjs for the first three.)
    function fleeAirborne(e) {
      return e.spec.mode === 'rope' || e.spec.mode === 'vclimb';
    }

    // Arms straight overhead, flailing. Legs come from scurry so the run reads as a proper
    // panicked sprint. Remember 0deg is straight DOWN in this rig and 90 is horizontal, so
    // overhead is ~±170. Two non-harmonic frequencies plus a per-figure seed keep the group
    // from flailing in unison.
    function fleePose(t, seed) {
      var p = A.scurry.frame(t);
      var f1 = Math.sin(t * 11 + seed), f2 = Math.sin(t * 7.3 + seed * 2.1);
      p.armRU = 168 + f1 * 16; p.armRF = 150 + f2 * 30;
      p.armLU = -168 + f2 * 16; p.armLF = -150 + f1 * 30;
      p.headTilt = 8 + f2 * 7;
      p.hunch = -6 + f1 * 3;
      return p;
    }

    // The pose the hands-up raise lands on, before the run takes over. Starts from the un-flailed
    // centre of fleePose — seed 0 at t 0 zeroes both flail terms, which also leaves both legs
    // straight underneath him via makeGait's sin(t) stride — then deliberately breaks the symmetry
    // that leaves behind.
    // Held still at this 0.32 scale, a symmetric pair of arms straight overhead (fleePose's own
    // armRU 168 / armRF 150, i.e. 12deg and 30deg off vertical) merges into the head-and-torso line
    // and the figure reads as one vertical stick — the hands-up doesn't land at all. The RUNNING
    // figures read fine on the same numbers only because fleePose mixes its two flail terms
    // differently into each arm, so one arm is always up while the other is out. This bakes that
    // asymmetry in: one arm straight up and out, the other bent. The angles land near the edges of
    // the flail's own range (armRU 152..184, armRF 120..180) rather than inside it, so the handoff
    // into the run costs a few degrees in a single frame — less than the change between any two
    // consecutive running frames.
    function raisePose() {
      var p = fleePose(0, 0);
      // armRF/armLF are ABSOLUTE directions, not angles relative to the upper arm, so keeping each
      // forearm near its own upper arm is what makes the arm read as one straight limb. The
      // up-and-out pair is cwStar's (142/150), which already reads as arms-up elsewhere in the file.
      // Both arms have to clear the head: anything inside ~30deg of vertical disappears behind it at
      // this scale, which is why one arm is straight and the other bends outward rather than one
      // simply being thrown higher.
      p.armRU = 142; p.armRF = 150;      // straight up and out
      p.armLU = -148; p.armLF = -130;    // bent at the elbow, hand swinging wide of the head
      // A hair of stance, because fleePose's legs at t=0 are both at exactly 0 and overlap into a
      // single thick line — fine for a running figure whose legs are moving, but a figure standing
      // still on one apparent leg reads as a stick rather than a person.
      p.legRU = 7; p.legRF = 5; p.legLU = -7; p.legLF = -5;
      return p;
    }

    // Widen this figure's canvas to the viewport so he can actually reach a screen edge — on
    // his own ~190px canvas he would vanish at an invisible box edge mid-screen. Transparent
    // and pointer-events:none, so the extra area costs nothing and captures nothing. Width
    // goes through fitW/fitLeft or a widened canvas reintroduces the phone h-scroll bug.
    function poofArmFlee(e) {
      var cr = e.c.getBoundingClientRect();
      // already scrolled out of sight: the draw loop culls it, so it would never tick and the
      // page would never finish clearing. Nobody is watching — just take it away.
      if (cr.bottom < -40 || cr.top > window.innerHeight + 40) {
        e.gone = true;
        if (e.c.parentNode) e.c.parentNode.removeChild(e.c);
        return;
      }
      var ar = e.el.getBoundingClientRect();             // his perch
      var ink = scanInk(e);
      var figScreenX = cr.left + ink.midX;
      var oldFloor = ink.floor;

      // Pick his landing line BEFORE sizeCanvas, because how tall the canvas has to be depends on how
      // far he is going to fall. Everything here is DOCUMENT coords: the canvas stays absolutely
      // positioned in document space (see below), so a canvas-local y and a document y differ by
      // exactly docTop for the whole run, whatever the page is scrolled to.
      // POOF.breakLines is set once when the cast is armed; the fallback keeps a test that calls this
      // function directly from silently getting FLEE_DROP for everyone.
      var sy = window.scrollY || window.pageYOffset;
      var sx = window.scrollX || window.pageXOffset;
      var docTop = cr.top + sy;
      var lines = POOF.breakLines || sectionBreakLines();
      var targetDocY = breakLineBelow(lines, docTop + oldFloor);
      var fallDist = (targetDocY == null) ? FLEE_DROP : (targetDocY - docTop) - oldFloor;

      // Can this fall be watched at all? On desktop the drop to the next rule is 618px against a
      // 900px viewport — 0.69 screens, so it fits and he lands where you can see it. On a phone the
      // same fall is 1,149px against 640px (1.8 screens) because .watch stacks to 1,249px tall and he
      // hangs near the top of it: you would see half a fall, then ~2s of unseen heap-and-getup and a
      // ~4s limp, with poofTick waiting on him the whole time.
      //
      // So the rule is geometry, not a device test — measured against the viewport, it sorts desktop
      // and mobile correctly on its own. FIT_SCREENS sits above every desktop/laptop ratio measured
      // (0.69, 0.79) and below every phone one (1.36, 1.80).
      //
      // This flag ONLY governs whether the below-the-fold exit applies to him. It deliberately does not
      // branch the drop itself: if he reaches his line he lands on it, flag or no flag. Gating the heap
      // on this instead would leave a figure hovering at the line in the one case where a reader
      // scrolled down fast enough to keep him on screen — which is exactly the case worth rewarding.
      e.flCanLand = fallDist <= FIT_SCREENS * window.innerHeight;

      var newW = fitW(document.documentElement.clientWidth);
      // Tall enough to hold the fall and the heap at the bottom of it. Measured from oldFloor rather
      // than e.h because the flee only ever draws the figure and his shadow, all of which lives within
      // oldFloor of the canvas top — sizing off e.h instead added a section's worth of empty canvas
      // below the page and grew the document's scroll height for no reason.
      var newH = Math.max(e.h, oldFloor + fallDist + HEAP_YOFF + 8);
      sizeCanvas(e, newW, newH);
      // The canvas stays position:ABSOLUTE in document coordinates, so scrolling carries the runners
      // with it and you can follow a faller down to his line. It was briefly switched to fixed to kill
      // a real bug — reposition() skips fleeing entries (a full re-fit would yank the widened canvas
      // out from under the run), so an absolute viewport-wide canvas outlived a shrink at its old width
      // and handed the whole PAGE a horizontal scrollbar; a phone rotating landscape -> portrait
      // mid-exodus did exactly that. Fixed made that impossible, at the cost of the runners no longer
      // moving with the page — which also made a fall to a line below the fold unwatchable.
      // refitFlee() now handles the shrink directly (re-clamps width and left, rebases his x), so the
      // overflow guarantee holds without freezing the geometry to the viewport.
      e.c.style.position = 'absolute';
      var newLeft = fitLeft(0, e.w, sx);
      e.c.style.left = newLeft + 'px';
      e.flLeft = newLeft;                                // document x of the canvas, for refitFlee
      // Leave the top edge exactly where it was. sizeCanvas only ever grows this canvas DOWNWARD
      // (local y is measured from the top edge), so a canvas that does not move keeps every local y —
      // including oldFloor — pointing at the same document row it did before the resize, and all of
      // the new headroom lands below him to fall into.
      // This used to read `cr.bottom - 6 - oldFloor`, which is only `cr.top` while oldFloor is
      // `e.h - 6`. Once oldFloor became the measured ink bottom the two h-6 assumptions cancelled
      // exactly and the floor still landed on the h-6 line: a seated reader dropped 12px and a
      // rope-hanger dropped 225px into mid-air. Fixing the scan without fixing this line is a no-op.
      e.c.style.top = docTop + 'px';
      e.flTopDoc = docTop;                               // local y -> document y, for the fold test

      e.fl = 'raise'; e.flT = 0;                         // hands up first, then 'run' (or the drop)
      e.flX = (figScreenX + sx) - newLeft;               // canvas-local x
      e.flDir = (figScreenX < document.documentElement.clientWidth / 2) ? -1 : 1;
      e.flFloor = oldFloor;                              // canvas-local floor line
      e.flLedgeL = (ar.left + sx) - newLeft;             // perch ends, canvas-local
      e.flLedgeR = (ar.right + sx) - newLeft;
      e.flSeed = (e.ci % 7) + 1;
      // Every other body this entry draws gets its own runner. drawFlee draws ONE figure, so without
      // this a paddle player's partner, a beam carrier's mate and a patrol's toddler all simply stopped
      // existing the moment the room bolted — the dog was the only companion ever handled, and only
      // because it had its own special case.
      var flSplit = splitBodies(e, figScreenX - cr.left, ink.midX);
      e.flMates = flSplit.mates.map(function (m, mi) {
        return {
          x: (cr.left + sx + m.x) - newLeft,
          floor: (m.floor != null ? m.floor : oldFloor),
          small: m.small,
          seed: ((e.ci + mi + 1) % 7) + 1,
          t: -0.06 * (mi + 1)                                // a beat apart, so they do not move in lockstep
        };
      });
      e.flYOff = 0;
      e.flFall = fallDist;                               // how far below flFloor his line is
      e.flDropSecs = dropSecs(fallDist);
      // Nothing to run along, so 'raise' hands straight off to 'drop': he throws his hands up on the
      // rope and lets go. His anchor rect is the video thumb BELOW his feet, so without this he
      // sprints its full 395px through empty air before falling.
      e.flAir = fleeAirborne(e);

      // The dog bolts too, as himself rather than as a stick figure — he already has a run
      // pose. Same direction as his owner, a shade faster, which is both true to a dog and
      // funnier. dogX is canvas-local, so it is re-based onto the new (wider) canvas the same way
      // the runner's own flX is.
      if (e.spec.mode === 'dogfetch' && e.dogX != null) {
        e.flDog = { x: e.dogX + (cr.left + sx - newLeft), dir: e.flDir };
      }
    }

    // HEAP_YOFF exists because drawFig's `rot` pivots about the point handed to drawFig — the
    // figure's PELVIS, since computePose builds outward from there — so tipping him ~83deg swings
    // him about his middle and leaves him lying a leg's length above the ground rather than on it.
    // The cartwheel gag solves the same problem with its `lieY`; this is the equivalent nudge.
    var HEAP_HOLD = 1.0, GETUP_SECS = 0.9, HEAP_YOFF = 14;

    // The drop used to be a flat 0.45s because it was always the same flat 50px. Now that the
    // distance is whatever the next section break happens to be, the duration has to come from it or
    // a 413px plunge covers the same ground in the same time as a 50px hop and reads as a yank.
    //
    // FALL_G is tuned, not physical: these figures are ~84px tall, so real gravity reads as a
    // teleport. 618px -> 1.06s, 413px -> 0.87s, 139px -> 0.50s, the legacy 50px -> 0.30s. At 50fps the
    // longest of those peaks around 23px/frame, so the fall still has frames you can see.
    //
    // Because dSecs is sqrt(2*dist/G), `yOff = dist * (t/dSecs)^2` reduces to `G*t^2/2` — the distance
    // cancels, so every Bobit falls at exactly the same acceleration however far he has to go. That is
    // the point of deriving the duration rather than picking one.
    //
    // The clamp is a sanity bound that almost never engages: the longest fall you can actually WATCH is
    // a viewport height (past that he is off the bottom of the screen and marked gone), and 900px comes
    // in at 1.28s. It only catches an absurd viewport, where he falls harder than FALL_G unnoticed.
    var FALL_G = 1100, MAX_FALL_SECS = 1.4;
    function dropSecs(dist) {
      return Math.min(MAX_FALL_SECS, Math.sqrt(2 * Math.max(1, dist) / FALL_G));
    }

    // A figure's ink measures ~84px tall, so his head has cleared the bottom of the screen once his
    // ground line is this far past it.
    var GONE_BELOW_FOLD = 96;

    // How much of the viewport a fall may occupy and still be worth landing. Measured fall-to-viewport
    // ratios: desktop 1280x900 0.69, laptop 1440x780 0.79, iPhone 14 390x844 1.36, small Android
    // 360x640 1.80. 0.85 is the gap between those two clusters, so this sorts desktop from mobile
    // without a device test — see the flCanLand note in poofArmFlee.
    var FIT_SCREENS = 0.85;

    // He limps off favouring his right leg — same trick as the beam ball-gag's foot-drop: a
    // stiff knee, a shortened step and a weight-bearing hitch on the injured plant.
    function limpPose(t, seed) {
      var p = A.scurry.frame(t * 0.55);
      var plant = Math.max(0, Math.sin(t * 3.4));
      p.legRF += 40;                       // knee barely bends
      p.legRU -= 12;                       // shorter step
      p.bob += plant * 9;
      p.lean += plant * 5;
      p.headTilt = -8 + plant * 6;
      p.armRU = 40 + Math.sin(t * 2 + seed) * 8;   // arms are down now: the panic became pain
      p.armRF = 96;
      p.armLU = -26; p.armLF = -18;
      return p;
    }

    // Same bad leg as limpPose, but the arms never came down. limpPose is explicitly the moment "the
    // panic became pain" — arms lowered, pain wins. This is the other order: something heavy landed on
    // his foot while he was already terrified, so he limps off still flailing overhead. Hurt AND
    // hysterical, rather than one resolving into the other.
    function hystericalLimp(t, seed) {
      var p = limpPose(t, seed);
      var f = fleePose(t * 1.35, seed);
      p.armRU = f.armRU; p.armRF = f.armRF;
      p.armLU = f.armLU; p.armLF = f.armLF;
      p.headTilt = -4 + Math.sin(t * 9 + seed) * 9;      // head snapping about, not fixed on the foot
      p.hunch = -4;
      return p;
    }

    // Draw one fleeing figure. Sub-machine: raise -> run -> (drop -> heap -> getup -> limp) if his
    // perch runs out before he reaches a screen edge.
    function drawFlee(e, ctx, w, col, dt) {
      e.flT += dt;
      var pose, rot = 0, yOff = e.flYOff || 0;
      var fall = e.flFall != null ? e.flFall : FLEE_DROP;    // how far below flFloor his landing line is
      var dSecs = e.flDropSecs || dropSecs(fall);
      var shadowAt = null;                                   // set during the drop: he casts it on the LINE

      if (e.fl === 'raise') {
        // The hands go up before the legs go: a beat of standing panic, then the sprint. flX is
        // untouched here, so he throws his arms up on the spot he was occupying.
        // He rises to raisePose() rather than to his own seeded fleePose: at t=0 the two flail terms
        // are the constants sin(seed) and sin(2.1 * seed), and for some seeds they push the upper arm
        // past vertical AND straighten the forearm, so the arms fold onto the torso and he reads as
        // one vertical stick at the exact frame the hands-up is meant to land. Handing off to a run
        // that starts flailing from t=0 costs a few degrees of arm angle in one frame — less than the
        // change between any two consecutive running frames, and invisible next to the legs starting
        // to move. The per-figure flail still de-synchronises the group the instant they run, which
        // is where it earns its keep; here the whole room reacting on the same beat is the joke.
        var rz = smooth01(Math.min(1, e.flT / RAISE_SECS));
        pose = lerpPose(A.standstill.frame(0), raisePose(), rz);
        // An airborne Bobit has no perch to run along, so he lets go instead of entering 'run'.
        // A Bobit who just had his own load land on his foot throws his hands up with everybody else —
        // the whole room reacting on one beat is the joke — and only discovers the foot when he tries
        // to move. So the limp starts here, after the raise, not instead of it.
        if (e.flT >= RAISE_SECS) {
          e.fl = e.flAir ? 'drop' : (e.footHurt ? 'hlimp' : 'run');
          e.flT = 0;
        }
      } else if (e.fl === 'hlimp') {
        // Slower than the run and slower than he would like. He still has to clear the perch, so the
        // ledge test is the same one 'run' uses — he just takes longer to get there.
        e.flX += FLEE_SPEED * 0.5 * e.flDir * dt;
        pose = hystericalLimp(e.flT, e.flSeed);
        if (e.flDir > 0 ? (e.flX > e.flLedgeR) : (e.flX < e.flLedgeL)) {
          e.fl = 'drop'; e.flT = 0;
        }
      } else if (e.fl === 'run') {
        e.flX += FLEE_SPEED * e.flDir * dt;
        pose = fleePose(e.flT, e.flSeed);
        // ran off the end of his perch? then there is nothing under him
        if (e.flDir > 0 ? (e.flX > e.flLedgeR) : (e.flX < e.flLedgeL)) {
          e.fl = 'drop'; e.flT = 0;
        }
      } else if (e.fl === 'drop') {
        var k = Math.min(1, e.flT / dSecs);
        e.flX += FLEE_SPEED * 0.55 * e.flDir * dt;      // carries forward as he falls
        yOff = fall * k * k;                             // accelerating, down to the line
        pose = A.fall.frame(e.flT * 1.6);
        // Normalised progress, so however far he falls he arrives at the same angle and hands off to
        // the heap's 1.45 exactly as a 50px drop used to.
        rot = e.flDir * 0.5 * k;
        // The shadow belongs on the surface he is heading for, not glued to his feet in mid-air —
        // invisible over 50px, a smudge chasing him down over 618. Growing it in also telegraphs
        // where he is about to land.
        shadowAt = { y: e.flFloor + fall, scale: 0.35 + 0.65 * k };
        // Reaching his line always lands him, whether or not the fold exit applies to him. See the
        // flCanLand note in poofArmFlee for why the flag does not gate this.
        if (k >= 1) { e.fl = 'heap'; e.flT = 0; yOff = fall; }
      } else if (e.fl === 'heap') {
        yOff = fall + HEAP_YOFF;                         // lie ON the ground, not pivoted above it
        pose = cwHeap(e.flT);
        rot = e.flDir * 1.45 + Math.sin(e.flT * 6) * 0.1;   // lying over, twitching
        if (e.flT >= HEAP_HOLD) { e.fl = 'getup'; e.flT = 0; }
      } else if (e.fl === 'getup') {
        var g = smooth01(Math.min(1, e.flT / GETUP_SECS));
        yOff = fall + HEAP_YOFF * (1 - g);               // eases back onto his feet as he rises
        pose = lerpPose(cwHeap(0), A.standstill.frame(0), g);
        rot = (e.flDir * 1.45) * (1 - g);                // rotates upright, slowly
        if (e.flT >= GETUP_SECS) { e.fl = 'limp'; e.flT = 0; }
      } else {                                            // 'limp'
        yOff = fall;
        e.flX += FLEE_SPEED * 0.45 * e.flDir * dt;        // about half speed now
        pose = limpPose(e.flT, e.flSeed);
      }

      e.flYOff = yOff;
      var groundY = e.flFloor + yOff;
      if (shadowAt) R.drawShadow(ctx, e.flX, shadowAt.y, 15 * shadowAt.scale, 'rgba(127,127,127,0.18)');
      else R.drawShadow(ctx, e.flX, groundY, 15, 'rgba(127,127,127,0.18)');
      // drawFig's y is the PELVIS, not the floor: computePose builds outward from the pelvis and
      // the legs reach 112 rig-units (112 * S ~= 36px) below it, which is why every other caller
      // in this file passes `feetY - 112 * S`. drawFlee alone passed the ground line straight
      // through, so every runner was drawn 36px into the floor with his own shadow hovering above
      // his head — measured, not guessed: a stander's floor line sat at screen y 734 and his ink
      // bottom at 770. Same class of mistake as the flee floor above, one call lower down.
      drawFig(ctx, e.flX, groundY - 112 * S, S, e.flDir < 0, pose, { color: col, rot: rot });

      // The rest of this entry's cast, running on the same beat. They share the raise/run timing rather
      // than getting their own sub-machine: they are extras, and one figure per entry is still what
      // owns the ledge test, the fall and the landing.
      if (e.flMates) {
        for (var mj = 0; mj < e.flMates.length; mj++) {
          var fm = e.flMates[mj];
          fm.t += dt;
          var mPose, mFloor = fm.floor + (e.flYOff || 0);
          if (fm.t < RAISE_SECS) {
            mPose = lerpPose(A.standstill.frame(0), raisePose(), smooth01(Math.max(0, fm.t) / RAISE_SECS));
          } else {
            fm.x += FLEE_SPEED * e.flDir * dt;
            mPose = fleePose(fm.t - RAISE_SECS, fm.seed);
          }
          var msc = fm.small ? S * 0.62 : S;
          R.drawShadow(ctx, fm.x, mFloor, fm.small ? 10 : 15, 'rgba(127,127,127,0.18)');
          drawFig(ctx, fm.x, mFloor - 112 * msc, msc, e.flDir < 0, mPose, { color: col });
        }
        // once they are all off the sides they stop costing anything
        e.flMates = e.flMates.filter(function (m) { return m.x > -70 && m.x < w + 70; });
        if (!e.flMates.length) e.flMates = null;
      }

      if (e.flDog) {
        e.flDog.x += FLEE_SPEED * 1.25 * e.flDog.dir * dt;
        var dogCol = figColor(e.spec.tone2 != null ? e.spec.tone2 : 5);
        drawDog(ctx, e.flDog.x, e.flFloor, e.flDog.dir, dogCol, 'run', e.flT * 1.4, {});
        if (e.flDog.x < -80 || e.flDog.x > w + 80) e.flDog = null;
      }

      // Off a screen edge and he is done with — sideways, or straight down off the bottom.
      //
      // The downward exit only applies to a Bobit whose fall does not fit the viewport (see flCanLand):
      // on a phone the drop to the next rule is 1.8 screens, so without this he falls out of sight and
      // then plays ~2s of unseen heap-and-getup plus a ~4s limp while poofTick waits on him — the page
      // looks finished and is not. Desktop falls fit, so they never take this path and always land.
      //
      // Tested against the LIVE scroll position rather than a frozen one, which is what makes following
      // him down work: scroll with him and he stays on screen, keeps falling, and lands on his line
      // properly. Stop scrolling and he leaves the bottom of the screen and that is his exit.
      //
      // Deliberately gated on !flDog like the horizontal test: the dog runs along flFloor and never
      // falls, and he is drawn on his owner's canvas, so removing it early would delete him mid-sprint.
      var belowFold = false;
      if (!e.flCanLand && e.flTopDoc != null) {
        var foldDocY = (window.scrollY || window.pageYOffset) + window.innerHeight;
        belowFold = e.flTopDoc + groundY > foldDocY + GONE_BELOW_FOLD;
      }
      if ((e.flX < -60 || e.flX > w + 60 || belowFold) && !e.flDog && !e.flMates) {
        e.gone = true;
        if (e.c.parentNode) e.c.parentNode.removeChild(e.c);
      }
    }

    // ══ ABDUCTION ═══════════════════════════════════════════════════════════════════════
    // What the victim does across the 3s hold, on his own state machine (e.ab) rather than on
    // POOF.phase. Keeping it on the entry is what lets the smoke fizzle on its own 0.4s clock while
    // he is still collapsing underneath it — "the smoke goes away, THEN he picks himself up" — and
    // it means a recovery can outlive POOF returning to idle.
    //
    //   letgo  0    -> 0.35  prop hits the floor, pose eases out of whatever he was doing
    //   rise   0.35 -> 2.0   floats to FLOAT_H, pose lerps to the spread eagle
    //   shimmy 2.0  -> 3.0   holds and judders
    //   (burst at 3.0 is poofTick's job, not this machine's)
    //
    // On an early release: settle (barely left the ground) or collapse -> heap -> getup, then resume.
    var AB_LETGO = 0.35, AB_RISE_END = 2.0;
    // 0.4 of a figure's measured 84px ink height. Low on purpose: he hovers just off the floor rather
    // than hanging in space, which reads better for the shimmy — a body vibrating a few px above the
    // ground looks held by something.
    var FLOAT_H = 34;
    // The canvas grows for EVERY victim, not only when it is tight — a branch firing for one mode in
    // twenty never gets exercised and rots, which is the shape of three defects already logged here.
    //
    // Sized for the worst case, which is rope. Two things stack up on him. His canvas has 0px above his
    // ink to begin with (drawFig gets barY=46 as his PELVIS and his head sits ~48px above that). And his
    // resting ink is a SEATED figure, only 68px tall, while the abduction draws him STANDING in the
    // spread eagle at 84px — so he needs room for the pose change as well as for the float. Sizing this
    // as FLOAT_H + 12 covered the float and missed the other 16px, and he was clipped at y=0 on the
    // first frame; the test measured it rather than anyone spotting it.
    //
    // Requirement: at least STAND_INK_H + FLOAT_H + slack between the canvas top and his floor. rope's
    // floor sits 68px down, so he needs 58; 64 is that with a margin, and every other mode already has
    // far more than it needs.
    var STAND_INK_H = 84;              // a standing figure's measured ink height at S = 0.32
    var AB_GROW = 64;
    var AB_SETTLE_MIN = 12;            // risen less than this on release: settle, no pratfall
    var AB_SETTLE_SECS = 0.35, AB_HEAP_HOLD = 0.7, AB_GETUP_SECS = 0.8;

    // Arms out and up, legs apart. 0deg is straight DOWN in this rig and 90 is horizontal, so 120 is
    // 30deg above the shoulder. Symmetric on purpose — raisePose() had to bake in asymmetry because a
    // symmetric arms-OVERHEAD pose merges into the head-and-torso line and reads as one vertical stick
    // at S=0.32, but a spread eagle is wide rather than vertical and does not collapse that way.
    //
    // Upper arm and forearm are set to the SAME angle, and the same for thigh and shin, because armRF
    // and legRF are ABSOLUTE directions in this rig rather than angles relative to the limb above them.
    // The first attempt used 132/150, which folds the forearm back toward vertical: measured silhouette
    // 39px wide against 15px for the idle, and — worse — it got NARROWER through the second half of the
    // rise, so the spread read as the figure shrinking. Straight limbs measure 49px. Chosen off the
    // measurements, not by eye: 100/100 is wider still at 56px but the arms come down to 10deg above
    // horizontal and it reads as a T-pose rather than a spread eagle.
    function spreadEagle() {
      var p = A.standstill.frame(0);
      p.armRU = 120; p.armRF = 120;
      p.armLU = -120; p.armLF = -120;
      p.legRU = 30; p.legRF = 30;
      p.legLU = -30; p.legLF = -30;
      p.lean = -6;                     // tipped slightly back, like he is being lifted from the chest
      p.headTilt = -14;                // looking up at whatever has him
      p.hunch = 4;
      return p;
    }

    // ── the prop registry ──────────────────────────────────────────────────────────────────────
    // What is he holding, and where is it? Canvas-local, captured at the grab. The abduction draw
    // REPLACES his mode's draw, so nothing here has to teach a mode to stop drawing its own prop —
    // that piece (suppressProp) is only needed for pass 2, when non-victims drop things too.
    //
    // Several modes already track their prop's position because they can already drop it; the rest are
    // pose-derived, and for those the exact origin barely matters since the thing falls to his feet
    // within 0.3s. HAND_Y is the fallback: roughly where a figure's hands are above his own floor.
    var HAND_Y = 46;
    function propOf(e) {
      var s = e.spec, m = s.mode;
      if (m === 'dogfetch') return (e.bHeld === 'thrower') ? { kind: 'ball', x: e.bX, y: e.bY } : null;
      if (m === 'paddlepair') return { kind: 'ball', x: e._ballX, y: e._ballY, vx: e._ballVX };
      if (m === 'kite') return { kind: 'kite', x: e.kx, y: e.ky };
      if (m === 'yoyo') return { kind: 'yoyo', x: null, y: null };
      if (m === 'beam') {
        if (e.scene === 'letters') return { kind: 'letter', x: e.eLX, y: e.eLY };
        if (e.scene === 'light') return { kind: 'light', x: e.lgX, y: null };
        return { kind: 'beamload', x: null, y: null };
      }
      if (m === 'seat') return s.phone ? { kind: 'phone', x: null, y: null }
                                       : { kind: 'book', x: null, y: null };
      if (m === 'stand' && s.anim === 'paddleball') return { kind: 'paddle', x: null, y: null };
      return null;                     // patrol, crosser, cartwheel, rope, vclimb, plain stand: empty-handed
    }

    // Draw a dropped prop lying on the floor. Deliberately simple shapes: at S=0.32 these are 8-16px
    // across, and the read that matters is "he was holding something and now it is on the ground",
    // not the fidelity of the object.
    function drawGroundProp(ctx, kind, x, y, col) {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
      if (kind === 'ball' || kind === 'yoyo') {
        ctx.beginPath(); ctx.arc(x, y - 5, 5, 0, Math.PI * 2); ctx.fill();
        if (kind === 'yoyo') { ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 11, y - 1); ctx.stroke(); }
      } else if (kind === 'book') {
        // shut, lying face-down with the spine up — an open book reads as still being read
        ctx.beginPath(); ctx.moveTo(x - 9, y - 1); ctx.lineTo(x + 9, y - 1);
        ctx.lineTo(x + 7, y - 5); ctx.lineTo(x - 7, y - 5); ctx.closePath(); ctx.stroke();
      } else if (kind === 'phone') {
        ctx.beginPath(); ctx.rect(x - 6, y - 5, 12, 5); ctx.stroke();
      } else if (kind === 'paddle') {
        ctx.beginPath(); ctx.ellipse(x - 3, y - 4, 6, 4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 3, y - 3); ctx.lineTo(x + 11, y - 1); ctx.stroke();
      } else if (kind === 'beamload' || kind === 'light') {
        ctx.beginPath(); ctx.arc(x, y - 7, 7, 0, Math.PI * 2); ctx.stroke();
      } else if (kind === 'kite') {
        // A proper kite, not a bare diamond: cross spars and a tail, tilted as if the wind has it. The
        // first version drew an empty rhombus and read as a floating lozenge rather than the kite that
        // had just been in his hand.
        var kr = 0.5;                                   // tilt, radians
        var cs = Math.cos(kr), sn = Math.sin(kr);
        var pt = function (ax, ay) { return { x: x + ax * cs - ay * sn, y: (y - 9) + ax * sn + ay * cs }; };
        var top = pt(0, -11), rt = pt(8, 0), bot = pt(0, 11), lf = pt(-8, 0);
        ctx.beginPath();
        ctx.moveTo(top.x, top.y); ctx.lineTo(rt.x, rt.y);
        ctx.lineTo(bot.x, bot.y); ctx.lineTo(lf.x, lf.y);
        ctx.closePath(); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bot.x, bot.y);
        ctx.moveTo(lf.x, lf.y); ctx.lineTo(rt.x, rt.y); ctx.stroke();
        // tail: three short kinks trailing off the bottom point
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(bot.x, bot.y);
        var tx = bot.x, ty = bot.y;
        for (var ti = 1; ti <= 3; ti++) {
          tx += (ti % 2 ? 5 : -4) * cs - 6 * sn;
          ty += (ti % 2 ? 5 : -4) * sn + 6 * cs;
          ctx.lineTo(tx, ty);
        }
        ctx.stroke();
      } else if (kind === 'letter') {
        ctx.font = '700 15px Manrope, system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('e', x, y - 1);
      }
      ctx.restore();
    }

    // Begin the abduction. Grows the canvas upward so he has somewhere to float to, and captures his
    // floor and his prop from the frame that is already on the canvas — both must be read BEFORE the
    // resize, which throws the old ink away.
    // Several entries draw more than one figure — paddlepair and cartwheel are two players, the beam
    // crew and the letter carriers are two carriers, a patrol can have a toddler. Each of those modes
    // publishes e._bodies during its draw, so the gag can act on the ONE that was grabbed and leave the
    // rest standing. Without it the whole entry switched to a single-figure draw and the partner simply
    // blinked out: grab one paddle player and the other vanished, and poofing anyone near the
    // parent-and-toddler took the toddler with him.
    //
    // Returns { hit, mates } in canvas-local coords. `hit` is the body nearest the grab; everything else
    // is a mate that has to keep existing.
    function splitBodies(e, atX, fallbackX) {
      var bodies = e._bodies;
      if (!bodies || !bodies.length) return { hit: { x: fallbackX }, mates: [] };
      var best = 0;
      for (var i = 1; i < bodies.length; i++) {
        if (Math.abs(bodies[i].x - atX) < Math.abs(bodies[best].x - atX)) best = i;
      }
      return {
        hit: bodies[best],
        mates: bodies.filter(function (b, i) { return i !== best; })
                     .map(function (b) { return { x: b.x, floor: b.floor, small: !!b.small }; })
      };
    }

    function abductStart(e) {
      var ink = scanInk(e);
      var prop = propOf(e);
      var cr = e.c.getBoundingClientRect();
      var sy = window.scrollY || window.pageYOffset;

      // Grow UPWARD: the top edge moves up by AB_GROW and the height grows by the same, so the canvas
      // BOTTOM does not move and every mode's `h - 6`-style bottom-relative drawing still lands where
      // it did. Local y for a fixed screen point therefore shifts by +AB_GROW, which is why the floor
      // and the prop are rebased below.
      // AB_GROW covers every mode in the cast today, so this resolves to AB_GROW every time and there
      // is one path, always exercised. The max() is what stops that from silently going stale: a future
      // mode drawn lower in its canvas gets the clearance it needs instead of being quietly decapitated,
      // which is exactly how rope failed.
      var grow = Math.max(AB_GROW, STAND_INK_H + FLOAT_H + 8 - ink.floor);
      e.abPrevH = e.h; e.abPrevTop = cr.top + sy;
      e.abGrow = grow;
      sizeCanvas(e, e.w, e.h + grow);
      e.c.style.top = (cr.top + sy - grow) + 'px';

      e.ab = 'letgo'; e.abT = 0; e.abLift = 0;
      // Which body did the grab land on, and who else is in this entry? The press point is a fraction
      // of his rect (POOF.fx), so convert it back to canvas-local x. Using the ink midpoint instead —
      // as this did — puts a kite flyer halfway between himself and his kite, and he visibly teleported
      // sideways the moment you grabbed him.
      var grabX = (POOF.victim === e && POOF.fx != null) ? POOF.fx * e.w : ink.midX;
      var split = splitBodies(e, grabX, ink.midX);
      e.abFloor = (split.hit.floor != null ? split.hit.floor : ink.floor) + grow;
      e.abX = split.hit.x;
      e.abMates = split.mates.map(function (m) {
        return { x: m.x, floor: (m.floor != null ? m.floor : ink.floor) + grow, small: m.small };
      });
      e.abProp = prop ? {
        kind: prop.kind,
        x: (prop.x != null ? prop.x : ink.midX),
        y0: (prop.y != null ? prop.y + grow : ink.floor + grow - HAND_Y),
        y: 0, t: 0, landed: false
      } : null;
      if (e.abProp) e.abProp.y = e.abProp.y0;
      // The pose he eases OUT of. Captured once so `letgo` has something to lerp from without the
      // mode's own machine still running underneath.
      e.abFrom = A.standstill.frame(0);
    }

    // Undo the canvas growth and hand the draw back to his mode.
    function abductEnd(e) {
      if (e.abPrevH != null) {
        sizeCanvas(e, e.w, e.abPrevH);
        e.c.style.top = e.abPrevTop + 'px';
      }
      e.ab = null; e.abT = 0; e.abLift = 0; e.abProp = null;
      e.abPrevH = null; e.abPrevTop = null;
      reposition();                                    // put him back exactly where his mode wants him
    }

    // Released early. Which recovery he gets depends on how far he actually got off the ground: a 0.2s
    // grab must not produce a full pratfall.
    function abductRelease(e) {
      if (!e.ab || e.ab === 'collapse' || e.ab === 'heap' || e.ab === 'getup' || e.ab === 'settle') return;
      if (e.abLift < AB_SETTLE_MIN) { e.ab = 'settle'; e.abT = 0; e.abFrom0 = e.abLift; }
      else { e.ab = 'collapse'; e.abT = 0; e.abFrom0 = e.abLift; e.abSecs = dropSecs(e.abLift); }
    }

    function drawAbduct(e, ctx, w, col, dt) {
      e.abT += dt;
      var pose, lift = e.abLift, rot = 0, jitter = 0;

      if (e.ab === 'letgo') {
        var u = Math.min(1, e.abT / AB_LETGO);
        pose = lerpPose(e.abFrom, spreadEagle(), u * 0.25);     // only a quarter of the way; the rise does the rest
        lift = 0;
        if (e.abT >= AB_LETGO) { e.ab = 'rise'; e.abT = 0; }
      } else if (e.ab === 'rise') {
        var r = Math.min(1, e.abT / (AB_RISE_END - AB_LETGO));
        lift = FLOAT_H * smooth01(r);
        pose = lerpPose(lerpPose(e.abFrom, spreadEagle(), 0.25), spreadEagle(), smooth01(r));
        if (r >= 1) { e.ab = 'shimmy'; e.abT = 0; }
      } else if (e.ab === 'shimmy') {
        lift = FLOAT_H;
        pose = spreadEagle();
        // Pose stays LOCKED and the whole body judders as one — that rigidity is what reads as
        // electrocution. Two non-harmonic frequencies so it does not look like a clean sine.
        var amp = 2.5 * Math.min(1, e.abT / 0.8);
        jitter = Math.sin(e.abT * 51) * amp + Math.sin(e.abT * 79) * amp * 0.4;
        rot = Math.sin(e.abT * 63) * 0.05 * Math.min(1, e.abT / 0.8);
      } else if (e.ab === 'settle') {
        var s = smooth01(Math.min(1, e.abT / AB_SETTLE_SECS));
        lift = e.abFrom0 * (1 - s);
        pose = lerpPose(spreadEagle(), e.abFrom, s);
        if (e.abT >= AB_SETTLE_SECS) { abductEnd(e); return; }
      } else if (e.ab === 'collapse') {
        var k = Math.min(1, e.abT / e.abSecs);
        lift = e.abFrom0 * (1 - k * k);                          // same accelerating fall as everything else here
        pose = A.fall.frame(e.abT * 1.6);
        rot = 0.4 * k;
        if (k >= 1) { e.ab = 'heap'; e.abT = 0; lift = 0; }
      } else if (e.ab === 'heap') {
        lift = -HEAP_YOFF;                                       // lying ON the floor, not pivoted above it
        pose = cwHeap(e.abT);
        rot = 1.45 + Math.sin(e.abT * 6) * 0.1;
        if (e.abT >= AB_HEAP_HOLD) { e.ab = 'getup'; e.abT = 0; }
      } else {                                                   // 'getup'
        var g = smooth01(Math.min(1, e.abT / AB_GETUP_SECS));
        lift = -HEAP_YOFF * (1 - g);
        pose = lerpPose(cwHeap(0), e.abFrom, g);
        rot = 1.45 * (1 - g);
        if (e.abT >= AB_GETUP_SECS) { abductEnd(e); return; }
      }

      e.abLift = lift;
      var groundY = e.abFloor;
      var figY = groundY - lift;
      // Where his torso actually is, published for the smoke. Deriving the anchor from POOF.fx/fy
      // instead does not work once the canvas grows: those are fractions of the canvas rect, and
      // growing it moves the top AND changes the height, so the anchor drifts by grow * fy — measured
      // ~52px low on the beam crew, which put the cloud around his ankles.
      e.abBodyX = e.abX + jitter;
      // His HIPS, not his centre. Centred on the torso the cloud sat over his head and arms and hid the
      // spread eagle and the shimmy — the two things the whole build-up exists to show. Low on his body
      // it still swirls around him and reads as the thing lifting him, with his upper half clear.
      e.abBodyY = figY - STAND_INK_H * 0.3;

      // The prop falls on its own clock the moment the abduction starts, under the same gravity as
      // every other falling thing in this feature, and stays where it lands.
      if (e.abProp) {
        var p = e.abProp;
        if (p.kind === 'kite') {
          // A kite never falls. The stunned drop already knew that; this path did not, so a grabbed kite
          // flyer's kite dropped to the floor during the hold and only started blowing away after the
          // burst. Same wind here as in drawDrops.
          p.t += dt;
          p.x += 145 * dt; p.y -= 52 * dt;
        } else if (!p.landed) {
          p.t += dt;
          var dist = groundY - p.y0;
          var ps = dropSecs(Math.max(1, dist));
          var pk = Math.min(1, p.t / ps);
          p.y = p.y0 + dist * pk * pk;
          if (pk >= 1) { p.y = groundY; p.landed = true; }
        }
        drawGroundProp(ctx, p.kind, p.x, p.y, col);
      }

      // Anyone else this entry draws stays where he was, watching. His mode is not running — the
      // abduction owns the canvas — so he is drawn here or not at all, and "not at all" is what made a
      // paddle player's partner and a patrol's toddler blink out of existence.
      if (e.abMates) {
        for (var mi = 0; mi < e.abMates.length; mi++) {
          var m = e.abMates[mi];
          var ms = m.small ? S * 0.62 : S;                       // the toddler is drawn smaller
          R.drawShadow(ctx, m.x, m.floor, m.small ? 10 : 15, 'rgba(127,127,127,0.18)');
          drawFig(ctx, m.x, m.floor - 112 * ms, ms, false, A.standstill.frame(0), { color: col });
        }
      }

      // Shadow stays on the floor and shrinks as he rises — the only cue that says "off the ground"
      // rather than "drawn higher up".
      var shrink = 1 - 0.55 * (lift / FLOAT_H);
      R.drawShadow(ctx, e.abX + jitter * 0.3, groundY, 15 * Math.max(0.3, shrink), 'rgba(127,127,127,0.18)');
      drawFig(ctx, e.abX + jitter, figY - 112 * S, S, false, pose, { color: col, rot: rot });
    }
    // ── pass 2: the stunned drop ───────────────────────────────────────────────────────────────
    // The victim goes, the room freezes — and everything anybody was holding hits the floor. The
    // figures are pinned at dt = 0 through the stun, so the props are the only thing moving: a still
    // room and the sound of things landing.
    //
    // Dropped props live in DROPS on the smoke overlay, not on their owner's canvas. Two reasons that
    // has to be so: most mode branches return early, so there is no clean post-figure hook to draw
    // them from (the same reason the smoke lives there), and when the owner flees his canvas is
    // cleared, resized and repositioned out from under anything drawn on it. Once it is on the floor a
    // prop is page furniture, not part of a figure.
    //
    // Coordinates are DOCUMENT, converted at draw time, so they stay put while the page scrolls — the
    // overlay itself is position:fixed.
    var DROPS = [];

    // What lands hard enough to hurt. Ball, the beam crew's load, and a .vote logo piece have weight;
    // a light, a book, a phone, a yo-yo or a paddle just clatters down beside him.
    var HEAVY_PROP = { ball: 1, beamload: 1, letter: 1 };

    function stunDropAll() {
      var sx = window.scrollX || window.pageXOffset, sy = window.scrollY || window.pageYOffset;
      entries.forEach(function (e) {
        if (e.gone || e.spec.mode === 'why' || e.propGone) return;
        var p = propOf(e);
        if (!p) return;
        var ink = scanInk(e);
        var cr = e.c.getBoundingClientRect();
        var lx = (p.x != null) ? p.x : ink.midX;
        var ly = (p.y != null) ? p.y : ink.floor - HAND_Y;
        e.propGone = true;                            // his mode stops drawing it from this frame on
        DROPS.push({
          kind: p.kind, owner: e,
          x: cr.left + sx + lx, x0: cr.left + sx + lx,
          y: cr.top + sy + ly, y0: cr.top + sy + ly,
          floor: cr.top + sy + ink.floor,
          t: 0, landed: false,
          // A kite does not fall. Let go of it and the wind has it — it lifts and blows off the side.
          blow: p.kind === 'kite',
          // Heavy things land on the foot of whoever was holding them. He still throws his hands up
          // with everybody else; it catches up with him when he tries to run.
          hurts: !!HEAVY_PROP[p.kind],
          // A ball already in flight carries on the way it was travelling rather than stopping dead in
          // the air, so it bumps down near whoever it was heading for. Clamped: a rally ball moves fast
          // enough that its full velocity would send it clean off the canvas.
          drift: (p.kind === 'ball' && p.vx) ? Math.max(-70, Math.min(70, p.vx * 0.22)) : 0
        });
      });
    }

    function drawDrops(g, dt) {
      if (!DROPS.length) return;
      var sx = window.scrollX || window.pageXOffset, sy = window.scrollY || window.pageYOffset;
      for (var i = DROPS.length - 1; i >= 0; i--) {
        var d = DROPS[i];
        d.t += dt;
        if (d.blow) {
          d.x += 145 * dt; d.y -= 52 * dt;            // caught by the wind, up and away
          if (d.x - sx > document.documentElement.clientWidth + 80 || d.y - sy < -80) {
            DROPS.splice(i, 1); continue;
          }
        } else if (!d.landed) {
          var dist = Math.max(1, d.floor - d.y0);
          var k = Math.min(1, d.t / dropSecs(dist));
          d.y = d.y0 + dist * k * k;
          d.x = d.x0 + d.drift * k;
          if (k >= 1) {
            d.y = d.floor; d.landed = true;
            if (d.hurts && d.owner && !d.owner.gone) d.owner.footHurt = true;
          }
        }
        drawGroundProp(g, d.kind, d.x - sx, d.y - sy, figColor(d.owner ? (d.owner.spec.tone != null ? d.owner.spec.tone : d.owner.ci) : 0));
      }
    }
    // ══ end ABDUCTION ═══════════════════════════════════════════════════════════════════

    // Advance the phase machine. Called once per frame from tick().
    function poofTick(dt) {
      if (POOF.phase === 'idle' || POOF.phase === 'cleared') return;
      POOF.t += dt;
      if (POOF.phase === 'holding') {
        // Being held IS being abducted, so the phase owns it rather than the entry point that set the
        // phase. poofStart normally kicks this off, but anything that drives POOF directly — the tests,
        // and any future trigger — has to get the same behaviour, or the victim quietly skips the whole
        // sequence and his prop is never dropped.
        if (POOF.victim && !POOF.victim.ab && !POOF.victim.gone) abductStart(POOF.victim);
        if (POOF.t >= POOF_HOLD) {
          POOF.phase = 'poof'; POOF.t = 0;
          document.body.classList.remove('ev-poofing');
          // freeze his last position for the burst, then take him off the page
          var vr = POOF.victim.c.getBoundingClientRect();
          POOF.vx = vr.left + POOF.fx * vr.width;
          POOF.vy = vr.top + POOF.fy * vr.height;
          POOF.victim.gone = true;
          // His prop outlives him. It was drawn on HIS canvas during the abduction, so without this it
          // would vanish in the same puff — and the whole point of dropping it is that it is still lying
          // there afterwards, evidence that somebody was taken. Hand it to DROPS, in document coords,
          // where the overlay keeps drawing it after the canvas is gone.
          if (POOF.victim.abProp) {
            var ap = POOF.victim.abProp;
            var apr = POOF.victim.c.getBoundingClientRect();
            var apx = window.scrollX || window.pageXOffset, apy = window.scrollY || window.pageYOffset;
            DROPS.push({
              kind: ap.kind, owner: null,
              x: apr.left + apx + ap.x, x0: apr.left + apx + ap.x,
              y: apr.top + apy + ap.y, y0: apr.top + apy + ap.y,
              floor: apr.top + apy + POOF.victim.abFloor,
              // a kite still blows away even when its owner was the one taken
              t: 0, landed: ap.landed, blow: ap.kind === 'kite', hurts: false, drift: 0
            });
          }
          // He is leaving with the canvas, so the abduction state goes with him rather than through
          // abductEnd — there is nothing left to restore, and a live e.ab on a gone entry would have
          // poofStart refuse the next grab forever.
          POOF.victim.ab = null; POOF.victim.abPrevH = null; POOF.victim.abProp = null;
          if (POOF.victim.c.parentNode) POOF.victim.c.parentNode.removeChild(POOF.victim.c);
          if (window.EVQuotes) {
            window.EVQuotes.closeAll();
            // same reset as the click/Escape dismiss paths: a closed bubble must not leave a
            // dangling handle on a reader, or he never goes back to his book
            entries.forEach(function (e) {
              if (e.qh) { e.qh = null; e.qs = 'resume'; e.qsT = 0; }
            });
          }
        }
      } else if (POOF.phase === 'fizzle') {
        if (POOF.t >= 0.4) { POOF.phase = 'idle'; POOF.t = 0; POOF.victim = null; }
      } else if (POOF.phase === 'poof') {
        if (POOF.t >= POOF_BURST) {
          POOF.phase = 'stunned'; POOF.t = 0;
          // The room freezes and everything anybody was holding hits the floor. Deliberately at the
          // START of the stun: every figure is pinned at dt = 0 for the next second, so the falling
          // props are the only thing moving in it.
          stunDropAll();
        }
      } else if (POOF.phase === 'stunned') {
        if (POOF.t >= POOF_STUN) {
          POOF.phase = 'fleeing'; POOF.t = 0;
          // One reading for the whole cast, here rather than per-figure: they all fall onto the same
          // page furniture, so a single measurement is both cheaper and guaranteed consistent between
          // them. Document coords, so it stays valid however the page is scrolled during the run.
          POOF.breakLines = sectionBreakLines();
          entries.forEach(function (e) {
            if (e.gone || e.spec.mode === 'why') return;
            poofArmFlee(e);
          });
        }
      } else if (POOF.phase === 'fleeing') {
        var left = 0;
        entries.forEach(function (e) {
          if (e.spec.mode === 'why') return;
          if (!e.gone) left++;
        });
        if (!left) { POOF.phase = 'cleared'; POOF.t = 0; }
      }
    }
    // ══ end POOF ════════════════════════════════════════════════════════════════════════

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
    var IDLES = ['bored', 'standstill', 'present', 'paddleball'];
    var SEATS = ['sit', 'read'];
    var TONES = [0, 1, 2, 3, 4, 5];   // full palette (teal/coral/gold/green/purple/orange)
    // ── colour-diversity safeguard: hand out tones from a shuffled bag rather than i.i.d. random,
    //    so we never get a page of four coral clones. Every 6 draws touches all 6 colours once;
    //    on refill we avoid repeating the last tone across the seam. ──
    var _toneBag = [], _lastTone = null;
    var _pairCast = false;   // at most one paddleball couple per page
    var _yoyoCast = false;   // at most one yo-yo player per page
    // pick a tone that's distinctly different in hue from `base` (for props that must read as a separate colour)
    var _nearHue = { 0: [0, 3], 1: [1, 5], 2: [2, 5], 3: [3, 0], 4: [4], 5: [5, 1, 2] };
    function contrastTone(base) {
      var pool = TONES.filter(function (x) { return (_nearHue[base] || [base]).indexOf(x) < 0; });
      return pool[Math.floor(Math.random() * pool.length)];
    }
    function takeTone() {
      if (!_toneBag.length) {
        var t = TONES.slice();
        for (var i = t.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = t[i]; t[i] = t[j]; t[j] = tmp; }
        if (t[0] === _lastTone && t.length > 1) t.push(t.shift());
        _toneBag = t;
      }
      _lastTone = _toneBag.shift();
      return _lastTone;
    }

    function walker(anchor, opt) {
      opt = opt || {};
      var withTot = opt.allowToddler && chance(0.5);
      var g = withTot ? pick(['stroll', 'shuffle']) : pick(GAITS);   // gentle gait when escorting a toddler
      var s = { mode: 'patrol', anchor: anchor, edge: 'top', anim: g, speed: withTot ? 12 : GSPEED[g], tone: (opt.tone != null ? opt.tone : takeTone()) };
      if (withTot) { s.toddler = true; s.toddlerTone = takeTone(); s.toddlerStyle = pick(['waddle', 'march']); }
      return s;
    }
    // one figure (or none) for a note-card top edge — biased toward readers/sitters for a calmer, more varied cast
    function noteSlot(anchor, opt) {
      opt = opt || {};
      var seat = function () {
        var s = { mode: 'seat', anchor: anchor, edge: 'top', x: pick([0.14, 0.5, 0.82]), anim: pick(SEATS), tone: (opt.seatTone != null ? opt.seatTone : takeTone()) };
        if (chance(0.4)) { s.phone = true; s.anim = 'sit'; }   // ~some sitters are glued to a phone (click to pocket / re-absorb)
        return s;
      };
      var r = Math.random();
      if (r < 0.12 && !_pairCast) { _pairCast = true; return { mode: 'paddlepair', anchor: anchor, edge: 'top', x: pick([0.32, 0.5, 0.68]), tone: takeTone(), tone2: takeTone() }; }  // one couple per page, max
      if (r < 0.20 && !_yoyoCast) { _yoyoCast = true; var yb = takeTone(); return { mode: 'yoyo', anchor: anchor, edge: 'top', x: pick([0.24, 0.5, 0.76]), tone: yb, tone2: contrastTone(yb) }; }  // one yo-yo player per page, max
      if (r < 0.54) return seat();                       // most common: a reader or sitter
      if (r < 0.82) return walker(anchor, opt);
      if (r < 0.92) return { mode: 'stand', anchor: anchor, edge: 'top', x: pick([0.2, 0.5, 0.8]), anim: pick(IDLES), tone: takeTone() };
      return opt.always ? seat() : null;                 // 'always' anchors fall back to a reader, not empty
    }

    function buildCast() {
      var out = [];
      _pairCast = false; _yoyoCast = false;
      var add = function (s) { if (s) out.push(s); };
      add({ mode: 'beam', anchor: '.hero', edge: 'bottom', tone: 0 });                                    // hero crew — always
      add({ mode: 'stand', anchor: '.hero .meta-row', edge: 'top', x: 0.9, anim: 'present', tone: 4, presenter: true });  // proud host under the logo — purple, so he's distinct from the blue beam crew
      add({ mode: 'why', anchor: '.why-grid .why-item:nth-of-type(1) .why-icon', anim: 'spent', color: '--yellow' });       // fixed (content)
      add({ mode: 'why', anchor: '.why-grid .why-item:nth-of-type(2) .why-icon', anim: 'notlistening', color: '--teal' });
      add({ mode: 'why', anchor: '.why-grid .why-item:nth-of-type(3) .why-icon', anim: 'witsend', color: '--coral' });
      // Note 1 always hosts a Bobit; occasionally the right spot is a kite-flyer instead
      if (chance(0.25)) {
        var kg = takeTone();                                                          // flyer's colour
        var kk = contrastTone(kg);                                                     // kite: a distinctly different colour
        add({ mode: 'kite', anchor: '.note.n-alpha', edge: 'top', x: 0.72, tone: kg, tone2: kk });
      } else add(noteSlot('.note.n-alpha', { allowToddler: true, always: true }));
      add(noteSlot('.note.n-ai', {}));
      // Note 2 (n-team): the one-foot balancer — hover him for the wave → windmill → collapse routine
      add({ mode: 'stand', anchor: '.note.n-team', edge: 'top', x: 0.5, balance: true, tone: takeTone() });
      add(noteSlot('.note.n-money', {}));
      // watch top (the 02/How-we-work ↔ 03/Talks split) — was getting crowded with samey walkers;
      // keep only the distinctive elder here, and often leave the split clear
      if (chance(0.4)) add({ mode: 'patrol', anchor: 'section.watch', edge: 'top', anim: 'elder', speed: 15, tone: takeTone(), hoverAnim: 'elderangry' });
      // watch thumbnail corner — peeker, idler, or hover-jumper
      var pr = Math.random(), pk = { mode: 'stand', anchor: '.watch-grid .watch-card:nth-of-type(2) .watch-thumb', edge: 'top', x: 0.96, tone: takeTone() };
      if (pr < 0.6) { pk.peeker = true; pk.anim = 'standstill'; }  // stands straight; looks over the edge only when something passes/collapses below
      else { pk.anim = pick(IDLES); }                             // idle (hover: wave). Only the footer stander jumps.
      add(pk);
      if (chance(0.85)) add({ mode: 'rope', anchor: '.watch-grid .watch-card:nth-of-type(3) .watch-thumb', tone: takeTone() });
      // footer — usually the meet-and-greet pair; occasionally a cartwheel practicer + a
      // corner Bobit medic, or a Bobit playing fetch with his dog (each a wide combined canvas)
      var fr = Math.random();
      if (fr < 0.26) {
        add({ mode: 'cartwheel', anchor: 'footer', edge: 'top', tone: 0, tone2: 1 });
      } else if (fr < 0.50) {
        add({ mode: 'dogfetch', anchor: 'footer', edge: 'top', tone: 0, tone2: 5 });   // teal owner, orange pup
      } else {
        add(walker('footer', { tone: 0 }));
        add({ mode: 'stand', anchor: 'footer', edge: 'top', x: 0.06, anim: pick(['standstill', 'bored']), hover: 'jump', tone: 1 });
      }
      return out;
    }

    var SPECS = buildCast();

    // ── Hand out the presidential quotes. A cast can legitimately contain no readers
    //    (seats split between 'sit' and 'read', and ~40% of sitters get a phone), which
    //    would make the feature invisible on that load — so if the pool has something to
    //    say and nobody is reading, promote one sitter to a reader. This biases the cast
    //    very slightly toward readers, which is the intended trade. ──
    (function dealQuotes() {
      if (!window.EVQuotes || !window.EVQuotes.QUOTES.length) return;   // module missing: readers just read
      function readers() {
        return SPECS.filter(function (s) {
          return s.mode === 'seat' && s.anim === 'read' && !s.phone;
        });
      }
      var rs = readers();
      if (!rs.length) {
        // 1. a sitter is the cheapest promotion — same figure, different pose
        var sitter = SPECS.filter(function (s) { return s.mode === 'seat' && !s.phone; })[0];
        if (sitter) { sitter.anim = 'read'; }
        else {
          // 2. no seats at all this load. Recast one note-card figure as a reader, keeping
          //    its anchor, position and colour so the population stays the same size.
          var i = -1, j;
          for (j = 0; j < SPECS.length; j++) {
            if (SPECS[j].anchor && SPECS[j].anchor.indexOf('.note') === 0) { i = j; break; }
          }
          var seat = {
            mode: 'seat', edge: 'top', anim: 'read',
            anchor: i >= 0 ? SPECS[i].anchor : '.note.n-alpha',
            x: i >= 0 && SPECS[i].x != null ? SPECS[i].x : 0.5,
            tone: i >= 0 && SPECS[i].tone != null ? SPECS[i].tone : takeTone()
          };
          // 3. nothing note-anchored either → add one rather than ship the feature invisible
          if (i >= 0) SPECS[i] = seat; else SPECS.push(seat);
        }
        rs = readers();
      }
      if (rs.length) window.EVQuotes.deal(rs);
    })();

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
    // lerpPose lives once, further down beside POSE_KEYS. A second copy used to sit here and it was
    // DEAD: both were `function` declarations in this same scope, so the later one won for every
    // call site in the file, including the ones written against this one. Don't add a local blend
    // helper here — it will silently lose to that one.
    var BEAM_LOADS = ['circle', 'line'];   // the ball and the yellow line (no notched triangle); beamPick avoids repeats

    function sizeCanvas(e, w, h) {
      if (e.w !== w || e.h !== h) {
        e.w = w; e.h = h;
        e.c.width = Math.round(w * DPR); e.c.height = Math.round(h * DPR);
        e.c.style.width = w + 'px'; e.c.style.height = h + 'px';
      }
      e.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    // ── The one place that decides how wide a figure canvas may be and where its left edge
    //    sits. These canvases are position:absolute in DOCUMENT coordinates, so a single one
    //    placed past the right edge — or simply wider than the viewport — gives the WHOLE
    //    PAGE a horizontal scrollbar on a phone.
    //    This clamp used to be copy-pasted into each mode that happened to need it (vclimb,
    //    rope, kite, yoyo), which is exactly why every mode added afterwards — stand, seat,
    //    patrol, paddlepair, cartwheel, dogfetch — silently overflowed, and why the ones that
    //    DID clamp still overflowed once their canvas was wider than a small phone. Every mode
    //    goes through these two now; a new mode cannot reintroduce the bug by forgetting to.
    function fitW(w) {
      var vw = document.documentElement.clientWidth;
      return Math.min(w, vw - 8);
    }
    function fitLeft(left, w, sx) {
      var max = sx + document.documentElement.clientWidth - w - 4;
      if (left > max) left = max;
      if (left < sx + 4) left = sx + 4;
      return left;
    }

    // A fleeing canvas must not be re-fitted the way a resting one is — a full reposition() would yank
    // the widened canvas out from under the run — but it can't simply be skipped either. It is
    // viewport-wide and position:absolute in document space, so a viewport SHRINK (a phone rotating
    // landscape -> portrait mid-exodus) would leave it wider than the page and hand the whole document
    // a horizontal scrollbar. That bug is why these canvases were briefly position:fixed.
    //
    // So: re-clamp width and left through the same fitW/fitLeft the rest of the file uses, and rebase
    // every canvas-local x by the same delta so the figure does not jump on screen. Heights and all
    // vertical state are untouched, which is what keeps the fall geometry intact across a resize.
    function refitFlee(e, sx) {
      var newW = fitW(document.documentElement.clientWidth);
      var newLeft = fitLeft(0, newW, sx);
      if (newW === e.w && newLeft === e.flLeft) return;         // nothing moved; no-op on the 700ms tick
      var shift = e.flLeft - newLeft;                           // keeps document x fixed
      e.flX += shift;
      e.flLedgeL += shift;
      e.flLedgeR += shift;
      if (e.flDog) e.flDog.x += shift;
      e.flLeft = newLeft;
      e.c.style.left = newLeft + 'px';
      sizeCanvas(e, newW, e.h);
    }

    function reposition() {
      var sy = window.scrollY || window.pageYOffset;
      var sx = window.scrollX || window.pageXOffset;
      entries.forEach(function (e) {
        if (e.gone) return;
        if (e.fl) { refitFlee(e, sx); return; }
        // Mid-abduction his canvas is deliberately taller and higher than his mode wants; abductEnd
        // calls reposition() itself once he is back on his feet.
        if (e.ab) return;
        var spec = e.spec;
        if (spec.mode === 'why') { sizeCanvas(e, 190, 215); return; }
        if (spec.mode === 'banner') { sizeCanvas(e, 120, 96); return; }
        // innerWidth includes the vertical scrollbar; clientWidth does not, so fitW is what
        // keeps a full-width canvas from being wider than the space it has
        if (spec.mode === 'crosser') { sizeCanvas(e, fitW(window.innerWidth), 110); return; }
        var r = e.el.getBoundingClientRect();
        if (spec.mode === 'vclimb') {
          var h = Math.min(300, Math.max(200, r.height));
          sizeCanvas(e, fitW(150), h);
          var leftV = r.right + sx - e.w / 2;                                 // centered on the note's right edge
          e.c.style.left = fitLeft(leftV, e.w, sx) + 'px';
          e.c.style.top = (r.top + sy + (r.height - h) / 2) + 'px';
          return;
        }
        if (spec.mode === 'rope') {
          sizeCanvas(e, fitW(350), 300);                                      // room for the frame bar + long swing
          var leftR = r.right + sx - 220;                                     // pivot (x=250) ~30px right of the video edge (over the chasm)
          e.c.style.left = fitLeft(leftR, e.w, sx) + 'px';
          // the frame bar (canvas y=46) should hang level with the short "03 / Talks" section bar, not on the video
          if (!e._barEl) e._barEl = document.querySelector('.watch .section-num .bar');
          var barTopY = e._barEl ? (e._barEl.getBoundingClientRect().top + sy) : (r.top + sy - 44);
          e.c.style.top = (barTopY - 46 + 1) + 'px';                          // +1 centers the 2px section bar
          return;
        }
        if (spec.mode === 'paddlepair') {
          sizeCanvas(e, fitW(250), FIG_H);   // wide enough for two players + a lob between them
          var edgeYPP = (spec.edge === 'bottom' ? r.bottom : r.top) + sy;
          e.c.style.left = fitLeft(r.left + sx + r.width * spec.x - e.w / 2, e.w, sx) + 'px';
          e.c.style.top = (edgeYPP - (FIG_H - 6)) + 'px';
          return;
        }
        if (spec.mode === 'cartwheel') {
          var hCW = 180; sizeCanvas(e, fitW(Math.max(360, r.width)), hCW);   // full-width + headroom for the spin
          var edgeYCW = (spec.edge === 'bottom' ? r.bottom : r.top) + sy;
          e.c.style.left = fitLeft(r.left + sx, e.w, sx) + 'px';
          e.c.style.top = (edgeYCW - (hCW - 6)) + 'px';
          return;
        }
        if (spec.mode === 'dogfetch') {
          var hDF = 180; sizeCanvas(e, fitW(Math.max(360, r.width)), hDF);   // full-width so the throw can clear the edge
          var edgeYDF = (spec.edge === 'bottom' ? r.bottom : r.top) + sy;
          e.c.style.left = fitLeft(r.left + sx, e.w, sx) + 'px';
          e.c.style.top = (edgeYDF - (hDF - 6)) + 'px';
          return;
        }
        if (spec.mode === 'kite') {
          var hKt = 350; sizeCanvas(e, fitW(340), hKt);   // tall + wide so the kite has plenty of sky up-and-downwind
          var edgeYKt = (spec.edge === 'bottom' ? r.bottom : r.top) + sy;
          var leftKt = r.left + sx + r.width * spec.x - 70;                    // flyer (gx0=70) sits at spec.x; kite reaches up-right
          e.c.style.left = fitLeft(leftKt, e.w, sx) + 'px';
          e.c.style.top = (edgeYKt - (hKt - 6)) + 'px';
          return;
        }
        if (spec.mode === 'yoyo') {
          sizeCanvas(e, fitW(210), FIG_H);                                     // extra width so the "walk the dog" roll has floor to travel
          var edgeYYo = (spec.edge === 'bottom' ? r.bottom : r.top) + sy;
          var leftYo = r.left + sx + r.width * spec.x - 70;                    // player (gx0=70) sits at spec.x; yo-yo rolls to his right
          e.c.style.left = fitLeft(leftYo, e.w, sx) + 'px';
          e.c.style.top = (edgeYYo - (FIG_H - 6)) + 'px';
          return;
        }
        if (spec.mode === 'seat') {
          // taller canvas + seat line 42px above the bottom so dangling shins clear the edge
          var hSe = 180;
          sizeCanvas(e, fitW(190), hSe);
          var edgeYSe = (spec.edge === 'bottom' ? r.bottom : r.top) + sy;
          e.c.style.left = fitLeft(r.left + sx + r.width * spec.x - e.w / 2, e.w, sx) + 'px';
          e.c.style.top = (edgeYSe - (hSe - 42)) + 'px';
          return;
        }
        var full = (spec.mode === 'beam' || spec.mode === 'patrol');
        // The beam gets a TALLER canvas than everyone else: its light-out gag reaches up to
        // the 501(c)(3) swatch inside .meta-row, and runLightGag measures that swatch relative
        // to the CANVAS TOP (swY = rr.top - cr.top), so a swatch above the top goes negative
        // and the box lofts off-canvas. The hero reserves --crew-clear (92px) below the row and
        // the row wraps to three lines on a phone, which puts the swatch ~180px above the
        // crew's floor — well past FIG_H. Extra height is free: transparent, pointer-events:none.
        var hEdge = (spec.mode === 'beam') ? 240 : FIG_H;
        sizeCanvas(e, fitW(full ? Math.max(300, r.width) : 190), hEdge);
        var edgeY = (spec.edge === 'bottom' ? r.bottom : r.top) + sy;
        var left = full ? (r.left + sx) : (r.left + sx + r.width * spec.x - e.w / 2);
        e.c.style.left = fitLeft(left, e.w, sx) + 'px';
        e.c.style.top = (edgeY - (hEdge - 6)) + 'px';
      });
    }

    function drawFig(ctx, x, y, s, flip, pose, opts) {
      ctx.save();
      ctx.translate(x, y);
      if (opts && opts.rot) ctx.rotate(opts.rot);   // whole-figure spin (cartwheels) / tip-over (heap)
      ctx.scale(flip ? -s : s, s);
      var j = R.computePose(pose, CFG, { x: 0, y: 0 });
      R.draw(ctx, j, CFG, opts);
      ctx.restore();
    }

    // ── "the light went out" gag (runs in the beam rotation instead of a two-carry pass):
    //    the 501(c)(3) yellow swatch flickers and dies → a lone Bobit walks in, notices it,
    //    runs off, runs back with a fresh yellow box, screws it back in (light on), looks
    //    around, and keeps walking off. Click him → a quick wave, then back to work. ──
    function startLight(e, w) {
      e.scene = 'light';
      e.lp = 'out'; e.lt2 = 0; e.lgLit = false; e.lightWave = 0;
      e.lgDir = 1;                                  // enters from the left (nearest the left-side 501(c)(3) swatch)
      e.lgX = -46;                                 // starts off-screen
      e.lgFace = e.lgDir;
    }
    function runLightGag(e, ctx, w, h, feetY, tt, col, shadow, cr, dt) {
      if (!('_swatchEl' in e)) e._swatchEl = document.querySelector('.hero .meta-row .swatch.s-yellow');
      var sw = e._swatchEl;
      var swX = w * 0.28, swY = h - 100;                                // fallback if the swatch can't be measured (bottom-relative, so it survives a taller canvas)
      if (sw) { var rr = sw.getBoundingClientRect(); swX = rr.left + rr.width / 2 - cr.left; swY = rr.top + rr.height / 2 - cr.top; }
      var YEL = cssVar('--yellow', '#FED12E'), OFF = '#6E7681';         // lit vs dead-bulb grey
      var speedWalk = 104, speedRun = 150, stopX = swX;   // slower run so the feet don't slide during the box swap
      var pose = null, carryBox = false, boxRise = 0, swOn = e.lgLit, flip = e.lgFace < 0;

      if (e.lightWave > 0 && e.lp !== 'out') {
        e.lightWave -= dt;                                             // clicked: brief wave, position & phase frozen
        pose = A.greet.frame(1.4 - e.lightWave, e._wave); flip = false;
        carryBox = (e.lp === 'runback' || e.lp === 'install');
      } else {
        switch (e.lp) {
          case 'out': {
            e.lt2 += dt; var ft = e.lt2, on = true, flk = [0.12, 0.20, 0.26, 0.42, 0.48, 0.70];
            for (var i = 0; i < flk.length; i++) if (ft > flk[i]) on = !on;      // dying-bulb flicker,
            swOn = ft > 0.72 ? false : on;                                        // then goes dark
            if (ft > 1.5) { e.lp = 'walkin'; e.lt2 = 0; }
            break;
          }
          case 'walkin':
            e.lgX += e.lgDir * speedWalk * dt; e.lgFace = e.lgDir; flip = e.lgDir < 0; pose = A.stroll.frame(tt);
            if ((e.lgDir > 0 && e.lgX >= stopX) || (e.lgDir < 0 && e.lgX <= stopX)) { e.lgX = stopX; e.lp = 'notice'; e.lt2 = 0; }
            break;
          case 'notice': {
            e.lt2 += dt; flip = e.lgFace < 0; var nt = e.lt2;
            if (nt < 0.9) {                                                        // stops and notices the dead light
              pose = A.presentup.frame(nt);
            } else if (nt < 1.7) {                                                 // leans in to inspect it
              var li = smooth01((nt - 0.9) / 0.55);
              pose = Object.assign({}, R.REST);
              pose.lean = -12 * li; pose.hunch = -16 * li; pose.headTilt = -20 * li;
              pose.armRU = 28 + 16 * li; pose.armRF = 18; pose.armLU = -18; pose.armLF = -10;
            } else if (nt < 2.7) {                                                 // shakes his head — no good
              var st = nt - 1.7;
              pose = Object.assign({}, R.REST);
              pose.lean = -4; pose.hunch = -6;
              pose.headTilt = Math.sin(st * 2 * Math.PI * (2 / 1.0)) * 18;         // ~2 slow shakes
              pose.armRU = 16; pose.armRF = 8; pose.armLU = -16; pose.armLF = -8;
            } else { e.lp = 'runoff'; e.lt2 = 0; }
            break;
          }
          case 'runoff': {
            e.lgX -= e.lgDir * speedRun * dt; e.lgFace = -e.lgDir; flip = -e.lgDir < 0; pose = A.scurry.frame(tt);
            var off = e.lgDir > 0 ? (e.lgX < -46) : (e.lgX > w + 46);
            if (off) { e.lp = 'runback'; e.lt2 = 0; }
            break;
          }
          case 'runback':
            e.lgX += e.lgDir * speedRun * dt; e.lgFace = e.lgDir; flip = e.lgDir < 0; pose = A.scurry.frame(tt); carryBox = true;
            if ((e.lgDir > 0 && e.lgX >= stopX) || (e.lgDir < 0 && e.lgX <= stopX)) { e.lgX = stopX; e.lp = 'install'; e.lt2 = 0; }
            break;
          case 'install': {
            e.lt2 += dt; pose = A.presentup.frame(e.lt2); flip = e.lgFace < 0;
            var p = smooth01(e.lt2 / 0.9); carryBox = true; boxRise = p;          // box rises from his hands to the swatch
            if (e.lt2 > 0.9) { var since = e.lt2 - 0.9; if (since > 0.22) e.lgLit = true; swOn = e.lgLit || (Math.floor(since * 22) % 2 === 0); }
            else swOn = false;
            if (e.lt2 > 1.6) { e.lp = 'lookaround'; e.lt2 = 0; }
            break;
          }
          case 'lookaround':
            e.lt2 += dt; pose = A.confused.frame(e.lt2); flip = e.lgFace < 0; swOn = true;   // stops, looks around
            if (e.lt2 > 1.3) { e.lp = 'walkoff'; e.lt2 = 0; }
            break;
          case 'walkoff': {
            e.lgX += e.lgDir * speedWalk * dt; e.lgFace = e.lgDir; flip = e.lgDir < 0; pose = A.stroll.frame(tt); swOn = true;
            var gone = e.lgDir > 0 ? (e.lgX > w + 46) : (e.lgX < -46);
            if (gone) {                                                           // done — hand back; next pass is anything but the light again
              if (sw) sw.style.background = YEL;
              e.dir = e.lgDir; beamPick(e, w);
              return;
            }
            break;
          }
        }
      }

      if (sw) sw.style.background = swOn ? YEL : OFF;

      if (pose) {
        R.drawShadow(ctx, e.lgX, feetY, 15, shadow);
        drawFig(ctx, e.lgX, feetY - 112 * S, S, flip, pose, { color: col });
        if (carryBox && !e.propGone) {
          var bx0 = e.lgX + e.lgFace * 12, by0 = feetY - 44;                      // box in his hands, then lofted to the swatch
          var bxX = bx0 + (swX - bx0) * boxRise, bxY = by0 + (swY - by0) * boxRise, bs = 12;
          ctx.fillStyle = YEL; ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(bxX - bs / 2, bxY - bs / 2, bs, bs, 2); else ctx.rect(bxX - bs / 2, bxY - bs / 2, bs, bs);
          ctx.fill();
        }
        e._lgSX = cr.left + e.lgX; e._lgSY = cr.top + feetY - 20;
      } else {
        e._lgSX = null;
      }
    }

    // ── paddleball RALLY: two Bobits face each other and volley one ball back and forth —
    //    a few bounces on a paddle, then a lob across to the partner, who catches and returns.
    //    Click a player → he stops, waves at you, misses; the ball drops & bounces on the ground;
    //    he then walks over, picks it up, walks back, and the rally resumes. ──
    function drawPaddlePair(e, ctx, w, h, feetY, tt, colA, colB, shadow, dt, cr) {
      var cxc = w / 2, gap = 108;
      var xL = cxc - gap / 2, xR = cxc + gap / 2;
      var baseY = feetY - 112 * S, groundBallY = feetY - 6;
      var bounceDur = 0.4, bouncesPerTurn = 2, tossDur = 0.55, bounceA = 20, arcH = 46;
      if (!e.rl) { e.rl = 'bounceL'; e.rlT = 0; }
      // expose figure positions for click hit-testing (home spots)
      e._ppSXL = cr.left + xL; e._ppSXR = cr.left + xR; e._ppSY = cr.top + feetY - 22;
      // the paddle is at the actual hand joint (computed from the pose), not a fixed offset
      var handAt = function (pose, fx, flip) { var j = R.computePose(pose, CFG, { x: 0, y: 0 }); return { x: fx + (flip ? -S : S) * j.hR.x, y: baseY + S * j.hR.y }; };
      var drawPaddle = function (hx, hy, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(hx, hy, 12, 4, 0, 0, Math.PI * 2); ctx.fill(); };
      var drawBall = function (x, y) { ctx.fillStyle = figColor(2); ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); };

      // hover (canvas is pointer-events:none, so use the shared pointer position, like other reactions)
      var overL = mx > cr.left + xL - 30 && mx < cr.left + xL + 30 && my > cr.top + feetY - 84 && my < cr.top + feetY + 8;
      var overR = mx > cr.left + xR - 30 && mx < cr.left + xR + 30 && my > cr.top + feetY - 84 && my < cr.top + feetY + 8;
      e.hoverSide = overL ? 'L' : (overR ? 'R' : null);
      // a hovered player lowers his paddle to wave — so if the ball reaches HIS side, it drops
      if (e.rl !== 'miss' && e.rl !== 'retrieve' && ((e.rl === 'bounceL' && e.hoverSide === 'L') || (e.rl === 'bounceR' && e.hoverSide === 'R'))) {
        e.missSide = e.hoverSide; e.rl = 'miss'; e.missT = 0; e.mvy = 0;
        e.mballX = (e._ballX != null ? e._ballX : (e.hoverSide === 'L' ? xL : xR)); e.mballY = (e._ballY != null ? e._ballY : feetY - 60);
      }

      // ── the waving player let it drop → it bounces, then he fetches it and resumes ──
      if (e.rl === 'miss' || e.rl === 'retrieve') {
        var isL = e.missSide === 'L';
        var homeX = isL ? xL : xR, otherX = isL ? xR : xL;
        var missCol = isL ? colA : colB, otherCol = isL ? colB : colA, otherFlip = isL;
        // the OTHER player reacts to the drop: lowers his paddle and throws his far hand out to
        // the side ("what's up?"), then eases back to a ready paddle as his partner fetches it
        var wu = Object.assign({}, R.REST); wu.armRU = 40; wu.armRF = 26; wu.armLU = -56; wu.armLF = -50; wu.hunch = -6; wu.headTilt = -12 + Math.sin(e.missT * 3) * 2; wu.lean = -2; wu.bob = 1;
        var otherPose;
        if (e.rl === 'miss') { e.owT = 0; otherPose = wu; }
        else { e.owT = (e.owT || 0) + dt; otherPose = lerpPose(wu, A.paddleball.frame(0.34), Math.min(1, e.owT / 0.4)); }
        var oHand = handAt(otherPose, otherX, otherFlip);
        var drawOther = function () { R.drawShadow(ctx, otherX, feetY, 14, shadow); drawFig(ctx, otherX, baseY, S, otherFlip, otherPose, { color: otherCol }); drawPaddle(oHand.x, oHand.y, otherCol); };

        if (e.rl === 'miss') {
          e.missT += dt;
          e.mvy = (e.mvy || 0) + 1200 * dt; e.mballY += e.mvy * dt;                 // gravity
          if (e.mballY > groundBallY) { e.mballY = groundBallY; e.mvy = -e.mvy * 0.5; }   // bounce, damped
          R.drawShadow(ctx, homeX, feetY, 14, shadow);
          drawFig(ctx, homeX, baseY, S, false, A.greet.frame(e.missT, e._wave), { color: missCol });   // happily waving at us
          drawOther();
          drawBall(e.mballX, e.mballY);
          if (e.missT > 1.9 && Math.abs(e.mvy) < 45 && e.mballY >= groundBallY - 1) { e.rl = 'retrieve'; e.retStep = 'togo'; e.retX = homeX; e.retT = 0; }
          return;
        }
        // retrieve: walk to the ball, pick it up, walk home, resume
        var retSpeed = 120;
        if (e.retStep === 'togo') {
          var d1 = e.mballX > e.retX ? 1 : -1; e.retX += d1 * retSpeed * dt;
          if ((d1 > 0 && e.retX >= e.mballX) || (d1 < 0 && e.retX <= e.mballX)) { e.retX = e.mballX; e.retStep = 'pick'; e.retT = 0; }
          R.drawShadow(ctx, e.retX, feetY, 14, shadow); drawFig(ctx, e.retX, baseY, S, d1 < 0, A.stroll.frame(tt), { color: missCol });
          drawOther(); drawBall(e.mballX, groundBallY);
        } else if (e.retStep === 'pick') {
          e.retT += dt;
          R.drawShadow(ctx, e.retX, feetY, 14, shadow); drawFig(ctx, e.retX, baseY, S, false, A.heave.frame(e.retT), { color: missCol });
          drawOther(); drawBall(e.mballX, groundBallY);                              // ball on the ground until grabbed
          if (e.retT > 1.15) { e.retStep = 'back'; }
        } else {   // back — carry the ball home in hand
          var d2 = homeX > e.retX ? 1 : -1; e.retX += d2 * retSpeed * dt;
          var wpb = A.stroll.frame(tt); R.drawShadow(ctx, e.retX, feetY, 14, shadow); drawFig(ctx, e.retX, baseY, S, d2 < 0, wpb, { color: missCol });
          drawOther();
          var chand = handAt(wpb, e.retX, d2 < 0); drawBall(chand.x, chand.y);
          if ((d2 > 0 && e.retX >= homeX) || (d2 < 0 && e.retX <= homeX)) { e.rl = isL ? 'bounceL' : 'bounceR'; e.rlT = 0; e.missT = 0; e.mvy = 0; }
        }
        return;
      }

      // ── normal rally (a hovered player lowers his paddle to wave; the other keeps playing) ──
      e.rlT += dt;
      var activeL = e.rl === 'bounceL', activeR = e.rl === 'bounceR';
      var padL = A.paddleball.frame(activeL ? tt : 0.34), padR = A.paddleball.frame(activeR ? tt : 0.34);
      var handL = handAt(padL, xL, false), handR = handAt(padR, xR, true);
      var ballX, ballY;
      switch (e.rl) {
        case 'bounceL':
          ballX = handL.x; ballY = handL.y - 8 - bounceA * Math.abs(Math.sin(Math.PI * e.rlT / bounceDur));
          if (e.rlT >= bouncesPerTurn * bounceDur) { e.rl = 'tossLR'; e.rlT = 0; }
          break;
        case 'tossLR': {
          var p = Math.min(1, e.rlT / tossDur);
          ballX = handL.x + (handR.x - handL.x) * p; ballY = (handL.y - 8) + (handR.y - handL.y) * p - arcH * Math.sin(Math.PI * p);
          if (e.rlT >= tossDur) { e.rl = 'bounceR'; e.rlT = 0; }
          break;
        }
        case 'bounceR':
          ballX = handR.x; ballY = handR.y - 8 - bounceA * Math.abs(Math.sin(Math.PI * e.rlT / bounceDur));
          if (e.rlT >= bouncesPerTurn * bounceDur) { e.rl = 'tossRL'; e.rlT = 0; }
          break;
        case 'tossRL': {
          var pr = Math.min(1, e.rlT / tossDur);
          ballX = handR.x + (handL.x - handR.x) * pr; ballY = (handR.y - 8) + (handL.y - handR.y) * pr - arcH * Math.sin(Math.PI * pr);
          if (e.rlT >= tossDur) { e.rl = 'bounceL'; e.rlT = 0; }
          break;
        }
      }
      R.drawShadow(ctx, xL, feetY, 14, shadow); R.drawShadow(ctx, xR, feetY, 14, shadow);
      var figL = e.hoverSide === 'L' ? A.greet.frame(tt, e._wave) : padL;   // hovered → wave (faces viewer)
      var figR = e.hoverSide === 'R' ? A.greet.frame(tt, e._wave) : padR;
      e._bodies = [{ x: xL, floor: feetY }, { x: xR, floor: feetY }];
      drawFig(ctx, xL, baseY, S, false, figL, { color: colA });
      drawFig(ctx, xR, baseY, S, e.hoverSide === 'R' ? false : true, figR, { color: colB });
      if (e.hoverSide !== 'L' && !e.propGone) drawPaddle(handL.x, handL.y, colA);
      if (e.hoverSide !== 'R' && !e.propGone) drawPaddle(handR.x, handR.y, colB);
      if (!e.propGone) drawBall(ballX, ballY);
      // Remembered so a hover-drop starts from here — and _ballVX so a ball dropped mid-rally carries on
      // the way it was already travelling instead of stopping dead in the air.
      if (e._ballX != null && dt > 0) e._ballVX = (ballX - e._ballX) / dt;
      e._ballX = ballX; e._ballY = ballY;
    }

    // ── CARTWHEEL scene (occasionally replaces the footer meet pair): one Bobit walks around
    //    and throws in the odd cartwheel; click him → he's flagged, and at the END of his next
    //    cartwheel he collapses into a heap (~10s wriggle), then gets up and shakes it off. On
    //    the spill the corner Bobit runs over and kneels by him; rises when he rises; and when
    //    he starts wheeling again, throws up his hands and trudges back to his corner. ──
    var HEAP_SECS = 10;
    function cwStar() { var p = A.standstill.frame(0); p.hunch = 0; p.bob = 0; p.headTilt = 0; p.armRU = 142; p.armRF = 150; p.armLU = -142; p.armLF = -150; p.legRU = 30; p.legRF = 26; p.legLU = -30; p.legLF = -26; return p; }
    function cwHeap(t) { var p = A.standstill.frame(0); var wr = Math.sin(t * 7) * 4, wr2 = Math.sin(t * 5.3 + 1) * 5; p.hunch = -46 + wr; p.bob = 10; p.lean = 6 + wr2; p.headTilt = -22 + wr; p.legRU = 66 + Math.sin(t * 6) * 12; p.legRF = -38; p.legLU = 58 + wr2; p.legLF = -32; p.armRU = 52 + Math.sin(t * 8) * 14; p.armRF = 40; p.armLU = -56; p.armLF = -38 + wr; return p; }
    // crouched over the fallen one — knelt low, one arm reaching in. Drawn with a y-offset so it sits on the ground.
    var KNEEL_YOFF = 18;
    function cwKneel(t) { var p = A.standstill.frame(0); p.bob = 6 + Math.sin(t * 2) * 1.2; p.hunch = -34; p.lean = 8; p.headTilt = -10; p.legRU = 84; p.legRF = -78; p.legLU = -70; p.legLF = 66; p.armRU = 56; p.armRF = 66; p.armLU = -34; p.armLF = -26; return p; }
    function cwFrust(t) { var p = A.standstill.frame(0); p.armRU = 166; p.armRF = 172; p.armLU = -166; p.armLF = -172; p.headTilt = Math.sin(t * 9) * 7; p.lean = -3; p.bob = Math.sin(t * 4) * 2; return p; }
    function drawCartwheel(e, ctx, w, h, feetY, tt, colA, colB, shadow, dt, cr) {
      var baseY = feetY - 112 * S, cornerX = 46, roamL = 128, roamR = w - 74;
      var lieRot = 80 * Math.PI / 180, lieY = (feetY - 14) - baseY;
      if (e.cw == null) { e.cw = 'stand'; e.cwT = 0; e.cwX = w * 0.5; e.cwDir = -1; e.cwX0 = e.cwX; e.hp = 'corner'; e.hpX = cornerX; e.hpT = 0; }
      e._cwSX = cr.left + e.cwX; e._cwSY = cr.top + feetY - 24;

      // ---- cartwheeler ----
      var cwPose, cwRot = 0, cwYoff = 0, cwFlip = e.cwDir < 0;
      switch (e.cw) {
        case 'stand':
          e.cwT += dt; cwPose = A.standstill.frame(tt);
          if (e.cwT > 0.5) {   // brief pause, then head off at a brisk walk
            if (e.cwX <= roamL) e.cwDir = 1; else if (e.cwX >= roamR) e.cwDir = -1; else if (Math.sin(e.cwX * 12.9) > 0.6) e.cwDir = -e.cwDir;
            e.cw = 'walk'; e.cwT = 0; e.cwWalk = 1.6 + (Math.sin(e.cwX * 3.1) + 1) * 1.1;   // walk 1.6–3.8s before the next move
          }
          break;
        case 'walk':
          e.cwT += dt; e.cwX += e.cwDir * 50 * dt; cwFlip = e.cwDir < 0; cwPose = A.strut.frame(tt);
          if (e.cwX <= roamL) { e.cwX = roamL; e.cwDir = 1; } else if (e.cwX >= roamR) { e.cwX = roamR; e.cwDir = -1; }
          if (e.cwT > e.cwWalk) {
            if (e.cwHurt || Math.sin(e.cwX * 7.7) > -0.3) {   // usually punctuate the walk with a cartwheel (always, if flagged, so he can fall out of it)
              if (e.cwX + e.cwDir * 96 > roamR) e.cwDir = -1; else if (e.cwX + e.cwDir * 96 < roamL) e.cwDir = 1;   // keep the wheel in-bounds
              e.cw = 'cwheel'; e.cwT = 0; e.cwX0 = e.cwX;
            } else { e.cw = 'stand'; e.cwT = 0; }   // …otherwise just pause and turn
          }
          break;
        case 'cwheel': {
          e.cwT += dt; var pc = Math.min(1, e.cwT / 0.95);
          e.cwX = e.cwX0 + e.cwDir * 96 * pc; cwRot = e.cwDir * 2 * Math.PI * pc; cwPose = cwStar();   // L→R clockwise, R→L counter-clockwise
          if (pc >= 1) {
            if (e.cwHurt) { e.cwHurt = false; e.cw = 'heap'; e.cwT = 0; }   // flagged → he crumples at the END of the wheel; helper comes running
            else { e.cw = 'walk'; e.cwT = 0; e.cwWalk = 1.6 + (Math.sin(e.cwX * 5.3) + 1) * 1.1; }   // otherwise resume walking
          }
          break;
        }
        case 'heap':
          e.cwT += dt; cwPose = cwHeap(e.cwT); cwRot = lieRot + Math.sin(e.cwT * 6) * 0.12; cwYoff = lieY;
          pushBeacon(cr.left + e.cwX, cr.top + feetY, 'collapse');   // someone crashed down below
          if (e.cwT > HEAP_SECS) { e.cw = 'getup'; e.cwT = 0; }
          break;
        case 'getup': {
          e.cwT += dt; var gp = smooth01(e.cwT / 1.2); cwRot = lieRot * (1 - gp); cwYoff = lieY * (1 - gp); cwPose = lerpPose(cwHeap(0), A.standstill.frame(0), gp);
          if (gp >= 1) { e.cw = 'headshake'; e.cwT = 0; }
          break;
        }
        case 'headshake':
          e.cwT += dt; cwPose = A.standstill.frame(tt); cwPose.headTilt = Math.sin(e.cwT * 11) * 20;
          if (e.cwT > 1.3) { e.cw = 'stand'; e.cwT = 0; }
          break;
      }
      R.drawShadow(ctx, e.cwX, feetY, 15, shadow);
      e._bodies = [{ x: e.cwX, floor: feetY }, { x: e.hpX, floor: feetY }];
      drawFig(ctx, e.cwX, baseY + cwYoff, S, cwFlip, cwPose, { color: colA, rot: cwRot });

      // ---- helper (corner Bobit) ----
      var hpPose, hpFlip = false, hpRot = 0, hpYoff = 0;
      switch (e.hp) {
        case 'corner':
          hpPose = A.standstill.frame(tt + 1.1); e.hpX = cornerX;
          if (e.cw === 'heap') { e.hp = 'runto'; }
          break;
        case 'runto': {
          var tgt = e.cwX - 30, d = tgt > e.hpX ? 1 : -1; e.hpX += d * 196 * dt; hpFlip = d < 0; hpPose = A.scurry.frame(tt);
          if ((d > 0 && e.hpX >= tgt) || (d < 0 && e.hpX <= tgt)) { e.hpX = tgt; e.hp = 'kneel'; e.hpT = 0; }
          break;
        }
        case 'kneel':
          e.hpT += dt; hpPose = cwKneel(e.hpT); hpFlip = e.cwX < e.hpX; hpYoff = KNEEL_YOFF;
          if (e.cw === 'getup' || e.cw === 'headshake' || e.cw === 'stand') { e.hp = 'helperup'; e.hpT = 0; }
          break;
        case 'helperup': {
          e.hpT += dt; var up = smooth01(e.hpT / 1.0); hpPose = lerpPose(cwKneel(0), A.standstill.frame(0), up); hpFlip = e.cwX < e.hpX; hpYoff = KNEEL_YOFF * (1 - up);
          if (up >= 1) { e.hp = 'watch'; }
          break;
        }
        case 'watch':
          hpPose = A.standstill.frame(tt); hpFlip = e.cwX < e.hpX;
          if (e.cw === 'cwheel') { e.hp = 'frustrated'; e.hpT = 0; }
          break;
        case 'frustrated':
          e.hpT += dt; hpPose = cwFrust(e.hpT); hpFlip = e.cwX < e.hpX;
          if (e.hpT > 1.2) { e.hp = 'runback'; }
          break;
        case 'runback': {
          var db = cornerX < e.hpX ? -1 : 1; e.hpX += db * 130 * dt; hpFlip = db < 0; hpPose = A.trudge.frame(tt);
          if (Math.abs(e.hpX - cornerX) < 6) { e.hpX = cornerX; e.hp = 'corner'; }
          break;
        }
      }
      R.drawShadow(ctx, e.hpX, feetY, 14, shadow);
      drawFig(ctx, e.hpX, baseY + hpYoff, S, hpFlip, hpPose, { color: colB, rot: hpRot });
    }

    // ── procedural DOG for the fetch scene ──────────────────────────────────
    //    Side-view pup drawn with the same thick round-capped capsules as the
    //    leremy figures. `st` selects the pose; `tt` drives gait + tail wag.
    //    Faces right by default; `face < 0` flips him. Body ~22px at the shoulder
    //    so he reads a touch shorter than the ~36px Bobits beside him.
    var DOG_SH = 22, DOG_BL = 32, DOG_SCALE = 0.67;   // ~2/3 size so he reads smaller beside the Bobits
    function drawDog(ctx, x, groundY, face, color, st, tt, opts) {
      opts = opts || {};
      ctx.save();
      ctx.translate(x, groundY);
      ctx.scale((face < 0 ? -1 : 1) * DOG_SCALE, DOG_SCALE);
      ctx.strokeStyle = color; ctx.fillStyle = color;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      var TONGUE = '#E8607A';
      function seg(ax, ay, bx, by, wd) { ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
      // two-segment leg with a knee kicked out perpendicular to the bone (bend sign = knee dir)
      function leg(ax, ay, fx, fy, bend, wd) {
        var mx = (ax + fx) / 2, my = (ay + fy) / 2, dx = fx - ax, dy = fy - ay, l = Math.hypot(dx, dy) || 1;
        var kx = mx + (-dy / l) * bend, ky = my + (dx / l) * bend;
        seg(ax, ay, kx, ky, wd); seg(kx, ky, fx, fy, wd);
      }
      // head + snout + floppy ear; returns the muzzle tip (where a carried ball sits)
      function head(hx, hy, earWag, tongue) {
        ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2); ctx.fill();
        var snX = hx + 11, snY = hy + 3;
        seg(hx + 2, hy + 1, snX, snY, 6);                 // muzzle
        seg(hx - 4, hy - 5, hx - 7, hy + 6 + earWag, 5);  // floppy ear
        if (tongue) { ctx.strokeStyle = TONGUE; seg(snX - 1, snY + 1, snX - 1, snY + 8, 3); ctx.strokeStyle = color; ctx.fillStyle = color; }
        return { x: snX, y: snY };
      }
      // upright body (stand / run / carry / pickup / drag / sit share this)
      function upright(c) {
        var cx = 0, cy = -DOG_SH - (c.lift || 0), tilt = c.tilt || 0;
        var ca = Math.cos(tilt), sa = Math.sin(tilt), half = DOG_BL / 2;
        var shX = cx + ca * half, shY = cy - sa * half, hpX = cx - ca * half, hpY = cy + sa * half;
        var ph = tt * (c.speed || 0) * Math.PI * 2 + (c.ph || 0);
        var fs = Math.sin(ph), bs = Math.sin(ph + Math.PI);
        var sw = c.swing || 0, ll = c.legLift || 0;
        var ffX = shX + fs * sw, ffY = -Math.max(0, fs) * ll;
        var bfX = hpX + bs * sw, bfY = -Math.max(0, bs) * ll;
        leg(shX + 3, shY, ffX + 3, ffY, 6, 4);            // far front leg (behind the body)
        leg(hpX - 3, hpY, bfX - 3, bfY, -6, 4);           // far back leg
        seg(hpX, hpY, shX, shY, 11);                      // body
        leg(shX, shY, ffX, ffY, 6, 5);                    // near front (elbow back)
        leg(hpX, hpY, bfX, bfY, -6, 5);                   // near back (stifle forward)
        var hx = shX + (c.hdx != null ? c.hdx : 12), hy = shY + (c.hdy != null ? c.hdy : -12);
        seg(shX, shY, hx, hy, 7);                         // neck
        var mouth = head(hx, hy, Math.sin(tt * (c.speed ? 9 : 2)) * 2, c.tongue);
        var wag = (opts.wag != null) ? opts.wag : Math.sin(tt * (c.tailSpd || 5)) * (c.tailAmp || 6);
        ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(hpX, hpY);
        ctx.quadraticCurveTo(hpX - 10, hpY - 9, hpX - 16, hpY - 14 + wag); ctx.stroke();
        return mouth;
      }

      var mouth = null;
      if (st === 'roll') {
        // flopped on his back, belly up: spine on the ground, four paws waving in the air,
        // head lolled back with tongue out, tail thumping the floor
        var by = -9;
        var a = Math.sin(tt * 8) * 4, b = Math.sin(tt * 8 + 1.7) * 4;
        function upleg(bx, kx, px) { seg(bx, by, kx, by - 13, 5); seg(kx, by - 13, px, by - 25, 5); }  // bent leg reaching up
        upleg(10, 13, 13 + a); upleg(5, 3, 3 + b);        // front paws up (near, far)
        upleg(-9, -7, -7 + b); upleg(-14, -16, -16 + a);  // back paws up (near, far)
        seg(-15, by, 15, by, 12);                         // rounded back resting on the ground
        var hx = 20, hy = -6;
        ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2); ctx.fill();
        seg(hx + 1, hy - 2, hx + 8, hy - 5, 6);           // muzzle tipped up (he's upside-down & delighted)
        ctx.strokeStyle = TONGUE; seg(hx + 7, hy - 4, hx + 12, hy - 1, 3); ctx.strokeStyle = color; ctx.fillStyle = color;
        seg(hx - 3, hy + 3, hx - 9, hy + 6, 5);           // ear flopped on the floor
        var tw = Math.sin(tt * 12) * 9;
        ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-15, by); ctx.quadraticCurveTo(-23, by + 1, -28, by - 6 + tw); ctx.stroke();
      } else if (st === 'sit') {
        mouth = upright({ tilt: 0.55, speed: 0, hdx: 12, hdy: -15, tailAmp: 6, tailSpd: 5, lift: Math.sin(tt * 2) * 0.4 });
      } else if (st === 'run') {
        mouth = upright({ tilt: -0.08, speed: 3.2, swing: 9, legLift: 7, lift: Math.abs(Math.sin(tt * 3.2 * Math.PI)) * 3, hdx: 14, hdy: -10, tailAmp: 5, tailSpd: 9, tongue: true });
      } else if (st === 'carry') {
        mouth = upright({ tilt: -0.03, speed: 2.6, swing: 7, legLift: 5, lift: Math.abs(Math.sin(tt * 2.6 * Math.PI)) * 2.4, hdx: 13, hdy: -13, tailAmp: 6, tailSpd: 8 });
      } else if (st === 'pickup') {
        mouth = upright({ tilt: 0.04, speed: 0, hdx: 12, hdy: 8, tailAmp: 8, tailSpd: 6 });   // nose dips down to the ball
      } else if (st === 'drag') {
        // faces the ball and hauls it BACKWARD: braced back, nose reaching toward the ball
        mouth = upright({ tilt: -0.10, speed: 1.3, swing: -3, legLift: 1, hdx: 16, hdy: -4, tongue: true, tailAmp: 2, tailSpd: 3 });
      } else {   // stand
        mouth = upright({ lift: Math.sin(tt * 2) * 0.6, speed: 0, hdx: 12, hdy: -12, tailAmp: 5, tailSpd: 3 });
      }

      if (mouth && opts.ball) {   // ball carried in the muzzle (radius undone so it matches the loose ball)
        ctx.fillStyle = opts.ballColor || figColor(2);
        ctx.beginPath(); ctx.arc(mouth.x, mouth.y, (opts.ballR || 6) / DOG_SCALE, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // ── DOG-FETCH scene (occasionally replaces the footer meet pair): a Bobit plays
    //    fetch with his dog, throwing the ball to alternating sides of the map.
    //    · hover the dog → he stops and sits
    //    · click the dog → he drops the ball and rolls on his back, paws up, tail wagging
    //    · click the thrower → he winds up and hurls it clean off the edge; the dog tears
    //      after it and drags back the big red dot from the middle of the EV logo (way too
    //      heavy), the thrower shoves it off the far side, points after it, and the dog
    //      trots off to bring back the little yellow ball so the game can carry on. ──
    var DOG_ROLL_SECS = 1.4;   // short base roll; a hover holds him down, and he pops up fast once you move on
    function throwWind() { var p = Object.assign({}, R.REST); p.lean = -8; p.headTilt = -6; p.armRU = -52; p.armRF = -58; p.armLU = -22; p.armLF = -15; p.legRU = 12; p.legLU = -16; p.legLF = -9; return p; }
    function throwRel(k) { var p = Object.assign({}, R.REST); p.lean = 6 - k * 3; p.headTilt = -10; var a = -52 + k * 150; p.armRU = a; p.armRF = a + 8; p.armLU = -20; p.armLF = -14; return p; }
    function pushPose(t) { var p = A.stroll.frame(t); p.lean = -10; p.hunch = -14; p.armRU = 86; p.armRF = 70; p.armLU = -80; p.armLF = -64; p.headTilt = -8; return p; }
    // thrower's reaction when the dog hauls in the big red ball: hands thrown up briefly, then a double head-shake
    function megaReact(t) {
      var p = Object.assign({}, R.REST);
      if (t < 0.7) {                                         // hands thrown up in the air
        var u = Math.min(1, t / 0.22);
        p.armRU = 40 + 132 * u; p.armRF = 30 + 148 * u; p.armLU = -40 - 132 * u; p.armLF = -30 - 148 * u;
        p.lean = -4; p.headTilt = -16; p.bob = 1 + Math.sin(t * 12) * 1.2;
      } else {                                               // hands to hips, shaking his head twice
        var ht = t - 0.7;
        p.armRU = 52; p.armRF = -128; p.armLU = -52; p.armLF = 128;
        p.headTilt = Math.sin(ht * (2 * Math.PI) * (2 / 1.2)) * 20; p.lean = -2; p.bob = 1;
      }
      return p;
    }
    function drawDogFetch(e, ctx, w, h, feetY, tt, colThrower, colDog, shadow, dt, cr) {
      var throwerX = w * 0.5, homeX = throwerX - 52, groundBallY = feetY - 7;
      var throwerBaseY = feetY - 112 * S, smallR = 6, bigR = 20;
      if (e.df == null) { e.df = 'ready'; e.dfT = 0; e.side = (Math.sin(w * 7.3) > 0 ? 1 : -1); e.dogX = homeX; e.dogFace = 1; e.thrX = throwerX; e.bHeld = 'thrower'; e.bX = homeX; e.bY = groundBallY; e.dogRoll = 0; e.mega = false; }

      // hit-test coords (canvas is pointer-events:none → use shared pointer for hover)
      e._dogSX = cr.left + e.dogX; e._dogSY = cr.top + feetY - 12;
      e._thSX = cr.left + e.thrX; e._thSY = cr.top + feetY - 34;
      var overDog = Math.abs(mx - (cr.left + e.dogX)) < 20 && my > cr.top + feetY - 28 && my < cr.top + feetY + 8;

      var rolling = e.dogRoll > 0;
      var sitting = !e.mega && !rolling && overDog;
      var dogFrozen = rolling || sitting;   // his own motion stops, but the thrown ball & the owner keep going
      if (rolling) {
        if (overDog) e.dogRoll = Math.max(e.dogRoll, 0.7);   // keeps enjoying the belly rub while you hover
        pushBeacon(cr.left + e.dogX, cr.top + feetY, 'collapse');   // dog flops down below
        e.dogRoll -= dt;
        if (e.dogRoll <= 0 && e.bHeld === 'ground') { e.df = 'chase'; e.dfT = 0; }   // gets up & fetches the ball he dropped
      }

      // helpers -----------------------------------------------------------------
      function dogTo(target, sp) { if (dogFrozen) return; var d = target > e.dogX ? 1 : -1; e.dogX += d * sp * dt; if ((d > 0 && e.dogX > target) || (d < 0 && e.dogX < target)) e.dogX = target; e.dogFace = d; }
      function thHand(pose, flip) { var j = R.computePose(pose, CFG, { x: 0, y: 0 }); return { x: e.thrX + (flip ? -S : S) * j.hR.x, y: throwerBaseY + S * j.hR.y }; }
      var DOG_RUN = 210, DOG_TROT = 150, DOG_DRAG = 88, DOG_MZ = 24;   // DOG_MZ = muzzle reach, so his nose (not chest) meets the ball

      // ── state machine: always runs so a thrown ball keeps flying/rolling even while you pet
      //    the dog; only the dog's own movement freezes (dogTo() no-ops while frozen) ──
      {
        switch (e.df) {
          case 'ready':
            e.dfT += dt;
            if (e.dfT > 0.8) { e.dfT = 0; if (e.megaPending) { e.megaPending = false; e.mega = true; e.df = 'megawind'; } else e.df = 'windup'; }   // clicked owner waits for the ball, THEN mega-throws
            break;
          case 'windup':
            e.dfT += dt;
            if (e.dfT > 0.45) { e.df = 'throw'; e.dfT = 0; e.tX = e.side > 0 ? w * 0.86 : w * 0.14; e.launch = thHand(throwRel(0.5), e.side < 0); e.bHeld = 'air'; }
            break;
          case 'throw': {
            e.dfT += dt; var p = Math.min(1, e.dfT / 0.7);
            e.bX = e.launch.x + (e.tX - e.launch.x) * p; e.bY = e.launch.y + (groundBallY - e.launch.y) * p - 70 * Math.sin(Math.PI * p);
            dogTo(e.tX, DOG_RUN);
            if (p >= 1) { e.bX = e.tX; e.bY = groundBallY; e.bHeld = 'ground'; e.bVX = e.side * 95; e.df = 'chase'; e.dfT = 0; }   // lands & keeps rolling gently
            break;
          }
          case 'chase': {
            if (e.bVX) { e.bX += e.bVX * dt; var dec = e.side * 150 * dt; if (Math.abs(dec) >= Math.abs(e.bVX)) e.bVX = 0; else e.bVX -= dec; e.bX = Math.max(18, Math.min(w - 18, e.bX)); }
            var pdir = e.bX >= e.dogX ? 1 : -1, pickupX = e.bX - pdir * DOG_MZ;   // stop where his muzzle (not chest) reaches the ball
            dogTo(pickupX, DOG_RUN);
            if (Math.abs(e.dogX - pickupX) < 6) { e.df = 'pickup'; e.dfT = 0; e.bVX = 0; }
            break;
          }
          case 'pickup':
            e.dfT += dt; if (e.dfT > 0.4) { e.bHeld = 'dog'; e.df = 'carryback'; e.dfT = 0; }
            break;
          case 'carryback':
            dogTo(homeX, DOG_TROT);
            if (Math.abs(e.dogX - homeX) < 8) { e.df = 'deliver'; e.dfT = 0; e.dogDropped = false; }   // arrives still holding it
            break;
          case 'deliver':
            e.dfT += dt;
            e.dogFace = throwerX > e.dogX ? 1 : -1;                 // turn to FACE the thrower before dropping
            if (!e.dogDropped && e.dfT > 0.25) {                    // then set it down in front of him; tail wiggles
              e.dogDropped = true; e.bHeld = 'ground'; e.bX = e.dogX + e.dogFace * 18; e.bY = groundBallY; e.dogWagT = 0.0001;
            }
            if (e.dfT > 0.85) { e.bHeld = 'thrower'; e.side = -e.side; e.df = 'ready'; e.dfT = 0; }
            break;
          // ── mega gag ──
          case 'megawind':
            e.dfT += dt;
            if (e.dfT > 0.6) { e.df = 'megathrow'; e.dfT = 0; e.megaSide = e.side; e.bHeld = 'air'; e.launch = thHand(throwRel(0.5), e.megaSide < 0); e.tX = e.megaSide > 0 ? w + 70 : -70; }
            break;
          case 'megathrow': {
            e.dfT += dt; var mp = Math.min(1, e.dfT / 0.85);
            e.bX = e.launch.x + (e.tX - e.launch.x) * mp; e.bY = e.launch.y + (groundBallY - e.launch.y) * mp - 120 * Math.sin(Math.PI * Math.min(1, mp * 0.9));
            dogTo(e.megaSide > 0 ? w + 50 : -50, DOG_RUN);
            if (mp >= 1 && (e.dogX > w + 40 || e.dogX < -40)) { e.df = 'megaoff'; e.dfT = 0; }
            break;
          }
          case 'megaoff':
            e.dfT += dt;
            if (e.dfT > 0.7) { e.df = 'megadrag'; e.dfT = 0; e.reactT = 0; e.dogX = e.megaSide > 0 ? w + 40 : -40; e.bigX = e.megaSide > 0 ? w + 62 : -62; }
            break;
          case 'megadrag': {
            e.reactT += dt;                                                             // thrower's see-the-big-ball reaction runs alongside the haul
            var dd = homeX > e.dogX ? 1 : -1; e.dogX += dd * DOG_DRAG * dt;             // shuffles BACKWARD toward home
            if ((dd > 0 && e.dogX > homeX) || (dd < 0 && e.dogX < homeX)) e.dogX = homeX;
            e.dogFace = e.megaSide > 0 ? 1 : -1;                                         // faces the ball, so he's walking backward
            e.bigX = e.dogX + e.megaSide * (bigR + 6);                                   // ball right at his nose, on the edge side
            if (Math.abs(e.dogX - homeX) < 10) { e.df = 'megacatch'; e.dfT = 0; }
            break;
          }
          case 'megacatch':
            e.dfT += dt; if (e.dfT > 0.9) { e.df = 'megapush'; e.dfT = 0; }
            break;
          case 'megapush': {
            var pd = -e.megaSide; e.bigX += pd * 104 * dt;
            if (pd > 0 ? e.bigX > w + 62 : e.bigX < -62) { e.df = 'megapoint'; e.dfT = 0; }
            break;
          }
          case 'megapoint':
            e.dfT += dt; if (e.dfT > 1.4) { e.df = 'megareturn'; e.dfT = 0; }
            break;
          case 'megareturn':
            dogTo(e.megaSide > 0 ? w + 40 : -40, DOG_RUN);
            if (e.dogX > w + 30 || e.dogX < -30) { e.df = 'megaback'; e.dfT = 0; }
            break;
          case 'megaback':
            e.dfT += dt; if (e.dfT > 0.8) { e.df = 'megacarry'; e.dfT = 0; e.dogX = e.megaSide > 0 ? w + 30 : -30; e.bHeld = 'dog'; }
            break;
          case 'megacarry':
            dogTo(homeX, DOG_TROT);
            if (Math.abs(e.dogX - homeX) < 8) { e.df = 'megadeliver'; e.dfT = 0; e.dogDropped = false; }
            break;
          case 'megadeliver':
            e.dfT += dt;
            e.dogFace = throwerX > e.dogX ? 1 : -1;                 // faces the owner before setting it down
            if (!e.dogDropped && e.dfT > 0.25) { e.dogDropped = true; e.bHeld = 'ground'; e.bX = e.dogX + e.dogFace * 18; e.bY = groundBallY; e.dogWagT = 0.0001; }
            // ball waits on the GROUND until the owner has strolled home, then he bends to pick it up (no teleport)
            if (e.dogDropped && Math.abs(e.thrX - throwerX) < 3) { e.mega = false; e.df = 'deliver'; e.dfT = 0; }   // deliver does the heave-pickup + side flip
            break;
        }
      }

      // thrower position: steps in to catch, follows the shove (but stays on-screen), holds
      // while pointing, and otherwise STROLLS back to his spot at a normal pace (no sprint)
      e.thrWalk = false;
      if (e.df === 'megacatch') { e.thrX += (e.bigX - e.megaSide * 30 - e.thrX) * Math.min(1, dt * 4); }
      else if (e.df === 'megapush') { var tgt = Math.max(44, Math.min(w - 44, e.bigX + e.megaSide * 24)); e.thrX += (tgt - e.thrX) * Math.min(1, dt * 4); }
      else if (e.df === 'megapoint') { /* holds his ground, pointing after it */ }
      else { var dth = throwerX - e.thrX; if (Math.abs(dth) > 1.5) { e.thrX += (dth > 0 ? 1 : -1) * Math.min(Math.abs(dth), 64 * dt); e.thrWalk = true; } else e.thrX = throwerX; }

      // when he throws his hands up at the incoming mega-ball, it's a commotion the ledge-peeker can hear
      if (e.df === 'megadrag' && e.reactT < 2.0) pushBeacon(cr.left + e.thrX, cr.top + feetY, 'commotion');

      // ── choose poses ──
      var faceDogFlip = e.dogX < e.thrX;
      var thP, thFlip;
      switch (e.df) {
        case 'ready': thP = A.standstill.frame(tt); thFlip = e.side < 0; break;
        case 'windup': thP = throwWind(); thFlip = e.side < 0; break;
        case 'megawind': thP = throwWind(); thFlip = e.side < 0; break;
        case 'throw': thP = throwRel(Math.min(1, e.dfT / 0.3)); thFlip = e.side < 0; break;
        case 'megathrow': thP = throwRel(Math.min(1, e.dfT / 0.3)); thFlip = e.megaSide < 0; break;
        case 'megaoff': thP = A.standstill.frame(tt); thFlip = e.megaSide < 0; break;
        case 'megadrag': thP = (e.reactT < 1.9) ? megaReact(e.reactT) : A.standstill.frame(tt); thFlip = e.megaSide < 0; break;   // hands up + head-shake, then waits for the dog
        case 'megacatch': thP = A.heave.frame(Math.min(1.15, e.dfT)); thFlip = e.megaSide > 0; break;
        case 'megapush': thP = pushPose(tt); thFlip = (-e.megaSide) < 0; break;
        case 'megapoint': thP = A.present.frame(tt); thFlip = (-e.megaSide) < 0; break;
        case 'deliver': thP = A.heave.frame(Math.min(1.15, e.dfT)); thFlip = faceDogFlip; break;
        default: thP = A.standstill.frame(tt); thFlip = faceDogFlip;   // watching the dog work
      }
      if (e.thrWalk) { thP = A.stroll.frame(tt); thFlip = throwerX < e.thrX; }   // strolling back to his throwing spot

      var dogBall = e.bHeld === 'dog';   // ball shows in his muzzle whenever he holds it (incl. while sitting)
      var dogSt;
      if (rolling) dogSt = 'roll';
      else if (sitting) dogSt = 'sit';
      else switch (e.df) {
        case 'throw': case 'chase': case 'megathrow': case 'megareturn': dogSt = 'run'; break;
        case 'pickup': dogSt = 'pickup'; break;
        case 'carryback': case 'megacarry': dogSt = 'carry'; break;
        case 'megadrag': dogSt = 'drag'; break;
        default: dogSt = 'stand';
      }
      if (sitting) e.dogFace = e.thrX > e.dogX ? 1 : -1;
      if (e.dogWagT > 0) { e.dogWagT += dt; if (e.dogWagT > 0.55) e.dogWagT = 0; }   // fast double tail-wiggle right after he drops the ball
      var wagBurst = (e.dogWagT > 0) ? Math.sin(e.dogWagT * 2 * Math.PI * 3.6) * 12 : null;

      // ── draw ──
      // big red logo-dot behind the actors during the mega haul
      if (e.df === 'megadrag' || e.df === 'megacatch' || e.df === 'megapush') {
        R.drawShadow(ctx, e.bigX, feetY, 24, shadow);
        ctx.fillStyle = cssVar('--coral', '#FF5740');
        ctx.beginPath(); ctx.arc(e.bigX, feetY - bigR, bigR, 0, Math.PI * 2); ctx.fill();
      }
      // thrower
      R.drawShadow(ctx, e.thrX, feetY, 16, shadow);
      e._bodies = [{ x: e.thrX, floor: feetY }];
      drawFig(ctx, e.thrX, throwerBaseY, S, thFlip, thP, { color: colThrower });
      // small yellow ball when it's loose or in the thrower's hand (the dog draws it when carried)
      if (e.bHeld === 'thrower' && !e.propGone) { var hp = thHand(thP, thFlip); ctx.fillStyle = figColor(2); ctx.beginPath(); ctx.arc(hp.x, hp.y, smallR, 0, Math.PI * 2); ctx.fill(); }
      else if (e.bHeld === 'air' || e.bHeld === 'ground') { ctx.fillStyle = figColor(2); ctx.beginPath(); ctx.arc(e.bX, e.bY, smallR, 0, Math.PI * 2); ctx.fill(); }
      // dog
      R.drawShadow(ctx, e.dogX, feetY, rolling ? 15 : 11, shadow);
      drawDog(ctx, e.dogX, feetY, e.dogFace, colDog, dogSt, tt, { ball: dogBall, ballColor: figColor(2), ballR: smallR, wag: wagBurst });
    }

    // ── KITE scene (occasionally on the right of Note 01's top edge): a Bobit flies a kite in a
    //    left→right wind — the kite floats up-and-downwind on a string, with a little fluttering
    //    tail. Click the KITE → it does a loop (tail trailing). Hover the GUY → he waves with his
    //    free hand. Click the GUY → the kite spins, falls, and he trots over, picks it up, and
    //    tosses it back up as he runs home. ──
    function kiteHold(t) { var p = Object.assign({}, R.REST); p.lean = -3; p.headTilt = -20; p.armRU = 150; p.armRF = 150; p.armLU = -16; p.armLF = -12; p.bob = Math.sin(t * 0.7) * 1.4; p.legRU = 8; p.legLU = -10; return p; }
    function kiteWave(t) { var p = kiteHold(t); var wv = Math.min(1, t / 0.3); p.armLU = -15 - 140 * wv; p.armLF = -11 - 150 * wv + Math.sin(t * 11) * 22; p.headTilt = -14; return p; }
    function drawKite(e, ctx, w, h, feetY, tt, colGuy, colKite, shadow, dt, cr) {
      var gx0 = 70, guyBaseY = feetY - 112 * S, khX = 262, khY = 86, groundKiteY = feetY - 12;   // kite rides well downwind (long string), hovering a touch lower
      if (e.kt == null) { e.kt = 'fly'; e.ktT = 0; e.gxCur = gx0; e.kwave = 0; e.kx = khX; e.ky = khY; e.kang = 0.28; }
      e.ktT += dt;

      function guyHandOf(pose, flip) { var j = R.computePose(pose, CFG, { x: 0, y: 0 }); return { x: e.gxCur + (flip ? -S : S) * j.hR.x, y: guyBaseY + S * j.hR.y }; }
      function bottomPt(kx, ky, ang) { return { x: kx + Math.sin(ang) * 17, y: ky + Math.cos(ang) * 17 }; }
      function kiteDiamond(kx, ky, ang) {
        ctx.save(); ctx.translate(kx, ky); ctx.rotate(ang);
        ctx.fillStyle = colKite; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(11, 0); ctx.lineTo(0, 17); ctx.lineTo(-11, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = colGuy; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, 17); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.stroke();
        ctx.restore();
      }
      function kiteTail(kx, ky, ang, ph) {
        var bp = bottomPt(kx, ky, ang);
        ctx.strokeStyle = colKite; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(bp.x, bp.y);
        var px, py;
        for (var i = 1; i <= 11; i++) { var f = Math.sin(ph * 5 + i * 0.8) * 5; px = bp.x + i * 3 + f; py = bp.y + i * 7; ctx.lineTo(px, py); }
        ctx.stroke();
        ctx.fillStyle = colGuy;
        for (var b = 2; b <= 10; b += 2) { var fb = Math.sin(ph * 5 + b * 0.8) * 5; ctx.beginPath(); ctx.arc(bp.x + b * 3 + fb, bp.y + b * 7, 2.3, 0, Math.PI * 2); ctx.fill(); }
      }
      function kiteString(hand, kx, ky, ang, slack) {
        var bp = bottomPt(kx, ky, ang);
        ctx.strokeStyle = cssVar('--border', '#B0AEA6'); ctx.lineWidth = 1.3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.quadraticCurveTo((hand.x + bp.x) / 2, (hand.y + bp.y) / 2 + (slack || 6), bp.x, bp.y); ctx.stroke();
      }

      // hover the guy → wave with his free hand (while the kite is up)
      var overGuy = Math.abs(mx - (cr.left + e.gxCur)) < 22 && my > cr.top + feetY - 92 && my < cr.top + feetY + 6;
      var flying = (e.kt === 'fly' || e.kt === 'loop');
      if (flying && overGuy) { if (!e.kwave) e.kwave = 0.0001; e.kwLinger = 1.3; }
      else if (e.kwave) { e.kwLinger -= dt; if (e.kwLinger <= 0) e.kwave = 0; }
      if (e.kwave) e.kwave += dt;

      e._kiteSX = cr.left + e.kx; e._kiteSY = cr.top + e.ky;
      e._kgSX = cr.left + e.gxCur; e._kgSY = cr.top + feetY - 40;

      var guyPose, guyFlip = false, kx = e.kx, ky = e.ky, ang = e.kang, slack = 6, kiteInHand = false, kiteGround = false;
      switch (e.kt) {
        case 'fly': {
          var sway = Math.sin(e.ktT * 1.1), bobK = Math.sin(e.ktT * 1.6);
          kx = khX + sway * 12; ky = khY + bobK * 9; ang = 0.28 + sway * 0.14;
          guyPose = kiteHold(e.ktT);
          break;
        }
        case 'loop': {
          var lp = Math.min(1, e.ktT / 1.2), a2 = -Math.PI / 2 + lp * 2 * Math.PI;
          kx = khX + Math.cos(a2) * 26; ky = (khY - 22) + Math.sin(a2) * 26; ang = 0.28 + lp * 2 * Math.PI;
          guyPose = kiteHold(e.ktT);
          if (lp >= 1) { e.kt = 'fly'; e.ktT = 0; }
          break;
        }
        case 'spin': {
          kx = khX; ky = khY; ang = 0.28 + e.ktT * 22; slack = 6 + e.ktT * 26;   // spins in place, string goes slack
          guyPose = kiteHold(e.ktT);
          if (e.ktT > 0.6) { e.kt = 'fall'; e.ktT = 0; e.kvy = -20; }
          break;
        }
        case 'fall': {
          e.kvy = (e.kvy || 0) + 470 * dt; e.ky += e.kvy * dt; e.kx += 26 * dt;    // gravity + downwind drift
          kx = e.kx; ky = e.ky; ang = 0.28 + Math.sin(e.ktT * 9) * 0.7;
          guyPose = A.standstill.frame(tt); guyPose.headTilt = 16;                 // watches it come down
          if (e.ky >= groundKiteY) { e.ky = groundKiteY; e.kt = 'fetch'; e.ktT = 0; }
          break;
        }
        case 'fetch': {
          var tgt = e.kx - 16, d = tgt > e.gxCur ? 1 : -1; e.gxCur += d * 74 * dt; guyFlip = d < 0;
          kx = e.kx; ky = groundKiteY; ang = 1.5; kiteGround = true;
          guyPose = A.stroll.frame(tt);
          if (Math.abs(e.gxCur - tgt) < 3) { e.gxCur = tgt; e.kt = 'pickup'; e.ktT = 0; }
          break;
        }
        case 'pickup': {
          guyPose = A.heave.frame(Math.min(1.15, e.ktT));
          if (e.ktT < 0.8) { kx = e.kx; ky = groundKiteY; ang = 1.5; kiteGround = true; } else { kiteInHand = true; }
          if (e.ktT > 1.05) { e.kt = 'relaunch'; e.ktT = 0; }
          break;
        }
        case 'relaunch': {
          var dd = gx0 > e.gxCur ? 1 : -1; e.gxCur += dd * 96 * dt; guyFlip = dd < 0;
          var dist = Math.abs(e.gxCur - gx0);
          guyPose = A.scurry.frame(tt);
          if (dist > 54) { kiteInHand = true; }                                    // carries it low as he runs
          else { var lf = 1 - dist / 54, hand = guyHandOf(guyPose, guyFlip); kx = hand.x + (khX - hand.x) * lf; ky = hand.y + (khY - hand.y) * lf; ang = 0.9 - 0.62 * lf; }   // tosses it up as he arrives
          if (dist < 3) { e.gxCur = gx0; e.kt = 'fly'; e.ktT = 0; }
          break;
        }
      }
      if (e.kwave && flying) guyPose = kiteWave(e.kwave);
      e.kx = kx; e.ky = ky; e.kang = ang;

      // ── draw ──
      R.drawShadow(ctx, e.gxCur, feetY, 15, shadow);
      if (kiteGround) R.drawShadow(ctx, kx, feetY, 11, shadow);
      e._bodies = [{ x: e.gxCur, floor: feetY }];   // the flyer, NOT the ink midpoint: that spans him and the kite
      drawFig(ctx, e.gxCur, guyBaseY, S, guyFlip, guyPose, { color: colGuy });
      if (kiteInHand) { var hnd = guyHandOf(guyPose, guyFlip); kx = hnd.x; ky = hnd.y - 6; ang = guyFlip ? -0.7 : 0.7; e.kx = kx; e.ky = ky; e.kang = ang; }
      // Let go of a kite and the wind has it: the overlay flies it off the side rather than dropping it,
      // so string, tail and kite all leave together the moment he releases.
      if (!e.propGone) {
        if (e.kt === 'fly' || e.kt === 'loop' || e.kt === 'spin') kiteString(guyHandOf(kiteHold(e.ktT), false), kx, ky, ang, slack);
        kiteTail(kx, ky, ang, e.ktT);
        kiteDiamond(kx, ky, ang);
      }
    }

    // ── YO-YO player: throws it down, it bounces back up, the hand pops up slightly at the catch,
    //    repeat. The yo-yo is always a contrasting hue to the player (cast via contrastTone).
    //    Click him → "walk the dog": he lets it all the way to the floor, it rolls along the ground,
    //    then snaps back up the string into his hand. ──
    function yoyoHold(t) {
      var p = Object.assign({}, R.REST);
      p.lean = 2;
      p.bob = Math.sin(t * 0.7) * 1.2;
      p.headTilt = -6;                    // glancing down at the toy
      p.armRU = 44; p.armRF = 16;         // throwing hand held out in front, about waist height
      p.armLU = -14; p.armLF = -12;       // off hand relaxed at his side
      p.legRU = 6; p.legLU = -8;
      return p;
    }
    function drawYoyo(e, ctx, w, h, feetY, tt, colGuy, colYoyo, shadow, dt, cr) {
      var gx0 = 70, guyBaseY = feetY - 112 * S, rY = 4.3;         // yo-yo ~1/3 smaller
      var normalBotY = feetY - 11, groundBotY = feetY - rY - 1;   // normal throw dips lower (closer to the floor) vs. sits ON it (walk-the-dog)
      if (e.yo == null) { e.yo = 'throw'; e.yoT = 0; e.yoSpin = 0; }
      e.yoT += dt;

      function handOf(pose) { var j = R.computePose(pose, CFG, { x: 0, y: 0 }); return { x: gx0 + S * j.hR.x, y: guyBaseY + S * j.hR.y }; }

      var pose = yoyoHold(tt);
      var dropFrac = 0, pop = 0, rollX = 0, botY = normalBotY, spinRate = 3;
      var rollDist = Math.min(58, w - gx0 - 34);   // "walk the dog" doesn't wander so far out

      if (e.yo === 'throw') {
        var P = 1.25, thr = 0.62;                     // one throw-and-catch, then a short beat resting in the hand
        var u = (e.yoT % P) / P;
        if (u < thr) {
          var s = u / thr;
          dropFrac = Math.sin(Math.PI * s);           // down to the bottom (s=0.5) and back up into the hand
          pop = -Math.sin(2 * Math.PI * s);           // hand dips on the downstroke, pops UP as it climbs back to the catch
          spinRate = 6 + dropFrac * 12;
          pose.headTilt = -6 - dropFrac * 10;          // follows it down
        } else { spinRate = 2; }
      } else if (e.yo === 'wd_down') {                 // walk the dog: let it all the way to the floor
        var d = Math.min(1, e.yoT / 0.4);
        dropFrac = d; botY = groundBotY; spinRate = 6 + d * 12;
        pose.lean = 2 + d * 7; pose.hunch = -6 * d; pose.headTilt = -6 - 16 * d;
        pose.armRU = 44 + d * 12; pose.armRF = 16 + d * 8;
        if (e.yoT >= 0.4) { e.yo = 'wd_roll'; e.yoT = 0; }
      } else if (e.yo === 'wd_roll') {                 // it rolls along the ground while he leans and watches it go
        var rr = Math.min(1, e.yoT / 1.5);
        dropFrac = 1; botY = groundBotY; rollX = rollDist * easeInOut(rr); spinRate = 18;
        pose.lean = 9; pose.hunch = -6; pose.headTilt = -22;
        pose.armRU = 58 + rr * 10; pose.armRF = 26;   // arm reaches out after it
        if (e.yoT >= 1.5) { e.yo = 'wd_back'; e.yoT = 0; }
      } else {                                         // wd_back: rolls home, then snaps up the string into his hand
        var bk = Math.min(1, e.yoT / 0.55);
        rollX = rollDist * (1 - easeInOut(Math.min(1, bk * 1.5)));
        dropFrac = 1 - easeInOut(Math.max(0, (bk - 0.55) / 0.45));
        botY = groundBotY; spinRate = 16;
        pose.lean = 8 - bk * 6; pose.hunch = -4 * (1 - bk); pose.headTilt = -18 + bk * 12;
        pop = dropFrac < 0.5 ? (1 - dropFrac * 2) : 0;  // hand pops up as it lands home
        if (e.yoT >= 0.55) { e.yo = 'throw'; e.yoT = 0.62 * 1.25; }   // resume mid-rest so it doesn't instantly re-throw
      }

      // hand pop at the catch
      pose.armRU += pop * 11; pose.armRF -= pop * 4; pose.bob += pop * 2;

      e.yoSpin += dt * spinRate;
      var hand = handOf(pose);
      var yoX = hand.x + rollX, yoY = hand.y + (botY - hand.y) * dropFrac;

      e._yoSX = cr.left + gx0; e._yoSY = cr.top + feetY - 40;

      // ── draw ──
      R.drawShadow(ctx, gx0, feetY, 15, shadow);
      if (dropFrac > 0.92 && botY >= groundBotY - 0.5) R.drawShadow(ctx, yoX, feetY, 8, shadow);   // the yo-yo's own shadow when it's on the floor
      e._bodies = [{ x: gx0, floor: feetY }];       // likewise: the ink spans him and the yo-yo
      drawFig(ctx, gx0, guyBaseY, S, false, pose, { color: colGuy });
      // string from the hand down to the yo-yo
      if (!e.propGone) {                              // dropped: the string and the yo-yo go with it
        ctx.strokeStyle = cssVar('--border', '#B0AEA6'); ctx.lineWidth = 1.2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(yoX, yoY); ctx.stroke();
        // the yo-yo — a spinning disc; a streak + hub sell the spin
        ctx.save(); ctx.translate(yoX, yoY); ctx.rotate(e.yoSpin);
        ctx.fillStyle = colYoyo; ctx.beginPath(); ctx.arc(0, 0, rY, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = colGuy; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-rY + 1.6, 0); ctx.lineTo(rY - 1.6, 0); ctx.stroke();
        ctx.fillStyle = cssVar('--bg', '#fff'); ctx.beginPath(); ctx.arc(0, 0, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    // ── PHONE-SITTER (a seated Bobit glued to a phone): click him → he pockets the phone and just
    //    hangs out; click again → he fishes it back out, bends over, and gets re-absorbed. ──
    // POSE_KEYS is the whole pose contract: REST's eleven fields plus `hunch`, which the animations
    // add. Verified against every one of the rig's 41 animations — none returns a field outside this
    // list, so blending on these keys alone loses nothing. A pose that ever carries a thirteenth
    // field must be added here, or lerpPose will quietly drop it.
    var POSE_KEYS = ['lean', 'headTilt', 'bob', 'hunch', 'armRU', 'armRF', 'armLU', 'armLF', 'legRU', 'legRF', 'legLU', 'legLF'];
    // The ONLY lerpPose. Used by the flee getup, the quote glance/hold/resume, the cartwheel heap,
    // the phone-sitter and the dog-fetch pain blend — i.e. from well above this line to well below
    // it, which is fine because function declarations hoist.
    function lerpPose(a, b, u) {
      var p = {};
      for (var i = 0; i < POSE_KEYS.length; i++) { var k = POSE_KEYS[i]; var av = a[k] || 0, bv = b[k] || 0; p[k] = av + (bv - av) * u; }
      return p;
    }
    function easeInOut(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
    function phoneAbsorbed(t) {
      var p = Object.assign({}, R.REST);
      var br = Math.sin(t * 0.28 * Math.PI * 2);   // slow breathing
      var thumb = Math.sin(t * 6) * 3;             // thumb-typing twitch
      p.lean = 6;
      p.hunch = -(30 + br * 2);                     // curled hard over the screen
      p.bob = br * 1.2;
      p.headTilt = -(24 + br * 2);                  // face buried in the phone
      p.armRU = 54 + br;  p.armRF = 126 + thumb;    // both hands cupped low and central
      p.armLU = 42 - br;  p.armLF = 116 - thumb;
      p.legRU = 80; p.legRF = 10;                   // seated, shins dangling
      p.legLU = 72; p.legLF = 4;
      return p;
    }
    function drawPhoneSeat(e, ctx, w, h, tt, col, dt) {
      if (e.ph == null) { e.ph = 'absorbed'; e.phT = 0; }   // start doomscrolling
      e.phT += dt;
      var seatY = h - 42, TRANS = 0.6;
      var absorbed = phoneAbsorbed(tt), hangout = A.sit.frame(tt);
      var pose, showPhone = true, phoneRot = -0.08, u;   // held nearly upright (portrait)
      if (e.ph === 'absorbed') { pose = absorbed; }
      else if (e.ph === 'hangout') { pose = hangout; showPhone = false; }
      else if (e.ph === 'pocket') {                          // absorbed → hangout
        u = easeInOut(Math.min(1, e.phT / TRANS));
        pose = lerpPose(absorbed, hangout, u);
        showPhone = e.phT < TRANS * 0.55;                    // slides down to the lap, then it's pocketed
        phoneRot = -0.08 + u * 0.5;
        if (e.phT >= TRANS) { e.ph = 'hangout'; e.phT = 0; }
      } else {                                               // 'draw': hangout → absorbed
        u = easeInOut(Math.min(1, e.phT / TRANS));
        pose = lerpPose(hangout, absorbed, u);
        showPhone = e.phT > TRANS * 0.4;                     // fishes it back out, then bends over it
        phoneRot = 0.42 - u * 0.5;
        if (e.phT >= TRANS) { e.ph = 'absorbed'; e.phT = 0; }
      }
      drawFig(ctx, w / 2, seatY, S, e.spec.x > 0.5, pose, { color: col, phone: showPhone && !e.propGone, phoneRot: phoneRot });
      var cr = e.c.getBoundingClientRect();
      e._phSX = cr.left + w / 2; e._phFY = cr.top + h;       // click hitbox anchor (screen coords)
    }

    // ── SEATED READER. Owns every non-phone 'read' seat, whether or not the quote pool
    //    reached him.
    //    With a quote: hover → he lifts his head off the page but keeps hold of the book;
    //    click → he sits up, lowers the book into his lap and a speech bubble opens with his
    //    quote, the speaker's name linking to the source. He does NOT turn — `flip` stays as
    //    cast, so he is never spun round to face away from the note card he's sitting on.
    //    Without a quote: hover → the plain hello readers have always given; click → an
    //    apologetic seated shrug. (With 7 quotes and at most ~5 readers per load, nothing
    //    reaches that branch in production; it exists for a trimmed pool.) ──
    var QUOTE_TRANS = 0.5, QUOTE_SHRUG = 2.6, QUOTE_GLANCE = 0.35;

    // hover: same reading hold, head raised off the page
    function quoteGlance(t) {
      var p = A.read.frame(t);
      var br = Math.sin(t * 0.28 * Math.PI * 2);
      p.hunch = -(14 + br * 2);              // partly uncurled, still leaning in
      p.headTilt = 6 + Math.sin(t * 0.4 * Math.PI * 2) * 3;
      return p;
    }
    // settled: sat up, book down in the lap, looking up and out
    function quoteHold(t) {
      var p = Object.assign({}, R.REST);
      var br = Math.sin(t * 0.26 * Math.PI * 2);
      p.lean = 2;
      p.hunch = -(4 + br * 2);
      p.bob = br * 1.2;
      p.headTilt = 9 + Math.sin(t * 0.32 * Math.PI * 2) * 3;
      // 0deg points straight DOWN, 90 is horizontal: so the upper arms hang low and the
      // forearms come forward, putting the hands over his thighs. The book draws at the
      // hand midpoint, so that is what drops it into his lap.
      p.armRU = 30 + br;  p.armRF = 88 + br * 3;
      p.armLU = 22 - br;  p.armLF = 80 + br * 2;
      p.legRU = 78; p.legRF = 11;
      p.legLU = 70; p.legLF = 5;
      return p;
    }
    // "sorry, nothing here" — shrug arms and head grafted onto the seated legs
    function quoteShrugSeat(t) {
      var p = Object.assign({}, R.REST);
      var c = ((t % 3.5) + 3.5) % 3.5;
      var sh = Math.min(1, Math.max(0, c / 0.5)) * Math.min(1, Math.max(0, (2.2 - c) / 0.6));
      p.lean = 2;
      p.bob = 1 - sh * 3;
      p.hunch = -6 - sh * 4;
      p.headTilt = 4 + Math.sin(t * 0.2 * Math.PI * 2) * 4 + sh * 12;
      p.armRU = 40 + sh * 34;  p.armRF = 36 + sh * 120;
      p.armLU = -18 - sh * 30; p.armLF = -14 - sh * 120;
      p.legRU = 78; p.legRF = 10;
      p.legLU = 70; p.legLF = 4;
      return p;
    }

    function drawReader(e, ctx, w, h, tt, col, dt, cr) {
      if (e.qs == null) { e.qs = 'read'; e.qsT = 0; e.qGlance = 0; e.qWave = 0; e.qh = null; }
      e.qsT += dt;
      var seatY = h - 42, flip = e.spec.x > 0.5;
      var pose, book = true, u;

      // same hover box the generic hover-greet uses, so the feel matches the rest of the cast
      var hovering = mx > -9000 && Math.abs(mx - (cr.left + w / 2)) < 36 &&
                     my > cr.top + h - 92 && my < cr.top + h + 6;

      if (e.qs === 'read') {
        if (e.spec.quote) {
          e.qWave = 0;
          e.qGlance += (hovering ? dt : -dt) / QUOTE_GLANCE;
          if (e.qGlance < 0) e.qGlance = 0;
          if (e.qGlance > 1) e.qGlance = 1;
          pose = e.qGlance > 0
            ? lerpPose(A.read.frame(tt), quoteGlance(tt), smooth01(e.qGlance))
            : A.read.frame(tt);
        } else if (hovering || e.qWave > 0) {
          // nothing to say: the plain seated hello, book down while he waves
          e.qWave += dt;
          if (!hovering && e.qWave > 2.2) e.qWave = 0;
          if (e.qWave > 0) { pose = A.greetseat.frame(e.qWave, e._wave); book = false; }
          else { pose = A.read.frame(tt); }
        } else {
          pose = A.read.frame(tt);
        }
      } else if (e.qs === 'lookup') {
        u = smooth01(Math.min(1, e.qsT / QUOTE_TRANS));
        pose = lerpPose(A.read.frame(tt), quoteHold(tt), u);
        if (e.qsT >= QUOTE_TRANS) {
          e.qs = 'hold'; e.qsT = 0;
          var sx = window.scrollX || window.pageXOffset || 0;
          var sy = window.scrollY || window.pageYOffset || 0;
          // head top in DOCUMENT coords: 128px of body plus the head radius, at scale S
          e.qh = window.EVQuotes.open({
            headX: cr.left + sx + w / 2,
            headY: cr.top + sy + (h - 42) - (128 + CFG.R) * S,
            tone: col,
            quote: e.spec.quote
          });
        }
      } else if (e.qs === 'hold') {
        pose = quoteHold(tt);
        if (e.qh) e.qh.setHeld(hovering);   // hovering HIM pauses his bubble's timer too
      } else if (e.qs === 'resume') {
        u = smooth01(Math.min(1, e.qsT / QUOTE_TRANS));
        pose = lerpPose(quoteHold(tt), A.read.frame(tt), u);
        if (e.qsT >= QUOTE_TRANS) { e.qs = 'read'; e.qsT = 0; e.qGlance = 0; }
      } else {                              // 'shrug'
        pose = quoteShrugSeat(e.qsT);
        book = false;
        if (e.qsT >= QUOTE_SHRUG) { e.qs = 'read'; e.qsT = 0; }
      }

      drawFig(ctx, w / 2, seatY, S, flip, pose, { color: col, book: book && !e.propGone });
      e._qSX = cr.left + w / 2; e._qFY = cr.top + h;   // click hitbox anchor (screen coords)
    }

    // ── BALANCER (a stand Bobit balancing on one foot): teeters on his right foot, flinging an arm
    //    up to steady himself. Hover him → he waves back one-handed (still on one foot), windmills
    //    both arms once, loses it and collapses, then climbs back up and rebalances. Every pose is
    //    reached by easing the displayed pose toward the target, so nothing snaps or teleports. ──
    function balanceIdle(t) {
      var p = Object.assign({}, R.REST);
      var teeter = Math.sin(t * 1.05);
      p.lean = 2 + teeter * 5;                                  // sways side to side
      p.bob = Math.sin(t * 0.5) * 1.5;
      p.headTilt = -teeter * 4;
      p.armRU = 30 + Math.max(0, teeter) * 80;                  // fling the arm up on whichever side he tips toward
      p.armRF = 18 + Math.max(0, teeter) * 30;
      p.armLU = -30 - Math.max(0, -teeter) * 80;
      p.armLF = -18 - Math.max(0, -teeter) * 30;
      p.legRU = 6; p.legRF = 2;                                 // right leg planted straight down
      p.legLU = 40 + Math.sin(t * 0.9) * 4; p.legLF = -66;      // left leg lifted, shin tucked
      return p;
    }
    function balanceWave(t) {
      var p = balanceIdle(t);
      p.armRU = 150; p.armRF = 150 + Math.sin(t * 10) * 24;     // right hand waving hello
      p.armLU = -78; p.armLF = -42;                             // left arm flung wide to stay up
      p.headTilt = -14;
      p.lean = 5 + Math.sin(t * 1.4) * 4;                       // wobblier — waving on one foot is hard
      return p;
    }
    function balanceWindmill(t, u) {
      var p = balanceIdle(t);
      var ang = u * 360;                                        // exactly one revolution, continuing from the wave
      p.armRU = 150 + ang; p.armRF = 8;                         // straight arms sweeping all the way around
      p.armLU = -78 - ang; p.armLF = -8;
      p.lean = Math.sin(u * Math.PI * 2) * 9;                   // reeling
      p.headTilt = -6;
      p.legLU = 42; p.legLF = -62;
      return p;
    }
    function balanceCollapse(t) {
      var p = Object.assign({}, R.REST);
      var br = Math.sin(t * 2) * 1.2;
      p.lean = 10; p.hunch = -42; p.headTilt = -20 + br;        // crumpled forward heap
      p.bob = 6;
      p.armRU = 44; p.armRF = 24; p.armLU = -44; p.armLF = -24; // arms sprawled
      p.legRU = 96; p.legRF = -92; p.legLU = 80; p.legLF = -84; // both knees folded under him
      return p;
    }
    function drawBalancer(e, ctx, w, h, feetY, tt, col, shadow, dt) {
      var oyS = feetY - 112 * S, groundY = feetY - 14;          // pelvis: standing height vs. crumpled on the ground
      var cr = e.c.getBoundingClientRect();
      var hovering = Math.abs(mx - (cr.left + w / 2)) < 40 && my > cr.top + h - 96 && my < cr.top + h + 6;
      if (e.balPh == null) { e.balPh = 'idle'; e.balT = 0; e.balPose = balanceIdle(tt); e.balY = oyS; }
      // edge-triggered: only kick off the routine from a settled idle, once per hover-in
      if (hovering && !e._balHov && e.balPh === 'idle') { e.balPh = 'wave'; e.balT = 0; }
      e._balHov = hovering;
      e.balT += dt;
      var target, targetY = oyS, D;
      switch (e.balPh) {
        case 'wave':     D = 1.5; target = balanceWave(tt); if (e.balT >= D) { e.balPh = 'windmill'; e.balT = 0; } break;
        case 'windmill': D = 1.0; target = balanceWindmill(tt, Math.min(1, e.balT / D)); if (e.balT >= D) { e.balPh = 'collapse'; e.balT = 0; } break;
        case 'collapse': D = 0.55; target = balanceCollapse(tt); targetY = groundY; if (e.balT >= D) { e.balPh = 'down'; e.balT = 0; } break;
        case 'down':     D = 0.5; target = balanceCollapse(tt); targetY = groundY; if (e.balT >= D) { e.balPh = 'standup'; e.balT = 0; } break;
        case 'standup':  D = 0.75; target = balanceIdle(tt); if (e.balT >= D) { e.balPh = 'idle'; e.balT = 0; } break;
        default:         target = balanceIdle(tt);
      }
      // ease the DISPLAYED pose toward the target every frame → seamless flow between every phase
      var k = Math.min(1, dt * 13);
      for (var i = 0; i < POSE_KEYS.length; i++) { var key = POSE_KEYS[i]; var cur = e.balPose[key] || 0; e.balPose[key] = cur + ((target[key] || 0) - cur) * k; }
      e.balY += (targetY - e.balY) * Math.min(1, dt * 10);
      R.drawShadow(ctx, w / 2, feetY, 16, shadow);
      drawFig(ctx, w / 2, e.balY, S, false, e.balPose, { color: col });
    }

    // ── LETTER CARRIERS: two Bobits haul pieces of the logo across a strip. One struggles with the
    //    upside-down teal 'e' (from "empowered"); the other holds the upside-down coral 'v' (from
    //    ".vote") over his head. Click the v-carrier → the v drops down over his eyes and he wanders
    //    blindly, hands out, until he lifts it back up and walks on. Click the e-carrier → he sets the
    //    e down in front of you, waves once, then rolls it off (it bumps along, not being round). ──
    function drawLetterE(ctx, cx, cy, R, color, rot) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot || 0);
      ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.arc(0, 0, R, 0.30 * Math.PI, 2 * Math.PI, false); ctx.stroke();  // bowl with a mouth gap at lower-right
      ctx.beginPath(); ctx.moveTo(-R + 1, 0); ctx.lineTo(R - 3, 0); ctx.stroke();           // crossbar
      ctx.restore();
    }
    // the exact lowercase 'v' from the empowered.vote wordmark (coral glyph path from EVLogo.svg),
    // so the carried letter reads as the real logo 'v'. Native bbox ~x[242.3,281.9] y[75.2,110.0].
    var V_PATH = new Path2D('M262.892 98.8742H262.764L253.945 75.2178H242.326L256.745 110.043H268.139L281.882 75.2178H271.067L262.892 98.8742Z');
    var V_CX = 262.104, V_CY = 92.63, V_W = 39.556, V_H = 34.825;
    function drawLetterV(ctx, cx, cy, halfW, height, color, rot) {
      var s = Math.min((halfW * 2) / V_W, height / V_H);   // fit the box, keep the glyph's real proportions
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rot || 0) + Math.PI);                    // turned upside-down (logo 'v' → apex up)
      ctx.scale(s, s);
      ctx.translate(-V_CX, -V_CY);
      ctx.fillStyle = color;
      ctx.fill(V_PATH);
      ctx.restore();
    }
    function letterCarryE(t) {                          // struggling: hunched, both hands gripping the e in front
      var p = A.stroll.frame(t);
      p.hunch = -16; p.lean = -3; p.headTilt = 3;
      p.bob = (p.bob || 0) + Math.sin(t * 3) * 1;       // labored little stagger
      p.armRU = 58; p.armRF = 60; p.armLU = -58; p.armLF = -60;
      return p;
    }
    function letterSetDownE(t, u) {                     // crouch to set the e on the ground
      var p = A.stroll.frame(0);
      p.hunch = -20 * u; p.bob = 14 * u; p.headTilt = -14 * u;
      p.armRU = 58 + 34 * u; p.armRF = 60 + 22 * u; p.armLU = -58 - 34 * u; p.armLF = -60 - 22 * u;
      p.legRF = 4 - 12 * u; p.legLF = -4 - 12 * u;
      return p;
    }
    function letterOverheadV(t) {                       // both arms straight up, holding the v aloft
      var p = A.stroll.frame(t);
      p.hunch = 0; p.lean = 0; p.headTilt = 0;
      p.armRU = 148; p.armRF = 150; p.armLU = -148; p.armLF = -150;
      return p;
    }
    function letterBlindV(t) {                          // can't see: arms groping out front, uncertain steps
      var p = A.shuffle.frame(t);
      p.armRU = 86; p.armRF = 80; p.armLU = -86; p.armLF = -80;
      p.headTilt = 8; p.hunch = -4;
      return p;
    }
    function letterKickE(t) {                            // boots the stalled 'e' onward
      var p = A.stroll.frame(t);
      p.legRU = 52; p.legRF = 6;                         // front leg swings out into the kick
      p.legLU = -8; p.legLF = -4;
      p.lean = -7; p.hunch = -6;
      p.armRU = 44; p.armLU = -34;
      return p;
    }
    // one letter-carrying pass in the beam crew's rotation: set up two solo carriers entering from `dir`
    function startLetters(e, w, dir) {
      e.scene = 'letters'; e.dir = dir;
      var sX = dir > 0 ? -80 : w + 80;
      e.vX = sX + dir * 130; e.eX = sX;                 // v-carrier leads, e-carrier trails
      e.vSt = 'walk'; e.vT = 0; e.vDrop = 0; e.vAnchor = 0;
      e.eSt = 'walk'; e.eT = 0; e.eRoll = 0; e.eLX = 0;
    }
    function runLetters(e, ctx, w, h, feetY, tt, shadow, dt, cr) {
      var SP = 34, letterR = 15, groundLY = feetY - 13, oy = feetY - 112 * S;
      var colE = figColor(0), colV = figColor(1);       // teal 'e', coral 'v' — both theme-adaptive
      var flip = e.dir < 0;
      var off = function (x) { return e.dir > 0 ? x > w + 90 : x < -90; };

      // ── V-carrier ──
      switch (e.vSt) {
        case 'walk': e.vX += e.dir * SP * dt; break;
        case 'fall': e.vT += dt; e.vDrop = Math.min(1, e.vT / 0.5); if (e.vT >= 0.6) { e.vSt = 'blind'; e.vT = 0; e.vAnchor = e.vX; } break;
        case 'blind': e.vT += dt; e.vX = e.vAnchor + Math.sin(e.vT * 1.5) * 26; if (e.vT >= 3.6) { e.vSt = 'lift'; e.vT = 0; } break;
        case 'lift': e.vT += dt; e.vDrop = Math.max(0, 1 - e.vT / 0.6); if (e.vT >= 0.7) { e.vSt = 'walk'; e.vT = 0; e.vDrop = 0; } break;
      }
      var vPose = (e.vSt === 'blind') ? letterBlindV(tt) : letterOverheadV(tt);
      var vj = R.computePose(vPose, CFG, { x: 0, y: 0 });
      var sgn = flip ? -1 : 1;
      var vHandX = e.vX + ((vj.hR.x + vj.hL.x) / 2) * S * sgn, vHandY = oy + ((vj.hR.y + vj.hL.y) / 2) * S;
      var vHeadX = e.vX + vj.H.x * S * sgn, vHeadY = oy + vj.H.y * S;
      var vLX = vHandX + (vHeadX - vHandX) * e.vDrop;
      var vLY = (vHandY - 6) + ((vHeadY + 2) - (vHandY - 6)) * e.vDrop;   // slides from aloft down over the eyes
      R.drawShadow(ctx, e.vX, feetY, 14, shadow);
      drawFig(ctx, e.vX, oy, S, flip, vPose, { color: figColor(2) });     // yellow/gold guy carrying the v
      if (!e.propGone) drawLetterV(ctx, vLX, vLY, 16, 30, colV, 0);

      // ── E-carrier ──
      switch (e.eSt) {
        case 'walk': e.eX += e.dir * SP * dt; break;
        case 'drop': e.eT += dt; if (e.eT >= 0.55) { e.eSt = 'wave'; e.eT = 0; } break;
        case 'wave': e.eT += dt; if (e.eT >= 1.3) { e.eSt = 'roll'; e.eT = 0; e.eRoll = 0; e.eLX = e.eX + e.dir * 28; e.eLV = 135; e.eKickHitch = 0; } break;   // give it a first shove
        case 'roll': {
          e.eT += dt;
          var FR = 95;                                   // friction: the 'e' coasts a cycle or two, then stalls
          e.eLV = Math.max(0, (e.eLV || 0) - FR * dt);
          e.eLX += e.dir * e.eLV * dt;
          e.eRoll += e.dir * (e.eLV / letterR) * dt;     // spin tracks roll → it stops turning when it stops
          if (e.eKickHitch > 0) { e.eKickHitch -= dt; }  // brief pause on the kick itself
          else { e.eX += e.dir * 52 * dt; }              // otherwise he keeps walking after it
          var behind = e.dir > 0 ? (e.eLX - e.eX) : (e.eX - e.eLX);
          if (behind < 22) e.eX = e.eLX - e.dir * 22;    // don't overtake the 'e'
          if (behind < 26 && e.eLV < 24) { e.eLV = 145; e.eKickHitch = 0.2; }   // caught the stalled 'e' → boot it on
          break;
        }
      }
      var ePose, eFlip = flip;
      if (e.eSt === 'walk') ePose = letterCarryE(tt);
      else if (e.eSt === 'drop') { ePose = letterSetDownE(tt, Math.min(1, e.eT / 0.55)); eFlip = false; }
      else if (e.eSt === 'wave') { ePose = A.greet.frame(e.eT, { hand: 'R', hz: 1.6 }); eFlip = false; }
      else ePose = (e.eKickHitch > 0) ? letterKickE(tt) : A.stroll.frame(tt);   // roll: kick hitch, else walking
      var ej = R.computePose(ePose, CFG, { x: 0, y: 0 });
      var esgn = eFlip ? -1 : 1;
      var eHandX = e.eX + ((ej.hR.x + ej.hL.x) / 2) * S * esgn, eHandY = oy + ((ej.hR.y + ej.hL.y) / 2) * S;
      var eLX, eLY, eRot = Math.PI;                       // carried & rolled upside-down
      if (e.eSt === 'walk') { eLX = eHandX; eLY = eHandY; }
      else if (e.eSt === 'drop') { var u = Math.min(1, e.eT / 0.55); eLX = e.eX + e.dir * 26; eLY = eHandY + (groundLY - eHandY) * u; }
      else if (e.eSt === 'wave') { eLX = e.eX + e.dir * 26; eLY = groundLY; }
      else { eLX = e.eLX; eLY = groundLY - Math.abs(Math.sin(e.eRoll * 1.5)) * 3 * Math.min(1, (e.eLV || 0) / 40); eRot = Math.PI + e.eRoll; }  // non-round → little bump while moving, flat when stopped
      R.drawShadow(ctx, e.eX, feetY, 14, shadow);
      if (e.eSt !== 'walk') R.drawShadow(ctx, eLX, feetY, 12, shadow);
      e._bodies = [{ x: e.vX, floor: feetY }, { x: e.eX, floor: feetY }];
      drawFig(ctx, e.eX, oy, S, eFlip, ePose, { color: figColor(5) });    // orange guy carrying the e
      if (!e.propGone) drawLetterE(ctx, eLX, eLY, letterR, colE, eRot);

      // click hitboxes (screen coords)
      e._vSX = cr.left + e.vX; e._eSX = cr.left + e.eX; e._lFY = cr.top + feetY;

      // once BOTH have finished their business and walked off, hand back to the two-carry rotation
      var vGone = e.vSt === 'walk' && off(e.vX);
      var eGone = (e.eSt === 'walk' && off(e.eX)) || (e.eSt === 'roll' && off(e.eX) && off(e.eLX));
      if (vGone && eGone) beamPick(e, w);                // hand back; next pass is anything but the letters again
    }
    // at each off-screen turn the crew picks its next pass: the light gag, a letter-carry, or another load
    // pick the crew's next pass. ALTERNATE carry <-> special every pass so the light gag and the
    // letter carriers show up regularly (turns are ~30-50s apart, so a random pick made specials feel
    // like they never happened). Loads (circle/line) and specials (light/letters) each alternate too,
    // so no action ever repeats back-to-back.
    function beamPick(e, w) {
      var lastWasSpecial = (e.lastAction === 'light' || e.lastAction === 'letters');
      // after a special always carry; after a carry usually go special, but ~30% of the time run ONE
      // more carry (the other load) — capped at 2 carries in a row so specials still come around often.
      var goCarry = lastWasSpecial || ((e.carryRun || 0) < 2 && chance(0.3));
      var a;
      if (goCarry) {
        a = (e.lastLoad === 'circle') ? 'line' : 'circle';       // the other load (never repeats)
        e.lastLoad = a; e.carryRun = lastWasSpecial ? 1 : (e.carryRun || 0) + 1;
        e.scene = 'carry'; e.load = a; e.dwell = 1.1; e.bx = e.dir > 0 ? -110 : w + 110;
      } else {
        a = (e.lastSpecial === 'light') ? 'letters' : 'light';   // the other special
        e.lastSpecial = a; e.carryRun = 0;
        if (a === 'light') startLight(e, w); else startLetters(e, w, e.dir);
      }
      e.lastAction = a;
    }

    // ── LEDGE PEEKER: stands straight on the card edge; when something passes (or crashes) below him
    //    he leans out, watches curiously for a beat, shrugs, and stands back up. All eased, no snap. ──
    function peekLook(t) {
      var p = Object.assign({}, R.REST);
      p.hunch = -32;                             // cranes forward over the edge
      p.headTilt = -22 + Math.sin(t * 3) * 4;    // peering down, curious little wobble
      p.bob = 1 + Math.sin(t * 2) * 1;
      p.armRU = -26; p.armRF = -20;              // arms trail back to counterbalance the lean
      p.armLU = -34; p.armLF = -26;
      p.legRU = 12; p.legRF = 6; p.legLU = -14; p.legLF = -6;   // front foot toes the edge
      return p;
    }
    function drawPeeker(e, ctx, w, h, feetY, tt, col, shadow, dt, cr) {
      var oy = feetY - 112 * S, flip = e.spec.x > 0.5;
      var pkX = cr.left + w / 2, pkFeetY = cr.top + feetY;
      if (e.pkSt == null) { e.pkSt = 'stand'; e.pkT = 0; e.pkCool = 0; e.pkPose = A.standstill.frame(tt); }
      e.pkT += dt; if (e.pkCool > 0) e.pkCool -= dt;
      // activity below & near: a fresh beacon under his ledge, or the cursor passing in the band below him
      var trig = false;
      for (var i = 0; i < lookBeacons.length; i++) {
        var b = lookBeacons[i];
        var below = b.y > pkFeetY + 4;
        if (b.kind === 'commotion' || b.kind === 'collapse') { if (below) trig = true; }   // a crash/commotion below — he always hears it and looks
        else if (below && Math.abs(b.x - pkX) < 140) trig = true;                          // a walker passing under his ledge (any depth below)
      }
      if (!trig && mx > -9000 && Math.abs(mx - pkX) < 120 && my > pkFeetY + 4 && my < pkFeetY + 320) trig = true;
      if (e.pkSt === 'stand' && e.pkCool <= 0 && trig) { e.pkSt = 'look'; e.pkT = 0; }
      var target;
      if (e.pkSt === 'look') { target = peekLook(tt); if (e.pkT > (trig ? 3.0 : 1.5)) { e.pkSt = 'shrug'; e.pkT = 0; } }   // keep watching while it lasts, else hold a beat
      else if (e.pkSt === 'shrug') { target = A.shrug.frame(e.pkT); if (e.pkT > 1.5) { e.pkSt = 'stand'; e.pkT = 0; e.pkCool = 1.5; } }
      else target = A.standstill.frame(tt);
      var k = Math.min(1, dt * 12);              // ease displayed pose toward target → smooth look-down & return
      for (var j = 0; j < POSE_KEYS.length; j++) { var key = POSE_KEYS[j]; var cur = e.pkPose[key] || 0; e.pkPose[key] = cur + ((target[key] || 0) - cur) * k; }
      R.drawShadow(ctx, w / 2, feetY, 16, shadow);
      drawFig(ctx, w / 2, oy, S, flip, e.pkPose, { color: col });
    }

    // ── "activity below" beacons: movers/collapsers publish their screen-space foot position so the
    //    ledge-peeker can notice someone passing under him (or crashing down below) and look over. ──
    var lookBeacons = [];
    function pushBeacon(x, y, kind) { lookBeacons.push({ x: x, y: y, t: t, kind: kind }); }

    var t = 0, last = performance.now();
    var inkCache = '#1C1C1C', inkTick = 1;

    function tick() {
      var now = performance.now();
      var dtFrame = Math.min(0.1, (now - last) / 1000); last = now;
      poofTick(dtFrame);
      t += dtFrame;
      if ((inkTick += dtFrame) > 0.5) { inkTick = 0; inkCache = cssVar('--heading', '#1C1C1C'); }
      var ink = inkCache;
      var shadow = 'rgba(127,127,127,0.18)';
      lookBeacons = lookBeacons.filter(function (b) { return t - b.t < 0.5; });   // keep only fresh activity

      // ── footer meet-and-greet: a call-and-response, not a synchronized wave ──
      // Stage 1: the stander spots the walker coming and waves FIRST (walker still moving).
      // Stage 2: the walker arrives, stops, and returns the wave ~0.9s later (overlaps, not in sync).
      if (footWalk && footWalk.w && footStand && footStand.w) {
        footWalk._cool = Math.max(0, (footWalk._cool || 0) - dtFrame);
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
        if (e.gone) return;
        // Stunned: this figure's dt is zero. One local, and both layers freeze — the gait clock
        // (via e.lt) and every scene machine, which all advance straight off dt: e.dfT, e.cwT,
        // e.ktT, e.qsT. Extending the existing `e.lt += dt * (...)` gate would freeze only the
        // gaits and leave the dog still fetching while everyone else stood still.
        // Deliberate: this is computed BEFORE the `why` branch, so the three `why` content
        // figures freeze for the 1s stun too, even though they are excluded from the gag
        // otherwise. The whole room going still for a beat reads better than content figures
        // bobbing on while every inhabitant is rooted to the spot. They resume afterwards.
        var dt = (POOF.phase === 'stunned') ? 0 : dtFrame;
        if (e.fl && spec.mode !== 'why') {
          ctx.clearRect(0, 0, w, h);
          drawFlee(e, ctx, w, figColor(spec.tone != null ? spec.tone : e.ci), dt);
          return;
        }
        // Being abducted takes the draw over completely, which is also why no mode has to learn to
        // stop drawing its own prop — his mode simply is not running. Uses dtFrame, not dt: he is the
        // one figure who must keep moving through the stun, and in any case the stun only starts after
        // he is gone.
        if (e.ab && spec.mode !== 'why') {
          ctx.clearRect(0, 0, w, h);
          drawAbduct(e, ctx, w, figColor(spec.tone != null ? spec.tone : e.ci), dtFrame);
          return;
        }
        if (!w) return;
        // skip offscreen canvases
        var cr = e.c.getBoundingClientRect();
        if (cr.bottom < -40 || cr.top > window.innerHeight + 40) return;
        ctx.clearRect(0, 0, w, h);
        var feetY = h - 6;
        var col = figColor(spec.tone != null ? spec.tone : e.ci);
        // 'read' seats are excluded: drawReader owns reader hover (the glance when he has a
        // quote, the wave when he hasn't), so e.greet must never be set for one
        var hoverable = (spec.mode === 'stand' && !spec.balance && !spec.peeker) || spec.mode === 'patrol' || (spec.mode === 'seat' && !spec.phone && spec.anim !== 'read');
        // per-entry clock freezes while greeting, so patrols resume where they stopped
        if (e.greet) e.greet += dt;
        if (e._fall > 0) e._fall = Math.max(0, e._fall - dt);
        e.lt += dt * ((e.greet || e._fall > 0) ? 0 : 1);
        var tt = e.lt + e.phase;
        // current figure x within the canvas
        var figX = w / 2;
        if (spec.mode === 'paddlepair') {
          drawPaddlePair(e, ctx, w, h, feetY, tt, figColor(spec.tone), figColor(spec.tone2 != null ? spec.tone2 : spec.tone), shadow, dt, cr);
          return;
        }
        if (spec.mode === 'cartwheel') {
          drawCartwheel(e, ctx, w, h, feetY, tt, figColor(spec.tone), figColor(spec.tone2 != null ? spec.tone2 : spec.tone), shadow, dt, cr);
          return;
        }
        if (spec.mode === 'dogfetch') {
          drawDogFetch(e, ctx, w, h, feetY, tt, figColor(spec.tone), figColor(spec.tone2 != null ? spec.tone2 : 5), shadow, dt, cr);
          return;
        }
        if (spec.mode === 'kite') {
          drawKite(e, ctx, w, h, feetY, tt, figColor(spec.tone), figColor(spec.tone2 != null ? spec.tone2 : (spec.tone + 2) % 6), shadow, dt, cr);
          return;
        }
        if (spec.mode === 'yoyo') {
          drawYoyo(e, ctx, w, h, feetY, tt, figColor(spec.tone), figColor(spec.tone2 != null ? spec.tone2 : (spec.tone + 2) % 6), shadow, dt, cr);
          return;
        }
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
          if (spec.balance) { drawBalancer(e, ctx, w, h, feetY, tt, col, shadow, dt); return; }
          if (spec.peeker) { drawPeeker(e, ctx, w, h, feetY, tt, col, shadow, dt, cr); return; }
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
          drawFig(ctx, w / 2, oyS, S, flipSt, animSt.frame(ptSt, e._wave), { color: col, paddle: animSt.paddle && !e.propGone, time: tt });
          return;
        }
        if (spec.mode === 'seat') {
          if (spec.phone) { drawPhoneSeat(e, ctx, w, h, tt, col, dt); return; }
          if (spec.anim === 'read') { drawReader(e, ctx, w, h, tt, col, dt, cr); return; }
          var animSe = e.greet ? A.greetseat : A[spec.anim];
          var ptSe = e.greet ? e.greet : tt;
          var seatY = h - 42;   // matches the seat line set in reposition(); leaves room for dangling legs
          drawFig(ctx, w / 2, seatY, S, spec.x > 0.5, animSe.frame(ptSe, e._wave), { color: col, book: (!e.greet && spec.anim === 'read' && !e.propGone) });
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
            e._bodies = [{ x: figX, floor: feetY }, { x: toddX, floor: feetY, small: true }];
            e._toddSX = cr.left + toddX; e._toddSY = cr.top + feetY - 26;   // for click hit-testing
            pushBeacon(cr.left + toddX, cr.top + feetY, e._fall > 0 ? 'collapse' : 'walk');   // toddler toddling/tumbling below
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
          pushBeacon(cr.left + parentX, cr.top + feetY, 'walk');   // a walker passing below the peeker
          return;
        }
        if (spec.mode === 'beam') {
          // The crew hauls a load ALL the way off one edge, dwells off-screen,
          // then walks back carrying the other load (red ball ↔ yellow line).
          // Start load is randomized so the line shows up right away ~half the time
          // (otherwise you'd wait a full ~28s off-screen traverse to see it swap).
          var speedB = 30, halfGap = 24, endMargin = 110;
          if (e.bx == null) { e.bx = w * 0.5; e.dir = 1; e.load = pick(BEAM_LOADS); e.lastLoad = e.load; e.lastAction = e.load; e.lastSpecial = pick(['light', 'letters']); e.carryRun = 1; e.dwell = 0; e.scene = 'carry'; }   // open mid-screen with a carry; a special follows soon
          // some passes run a solo gag instead of the two-carry: the "light went out" fix, or the letter carriers
          if (e.scene === 'light') { runLightGag(e, ctx, w, h, feetY, tt, col, shadow, cr, dt); return; }
          if (e.scene === 'letters') { runLetters(e, ctx, w, h, feetY, tt, shadow, dt, cr); return; }
          var fx = e.bx + e.dir * halfGap;      // front (leading) carrier
          var bx2 = e.bx - e.dir * halfGap;     // back carrier
          // hover: a carrier drops his end (line only) and waves; partner holds, annoyed
          var nearF = Math.abs(mx - (cr.left + fx)) < 36;
          var nearB = Math.abs(mx - (cr.left + bx2)) < 36;
          var inY = my > cr.top + h - 92 && my < cr.top + h + 6;
          // ── ball gag: hovering while carrying the CIRCLE drops it on the front guy's foot ──
          if (e.load === 'circle' && (nearF || nearB) && inY && !e.gagOn) { e.gagOn = true; e.gagT = 0; e.gF = fx; e.gB = bx2; e.gdir = e.dir; e.gBackChase = -1; }
          if (e.gagOn) {
            e.gagT += dt; var gt = e.gagT, gdir = e.gdir, ballR = 16;
            var carryYg = feetY - 97 * S, footYg = feetY - 6;
            var LAND = 0.5, CHASE_F = 3.4;
            var edgeX = gdir > 0 ? -70 : w + 70;   // trailing edge the ball rolls toward
            var ballX, ballY;
            if (gt < LAND) { ballX = e.gF; ballY = carryYg + (footYg - ballR - carryYg) * smooth01(gt / LAND); }   // drops onto his foot
            else { var rt = gt - LAND; ballX = e.gF - gdir * (130 * rt + 24 * rt * rt); ballY = footYg - ballR; }   // then rolls FAST — off the edge before anyone gives chase
            // the unhurt (back) guy holds off until the ball is ~halfway between him and the edge, so it can roll longer
            var halfway = (e.gB + edgeX) / 2;
            if (e.gBackChase < 0 && ((gdir > 0 && ballX <= halfway) || (gdir < 0 && ballX >= halfway))) e.gBackChase = gt;
            // front guy: carries as it falls → hops clutching his foot → head comes UP to watch it
            // get away → turns and eases into the chase (pose blended, no hard pop)
            var frontX = e.gF, frontPose, frontFlip = gdir < 0;
            if (gt < LAND) frontPose = A.carry.frame(tt);
            else {
              var pain = A.painhop.frame(gt - LAND);
              var lookUp = smooth01((gt - 1.7) / 0.9);              // gaze lifts from the foot (1.7s) to fully up (2.6s)
              pain.headTilt = -22 + lookUp * 40;                    // -22 (down at the foot) → +18 (up, after the ball)
              frontFlip = lookUp < 0.5 ? (gdir < 0) : (gdir > 0);   // turns around to face it as he looks up
              if (gt < CHASE_F) {
                frontPose = pain;
              } else {
                var ct = gt - CHASE_F;
                var k = smooth01(ct / 0.6);                         // ease the pain stance into the run over 0.6s
                frontX = e.gF - gdir * (52 * ct + 24 * ct * ct) * smooth01(ct / 0.5);   // ramp speed up from a standstill
                frontPose = lerpPose(pain, A.scurry.frame(gt), k);
                frontFlip = gdir > 0;
                // limp for the first several steps: heavily favor the yanked (right) foot — a stiff
                // knee, a short hobbling step, and a big downward lurch each time it bears weight
                var limp = Math.max(0, 1 - ct / 2.4);
                if (limp > 0) {
                  var plant = Math.max(0, -Math.sin(gt * 4.6 * Math.PI));   // injured (right) foot bearing weight
                  frontPose.legRF += limp * 42;                            // very stiff injured knee (barely bends)
                  frontPose.legRU -= limp * 12;                            // short, hobbling step
                  frontPose.bob += limp * plant * 12;                      // big downward lurch onto it
                  frontPose.lean += limp * plant * 6;                      // pitches forward as he favors it
                  frontPose.headTilt += limp * (5 + plant * 9);            // head dips with each hobble
                }
              }
            }
            // back guy: keeps carrying, then TORN (looks friend<->ball), then chases once the ball is halfway to the edge
            var backX = e.gB, backPose, backFlip = gdir < 0;
            if (gt < LAND) backPose = A.carry.frame(tt + 0.16);
            else if (e.gBackChase < 0) backPose = A.holdannoyed.frame(gt - LAND);
            else { var bt = gt - e.gBackChase; backX = e.gB - gdir * (64 * bt + 28 * bt * bt); backPose = A.scurry.frame(gt); backFlip = gdir > 0; }
            ctx.fillStyle = cssVar('--coral', '#FF5740');
            ctx.beginPath(); ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2); ctx.fill();
            R.drawShadow(ctx, frontX, feetY, 15, shadow); R.drawShadow(ctx, backX, feetY, 15, shadow);
            drawFig(ctx, frontX, feetY - 112 * S, S, frontFlip, frontPose, { color: col });
            drawFig(ctx, backX, feetY - 112 * S, S, backFlip, backPose, { color: col });
            // respawn only once BOTH carriers have run the whole way off the trailing edge (not when the ball leaves)
            var gone = function (x) { return gdir > 0 ? (x < -70) : (x > w + 70); };
            if ((gone(frontX) && gone(backX)) || gt > 16) {
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
              if (e.bx > w + endMargin) { e.dir = -1; beamPick(e, w); }
              else if (e.bx < -endMargin) { e.dir = 1; beamPick(e, w); }
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
          if (e.propGone) {
            // it is on the floor now, drawn by the overlay — the crew keeps their carry pose but the
            // load itself is gone from between them
          } else if (e.load === 'triangle') {
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
              // being picked up: front lifts first, back hitches a beat behind → the line tilts as it rises
              var peF = 1.2 - e._pickup, liftF = peF < 0.6 ? 0 : (peF - 0.6) / 0.6;
              var peB2 = Math.max(0, peF - 0.2), liftB = peB2 < 0.6 ? 0 : (peB2 - 0.6) / 0.6;
              var yLF = groundY + (carryY - groundY) * smooth01(liftF);
              var yLB = groundY + (carryY - groundY) * smooth01(liftB);
              ctx.beginPath(); ctx.moveTo(fx + e.dir * 12, yLF); ctx.lineTo(bx2 - e.dir * 12, yLB); ctx.stroke();
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
            // they crouch differently and lift out of sync: front hinges & lifts, back squats a hitch behind
            var peP = 1.2 - e._pickup;
            poseF = A.heave.frame(peP); poseB = A.heave2.frame(Math.max(0, peP - 0.2));
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
          e._bodies = [{ x: fx, floor: feetY }, { x: bx2, floor: feetY }];
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
            // starter reads as one flat bar (level with the "03 / Talks" bar) — no vertical riser on the right
            ctx.beginPath(); ctx.moveTo(pivotX, barY); ctx.lineTo(pivotX - barLen, barY); ctx.stroke();   // frame extends LEFT, flat
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

      poofDrawSmoke(dtFrame);

      // Expire any quote bubble whose 12s ran out and send that reader back to his book.
      // Driven from this loop rather than a second timer of its own. (window.EVQuotes.tick
      // is the bubble clock — not this function, which happens to share the name.)
      if (window.EVQuotes) {
        var expired = window.EVQuotes.tick(dtFrame);
        if (expired.length) {
          entries.forEach(function (e) {
            if (e.qh && expired.indexOf(e.qh) >= 0) { e.qh = null; e.qs = 'resume'; e.qsT = 0; }
          });
        }
      }
    }

    reposition();
    setInterval(tick, 1000 / 50);
    setInterval(reposition, 700);
    window.addEventListener('resize', reposition);

    // opt-in debug handle (no effect unless the page is loaded with #figdebug)
    if (location.hash === '#figdebug') window.__evFigDebug = {
      entries: entries, footWalk: footWalk, footStand: footStand,
      quoteGlance: quoteGlance, quoteHold: quoteHold, quoteShrugSeat: quoteShrugSeat,
      poof: POOF, bobitAt: bobitAt, poofOverlay: poofOverlay,
      sectionBreakLines: sectionBreakLines, fleeAirborne: fleeAirborne, dropSecs: dropSecs,
      drops: function () { return DROPS; }, propOf: propOf, __gp: drawGroundProp,
      fleeConst: { FIT_SCREENS: FIT_SCREENS, GONE_BELOW_FOLD: GONE_BELOW_FOLD, FALL_G: FALL_G, FLEE_DROP: FLEE_DROP }
    };
  });
})();
