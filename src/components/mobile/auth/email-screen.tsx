'use client';

/**
 * Email sign-in and sign-up — the web twins of the handset app's `email-login.tsx`
 * and `email-signup.tsx`.
 *
 * Both handset screens are one form with three fields added, so they are one
 * component here; what stays separate is the **route**, because the handset has two
 * (`/email-login`, `/email-signup`) and a shared link must land on the right one.
 * The mode is read from the path rather than kept in state, so the cross-links can
 * navigate between the two addresses and leave the address bar honest.
 *
 * The chrome is the handset's, not the app header's: sign-in opens with the centred
 * brand mark and its heading, while sign-up carries the two-step top bar — back,
 * brand mark, "STEP 1 OF 2" — because it has a confirmation step to report.
 */

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthBackdrop } from '@/components/mobile/auth/auth-backdrop';
import { AuthWait } from '@/components/mobile/auth/auth-wait';
import { BrandLogo } from '@/components/mobile/auth/brand-logo';
import { ShieldCheckIcon } from '@/components/mobile/auth/icons';
import { PasswordField } from '@/components/mobile/auth/otp-input';
import { useSession } from '@/components/mobile/session-provider';
import { useRedirectWhenSignedIn } from '@/components/mobile/use-auth-guard';
import {
  Button,
  InfoNote,
  Ion,
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

/** What Supabase will accept, checked here so the error arrives before a request. */
const MIN_PASSWORD_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The round, washed-out back target the auth screens share. */
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

/** The centred heading both handset email screens open with. */
function Heading({ title, accent, subtitle }: { title: string; accent: string; subtitle: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <span style={{ color: Brand.text, fontSize: 27, fontWeight: 800, textAlign: 'center' }}>
        {title}
        <span style={{ color: Brand.accent }}>{accent}</span>
      </span>
      <span
        style={{
          color: Brand.textSecondary,
          fontSize: 14,
          lineHeight: '21px',
          textAlign: 'center',
          maxWidth: 320,
        }}>
        {subtitle}
      </span>
    </div>
  );
}

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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referral, setReferral] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Set once a sign-up has been accepted and the confirmation mail is pending. */
  const [sent, setSent] = useState(false);
  /** Set when the address has to be confirmed before signing in. */
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resent, setResent] = useState(false);

  const emailLooksValid = EMAIL_PATTERN.test(email.trim());
  const referralValid = !referral || isUsableReferralCode(referral);
  const ready =
    emailLooksValid &&
    password.length >= MIN_PASSWORD_LENGTH &&
    (mode === 'signin' ||
      (fullName.trim().length >= 2 && confirmPassword === password && referralValid));

  /** Moves between the two pages, leaving the address bar telling the truth. */
  const switchMode = (next: EmailMode) => {
    setError(null);
    setSent(false);
    setResent(false);
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
    setUnconfirmed(false);
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

      if (confirmPassword !== password) {
        setError('Both passwords have to match.');
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
      setSent(true);
    } catch (thrown) {
      const message = describeSupabaseError(thrown);
      // An unconfirmed address is a fixable state, not just an error: it earns the
      // resend button the handset shows in the same situation.
      setUnconfirmed(/confirm/i.test(message));
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError(null);
    try {
      await resendConfirmationEmail(email);
      setResent(true);
    } catch (thrown) {
      setError(describeSupabaseError(thrown));
    } finally {
      setBusy(false);
    }
  };

  /** The top bar's back: the sent step returns to sign-in, the form step leaves. */
  const goBack = () => {
    if (sent) {
      router.replace(EMAIL_PATHS.signin);
      return;
    }
    router.back();
  };

  // Every hook above this point, so the early return below is not conditional.
  if (waiting) return <AuthWait />;

  const signup = mode === 'signup';

  return (
    <Screen>
      <AuthBackdrop />

      {signup ? (
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
            {sent ? 'STEP 2 OF 2' : 'STEP 1 OF 2'}
          </span>
        </div>
      ) : null}

      <ScreenScroll
        gutter={false}
        style={{ position: 'relative', zIndex: 1 }}
        contentStyle={{
          paddingTop: 0,
          paddingLeft: Spacing.four,
          paddingRight: Spacing.four,
          paddingBottom: Spacing.five,
        }}>
        {sent ? (
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
                <Ion name="mailOutline" size={28} color={Brand.onAccent} />
              </span>
            </div>

            <Heading
              title="Check your"
              accent=" email"
              subtitle={`We sent a confirmation link to ${email.trim()}. Open it to verify this address, then sign in with the password you just chose.`}
            />

            <div
              style={{
                marginTop: Spacing.four,
                display: 'flex',
                flexDirection: 'column',
                gap: Spacing.md,
              }}>
              {error ? <InfoNote tone="danger" body={error} /> : null}
              {resent ? (
                <InfoNote
                  title="Email sent again"
                  body={`Another confirmation link is on its way to ${email.trim()}.`}
                  tone="success"
                />
              ) : null}

              <Button
                label="Continue to sign in"
                onPress={() => router.replace(EMAIL_PATHS.signin)}
                fullWidth
              />
              <Button
                label="Resend confirmation email"
                variant="secondary"
                size="md"
                onPress={() => void resend()}
                loading={busy}
                fullWidth
              />

              <InfoNote
                tone="info"
                body="Inboxes sometimes file these under Spam or Promotions. The link opens straight back into GameOn."
              />

              <Button
                label="Use a different email"
                variant="ghost"
                size="md"
                onPress={() => {
                  setSent(false);
                  setResent(false);
                  setError(null);
                }}
                fullWidth
              />
            </div>
          </>
        ) : (
          <>
            {signup ? (
              <div style={{ paddingBottom: Spacing.four }}>
                <Heading
                  title="Create your"
                  accent=" account"
                  subtitle="Your bookings, GameOn Points and profile stay together once this email is confirmed."
                />
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: Spacing.sm,
                  paddingTop: Spacing.lg,
                  paddingBottom: Spacing.lg,
                }}>
                <BrandLogo />
                <span style={{ ...Typography.screenTitle, color: Brand.text }}>
                  Login with Email
                </span>
                <span style={{ ...Typography.body, color: Brand.textSecondary, textAlign: 'center' }}>
                  Use your email ID and password to continue.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
              {signup ? (
                <TextField
                  label="Full Name"
                  icon={<Ion name="personOutline" size={16} color={Brand.textMuted} />}
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Rahul Sharma"
                  autoComplete="name"
                />
              ) : null}

              <TextField
                label="Email ID"
                icon={<Ion name="mailOutline" size={16} color={Brand.textMuted} />}
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                type="email"
                inputMode="email"
                autoComplete="email"
              />

              <PasswordField
                label="Password"
                value={password}
                onChange={setPassword}
                placeholder={
                  signup ? `At least ${MIN_PASSWORD_LENGTH} characters` : 'Enter your password'
                }
                autoComplete={signup ? 'new-password' : 'current-password'}
                onEnter={() => {
                  if (ready && !busy) void submit();
                }}
              />

              {signup ? (
                <PasswordField
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Type the same password again"
                  autoComplete="new-password"
                  error={
                    confirmPassword && confirmPassword !== password
                      ? 'Both passwords have to match.'
                      : null
                  }
                />
              ) : null}

              {signup ? (
                <TextField
                  label="Referral code (optional)"
                  icon={<Ion name="giftOutline" size={16} color={Brand.textMuted} />}
                  value={referral}
                  onChange={(value) =>
                    setReferral(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))
                  }
                  placeholder="Invited by a friend? Add their code"
                  error={referralValid ? null : 'A code is at least 6 characters.'}
                />
              ) : null}

              {error ? <InfoNote tone="danger" body={error} /> : null}
              {resent ? (
                <InfoNote
                  title="Confirmation email sent"
                  body="Open the link in that email to verify your address, then sign in here."
                  tone="success"
                />
              ) : null}

              <Button
                label={signup ? 'Create account' : 'Continue'}
                onPress={() => void submit()}
                loading={busy}
                disabled={!ready}
                fullWidth
              />

              {!signup && unconfirmed ? (
                <Button
                  label="Resend confirmation email"
                  variant="secondary"
                  size="md"
                  onPress={() => void resend()}
                  loading={busy}
                  fullWidth
                />
              ) : null}

              {!signup ? (
                <Button
                  label="Use phone number instead"
                  variant="ghost"
                  size="md"
                  onPress={() => router.replace('/app/phone-login')}
                  fullWidth
                />
              ) : null}

              {signup ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    marginTop: Spacing.two,
                    paddingLeft: Spacing.two,
                    paddingRight: Spacing.two,
                  }}>
                  <ShieldCheckIcon size={16} color={Brand.accent} />
                  <span
                    style={{ flex: 1, color: Brand.textSecondary, fontSize: 12, lineHeight: '17px' }}>
                    We&rsquo;ll email you a link to confirm this address. By continuing you agree to
                    our Terms &amp; Privacy Policy.
                  </span>
                </div>
              ) : null}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: Spacing.sm,
                  paddingTop: Spacing.md,
                }}>
                <span style={{ ...Typography.body, color: Brand.textSecondary }}>
                  {signup ? 'Already have an account?' : 'New to GameOn?'}
                </span>
                <TextLink
                  label={signup ? 'Sign in' : 'Create an account'}
                  onPress={() => switchMode(signup ? 'signin' : 'signup')}
                />
              </div>
            </div>
          </>
        )}
      </ScreenScroll>
    </Screen>
  );
}
