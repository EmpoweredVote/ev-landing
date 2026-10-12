// New poses must be registered, must animate, and must not produce NaN joints
// — a NaN angle draws nothing at all and reads like a missing figure.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/tools/video/engine/stage.html';

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);

  const probe = await page.evaluate(() => {
    const R = window.LeremyRig;
    const out = {};
    for (const name of ['tap', 'showTo']) {
      const a = R.ANIMATIONS[name];
      if (!a) { out[name] = { missing: true }; continue; }
      const finite = [];
      const samples = [];
      for (let i = 0; i <= 40; i++) {
        const t = i * 0.1;
        const p = a.frame(t);
        const j = R.computePose(p, R.CFG, { x: 0, y: 0 });
        // computePose returns 17 POINTS plus two scalars, `lean` and `spineA`.
        // Flattening everything to .x/.y reports the scalars as non-finite and
        // blames the pose for it, so check each kind on its own terms.
        const pts = Object.values(j).filter(v => v && typeof v === 'object' && 'x' in v);
        const nums = Object.values(j).filter(v => typeof v === 'number');
        // Guard the filter itself: `every` on an empty array is true, so a
        // filter that matched nothing would pass this test vacuously forever.
        finite.push(pts.length === 17 && nums.length === 2 &&
                    pts.every(v => Number.isFinite(v.x) && Number.isFinite(v.y)) &&
                    nums.every(Number.isFinite));
        samples.push(Math.round(j.hR.x) + ',' + Math.round(j.hR.y));
      }
      // Where the arms sit, at mid-animation. A pose can be finite, animated
      // and registered and still draw a figure whose arm appears to grow out
      // of its jaw, which is what a reviewer saw in the episode.
      const j = R.computePose(a.frame(2.0), R.CFG, { x: 0, y: 0 });
      out[name] = {
        missing: false,
        label: a.label,
        allFinite: finite.every(Boolean),
        distinct: new Set(samples).size,
        inOrder: R.ORDER.indexOf(name) >= 0,
        elbowBelowShoulder: j.eR.y - j.sR.y,
        offHandFromSpine: Math.abs(j.hL.x - j.P.x),
        torsoHalf: R.CFG.torsoW / 2,
        armHalf: R.CFG.armW / 2
      };
    }
    return out;
  });

  for (const name of ['tap', 'showTo']) {
    const p = probe[name];
    assert.ok(!p.missing, name + ' must be registered in ANIMATIONS');
    assert.ok(p.label, name + ' must carry a label for the rig browser');
    assert.ok(p.allFinite, name + ' must produce finite joints at every sampled time');
    assert.ok(p.distinct > 3, name + ' must actually animate; got ' + p.distinct + ' distinct hand positions');
    assert.ok(p.inOrder, name + ' must be pushed onto ORDER so the pose browser lists it');
  }

  // An arm that leaves the body level with the shoulder reads, at the size a
  // figure is drawn in a 1080p frame, as a stick poking out of the head: the
  // shoulder sits only a few pixels below the neck and the head fills the
  // space above it. The elbow has to drop far enough to show where the arm
  // joins the torso.
  {
    const p = probe.showTo;
    assert.ok(p.elbowBelowShoulder > 12,
      'showTo: the elbow must hang below the shoulder so the arm reads as joined ' +
      'to the torso, not to the head; got ' + p.elbowBelowShoulder.toFixed(1) + 'px');
    // and the figure must not look one-armed: the far hand has to clear the
    // torso bar it would otherwise be hidden behind.
    assert.ok(p.offHandFromSpine > p.torsoHalf + p.armHalf,
      'showTo: the off hand must clear the torso so both arms are visible; got ' +
      p.offHandFromSpine.toFixed(1) + 'px from the spine, torso half-width ' +
      p.torsoHalf + 'px');
  }

  await browser.close();
  console.log('PASS 10-poses');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
