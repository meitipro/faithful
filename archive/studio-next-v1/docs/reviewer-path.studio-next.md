# Reviewer path, run rp1, on the live site

`node web/scripts/reviewer-path.mjs https://faithful-genlayer.vercel.app rp1`, 2026-10-03. Two accounts made for the
run, Mia `0xCb954076305b82c738D5124aE450A7067aaAD9Ae` and Tom `0x1F37fC3d5ceAD8301d701ce1C9b6d558513017ca`, both at
nonce 0. Every write went through `web/lib/genlayer-core.mjs`, the code the browser runs, with a stand-in wallet. The
full record is `docs/reviewer-path.studio-next.json`; the console output is `docs/reviewer-path.rp1.studio-next.log`.

| Step | Outcome | Transaction |
|---|---|---|
| Faucet, through the site, addresses sent in lower case | both 0 → 20 GEN | |
| Mia opens program 3, English to Persian, 2 GEN a section, 5 GEN in | ok | [0x839fc726…](https://explorer-studio-dev.genlayer.com/tx/0x839fc726af5c20286a989c9d4fd06368810ed9343e27c58659cb30caa55f350a) |
| Mia adds sections 18 and 19 | ok | [0x5790fbff…](https://explorer-studio-dev.genlayer.com/tx/0x5790fbffdcc684d5c6a98a1c83db3322ea70678acd5995cbae593f42195fde0e) |
| Tom submits without a claim | refused, status ACCEPTED, read as refused | [0xdf3c9771…](https://explorer-studio-dev.genlayer.com/tx/0xdf3c9771da1403926b751f44249938291b4a352446fe85cd59609a69e1cd7a59) |
| Tom claims section 18 | ok | [0x70f59094…](https://explorer-studio-dev.genlayer.com/tx/0x70f590946d5e61d0cd8cea86190dafb44d439a971ad8c126545e1e8129c85e1a) |
| Tom submits 100 for 10 | stored PRECHECK_FAILED: "number 10 is missing; number 100 is not in the source" | [0x18645093…](https://explorer-studio-dev.genlayer.com/tx/0x18645093cb913bc97114dc4235d43603f8c8c2fbc6263ec05930f9f498c1446e) |
| Tom submits the fix in Persian digits and asks the judge | FAITHFUL | [0xa1902423…](https://explorer-studio-dev.genlayer.com/tx/0xa19024239c2b49e4701684cbcc043cd9d5b1f6150f96ddcc8536be826cda0602) |
| Tom claims section 19; Mia tries to close | refused: "1 claim(s) still open" | [0xa9aefd91…](https://explorer-studio-dev.genlayer.com/tx/0xa9aefd9175b10ae00923bcc748ddc934472a3b946c2a27d9e491e5a421e33bfd) |
| Tom submits; Mia asks the judge | FAITHFUL, `judged_by` Mia | [0x825b16c3…](https://explorer-studio-dev.genlayer.com/tx/0x825b16c3e3ed36a8f24d452725e703c55500531ff434fc32f09cbb5e1e53cf32) |
| Tom withdraws, waited to finality | 4 GEN paid | [0x457be6af…](https://explorer-studio-dev.genlayer.com/tx/0x457be6afa392d5f6663ed423078802973e593f5767ae4e4ceab64ef069ce9bcf) |
| Tom withdraws again | refused: "nothing to withdraw" | [0x06d525ff…](https://explorer-studio-dev.genlayer.com/tx/0x06d525ff5091004cce97f128f4e4af0d36758a9d73ae88923fa0afbf9dc2fbda) |
| Mia closes, waited to finality | 1 GEN returned | [0x3a034bda…](https://explorer-studio-dev.genlayer.com/tx/0x3a034bda436a65cd766722dce7be750e8b41fe3917615eb4aebaadc9393e7e95) |
| The program, editor, export and program list on the live site | all show the chain's data | |

## Balances, to the wei

For each payout the script read the wallet before, waited for the transaction's own fee accounting to settle, and
compared: before + paid by the contract − net fee.

| | before | after | paid | net fee in the accounting | after − expected |
|---|---|---|---|---|---|
| Tom, withdraw | 19999448754999980239 wei | 23999322449499977416 wei | 4 GEN | 151305500002823 wei | **+25000000000000 wei** |
| Mia, close | 14999684495749988708 wei | 15999558190499985885 wei | 1 GEN | 151305250002823 wei | **+25000000000000 wei** |

Both payouts arrived in full. Each wallet ended exactly 25,000,000,000,000 wei (0.000025 GEN) higher than the
accounting predicts. That amount is the External message fee: the transaction's accounting shows a 1e15 wei message
top-up and a 9.75e14 wei message refund, so it records 25e12 wei as consumed, but the wallet was not charged it. The
same 25e12 wei term appeared on every payout of the Fairshare and Clearance contracts on Studio Next. The script marks
these two balance steps as not passing because it compares to the wei; the difference is that one known term, nothing
else.

Values in the table are read from `docs/reviewer-path.studio-next.json`.
