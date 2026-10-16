'use client';

/**
 * Email sign-in and sign-up — the web twins of `app/email-login.tsx` and
 * `app/email-signup.tsx`, on one screen because they are the same form with one
 * field added.
 *
 * Supabase owns the credential, so a new account is not usable until the link
 * in the confirmation email is opened. That outcome gets its own state rather
 * than a toast: the player has to be told to go and check their inbox, and
 * offered the resend when the mail never arrives.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthBackdrop } from '@/components/mobile/AuthBackdrop';
import { BrandLogo } from '@/components/mobile/BrandLogo';
import { Button } from '@/components/mobile/Button';
import { useSession } from '@/components/mobile/session-provider';
import { PasswordField, TextField } from '@/components/mobile/TextField';
import { TopBar } from '@/components/mobile/TopBar';
import { Card, ErrorNote, TextLink } from '@/components/mobile/ui';
import {
  resendConfirmationEmail,
  signInWithEmail,
  signUpWithEmail,
} from '@/lib/mobile/email-auth';
import { sessionUserFromSupabase } from '@/lib/mobile/identity';
import { isUsableReferralCode } from '@/lib/mobile/referral';
import { describeSupabaseError, getSupabaseClient, isSupabaseConfigured } from '@/lib/mobile/supabase';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';

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
    (mode === 'signin' || (fullName.trim().length >= 2 && (!referral || isUsableReferralCode(referral))));

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

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <AuthBackdrop />

      <div
        className="mobile-scroll"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: Spacing.lg,
          minHeight: '100%',
          padding: Spacing.four,
          paddingTop: `calc(env(safe-area-inset-top, 0px) + ${Spacing.md}px)`,
          paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${Spacing.five}px)`,
        }}>
        <TopBar
          title={mode === 'signin' ? 'Email sign-in' : 'Create an account'}
          subtitle="Play with your email ID and password"
        />

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <BrandLogo />
        </div>

        {awaitingConfirmation ? (
          <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
            <span style={{ ...Typography.blockTitle, color: Brand.text }}>
              Confirm your email address
            </span>
            <span style={{ ...Typography.body, color: Brand.textSecondary }}>
              We sent a confirmation link to <strong style={{ color: Brand.text }}>{email.trim()}</strong>.
              Open it, then come back here and sign in with the password you chose.
            </span>
            {error ? <ErrorNote message={error} /> : null}
            <Button label="Resend confirmation email" variant="secondary" onPress={() => void resend()} loading={busy} />
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
            <div
              role="tablist"
              aria-label="Sign in or sign up"
              style={{
                display: 'flex',
                gap: Spacing.xxs,
                padding: Spacing.xxs,
                borderRadius: Radius.pill,
                background: Brand.highlightWash,
                border: `1px solid ${Brand.cardBorder}`,
              }}>
              {(['signin', 'signup'] as const).map((option) => {
                const selected = mode === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    className="mobile-press"
                    onClick={() => {
                      setMode(option);
                      setError(null);
                    }}
                    style={{
                      flex: 1,
                      padding: `${Spacing.sm}px 0`,
                      borderRadius: Radius.pill,
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      ...Typography.label,
                      background: selected ? Brand.accent : 'transparent',
                      color: selected ? Brand.onAccent : Brand.textSecondary,
                    }}>
                    {option === 'signin' ? 'Sign in' : 'Create account'}
                  </button>
                );
              })}
            </div>

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
                onChange={setReferral}
                placeholder="A friend's code"
                hint="Applied when the account is created — it cannot be added later."
              />
            ) : null}

            {error ? <ErrorNote message={error} /> : null}

            <Button
              label={mode === 'signin' ? 'Sign in' : 'Create account'}
              onPress={() => void submit()}
              loading={busy}
              disabled={!ready}
            />

            <div style={{ textAlign: 'center' }}>
              <TextLink
                label={mode === 'signin' ? 'New to GameOn? Create an account' : 'Already have an account? Sign in'}
                size="sm"
                onPress={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                }}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
