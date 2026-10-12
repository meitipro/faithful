// The exact pre-checks, ported line by line from contracts/precheck.py so the
// editor can run them live as the translator types. The contract's copy is
// the one that decides; this one is held to it by tests/precheck_cases.json
// (pytest runs both). Strings are walked as arrays of code points, because
// Python indexes code points and JavaScript indexes UTF-16 units.

const PERSIAN_DIGITS = Array.from("۰۱۲۳۴۵۶۷۸۹");
const ARABIC_DIGITS = Array.from("٠١٢٣٤٥٦٧٨٩");
const ASCII_DIGITS = "0123456789";
const URL_STOP = " \t\n()[]<>\"'`";
const URL_TRIM = ".,;:!?،؛";
export const MIN_RATIO_PCT = 40;
export const MAX_RATIO_PCT = 250;

/** Python's str.strip() with no argument, on the characters it treats as whitespace. */
const PY_SPACE = new Set([" ", "\t", "\n", "\r", "\x0b", "\x0c", "\x1c", "\x1d", "\x1e", "\x1f", "\x85", "\xa0", " ",
  " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",
  " ", " ", " ", " ", "　"]);

function pyStrip(text) {
  const c = Array.from(text);
  let a = 0;
  let b = c.length;
  while (a < b && PY_SPACE.has(c[a])) a++;
  while (b > a && PY_SPACE.has(c[b - 1])) b--;
  return c.slice(a, b).join("");
}

function lstripSpaces(line) {
  let i = 0;
  while (i < line.length && line[i] === " ") i++;
  return line.slice(i);
}

function rstripChars(line, chars) {
  let end = line.length;
  while (end > 0 && chars.includes(line[end - 1])) end--;
  return line.slice(0, end);
}

export function normaliseDigits(text) {
  let out = "";
  for (const char of text) {
    let index = PERSIAN_DIGITS.indexOf(char);
    if (index < 0) index = ARABIC_DIGITS.indexOf(char);
    out += index >= 0 ? ASCII_DIGITS[index] : char;
  }
  return out;
}

function fenceMarker(line) {
  const stripped = lstripSpaces(line);
  if (line.length - stripped.length > 3) return "";
  for (const mark of ["`", "~"]) {
    let count = 0;
    while (count < stripped.length && stripped[count] === mark) count++;
    if (count >= 3) return mark.repeat(count);
  }
  return "";
}

export function splitBlocks(text) {
  const blocks = [];
  const prose = [];
  let current = [];
  let opener = "";
  for (const line of text.split("\n")) {
    if (opener === "") {
      const mark = fenceMarker(line);
      if (mark !== "") {
        opener = mark;
        current = [pyStrip(line)];
      } else {
        prose.push(line);
      }
    } else {
      current.push(rstripChars(line, " \t"));
      const mark = fenceMarker(line);
      if (mark !== "" && mark[0] === opener[0] && mark.length >= opener.length && pyStrip(line) === mark) {
        blocks.push(current.join("\n"));
        current = [];
        opener = "";
      }
    }
  }
  if (opener !== "") blocks.push(current.join("\n"));
  return [blocks, prose.join("\n")];
}

export function splitInline(proseText) {
  const prose = Array.from(proseText);
  const spans = [];
  const rest = [];
  let i = 0;
  const n = prose.length;
  while (i < n) {
    if (prose[i] !== "`") {
      rest.push(prose[i]);
      i += 1;
      continue;
    }
    let run = 0;
    while (i + run < n && prose[i + run] === "`") run += 1;
    let close = -1;
    let j = i + run;
    while (j < n) {
      if (prose[j] === "`") {
        let k = 0;
        while (j + k < n && prose[j + k] === "`") k += 1;
        if (k === run) {
          close = j;
          break;
        }
        j += k;
      } else {
        j += 1;
      }
    }
    if (close < 0) {
      rest.push(prose.slice(i, i + run).join(""));
      i += run;
      continue;
    }
    spans.push(prose.slice(i + run, close).join(""));
    rest.push(" ");
    i = close + run;
  }
  return [spans, rest.join("")];
}

function startsAt(chars, i, word) {
  const w = Array.from(word);
  if (i + w.length > chars.length) return false;
  for (let k = 0; k < w.length; k++) if (chars[i + k] !== w[k]) return false;
  return true;
}

