import { txIndex } from '@/lib/explorer';
import { exportJson, exportMarkdown } from '@/lib/export';
import { getExport } from '@/lib/read';

/**
 * GET /api/export/<program>/<lang>?format=md|json
 * The approved translations of one program in one language, for docs pipelines.
 */
export async function GET(request: Request, { params }: RouteContext<'/api/export/[id]/[lang]'>) {
  const { id, lang } = await params;
  const format = new URL(request.url).searchParams.get('format') === 'json' ? 'json' : 'md';
  const programId = Number(id);
  if (!Number.isInteger(programId) || programId < 1) return Response.json({ error: 'unknown program' }, { status: 404 });
  try {
    const e = await getExport(programId, lang.toLowerCase());
    if (!e.found) return Response.json({ error: 'unknown program or language' }, { status: 404 });
    const txs = await txIndex();
    if (format === 'json') return Response.json(exportJson(e, txs));
    return new Response(exportMarkdown(e, txs), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
  } catch {
    return Response.json({ error: 'Studio Next did not answer this read. Try again in a moment.' }, { status: 502 });
  }
}
