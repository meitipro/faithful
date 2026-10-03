"""
The exact pre-checks, as pure code.

A translation is compared with its source before any model runs. Code blocks,
inline code, links, numbers and headings are things a reader of technical docs
relies on character for character, so they are compared by code, never judged:

  - every fenced code block identical, in order
  - every inline code span identical (in any order: word order moves between
    languages, and inline code moves with it)
  - every http(s) link identical (in any order, for the same reason)
  - the same multiset of numbers, after Persian and Arabic-Indic digits are
    converted to ASCII
  - the same number of Markdown headings
  - a length ratio between 0.4 and 2.5

This file is the source of truth. The block between the precheck markers in
contracts/faithful.py is this file's body, byte for byte (scripts/gen_precheck.py
writes it, and a test holds the two together), and web/lib/precheck.mjs is the
editor's port, held to the same cases in tests/precheck_cases.json.

No regular expressions and no floats, so the TypeScript port can follow it
line by line and every validator computes the same answer.
"""

# --- precheck begin ---
PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"
ASCII_DIGITS = "0123456789"
#: Where a link ends. Trailing sentence punctuation is trimmed afterwards.
URL_STOP = " \t\n()[]<>\"'`"
URL_TRIM = ".,;:!?،؛"
MIN_RATIO_PCT = 40
MAX_RATIO_PCT = 250


def normalise_digits(text: str) -> str:
    """Persian (U+06F0..U+06F9) and Arabic-Indic (U+0660..U+0669) digits as ASCII."""
    out = []
    for char in text:
        index = PERSIAN_DIGITS.find(char)
        if index < 0:
            index = ARABIC_DIGITS.find(char)
        out.append(ASCII_DIGITS[index] if index >= 0 else char)
    return "".join(out)


def _fence_marker(line: str) -> str:
    """The fence a line opens or closes (``` or ~~~, three or more), or ""."""
    stripped = line.lstrip(" ")
    if len(line) - len(stripped) > 3:
        return ""
    for mark in ("`", "~"):
        count = 0
        while count < len(stripped) and stripped[count] == mark:
            count += 1
        if count >= 3:
            return mark * count
    return ""


def split_blocks(text: str) -> list:
    """[fenced code blocks, in order], and the prose outside them as one string."""
    blocks = []
    prose = []
    current = []
    opener = ""
    for line in text.split("\n"):
        if opener == "":
            mark = _fence_marker(line)
            if mark != "":
                opener = mark
                current = [line.strip()]
            else:
                prose.append(line)
        else:
            current.append(line.rstrip(" \t"))
            mark = _fence_marker(line)
            if mark != "" and mark[0] == opener[0] and len(mark) >= len(opener) and line.strip() == mark:
                blocks.append("\n".join(current))
                current = []
                opener = ""
    if opener != "":
        blocks.append("\n".join(current))
    return [blocks, "\n".join(prose)]


def split_inline(prose: str) -> list:
    """[inline code spans], and the prose with them removed. An unclosed run of backticks is plain text."""
    spans = []
    rest = []
    i = 0
    n = len(prose)
    while i < n:
        if prose[i] != "`":
            rest.append(prose[i])
            i += 1
            continue
        run = 0
        while i + run < n and prose[i + run] == "`":
            run += 1
        close = -1
        j = i + run
        while j < n:
            if prose[j] == "`":
                k = 0
                while j + k < n and prose[j + k] == "`":
                    k += 1
                if k == run:
                    close = j
                    break
                j += k
            else:
                j += 1
        if close < 0:
            rest.append(prose[i : i + run])
            i += run
            continue
        spans.append(prose[i + run : close])
        rest.append(" ")
        i = close + run
    return [spans, "".join(rest)]


def split_urls(prose: str) -> list:
    """[http and https links], and the prose with them removed."""
    urls = []
    rest = []
    i = 0
    n = len(prose)
    while i < n:
        if prose.startswith("http://", i) or prose.startswith("https://", i):
            j = i
            while j < n and URL_STOP.find(prose[j]) < 0:
                j += 1
            end = j
            while end > i and URL_TRIM.find(prose[end - 1]) >= 0:
                end -= 1
            urls.append(prose[i:end])
            rest.append(" ")
            rest.append(prose[end:j])
            i = j
        else:
            rest.append(prose[i])
            i += 1
    return [urls, "".join(rest)]


