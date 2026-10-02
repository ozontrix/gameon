import type { Metadata } from 'next';
import Link from 'next/link';
import { Pagination } from '@/components/admin/pagination';
import { Badge, Card, EmptyState, Notice, PageHeader, Table, Td, Th, buttonClass, inputClass } from '@/components/admin/ui';
import { PAGE_SIZE } from '@/lib/admin/constants';
import { formatDateTime } from '@/lib/admin/format';
import { requireAdmin } from '@/lib/admin/session';
import { isMissingBlogTable } from '@/lib/blogs/queries';
import { supabaseAdmin } from '@/lib/db/supabase';
import { blogPage } from '@/lib/blog';

export const metadata: Metadata = { title: 'GameOn Blogs' };

export default async function AdminBlogsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const page = blogPage(params.page);
  const status = ['DRAFT', 'PUBLISHED'].includes(params.status ?? '') ? params.status : undefined;
  let query = supabaseAdmin.from('blog_posts').select('id, title, slug, status, author_name, updated_at', { count: 'exact' });
  if (status) query = query.eq('status', status);
  const { data: posts, count, error } = await query.order('updated_at', { ascending: false }).order('id').range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error && !isMissingBlogTable(error)) throw error;
  return <>
    <PageHeader title="GameOn Blogs" description="Write, preview and publish articles for the public GameOn website." actions={<><Link href="/blogs" className={buttonClass('secondary')}>View public blogs</Link><Link href="/admin/blogs/new" className={buttonClass('primary')}>New blog</Link></>} />
    {error ? <Notice tone="warning">Apply the blog_posts migration before creating articles.</Notice> : null}
    <form method="get" className="mb-4 flex gap-3"><select name="status" defaultValue={status ?? ''} aria-label="Publication status" className={inputClass + ' max-w-xs'}><option value="">All posts</option><option value="DRAFT">Drafts</option><option value="PUBLISHED">Published</option></select><button className={buttonClass('secondary')}>Filter</button></form>
    <Card>{!posts?.length ? <EmptyState title="No blogs yet" description="Create a draft, add your content and cover image, then publish when it is ready." /> : <><Table><thead><tr><Th>Article</Th><Th>Status</Th><Th>Author</Th><Th>Updated</Th><Th>Actions</Th></tr></thead><tbody>{posts.map(post => <tr key={post.id}><Td><Link href={`/admin/blogs/${post.id}`} className="font-medium text-zinc-950 hover:underline">{post.title}</Link><p className="mt-1 text-xs text-zinc-500">/blogs/{post.slug}</p></Td><Td><Badge tone={post.status === 'PUBLISHED' ? 'green' : 'amber'}>{post.status === 'PUBLISHED' ? 'Published' : 'Draft'}</Badge></Td><Td>{post.author_name}</Td><Td>{formatDateTime(post.updated_at)}</Td><Td><Link href={`/admin/blogs/${post.id}`} className={buttonClass('secondary', 'sm')}>Edit</Link></Td></tr>)}</tbody></Table><Pagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath="/admin/blogs" params={{ status }} /></>}</Card>
  </>;
}