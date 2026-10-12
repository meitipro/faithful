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
- Pushed to https://github.com/meitipro/faithful (public); deployed to Vercel: https://faithful-genlayer.vercel.app (project `faithful-genlayer`); every main route answers 200, and the live export carries each section's judge transaction.
- Reviewer path rp1 on the live site from two fresh accounts: every write and refusal as expected, both verdicts FAITHFUL, both payouts in full; each wallet ends 25e12 wei above the fee accounting, the External message fee Studio Next lists but does not charge (`docs/reviewer-path.studio-next.md`).
- Portal text, X post, demo script and 512 px icon in `submission/`, counted by `submission/count.py`.
- A navigation row for small screens.
- 2026-10-08: five FAQ answers of the docs added to program 2, and its pool topped up by 200 GEN (`scripts/seed_faq.py`), so reviewers find open sections in every language.
- 2026-10-08: the reviewer's path walked through the live site's own UI with a fresh in-page wallet (`docs/ui-walk.studio-next.md`): connect, switch network, faucet, claim, the live number check, FLAWED with the problem named, the revision FAITHFUL, withdraw; reconciled to the wei but for the 25e12 wei message-fee term.
- Portal entry rewritten field by field for the portal form (`submission/portal.md`), every link opened.
- 2026-10-11: steward review answered. Exact checks now compare numbers by value, heading levels, list items and table rows (34 shared cases, editor port agrees); a submission waits at most 24 hours for a verdict, then is released as UNJUDGED without a bar; a first FLAWED leaves at least 12 hours to revise; glossary lines allow inflection.
- Redeployed as v2 (`0x9Be39946C8D795C133EF2aAD58FC540c168ceA85`); golden 9 of 10 (case 5 still FLAWED), held out 3 of 3, new multilingual set 14 of 14. Archived in `archive/studio-next-v2/`.
- Kept glossary terms are now found by code in the translation, with any ending, and the judge is told the form found. Redeployed as v3 (`0xF8c1E884228b0e31bE304abaB6e3c6E5C6C744E1`): golden 10 of 10, held out 3 of 3, multilingual 14 of 14. 232 tests, 99 of 99 mutants killed; `scripts/verify.py` checks all three deployments.
- 2026-10-12: seed on v3 (program 1) and the whole path through the deployed frontend with two fresh in-page wallets (`docs/ui-walk.studio-next.md`): start a program, claim, submit, FAITHFUL, withdraw, close with the refund; 7 of 7 receipts FINALIZED with GenVM SUCCESS (`scripts/check_receipts.py`); both wallets reconciled but for the 25e12 wei message-fee term.

