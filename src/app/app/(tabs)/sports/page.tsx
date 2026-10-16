'use client';

/**
 * The Sports tab.
 *
 * Reads the same public summary the Home screen does — courts grouped per
 * sport with the cheapest active slot price — because that is the shape the
 * decision needs: how many courts, and what a slot costs. The raw
 * `/public/sports` list carries neither.
 */

import Link from 'next/link';

import { SportDiscIcon } from '@/components/mobile/Icons';
import { Screen, ScreenTitle } from '@/components/mobile/Screen';
import { Card, EmptyState, ErrorNote, Spinner } from '@/components/mobile/ui';
import { rupees } from '@/lib/mobile/format';
import {
  Brand,
  DEFAULT_SPORT_COLOR,
  Radius,
  Spacing,
  SportColors,
  Typography,
  type SportKey,
} from '@/lib/mobile/theme';
import { useApi } from '@/lib/mobile/use-api';

type HomeSport = {
  id: string;
  key: string | null;
  name: string;
  courtCount: number;
  priceFrom: number;
  bookingsLast30Days: number;
  imageUrl: string | null;
};

export default function SportsPage() {
  const { data, loading, error, refetch } = useApi<{ sports: HomeSport[] }>('/public/home');
  const sports = data?.sports ?? [];

  if (loading && !data) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <Screen>
      <ScreenTitle title="Sports" subtitle="Every court open for booking right now." />

      {error ? <ErrorNote message={error} /> : null}

      {sports.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          {sports.map((sport) => {
            const tint = SportColors[sport.key as SportKey] ?? DEFAULT_SPORT_COLOR;
            return (
              <Link key={sport.id} href="/app/home" style={{ textDecoration: 'none' }}>
                <Card style={{ display: 'flex', alignItems: 'center', gap: Spacing.md }}>
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: Radius.pill,
                      background: tint,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <SportDiscIcon size={24} color={Brand.onAccent} />
                  </span>

                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ ...Typography.cardTitle, color: Brand.text }}>
                      {sport.name}
                    </span>
                    <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>
                      {sport.courtCount} {sport.courtCount === 1 ? 'court' : 'courts'} available
                    </span>
                  </span>

                  <span
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ ...Typography.priceSmall, color: Brand.accent }}>
                      {rupees(sport.priceFrom)}
                    </span>
                    <span style={{ ...Typography.micro, color: Brand.textMuted }}>PER SLOT</span>
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No sports are live yet"
          body="Courts appear here as soon as they are published in the admin panel."
          action={{ label: 'Refresh', onPress: refetch }}
        />
      )}
    </Screen>
  );
}
