#!/usr/bin/env python3
"""
Copy the exact pre-checks from contracts/precheck.py into contracts/faithful.py.

    python scripts/gen_precheck.py           # write the block
    python scripts/gen_precheck.py --check   # exit 1 if the two differ

GenVM runs one file, so the contract carries its own copy of the pre-checks.
contracts/precheck.py is the source of truth and the file the editor's port is
tested against; this script makes the contract's copy byte for byte the same,
and tests/test_static.py runs --check so the two cannot drift.
"""

from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / "contracts" / "precheck.py"
TARGET = ROOT / "contracts" / "faithful.py"
BEGIN = "# --- precheck begin ---\n"
END = "# --- precheck end ---\n"


def block(text: str) -> str:
    start = text.index(BEGIN)
    end = text.index(END, start)
    return text[start : end + len(END)]


def main() -> int:
    source = SOURCE.read_text(encoding="utf-8")
    target = TARGET.read_text(encoding="utf-8")
    wanted = block(source)
    have = block(target)
    if "--check" in sys.argv:
        if have != wanted:
            print("contracts/faithful.py carries a different copy of the pre-checks; run python scripts/gen_precheck.py")
            return 1
        print("the contract's pre-checks are contracts/precheck.py, byte for byte")
        return 0
    TARGET.write_text(target.replace(have, wanted), encoding="utf-8", newline="\n")
    print("wrote the pre-checks into contracts/faithful.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
