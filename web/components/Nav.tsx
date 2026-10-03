import Link from 'next/link';

import { WalletButton } from './Wallet';

/** The site's mark, the same drawing as app/icon.svg without its ground: a source and its translation, line for line. */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="106 106 300 300" aria-hidden style={{ flexShrink: 0 }}>
      <rect x="106" y="106" width="300" height="300" rx="46" fill="#60a5fa" />
      <rect x="151" y="190" width="88" height="24" rx="7" fill="#04172b" />
      <rect x="151" y="244" width="66" height="24" rx="7" fill="#04172b" />
      <rect x="151" y="298" width="80" height="24" rx="7" fill="#04172b" />
      <rect x="254" y="178" width="4" height="156" rx="2" fill="#04172b" />
      <rect x="273" y="190" width="88" height="24" rx="7" fill="#04172b" />
      <rect x="295" y="244" width="66" height="24" rx="7" fill="#04172b" />
      <rect x="281" y="298" width="80" height="24" rx="7" fill="#04172b" />
    </svg>
  );
}

export function Nav() {
  return (
    <header className="c-nav">
      <div className="c-wrap c-nav-row">
        <Link href="/" className="c-brand" aria-label="Faithful home">
          <Mark />
          Faithful
        </Link>
        <nav className="c-links" aria-label="Main">
          <Link href="/programs">Programs</Link>
          <Link href="/me">Translators</Link>
          <Link href="/#maintainers">For maintainers</Link>
          <Link href="/docs">Docs</Link>
        </nav>
        <div className="c-nav-right">
          <span className="c-pill hidden sm:inline-flex" title="GenLayer Studio Next, chain 61997">
            <span className="dot" />
            Studio Next
          </span>
          <WalletButton />
          <Link href="/new" className="c-btn small solid hidden sm:inline-flex">
            Start a program
          </Link>
        </div>
      </div>
    </header>
  );
}
