/** Where a booking sits against the clock, as the app's My Bookings tabs group them. */
export type AppBookingStatus = 'upcoming' | 'ongoing' | 'past';

/** The status of a slot that runs `startsAt`–`endsAt`, judged at `now`. */
export function bookingStatusAt(startsAt: Date, endsAt: Date, now: Date): AppBookingStatus {
  if (now >= endsAt) return 'past';
  return now >= startsAt ? 'ongoing' : 'upcoming';
}
