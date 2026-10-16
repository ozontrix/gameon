'use client';

/**
 * Phone (SMS OTP) sign-in — the web twin of `app/phone-login.tsx`.
 *
 * Two steps in one screen: the ten digits (with an optional referral code, which
 * the backend only applies to a brand-new account), then the six the SMS
 * carries. The code is verified by Firebase, and the ID token it issues is what
 * the GameOn backend exchanges for a renewable phone session — the number is
 * never taken on trust from this screen.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AuthBackdrop } from '@/components/mobile/auth/auth-backdrop';
import { OtpInput } from '@/components/mobile/auth/otp-input';
import { useSession } from '@/components/mobile/session-provider';
import {
  AppHeader,
  Button,
  Card,
  InfoNote,
  Screen,
  ScreenScroll,
  Spinner,
  TextField,
  TextLink,
} from '@/components/mobile/ui';
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
import { isUsableReferralCode } from '@/lib/mobile/referral';
import { Brand, Spacing, Typography } from '@/lib/mobile/theme';

/** How long the Resend link stays quiet after a code is sent. */
const RESEND_SECONDS = 30;

export default function PhoneLoginPage() {
  const router = useRouter();
  const { signIn } = useSession();

  const [step, setStep] = useState<'number' | 'code'>('number');
  const [number, setNumber] = useState('');
  const [referral, setReferral] = useState('');
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
  const referralValid = !referral || isUsableReferralCode(referral);

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
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const firebaseUser = await confirmPhoneOtp(code);
      // The backend verifies the ID token and mints the session; only then is
      // the number treated as proved. The referral code is read only when it
      // creates the account, so a returning player is never re-attributed.
      const exchanged = (await api.post('/auth/exchange', {
        firebaseToken: firebaseUser.idToken,
        ...(referral ? { referralCode: referral } : {}),
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
    <Screen>
      <AuthBackdrop />
      <AppHeader variant="back" title="Phone Login" showLocation={false} showBell={false} />

      <ScreenScroll>
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <span style={{ ...Typography.screenTitle, color: Brand.text }}>
            {step === 'number' ? 'What is your mobile number?' : 'Enter the 6-digit code'}
          </span>
          <span style={{ ...Typography.body, color: Brand.textSecondary }}>
            {step === 'number'
              ? "We'll text you a one-time password to verify it."
              : `Sent to ${maskPhoneNumber(digits)}. It may take a minute to arrive.`}
          </span>
        </div>

        <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          {step === 'number' ? (
            <>
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
                  if (digits.length === 10 && referralValid && !busy) void send();
                }}
              />
              <TextField
                label="Referral code (optional)"
                value={referral}
                onChange={(value) =>
                  setReferral(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))
                }
                placeholder="A friend's code"
                error={referralValid ? null : 'A code is at least 6 characters.'}
                hint="Applied only if this number is new to GameOn."
              />
            </>
          ) : (
            <OtpInput label="One-time password" value={code} onChange={setCode} autoFocus />
          )}

          {error ? <InfoNote body={error} tone="danger" title="Could not sign you in" /> : null}

          {step === 'number' ? (
            <Button
              label="Send OTP"
              size="md"
              fullWidth
              onPress={() => void send()}
              loading={busy}
              disabled={digits.length !== 10 || !referralValid}
            />
          ) : (
            <>
              <Button
                label="Verify & Continue"
                size="md"
                fullWidth
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
            color: Brand.textMuted,
            ...Typography.caption,
          }}>
          {busy ? <Spinner size={16} /> : null}
          <span>Protected by Google reCAPTCHA. Your number is never shared.</span>
        </div>
      </ScreenScroll>
    </Screen>
  );
}
