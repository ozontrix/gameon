import Link from 'next/link';
import { LegalPageShell } from '@/components/LegalPageShell';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { SPORTS } from '@/components/league/data';
import { PUBLIC_PAGES, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({ title: 'Site Directory', description: 'Find GameOn sports, tournaments, sponsorships, blogs and policies in one place.', path: '/site-map' });

export default function SiteMapPage() {
  return <LegalPageShell title="Explore GameOn" eyebrow="Site directory">
    <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Site directory', path: '/site-map' }]} />
    <ul className="grid gap-4 sm:grid-cols-2">{PUBLIC_PAGES.filter(page => page.path !== '/site-map').map(page => <li key={page.path}><Link href={page.path} className="block rounded-2xl border border-white/10 p-5 hover:border-go-brand focus-visible:outline-2 focus-visible:outline-go-brand"><h2 className="text-lg font-semibold text-go-white">{page.label}</h2><p className="mt-2 text-sm leading-6 text-go-off/80">{page.description}</p></Link></li>)}</ul>
    <section><h2 className="mb-4 text-2xl font-semibold">Multisports League categories</h2><ul className="flex flex-wrap gap-5">{SPORTS.map(sport => <li key={sport.id}><Link href={`/gameon-multisports-league/sports/${sport.id}`} className="inline-flex min-h-11 items-center rounded text-go-brand underline focus-visible:outline-2 focus-visible:outline-go-brand">{sport.name}</Link></li>)}</ul></section>
  </LegalPageShell>;
}