export function splitUrls(proseText) {
  const prose = Array.from(proseText);
  const urls = [];
  const rest = [];
  let i = 0;
  const n = prose.length;
  while (i < n) {
    if (startsAt(prose, i, "http://") || startsAt(prose, i, "https://")) {
      let j = i;
      while (j < n && !URL_STOP.includes(prose[j])) j += 1;
      let end = j;
      while (end > i && URL_TRIM.includes(prose[end - 1])) end -= 1;
      urls.push(prose.slice(i, end).join(""));
      rest.push(" ");
      rest.push(prose.slice(end, j).join(""));
      i = j;
    } else {
      rest.push(prose[i]);
      i += 1;
    }
  }
  return [urls, rest.join("")];
}

/** Separators inside one written number; see number_value in contracts/precheck.py. */
const NUM_SEPS = ".,\u066b\u066c'\u2019\u00a0\u202f";

function canonical(whole, frac) {
  let w = whole.replace(/^0+/, "");
  if (w === "") w = "0";
  const f = frac.replace(/0+$/, "");
  return w + (f !== "" ? "." + f : "");
}

function countOf(list, item) {
  return list.filter((x) => x === item).length;
}

/** One written number as its value, or as written when it is not a number (a version such as 0.6.0). */
export function numberValue(groups, seps) {
  let literal = groups[0];
  for (let i = 0; i < seps.length; i++) {
    let sep = seps[i];
    if (sep === "\u066b") sep = ".";
    else if (sep === "\u066c") sep = ",";
    literal += sep + groups[i + 1];
  }
  if (seps.length === 0) return canonical(groups[0], "");
  const last = seps[seps.length - 1];
  let decimalAt = -1;
  if (last === "\u066b") {
    if (countOf(seps, "\u066b") !== 1) return literal;
    decimalAt = seps.length - 1;
  } else if ((last === "." || last === ",") && countOf(seps, last) === 1) {
    if (seps.length > 1) decimalAt = seps.length - 1;
    else if (!(groups[1].length === 3 && groups[0].length >= 1 && groups[0].length <= 3)) decimalAt = 0;
  }
  const intEnd = decimalAt >= 0 ? decimalAt : seps.length;
  if (intEnd > 0) {
    if (groups[0].length < 1 || groups[0].length > 3) return literal;
    for (let i = 0; i < intEnd; i++) {
      if (seps[i] !== seps[0] || seps[i] === "\u066b" || groups[i + 1].length !== 3) return literal;
    }
  }
  const whole = groups.slice(0, intEnd + 1).join("");
  const frac = decimalAt >= 0 ? groups[decimalAt + 1] : "";
  return canonical(whole, frac);
}

/** Every number in the prose, by value, after digit normalisation. */
export function numbers(prose) {
  const text = Array.from(normaliseDigits(prose));
  const found = [];
  let i = 0;
  const n = text.length;
  const digit = (c) => ASCII_DIGITS.includes(c);
  while (i < n) {
    if (!digit(text[i])) {
      i += 1;
      continue;
    }
    const groups = [];
    const seps = [];
    let start = i;
    while (i < n && digit(text[i])) i += 1;
    groups.push(text.slice(start, i).join(""));
    while (i + 1 < n && NUM_SEPS.includes(text[i]) && digit(text[i + 1])) {
      seps.push(text[i]);
      i += 1;
      start = i;
      while (i < n && digit(text[i])) i += 1;
      groups.push(text.slice(start, i).join(""));
    }
    found.push(numberValue(groups, seps));
  }
  return found;
}

/** The level of every Markdown heading, in order. */
export function headings(prose) {
  const levels = [];
  for (const line of prose.split("\n")) {
    const stripped = lstripSpaces(line);
    if (line.length - stripped.length > 3) continue;
    let level = 0;
    while (level < stripped.length && stripped[level] === "#") level++;
    if (level >= 1 && level <= 6 && (stripped.length === level || stripped[level] === " ")) levels.push(level);
  }
  return levels;
}

/** Lines that open a list item, at any depth. */
export function listItems(prose) {
  let count = 0;
  for (const line of normaliseDigits(prose).split("\n")) {
    let k = 0;
    while (k < line.length && (line[k] === " " || line[k] === "\t")) k++;
    const stripped = line.slice(k);
    const two = stripped.slice(0, 2);
    if (two === "- " || two === "* " || two === "+ ") {
      count++;
      continue;
    }
    let digits = 0;
    while (digits < stripped.length && ASCII_DIGITS.includes(stripped[digits])) digits++;
    const after = stripped.slice(digits, digits + 2);
    if (digits >= 1 && digits <= 9 && (after === ". " || after === ") ")) count++;
  }
  return count;
}

