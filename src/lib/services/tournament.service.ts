import { supabaseAdmin } from '../db/supabase';
import { sportKeyFor } from '../utils/sport-key';
import { assertCapturedPayment, PaymentValidationError } from './payment-validation';

/** How long a registration holds its team slot before someone else may take it. */
const HOLD_MINUTES = 10;

/** A failure the API can report as-is, with the HTTP status that fits it. */
export class TournamentError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'TournamentError';
  }
}

export type NewTournamentRegistration = {
  tournamentId: string;
  teamName: string;
  captainName: string;
  contactPhone: string;
  contactEmail?: string;
  notes?: string;
};

/** Unique (23505) violation: this player already holds an active entry. */
function isDuplicateEntry(code: string | undefined): boolean {
  return code === '23505';
}

/** The capacity trigger's own message, raised with SQLSTATE P0001. */
function isCapacityError(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === 'P0001';
}

export type PaidTournamentOutcome = 'confirmed' | 'slot-lost';

const PUBLIC_SELECT = `
  id, title, match_type, description, format, team_size_label, team_capacity, entry_fee,
  starts_on, ends_on, daily_start_time, daily_end_time, registration_closes_at, status,
  venues ( name, address ),
  court_types ( name, surface_type, is_indoor, has_ac, sports ( name ) ),
  tournament_images ( url, sort_order ),
  tournament_sections ( id, title, body, sort_order )
`;

type TournamentRow = {
  id: string;
  title: string;
  match_type: string;
  description: string | null;
  format: string | null;
  team_size_label: string | null;
  team_capacity: number;
  entry_fee: number;
  starts_on: string;
  ends_on: string;
  daily_start_time: string;
  daily_end_time: string;
  registration_closes_at: string;
  status: string;
  venues: { name: string; address: string | null } | null;
  court_types: {
    name: string;
    surface_type: string;
    is_indoor: boolean;
    has_ac: boolean;
    sports: { name: string } | null;
  } | null;
  tournament_images: { url: string; sort_order: number }[];
  tournament_sections: { id: string; title: string; body: string; sort_order: number }[];
};

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

