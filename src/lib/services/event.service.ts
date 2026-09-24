import { supabaseAdmin } from '../db/supabase';
import { sportKeyFor } from '../utils/sport-key';

/** How long an order holds its tickets before someone else may take them. */
const HOLD_MINUTES = 10;

export class EventError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'EventError';
  }
}

export type NewEventOrder = {
  eventId: string;
  tickets: number;
  attendeeName: string;
  contactPhone: string;
  contactEmail?: string;
  notes?: string;
};

/** The capacity trigger's own message, raised with SQLSTATE P0001. */
function isCapacityError(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === 'P0001';
}

export type PaidEventOutcome = 'confirmed' | 'tickets-lost';

const PUBLIC_SELECT = `
  id, title, category, description, format,
  starts_on, ends_on, daily_start_time, daily_end_time, registration_closes_at,
  entry_fee, fee_unit, ticket_capacity, max_tickets_per_order, status,
  venues ( name, address ),
  sports ( name ),
  event_images ( url, sort_order ),
  event_sections ( id, title, body, sort_order )
`;

type EventRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  format: string | null;
  starts_on: string;
  ends_on: string;
  daily_start_time: string;
  daily_end_time: string;
  registration_closes_at: string;
  entry_fee: number | null;
  fee_unit: string;
  ticket_capacity: number;
  max_tickets_per_order: number;
  status: string;
  venues: { name: string; address: string | null } | null;
  sports: { name: string } | null;
  event_images: { url: string; sort_order: number }[];
  event_sections: { id: string; title: string; body: string; sort_order: number }[];
};

function toPublicEvent(row: EventRow, taken: number) {
  const images = [...row.event_images].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.url);
  const sections = [...row.event_sections]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ id, title, body }) => ({ key: id, title, body }));

  return {
    id: row.id,
    kind: 'event' as const,
    title: row.title,
    category: row.category,
    description: row.description,
    format: row.format,
    sport: sportKeyFor(row.sports?.name),
    venue: row.venues?.name ?? '',
    address: row.venues?.address ?? null,
    capacity: row.ticket_capacity,
    taken,
    entryFee: row.entry_fee,
    feeUnit: row.fee_unit,
    maxTicketsPerOrder: row.max_tickets_per_order,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    dailyStartTime: row.daily_start_time,
    dailyEndTime: row.daily_end_time,
    registrationClosesAt: row.registration_closes_at,
    status: row.status,
    images,
    sections,
  };
}

export class EventService {
  /** Published and registration-closed events — what the app's rail lists. */
  static async listPublic() {
    const { data, error } = await supabaseAdmin
      .from('events')
      .select(PUBLIC_SELECT)
      .in('status', ['published', 'registration_closed'])
      .order('starts_on');
    if (error) throw error;

    const takenByEvent = await EventService.takenCounts(data.map((row) => row.id));
    return data.map((row) => toPublicEvent(row as EventRow, takenByEvent.get(row.id) ?? 0));
  }

  /** One event by id. Any status resolves, so an old link never 404s outright. */
  static async getPublic(id: string) {
    const { data, error } = await supabaseAdmin.from('events').select(PUBLIC_SELECT).eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const takenByEvent = await EventService.takenCounts([id]);
    return toPublicEvent(data as EventRow, takenByEvent.get(id) ?? 0);
  }

