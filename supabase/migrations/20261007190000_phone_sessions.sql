-- API-only sessions: no credential or session table is exposed to app roles.
create table public.phone_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone text not null,
  firebase_uid text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  revoked_at timestamptz
);
create index phone_sessions_user_id_idx on public.phone_sessions(user_id);
create table public.phone_refresh_tokens (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  session_id uuid not null references public.phone_sessions(id) on delete cascade,
  used_at timestamptz
);
create index phone_refresh_tokens_session_id_idx on public.phone_refresh_tokens(session_id);
alter table public.phone_sessions enable row level security;
alter table public.phone_refresh_tokens enable row level security;
revoke all on public.phone_sessions, public.phone_refresh_tokens from public, anon, authenticated;
grant all on public.phone_sessions, public.phone_refresh_tokens to service_role;

create function public.phone_session_create(p_user_id uuid, p_phone text, p_firebase_uid text, p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.phone_sessions%rowtype;
begin
  if not exists (select 1 from auth.users u where u.id = p_user_id
    and ltrim(u.phone, '+') = ltrim(p_phone, '+') and u.phone_confirmed_at is not null
    and u.deleted_at is null and (u.banned_until is null or u.banned_until <= now())) then
    return null;
  end if;
  insert into public.phone_sessions(user_id, phone, firebase_uid)
    values (p_user_id, p_phone, p_firebase_uid) returning * into s;
  insert into public.phone_refresh_tokens(token_hash, session_id) values (p_token_hash, s.id);
  return jsonb_build_object('id', s.id, 'user_id', s.user_id, 'phone', s.phone, 'expires_at', s.expires_at);
end;
$$;

create function public.phone_session_refresh(p_token_hash text, p_next_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.phone_refresh_tokens%rowtype; s public.phone_sessions%rowtype;
begin
  select * into t from public.phone_refresh_tokens where token_hash = p_token_hash for update;
  if not found then return null; end if;
  select * into s from public.phone_sessions where id = t.session_id for update;
  if s.revoked_at is not null or s.expires_at <= now() then return null; end if;
  -- A spent credential is evidence of replay; revoke the whole session.
  if t.used_at is not null then
    update public.phone_sessions set revoked_at = now() where id = s.id;
    return null;
  end if;
  if not exists (select 1 from auth.users u where u.id = s.user_id and ltrim(u.phone, '+') = ltrim(s.phone, '+')
    and u.phone_confirmed_at is not null and u.deleted_at is null
    and (u.banned_until is null or u.banned_until <= now())) then
    update public.phone_sessions set revoked_at = now() where id = s.id;
    return null;
  end if;
  update public.phone_refresh_tokens set used_at = now() where token_hash = p_token_hash;
  insert into public.phone_refresh_tokens(token_hash, session_id) values (p_next_hash, s.id);
  return jsonb_build_object('id', s.id, 'user_id', s.user_id, 'phone', s.phone, 'expires_at', s.expires_at);
end;
$$;

create function public.phone_session_validate(p_session_id uuid, p_user_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('user_id', u.id, 'role', u.raw_app_meta_data->>'role', 'phone', s.phone)
  from public.phone_sessions s join auth.users u on u.id = s.user_id
  where s.id = p_session_id and s.user_id = p_user_id and s.revoked_at is null
    and s.expires_at > now() and u.deleted_at is null and ltrim(u.phone, '+') = ltrim(s.phone, '+')
    and u.phone_confirmed_at is not null and (u.banned_until is null or u.banned_until <= now());
$$;

create function public.phone_session_revoke(p_token_hash text)
returns void language sql security definer set search_path = '' as $$
  update public.phone_sessions set revoked_at = coalesce(revoked_at, now())
  where id = (select session_id from public.phone_refresh_tokens where token_hash = p_token_hash);
$$;

revoke all on function public.phone_session_create(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.phone_session_refresh(text, text) from public, anon, authenticated;
revoke all on function public.phone_session_validate(uuid, uuid) from public, anon, authenticated;
revoke all on function public.phone_session_revoke(text) from public, anon, authenticated;
grant execute on function public.phone_session_create(uuid, text, text, text) to service_role;
grant execute on function public.phone_session_refresh(text, text) to service_role;
grant execute on function public.phone_session_validate(uuid, uuid) to service_role;
grant execute on function public.phone_session_revoke(text) to service_role;
notify pgrst, 'reload schema';