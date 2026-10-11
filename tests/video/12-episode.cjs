// The episode, the script and the art must agree — checked without rendering.
//
// Three ways an episode drifts out of agreement, all of them silent until late:
// a scene names a narration line the writer deleted; a line is written and no
// scene claims it, so it is recorded, lands in the voice track and never
// appears; a scene names a draw function that was renamed or removed, which
// only surfaces when that one scene renders, minutes into a build.
//
// build.mjs already refuses the first two, but only after speaking every line.
// This is the same check in under a second, and it adds the third.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..', '..');
const EP_DIR = path.join(ROOT, 'tools/video/episodes/compass');

(async function () {
  const episode = (await import(pathToFileURL(path.join(EP_DIR, 'episode.mjs')).href)).default;
  const script = fs.readFileSync(path.join(EP_DIR, 'script.md'), 'utf8');

  const written = (script.match(/^## (L\d+)$/gm) || []).map(h => h.slice(3));
  assert.ok(written.length > 0, 'the script must contain numbered lines');

  // Every scene's line exists, and no two scenes claim one line.
  const claimed = new Map();
  for (const s of episode.scenes) {
    assert.ok(written.includes(s.vo),
      'scene "' + s.id + '" names ' + s.vo + ', which the script does not contain');
    assert.ok(!claimed.has(s.vo),
      s.vo + ' is claimed by both "' + claimed.get(s.vo) + '" and "' + s.id + '"');
    claimed.set(s.vo, s.id);
  }

  // Every written line is spoken by a scene.
  const orphans = written.filter(id => !claimed.has(id));
  assert.deepStrictEqual(orphans, [],
    'these lines are written but no scene says them: ' + orphans.join(', '));

  // Every art name the episode uses is registered by its art.js. The file is a
  // browser IIFE, so it runs against a stub window rather than being parsed.
  const sandbox = {
    window: {}, Image: function () { return { onload: null, onerror: null }; },
    Promise, Object, Math, Date, console
  };
  sandbox.window.Image = sandbox.Image;
  vm.runInNewContext(fs.readFileSync(path.join(EP_DIR, 'art.js'), 'utf8'), sandbox,
    { filename: 'art.js' });
  const registered = Object.keys(sandbox.window.EVArt || {});
  assert.ok(registered.length > 1, 'art.js must register its draw functions');

  for (const s of episode.scenes) {
    if (s.type !== 'art') continue;
    assert.ok(registered.includes(s.art),
      'scene "' + s.id + '" names art "' + s.art + '", which art.js does not register');
  }

  // Art that nothing uses is dead weight in a 500-line file; say so by name.
  const used = new Set(episode.scenes.filter(s => s.type === 'art').map(s => s.art));
  const unused = registered.filter(n => n !== 'ready' && !used.has(n));
  assert.deepStrictEqual(unused, [],
    'art.js registers draw functions no scene uses: ' + unused.join(', '));

  console.log('PASS 12-episode (' + episode.scenes.length + ' scenes, ' +
    written.length + ' lines, ' + registered.length + ' art entries)');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
