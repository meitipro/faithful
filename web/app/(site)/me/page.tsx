import type { Metadata } from 'next';

import { MePanel } from '@/components/MePanel';
import { allPrograms } from '@/lib/read';
import type { Program } from '@/lib/types';

export const metadata: Metadata = { title: 'Translator page' };
export const revalidate = 20;

export default async function MePage(props: PageProps<'/me'>) {
  const search = await props.searchParams;
  const address = typeof search.address === 'string' ? search.address : '';
  let programs: { id: number; name: string; maintainer: string; src_lang: string; closed: boolean; pool: string }[] = [];
  try {
    programs = (await allPrograms()).map((p: Program) => ({ id: p.id, name: p.name, maintainer: p.maintainer, src_lang: p.src_lang, closed: p.closed, pool: p.pool }));
  } catch {
    programs = [];
  }
  return (
    <div className="c-wrap py-12">
      <p className="c-eyebrow">Translators</p>
      <h1 className="c-h2 mt-2">Claims, submissions, verdicts and balance</h1>
      <p className="c-muted mt-2 max-w-[40em] text-[15px]">
        Everything a translator has on the contract, read from the chain for the connected wallet, or for any address with
        <span className="mono text-[13.5px]"> ?address=0x…</span>.
      </p>
      <div className="mt-8">
        <MePanel address={address} programs={programs} />
      </div>
    </div>
  );
}
