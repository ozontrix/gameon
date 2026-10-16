/**
 * Recheck a failed read without a new dependency or a permission prompt.
 *
 * The web twin of `use-read-recovery.ts`. A handset watches `AppState`; a
 * browser watches the same two signals it actually has — the connection coming
 * back, and the tab being returned to — plus a slow poll while the reader is
 * still failing.
 */

import { useEffect, useRef } from 'react';

export function useReadRecovery(failed: boolean, retry: () => void) {
  const latestRetry = useRef(retry);
  useEffect(() => {
    latestRetry.current = retry;
  }, [retry]);

  useEffect(() => {
    if (!failed || typeof window === 'undefined') return;

    const recover = () => latestRetry.current();
    const onVisible = () => {
      if (document.visibilityState === 'visible') recover();
    };

    // Bounded per-request retries run first. Only failed, mounted readers poll;
    // stop immediately after recovery, unmount or a new request.
    const timer = setInterval(recover, 15_000);
    window.addEventListener('online', recover);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', recover);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [failed]);
}
