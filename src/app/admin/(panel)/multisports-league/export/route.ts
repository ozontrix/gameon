import { NextResponse } from 'next/server';
import { getStaffSession } from '@/lib/admin/session';
import { leagueDetails, listLeagueBookings, readLeagueFilters } from '@/lib/admin/queries/league';

export function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const actor = await getStaffSession();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (actor.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const filters = readLeagueFilters(Object.fromEntries(new URL(request.url).searchParams));
  const rows: unknown[][] = [['Booking ID', 'Reference', 'Status', 'Sport', 'Categories', 'Match dates', 'Player tickets', 'Player / captain', 'Team', 'Email', 'Phone', 'City', 'Notes', 'Add-ons', 'Entry fees INR', 'Add-ons INR', 'Subtotal INR', 'Discount INR', 'Coupon', 'Total INR', 'Razorpay order', 'Razorpay payment', 'Created', 'Confirmed', 'Email status', 'Email sent at']];
  for (let page = 1; ; page++) {
    const { bookings } = await listLeagueBookings(filters, page, 500);
    for (const booking of bookings) {
      const { entry, quote } = leagueDetails(booking);
      rows.push([booking.id, booking.reference, booking.status, entry.sportName, entry.categories.map(c => `${c.sportName ? `${c.sportName} · ` : ''}${c.name}`).join(' + '), entry.categories.map(c => `${c.sportName ? `${c.sportName} · ` : ''}${c.name}: ${c.date ?? entry.date}`).join('; '), entry.squadSize, booking.captain_name, booking.team_name, booking.email, booking.phone, entry.city, entry.notes, entry.addons.map(a => `${a.name} x ${a.qty}: ${a.amount}`).join('; '), quote.entryFee, quote.addOnsTotal, quote.subtotal, quote.discount, quote.couponCode, booking.amount_paise / 100, booking.razorpay_order_id, booking.razorpay_payment_id, booking.created_at, booking.paid_at, booking.email_status, booking.email_sent_at]);
    }
    if (bookings.length < 500) break;
  }
  return new NextResponse(`\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n`, { headers: {
    'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="gameon-league-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store',
  } });
}