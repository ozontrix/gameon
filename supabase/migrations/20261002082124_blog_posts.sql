-- Blog data follows the existing service-role-only catalogue access model.
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(slug) between 1 and 120 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) between 1 and 160),
  excerpt text not null check (length(trim(excerpt)) between 1 and 320),
  content text not null check (length(trim(content)) between 1 and 100000),
  author_name text not null default 'GameOn Team' check (length(trim(author_name)) between 1 and 100),
  category text not null default 'GameOn Stories' check (length(trim(category)) between 1 and 80),
  cover_image_url text,
  cover_image_alt text not null default '' check (length(cover_image_alt) <= 200),
  seo_title text check (length(seo_title) between 1 and 70),
  seo_description text check (length(seo_description) between 1 and 170),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED')),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_published_date check (status <> 'PUBLISHED' or published_at is not null),
  constraint blog_cover_alt check (cover_image_url is null or length(trim(cover_image_alt)) > 0)
);

create index blog_posts_published_idx on public.blog_posts (published_at desc, id desc) where status = 'PUBLISHED';
alter table public.blog_posts enable row level security;
revoke all on public.blog_posts from anon, authenticated;
grant all on public.blog_posts to service_role;

create trigger blog_posts_touch_updated_at before update on public.blog_posts
  for each row execute function public.touch_updated_at();

-- Published slugs are permanent, including after unpublishing, to avoid broken links.
create function public.protect_blog_slug() returns trigger language plpgsql set search_path = public as $$
begin
  if old.published_at is not null and new.slug is distinct from old.slug then
    raise exception 'The URL of a previously published blog cannot change.';
  end if;
  return new;
end;
$$;
create trigger blog_posts_protect_slug before update on public.blog_posts
  for each row execute function public.protect_blog_slug();

notify pgrst, 'reload schema';