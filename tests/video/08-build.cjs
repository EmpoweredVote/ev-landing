// The orchestrator, run against a tiny two-scene fixture episode with a
// pre-made timings.json so the test needs no network and no speech engine.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/ev-landing/ev-landing-main';
const EP = path.join(ROOT, 'tools/video/build/_epfixture');
const OUT = path.join(ROOT, 'tools/video/build/_epfixture-out');

function probe(file, entries) {
  return execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', entries, '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' }).trim();
}

(async function () {
  fs.rmSync(EP, { recursive: true, force: true });
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(EP, { recursive: true });

  fs.writeFileSync(path.join(EP, 'episode.mjs'), `
export default {
  id: 'epfixture', title: 'Fixture', accent: '#FFD426',
  fps: 30, width: 320, height: 180,
  scenes: [
    { id: 'a', type: 'title', vo: 'L001', headline: 'One' },
    { id: 'b', type: 'stage', vo: 'L002', headline: 'Two',
      cast: [{ at: [0.5, 0.85], anim: 'present', tone: 0, scale: 0.35 }] }
  ]
};
`, 'utf8');

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'timings.json'), JSON.stringify({
    gap: 0.2,
    lines: [
      { id: 'L001', text: 'One.', direction: '', start: 0, dur: 0.6 },
      { id: 'L002', text: 'Two.', direction: '', start: 0.8, dur: 0.6 }
    ],
    total: 1.6
  }), 'utf8');

  const { buildEpisode } = await import('file:///' + ROOT + '/tools/video/engine/build.mjs');
  const r1 = await buildEpisode(EP, { outDir: OUT, voice: false });

  assert.ok(fs.existsSync(r1.silent), 'the silent MP4 must exist');
  assert.ok(fs.existsSync(r1.sheet), 'the timing sheet must exist');
  assert.ok(fs.existsSync(r1.contact), 'the contact sheet must exist');

  // The joined picture is as long as the planned frames, not longer.
  const nb = Number(probe(r1.silent, 'stream=nb_frames'));
  assert.strictEqual(nb, Math.round(1.6 * 30), 'joined frames, got ' + nb);

  // The contact sheet holds one frame per scene.
  const cw = Number(probe(r1.contact, 'stream=width'));
  assert.ok(cw >= 320 * 2, 'the contact sheet must be at least two scenes wide, got ' + cw);

  // A scene inherits the episode's accent. Without this every scene would have
  // to repeat the pillar colour, and the one that forgot would render in the
  // default grey with nothing to say so — the fixture's scene 'a' sets none.
  assert.strictEqual(r1.planned[0].accent, '#FFD426',
    'a scene with no accent must inherit the episode accent, got ' + r1.planned[0].accent);

  // The timing sheet names every line with an in-point.
  const sheet = fs.readFileSync(r1.sheet, 'utf8');
  assert.ok(/L001/.test(sheet) && /L002/.test(sheet), 'every line appears in the sheet');
  assert.ok(/00:00\.00/.test(sheet), 'the first line starts at zero');

  // Caching: a second build with nothing changed re-renders no scene.
  const before = fs.statSync(path.join(OUT, 'scenes', 'b.mp4')).mtimeMs;
  const r2 = await buildEpisode(EP, { outDir: OUT, voice: false });
  const after = fs.statSync(path.join(OUT, 'scenes', 'b.mp4')).mtimeMs;
  assert.strictEqual(after, before, 'an unchanged scene must not re-render');
  assert.strictEqual(r2.rendered.length, 0, 're-render list must be empty, got ' + r2.rendered);

  // Change one scene; only that one re-renders.
  const src = fs.readFileSync(path.join(EP, 'episode.mjs'), 'utf8');
  fs.writeFileSync(path.join(EP, 'episode.mjs'), src.replace("headline: 'Two'", "headline: 'Dos'"), 'utf8');
  const r3 = await buildEpisode(EP, { outDir: OUT, voice: false });
  assert.deepStrictEqual(r3.rendered, ['b'], 'only the changed scene re-renders, got ' + r3.rendered);

  // A RELATIVE episode dir and out dir must work. ffmpeg's concat demuxer
  // resolves relative entries against the LIST FILE's own directory, not the
  // process cwd, so a list written with cwd-relative paths doubles the prefix
  // and the join fails. Absolute paths hide it — and the documented CLI
  // invocation is relative.
  const relEp = path.relative(process.cwd(), EP).replace(/\\/g, '/');
  const relOut = path.relative(process.cwd(), OUT).replace(/\\/g, '/');
  const r4 = await buildEpisode(relEp, { outDir: relOut, voice: false });
  assert.ok(fs.existsSync(r4.silent), 'a relative outDir must still produce the silent MP4');
  assert.strictEqual(Number(probe(r4.silent, 'stream=nb_frames')), 48,
    'the relative-path build must join the same 48 frames');

  // A scene `hold` adds picture time AFTER its line. The voice track knows
  // nothing about holds, so without correction the audio runs ahead of the
  // picture from the first hold onward — and ffmpeg's -shortest then truncates
  // the VIDEO to the shorter audio, silently dropping the end of the episode.
  const EP2 = EP + '2', OUT2 = OUT + '2';
  fs.rmSync(EP2, { recursive: true, force: true });
  fs.rmSync(OUT2, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT2, 'vo'), { recursive: true });
  fs.mkdirSync(EP2, { recursive: true });
  fs.writeFileSync(path.join(EP2, 'episode.mjs'), `
export default {
  id: 'epfixture2', title: 'Fixture2', accent: '#FFD426',
  fps: 30, width: 320, height: 180,
  scenes: [
    { id: 'a', type: 'title', vo: 'L001', headline: 'One', hold: 0.5 },
    { id: 'b', type: 'title', vo: 'L002', headline: 'Two' }
  ]
};
`, 'utf8');
  fs.copyFileSync(path.join(OUT, 'timings.json'), path.join(OUT2, 'timings.json'));
  // Per-line audio, offline — no speech engine needed to test the assembly.
  for (const id of ['L001', 'L002']) {
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi',
      '-i', 'anullsrc=r=48000:cl=mono', '-t', '0.6', path.join(OUT2, 'vo', id + '.wav')]);
  }
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi',
    '-i', 'anullsrc=r=48000:cl=mono', '-t', '1.6', path.join(OUT2, 'vo.wav')]);

  const r5 = await buildEpisode(EP2, { outDir: OUT2, voice: false });
  assert.ok(r5.scratch && fs.existsSync(r5.scratch), 'a scratch MP4 must be produced when audio exists');
  const vidDur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries',
    'format=duration', '-of', 'default=nw=1:nk=1', r5.silent], { encoding: 'utf8' }).trim());
  const mixDur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries',
    'format=duration', '-of', 'default=nw=1:nk=1', r5.scratch], { encoding: 'utf8' }).trim());
  assert.ok(Math.abs(mixDur - vidDur) <= 1 / 30 + 0.02,
    'the scratch cut must be as long as the picture, not truncated to the voice: ' +
    'picture ' + vidDur.toFixed(3) + 's, scratch ' + mixDur.toFixed(3) + 's');

  console.log('PASS 08-build');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
