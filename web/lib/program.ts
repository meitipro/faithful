import { gen } from './format';
import type { Glossary, Program, Slot, Submission, Verdict } from './types';

/** What a cell on the board says. Never a colour alone: every state is a word. */
export type Shown = 'OPEN' | 'CLAIMED' | 'JUDGING' | 'OK' | 'FLAWED' | 'PRE';

export const SHOWN_LABEL: Record<Shown, string> = {
  OPEN: 'Open',
  CLAIMED: 'Claimed',
  JUDGING: 'Judging',
  OK: 'OK',
  FLAWED: 'Flawed',
  PRE: 'Pre-check',
};

/**
 * The state a reader sees, from the contract's fields and the reader's clock.
 * A claim past its 48 hours still reads CLAIMED on chain until the next claim
 * or close sweeps it, so it shows as open: anyone may claim it now.
 */
export function shownState(slot: Slot, now = Math.floor(Date.now() / 1000)): Shown {
  if (slot.state === 'APPROVED') return 'OK';
  if (slot.state === 'JUDGING') return 'JUDGING';
  if (slot.state === 'OPEN') return 'OPEN';
  if (slot.expires_at <= now) return 'OPEN';
  if (slot.last_verdict === 'FLAWED' && slot.attempt >= 2) return 'FLAWED';
  if (slot.last_verdict === 'PRECHECK_FAILED') return 'PRE';
  return 'CLAIMED';
}

export function expired(slot: Slot, now = Math.floor(Date.now() / 1000)): boolean {
  return slot.state === 'CLAIMED' && slot.expires_at <= now;
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  PENDING: 'Judging',
  PRECHECK_FAILED: 'Pre-check failed',
  FAITHFUL: 'Faithful',
  FLAWED: 'Flawed',
  WRONG_LANGUAGE: 'Wrong language',
};

/** "46 h", "35 min", or "expired". */
export function timeLeft(expiresAt: number, now = Math.floor(Date.now() / 1000)): string {
  const left = expiresAt - now;
  if (left <= 0) return 'expired';
  if (left >= 2 * 3600) return `${Math.floor(left / 3600)} h`;
  if (left >= 3600) return `1 h ${Math.floor((left - 3600) / 60)} min`;
  return `${Math.max(1, Math.floor(left / 60))} min`;
}

/** Right-to-left scripts among the languages the contract knows. */
export const RTL = new Set(['fa', 'ar', 'ur']);

export function dirOf(lang: string): 'rtl' | 'ltr' {
  return RTL.has(lang) ? 'rtl' : 'ltr';
}

/** The glossary lines for one language, only for terms in this source, as the contract builds them for the judge. */
export function glossaryFor(glossary: Glossary, lang: string, source: string): { term: string; rendering: string; keep: boolean }[] {
  const low = source.toLowerCase();
  const out: { term: string; rendering: string; keep: boolean }[] = [];
  for (const [term, value] of Object.entries(glossary)) {
    if (!low.includes(term.toLowerCase())) continue;
    const rendering = typeof value === 'string' ? value : value[lang] ?? '';
    if (!rendering) continue;
    out.push({ term, rendering: rendering === 'keep' ? term : rendering, keep: rendering === 'keep' });
  }
  return out;
}

/** How many glossary entries a language has. */
export function glossaryCount(glossary: Glossary): number {
  return Object.keys(glossary).length;
}

export function langName(p: Program, code: string): string {
  return p.langs.find((l) => l.code === code)?.name ?? code;
}

export function poolLine(p: Program): string {
  return `${gen(p.free)} free · enough for ${p.payable_sections} more section${p.payable_sections === 1 ? '' : 's'}`;
}

/** The submission that belongs to the current claim on a slot, if any: newest first, made by its holder after the claim began. */
export function currentSubmission(slot: Slot, submissions: Submission[]): Submission | undefined {
  return submissions.find(
    (s) => s.lang === slot.lang && slot.translator && s.translator.toLowerCase() === slot.translator.toLowerCase() && s.submitted_at >= slot.claimed_at,
  );
}
