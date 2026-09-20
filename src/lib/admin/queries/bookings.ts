import 'server-only';

import { supabaseAdmin } from '@/lib/db/supabase';
import type { Database } from '@/types/database.types';
import { BOOKING_SOURCES, BOOKING_STATUSES, PAGE_SIZE, PAYMENT_STATUSES } from '../constants';

type BookingStatus = Database['public']['Enums']['booking_status'];
type PaymentStatus = Database['public']['Enums']['payment_status'];

export type BookingFilters = {
  q?: string;
  from?: string;
  to?: string;
  status?: BookingStatus;
  payment?: PaymentStatus;
  source?: (typeof BOOKING_SOURCES)[number];
  venue?: string;
  facility?: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function one(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() || undefined;
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** Reads and validates the bookings filters from the URL. Anything malformed is ignored. */
export function readBookingFilters(params: SearchParams): BookingFilters {
  const from = one(params.from);
  const to = one(params.to);
  const venue = one(params.venue);
  const facility = one(params.facility);
  return {
    q: one(params.q)?.slice(0, 80),
    from: from && DATE.test(from) ? from : undefined,
    to: to && DATE.test(to) ? to : undefined,
    status: oneOf(one(params.status), BOOKING_STATUSES),
    payment: oneOf(one(params.payment), PAYMENT_STATUSES),
    source: oneOf(one(params.source), BOOKING_SOURCES),
    venue: venue && UUID.test(venue) ? venue : undefined,
    facility: facility && UUID.test(facility) ? facility : undefined,
  };
}

/** The filters as URL params, e.g. for pagination and export links. */
export function filterParams(filters: BookingFilters): Record<string, string | undefined> {
  return { ...filters };
}

const LIST_SELECT = `
  id, booking_date, start_time, end_time, status, payment_status, payment_method, source,
  amount_paid, contact_name, contact_phone, players, notes, is_scanned, scanned_at, created_at, paid_at,
  user_id, razorpay_order_id, razorpay_payment_id, cancel_reason, refund_reference,
  facilities!inner ( id, name, venue_id, venues ( name ), court_types!inner ( sport_id, sports ( name ) ) )
` as const;

function bookingsQuery(filters: BookingFilters) {
  let query = supabaseAdmin.from('bookings').select(LIST_SELECT, { count: 'exact' });

  // Abandoned app checkouts are noise unless asked for explicitly.
  query = filters.status ? query.eq('status', filters.status) : query.neq('status', 'PENDING');
  if (filters.payment) query = query.eq('payment_status', filters.payment);
  if (filters.source) query = query.eq('source', filters.source);
  if (filters.from) query = query.gte('booking_date', filters.from);
  if (filters.to) query = query.lte('booking_date', filters.to);
  if (filters.facility) query = query.eq('facility_id', filters.facility);
  if (filters.venue) query = query.eq('facilities.venue_id', filters.venue);

  const q = filters.q;
  if (q) {
    const hex = q.replace(/^#/, '');
    if (UUID.test(q)) {
      query = query.eq('id', q.toLowerCase());
    } else if (/^[0-9a-f]{8}$/i.test(hex)) {
      // The short booking ID customers see is the first 8 characters of the UUID.
      const prefix = hex.toLowerCase();
      query = query
        .gte('id', `${prefix}-0000-0000-0000-000000000000`)
        .lte('id', `${prefix}-ffff-ffff-ffff-ffffffffffff`);
    } else {
      // Characters that would break PostgREST's or() syntax are dropped.
      const term = q.replace(/[,()*%\\]/g, ' ').trim();
      if (term) query = query.or(`contact_name.ilike.%${term}%,contact_phone.ilike.%${term}%`);
    }
  }

  return query.order('booking_date', { ascending: false }).order('start_time', { ascending: false });
}

export async function listBookings(filters: BookingFilters, page: number) {
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await bookingsQuery(filters).range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  return { bookings: data, total: count ?? 0 };
}

/** Up to 5,000 rows for CSV export. */
export async function exportBookings(filters: BookingFilters) {
  const { data, error } = await bookingsQuery(filters).range(0, 4999);
  if (error) throw error;
  return data;
}

export type BookingListRow = Awaited<ReturnType<typeof listBookings>>['bookings'][number];

export async function getBooking(id: string) {
  if (!UUID.test(id)) return null;

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select(
      `*, facilities ( id, name,
        venues ( id, name, address, timezone ),
        court_types ( name, surface_type, is_indoor, has_ac, sports ( name ) ) )`
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!booking) return null;

  const [customer, history, createdBy, cancelledBy] = await Promise.all([
    booking.user_id
      ? supabaseAdmin.from('profiles').select('id, full_name, phone, email').eq('id', booking.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabaseAdmin
      .from('admin_audit_log')
      .select('id, action, actor_email, details, created_at')
      .eq('entity_type', 'booking')
      .eq('entity_id', id)
      .order('created_at', { ascending: false }),
    booking.created_by ? supabaseAdmin.auth.admin.getUserById(booking.created_by) : Promise.resolve(null),
    booking.cancelled_by ? supabaseAdmin.auth.admin.getUserById(booking.cancelled_by) : Promise.resolve(null),
  ]);

  return {
    booking,
    customer: customer.data,
    history: history.data ?? [],
    createdByEmail: createdBy?.data.user?.email ?? null,
    cancelledByEmail: cancelledBy?.data.user?.email ?? null,
  };
}

/** Venues and courts for the filter dropdowns. */
export async function listFilterOptions() {
  const [venues, facilities] = await Promise.all([
    supabaseAdmin.from('venues').select('id, name').order('name'),
    supabaseAdmin.from('facilities').select('id, name, venue_id').order('name'),
  ]);
  return { venues: venues.data ?? [], facilities: facilities.data ?? [] };
}
