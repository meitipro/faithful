import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Editor } from '@/components/Editor';
import { ReadError } from '@/components/ui';
import { txIndex } from '@/lib/explorer';
import { getProgram, getSection, readError } from '@/lib/read';

export const revalidate = 20;

export async function generateMetadata(props: PageProps<'/s/[id]/[lang]'>): Promise<Metadata> {
  const { id, lang } = await props.params;
  return { title: `Section ${id}, ${lang.toUpperCase()}` };
}

export default async function EditorPage(props: PageProps<'/s/[id]/[lang]'>) {
  const { id: raw, lang } = await props.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) notFound();
  try {
    const section = await getSection(id);
    if (!section.found) notFound();
    const program = await getProgram(section.program_id);
    if (!program.found) notFound();
    if (!program.langs.some((l) => l.code === lang)) notFound();
    const txs = await txIndex();
    const links: Record<string, { submit?: string; judge?: string }> = {};
    for (const s of section.submissions) links[String(s.id)] = { submit: txs.submit[String(s.id)]?.hash, judge: txs.judge[String(s.id)]?.hash };
    return (
      <div className="c-wrap py-10">
        <p className="c-faint text-[13px]">
          <Link href={`/p/${program.id}`} className="hover:text-[var(--ink)]">
            {program.name}
          </Link>{' '}
          / section {section.index} of {program.sections}
        </p>
        <Editor section={section} program={program} lang={lang} links={links} />
      </div>
    );
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith('NEXT_')) throw e;
    return (
      <div className="c-wrap py-12">
        <ReadError message={readError(e)} />
      </div>
    );
  }
}
