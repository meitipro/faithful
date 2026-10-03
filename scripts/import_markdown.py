#!/usr/bin/env python3
"""
Split a Markdown docs file into sections and add them to a program.

    python scripts/import_markdown.py docs.md                 # print the sections it would add
    python scripts/import_markdown.py docs.md --program 3     # add them as that program's maintainer

Sections are cut at headings (#, ## and ###) first and then at blank lines, so
each holds at most 2,500 characters, and never inside a code block. Front matter
and top-level MDX import/export lines are dropped. The rules are the same as
web/lib/markdown.mjs, which the site's "Start a program" form uses;
tests/test_import.py holds the two to the same output.

Adding sends add_sections in batches of twenty from the local account named by
--account (default "maintainer", in ~/.faithful/accounts.json), which must be
the program's maintainer.
"""

from __future__ import annotations

import json
import pathlib
import re
import sys

MAX_SECTION = 2500
MAX_TITLE = 80
BATCH = 20


def fence_of(line: str) -> str:
    stripped = line.lstrip(" ")
    if len(line) - len(stripped) > 3:
        return ""
    match = re.match(r"(`{3,}|~{3,})", stripped)
    return match.group(1) if match else ""


def heading_of(line: str):
    match = re.match(r"^ {0,3}(#{1,3}) +(.*?)\s*#*\s*$", line)
    return match.group(2).strip() if match else None


def cut(title: str) -> str:
    t = title.strip() or "Untitled section"
    return t[: MAX_TITLE - 3] + "..." if len(t) > MAX_TITLE else t


def closes(line: str, fence: str) -> bool:
    f = fence_of(line)
    return bool(f) and f[0] == fence[0] and len(f) >= len(fence) and line.strip() == f


def clean(text: str) -> str:
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    if lines and lines[0] == "---" and "---" in lines[1:]:
        lines = lines[lines.index("---", 1) + 1 :]
    out = []
    fence = ""
    for line in lines:
        f = fence_of(line)
        if fence:
            out.append(line)
            if closes(line, fence):
                fence = ""
            continue
        if f:
            fence = f
            out.append(line)
            continue
        if re.match(r"^(import|export) ", line):
            continue
        out.append(line)
    return "\n".join(out)


def blocks(text: str) -> list:
    out = []
    current = []
    fence = ""
    for line in text.split("\n"):
        f = fence_of(line)
        if fence:
            current.append(line)
            if closes(line, fence):
                fence = ""
            continue
        if f:
            fence = f
        if not fence and line.strip() == "":
            if current:
                out.append("\n".join(current))
            current = []
            continue
        current.append(line)
    if current:
        out.append("\n".join(current))
    return out


def split_sections(markdown: str) -> list:
    text = clean(markdown)
    chunks = []
    current = []
    title = ""
    fence = ""
    for line in text.split("\n"):
        f = fence_of(line)
        if fence:
            current.append(line)
            if closes(line, fence):
                fence = ""
            continue
        if f:
            fence = f
        heading = None if fence else heading_of(line)
        if heading is not None:
            if "\n".join(current).strip():
                chunks.append({"title": title, "text": "\n".join(current).strip()})
            current = [line]
            title = heading
            continue
        current.append(line)
    if "\n".join(current).strip():
        chunks.append({"title": title, "text": "\n".join(current).strip()})
    out = []
    for chunk in chunks:
        first = chunk["title"] or next((l.strip() for l in chunk["text"].split("\n") if l.strip()), "")
        if len(chunk["text"]) <= MAX_SECTION:
            out.append({"title": cut(first), "text": chunk["text"], "tooLong": False})
            continue
        part = ""
        n = 0
        for block in blocks(chunk["text"]):
            if part and len(part) + 2 + len(block) > MAX_SECTION:
                out.append({"title": cut(first if n == 0 else f"{first} ({n + 1})"), "text": part, "tooLong": len(part) > MAX_SECTION})
                n += 1
                part = ""
            part = part + "\n\n" + block if part else block
        if part:
            out.append({"title": cut(first if n == 0 else f"{first} ({n + 1})"), "text": part, "tooLong": len(part) > MAX_SECTION})
    return out


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        return 2
    sections = split_sections(pathlib.Path(args[0]).read_text(encoding="utf-8"))
    for i, s in enumerate(sections, 1):
        print(f"{i:3}  {len(s['text']):5} chars  {'TOO LONG  ' if s['tooLong'] else ''}{s['title']}")
    if any(s["tooLong"] for s in sections):
        print("a block is longer than 2,500 characters on its own; shorten it before importing")
        return 1
    if "--program" not in sys.argv:
        return 0
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    import chain as C

    program = int(sys.argv[sys.argv.index("--program") + 1])
    name = sys.argv[sys.argv.index("--account") + 1] if "--account" in sys.argv else "maintainer"
    account = C.accounts(name)[name]
    client = C.Chain(account)
    for start in range(0, len(sections), BATCH):
        batch = [{"title": s["title"], "text": s["text"]} for s in sections[start : start + BATCH]]
        outcome = client.send(C.address(), "add_sections", [program, json.dumps(batch, ensure_ascii=False)])
        if not outcome["ok"]:
            print(f"add_sections refused: {outcome['detail']}")
            return 1
        print(f"added {len(batch)} sections from id {outcome['result']}  {C.EXPLORER}/tx/{outcome['hash']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
