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
    if (!line.trim()) continue;
    cur.parts.push(line.trim());
  }

  for (const l of out) {
    l.text = l.parts.join(' ');
    delete l.parts;
    if (!l.text) throw new Error('line ' + l.id + ' has a heading but no narration');
  }
  return out;
}
