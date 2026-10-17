export const CHECK_IN_MESSAGES = {
  checked_in: 'Booking verified',
  already_checked_in: 'Already checked in',
  invalid: 'Invalid QR code',
  not_found: 'Booking not found',
  cancelled: 'Booking cancelled',
  refunded: 'Booking refunded',
  expired: 'Booking expired',
  payment_pending: 'Payment not completed',
  not_confirmed: 'Booking not confirmed',
  wrong_date: 'Wrong booking date',
  too_early: 'Too early for this slot',
  too_late: 'Booking slot has ended',
  wrong_location: 'Wrong venue or court',
  unavailable: 'Venue or activity unavailable',
  rate_limited: 'Too many scans. Wait a moment and try again.',
  unauthorized: 'Session expired or access denied. Sign in again.',
  network_error: 'Unable to verify booking. Check internet connection and try scanning again.',
  server_error: 'Unable to verify booking. Please try scanning again.',
} as const;

export type CheckInStatus = keyof typeof CHECK_IN_MESSAGES;
export type VerifiedReservation = {
  bookingId: string;
  category: 'booking' | 'event' | 'tournament';
  userName: string;
  facilityName: string;
  sport: string | null;
  venueName: string;
  venueId: string;
  facilityId: string | null;
  date: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  timezone: string;
  scannedAt: string | null;
};
export type ScanResult = {
  success: boolean;
  status: CheckInStatus;
  message: string;
  booking?: VerifiedReservation;
};

export function scanFailure(status: CheckInStatus): ScanResult {
  return { success: false, status, message: CHECK_IN_MESSAGES[status] };
}