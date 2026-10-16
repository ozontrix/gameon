'use client';

/**
 * My Bookings — the web twin of the app `app/(tabs)/bookings.tsx`.
 *
 * Three statuses, each paged by the server: Upcoming, Ongoing, Past. Ongoing and
 * upcoming are already cached by the bookings store (the Home card needs them),
 * and Past loads the first time this tab is opened.
 *
 * A booking belongs to an account, so a guest is offered the sign-in rather than
 * shown an error.
 */

import { useState } from 'react';

import { useBookings } from '@/components/mobile/bookings-store';
import { BookingCard } from '@/components/mobile/bookings/booking-card';
import { useSession } from '@/components/mobile/session-provider';
import {
  AppHeader,
  Button,
  EmptyState,
  InfoNote,
  Screen,
  ScreenScroll,
  SegmentedTabs,
  SignInGate,
  Skeleton,
} from '@/components/mobile/ui';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Spacing as Gap } from '@/lib/mobile/theme';
import type { BookingStatus } from '@/lib/mobile/constants/bookings';

const TABS = [
  { key: 'upcoming' as BookingStatus, label: 'Upcoming', icon: 'calendarOutline' as const },
  { key: 'ongoing' as BookingStatus, label: 'Ongoing', icon: 'timeOutline' as const },
  { key: 'past' as BookingStatus, label: 'Past', icon: 'checkmarkCircleOutline' as const },
];

export default function BookingsPage() {
  const pathname = usePathname();
  const { isGuest } = useSession();
  const { list, refresh, loadMore, error } = useBookings();
  const [status, setStatus] = useState<BookingStatus>('upcoming');

  // The past tab is the only one nobody has read yet at first paint.
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (opened.current === pathname) return;
    opened.current = pathname;
    void refresh();
  }, [pathname, refresh]);

  if (isGuest) {
    return (
      <Screen>
        <AppHeader />
        <SignInGate
          icon="calendarOutline"
          title="Sign in to see your bookings"
          body="Your slots live on your account, so sign in with your phone or email to see and manage them."
        />
      </Screen>
    );
  }

  const current = list(status);

  return (
    <Screen>
      <AppHeader />
      <ScreenScroll bottomLayer="tabBar" gap={Gap.md}>
        <SegmentedTabs options={TABS} value={status} onChange={setStatus} />

        {error ? <InfoNote body={error} tone="danger" title="Could not load bookings" /> : null}

        {current.loading && current.items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Gap.sm }}>
            <Skeleton height={132} radius={14} />
            <Skeleton height={132} radius={14} />
          </div>
        ) : null}

        {!current.loading && current.items.length === 0 ? (
          <EmptyState
            icon="calendarOutline"
            title={
              status === 'upcoming'
                ? 'No upcoming bookings'
                : status === 'ongoing'
                  ? 'Nothing on right now'
                  : 'No past bookings yet'
            }
            body={
              status === 'past'
                ? 'Once you have played your first slot it will be listed here.'
                : 'Book a court from the Sports tab and it will appear here.'
            }
            actionLabel={status === 'past' ? 'Refresh' : undefined}
            onAction={status === 'past' ? () => void refresh(status) : undefined}
          />
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: Gap.sm }}>
          {current.items.map((booking) => (
            <BookingCard key={booking.key} booking={booking} />
          ))}
        </div>

        {current.hasMore ? (
          <Button
            label={current.loading ? 'Loading…' : 'Load older bookings'}
            variant="secondary"
            size="md"
            fullWidth
            loading={current.loading}
            onPress={() => void loadMore(status)}
          />
        ) : null}

        <div style={{ height: Gap.xs }} />
      </ScreenScroll>
    </Screen>
  );
}
