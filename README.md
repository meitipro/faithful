# Faithful

**Paid translations the maintainer can trust.** A translation program for documentation on GenLayer: a maintainer
funds a program and adds the docs as short sections, translators claim and translate them, exact code checks that
code, links, number values and document structure survived, and validators compare meaning across languages the
maintainer cannot read. Every faithful section is paid automatically; every flawed one says what is wrong.

- **Site:** https://faithful-genlayer.vercel.app (docs at [/docs](https://faithful-genlayer.vercel.app/docs))
- **Contract:** [`0xF8c1E884228b0e31bE304abaB6e3c6E5C6C744E1`](https://explorer-studio-dev.genlayer.com/address/0xF8c1E884228b0e31bE304abaB6e3c6E5C6C744E1)
  on GenLayer **Studio Next** (chain 61997), deployed in
  [`0x478f9c00…`](https://explorer-studio-dev.genlayer.com/tx/0x478f9c0029c66e2e6cb382004684e9d84bb81aad6266641e6b3e3e05ca8d9c25),
  frozen in [`contracts/FROZEN.json`](contracts/FROZEN.json). Earlier deployments are kept in `archive/` and still verify.

## After the steward review

The review asked for five things. Each is now in the deployed contract or in the evidence, and each contract change
is held by a test and by a mutant that the suite catches:

| Review point | What changed |
|---|---|
| A submission could stay JUDGING forever and block `close` | A submission waits at most **24 hours** for a verdict. After that the next `judge`, `claim` or `close` runs no model, marks it `UNJUDGED`, returns the reserve and reopens the section, without barring the translator. The board shows it as Stalled; the editor's button reads **Release the claim**. A first FLAWED verdict also leaves at least 12 hours for the revision. |
| The Markdown checks should compare structure, including heading levels | Headings are compared **level by level** (`heading 2 is ### in the source and ## in the translation`), and list items and table rows are counted. |
| Numbers should separate formatting from meaning | Numbers are compared **by value**: `2,500`, `2.500`, `2500` and `۲٬۵۰۰` agree; `0,4` and `0.4` agree; `0.4` and `4.0` do not; a version such as `0.6.0` is compared as written. |
| Glossary handling for inflected languages; the German case was wrongly rejected | For every term the glossary keeps, **code finds it in the translation**, with any grammatical ending, and tells the judge the form it found (`found … with an ending the target grammar adds: Validatoren`); renderings may be inflected. Golden case 5 is now **FAITHFUL**, and a kept term translated away is still FLAWED. |
| Wider multilingual coverage, and final proof through the frontend | A new locked **multilingual set** in eight more languages, **14 of 14**; and the whole path walked through the deployed site, maintainer and translator, every receipt FINALIZED with GenVM SUCCESS, the payout and the refund reconciled to the wei. |

Two redeploys were needed: v2 added the window, the structure and number checks and the inflection wording, and its
golden run still judged case 5 FLAWED; v3 added the kept-term check. Every run on every contract is published.

## How it works

1. **Program.** The maintainer sets the source language, up to eight target languages, a glossary and a rate per
   section per language, and funds the pool.
2. **Sections.** Docs are added as sections of at most 2,500 characters, imported from Markdown.
3. **Claim.** A translator claims one section in one language for 48 hours; its rate is reserved from the pool.
   At most three live claims each.
4. **Check.** `submit` runs the exact pre-checks first: code blocks and inline code identical, links identical,
   numbers by value, heading levels, list items and table rows, a length ratio between 0.4 and 2.5. A difference is
   stored as `PRECHECK_FAILED` with every problem named, and no judge runs. Otherwise `judge` asks the validators
   whether a reader of the translation gets exactly what a reader of the source gets, within 24 hours.
5. **Pay and export.** FAITHFUL credits the rate; FLAWED names the first problem and allows one revision; 
   WRONG_LANGUAGE releases the claim. Translators are paid by `withdraw`, a top-level transfer; the maintainer gets
   the unused pool back with `close`. Approved sections export as Markdown or JSON, each linked to its judge
   transaction.

## The contract

[`contracts/faithful.py`](contracts/faithful.py), GenVM SDK v0.3 (`py-genlayer:5jycge4q…`), the twelve methods of the
spec's section 4 plus one view:

| Method | Kind | |
|---|---|---|
| `create_program(name, src_lang, langs, glossary_json, rate)` | payable | opens a program with its first funding |
| `fund(program_id)` | payable | anyone tops up the pool |
| `add_sections(program_id, texts_json)` | write | maintainer only, up to 20 at a time |
| `claim(section_id, lang)` | write | 48 hours, reserves the rate |
| `submit(section_id, lang, text)` | write | the exact pre-checks, then waits for the judge |
| `judge(submission_id)` | write, nondet | anyone; compares meaning and credits the rate on FAITHFUL; past 24 hours it releases instead; never moves money |
| `withdraw()` | write, pays | top-level transfer of the caller's balance |
| `close(program_id)` | write, pays | maintainer only, once no claims are open |
| `get_program`, `get_section`, `list_sections`, `export` | views | |
| `list_submissions(translator, offset, limit)` | view | **added**: the spec's translator page needs a balance and claims, and the landing page needs recent verdicts; none of the twelve can return them |

The judge prompt is section 3 of the spec, word for word (a test compares it). Validators compare the verdict label
only; the reason sentence is the leader's, for display. Every caller text (source, glossary, translation, a found
glossary form) is fenced at the prompt boundary; language names come from the contract's own table.

## Evidence

| | |
|---|---|
| Tests | `pytest` 232 passed, offline, in seconds (`tests/`) |
| Mutations | 99 of 99 defences broken one at a time, each caught ([`docs/MUTATIONS.md`](docs/MUTATIONS.md)) |
| Deployed bytes | all three deployments identical to the repository and linted clean (`python scripts/verify.py`) |
| Golden set | **10 of 10** through real consensus on the current contract ([`eval/results.md`](eval/results.md)) |
| Held out | **3 of 3**: H1 FAITHFUL; H2 FAITHFUL and H3 FLAWED, which their "either" accepts |
| Multilingual set | **14 of 14** in French, Arabic, Japanese, Chinese, Russian, Turkish, Italian and Portuguese ([`eval/results-multilingual.md`](eval/results-multilingual.md)) |
| Editor checks | the site's port agrees with the contract on all 34 shared cases |
| Frontend walk | maintainer and translator through the deployed site: start a program with a Markdown import, claim, submit, FAITHFUL, withdraw, close with the refund; 7 of 7 receipts FINALIZED, GenVM SUCCESS, returned; both wallets reconciled ([`docs/ui-walk.studio-next.md`](docs/ui-walk.studio-next.md)) |

Each payout wallet ends exactly 25e12 wei above its fee accounting: the External message fee Studio Next records on a
payout and does not charge. Nothing else differs.

## Seeded program

Program 1, *Faithful docs, community translations*: four passages of this repository's own docs plus five FAQ
answers, translated into Persian, Spanish and German by the build agent and judged by the validators
([`docs/seed.studio-next.log`](docs/seed.studio-next.log)). It shows a changed number refused by the exact checks and
fixed, a softened warning judged FLAWED and then FAITHFUL after its revision, and two "Claims" lists the judge found
fault with, left on their revision. Sections stay open in every language for reviewers.

## Run it

```bash
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
.venv/Scripts/python -m pytest -q             # offline
.venv/Scripts/python scripts/mutate.py        # every defence, broken one at a time
.venv/Scripts/python scripts/verify.py        # every deployment against this repository
.venv/Scripts/python scripts/check_receipts.py --walk docs/ui-walk.studio-next.json
cd web && npm ci && npm run build             # the site and /docs
```

Scripts keep test keys in `~/.faithful/accounts.json`, outside the repository, and print addresses only. The site
holds no key: writes are signed in the visitor's wallet.

## Honest limits

- Models are stronger in some languages than others; pair rare languages with a human spot check.
- Faithful judges meaning and readability, not house style.
- An English `1.500` meaning one and a half reads as 1500, as most languages read it.
- The 24-hour release is covered by tests and mutants; it was not waited out live.
- The docs-sync GitHub action and the other stretch goals of the spec are not built.

## Layout

```
contracts/faithful.py       one contract, judge prompt pinned inside
contracts/precheck.py       the exact checks, copied into the contract and ported to web/lib/precheck.mjs
tests/                      direct, static, pre-check and import tests, with a per-node GenVM double
eval/                       golden sets, their locks, run_golden.py, results
scripts/                    deploy, verify, mutate, seed, check_receipts, import_markdown, gen_docs, gen_precheck
web/                        Next.js site, /docs with Fumadocs (web/content/docs)
archive/                    earlier deployments with their evaluation, seed and walks
submission/                 portal text, X post, demo script, 512 px icon
```
