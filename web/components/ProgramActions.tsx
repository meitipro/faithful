'use client';

import { useMemo, useState } from 'react';

import { gen, toWei } from '@/lib/format';
import { MAX_SECTION, splitSections } from '@/lib/markdown.mjs';
import type { Program } from '@/lib/types';

import { TxProgress, useWrite } from './Actions';
import { WalletGate, useWallet } from './Wallet';

export function FundBox({ programId }: { programId: number }) {
  const { state, busy, run } = useWrite([`program:${programId}`]);
  const [amount, setAmount] = useState('');
  const wei = toWei(amount);
  return (
    <WalletGate action="top up this pool">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input className="c-input mono" placeholder="GEN, e.g. 60" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" aria-label="GEN to add" />
          <button className="c-btn" disabled={busy || !wei || wei <= 0n} onClick={async () => (await run('fund', [programId], wei ?? 0n)).phase === 'done' && setAmount('')}>
            Fund
          </button>
        </div>
        <p className="c-faint text-[12.5px]">Anyone can top up. What is left when the program closes goes back to the maintainer.</p>
        <TxProgress state={state} waiting="Validators are recording the funding" />
      </div>
    </WalletGate>
  );
}

/** Add sections from Markdown, and close the program: only for the maintainer's wallet. */
export function MaintainerBox({ program }: { program: Program }) {
  const w = useWallet();
  const { state, busy, run } = useWrite([`program:${program.id}`]);
  const [markdown, setMarkdown] = useState('');
  const sections = useMemo(() => (markdown.trim() ? splitSections(markdown) : []), [markdown]);
  const tooLong = sections.some((s) => s.tooLong);
  if (!w.account || w.account.toLowerCase() !== program.maintainer.toLowerCase() || program.closed) return null;

  async function add() {
    for (let start = 0; start < sections.length; start += 20) {
      const batch = sections.slice(start, start + 20).map((s) => ({ title: s.title, text: s.text }));
      const done = await run('add_sections', [program.id, JSON.stringify(batch)]);
      if (done.phase !== 'done') return;
    }
    setMarkdown('');
  }

  return (
    <div className="c-card pad flex flex-col gap-3">
      <p className="c-eyebrow">You maintain this program</p>
      <label className="c-label" htmlFor="md">
        Add sections from Markdown
      </label>
      <textarea id="md" className="c-textarea mono text-[12.5px]" value={markdown} onChange={(e) => setMarkdown(e.target.value)} placeholder="# Heading&#10;&#10;Paste a docs page here." />
      {sections.length > 0 && (
        <p className="c-muted text-[13px]">
          {sections.length} section{sections.length === 1 ? '' : 's'}
          {tooLong ? `, and one block is longer than ${MAX_SECTION.toLocaleString('en-US')} characters on its own; shorten it first.` : ', each under 2,500 characters.'}
        </p>
      )}
      <WalletGate action="add sections">
        <button className="c-btn wide" disabled={busy || !sections.length || tooLong} onClick={add}>
          Add {sections.length || ''} section{sections.length === 1 ? '' : 's'}
        </button>
      </WalletGate>
      <div className="c-rule" />
      <p className="c-muted text-[13px]">
        Closing returns the unused pool, {gen(program.pool)}, to you. It waits until no claim is open
        {program.live_claims ? ` (${program.live_claims} open now)` : ''}.
      </p>
      <WalletGate action="close the program">
        <button className="c-btn wide ghost" disabled={busy} onClick={() => run('close', [program.id])}>
          Close the program
        </button>
      </WalletGate>
      <TxProgress state={state} waiting="Validators are recording the change" />
    </div>
  );
}
