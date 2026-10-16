'use client';

/**
 * Banners, sports and venue details for the Home screen and the header — the
 * web twin of the app `context/home-content.tsx`.
 *
 * Public content, so it loads for guests too, and it is shared rather than
 * fetched per component: the Home hero, the sport grid and the promo card all
 * read one fetch.
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

import { api, isRetryableReadError } from '@/lib/mobile/api-client';
import { useReadRecovery } from '@/lib/mobile/use-read-recovery';

/** A hero slide or promo card, written in the admin panel. */
export type HomeBanner = {
  id: string;
  title: string;
  titleAccent: string | null;
  subtitle: string | null;
  badge: string | null;
  imageUrl: string | null;
  /** In-app route, e.g. `/app/sports?sport=badminton`. */
  link: string | null;
};

/** A sport with bookable courts, as the Home screen lists it. */
export type HomeSport = {
  id: string;
  /** `badminton` | `pickleball` | `cricket` | `football`, or null for an unknown sport. */
  key: string | null;
  name: string;
  courtCount: number;
  priceFrom: number;
  bookingsLast30Days: number;
  imageUrl: string | null;
};

export type HomeContent = {
  venue: { name: string; address: string | null } | null;
  banners: { hero: HomeBanner[]; promo: HomeBanner[] };
  sports: HomeSport[];
};

type HomeContentValue = {
  content: HomeContent;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const EMPTY: HomeContent = { venue: null, banners: { hero: [], promo: [] }, sports: [] };

const HomeContentContext = createContext<HomeContentValue | null>(null);

type LoadResult = { content: HomeContent | null; error: string | null; recoverable?: boolean };

/** Never throws: a failure comes back as `error` so the screen can keep the last content. */
async function fetchHomeContent(): Promise<LoadResult> {
  try {
    const res = (await api.get('/public/home')) as { data?: Partial<HomeContent> };
    const data = res?.data;
    if (!data) return { content: null, error: 'The server sent no home content.' };
    return {
      content: {
        venue: data.venue ?? null,
        banners: { hero: data.banners?.hero ?? [], promo: data.banners?.promo ?? [] },
        sports: data.sports ?? [],
      },
      error: null,
    };
  } catch (cause) {
    console.error('Failed to load home content', cause);
    return {
      content: null,
      error: cause instanceof Error ? cause.message : 'Could not load the home screen.',
      recoverable: isRetryableReadError(cause),
    };
  }
}

export function HomeContentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LoadResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchHomeContent().then((result) => {
      if (active) setState(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const result = await fetchHomeContent();
    // A failed refresh keeps whatever is already on screen.
    setState((current) => (result.content ? result : { ...result, content: current?.content ?? null }));
    setRefreshing(false);
  }, []);

  useReadRecovery(Boolean(state?.recoverable && !refreshing), refresh);

  // Content may have changed while the tab was in the background.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const value = useMemo<HomeContentValue>(
    () => ({
      content: state?.content ?? EMPTY,
      loading: state === null || refreshing,
      error: state?.error ?? null,
      refresh,
    }),
    [state, refreshing, refresh],
  );

  return <HomeContentContext.Provider value={value}>{children}</HomeContentContext.Provider>;
}

/** Home content. Returns empty content until the first load finishes. */
export function useHomeContent(): HomeContentValue {
  const value = useContext(HomeContentContext);
  if (!value) throw new Error('useHomeContent must be used inside a HomeContentProvider');
  return value;
}
