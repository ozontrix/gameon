'use client';

/**
 * The app's bottom navigation — the web twin of `components/app-tabs.tsx`.
 *
 * The five destinations, their order and their labels are the Expo app's:
 * Home, Sports, My Bookings, Events, Accounts. In expo-router these are
 * `TabTrigger`s inside a `Tabs` navigator; here they are `Link`s to real URLs,
 * which is what makes each tab a shareable, reloadable address and keeps the
 * browser's back button honest.
 *
 * One tab is a tab: the glyph switches from outline to filled on focus and an
 * accent pill fades in behind it — enough motion to confirm the tap without
 * drawing attention to itself.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import {
  AccountsIcon,
  BookingsIcon,
  EventsIcon,
  HomeIcon,
  SportsIcon,
  type IconProps,
} from './Icons';

type Tab = {
  name: string;
  label: string;
  href: string;
  Icon: (props: IconProps & { active?: boolean }) => React.ReactElement;
};

const TABS: Tab[] = [
  { name: 'home', label: 'Home', href: '/app/home', Icon: HomeIcon },
  { name: 'sports', label: 'Sports', href: '/app/sports', Icon: SportsIcon },
  { name: 'bookings', label: 'My Bookings', href: '/app/bookings', Icon: BookingsIcon },
  { name: 'events', label: 'Events', href: '/app/events', Icon: EventsIcon },
  { name: 'accounts', label: 'Accounts', href: '/app/accounts', Icon: AccountsIcon },
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
        background: Brand.background,
        borderTop: `1px solid ${Brand.cardBorder}`,
        paddingTop: Spacing.sm,
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${Spacing.sm}px)`,
        paddingLeft: Spacing.xs,
        paddingRight: Spacing.xs,
        zIndex: 10,
      }}>
      {TABS.map(({ name, label, href, Icon }) => {
        // `startsWith` so a detail screen under a tab (`/app/events/…`) still
        // lights the tab it belongs to.
        const focused = pathname === href || pathname.startsWith(`${href}/`);

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
              padding: `${Spacing.xs}px 0`,
              minHeight: 44,
              textDecoration: 'none',
              color: focused ? Brand.accent : Brand.textSecondary,
            }}>
            <span
              style={{
                position: 'relative',
                width: 44,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: Radius.pill,
                background: focused ? Brand.accentSoft : 'transparent',
                transition: 'background 140ms ease',
              }}>
              <Icon size={22} active={focused} />
            </span>
            <span style={{ ...Typography.caption, fontSize: 10, fontWeight: 600 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
