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

// The script as something to read aloud into a microphone: the words, the line
// numbers the edit keys off, and the scratch pace as a guide. Direction notes
// are deliberately left out — they are instructions to the renderer, not to the
// reader, and they break the flow of a take.
export function recordingScript(episode, planned, timings) {
  const byLine = new Map(timings.lines.map(l => [l.id, l]));
  const words = n => n.trim().split(/\s+/).length;
  const total = planned.reduce((n, s) => n + byLine.get(s.vo).dur, 0);
  const allWords = planned.reduce((n, s) => n + words(byLine.get(s.vo).text), 0);

  const out = [
    '# ' + episode.title + ' — recording script',
    '',
    '**' + planned.length + ' lines · ' + allWords + ' words · about ' +
      (total / 60).toFixed(1) + ' minutes at the scratch pace.**',
    '',
    '## How to record this',
    '',
    'Read the lines in order. **Leave about two seconds of silence between',
    'lines** and do not fill it — that gap is how the take gets split back into',
    'numbered lines, and a clean one makes the split exact.',
    '',
    'One continuous take is fine, and preferred. If you fluff a line, pause,',
    'then read that whole line again from the start; the later take wins.',
    '',
    'The times below are the scratch voice, not a target. Read at the pace the',
    'line wants. Every scene re-times to your reading, so going slower costs',
    'nothing but runtime.',
    '',
    '---',
    ''
  ];

  // An episode may name its chapters; without that the id prefix stands in.
  const names = new Map((episode.chapters || []).map(c => [c.key, c.name]));
  let chapter = null;
  for (const s of planned) {
    const key = s.id.split('-')[0];
    if (key !== chapter) {
      chapter = key;
      out.push('', '### ' + (names.get(key) || key), '');
    }
    const line = byLine.get(s.vo);
    out.push('**' + line.id + '**  _(' + line.dur.toFixed(1) + 's · ' +
      words(line.text) + ' words)_', '', line.text, '');
  }
  return out.join('\n');
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
