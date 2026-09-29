import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

/** How many registrations the app's list asks for at once. */
const MAX_ROWS = 50;

/**
 * The caller's own tournament registrations — what "My Entries" reads.
 *
 * Cancelled ones are left out, same as event orders: only a live entry is worth
 * showing.
 */
export async function GET(request: Request) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (_req, user) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('tournament_registrations')
        .select(
          `id, team_name, captain_name, status, payment_status, amount_paid, created_at,
           tournaments ( id, title, starts_on, ends_on, daily_start_time, daily_end_time,
             venues ( name ), court_types ( name, sports ( name ) ) )`
        )
        .eq('user_id', user.id)
        .in('status', ['CONFIRMED', 'PENDING'])
        .order('created_at', { ascending: false })
        .limit(MAX_ROWS);

      if (error) throw error;
      return NextResponse.json({ success: true, data: data ?? [] });
    } catch (error) {
      console.error('List Tournament Registrations Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
