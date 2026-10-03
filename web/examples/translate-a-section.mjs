/**
 * Claim a section, submit a translation and ask the validators, with genlayer-js and a wallet.
 *
 *   node examples/translate-a-section.mjs <account name> <section id> <lang> <translation file>
 *
 * In a browser the provider is window.ethereum and the account is the one the
 * wallet connected. Here a stand-in wallet signs for a local test account, so
 * the same code runs from a terminal. This file is the sample on the docs page
 * "Quickstart", copied in by scripts/gen_docs.py.
 */
import { readFileSync } from 'node:fs';

import { createClient } from 'genlayer-js';
import { studioDevnet } from 'genlayer-js/chains';

import { standinWallet } from '../scripts/standin-wallet.mjs';

const FAITHFUL = '0x3762367564e2849380A761539E833D0A930D6e8f';
const chain = { ...studioDevnet, id: 61997, rpcUrls: { default: { http: ['https://studio-next.genlayer.com/api'] } } };

const [name = 'docs_example', section = '1', lang = 'fa', file] = process.argv.slice(2);
const { address, provider } = standinWallet(name); // browser: window.ethereum
const client = createClient({ chain, account: address, provider });

/** One write: a fee deposit from the SDK's estimate, then the success test. */
async function write(functionName, args, rotations = 1) {
  const estimate = await client.estimateTransactionFees({
    leaderTimeunitsAllocation: 600,
    validatorTimeunitsAllocation: 600,
    totalMessageFees: 0,
    rotations: [rotations],
  });
  const hash = await client.writeContract({
    address: FAITHFUL,
    functionName,
    args,
    value: 0n,
    fees: { distribution: estimate.distribution, feeValue: estimate.feeValue },
  });
  const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: 'decided', interval: 4000, retries: 120 });
  const leader = receipt.consensus_data.leader_receipt[0];
  // ACCEPTED is not success on its own: a refusal is accepted too. Check the result.
  if (leader.execution_result !== 'SUCCESS' || leader.result.status !== 'return') {
    throw new Error(`${functionName} refused: ${JSON.stringify(leader.result.payload)}`);
  }
  return { hash, returned: leader.result.payload.readable };
}

// 1. Claim one section in one language for 48 hours.
const claim = await write('claim', [Number(section), lang]);

// 2. Submit. The exact checks run inside submit; a difference is stored, not judged.
const submitted = await write('submit', [Number(section), lang, readFileSync(file, 'utf8')]);
const id = Number(submitted.returned);
const view = JSON.parse(await client.readContract({ address: FAITHFUL, functionName: 'get_section', args: [Number(section)] }));
const mine = view.submissions.find((s) => s.id === id);
if (mine.verdict === 'PRECHECK_FAILED') {
  console.log(JSON.stringify({ claim: claim.hash, submit: submitted.hash, id, problems: mine.problems }));
  process.exit(1);
}

// 3. Ask the validators. judge may rotate to a second committee, so it allows more rotations.
const judged = await write('judge', [id], 3);
console.log(JSON.stringify({ claim: claim.hash, submit: submitted.hash, judge: judged.hash, id, verdict: judged.returned }));
