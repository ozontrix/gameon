import type { MetadataRoute } from 'next';
import { SPORTS as leagueSports } from '@/components/league/data';
import { SPORTS as olympicsSports } from '@/components/olympics/data';
import { getBlogSitemapEntries } from '@/lib/blogs/queries';
import { PUBLIC_PAGES, absoluteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getBlogSitemapEntries();
  return [
    ...PUBLIC_PAGES.map(page => ({ url: absoluteUrl(page.path) })),
    ...leagueSports.map(sport => ({ url: absoluteUrl(`/gameon-multisports-league/sports/${sport.id}`) })),
    ...olympicsSports.map(sport => ({ url: absoluteUrl(`/gameon-olympics/sports/${sport.id}`) })),
    ...posts.map(post => ({ url: absoluteUrl(`/blogs/${post.slug}`), lastModified: post.updated_at, ...(post.cover_image_url ? { images: [post.cover_image_url] } : {}) })),
  ];
}