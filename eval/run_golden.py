#!/usr/bin/env python3
"""
Run the golden cases through the deployed Faithful contract on Studio Next,
through real consensus, and publish what came out.

    python eval/run_golden.py              # the ten golden cases
    python eval/run_golden.py H1 H2 H3     # the held-out cases, once
    python eval/run_golden.py --report     # rewrite results.md from results.json

eval/golden.json was written, hashed and timestamped (eval/golden.lock.json)
before the first run, and this script refuses to run if it has changed since.
All cases live in one program opened by the "golden_maintainer" account, one
section per case. Each case is claimed and submitted by one of the local
accounts golden_translator_1 to _5 from its own account; the maintainer then
calls judge, so every verdict below is the real judge on the real contract,
and is read back from the contract with get_section. Cases 8 and 9 stop at
submit: the exact checks refuse them and no judge runs.

Every step is saved before anything is printed, so a run can stop at any point
and resume without sending anything twice. H1 to H3 are held out: run once,
reported as they came out, never used to tune the prompt. A judge whose round
produced no verdict (the committee timed out or could not agree) may be sent
again, and every attempt stays in the record. A case that produced a verdict is
never sent again, whatever the verdict was.
"""

from __future__ import annotations

import ast
import datetime
import hashlib
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "scripts"))

import chain as C  # noqa: E402

# A model's reason can carry any character; the Windows console codepage cannot.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = pathlib.Path(__file__).resolve().parent
GOLDEN = HERE / "golden.json"
LOCK = HERE / "golden.lock.json"
RESULTS = HERE / "results.json"
REPORT = HERE / "results.md"
MAINTAINER = "golden_maintainer"
TRANSLATORS = [f"golden_translator_{i}" for i in range(1, 6)]
FINAL = ("FAITHFUL", "FLAWED", "WRONG_LANGUAGE", "PRECHECK_FAILED")


