/**
 * Read the approved translations of a program in one language. Reads need no wallet and no fee.
 *
 *   node examples/read-export.mjs <program id> <lang>
 *
 * This file is the sample on the docs pages "Quickstart" and "Export format and
 * docs sync", copied in by scripts/gen_docs.py.
 */
import { createClient } from 'genlayer-js';
import { studioDevnet } from 'genlayer-js/chains';

const FAITHFUL = '0x3762367564e2849380A761539E833D0A930D6e8f';
const chain = { ...studioDevnet, id: 61997, rpcUrls: { default: { http: ['https://studio-next.genlayer.com/api'] } } };

const client = createClient({ chain });
const [program = '1', lang = 'fa'] = process.argv.slice(2);
const out = JSON.parse(await client.readContract({ address: FAITHFUL, functionName: 'export', args: [Number(program), lang] }));

if (!out.found) throw new Error('no such program or language');
console.log(`${out.lang_name}: ${out.approved} of ${out.sections} sections approved`);
for (const item of out.items) console.log(`\n<!-- section ${item.section_id}, submission ${item.submission_id} -->\n${item.text}`);
