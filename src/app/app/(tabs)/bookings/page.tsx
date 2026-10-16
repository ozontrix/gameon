'use client';

/**
 * The My Bookings tab.
 *
 * A booking belongs to an account, so this is the first screen that needs one:
 * a guest is offered the sign-in rather than shown an error. The read itself is
 * `GET /api/v1/user/bookings`, and the rows are the same `toAppBooking` shape
 * the handset app's booking cards render — date, slot, court and what was paid.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Screen, ScreenTitle } from '@/components/mobile/Screen';
import { useSession } from '@/components/mobile/session-provider';
import { Badge, Card, EmptyState, ErrorNote, Spinner } from '@/components/mobile/ui';
import { rupees } from '@/lib/mobile/format';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { useApi } from '@/lib/mobile/use-api';

type AppBooking = {
  key: string;
  bookingId: string;
  sport: string;
  status: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  tags: string[];
  paid: number;
  detailTitle: string;
  court: string;
  duration: string;
};

type BookingsResponse = {
  data: AppBooking[];
  page: number;
  total: number;
  hasMore: boolean;
};

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const STATUS_TONE: Record<string, 'accent' | 'success' | 'neutral' | 'warning'> = {
  ongoing: 'accent',
  upcoming: 'success',
  past: 'neutral',
  completed: 'neutral',
};

/** The status switch, shared by this screen's two lists. */
function StatusTabs({ tab, onChange }: { tab: TabId; onChange: (next: TabId) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Booking status"
      style={{
        display: 'flex',
        gap: Spacing.xxs,
        padding: Spacing.xxs,
        borderRadius: Radius.pill,
        background: Brand.highlightWash,
        border: `1px solid ${Brand.cardBorder}`,
      }}>
      {TABS.map((option) => {
        const selected = tab === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className="mobile-press"
            onClick={() => onChange(option.id)}
            style={{
              flex: 1,
              padding: `${Spacing.sm}px 0`,
              borderRadius: Radius.pill,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              ...Typography.label,
              background: selected ? Brand.accent : 'transparent',
              color: selected ? Brand.onAccent : Brand.textSecondary,
            }}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function BookingsPage() {
  const router = useRouter();
  const { user, isGuest } = useSession();
  const [tab, setTab] = useState<TabId>('upcoming');
  // Signed out, there is nothing to read: the endpoint is per-account.
  const { data, loading, error, refetch } = useApi<BookingsResponse>(
    user ? `/user/bookings?status=${tab}` : null,
  );

  const bookings = data?.data ?? [];

  return (
    <Screen>
      <ScreenTitle
        title="My Bookings"
        subtitle="Your slots, past and upcoming."
        action={
          user ? (
            <span style={{ ...Typography.caption, color: Brand.textMuted }}>
              {data?.total ?? 0} total
            </span>
          ) : undefined
        }
      />

      {!user ? (
        <EmptyState
          title={isGuest ? "You're browsing as a guest" : 'Sign in to see your bookings'}
          body="Bookings are tied to your account, so sign in with your phone or email to see and manage them."
          action={{ label: 'Sign in', onPress: () => router.push('/app') }}
        />
      ) : (
        <>
          <StatusTabs tab={tab} onChange={setTab} />

          {error ? <ErrorNote message={error} /> : null}

          {loading && !data ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: Spacing.xl }}>
              <Spinner size={26} />
            </div>
          ) : bookings.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
              {bookings.map((booking) => (
                <Card
                  key={booking.key}
                  style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: Spacing.sm,
                    }}>
                    <span style={{ ...Typography.cardTitle, color: Brand.text }}>
                      {booking.detailTitle}
                    </span>
                    <Badge label={booking.status} tone={STATUS_TONE[booking.status] ?? 'neutral'} />
                  </div>

                  <span style={{ ...Typography.body, color: Brand.textSecondary }}>
                    {booking.date} · {booking.time}
                  </span>
                  <span style={{ ...Typography.bodySmall, color: Brand.textMuted }}>
                    {booking.location || booking.venue} · {booking.duration}
                  </span>

                  {booking.tags?.length ? (
                    <div style={{ display: 'flex', gap: Spacing.sm, flexWrap: 'wrap' }}>
                      {booking.tags.map((tag) => (
                        <Badge key={tag} label={tag} tone="neutral" />
                      ))}
                    </div>
                  ) : null}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: Spacing.sm,
                      borderTop: `1px solid ${Brand.divider}`,
                    }}>
                    <span style={{ ...Typography.caption, color: Brand.textMuted }}>
                      {booking.bookingId}
                    </span>
                    <span style={{ ...Typography.priceSmall, color: Brand.accent }}>
                      {rupees(booking.paid)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title={tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings yet'}
              body={
                tab === 'upcoming'
                  ? 'Book a court from the Sports tab and it will appear here.'
                  : 'Once you have played your first slot it will be listed here.'
              }
              action={
                tab === 'upcoming'
                  ? { label: 'Browse sports', onPress: () => router.push('/app/sports') }
                  : { label: 'Refresh', onPress: refetch }
              }
            />
          )}
        </>
      )}
    </Screen>
  );
}
