# The reviewer's path, through the live site's own UI

2026-10-08, on https://faithful-genlayer.vercel.app. A wallet made for this walk only, `0xf4F5642061da509B6C2bF6a31394eA47D86EE5E5`,
lived in the browser page as an EIP-1193 provider: it started with no account and on another network, the way a
fresh MetaMask does. Its key was generated inside the page and never left it. Every click below is a button on the
site; every transaction was signed by that wallet through the site's own code.

| # | On the site | What happened | Transaction |
|---|---|---|---|
| 1 | **Connect wallet**, then **Switch network** | The site asked to switch, the wallet did not know chain 61997, the site added it and switched | |
| 2 | **Get test GEN** | The site's faucet paid 20 GEN; the header showed `20 GEN` | |
| 3 | **Programs** → *Faithful docs, community translations* → section 24, Persian | Editor opened with the source and the live checks | |
| 4 | **Claim for 48 hours** | Claimed; 12 GEN reserved from the pool | [0x2c70dba1…](https://explorer-studio-dev.genlayer.com/tx/0x2c70dba137fe6fa2062d11df8b90dce8401f3e33178e0d75a2dedb8eb416dbe9) |
| 5 | Typed ۴۹ where the source says 48 | "Numbers match ✗ number 48 is missing; number 49 is not in the source"; **Submit for checking** disabled; nothing sent | |
| 6 | Fixed it to ۴۸, **Submit for checking** | submit, then judge: FLAWED, "…translated … the next claim … as … the first reservation …" (the word *نخستین*, "first", for "next") | [submit](https://explorer-studio-dev.genlayer.com/tx/0xd5ed533de8872e5376bf22f3f4fcd7dfdc06b04cc19bf49a6ecd71e07eb4120b) · [judge](https://explorer-studio-dev.genlayer.com/tx/0x3712c52e2b2124c975ef4d86e63bfaded930989c6b9b7f62135375d4a86c5523) |
| 7 | The page said "This is your one revision"; revised the word, **Submit for checking** | FAITHFUL, 12 GEN credited, section 24 approved in Persian | [submit](https://explorer-studio-dev.genlayer.com/tx/0x72a2905a9b4a5ebd0b4716dd5a034b6d5c77c7b7e5c30d0f03f58d974aef3e2d) · [judge](https://explorer-studio-dev.genlayer.com/tx/0xe6b5ef03e8ab0ab994e93daebb749dd998eb021e00d7434f43e31c79d617354d) |
| 8 | **Translators** → **Withdraw 12 GEN** | Paid at finality | [0x1860518f…](https://explorer-studio-dev.genlayer.com/tx/0x1860518f81bb6e5954bc9fa80d871a40e749b96d3ea1d02aa43f8cb5516601d8) |

Read back from the contract after the walk: section 24 holds submission 29 (attempt 1, FLAWED) and submission 30
(attempt 2, FAITHFUL, credited 12000000000000000000 wei); its Persian state is APPROVED; the wallet's balance on the
contract is 0 after the withdraw.

## The wallet, to the wei

Over the whole walk, after every transaction's fee accounting settled: 20 GEN from the faucet + 12 GEN withdrawn −
the net fee of the six transactions (78633250002823 + 78642250002823 + 159243500004586 + 78640500002823 +
79553500002823 + 151305750002823 wei) = 31999373981249981299 wei expected; the wallet held 31999398981249981299 wei.
The difference, +25000000000000 wei, is the External message fee Studio Next lists in the withdraw's accounting
and does not charge, the same term as in `docs/reviewer-path.studio-next.md`.
