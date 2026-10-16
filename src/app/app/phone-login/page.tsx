'use client';

/**
 * Phone (SMS OTP) sign-in — `/app/phone-login`. The web twin of the handset app's
 * `app/phone-login.tsx`, laid out the same way: **no app header**, but a bare top
 * bar carrying a back chevron, the brand mark and the step counter, then the
 * "WELCOME TO GAMEON" badge, the headline, and the two field cards.
 *
 * The onboarding is one screen in two steps: the ten digits (with the optional
 * referral code the backend applies only to a brand-new account), then the six the
 * SMS carries. Firebase verifies the code and the GameOn backend exchanges its ID
 * token for a renewable session, so the number is never taken on trust from here.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AuthBackdrop } from '@/components/mobile/auth/auth-backdrop';
import { AuthWait } from '@/components/mobile/auth/auth-wait';
import { BrandLogo } from '@/components/mobile/auth/brand-logo';
import { ShieldCheckIcon } from '@/components/mobile/auth/icons';
import { OtpInput } from '@/components/mobile/auth/otp-input';
import { useSession } from '@/components/mobile/session-provider';
import { useRedirectWhenSignedIn } from '@/components/mobile/use-auth-guard';
import { Button, InfoNote, Ion, Screen, ScreenScroll } from '@/components/mobile/ui';
import { api, ApiError } from '@/lib/mobile/api-client';
import { sessionUserFromPhone } from '@/lib/mobile/identity';
import { adoptPhoneSession, type ExchangeResponse } from '@/lib/mobile/phone-session';
import { PhoneCountryCode } from '@/lib/mobile/phone-auth-common';
import {
  confirmPhoneOtp,
  maskPhoneNumber,
  PhoneAuthError,
  resetPhoneAuth,
  sendPhoneOtp,
} from '@/lib/mobile/phone-auth';
import { isUsableReferralCode } from '@/lib/mobile/referral';
import { Brand, InputText, Radius, Spacing } from '@/lib/mobile/theme';

/** How long the Resend link stays quiet after a code is sent. */
const RESEND_SECONDS = 30;

/** The six digits the SMS carries. */
const PIN_LENGTH = 6;

/** The policy pages Google asks to be linked wherever its badge is not shown. */
const RECAPTCHA_POLICY_URL = 'https://policies.google.com/privacy';
const RECAPTCHA_TERMS_URL = 'https://policies.google.com/terms';

/** The back chevron the auth screens share: a round, washed-out target. */
const BACK_BUTTON: React.CSSProperties = {
  width: 36,
  height: 36,
  flexShrink: 0,
  borderRadius: 18,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: Brand.highlightWash,
  border: `1px solid ${Brand.highlightSoft}`,
  cursor: 'pointer',
};

