'use client';

/**
 * My Tickets & Entries — `/app/my-tickets`. The web twin of the handset app's
 * `app/my-tickets.tsx`: everything bought beyond a court slot, in two lists, each
 * read from the endpoint that owns it.
 *
 * The rows are what the server returns — an event ticket order and a tournament
 * registration are different records with different shapes, so they are two types
 * here rather than one flattened one.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  AppHeader,
  Badge,
  Card,
  EmptyState,
  InfoNote,
  Ion,
  Screen,
  ScreenScroll,
  SectionHeader,
  SignInGate,
  Spinner,
  type IonName,
} from '@/components/mobile/ui';
import { useSession } from '@/components/mobile/session-provider';
import { useAccountGate } from '@/components/mobile/use-auth-guard';
import { AuthWait } from '@/components/mobile/auth/auth-wait';
import { price } from '@/lib/mobile/constants/config';
import { clockLabel } from '@/lib/mobile/constants/slots';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { useApi } from '@/lib/mobile/use-api';

/** `YYYY-MM-DD` → "18 May 2026", without the server's timezone leaking in. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dayLabel(iso: string | undefined): string {
  if (!iso) return '—';
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return '—';
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

type EventOrder = {
  id: string;
  attendee_name: string;
  tickets: number;
  status: string;
  payment_status: string;
  amount_paid: number;
  events: {
    id: string;
    title: string;
    starts_on: string;
    ends_on: string;
    daily_start_time: string;
    daily_end_time: string;
    venues: { name: string } | null;
  } | null;
};

type Registration = {
  id: string;
  team_name: string;
  captain_name: string;
  status: string;
  payment_status: string;
  amount_paid: number;
  tournaments: {
    id: string;
    title: string;
    starts_on: string;
    ends_on: string;
    daily_start_time: string;
    daily_end_time: string;
    venues: { name: string } | null;
    court_types: { name: string; sports: { name: string } | null } | null;
  } | null;
};

/** How a status reads on a row, in the handset's words. */
function statusLabel(status: string): string {
  if (status === 'CONFIRMED') return 'Confirmed';
  if (status === 'CANCELLED') return 'Cancelled';
  return 'Awaiting payment';
}

/** One row in either list. */
function EntryCard({
  icon,
  title,
  facts,
  amount,
  status,
  onPress,
}: {
  icon: IonName;
  title: string;
  facts: string[];
  amount: number;
  status: string;
  onPress?: () => void;
}) {
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={onPress ? `${title}, ${statusLabel(status)}` : title}
      style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md }}>
      <span
        style={{
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: Radius.pill,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Brand.accentSoft,
        }}>
        <Ion name={icon} size={18} color={Brand.accent} />
      </span>

      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ ...Typography.cardTitle, color: Brand.text }}>{title}</span>

        {facts.filter(Boolean).map((fact) => (
          <span key={fact} style={{ ...Typography.caption, color: Brand.textSecondary }}>
            {fact}
          </span>
        ))}

        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: Spacing.sm,
            paddingTop: Spacing.xs,
          }}>
          <Badge
            label={statusLabel(status)}
            tone={status === 'CONFIRMED' ? 'success' : status === 'CANCELLED' ? 'neutral' : 'warning'}
          />
          <span style={{ ...Typography.label, color: Brand.accent }}>{price(amount)}</span>
        </span>
      </span>

      {onPress ? <Ion name="chevronForward" size={16} color={Brand.textSecondary} /> : null}
    </Card>
  );
}

