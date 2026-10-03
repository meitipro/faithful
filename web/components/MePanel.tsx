'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { dayTime, gen } from '@/lib/format';
import { expired, shownState, timeLeft } from '@/lib/program';
import type { SubmissionPage } from '@/lib/types';

import { TxProgress, readFresh, useWrite } from './Actions';
import { Addr, Empty, StateBadge, VerdictBadge } from './ui';
import { WalletGate, useWallet } from './Wallet';

type Brief = { id: number; name: string; maintainer: string; src_lang: string; closed: boolean; pool: string };

export function MePanel({ address, programs }: { address: string; programs: Brief[] }) {
  const w = useWallet();
  const who = address || w.account;
  const [page, setPage] = useState<SubmissionPage | null>(null);
  const [error, setError] = useState('');
  const { state, busy, run } = useWrite(['subs']);
  const own = !!w.account && who.toLowerCase() === w.account.toLowerCase();

  const load = useCallback(async () => {
    if (!who) return;
    setError('');
    try {
      setPage(await readFresh<SubmissionPage>('list_submissions', [who, 0, 50]));
    } catch {
      setError('Studio Next did not answer this read. Reload in a moment.');
    }
  }, [who]);

  useEffect(() => {
    setPage(null);
    load();
  }, [load]);

  if (!who) {
    return (
      <WalletGate action="see your claims and balance">
        <span />
      </WalletGate>
    );
  }
  if (error) return <Empty>{error}</Empty>;
  if (!page) return <p className="c-muted flex items-center gap-2 text-[14px]"><span className="c-spin" /> Reading the chain…</p>;
  if (!page.found) return <Empty>That is not an address.</Empty>;

  const now = Math.floor(Date.now() / 1000);
  const claims = (page.claims ?? []).filter((c) => !expired(c, now));
  const maintained = programs.filter((p) => p.maintainer.toLowerCase() === who.toLowerCase());
  const balance = BigInt(page.balance ?? '0');

  return (
    <div className="flex flex-col gap-8">
      <dl className="c-kv c-card">
        <div>
          <dd className="mono text-[22px]">{gen(balance)}</dd>
          <dt>Balance</dt>
        </div>
        <div>
          <dd className="mono text-[22px]">{gen(page.earned ?? '0')}</dd>
          <dt>Earned</dt>
        </div>
        <div>
          <dd className="mono text-[22px]">{gen(page.withdrawn ?? '0')}</dd>
          <dt>Withdrawn</dt>
        </div>
        <div>
          <dd className="text-[15px]">
            <Addr address={who} />
          </dd>
          <dt>{own ? 'Your wallet' : 'Address'}</dt>
        </div>
      </dl>

      {own && (
        <WalletGate action="withdraw">
          <div className="flex flex-col gap-2 sm:max-w-[420px]">
            <button
              className="c-btn solid"
              disabled={busy || balance <= 0n}
              onClick={async () => {
                if ((await run('withdraw', [])).phase === 'done') load();
              }}
            >
              {balance > 0n ? `Withdraw ${gen(balance)}` : 'Nothing to withdraw'}
            </button>
            <TxProgress state={state} waiting="Validators are sending your balance" />
            {state.phase === 'done' && <p className="c-faint text-[13px]">The GEN lands in your wallet when the transaction is final, a few minutes after this.</p>}
          </div>
        </WalletGate>
      )}

      <section>
        <p className="c-eyebrow">Live claims ({claims.length} of 3)</p>
        {claims.length ? (
          <div className="c-card mt-3">
            {claims.map((c) => (
              <Link key={`${c.section_id}:${c.lang}`} href={`/s/${c.section_id}/${c.lang}`} className="c-row-link flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-5 py-3 last:border-b-0">
                <StateBadge shown={shownState(c, now)} />
                <span className="font-medium">
                  Section {c.section_id}: {c.title}
                </span>
                <span className="mono c-faint text-[12px] uppercase">{c.lang}</span>
                <span className="c-muted ml-auto text-[13px]">
                  {c.state === 'JUDGING' ? 'waiting for the judge' : `expires in ${timeLeft(c.expires_at, now)} · attempt ${c.attempt} of 2`}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-3">
            <Empty>
              No live claims. <Link href="/programs" className="c-link">Pick a section</Link> in a language you write.
            </Empty>
          </div>
        )}
      </section>

      <section>
        <p className="c-eyebrow">Submissions and verdicts ({page.total})</p>
        {page.items.length ? (
          <div className="c-card mt-3">
            {page.items.map((s) => (
              <Link key={s.id} href={`/s/${s.section_id}/${s.lang}`} className="c-row-link border-b border-[var(--line)] px-5 py-3 last:border-b-0">
                <div className="flex flex-wrap items-center gap-3">
                  <VerdictBadge verdict={s.verdict} />
                  <span className="text-[14.5px]">
                    Section {s.section_id} <span className="mono c-faint text-[12px] uppercase">{s.lang}</span>
                  </span>
                  <span className="c-faint mono text-[12px]">
                    #{s.id} · attempt {s.attempt} · {dayTime(s.submitted_at)}
                  </span>
                  {BigInt(s.credited) > 0n && <span className="mono ml-auto text-[13px] text-[var(--accent-ink)]">+{gen(s.credited)}</span>}
                </div>
                <p className="c-muted mt-1 text-[13.5px]">{s.verdict === 'PRECHECK_FAILED' ? s.problems.join('; ') : s.reason || 'Waiting for the validators.'}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-3">
            <Empty>No submissions yet.</Empty>
          </div>
        )}
      </section>

      {maintained.length > 0 && (
        <section>
          <p className="c-eyebrow">Programs {own ? 'you maintain' : 'this address maintains'}</p>
          <div className="c-card mt-3">
            {maintained.map((p) => (
              <Link key={p.id} href={`/p/${p.id}`} className="c-row-link flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-5 py-3 last:border-b-0">
                <span className="font-medium">{p.name}</span>
                {p.closed && <span className="c-verdict">Closed</span>}
                <span className="c-muted ml-auto mono text-[13px]">pool {gen(p.pool)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
