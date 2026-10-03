// Runs the editor's pre-checks over tests/precheck_cases.json and exits 1 on
// any difference from the contract's answers. tests/test_precheck.py runs it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { precheck } from "../lib/precheck.mjs";

const path = fileURLToPath(new URL("../../tests/precheck_cases.json", import.meta.url));
const cases = JSON.parse(readFileSync(path, "utf-8"));
let failed = 0;
for (const c of cases) {
  const got = precheck(c.source, c.translation);
  if (JSON.stringify(got) !== JSON.stringify(c.problems)) {
    failed++;
    console.log(`DIFFERS ${c.name}\n  contract: ${JSON.stringify(c.problems)}\n  editor:   ${JSON.stringify(got)}`);
  }
}
console.log(`${cases.length - failed} of ${cases.length} cases agree with the contract`);
process.exit(failed ? 1 : 0);
