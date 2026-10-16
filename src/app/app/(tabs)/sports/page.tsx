'use client';

/**
 * The Sports tab — the web twin of the app `app/(tabs)/sports.tsx`.
 *
 * One card per bookable (venue, sport, indoor/outdoor, AC, surface) combination,
 * which is what `/public/sports/catalog` returns. Filtering is server-side,
 * exactly as the handset app does it: picking a chip re-requests the catalog with
 * that query param rather than filtering an already-fetched list, so a card is
 * never shown as available when the server would have excluded it.
 */

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { SportGlyph } from '@/components/mobile/sport-icons';
import { VenueCard } from '@/components/mobile/sports/venue-card';
import { fetchSportsCatalog, useSportsCatalog } from '@/components/mobile/sports-catalog-provider';
import {
  AppHeader,
  Chip,
  EmptyState,
  FilterBar,
  InfoNote,
  Screen,
  ScreenScroll,
  SectionHeader,
  Skeleton,
} from '@/components/mobile/ui';
import {
  SPORT_LABELS,
  type SportKind,
  type Venue,
} from '@/lib/mobile/constants/sports';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';

const SPORTS: SportKind[] = ['badminton', 'pickleball', 'cricket', 'football'];

/** The filter dimensions the backend understands, in the order the bar shows them. */
const DIMENSIONS = [
  { key: 'surface', label: 'Surface' },
  { key: 'setting', label: 'Setting' },
  { key: 'climate', label: 'Climate' },
] as const;

type Filters = Partial<Record<'sport' | 'surface' | 'setting' | 'climate', string>>;

function queryFor(filters: Filters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export default function SportsPage() {
  const searchParams = useSearchParams();
  const { cards: shared, loading: sharedLoading } = useSportsCatalog();

  // A `?sport=` handed over by the Home sport grid is the starting filter.
  const handedOver = searchParams.get('sport');
  const [filters, setFilters] = useState<Filters>(
    handedOver ? { sport: handedOver as SportKind } : {},
  );
  const [cards, setCards] = useState<Venue[] | null>(null);
  // Which filter the cards in hand belong to. `query !== loadedQuery` *is* the
  // loading state, so there is no separate flag to race with the request.
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = queryFor(filters);
  const activeCount = Object.values(filters).filter(Boolean).length;

  // Unfiltered is the shared catalog, already in memory from the provider.
  useEffect(() => {
    if (!query) return;
    let active = true;
    void (async () => {
      try {
        const next = await fetchSportsCatalog(query);
        if (!active) return;
        setCards(next);
        setError(null);
        setLoadedQuery(query);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Could not load sports.');
        setLoadedQuery(query);
      }
    })();
    return () => {
      active = false;
    };
  }, [query]);

  const visible = (query ? cards : shared) ?? [];
  const busy = query ? loadedQuery !== query : sharedLoading;

  return (
    <Screen>
      <AppHeader />
      <ScreenScroll bottomLayer="tabBar" gap={Spacing.md}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <span style={{ ...Typography.screenTitle, color: Brand.text }}>Sports</span>
          <span style={{ ...Typography.body, color: Brand.textSecondary }}>
            {visible.length} {visible.length === 1 ? 'court' : 'courts'} across the facility.
          </span>
        </div>

        {/* The sport chips: the fastest way into one sport's courts. */}
        <div style={{ display: 'flex', gap: Spacing.sm, flexWrap: 'wrap' }}>
          {SPORTS.map((sport) => (
            <Chip
              key={sport}
              label={SPORT_LABELS[sport]}
              icon={<SportGlyph sport={sport} size={14} color={Brand.accent} />}
              selected={filters.sport === sport}
              variant="outline"
              onPress={() =>
                setFilters((current) => ({
                  ...current,
                  sport: current.sport === sport ? undefined : sport,
                }))
              }
            />
          ))}
        </div>

        <FilterBar
          items={DIMENSIONS.map((dimension) => ({
            key: dimension.key,
            label: dimension.label,
            value: filters[dimension.key],
          }))}
          activeCount={activeCount}
          onSelect={(key) => setFilters((current) => ({ ...current, [key]: undefined }))}
          onClearAll={() => setFilters({})}
        />

        {error ? <InfoNote body={error} tone="danger" title="Could not load sports" /> : null}

        {busy && visible.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <Skeleton height={214} radius={Radius.lg} />
            <Skeleton height={214} radius={Radius.lg} />
          </div>
        ) : null}

        {!busy && visible.length === 0 ? (
          <EmptyState
            icon="tennisballOutline"
            title="No courts match those filters"
            body="Clear a filter, or try another sport — the facility books badminton, pickleball, cricket and football."
            actionLabel="Clear filters"
            onAction={() => setFilters({})}
          />
        ) : null}

        {visible.length ? (
          <SectionHeader
            title={filters.sport ? SPORT_LABELS[filters.sport as SportKind] : 'All courts'}
            trailing={
              <span style={{ ...Typography.caption, color: Brand.textMuted }}>
                {visible.length} {visible.length === 1 ? 'card' : 'cards'}
              </span>
            }
          />
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          {visible.map((venue) => (
            <VenueCard key={venue.key} venue={venue} />
          ))}
        </div>
      </ScreenScroll>
    </Screen>
  );
}
