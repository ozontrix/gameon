'use client';

import { useState } from 'react';
import { ActionForm, FieldError, FormMessage, SubmitButton } from '@/components/admin/action-form';
import { Field, checkboxClass, inputClass, textareaClass } from '@/components/admin/ui';
import { BlogContent } from '@/components/blogs/blog-content';
import { saveBlog } from '@/lib/admin/actions/blogs';
import { slugify, type BlogPost } from '@/lib/blog';

export function BlogForm({ post }: { post?: BlogPost }) {
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [manualSlug, setManualSlug] = useState(Boolean(post));
  const [content, setContent] = useState(post?.content ?? '');
  const [preview, setPreview] = useState(false);

  return <ActionForm action={saveBlog} className="space-y-5">
    {post ? <input type="hidden" name="id" value={post.id} /> : null}
    <FormMessage />
    <Field label="Article title" htmlFor="title" required><input id="title" name="title" value={title} onChange={event => { setTitle(event.target.value); if (!manualSlug) setSlug(slugify(event.target.value)); }} maxLength={160} className={inputClass} /><FieldError name="title" /></Field>
    <Field label="URL slug" htmlFor="slug" required hint={post?.published_at ? 'This URL is permanent because the article has been published.' : 'Public URL: /blogs/' + slug}><input id="slug" name="slug" value={slug} readOnly={Boolean(post?.published_at)} onChange={event => { setSlug(event.target.value); setManualSlug(true); }} maxLength={120} className={inputClass} /><FieldError name="slug" /></Field>
    <Field label="Excerpt" htmlFor="excerpt" required hint="Shown on blog cards; also used as the default search description."><textarea id="excerpt" name="excerpt" defaultValue={post?.excerpt} rows={3} maxLength={320} className={textareaClass} /><FieldError name="excerpt" /></Field>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Author name" htmlFor="author_name" required><input id="author_name" name="author_name" defaultValue={post?.author_name ?? 'GameOn Team'} maxLength={100} className={inputClass} /><FieldError name="author_name" /></Field>
      <Field label="Category" htmlFor="category" required><input id="category" name="category" defaultValue={post?.category ?? 'GameOn Stories'} maxLength={80} className={inputClass} /><FieldError name="category" /></Field>
    </div>
    <Field label="Article content" htmlFor="content" required hint="Separate paragraphs with a blank line. Supported: ## headings, ### subheadings, - bullet lists, numbered lists, > quotes, **bold**, `code`, and [link text](https://...). HTML and embedded scripts are not supported.">
      <textarea id="content" name="content" value={content} onChange={event => setContent(event.target.value)} rows={18} maxLength={100000} className={textareaClass} /><FieldError name="content" />
    </Field>
    <button type="button" aria-expanded={preview} aria-controls="blog-content-preview" onClick={() => setPreview(!preview)} className="min-h-11 cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-zinc-900">{preview ? 'Hide preview' : 'Preview article content'}</button>
    {preview ? <section id="blog-content-preview" className="rounded-2xl bg-go-black p-6"><h2 className="mb-6 text-xl font-semibold text-go-white">{title || 'Article preview'}</h2><BlogContent content={content || 'Start writing to see a preview.'} /></section> : null}
    <Field label="Cover image" htmlFor="image" hint="JPG, PNG or WebP, up to 3 MB. A landscape image is recommended."><input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" /><FieldError name="image" /></Field>
    {post?.cover_image_url ? <div className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- uploaded media URL */}
      <img src={post.cover_image_url} alt={post.cover_image_alt} width={480} height={270} className="aspect-video w-full max-w-sm rounded-xl object-cover" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="remove_image" className={checkboxClass} />Remove current cover image</label>
    </div> : null}
    <Field label="Cover image alt text" htmlFor="cover_image_alt" hint="Required when a cover image is present; describe what the image shows."><input id="cover_image_alt" name="cover_image_alt" defaultValue={post?.cover_image_alt} maxLength={200} className={inputClass} /><FieldError name="cover_image_alt" /></Field>
    <fieldset className="space-y-4 rounded-xl border border-zinc-200 p-4"><legend className="px-2 text-sm font-semibold">Search and sharing metadata</legend>
      <Field label="SEO title (optional)" htmlFor="seo_title" hint="Falls back to the article title. GameOn branding is appended automatically."><input id="seo_title" name="seo_title" defaultValue={post?.seo_title ?? ''} maxLength={70} className={inputClass} /><FieldError name="seo_title" /></Field>
      <Field label="SEO description (optional)" htmlFor="seo_description" hint="Falls back to the excerpt."><textarea id="seo_description" name="seo_description" defaultValue={post?.seo_description ?? ''} maxLength={170} rows={3} className={textareaClass} /><FieldError name="seo_description" /></Field>
    </fieldset>
    <Field label="Publication status" htmlFor="status" hint="Published posts are visible immediately. Switching to draft removes the article from public pages and the sitemap."><select id="status" name="status" defaultValue={post?.status ?? 'DRAFT'} className={inputClass}><option value="DRAFT">Draft — private</option><option value="PUBLISHED">Published — public</option></select><FieldError name="status" /></Field>
    <div className="flex justify-end"><SubmitButton pendingLabel="Saving blog…">{post ? 'Save blog' : 'Create blog'}</SubmitButton></div>
  </ActionForm>;
}