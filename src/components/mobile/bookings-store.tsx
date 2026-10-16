'use client';

/**
 * The signed-in player's bookings, a status at a time — the web twin of the app
 * `context/bookings-store.tsx`.
 *
 * The server owns which status a booking is in and pages the results, so the app
 * holds one cached page per tab rather than every booking ever made. Upcoming
 * and ongoing load eagerly because the Home card needs them; past waits until
 * someone opens that tab.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { api } from '@/lib/mobile/api-client';
import { SPORT_PHOTOS, type SportKind } from '@/lib/mobile/constants/sports';
import type { Booking, BookingStatus } from '@/lib/mobile/constants/bookings';
import { useSession } from './session-provider';

/** How many bookings one page of a status holds. */
const PAGE_SIZE = 20;

/** One status' slice of the list: its page, and whether more remain. */
export type BookingList = {
  items: Booking[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
};

const EMPTY_LIST: BookingList = { items: [], total: 0, hasMore: false, loading: false, error: null };

type BookingsValue = {
  /** The cached page(s) of one status. */
  list: (status: BookingStatus) => BookingList;
  /** Every booking currently cached, for lookups and the Home card. */
  all: Booking[];
  find: (key?: string) => Booking | undefined;
  /** Reloads a status from page 1, or the statuses already loaded. */
  refresh: (status?: BookingStatus) => Promise<void>;
  /** Appends the next page of a status. */
  loadMore: (status: BookingStatus) => Promise<void>;
  /** True while anything is loading, for callers that only need a hint. */
  loading: boolean;
  error: string | null;
};

const BookingsContext = createContext<BookingsValue | null>(null);

/**
 * The API leaves `image` empty; the card shows the sport's photo instead. The
 * photo set is the handset app's own, so both builds show the same picture.
 */
type ApiBooking = Omit<Booking, 'image'> & { image: string | null };

function fromApi(booking: ApiBooking): Booking {
  return { ...booking, image: booking.image || SPORT_PHOTOS[booking.sport as SportKind] };
}

type Page = { items: Booking[]; total: number; hasMore: boolean };

/** One page of a status. Never throws: a failure is reported to the caller. */
async function fetchPage(status: BookingStatus, page: number): Promise<Page> {
  const res = (await api.get(`/user/bookings?status=${status}&page=${page}&limit=${PAGE_SIZE}`)) as {
    data?: unknown;
    total?: unknown;
    hasMore?: unknown;
  };
  return {
    items: Array.isArray(res?.data) ? (res.data as ApiBooking[]).map(fromApi) : [],
    total: Number(res?.total ?? 0),
    hasMore: Boolean(res?.hasMore),
  };
}

export function BookingsProvider({ children }: { children: ReactNode }) {
  const { isGuest, user } = useSession();
  const userId = isGuest ? null : user?.id ?? null;

  // Keyed on the account, so a different player signing in never briefly sees
  // the previous player's bookings.
  return (
    <BookingsStore key={userId ?? 'guest'} userId={userId}>
      {children}
    </BookingsStore>
  );
}

function BookingsStore({ children, userId }: { children: ReactNode; userId: string | null }) {
  const [owner, setOwner] = useState<string | null>(null);
  const [lists, setLists] = useState<Partial<Record<BookingStatus, BookingList>>>({});
  // Only the most recent request for a status may commit its result.
  const requests = useRef<Partial<Record<BookingStatus, number>>>({});

  const load = useCallback(async (status: BookingStatus, page: number, forUser: string) => {
    const ticket = (requests.current[status] ?? 0) + 1;
    requests.current[status] = ticket;

    setLists((current) => ({
      ...current,
      [status]: { ...(current[status] ?? EMPTY_LIST), loading: true, error: null },
    }));

    try {
      const result = await fetchPage(status, page);
      if (requests.current[status] !== ticket) return;
      setLists((current) => {
        const existing = current[status] ?? EMPTY_LIST;
        return {
          ...current,
          [status]: {
            // Page 1 replaces; later pages append.
            items: page === 1 ? result.items : [...existing.items, ...result.items],
            total: result.total,
            hasMore: result.hasMore,
            loading: false,
            error: null,
          },
        };
      });
      setOwner(forUser);
    } catch (cause) {
      if (requests.current[status] !== ticket) return;
      console.error(`Failed to load ${status} bookings`, cause);
      setLists((current) => ({
        ...current,
        [status]: {
          ...(current[status] ?? EMPTY_LIST),
          loading: false,
          error: cause instanceof Error ? cause.message : 'Could not load your bookings.',
        },
      }));
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      void load('upcoming', 1, userId);
      void load('ongoing', 1, userId);
    });
    return () => {
      active = false;
    };
  }, [userId, load]);

  const refresh = useCallback(
    async (status?: BookingStatus) => {
      if (!userId) return;
      const targets = status ? [status] : (Object.keys(requests.current) as BookingStatus[]);
      await Promise.all(targets.map((entry) => load(entry, 1, userId)));
    },
    [userId, load],
  );

  const loadMore = useCallback(
    async (status: BookingStatus) => {
      if (!userId) return;
      const existing = lists[status];
      if (!existing || existing.loading || !existing.hasMore) return;
      // Pages are counted from what is already held, so a refresh mid-scroll
      // cannot ask for a page twice.
      await load(status, Math.floor(existing.items.length / PAGE_SIZE) + 1, userId);
    },
    [userId, lists, load],
  );

  const mine = userId !== null && owner === userId;
  const all = useMemo(
    () =>
      mine
        ? (['upcoming', 'ongoing', 'past'] as const).flatMap((status) => lists[status]?.items ?? [])
        : [],
    [mine, lists],
  );

  const value = useMemo<BookingsValue>(
    () => ({
      list: (status) => (mine ? lists[status] ?? EMPTY_LIST : EMPTY_LIST),
      all,
      find: (key) => {
        if (!key) return undefined;
        const id = key.startsWith('#') ? key : `#${key}`;
        return all.find((booking) => booking.key === key || booking.bookingId === id);
      },
      refresh,
      loadMore,
      loading: Object.values(lists).some((entry) => entry?.loading),
      error: Object.values(lists).find((entry) => entry?.error)?.error ?? null,
    }),
    [mine, lists, all, refresh, loadMore],
  );

  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
}

export function useBookings(): BookingsValue {
  const value = useContext(BookingsContext);
  if (!value) throw new Error('useBookings must be used inside a BookingsProvider');
  return value;
}
