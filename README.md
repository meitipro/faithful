# Faithful

**Paid translations the maintainer can trust.** A translation program for documentation on GenLayer: a maintainer
funds a program and adds the docs as short sections, translators claim and translate them, exact code checks that
code, numbers, links and headings survived, and validators compare meaning across languages the maintainer cannot
read. Every faithful section is paid automatically; every flawed one says what is wrong.

- **Site:** https://faithful-genlayer.vercel.app (docs at [/docs](https://faithful-genlayer.vercel.app/docs))
- **Contract:** [`0x3762367564e2849380A761539E833D0A930D6e8f`](https://explorer-studio-dev.genlayer.com/address/0x3762367564e2849380A761539E833D0A930D6e8f)
  on GenLayer **Studio Next** (chain 61997), deployed in
  [`0xada2ee1d…`](https://explorer-studio-dev.genlayer.com/tx/0xada2ee1dc55614ac9c6d070f4cd7c5b8f98549d5cefb9ef0f35a7d3ae8f1fa7f),
  frozen in [`contracts/FROZEN.json`](contracts/FROZEN.json)

## How it works

1. **Program.** The maintainer sets the source language, up to eight target languages, a glossary and a rate per
   section per language, and funds the pool.
2. **Sections.** Docs are added as sections of at most 2,500 characters, imported from Markdown.
3. **Claim.** A translator claims one section in one language for 48 hours; its rate is reserved from the pool.
   At most three live claims each.
4. **Check.** `submit` runs the exact pre-checks first: code blocks and inline code identical, links identical, the
   same numbers after Persian and Arabic-Indic digits are normalised, the same number of headings, a length ratio
   between 0.4 and 2.5. A difference is stored as `PRECHECK_FAILED` with every problem named, and no judge runs.
   Otherwise `judge` asks the validators whether a reader of the translation gets exactly what a reader of the
   source gets.
5. **Pay and export.** FAITHFUL credits the rate; FLAWED names the first problem and allows one revision within the
   claim; WRONG_LANGUAGE releases the claim. Translators are paid by `withdraw`, a top-level transfer; the maintainer
   gets the unused pool back with `close`. Approved sections export as Markdown or JSON, each linked to its judge
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
| `judge(submission_id)` | write, nondet | anyone; compares meaning, credits the rate on FAITHFUL; never moves money |
| `withdraw()` | write, pays | top-level transfer of the caller's balance |
| `close(program_id)` | write, pays | maintainer only, once no claims are open |
| `get_program`, `get_section`, `list_sections`, `export` | views | |
| `list_submissions(translator, offset, limit)` | view | **added**: the spec's translator page needs a balance and claims, and the landing page needs recent verdicts; none of the twelve can return them |

The judge prompt is section 3 of the spec, word for word (a test compares it). Validators compare the verdict label
only; the reason sentence is the leader's, for display. Every caller text (source, glossary, translation) is fenced at
the prompt boundary; language names come from the contract's own table.

Deliberate decisions, each held by a test:

- A pre-check failure is **stored**, not raised, so the board and the translator see the exact difference (the
  spec's table shows a PRE state and "the exact difference is shown"); it uses no attempt and no judge.
- `judge` is open to anyone, so a translator who stops after submitting cannot block `close`; `judged_by` records who
  asked.
- A translator released from a section by a verdict (second FLAWED, or WRONG_LANGUAGE) may not claim that same
  section in that language again, so a text cannot be resubmitted until a committee says yes. Every other section
  stays open to them, and the released one to everyone else.
- Only the glossary terms that appear in a section's source reach the judge.

## Evidence

| | |
|---|---|
| Tests | `pytest` 180 passed, offline, in seconds (`tests/`) |
| Mutations | 80 of 80 defences broken one at a time, each caught ([`docs/MUTATIONS.md`](docs/MUTATIONS.md)) |
| Deployed bytes | identical to the repository, linted clean (`python scripts/verify.py`) |
| Golden set | **9 of 10** through real consensus; case 5 is a published miss ([`eval/results.md`](eval/results.md)) |
| Held out | **3 of 3**, run once: H1 FAITHFUL; H2 and H3 FLAWED, which their "either" accepts |
| Editor checks | the site's port agrees with the contract on all 22 shared cases |

The miss: case 5 kept the glossary's *validator* as the German plural *Validatoren*, which the spec expected to pass;
the validators judged it FLAWED for not keeping the English word. It is reported as it came out, and the
[glossary docs](web/content/docs/concepts/glossaries.mdx) tell maintainers to give an inflected rendering where
inflection is acceptable.

## Seeded program

Program 2, *Faithful docs, community translations*: four passages of this repository's own docs, translated into
Persian, Spanish and German by the build agent and judged by the validators. The log is
[`docs/seed.studio-next.log`](docs/seed.studio-next.log). It shows, on chain, a changed number refused by the exact
checks and then fixed, a softened warning judged FLAWED and then FAITHFUL after its revision, and a Persian revision
that the judge caught misusing a word, which released the claim. Some sections are left open so a reviewer can claim
one.

## Run it

```bash
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
.venv/Scripts/python -m pytest -q             # offline
.venv/Scripts/python scripts/mutate.py        # every defence, broken one at a time
.venv/Scripts/python scripts/verify.py        # the deployed bytes against this repository
cd web && npm ci && npm run build             # the site and /docs
```

Scripts keep test keys in `~/.faithful/accounts.json`, outside the repository, and print addresses only. The site
holds no key: writes are signed in the visitor's wallet.

## Honest limits

- Models are stronger in some languages than others; pair rare languages with a human spot check.
- Faithful judges meaning and readability, not house style.
- An expired claim is released by the next claim or close that touches it; the site shows it as open at once.
- The docs-sync GitHub action and the other stretch goals of the spec are not built.

## Layout

```
contracts/faithful.py       one contract, judge prompt pinned inside
contracts/precheck.py       the exact checks, copied into the contract and ported to web/lib/precheck.mjs
tests/                      direct, static, pre-check and import tests, with a per-node GenVM double
eval/                       golden.json, its lock, run_golden.py, results
scripts/                    deploy, verify, mutate, seed, import_markdown, gen_docs, gen_precheck
web/                        Next.js site, /docs with Fumadocs (web/content/docs)
submission/                 portal text, X post, demo script, 512 px icon
```
