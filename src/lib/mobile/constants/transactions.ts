/**
 * Shared presentation for the Points ledger and the unified account history — the
 * web twin of the handset app's `constants/transactions.ts`.
 *
 * Two endpoints feed these rows and their shapes are kept apart:
 * `/user/wallet/transactions` is the *Points* ledger (`wallet_transactions`), while
 * `/user/transactions` is the account history, which mixes gateway payments with
 * Points movements. Both are mapped onto one row type so the two screens render
 * them identically.
 */

export type TxnCategory = 'booking' | 'event' | 'tournament' | 'refund' | 'earned' | 'wallet';

/** The values `wallet_transactions.reason` is constrained to. */
export type WalletReason =
  | 'refund_credit'
  | 'refund_credit_release'
  | 'booking_redeem'
  | 'booking_redeem_release'
  | 'admin_adjustment'
  | 'referral_signup'
  | 'referral_bonus';

/** One ledger row exactly as `GET /user/wallet/transactions` returns it. */
export type WalletLedgerEntry = {
  id: string;
  points: number;
  balanceAfter: number;
  reason: WalletReason;
  bookingId: string | null;
  createdAt: string;
};

/** One row as the UI renders it. */
export type AccountTransaction = {
  id: string;
  category: TxnCategory;
  /** e.g. "12 May, 2025" */
  date: string;
  /** e.g. "08:45 PM" */
  time: string;
  title: string;
  subtitle: string;
  /** e.g. "BK49231", or "–" when the entry is not tied to a booking. */
  bookingId: string;
  /** Positive = credited, negative = debited. */
  points: number;
  /** e.g. "Redeemed", "Credited", "Earned", "Adjusted" */
  status: string;
  /** Payment amount in rupees. Absent for a Points ledger row. */
  amount?: number | null;
  currency?: string | null;
  paymentReference?: string | null;
  pointsUsed?: number;
};

/** `GET /user/transactions`: gateway payments and Points are separate units. */
export type AccountHistoryEntry = {
  id: string;
  category: TxnCategory;
  createdAt: string;
  title: string;
  subtitle: string;
  bookingId: string | null;
  amount: number | null;
  currency: string | null;
  points: number;
  reason: WalletReason | null;
  status: string;
  paymentReference: string | null;
  pointsUsed: number;
};

/**
 * Which category each reason falls into, and the wording both lists render.
 *
 * `wallet_transactions` is a *Points* ledger: a booking paid by card never appears
 * here, only the Points that moved. So the categories cover refunds (Points
 * credited back), wallet usage (Points spent on a booking) and earned (bonuses and
 * team adjustments).
 */
const REASON_COPY: Record<
  WalletReason,
  { category: TxnCategory; title: string; status: string }
> = {
  booking_redeem: { category: 'wallet', title: 'Points redeemed on a booking', status: 'Redeemed' },
  booking_redeem_release: {
    category: 'wallet',
    title: 'Booking cancelled — Points returned',
    status: 'Returned',
  },
  refund_credit: { category: 'refund', title: 'Refund credited as Points', status: 'Credited' },
  refund_credit_release: { category: 'refund', title: 'Refund reversed', status: 'Reversed' },
  referral_signup: { category: 'earned', title: 'Referral sign-up bonus', status: 'Earned' },
  referral_bonus: { category: 'earned', title: 'Referral bonus', status: 'Earned' },
  admin_adjustment: { category: 'earned', title: 'Adjusted by the GameOn team', status: 'Adjusted' },
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/**
 * Splits an ISO timestamp into the two lines the lists show, in local time.
 * Formatted by hand rather than through `toLocale*` so a device locale can never
 * change the shape of a transaction row.
 */
export function formatLedgerStamp(iso: string): { date: string; time: string } {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return { date: '—', time: '' };

  const hours = at.getHours();
  const suffix = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const minutes = String(at.getMinutes()).padStart(2, '0');

  return {
    date: `${at.getDate()} ${MONTHS[at.getMonth()]}, ${at.getFullYear()}`,
    time: `${String(hour12).padStart(2, '0')}:${minutes} ${suffix}`,
  };
}

/** The short booking reference the rest of the app shows, e.g. `BK49231`. */
function shortBookingId(bookingId: string | null): string {
  return bookingId ? `BK${bookingId.replace(/-/g, '').slice(0, 5).toUpperCase()}` : '–';
}

/** Maps one API ledger row onto the row both lists render. */
export function toAccountTransaction(entry: WalletLedgerEntry): AccountTransaction {
  const copy = REASON_COPY[entry.reason] ?? {
    category: 'earned' as TxnCategory,
    title: 'Points activity',
    status: 'Updated',
  };
  const { date, time } = formatLedgerStamp(entry.createdAt);

  return {
    id: entry.id,
    category: copy.category,
    date,
    time,
    title: copy.title,
    subtitle:
      entry.reason === 'admin_adjustment'
        ? 'By the GameOn team'
        : entry.bookingId
          ? `Booking ${shortBookingId(entry.bookingId)}`
          : 'GameOn Wallet',
    bookingId: shortBookingId(entry.bookingId),
    points: entry.points,
    status: copy.status,
  };
}

/** Maps one `/user/transactions` row onto the same row type. */
export function toHistoryTransaction(entry: AccountHistoryEntry): AccountTransaction {
  if (entry.reason) {
    return toAccountTransaction({ ...entry, balanceAfter: 0, reason: entry.reason });
  }
  const prefix = entry.category === 'event' ? 'EV' : entry.category === 'tournament' ? 'TR' : 'BK';
  return {
    ...entry,
    ...formatLedgerStamp(entry.createdAt),
    bookingId: entry.bookingId
      ? `${prefix}${entry.bookingId.replace(/-/g, '').slice(0, 5).toUpperCase()}`
      : '–',
  };
}

export type TxnFilter = 'all' | TxnCategory;

/** Filters are applied by the server before pagination. */
export const TXN_FILTERS: { key: TxnFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'booking', label: 'Sports Bookings' },
  { key: 'event', label: 'Event Tickets' },
  { key: 'tournament', label: 'Tournaments' },
  { key: 'wallet', label: 'Wallet Usage' },
  { key: 'refund', label: 'Refunds' },
  { key: 'earned', label: 'Points Activity' },
];
