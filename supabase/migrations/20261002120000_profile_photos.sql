-- Private profile photos. Only authenticated server routes upload/sign them;
-- no public or client Storage policy is added.
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add constraint profiles_avatar_path_owner
  check (avatar_path is null or avatar_path ~ ('^' || id::text || '/[0-9a-f-]+\.(jpg|png|webp)$'));
revoke insert (avatar_path), update (avatar_path) on public.profiles from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 3145728,
  array['image/jpeg', 'image/png', 'image/webp']);