/** Lines of a Markdown table, the separator row included. */
export function tableRows(prose) {
  let count = 0;
  for (const line of prose.split("\n")) if (lstripSpaces(line).startsWith("|")) count++;
  return count;
}

function headingProblem(srcHeads, outHeads) {
  if (srcHeads.length !== outHeads.length) {
    return `the source has ${srcHeads.length} heading${srcHeads.length === 1 ? "" : "s"}, the translation has ${outHeads.length}`;
  }
  for (let i = 0; i < srcHeads.length; i++) {
    if (srcHeads[i] !== outHeads[i]) return `heading ${i + 1} is ${"#".repeat(srcHeads[i])} in the source and ${"#".repeat(outHeads[i])} in the translation`;
  }
  return "";
}

function countProblem(name, src, out) {
  return src === out ? "" : `the source has ${src} ${name}${src === 1 ? "" : "s"}, the translation has ${out}`;
}

function counts(items) {
  const out = new Map();
  for (const item of items) out.set(item, (out.get(item) || 0) + 1);
  return out;
}

function difference(name, wanted, got, show) {
  const problems = [];
  const have = counts(got);
  const need = counts(wanted);
  let seen = new Set();
  for (const item of wanted) {
    if (!seen.has(item) && (have.get(item) || 0) < need.get(item)) {
      const missing = need.get(item) - (have.get(item) || 0);
      problems.push(`${name} ${show(item)} is missing${missing === 1 ? "" : ` ${missing} times`}`);
    }
    seen.add(item);
  }
  seen = new Set();
  for (const item of got) {
    if (!seen.has(item) && (need.get(item) || 0) < have.get(item)) {
      const extra = have.get(item) - (need.get(item) || 0);
      problems.push(`${name} ${show(item)} is not in the source${extra === 1 ? "" : ` (${extra} extra)`}`);
    }
    seen.add(item);
  }
  return problems;
}

