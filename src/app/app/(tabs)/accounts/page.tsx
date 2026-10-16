'use client';

/**
 * The Account tab — the web twin of the handset app's `(tabs)/accounts/index.tsx`.
 *
 * The same profile card, the same nine rows in the same order, and the same guest
 * behaviour: a guest sees the profile card in its "Browsing as Guest" state and only
 * the public rows, so nothing offers them a screen they cannot open. Logging out asks
 * first, and clears any half-built booking on the way out.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useBookingDraft } from '@/components/mobile/booking-draft-provider';
import { useBookings } from '@/components/mobile/bookings-store';
import { useSession } from '@/components/mobile/session-provider';
import {
  AppHeader,
  BottomSheet,
  Button,
  Card,
  InfoNote,
  Ion,
  Mdi,
  PressableScale,
  RemoteImage,
  Screen,
  ScreenScroll,
  type IonName,
  type MdiName,
} from '@/components/mobile/ui';
import { Brand, Spacing } from '@/lib/mobile/theme';

type MenuItem = {
  label: string;
  /** Either an Ionicons glyph or a MaterialCommunityIcons one. */
  icon: IonName | { mci: MdiName };
  href: string;
  /** Rows without this are hidden while browsing as a guest. */
  guest?: boolean;
};

const MENU: MenuItem[] = [
  {
    icon: { mci: 'accountCogOutline' },
    label: 'Profile Management',
    href: '/app/accounts/profile-management',
  },
  { icon: 'receiptOutline', label: 'Transactions', href: '/app/accounts/transactions' },
  { icon: 'walletOutline', label: 'GameOn Wallet', href: '/app/accounts/wallet' },
  { icon: 'giftOutline', label: 'Refer and Earn', href: '/app/accounts/refer-and-earn' },
  {
    icon: 'documentTextOutline',
    label: 'Terms and Conditions',
    href: '/app/accounts/terms',
    guest: true,
  },
  { icon: 'shieldCheckmarkOutline', label: 'Policies', href: '/app/accounts/policies', guest: true },
  { icon: 'lockClosedOutline', label: 'Privacy', href: '/app/accounts/privacy', guest: true },
  {
    icon: 'chatbubbleEllipsesOutline',
    label: 'Feedback',
    href: '/app/accounts/feedback',
    guest: true,
  },
  { icon: 'trashOutline', label: 'Delete Account', href: '/app/accounts/delete-account' },
];

function MenuIcon({ icon }: { icon: MenuItem['icon'] }) {
  if (typeof icon !== 'string') return <Mdi name={icon.mci} size={22} color={Brand.accent} />;
  return <Ion name={icon} size={22} color={Brand.accent} />;
}

