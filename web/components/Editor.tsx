'use client';

import { useEffect, useMemo, useState } from 'react';

import { dayTime, gen, short } from '@/lib/format';
import { checkRows } from '@/lib/precheck.mjs';
import { VERDICT_LABEL, currentSubmission, dirOf, expired, glossaryFor, langName, shownState, timeLeft } from '@/lib/program';
import type { Program, Section, Submission } from '@/lib/types';

import { TxProgress, readFresh, useWrite } from './Actions';
import { Addr, StateBadge, Tx, VerdictBadge } from './ui';
import { WalletGate } from './Wallet';

type Links = Record<string, { submit?: string; judge?: string }>;

function draftKey(id: number, lang: string): string {
  return `faithful:draft:${id}:${lang}`;
}

function readDraft(id: number, lang: string): string {
  try {
    return window.localStorage.getItem(draftKey(id, lang)) ?? '';
  } catch {
    return '';
  }
}

function writeDraft(id: number, lang: string, text: string): void {
  try {
    if (text) window.localStorage.setItem(draftKey(id, lang), text);
    else window.localStorage.removeItem(draftKey(id, lang));
  } catch {
    /* a draft is a convenience only */
  }
}

function History({ subs, links, lang }: { subs: Submission[]; links: Links; lang: string }) {
  if (!subs.length) return null;
  return (
    <div className="mt-10">
      <p className="c-eyebrow">Submissions in this language</p>
      <div className="c-card mt-3">
        {subs.map((s) => (
          <details key={s.id} className="border-b border-[var(--line)] px-5 py-4 last:border-b-0">
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2">
              <VerdictBadge verdict={s.verdict} />
              <span className="c-faint mono text-[12px]">
                #{s.id} · attempt {s.attempt} · {dayTime(s.submitted_at)}
              </span>
              <Addr address={s.translator} />
            </summary>
            <div className="mt-3 flex flex-col gap-2 text-[14px]">
              {s.verdict === 'PRECHECK_FAILED' ? (
                <ul className="c-muted list-disc pl-5">
                  {s.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              ) : s.reason ? (
                <p className="c-muted">{s.reason}</p>
              ) : null}
              {s.text && (
                <p className="c-text c-card pad" dir={dirOf(lang)} lang={lang}>
                  {s.text}
                </p>
              )}
              <p className="flex flex-wrap gap-4">
                <Tx hash={links[String(s.id)]?.submit} label="submit" />
                <Tx hash={links[String(s.id)]?.judge} label="judge" />
                {s.judged_by && (
                  <span className="c-faint text-[12.5px]">
                    judge asked by <span className="mono">{short(s.judged_by)}</span>
                  </span>
                )}
                {BigInt(s.credited) > 0n && <span className="mono text-[12.5px] text-[var(--accent-ink)]">{gen(s.credited)} credited</span>}
              </p>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

export function Editor({ section, program, lang, links }: { section: Section; program: Program; lang: string; links: Links }) {
  const slot = section.langs.find((l) => l.lang === lang)!;
  const { w, state, busy, run } = useWrite([`section:${section.id}`, `program:${program.id}`]);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const subs = section.submissions.filter((s) => s.lang === lang);
  const current = currentSubmission(slot, subs);
  const [text, setText] = useState('');
  const [step, setStep] = useState('');

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setText(readDraft(section.id, lang));
  }, [section.id, lang]);

  const rows = useMemo(() => checkRows(section.text, text), [section.text, text]);
  const allPass = text.trim() !== '' && rows.every((r) => r.ok);
  const terms = glossaryFor(program.glossary, lang, section.text);
  const shown = shownState(slot, now);
  const mine = !!w.account && slot.translator.toLowerCase() === w.account.toLowerCase();
  const holding = mine && slot.state === 'CLAIMED' && !expired(slot, now);
  const target = langName(program, lang);
  const approved = slot.state === 'APPROVED' ? subs.find((s) => s.id === slot.approved) : undefined;
  const pending = slot.state === 'JUDGING' ? subs.find((s) => s.id === slot.latest) : undefined;

  // The holder picks up where their last submission left off.
  useEffect(() => {
    if (holding && current?.text && !readDraft(section.id, lang)) setText(current.text);
  }, [holding, current?.text, section.id, lang]);

  function edit(value: string) {
    setText(value);
    writeDraft(section.id, lang, value);
  }

  async function submitAndJudge() {
    setStep('submit');
    const done = await run('submit', [section.id, lang, text]);
    if (done.phase !== 'done') return setStep('');
    const id = Number(done.returned);
    const fresh = await readFresh<Section>('get_section', [section.id]).catch(() => null);
    const sub = fresh?.submissions.find((s) => s.id === id);
    if (sub?.verdict === 'PRECHECK_FAILED') return setStep('');
    setStep('judge');
    const judged = await run('judge', [id]);
    if (judged.phase === 'done') writeDraft(section.id, lang, '');
    setStep('');
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="c-h2">
            Section {section.id}, {program.src_name} to {target}
          </h1>
          <p className="c-muted mt-2 text-[14.5px]">
            {program.name} · <span className="mono">{gen(program.rate)}</span>
            {slot.state === 'CLAIMED' && !expired(slot, now) && <> · claim expires in {timeLeft(slot.expires_at, now)}</>}
            {slot.state === 'CLAIMED' && !expired(slot, now) && <> · attempt {slot.attempt} of 2</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {program.langs.map((l) => (
            <a key={l.code} href={`/s/${section.id}/${l.code}`} className="c-tab inline-flex items-center" aria-selected={l.code === lang}>
              {l.code.toUpperCase()}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px]">
        <div className="c-card pad">
          <p className="c-eyebrow mb-3">Source, {program.src_name}</p>
          <p className="c-text" lang={program.src_lang}>
            {section.text}
          </p>
        </div>

        <div className="c-card pad">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="c-eyebrow">
              {approved ? 'Approved translation' : holding ? 'Your translation' : 'Translation'}, {target}
            </p>
            <StateBadge shown={shown} />
          </div>
          {approved ? (
            <div className="flex flex-col gap-3">
              <p className="c-text" dir={dirOf(lang)} lang={lang}>
                {approved.text}
              </p>
              <div className="c-note accent">
                <VerdictBadge verdict="FAITHFUL" /> <span className="ml-2">{approved.reason}</span>
              </div>
              <p className="text-[13px]">
                <span className="mono text-[var(--accent-ink)]">{gen(approved.credited)}</span> <span className="c-faint">to</span>{' '}
                <Addr address={approved.translator} /> · <Tx hash={links[String(approved.id)]?.judge} label="judged" />
              </p>
            </div>
          ) : pending ? (
            <div className="flex flex-col gap-3">
              <p className="c-text" dir={dirOf(lang)} lang={lang}>
                {pending.text}
              </p>
              <p className="c-note">This translation passed the exact checks and is waiting for the validators.</p>
            </div>
          ) : current && !holding && !expired(slot, now) ? (
            <div className="flex flex-col gap-3">
              <p className="c-text" dir={dirOf(lang)} lang={lang}>
                {current.text}
              </p>
              <p className="c-note">The latest submission by the translator who holds this claim.</p>
            </div>
          ) : (
            <textarea
              className="c-editor"
              dir={dirOf(lang)}
              lang={lang}
              value={text}
              onChange={(e) => edit(e.target.value)}
              placeholder={holding ? `Write the ${target} translation here.` : `Claim the section to translate it into ${target}. You can draft here first.`}
              aria-label={`Translation into ${target}`}
            />
          )}
        </div>

        <aside className="flex flex-col gap-4">
          {!approved && (
            <div className="c-card pad">
              <p className="c-eyebrow">Exact checks</p>
              <div className="mt-2">
                {rows.map((r) => (
                  <div key={r.key} className={`c-check ${text.trim() === '' ? '' : r.ok ? 'ok' : 'bad'}`}>
                    <span className="mark" aria-hidden>
                      {text.trim() === '' ? '·' : r.ok ? '✓' : '✗'}
                    </span>
                    <span>
                      {r.label}
                      {r.detail && <span className="c-faint block text-[12.5px]">{r.detail}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="c-card pad">
            <p className="c-eyebrow">Glossary in this section</p>
            {terms.length ? (
              <ul className="mt-2 flex flex-col gap-1.5 text-[13.5px]">
                {terms.map((t) => (
                  <li key={t.term} className="flex justify-between gap-3">
                    <span>{t.term}</span>
                    <span className="c-muted text-right" dir={t.keep ? 'ltr' : dirOf(lang)}>
                      {t.keep ? 'keep' : t.rendering}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="c-muted mt-2 text-[13.5px]">No glossary terms appear in this section.</p>
            )}
          </div>

          <div className="c-card pad flex flex-col gap-3">
            {approved ? (
              <p className="c-muted text-[14px]">
                This section is approved in {target} and is in the{' '}
                <a className="c-link" href={`/export/${program.id}/${lang}`}>
                  export
                </a>
                .
              </p>
            ) : pending ? (
              <WalletGate action="ask the validators">
                <button className="c-btn solid wide" disabled={busy} onClick={() => run('judge', [pending.id])}>
                  Ask the validators
                </button>
                <p className="c-faint text-[12.5px]">Anyone can ask. The verdict is the validators&apos;, whoever sends it.</p>
              </WalletGate>
            ) : holding ? (
              <WalletGate action="submit">
                <button className="c-btn solid wide" disabled={busy || !allPass} onClick={submitAndJudge}>
                  Submit for checking
                </button>
                <p className="c-faint text-[12.5px]">
                  {allPass ? 'Two signatures: the submission, then the judge.' : 'Every exact check must pass first; the contract runs the same ones.'} One
                  revision allowed if flawed.
                </p>
              </WalletGate>
            ) : shown === 'OPEN' ? (
              program.closed ? (
                <p className="c-note">This program is closed.</p>
              ) : program.payable_sections < 1 ? (
                <p className="c-note">The pool cannot pay for another section until the program is topped up.</p>
              ) : (
                <WalletGate action="claim this section">
                  <button className="c-btn solid wide" disabled={busy} onClick={() => run('claim', [section.id, lang])}>
                    Claim for 48 hours
                  </button>
                  <p className="c-faint text-[12.5px]">
                    {gen(program.rate)} is reserved for you while you translate. You can hold three claims at once.
                  </p>
                </WalletGate>
              )
            ) : (
              <p className="c-muted text-[14px]">
                Claimed by <Addr address={slot.translator} /> until {dayTime(slot.expires_at)}. It reopens if it is not
                submitted by then.
              </p>
            )}
            <TxProgress
              state={state}
              waiting={step === 'judge' || state.method === 'judge' ? 'Validators are comparing the texts' : state.method === 'submit' ? 'Running the exact checks on chain' : 'Validators are recording it'}
            />
            {current && current.verdict === 'PRECHECK_FAILED' && holding && (
              <div className="c-note">
                <p className="font-medium">The last submission failed the exact checks:</p>
                <ul className="mt-1 list-disc pl-5">
                  {current.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <p className="c-faint mt-1 text-[12.5px]">No judge ran and no attempt was used. Fix it and submit again.</p>
              </div>
            )}
            {current && current.verdict === 'FLAWED' && holding && (
              <div className="c-note">
                <p className="font-medium">{VERDICT_LABEL.FLAWED}: {current.reason}</p>
                <p className="c-faint mt-1 text-[12.5px]">This is your one revision. A second flawed verdict releases the claim.</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      <History subs={subs} links={links} lang={lang} />
    </div>
  );
}
