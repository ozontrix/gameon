-- Existing scan fields and audit table are reused. Entry and audit are atomic.
-- SECURITY DEFINER is necessary for the current-role read in auth.users.
-- Execute is revoked from PUBLIC/anon/authenticated; only service_role can call.
create index if not exists admin_audit_log_scan_actor_idx
  on public.admin_audit_log (actor_id, created_at desc) where action = 'booking.scan';

create or replace function public.check_in_reservation(
  p_code text, p_actor_id uuid, p_source text default 'api',
  p_venue_id uuid default null, p_facility_id uuid default null, p_early_minutes integer default 30
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_code text := pg_catalog.btrim(p_code);
  v_pattern text := '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  v_id uuid;
  v_category text := 'booking';
  v_status text;
  v_email text;
  v_row jsonb;
  v_context record;
  v_booking jsonb;
  v_now timestamptz;
  v_local timestamp;
  v_day date;
  v_end_day date;
  v_start time;
  v_end time;
  v_scanned_at timestamptz;
begin
  select u.email into v_email from auth.users u
  where u.id = p_actor_id and u.raw_app_meta_data->>'role' in ('ADMIN', 'STAFF');
  if not found then raise exception 'Staff authorization required' using errcode = '42501'; end if;
  if p_source is null or p_source not in ('hid', 'manual', 'camera', 'api', 'admin') or
     p_early_minutes is null or p_early_minutes not between 0 and 240 then
    raise exception 'Invalid scanner configuration' using errcode = '22023';
  end if;
  -- Shared across instances; serializes rate-limit checks for this staff user.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('check-in:' || p_actor_id::text, 0));
  if (select count(*) from public.admin_audit_log where actor_id = p_actor_id and action = 'booking.scan'
      and created_at > pg_catalog.clock_timestamp() - interval '1 minute') >= 120 then
    return pg_catalog.jsonb_build_object('success', false, 'status', 'rate_limited');
  end if;
  if v_code ~* ('^' || v_pattern || '$') then v_id := v_code::uuid;
  elsif v_code ~* ('^gameon:(event|tournament):' || v_pattern || '$') then
    v_category := pg_catalog.split_part(pg_catalog.lower(v_code), ':', 2);
    v_id := pg_catalog.split_part(v_code, ':', 3)::uuid;
  else v_status := 'invalid'; end if;

  if v_status is null then
    if v_category = 'booking' then
      select pg_catalog.to_jsonb(b) into v_row from public.bookings b where b.id = v_id for update;
      if found then
        select f.id as facility_id, f.name as facility_name, f.is_active and v.is_active as active,
          v.id as venue_id, v.name as venue_name, v.timezone, s.name as sport, null::text as activity_status
        into v_context from public.facilities f join public.venues v on v.id = f.venue_id
        join public.court_types c on c.id = f.court_type_id and c.venue_id = v.id
        join public.sports s on s.id = c.sport_id
        where f.id = (v_row->>'facility_id')::uuid for share of f, v, c, s;
      end if;
    elsif v_category = 'event' then
      select pg_catalog.to_jsonb(o) into v_row from public.event_orders o where o.id = v_id for update;
      if found then
        select null::uuid as facility_id, e.title || ' (' || (v_row->>'tickets') || ' tickets — entire order)' as facility_name,
          v.is_active as active, v.id as venue_id, v.name as venue_name, v.timezone, s.name as sport,
          e.status as activity_status, e.starts_on, e.ends_on, e.daily_start_time, e.daily_end_time
        into v_context from public.events e join public.venues v on v.id = e.venue_id
        join public.sports s on s.id = e.sport_id
        where e.id = (v_row->>'event_id')::uuid for share of e, v, s;
      end if;
    else
      select pg_catalog.to_jsonb(r) into v_row from public.tournament_registrations r where r.id = v_id for update;
      if found then
        select null::uuid as facility_id, t.title || ' — ' || (v_row->>'team_name') as facility_name,
          v.is_active as active, v.id as venue_id, v.name as venue_name, v.timezone, s.name as sport,
          t.status as activity_status, t.starts_on, t.ends_on, t.daily_start_time, t.daily_end_time
        into v_context from public.tournaments t join public.venues v on v.id = t.venue_id
        join public.court_types c on c.id = t.court_type_id and c.venue_id = v.id
        join public.sports s on s.id = c.sport_id
        where t.id = (v_row->>'tournament_id')::uuid for share of t, v, c, s;
      end if;
    end if;
    v_now := pg_catalog.clock_timestamp();
    if v_row is null then v_status := 'not_found';
    elsif v_context.venue_id is null then v_status := 'unavailable';
    else
      v_local := v_now at time zone coalesce(v_context.timezone, 'Asia/Kolkata');
      if v_category = 'booking' then
        v_day := (v_row->>'booking_date')::date; v_end_day := v_day;
        v_start := (v_row->>'start_time')::time; v_end := (v_row->>'end_time')::time;
      else
        v_day := v_context.starts_on; v_end_day := v_context.ends_on;
        v_start := v_context.daily_start_time; v_end := v_context.daily_end_time;
      end if;
      v_scanned_at := (v_row->>'scanned_at')::timestamptz;
      if v_row->>'payment_status' = 'REFUNDED' or v_row->>'refunded_at' is not null then v_status := 'refunded';
      elsif v_row->>'status' = 'CANCELLED' or v_context.activity_status = 'cancelled' then v_status := 'cancelled';
      elsif v_row->>'status' <> 'CONFIRMED' then
        v_status := case when (v_row->>'expires_at')::timestamptz <= v_now then 'expired' else 'not_confirmed' end;
      elsif v_row->>'payment_status' <> 'PAID' then v_status := 'payment_pending';
      elsif not v_context.active or coalesce(v_context.activity_status, 'published') not in ('published', 'registration_closed') then v_status := 'unavailable';
      elsif (p_venue_id is not null and p_venue_id <> v_context.venue_id) or
            (p_facility_id is not null and p_facility_id is distinct from v_context.facility_id) then v_status := 'wrong_location';
      elsif v_scanned_at is not null or coalesce((v_row->>'is_scanned')::boolean, false) then v_status := 'already_checked_in';
      elsif v_local::date > v_end_day then v_status := 'expired';
      elsif v_local::date < v_day then v_status := 'wrong_date';
      elsif v_start is null or v_end is null or v_end <= v_start then v_status := 'unavailable';
      elsif v_local < v_local::date + v_start - pg_catalog.make_interval(mins => p_early_minutes) then v_status := 'too_early';
      elsif v_local >= v_local::date + v_end then v_status := 'too_late';
      else
        v_status := 'checked_in'; v_scanned_at := v_now;
        if v_category = 'booking' then update public.bookings set is_scanned = true, scanned_at = v_now where id = v_id;
        elsif v_category = 'event' then update public.event_orders set scanned_at = v_now where id = v_id;
        else update public.tournament_registrations set scanned_at = v_now where id = v_id; end if;
      end if;
      v_booking := pg_catalog.jsonb_build_object(
        'bookingId', v_id, 'category', v_category,
        'userName', coalesce(nullif(v_row->>'contact_name', ''), v_row->>'attendee_name', v_row->>'captain_name',
          (select nullif(p.full_name, '') from public.profiles p where p.id = (v_row->>'user_id')::uuid), 'Customer'),
        'facilityName', v_context.facility_name, 'sport', v_context.sport,
        'venueName', v_context.venue_name, 'venueId', v_context.venue_id, 'facilityId', v_context.facility_id,
        'timezone', coalesce(v_context.timezone, 'Asia/Kolkata'), 'date', v_day, 'endDate', v_end_day,
        'startTime', v_start, 'endTime', v_end, 'scannedAt', v_scanned_at);
    end if;
  end if;
  insert into public.admin_audit_log(actor_id, actor_email, action, entity_type, entity_id, details)
  values(p_actor_id, v_email, 'booking.scan', v_category, v_id::text,
    pg_catalog.jsonb_build_object('status', v_status, 'source', p_source,
      'venueId', v_booking->>'venueId', 'facilityId', v_booking->>'facilityId',
      'previousScannedAt', v_row->>'scanned_at', 'previousIsScanned', v_row->>'is_scanned', 'scannedAt', v_scanned_at));
  return pg_catalog.jsonb_build_object('success', v_status = 'checked_in', 'status', v_status, 'booking', v_booking);
end;
$$;
revoke all on function public.check_in_reservation(text, uuid, text, uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.check_in_reservation(text, uuid, text, uuid, uuid, integer) to service_role;
notify pgrst, 'reload schema';