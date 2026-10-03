#!/usr/bin/env python3
"""
Break every defence in the contract, one at a time, and name the test that notices.

    python scripts/mutate.py                          # run, print the table
    python scripts/mutate.py --table docs/MUTATIONS.md

A passing count is a claim; a table of mutations, each named with the test that
killed it, is evidence. Each mutant is a copy of contracts/faithful.py with one
defence removed or weakened. The direct, static and pre-check tests run against
it through FAITHFUL_CONTRACT, and the first failing test is recorded as the kill.

A kill is read from pytest's own report of which test failed, never from an
exit code alone: a runner that scores exit codes reports a perfect run while
testing nothing. The tests that compare the file with a generated copy or with
the deployed record are left out, because they fail for ANY edit and would kill
every mutant without testing its defence.

If anything escapes, the table is not written and the escapes are printed. An
escape means a missing test, or a defence strict enough elsewhere that this one
can no longer fail, and either is a finding.
"""

from __future__ import annotations

import os
import pathlib
import re
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTRACT = ROOT / "contracts" / "faithful.py"

#: (what the mutant does, text in the contract, what replaces it). Each text
#: must occur exactly once, so a mutant always changes exactly one place.
MUTANTS = [
    # who may write
    ("maintainer check: anyone passes", "        if p.maintainer != gl.message.sender_address:", "        if False:"),
    ("add_sections: no maintainer check", '        self._maintainer(p, "add sections")\n', ""),
    ("close: no maintainer check", '        self._maintainer(p, "close it")\n', ""),
    ("create: the program is recorded as nobody's", "maintainer=gl.message.sender_address,", "maintainer=ZERO,"),
    ("fund: the funder is not recorded", "funder=gl.message.sender_address, amount=u256(value)", "funder=ZERO, amount=u256(value)"),
    ("judge: the caller is not recorded", "        s.judged_by = gl.message.sender_address\n", ""),
    ("submit: anyone submits on someone else's claim", "if slot is None or slot.state == OPEN or slot.translator != me:", "if slot is None or slot.state == OPEN:"),
    (
        "submit: the claim holder compared as case-sensitive text",
        "if slot is None or slot.state == OPEN or slot.translator != me:",
        "if slot is None or slot.state == OPEN or slot.translator.as_hex != me.as_hex.upper():",
    ),
    ("submit: the submission is recorded as the slot's, not the caller's", "            translator=me,\n            text=translation,", "            translator=ZERO,\n            text=translation,"),
    ("withdraw: pays a fixed address", "        _Payee(me).emit_transfer(value=u256(amount))\n        return amount\n\n    @gl.public.write\n    def close", "        _Payee(ZERO).emit_transfer(value=u256(amount))\n        return amount\n\n    @gl.public.write\n    def close"),
    ("close: pays a fixed address", "        if amount > 0:\n            _Payee(me).emit_transfer(value=u256(amount))", "        if amount > 0:\n            _Payee(ZERO).emit_transfer(value=u256(amount))"),
    # claims
    ("claim: a claimed section can be claimed again", "        if slot is not None and slot.state != OPEN:", "        if slot is not None and slot.state == JUDGING:"),
    ("claim: an approved section can be claimed again", "        if slot is not None and slot.state == APPROVED:\n            raise", "        if False:\n            raise"),
    ("claim: four claims at once", "        if self._sweep_translator(me, now) >= MAX_CLAIMS:", "        if self._sweep_translator(me, now) > MAX_CLAIMS:"),
    ("claim: a barred translator claims again", '        if key + ":" + me.as_hex.lower() in self.barred:', "        if False:"),
    ("claim: no pool check", "        if int(p.pool) - int(p.reserved) < int(p.rate):", "        if False:"),
    ("claim: the pool check ignores reservations", "        if int(p.pool) - int(p.reserved) < int(p.rate):", "        if int(p.pool) < int(p.rate):"),
    ("claim: nothing is reserved", "        p.reserved = u256(int(p.reserved) + int(p.rate))\n", ""),
    ("claim: lasts 49 hours", "CLAIM_HOURS = 48", "CLAIM_HOURS = 49"),
    ("claim: open on a closed program", '        if p.closed:\n            raise gl.vm.UserError(E + "this program is closed")\n        code = self._target(p, lang)', "        code = self._target(p, lang)"),
    ("claim: a language the program does not translate into", "        if code not in p.langs.split(\",\"):\n            raise", "        if False:\n            raise"),
    ("expiry: an expired claim never reopens", "        if slot.state != CLAIMED or now < int(slot.expires_at):", "        if True:"),
    ("expiry: a claim waiting for the judge expires too", "        if slot.state != CLAIMED or now < int(slot.expires_at):", "        if slot.state == APPROVED or slot.state == OPEN or now < int(slot.expires_at):"),
    ("release: the reserve is not returned", "        p.reserved = u256(int(p.reserved) - int(p.rate))\n        p.live = self._drop(p.live, key)\n        self.claims_of[who]", "        p.live = self._drop(p.live, key)\n        self.claims_of[who]"),
    ("release: the translator keeps the claim on their list", '        self.claims_of[who] = self._drop(self.claims_of.get(who, ""), key)\n        if bar:', "        if bar:"),
    ("release: a verdict never bars", '        if bar:\n            self.barred', '        if False:\n            self.barred'),
    ("claim: the program never sweeps expired claims", "        self._sweep_program(p, now)\n        key = str(int(section_id))", "        key = str(int(section_id))"),
    # submit
    ("submit: open while the judge is pending", '        if slot.state == JUDGING:\n            raise gl.vm.UserError(E + "your submission is waiting for the judge")\n', ""),
    ("submit: open after the claim expired", '        if now >= int(slot.expires_at):\n            raise gl.vm.UserError(E + "your claim has expired")\n', ""),
    ("submit: no pre-check", "        problems = precheck(section.text, translation)", "        problems = []"),
    ("submit: a pre-check failure still goes to the judge", "        if len(problems) == 0:\n            slot.state = JUDGING", "        if True:\n            slot.state = JUDGING"),
    ("submit: the 6250-character cap is gone", '_block(text, "the translation", MAX_TRANSLATION)', '_block(text, "the translation", 10**6)'),
    ("add: the 2500-character cap is gone", "MAX_SECTION = 2500", "MAX_SECTION = 2501"),
    ("add: 21 sections at a time", "    if len(parsed) < 1 or len(parsed) > MAX_BATCH:", "    if len(parsed) < 1 or len(parsed) > 21:"),
    ("add: 201 sections in a program", "        if int(p.sections) + len(items) > MAX_SECTIONS:", "        if int(p.sections) + len(items) > 201:"),
    # judge
    ("judge: a pre-check failure can be judged", '        if s.verdict == PRECHECK_FAILED:\n            raise', '        if False:\n            raise'),
    ("judge: a submission is judged twice", '        if s.verdict != PENDING:\n            raise', '        if False:\n            raise'),
    ("judge: FAITHFUL credits nothing", "            self.balances[who] = u256(int(self.balances.get(who, u256(0))) + rate)\n", ""),
    ("judge: FAITHFUL leaves the pool untouched", "            p.pool = u256(int(p.pool) - rate)\n", ""),
    ("judge: FAITHFUL keeps the reserve", "            p.reserved = u256(int(p.reserved) - rate)\n            p.pool", "            p.pool"),
    ("judge: FAITHFUL does not approve the section", "            slot.state = APPROVED\n", ""),
    ("judge: FAITHFUL keeps the claim live", "            p.live = self._drop(p.live, key)\n            self.claims_of[who] = self._drop(self.claims_of.get(who, \"\"), key)\n            self.balances", "            self.balances"),
    ("judge: FLAWED allows unlimited revisions", "        elif verdict == FLAWED and int(s.attempt) < MAX_ATTEMPTS:", "        elif verdict == FLAWED:"),
    ("judge: FLAWED allows no revision", "        elif verdict == FLAWED and int(s.attempt) < MAX_ATTEMPTS:", "        elif False:"),
    ("judge: WRONG_LANGUAGE allows a revision", "        elif verdict == FLAWED and int(s.attempt) < MAX_ATTEMPTS:", "        elif verdict != FAITHFUL and int(s.attempt) < MAX_ATTEMPTS:"),
    ("judge: the revision is not counted", "            slot.attempt = u32(int(s.attempt) + 1)\n", ""),
    ("judge: validators agree with any answer", 'return mine["verdict"] == theirs.get("verdict")', "return True"),
    ("judge: validators compare the reason too", 'return mine["verdict"] == theirs.get("verdict")', 'return mine == theirs'),
    ("judge: an unreadable verdict defaults to FLAWED", '    if text not in VERDICTS:\n        raise gl.vm.UserError(L + "bad verdict")', "    if text not in VERDICTS:\n        return FLAWED"),
    ("judge: the reason is not capped", 'reason = " ".join(str(parsed.get("reason") or "").split())[:MAX_REASON]', 'reason = " ".join(str(parsed.get("reason") or "").split())'),
    ("judge: no retry on a formatting slip", "        if not error_text(first).startswith(L):\n            raise", "        raise"),
    # the prompt
    ("prompt: the fence lets delimiters through", 'return str(raw).replace("<", "(").replace(">", ")")', "return str(raw)"),
    ("prompt: the translation reaches the prompt unfenced", "        translation=fence(translation),", "        translation=translation,"),
    ("prompt: the source reaches the prompt unfenced", "        source=fence(source),", "        source=source,"),
    ("prompt: a glossary rendering reaches the prompt unfenced", '            lines.append(fence(term) + " -> " + fence(rendering))', '            lines.append(fence(term) + " -> " + rendering)'),
    ("prompt: every glossary term, whether in the section or not", "        if term.lower() not in low:\n            continue\n", ""),
    ("prompt: the wrong language is named", "        lang=LANGS[lang],", "        lang=LANGS[src_lang],"),
    # the exact checks
    ("precheck: Persian digits are not normalised", '        index = PERSIAN_DIGITS.find(char)\n        if index < 0:', "        index = -1\n        if index < 0:"),
    ("precheck: numbers compared as a set, not a multiset", "            missing = need[item] - have.get(item, 0)\n            problems.append(", "            missing = 1\n            continue\n            problems.append("),
    ("precheck: code blocks are not compared", "            if src_blocks[index] != out_blocks[index]:", "            if False:"),
    ("precheck: the code block count is not compared", "    if len(src_blocks) != len(out_blocks):", "    if False:"),
    ("precheck: inline code is not compared", '    problems.extend(_difference("inline code", src_spans, out_spans, _quote))', "    pass"),
    ("precheck: links are not compared", '    problems.extend(_difference("link", src_urls, out_urls, _plain))', "    pass"),
    ("precheck: headings are not compared", "    if src_heads != out_heads:", "    if False:"),
    ("precheck: the length ratio is not checked", "        if out_len * 100 < MIN_RATIO_PCT * src_len or out_len * 100 > MAX_RATIO_PCT * src_len:", "        if False:"),
    ("precheck: trailing punctuation stays on a link", "            while end > i and URL_TRIM.find(prose[end - 1]) >= 0:", "            while False:"),
    # money
    ("withdraw: the balance is not cleared", "        self.balances[me] = u256(0)\n", ""),
    ("withdraw: a zero balance still sends", "        if amount <= 0:\n            raise gl.vm.UserError(E + \"nothing to withdraw\")", "        if amount < 0:\n            raise gl.vm.UserError(E + \"nothing to withdraw\")"),
    ("close: open claims do not block it", "        if open_claims > 0:", "        if False:"),
    ("close: closes twice", '        if p.closed:\n            raise gl.vm.UserError(E + "this program is already closed")', '        if False:\n            raise gl.vm.UserError(E + "this program is already closed")'),
    ("close: the pool is not emptied", "        p.pool = u256(0)\n", ""),
    ("close: the program stays open", "        p.closed = True\n", ""),
    ("fund: zero value accepted", "        if value <= 0:\n            raise gl.vm.UserError(E + \"send some GEN to fund the program\")", "        if value < 0:\n            raise gl.vm.UserError(E + \"send some GEN to fund the program\")"),
    ("fund: open on a closed program", '        p = self._program(program_id)\n        if p.closed:\n            raise gl.vm.UserError(E + "this program is closed")\n        value', "        p = self._program(program_id)\n        value"),
    ("create: opens with no funding", "        if value <= 0:\n            raise gl.vm.UserError(E + \"a program opens with its first funding", "        if value < 0:\n            raise gl.vm.UserError(E + \"a program opens with its first funding"),
    ("create: a rate of zero", "or rate <= 0:", "or rate < 0:"),
    ("create: the source as a target", '            if code == source:\n                raise', "            if False:\n                raise"),
    ("create: nine target languages", "MAX_LANGS = 8", "MAX_LANGS = 9"),
    ("glossary: a language outside the program", "                if code not in langs:\n                    raise", "                if False:\n                    raise"),
    ("glossary: a term listed twice", "        if term.lower() in seen:", "        if False:"),
]