export default function MyTicketsPage() {
  const router = useRouter();
  const { isGuest } = useSession();
  const [refreshing, setRefreshing] = useState(false);

  /**
   * The tab screens are gated by their layout; this screen sits outside it, so it
   * applies the same rule itself. Without it a signed-out deep link would read the
   * two member endpoints and show 401 errors rather than asking for a sign-in.
   */
  const { waiting } = useAccountGate();

  // Read before the guest gate: hooks run in the same order on every render.
  const orders = useApi<EventOrder[]>(isGuest ? null : '/user/event-orders');
  const registrations = useApi<Registration[]>(isGuest ? null : '/user/tournament-registrations');

  if (waiting) return <AuthWait />;

  if (isGuest) {
    return (
      <Screen>
        <AppHeader variant="back" showBell={false} />
        <SignInGate
          icon="ticketOutline"
          title="Sign in for your tickets"
          body="Event tickets and tournament entries are tied to your account, so they appear here once you sign in."
        />
      </Screen>
    );
  }

  const loading = orders.loading || registrations.loading;
  const error = orders.error ?? registrations.error;
  const eventOrders = orders.data ?? [];
  const entries = registrations.data ?? [];
  const hasOrders = eventOrders.length > 0;
  const hasEntries = entries.length > 0;
  const firstLoad = loading && !hasOrders && !hasEntries;

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([orders.refetch(), registrations.refetch()]);
    setRefreshing(false);
  };

  return (
    <Screen>
      <AppHeader
        variant="back"
        showBell={false}
        right={
          // The handset refreshes by pulling down; a browser has no such gesture.
          <button
            type="button"
            aria-label="Refresh my tickets"
            onClick={() => void refresh()}
            className="mobile-press"
            style={{
              width: 34,
              height: 34,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              opacity: refreshing ? 0.5 : 1,
            }}>
            <Ion name="refresh" size={18} color={Brand.text} />
          </button>
        }
      />

      <ScreenScroll>
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
          <span style={{ ...Typography.screenTitle, color: Brand.text }}>
            My Tickets &amp; Entries
          </span>
          <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>
            Everything you have booked beyond a court slot — event tickets and tournament teams.
          </span>
        </div>

        {error && !hasOrders && !hasEntries ? (
          <InfoNote title="Couldn't load your tickets" body={error} tone="danger" />
        ) : null}

        {firstLoad ? (
          <div style={{ paddingTop: Spacing.five, display: 'flex', justifyContent: 'center' }}>
            <Spinner />
          </div>
        ) : null}

        {!firstLoad && !hasOrders && !hasEntries ? (
          <EmptyState
            icon="ticketOutline"
            title="Nothing here yet"
            body="Buy tickets to an event or register a team for a tournament and they will show up here."
            actionLabel="Browse Events"
            onAction={() => router.push('/app/events')}
          />
        ) : null}

        {hasOrders ? (
          <>
            <SectionHeader title="Event Tickets" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
              {eventOrders.map((order) => {
                const activity = order.events;
                return (
                  <EntryCard
                    key={order.id}
                    icon="ticketOutline"
                    title={activity?.title ?? 'Event tickets'}
                    facts={[
                      `${order.tickets} ${order.tickets === 1 ? 'ticket' : 'tickets'} • ${order.attendee_name}`,
                      `${dayLabel(activity?.starts_on)}${
                        activity ? ` • ${clockLabel(activity.daily_start_time)}` : ''
                      }`,
                      activity?.venues?.name ?? '',
                    ]}
                    amount={Number(order.amount_paid ?? 0)}
                    status={order.status}
                    onPress={activity ? () => router.push(`/app/event/${activity.id}`) : undefined}
                  />
                );
              })}
            </div>
          </>
        ) : null}

        {hasEntries ? (
          <>
            <SectionHeader title="Tournament Entries" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
              {entries.map((entry) => {
                const activity = entry.tournaments;
                return (
                  <EntryCard
                    key={entry.id}
                    icon="trophyOutline"
                    title={entry.team_name}
                    facts={[
                      activity?.title ?? 'Tournament entry',
                      `${dayLabel(activity?.starts_on)}${
                        activity ? ` • ${clockLabel(activity.daily_start_time)}` : ''
                      }`,
                      [activity?.venues?.name, activity?.court_types?.sports?.name]
                        .filter(Boolean)
                        .join(' • '),
                    ]}
                    amount={Number(entry.amount_paid ?? 0)}
                    status={entry.status}
                    onPress={
                      activity ? () => router.push(`/app/tournament/${activity.id}`) : undefined
                    }
                  />
                );
              })}
            </div>
          </>
        ) : null}
      </ScreenScroll>
    </Screen>
  );
}