export default function AccountsPage() {
  const router = useRouter();
  const { reset } = useBookingDraft();
  const { isGuest, signOut, user, profile } = useSession();
  const { refresh: refreshBookings } = useBookings();
  const [confirmLogout, setConfirmLogout] = useState(false);

  // The profile row is the record; the auth user covers the moment before it has
  // loaded. Lines with nothing in them are left out rather than filled with a fixture.
  const displayName = profile?.full_name || user?.fullName || 'Your profile';
  const displayPhone = profile?.phone || user?.phoneNumber || '';
  const displayEmail = profile?.email || user?.email || '';
  const avatarUrl = profile?.avatarUrl ?? null;

  const menu = isGuest ? MENU.filter((item) => item.guest) : MENU;

  /** Clears any in-progress booking and returns to the login screen. */
  const logout = () => {
    setConfirmLogout(false);
    reset();
    signOut();
    void refreshBookings();
    router.replace('/app');
  };

  return (
    <Screen>
      <AppHeader />
      <ScreenScroll bottomLayer="tabBar" gap={Spacing.four}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.one }}>
          <span style={{ color: Brand.text, fontSize: 30, fontWeight: 800 }}>Account</span>
          <span style={{ color: Brand.textSecondary, fontSize: 15 }}>
            {isGuest
              ? 'Sign in to book slots, earn Points and manage your profile'
              : 'Manage your profile and account settings'}
          </span>
        </div>

        {/* The profile card is the way into profile management. A guest gets the
            same card in its "Browsing as Guest" form, with nothing to open. */}
        {isGuest ? (
          <Card
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.md,
            }}>
            <span
              style={{
                width: 74,
                height: 74,
                borderRadius: 37,
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                backgroundColor: Brand.backgroundSelected,
              }}>
              <Ion name="personOutline" size={38} color={Brand.textMuted} />
            </span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}>
              <span style={{ color: Brand.text, fontSize: 18, fontWeight: 700 }}>
                Browsing as Guest
              </span>
              <span style={{ color: Brand.textSecondary, fontSize: 14 }}>
                Sports, events and facility details are open to you.
              </span>
            </span>
          </Card>
        ) : (
          <Card
            onPress={() => router.push('/app/accounts/profile-management')}
            accessibilityLabel="Profile management"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.md,
            }}>
            <span style={{ position: 'relative', width: 74, height: 74, flexShrink: 0 }}>
              <span
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: 37,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  backgroundColor: Brand.backgroundSelected,
                }}>
                {avatarUrl ? (
                  <RemoteImage
                    uri={avatarUrl}
                    accessibilityLabel="Your profile photo"
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <Ion name="person" size={42} color={Brand.textMuted} />
                )}
              </span>
              <span
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: Brand.accent,
                  border: `2px solid ${Brand.background}`,
                }}>
                <Ion name="createOutline" size={13} color={Brand.onAccent} />
              </span>
            </span>

            <span
              style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ color: Brand.text, fontSize: 18, fontWeight: 700 }}>
                {displayName}
              </span>
              {displayPhone ? (
                <span style={{ color: Brand.textSecondary, fontSize: 14 }}>{displayPhone}</span>
              ) : null}
              {displayEmail ? (
                <span
                  style={{
                    color: Brand.textSecondary,
                    fontSize: 14,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                  {displayEmail}
                </span>
              ) : null}
            </span>

            <Ion name="chevronForward" size={20} color={Brand.accent} />
          </Card>
        )}

        {isGuest ? (
          <Button
            label="Sign in or sign up"
            icon={<Ion name="logInOutline" size={18} color={Brand.onAccent} />}
            onPress={() => router.replace('/app')}
            fullWidth
          />
        ) : null}

        <Card padded={false}>
          {menu.map((item, index) => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <PressableScale
                as="div"
                scale={false}
                label={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: Spacing.md,
                  paddingTop: 15,
                  paddingBottom: 15,
                  paddingLeft: Spacing.md,
                  paddingRight: Spacing.md,
                  borderTop: index > 0 ? `1px solid ${Brand.divider}` : 'none',
                }}>
                <MenuIcon icon={item.icon} />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    color: Brand.text,
                    fontSize: 15,
                    fontWeight: 600,
                  }}>
                  {item.label}
                </span>
                <Ion name="chevronForward" size={18} color={Brand.accent} />
              </PressableScale>
            </Link>
          ))}
        </Card>

        {!isGuest ? (
          <Card padded={false}>
            <PressableScale
              label="Logout"
              onPress={() => setConfirmLogout(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                paddingTop: 15,
                paddingBottom: 15,
              }}>
              <Ion name="logOutOutline" size={22} color={Brand.danger} />
              <span style={{ color: Brand.danger, fontSize: 15, fontWeight: 700 }}>Logout</span>
            </PressableScale>
          </Card>
        ) : null}
      </ScreenScroll>

      <BottomSheet
        visible={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Log out of GameOn?"
        subtitle="You'll need to sign in again to book slots or view your bookings."
        footer={
          <>
            <Button
              label="Stay Signed In"
              variant="secondary"
              size="md"
              onPress={() => setConfirmLogout(false)}
              style={{ flex: 1 }}
            />
            <Button
              label="Logout"
              variant="danger"
              size="md"
              icon={<Ion name="logOutOutline" size={17} color={Brand.danger} />}
              onPress={logout}
              style={{ flex: 1 }}
            />
          </>
        }>
        <InfoNote body="Your bookings stay on your account and will be here when you sign back in." />
      </BottomSheet>
    </Screen>
  );
}
