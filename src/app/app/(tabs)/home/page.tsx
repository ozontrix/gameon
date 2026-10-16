'use client';

/**
 * The Home dashboard.
 *
 * Everything on it that is not specific to the signed-in player comes from one
 * public read — `GET /api/v1/public/home` — which is the same service the Expo
 * app's Home screen consumes: the venue, the live banners and a per-sport
 * summary ranked by bookings in the last 30 days. A guest sees exactly what a
 * member sees here, which is what "browse without an account" has to mean.
 */

import Link from 'next/link';

import { SportDiscIcon } from '@/components/mobile/Icons';
import { Screen, ScreenTitle } from '@/components/mobile/Screen';
import { Badge, Card, EmptyState, ErrorNote, Spinner } from '@/components/mobile/ui';
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

type HomeBanner = {
  id: string;
  title: string;
  titleAccent: string | null;
  subtitle: string | null;
  badge: string | null;
  imageUrl: string | null;
  link: string | null;
};

type HomeSport = {
  id: string;
  key: string | null;
  name: string;
  courtCount: number;
  priceFrom: number;
  bookingsLast30Days: number;
  imageUrl: string | null;
};

type HomeResponse = {
  venue: { name: string; address: string | null } | null;
  banners: { hero: HomeBanner[]; promo: HomeBanner[] };
  sports: HomeSport[];
};

function sportColor(key: string | null): string {
  return SportColors[key as SportKey] ?? DEFAULT_SPORT_COLOR;
}

export default function HomePage() {
  const { data, loading, error, refetch } = useApi<HomeResponse>('/public/home');

  if (loading && !data) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <Screen>
      <ScreenTitle
        title="Let's play"
        subtitle={
          data?.venue
            ? `${data.venue.name}${data.venue.address ? ` · ${data.venue.address}` : ''}`
            : 'Book a court in seconds.'
        }
      />

      {error ? <ErrorNote message={error} /> : null}

      {data?.banners.hero.length ? (
        <div
          className="mobile-scroll"
          style={{
            display: 'flex',
            gap: Spacing.md,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            margin: `0 -${Spacing.lg}px`,
            padding: `0 ${Spacing.lg}px`,
          }}>
          {data.banners.hero.map((banner) => (
            <div key={banner.id} style={{ flex: '0 0 88%', scrollSnapAlign: 'start' }}>
              <Card
                style={{
                  minHeight: 148,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: Spacing.md,
                  background: banner.imageUrl
                    ? `linear-gradient(180deg, rgba(11,9,8,0.15), rgba(11,9,8,0.85)), url(${banner.imageUrl}) center/cover`
                    : Brand.accentGlass,
                  borderColor: Brand.accentBorder,
                }}>
                {banner.badge ? <Badge label={banner.badge} tone="accent" /> : null}
                <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xxs }}>
                  <span style={{ ...Typography.sectionTitle, color: Brand.text }}>
                    {banner.title}
                    {banner.titleAccent ? (
                      <span style={{ color: Brand.accent }}> {banner.titleAccent}</span>
                    ) : null}
                  </span>
                  {banner.subtitle ? (
                    <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>
                      {banner.subtitle}
                    </span>
                  ) : null}
                </div>
              </Card>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 style={{ ...Typography.sectionTitle, color: Brand.text, margin: 0 }}>Pick a sport</h2>
          <Link
            href="/app/sports"
            className="mobile-link"
            style={{ color: Brand.accent, fontSize: 13, fontWeight: 600 }}>
            See all
          </Link>
        </div>

        {data?.sports.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            {data.sports.slice(0, 4).map((sport) => (
              <Link key={sport.id} href="/app/sports" style={{ textDecoration: 'none' }}>
                <Card style={{ display: 'flex', alignItems: 'center', gap: Spacing.md }}>
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      flexShrink: 0,
                      borderRadius: Radius.pill,
                      background: sportColor(sport.key),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <SportDiscIcon size={22} color={Brand.onAccent} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ ...Typography.cardTitle, color: Brand.text }}>{sport.name}</span>
                    <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>
                      {sport.courtCount} {sport.courtCount === 1 ? 'court' : 'courts'} · from{' '}
                      {rupees(sport.priceFrom)}
                    </span>
                  </span>
                  {sport.bookingsLast30Days > 0 ? (
                    <Badge label={`${sport.bookingsLast30Days} booked`} tone="neutral" />
                  ) : null}
                </Card>
              </Link>
            ))}
          </div>
        ) : loading ? null : (
          <EmptyState
            title="No courts are bookable yet"
            body="Once courts are published in the admin panel they appear here."
            action={{ label: 'Refresh', onPress: refetch }}
          />
        )}
      </div>

      {data?.banners.promo.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <h2 style={{ ...Typography.sectionTitle, color: Brand.text, margin: 0 }}>Offers</h2>
          {data.banners.promo.map((banner) => (
            <Card
              key={banner.id}
              style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xxs }}>
              <span style={{ ...Typography.cardTitle, color: Brand.text }}>
                {banner.title}
                {banner.titleAccent ? (
                  <span style={{ color: Brand.accent }}> {banner.titleAccent}</span>
                ) : null}
              </span>
              {banner.subtitle ? (
                <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>
                  {banner.subtitle}
                </span>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}
    </Screen>
  );
}