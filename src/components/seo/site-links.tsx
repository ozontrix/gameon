import Link from 'next/link';

const links = [
  { href: '/gameon-multisports-league', label: 'Multisports League' },
  { href: '/sponsorship', label: 'Sponsorship' },
  { href: '/blogs', label: 'GameOn Blogs' },
  { href: '/site-map', label: 'Site directory' },
];

export function SiteLinks() {
  return <nav aria-label="Explore GameOn" className="border-t border-white/10 px-6 py-8">
    <div className="mx-auto max-w-6xl">
      <h2 className="mb-4 text-lg font-semibold text-go-white">Explore GameOn</h2>
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {links.map(link => <li key={link.href}><Link href={link.href} className="inline-flex min-h-11 items-center rounded text-sm text-go-off/80 hover:text-go-brand focus-visible:outline-2 focus-visible:outline-go-brand">{link.label}</Link></li>)}
      </ul>
    </div>
  </nav>;
}