  /** Tickets reserved (paid or on hold) per event, in one query. */
  private static async takenCounts(eventIds: string[]): Promise<Map<string, number>> {
    if (eventIds.length === 0) return new Map();
    const { data, error } = await supabaseAdmin
      .from('event_orders')
      .select('event_id, tickets')
      .in('event_id', eventIds)
      .in('status', ['PENDING', 'CONFIRMED']);
    if (error) throw error;

    const counts = new Map<string, number>();
    for (const row of data) counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + row.tickets);
    return counts;
  }

  /**
   * Creates a PENDING order that holds `tickets` places for
   * {@link HOLD_MINUTES}. The price is always `entry_fee * tickets` — never
   * taken from the client. Capacity and the per-order ticket cap are enforced
   * by the database (see the migration).
   */
  static async buyTickets(userId: string, input: NewEventOrder) {
    const { eventId, tickets } = input;
    if (!Number.isInteger(tickets) || tickets < 1) {
      throw new EventError('Choose at least one ticket.', 400);
    }

    const { data: event, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('status, entry_fee, registration_closes_at, max_tickets_per_order')
      .eq('id', eventId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!event) throw new EventError('Event not found', 404);

    if (event.status !== 'published') {
      throw new EventError('Ticket sales are not open for this event.', 400);
    }
    if (event.registration_closes_at < new Date().toISOString()) {
      throw new EventError('Ticket sales have closed for this event.', 400);
    }
    if (tickets > event.max_tickets_per_order) {
      throw new EventError(`This event allows up to ${event.max_tickets_per_order} tickets per order.`, 400);
    }

    await EventService.releaseLapsedHolds(eventId);

    const amount = Number(event.entry_fee ?? 0) * tickets;
    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString();
    const { data: order, error } = await supabaseAdmin
      .from('event_orders')
      .insert({
        event_id: eventId,
        user_id: userId,
        tickets,
        attendee_name: input.attendeeName,
        contact_phone: input.contactPhone,
        contact_email: input.contactEmail || null,
        notes: input.notes || null,
        amount_paid: amount,
        status: 'PENDING',
        payment_status: 'UNPAID',
        expires_at: expiresAt,
      })
      .select('id, amount_paid, expires_at')
      .single();

    if (error) {
      if (isCapacityError(error)) {
        throw new EventError(error.message, 409);
      }
      throw new Error('Failed to create order: ' + error.message);
    }

    return order;
  }

  /** Cancels any PENDING order past its hold, event-wide. */
  private static async releaseLapsedHolds(eventId: string) {
    await supabaseAdmin
      .from('event_orders')
      .update({ status: 'CANCELLED' })
      .eq('event_id', eventId)
      .eq('status', 'PENDING')
      .lt('expires_at', new Date().toISOString());
  }

  /**
   * Confirms the order a paid Razorpay order belongs to. Safe to call more
   * than once for the same order.
   */
  static async confirmPaidOrder(orderId: string, paymentId: string): Promise<{ orderId: string; outcome: PaidEventOutcome }> {
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('event_orders')
      .select('id, status')
      .eq('razorpay_order_id', orderId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!order) throw new EventError('No order found for this payment.', 404);

    if (order.status === 'CONFIRMED') {
      return { orderId: order.id, outcome: 'confirmed' };
    }

    const paid = {
      payment_status: 'PAID' as const,
      razorpay_payment_id: paymentId,
      paid_at: new Date().toISOString(),
      expires_at: null,
    };

    const { data: confirmed, error } = await supabaseAdmin
      .from('event_orders')
      .update({ ...paid, status: 'CONFIRMED' })
      .eq('id', order.id)
      .in('status', ['PENDING', 'CANCELLED'])
      .select('id')
      .maybeSingle();

    if (confirmed) {
      return { orderId: order.id, outcome: 'confirmed' };
    }

    if (isCapacityError(error)) {
      const { error: recordError } = await supabaseAdmin
        .from('event_orders')
        .update({ ...paid, status: 'CANCELLED' })
        .eq('id', order.id);
      if (recordError) throw recordError;

      console.error(
        `[payments] Paid order ${order.id} lost its tickets (order ${orderId}, payment ${paymentId}) — refund needed.`
      );
      return { orderId: order.id, outcome: 'tickets-lost' };
    }

    if (error) throw error;

    const { data: latest } = await supabaseAdmin
      .from('event_orders')
      .select('status')
      .eq('id', order.id)
      .single();

    if (latest?.status === 'CONFIRMED') {
      return { orderId: order.id, outcome: 'confirmed' };
    }
    throw new Error(`Could not confirm order ${order.id} for payment order ${orderId}`);
  }
}
