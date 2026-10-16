/**
 * Reads one API endpoint into component state — the web twin of
 * `gameon-multisports/src/lib/use-api.ts`.
 *
 * The one behaviour worth spelling out: the cache key includes the signed-in
 * user's id for `/user/…` reads, so signing out or switching accounts never
 * shows the previous player's data while the new request is in flight.
 */

import { useCallback, useEffect, useState } from 'react';

import { api, isRetryableReadError } from './api-client';
import { useReadRecovery } from './use-read-recovery';
import { useSession } from '@/components/mobile/session-provider';

export function useApi<T>(endpoint: string | null) {
  const { user } = useSession();
  const key = endpoint
    ? `${endpoint}|${endpoint.startsWith('/user/') ? user?.id ?? 'none' : 'public'}`
    : null;
  const [state, setState] = useState<{
    key: string | null;
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({ key: null, data: null, loading: false, error: null });
  // Bumped by `refetch()` to force the effect below to re-run against the same
  // endpoint — a pull-to-refresh has nothing else to change to trigger it.
  const [reloadTick, setReloadTick] = useState(0);
  const [recoverKey, setRecoverKey] = useState<string | null>(null);
  const refetch = useCallback(() => setReloadTick((tick) => tick + 1), []);
  useReadRecovery(Boolean(key && recoverKey === key && !state.loading), refetch);

  useEffect(() => {
    if (!endpoint || !key) return;

    let mounted = true;
    const controller = new AbortController();

    const fetchData = async () => {
      await Promise.resolve();
      if (!mounted) return;
      setRecoverKey(null);
      setState((current) => ({
        key,
        data: current.key === key ? current.data : null,
        loading: true,
        error: null,
      }));
      try {
        const response = await api.get(endpoint, { signal: controller.signal });
        if (mounted) {
          setState({ key, data: (response as { data: T }).data, loading: false, error: null });
        }
      } catch (err) {
        if (mounted) {
          setRecoverKey(isRetryableReadError(err) ? key : null);
          setState((current) => ({
            ...current,
            key,
            loading: false,
            error: err instanceof Error ? err.message : 'An error occurred',
          }));
        }
      }
    };

    void fetchData();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [endpoint, key, reloadTick]);

  const mutate = useCallback(
    (value: T | null | ((current: T | null) => T | null)) => {
      setState((current) => ({
        key,
        data:
          typeof value === 'function'
            ? (value as (current: T | null) => T | null)(current.key === key ? current.data : null)
            : value,
        loading: false,
        error: null,
      }));
    },
    [key],
  );

  const mine = key !== null && state.key === key;
  return {
    data: mine ? state.data : null,
    loading: key !== null && (!mine || state.loading),
    error: mine ? state.error : null,
    mutate,
    refetch,
  };
}
