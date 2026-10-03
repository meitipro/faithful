import Link from 'next/link';

import { DEPLOYMENT } from '@/lib/genlayer-core.mjs';
import { short, shortHash } from '@/lib/format';
import { SHOWN_LABEL, VERDICT_LABEL, type Shown } from '@/lib/program';
import type { Verdict } from '@/lib/types';

export const EXPLORER = DEPLOYMENT.explorer as string;
export const CONTRACT = DEPLOYMENT.faithful as string;

export function txUrl(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}

export function addressUrl(address: string): string {
  return `${EXPLORER}/address/${address}`;
}

export function Tx({ hash, label }: { hash?: string; label?: string }) {
  if (!hash) return null;
  return (
    <a className="c-link mono text-[12.5px]" href={txUrl(hash)} target="_blank" rel="noreferrer">
      {label ? `${label} ` : ''}
      {shortHash(hash)} ↗
    </a>
  );
}

export function Addr({ address }: { address: string }) {
  if (!address) return null;
  return (
    <a className="c-link mono text-[12.5px]" href={addressUrl(address)} target="_blank" rel="noreferrer" title={address}>
      {short(address)}
    </a>
  );
}

/** A cell on the board: a word, with blue only for an approved section. */
export function StateBadge({ shown, href }: { shown: Shown; href?: string }) {
  const badge = <span className={`c-state ${shown.toLowerCase()}`}>{SHOWN_LABEL[shown]}</span>;
  return href ? (
    <Link href={href} className="inline-flex" aria-label={`${SHOWN_LABEL[shown]}, open the editor`}>
      {badge}
    </Link>
  ) : (
    badge
  );
}

/** A verdict: blue for faithful, neutral for every other outcome. */
export function VerdictBadge({ verdict }: { verdict: Verdict | '' }) {
  if (!verdict) return null;
  return <span className={`c-verdict ${verdict === 'FAITHFUL' ? 'yes' : ''}`}>{VERDICT_LABEL[verdict]}</span>;
}

/** "EN → FA" */
export function Pair({ from, to }: { from: string; to: string }) {
  return (
    <span className="mono c-faint text-[12px] uppercase tracking-[0.08em]">
      {from} → {to}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="c-note">{children}</div>;
}

export function ReadError({ message }: { message: string }) {
  return (
    <div className="c-card pad">
      <p className="font-medium">The chain did not answer.</p>
      <p className="c-muted mt-1 text-[14px]">{message}</p>
    </div>
  );
}

export function Progress({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value * 100) / total) : 0;
  return (
    <div className="c-bar" role="img" aria-label={`${value} of ${total}`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
