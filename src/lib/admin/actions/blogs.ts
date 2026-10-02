'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { blogSchema } from '@/lib/blog';
import { supabaseAdmin } from '@/lib/db/supabase';
import { NOT_ALLOWED, formValues, invalid, type ActionState } from '../action-result';
import { recordAudit } from '../audit';
import { authorize } from '../session';
import { readImageField, removeImage, uploadImage } from '../storage';

function refreshBlog(slug: string) {
  revalidatePath('/blogs');
  revalidatePath(`/blogs/${slug}`);
  revalidatePath('/sitemap.xml');
  revalidatePath('/admin/blogs');
}

export async function saveBlog(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;
  const parsed = blogSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, remove_image, ...fields } = parsed.data;
  const image = await readImageField(formData, 'image');
  if (image && 'error' in image) return { ok: false, message: image.error, fieldErrors: { image: image.error } };

  const { data: existing, error: readError } = id
    ? await supabaseAdmin.from('blog_posts').select('*').eq('id', id).maybeSingle()
    : { data: null, error: null };
  if (readError) return { ok: false, message: 'Could not load the blog. Check that the blog migration has been applied.' };
  if (id && !existing) return { ok: false, message: 'That blog no longer exists.' };
  if (existing?.published_at && fields.slug !== existing.slug) return { ok: false, message: 'Published URLs cannot change. Keep the existing slug.', fieldErrors: { slug: 'This URL is permanent because the article has been published.' } };
  const coverAlt = fields.cover_image_alt || '';
  if ((image || (existing?.cover_image_url && !remove_image)) && !coverAlt) return { ok: false, message: 'Describe the cover image.', fieldErrors: { cover_image_alt: 'Add descriptive alt text for the cover image.' } };

  let imageUrl = remove_image ? null : existing?.cover_image_url ?? null;
  if (image) {
    try { imageUrl = await uploadImage(image, 'blogs'); }
    catch (error) { console.error('[admin] blog upload failed', error); return { ok: false, message: 'Could not upload the cover image.' }; }
  }
  const payload = {
    ...fields, cover_image_alt: coverAlt, cover_image_url: imageUrl,
    seo_title: fields.seo_title || null, seo_description: fields.seo_description || null,
    published_at: existing?.published_at || (fields.status === 'PUBLISHED' ? new Date().toISOString() : null),
  };
  const { data, error } = id
    ? await supabaseAdmin.from('blog_posts').update(payload).eq('id', id).select('id').maybeSingle()
    : await supabaseAdmin.from('blog_posts').insert({ ...payload, created_by: actor.id }).select('id').single();
  if (error || !data) {
    if (image) await removeImage(imageUrl);
    console.error('[admin] save blog failed', error);
    if (error?.code === '23505') return { ok: false, message: 'That URL is already used by another blog.', fieldErrors: { slug: 'Choose a unique URL slug.' } };
    return { ok: false, message: 'Could not save the blog. Check the database migration and try again.' };
  }
  if (existing?.cover_image_url && existing.cover_image_url !== imageUrl) await removeImage(existing.cover_image_url);
  await recordAudit(actor, id ? 'blog.update' : 'blog.create', 'blog', data.id, { title: fields.title, slug: fields.slug, status: fields.status });
  if (existing) refreshBlog(existing.slug);
  refreshBlog(fields.slug);
  redirect(`/admin/blogs/${data.id}?saved=1`);
}

export async function deleteBlog(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Unknown blog.' };
  const { data, error } = await supabaseAdmin.from('blog_posts').delete().eq('id', id.data).select('title, slug, cover_image_url').maybeSingle();
  if (error) return { ok: false, message: 'Could not delete the blog.' };
  if (!data) return { ok: false, message: 'That blog is already gone.' };
  await removeImage(data.cover_image_url);
  await recordAudit(actor, 'blog.delete', 'blog', id.data, { title: data.title, slug: data.slug });
  refreshBlog(data.slug);
  redirect('/admin/blogs');
}