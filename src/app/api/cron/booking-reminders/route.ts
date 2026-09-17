import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { NotificationService } from '@/lib/services/notification.service';
import { DEFAULT_TIMEZONE, wallClockIn } from '@/lib/utils/date-helpers';

/**
 * Morning reminder for every confirmed booking played today that has not
 * started yet. Vercel Cron calls it once a day with `Authorization: Bearer
 * $CRON_SECRET`. Safe to run more than once: each booking gets one reminder.
 */
async function sendReminders(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET is not configured; refusing to run booking-reminders.');
    return NextResponse.json({ success: false, error: 'Cron not configured' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = wallClockIn(DEFAULT_TIMEZONE);
    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('booking_date', now.date)
      .eq('status', 'CONFIRMED')
      .gt('start_time', now.time)
      .not('user_id', 'is', null);

    if (error) throw error;

    for (const booking of bookings) {
      await NotificationService.notifyBooking(booking.id, { type: 'reminder' });
    }

    return NextResponse.json({ success: true, date: now.date, reminded: bookings.length });
  } catch (error) {
    console.error('Booking Reminders Cron Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return sendReminders(request);
}

export async function POST(request: Request) {
  return sendReminders(request);
}
