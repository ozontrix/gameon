'use client';

/**
 * The app's bottom navigation — the web twin of `components/app-tabs.tsx`.
 *
 * The five destinations, their order and their labels are the handset app's:
 * Home, Sports, My Bookings, Events, Accounts. In expo-router these are
 * `TabTrigger`s inside a `Tabs` navigator; here they are `Link`s to real URLs,
 * which is what makes each tab a shareable, reloadable address and keeps the
 * browser's back button honest.
 *
 * One detail is a tab: the glyph switches from outline to filled on focus and an
 * accent pill fades in behind it — enough motion to confirm the tap without
 * drawing attention to itself.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Ion } from './ui';
import { TAB_ICONS, type TabIcon } from './sport-icons';

type Tab = {
  name: string;
  label: string;
  href: string;
  icon: TabIcon;
};

const TABS: Tab[] = [
  { name: 'home', label: 'Home', href: '/app/home', icon: TAB_ICONS.home },
  { name: 'sports', label: 'Sports', href: '/app/sports', icon: TAB_ICONS.sports },
  { name: 'bookings', label: 'My Bookings', href: '/app/bookings', icon: TAB_ICONS.bookings },
  { name: 'events', label: 'Events', href: '/app/events', icon: TAB_ICONS.events },
  { name: 'accounts', label: 'Accounts', href: '/app/accounts', icon: TAB_ICONS.accounts },
];

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: Brand.background,
        borderTop: `1px solid ${Brand.cardBorder}`,
        paddingTop: Spacing.sm,
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${Spacing.sm}px)`,
        paddingLeft: Spacing.xs,
        paddingRight: Spacing.xs,
        zIndex: 10,
      }}>
      {TABS.map(({ name, label, href, icon }) => {
        // `startsWith` so a detail screen under a tab (`/app/events/…`) still
        // lights the tab it belongs to.
        const focused = pathname === href || pathname.startsWith(`${href}/`);
        const tint = focused ? Brand.accent : Brand.textSecondary;

        return (
          <Link
            key={name}
            href={href}
            aria-current={focused ? 'page' : undefined}
            className="mobile-press"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Spacing.xxs,
              paddingTop: Spacing.xs,
              paddingBottom: Spacing.xs,
              minHeight: 44,
              textDecoration: 'none',
              color: tint,
            }}>
            <span
              style={{
                width: 44,
                height: 26,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: Radius.pill,
                backgroundColor: focused ? Brand.accentSoft : 'transparent',
                transition: 'background-color 180ms ease',
              }}>
              <Ion name={focused ? icon.active : icon.idle} size={22} color={tint} />
            </span>
            <span
              style={{
                ...Typography.caption,
                fontSize: 10,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
