'use client';

/**
 * The Accounts tab — the last of the five, and the only one that is different
 * for a guest and a member.
 *
 * A member sees their profile, which is read from `GET /api/v1/user/profile`
 * (the service role also heals a missing row there), plus the two legal pages
 * and the sign-out. A guest is told plainly what an account would add, since
 * that is what this screen is for.
 */

import { useRouter } from 'next/navigation';

import { Button } from '@/components/mobile/Button';
import {
  ChevronRightIcon,
  LogoutIcon,
  ShieldCheckIcon,
  UserIcon,
} from '@/components/mobile/Icons';
import { Screen, ScreenTitle } from '@/components/mobile/Screen';
import { useSession } from '@/components/mobile/session-provider';
import { Badge, Card, Divider, ErrorNote, ListRow, Spinner } from '@/components/mobile/ui';
import { formatDate } from '@/lib/mobile/format';
import { nationalNumber } from '@/lib/mobile/identity';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { useApi } from '@/lib/mobile/use-api';

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  created_at: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  loginProvider: 'email' | 'phone';
};

/** The static destinations that live on the website, not in the app shell. */
const LINKS = [
  { href: '/privacy', title: 'Privacy Policy', subtitle: 'How we handle your data' },
  { href: '/terms', title: 'Terms & Conditions', subtitle: 'The rules of play' },
  { href: '/delete-account', title: 'Delete my account', subtitle: 'Permanently remove your data' },
];

export default function AccountsPage() {
  const router = useRouter();
  const { user, isGuest, signOut } = useSession();
  const { data: profile, loading, error, refetch } = useApi<Profile>(user ? '/user/profile' : null);

  const leave = () => {
    signOut();
    router.replace('/app');
  };

  return (
    <Screen>
      <ScreenTitle
        title="Accounts"
        subtitle={user ? 'Your profile and preferences.' : 'Browse, then join when you are ready.'}
      />

      {!user ? (
        <Card
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: Spacing.md,
            alignItems: 'center',
            textAlign: 'center',
          }}>
          <span
            style={{
              width: 54,
              height: 54,
              borderRadius: Radius.pill,
              background: Brand.accentGlass,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: Brand.accent,
            }}>
            <UserIcon size={26} />
          </span>
          <span style={{ ...Typography.cardTitle, color: Brand.text }}>
            {isGuest ? "You're browsing as a guest" : 'Sign in to GameOn'}
          </span>
          <span style={{ ...Typography.bodySmall, color: Brand.textSecondary, maxWidth: 280 }}>
            Guests can browse sports, events and facilities. Booking a court, seeing your tickets
            and earning GameOn Points needs an account.
          </span>
          <Button label="Sign in or sign up" onPress={() => router.push('/app')} />
        </Card>
      ) : (
        <>
          <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.md }}>
              <span
                style={{
                  width: 54,
                  height: 54,
                  flexShrink: 0,
                  borderRadius: Radius.pill,
                  overflow: 'hidden',
                  background: Brand.accentGlass,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: Brand.accent,
                }}>
                {profile?.avatarUrl ? (
                  // A short-lived signed URL from the API; a plain img keeps the
                  // image optimiser from holding a URL that expires.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <UserIcon size={26} />
                )}
              </span>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: Spacing.xxs,
                  minWidth: 0,
                }}>
                <span style={{ ...Typography.cardTitle, color: Brand.text }}>
                  {profile?.full_name?.trim() || user.fullName || 'GameOn player'}
                </span>
                <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>
                  {user.provider === 'phone'
                    ? `+91 ${nationalNumber(user.phoneNumber)}`
                    : user.email ?? profile?.email ?? '—'}
                </span>
                <div style={{ display: 'flex', gap: Spacing.sm, flexWrap: 'wrap' }}>
                  <Badge
                    label={user.provider === 'phone' ? 'Phone verified' : 'Email verified'}
                    tone="success"
                  />
                  {profile?.created_at ? (
                    <Badge
                      label={`Since ${formatDate(profile.created_at.slice(0, 10))}`}
                      tone="neutral"
                    />
                  ) : null}
                </div>
              </div>
            </div>

            {loading && !profile ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Spinner size={20} />
              </div>
            ) : null}

            {error ? <ErrorNote message={error} /> : null}
          </Card>

          <Card
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: `${Spacing.sm}px ${Spacing.md}px`,
            }}>
            <ListRow
              icon={<ShieldCheckIcon size={18} color={Brand.accent} />}
              title="My details"
              subtitle="Re-read the profile GameOn keeps for you"
              trailing={<ChevronRightIcon size={18} color={Brand.textMuted} />}
              onPress={refetch}
            />
          </Card>

          <Button label="Sign out" variant="danger" icon={<LogoutIcon size={18} />} onPress={leave} />
        </>
      )}

      <Card
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: `${Spacing.sm}px ${Spacing.md}px`,
        }}>
        {LINKS.map((link, index) => (
          <div key={link.href}>
            {index > 0 ? <Divider /> : null}
            <ListRow
              href={link.href}
              title={link.title}
              subtitle={link.subtitle}
              trailing={<ChevronRightIcon size={18} color={Brand.textMuted} />}
            />
          </div>
        ))}
      </Card>

      <div style={{ textAlign: 'center' }}>
        <span style={{ ...Typography.caption, color: Brand.textMuted }}>
          GameOn Multisports · v1.0 · Web
        </span>
      </div>
    </Screen>
  );
}