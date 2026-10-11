// The guards a review found missing: the alpha path returning opaque scenes,
// a short-but-clean ffmpeg, a stale artefact surviving a failed render, two
// scenes claiming one line, and a voice track assembled against numbers that
// no longer describe the files.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/ev-landing/ev-landing-main';
const EP = path.join(ROOT, 'tools/video/build/_guard-ep');
const OUT = path.join(ROOT, 'tools/video/build/_guard-out');

const EPISODE = `
export default {
  id: 'guard', title: 'Guard', accent: '#FFD426',
  fps: 30, width: 320, height: 180,
  scenes: [
    { id: 'a', type: 'title', vo: 'L001', headline: 'One' },
    { id: 'b', type: 'title', vo: 'L002', headline: 'Two' }
  ]
};
`;

function probe(file, entries, stream) {
  const args = ['-v', 'error'];
  if (stream) args.push('-select_streams', stream);
  args.push('-show_entries', entries, '-of', 'default=nw=1:nk=1', file);
  return execFileSync('ffprobe', args, { encoding: 'utf8' }).trim();
}

function writeTimings(dir, lines, gap) {
  let clock = 0;
  const out = { gap, lines: [], total: 0 };
  for (const [id, dur] of lines) {
    out.lines.push({ id, text: id + '.', direction: '', start: clock, dur });
    clock += dur + gap;
  }
  out.total = clock;
  fs.writeFileSync(path.join(dir, 'timings.json'), JSON.stringify(out), 'utf8');
}

function silentWav(file, secs) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi',
    '-i', 'anullsrc=r=48000:cl=mono', '-t', String(secs), file]);
}

function fresh(episodeSrc) {
  fs.rmSync(EP, { recursive: true, force: true });
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'vo'), { recursive: true });
  fs.mkdirSync(EP, { recursive: true });
  fs.writeFileSync(path.join(EP, 'episode.mjs'), episodeSrc, 'utf8');
  writeTimings(OUT, [['L001', 0.6], ['L002', 0.6]], 0.2);
  for (const id of ['L001', 'L002']) silentWav(path.join(OUT, 'vo', id + '.wav'), 0.6);
}

