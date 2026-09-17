import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

/**
 * Marks lapsed checkout holds as CANCELLED.
 *
 * Housekeeping only: slot availability and new bookings already ignore expired
 * holds, so nothing waits on this job. Vercel Cron calls it with GET and sends
 * `Authorization: Bearer $CRON_SECRET`; POST is kept for manual runs.
 */
async function clearExpired(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('CRON_SECRET is not configured; refusing to run clear-expired.');
      return NextResponse.json({ success: false, error: 'Cron not configured' }, { status: 503 });
    }

    if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'CANCELLED' })
      .eq('status', 'PENDING')
      .eq('payment_status', 'UNPAID')
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${data.length} expired bookings.`,
      clearedCount: data.length,
    });

  } catch (error) {
    console.error('Clear Expired Bookings Cron Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return clearExpired(request);
}

export async function POST(request: Request) {
  return clearExpired(request);
}
