'use client';

/**
 * Email sign-in and sign-up on one screen — the web twins of `email-login.tsx`
 * and `email-signup.tsx`, which are the same form with one field added.
 *
 * Supabase owns the credential, so a new account is not usable until the link in
 * the confirmation email is opened. That outcome gets its own state rather than a
 * toast: the player has to be told to go and check their inbox, and offered the
 * resend when the mail never arrives.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthBackdrop } from '@/components/mobile/auth/auth-backdrop';
import { PasswordField } from '@/components/mobile/auth/otp-input';
import { useSession } from '@/components/mobile/session-provider';
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

type Mode = 'signin' | 'signup';

export default function EmailLoginPage() {
  const router = useRouter();
  const { signIn } = useSession();

  const [mode, setMode] = useState<Mode>('signin');
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
        setMode('signin');
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

  /** The inset Sign in / Create account switcher. */
  const switcher = (
    <div
      role="tablist"
      aria-label="Sign in or sign up"
      style={{
        display: 'flex',
        gap: Spacing.xs,
        borderRadius: 12,
        border: `1px solid ${Brand.cardBorder}`,
        backgroundColor: Brand.backgroundElement,
        padding: Spacing.xs,
      }}>
      {(['signin', 'signup'] as const).map((option) => {
        const active = mode === option;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={active}
            className="mobile-press"
            onClick={() => {
              setMode(option);
              setError(null);
            }}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              ...Typography.label,
              backgroundColor: active ? Brand.accentSoft : 'transparent',
              color: active ? Brand.accent : Brand.textSecondary,
            }}>
            {option === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        );
      })}
    </div>
  );

  return (
    <Screen>
      <AuthBackdrop />
      <AppHeader
        variant="back"
        title={mode === 'signin' ? 'Email Login' : 'Create an account'}
        showLocation={false}
        showBell={false}
      />

      <ScreenScroll>
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
                setMode('signin');
                setError(null);
              }}
            />
          </Card>
        ) : (
          <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
            {switcher}

            {mode === 'signup' ? (
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
              autoFocus={mode === 'signin'}
            />

            <PasswordField
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="At least 6 characters"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              onEnter={() => {
                if (ready && !busy) void submit();
              }}
            />

            {mode === 'signup' ? (
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
              label={mode === 'signin' ? 'Sign in' : 'Create account'}
              size="md"
              fullWidth
              onPress={() => void submit()}
              loading={busy}
              disabled={!ready}
            />
          </Card>
        )}
      </ScreenScroll>
    </Screen>
  );
}
