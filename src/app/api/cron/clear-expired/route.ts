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

    const cutoff = new Date().toISOString();
    const tables = ['bookings', 'event_orders', 'tournament_registrations'] as const;
    const results = await Promise.all(tables.map(table => supabaseAdmin
      .from(table)
      .update({ status: 'CANCELLED' })
      .eq('status', 'PENDING')
      .eq('payment_status', 'UNPAID')
      .lt('expires_at', cutoff)
      .select('id')));
    const failed = results.find(result => result.error);
    if (failed?.error) throw failed.error;
    const clearedByType = Object.fromEntries(results.map((result, index) => [tables[index], result.data?.length ?? 0]));
    const clearedCount = results.reduce((sum, result) => sum + (result.data?.length ?? 0), 0);

    return NextResponse.json({
      success: true,
      message: `Cleared ${clearedCount} expired checkout holds.`,
      clearedCount,
      clearedByType,
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
