'use client';

/**
 * The Home dashboard — the web twin of the app `app/(tabs)/home.tsx`.
 *
 * Banners, the next booking and the bell count can all have changed since the
 * last visit, so Home reloads every time it comes into view. On a handset that
 * is `useFocusEffect`; here it is the pathname settling on this route. The
 * shared providers also re-read when the tab is returned to, so a player coming
 * back to a forgotten tab is not looking at stale data either.
 */

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

import { useBookings } from '@/components/mobile/bookings-store';
import { BookCourt } from '@/components/mobile/home/book-court';
import { EventsRow } from '@/components/mobile/home/events-row';
import { FeaturesRow } from '@/components/mobile/home/features-row';
import { Greeting } from '@/components/mobile/home/greeting';
import { HeroBanner } from '@/components/mobile/home/hero-banner';
import { NextBookingCard } from '@/components/mobile/home/next-booking-card';
import { PromoBanner } from '@/components/mobile/home/promo-banner';
import { useHomeContent } from '@/components/mobile/home-content-provider';
import { useNotifications } from '@/components/mobile/notifications-provider';
import { AppHeader, Screen, ScreenScroll } from '@/components/mobile/ui';
import { Layout, Spacing } from '@/lib/mobile/theme';

export default function HomePage() {
  const pathname = usePathname();
  const { refresh } = useHomeContent();
  const { refresh: refreshBookings } = useBookings();
  const { refresh: refreshNotifications } = useNotifications();

  const refreshAll = useCallback(async () => {
    await Promise.all([refresh(), refreshBookings(), refreshNotifications()]);
  }, [refresh, refreshBookings, refreshNotifications]);

  // Once per visit to this route, not on every re-render of the provider tree.
  const lastRefresh = useRef<string | null>(null);
  useEffect(() => {
    if (lastRefresh.current === pathname) return;
    lastRefresh.current = pathname;
    void refreshAll();
  }, [pathname, refreshAll]);

  return (
    <Screen>
      <AppHeader />
      <ScreenScroll bottomLayer="tabBar" gutter={false} gap={Spacing.lg}>
        <Greeting />
        <HeroBanner />
        <div
          style={{
            paddingLeft: Layout.gutter,
            paddingRight: Layout.gutter,
            display: 'flex',
            flexDirection: 'column',
            gap: Spacing.lg,
          }}>
          <NextBookingCard />
          <BookCourt />
          <PromoBanner />
          <EventsRow />
          <FeaturesRow />
        </div>
      </ScreenScroll>
    </Screen>
  );
}
