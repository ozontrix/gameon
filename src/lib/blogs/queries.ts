import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/db/supabase';
import { BLOG_PAGE_SIZE, BLOG_SLUG } from '@/lib/blog';

/** Missing migration is the only recoverable DB error; never mask other failures. */
export function isMissingBlogTable(error: { code?: string }) {
  return error.code === 'PGRST205' || error.code === '42P01';
}

export const getPublishedBlogs = cache(async (page: number = 1) => {
  const from = (page - 1) * BLOG_PAGE_SIZE;
  const { data, count, error } = await supabaseAdmin.from('blog_posts')
    .select('id, slug, title, excerpt, author_name, category, cover_image_url, cover_image_alt, published_at, updated_at', { count: 'exact' })
    .eq('status', 'PUBLISHED').lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false }).order('id', { ascending: false })
    .range(from, from + BLOG_PAGE_SIZE - 1);
  if (error && !isMissingBlogTable(error)) throw error;
  if (error) console.warn('[blogs] Apply the blog_posts migration to enable publishing.');
  return { posts: data ?? [], count: count ?? 0, unavailable: Boolean(error) };
});

export const getPublishedBlog = cache(async (slug: string) => {
  if (!BLOG_SLUG.test(slug) || slug.length > 120) return null;
  const { data, error } = await supabaseAdmin.from('blog_posts').select('*')
    .eq('slug', slug).eq('status', 'PUBLISHED').lte('published_at', new Date().toISOString()).maybeSingle();
  if (error && !isMissingBlogTable(error)) throw error;
  return data;
});

export async function getBlogSitemapEntries() {
  const posts: { slug: string; updated_at: string; cover_image_url: string | null }[] = [];
  // PostgREST caps results per request; paginate rather than silently omitting older posts.
  const now = new Date().toISOString();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabaseAdmin.from('blog_posts').select('slug, updated_at, cover_image_url')
      .eq('status', 'PUBLISHED').lte('published_at', now).order('id').range(offset, offset + 999);
    if (error) {
      if (isMissingBlogTable(error)) return [];
      throw error;
    }
    posts.push(...data);
    if (data.length < 1000) return posts;
  }
}