import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middlewares/auth';
import { BookingService } from '@/lib/services/booking.service';
import { toAppBooking } from '@/lib/services/booking-presenter';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (_req, user) => {
    const id = z.string().uuid().safeParse((await params).id);
    if (!id.success) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    try {
      const booking = await BookingService.getUserBooking(user.id, id.data);
      if (!booking) return NextResponse.json({ error: 'Confirmed booking not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: toAppBooking(booking, new Date()) }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return NextResponse.json({ error: 'Could not load your booking. Please try again.' }, { status: 503 });
    }
  });
}