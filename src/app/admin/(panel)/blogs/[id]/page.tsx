import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConfirmAction } from '@/components/admin/confirm-action';
import { Card, CardBody, Notice, PageHeader, buttonClass } from '@/components/admin/ui';
import { deleteBlog } from '@/lib/admin/actions/blogs';
import { requireAdmin } from '@/lib/admin/session';
import { supabaseAdmin } from '@/lib/db/supabase';
import { BlogForm } from '../blog-form';

export const metadata: Metadata = { title: 'Edit blog' };
export default async function EditBlogPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const { data: post, error } = await supabaseAdmin.from('blog_posts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!post) notFound();
  return <>
    <PageHeader title="Edit blog" back={{ href: '/admin/blogs', label: 'GameOn Blogs' }} actions={<>
      {post.status === 'PUBLISHED' ? <Link href={`/blogs/${post.slug}`} className={buttonClass('secondary')}>View published article</Link> : null}
      <ConfirmAction action={deleteBlog} hidden={{ id }} trigger="Delete blog" title="Delete this blog?" description="This permanently deletes the article and its cover image. Published URLs will return not found. Consider changing its status to draft instead." confirmLabel="Delete permanently" confirmVariant="danger" />
    </>} />
    {(await searchParams).saved === '1' ? <Notice tone="success">Blog saved. {post.status === 'PUBLISHED' ? 'The article is now public.' : 'The draft is private.'}</Notice> : null}
    <Card className="max-w-4xl"><CardBody><BlogForm key={post.updated_at} post={post} /></CardBody></Card>
  </>;
}