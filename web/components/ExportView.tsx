'use client';

import { useState } from 'react';

/** The export file, as Markdown or JSON, with copy and download. */
export function ExportView({ md, json, base }: { md: string; json: string; base: string }) {
  const [tab, setTab] = useState<'md' | 'json'>('md');
  const [copied, setCopied] = useState(false);
  const body = tab === 'md' ? md : json;
  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2" role="tablist">
        <button className="c-tab" role="tab" aria-selected={tab === 'md'} onClick={() => setTab('md')}>
          Markdown
        </button>
        <button className="c-tab" role="tab" aria-selected={tab === 'json'} onClick={() => setTab('json')}>
          JSON
        </button>
        <span className="flex-1" />
        <button className="c-btn small" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
        <a className="c-btn small" href={`${base}?format=${tab}`} download>
          Download
        </a>
      </div>
      <pre className="c-code" dir="auto">
        {body}
      </pre>
    </div>
  );
}
