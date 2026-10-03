# Portal entry

Character counts are measured by `python submission/count.py`, which reads this file.

## Name

Faithful

## Category

Productivity / tooling

## Tags

translation, documentation

## Icon

`submission/faithful-icon-512.png` (512 × 512, the site's own mark, safe for a circular crop)

## One-liner

Paid documentation translations the maintainer can trust: exact code guards code and numbers, validators judge meaning.

## Description

Faithful is a documentation translation program on GenLayer. A maintainer funds a program, imports docs as short sections and sets a glossary; translators claim a section in one language for 48 hours and translate it. Exact code in submit checks that code blocks, inline code, links, headings and numbers survived (Persian and Arabic-Indic digits normalised), so a changed fee never reaches a model. Validators then compare meaning across the two languages and agree on one label: FAITHFUL credits the rate, FLAWED names the first problem and allows one revision, WRONG_LANGUAGE releases the claim. Payouts are top-level withdraw and close calls. Approved sections export as Markdown or JSON, each linked to its judge transaction. Deployed on Studio Next; golden cases ran through real consensus and are published as they came out: 9 of 10, held-out 3 of 3.

## Path for reviewers

1. **Open a program.** Go to https://faithful-genlayer.vercel.app/programs and open "Faithful docs, community translations". Cells marked Open can be claimed; Persian, Spanish and German sections are left open on purpose.
2. **Get a wallet ready.** Press "Connect wallet" in the editor; the site walks you through "Switch network" to Studio Next (chain 61997) and "Get test GEN".
3. **Claim.** On an Open cell, press "Claim for 48 hours". The rate is reserved from the pool.
4. **Trip a check.** Type a translation that changes a number or a link: the Exact checks panel turns red and "Submit for checking" stays disabled. Fix it.
5. **Submit and judge.** Press "Submit for checking" and sign twice (submit, then judge). Wait for "Validators are comparing the texts" to end with the verdict and reason.
6. **Withdraw.** If it was FAITHFUL, open Translators and press "Withdraw".
7. **Run your own program.** Press "Start a program", paste a Markdown page, press "Open the program", then use "Export FA" (or another language) and "Close the program" on its board.

## Proof

- Contract `0x3762367564e2849380A761539E833D0A930D6e8f`: https://explorer-studio-dev.genlayer.com/address/0x3762367564e2849380A761539E833D0A930D6e8f
- Deploy: https://explorer-studio-dev.genlayer.com/tx/0xada2ee1dc55614ac9c6d070f4cd7c5b8f98549d5cefb9ef0f35a7d3ae8f1fa7f
- A changed number refused by the exact checks, no judge: https://explorer-studio-dev.genlayer.com/tx/0x22df393ed296c9f9049f2eff0b0cc961bd3cca411346261d9fefd9dcb9a1a1fc
- A softened warning judged FLAWED: https://explorer-studio-dev.genlayer.com/tx/0x08826af899152cc8df26efa1dc0e0fa4ce82df40cf5a44383494ed561e1de469
- Its revision judged FAITHFUL: https://explorer-studio-dev.genlayer.com/tx/0x33b1d1c31c315f9df409e4e35da6ef259f26a6126b2ebcc9f113d9d89e923b84
- Portuguese submitted for Spanish, WRONG_LANGUAGE: https://explorer-studio-dev.genlayer.com/tx/0xe9c472a2955d57488e9e4ddf6c30c48ce791f4177a070fdd684e5db5d30ac4c5
- A translator's withdraw: https://explorer-studio-dev.genlayer.com/tx/0x76d2a53a0e0c8c8e0456d13ef5eafb36755e350820ae23c21a372f891b975be6
- Evaluation with every transaction: https://faithful-genlayer.vercel.app/docs/more/evaluation
- Code: https://github.com/meitipro/faithful

## Steward note

Golden set 9 of 10: case 5, a German plural of a kept glossary term, was judged FLAWED where the spec expected FAITHFUL; published as a miss, untuned. The contract adds one view to the spec's twelve, list_submissions, for the translator page. A claim past 48 hours is released by the next claim or close; the site shows it open at once. Models are weaker in rare languages: pair them with a human check.
