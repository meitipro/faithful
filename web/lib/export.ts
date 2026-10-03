import { DEPLOYMENT } from './genlayer-core.mjs';
import type { TxIndex } from './explorer';
import type { Export } from './types';

/**
 * The export, as a docs pipeline takes it. Markdown: the approved sections in
 * order, each after a comment naming its section, submission and the judge
 * transaction that approved it. JSON: the same, as data.
 */

export function exportJson(e: Export, txs: TxIndex) {
  return {
    program: e.program_id,
    name: e.name,
    source_lang: e.src_lang,
    lang: e.lang,
    lang_name: e.lang_name,
    contract: DEPLOYMENT.faithful,
    chain_id: DEPLOYMENT.chainId,
    explorer: DEPLOYMENT.explorer,
    sections_total: e.sections,
    approved: e.approved,
    sections: e.items.map((item) => ({
      section_id: item.section_id,
      index: item.index,
      title: item.title,
      text: item.text,
      submission_id: item.submission_id,
      translator: item.translator,
      judged_at: item.judged_at,
      judge_tx: txs.judge[String(item.submission_id)]?.hash ?? null,
    })),
  };
}

export function exportMarkdown(e: Export, txs: TxIndex): string {
  const lines = [
    `<!-- Faithful export: program ${e.program_id}, ${e.lang_name} (${e.lang}), ${e.approved} of ${e.sections} sections approved. -->`,
    `<!-- Contract ${DEPLOYMENT.faithful} on GenLayer Studio Next, chain ${DEPLOYMENT.chainId}. -->`,
    '',
  ];
  for (const item of e.items) {
    const tx = txs.judge[String(item.submission_id)]?.hash;
    lines.push(`<!-- section ${item.section_id}, submission ${item.submission_id}${tx ? `, judged in ${DEPLOYMENT.explorer}/tx/${tx}` : ''} -->`);
    lines.push(item.text.trim());
    lines.push('');
  }
  return lines.join('\n');
}
