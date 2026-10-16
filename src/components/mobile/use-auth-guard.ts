'use client';

/**
 * The two navigational rules the app has, both about who may see what.
 *
 * `useRedirectWhenSignedIn` keeps a signed-in player off the auth screens.
 * Nothing else stops one reaching them — a cold start lands on the login screen
 * before the stored session is read, and the browser's back button returns to
 * it after signing in. Both end with a signed-in player looking at a login form.
 *
 * `useAccountGate` is the mirror image for the tabbed app: browsing needs either
 * a verified identity or the guest mode the login screen sets explicitly, so a
 * direct visit to a deep link with no session is sent to the login screen rather
 * than shown an empty dashboard.
 *
 * Both gates wait for `restoring` before they act, and that wait is **bounded** —
 * see {@link useBoundedRestoring}. On a handset the read is a keychain hit inside
 * the same process; in a browser it depends on a script arriving and running, so
 * an unbounded wait is a way to lose the whole app to a single stalled bundle.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useSession } from './session-provider';

/**
 * How long a screen holds its content back for the session read. The read itself
 * is a `localStorage` lookup that finishes in a millisecond, so reaching this
 * bound means the client is in trouble (a stale bundle, a blocked script), not
 * that the player is slow.
 */
const RESTORE_PATIENCE_MS = 1_500;

/** `restoring`, but never for longer than {@link RESTORE_PATIENCE_MS}. */
function useBoundedRestoring(restoring: boolean): boolean {
  const [patienceSpent, setPatienceSpent] = useState(false);

  useEffect(() => {
    if (!restoring || patienceSpent) return;
    const timer = setTimeout(() => setPatienceSpent(true), RESTORE_PATIENCE_MS);
    return () => clearTimeout(timer);
  }, [restoring, patienceSpent]);

  return restoring && !patienceSpent;
}

/** Returns whether the screen should hold its content back while it resolves. */
export function useRedirectWhenSignedIn(): { waiting: boolean } {
  const router = useRouter();
  const { user, restoring } = useSession();
  const signedIn = user !== null;

  useEffect(() => {
    if (restoring || !signedIn) return;
    router.replace('/app/home');
  }, [restoring, signedIn, router]);

  /**
   * Held back only once we *know* someone is signed in — at which point the
   * redirect above is already in flight.
   *
   * Deliberately **not** held back for the session read itself. A browser cannot
   * know the session before it runs, so gating on it means the server sends a
   * spinner where the login form should be, and the form only appears if the
   * client bundle arrives and executes. When that does not happen — a stale
   * build, a blocked script, a slow connection — a login screen that renders its
   * form and cannot be reached is indistinguishable from one that was deleted.
   * The cost of this choice is one frame of the form for a player who is already
   * signed in, immediately before they are redirected.
   */
  return { waiting: signedIn };
}


/** Returns whether the app screens should hold their content back. */
export function useAccountGate(): { waiting: boolean } {
  const router = useRouter();
  const { user, isGuest, restoring } = useSession();
  const allowed = user !== null || isGuest;
  const waiting = useBoundedRestoring(restoring);

  useEffect(() => {
    if (restoring || allowed) return;
    router.replace('/app');
  }, [restoring, allowed, router]);

  return { waiting: waiting || !allowed };
}

