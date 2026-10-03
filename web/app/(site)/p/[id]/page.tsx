import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { FundBox, MaintainerBox } from '@/components/ProgramActions';
import { Addr, Empty, Progress, ReadError, StateBadge, Tx } from '@/components/ui';
import { txIndex } from '@/lib/explorer';
import { dayTime, gen, plural } from '@/lib/format';
import { glossaryCount, shownState } from '@/lib/program';
import { allSections, getProgram, readError } from '@/lib/read';
import type { BoardRow, Program } from '@/lib/types';

export const revalidate = 20;

export async function generateMetadata(props: PageProps<'/p/[id]'>): Promise<Metadata> {
  const { id } = await props.params;
  try {
    const p = await getProgram(Number(id));
    return { title: p.found ? p.name : `Program ${id}` };
  } catch {
    return { title: `Program ${id}` };
  }
}

export default async function ProgramPage(props: PageProps<'/p/[id]'>) {
  const { id: raw } = await props.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) notFound();
  let p: Program | null = null;
  let rows: BoardRow[] = [];
  let error = '';
  try {
    const found = await getProgram(id);
    if (!found.found) notFound();
    p = found;
    rows = await allSections(id);
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith('NEXT_')) throw e;
    error = readError(e);
  }
  if (!p) {
    return (
      <div className="c-wrap py-12">
        <ReadError message={error} />
      </div>
    );
  }
  const txs = await txIndex();
  const created = txs.program[String(id)];
  const now = Math.floor(Date.now() / 1000);
  const terms = Object.entries(p.glossary);

  return (
    <div className="c-wrap py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="c-eyebrow">Program {p.id}</p>
          <h1 className="c-h2 mt-2">{p.name}</h1>
          <p className="c-muted mt-2 text-[14.5px]">
            source {p.src_name} · {plural(p.langs.length, 'language')} · <span className="mono">{gen(p.rate)}</span> per section ·
            glossary {plural(glossaryCount(p.glossary), 'term')}
            {p.closed && <> · closed {dayTime(p.closed_at)}</>}
          </p>
          <p className="c-faint mt-1 text-[13px]">
            Maintainer <Addr address={p.maintainer} />
            {created && (
              <>
                {' '}
                · opened <Tx hash={created.hash} />
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.langs.map((l) => (
            <Link key={l.code} href={`/export/${p.id}/${l.code}`} className="c-btn small">
              Export {l.code.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-6">
          <ReadError message={error} />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="c-card overflow-x-auto">
          {rows.length ? (
            <table className="c-board">
              <thead>
                <tr>
                  <th>Section</th>
                  {p.langs.map((l) => (
                    <th key={l.code} title={l.name}>
                      {l.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="min-w-[200px]">
                      <Link href={`/s/${row.id}/${p!.langs[0].code}`} className="hover:text-[var(--accent-ink)]">
                        <span className="mono c-faint mr-2 text-[12px]">{row.id}</span>
                        {row.title}
                      </Link>
                      <span className="c-faint mono ml-2 text-[11.5px]">{row.chars} ch</span>
                    </td>
                    {row.states.map((slot) => (
                      <td key={slot.lang}>
                        <StateBadge shown={shownState(slot, now)} href={`/s/${row.id}/${slot.lang}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-5">
              <Empty>No sections yet. The maintainer adds them from a Markdown file.</Empty>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="c-card pad">
            <p className="c-eyebrow">Pool</p>
            <p className="mono mt-2 text-[26px] font-medium">{gen(p.pool)}</p>
            <p className="c-muted mt-1 text-[13.5px]">
              {p.closed
                ? `Closed. ${gen(p.returned)} went back to the maintainer.`
                : p.payable_sections > 0
                  ? `enough for ${p.payable_sections} more section${p.payable_sections === 1 ? '' : 's'}`
                  : 'Open sections are closed until the pool is topped up.'}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-y-1 text-[13px]">
              <dt className="c-faint">Reserved for claims</dt>
              <dd className="mono text-right">{gen(p.reserved)}</dd>
              <dt className="c-faint">Paid to translators</dt>
              <dd className="mono text-right">{gen(p.paid)}</dd>
              <dt className="c-faint">Funded in total</dt>
              <dd className="mono text-right">{gen(p.funded)}</dd>
            </dl>
            {!p.closed && (
              <div className="mt-4">
                <FundBox programId={p.id} />
              </div>
            )}
          </div>

          <div className="c-card pad">
            <p className="c-eyebrow">Progress</p>
            <div className="mt-3 flex flex-col gap-3">
              {p.langs.map((l) => (
                <div key={l.code}>
                  <div className="flex justify-between text-[13.5px]">
                    <span>{l.name}</span>
                    <span className="mono c-muted">
                      {l.approved}/{p!.sections}
                    </span>
                  </div>
                  <div className="mt-1">
                    <Progress value={l.approved} total={p!.sections} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="c-card pad">
            <p className="c-eyebrow">Glossary</p>
            {terms.length ? (
              <table className="mt-2 w-full text-[13.5px]">
                <tbody>
                  {terms.map(([term, value]) => (
                    <tr key={term} className="border-b border-[var(--line)] last:border-b-0">
                      <td className="py-1.5 pr-2 align-top">{term}</td>
                      <td className="c-muted py-1.5 text-right align-top">
                        {value === 'keep'
                          ? 'keep'
                          : Object.entries(value).map(([code, r]) => (
                              <span key={code} className="block">
                                <span className="mono c-faint text-[11px] uppercase">{code}</span> {r}
                              </span>
                            ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="c-muted mt-2 text-[13.5px]">No glossary terms.</p>
            )}
          </div>

          <MaintainerBox program={p} />

          {p.funding_log.length > 0 && (
            <div className="c-card pad">
              <p className="c-eyebrow">Funding</p>
              <ul className="mt-2 flex flex-col gap-1 text-[13px]">
                {p.funding_log.map((f) => (
                  <li key={f.n} className="flex justify-between gap-2">
                    <Addr address={f.funder} />
                    <span className="mono">{gen(f.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
