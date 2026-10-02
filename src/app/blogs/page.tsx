import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { BLOG_PAGE_SIZE, blogDate, blogPage } from '@/lib/blog';
import { getPublishedBlogs } from '@/lib/blogs/queries';
import { SITE_NAME, absoluteUrl, pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ searchParams }: Props) {
  const page = blogPage((await searchParams).page);
  return pageMetadata({ title: page > 1 ? `GameOn Blogs — Page ${page}` : 'GameOn Blogs — Sports Guides & Stories', description: 'Sports guides, player stories, tournament news and updates from GameOn Multisports in Sector 70, Gurugram.', path: page > 1 ? `/blogs?page=${page}` : '/blogs' });
}

export default async function BlogsPage({ searchParams }: Props) {
  const page = blogPage((await searchParams).page);
  const { posts, count } = await getPublishedBlogs(page);
  if (page > 1 && !posts.length) notFound();
  const pages = Math.ceil(count / BLOG_PAGE_SIZE);
  return <>
    <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'GameOn Blogs', path: '/blogs' }]} />
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Blog', name: 'GameOn Blogs', url: absoluteUrl('/blogs'), publisher: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') }, blogPost: posts.map(post => ({ '@type': 'BlogPosting', headline: post.title, url: absoluteUrl(`/blogs/${post.slug}`), datePublished: post.published_at, description: post.excerpt })) }} />
    <header className="mb-12 max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-widest text-go-brand">From the GameOn community</p>
      <h1 className="mt-3 font-display text-5xl text-go-white sm:text-6xl">GameOn Blogs</h1>
      <p className="mt-5 text-lg leading-8 text-go-off/80">Sports guides, stories from the court, tournament updates and more. A closer look at the games and people that bring us together in Gurugram.</p>
    </header>
    {!posts.length ? <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8"><h2 className="text-2xl font-semibold">Our next story is on its way</h2><p className="mt-3 text-go-off/80">Check back for new stories from GameOn. In the meantime, <Link href="/gameon-multisports-league" className="text-go-brand underline">explore the Multisports League</Link>.</p></section> : <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map(post => <article key={post.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        {post.cover_image_url ? <Link href={`/blogs/${post.slug}`} tabIndex={-1} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- validated Supabase media uploads; no remote image optimizer configured */}
          <img src={post.cover_image_url} alt={post.cover_image_alt} width={1200} height={675} loading="lazy" className="aspect-video w-full object-cover" />
        </Link> : null}
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-go-brand">{post.category}</p>
          <h2 className="mt-3 text-2xl font-semibold leading-snug"><Link href={`/blogs/${post.slug}`} className="rounded hover:text-go-brand focus-visible:outline-2 focus-visible:outline-go-brand">{post.title}</Link></h2>
          <p className="mt-4 leading-7 text-go-off/80">{post.excerpt}</p>
          <p className="mt-5 text-sm text-go-off/70">{post.author_name}{post.published_at ? <> · <time dateTime={post.published_at}>{blogDate(post.published_at)}</time></> : null}</p>
        </div>
      </article>)}
    </div>}
    {pages > 1 ? <nav aria-label="Blog pagination" className="mt-12 flex items-center justify-between gap-4 text-sm">
      {page > 1 ? <Link rel="prev" href={page === 2 ? '/blogs' : `/blogs?page=${page - 1}`} className="rounded border border-white/20 px-5 py-3 hover:border-go-brand focus-visible:outline-2 focus-visible:outline-go-brand">Previous</Link> : <span />}
      <span>Page {page} of {pages}</span>
      {page < pages ? <Link rel="next" href={`/blogs?page=${page + 1}`} className="rounded border border-white/20 px-5 py-3 hover:border-go-brand focus-visible:outline-2 focus-visible:outline-go-brand">Next</Link> : <span />}
    </nav> : null}
  </>;
}