// Scene durations, in whole frames, with no accumulated drift.
//
// The tempting implementation rounds each scene on its own:
//     frames = Math.round(scene.dur * fps)
// which is wrong. Each scene absorbs up to half a frame of error and the
// errors ADD. Sixty scenes later the picture can sit a second away from the
// voice, having drifted so gradually that nothing looks wrong until the end.
//
// So round the cumulative BOUNDARIES instead. Every scene's start frame is
// derived from absolute time, and its length is the distance to the next
// boundary. Error never leaves the scene it was born in.

export function planFrames(episode, timings) {
  const fps = episode.fps || 30;
  const byId = new Map(timings.lines.map(l => [l.id, l]));
  const gap = timings.gap == null ? 0 : timings.gap;

  // 1. Absolute, unrounded span for each scene.
  const spans = [];
  let clock = 0;
  for (const scene of episode.scenes) {
    const line = byId.get(scene.vo);
    if (!line) {
      throw new Error('scene "' + scene.id + '" names vo id "' + scene.vo +
        '" which is not in timings.json');
    }
    const dur = line.dur + gap + (scene.hold || 0);
    spans.push({ scene, start: clock, end: clock + dur });
    clock += dur;
  }

  // 2. Round the boundaries, not the durations.
  const out = [];
  for (let i = 0; i < spans.length; i++) {
    const startFrame = Math.round(spans[i].start * fps);
    const endFrame = i === spans.length - 1
      ? Math.round(spans[i].end * fps)
      : Math.round(spans[i + 1].start * fps);
    const frames = Math.max(1, endFrame - startFrame);
    out.push({
      ...spans[i].scene,
      startFrame,
      frames,
      start: startFrame / fps,
      end: (startFrame + frames) / fps,
      dur: frames / fps
    });
  }
  return out;
}

export function timingSheet(episode, planned) {
  const mmss = x => String(Math.floor(x / 60)).padStart(2, '0') + ':' +
    (x % 60).toFixed(2).padStart(5, '0');
  const rows = planned.map(s =>
    '| ' + s.vo + ' | ' + mmss(s.start) + ' | ' + mmss(s.end) + ' | ' +
    s.dur.toFixed(2) + ' | ' + s.id + ' |');
  return [
    '# ' + episode.title + ' — timing sheet',
    '',
    'Read against the locked picture. Each line starts at the time below.',
    '',
    '| Line | In | Out | Length | Scene |',
    '|---|---|---|---|---|',
    ...rows,
    ''
  ].join('\n');
}
