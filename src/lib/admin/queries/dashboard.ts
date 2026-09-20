import 'server-only';

import { supabaseAdmin } from '@/lib/db/supabase';
import { DEFAULT_TIMEZONE, dayOfWeek, minutesBetween, wallClockIn } from '@/lib/utils/date-helpers';
import { addDays } from '../format';

export async function getDashboard() {
  const now = wallClockIn(DEFAULT_TIMEZONE);
  const today = now.date;
  const chartStart = addDays(today, -13);
  const monthStart = `${today.slice(0, 8)}01`;
  const revenueFrom = chartStart < monthStart ? chartStart : monthStart;

  const [todays, revenue, refunds, unpaid, holds, courts, hours, closures] = await Promise.all([
    supabaseAdmin
      .from('bookings')
      .select('id, start_time, end_time, payment_status, amount_paid, is_scanned, contact_name, facility_id, facilities ( name )')
      .eq('booking_date', today)
      .eq('status', 'CONFIRMED')
      .order('start_time'),
    supabaseAdmin
      .from('bookings')
      .select('booking_date, amount_paid')
      .gte('booking_date', revenueFrom)
      .lte('booking_date', today)
      .eq('status', 'CONFIRMED')
      .eq('payment_status', 'PAID'),
    supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'CANCELLED')
      .eq('payment_status', 'PAID'),
    supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'CONFIRMED')
      .eq('payment_status', 'UNPAID')
      .gte('booking_date', today),
    supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING')
      .gt('expires_at', new Date().toISOString()),
    supabaseAdmin
      .from('facilities')
      .select('id, venue_id, venues!inner ( is_active )')
      .eq('is_active', true)
      .eq('venues.is_active', true),
    supabaseAdmin
      .from('operating_hours')
      .select('venue_id, open_time, close_time')
      .eq('day_of_week', dayOfWeek(today)),
    supabaseAdmin
      .from('holidays_and_closures')
      .select('venue_id, facility_id, start_time, end_time, reason')
      .eq('date', today),
  ]);

  // Occupancy: booked court time against every open court's opening hours today.
  // Measured in minutes because slot lengths differ per court type. Courts
  // closed for the whole day offer nothing; partial closures are ignored.
  const openMinutesPerVenue = new Map(
    (hours.data ?? []).map((h) => [h.venue_id, minutesBetween(h.open_time, h.close_time)])
  );
  const fullDay = (closures.data ?? []).filter((c) => !c.start_time || !c.end_time);
  const openCourts = (courts.data ?? []).filter(
    (court) => !fullDay.some((c) => c.venue_id === court.venue_id && (!c.facility_id || c.facility_id === court.id))
  );
  const openMinutes = openCourts.reduce((sum, court) => sum + (openMinutesPerVenue.get(court.venue_id) ?? 0), 0);
  const openIds = new Set(openCourts.map((court) => court.id));
  const todaysBookings = todays.data ?? [];
  const bookedMinutes = todaysBookings
    .filter((b) => b.facility_id && openIds.has(b.facility_id))
    .reduce((sum, b) => sum + minutesBetween(b.start_time, b.end_time), 0);

  const revenueByDay = new Map<string, number>();
  for (const row of revenue.data ?? []) {
    revenueByDay.set(row.booking_date, (revenueByDay.get(row.booking_date) ?? 0) + Number(row.amount_paid ?? 0));
  }
  const sumFrom = (from: string) =>
    [...revenueByDay.entries()].filter(([date]) => date >= from).reduce((sum, [, amount]) => sum + amount, 0);

  return {
    today,
    nowTime: now.time,
    todaysBookings,
    checkedIn: todaysBookings.filter((b) => b.is_scanned).length,
    occupancy: { bookedMinutes, openMinutes },
    revenueToday: revenueByDay.get(today) ?? 0,
    revenueLast7: sumFrom(addDays(today, -6)),
    revenueMonth: sumFrom(monthStart),
    chart: Array.from({ length: 14 }, (_, i) => {
      const date = addDays(chartStart, i);
      return { date, amount: revenueByDay.get(date) ?? 0 };
    }),
    refundsPending: refunds.count ?? 0,
    unpaidUpcoming: unpaid.count ?? 0,
    checkoutsInProgress: holds.count ?? 0,
    closuresToday: closures.data ?? [],
  };
}
