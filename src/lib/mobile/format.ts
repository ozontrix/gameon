/**
 * Display formatting for the app screens.
 *
 * Dates come back from the API as plain `YYYY-MM-DD` strings and money as
 * numbers. Both are formatted here rather than in each screen, so a booking
 * card and an event card can never disagree about how a rupee is written.
 *
 * Dates are built with `Date.UTC` so the day shown is the day the venue means,
 * not the day the viewer's timezone happens to shift it to.
 */

/** ₹1,200 — no decimals, because every GameOn price is a whole rupee. */
export function rupees(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) return 'Free';
  const value = Math.round(Number(amount));
  return value === 0 ? 'Free' : `₹${value.toLocaleString('en-IN')}`;
}

/** `2026-09-17` → `17 Sep 2026`. */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return date;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** `17 Sep` — for a card where the year is obvious from context. */
export function formatDayMonth(date: string | null | undefined): string {
  if (!date) return '—';
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return date;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** `17 Sep 2026 – 19 Sep 2026`, or one date when the run is a single day. */
export function formatDateRange(from: string | null, to: string | null): string {
  if (!from) return '—';
  if (!to || from.slice(0, 10) === to.slice(0, 10)) return formatDate(from);
  return `${formatDate(from)} – ${formatDate(to)}`;
}

/** `06:00:00` → `6:00 AM`. */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  const [rawHour, minute = '00'] = time.split(':');
  const hour = Number(rawHour);
  if (!Number.isFinite(hour)) return time;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
}
