import Link from 'next/link';

import { Addr, Empty, Pair, ReadError, Tx, VerdictBadge } from '@/components/ui';
import { txIndex } from '@/lib/explorer';
import { firstWords, gen } from '@/lib/format';
import { dirOf } from '@/lib/program';
import { allPrograms, getSection, isGolden, listSubmissions, readError } from '@/lib/read';
import type { Program, Section, Submission } from '@/lib/types';

export const revalidate = 20;

const FAQ = [
  {
    q: 'Which languages?',
    a: 'Twenty, from Persian, Spanish and German to Chinese, Japanese and Hindi; the full list is in the docs. Models are strongest in widely spoken languages, so a program translating into a rare one should add a human spot check.',
  },
  {
    q: 'Can I use machine translation?',
    a: 'Yes. The verdict is about the result, not the tool. Raw machine output passes only if it is faithful and reads naturally, and awkward wording that confuses a reader is FLAWED.',
  },
  {
    q: 'What about style?',
    a: 'Style choices that keep the meaning are accepted. Faithful judges meaning and readability, not house style; a project with strong tone rules states them through the glossary.',
  },
  {
    q: 'What happens to a flawed translation?',
    a: 'The first problem is named and the translator gets one revision within the same 48-hour claim. A second FLAWED, or WRONG LANGUAGE, releases the claim so another translator can take the section.',
  },
  {
    q: 'Which network?',
    a: 'GenLayer Studio Next, chain 61997. Every program, verdict and payment on this site is read from the contract and links to its transaction on the explorer.',
  },
];

