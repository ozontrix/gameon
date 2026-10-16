/**
 * Canonical policy copy — the web twin of the handset app's `constants/policies.ts`.
 *
 * The written brief is the authority on policy and behaviour, so every screen that
 * states a policy reads it from here and the wording can never drift between
 * screens.
 */

/**
 * The full policy note. Refunds never return to the original payment method, which
 * is why the Booking Detail mockup's "credited to your original payment method
 * within 5-7 business days" is not reproduced anywhere in this build.
 */
export const REFUND_POLICY_NOTE =
  'All refunds within the GameOn app are credited as GameOn Points only — there are no direct monetary refunds to the original payment method. This keeps the refund flow consistent and drives repeat bookings through wallet usage.';

/** The short form, for the foot of the Booking Detail refund table. */
export const REFUND_DESTINATION_NOTE =
  'Refunds are credited as GameOn Points to your wallet — there are no direct refunds to your original payment method.';

/** What wallet Points can do at checkout. */
export const WALLET_CHECKOUT_NOTE =
  'You can use your GameOn Points at checkout to fully or partially pay for your booking.';

/** How rescheduling is governed. */
export const RESCHEDULE_NOTE =
  'Rescheduling is subject to slot availability at the new requested date and time.';

/** One expandable policy on the Policies screen. */
export type FacilityPolicyDetail = {
  key: string;
  title: string;
  /** One-line summary shown on the collapsed row. */
  summary: string;
  /** The clauses revealed when the row is opened. */
  clauses: string[];
};

/**
 * The Policies screen's content. §10 describes these as static informational pages
 * covering "the facility's terms of use, booking/cancellation policies, and privacy
 * policy", so each row opens to its clauses in place.
 */
export const FACILITY_POLICY_DETAILS: FacilityPolicyDetail[] = [
  {
    key: 'booking',
    title: 'Booking Policy',
    summary: 'Guidelines for booking and managing bookings on GameOn',
    clauses: [
      'Slots are booked by the hour and confirmed only once payment succeeds.',
      'Your check-in QR code is valid for the slot you booked and expires when it ends.',
      'Please arrive 10 minutes before your slot so play can start on time.',
      'The facility may reassign an equivalent court where maintenance is required.',
    ],
  },
  {
    key: 'cancellation',
    title: 'Cancellation Policy',
    summary: 'Rules for cancelling bookings and applicable charges',
    clauses: [
      'Cancel more than 24 hours before your slot for a 100% refund in GameOn Points.',
      'Cancel between 12 and 24 hours before your slot for a 50% refund in GameOn Points.',
      'Cancellations inside 12 hours of the slot are not refundable.',
      'A no-show is charged the full booking amount.',
    ],
  },
  {
    key: 'refund',
    title: 'Refund Policy',
    summary: 'Refunds are issued as GameOn Points only',
    clauses: [
      REFUND_POLICY_NOTE,
      'Points are credited to your GameOn Wallet as soon as the cancellation is confirmed.',
      'Points can be redeemed at checkout against any future slot booking.',
    ],
  },
  {
    key: 'payment',
    title: 'Payment Policy',
    summary: 'Accepted payment methods and transaction guidelines',
    clauses: [
      'Card, UPI, net banking and third-party wallets are accepted at checkout.',
      'GameOn Points may be applied to cover a booking in full or in part.',
      'Payments are processed by our gateway partner; GameOn never stores your card details.',
    ],
  },
  {
    key: 'conduct',
    title: 'Code of Conduct',
    summary: 'Expected behavior of all users on the GameOn platform',
    clauses: [
      'Treat staff, opponents and other players with respect at all times.',
      'Non-marking shoes are required on all indoor courts.',
      'Outside food and drink are not permitted inside the facility.',
      'GameOn may suspend an account for repeated breaches of this code.',
    ],
  },
];
