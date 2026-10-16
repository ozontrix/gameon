'use client';

/**
 * The player's notifications, shared by the header bell and the Notifications
 * screen so the count and the list can never disagree. The web twin of the app
 * `context/notifications.tsx`.
 *
 * One difference forced by the platform: the app re-reads on `AppState`
 * becoming active. A browser tab does not suspend, so this listens for the tab
 * being returned to and for the connection coming back.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { NotificationKind } from '@/lib/mobile/constants/notifications';
import { api } from '@/lib/mobile/api-client';
import { useSession } from './session-provider';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** In-app route to open on tap, e.g. `/app/booking/<id>`. */
  link: string | null;
  bookingId: string | null;
  isBroadcast: boolean;
  isRead: boolean;
  createdAt: string;
};

type NotificationsValue = {
  notifications: AppNotification[];
  unread: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Marks one notification read, locally first so the row responds immediately. */
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsValue | null>(null);

type LoadResult = { notifications: AppNotification[] | null; unread: number; error: string | null };

function toError(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

async function fetchNotifications(): Promise<LoadResult> {
  try {
    const res = (await api.get('/user/notifications?limit=50')) as {
      data?: { notifications?: unknown; unread?: unknown };
    };
    return {
      notifications: Array.isArray(res?.data?.notifications)
        ? (res.data.notifications as AppNotification[])
        : [],
      unread: Number(res?.data?.unread ?? 0),
      error: null,
    };
  } catch (cause) {
    console.error('Failed to load notifications', cause);
    return { notifications: null, unread: 0, error: toError(cause, 'Could not load notifications.') };
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isGuest, user } = useSession();
  const userId = isGuest ? null : user?.id ?? null;

  const [loaded, setLoaded] = useState<{
    userId: string;
    notifications: AppNotification[];
    unread: number;
    error: string | null;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const store = useCallback(
    (forUser: string, result: LoadResult) =>
      setLoaded((current) => ({
        userId: forUser,
        notifications:
          result.notifications ?? (current?.userId === forUser ? current.notifications : []),
        unread: result.notifications
          ? result.unread
          : current?.userId === forUser
            ? current.unread
            : 0,
        error: result.error,
      })),
    [],
  );

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void fetchNotifications().then((result) => {
      if (active) store(userId, result);
    });
    return () => {
      active = false;
    };
  }, [userId, store]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    store(userId, await fetchNotifications());
    setRefreshing(false);
  }, [userId, store]);

  // New notifications may have arrived while the tab was in the background.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', refresh);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', refresh);
    };
  }, [refresh]);

  const current = userId && loaded?.userId === userId ? loaded : null;

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      setLoaded((state) =>
        state && state.userId === userId
          ? {
              ...state,
              notifications: state.notifications.map((item) =>
                item.id === id ? { ...item, isRead: true } : item,
              ),
              unread: Math.max(
                0,
                state.unread - (state.notifications.find((item) => item.id === id)?.isRead ? 0 : 1),
              ),
            }
          : state,
      );
      try {
        await api.post('/user/notifications/read', { ids: [id] });
      } catch (cause) {
        console.error('Could not mark the notification read', cause);
      }
    },
    [userId],
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setLoaded((state) =>
      state && state.userId === userId
        ? {
            ...state,
            notifications: state.notifications.map((item) => ({ ...item, isRead: true })),
            unread: 0,
          }
        : state,
    );
    try {
      await api.post('/user/notifications/read', {});
    } catch (cause) {
      console.error('Could not mark notifications read', cause);
    }
  }, [userId]);

  const value = useMemo<NotificationsValue>(
    () => ({
      notifications: current?.notifications ?? [],
      unread: current?.unread ?? 0,
      loading: Boolean(userId) && (!current || refreshing),
      error: current?.error ?? null,
      refresh,
      markRead,
      markAllRead,
    }),
    [current, userId, refreshing, refresh, markRead, markAllRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsValue {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error('useNotifications must be used inside a NotificationsProvider');
  return value;
}
