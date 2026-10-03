'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import generated from '@/lib/contract.generated.json';
import { gen, toWei } from '@/lib/format';
import { MAX_SECTION, splitSections } from '@/lib/markdown.mjs';
import { send, refreshReads, type TxState } from '@/lib/write';

import { TxProgress } from './Actions';
import { WalletGate, useWallet } from './Wallet';

const LANGS = generated.langs as Record<string, string>;
const MAX_LANGS = generated.limits.langs as number;
const MAX_TERMS = generated.limits.terms as number;

type Term = { term: string; keep: boolean; renderings: Record<string, string> };

export function NewProgramForm() {
  const w = useWallet();
  const router = useRouter();
  const [name, setName] = useState('');
  const [src, setSrc] = useState('en');
  const [targets, setTargets] = useState<string[]>(['fa', 'es', 'de']);
  const [rate, setRate] = useState('12');
  const [funding, setFunding] = useState('120');
  const [terms, setTerms] = useState<Term[]>([]);
  const [markdown, setMarkdown] = useState('');
  const [state, setState] = useState<TxState>({ phase: 'idle' });
  const [stage, setStage] = useState('');

  const sections = useMemo(() => (markdown.trim() ? splitSections(markdown) : []), [markdown]);
  const rateWei = toWei(rate);
  const fundWei = toWei(funding);
  const busy = state.phase === 'signing' || state.phase === 'deciding';

  const glossary = useMemo(() => {
    const out: Record<string, string | Record<string, string>> = {};
    for (const t of terms) {
      const term = t.term.trim();
      if (!term) continue;
      if (t.keep) {
        out[term] = 'keep';
        continue;
      }
      const r: Record<string, string> = {};
      for (const code of targets) if (t.renderings[code]?.trim()) r[code] = t.renderings[code].trim();
      if (Object.keys(r).length) out[term] = r;
    }
    return out;
  }, [terms, targets]);

  const problems: string[] = [];
  if (!name.trim()) problems.push('Name the program.');
  if (!targets.length) problems.push('Pick at least one target language.');
  if (!rateWei || rateWei <= 0n) problems.push('Set a rate above zero.');
  if (!fundWei || fundWei <= 0n) problems.push('A program opens with its first funding.');
  if (sections.some((s) => s.tooLong)) problems.push(`One block of the Markdown is longer than ${MAX_SECTION.toLocaleString('en-US')} characters on its own.`);

  function toggle(code: string) {
    setTargets((t) => (t.includes(code) ? t.filter((c) => c !== code) : t.length >= MAX_LANGS ? t : [...t, code]));
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setMarkdown(await file.text());
  }

  async function open() {
    setStage('create');
    const created = await send(w.account, 'create_program', [name.trim(), src, targets, JSON.stringify(glossary), rateWei], fundWei ?? 0n, setState);
    if (created.phase !== 'done') return setStage('');
    const id = Number(created.returned);
    for (let start = 0; start < sections.length; start += 20) {
      setStage(`sections ${start + 1} to ${Math.min(start + 20, sections.length)}`);
      const batch = sections.slice(start, start + 20).map((s) => ({ title: s.title, text: s.text }));
      const added = await send(w.account, 'add_sections', [id, JSON.stringify(batch)], 0n, setState);
      if (added.phase !== 'done') {
        setStage(`Program ${id} is open, but adding sections stopped. Add the rest from the program page.`);
        await refreshReads(['programs']);
        return;
      }
    }
    await refreshReads(['programs', `program:${id}`]);
    w.refreshBalance();
    router.push(`/p/${id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="c-label" htmlFor="name">
          Program name
        </label>
        <input id="name" className="c-input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="GenLayer docs, community translations" />
      </div>

      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <div>
          <label className="c-label" htmlFor="src">
            Source language
          </label>
          <select id="src" className="c-select" value={src} onChange={(e) => (setSrc(e.target.value), setTargets((t) => t.filter((c) => c !== e.target.value)))}>
            {Object.entries(LANGS).map(([code, n]) => (
              <option key={code} value={code}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="c-label">
            Target languages <span className="c-faint">({targets.length} of at most {MAX_LANGS})</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LANGS)
              .filter(([code]) => code !== src)
              .map(([code, n]) => (
                <button key={code} type="button" className="c-tab" aria-pressed={targets.includes(code)} aria-selected={targets.includes(code)} onClick={() => toggle(code)}>
                  {n}
                </button>
              ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="c-label" htmlFor="rate">
            Rate per section per language, GEN
          </label>
          <input id="rate" className="c-input mono" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <div>
          <label className="c-label" htmlFor="fund">
            First funding, GEN
          </label>
          <input id="fund" className="c-input mono" inputMode="decimal" value={funding} onChange={(e) => setFunding(e.target.value)} />
          {rateWei && fundWei && rateWei > 0n && (
            <p className="c-faint mt-1 text-[12.5px]">
              Enough for {(fundWei / rateWei).toString()} section{fundWei / rateWei === 1n ? '' : 's'} at {gen(rateWei)}. Anyone can top it up later.
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="c-label">Glossary</p>
          <button type="button" className="c-chip" disabled={terms.length >= MAX_TERMS} onClick={() => setTerms((t) => [...t, { term: '', keep: false, renderings: {} }])}>
            + term
          </button>
        </div>
        {terms.length === 0 && <p className="c-faint text-[13px]">Terms translators must render one way, or keep exactly as written. Optional.</p>}
        <div className="flex flex-col gap-3">
          {terms.map((t, i) => (
            <div key={i} className="c-card pad flex flex-col gap-2">
              <div className="flex gap-2">
                <input className="c-input" placeholder="recovery phrase" maxLength={60} value={t.term} onChange={(e) => setTerms((all) => all.map((x, j) => (j === i ? { ...x, term: e.target.value } : x)))} aria-label="Source term" />
                <label className="c-muted flex shrink-0 items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={t.keep} onChange={(e) => setTerms((all) => all.map((x, j) => (j === i ? { ...x, keep: e.target.checked } : x)))} />
                  keep in every language
                </label>
                <button type="button" className="c-btn small ghost" onClick={() => setTerms((all) => all.filter((_, j) => j !== i))} aria-label="Remove term">
                  ×
                </button>
              </div>
              {!t.keep && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {targets.map((code) => (
                    <input
                      key={code}
                      className="c-input text-[14px]"
                      dir="auto"
                      maxLength={60}
                      placeholder={`${LANGS[code]} rendering, or keep`}
                      value={t.renderings[code] ?? ''}
                      onChange={(e) => setTerms((all) => all.map((x, j) => (j === i ? { ...x, renderings: { ...x.renderings, [code]: e.target.value } } : x)))}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="c-label" htmlFor="md">
            Import docs from Markdown
          </label>
          <input type="file" accept=".md,.mdx,.markdown,text/markdown" className="c-muted text-[13px]" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        <textarea id="md" className="c-textarea mono text-[12.5px]" style={{ minHeight: 180 }} value={markdown} onChange={(e) => setMarkdown(e.target.value)} placeholder={'# Keep your recovery phrase safe\n\nNever share your recovery phrase. Anyone who has it can move your funds.'} />
        {sections.length > 0 && (
          <div className="c-card mt-3">
            {sections.map((s, i) => (
              <div key={i} className="flex justify-between gap-3 border-b border-[var(--line)] px-4 py-2 text-[13.5px] last:border-b-0">
                <span className="truncate">{s.title}</span>
                <span className={`mono shrink-0 text-[12px] ${s.tooLong ? 'text-[var(--danger)]' : 'c-faint'}`}>{s.text.length} ch</span>
              </div>
            ))}
          </div>
        )}
        <p className="c-faint mt-1 text-[12.5px]">
          Split at headings, then at blank lines, never inside a code block; at most {MAX_SECTION.toLocaleString('en-US')} characters per section. You can add more later.
        </p>
      </div>

      <WalletGate action="open a program">
        <div className="flex flex-col gap-2">
          {problems.length > 0 && <p className="c-faint text-[13px]">{problems[0]}</p>}
          <button className="c-btn solid wide" disabled={busy || problems.length > 0} onClick={open}>
            Open the program{sections.length ? ` with ${sections.length} section${sections.length === 1 ? '' : 's'}` : ''}
          </button>
          <p className="c-faint text-[12.5px]">
            {sections.length ? `${1 + Math.ceil(sections.length / 20)} signatures: the program with its funding, then the sections in batches of twenty.` : 'One signature: the program with its funding.'}
          </p>
          {stage && !busy && state.phase !== 'refused' && state.phase !== 'error' && stage.startsWith('Program') && <p className="c-note">{stage}</p>}
          <TxProgress state={state} waiting={stage === 'create' ? 'Validators are opening the program' : `Validators are adding ${stage}`} />
        </div>
      </WalletGate>
    </div>
  );
}
