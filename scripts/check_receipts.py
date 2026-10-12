#!/usr/bin/env python3
"""
Read transactions back from Studio Next and say, for each, what GenVM did.

    python scripts/check_receipts.py <tx hash> [<tx hash> ...]
    python scripts/check_receipts.py --walk docs/ui-walk.studio-next.json

For every hash: the consensus status (ACCEPTED or FINALIZED), the leader's
GenVM execution result (SUCCESS, or an error), the result kind (return, or a
refusal with its sentence), what the method returned, and the fee accounting's
state. A transaction counts as a success only when all of them say so: a
refusal is ACCEPTED too, so status alone proves nothing. With --walk, the
hashes come from a UI walk record and the table is written back into it.
"""

from __future__ import annotations

import json
import pathlib
import sys

import chain as C

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def inspect(chain: C.Chain, tx: str) -> dict:
    receipt = C.retry("receipt", chain.client.wait_for_transaction_receipt, transaction_hash=tx, wait_until="finalized", interval=5000, retries=60, full_transaction=True)
    outcome = C.check(receipt)
    leader = C._leader(receipt)
    raw = chain.client.provider.make_request(method="eth_getTransactionByHash", params=[tx]).get("result") or {}
    fees = (raw.get("data") or {}).get("fee_accounting") or {}
    result = leader.get("result") or {}
    return {
        "tx": tx,
        "status": outcome["status"],
        "execution": str(leader.get("execution_result", "")).upper(),
        "result": str(result.get("status", "")).lower() if isinstance(result, dict) else "",
        "returned": outcome["result"],
        "refusal": outcome["refusal"],
        "ok": outcome["ok"],
        "fees": fees.get("status", ""),
    }


def main() -> int:
    args = sys.argv[1:]
    record_path = None
    labels: dict[str, str] = {}
    if args[:1] == ["--walk"]:
        record_path = C.ROOT / args[1]
        record = json.loads(record_path.read_text(encoding="utf-8"))
        hashes = [s["tx"] for s in record["steps"] if s.get("tx")]
        labels = {s["tx"]: s["label"] for s in record["steps"] if s.get("tx")}
    else:
        hashes = args
    chain = C.Chain()
    rows = []
    for tx in hashes:
        row = inspect(chain, tx)
        row["label"] = labels.get(tx, "")
        rows.append(row)
        print(f"{row['label'][:28]:28} {tx[:12]}… {row['status']:9} {row['execution']:8} {row['result']:9} {json.dumps(row['returned'], ensure_ascii=False)[:30]:30} fees {row['fees']}")
    if record_path:
        record["receipts"] = rows
        record_path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    bad = [r for r in rows if not r["ok"] and not r.get("label", "").startswith("refused:")]
    print(f"\n{len(rows) - len(bad)} of {len(rows)} as expected")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
