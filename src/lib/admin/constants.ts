export const PAGE_SIZE = 25;

export const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED'] as const;
export const PAYMENT_STATUSES = ['UNPAID', 'PAID', 'REFUNDED'] as const;
export const BOOKING_SOURCES = ['APP', 'ADMIN'] as const;

/** Ways a booking made at the front desk can be settled. RAZORPAY is app-only. */
export const COUNTER_PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'COMPLIMENTARY'] as const;
export type CounterPaymentMethod = (typeof COUNTER_PAYMENT_METHODS)[number];

export const SURFACE_TYPES = ['synthetic', 'wooden', 'turf', 'acrylic', 'concrete', 'clay'] as const;

export const SLOT_DURATIONS = [30, 45, 60, 90, 120] as const;

export const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Kathmandu',
  'Asia/Dhaka',
  'Europe/London',
  'UTC',
] as const;

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const TEAM_ROLES = ['ADMIN', 'STAFF'] as const;

/** India, for turning a 10-digit number typed at the desk into E.164. */
export const DEFAULT_COUNTRY_CODE = '91';
