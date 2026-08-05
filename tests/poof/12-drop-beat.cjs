// Pass 2 of the abduction: the victim goes, the room freezes, and everything anybody was holding hits
// the floor. Heavy things land on their owner's foot, and he limps off hysterically instead of running.
//
// The figures are pinned at dt = 0 through the stun, so the falling props are the only thing moving in
// it — that stillness is the gag, and it is also why the props live on the smoke overlay rather than on
// their owners' canvases (most mode branches return early, and a fleeing canvas is cleared, resized and
// repositioned out from under anything drawn on it).
//
// Asserts pixels as well as state: "propGone is set" and "a DROPS entry exists" would both be true of a
// prop that is drawn nowhere at all, which is precisely the bug worth catching here.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const RELOADS = 12;
const HEAVY = ['ball', 'beamload', 'letter'];

async function run(browser, scrollTo) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  await page.waitForFunction(() => !!window.__evFigDebug);
  await page.waitForTimeout(1200);
  await page.evaluate(y => window.scrollTo(0, y), scrollTo);
  await page.waitForTimeout(500);

  // Who is holding what BEFORE anything happens, so the drop can be checked against it.
  const held = await page.evaluate(() => {
    const d = window.__evFigDebug;
    return d.entries.map((e, i) => {
      if (!e.w || e.gone || e.spec.mode === 'why') return null;
      const p = d.propOf(e);
      return p ? { i, mode: e.spec.mode, kind: p.kind } : null;
    }).filter(Boolean);
  });

  // Drive the gag from the phase machine: this test is about the drop beat, not the press handling.
  const victimIdx = await page.evaluate(() => {
    const d = window.__evFigDebug;
    // NOT whoever comes first: entries[0] is the beam crew, the heaviest carrier on the page, and a
    // victim takes his prop with him owner-less — so picking him means nothing ever lands on a foot
    // and the limp goes untested while the suite stays green. Prefer someone empty-handed.
    const cand = d.entries.filter(e => e.w && e.spec.mode !== 'why' && !e.gone);
    const HEAVY_K = ['ball', 'beamload', 'letter'];
    const v = cand.filter(e => !d.propOf(e))[0] ||
              cand.filter(e => HEAVY_K.indexOf(d.propOf(e).kind) < 0)[0] || cand[0];
    d.poof.victim = v; d.poof.phase = 'holding'; d.poof.t = 2.9;
    return d.entries.indexOf(v);
  });
  await page.waitForFunction(() => window.__evFigDebug.poof.phase === 'stunned', { timeout: 9000 });
  await page.waitForTimeout(60);

  const atStun = await page.evaluate(() => {
    const d = window.__evFigDebug;
    return {
      drops: d.drops().map(x => ({
        kind: x.kind, blow: !!x.blow, hurts: !!x.hurts, landed: !!x.landed,
        ownerIdx: x.owner ? d.entries.indexOf(x.owner) : null
      })),
      // The real invariant, asked of the page as it stands rather than of a snapshot taken three
      // seconds earlier: is anyone STILL holding something? The cast keeps animating through the hold
      // (a dogfetch ball moves from the thrower's hand to the dog on its own), so a pre-hold list of
      // who held what goes stale and a strict count against it fails for reasons that are not bugs.
      stillHolding: d.entries.map((e, i) =>
        (!e.gone && e.spec.mode !== 'why' && e.w && d.propOf(e) && !e.propGone)
          ? { i, mode: e.spec.mode, kind: d.propOf(e).kind } : null).filter(Boolean)
    };
  });

  await page.waitForTimeout(700);   // long enough for every fall (a ~46px drop is ~0.29s)

  // Pixels: the overlay must actually be painting the landed props. Scroll to them first — they sit at
  // DOCUMENT positions all over the page, and at scroll 0 every one of them is below the fold, so a
  // naive sample reads an empty overlay and blames the drawing. Scrolling also exercises the thing that
  // makes them page furniture: the overlay is position:fixed, so a dropped prop only stays put because
  // drawDrops converts document coords every frame.
  await page.evaluate(() => {
    const d = window.__evFigDebug;
    const first = d.drops().filter(x => !x.blow)[0];
    if (!first) return;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, Math.max(0, first.y - window.innerHeight / 2));
  });
  await page.waitForTimeout(200);

  const painted = await page.evaluate(() => {
    const d = window.__evFigDebug;
    // via the debug handle rather than a style-attribute selector: the browser normalises the inline
    // style, so canvas[style*="z-index:61"] silently matches nothing.
    const c = d.poofOverlay();
    if (!c) return { overlay: false };
    const g = c.getContext('2d');
    const sx = window.scrollX, sy = window.scrollY;
    let hits = 0, checked = 0;
    d.drops().forEach(dr => {
      if (dr.blow) return;
      const vy = dr.y - sy;
      if (vy < 20 || vy > window.innerHeight - 20) return;   // off-screen: nothing to sample
      checked++;
      // sample a small box around where it should be lying
      const x = Math.round((dr.x - sx) * (c.width / c.__w));
      const y = Math.round((dr.y - sy) * (c.height / c.__h));
      const r = 14;
      if (x < 0 || y < 0 || x > c.width || y > c.height) return;
      let img;
      try { img = g.getImageData(Math.max(0, x - r), Math.max(0, y - r), r * 2, r * 2).data; } catch (e) { return; }
      for (let k = 3; k < img.length; k += 4) if (img[k] > 8) { hits++; break; }
    });
    return { overlay: true, hits, checked };
  });

  const afterFall = await page.evaluate(() => {
    const d = window.__evFigDebug;
    return {
      drops: d.drops().map(x => ({ kind: x.kind, landed: !!x.landed, blow: !!x.blow })),
      hurt: d.entries.map((e, i) => e.footHurt ? { i, mode: e.spec.mode } : null).filter(Boolean)
    };
  });

  await page.waitForFunction(() => window.__evFigDebug.poof.phase === 'fleeing', { timeout: 9000 });

  // Watch what the hurt ones do. They must raise with everyone else, then limp — never 'run'.
  const flee = await page.evaluate(() => {
    const d = window.__evFigDebug;
    const watch = d.entries.map((e, i) => e.footHurt && e.fl ? i : -1).filter(i => i >= 0);
    const seen = {};
    watch.forEach(i => { seen[i] = []; });
    return new Promise(res => {
      const t0 = performance.now();
      (function step() {
        watch.forEach(i => {
          const e = d.entries[i];
          if (e.fl && seen[i][seen[i].length - 1] !== e.fl) seen[i].push(e.fl);
        });
        const allDone = watch.every(i => d.entries[i].gone);
        if (allDone || performance.now() - t0 > 15000) return res({ watch, seen });
        requestAnimationFrame(step);
      })();
    });
  });

  const cleared = await page.evaluate(() => new Promise(res => {
    const t0 = performance.now();
    (function step() {
      if (window.__evFigDebug.poof.phase === 'cleared') return res(true);
      if (performance.now() - t0 > 30000) return res(false);
      requestAnimationFrame(step);
    })();
  }));

  await page.close();
  return { held, victimIdx, atStun, painted, afterFall, flee, cleared, errs };
}

