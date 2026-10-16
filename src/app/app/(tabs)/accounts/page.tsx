'use client';

/**
 * The Accounts tab — the web twin of the app `app/(tabs)/accounts/index.tsx`.
 *
 * A member sees their profile, the notification/search/ticket shortcuts, the
 * legal pages and the sign-out. A guest is told plainly what an account would
 * add, since that is what this screen is for.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useSession } from '@/components/mobile/session-provider';
import {
  AppHeader,
  Badge,
  Button,
  Card,
  CardRow,
  Divider,
  Ion,
  RemoteImage,
  Screen,
  ScreenScroll,
  SignInGate,
} from '@/components/mobile/ui';
import { formatDate } from '@/lib/mobile/format';
import { nationalNumber } from '@/lib/mobile/identity';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';

/** The rows under the profile card, in the order the mockups list them. */
const ROWS = [
  {
    href: '/app/accounts/wallet',
    icon: 'walletOutline' as const,
    title: 'GameOn Wallet',
    subtitle: 'Your GameOn Points balance and rewards',
  },
  {
    href: '/app/accounts/transactions',
    icon: 'receiptOutline' as const,
    title: 'Transactions',
    subtitle: 'Bookings, tickets, tournaments and Points activity',
  },
  {
    href: '/app/notifications',
    icon: 'notificationsOutline' as const,
    title: 'Notifications',
    subtitle: 'Bookings, reminders and venue updates',
  },
  {
    href: '/app/my-tickets',
    icon: 'ticketOutline' as const,
    title: 'My Tickets',
    subtitle: 'Event and tournament entries',
  },
  {
    href: '/app/search',
    icon: 'searchOutline' as const,
    title: 'Search',
    subtitle: 'Find a court, sport or venue',
  },
];

const LEGAL = [
  { href: '/privacy', title: 'Privacy Policy', subtitle: 'How we handle your data' },
  { href: '/terms', title: 'Terms & Conditions', subtitle: 'The rules of play' },
  { href: '/delete-account', title: 'Delete my account', subtitle: 'Permanently remove your data' },
];

/** One navigable row: a glyph tile, a title with its subtitle, and a chevron. */
function LinkRow({
  href,
  icon,
  title,
  subtitle,
  last,
}: {
  href: string;
  icon?: React.ComponentProps<typeof Ion>['name'];
  title: string;
  subtitle: string;
  last?: boolean;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <CardRow last={last}>
        {icon ? (
          <span
            style={{
              width: 34,
              height: 34,
              flexShrink: 0,
              borderRadius: Radius.md,
              backgroundColor: Brand.accentGlass,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ion name={icon} size={17} color={Brand.accent} />
          </span>
        ) : null}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ ...Typography.cardTitle, color: Brand.text, display: 'block' }}>
            {title}
          </span>
          <span style={{ ...Typography.bodySmall, color: Brand.textSecondary, display: 'block' }}>
            {subtitle}
          </span>
        </span>
        <Ion name="chevronForward" size={16} color={Brand.textMuted} />
      </CardRow>
    </Link>
  );
}

export default function AccountsPage() {
  const router = useRouter();
  const { user, isGuest, profile, profileError, signOut } = useSession();

  if (!user) {
    return (
      <Screen>
        <AppHeader />
        <SignInGate
          icon="personCircleOutline"
          title={isGuest ? "You're browsing as a guest" : 'Sign in to GameOn'}
          body="Guests can browse sports, events and facilities. Booking a court, seeing your tickets and earning GameOn Points needs an account."
        />
      </Screen>
    );
  }

  const name = profile?.full_name?.trim() || user.fullName || 'GameOn player';
  const contact =
    user.provider === 'phone'
      ? `+91 ${nationalNumber(user.phoneNumber)}`
      : user.email ?? profile?.email ?? '—';

  return (
    <Screen>
      <AppHeader />
      <ScreenScroll bottomLayer="tabBar" gap={Spacing.md}>
        <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.md }}>
            <span
              style={{
                width: 54,
                height: 54,
                flexShrink: 0,
                borderRadius: Radius.pill,
                overflow: 'hidden',
                backgroundColor: Brand.accentGlass,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {profile?.avatarUrl ? (
                <RemoteImage uri={profile.avatarUrl} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Ion name="person" size={26} color={Brand.accent} />
              )}
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xxs, minWidth: 0 }}>
              <span style={{ ...Typography.cardTitle, color: Brand.text }}>{name}</span>
              <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>{contact}</span>
              <div style={{ display: 'flex', gap: Spacing.sm, flexWrap: 'wrap' }}>
                <Badge
                  label={user.provider === 'phone' ? 'Phone verified' : 'Email verified'}
                  tone="success"
                />
                {profile?.created_at ? (
                  <Badge
                    label={`Since ${formatDate(profile.created_at.slice(0, 10))}`}
                    tone="neutral"
                    solid={false}
                  />
                ) : null}
              </div>
            </div>
          </div>

          {profileError ? (
            <span style={{ ...Typography.caption, color: Brand.danger }}>{profileError}</span>
          ) : null}
        </Card>

        <Card
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: `${Spacing.sm}px ${Spacing.md}px`,
          }}>
          {ROWS.map((row, index) => (
            <LinkRow key={row.href} {...row} last={index === ROWS.length - 1} />
          ))}
        </Card>

        <Button
          label="Sign out"
          variant="danger"
          size="md"
          fullWidth
          icon={<Ion name="logInOutline" size={16} color={Brand.danger} />}
          onPress={() => {
            signOut();
            router.replace('/app');
          }}
        />

        <Card
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: `${Spacing.sm}px ${Spacing.md}px`,
          }}>
          {LEGAL.map((row, index) => (
            <div key={row.href}>
              {index > 0 ? <Divider /> : null}
              <LinkRow {...row} last={index === LEGAL.length - 1} />
            </div>
          ))}
        </Card>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <span style={{ ...Typography.caption, color: Brand.textMuted }}>
            GameOn Multisports · v1.0 · Web
          </span>
        </div>
      </ScreenScroll>
    </Screen>
  );
}
