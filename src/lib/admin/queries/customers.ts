import 'server-only';

import { supabaseAdmin } from '@/lib/db/supabase';
import { PAGE_SIZE } from '../constants';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type BookingSummary = { user_id: string | null; amount_paid: number | null; status: string; payment_status: string; booking_date: string };

function summarise(bookings: BookingSummary[]) {
  const confirmed = bookings.filter((b) => b.status === 'CONFIRMED');
  return {
    bookingCount: confirmed.length,
    spent: confirmed.filter((b) => b.payment_status === 'PAID').reduce((sum, b) => sum + Number(b.amount_paid ?? 0), 0),
    lastBooking: confirmed.map((b) => b.booking_date).sort().at(-1) ?? null,
  };
}

/** App accounts, newest first, with their booking totals. */
export async function listCustomers(search: string | undefined, page: number) {
  let query = supabaseAdmin
    .from('profiles')
    .select('id, full_name, phone, email, created_at', { count: 'exact' });

  const term = search?.replace(/[,()*%\\]/g, ' ').trim().slice(0, 80);
  if (term) query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);

  const from = (page - 1) * PAGE_SIZE;
  const { data: customers, count, error } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  const ids = customers.map((customer) => customer.id);
  const { data: bookings } = ids.length
    ? await supabaseAdmin
        .from('bookings')
        .select('user_id, amount_paid, status, payment_status, booking_date')
        .in('user_id', ids)
        .eq('status', 'CONFIRMED')
    : { data: [] as BookingSummary[] };

  return {
    total: count ?? 0,
    customers: customers.map((customer) => ({
      ...customer,
      ...summarise((bookings ?? []).filter((b) => b.user_id === customer.id)),
    })),
  };
}

export async function getCustomer(id: string) {
  if (!UUID.test(id)) return null;

  const { data: customer, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, phone, email, city, gender, date_of_birth, preferred_sports, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!customer) return null;

  const { data: bookings, error: bookingsError } = await supabaseAdmin
    .from('bookings')
    .select('id, booking_date, start_time, end_time, amount_paid, status, payment_status, source, is_scanned, facilities ( name )')
    .eq('user_id', id)
    .neq('status', 'PENDING')
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(200);
  if (bookingsError) throw bookingsError;

  return { customer, bookings, ...summarise(bookings.map((b) => ({ ...b, user_id: id }))) };
}