function check(r, label) {
  assert.deepStrictEqual(r.errs, [], label + ': page errors during the drop beat');

  // 1. nobody is left holding anything, and something actually dropped
  assert.deepStrictEqual(r.atStun.stillHolding, [],
    label + ': the room froze but these are still holding their prop: ' +
    r.atStun.stillHolding.map(h => h.mode + ':' + h.kind).join(', '));
  assert.ok(r.atStun.drops.length > 0,
    label + ': nothing dropped at all, so this run proved nothing (' + r.held.length +
    ' figures were holding something before the grab)');

  // 2. everything that falls lands; a kite is the exception and leaves instead
  r.afterFall.drops.forEach(d => {
    if (d.blow) return;
    assert.ok(d.landed, label + ': the ' + d.kind + ' never finished falling');
  });
  const kites = r.atStun.drops.filter(d => d.kind === 'kite');
  kites.forEach(() => {
    const still = r.afterFall.drops.filter(d => d.kind === 'kite');
    assert.ok(still.every(d => d.blow),
      label + ': a kite is being dropped on the floor — let go of a kite and the wind takes it');
  });

  // 3. THE PIXEL CHECK: the overlay is actually painting them where they landed
  assert.ok(r.painted.overlay, label + ': no smoke/prop overlay canvas in the DOM at all');
  assert.ok(r.painted.checked > 0, label + ': no landed props to sample');
  assert.strictEqual(r.painted.hits, r.painted.checked,
    label + ': only ' + r.painted.hits + ' of ' + r.painted.checked + ' landed props are actually painted ' +
    'on the overlay — the rest are dropped in state but drawn nowhere');

  // 4. heavy things hurt, light things do not — checked against the drops themselves, which carry the
  //    owner, so it cannot drift from the live cast the way a pre-hold snapshot does
  r.atStun.drops.forEach(d => {
    // The victim's own prop has no owner — he is gone, so there is no foot for it to land on.
    if (d.ownerIdx == null) return;
    const shouldHurt = HEAVY.indexOf(d.kind) >= 0;
    assert.strictEqual(d.hurts, shouldHurt,
      label + ': a ' + d.kind + ' is marked hurts=' + d.hurts + '; only ' + HEAVY.join('/') +
      ' may land on a foot');
  });
  const heavyOwners = r.atStun.drops.filter(d => d.hurts && d.ownerIdx != null)
    .map(d => d.ownerIdx).sort();
  const hurtIdx = r.afterFall.hurt.map(h => h.i).sort();
  assert.deepStrictEqual(hurtIdx, heavyOwners,
    label + ': hurt figures are [' + hurtIdx.join(',') + '] but the ones holding something heavy were [' +
    heavyOwners.join(',') + ']. Only ' + HEAVY.join('/') + ' may land on a foot.');

  // 5. a hurt Bobit raises with the room, then limps — he never runs
  r.flee.watch.forEach(i => {
    const ph = r.flee.seen[i] || [];
    assert.ok(ph.indexOf('run') < 0,
      label + ': hurt entry ' + i + ' ran (' + ph.join(' -> ') + ') — something landed on his foot');
    assert.ok(ph.indexOf('raise') >= 0,
      label + ': hurt entry ' + i + ' skipped the hands-up (' + ph.join(' -> ') + '); he should react with ' +
      'the room and only discover the foot when he tries to move');
    assert.ok(ph.indexOf('hlimp') >= 0,
      label + ': hurt entry ' + i + ' never limped (' + ph.join(' -> ') + ')');
  });

  // 6. and none of it stalls the page
  assert.ok(r.cleared, label + ': the exodus never reached "cleared"');

  return r.atStun.drops.length + ' props (' + r.atStun.drops.map(d => d.kind).sort().join(', ') +
    '), ' + r.afterFall.hurt.length + ' hurt' +
    (r.flee.watch.length ? ' [' + r.flee.watch.map(i => (r.flee.seen[i] || []).join('->')).join(' | ') + ']' : '');
}

