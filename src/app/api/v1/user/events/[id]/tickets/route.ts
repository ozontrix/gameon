import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middlewares/auth';
import { EventError, EventService } from '@/lib/services/event.service';

const buySchema = z.object({
  tickets: z.number().int().min(1).max(50),
  attendeeName: z.string().trim().min(2).max(120),
  contactPhone: z.string().trim().min(6).max(20),
  contactEmail: z.string().trim().email().max(200).optional().or(z.literal('')),
  notes: z.string().trim().max(600).optional(),
});

/** Holds `tickets` places on an event. The total is priced server-side. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const validation = buySchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid payload', details: validation.error.format() },
          { status: 400 }
        );
      }

      const order = await EventService.buyTickets(user.id, {
        eventId: id,
        tickets: validation.data.tickets,
        attendeeName: validation.data.attendeeName,
        contactPhone: validation.data.contactPhone,
        contactEmail: validation.data.contactEmail || undefined,
        notes: validation.data.notes,
      });

      return NextResponse.json({ success: true, orderId: order.id, amount: order.amount_paid }, { status: 201 });
    } catch (error) {
      if (error instanceof EventError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
      }
      console.error('Buy Event Tickets Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
