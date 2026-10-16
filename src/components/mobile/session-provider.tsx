'use client';

/**
 * The session every mobile screen reads — the web twin of
 * `gameon-multisports/src/context/session.tsx`.
 *
 * Two providers prove an identity: Firebase (phone OTP, exchanged for a GameOn
 * phone session) and Supabase (email + password). They are kept side by side
 * and mirrored into one `SessionUser`, so no screen has to care which one it
 * was.
 *
 * §3 of the brief offers three ways in, one of which is guest sign-in that
 * "allows a user to browse the app without creating an account immediately" —
 * so a guest is a real mode, not a missing user, and the screens that need an
 * account prompt for one instead of bouncing to login.
 */

import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api } from '@/lib/mobile/api-client';
import { signOutOfSupabase } from '@/lib/mobile/email-auth';
import { sessionUserFromSupabase, type SessionUser } from '@/lib/mobile/identity';
import { fetchMyProfile, type Profile } from '@/lib/mobile/profiles';
import {
  clearPhoneSession,
  hasPhoneSession,
  phoneAccessToken,
  phoneSessionUser,
  restorePhoneSession,
  retryPhoneLogout,
  subscribePhoneSession,
} from '@/lib/mobile/phone-session';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/mobile/supabase';

export type { SessionUser } from '@/lib/mobile/identity';

/** How the current visitor entered the app. */
export type SessionMode = 'guest' | 'member';

