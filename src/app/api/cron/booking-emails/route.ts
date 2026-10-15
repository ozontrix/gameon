import { NextResponse } from 'next/server';
import { BookingEmailService } from '@/lib/services/booking-email.service';

export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await BookingEmailService.drain(5), { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Email worker unavailable' }, { status: 503 }); }
}