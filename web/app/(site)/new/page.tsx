import type { Metadata } from 'next';
import Link from 'next/link';

import { NewProgramForm } from '@/components/NewProgramForm';

export const metadata: Metadata = { title: 'Start a program' };

export default function NewProgramPage() {
  return (
    <div className="c-wrap py-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <p className="c-eyebrow">Start a program</p>
          <h1 className="c-h2 mt-2">Fund translations of your docs</h1>
          <p className="c-muted mt-2 max-w-[40em] text-[15px]">
            Set the languages, a glossary and a rate, fund the pool, and import your docs. Translators claim sections and get
            paid when validators find them faithful.
          </p>
          <div className="mt-8">
            <NewProgramForm />
          </div>
        </div>
        <aside className="flex flex-col gap-4">
          <div className="c-card pad">
            <p className="c-eyebrow">What happens next</p>
            <ol className="c-muted mt-3 flex list-decimal flex-col gap-2 pl-5 text-[14px] leading-relaxed">
              <li>Translators claim one section in one language for 48 hours. Its rate is reserved from the pool.</li>
              <li>Exact code compares code, numbers, links and headings with the source before any judge runs.</li>
              <li>Validators compare meaning. Faithful work is credited at once; flawed work gets one revision.</li>
              <li>Export the approved sections as Markdown or JSON. Close the program to get the unused pool back.</li>
            </ol>
          </div>
          <div className="c-note">
            The rate is fixed when the program opens. Sections cannot be edited once added, so import the version you want
            translated. <Link href="/docs/start-a-program" className="c-link">Read the guide</Link>.
          </div>
        </aside>
      </div>
    </div>
  );
}
