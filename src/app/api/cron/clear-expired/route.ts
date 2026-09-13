import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

// This endpoint should be protected in production (e.g., using a CRON_SECRET)
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Clear expired PENDING bookings
    // In PostgreSQL/Supabase, we delete or update the status of bookings where
    // status is 'PENDING' and expires_at is less than NOW()
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'CANCELLED' }) // Or simply delete them
      .eq('status', 'PENDING')
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${data.length} expired bookings.`,
      clearedCount: data.length,
    });

  } catch (error: any) {
    console.error('Clear Expired Bookings Cron Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
