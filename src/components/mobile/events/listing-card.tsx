'use client';

/**
 * One event or tournament on the Events tab — the web twin of the app
 * `components/events/event-card.tsx`.
 *
 * Events and tournaments share a card because they share a shape: a photo, what
 * it is, when it runs, where, what it costs and how many places are left. The
 * `kind` only decides which detail screen the card opens.
 */

import Link from 'next/link';

import { formatDateRange, rupees } from '@/lib/mobile/format';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Badge, RemoteImage, type BadgeTone } from '../ui';

/** The fields `toPublicEvent` and `toPublicTournament` both return. */
export type Listing = {
  id: string;
  title: string;
  category?: string | null;
  description?: string | null;
  sport?: string | null;
  venue?: string | null;
  address?: string | null;
  capacity?: number | null;
  taken?: number | null;
  entryFee?: number | null;
  feeUnit?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
  dailyStartTime?: string | null;
  dailyEndTime?: string | null;
  registrationClosesAt?: string | null;
  status?: string | null;
  format?: string | null;
  images?: string[];
};

export function ListingCard({
  listing,
  kind,
}: {
  listing: Listing;
  kind: 'event' | 'tournament';
}) {
  const capacity = listing.capacity ?? 0;
  const taken = listing.taken ?? 0;
  const spotsLeft = Math.max(0, capacity - taken);
  const full = capacity > 0 && spotsLeft === 0;
  const closed = listing.status === 'registration_closed';

  // One flag, in priority order: full beats closed beats a spot count.
  let flag: { label: string; tone: BadgeTone } | null = null;
  if (full) flag = { label: 'Full', tone: 'danger' };
  else if (closed) flag = { label: 'Registration closed', tone: 'warning' };
  else if (spotsLeft > 0) flag = { label: `${spotsLeft} spots left`, tone: 'success' };

  const href = kind === 'event' ? `/app/event/${listing.id}` : `/app/tournament/${listing.id}`;

  return (
    <Link href={href} style={{ display: 'block', textDecoration: 'none' }}>
      <div
        style={{
          backgroundColor: Brand.card,
          border: `1px solid ${Brand.cardBorder}`,
          borderRadius: Radius.lg,
          overflow: 'hidden',
        }}>
        {listing.images?.length ? (
          <RemoteImage uri={listing.images[0]} style={{ width: '100%', height: 150 }} accessibilityLabel={listing.title} />
        ) : null}

        <div style={{ padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' }}>
            {listing.category ? <Badge label={listing.category} tone="accent" /> : null}
            {flag ? <Badge label={flag.label} tone={flag.tone} /> : null}
          </div>

          <span style={{ ...Typography.cardTitle, color: Brand.text }}>{listing.title}</span>

          <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>
            {formatDateRange(listing.startsOn ?? null, listing.endsOn ?? null)}
            {listing.venue ? ` · ${listing.venue}` : ''}
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: Spacing.md,
              paddingTop: Spacing.sm,
              borderTop: `1px solid ${Brand.divider}`,
            }}>
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ ...Typography.priceSmall, color: Brand.accent }}>
                {rupees(listing.entryFee ?? 0)}
              </span>
              <span style={{ ...Typography.micro, color: Brand.textMuted }}>
                {(listing.feeUnit ?? 'entry').toUpperCase()}
              </span>
            </span>

            <span style={{ ...Typography.caption, color: Brand.textMuted, textAlign: 'right' }}>
              {closed
                ? 'Registration closed'
                : `Closes ${formatDateRange(listing.registrationClosesAt ?? null, null)}`}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
