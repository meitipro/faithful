/** The JSON the contract's views return. Field names are the contract's own. */

export type LangRow = { code: string; name: string; approved: number };

export type Funding = { n: number; funder: string; amount: string; at: number };

/** A source term to "keep", or to a rendering (or "keep") per target language. */
export type Glossary = Record<string, 'keep' | Record<string, string>>;

export type NotFound = { found: false; programs?: number };

export type Program = {
  found: true;
  id: number;
  programs: number;
  name: string;
  maintainer: string;
  src_lang: string;
  src_name: string;
  langs: LangRow[];
  glossary: Glossary;
  rate: string;
  pool: string;
  reserved: string;
  free: string;
  payable_sections: number;
  funded: string;
  fundings: number;
  paid: string;
  returned: string;
  sections: number;
  live_claims: number;
  closed: boolean;
  created_at: number;
  closed_at: number;
  funding_log: Funding[];
};

export type SlotState = 'OPEN' | 'CLAIMED' | 'JUDGING' | 'APPROVED';

export type Verdict = 'PENDING' | 'PRECHECK_FAILED' | 'FAITHFUL' | 'FLAWED' | 'WRONG_LANGUAGE';

export type Slot = {
  lang: string;
  state: SlotState;
  translator: string;
  claimed_at: number;
  expires_at: number;
  attempt: number;
  latest: number;
  last_verdict: Verdict | '';
  approved: number;
};

export type Submission = {
  id: number;
  section_id: number;
  program_id: number;
  lang: string;
  translator: string;
  verdict: Verdict;
  reason: string;
  problems: string[];
  attempt: number;
  submitted_at: number;
  judged_at: number;
  judged_by: string;
  credited: string;
  text?: string;
};

export type Section = {
  found: true;
  id: number;
  program_id: number;
  program_name: string;
  index: number;
  title: string;
  text: string;
  src_lang: string;
  added_at: number;
  langs: Slot[];
  submissions: Submission[];
};

export type BoardRow = { id: number; index: number; title: string; chars: number; states: Slot[] };

export type Board = { found: true; program_id: number; langs: string[]; total: number; offset: number; items: BoardRow[] };

export type ExportItem = {
  section_id: number;
  index: number;
  title: string;
  text: string;
  submission_id: number;
  translator: string;
  judged_at: number;
};

export type Export = {
  found: true;
  program_id: number;
  name: string;
  src_lang: string;
  lang: string;
  lang_name: string;
  sections: number;
  approved: number;
  items: ExportItem[];
};

export type Claim = Slot & { section_id: number; title: string; program_id: number };

export type SubmissionPage = {
  translator: string;
  found: boolean;
  total: number;
  offset: number;
  items: Submission[];
  balance?: string;
  earned?: string;
  withdrawn?: string;
  claims?: Claim[];
};