def numbers(prose: str) -> list:
    """Every run of digits, after digit normalisation. 2,500 and 2.500 and ۲٬۵۰۰ all read as 2 and 500."""
    found = []
    current = []
    for char in normalise_digits(prose) + " ":
        if ASCII_DIGITS.find(char) >= 0:
            current.append(char)
        elif len(current) > 0:
            found.append("".join(current))
            current = []
    return found


def headings(prose: str) -> int:
    count = 0
    for line in prose.split("\n"):
        stripped = line.lstrip(" ")
        if len(line) - len(stripped) > 3:
            continue
        level = 0
        while level < len(stripped) and stripped[level] == "#":
            level += 1
        if 1 <= level <= 6 and (len(stripped) == level or stripped[level] == " "):
            count += 1
    return count


def _counts(items: list) -> dict:
    out = {}
    for item in items:
        out[item] = out.get(item, 0) + 1
    return out


def _difference(name: str, wanted: list, got: list, show) -> list:
    """Problems for a multiset that must match: what is missing first, then what was added, each in first-seen order."""
    problems = []
    have = _counts(got)
    need = _counts(wanted)
    seen = {}
    for item in wanted:
        if seen.get(item, 0) == 0 and have.get(item, 0) < need[item]:
            missing = need[item] - have.get(item, 0)
            problems.append(name + " " + show(item) + " is missing" + ("" if missing == 1 else " " + str(missing) + " times"))
        seen[item] = 1
    seen = {}
    for item in got:
        if seen.get(item, 0) == 0 and need.get(item, 0) < have[item]:
            extra = have[item] - need.get(item, 0)
            problems.append(name + " " + show(item) + " is not in the source" + ("" if extra == 1 else " (" + str(extra) + " extra)"))
        seen[item] = 1
    return problems


def _quote(text: str) -> str:
    one = " ".join(text.split())
    if len(one) > 40:
        one = one[:37] + "..."
    return "`" + one + "`"


def _plain(text: str) -> str:
    return text


def _ratio_text(pct: int) -> str:
    return str(pct // 100) + "." + str(pct % 100 // 10) + str(pct % 10)


def precheck(source: str, translation: str) -> list:
    """
    Every exact difference between a source section and a translation, in a
    fixed order: code blocks, inline code, links, numbers, headings, length.
    An empty list means the translation may be judged.
    """
    problems = []
    src_blocks, src_prose = split_blocks(source)
    out_blocks, out_prose = split_blocks(translation)
    if len(src_blocks) != len(out_blocks):
        problems.append(
            "the source has " + str(len(src_blocks)) + " code block" + ("" if len(src_blocks) == 1 else "s")
            + ", the translation has " + str(len(out_blocks))
        )
    else:
        for index in range(len(src_blocks)):
            if src_blocks[index] != out_blocks[index]:
                problems.append("code block " + str(index + 1) + " differs from the source")
    src_spans, src_prose = split_inline(src_prose)
    out_spans, out_prose = split_inline(out_prose)
    problems.extend(_difference("inline code", src_spans, out_spans, _quote))
    src_urls, src_prose = split_urls(src_prose)
    out_urls, out_prose = split_urls(out_prose)
    problems.extend(_difference("link", src_urls, out_urls, _plain))
    problems.extend(_difference("number", numbers(src_prose), numbers(out_prose), _plain))
    src_heads = headings(src_prose)
    out_heads = headings(out_prose)
    if src_heads != out_heads:
        problems.append(
            "the source has " + str(src_heads) + " heading" + ("" if src_heads == 1 else "s")
            + ", the translation has " + str(out_heads)
        )
    src_len = len(source.strip())
    out_len = len(translation.strip())
    if src_len > 0:
        pct = out_len * 100 // src_len
        if out_len * 100 < MIN_RATIO_PCT * src_len or out_len * 100 > MAX_RATIO_PCT * src_len:
            problems.append(
                "the translation is " + _ratio_text(pct) + " times the length of the source, outside "
                + _ratio_text(MIN_RATIO_PCT) + " to " + _ratio_text(MAX_RATIO_PCT)
            )
    return problems
# --- precheck end ---
