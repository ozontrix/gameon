import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

/** How many orders the app's list asks for at once. */
const MAX_ROWS = 50;

/**
 * The caller's own ticket orders — what "My Tickets" reads.
 *
 * Cancelled orders are left out: an abandoned checkout is noise, and the
 * confirmed one is the only thing a player wants to show at the door.
 */
export async function GET(request: Request) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (_req, user) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('event_orders')
        .select(
          `id, attendee_name, tickets, status, payment_status, amount_paid, created_at,
           events ( id, title, starts_on, ends_on, daily_start_time, daily_end_time, venues ( name ) )`
        )
        .eq('user_id', user.id)
        .in('status', ['CONFIRMED', 'PENDING'])
        .order('created_at', { ascending: false })
        .limit(MAX_ROWS);

      if (error) throw error;
      return NextResponse.json({ success: true, data: data ?? [] });
    } catch (error) {
      console.error('List Event Orders Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
