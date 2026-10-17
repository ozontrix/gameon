'use client';

/**
 * The Sports tab — the web twin of the app `app/(tabs)/sports.tsx`.
 *
 * One card per bookable (venue, sport, indoor/outdoor, AC, surface) combination,
 * which is what `/public/sports/catalog` returns. The sport chips are the only
 * filter on the screen, and filtering stays server-side exactly as the handset
 * app does it: picking a chip re-requests the catalog with `?sport=` rather than
 * filtering an already-fetched list, so a card is never shown as available when
 * the server would have excluded it.
 *
 * Surface, setting and climate remain card details, not filter controls on this
 * screen. The backend's corresponding query parameters are unchanged.
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

export default function SportsPage() {
  const searchParams = useSearchParams();
  const { cards: shared, loading: sharedLoading } = useSportsCatalog();

  // A `?sport=` handed over by the Home sport grid is the starting filter —
  // taken only when it names a sport this build knows, so a stale or mistyped
  // link shows every court instead of an empty list under a nameless heading.
  const [sport, setSport] = useState<SportKind | null>(
    () => SPORTS.find((kind) => kind === searchParams.get('sport')) ?? null,
  );
  const [cards, setCards] = useState<Venue[] | null>(null);
  // Which sport the cards in hand belong to. `query !== loadedQuery` *is* the
  // loading state, so there is no separate flag to race with the request.
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = sport ? `sport=${sport}` : '';

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

  // Unfiltered is the shared catalog, already in memory from the provider.
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
          {SPORTS.map((option) => (
            <Chip
              key={option}
              label={SPORT_LABELS[option]}
              icon={<SportGlyph sport={option} size={14} color={Brand.accent} />}
              selected={sport === option}
              variant="outline"
              onPress={() => setSport((current) => (current === option ? null : option))}
            />
          ))}
        </div>

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
            title={sport ? 'No courts for that sport' : 'No courts to show'}
            body="Try another sport — the facility books badminton, pickleball, cricket and football."
            actionLabel={sport ? 'Show all courts' : undefined}
            onAction={sport ? () => setSport(null) : undefined}
          />
        ) : null}

        {visible.length ? (
          <SectionHeader
            title={sport ? SPORT_LABELS[sport] : 'All courts'}
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
