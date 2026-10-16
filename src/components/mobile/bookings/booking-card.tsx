'use client';

/**
 * One booking, as the My Bookings list and the Home rail show it — the web twin
 * of the app `components/bookings/booking-card.tsx`.
 *
 * The whole card is the target and opens the booking detail, where the check-in
 * QR lives: a player looking at a booking almost always wants either the QR or
 * the venue's address, and both are on that screen.
 */

import Link from 'next/link';

import type { Booking } from '@/lib/mobile/constants/bookings';
import type { SportKind } from '@/lib/mobile/constants/sports';
import { price } from '@/lib/mobile/constants/config';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Badge, Ion, RemoteImage, SportPill, type BadgeTone } from '../ui';

/** The status flag's tone, and the wording the mockups use. */
const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  upcoming: { label: 'UPCOMING', tone: 'success' },
  ongoing: { label: 'ONGOING', tone: 'accent' },
  past: { label: 'COMPLETED', tone: 'neutral' },
};

export function BookingCard({ booking }: { booking: Booking }) {
  const status = STATUS[booking.status] ?? STATUS.past;

  return (
    <Link
      href={`/app/booking/${booking.key}`}
      aria-label={`${booking.detailTitle}, ${booking.date}, ${booking.time}. ${status.label}.`}
      style={{ display: 'block', textDecoration: 'none' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: Brand.card,
          border: `1px solid ${Brand.cardBorder}`,
          borderRadius: Radius.lg,
          overflow: 'hidden',
        }}>
        <div style={{ display: 'flex', gap: Spacing.md, padding: Spacing.md }}>
          <RemoteImage uri={booking.image} radius={Radius.md} style={{ width: 74, height: 74, flexShrink: 0 }} />

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
              <SportPill sport={booking.sport as SportKind} iconOnly />
              <Badge label={status.label} tone={status.tone} upper />
            </div>

            <span
              style={{
                ...Typography.cardTitle,
                color: Brand.text,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
              {booking.detailTitle}
            </span>

            <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>
              {booking.date} · {booking.time}
            </span>
            <span
              style={{
                ...Typography.caption,
                color: Brand.textMuted,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
              {booking.location || booking.venue}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: Spacing.xs }}>
            <span style={{ ...Typography.priceSmall, color: Brand.accent }}>{price(booking.paid)}</span>
            <span style={{ ...Typography.caption, color: Brand.textMuted }}>{booking.bookingId}</span>
          </div>
        </div>

        {booking.tags.length ? (
          <div
            style={{
              display: 'flex',
              gap: Spacing.sm,
              flexWrap: 'wrap',
              paddingLeft: Spacing.md,
              paddingRight: Spacing.md,
              paddingBottom: Spacing.md,
            }}>
            {booking.tags.map((tag) => (
              <Badge key={tag} label={tag} tone="neutral" solid={false} />
            ))}
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: Spacing.sm,
            paddingLeft: Spacing.md,
            paddingRight: Spacing.md,
            paddingTop: Spacing.sm,
            paddingBottom: Spacing.sm,
            borderTop: `1px solid ${Brand.divider}`,
            backgroundColor: Brand.highlightWash,
          }}>
          <span style={{ ...Typography.caption, color: Brand.textSecondary }}>
            {booking.status === 'ongoing' ? 'Show this QR at the desk' : `Booked ${booking.bookedOn}`}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: Spacing.xs }}>
            <span style={{ ...Typography.label, color: Brand.accent }}>
              {booking.status === 'past' ? 'View invoice' : 'View details'}
            </span>
            <Ion name="chevronForward" size={14} color={Brand.accent} />
          </span>
        </div>
      </div>
    </Link>
  );
}
