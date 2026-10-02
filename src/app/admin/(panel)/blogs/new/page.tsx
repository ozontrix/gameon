import type { Metadata } from 'next';
import { Card, CardBody, PageHeader } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin/session';
import { BlogForm } from '../blog-form';

export const metadata: Metadata = { title: 'New blog' };
export default async function NewBlogPage() {
  await requireAdmin();
  return <><PageHeader title="New blog" back={{ href: '/admin/blogs', label: 'GameOn Blogs' }} /><Card className="max-w-4xl"><CardBody><BlogForm /></CardBody></Card></>;
}