import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

/**
 * Releases the caller's own unpaid registration hold, e.g. when they close
 * the payment sheet. Cancelling a paid (CONFIRMED) registration is not
 * supported yet.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const registrationId = (await params).id;

      const { data: registration, error: fetchError } = await supabaseAdmin
        .from('tournament_registrations')
        .select('user_id, status, payment_status')
        .eq('id', registrationId)
        .maybeSingle();

      if (fetchError || !registration || registration.user_id !== user.id) {
        return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });
      }

      if (registration.status === 'CANCELLED') {
        return NextResponse.json({ success: true, message: 'Registration already released' });
      }

      if (registration.status !== 'PENDING' || registration.payment_status !== 'UNPAID') {
        return NextResponse.json(
          { success: false, error: "Paid entries can't be cancelled in the app yet." },
          { status: 400 }
        );
      }

      const { data: released, error: updateError } = await supabaseAdmin
        .from('tournament_registrations')
        .update({ status: 'CANCELLED' })
        .eq('id', registrationId)
        .eq('status', 'PENDING')
        .eq('payment_status', 'UNPAID')
        .select('id')
        .maybeSingle();

      if (updateError) throw updateError;
      if (!released) {
        return NextResponse.json({ success: false, error: 'This registration was just updated.' }, { status: 409 });
      }

      return NextResponse.json({ success: true, message: 'Registration released' });
    } catch (error) {
      console.error('Cancel Tournament Registration Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
