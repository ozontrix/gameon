import type { Metadata } from 'next';

const parsedUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://game-on.in');
if (!['https:', 'http:'].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password || parsedUrl.pathname !== '/' || parsedUrl.search || parsedUrl.hash) {
  throw new Error('NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without a path, query or credentials.');
}
export const SITE_URL = parsedUrl.origin;
export const SITE_NAME = 'GameOn Multisports';
export const SITE_DESCRIPTION = 'Explore badminton, pickleball, box cricket and football at GameOn in Sector 70, Gurugram. Discover courts, tournaments, community stories and sponsorship opportunities.';
export const NO_INDEX: Metadata = { robots: { index: false, follow: false } };
export const isPreviewDeployment = process.env.VERCEL_ENV === 'preview';

export function absoluteUrl(path: string): string {
  return new URL(path, `${SITE_URL}/`).toString();
}

export function pageMetadata({ title, description, path, image = '/social-preview', imageAlt = SITE_NAME }: {
  title: string; description: string; path: string; image?: string; imageAlt?: string;
}): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  return {
    title: { absolute: fullTitle }, description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: { type: 'website', locale: 'en_IN', siteName: SITE_NAME, title: fullTitle, description, url: absoluteUrl(path), images: [{ url: absoluteUrl(image), alt: imageAlt }] },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: [{ url: absoluteUrl(image), alt: imageAlt }] },
  };
}

export const PUBLIC_PAGES = [
  { path: '/', label: 'Home', description: SITE_DESCRIPTION },
  { path: '/gameon-multisports-league', label: 'GameOn Multisports League', description: 'Sports, categories, match dates and entry fees for the GameOn Multisports League.' },
  { path: '/open-play-registrations', label: 'Free Open Play', description: 'Free cricket, football, badminton and pickleball on 18 October 2026 at GameOn, Sector 70, Gurugram. Register your interest.' },
  { path: '/sponsorship', label: 'Sponsorship', description: 'Partner with GameOn for brand visibility and sports community sponsorships in Gurugram.' },
  { path: '/blogs', label: 'GameOn Blogs', description: 'Sports guides, player stories, tournament news and updates from GameOn Multisports in Gurugram.' },
  { path: '/privacy', label: 'Privacy Policy', description: 'How GameOn collects, uses and protects your personal information.' },
  { path: '/terms', label: 'Terms of Use', description: 'Website, booking and sports facility terms for GameOn in Sector 70, Gurugram.' },
  { path: '/delete-account', label: 'Delete Account', description: 'Request deletion of your GameOn account and related personal information.' },
  { path: '/site-map', label: 'Site directory', description: 'Find GameOn sports, tournaments, sponsorships, blogs and policies in one place.' },
] as const;

export function breadcrumbData(items: { name: string; path: string }[]) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: absoluteUrl(item.path) })) };
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}