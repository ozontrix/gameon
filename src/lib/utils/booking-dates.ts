/** Public paid court sessions start after the free open play launch day. */
export const PUBLIC_PAID_BOOKING_START = '2026-10-19';
export function isPublicPaidBookingDate(date: string): boolean {
  return date >= PUBLIC_PAID_BOOKING_START;
}