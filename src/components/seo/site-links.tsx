import Link from 'next/link';

const links = [
  { href: '/gameon-multisports-league', label: 'Multisports League' },
  { href: '/sponsorship', label: 'Sponsorship' },
  { href: '/blogs', label: 'GameOn Blogs' },
  { href: '/site-map', label: 'Site directory' },
];

export function SiteLinks({ tone = 'dark' }: { tone?: 'light' | 'dark' }) {
  return <nav aria-label="Explore GameOn" className={`border-t px-6 py-8 ${tone === 'light' ? 'border-go-black/10' : 'border-white/10'}`}>
    <div className="mx-auto max-w-6xl">
      <h2 className={`mb-4 text-lg font-semibold ${tone === 'light' ? 'text-go-black' : 'text-go-white'}`}>Explore GameOn</h2>
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {links.map(link => <li key={link.href}><Link href={link.href} className={`inline-flex min-h-11 items-center rounded text-sm focus-visible:outline-2 ${tone === 'light' ? 'text-go-navy hover:text-go-brand-dark focus-visible:outline-go-brand-dark' : 'text-go-off/80 hover:text-go-brand focus-visible:outline-go-brand'}`}>{link.label}</Link></li>)}
      </ul>
    </div>
  </nav>;
}