/** Shorter is better, and plain prose beats Markdown syntax on a card. */
function plainness(text: string): number {
  return text.length + (/^#|\]\(|`/m.test(text) ? 1000 : 0);
}

/** The hero pair: a real faithful English to Persian section, read from the chain. */
async function heroPair(programs: Program[], recent: Submission[]): Promise<{ section: Section; sub: Submission } | null> {
  const live = new Set(programs.filter((p) => !isGolden(p)).map((p) => p.id));
  const faithful = recent.filter((s) => s.verdict === 'FAITHFUL');
  const pool = [
    faithful.filter((s) => s.lang === 'fa' && live.has(s.program_id)),
    faithful.filter((s) => s.lang === 'fa'),
    faithful,
  ].find((list) => list.length) ?? [];
  // The card is a pair a visitor can read at a glance: the shortest of the first few.
  let best: { section: Section; sub: Submission } | null = null;
  for (const pick of pool.slice(0, 5)) {
    const section = await getSection(pick.section_id);
    if (!section.found) continue;
    const sub = section.submissions.find((s) => s.id === pick.id);
    if (sub && (!best || plainness(section.text) < plainness(best.section.text))) best = { section, sub };
  }
  return best;
}

export default async function Landing() {
  let programs: Program[] = [];
  let recent: Submission[] = [];
  let error = '';
  try {
    programs = await allPrograms();
    recent = (await listSubmissions('', 0, 40)).items;
  } catch (e) {
    error = readError(e);
  }
  const hero = error ? null : await heroPair(programs, recent).catch(() => null);
  const txs = await txIndex();
  const golden = new Set(programs.filter(isGolden).map((p) => p.id));
  const names = new Map(programs.map((p) => [p.id, p]));
  const verdicts = recent.filter((s) => s.verdict !== 'PENDING' && !golden.has(s.program_id)).slice(0, 6);
  const shown = verdicts.length ? verdicts : recent.filter((s) => s.verdict !== 'PENDING').slice(0, 6);
  const heroProgram = hero ? names.get(hero.section.program_id) : undefined;
  const rate = heroProgram ? gen(heroProgram.rate) : '';

  return (
    <>
      {/* -- hero ----------------------------------------------------------- */}
      <section className="c-wrap grid gap-12 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-20">
        <div>
          <p className="c-eyebrow">Documentation translation, judged on GenLayer</p>
          <h1 className="c-h1 mt-5">
            Paid translations the <em>maintainer</em> can trust.
          </h1>
          <p className="c-lead mt-6">
            Fund a program for your docs. Translators claim sections and submit, exact checks guard code and numbers, and
            GenLayer validators compare meaning across languages you do not read. Faithful work is paid at once.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/programs" className="c-btn">
              Browse programs
            </Link>
            <Link href="/new" className="c-btn solid">
              Start a program
            </Link>
          </div>
          <p className="c-faint mt-5 text-[13.5px]">Reading needs no wallet. Every approved section links to its check.</p>
        </div>

        <div className="c-card overflow-hidden">
          {error ? (
            <div className="p-5">
              <ReadError message={error} />
            </div>
          ) : hero ? (
            <>
              <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
                <Pair from={hero.section.src_lang} to={hero.sub.lang} />
                <span className="c-faint text-[12.5px]">
                  {hero.section.program_name} · section {hero.section.id}
                </span>
              </div>
              <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2">
                <div className="bg-[var(--surface)] p-5">
                  <p className="c-eyebrow mb-2">Source</p>
                  <p className="c-text serif text-[19px]">“{hero.section.text}”</p>
                </div>
                <div className="bg-[var(--surface)] p-5">
                  <p className="c-eyebrow mb-2">Translation</p>
                  <p className="c-text" dir={dirOf(hero.sub.lang)} lang={hero.sub.lang}>
                    {hero.sub.text}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-3 border-t border-[var(--line)] px-5 py-4">
                <VerdictBadge verdict={hero.sub.verdict} />
                <p className="c-muted min-w-[220px] flex-1 text-[14px] leading-snug">{hero.sub.reason}</p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-3 text-[13px]">
                <span>
                  <span className="mono text-[var(--accent-ink)]">{gen(hero.sub.credited)}</span> <span className="c-faint">to</span>{' '}
                  <Addr address={hero.sub.translator} />
                </span>
                <Tx hash={txs.judge[String(hero.sub.id)]?.hash} label="tx" />
              </div>
            </>
          ) : (
            <div className="p-5">
              <Empty>No section has been judged faithful yet. The first one appears here, read from the chain.</Empty>
            </div>
          )}
        </div>
      </section>

      {/* -- recent verdicts ---------------------------------------------- */}
      <section className="c-wrap pb-16">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="c-eyebrow">Recent verdicts</p>
          {rate && <span className="c-faint text-[13px]">Faithful sections are paid the program&apos;s rate, {rate} here</span>}
        </div>
        {shown.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((s) => (
              <Link key={s.id} href={`/s/${s.section_id}/${s.lang}`} className="c-card block p-4 transition-colors hover:border-[var(--line-strong)]">
                <div className="flex items-center gap-3">
                  <VerdictBadge verdict={s.verdict} />
                  <Pair from={names.get(s.program_id)?.src_lang ?? 'en'} to={s.lang} />
                </div>
                <p className="mt-3 truncate text-[14.5px] font-medium">{names.get(s.program_id)?.name ?? `Program ${s.program_id}`}</p>
                <p className="c-muted mt-1 text-[13.5px] leading-snug">
                  {s.verdict === 'PRECHECK_FAILED' ? s.problems[0] : firstWords(s.reason || 'No reason given.', 16)}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <Empty>No verdicts yet.</Empty>
          </div>
        )}
      </section>

      {/* -- how it works --------------------------------------------------- */}
      <section id="how" className="c-section">
        <div className="c-wrap">
          <p className="c-eyebrow">How it works</p>
          <h2 className="c-h2 mt-3 max-w-[22em]">Claim, translate, check, paid.</h2>
          <div className="c-steps mt-8">
            {[
              ['01', 'Claim', 'Pick a section and a language. It is yours for 48 hours, and its rate is reserved from the pool.'],
              ['02', 'Translate', 'Live checks keep code, numbers and links intact as you type, in your own script and digits.'],
              ['03', 'Check', 'Validators compare meaning across the two languages and agree on one verdict.'],
              ['04', 'Paid', 'Faithful work is credited at once and joins the export; withdraw whenever you like.'],
            ].map(([n, t, d]) => (
              <div key={n}>
                <p className="mono c-faint text-[12px]">{n}</p>
                <p className="c-h3 mt-3">{t}</p>
                <p className="c-muted mt-2 text-[14.5px] leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- exact checks --------------------------------------------------- */}
      <section id="checks" className="c-section">
        <div className="c-wrap c-grid-2">
          <div>
            <p className="c-eyebrow">Exact checks</p>
            <h2 className="c-h2 mt-3">The dangerous mistakes never reach a model.</h2>
            <p className="c-lead mt-5">
              A fee that loses a zero or a command a translator helpfully translated is caught by code, with certainty, before
              any judge runs. Only meaning is left to the validators.
            </p>
            <p className="c-muted mt-4 text-[14.5px]">
              Numbers are compared after Persian and Arabic-Indic digits are converted, so <span className="mono">۱۰</span> and{' '}
              <span className="mono">10</span> are the same number. A failed check costs no judge and no attempt; fix the
              difference and submit again.
            </p>
          </div>
          <div className="c-card">
            {[
              ['Code blocks', 'identical, character for character, in order'],
              ['Inline code', 'identical, in any order'],
              ['Links', 'every URL identical'],
              ['Numbers', 'the same numbers, after digit normalisation'],
              ['Headings', 'the same number of headings'],
              ['Length', 'between 0.4 and 2.5 times the source'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 border-b border-[var(--line)] px-5 py-3 last:border-b-0">
                <span className="font-medium">{k}</span>
                <span className="c-muted text-right text-[14px]">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- for maintainers ------------------------------------------------ */}
      <section id="maintainers" className="c-section">
        <div className="c-wrap">
          <p className="c-eyebrow">For maintainers</p>
          <h2 className="c-h2 mt-3 max-w-[24em]">Fund a program, import your docs, export checked translations.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ['Fund a program', 'Pick the languages, a glossary and a fixed rate per section. The pool is reserved as sections are claimed, so a translator never finishes work the program cannot pay for.'],
              ['Import your docs', 'Paste a Markdown file. It is split at headings into sections of at most 2,500 characters, never inside a code block.'],
              ['Export checked translations', 'Every approved section, in order, as Markdown or JSON, each linked to the transaction that judged it. Close the program and the unused pool comes back.'],
            ].map(([t, d]) => (
              <div key={t} className="c-card pad">
                <p className="c-h3">{t}</p>
                <p className="c-muted mt-2 text-[14.5px] leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/new" className="c-btn solid">
              Start a program
            </Link>
            <Link href="/docs/start-a-program" className="c-btn ghost">
              Read how
            </Link>
          </div>
        </div>
      </section>

      {/* -- faq ------------------------------------------------------------ */}
      <section id="faq" className="c-section">
        <div className="c-wrap c-grid-2">
          <div>
            <p className="c-eyebrow">FAQ</p>
            <h2 className="c-h2 mt-3">Questions maintainers and translators ask.</h2>
          </div>
          <div className="flex flex-col">
            {FAQ.map((f) => (
              <details key={f.q} className="border-b border-[var(--line)] py-4">
                <summary className="cursor-pointer text-[16px] font-medium">{f.q}</summary>
                <p className="c-muted mt-2 text-[14.5px] leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
