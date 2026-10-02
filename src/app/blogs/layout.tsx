import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteLinks } from '@/components/seo/site-links';

export default function BlogLayout({ children }: { children: ReactNode }) {
  return <>
    <header className="border-b border-white/10 bg-go-black">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <Link href="/" aria-label="GameOn home" className="font-display text-2xl text-go-white focus-visible:outline-2 focus-visible:outline-go-brand">GAME<span className="text-go-brand">ON</span></Link>
        <nav aria-label="Blog navigation" className="flex flex-wrap gap-5 text-sm text-go-off/80">
          {[['/', 'Home'], ['/blogs', 'GameOn Blogs'], ['/gameon-multisports-league', 'Multisports League']].map(([href, label]) => <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded hover:text-go-brand focus-visible:outline-2 focus-visible:outline-go-brand">{label}</Link>)}
        </nav>
      </div>
    </header>
    <main className="mx-auto min-h-[65vh] max-w-6xl px-6 py-10 text-go-black sm:py-16">{children}</main>
    <footer><SiteLinks tone="light" /><div className="mx-auto flex max-w-6xl flex-wrap gap-6 px-6 pb-8 text-sm text-go-navy"><Link href="/privacy" className="hover:text-go-brand-dark focus-visible:outline-2 focus-visible:outline-go-brand-dark">Privacy Policy</Link><Link href="/terms" className="hover:text-go-brand-dark focus-visible:outline-2 focus-visible:outline-go-brand-dark">Terms of Use</Link></div></footer>
  </>;
}