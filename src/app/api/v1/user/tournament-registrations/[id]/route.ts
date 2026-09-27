import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

/**
 * The caller's own registration, confirmed or not. What the success screen
 * trusts instead of its in-memory draft — the draft is gone after a reload,
 * the registration itself is not.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const { id } = await params;
      const { data, error } = await supabaseAdmin
        .from('tournament_registrations')
        .select(
          `id, team_name, captain_name, status, payment_status, amount_paid, razorpay_payment_id,
           tournaments ( title, venue_id, court_type_id, starts_on, ends_on, daily_start_time, daily_end_time,
             venues ( name ), court_types ( name, sports ( name ) ) )`
        )
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('Get Tournament Registration Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
