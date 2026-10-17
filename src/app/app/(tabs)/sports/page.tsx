'use client';

/**
 * The Sports tab — the web twin of the app `app/(tabs)/sports.tsx`.
 *
 * One card per bookable (venue, sport, indoor/outdoor, AC, surface) combination,
 * which is what `/public/sports/catalog` returns. The sport chips are the only
 * filter on the screen, and filtering stays server-side: picking chips
 * re-requests the catalog with repeated `?sport=` parameters rather than
 * filtering an already-fetched list, so a card is never shown as available when
 * the server would have excluded it.
 *
 * Chips are multi-select because one turf can serve two sports. The box turf
 * is a single card with one court and one booking calendar; it is returned once
 * whether Football, Cricket, or both are selected.
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
  SPORT_KINDS,
  SPORT_LABELS,
  isSportKind,
  type SportKind,
  type Venue,
} from '@/lib/mobile/constants/sports';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';

export default function SportsPage() {
  const searchParams = useSearchParams();
  const { cards: shared, loading: sharedLoading } = useSportsCatalog();

  // `?sport=` links from the Home sport grid, including repeated parameters
  // for a shared link. Only sports this build knows are kept, so a stale or
  // mistyped link shows every court instead of an empty nameless filter.
  const [sports, setSports] = useState<SportKind[]>(() => {
    const initial = new Set(
      searchParams.getAll('sport').flatMap((value) => value.split(',')).filter(isSportKind),
    );
    return SPORT_KINDS.filter((kind) => initial.has(kind));
  });
  const [cards, setCards] = useState<Venue[] | null>(null);
  // Which sports the cards in hand belong to. `query !== loadedQuery` *is* the
  // loading state, so there is no separate flag to race with the request.
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Canonical order, so toggling chips in a different order cannot create a
  // second request for the same selection.
  const selected = SPORT_KINDS.filter((kind) => sports.includes(kind));
  const query = selected.map((kind) => `sport=${kind}`).join('&');

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

        {/* Multi-select: a football+cricket turf belongs in either and both. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
          <div style={{ display: 'flex', gap: Spacing.sm, flexWrap: 'wrap' }}>
            {SPORT_KINDS.map((option) => (
              <Chip
                key={option}
                label={SPORT_LABELS[option]}
                icon={<SportGlyph sport={option} size={14} color={Brand.accent} />}
                selected={sports.includes(option)}
                variant="outline"
                onPress={() =>
                  setSports((current) =>
                    current.includes(option)
                      ? current.filter((kind) => kind !== option)
                      : [...current, option],
                  )
                }
              />
            ))}
          </div>
          <span style={{ ...Typography.caption, color: Brand.textMuted }}>
            Pick one or more sports. A shared turf appears once, under every sport it hosts.
          </span>
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
            title={selected.length ? 'No courts for those sports' : 'No courts to show'}
            body="Try another sport — the facility books badminton, pickleball, cricket and football."
            actionLabel={selected.length ? 'Show all courts' : undefined}
            onAction={selected.length ? () => setSports([]) : undefined}
          />
        ) : null}

        {visible.length ? (
          <SectionHeader
            title={selected.length ? selected.map((kind) => SPORT_LABELS[kind]).join(' + ') : 'All courts'}
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
