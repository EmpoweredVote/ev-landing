// script.md -> narration lines.
//
// Format:
//   ## L001
//   > Direction: what the Bobits are doing while this is read.
//   The narration text, which may wrap over several lines.
//
// One line is one scene. That one-to-one rule is what makes a re-time cost a
// single number instead of an edit.

const ID = /^##\s+(\S+)\s*$/;
const DIRECTION = /^>\s*Direction:\s*(.*)$/i;

export function parseScript(text) {
  const out = [];
  const seen = new Set();
  let cur = null;

  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();

    if (/^#\s/.test(line)) continue;                       // the document title
    const head = line.match(ID);
    if (head) {
      const id = head[1];
      if (!/^L\d{3,}$/.test(id)) {
        throw new Error('bad line id "' + id + '": expected L001, L002, ...');
      }
      if (seen.has(id)) throw new Error('duplicate line id "' + id + '"');
      seen.add(id);
      cur = { id, text: '', direction: '', parts: [] };
      out.push(cur);
      continue;
    }
    if (!cur) continue;

    const dir = line.match(DIRECTION);
    if (dir) { cur.direction = dir[1].trim(); continue; }

    // A blank line ends the narration. Narration may wrap over several lines,
    // but an episode file also carries prose BETWEEN the numbered lines —
    // chapter headings, a note recording what was cut and why — and without
    // this rule all of it is glued onto the line above. That damage is
    // invisible: the line still parses, it is just longer than the page, so
    // the voice reads a chapter heading aloud and every match against a
    // recorded take comes back weak for a reason nothing names.
    if (!line.trim()) { if (cur.parts.length) cur.closed = true; continue; }
    if (cur.closed) continue;
    cur.parts.push(line.trim());
  }

  for (const l of out) {
    l.text = l.parts.join(' ');
    delete l.parts;
    delete l.closed;
    if (!l.text) throw new Error('line ' + l.id + ' has a heading but no narration');
  }
  return out;
}
