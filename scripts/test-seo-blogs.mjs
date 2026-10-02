/** Run: node --test scripts/test-seo-blogs.mjs. DB, auth, uploads and Next routing are mocked; no remote writes. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
function loader(mocks = {}) {
  const modules = new Map();
  function load(relative) {
    const filename = resolve(root, relative);
    if (modules.has(filename)) return modules.get(filename).exports;
    const compiled = { exports: {} };
    modules.set(filename, compiled);
    const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } });
    const localRequire = id => {
      if (id in mocks) return mocks[id];
      if (id === 'server-only') return {};
      if (id === 'react') return { ...require(id), cache: fn => fn };
      if (id === 'next/link') return { __esModule: true, default: ({ children, ...props }) => createElement('a', props, children) };
      if (id.startsWith('@/') || id.startsWith('.')) {
        const path = id.startsWith('@/') ? resolve(root, 'src', id.slice(2)) : resolve(dirname(filename), id);
        return load(existsSync(`${path}.ts`) ? `${path}.ts` : `${path}.tsx`);
      }
      return require(id);
    };
    new Function('require', 'module', 'exports', outputText)(localRequire, compiled, compiled.exports);
    return compiled.exports;
  }
  return load;
}
const load = loader();
const blog = load('src/lib/blog.ts');
const seo = load('src/lib/seo.ts');
const valid = { title: 'A day on the court', slug: 'a-day-on-the-court', excerpt: 'A GameOn story.', content: 'Full article content.', author_name: 'GameOn Team', category: 'Stories', status: 'DRAFT' };

test('Blog validation accepts drafts and rejects invalid slugs, oversized content and invalid status', () => {
  assert.equal(blog.blogSchema.parse(valid).status, 'DRAFT');
  for (const slug of ['../admin', 'two--hyphens', 'Uppercase', '-leading', 'trailing-', '']) assert.equal(blog.blogSchema.safeParse({ ...valid, slug }).success, false);
  assert.equal(blog.blogSchema.safeParse({ ...valid, content: 'x'.repeat(100001) }).success, false);
  assert.equal(blog.blogSchema.safeParse({ ...valid, status: 'SCHEDULED' }).success, false);
  assert.equal(blog.blogSchema.safeParse({ ...valid, title: ' ' }).success, false);
});
test('Slug generation, pagination and reading time are deterministic', () => {
  assert.equal(blog.slugify('  Café & Court: GameOn! '), 'cafe-court-gameon');
  assert.equal(blog.slugify('x'.repeat(121)).length, 120);
  assert.equal(blog.readingMinutes('word '.repeat(201)), 2);
  for (const value of ['-1', '1.5', 'Infinity', '100001', 'bad']) assert.equal(blog.blogPage(value), 1);
  assert.equal(blog.blogPage('3'), 3);
});
test('Authored links reject executable and protocol-relative URLs', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,test', '//evil.example', '/\\evil.example', 'https://user:pass@example.com', 'java\nscript:alert(1)']) assert.equal(blog.safeBlogHref(value), null);
  for (const value of ['/blogs', '#warm-up', 'https://example.com', 'mailto:info@example.com', 'tel:+919034844654']) assert.equal(blog.safeBlogHref(value), value);
});
test('Markdown renders full text, semantic headings/lists and escapes HTML', () => {
  const { BlogContent } = load('src/components/blogs/blog-content.tsx');
  const html = renderToStaticMarkup(createElement(BlogContent, { content: '## Warm up\n\n**Start here**\n\n- First\n- Second\n\n1. One\n2. Two\n\n> Keep going\n\n[Safe](/blogs) [Unsafe](javascript:evil)\n\n<script>alert(1)</script>' }));
  assert.match(html, /<h2[^>]*>Warm up<\/h2>/);
  assert.match(html, /<strong>Start here<\/strong>/);
  assert.match(html, /<ul/); assert.match(html, /<ol/); assert.match(html, /<blockquote/);
  assert.match(html, /href="\/blogs"/);
  assert.doesNotMatch(html, /href="javascript:|<script>/);
  assert.match(html, /&lt;script&gt;/);
});
test('SEO helpers emit canonical and route-specific sharing metadata; JSON-LD is script-safe', () => {
  const result = seo.pageMetadata({ title: 'Blogs', description: 'Stories', path: '/blogs' });
  assert.equal(result.alternates.canonical, `${seo.SITE_URL}/blogs`);
  assert.equal(result.openGraph.url, `${seo.SITE_URL}/blogs`);
  assert.equal(result.twitter.description, 'Stories');
  const tree = seo.breadcrumbData([{ name: 'Home', path: '/' }, { name: 'Blogs', path: '/blogs' }]);
  assert.equal(tree.itemListElement[1].position, 2);
  const serialized = seo.serializeJsonLd({ text: '</script><script>evil</script>' });
  assert.doesNotMatch(serialized, /</);
  assert.equal(JSON.parse(serialized).text, '</script><script>evil</script>');
});

function mockDatabase(results) {
  const calls = [];
  return { calls, client: { from(table) {
    const call = { table, operations: [] };
    calls.push(call);
    const result = results.shift() ?? { data: null, error: null };
    const query = new Proxy({}, { get(_target, key) {
      if (key === 'then') return (yes, no) => Promise.resolve(result).then(yes, no);
      return (...args) => { call.operations.push([key, ...args]); return query; };
    } });
    return query;
  } } };
}
test('Every public blog query filters out drafts and future publication timestamps', async () => {
  const db = mockDatabase([{ data: [], count: 0, error: null }, { data: null, error: null }, { data: [], error: null }]);
  const queries = loader({ '@/lib/db/supabase': { supabaseAdmin: db.client } })('src/lib/blogs/queries.ts');
  await queries.getPublishedBlogs(2); await queries.getPublishedBlog('missing'); await queries.getBlogSitemapEntries();
  assert.equal(db.calls.length, 3);
  for (const call of db.calls) {
    assert.ok(call.operations.some(op => op[0] === 'eq' && op[1] === 'status' && op[2] === 'PUBLISHED'));
    assert.ok(call.operations.some(op => op[0] === 'lte' && op[1] === 'published_at'));
  }
  assert.ok(db.calls[0].operations.some(op => op[0] === 'range' && op[1] === 12 && op[2] === 23));
  await queries.getPublishedBlog('../private');
  assert.equal(db.calls.length, 3);
});
test('Missing migration is recoverable; database outages are not hidden', async () => {
  const db = mockDatabase([{ data: null, error: { code: '42P01' } }, { data: null, error: { code: '08006', message: 'offline' } }]);
  const queries = loader({ '@/lib/db/supabase': { supabaseAdmin: db.client } })('src/lib/blogs/queries.ts');
  assert.deepEqual(await queries.getBlogSitemapEntries(), []);
  await assert.rejects(queries.getBlogSitemapEntries());
});
test('Sitemap includes posts beyond the 1000-row PostgREST cap', async () => {
  const db = mockDatabase([{ data: Array.from({ length: 1000 }, (_, i) => ({ slug: `post-${i}`, updated_at: '2026-10-02', cover_image_url: null })), error: null }, { data: [{ slug: 'post-1000', updated_at: '2026-10-02', cover_image_url: null }], error: null }]);
  const queries = loader({ '@/lib/db/supabase': { supabaseAdmin: db.client } })('src/lib/blogs/queries.ts');
  assert.equal((await queries.getBlogSitemapEntries()).length, 1001);
  assert.ok(db.calls[1].operations.some(op => op[0] === 'range' && op[1] === 1000));
});

function actionsHarness(results, actor = { id: 'actor', role: 'ADMIN' }, image = null) {
  const db = mockDatabase(results);
  const removed = [], audits = [], refreshed = [];
  const actions = loader({
    '@/lib/db/supabase': { supabaseAdmin: db.client },
    '../session': { authorize: async role => role === 'ADMIN' ? actor : null },
    '../storage': { readImageField: async () => image, uploadImage: async () => 'https://media.example/new.webp', removeImage: async url => removed.push(url) },
    '../audit': { recordAudit: async (...args) => audits.push(args) },
    'next/cache': { revalidatePath: path => refreshed.push(path) },
    'next/navigation': { redirect: path => { throw new Error(`redirect:${path}`); } },
  })('src/lib/admin/actions/blogs.ts');
  return { ...db, actions, removed, audits, refreshed };
}
function form(fields) { const result = new FormData(); for (const [key, value] of Object.entries(fields)) result.set(key, value); return result; }
const id = 'fa8a0ebd-b97b-4f6b-aed4-2e59c24b3a01';
test('Unauthorised blog mutations never touch the database', async () => {
  const h = actionsHarness([], null);
  assert.equal((await h.actions.saveBlog(null, form(valid))).ok, false);
  assert.equal((await h.actions.deleteBlog(null, form({ id }))).ok, false);
  assert.equal(h.calls.length, 0);
});
test('Publishing stamps the first date, audits and refreshes public routes', async () => {
  const h = actionsHarness([{ data: { id }, error: null }]);
  await assert.rejects(h.actions.saveBlog(null, form({ ...valid, status: 'PUBLISHED' })), /redirect:/);
  const payload = h.calls[0].operations.find(op => op[0] === 'insert')[1];
  assert.equal(payload.status, 'PUBLISHED'); assert.ok(payload.published_at); assert.equal(payload.created_by, 'actor');
  assert.equal(h.audits[0][2], 'blog'); assert.ok(h.refreshed.includes('/sitemap.xml'));
});
test('Unpublishing retains the original publication date; published slugs are locked', async () => {
  const existing = { ...valid, id, published_at: '2026-10-01T12:00:00.000Z', cover_image_url: null };
  const h = actionsHarness([{ data: existing, error: null }, { data: { id }, error: null }]);
  await assert.rejects(h.actions.saveBlog(null, form({ ...valid, id, status: 'DRAFT' })), /redirect:/);
  assert.equal(h.calls[1].operations.find(op => op[0] === 'update')[1].published_at, existing.published_at);
  const locked = actionsHarness([{ data: existing, error: null }]);
  assert.equal((await locked.actions.saveBlog(null, form({ ...valid, id, slug: 'new-url' }))).ok, false);
  assert.equal(locked.calls.length, 1);
});
test('Cover alt text is required and failed writes clean up newly uploaded images', async () => {
  const missingAlt = actionsHarness([], undefined, { bytes: new Uint8Array(), type: 'image/webp' });
  assert.equal((await missingAlt.actions.saveBlog(null, form(valid))).fieldErrors.cover_image_alt.length > 0, true);
  const duplicate = actionsHarness([{ data: null, error: { code: '23505' } }], undefined, { bytes: new Uint8Array(), type: 'image/webp' });
  assert.equal((await duplicate.actions.saveBlog(null, form({ ...valid, cover_image_alt: 'Players on a court' }))).ok, false);
  assert.deepEqual(duplicate.removed, ['https://media.example/new.webp']);
});
test('Deletion removes cover media, audits and invalidates the old URL', async () => {
  const h = actionsHarness([{ data: { title: valid.title, slug: valid.slug, cover_image_url: 'https://media.example/old.webp' }, error: null }]);
  await assert.rejects(h.actions.deleteBlog(null, form({ id })), /redirect:\/admin\/blogs/);
  assert.deepEqual(h.removed, ['https://media.example/old.webp']); assert.ok(h.refreshed.includes(`/blogs/${valid.slug}`));
});
test('Sitemap contains public routes only and article update timestamps', async () => {
  const sitemap = loader({ '@/lib/blogs/queries': { getBlogSitemapEntries: async () => [{ slug: 'published-post', updated_at: '2026-10-02T12:00:00Z', cover_image_url: 'https://media.example/cover.webp' }] } })('src/app/sitemap.ts').default;
  const entries = await sitemap();
  assert.ok(entries.some(entry => entry.url.endsWith('/blogs/published-post') && entry.lastModified === '2026-10-02T12:00:00Z'));
  for (const entry of entries) assert.doesNotMatch(entry.url, /\/admin|\/api-docs|\/book\/|\/bookings|\/account|\/gameon-olympics/);
  assert.equal(new Set(entries.map(entry => entry.url)).size, entries.length);
});

test('Removed Olympics pages and their exclusive components are deleted and absent from public links', () => {
  for (const relative of [
    'src/app/gameon-olympics',
    'src/components/olympics',
    'scripts/create-multisports-league-flow.mjs',
    'src/app/gameon-olympics/page.tsx',
    'src/app/gameon-olympics/sports/page.tsx',
    'src/app/gameon-olympics/events/page.tsx',
    'src/app/gameon-olympics/sports/[sport]/page.tsx',
    ...['home-page', 'sports-page', 'events-page', 'sport-detail'].map(name => `src/components/olympics/${name}.tsx`),
  ]) assert.equal(existsSync(resolve(root, relative)), false, relative);
  assert.ok(seo.PUBLIC_PAGES.every(page => !page.path.startsWith('/gameon-olympics')));
  const directory = load('src/app/site-map/page.tsx').default;
  const links = load('src/components/seo/site-links.tsx').SiteLinks;
  for (const component of [directory, links]) {
    const html = renderToStaticMarkup(createElement(component));
    assert.doesNotMatch(html, /href="\/gameon-olympics/);
    assert.match(html, /href="\/gameon-multisports-league/);
  }
});

test('Published article renders its full body, breadcrumbs and BlogPosting metadata on the server', async () => {
  const post = { ...valid, id, status: 'PUBLISHED', published_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-02T12:00:00Z', cover_image_url: null, cover_image_alt: '', seo_title: 'Court story', seo_description: 'Read our complete story.', content: '## First section\n\nFull article paragraph visible without client JavaScript.\n\n## Last section\n\nThe final paragraph must also be present.' };
  const page = loader({ '@/lib/blogs/queries': { getPublishedBlog: async () => post } })('src/app/blogs/[slug]/page.tsx');
  const props = { params: Promise.resolve({ slug: post.slug }) };
  const metadata = await page.generateMetadata(props);
  assert.equal(metadata.openGraph.type, 'article');
  assert.equal(metadata.openGraph.publishedTime, post.published_at);
  assert.equal(metadata.description, post.seo_description);
  assert.equal(metadata.alternates.canonical, `${seo.SITE_URL}/blogs/${post.slug}`);
  const html = renderToStaticMarkup(await page.default(props));
  assert.match(html, /Full article paragraph visible without client JavaScript/);
  assert.match(html, /The final paragraph must also be present/);
  assert.match(html, /BlogPosting/); assert.match(html, /BreadcrumbList/);
  assert.match(html, /<h1/); assert.match(html, /<h2/);
});
test('Unavailable and draft articles resolve to not found for both metadata and page', async () => {
  const page = loader({ '@/lib/blogs/queries': { getPublishedBlog: async () => null }, 'next/navigation': { notFound: () => { throw new Error('NOT_FOUND'); } } })('src/app/blogs/[slug]/page.tsx');
  const props = { params: Promise.resolve({ slug: 'private-draft' }) };
  await assert.rejects(page.generateMetadata(props), /NOT_FOUND/);
  await assert.rejects(page.default(props), /NOT_FOUND/);
});