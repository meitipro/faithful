import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ExportView } from '@/components/ExportView';
import { Addr, Empty, ReadError, Tx } from '@/components/ui';
import { txIndex } from '@/lib/explorer';
import { exportJson, exportMarkdown } from '@/lib/export';
import { dayTime } from '@/lib/format';
import { dirOf } from '@/lib/program';
import { getExport, readError } from '@/lib/read';

export const revalidate = 20;

export async function generateMetadata(props: PageProps<'/export/[id]/[lang]'>): Promise<Metadata> {
  const { id, lang } = await props.params;
  return { title: `Export, program ${id}, ${lang.toUpperCase()}` };
}

export default async function ExportPage(props: PageProps<'/export/[id]/[lang]'>) {
  const { id: raw, lang } = await props.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) notFound();
  try {
    const e = await getExport(id, lang);
    if (!e.found) notFound();
    const txs = await txIndex();
    const md = exportMarkdown(e, txs);
    const json = JSON.stringify(exportJson(e, txs), null, 2);
    return (
      <div className="c-wrap py-10">
        <p className="c-faint text-[13px]">
          <Link href={`/p/${id}`} className="hover:text-[var(--ink)]">
            {e.name}
          </Link>{' '}
          / export
        </p>
        <h1 className="c-h2 mt-2">
          {e.lang_name} export, {e.approved} of {e.sections} sections
        </h1>
        <p className="c-muted mt-2 max-w-[44em] text-[14.5px]">
          Approved sections in order, as Markdown or JSON. Each one links to the transaction whose validators judged it
          faithful. Pipelines can fetch the same file from <span className="mono text-[13px]">/api/export/{id}/{e.lang}</span>.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ExportView md={md} json={json} base={`/api/export/${id}/${e.lang}`} />
          <div className="c-card">
            {e.items.length ? (
              e.items.map((item) => (
                <div key={item.section_id} className="border-b border-[var(--line)] px-5 py-4 last:border-b-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                    <Link href={`/s/${item.section_id}/${e.lang}`} className="c-link">
                      Section {item.section_id}: {item.title}
                    </Link>
                    <Tx hash={txs.judge[String(item.submission_id)]?.hash} label="judged" />
                  </div>
                  <p className="c-text mt-2" dir={dirOf(e.lang)} lang={e.lang}>
                    {item.text}
                  </p>
                  <p className="c-faint mt-2 text-[12.5px]">
                    by <Addr address={item.translator} /> · {dayTime(item.judged_at)}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-5">
                <Empty>No section is approved in {e.lang_name} yet.</Empty>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (err) {
    if ((err as { digest?: string })?.digest?.startsWith('NEXT_')) throw err;
    return (
      <div className="c-wrap py-12">
        <ReadError message={readError(err)} />
      </div>
    );
  }
}