EXCLUDED = [
    "tests/test_static.py::test_generated_files_are_what_the_generator_writes",
    "tests/test_static.py::test_the_site_reads_the_frozen_deployment",
    "tests/test_static.py::test_no_private_key_in_the_repository",
    "tests/test_precheck.py::test_the_contract_carries_precheck_py_byte_for_byte",
]


def first_failure(output: str) -> str | None:
    for line in output.splitlines():
        match = re.match(r"FAILED (\S+)", line.strip())
        if match:
            return match.group(1).split(" - ")[0]
    return None


def main() -> int:
    source = CONTRACT.read_text(encoding="utf-8")
    rows: list[tuple[int, str, str]] = []
    escapes: list[str] = []
    with tempfile.TemporaryDirectory() as folder:
        mutant = pathlib.Path(folder) / "faithful.py"
        for index, (what, old, new) in enumerate(MUTANTS, 1):
            count = source.count(old)
            if count != 1:
                raise SystemExit(f"mutant {index} ({what}) matches {count} places; it must match exactly one")
            mutant.write_text(source.replace(old, new), encoding="utf-8")
            env = dict(os.environ, FAITHFUL_CONTRACT=str(mutant))
            command = [
                sys.executable, "-m", "pytest", "tests/test_direct.py", "tests/test_static.py", "tests/test_precheck.py",
                "-x", "-q", "--tb=no", "-rf", "-p", "no:cacheprovider",
            ] + [arg for test in EXCLUDED for arg in ("--deselect", test)]
            result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True, encoding="utf-8")
            killer = first_failure(result.stdout)
            if result.returncode == 0 or killer is None:
                escapes.append(what)
                print(f"  {index:2} ESCAPED  {what}")
            else:
                rows.append((index, what, killer))
                print(f"  {index:2} killed   {what}  <- {killer}")
    if escapes:
        print(f"\n{len(escapes)} mutant(s) escaped; no table written:")
        for what in escapes:
            print(f"  - {what}")
        return 1
    if "--table" in sys.argv:
        target = ROOT / sys.argv[sys.argv.index("--table") + 1]
        lines = [
            "# Mutations",
            "",
            f"Written by `python scripts/mutate.py --table docs/MUTATIONS.md`. {len(rows)} defences in",
            "`contracts/faithful.py` were each broken on their own, and every mutant was caught. Each row",
            "names the first test that failed against it, read from pytest's report rather than an exit code.",
            "The generated-copy and deployed-record tests are excluded, because they fail for any edit at all.",
            "",
            "| # | defence broken | caught by |",
            "|---|---|---|",
        ] + [f"| {i} | {what} | `{killer}` |" for i, what, killer in rows]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
        print(f"\nwrote {target.relative_to(ROOT).as_posix()}")
    print(f"\n{len(rows)} of {len(MUTANTS)} killed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
