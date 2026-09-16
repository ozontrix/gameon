/** Venues without a timezone of their own are treated as being in India. */
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export function generateTimeSlots(openTime: string, closeTime: string, slotDurationMinutes: number) {
  const slots: { start_time: string; end_time: string }[] = [];

  // Parse times into minutes from midnight
  const [openHour, openMin] = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);

  let currentMinutes = openHour * 60 + openMin;
  const endMinutes = closeHour * 60 + closeMin;

  while (currentMinutes + slotDurationMinutes <= endMinutes) {
    const startHourStr = String(Math.floor(currentMinutes / 60)).padStart(2, '0');
    const startMinStr = String(currentMinutes % 60).padStart(2, '0');

    const nextMinutes = currentMinutes + slotDurationMinutes;
    const endHourStr = String(Math.floor(nextMinutes / 60)).padStart(2, '0');
    const endMinStr = String(nextMinutes % 60).padStart(2, '0');

    slots.push({
      start_time: `${startHourStr}:${startMinStr}:00`,
      end_time: `${endHourStr}:${endMinStr}:00`,
    });

    currentMinutes = nextMinutes;
  }

  return slots;
}

export function isTimeOverlap(
  slotStart: string,
  slotEnd: string,
  blockStart: string,
  blockEnd: string
): boolean {
  // Simple string comparison works for HH:MM:SS format
  // Overlap occurs if: slot starts before block ends AND slot ends after block starts
  return slotStart < blockEnd && slotEnd > blockStart;
}

/** Minutes between two `HH:MM[:SS]` times on the same day. */
export function minutesBetween(startTime: string, endTime: string): number {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  return toMinutes(endTime) - toMinutes(startTime);
}

/** Day of week (0 = Sunday) of a `YYYY-MM-DD` date, independent of the server's timezone. */
export function dayOfWeek(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * The wall-clock date and time in `timeZone` at `at`:
 * `{ date: 'YYYY-MM-DD', time: 'HH:MM:SS' }`.
 *
 * Bookings are stored as a venue-local DATE + TIME, so "today" and "now" have to
 * be read in the venue's timezone rather than the server's (UTC on Vercel).
 */
export function wallClockIn(timeZone: string = DEFAULT_TIMEZONE, at: Date = new Date()) {
  const parts: Record<string, string> = {};
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  for (const part of formatter.formatToParts(at)) parts[part.type] = part.value;

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

/** The instant a venue-local `date` + `time` in `timeZone` refers to. */
export function zonedTimeToUtc(date: string, time: string, timeZone: string = DEFAULT_TIMEZONE): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes, seconds = 0] = time.split(':').map(Number);
  const asIfUtc = Date.UTC(year, month - 1, day, hours, minutes, seconds);

  // How far the zone's clock is ahead of UTC at (roughly) that moment.
  const wall = wallClockIn(timeZone, new Date(asIfUtc));
  const [wYear, wMonth, wDay] = wall.date.split('-').map(Number);
  const [wHours, wMinutes, wSeconds] = wall.time.split(':').map(Number);
  const offset = Date.UTC(wYear, wMonth - 1, wDay, wHours, wMinutes, wSeconds) - asIfUtc;

  return new Date(asIfUtc - offset);
}