(async function () {
  const { buildEpisode } = await import('file:///' + ROOT + '/tools/video/engine/build.mjs');
  const { renderScene } = await import('file:///' + ROOT + '/tools/video/engine/render.mjs');

  // ── 1. The alpha path must not serve the opaque cache ──────────────────
  // The spec's fallback is "if the finished episode disappoints, the same
  // engine hands you per-scene clips with transparency". Sharing one cache and
  // one output path with the normal build means --alpha returns H.264 with no
  // alpha plane, prints success, and exits 0.
  fresh(EPISODE);
  await buildEpisode(EP, { outDir: OUT, voice: false });
  const alpha = await buildEpisode(EP, { outDir: OUT, voice: false, alpha: true });
  assert.ok(alpha.rendered.length > 0,
    'an alpha build must not reuse the opaque cache, rendered ' + alpha.rendered);
  const alphaScene = alpha.sceneFiles[0];
  assert.ok(/^yuva/.test(probe(alphaScene, 'stream=pix_fmt', 'v:0')),
    'alpha scenes must carry an alpha plane, got ' + probe(alphaScene, 'stream=pix_fmt', 'v:0'));
  // and the opaque scenes must still be there, not overwritten
  assert.ok(fs.existsSync(path.join(OUT, 'scenes', 'a.mp4')),
    'the opaque render must survive an alpha build');

  // ── 2. A short-but-clean ffmpeg must not pass ──────────────────────────
  // An ffmpeg that exits 0 having written fewer frames than asked is the
  // failure the plan's test missed: it tested an unknown codec, which dies at
  // startup. A truncated scene gets cached, concatenated, and runs the picture
  // short from there on while the voice keeps its planned positions.
  const episodeMeta = { id: 'guard', fps: 30, width: 320, height: 180 };
  const scene = { id: 'short', type: 'title', vo: 'L001', dur: 1, frames: 30,
    accent: '#FFD426', headline: 'Short' };
  const shortFile = path.join(OUT, 'short.mp4');
  await assert.rejects(
    () => renderScene({ scene, episode: episodeMeta, outFile: shortFile,
      ffmpegArgs: ['-frames:v', '3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p'] }),
    /frame/i,
    'a scene that ends up with the wrong frame count must be rejected');
  assert.ok(!fs.existsSync(shortFile),
    'a rejected render must not leave its file behind for a later build to accept');

  // ── 3. A failed render must not leave a stale hash validating an old file ─
  fresh(EPISODE);
  await buildEpisode(EP, { outDir: OUT, voice: false });
  const hashFile = path.join(OUT, 'scenes', 'b.hash');
  const mp4 = path.join(OUT, 'scenes', 'b.mp4');
  assert.ok(fs.existsSync(hashFile) && fs.existsSync(mp4), 'the first build produced b');
  // simulate a render that failed after the hash was written for other content
  fs.writeFileSync(path.join(EP, 'episode.mjs'),
    EPISODE.replace("headline: 'Two'", "headline: 'Deux'"), 'utf8');
  const changed = await buildEpisode(EP, { outDir: OUT, voice: false });
  assert.deepStrictEqual(changed.rendered, ['b'], 'the edited scene re-renders');
  const hashNow = fs.readFileSync(hashFile, 'utf8').trim();
  fs.writeFileSync(path.join(EP, 'episode.mjs'), EPISODE, 'utf8');
  const reverted = await buildEpisode(EP, { outDir: OUT, voice: false });
  assert.deepStrictEqual(reverted.rendered, ['b'], 'reverting re-renders too');
  assert.notStrictEqual(fs.readFileSync(hashFile, 'utf8').trim(), hashNow,
    'the hash must track the content actually rendered');

  // ── 4. Two scenes must not claim the same line ─────────────────────────
  // The plan required "none skipped and none repeated". Skipped is guarded;
  // repeated would speak the line twice in the finished cut.
  // Only ONE line exists, and two scenes claim it — so this isolates the
  // duplicate from the orphan check, which would otherwise fire first.
  fresh(EPISODE.replace("vo: 'L002'", "vo: 'L001'"));
  writeTimings(OUT, [['L001', 0.6]], 0.2);
  await assert.rejects(() => buildEpisode(EP, { outDir: OUT, voice: false }),
    /more than one scene[\s\S]*L001/,
    'two scenes naming one line must abort and name it');

  // ── 5. A missing per-line WAV must abort, not fall back silently ────────
  // Falling back to vo.wav uses exactly the track whose drift the resync
  // exists to correct, and -shortest then cuts the end off the episode.
  fresh(EPISODE);
  silentWav(path.join(OUT, 'vo.wav'), 1.6);
  fs.rmSync(path.join(OUT, 'vo', 'L002.wav'));
  await assert.rejects(() => buildEpisode(EP, { outDir: OUT, voice: false }), /L002/,
    'a missing per-line WAV must abort and name the line');

  // ── 6. Declared durations must match the real audio ─────────────────────
  // The assembly advances its clock by the DECLARED duration while the file
  // advances by its real one, so the error is never corrected. Four lines
  // 0.3s adrift gave 1.2s of silent desync in review.
  fresh(EPISODE);
  silentWav(path.join(OUT, 'vo', 'L001.wav'), 0.9);        // declared 0.6
  await assert.rejects(() => buildEpisode(EP, { outDir: OUT, voice: false }), /L001/,
    'a WAV whose real length disagrees with timings.json must abort and name it');

  // ── 7. The finished cut must match the plan, end to end ────────────────
  fresh(EPISODE);
  const ok = await buildEpisode(EP, { outDir: OUT, voice: false });
  const planned = ok.planned.reduce((n, s) => n + s.frames, 0);
  assert.strictEqual(Number(probe(ok.silent, 'stream=nb_frames', 'v:0')), planned,
    'the joined picture must hold exactly the planned frames');
  const vid = Number(probe(ok.silent, 'format=duration'));
  const aud = Number(probe(ok.scratch, 'format=duration'));
  assert.ok(Math.abs(vid - aud) <= 1 / 30 + 0.02,
    'picture and scratch must agree: ' + vid.toFixed(3) + ' vs ' + aud.toFixed(3));

  console.log('PASS 11-guards');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
