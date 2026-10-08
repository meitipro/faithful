#!/usr/bin/env python3
"""
Add the FAQ answers of the docs to the seeded program, and top up its pool, so
reviewers find open sections in every language.

    python scripts/seed_faq.py

The sections are cut from web/content/docs/more/faq.mdx by the same importer as
the site's form (scripts/import_markdown.py), and only the questions are kept:
the "FAQ" and "Changelog" headings and the changelog entry are not docs to
translate, and "Which network?" is already section 16. Sent as the seed's
maintainer, recorded in docs/seed.studio-next.json under "faq" before printing.
"""

from __future__ import annotations

import json
import sys

import chain as C
import import_markdown as I
import seed as S

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

KEEP = ["Which languages?", "Can I use machine translation?", "What about style?", "Who pays the fees?", "Why is my claim still shown as claimed after 48 hours?"]
TOP_UP_GEN = 200


def main() -> int:
    record = S.load()
    pid = record["program_id"]
    address = C.address()
    who = C.accounts("seed_maintainer")["seed_maintainer"]
    chain = C.Chain(who)
    chain.ensure(who.address, minimum_gen=TOP_UP_GEN + 20, top_up_gen=1000)
    faq = record.setdefault("faq", {})
    if "sections_tx" not in faq:
        cut = I.split_sections((C.ROOT / "web" / "content" / "docs" / "more" / "faq.mdx").read_text(encoding="utf-8"))
        rows = [{"title": s["title"], "text": s["text"]} for s in cut if s["title"] in KEEP]
        assert [r["title"] for r in rows] == KEEP, [r["title"] for r in rows]
        out = chain.send(address, "add_sections", [pid, json.dumps(rows, ensure_ascii=False)])
        if not out["ok"]:
            raise SystemExit(f"add_sections failed: {out['detail']}")
        faq.update({"sections_tx": out["hash"], "first_section": int(out["result"]), "titles": KEEP})
        S.save(record)
        S.say(f"added {len(rows)} FAQ sections from {out['result']}  {C.EXPLORER}/tx/{out['hash']}")
    if "fund_tx" not in faq:
        out = chain.send(address, "fund", [pid], value=TOP_UP_GEN * C.GEN)
        if not out["ok"]:
            raise SystemExit(f"fund failed: {out['detail']}")
        faq.update({"fund_tx": out["hash"], "funded_gen": TOP_UP_GEN})
        S.save(record)
        S.say(f"topped up program {pid} with {TOP_UP_GEN} GEN  {C.EXPLORER}/tx/{out['hash']}")
    p = chain.read_json(address, "get_program", [pid])
    S.say(f"program {pid}: {p['sections']} sections, pool {int(p['pool']) / C.GEN} GEN, enough for {p['payable_sections']} more")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