(async function () {
  const browser = await chromium.launch();
  let sawHurt = 0, sawLight = 0, sawKite = 0;
  const lines = [];

  // two scroll positions so different halves of the cast are on screen and in the drop
  for (const [y, label] of [[0, 'hero'], [2400, 'notes']]) {
    let res = null;
    for (let n = 0; n < RELOADS && !res; n++) {
      res = await run(browser, y);
      if (res && !res.held.length) res = null;      // nobody holding anything: prove nothing, reload
    }
    assert.ok(res, label + ': no cast in ' + RELOADS + ' loads had anyone holding a prop on screen');
    lines.push(label + ': ' + check(res, label));
    res.atStun.drops.forEach(d => {
      if (d.hurts) sawHurt++;
      else if (d.kind === 'kite') sawKite++;
      else sawLight++;
    });
  }

  assert.ok(sawHurt > 0, 'no run produced an actual foot-hit, so the hysterical limp was never ' +
    'exercised. A heavy prop belonging to the VICTIM does not count — he takes it with him and there ' +
    'is no foot for it to land on.');

  // The kite is the one prop that does not fall, and it is cast only some loads — so it gets its own
  // run that reloads until it is there, rather than being reported as "unverified" forever.
  // chance(0.25) per load, so this needs a bigger budget than the others: at 12 tries it misses ~3%%
  // of runs, which is a flaky suite. 26 puts that under 0.1%%.
  let kiteRun = null;
  for (let n = 0; n < 26 && !kiteRun; n++) {
    const res = await run(browser, 2100);
    if (res && res.atStun.drops.some(d => d.kind === 'kite')) kiteRun = res;
  }
  assert.ok(kiteRun, 'no cast in 26 loads put a kite on screen, so the blow-away is untested');
  const k0 = kiteRun.atStun.drops.filter(d => d.kind === 'kite')[0];
  assert.ok(k0.blow, 'the kite is set to fall — let go of a kite and the wind takes it, it does not drop');
  assert.strictEqual(k0.hurts, false, 'a kite cannot land on anybody\'s foot');
  const kiteLeft = kiteRun.afterFall.drops.filter(d => d.kind === 'kite').length === 0;
  lines.push('kite: blew away' + (kiteLeft ? ' and left the page' : ' (still in flight when sampled)'));
  assert.ok(sawLight > 0, 'no run included a light prop, so "light things do not hurt" was never exercised');

  lines.forEach(l => console.log('  ' + l));
  console.log('12-drop-beat: PASS');
  await browser.close();
})();
