'use client';

/**
 * Phone (SMS OTP) sign-in — the web twin of `app/phone-login.tsx`.
 *
 * Two steps in one screen: the ten digits, then the six the SMS carries. The
 * code is verified by Firebase, and the ID token it issues is what the GameOn
 * backend exchanges for a renewable phone session — the number is never taken
 * on trust from this screen.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AuthBackdrop } from '@/components/mobile/AuthBackdrop';
import { BrandLogo } from '@/components/mobile/BrandLogo';
import { Button } from '@/components/mobile/Button';
import { useSession } from '@/components/mobile/session-provider';
import { CodeField, TextField } from '@/components/mobile/TextField';
import { TopBar } from '@/components/mobile/TopBar';
import { Card, ErrorNote, Spinner, TextLink } from '@/components/mobile/ui';
import { api, ApiError } from '@/lib/mobile/api-client';
import { sessionUserFromPhone } from '@/lib/mobile/identity';
import { adoptPhoneSession, type ExchangeResponse } from '@/lib/mobile/phone-session';
import {
  confirmPhoneOtp,
  maskPhoneNumber,
  PhoneAuthError,
  resetPhoneAuth,
  sendPhoneOtp,
} from '@/lib/mobile/phone-auth';
import { Brand, Spacing, Typography } from '@/lib/mobile/theme';

/** How long the Resend link stays quiet after a code is sent. */
const RESEND_SECONDS = 30;

export default function PhoneLoginPage() {
  const router = useRouter();
  const { signIn } = useSession();

  const [step, setStep] = useState<'number' | 'code'>('number');
  const [number, setNumber] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Countdown to the next allowed resend, ticked one second at a time.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1_000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Leaving the screen must not leave a spent reCAPTCHA widget behind.
  useEffect(() => () => resetPhoneAuth(), []);

  const digits = number.replace(/\D/g, '').slice(0, 10);

  /** Turns any failure into the one line the screen shows. */
  const describe = (thrown: unknown) =>
    thrown instanceof PhoneAuthError || thrown instanceof ApiError
      ? thrown.message
      : 'Something went wrong. Please try again.';

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await sendPhoneOtp(digits);
      setCode('');
      setStep('code');
      setSecondsLeft(RESEND_SECONDS);
    } catch (thrown) {
      setError(describe(thrown));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const firebaseUser = await confirmPhoneOtp(code);
      // The backend verifies the ID token and mints the session; only then is
      // the number treated as proved.
      const exchanged = (await api.post('/auth/exchange', {
        firebaseToken: firebaseUser.idToken,
      })) as ExchangeResponse;
      await adoptPhoneSession(exchanged);
      signIn(sessionUserFromPhone(firebaseUser));
      router.replace('/app/home');
    } catch (thrown) {
      setError(describe(thrown));
      setBusy(false);
    }
  };

  const editNumber = () => {
    resetPhoneAuth();
    setStep('number');
    setCode('');
    setError(null);
    setSecondsLeft(0);
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
        <TopBar title="Phone sign-in" subtitle="Verify your mobile number" />

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <BrandLogo />
        </div>

        <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xxs }}>
            <span style={{ ...Typography.blockTitle, color: Brand.text }}>
              {step === 'number' ? 'What is your mobile number?' : 'Enter the 6-digit code'}
            </span>
            <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>
              {step === 'number'
                ? "We'll text you a one-time password to verify it."
                : `Sent to ${maskPhoneNumber(digits)}. It may take a minute to arrive.`}
            </span>
          </div>

          {step === 'number' ? (
            <TextField
              label="Mobile number"
              prefix="+91"
              value={number}
              onChange={(value) => setNumber(value.replace(/\D/g, '').slice(0, 10))}
              placeholder="98765 43210"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              autoFocus
              onEnter={() => {
                if (digits.length === 10 && !busy) void send();
              }}
            />
          ) : (
            <CodeField label="One-time password" value={code} onChange={setCode} autoFocus />
          )}

          {error ? <ErrorNote message={error} /> : null}

          {step === 'number' ? (
            <Button
              label="Send OTP"
              onPress={() => void send()}
              loading={busy}
              disabled={digits.length !== 10}
            />
          ) : (
            <>
              <Button
                label="Verify & Continue"
                onPress={() => void verify()}
                loading={busy}
                disabled={code.length !== 6}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: Spacing.md,
                }}>
                <TextLink label="Wrong number? Edit" size="sm" onPress={editNumber} />
                {secondsLeft > 0 ? (
                  <span style={{ ...Typography.caption, color: Brand.textMuted }}>
                    Resend in {secondsLeft}s
                  </span>
                ) : (
                  <TextLink
                    label="Resend OTP"
                    size="sm"
                    onPress={() => {
                      if (!busy) void send();
                    }}
                  />
                )}
              </div>
            </>
          )}
        </Card>

        <div
          style={{
            display: 'flex',
            gap: Spacing.sm,
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: Brand.textMuted,
            ...Typography.caption,
          }}>
          {busy ? <Spinner size={16} /> : null}
          <span>Protected by Google reCAPTCHA. Your number is never shared.</span>
        </div>
      </div>
    </div>
  );
}
