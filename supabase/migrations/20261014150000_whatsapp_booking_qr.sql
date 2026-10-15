alter table public.bookings add column whatsapp_consent boolean not null default false;
alter table public.event_orders add column whatsapp_consent boolean not null default false;
alter table public.tournament_registrations add column whatsapp_consent boolean not null default false;
alter table public.event_orders add column scanned_at timestamptz;
alter table public.tournament_registrations add column scanned_at timestamptz;
alter table public.whatsapp_messages drop constraint whatsapp_messages_status_check;
alter table public.whatsapp_messages add constraint whatsapp_messages_status_check
 check(status in ('queued','processing','sending','unknown','sent','delivered','read','failed','skipped'));
alter table public.whatsapp_messages add column lock_token uuid;
alter table public.whatsapp_messages add column locked_until timestamptz;
alter table public.whatsapp_messages add column retryable boolean not null default true;
alter table public.whatsapp_messages add column next_attempt_at timestamptz not null default now();
alter table public.whatsapp_messages add column media_uploaded_at timestamptz;
alter table public.whatsapp_messages add column consent_at timestamptz;
update public.whatsapp_messages set retryable=false where consent_at is null;

create or replace function public.enqueue_whatsapp_confirmation()
returns trigger language plpgsql security definer set search_path='' as $$
declare kind text;
begin
 if new.status::text <> 'CONFIRMED' or not new.whatsapp_consent then return new; end if;
 if tg_op='UPDATE' then
   if old.status::text='CONFIRMED' and old.whatsapp_consent then return new; end if;
 end if;
 kind := case tg_table_name when 'bookings' then 'booking' when 'event_orders' then 'event' else 'tournament' end;
 insert into public.whatsapp_messages(dedupe_key,category,reference_id,user_id,to_phone,template_name,language,consent_at)
 values(kind||'-confirmed:'||new.id,kind,new.id,new.user_id,coalesce(new.contact_phone,''),'booking_with_qr_new','en',now())
 on conflict(dedupe_key) do nothing;
 return new;
end; $$;
revoke all on function public.enqueue_whatsapp_confirmation() from public,anon,authenticated;
create trigger booking_whatsapp_confirmed after insert or update of status,whatsapp_consent on public.bookings
 for each row execute function public.enqueue_whatsapp_confirmation();
create trigger event_whatsapp_confirmed after insert or update of status,whatsapp_consent on public.event_orders
 for each row execute function public.enqueue_whatsapp_confirmation();
create trigger tournament_whatsapp_confirmed after insert or update of status,whatsapp_consent on public.tournament_registrations
 for each row execute function public.enqueue_whatsapp_confirmation();

create or replace function public.claim_whatsapp_delivery(p_id uuid,p_force boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.whatsapp_messages%rowtype;
begin
 select * into r from public.whatsapp_messages where id=p_id for update skip locked;
 if not found or r.consent_at is null then return null; end if;
 if r.status='sending' and r.locked_until < now() then
   update public.whatsapp_messages set status='unknown',retryable=false,error_code='UNCERTAIN_SEND',
     error_message='Sender stopped after dispatch. Check Meta delivery receipts before any resend.' where id=p_id;
   return null;
 end if;
 if r.status not in ('queued','processing','failed','skipped') then return null; end if;
 if r.status='processing' and r.locked_until>now() then return null; end if;
 if not p_force and (not r.retryable or r.attempts>=3 or r.next_attempt_at>now()) then return null; end if;
 update public.whatsapp_messages set status='processing',lock_token=gen_random_uuid(),
   locked_until=now()+interval '2 minutes',attempts=attempts+1,error_code=null,error_message=null
 where id=p_id returning * into r;
 return to_jsonb(r);
end; $$;
revoke all on function public.claim_whatsapp_delivery(uuid,boolean) from public,anon,authenticated;
grant execute on function public.claim_whatsapp_delivery(uuid,boolean) to service_role;
create table public.whatsapp_opt_outs(phone text primary key,created_at timestamptz not null default now());
alter table public.whatsapp_opt_outs enable row level security;
revoke all on public.whatsapp_opt_outs from anon,authenticated;
grant all on public.whatsapp_opt_outs to service_role;
create or replace function public.whatsapp_apply_receipt(p_message_id text,p_status text,p_at timestamptz,
 p_correlation text default null,p_error_code text default null,p_error_message text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.whatsapp_messages%rowtype; ranks jsonb:='{"sent":1,"delivered":2,"read":3}';
begin
 if p_status not in ('sent','delivered','read','failed') then return false; end if;
 select * into r from public.whatsapp_messages where wa_message_id=p_message_id
   or (id::text=p_correlation and status in ('sending','unknown','sent','delivered','read','failed'))
   for update;
 if not found then return false; end if;
 if r.wa_message_id is not null and r.wa_message_id<>p_message_id then return false; end if;
 if (coalesce((ranks->>r.status)::int,0) > coalesce((ranks->>p_status)::int,0)) then return false; end if;
 update public.whatsapp_messages set wa_message_id=p_message_id,status=p_status,retryable=false,locked_until=null,
   sent_at=case when p_status='sent' then coalesce(sent_at,p_at) else sent_at end,
   delivered_at=case when p_status='delivered' then coalesce(delivered_at,p_at) else delivered_at end,
   read_at=case when p_status='read' then coalesce(read_at,p_at) else read_at end,
   failed_at=case when p_status='failed' then p_at else failed_at end,
   error_code=case when p_status='failed' then p_error_code else null end,
   error_message=case when p_status='failed' then left(p_error_message,300) else null end
 where id=r.id;
 return true;
end; $$;
revoke all on function public.whatsapp_apply_receipt(text,text,timestamptz,text,text,text) from public,anon,authenticated;
grant execute on function public.whatsapp_apply_receipt(text,text,timestamptz,text,text,text) to service_role;
notify pgrst,'reload schema';