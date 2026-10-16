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
 */

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useSession } from './session-provider';

/** Returns whether the screen should hold its content back while it resolves. */
export function useRedirectWhenSignedIn(): { waiting: boolean } {
  const router = useRouter();
  const { user, restoring } = useSession();
  const signedIn = user !== null;

  useEffect(() => {
    if (restoring || !signedIn) return;
    router.replace('/app/home');
  }, [restoring, signedIn, router]);

  return { waiting: restoring || signedIn };
}

/** Returns whether the app screens should hold their content back. */
export function useAccountGate(): { waiting: boolean } {
  const router = useRouter();
  const { user, isGuest, restoring } = useSession();
  const allowed = user !== null || isGuest;

  useEffect(() => {
    if (restoring || allowed) return;
    router.replace('/app');
  }, [restoring, allowed, router]);

  return { waiting: restoring || !allowed };
}
