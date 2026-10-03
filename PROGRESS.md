# Progress

One line per step, in order, 2026-10-03. Every figure is read from a file in this repository or from the chain.

- Read the build spec (Faithful-GenLayer-Build-Spec.pdf) and the rules artifact (rules 01 to 34); network is Studio Next (chain 61997), as the spec names it.
- `contracts/precheck.py`: the exact pre-checks as pure code, no regular expressions and no floats; 22 shared cases in `tests/precheck_cases.json`.
- `contracts/faithful.py`: the twelve methods of section 4 plus one view, `list_submissions`, which the translator page and the recent verdicts need; v0.3 header and imports copied from the Studio Next Fairshare/Clearance line; judge prompt word for word; the pre-checks copied in by `scripts/gen_precheck.py`.
- genvm-lint clean (13 methods, 8 writes, 5 views); validated against the live runtime with `gen_getContractSchemaForCode`.
- `tests/test_direct.py`, `tests/test_static.py`, `tests/test_precheck.py` with a per-node test double; the editor's port `web/lib/precheck.mjs` agrees with the contract on all 22 cases.
- `scripts/mutate.py`: 80 of 80 mutants killed, after the first run found one escape (an unreadable label defaulting to FLAWED on every node) that a new test closed.
- Deployed to Studio Next at `0x3762367564e2849380A761539E833D0A930D6e8f`; `scripts/verify.py` finds the deployed bytes identical and lints them clean.
- Golden set written, hashed and timestamped (`eval/golden.lock.json`) before the first run.
- Golden run: 9 of 10 matched; case 5 (German *Validatoren* for a kept *validator*) came back FLAWED against an expected FAITHFUL, published as a miss.
- Held-out run, once: H1 FAITHFUL (Persian digits end to end), H2 FLAWED, H3 FLAWED; 3 of 3 within what each case accepts.
- Site: landing, programs, program board, translator editor with live checks and right-to-left support, start a program with Markdown import, translator page, export; wallet gate; faucet, refresh and export routes.
- /docs with Fumadocs: fifteen pages, generated contract reference, errors, judge prompt, evaluation, addresses, languages and limits; samples copied from files that run; link checker in the build.
- Seed: program 2 from four passages of Faithful's own docs, in Persian, Spanish and German (`docs/seed.studio-next.log`): a changed number refused by the exact checks and fixed; a softened warning FLAWED, then FAITHFUL; the Persian and Spanish "Claims" lists FLAWED on their first run, so each got its one revision: Spanish came back FAITHFUL, and the Persian revision was FLAWED again for a real mistake (a word that reads as "ice cream"), which released the claim. Approved: 3 Persian, 3 Spanish, 1 German; the rest is open for reviewers. The Persian translator withdrew 36 GEN.
