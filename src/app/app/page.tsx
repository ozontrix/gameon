'use client';

/**
 * The sign-in screen — the web twin of `app/index.tsx` in the Expo app.
 *
 * Three ways in, in the order the brief lists them: a phone OTP (the fastest,
 * and the one the design recommends), an email and password, or browsing as a
 * guest. The guest route is not a lesser login: it is what §3 asks for, so it is
 * offered plainly rather than hidden behind a "skip" link.
 */

import { useRouter } from 'next/navigation';

import { AuthBackdrop } from '@/components/mobile/auth/auth-backdrop';
import { AuthCard } from '@/components/mobile/auth/auth-card';
import { AuthWait } from '@/components/mobile/auth/auth-wait';
import { BrandLogo } from '@/components/mobile/auth/brand-logo';
import { ShieldCheckIcon } from '@/components/mobile/auth/icons';
import { useSession } from '@/components/mobile/session-provider';
import { TextLink } from '@/components/mobile/ui';
import { useRedirectWhenSignedIn } from '@/components/mobile/use-auth-guard';
import { Brand, Spacing, Typography } from '@/lib/mobile/theme';

export default function AppSignInPage() {
  // A signed-in player has no business on a login screen.
  const { waiting } = useRedirectWhenSignedIn();
  const router = useRouter();
  const { continueAsGuest } = useSession();

  /** Guests browse without an account; booking will prompt them to sign in. */
  const continueToApp = () => {
    continueAsGuest();
    router.replace('/app/home');
  };

  if (waiting) return <AuthWait />;

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <AuthBackdrop />

      <div
        className="mobile-scroll"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          paddingTop: `calc(env(safe-area-inset-top, 0px) + ${Spacing.five}px)`,
          paddingBottom: Spacing.five,
          paddingLeft: Spacing.four,
          paddingRight: Spacing.four,
        }}>
        <header
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: Spacing.four,
            marginTop: Spacing.five,
            textAlign: 'center',
          }}>
          <BrandLogo />
          <h1
            style={{
              ...Typography.display,
              color: Brand.text,
              margin: 0,
              fontSize: 27,
              lineHeight: '34px',
            }}>
            Welcome to <span style={{ color: Brand.accent }}>GameOn</span>
          </h1>
          <p
            style={{
              ...Typography.body,
              color: Brand.textSecondary,
              margin: 0,
              maxWidth: 300,
            }}>
            Book your favorite sports, events and facilities anytime, anywhere.
          </p>
        </header>

        <div
          style={{
            marginTop: Spacing.five,
            display: 'flex',
            flexDirection: 'column',
            gap: Spacing.two,
          }}>
          <div style={{ height: 1, background: Brand.divider }} />
          <span
            style={{
              ...Typography.label,
              color: Brand.textMuted,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}>
            Login or sign up to continue
          </span>
        </div>

        <div
          style={{
            marginTop: Spacing.four,
            display: 'flex',
            flexDirection: 'column',
            gap: Spacing.md,
          }}>
          <AuthCard
            icon="phone"
            title="Continue with Phone"
            subtitle="We'll text you a one-time password to verify your number"
            emphasis="primary"
            tag="FASTEST"
            onPress={() => router.push('/app/phone-login')}
          />
          <AuthCard
            icon="email"
            title="Continue with Email"
            subtitle="Sign in with your email ID and password"
            onPress={() => router.push('/app/email-login')}
          />
          <AuthCard
            icon="user"
            title="Continue as Guest"
            subtitle="Browse sports, events and facilities without an account"
            onPress={continueToApp}
          />
        </div>

        {/*
          The email screen carries the handset's own "New to GameOn?" link; this
          is the same door from the first screen, so nobody has to go through the
          sign-in form to find the sign-up one.
        */}
        <div
          style={{
            marginTop: Spacing.four,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: Spacing.xs,
            flexWrap: 'wrap',
          }}>
          <span style={{ ...Typography.caption, color: Brand.textSecondary }}>
            New to GameOn?
          </span>
          <TextLink
            label="Create an account"
            onPress={() => router.push('/app/email-signup')}
          />
        </div>

        <div style={{ flex: 1, minHeight: 40 }} />

        <footer
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            paddingTop: Spacing.four,
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: Brand.text }}>
            <ShieldCheckIcon size={18} color={Brand.accent} />
            <span style={{ ...Typography.body }}>We keep your data safe and secure.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <TextLink label="Privacy Policy" size="sm" onPress={() => router.push('/privacy')} />
            <span style={{ color: Brand.textSecondary, fontSize: 13 }}>|</span>
            <TextLink label="Terms & Conditions" size="sm" onPress={() => router.push('/terms')} />
          </div>
        </footer>
      </div>
    </div>
  );
}
