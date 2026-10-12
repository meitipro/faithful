# Portal entry

The fields in the order the portal shows them. `python submission/count.py` counts every limited field.

## Project name

Faithful - paid translations the maintainer can trust

## Project tag

Marketplaces

## Tag 1

Fulfillment Review

## Tag 2

Service Escrow

## Icon

`submission/faithful-icon-512.png` (512 × 512, the site's own mark, safe for a circular crop)

## One-liner

Paid docs translations: exact code guards code and numbers, validators judge meaning.

## Description

Faithful pays for docs translations on the evidence of meaning, not on trust.

A maintainer funds a program, imports docs as short sections and sets a glossary; translators claim one section in one language for 48 hours. Exact code in submit checks that code blocks, inline code, links, headings and numbers survived, with Persian and Arabic-Indic digits normalised, so a changed fee never reaches a model; numbers are compared by value and heading levels, lists and tables by structure. Validators then ask whether a reader of the translation gets exactly what a reader of the source gets, and agree on one label: FAITHFUL credits the rate, FLAWED names the first problem and allows one revision, WRONG_LANGUAGE releases the claim. Payouts are top-level withdraw and close. Approved sections export as Markdown or JSON, each linked to its judge transaction.

Deployed on Studio Next. Through real consensus, published as they came out: golden 10 of 10, held-out 3 of 3, multilingual 14 of 14.

## Show it in action

Demo video: not recorded yet (`submission/demo-script.md` has the shot list).

## Write the exact path

### 1. Fund a wallet

Open faithful-genlayer.vercel.app and select Connect wallet in the header, then Switch to Studio Next: the site adds GenLayer Studio Next (chain 61997) to the wallet. The first action panel you reach offers Get test GEN, which pays 20 test GEN from the site's faucet.

### 2. Open the program

Select Programs in the header, then Faithful docs, community translations. Each row is a section and each column a language; every cell is a word: Open, Claimed, Judging, OK, Flawed or Pre-check.

### 3. Claim a section

Select any Open cell, for example section 24 in German, to open the editor, then select Claim for 48 hours and confirm. The program's rate, 12 GEN, is reserved from the pool for you.

### 4. Trip an exact check

Type a translation that changes a number or a link from the source. The Exact checks panel marks the row with the exact difference, such as "number 48 is missing", and Submit for checking stays disabled. Fix it; native digits are fine.

### 5. Submit for checking

Select Submit for checking and confirm twice: submit, where the contract runs the same checks, then judge, while the page shows Validators are comparing the texts. The verdict and the judge's reason appear: FAITHFUL credits 12 GEN, FLAWED names the problem and allows one revision.

### 6. Withdraw and export

Select Translators in the header, then Withdraw 12 GEN and confirm; the GEN lands at finality. On the program board, Export DE shows the approved German sections as Markdown or JSON, each linked to its judge transaction.

## Prove the path works

### Expected verification outcome

The editor shows the verdict and reason, the section turns OK on the board, Translators shows +12 GEN, and Export lists the section with its judge transaction. To confirm on chain, open the judge transaction: consensus_data.leader_receipt[0] has execution_result SUCCESS and result.status return; a refusal is also ACCEPTED, so status alone proves nothing. get_section(id) returns the verdict, reason and credited amount. The same path was walked in the live UI: https://github.com/meitipro/faithful/blob/main/docs/ui-walk.studio-next.md

### Contract link

https://explorer-studio-dev.genlayer.com/address/0xF8c1E884228b0e31bE304abaB6e3c6E5C6C744E1

## Send people to it

- Website: https://faithful-genlayer.vercel.app
- GitHub: https://github.com/meitipro/faithful

## Steward note

Thank you for the review. Every point is now in the deployed contract (v3, 0xF8c1E884…) or in the evidence: a 24-hour bound on judging with a release that never bars the translator; heading levels, lists and tables compared; numbers compared by value; kept glossary terms found by code with their endings, so the German case is now FAITHFUL; a new 14-case multilingual set; and the full path, payout and refund, walked through the frontend.

## Evidence

- Contract (v3): https://explorer-studio-dev.genlayer.com/address/0xF8c1E884228b0e31bE304abaB6e3c6E5C6C744E1
- Deploy: https://explorer-studio-dev.genlayer.com/tx/0x478f9c0029c66e2e6cb382004684e9d84bb81aad6266641e6b3e3e05ca8d9c25
- What changed after the review: https://github.com/meitipro/faithful#after-the-steward-review
- Frontend walk with every receipt: https://github.com/meitipro/faithful/blob/main/docs/ui-walk.studio-next.md
- Walk, program opened from the site: https://explorer-studio-dev.genlayer.com/tx/0xaa1e32fc49d384ba09190be65619148acda6b397eab2f6b127b4277b1fa36371
- Walk, judge FAITHFUL: https://explorer-studio-dev.genlayer.com/tx/0x2b687fb95e54833d481010297977835349b714f9ba35357a16a330cfb460fa73
- Walk, translator withdraw: https://explorer-studio-dev.genlayer.com/tx/0x421b167bc1c5d842e50ad8167052877fa8542a183c79bfba6a9d1f556f825189
- Walk, close with the unused-funding refund: https://explorer-studio-dev.genlayer.com/tx/0x4a7bfd353b5bdafa96a4ca1cab319c180ea0d90493962bff4b385dc08fbb5894
- Evaluation, all sets and earlier contracts: https://faithful-genlayer.vercel.app/docs/more/evaluation
- Multilingual results: https://github.com/meitipro/faithful/blob/main/eval/results-multilingual.md
- Mutations, 99 of 99: https://github.com/meitipro/faithful/blob/main/docs/MUTATIONS.md
