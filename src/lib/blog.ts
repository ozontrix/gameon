import { z } from 'zod';
import type { Database } from '@/types/database.types';

export type BlogPost = Database['public']['Tables']['blog_posts']['Row'];
export const BLOG_PAGE_SIZE = 12;
export const BLOG_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120).replace(/-$/g, '');
}

export const blogSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string({ error: 'Enter a title.' }).trim().min(1).max(160),
  slug: z.string({ error: 'Enter a URL slug.' }).max(120).regex(BLOG_SLUG, 'Use lowercase letters, numbers and single hyphens.'),
  excerpt: z.string({ error: 'Enter an excerpt.' }).trim().min(1).max(320),
  content: z.string({ error: 'Write the article content.' }).trim().min(1).max(100000),
  author_name: z.string({ error: 'Enter an author name.' }).trim().min(1).max(100),
  category: z.string({ error: 'Enter a category.' }).trim().min(1).max(80),
  cover_image_alt: z.string().trim().max(200).optional(),
  seo_title: z.string().trim().max(70).optional(),
  seo_description: z.string().trim().max(170).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  remove_image: z.string().optional().transform(value => value === 'on'),
});

export function readingMinutes(content: string): number {
  return Math.max(1, Math.ceil(content.trim().split(/\s+/).filter(Boolean).length / 200));
}

export function blogDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' });
}

export function blogPage(value: string | undefined): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 && page <= 100000 ? page : 1;
}

/** Only safe protocols and same-site paths are allowed in authored links. */
export function safeBlogHref(value: string): string | null {
  if (/\s|[\\\u0000-\u001f]/.test(value)) return null;
  if (/^\/(?!\/)/.test(value) || /^#[a-z0-9-]+$/i.test(value)) return value;
  try {
    const url = new URL(value);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) && !url.username && !url.password ? value : null;
  } catch { return null; }
}