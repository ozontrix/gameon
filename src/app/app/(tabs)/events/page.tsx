'use client';

/**
 * The Events tab.
 *
 * Two rails on one screen, the way the Expo app presents them: events and
 * tournaments are separate resources with separate capacities, but a player
 * looking for "what is on" wants to see both. Both reads are public, so a guest
 * gets the same list a member does.
 */

import { Screen, ScreenTitle } from '@/components/mobile/Screen';
import { Badge, Card, EmptyState, ErrorNote, Spinner } from '@/components/mobile/ui';
import { formatDateRange, rupees } from '@/lib/mobile/format';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { useApi } from '@/lib/mobile/use-api';

/** The fields both rails share — `toPublicEvent` and `toPublicTournament`. */
type Listing = {
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
  registrationClosesAt?: string | null;
  status?: string | null;
  images?: string[];
};

function ListingCard({ listing }: { listing: Listing }) {
  const capacity = listing.capacity ?? 0;
  const taken = listing.taken ?? 0;
  const spotsLeft = Math.max(0, capacity - taken);
  const full = capacity > 0 && spotsLeft === 0;
  const closed = listing.status === 'registration_closed';

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm, padding: 0, overflow: 'hidden' }}>
      {listing.images?.length ? (
        <div
          style={{
            height: 132,
            backgroundImage: `url(${listing.images[0]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm, padding: Spacing.md }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' }}>
          {listing.category ? <Badge label={listing.category} tone="accent" /> : null}
          {full ? <Badge label="Full" tone="danger" /> : null}
          {!full && closed ? <Badge label="Registration closed" tone="warning" /> : null}
          {!full && !closed && spotsLeft > 0 ? (
            <Badge label={`${spotsLeft} spots left`} tone="success" />
          ) : null}
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
          <span
            style={{
              ...Typography.label,
              color: Brand.textSecondary,
              padding: `${Spacing.xs}px ${Spacing.sm}px`,
              borderRadius: Radius.pill,
              border: `1px solid ${Brand.cardBorder}`,
            }}>
            Registration closes {formatDateRange(listing.registrationClosesAt ?? null, null)}
          </span>
        </div>
      </div>
    </Card>
  );
}

export default function EventsPage() {
  const events = useApi<Listing[]>('/public/events');
  const tournaments = useApi<Listing[]>('/public/tournaments');
  const loading = events.loading || tournaments.loading;
  const nothing =
    !loading &&
    !events.data?.length &&
    !tournaments.data?.length;

  if (loading && !events.data && !tournaments.data) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <Screen>
      <ScreenTitle title="Events" subtitle="What's on at GameOn — and how to get in." />

      {events.error ? <ErrorNote message={events.error} /> : null}
      {tournaments.error ? <ErrorNote message={tournaments.error} /> : null}

      {events.data?.length ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <h2 style={{ ...Typography.sectionTitle, color: Brand.text, margin: 0 }}>Upcoming</h2>
          {events.data.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </section>
      ) : null}

      {tournaments.data?.length ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <h2 style={{ ...Typography.sectionTitle, color: Brand.text, margin: 0 }}>Tournaments</h2>
          {tournaments.data.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </section>
      ) : null}

      {nothing ? (
        <EmptyState
          title="Nothing is scheduled yet"
          body="Published events and tournaments show up here as soon as they open."
          action={{
            label: 'Refresh',
            onPress: () => {
              events.refetch();
              tournaments.refetch();
            },
          }}
        />
      ) : null}
    </Screen>
  );
}
