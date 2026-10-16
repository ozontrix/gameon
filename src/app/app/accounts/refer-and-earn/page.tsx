'use client';

/**
 * Refer & Earn — the web twin of the handset app's `accounts/refer-and-earn.tsx`.
 *
 * The code, the two bonus amounts and both stats are server-owned: `GET
 * /user/referral` is the only source, so nothing on this screen is a fixture. A
 * guest gets the sign-in gate instead, because the code belongs to an account.
 *
 * Platform substitutions: the clipboard is `navigator.clipboard`, the system share
 * sheet is `navigator.share` (with a copy fallback where a browser has none), and
 * the illustration is inline SVG rather than `react-native-svg`.
 */

import { useRouter } from 'next/navigation';
import { useCallback, useState, type ReactNode } from 'react';

import { ScreenShell } from '@/components/mobile/accounts/screen-shell';
import { ScreenTitle } from '@/components/mobile/accounts/screen-title';
import { useSession } from '@/components/mobile/session-provider';
import {
  Card,
  InfoNote,
  Ion,
  PressableScale,
  SignInGate,
  TextLink,
  type IonName,
} from '@/components/mobile/ui';
import { points } from '@/lib/mobile/constants/config';
import { referralShareMessage, type ReferralSummary } from '@/lib/mobile/referral';
import { useApi } from '@/lib/mobile/use-api';
import { Brand, Radius, SocialColors, Spacing } from '@/lib/mobile/theme';

const GOLD = Brand.gold;
const SITE_URL = 'https://gameonmultisports.com';

/** One share target. All three do something real — no decorative buttons. */
function ShareAction({
  icon,
  label,
  color,
  onPress,
  disabled,
}: {
  icon: IonName;
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        background: 'none',
        border: 'none',
        padding: 0,
      }}>
      <span
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: color,
        }}>
        <Ion name={icon} size={22} color={color === Brand.backgroundSelected ? Brand.accent : Brand.white} />
      </span>
      <span style={{ color: Brand.textSecondary, fontSize: 11, fontWeight: 600 }}>{label}</span>
    </PressableScale>
  );
}

/** The invite graphic, drawn rather than shipped as an image so it stays crisp. */
function ReferIllustration() {
  return (
    <svg width={104} height={116} viewBox="0 0 104 116" role="img" aria-label="Invite a friend">
      <circle cx="52" cy="58" r="50" fill={Brand.accentSoft} />
      <circle cx="52" cy="36" r="15" fill={Brand.accent} />
      <path d="M28 92 a24 24 0 0 1 48 0 z" fill={Brand.accent} />
      <rect x="64" y="42" width="15" height="26" rx="3" fill={Brand.white} />
      <circle cx="52" cy="36" r="15" fill="none" stroke={Brand.highlightSoft} strokeWidth="2" />
      <circle cx="22" cy="46" r="9" fill={GOLD} />
      <circle cx="86" cy="84" r="9" fill={GOLD} />
      <circle cx="72" cy="100" r="6" fill={GOLD} />
    </svg>
  );
}


