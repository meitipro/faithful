"""
Count the characters of the portal fields and the X post, exactly as they will be pasted.

    python submission/count.py
"""

import pathlib
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = pathlib.Path(__file__).resolve().parent
LIMITS = {"One-liner": None, "Description": 1000, "Steward note": 500}


def sections(text: str) -> dict:
    out = {}
    name = None
    for line in text.split("\n"):
        if line.startswith("## "):
            name = line[3:].strip()
            out[name] = []
        elif name:
            out[name].append(line)
    return {k: "\n".join(v).strip() for k, v in out.items()}


portal = sections((HERE / "portal.md").read_text(encoding="utf-8"))
failed = False
for name, limit in LIMITS.items():
    n = len(portal[name])
    ok = limit is None or n <= limit
    failed |= not ok
    print(f"{name}: {n} characters" + (f" (limit {limit})" if limit else "") + ("" if ok else "  OVER"))
post = (HERE / "x-post.md").read_text(encoding="utf-8").split("\n", 2)[2].strip()
print(f"X post: {len(post)} characters (limit 280)")
failed |= len(post) > 280
raise SystemExit(1 if failed else 0)
