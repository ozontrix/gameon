-- Run as postgres in the Supabase SQL editor. All fixtures and audit entries
-- roll back. Never substitute a real customer's booking ID into this test.
begin;
do $$
declare
  a uuid; v uuid := gen_random_uuid(); s uuid := gen_random_uuid();
  c uuid := gen_random_uuid(); f uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  r jsonb; d date := (clock_timestamp() at time zone 'UTC')::date;
  before_count bigint;
begin
  select id into a from auth.users where raw_app_meta_data->>'role' in ('ADMIN','STAFF') limit 1;
  if a is null then raise exception 'Create an authorized staff account before running this test'; end if;
  insert into public.venues(id,name,address,timezone) values(v,'Scanner rollback test','Not a real venue','UTC');
  insert into public.sports(id,name) values(s,'Scanner rollback test');
  insert into public.court_types(id,venue_id,sport_id,slug,name,surface_type,is_indoor,has_ac)
    values(c,v,s,'scanner-rollback-test','Scanner rollback test','synthetic',true,false);
  insert into public.facilities(id,venue_id,court_type_id,name) values(f,v,c,'Scanner rollback test');
  insert into public.bookings(id,facility_id,booking_date,start_time,end_time,status,payment_status,contact_name)
    values(b,f,d,'00:00','23:59:59','CONFIRMED','PAID','Scanner test customer');
  select count(*) into before_count from public.admin_audit_log where entity_id=b::text;
  r := public.check_in_reservation(b::text,a,'hid',v,f);
  if r->>'status' <> 'checked_in' then raise exception 'Valid booking failed: %',r; end if;
  if not (select is_scanned and scanned_at is not null from public.bookings where id=b) then raise exception 'Scan not persisted'; end if;
  if (select count(*) from public.admin_audit_log where entity_id=b::text) <> before_count+1 then raise exception 'Audit missing'; end if;
  r := public.check_in_reservation(b::text,a,'hid',v,f);
  if r->>'status' <> 'already_checked_in' or r->'booking'->>'scannedAt' is null then raise exception 'Duplicate check failed: %',r; end if;
  update public.bookings set is_scanned=false,scanned_at=null,payment_status='UNPAID' where id=b;
  r := public.check_in_reservation(b::text,a); if r->>'status' <> 'payment_pending' then raise exception 'Payment check failed: %',r; end if;
  update public.bookings set payment_status='REFUNDED' where id=b;
  r := public.check_in_reservation(b::text,a); if r->>'status' <> 'refunded' then raise exception 'Refund check failed: %',r; end if;
  update public.bookings set payment_status='PAID',status='CANCELLED' where id=b;
  r := public.check_in_reservation(b::text,a); if r->>'status' <> 'cancelled' then raise exception 'Cancellation check failed: %',r; end if;
  update public.bookings set status='CONFIRMED',booking_date=d-1 where id=b;
  r := public.check_in_reservation(b::text,a); if r->>'status' <> 'expired' then raise exception 'Expiry check failed: %',r; end if;
  update public.bookings set booking_date=d+1 where id=b;
  r := public.check_in_reservation(b::text,a); if r->>'status' <> 'wrong_date' then raise exception 'Date check failed: %',r; end if;
  update public.bookings set booking_date=d where id=b;
  r := public.check_in_reservation(b::text,a,'hid',gen_random_uuid()); if r->>'status' <> 'wrong_location' then raise exception 'Venue check failed: %',r; end if;
  r := public.check_in_reservation(b::text,a,'hid',v,gen_random_uuid()); if r->>'status' <> 'wrong_location' then raise exception 'Court check failed: %',r; end if;
  r := public.check_in_reservation('malformed{QR',a); if r->>'status' <> 'invalid' then raise exception 'Malformed check failed'; end if;
  r := public.check_in_reservation(gen_random_uuid()::text,a); if r->>'status' <> 'not_found' then raise exception 'Unknown check failed'; end if;
  begin
    perform public.check_in_reservation(b::text,gen_random_uuid());
    raise exception 'Authorization was bypassed';
  exception when insufficient_privilege then null; end;
  select count(*) into before_count from public.admin_audit_log where entity_id=b::text;
  begin
    perform public.check_in_reservation(b::text,a);
    raise exception 'force rollback' using errcode='ZX001';
  exception when sqlstate 'ZX001' then null; end;
  if (select is_scanned from public.bookings where id=b) then raise exception 'Transaction rollback failed'; end if;
  if (select count(*) from public.admin_audit_log where entity_id=b::text) <> before_count then raise exception 'Audit rollback failed'; end if;
  if has_function_privilege('anon','public.check_in_reservation(text,uuid,text,uuid,uuid,integer)','execute') or
     has_function_privilege('authenticated','public.check_in_reservation(text,uuid,text,uuid,uuid,integer)','execute') then raise exception 'RPC publicly executable'; end if;
end $$;
rollback;