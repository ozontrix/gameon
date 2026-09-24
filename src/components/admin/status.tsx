import { titleCase } from '@/lib/admin/format';
import { Badge, type BadgeTone } from './ui';

const BOOKING_TONES: Record<string, BadgeTone> = {
  CONFIRMED: 'green',
  PENDING: 'amber',
  CANCELLED: 'neutral',
};

const PAYMENT_TONES: Record<string, BadgeTone> = {
  PAID: 'green',
  UNPAID: 'amber',
  REFUNDED: 'violet',
};

export function BookingStatusBadge({ status }: { status: string }) {
  return <Badge tone={BOOKING_TONES[status] ?? 'neutral'}>{titleCase(status)}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return <Badge tone={PAYMENT_TONES[status] ?? 'neutral'}>{titleCase(status)}</Badge>;
}

export function SourceBadge({ source }: { source: string }) {
  return <Badge tone={source === 'ADMIN' ? 'blue' : 'neutral'}>{source === 'ADMIN' ? 'Front desk' : 'App'}</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  return <Badge tone={role === 'ADMIN' ? 'violet' : 'blue'}>{titleCase(role)}</Badge>;
}

export function ActiveBadge({ active }: { active: boolean | null }) {
  return active === false ? <Badge tone="neutral">Inactive</Badge> : <Badge tone="green">Active</Badge>;
}

const EVENT_STATUS_TONES: Record<string, BadgeTone> = {
  draft: 'neutral',
  published: 'green',
  registration_closed: 'amber',
  completed: 'blue',
  cancelled: 'red',
};

/** A tournament's or event's own lifecycle — draft through cancelled. */
export function EventStatusBadge({ status }: { status: string }) {
  return <Badge tone={EVENT_STATUS_TONES[status] ?? 'neutral'}>{titleCase(status.replace('_', ' '))}</Badge>;
}

/** A booking cancelled after payment that has not been refunded yet. */
export function needsRefund(booking: { status: string; payment_status: string }) {
  return booking.status === 'CANCELLED' && booking.payment_status === 'PAID';
}
