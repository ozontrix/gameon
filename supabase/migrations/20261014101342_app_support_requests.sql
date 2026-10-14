-- Private inbox. Mobile requests are authorised and validated by the API.
create table public.app_support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('feedback', 'deletion')),
  topic text not null,
  message text not null check (char_length(message) between 10 and 2000),
  reply_email text,
  rating integer check (rating between 1 and 5),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index app_support_pending_deletion on public.app_support_requests(user_id)
  where kind = 'deletion' and status = 'pending';
create index app_support_inbox on public.app_support_requests(kind, created_at desc);
alter table public.app_support_requests enable row level security;
revoke all on public.app_support_requests from anon, authenticated;
grant all on public.app_support_requests to service_role;
comment on table public.app_support_requests is 'Server-only feedback and authenticated account deletion requests. Pending does NOT mean deleted.';