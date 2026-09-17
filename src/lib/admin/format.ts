import { DEFAULT_TIMEZONE, wallClockIn } from '@/lib/utils/date-helpers';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/** 1500 → "₹1,500" */
export function formatMoney(amount: number | string | null | undefined): string {
  return inr.format(Number(amount ?? 0));
}

function utcDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** "2026-09-17" → "Thu, 17 Sep 2026" (a venue-local DATE, never shifted by timezone). */
export function formatDate(date: string | null | undefined, options?: { weekday?: boolean; year?: boolean }): string {
  if (!date) return '—';
  return utcDate(date).toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    weekday: options?.weekday === false ? undefined : 'short',
    day: 'numeric',
    month: 'short',
    year: options?.year === false ? undefined : 'numeric',
  });
}

/** "18:30:00" → "6:30 PM" */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '—';
  const [h, m] = time.split(':');
  const hour = Number(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function formatTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** An instant (timestamptz) shown on the venue's clock: "17 Sep 2026, 6:05 PM". */
export function formatDateTime(iso: string | null | undefined, timeZone: string = DEFAULT_TIMEZONE): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Today's date on the venue's clock, `YYYY-MM-DD`. */
export function todayIn(timeZone: string = DEFAULT_TIMEZONE): string {
  return wallClockIn(timeZone).date;
}

/** `YYYY-MM-DD` shifted by whole days. */
export function addDays(date: string, days: number): string {
  const d = utcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** First 8 characters of a booking UUID, as customers see it in the app: "#3F2B8C1E". */
export function shortBookingId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

/** Title-cases a stored key such as "synthetic" or "COMPLIMENTARY". */
export function titleCase(value: string | null | undefined): string {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}
