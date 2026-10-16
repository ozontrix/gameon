'use client';

/**
 * Notifications — the web twin of the app `app/notifications.tsx`.
 *
 * Everything the player has been told, grouped by recency, with the filter pills
 * the mockups specify. Tapping a row marks it read and follows its `link`, which
 * is how a booking confirmation becomes the booking itself.
 */

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { useNotifications, type AppNotification } from '@/components/mobile/notifications-provider';
import { useSession } from '@/components/mobile/session-provider';
import {
  AppHeader,
  Chip,
  EmptyState,
  InfoNote,
  Screen,
  ScreenScroll,
  SignInGate,
  Skeleton,
} from '@/components/mobile/ui';
import {
  NOTIFICATION_FILTERS,
  SECTION_TITLES,
  type NotificationItem,
  type NotificationSection,
} from '@/lib/mobile/constants/notifications';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { NotificationRow } from '@/components/mobile/notifications/notification-row';

const DAY = 86_400_000;

/** "6:45 PM" today, "Mon, 6:45 PM" this week, "18 Sep" before that. */
function timeLabel(createdAt: Date, section: NotificationSection): string {
  if (section === 'today') {
    return createdAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
  if (section === 'thisWeek') {
    return createdAt.toLocaleString('en-IN', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function sectionFor(createdAt: Date, now: Date): NotificationSection {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (createdAt.getTime() >= startOfToday) return 'today';
  if (createdAt.getTime() >= startOfToday - 6 * DAY) return 'thisWeek';
  return 'earlier';
}

function toItem(notification: AppNotification, now: Date): NotificationItem {
  const createdAt = new Date(notification.createdAt);
  const section = sectionFor(createdAt, now);
  return {
    id: notification.id,
    kind: notification.kind,
    title: notification.title,
    message: notification.body,
    unread: !notification.isRead,
    time: timeLabel(createdAt, section),
    section,
    link: notification.link,
  };
}

export default function NotificationsPage() {
  const router = useRouter();
  const { isGuest } = useSession();
  const { notifications, unread, loading, error, refresh, markRead, markAllRead } =
    useNotifications();
  const [active, setActive] = useState('all');

  const items = useMemo(() => {
    const now = new Date();
    return notifications.map((notification) => toItem(notification, now));
  }, [notifications]);

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const filter of NOTIFICATION_FILTERS) {
      result[filter.key] = filter.kinds
        ? items.filter((item) => filter.kinds!.includes(item.kind)).length
        : items.length;
    }
    return result;
  }, [items]);

  if (isGuest) {
    return (
      <Screen>
        <AppHeader variant="back" title="Notifications" showLocation={false} showBell={false} />
        <SignInGate
          icon="notificationsOutline"
          title="Sign in for your notifications"
          body="Booking confirmations, reminders and venue updates arrive here once you have an account."
        />
      </Screen>
    );
  }

  const allowedKinds = NOTIFICATION_FILTERS.find((filter) => filter.key === active)?.kinds ?? null;
  const visible = allowedKinds ? items.filter((item) => allowedKinds.includes(item.kind)) : items;

  return (
    <Screen>
      <AppHeader
        variant="back"
        title="Notifications"
        showLocation={false}
        showBell={false}
        right={
          unread > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                ...Typography.label,
                color: Brand.accent,
                whiteSpace: 'nowrap',
              }}>
              Mark all read
            </button>
          ) : undefined
        }
      />

      {/* The filter pills, with the count of what each would show. */}
      <div
        className="mobile-scroll"
        style={{
          display: 'flex',
          gap: Spacing.sm,
          overflowX: 'auto',
          paddingLeft: Spacing.md,
          paddingRight: Spacing.md,
          paddingBottom: Spacing.sm,
        }}>
        {NOTIFICATION_FILTERS.map((filter) => (
          <Chip
            key={filter.key}
            label={filter.label}
            count={counts[filter.key]}
            size="sm"
            variant="outline"
            selected={active === filter.key}
            onPress={() => setActive(filter.key)}
          />
        ))}
      </div>

      <ScreenScroll gap={Spacing.md}>
        {error ? <InfoNote body={error} tone="danger" title="Could not load notifications" /> : null}

        {loading && items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <Skeleton height={72} radius={Radius.md} />
            <Skeleton height={72} radius={Radius.md} />
            <Skeleton height={72} radius={Radius.md} />
          </div>
        ) : null}

        {!loading && items.length === 0 ? (
          <EmptyState
            icon="notificationsOutline"
            title={error ? 'Could not load notifications' : 'No notifications yet'}
            body={error ?? 'Booking confirmations, reminders and venue updates will show up here.'}
            actionLabel={error ? 'Try Again' : undefined}
            onAction={error ? () => void refresh() : undefined}
          />
        ) : null}

        {items.length > 0 && visible.length === 0 ? (
          <EmptyState
            icon="optionsOutline"
            title="Nothing in this filter"
            body="Try another filter to see your other notifications."
          />
        ) : null}

        {SECTION_TITLES.map(({ key, title }) => {
          const list = visible.filter((item) => item.section === key);
          if (list.length === 0) return null;

          return (
            <section key={key} style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
              <span style={{ ...Typography.label, color: Brand.textSecondary }}>{title}</span>
              <div
                style={{
                  border: `1px solid ${Brand.cardBorder}`,
                  borderRadius: Radius.lg,
                  overflow: 'hidden',
                  backgroundColor: Brand.card,
                }}>
                {list.map((item, index) => (
                  <div key={item.id}>
                    {index > 0 ? <div style={{ height: 1, backgroundColor: Brand.divider }} /> : null}
                    <NotificationRow
                      item={item}
                      onPress={() => {
                        if (item.unread) void markRead(item.id);
                        if (item.link) router.push(item.link);
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </ScreenScroll>
    </Screen>
  );
}
