import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BlogContent } from '@/components/blogs/blog-content';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { blogDate, readingMinutes } from '@/lib/blog';
import { getPublishedBlog } from '@/lib/blogs/queries';
import { SITE_NAME, absoluteUrl, pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedBlog((await params).slug);
  if (!post) notFound();
  const metadata = pageMetadata({ title: post.seo_title || post.title, description: post.seo_description || post.excerpt, path: `/blogs/${post.slug}`, image: post.cover_image_url || '/social-preview', imageAlt: post.cover_image_alt || post.title });
  return { ...metadata, authors: [{ name: post.author_name }], openGraph: { ...metadata.openGraph, type: 'article', publishedTime: post.published_at!, modifiedTime: post.updated_at, authors: [post.author_name], section: post.category } };
}

export default async function BlogArticlePage({ params }: Props) {
  const post = await getPublishedBlog((await params).slug);
  if (!post) notFound();
  const url = absoluteUrl(`/blogs/${post.slug}`);
  return <>
    <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'GameOn Blogs', path: '/blogs' }, { name: post.title, path: `/blogs/${post.slug}` }]} />
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'BlogPosting', '@id': `${url}#article`, mainEntityOfPage: url, url, headline: post.title, description: post.excerpt, image: absoluteUrl(post.cover_image_url || '/social-preview'), datePublished: post.published_at, dateModified: post.updated_at, author: { '@type': 'Person', name: post.author_name }, publisher: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/'), logo: { '@type': 'ImageObject', url: absoluteUrl('/game_on.png') } }, articleSection: post.category, inLanguage: 'en-IN', isAccessibleForFree: true }} />
    <article className="mx-auto max-w-3xl">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-go-brand">{post.category}</p>
        <h1 className="mt-4 font-display text-4xl leading-tight text-go-white sm:text-5xl">{post.title}</h1>
        <p className="mt-5 text-lg leading-8 text-go-off/85">{post.excerpt}</p>
        <p className="mt-5 text-sm text-go-off/75">By {post.author_name} · <time dateTime={post.published_at!}>{blogDate(post.published_at!)}</time> · {readingMinutes(post.content)} min read</p>
        {post.cover_image_url ?
          // eslint-disable-next-line @next/next/no-img-element -- validated Supabase media uploads
          <img src={post.cover_image_url} alt={post.cover_image_alt} width={1200} height={675} fetchPriority="high" className="mt-8 aspect-video w-full rounded-3xl object-cover" /> : null}
      </header>
      <div className="mt-10"><BlogContent content={post.content} /></div>
      <footer className="mt-12 border-t border-white/10 pt-6"><Link href="/blogs" className="inline-flex min-h-11 items-center text-go-brand hover:underline focus-visible:outline-2 focus-visible:outline-go-brand">← All GameOn Blogs</Link></footer>
    </article>
  </>;
}