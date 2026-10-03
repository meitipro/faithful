import type { Metadata } from 'next';
import Link from 'next/link';

import { Empty, Progress, ReadError } from '@/components/ui';
import { gen, plural } from '@/lib/format';
import { allPrograms, isGolden, readError } from '@/lib/read';
import type { Program } from '@/lib/types';

export const metadata: Metadata = { title: 'Programs' };
export const revalidate = 20;

function Row({ p }: { p: Program }) {
  const approved = p.langs.reduce((sum, l) => sum + l.approved, 0);
  const cells = p.sections * p.langs.length;
  return (
    <Link href={`/p/${p.id}`} className="c-row-link border-b border-[var(--line)] px-5 py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[16px] font-medium">{p.name}</span>
        {p.closed && <span className="c-verdict">Closed</span>}
        <span className="c-faint text-[13px]">
          {p.src_name} → {p.langs.map((l) => l.name).join(', ')}
        </span>
      </div>
      <div className="mt-3 grid gap-4 text-[13.5px] sm:grid-cols-[1fr_1fr_1.3fr]">
        <span className="c-muted">
          <span className="mono text-[var(--ink)]">{gen(p.rate)}</span> per section · {plural(p.sections, 'section')}
        </span>
        <span className="c-muted">
          Pool <span className="mono text-[var(--ink)]">{gen(p.pool)}</span> · {p.closed ? 'returned' : `enough for ${p.payable_sections} more`}
        </span>
        <span className="flex items-center gap-3">
          <span className="c-faint mono shrink-0 text-[12px]">
            {approved}/{cells} approved
          </span>
          <span className="flex-1">
            <Progress value={approved} total={cells} />
          </span>
        </span>
      </div>
    </Link>
  );
}

export default async function ProgramsPage() {
  let programs: Program[] = [];
  let error = '';
  try {
    programs = await allPrograms();
  } catch (e) {
    error = readError(e);
  }
  const live = programs.filter((p) => !isGolden(p));
  const golden = programs.filter(isGolden);
  return (
    <div className="c-wrap py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="c-eyebrow">Programs</p>
          <h1 className="c-h2 mt-2">Docs looking for translators</h1>
          <p className="c-muted mt-2 max-w-[40em] text-[15px]">
            Open a program, pick a section in a language you write, and claim it. Every number here is read from the
            contract.
          </p>
        </div>
        <Link href="/new" className="c-btn solid">
          Start a program
        </Link>
      </div>
      <div className="mt-8">
        {error ? (
          <ReadError message={error} />
        ) : live.length ? (
          <div className="c-card">{live.map((p) => <Row key={p.id} p={p} />)}</div>
        ) : (
          <Empty>No programs yet. Start the first one.</Empty>
        )}
      </div>
      {golden.length > 0 && (
        <div className="mt-10">
          <p className="c-eyebrow">The evaluation</p>
          <p className="c-muted mt-2 text-[14px]">
            The golden cases from the build spec, run through real consensus on this contract. Their results are in the{' '}
            <Link href="/docs/more/evaluation" className="c-link">
              evaluation
            </Link>
            .
          </p>
          <div className="c-card mt-3">{golden.map((p) => <Row key={p.id} p={p} />)}</div>
        </div>
      )}
    </div>
  );
}