/** Shapes one row for the app: what the listing card and the detail screen both need. */
function toPublicTournament(row: TournamentRow, taken: number) {
  const images = [...row.tournament_images].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.url);
  const sections = [...row.tournament_sections]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ id, title, body }) => ({ key: id, title, body }));

  // Same shape the Sports tab's own cards use for their court type, so a
  // tournament's court reads exactly like the card it was picked from.
  const courtType = row.court_types;
  const setting = courtType ? (courtType.is_indoor ? 'Indoor' : 'Outdoor') : null;
  const climate = courtType ? (courtType.has_ac ? 'AC' : 'Non-AC') : null;
  const surface = courtType ? capitalize(courtType.surface_type) : null;

  return {
    id: row.id,
    kind: 'tournament' as const,
    title: row.title,
    category: row.match_type,
    description: row.description,
    format: row.format,
    teamSize: row.team_size_label,
    courtTypeLabel: courtType?.name ?? null,
    courtTypeSummary: setting && surface && climate ? `${setting} • ${surface} • ${climate}` : null,
    courtTypeBadges: setting && climate ? [setting, climate] : [],
    sport: sportKeyFor(courtType?.sports?.name),
    venue: row.venues?.name ?? '',
    address: row.venues?.address ?? null,
    capacity: row.team_capacity,
    taken,
    entryFee: row.entry_fee,
    feeUnit: 'per team',
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

export class TournamentService {
  /** Published and registration-closed tournaments — what the app's rail lists. */
  static async listPublic() {
    const { data, error } = await supabaseAdmin
      .from('tournaments')
      .select(PUBLIC_SELECT)
      .in('status', ['published', 'registration_closed'])
      .order('starts_on');
    if (error) throw error;

    const takenByTournament = await TournamentService.takenCounts(data.map((row) => row.id));
    return data.map((row) => toPublicTournament(row as TournamentRow, takenByTournament.get(row.id) ?? 0));
  }

  /** Published history may resolve, but private drafts must not leak. */
  static async getPublic(id: string) {
    const { data, error } = await supabaseAdmin.from('tournaments').select(PUBLIC_SELECT).eq('id', id).neq('status', 'draft').maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const takenByTournament = await TournamentService.takenCounts([id]);
    return toPublicTournament(data as TournamentRow, takenByTournament.get(id) ?? 0);
  }

  /** Team slots reserved (paid or on hold) per tournament, in one query. */
  private static async takenCounts(tournamentIds: string[]): Promise<Map<string, number>> {
    if (tournamentIds.length === 0) return new Map();
    const { data, error } = await supabaseAdmin
      .from('tournament_registrations')
      .select('tournament_id')
      .in('tournament_id', tournamentIds)
      .in('status', ['PENDING', 'CONFIRMED'])
      .or(`status.eq.CONFIRMED,and(status.eq.PENDING,expires_at.gt.${new Date().toISOString()})`);
    if (error) throw error;

    const counts = new Map<string, number>();
    for (const row of data) counts.set(row.tournament_id, (counts.get(row.tournament_id) ?? 0) + 1);
    return counts;
  }

  /**
   * Creates a PENDING registration that holds a team slot for
   * {@link HOLD_MINUTES}. The price is always the tournament's own entry fee —
   * never taken from the client. Capacity and "one active entry per player"
   * are enforced by the database (see the migration), not just here.
   */
  static async register(userId: string, input: NewTournamentRegistration) {
    const { tournamentId } = input;

    const { data: tournament, error: fetchError } = await supabaseAdmin
      .from('tournaments')
      .select('status, entry_fee, registration_closes_at')
      .eq('id', tournamentId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!tournament) throw new TournamentError('Tournament not found', 404);

    if (tournament.status !== 'published') {
      throw new TournamentError('Registration is not open for this tournament.', 400);
    }
    if (tournament.registration_closes_at < new Date().toISOString()) {
      throw new TournamentError('Registration has closed for this tournament.', 400);
    }

    // A lapsed hold anywhere in this tournament frees a team slot for everyone,
    // not just the caller — the same idea as a lapsed booking hold.
    await TournamentService.releaseLapsedHolds(tournamentId);

    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString();
    const { data: registration, error } = await supabaseAdmin
      .from('tournament_registrations')
      .insert({
        tournament_id: tournamentId,
        user_id: userId,
        team_name: input.teamName,
        captain_name: input.captainName,
        contact_phone: input.contactPhone,
        contact_email: input.contactEmail || null,
        notes: input.notes || null,
        amount_paid: tournament.entry_fee,
        status: 'PENDING',
        payment_status: 'UNPAID',
        expires_at: expiresAt,
      })
      .select('id, amount_paid, expires_at')
      .single();

    if (error) {
      if (isDuplicateEntry(error.code)) {
        throw new TournamentError('You already have an entry for this tournament.', 409);
      }
      if (isCapacityError(error)) {
        throw new TournamentError(error.message, 409);
      }
      throw new Error('Failed to create registration: ' + error.message);
    }

    return registration;
  }

  /** Cancels any PENDING registration past its hold, tournament-wide. */
  private static async releaseLapsedHolds(tournamentId: string) {
    const { error } = await supabaseAdmin
      .from('tournament_registrations')
      .update({ status: 'CANCELLED' })
      .eq('tournament_id', tournamentId)
      .eq('status', 'PENDING')
      .lt('expires_at', new Date().toISOString());
    if (error) throw error;
  }

  /**
   * Confirms the registration a paid Razorpay order belongs to. Safe to call
   * more than once for the same order.
   */
  static async confirmPaidOrder(orderId: string, paymentId: string): Promise<{ registrationId: string; outcome: PaidTournamentOutcome }> {
    const { data: registration, error: fetchError } = await supabaseAdmin
      .from('tournament_registrations')
      .select('id, status, amount_paid, payment_status, razorpay_payment_id')
      .eq('razorpay_order_id', orderId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!registration) throw new TournamentError('No registration found for this payment order.', 404);

    try {
      await assertCapturedPayment(orderId, paymentId, Math.round(Number(registration.amount_paid) * 100), registration.razorpay_payment_id);
    } catch (error) {
      if (error instanceof PaymentValidationError) throw new TournamentError(error.message, error.status);
      throw error;
    }

    if (registration.status === 'CONFIRMED') {
      return { registrationId: registration.id, outcome: 'confirmed' };
    }
    if (registration.status === 'CANCELLED' && registration.payment_status === 'PAID') {
      return { registrationId: registration.id, outcome: 'slot-lost' };
    }

    const paid = {
      payment_status: 'PAID' as const,
      razorpay_payment_id: paymentId,
      paid_at: new Date().toISOString(),
      expires_at: null,
    };

    // PENDING, or CANCELLED because the hold lapsed before the payment landed
    const { data: confirmed, error } = await supabaseAdmin
      .from('tournament_registrations')
      .update({ ...paid, status: 'CONFIRMED' })
      .eq('id', registration.id)
      .eq('payment_status', 'UNPAID')
      .is('razorpay_payment_id', null)
      .in('status', ['PENDING', 'CANCELLED'])
      .select('id')
      .maybeSingle();

    if (confirmed) {
      return { registrationId: registration.id, outcome: 'confirmed' };
    }

    if (isCapacityError(error)) {
      // The team slot went to someone else before the payment landed. Keep the
      // payment on record for a manual refund, same as a lost booking slot.
      const { error: recordError } = await supabaseAdmin
        .from('tournament_registrations')
        .update({ ...paid, status: 'CANCELLED' })
        .eq('id', registration.id)
        .eq('payment_status', 'UNPAID')
        .is('razorpay_payment_id', null);
      if (recordError) throw recordError;

      console.error(
        `[payments] Paid registration ${registration.id} lost its team slot (order ${orderId}, payment ${paymentId}) — refund needed.`
      );
      return { registrationId: registration.id, outcome: 'slot-lost' };
    }

    if (error) throw error;

    const { data: latest, error: latestError } = await supabaseAdmin
      .from('tournament_registrations')
      .select('status, razorpay_payment_id, payment_status')
      .eq('id', registration.id)
      .single();

    if (latestError) throw latestError;
    if (latest?.razorpay_payment_id !== paymentId) throw new TournamentError('A different payment is already recorded.', 409);
    if (latest?.status === 'CONFIRMED' && latest.payment_status === 'PAID') {
      return { registrationId: registration.id, outcome: 'confirmed' };
    }
    throw new Error(`Could not confirm registration ${registration.id} for order ${orderId}`);
  }
}
