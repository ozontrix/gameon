-- Tokens and delivery attempts are server-only. Guests can receive broadcasts;
-- a capability secret proves ownership of an installation, not a user account.
create table public.push_devices (
  installation_id uuid primary key,
  secret_hash text not null,
  user_id uuid references public.profiles(id) on delete cascade,
  token text unique,
  platform text not null check (platform in ('android','ios')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create index push_devices_user on public.push_devices(user_id) where enabled;
alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon, authenticated;
grant all on public.push_devices to service_role;

create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  installation_id uuid not null references public.push_devices(installation_id) on delete cascade,
  -- Snapshot prevents a targeted message following a device to a different account.
  recipient_user_id uuid,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','skipped')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_id uuid,
  error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(notification_id, installation_id)
);
create index push_deliveries_pending on public.push_deliveries(available_at) where status in ('pending','sending');
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from anon, authenticated;
grant all on public.push_deliveries to service_role;

create function public.register_push_device(p_installation_id uuid, p_secret_hash text, p_token text, p_platform text, p_user_id uuid, p_enabled boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_installation_id::text,1));
  -- Serializes token reassignment between reinstallations without exposing tokens.
  perform pg_advisory_xact_lock(hashtextextended(coalesce(p_token,p_installation_id::text),0));
  if exists(select 1 from push_devices where installation_id=p_installation_id and secret_hash<>p_secret_hash) then
    raise exception 'Installation capability mismatch' using errcode='42501';
  end if;
  if p_token is not null then
    update push_devices set token=null, enabled=false where token=p_token and installation_id<>p_installation_id;
  end if;
  insert into push_devices(installation_id,secret_hash,token,platform,user_id,enabled)
  values(p_installation_id,p_secret_hash,p_token,p_platform,p_user_id,p_enabled)
  on conflict(installation_id) do update set token=excluded.token,platform=excluded.platform,
    user_id=excluded.user_id,enabled=excluded.enabled,updated_at=now();
end $$;

create function public.enqueue_notification_push() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into push_deliveries(notification_id,installation_id,recipient_user_id)
  select new.id,installation_id,new.user_id from push_devices
  where enabled and token is not null and updated_at>now()-interval '90 days'
    and (new.user_id is null or user_id=new.user_id);
  return new;
end $$;
create trigger notification_push_queue after insert on public.notifications
for each row execute function public.enqueue_notification_push();

create function public.claim_push_deliveries(p_limit integer default 50, p_notification_id uuid default null)
returns setof public.push_deliveries language sql security definer set search_path = public, pg_temp as $$
  update push_deliveries d set status='sending', attempts=d.attempts+1, lease_id=gen_random_uuid(), available_at=now()+interval '5 minutes'
  where d.id in (
    select q.id from push_deliveries q where q.status in ('pending','sending') and q.available_at<=now()
      and (p_notification_id is null or q.notification_id=p_notification_id)
    order by q.created_at limit greatest(1,least(p_limit,100)) for update skip locked
  ) returning d.*;
$$;
revoke all on function public.register_push_device(uuid,text,text,text,uuid,boolean) from public,anon,authenticated;
revoke all on function public.enqueue_notification_push() from public,anon,authenticated;
revoke all on function public.claim_push_deliveries(integer,uuid) from public,anon,authenticated;
grant execute on function public.register_push_device(uuid,text,text,text,uuid,boolean) to service_role;
grant execute on function public.claim_push_deliveries(integer,uuid) to service_role;