import Link from 'next/link';
import type { ReactNode } from 'react';
import { Navigation } from '@/components/Navigation';
import { SiteLinks } from '@/components/seo/site-links';

export default function BlogLayout({ children }: { children: ReactNode }) {
  return <>
    <Navigation />
    <main className="mx-auto min-h-[65vh] max-w-6xl px-6 py-10 text-go-black sm:py-16 lg:pt-36">{children}</main>
    <footer className="pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0"><SiteLinks tone="light" /><div className="mx-auto flex max-w-6xl flex-wrap gap-6 px-6 pb-8 text-sm text-go-navy"><Link href="/privacy" className="hover:text-go-brand-dark focus-visible:outline-2 focus-visible:outline-go-brand-dark">Privacy Policy</Link><Link href="/terms" className="hover:text-go-brand-dark focus-visible:outline-2 focus-visible:outline-go-brand-dark">Terms of Use</Link></div></footer>
  </>;
}