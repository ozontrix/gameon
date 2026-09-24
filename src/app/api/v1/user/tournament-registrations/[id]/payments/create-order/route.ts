import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getRazorpay } from '@/lib/razorpay';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const registrationId = (await params).id;

      // 1. Fetch the caller's PENDING registration; its amount was set by the server
      const { data: registration, error: fetchError } = await supabaseAdmin
        .from('tournament_registrations')
        .select('amount_paid, status, user_id, expires_at, razorpay_order_id')
        .eq('id', registrationId)
        .maybeSingle();

      if (fetchError || !registration || registration.user_id !== user.id) {
        return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });
      }

      if (registration.status !== 'PENDING') {
        return NextResponse.json(
          { success: false, error: 'This registration is no longer awaiting payment.' },
          { status: 409 }
        );
      }

      if (registration.expires_at && registration.expires_at < new Date().toISOString()) {
        return NextResponse.json(
          { success: false, error: 'Your hold on this team slot expired. Please register again.' },
          { status: 410 }
        );
      }

      const amountInPaise = Math.round(Number(registration.amount_paid || 0) * 100);
      if (amountInPaise <= 0) {
        return NextResponse.json({ success: false, error: 'This entry has no amount to pay.' }, { status: 409 });
      }

      const keyId = process.env.RAZORPAY_KEY_ID;

      // 2. One Razorpay order per registration: a retried checkout reuses it
      if (registration.razorpay_order_id) {
        return NextResponse.json(
          { success: true, orderId: registration.razorpay_order_id, amount: amountInPaise, currency: 'INR', keyId },
          { status: 200 }
        );
      }

      const order = await getRazorpay().orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `tourn_${registrationId.replace(/-/g, '').substring(0, 30)}`,
        notes: { tournament_registration_id: registrationId },
      });

      // 3. Link the order to the registration — that link is what verify and the webhook trust
      const { data: linked, error: linkError } = await supabaseAdmin
        .from('tournament_registrations')
        .update({ razorpay_order_id: order.id })
        .eq('id', registrationId)
        .is('razorpay_order_id', null)
        .select('razorpay_order_id')
        .maybeSingle();

      if (linkError) throw linkError;

      let orderId = linked?.razorpay_order_id ?? null;
      if (!orderId) {
        const { data: current } = await supabaseAdmin
          .from('tournament_registrations')
          .select('razorpay_order_id')
          .eq('id', registrationId)
          .single();
        orderId = current?.razorpay_order_id ?? null;
      }
      if (!orderId) throw new Error(`Could not link a Razorpay order to registration ${registrationId}`);

      return NextResponse.json(
        { success: true, orderId, amount: amountInPaise, currency: 'INR', keyId },
        { status: 201 }
      );
    } catch (error) {
      console.error('Create Tournament Razorpay Order Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