def judge_sha() -> str:
    tree = ast.parse(C.CONTRACT_FILE.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and ast.unparse(node.targets[0]) == "JUDGE":
            return hashlib.sha256(ast.literal_eval(node.value).encode("utf-8")).hexdigest()
    raise SystemExit("no JUDGE constant")


def now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_results() -> dict:
    if RESULTS.exists():
        return json.loads(RESULTS.read_text(encoding="utf-8"))
    return {"program": {}, "cases": {}, "attempts": []}


def save(results: dict) -> None:
    RESULTS.write_text(json.dumps(results, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")


def finished(results: dict, case_id: str) -> bool:
    return any(a["case"] == case_id and a.get("verdict") in FINAL for a in results["attempts"])


def must(outcome: dict, what: str) -> dict:
    if not outcome["ok"]:
        raise SystemExit(f"{what} failed: {outcome['detail']}  {C.EXPLORER}/tx/{outcome['hash']}")
    return outcome


def matches(attempt: dict) -> bool:
    want = attempt["expected"]
    got = attempt.get("verdict", "")
    if want == "EITHER":
        return got in ("FAITHFUL", "FLAWED")
    return got == want


def open_program(golden: dict, results: dict, address: str, maintainer: C.Chain) -> dict:
    row = results["program"]
    spec = golden["program"]
    if "program_id" not in row:
        before = maintainer.read_json(address, "get_program", [0])["programs"]
        args = [spec["name"], spec["src_lang"], spec["langs"], json.dumps(spec["glossary"], ensure_ascii=False), spec["rate_gen"] * C.GEN]
        outcome = must(maintainer.send(address, "create_program", args, value=spec["funding_gen"] * C.GEN), "create_program")
        pid = outcome["result"] if isinstance(outcome["result"], int) else None
        if not pid:
            after = maintainer.read_json(address, "get_program", [0])["programs"]
            pid = after if after > before else None
        if not pid:
            raise SystemExit("create_program returned no program id")
        row.update({"program_id": int(pid), "create_tx": outcome["hash"]})
        save(results)
        print(f"opened program {pid}  {C.EXPLORER}/tx/{outcome['hash']}")
    if "first_section" not in row:
        texts = [{"title": f"Case {c['id']}", "text": c["source"]} for c in golden["cases"]]
        outcome = must(maintainer.send(address, "add_sections", [row["program_id"], json.dumps(texts, ensure_ascii=False)]), "add_sections")
        first = outcome["result"] if isinstance(outcome["result"], int) else None
        if not first:
            board = maintainer.read_json(address, "list_sections", [row["program_id"], "", "", 0, 1])
            first = board["items"][0]["id"] if board.get("items") else None
        if not first:
            raise SystemExit("add_sections returned no section id")
        row.update({"first_section": int(first), "sections_tx": outcome["hash"]})
        save(results)
        print(f"added {len(texts)} sections from {first}  {C.EXPLORER}/tx/{outcome['hash']}")
    return row


def latest_submission(chain: C.Chain, address: str, section_id: int, lang: str) -> dict:
    section = C.retry("get_section", chain.read_json, address, "get_section", [section_id])
    for sub in section["submissions"]:
        if sub["lang"] == lang:
            return sub
    raise SystemExit(f"no submission on section {section_id} in {lang}")


def run_case(case: dict, index: int, results: dict, address: str, program: dict, maintainer: C.Chain, translators: dict) -> None:
    cid = case["id"]
    name = TRANSLATORS[index % len(TRANSLATORS)]
    who = translators[name]
    section_id = program["first_section"] + index
    row = results["cases"].setdefault(cid, {"section_id": section_id, "lang": case["lang"], "translator": who.account.address})
    if "claim_tx" not in row:
        outcome = must(who.send(address, "claim", [section_id, case["lang"]]), f"claim for case {cid}")
        row["claim_tx"] = outcome["hash"]
        save(results)
        print(f"  claimed section {section_id} in {case['lang']}  {C.EXPLORER}/tx/{outcome['hash']}")
    if "submission_id" not in row:
        outcome = must(who.send(address, "submit", [section_id, case["lang"], case["translation"]]), f"submit for case {cid}")
        sub = latest_submission(maintainer, address, section_id, case["lang"])
        row.update({"submit_tx": outcome["hash"], "submission_id": sub["id"], "after_submit": sub["verdict"], "problems": sub["problems"]})
        save(results)
        print(f"  submitted as {sub['id']}: {sub['verdict']}  {C.EXPLORER}/tx/{outcome['hash']}")
    tries = sum(1 for a in results["attempts"] if a["case"] == cid)
    attempt = {
        "case": cid,
        "attempt": tries + 1,
        "held_out": bool(case.get("held_out")),
        "expected": case["expected"],
        "section_id": section_id,
        "lang": case["lang"],
        "submission_id": row["submission_id"],
    }
    if row["after_submit"] == "PRECHECK_FAILED":
        attempt.update({"verdict": "PRECHECK_FAILED", "judged": False, "reason": "", "problems": row["problems"], "tx": row["submit_tx"], "consensus": "no judge"})
    else:
        outcome = maintainer.send(address, "judge", [row["submission_id"]])
        attempt.update({"tx": outcome["hash"], "sent_at": now_iso(), "consensus": "decided" if outcome["ok"] else outcome["detail"], "judged": True})
        sub = latest_submission(maintainer, address, section_id, case["lang"])
        if sub["id"] == row["submission_id"] and sub["verdict"] in FINAL:
            attempt.update({"verdict": sub["verdict"], "reason": sub["reason"], "credited": sub["credited"], "judged_at": sub["judged_at"]})
    # Saved before anything is printed: a result that exists on chain must
    # never be lost to a failure on this side of the wire.
    results["attempts"].append(attempt)
    save(results)
    if attempt.get("verdict"):
        print(f"  {'MATCH' if matches(attempt) else 'MISS '} {attempt['verdict']}  {attempt.get('reason') or '; '.join(attempt.get('problems', []))}")
    else:
        print(f"  no verdict: {attempt['consensus']}")
    print(f"  {C.EXPLORER}/tx/{attempt['tx']}")


def run(ids: list[str]) -> None:
    lock = json.loads(LOCK.read_text(encoding="utf-8"))
    if C.sha256_file(GOLDEN) != lock["sha256"]:
        raise SystemExit("eval/golden.json changed after it was locked; the golden set is not edited after the first run")
    golden = json.loads(GOLDEN.read_text(encoding="utf-8"))
    address = C.address()
    people = C.accounts(MAINTAINER, *TRANSLATORS)
    maintainer = C.Chain(people[MAINTAINER])
    translators = {name: C.Chain(people[name]) for name in TRANSLATORS}
    results = load_results()
    results.update(
        {
            "contract": address,
            "contract_sha256": C.deployment().get("faithful_sha256"),
            "golden_sha256": lock["sha256"],
            "golden_locked_at": lock["locked_at"],
            "judge_sha256": judge_sha(),
            "network": C.NETWORK,
            "explorer": C.EXPLORER,
            "maintainer": people[MAINTAINER].address,
            "translators": [people[name].address for name in TRANSLATORS],
        }
    )
    save(results)
    wanted = ids or [c["id"] for c in golden["cases"] if not c.get("held_out")]
    todo = [(i, c) for i, c in enumerate(golden["cases"]) if c["id"] in wanted and not finished(results, c["id"])]
    if todo:
        maintainer.ensure(people[MAINTAINER].address, minimum_gen=golden["program"]["funding_gen"] + 50, top_up_gen=1000)
        for name in TRANSLATORS:
            translators[name].ensure(people[name].address, minimum_gen=20)
        program = open_program(golden, results, address, maintainer)
    for index, case in todo:
        print(f"\n{case['id']} {case['title']} (expected {case['expected']})")
        run_case(case, index, results, address, results["program"], maintainer, translators)
    report()


def report() -> None:
    results = load_results()
    golden = json.loads(GOLDEN.read_text(encoding="utf-8"))
    final: dict[str, dict] = {}
    for attempt in results["attempts"]:
        if attempt.get("verdict") in FINAL:
            final[attempt["case"]] = attempt

    def score(held: bool) -> tuple[int, int]:
        rows = [a for a in final.values() if a["held_out"] == held]
        return sum(1 for a in rows if matches(a)), len(rows)

    g_hit, g_n = score(False)
    h_hit, h_n = score(True)
    explorer = results.get("explorer", C.EXPLORER)
    contract = results.get("contract", "")
    program = results.get("program", {})
    lines = [
        "# Golden cases, through real consensus",
        "",
        f"Contract [`{contract}`]({explorer}/address/{contract}) on Studio Next (chain 61997), program "
        f"{program.get('program_id', '?')}. Every row is one section of that program: a translator claimed it and "
        "submitted from their own account, the exact checks ran in `submit`, and for every submission that passed them "
        "one `judge` transaction asked the validators. The verdict is read back from the contract with `get_section`, "
        "not from the script's memory.",
        "",
        f"- Golden set: **{g_hit} of {g_n}** matched.",
        f"- Held-out cases: **{h_hit} of {h_n}** matched (H2 and H3 have no expected answer; FAITHFUL or FLAWED both count).",
        f"- `eval/golden.json` sha256 `{results.get('golden_sha256', '')}`, locked at {results.get('golden_locked_at', '')}, before the first run.",
        f"- Judge prompt sha256 `{results.get('judge_sha256', '')}`.",
        "",
        "Nothing here was tuned. The prompt is the spec's, word for word, and no case was edited after the lock.",
        "",
        "| Case | What it tests | Lang | Expected | Got | Reason (the leader's, display only) or exact difference | Transaction |",
        "|---|---|---|---|---|---|---|",
    ]
    for case in golden["cases"]:
        cid = case["id"]
        a = final.get(cid)
        tag = f"{cid}{' (held out)' if case.get('held_out') else ''}"
        title = case["title"].replace("|", "/")
        if not a:
            lines.append(f"| {tag} | {title} | {case['lang']} | {case['expected']} | not run yet | | |")
            continue
        got = a["verdict"] + ("" if a["judged"] else " (no judge)")
        mark = "✓" if matches(a) else "✗ miss"
        reason = (a.get("reason") or "; ".join(a.get("problems", []))).replace("|", "/")
        tx = a["tx"]
        lines.append(f"| {tag} | {title} | {case['lang']} | {case['expected']} | {got} {mark} | {reason} | [{tx[:10]}…]({explorer}/tx/{tx}) |")
    others = [a for a in results["attempts"] if a.get("verdict") not in FINAL]
    lines += ["", "## Every attempt", ""]
    if others:
        lines.append("Judge transactions whose round produced no verdict, each sent again as the next attempt:")
        lines.append("")
        for a in others:
            lines.append(f"- case {a['case']} attempt {a['attempt']}: {a['consensus'][:200]} ([tx]({explorer}/tx/{a['tx']}))")
    else:
        lines.append("Every judge produced a verdict on its first attempt; nothing was sent twice.")
    lines += ["", "## The program and the claims", ""]
    if program.get("create_tx"):
        lines.append(f"- program {program['program_id']} opened in [{program['create_tx'][:10]}…]({explorer}/tx/{program['create_tx']}); sections added in [{program['sections_tx'][:10]}…]({explorer}/tx/{program['sections_tx']})")
    for case in golden["cases"]:
        row = results.get("cases", {}).get(case["id"])
        if not row or "submit_tx" not in row:
            continue
        lines.append(
            f"- case {case['id']}: section {row['section_id']} in {row['lang']}, claimed in "
            f"[{row['claim_tx'][:10]}…]({explorer}/tx/{row['claim_tx']}), submitted as {row['submission_id']} in "
            f"[{row['submit_tx'][:10]}…]({explorer}/tx/{row['submit_tx']})"
        )
    lines.append("")
    REPORT.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    print(f"\nwrote {REPORT.relative_to(C.ROOT).as_posix()}: golden {g_hit}/{g_n}, held out {h_hit}/{h_n}")


if __name__ == "__main__":
    if "--report" in sys.argv:
        report()
    else:
        run([a for a in sys.argv[1:] if not a.startswith("--")])
