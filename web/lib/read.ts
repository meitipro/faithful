import { unstable_cache } from 'next/cache';

import { CONTRACT, readClient, retried } from './genlayer-core.mjs';
import type { Board, BoardRow, Export, NotFound, Program, Section, SubmissionPage } from './types';

/**
 * Reads happen on the server, cached for a short while under tags.
 *
 * Studio Next rate-limits each IP, and every visitor's page view would
 * otherwise spend the server's budget. Shared reads are cached for 20 seconds;
 * after a decided write the page POSTs /api/refresh, which expires the tags it
 * touched, so the person who wrote sees their own result at once.
 */

const client = readClient();
const REVALIDATE = 20;

async function view<T>(method: string, args: (number | string)[]): Promise<T> {
  const raw = await retried(() => client.readContract({ address: CONTRACT, functionName: method, args }), 3);
  return JSON.parse(String(raw)) as T;
}

export const tags = {
  programs: 'programs',
  program: (id: number) => `program:${id}`,
  section: (id: number) => `section:${id}`,
  subs: 'subs',
};

export function getProgram(id: number): Promise<Program | NotFound> {
  return unstable_cache(() => view<Program | NotFound>('get_program', [id]), ['get_program', String(id)], {
    revalidate: REVALIDATE,
    tags: [tags.programs, tags.program(id)],
  })();
}

/** Every program, newest first. get_program answers the count even for an id that does not exist. */
export async function allPrograms(): Promise<Program[]> {
  const head = await getProgram(0);
  const count = head.programs ?? 0;
  const out: Program[] = [];
  for (let id = count; id >= 1; id--) {
    const p = await getProgram(id);
    if (p.found) out.push(p);
  }
  return out;
}

export function getSection(id: number): Promise<Section | NotFound> {
  return unstable_cache(() => view<Section | NotFound>('get_section', [id]), ['get_section', String(id)], {
    revalidate: REVALIDATE,
    tags: [tags.programs, tags.section(id)],
  })();
}

export function listSections(programId: number, lang = '', status = '', offset = 0, limit = 50): Promise<Board | NotFound> {
  return unstable_cache(
    () => view<Board | NotFound>('list_sections', [programId, lang, status, offset, limit]),
    ['list_sections', String(programId), lang, status, String(offset), String(limit)],
    { revalidate: REVALIDATE, tags: [tags.programs, tags.program(programId)] },
  )();
}

/** The whole board of a program, in pages of fifty. */
export async function allSections(programId: number): Promise<BoardRow[]> {
  const first = await listSections(programId, '', '', 0, 50);
  if (!first.found) return [];
  const items = [...first.items];
  for (let offset = 50; offset < first.total; offset += 50) {
    const page = await listSections(programId, '', '', offset, 50);
    if (page.found) items.push(...page.items);
  }
  return items;
}

export function getExport(programId: number, lang: string): Promise<Export | NotFound> {
  return unstable_cache(() => view<Export | NotFound>('export', [programId, lang]), ['export', String(programId), lang], {
    revalidate: REVALIDATE,
    tags: [tags.programs, tags.program(programId)],
  })();
}

export function listSubmissions(translator = '', offset = 0, limit = 20): Promise<SubmissionPage> {
  return unstable_cache(
    () => view<SubmissionPage>('list_submissions', [translator, offset, limit]),
    ['list_submissions', translator.toLowerCase(), String(offset), String(limit)],
    { revalidate: REVALIDATE, tags: [tags.subs, tags.programs] },
  )();
}

/** Programs opened by the golden set in eval/, which lists keep apart from the rest. */
export function isGolden(p: { name: string }): boolean {
  return /^Faithful golden set$/.test(p.name);
}

/** A read failed: say so in one sentence rather than failing the page. */
export function readError(error: unknown): string {
  const text = String((error as Error)?.message ?? error);
  if (/-32029|rate limit/i.test(text)) return 'Studio Next is rate limiting reads right now. Wait a minute and reload.';
  return 'Studio Next did not answer this read. Reload in a moment.';
}
