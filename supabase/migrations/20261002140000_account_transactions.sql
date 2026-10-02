-- Read-through history: payment confirmation/webhooks already persist these
-- records. Do not introduce a second payment ledger or change checkout writes.
create or replace view public.account_transactions
with (security_invoker = true) as
select
  'booking:' || b.id::text as id,
  b.user_id,
  'booking'::text as category,
  coalesce(b.paid_at, b.created_at) as created_at,
  coalesce(s.name, 'Sport') || ' slot booking' as title,
  concat_ws(' · ', f.name, b.booking_date::text, left(b.start_time::text, 5) || '–' || left(b.end_time::text, 5)) as subtitle,
  b.id as booking_id,
  -greatest(b.amount_paid - coalesce(b.wallet_points_used, 0), 0)::numeric as amount,
  'INR'::text as currency,
  0::integer as points,
  null::text as reason,
  case when b.payment_status = 'REFUNDED' then 'Refunded'
       when b.status = 'CANCELLED' then 'Paid · Cancelled'
       else 'Paid' end as status,
  b.razorpay_payment_id as payment_reference,
  coalesce(b.wallet_points_used, 0) as points_used
from public.bookings b
left join public.facilities f on f.id = b.facility_id
left join public.court_types ct on ct.id = f.court_type_id
left join public.sports s on s.id = ct.sport_id
where b.user_id is not null and b.payment_status in ('PAID', 'REFUNDED')
union all
select
  'event:' || o.id::text, o.user_id, 'event',
  coalesce(o.paid_at, o.created_at),
  coalesce(e.title, 'Event') || ' tickets',
  o.tickets::text || case when o.tickets = 1 then ' ticket' else ' tickets' end,
  o.id, -o.amount_paid, 'INR', 0, null,
  case when o.payment_status = 'REFUNDED' then 'Refunded'
       when o.status = 'CANCELLED' then 'Paid · Cancelled' else 'Paid' end,
  o.razorpay_payment_id, 0
from public.event_orders o
left join public.events e on e.id = o.event_id
where o.user_id is not null and o.payment_status in ('PAID', 'REFUNDED')
union all
select
  'tournament:' || r.id::text, r.user_id, 'tournament',
  coalesce(r.paid_at, r.created_at),
  coalesce(t.title, 'Tournament') || ' entry',
  r.team_name, r.id, -r.amount_paid, 'INR', 0, null,
  case when r.payment_status = 'REFUNDED' then 'Refunded'
       when r.status = 'CANCELLED' then 'Paid · Cancelled' else 'Paid' end,
  r.razorpay_payment_id, 0
from public.tournament_registrations r
left join public.tournaments t on t.id = r.tournament_id
where r.user_id is not null and r.payment_status in ('PAID', 'REFUNDED')
union all
select
  'points:' || w.id::text, w.user_id,
  case when w.reason in ('refund_credit', 'refund_credit_release') then 'refund'
       when w.reason in ('booking_redeem', 'booking_redeem_release') then 'wallet'
       else 'earned' end,
  w.created_at, 'Points activity', 'GameOn Wallet', w.booking_id,
  null::numeric, null::text, w.points, w.reason, 'Updated', null::text, 0
from public.wallet_transactions w;

-- Only the authenticated backend may query this view. Its API always scopes
-- by the verified JWT's user ID; never trust a caller-supplied account ID.
revoke all on public.account_transactions from public, anon, authenticated;
grant select on public.account_transactions to service_role;

comment on view public.account_transactions is
  'Backend-only unified payment receipts and Points activity. Amounts are INR, not paise; Points are separate. Unpaid holds are excluded.';