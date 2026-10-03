// Split a Markdown docs file into sections the contract accepts: at most
// 2,500 characters each, cut at headings first and then at blank lines,
// never inside a code block. The same rules as scripts/import_markdown.py;
// tests/test_import.py holds the two to the same output on the docs pages.

export const MAX_SECTION = 2500;
export const MAX_TITLE = 80;

function fenceOf(line) {
  const stripped = line.replace(/^ +/, '');
  if (line.length - stripped.length > 3) return '';
  const m = /^(`{3,}|~{3,})/.exec(stripped);
  return m ? m[1] : '';
}

function headingOf(line) {
  const m = /^ {0,3}(#{1,3}) +(.*?)\s*#*\s*$/.exec(line);
  return m ? m[2].trim() : null;
}

function cut(title) {
  const t = title.trim() || 'Untitled section';
  return t.length > MAX_TITLE ? t.slice(0, MAX_TITLE - 3) + '...' : t;
}

/** Drop YAML front matter and top-level MDX import/export lines. */
export function clean(text) {
  let lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) lines = lines.slice(end + 1);
  }
  const out = [];
  let fence = '';
  for (const line of lines) {
    const f = fenceOf(line);
    if (fence) {
      out.push(line);
      if (f && f[0] === fence[0] && f.length >= fence.length && line.trim() === f) fence = '';
      continue;
    }
    if (f) {
      fence = f;
      out.push(line);
      continue;
    }
    if (/^(import|export) /.test(line)) continue;
    out.push(line);
  }
  return out.join('\n');
}

/** Blocks separated by blank lines, keeping each code block whole. */
function blocks(text) {
  const out = [];
  let current = [];
  let fence = '';
  for (const line of text.split('\n')) {
    const f = fenceOf(line);
    if (fence) {
      current.push(line);
      if (f && f[0] === fence[0] && f.length >= fence.length && line.trim() === f) fence = '';
      continue;
    }
    if (f) fence = f;
    if (!fence && line.trim() === '') {
      if (current.length) out.push(current.join('\n'));
      current = [];
      continue;
    }
    current.push(line);
  }
  if (current.length) out.push(current.join('\n'));
  return out;
}

/**
 * @param {string} markdown
 * @returns {{ title: string, text: string, tooLong: boolean }[]}
 */
export function splitSections(markdown) {
  const text = clean(markdown);
  // 1. at headings, outside code blocks
  const chunks = [];
  let current = [];
  let title = '';
  let fence = '';
  for (const line of text.split('\n')) {
    const f = fenceOf(line);
    if (fence) {
      current.push(line);
      if (f && f[0] === fence[0] && f.length >= fence.length && line.trim() === f) fence = '';
      continue;
    }
    if (f) fence = f;
    const h = fence ? null : headingOf(line);
    if (h !== null) {
      if (current.join('\n').trim()) chunks.push({ title, text: current.join('\n').trim() });
      current = [line];
      title = h;
      continue;
    }
    current.push(line);
  }
  if (current.join('\n').trim()) chunks.push({ title, text: current.join('\n').trim() });
  // 2. a chunk over the limit is cut at blank lines
  const out = [];
  for (const chunk of chunks) {
    const first = chunk.title || chunk.text.split('\n').find((l) => l.trim())?.trim() || '';
    if (chunk.text.length <= MAX_SECTION) {
      out.push({ title: cut(first), text: chunk.text, tooLong: false });
      continue;
    }
    let part = '';
    let n = 0;
    const flush = () => {
      if (!part) return;
      out.push({ title: cut(n === 0 ? first : `${first} (${n + 1})`), text: part, tooLong: part.length > MAX_SECTION });
      n++;
      part = '';
    };
    for (const block of blocks(chunk.text)) {
      if (part && part.length + 2 + block.length > MAX_SECTION) flush();
      part = part ? `${part}\n\n${block}` : block;
    }
    flush();
  }
  return out;
}
