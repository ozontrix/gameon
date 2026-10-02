# GameOn SEO and blogs

## Deployment requirements

1. Set `NEXT_PUBLIC_SITE_URL` to the preferred production origin (no path or query). The compatibility default is `https://game-on.in`, matching the previous website metadata. Some mobile integration documentation uses `https://gameonmultisports.com`; choose one canonical origin and configure a permanent redirect from alternate hosts at your hosting/domain provider. This change does not assume ownership of either host or change domain routing.
2. The blog migration is already applied to the connected GameOn project (`uuemjenvhwopsueczbyv`) as `20261002082124_blog_posts`. The matching local file is `supabase/migrations/20261002082124_blog_posts.sql`. For a different environment, apply it using your normal reviewed migration process after linking the correct project. Do not manually rerun it on this project. The table uses the existing `touch_updated_at()` function and existing public `media` storage bucket.
3. Deploy and check `/robots.txt`, `/sitemap.xml`, `/social-preview`, `/blogs`, and `/site-map`.
4. Optionally set `GOOGLE_SITE_VERIFICATION` to the Search Console HTML verification token, verify your preferred domain, and submit `/sitemap.xml` in Search Console. Inspect important pages and validate structured data using Google's Rich Results Test.

The initial direct database connection was blocked by local IPv6 connectivity. On October 2, 2026, the migration was successfully applied through the GameOn Supabase connector instead. Its generated version is reflected in the local filename to keep migration history aligned. Live verification confirmed the table, constraints, indexes, enabled triggers, RLS and role grants. The application service-role client can query the table through PostgREST; anonymous direct reads are denied. No sample articles were published.

## What was implemented

- Unique titles, descriptions, canonical URLs, Open Graph and Twitter cards for public pages, including sport detail pages.
- A 1200×630 generated social preview, instead of treating the brand logo as a full-size share image.
- Homepage WebSite and SportsActivityLocation structured data reflecting existing visible venue details. Update structured data alongside contact details, location and opening hours when they change.
- Visible breadcrumbs and BreadcrumbList structured data for blogs and tournament pages.
- A crawlable site directory and footer links across the main site. Desktop section navigation uses real links.
- XML sitemap with public pages, sport pages and published blog URLs (with real blog update timestamps and cover images). Sitemap queries paginate beyond Supabase's default result cap.
- Noindex metadata for admin, API documentation, account, personal bookings and checkout routes. They are excluded from the sitemap. These pages are intentionally crawlable so bots can read the noindex directive; robots.txt is not an access-control mechanism. API, service worker and raw Swagger resources are excluded from crawling.
- Vercel preview deployments disallow indexing and crawling.

Metadata describes the page; it should not contain the entire website text. Full article content is server-rendered in the HTML. Search engines choose snippets, index inclusion and sitelinks; metadata cannot force a particular result tree or guarantee ranking.

## Publishing blogs

1. Sign in as an **ADMIN** and open **App & website content → GameOn Blogs** (`/admin/blogs`). STAFF users cannot manage blogs.
2. Create a blog. Add title, unique URL slug, excerpt, author, category and content.
3. Content supports paragraphs separated by blank lines, standalone `##`/`###` headings, bullet/numbered lists, block quotes, bold text, inline code and links. Use a blank line around headings and lists. Raw HTML and scripts are displayed as text, not executed. Unsafe link schemes are rejected by the renderer. This is a deliberately small Markdown subset, not a full rich-text editor.
4. Optionally upload a JPG/PNG/WebP cover (3 MB maximum) and supply descriptive alt text. Preview the article content in the form.
5. Set optional SEO title/description overrides. Otherwise the article title/excerpt are used for search and sharing metadata.
6. Save as **Draft** (private) or **Published** (public immediately). Published articles appear at `/blogs/<slug>`, in the listing and in the sitemap; their article metadata and BlogPosting structured data use the same persisted content.
7. A previously published slug cannot change, even after unpublishing, to avoid breaking indexed links. The first publication date is retained. Save as draft to unpublish, or use the confirmation dialog to permanently delete a post. Deletion removes its uploaded cover and makes the old URL return 404.

Every mutation checks the current admin role on the server and writes an audit entry. The browser never receives service-role credentials. The blog table has RLS enabled and no anonymous/authenticated grants; public server reads explicitly filter to published posts only. No sample articles are automatically published.

## Checks

- `npx tsc --noEmit`
- `npm run build`
- `node --test scripts/test-seo-blogs.mjs`
- `node scripts/smoke-seo.mjs` (starts/stops its own production server after a build)
- `npm run lint` (repository-wide; existing unrelated lint failures may remain)
- `node scripts/check-seo.mjs lint` (changed/new code only)
- `node scripts/verify-blog-database.mjs` (read-only live PostgREST access check for the connected GameOn project)

Validation on October 2, 2026: production build passed; 16 SEO/blog tests and 10 existing account-deletion tests passed; changed-file lint passed. After the live migration, all 26 tests and the production HTTP smoke test passed again across 13 public routes, plus sitemap/robots, private-route noindex, unknown-article 404, admin login redirect and social PNG checks. The database access check also passed against the real project. Repository-wide lint still reports 22 errors and 11 warnings in pre-existing, untouched code. Authenticated admin UI creation/publication was tested with mocks, not through a real admin browser session. No browser-based visual review or Search Console submission was performed.

Live database mutation checks also passed for service-role draft creation, updates, publishing/unpublishing, automatic timestamps, required publication dates and cover alt text, and slug protection after publication/unpublishing. These ran inside a rolled-back transaction; the table remains empty and no test content was retained.

The post-migration security advisor reports an informational [RLS Enabled No Policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) notice for `blog_posts`. This is intentional: direct browser grants are revoked, and authorized server operations use the service role. Existing unrelated warnings remain for [capacity function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), `wallet_adjust` SECURITY DEFINER access by [anonymous](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)/[authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) roles, and [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). These were not changed by this migration.