/** Python's " ".join(text.split()). */
function collapse(text) {
  const parts = [];
  let current = "";
  for (const char of text) {
    if (PY_SPACE.has(char)) {
      if (current !== "") parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current !== "") parts.push(current);
  return parts.join(" ");
}

function quote(text) {
  let one = collapse(text);
  const chars = Array.from(one);
  if (chars.length > 40) one = chars.slice(0, 37).join("") + "...";
  return "`" + one + "`";
}

function ratioText(pct) {
  return `${Math.floor(pct / 100)}.${Math.floor((pct % 100) / 10)}${pct % 10}`;
}

/** Code-point length after Python-style strip, as the contract measures it. */
export function length(text) {
  return Array.from(pyStrip(text)).length;
}

/** Every exact difference, in the contract's order. An empty list means the translation may be judged. */
export function precheck(source, translation) {
  const problems = [];
  let [srcBlocks, srcProse] = splitBlocks(source);
  let [outBlocks, outProse] = splitBlocks(translation);
  if (srcBlocks.length !== outBlocks.length) {
    problems.push(
      `the source has ${srcBlocks.length} code block${srcBlocks.length === 1 ? "" : "s"}, the translation has ${outBlocks.length}`,
    );
  } else {
    for (let index = 0; index < srcBlocks.length; index++) {
      if (srcBlocks[index] !== outBlocks[index]) problems.push(`code block ${index + 1} differs from the source`);
    }
  }
  let srcSpans, outSpans, srcUrls, outUrls;
  [srcSpans, srcProse] = splitInline(srcProse);
  [outSpans, outProse] = splitInline(outProse);
  problems.push(...difference("inline code", srcSpans, outSpans, quote));
  [srcUrls, srcProse] = splitUrls(srcProse);
  [outUrls, outProse] = splitUrls(outProse);
  problems.push(...difference("link", srcUrls, outUrls, (x) => x));
  problems.push(...difference("number", numbers(srcProse), numbers(outProse), (x) => x));
  const heads = headingProblem(headings(srcProse), headings(outProse));
  if (heads) problems.push(heads);
  const items = countProblem("list item", listItems(srcProse), listItems(outProse));
  if (items) problems.push(items);
  const rows = countProblem("table row", tableRows(srcProse), tableRows(outProse));
  if (rows) problems.push(rows);
  const srcLen = length(source);
  const outLen = length(translation);
  if (srcLen > 0) {
    const pct = Math.floor((outLen * 100) / srcLen);
    if (outLen * 100 < MIN_RATIO_PCT * srcLen || outLen * 100 > MAX_RATIO_PCT * srcLen) {
      problems.push(
        `the translation is ${ratioText(pct)} times the length of the source, outside ${ratioText(MIN_RATIO_PCT)} to ${ratioText(MAX_RATIO_PCT)}`,
      );
    }
  }
  return problems;
}

/**
 * The checks one by one, for the editor's live panel. Each row says whether it
 * passes and what it found, using the same functions as precheck().
 */
export function checkRows(source, translation) {
  const [srcBlocks, srcProse0] = splitBlocks(source);
  const [outBlocks, outProse0] = splitBlocks(translation);
  const [srcSpans, srcProse1] = splitInline(srcProse0);
  const [outSpans, outProse1] = splitInline(outProse0);
  const [srcUrls, srcProse] = splitUrls(srcProse1);
  const [outUrls, outProse] = splitUrls(outProse1);
  const srcNums = numbers(srcProse);
  const outNums = numbers(outProse);
  const srcHeads = headings(srcProse);
  const outHeads = headings(outProse);
  const heads = headingProblem(srcHeads, outHeads);
  const srcItems = listItems(srcProse);
  const outItems = listItems(outProse);
  const srcRows = tableRows(srcProse);
  const outRows = tableRows(outProse);
  const srcLen = length(source);
  const outLen = length(translation);
  const pct = srcLen > 0 ? Math.floor((outLen * 100) / srcLen) : 0;
  const blocksOk = srcBlocks.length === outBlocks.length && srcBlocks.every((b, i) => b === outBlocks[i]);
  const inline = difference("inline code", srcSpans, outSpans, quote);
  const links = difference("link", srcUrls, outUrls, (x) => x);
  const nums = difference("number", srcNums, outNums, (x) => x);
  return [
    {
      key: "blocks",
      label: srcBlocks.length === 0 ? "No code blocks in the source" : "Code blocks identical",
      ok: blocksOk,
      detail: blocksOk ? `${srcBlocks.length} of ${srcBlocks.length}` : `${outBlocks.length} found, ${srcBlocks.length} in the source`,
    },
    {
      key: "inline",
      label: srcSpans.length === 0 ? "No inline code in the source" : "Inline code identical",
      ok: inline.length === 0,
      detail: inline.length === 0 ? `${srcSpans.length} span${srcSpans.length === 1 ? "" : "s"}` : inline.join("; "),
    },
    {
      key: "links",
      label: srcUrls.length === 0 ? "No links in source" : "Links identical",
      ok: links.length === 0,
      detail: links.length === 0 ? `${srcUrls.length} link${srcUrls.length === 1 ? "" : "s"}` : links.join("; "),
    },
    {
      key: "numbers",
      label: "Numbers match",
      ok: nums.length === 0,
      detail: nums.length === 0 ? (srcNums.length ? srcNums.join(", ") : "none in the source") : nums.join("; "),
    },
    {
      key: "headings",
      label: srcHeads.length ? `Headings: ${outHeads.length} of ${srcHeads.length}, same levels` : "No headings in the source",
      ok: heads === "",
      detail: heads || (srcHeads.length ? srcHeads.map((l) => "#".repeat(l)).join(" ") : ""),
    },
    {
      key: "lists",
      label: srcItems ? `List items: ${outItems} of ${srcItems}` : "No list items in the source",
      ok: srcItems === outItems,
      detail: srcItems === outItems ? "" : `the source has ${srcItems}`,
    },
    {
      key: "tables",
      label: srcRows ? `Table rows: ${outRows} of ${srcRows}` : "No tables in the source",
      ok: srcRows === outRows,
      detail: srcRows === outRows ? "" : `the source has ${srcRows}`,
    },
    {
      key: "length",
      label: `Length ratio ${ratioText(pct)}`,
      ok: srcLen > 0 && outLen * 100 >= MIN_RATIO_PCT * srcLen && outLen * 100 <= MAX_RATIO_PCT * srcLen,
      detail: `between ${ratioText(MIN_RATIO_PCT)} and ${ratioText(MAX_RATIO_PCT)}`,
    },
  ];
}
