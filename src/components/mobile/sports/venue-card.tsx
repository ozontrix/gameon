'use client';

/**
 * One bookable card on the Sports tab — the web twin of the app
 * `components/sports/venue-card.tsx`.
 *
 * The photo is the sport's own, the badges are the backend's, and the price is
 * `from ₹X / 1 Hour` because a card can sell more than one slot length.
 */

import Link from 'next/link';

import { price } from '@/lib/mobile/constants/config';
import { durationLabel } from '@/lib/mobile/constants/slots';
import type { Venue } from '@/lib/mobile/constants/sports';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Badge, Ion, RemoteImage, SportPill } from '../ui';

export function VenueCard({ venue }: { venue: Venue }) {
  const shortest = venue.slotOptions[0]?.durationMinutes ?? 60;

  return (
    <Link
      href={`/app/sport/${venue.key}`}
      aria-label={`${venue.title}. ${venue.courtsAvailable} courts, from ${price(venue.priceFrom)}.`}
      style={{ display: 'block', textDecoration: 'none' }}>
      <div
        style={{
          backgroundColor: Brand.card,
          border: `1px solid ${Brand.cardBorder}`,
          borderRadius: Radius.lg,
          overflow: 'hidden',
        }}>
        <RemoteImage uri={venue.image} style={{ width: '100%', height: 148 }} accessibilityLabel={venue.title} />

        <div style={{ padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' }}>
            <SportPill sport={venue.sport} />
            {venue.badges.map((badge) => (
              <Badge key={badge} label={badge} tone="neutral" solid={false} />
            ))}
          </div>

          <span style={{ ...Typography.cardTitle, color: Brand.text }}>{venue.title}</span>

          <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>
            {venue.type} · {venue.location}
          </span>

          <span style={{ ...Typography.caption, color: Brand.textMuted }}>
            {venue.courtsAvailable} {venue.courtsAvailable === 1 ? 'court' : 'courts'} available
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: Spacing.sm,
              paddingTop: Spacing.sm,
              borderTop: `1px solid ${Brand.divider}`,
            }}>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: Spacing.xs }}>
              {venue.slotOptions.length > 1 ? (
                <span style={{ ...Typography.caption, color: Brand.textMuted }}>from</span>
              ) : null}
              <span style={{ ...Typography.priceSmall, color: Brand.accent }}>
                {price(venue.priceFrom)}
              </span>
              <span style={{ ...Typography.caption, color: Brand.textMuted }}>
                / {durationLabel(shortest)}
              </span>
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: Spacing.xs }}>
              <span style={{ ...Typography.label, color: Brand.accent }}>Book</span>
              <Ion name="arrowForward" size={14} color={Brand.accent} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