export default function PhoneLoginPage() {
  const router = useRouter();
  const { signIn } = useSession();
  // A signed-in player has no business on a login screen.
  const { waiting } = useRedirectWhenSignedIn();

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
  const numberValid = digits.length === 10;
  const codeValid = code.length === PIN_LENGTH;
  const referralValid = !referral || isUsableReferralCode(referral);

  // Every hook above this point, so the early return below is not conditional.
  if (waiting) return <AuthWait />;

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
      // The backend verifies the ID token and mints the session; only then is the
      // number treated as proved. The referral code is read only when it creates
      // the account, so a returning player is never re-attributed.
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

  /** Back on step 2 returns to the number; back on step 1 leaves the screen. */
  const goBack = () => {
    if (step === 'code') {
      setStep('number');
      setCode('');
      setError(null);
      setSecondsLeft(0);
      return;
    }
    resetPhoneAuth();
    setError(null);
    router.back();
  };

  return (
    <Screen>
      <AuthBackdrop />

      {/* Top bar: back, the brand mark, and where we are in the two steps. */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: Spacing.three,
          paddingLeft: Spacing.four,
          paddingRight: Spacing.four,
          paddingTop: `calc(env(safe-area-inset-top, 0px) + ${Spacing.three}px)`,
          paddingBottom: Spacing.three,
        }}>
        <button
          type="button"
          aria-label="Go back"
          onClick={goBack}
          className="mobile-press"
          style={BACK_BUTTON}>
          <Ion name="chevronBack" size={22} color={Brand.text} />
        </button>

        <BrandLogo size={18} />

        <span
          style={{
            marginLeft: 'auto',
            color: Brand.textMuted,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.1,
          }}>
          {step === 'number' ? 'STEP 1 OF 2' : 'STEP 2 OF 2'}
        </span>
      </div>

      <ScreenScroll
        gutter={false}
        style={{ position: 'relative', zIndex: 1 }}
        contentStyle={{
          paddingTop: 0,
          paddingLeft: Spacing.four,
          paddingRight: Spacing.four,
          paddingBottom: Spacing.five,
        }}>
        {step === 'number' ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'center',
                gap: 7,
                paddingLeft: Spacing.three,
                paddingRight: Spacing.three,
                paddingTop: 7,
                paddingBottom: 7,
                borderRadius: Radius.pill,
                backgroundColor: Brand.accentSoft,
                border: `1px solid ${Brand.accentGlow}`,
              }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Brand.accent }} />
              <span style={{ color: Brand.accent, fontSize: 11, fontWeight: 800, letterSpacing: 1.2 }}>
                WELCOME TO GAMEON
              </span>
            </div>

            <div
              style={{
                marginTop: Spacing.five,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
              }}>
              <span style={{ color: Brand.text, fontSize: 27, fontWeight: 800, textAlign: 'center' }}>
                Let’s get you<span style={{ color: Brand.accent }}> in</span>
              </span>
              <span
                style={{
                  color: Brand.textSecondary,
                  fontSize: 14,
                  lineHeight: '21px',
                  textAlign: 'center',
                  maxWidth: 300,
                }}>
                Enter your mobile number and we’ll text you a one-time password to verify it.
              </span>
            </div>

            {/* The mobile number, with the dial code the handset shows. */}
            <div
              style={{
                marginTop: Spacing.five,
                marginBottom: Spacing.xl,
                backgroundColor: Brand.card,
                border: `1px solid ${Brand.cardBorder}`,
                borderRadius: 18,
                padding: Spacing.four,
                display: 'flex',
                flexDirection: 'column',
                gap: Spacing.two,
              }}>
              <span
                style={{ color: Brand.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1.1 }}>
                MOBILE NUMBER
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.three }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {/* The flag pairs with `NEXT_PUBLIC_PHONE_COUNTRY_CODE` (India). */}
                  <span style={{ fontSize: 18 }}>🇮🇳</span>
                  <span style={{ color: Brand.text, fontSize: 16, fontWeight: 700 }}>
                    +{PhoneCountryCode}
                  </span>
                </span>

                <span style={{ width: 1, height: 24, backgroundColor: Brand.cardBorder }} />

                <input
                  className="mobile-input"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  autoFocus
                  aria-label="Mobile number"
                  value={number}
                  onChange={(event) => setNumber(event.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && numberValid && referralValid && !busy) void send();
                  }}
                  placeholder="Enter 10-digit number"
                  style={{ ...InputText.lg, flex: 1, color: Brand.text }}
                />

                {numberValid ? (
                  <span style={{ marginLeft: 'auto', display: 'inline-flex' }}>
                    <Ion name="checkmarkCircle" size={20} color={Brand.accent} />
                  </span>
                ) : null}
              </div>

              <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: Spacing.one }}>
                <Ion name="informationCircleOutline" size={13} color={Brand.textSecondary} />
                <span style={{ color: Brand.textSecondary, fontSize: 12 }}>
                  We’ll send a 6-digit OTP to this number.
                </span>
              </span>
            </div>

            {/* The referral code, so a friend is credited on a new account. */}
            <div
              style={{
                marginTop: Spacing.three,
                backgroundColor: Brand.card,
                border: `1px solid ${Brand.cardBorder}`,
                borderRadius: 18,
                padding: Spacing.four,
                display: 'flex',
                flexDirection: 'column',
                gap: Spacing.two,
              }}>
              <span
                style={{ color: Brand.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1.1 }}>
                REFERRAL CODE (OPTIONAL)
              </span>

              <input
                className="mobile-input"
                autoCapitalize="characters"
                autoCorrect="off"
                aria-label="Referral code"
                value={referral}
                onChange={(event) =>
                  setReferral(
                    event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12),
                  )
                }
                placeholder="Invited by a friend?"
                style={{ ...InputText.lg, color: Brand.text }}
              />

              <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: Spacing.one }}>
                <Ion name="giftOutline" size={13} color={Brand.textSecondary} />
                <span style={{ color: Brand.textSecondary, fontSize: 12 }}>
                  New to GameOn? A friend earns Points once you complete your first booking.
                </span>
              </span>
            </div>

            {error ? (
              <div style={{ marginTop: Spacing.three }}>
                <InfoNote tone="danger" body={error} />
              </div>
            ) : null}

            <div style={{ marginTop: Spacing.four }}>
              <Button
                label="Send OTP"
                onPress={() => void send()}
                disabled={!numberValid || !referralValid}
                loading={busy}
                fullWidth
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                marginTop: Spacing.four,
                paddingLeft: Spacing.two,
                paddingRight: Spacing.two,
              }}>
              <ShieldCheckIcon size={16} color={Brand.accent} />
              <span style={{ flex: 1, color: Brand.textSecondary, fontSize: 12, lineHeight: '17px' }}>
                Your number is safe with us. By continuing you agree to our Terms &amp; Privacy
                Policy.
              </span>
            </div>

            {/* Google asks to be credited wherever its badge cannot be shown. */}
            <div
              style={{
                color: Brand.textMuted,
                fontSize: 11,
                lineHeight: '15px',
                textAlign: 'center',
                marginTop: Spacing.two,
                paddingLeft: Spacing.three,
                paddingRight: Spacing.three,
              }}>
              {'Protected by reCAPTCHA. Google’s '}
              <a
                href={RECAPTCHA_POLICY_URL}
                target="_blank"
                rel="noreferrer"
                style={{ color: Brand.accent, textDecoration: 'underline' }}>
                Privacy Policy
              </a>
              {' and '}
              <a
                href={RECAPTCHA_TERMS_URL}
                target="_blank"
                rel="noreferrer"
                style={{ color: Brand.accent, textDecoration: 'underline' }}>
                Terms of Service
              </a>
              {' apply.'}
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: Spacing.two,
                marginBottom: Spacing.four,
              }}>
              <span
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: Brand.accent,
                  boxShadow: `0 9px 18px ${Brand.accentGlow}`,
                }}>
                <Ion name="checkmark" size={30} color={Brand.onAccent} />
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <span style={{ color: Brand.text, fontSize: 27, fontWeight: 800, textAlign: 'center' }}>
                Verify the<span style={{ color: Brand.accent }}> code</span>
              </span>
              <span
                style={{
                  color: Brand.textSecondary,
                  fontSize: 14,
                  lineHeight: '21px',
                  textAlign: 'center',
                  maxWidth: 300,
                }}>
                We sent a 6-digit OTP to{' '}
                <strong style={{ color: Brand.text, fontWeight: 700 }}>
                  {maskPhoneNumber(digits)}
                </strong>
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: Spacing.three,
                marginBottom: Spacing.three,
              }}>
              <button
                type="button"
                onClick={goBack}
                className="mobile-link"
                style={{
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: Brand.textSecondary,
                  fontSize: 13,
                }}>
                Wrong number? Edit
              </button>
            </div>

            <div style={{ marginBottom: Spacing.five }}>
              <OtpInput value={code} onChange={setCode} length={PIN_LENGTH} autoFocus error={error} />
            </div>

            <Button
              label="Verify OTP"
              onPress={() => void verify()}
              disabled={!codeValid}
              loading={busy}
              fullWidth
            />

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: Spacing.four }}>
              {busy && secondsLeft <= 0 ? (
                <span style={{ color: Brand.textSecondary, fontSize: 13 }}>
                  Sending a new code…
                </span>
              ) : secondsLeft > 0 ? (
                <span style={{ color: Brand.textSecondary, fontSize: 13 }}>
                  Didn’t get the code?{' '}
                  <strong style={{ color: Brand.text, fontWeight: 700 }}>
                    Resend in 0:{String(secondsLeft).padStart(2, '0')}
                  </strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!busy) void send();
                  }}
                  className="mobile-link"
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    color: Brand.accent,
                    fontSize: 13,
                    fontWeight: 700,
                  }}>
                  Didn’t get the code? Resend OTP
                </button>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: Spacing.four,
              }}>
              <ShieldCheckIcon size={16} color={Brand.accent} />
              <span style={{ color: Brand.textSecondary, fontSize: 12, lineHeight: '17px' }}>
                Never share this code with anyone.
              </span>
            </div>
          </>
        )}
      </ScreenScroll>
    </Screen>
  );
}
