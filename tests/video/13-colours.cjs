// Episode 1 teaches a colour language for five minutes and then cuts to the
// real product. If the drawn shapes and the Bobits do not use the product's
// own colours, that cut contradicts everything the viewer just learned.
//
// The live compass legend (C:\EV-CompassV2 src/pages/CombinedPage.jsx) paints
// YOUR shape purple and the civic leader you compare against green:
//
//   you     #7C6B9E   fill rgba(124,107,158,0.40)
//   leader  #6DD28C   fill rgba(110,210,140,0.55)   (dark theme; the stage is dark)
//
// This test asks the pixels, because the same two shapes are drawn by three
// separate functions in art.js and they once disagreed: chapter 6 drew the
// leader teal, chapter 7 drew them Inform yellow.
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = 'C:/ev-landing/ev-landing-main';
const EP_DIR = path.join(ROOT, 'tools/video/episodes/compass');
const URL = 'file:///' + ROOT + '/tools/video/engine/stage.html';
const W = 640, H = 360;

const YOU = '#7C6B9E';
const LEADER = '#6DD28C';
const ACCENT = '#FFD426';

(async function () {
  const episode = (await import(pathToFileURL(path.join(EP_DIR, 'episode.mjs')).href)).default;
  const byId = new Map(episode.scenes.map(s => [s.id, s]));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  for (const f of ['brand.js', 'screen.js', 'art.js']) {
    await page.addScriptTag({ path: path.join(EP_DIR, f) });
  }
  await page.evaluate(() => (window.EVArt && window.EVArt.ready) || null);
  await page.evaluate(([w, h]) => window.EVStage.init(w, h), [W, H]);

  // How many pixels sit within `tol` of a colour, on every channel. A stroke is
  // antialiased against the stage, so the core of the line is what is counted.
  async function count(scene, t, hex, tol) {
    const rgb = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16),
                 parseInt(hex.slice(5, 7), 16)];
    return await page.evaluate(([s, tt, c, k]) => {
      window.EVStage.renderFrame(s, tt);
      const el = document.getElementById('stage');
      const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (Math.abs(d[i] - c[0]) < k && Math.abs(d[i + 1] - c[1]) < k &&
            Math.abs(d[i + 2] - c[2]) < k) n++;
      }
      return n;
    }, [scene, t, rgb, tol || 14]);
  }

  // A scene as the build renders it, with a settled duration so every fade has
  // finished by the time it is sampled.
  const at = id => Object.assign({}, byId.get(id), { dur: 4, accent: episode.accent });
  // The same scene with its art removed, so only the Bobits are left on stage.
  const castOnly = id => Object.assign({}, at(id), { type: 'stage', art: undefined });

  // 1. The overlay chapter draws both shapes in the product's two colours.
  for (const id of ['lay-overlap', 'lay-gap', 'lay-yours']) {
    const you = await count(at(id), 3.4, YOU);
    const them = await count(at(id), 3.4, LEADER);
    assert.ok(you > 150, id + ' must draw your shape in the product purple, got ' + you + 'px');
    assert.ok(them > 150, id + ' must draw the leader in the product green, got ' + them + 'px');
  }

  // 2. The sourcing chapter draws the same two shapes, so it must agree with
  //    the chapter before it rather than inventing its own pair.
  for (const id of ['src-ask', 'src-refs']) {
    const you = await count(at(id), 3.4, YOU);
    const them = await count(at(id), 3.4, LEADER);
    assert.ok(you > 60, id + ' must draw your shape in the product purple, got ' + you + 'px');
    assert.ok(them > 60, id + ' must draw the leader in the product green, got ' + them + 'px');
  }

  // 3. Your shape is yours from the moment it is built, not only once someone
  //    else is laid over it.
  const built = await count(at('shape-outline'), 3.4, YOU);
  assert.ok(built > 150, 'shape-outline must draw your shape purple, got ' + built + 'px');

  // 4. The accent is the episode's brand colour, not a shape colour. If the
  //    outline were still Inform yellow this would catch it.
  const yellow = await count(at('shape-outline'), 3.4, ACCENT);
  assert.ok(yellow < 120,
    'the compass outline must not be painted in the episode accent, got ' + yellow + 'px');

  // 5. The Bobits carry the same language: you are purple, and from the moment
  //    a civic leader is on the spokes they are on stage in green.
  for (const id of ['lay-alone', 'lay-second', 'lay-yours', 'src-refs']) {
    const you = await count(castOnly(id), 2.0, YOU);
    assert.ok(you > 150, id + ' must put a purple Bobit on stage, got ' + you + 'px');
  }
  for (const id of ['lay-second', 'lay-overlap', 'src-stance']) {
    const them = await count(castOnly(id), 2.0, LEADER);
    assert.ok(them > 150, id + ' must put a green Bobit on stage, got ' + them + 'px');
  }

  // 6. Before the comparison exists there is nobody to be green. A green Bobit
  //    in the calibration chapter would mean a civic leader is already there.
  for (const id of ['cal-start', 'shape-outline']) {
    const early = await count(castOnly(id), 2.0, LEADER);
    assert.ok(early < 40, id + ' must not show a green Bobit yet, got ' + early + 'px');
  }

  assert.deepStrictEqual(errors, [], 'no page errors');
  await browser.close();
  console.log('PASS 13-colours');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