type SessionValue = {
  mode: SessionMode;
  /** True while browsing without an account. */
  isGuest: boolean;
  /** The verified identity, once a phone OTP or an email sign-in was accepted. */
  user: SessionUser | null;
  /**
   * True until the stored session has been read. The auth screens wait on it,
   * so a signed-in player never sees the login screen on a cold start.
   */
  restoring: boolean;
  /** The player's row in `public.profiles`. */
  profile: Profile | null;
  /** True while the profile is being read for the first time. */
  profileLoading: boolean;
  /** Why the last profile read failed, if it did. */
  profileError: string | null;
  /** Re-reads the profile — call after saving it. */
  refreshProfile: () => void;
  /** Enter the app without an account. */
  continueAsGuest: () => void;
  /** Enter the app as a registered user (phone OTP or email). */
  signIn: (user?: SessionUser) => void;
  /** Leave the app; the caller navigates back to the login screen. */
  signOut: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Ends every session this device holds.
 *
 * Both providers are dropped: a player who verified a phone through Firebase and
 * an email through Supabase would otherwise leave one of them signed in. The
 * Firebase half is imported on demand so a guest browsing the app never fetches
 * that bundle.
 */
async function releaseSessions(): Promise<void> {
  const phoneLogout = clearPhoneSession().catch(() => {});
  const emailLogout = signOutOfSupabase().catch(() => {});
  try {
    const { signOutOfFirebase } = await import('@/lib/mobile/firebase');
    await Promise.allSettled([phoneLogout, signOutOfFirebase(), emailLogout]);
  } catch {
    // Leaving the app must never depend on a provider answering: the local
    // session is already cleared, and the next sign-in re-verifies anyway.
  }
  await Promise.allSettled([phoneLogout, emailLogout]);
}

/**
 * Defaults to `member` so a deep link into a screen resolves as it always has;
 * guest mode is set explicitly by the login screen's third option.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SessionMode>('member');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [restoring, setRestoring] = useState(true);

  /**
   * Supabase keeps its own session — and restores it from cookies on start — so
   * this mirrors it into the app session and every screen reads one truth.
   *
   * A null session must never clear a phone sign-in: that identity belongs to
   * Firebase, and Supabase knows nothing about it.
   */
  useEffect(() => {
    let active = true;
    let restoringPhone = true;
    let emailSession: Session | null = null;

    api.setUnauthorizedHandler(() => {
      if (hasPhoneSession()) void clearPhoneSession().catch(() => {});
    });

    // Every protected call borrows the credential that is actually live: the
    // renewable phone session when there is one, a Supabase access token
    // otherwise.
    api.setTokenProvider(async () => {
      if (hasPhoneSession()) return phoneAccessToken();
      if (!isSupabaseConfigured) return null;
      const { data, error } = await getSupabaseClient().auth.getSession();
      if (error) throw error;
      return data.session?.access_token ?? null;
    });

    const unsubscribePhone = subscribePhoneSession((session) => {
      if (!active) return;
      setUser(session ? phoneSessionUser(session) : null);
      setMode('member');
      if (!restoringPhone) setRestoring(false);
    });

    const adopt = (session: Session | null) => {
      emailSession = session;
      if (!active) return;
      if (restoringPhone || hasPhoneSession()) return;
      setRestoring(false);
      if (session?.user) {
        // Old fabricated phone refresh tokens must not be restored as email sessions.
        if (session.user.app_metadata?.provider === 'phone') {
          api.setToken(null);
          setUser(null);
          void getSupabaseClient().auth.signOut({ scope: 'local' });
          return;
        }
        setUser(sessionUserFromSupabase(session.user));
        setMode('member');
        api.setToken(session.access_token);
        return;
      }
      setUser((current) => {
        if (current) {
          api.setToken(null);
          return null;
        }
        return current;
      });
    };

    // `INITIAL_SESSION` is emitted on subscribe, but asking outright costs one
    // call and covers a client that was created before this provider mounted.
    const supabase = isSupabaseConfigured ? getSupabaseClient() : null;
    void supabase?.auth.getSession().then(({ data }) => adopt(data.session));
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => adopt(session)).data
      .subscription;

    void restorePhoneSession()
      .then((session) => {
        restoringPhone = false;
        if (!active) return;
        if (!session) adopt(emailSession);
        setRestoring(false);
        if (session) void phoneAccessToken().catch(() => {});
      })
      .catch(() => {
        restoringPhone = false;
        if (active) {
          adopt(emailSession);
          setRestoring(false);
        }
      });

    // A browser's equivalent of returning to the foreground: the tab does not
    // reload, so a queued logout and an ageing access token are settled here.
    const resume = () => {
      void retryPhoneLogout().catch(() => {});
      if (hasPhoneSession()) void phoneAccessToken().catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') resume();
    };
    resume();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      active = false;
      subscription?.unsubscribe();
      unsubscribePhone();
      document.removeEventListener('visibilitychange', onVisible);
      api.setTokenProvider(null);
      api.setUnauthorizedHandler(null);
    };
  }, []);

  /**
   * The profile row is a database read through the API, so it happens here —
   * outside the auth callback — and only when the identity itself changes, not
   * on every token refresh. The row is stored with the id it belongs to, so a
   * different account signing in can never briefly see the previous player's
   * details.
   */
  const userId = user?.id ?? null;

  const [loadedProfile, setLoadedProfile] = useState<{ userId: string; row: Profile | null } | null>(
    null,
  );
  const [profileError, setProfileError] = useState<string | null>(null);
  // Bumped by `refreshProfile()` to re-read after a save — the same tick pattern
  // the booking and wallet stores use.
  const [profileTick, setProfileTick] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    void fetchMyProfile()
      .then((row) => {
        if (!active) return;
        setProfileError(null);
        setLoadedProfile({ userId, row });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setProfileError(cause instanceof Error ? cause.message : 'Could not load your profile.');
        setLoadedProfile({ userId, row: null });
      });

    return () => {
      active = false;
    };
  }, [userId, profileTick]);

  const profile = userId && loadedProfile?.userId === userId ? loadedProfile.row : null;
  /** Nothing has come back for this account yet — including a failed attempt. */
  const profileLoading = Boolean(userId) && loadedProfile?.userId !== userId;
  const refreshProfile = useCallback(() => setProfileTick((tick) => tick + 1), []);

  const value = useMemo<SessionValue>(
    () => ({
      mode,
      isGuest: mode === 'guest',
      user,
      restoring,
      profile,
      profileLoading,
      profileError,
      refreshProfile,
      continueAsGuest: () => {
        void releaseSessions();
        setUser(null);
        setMode('guest');
        api.setToken(null);
      },
      signIn: (signedInUser?: SessionUser) => {
        setUser(signedInUser ?? null);
        setMode('member');
        if (signedInUser?.provider === 'email') {
          // Supabase keeps its token in the client, so fetch it asynchronously.
          void getSupabaseClient()
            .auth.getSession()
            .then(({ data }) => {
              if (data.session?.access_token) api.setToken(data.session.access_token);
            });
        }
      },
      signOut: () => {
        setUser(null);
        setMode('member');
        api.setToken(null);
        void releaseSessions();
      },
    }),
    [mode, user, restoring, profile, profileLoading, profileError, refreshProfile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** Reads the current session. Throws outside {@link SessionProvider}. */
export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside a SessionProvider');
  }
  return value;
}