export default function ReferAndEarnPage() {
  const router = useRouter();
  const { isGuest } = useSession();
  const [copied, setCopied] = useState(false);

  // Read before the guest gate below: hooks must run in the same order on every
  // render, and a guest still renders this component.
  const { data, loading, error, refetch } = useApi<ReferralSummary>(
    isGuest ? null : '/user/referral',
  );

  const code = data?.code ?? '';
  const signupBonus = data?.signupBonusPoints ?? 0;
  const referrerBonus = data?.firstBookingBonusPoints ?? 0;

  const inviteText = useCallback(
    () => referralShareMessage(code, signupBonus, referrerBonus),
    [code, signupBonus, referrerBonus],
  );

  const copyCode = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // A browser without clipboard permission still has the code on screen.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }, [code]);

  /** The system share sheet where there is one, a copy where there is not. */
  const shareNative = () => {
    if (!code) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      void navigator.share({ text: inviteText() }).catch(() => undefined);
      return;
    }
    void copyCode();
  };

  const shareWhatsApp = () => {
    if (!code) return;
    const text = encodeURIComponent(`${inviteText()}\n${SITE_URL}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  if (isGuest) {
    return (
      <ScreenShell>
        <SignInGate
          title="Sign in to refer and earn"
          body="Share your referral code and earn GameOn Points when a friend completes their first booking."
        />
      </ScreenShell>
    );
  }

  const steps = [
    'Share your referral code with a friend',
    'They enter it on the Create Account screen',
    referrerBonus > 0
      ? `You earn ${points(referrerBonus)} once they complete their first booking`
      : 'You earn GameOn Points once they complete their first booking',
  ];

  const terms = [
    'Referral rewards are credited only after the referred user completes a valid booking.',
    'Referral rewards cannot be combined with other promotional offers at the same time.',
  ];

  return (
    <ScreenShell>
      <ScreenTitle title="Refer & Earn" />

      <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.md }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: Spacing.two,
          }}>
          <span style={{ color: Brand.text, fontSize: 22, fontWeight: 800, lineHeight: '28px' }}>
            Invite Friends. Earn Rewards.
          </span>
          <PointLine>
            Your friend gets{' '}
            <Accent>{signupBonus > 0 ? points(signupBonus) : 'a sign-up bonus'}</Accent>
          </PointLine>
          <PointLine>
            You earn <Accent>{referrerBonus > 0 ? points(referrerBonus) : 'GameOn Points'}</Accent>{' '}
            when they complete their first booking
          </PointLine>
        </div>
        <ReferIllustration />
      </div>

      {error && !data ? (
        <InfoNote title="Couldn't load your referral code" body={error} tone="danger" />
      ) : null}

      <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
        <span
          style={{
            color: Brand.textMuted,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}>
          Your Referral Code
        </span>

        {loading && !data ? (
          <span style={{ color: Brand.textMuted, fontSize: 13, paddingTop: Spacing.two }}>
            Loading your code…
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.two }}>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                color: Brand.accent,
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
              {code || '—'}
            </span>
            <PressableScale
              onPress={() => void copyCode()}
              disabled={!code}
              label="Copy referral code"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                backgroundColor: Brand.backgroundSelected,
                borderRadius: Radius.md,
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 6,
                paddingBottom: 6,
                border: 'none',
              }}>
              <Ion
                name={copied ? 'checkmark' : 'copyOutline'}
                size={17}
                color={copied ? Brand.success : Brand.accent}
              />
              {copied ? (
                <span style={{ color: Brand.success, fontSize: 12, fontWeight: 700 }}>Copied</span>
              ) : null}
            </PressableScale>
          </div>
        )}

        <span style={{ color: Brand.textSecondary, fontSize: 13, lineHeight: '19px' }}>
          Your friend enters this when they create their GameOn account. New sign-ups get their bonus
          Points straight away.
        </span>

        {error && !data ? <TextLink label="Try again" onPress={() => void refetch()} /> : null}
      </Card>

      <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
        <span style={{ color: Brand.text, fontSize: 15, fontWeight: 700 }}>Share your invite</span>
        <div style={{ display: 'flex', gap: Spacing.five }}>
          <ShareAction
            icon="logoWhatsapp"
            label="WhatsApp"
            color={SocialColors.whatsapp}
            onPress={shareWhatsApp}
            disabled={!code}
          />
          <ShareAction
            icon="shareSocialOutline"
            label="More"
            color={Brand.backgroundSelected}
            onPress={shareNative}
            disabled={!code}
          />
          <ShareAction
            icon={copied ? 'checkmark' : 'copyOutline'}
            label={copied ? 'Copied' : 'Copy Code'}
            color={Brand.backgroundSelected}
            onPress={() => void copyCode()}
            disabled={!code}
          />
        </div>
      </Card>

      <div style={{ display: 'flex', gap: Spacing.md }}>
        <Stat
          label="Friends Joined"
          value={loading && !data ? '—' : String(data?.totalReferred ?? 0)}
        />
        <Stat
          label="Points from Referrals"
          value={loading && !data ? '—' : points(data?.totalPointsEarned ?? 0)}
          accent
        />
      </div>

      <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
        <span style={{ color: Brand.text, fontSize: 16, fontWeight: 800 }}>How it works</span>
        {steps.map((step, index) => (
          <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: Brand.backgroundSelected,
                color: Brand.accent,
                fontSize: 12,
                fontWeight: 800,
              }}>
              {index + 1}
            </span>
            <span style={{ flex: 1, color: Brand.textSecondary, fontSize: 14, lineHeight: '20px' }}>
              {step}
            </span>
          </div>
        ))}
        <span style={{ color: Brand.textMuted, fontSize: 12, fontStyle: 'italic' }}>
          The sign-up bonus lands as soon as they register; the referral bonus follows their first
          completed booking.
        </span>
      </Card>

      <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
        <span style={{ color: Brand.text, fontSize: 16, fontWeight: 800 }}>Terms &amp; Conditions</span>
        {terms.map((term) => (
          <div key={term} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                marginTop: 8,
                flexShrink: 0,
                backgroundColor: Brand.accent,
              }}
            />
            <span style={{ flex: 1, color: Brand.textSecondary, fontSize: 13, lineHeight: '19px' }}>
              {term}
            </span>
          </div>
        ))}
        <TextLink
          label="View full Terms & Conditions"
          onPress={() => router.push('/app/accounts/terms')}
        />
      </Card>
    </ScreenShell>
  );
}

/** One bullet of the hero copy, with the orange dot the handset draws. */
function PointLine({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          marginTop: 7,
          flexShrink: 0,
          backgroundColor: Brand.accent,
        }}
      />
      <span style={{ flex: 1, color: Brand.textSecondary, fontSize: 13, lineHeight: '18px' }}>
        {children}
      </span>
    </div>
  );
}

function Accent({ children }: { children: ReactNode }) {
  return <span style={{ color: Brand.accent, fontWeight: 700 }}>{children}</span>;
}

/** One of the two referral counters. */
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: Spacing.one,
        backgroundColor: Brand.card,
        border: `1px solid ${accent ? Brand.accentGlow : Brand.cardBorder}`,
        borderRadius: Radius.xl,
        padding: Spacing.md,
      }}>
      <span style={{ color: Brand.textSecondary, fontSize: 13 }}>{label}</span>
      <span style={{ color: accent ? Brand.accent : Brand.text, fontSize: 22, fontWeight: 800 }}>
        {value}
      </span>
    </div>
  );
}

