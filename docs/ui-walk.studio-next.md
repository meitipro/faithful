# The whole path, through the deployed frontend

2026-10-12, on https://faithful-genlayer.vercel.app, against the current contract
[`0xF8c1E884228b0e31bE304abaB6e3c6E5C6C744E1`](https://explorer-studio-dev.genlayer.com/address/0xF8c1E884228b0e31bE304abaB6e3c6E5C6C744E1).
Two wallets made for this walk lived in the browser page as EIP-1193 providers, with keys generated inside the page
and never shown: a maintainer, `0x455c634dCb7956CAEC8bF50663248A7162a57aBf`, and a translator,
`0x08698Cd471D205bed52aEF0e3B518013149F446e`. Each started at 0 GEN, like a fresh MetaMask on another network: the site
asked to switch, added chain 61997, and paid 20 GEN from its own **Get test GEN**. Every step below is a button on the
site. The record, with every receipt, is [`docs/ui-walk.studio-next.json`](ui-walk.studio-next.json).

| # | Who | On the site | What happened | Transaction |
|---|---|---|---|---|
| 1 | maintainer | **Start a program**: name, Persian, rate 2 GEN, funding 5 GEN, a Markdown passage pasted and split into one section; **Open the program with 1 section** | program 4 opened with 5 GEN | [create](https://explorer-studio-dev.genlayer.com/tx/0xaa1e32fc49d384ba09190be65619148acda6b397eab2f6b127b4277b1fa36371) · [add section 37](https://explorer-studio-dev.genlayer.com/tx/0x77e5d9c3e2d865b6191c707649f6f96a21f87d49dd4ee8c669f6fcefe3cd8b17) |
| 2 | translator | board → section 37, Persian → **Claim for 48 hours** | claimed, 2 GEN reserved | [claim](https://explorer-studio-dev.genlayer.com/tx/0xd4e249f975ba250d0142eeff97ce92557e7ed781f0bc125d961561e123dc8f2d) |
| 3 | translator | wrote the translation; all eight live checks passed (numbers by value, heading levels, lists, tables); **Submit for checking** | submit, then judge: **FAITHFUL**, 2 GEN credited; the page showed the 24-hour judging deadline while it waited | [submit](https://explorer-studio-dev.genlayer.com/tx/0x1c73e2cc945dbb39f0f496199b3ad3183dfe44dc9a4d2de1fd959dafc64710d9) · [judge](https://explorer-studio-dev.genlayer.com/tx/0x2b687fb95e54833d481010297977835349b714f9ba35357a16a330cfb460fa73) |
| 4 | translator | **Translators** → **Withdraw 2 GEN** | 2 GEN paid | [withdraw](https://explorer-studio-dev.genlayer.com/tx/0x421b167bc1c5d842e50ad8167052877fa8542a183c79bfba6a9d1f556f825189) |
| 5 | maintainer | program board → **Close the program** | "Closed. 3 GEN went back to the maintainer." | [close](https://explorer-studio-dev.genlayer.com/tx/0x4a7bfd353b5bdafa96a4ca1cab319c180ea0d90493962bff4b385dc08fbb5894) |

## What GenVM did, read back from the chain

`python scripts/check_receipts.py --walk docs/ui-walk.studio-next.json` reads every transaction after finality. A
refusal is ACCEPTED too, so each one is checked on all three counts:

| Step | Consensus | GenVM execution | Result | Returned | Fees |
|---|---|---|---|---|---|
| open program | FINALIZED | SUCCESS | return | 4 | settled |
| add section | FINALIZED | SUCCESS | return | 37 | settled |
| claim | FINALIZED | SUCCESS | return | 1791960159 (claim expiry) | settled |
| submit | FINALIZED | SUCCESS | return | 38 (submission id) | settled |
| judge | FINALIZED | SUCCESS | return | "FAITHFUL" | settled |
| withdraw | FINALIZED | SUCCESS | return | 2000000000000000000 | settled |
| close | FINALIZED | SUCCESS | return | 3000000000000000000 | settled |

Read back afterwards: program 4 has pool 0, paid 2 GEN, returned 3 GEN, funded 5 GEN, closed; section 37 is APPROVED
in Persian; submission 38 is FAITHFUL, credited 2000000000000000000 wei.

## The wallets, to the wei

Over the whole walk, after every fee accounting settled:

| Wallet | 20 GEN from the faucet, minus value sent, minus net fees, plus payout | Balance | Difference |
|---|---|---|---|
| maintainer | 17999691427999991531 wei (−5 GEN funding, +3 GEN refund) | 17999716427999991531 wei | +25000000000000 wei |
| translator | 21999612054499988708 wei (+2 GEN withdrawn) | 21999637054499988708 wei | +25000000000000 wei |

Both payouts arrived in full. Each wallet ends exactly 25,000,000,000,000 wei above the accounting: the External
message fee Studio Next records on a payout's fee accounting and does not charge, the same term on every payout of
this and the earlier contracts.

The walks on the earlier contracts are kept in `archive/studio-next-v1/docs/`.
