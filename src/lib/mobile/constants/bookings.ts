/**
 * Booking types and the cancellation policy, as the web app reads them.
 *
 * The app's `constants/bookings.ts` also carries hand-written fixture
 * bookings; those are deliberately not ported. Every booking in this build comes
 * from `GET /api/v1/user/bookings`, so the type below is the shape
 * `toAppBooking` produces on the server and nothing here invents data.
 */

import type { SportKind } from './sports';

export type { SportKind };

export type BookingStatus = 'upcoming' | 'ongoing' | 'past';

/** Invoice facts shown on the Booking Detail screen. */
export type BookingInvoice = {
  orderId: string;
  paymentMethod: string;
  amountPaid: number;
};

export type Booking = {
  key: string;
  sport: SportKind;
  status: BookingStatus;
  /** e.g. "GameOn Arena - Court 3" */
  venue: string;
  /** e.g. "GameOn Arena, Gurgaon" */
  location: string;
  /** e.g. "24 May 2024 (Fri)" */
  date: string;
  /** e.g. "6:00 AM – 7:00 AM" */
  time: string;
  /** e.g. ["Synthetic Floor", "Indoor", "AC"] */
  tags: string[];
  /** e.g. "#GO12456" */
  bookingId: string;
  /** Paid amount in INR */
  paid: number;
  image: string;
  // ── Booking Detail (Screen 12) ──
  /** Header title on the detail screen, e.g. "Badminton – Court 3". */
  detailTitle: string;
  /** e.g. "Booked on 18 May, 2024" */
  bookedOn: string;
  /** Allotted court or screen, e.g. "Court 3". */
  court: string;
  floor: string;
  setting: string;
  climate: string;
  players: number | null;
  /** e.g. "Regular Slot" or "Tournament Entry". */
  bookingType: string;
  /** Slot length, e.g. "1 Hour". */
  duration: string;
  /** Expiry line under the check-in QR, e.g. "24 May, 7:00 AM". */
  qrValidTill: string;
  invoice: BookingInvoice;
  /**
   * Hours remaining until the slot starts. Screen 12's written policy is
   * governed by "a time-based cutoff policy", so this is what decides which
   * refund slab applies. Negative once the slot has passed.
   */
  hoursUntilSlot: number;
};

/**
 * One refund tier, exactly as `GET /public/cancellation-policy` returns it.
 *
 * The tiers are admin-editable rows in `cancellation_policy_tiers`, so the app
 * must never hardcode the windows or the percentages — the server prices every
 * refund through `CancellationPolicyService.refundPercentFor`.
 */
export type CancellationTier = {
  id: string;
  appliesTo: 'booking' | 'tournament' | 'event';
  /** Largest notice period this tier covers, in hours. */
  minHoursBefore: number;
  refundPercent: number;
};

/**
 * The tier governing a booking `hoursUntilSlot` away — the first one (tiers come
 * back largest-notice-first) whose notice requirement is met. Mirrors the
 * server's own rule, including 0% when nothing is met.
 */
export function activeCancellationTier(
  tiers: CancellationTier[],
  hoursUntilSlot: number,
): CancellationTier | undefined {
  return tiers.find((tier) => hoursUntilSlot >= tier.minHoursBefore);
}

/** The colour a tier's refund deserves: full, partial, or nothing. */
export function cancellationTone(refundPercent: number): 'success' | 'warning' | 'danger' {
  if (refundPercent >= 100) return 'success';
  if (refundPercent > 0) return 'warning';
  return 'danger';
}

/** "100% refund" / "No refund" — the wording both the table and sheets use. */
export function refundLabel(refundPercent: number): string {
  return refundPercent > 0 ? `${refundPercent}% refund` : 'No refund';
}

/**
 * The human window for the tier at `index`, derived from the tier above it.
 * e.g. for 24 / 12 / 0 hours: "24+ hours before", "12–24 hours before",
 * "Under 12 hours before".
 */
export function cancellationWindowLabel(tiers: CancellationTier[], index: number): string {
  const tier = tiers[index];
  if (!tier) return '';

  const upper = tiers[index - 1]?.minHoursBefore;
  if (upper === undefined) return `${tier.minHoursBefore}+ hours before`;
  if (tier.minHoursBefore === 0) return `Under ${upper} hours before`;
  return `${tier.minHoursBefore}–${upper} hours before`;
}

/**
 * Footnote under the refund table, and the canonical policy wording — the same
 * sentence the handset app shows. A cancellation never returns money to the
 * original rail: the refund is credited to the wallet as GameOn Points, which is
 * why the Booking Detail screen refreshes the wallet as well as the bookings.
 */
export const REFUND_NOTE =
  'Refunds are credited as GameOn Points to your wallet — there are no direct refunds to your original payment method.';
