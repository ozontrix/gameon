'use client';

/**
 * The bookable cards behind the Sports tab and the sport detail screen — the
 * web twin of the app `context/sports-catalog.tsx`.
 *
 * Public content, so it loads for guests too, and it is shared: the Sports list,
 * the search shortcut and the booking draft all resolve venues from the same
 * fetch rather than re-requesting it.
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

import { api, isRetryableReadError } from '@/lib/mobile/api-client';
import { useReadRecovery } from '@/lib/mobile/use-read-recovery';
import { SPORT_PHOTOS, type Venue } from '@/lib/mobile/constants/sports';

/** The shape `image`/`gallery` arrive in before the SPORT_PHOTOS fallback is applied. */
type ApiVenue = Omit<Venue, 'image' | 'gallery'> & { image: string | null; gallery: string[] };

/** The backend leaves `image`/`gallery` empty when a sport has no photo set yet. */
function fromApi(card: ApiVenue): Venue {
  const image = card.image || SPORT_PHOTOS[card.sport];
  return { ...card, image, gallery: card.gallery.length > 0 ? card.gallery : [image] };
}

/**
 * Fetches the catalog, optionally scoped by the same query params the backend's
 * `GET /public/sports/catalog` understands (sport, surface, setting, climate,
 * court, sort). Exported so the Sports tab can re-request it with `?sport=` when
 * a chip is picked, running the exact same request the shared context does.
 */
export async function fetchSportsCatalog(query?: string): Promise<Venue[]> {
  const res = (await api.get(`/public/sports/catalog${query ? `?${query}` : ''}`)) as {
    data?: unknown;
  };
  return Array.isArray(res?.data) ? (res.data as ApiVenue[]).map(fromApi) : [];
}

/**
 * Fetches one card directly by its route param, against
 * `GET /public/sports/catalog/:id` — the real backend entity a tapped card
 * resolves to, rather than a client-side search over an already-fetched list.
 * `null` for an id the backend does not recognise.
 */
export async function fetchSportsCatalogCard(id: string): Promise<Venue | null> {
  try {
    const res = (await api.get(`/public/sports/catalog/${id}`)) as { data?: unknown };
    return res?.data ? fromApi(res.data as ApiVenue) : null;
  } catch (cause) {
    console.error('Failed to load sports catalog card', cause);
    return null;
  }
}

type SportsCatalogValue = {
  cards: Venue[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Looks a card up by its route param; `undefined` for an unknown key. */
  findCard: (key?: string) => Venue | undefined;
};

const SportsCatalogContext = createContext<SportsCatalogValue | null>(null);

type LoadResult = { cards: Venue[] | null; error: string | null; recoverable?: boolean };

/** Never throws: a failure comes back as `error` so the screen keeps the last catalog. */
async function fetchCatalog(): Promise<LoadResult> {
  try {
    return { cards: await fetchSportsCatalog(), error: null };
  } catch (cause) {
    console.error('Failed to load sports catalog', cause);
    return {
      cards: null,
      error: cause instanceof Error ? cause.message : 'Could not load sports.',
      recoverable: isRetryableReadError(cause),
    };
  }
}

export function SportsCatalogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LoadResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchCatalog().then((result) => {
      if (active) setState(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const result = await fetchCatalog();
    // A failed refresh keeps whatever is already on screen.
    setState((current) => (result.cards ? result : { ...result, cards: current?.cards ?? null }));
    setRefreshing(false);
  }, []);

  useReadRecovery(Boolean(state?.recoverable && !refreshing), refresh);

  const cards = useMemo(() => state?.cards ?? [], [state]);

  const value = useMemo<SportsCatalogValue>(
    () => ({
      cards,
      loading: state === null || refreshing,
      error: state?.error ?? null,
      refresh,
      findCard: (key) => (key ? cards.find((card) => card.key === key) : undefined),
    }),
    [cards, state, refreshing, refresh],
  );

  return <SportsCatalogContext.Provider value={value}>{children}</SportsCatalogContext.Provider>;
}

export function useSportsCatalog(): SportsCatalogValue {
  const value = useContext(SportsCatalogContext);
  if (!value) throw new Error('useSportsCatalog must be used inside a SportsCatalogProvider');
  return value;
}

/**
 * One card, fetched directly by id — what the sport detail screen resolves its
 * `/app/sport/[id]` route param against. Independent of whether the shared
 * catalog list has finished loading, so a deep link straight into the screen is
 * not stuck waiting on a fetch it does not need.
 */
export function useSportsCatalogCard(id: string | undefined) {
  const [card, setCard] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  // Guards against a stale response landing after `id` has moved on, or after a
  // manual refetch — only the most recently started call may commit its result.
  const requestId = useRef(0);

  useEffect(() => {
    if (!id) return;
    const thisRequest = (requestId.current += 1);
    let active = true;

    void (async () => {
      setLoading(true);
      const result = await fetchSportsCatalogCard(id);
      if (!active || requestId.current !== thisRequest) return;
      setCard(result);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [id]);

  const refetch = useCallback(async () => {
    if (!id) return;
    const thisRequest = (requestId.current += 1);
    setLoading(true);
    const result = await fetchSportsCatalogCard(id);
    if (requestId.current !== thisRequest) return;
    setCard(result);
    setLoading(false);
  }, [id]);

  return { card, loading, refetch };
}
