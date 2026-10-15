-- Confirmation outbox: created in the same transaction as the booking, never for holds.
alter table public.bookings add column contact_email text check (char_length(contact_email) <= 200);
create table public.booking_emails (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('booking','event','tournament')),
  reference_id uuid not null,
  recipient text,
  status text not null default 'queued' check (status in ('queued','processing','sending','sent','failed','skipped','unknown')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_id uuid,
  locked_until timestamptz,
  error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(category, reference_id)
);
alter table public.booking_emails enable row level security;
revoke all on public.booking_emails from anon, authenticated;
grant all on public.booking_emails to service_role;
create index booking_emails_due on public.booking_emails(available_at) where status in ('queued','failed','processing','sending');

create function public.enqueue_booking_email() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_category text; v_recipient text;
begin
  if new.status::text <> 'CONFIRMED' then return new; end if;
  if tg_op = 'UPDATE' then
    if old.status::text = 'CONFIRMED' then return new; end if;
  end if;
  v_category := case tg_table_name when 'bookings' then 'booking' when 'event_orders' then 'event' else 'tournament' end;
  v_recipient := nullif(btrim(new.contact_email), '');
  if v_recipient is null and new.user_id is not null then
    select coalesce(nullif(btrim(p.email), ''), nullif(btrim(u.email), '')) into v_recipient
    from auth.users u left join public.profiles p on p.id = u.id where u.id = new.user_id;
  end if;
  insert into public.booking_emails(category, reference_id, recipient)
    values(v_category, new.id, lower(v_recipient)) on conflict (category, reference_id) do nothing;
  return new;
end $$;
create trigger booking_email_confirmed after insert or update of status on public.bookings for each row execute function public.enqueue_booking_email();
create trigger event_email_confirmed after insert or update of status on public.event_orders for each row execute function public.enqueue_booking_email();
create trigger tournament_email_confirmed after insert or update of status on public.tournament_registrations for each row execute function public.enqueue_booking_email();
revoke all on function public.enqueue_booking_email() from public, anon, authenticated;

create function public.claim_booking_emails(p_category text default null, p_reference_id uuid default null)
returns setof public.booking_emails language plpgsql security definer set search_path = '' as $$
begin
  -- A process interrupted during SMTP DATA may already have sent the message.
  -- Never blindly resend an ambiguous delivery.
  update public.booking_emails set status='unknown', error_code='SMTP_OUTCOME_UNKNOWN', locked_until=null
    where status='sending' and locked_until < now();
  return query
  with candidate as (
    select id from public.booking_emails
    where ((status in ('queued','failed') and available_at <= now()) or (status='processing' and locked_until < now()))
      and attempts < 5 and (p_category is null or category=p_category)
      and (p_reference_id is null or reference_id=p_reference_id)
    order by created_at for update skip locked limit 1
  ) update public.booking_emails e set status='processing', attempts=e.attempts+1,
      lease_id=gen_random_uuid(), locked_until=now()+interval '5 minutes'
    from candidate c where e.id=c.id returning e.*;
end $$;
revoke all on function public.claim_booking_emails(text,uuid) from public, anon, authenticated;
grant execute on function public.claim_booking_emails(text,uuid) to service_role;
-- No historical backfill: deploying must not unexpectedly email past customers.