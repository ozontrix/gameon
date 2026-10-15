-- Lease recovery is separate from retry selection so the final crashed attempt
-- cannot remain "sending" forever. Never automatically repeat uncertain sends.
create or replace function public.whatsapp_recover_stale()
returns void language plpgsql security definer set search_path='' as $$
begin
 update public.whatsapp_messages set status='unknown', retryable=false, locked_until=null,
   error_code='UNCERTAIN_SEND', error_message='Sender stopped after dispatch. Check Meta receipts before resending.'
 where status='sending' and coalesce(locked_until,'-infinity'::timestamptz)<now();
 update public.whatsapp_messages set status='failed', retryable=false, locked_until=null,
   error_code='ATTEMPTS_EXHAUSTED', error_message='QR preparation did not finish after three attempts. Manual retry is available.'
 where status='processing' and attempts>=3 and coalesce(locked_until,'-infinity'::timestamptz)<now();
end; $$;
revoke all on function public.whatsapp_recover_stale() from public,anon,authenticated;
grant execute on function public.whatsapp_recover_stale() to service_role;

create or replace function public.claim_whatsapp_delivery(p_id uuid,p_force boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.whatsapp_messages%rowtype;
begin
 select * into r from public.whatsapp_messages where id=p_id for update skip locked;
 if not found or r.consent_at is null then return null; end if;
 if r.status='sending' and coalesce(r.locked_until,'-infinity'::timestamptz)<now() then
   update public.whatsapp_messages set status='unknown',retryable=false,locked_until=null,
     error_code='UNCERTAIN_SEND',error_message='Sender stopped after dispatch. Check Meta receipts before resending.' where id=p_id;
   return null;
 end if;
 if r.status not in ('queued','processing','failed','skipped') then return null; end if;
 if r.status='processing' and r.locked_until>now() then return null; end if;
 if not p_force and (not r.retryable or r.attempts>=3 or r.next_attempt_at>now()) then return null; end if;
 update public.whatsapp_messages set status='processing',lock_token=gen_random_uuid(),
   locked_until=now()+interval '2 minutes',attempts=attempts+1,error_code=null,error_message=null,
   wa_message_id=null,sent_at=null,failed_at=null
 where id=p_id returning * into r;
 return to_jsonb(r);
end; $$;
revoke all on function public.claim_whatsapp_delivery(uuid,boolean) from public,anon,authenticated;
grant execute on function public.claim_whatsapp_delivery(uuid,boolean) to service_role;

create or replace function public.whatsapp_apply_receipt(p_message_id text,p_status text,p_at timestamptz,
 p_correlation text default null,p_error_code text default null,p_error_message text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.whatsapp_messages%rowtype; ranks jsonb:='{"sent":1,"delivered":2,"read":3}';
begin
 if p_status not in ('sent','delivered','read','failed') then return false; end if;
 select * into r from public.whatsapp_messages where wa_message_id=p_message_id
   or (id::text||':'||lock_token::text=p_correlation and status in ('sending','unknown','sent','delivered','read','failed'))
   for update;
 if not found then return false; end if;
 if r.wa_message_id is not null and r.wa_message_id<>p_message_id then return false; end if;
 if p_status='failed' and r.status in ('delivered','read') then return false; end if;
 if r.status='failed' and p_status='sent' then return false; end if;
 if p_status<>'failed' and coalesce((ranks->>r.status)::int,0)>coalesce((ranks->>p_status)::int,0) then return false; end if;
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
create index if not exists whatsapp_delivery_worker on public.whatsapp_messages(next_attempt_at,created_at)
 where retryable and consent_at is not null;
notify pgrst,'reload schema';