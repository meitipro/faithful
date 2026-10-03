# Handoff

What only you can do, and where everything is.

## Left for you

1. **Send the portal entry.** Every field is in `submission/portal.md`; `python submission/count.py` prints the
   character counts (description 857 of 1000, steward note 403 of 500). The icon is `submission/faithful-icon-512.png`.
2. **Post on X.** `submission/x-post.md` (265 characters).
3. **Record the silent demo.** `submission/demo-script.md`. Open a fresh program from `/new` for the recording, so the
   open cells of program 2 stay free for reviewers.

## Where things are

- Site: https://faithful-genlayer.vercel.app, Vercel project `faithful-genlayer` (team mahdighs-projects), CLI-linked
  from `web/`. Redeploy: `cd web && npx vercel deploy --prod --yes --scope mahdighs-projects`.
- Repository: https://github.com/meitipro/faithful (public), committed as meitipro.
- Contract: `0x3762367564e2849380A761539E833D0A930D6e8f` on Studio Next, frozen in `contracts/FROZEN.json`. Do not
  redeploy without deciding to: the evaluation, the seed and every link point at this address.
- Test keys: `~/.faithful/accounts.json` on this machine, never in the repository. Scripts print addresses only.
- Python: `.venv` with genlayer-py 0.19.0rc2 (`requirements.txt`).
