'use client';

/**
 * Email sign-in and sign-up — the web twins of the Expo app's `email-login.tsx`
 * and `email-signup.tsx`.
 *
 * Both handset screens are one form with one field added, so they are one
 * component here; what stays separate is the **route**, because the handset has
 * two (`/email-login` and `/email-signup`) and a shared link to either must land
 * on the right one. The mode is therefore read from the path rather than kept in
 * local state, and the cross-link navigates between the two addresses — which is
 * also what keeps the address bar honest when a player switches.
 *
 * Supabase owns the credential, so a new account is not usable until the link in
 * the confirmation email is opened. That outcome gets its own state rather than a
 * toast: the player has to be told to go and check their inbox, and offered the
 * resend when the mail never arrives.
 */

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthBackdrop } from '@/components/mobile/auth/auth-backdrop';
import { AuthWait } from '@/components/mobile/auth/auth-wait';
import { PasswordField } from '@/components/mobile/auth/otp-input';
import { useSession } from '@/components/mobile/session-provider';
import { useRedirectWhenSignedIn } from '@/components/mobile/use-auth-guard';
import {
  AppHeader,
  Button,
  Card,
  InfoNote,
  Screen,
  ScreenScroll,
  TextField,
  TextLink,
} from '@/components/mobile/ui';
import {
  resendConfirmationEmail,
  signInWithEmail,
  signUpWithEmail,
} from '@/lib/mobile/email-auth';
import { sessionUserFromSupabase } from '@/lib/mobile/identity';
import { isUsableReferralCode } from '@/lib/mobile/referral';
import {
  describeSupabaseError,
  getSupabaseClient,
  isSupabaseConfigured,
} from '@/lib/mobile/supabase';
import { Brand, Spacing, Typography } from '@/lib/mobile/theme';

export type EmailMode = 'signin' | 'signup';

/** The address each mode lives at, so the two pages stay linkable. */
const EMAIL_PATHS: Record<EmailMode, string> = {
  signin: '/app/email-login',
  signup: '/app/email-signup',
};

/**
 * @param initialMode which page this is. Only a fallback: the path decides once
 * it is known, so navigating between the two routes re-reads the mode.
 */
export function EmailScreen({ initialMode }: { initialMode: EmailMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { signIn } = useSession();
  // A signed-in player has no business on a login screen.
  const { waiting } = useRedirectWhenSignedIn();

  const mode: EmailMode = pathname
    ? pathname.endsWith('/email-signup')
      ? 'signup'
      : 'signin'
    : initialMode;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referral, setReferral] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Set once a sign-up has been accepted and the confirmation mail is pending. */
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ready =
    emailLooksValid &&
    password.length >= 6 &&
    (mode === 'signin' ||
      (fullName.trim().length >= 2 && (!referral || isUsableReferralCode(referral))));

  /** Moves between the two pages, leaving the address bar telling the truth. */
  const switchMode = (next: EmailMode) => {
    setError(null);
    router.replace(EMAIL_PATHS[next]);
  };

  /** Mirrors the session Supabase just created into the app session. */
  const enterApp = async () => {
    const { data, error: sessionError } = await getSupabaseClient().auth.getUser();
    if (sessionError || !data.user) {
      throw sessionError ?? new Error('Supabase did not return a session for that account.');
    }
    signIn(sessionUserFromSupabase(data.user));
    router.replace('/app/home');
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!isSupabaseConfigured) {
        setError('Email sign-in is not configured on this deployment yet.');
        return;
      }
      if (mode === 'signin') {
        await signInWithEmail({ email, password });
        await enterApp();
        return;
      }

      const outcome = await signUpWithEmail({ fullName, email, password, referralCode: referral });
      if (outcome.kind === 'signed-in') {
        await enterApp();
        return;
      }
      if (outcome.kind === 'already-registered') {
        setError('That email already has a GameOn account. Sign in instead.');
        return;
      }
      setAwaitingConfirmation(true);
    } catch (thrown) {
      setError(describeSupabaseError(thrown));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError(null);
    try {
      await resendConfirmationEmail(email);
    } catch (thrown) {
      setError(describeSupabaseError(thrown));
    } finally {
      setBusy(false);
    }
  };

  if (waiting) return <AuthWait />;

  const signup = mode === 'signup';

  return (
    <Screen>
      <AuthBackdrop />
      <AppHeader
        variant="back"
        title={signup ? 'Create an account' : 'Email Login'}
        showLocation={false}
        showBell={false}
      />

      {/*
        Positioned on purpose: `AuthBackdrop` is an absolutely positioned layer
        behind this screen, and a positioned element paints above a static sibling
        whichever order they are in. Without this the backdrop would cover the form
        while the header — which is positioned — stayed visible.
      */}
      <ScreenScroll style={{ position: 'relative', zIndex: 1 }}>
        {awaitingConfirmation ? (
          <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
            <span style={{ ...Typography.blockTitle, color: Brand.text }}>
              Confirm your email address
            </span>
            <span style={{ ...Typography.body, color: Brand.textSecondary }}>
              We sent a confirmation link to{' '}
              <strong style={{ color: Brand.text }}>{email.trim()}</strong>. Open it, then come back
              here and sign in with the password you chose.
            </span>
            {error ? <InfoNote body={error} tone="danger" /> : null}
            <Button
              label="Resend confirmation email"
              variant="secondary"
              size="md"
              fullWidth
              onPress={() => void resend()}
              loading={busy}
            />
            <TextLink
              label="Back to sign in"
              onPress={() => {
                setAwaitingConfirmation(false);
                switchMode('signin');
              }}
            />
          </Card>
        ) : (
          <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
            {signup ? (
              <TextField
                label="Full name"
                value={fullName}
                onChange={setFullName}
                placeholder="Your name"
                autoComplete="name"
              />
            ) : null}

            <TextField
              label="Email address"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus={!signup}
            />

            <PasswordField
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="At least 6 characters"
              autoComplete={signup ? 'new-password' : 'current-password'}
              onEnter={() => {
                if (ready && !busy) void submit();
              }}
            />

            {signup ? (
              <TextField
                label="Referral code (optional)"
                value={referral}
                onChange={(value) =>
                  setReferral(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))
                }
                placeholder="A friend's code"
                error={!referral || isUsableReferralCode(referral) ? null : 'At least 6 characters.'}
                hint="Applied when the account is created — it cannot be added later."
              />
            ) : null}

            {error ? <InfoNote body={error} tone="danger" /> : null}

            <Button
              label={signup ? 'Create account' : 'Sign in'}
              size="md"
              fullWidth
              onPress={() => void submit()}
              loading={busy}
              disabled={!ready}
            />

            {/* The handset's own cross-links, one per screen. */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: Spacing.xs,
                flexWrap: 'wrap',
              }}>
              <span style={{ ...Typography.caption, color: Brand.textSecondary }}>
                {signup ? 'Already have an account?' : 'New to GameOn?'}
              </span>
              <TextLink
                label={signup ? 'Sign in' : 'Create an account'}
                onPress={() => switchMode(signup ? 'signin' : 'signup')}
              />
            </div>
          </Card>
        )}
      </ScreenScroll>
    </Screen>
  );
}