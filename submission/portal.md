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

Faithful pays for documentation translations on the evidence of meaning rather than on trust.

A maintainer funds a program, imports docs as short sections and sets a glossary; translators claim one section in one language for 48 hours. Exact code in submit checks that code blocks, inline code, links, headings and numbers survived, with Persian and Arabic-Indic digits normalised, so a changed fee never reaches a model. Validators then ask whether a reader of the translation gets exactly what a reader of the source gets, and agree on one label: FAITHFUL credits the rate, FLAWED names the first problem and allows one revision, WRONG_LANGUAGE releases the claim. The pool is reserved per claim; payouts are top-level withdraw and close. Approved sections export as Markdown or JSON, each linked to its judge transaction.

Deployed on Studio Next. Golden cases through real consensus, published as they came out: 9 of 10, held-out 3 of 3.

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

https://explorer-studio-dev.genlayer.com/address/0x3762367564e2849380A761539E833D0A930D6e8f

## Send people to it

- Website: https://faithful-genlayer.vercel.app
- GitHub: https://github.com/meitipro/faithful

## Steward note

Golden set 9 of 10: case 5, a German plural of a kept glossary term, was judged FLAWED where the spec expected FAITHFUL; published as a miss, untuned. The contract adds one view to the spec's twelve, list_submissions, for the translator page. A claim past 48 hours is released by the next claim or close; the site shows it open at once. Models are weaker in rare languages: pair them with a human check.

## Evidence

- Contract: https://explorer-studio-dev.genlayer.com/address/0x3762367564e2849380A761539E833D0A930D6e8f
- Deploy: https://explorer-studio-dev.genlayer.com/tx/0xada2ee1dc55614ac9c6d070f4cd7c5b8f98549d5cefb9ef0f35a7d3ae8f1fa7f
- Live UI walk, claim: https://explorer-studio-dev.genlayer.com/tx/0x2c70dba137fe6fa2062d11df8b90dce8401f3e33178e0d75a2dedb8eb416dbe9
- Live UI walk, first judge, FLAWED with the problem named: https://explorer-studio-dev.genlayer.com/tx/0x3712c52e2b2124c975ef4d86e63bfaded930989c6b9b7f62135375d4a86c5523
- Live UI walk, revision judged FAITHFUL: https://explorer-studio-dev.genlayer.com/tx/0xe6b5ef03e8ab0ab994e93daebb749dd998eb021e00d7434f43e31c79d617354d
- Live UI walk, withdraw: https://explorer-studio-dev.genlayer.com/tx/0x1860518f81bb6e5954bc9fa80d871a40e749b96d3ea1d02aa43f8cb5516601d8
- A changed number refused by the exact checks on chain, no judge: https://explorer-studio-dev.genlayer.com/tx/0x22df393ed296c9f9049f2eff0b0cc961bd3cca411346261d9fefd9dcb9a1a1fc
- Portuguese submitted for Spanish, WRONG_LANGUAGE: https://explorer-studio-dev.genlayer.com/tx/0xe9c472a2955d57488e9e4ddf6c30c48ce791f4177a070fdd684e5db5d30ac4c5
- Close refused while a claim is open: https://explorer-studio-dev.genlayer.com/tx/0xa9aefd9175b10ae00923bcc748ddc934472a3b946c2a27d9e491e5a421e33bfd
- Close returning the unused pool: https://explorer-studio-dev.genlayer.com/tx/0x3a034bda436a65cd766722dce7be750e8b41fe3917615eb4aebaadc9393e7e95
- Evaluation with every transaction: https://faithful-genlayer.vercel.app/docs/more/evaluation
- Persian export: https://faithful-genlayer.vercel.app/export/2/fa
