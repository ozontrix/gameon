'use client';

/**
 * The app bar shared by every screen: leading affordance, brand mark or title,
 * the facility location pill and the notification bell.
 *
 * `variant` picks the leading slot — a back chevron on pushed screens, nothing
 * on tab screens. The bell's badge is the player's real unread count, and a
 * guest has no account so there is nothing unread to advertise.
 *
 * The web twin of the app `components/ui/app-header.tsx`, with one substitution:
 * the app reads the venue label from `AppConfig`, which is the same constant
 * here, so the pill reads identically.
 */

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppConfig } from '@/lib/mobile/constants/config';
import { Brand, Layout, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { BrandLogo } from '../auth/brand-logo';
import { useNotifications } from '../notifications-provider';
import { useSession } from '../session-provider';
import { Ion } from './icons';
import { IconButton } from './icon-button';
import { PressableScale } from './motion';

/** Which affordance occupies the header's leading slot. */
export type HeaderVariant = 'back' | 'plain';

export function AppHeader({
  variant = 'plain',
  onBack,
  title,
  showLocation = true,
  showBell = true,
  badgeCount,
  right,
}: {
  variant?: HeaderVariant;
  onBack?: () => void;
  /** Replaces the brand logo with a text title. */
  title?: string;
  /**
   * The venue label. On by default; every mockup that has a header shows it. It
   * names the venue the app books, using the shared app config, so it is text
   * rather than a picker — a chevron with nothing behind it is a promise the
   * app cannot keep.
   */
  showLocation?: boolean;
  /** The notification bell. Off on terminal screens such as Booking Success. */
  showBell?: boolean;
  /** Overrides the unread count; by default the player's real unread count. */
  badgeCount?: number;
  /** Extra trailing content, rendered after the bell. */
  right?: ReactNode;
}) {
  const router = useRouter();
  const { isGuest } = useSession();
  const { unread } = useNotifications();

  const badge = isGuest ? 0 : badgeCount ?? unread;

  const goBack = onBack ?? (() => router.back());
  const openNotifications = () => router.push('/app/notifications');

  return (
    <header
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        minHeight: Layout.headerHeight,
        paddingLeft: Layout.gutter,
        paddingRight: Layout.gutter,
        paddingTop: `calc(env(safe-area-inset-top, 0px) + ${Spacing.md}px)`,
        paddingBottom: Spacing.md,
        backgroundColor: Brand.background,
        position: 'relative',
        zIndex: 11,
      }}>
      {variant === 'back' ? (
        <IconButton accessibilityLabel="Go back" onPress={goBack}>
          <Ion name="chevronBack" size={22} color={Brand.text} />
        </IconButton>
      ) : null}

      {title ? (
        <span style={{ ...Typography.cardTitle, color: Brand.text }}>{title}</span>
      ) : (
        <BrandLogo size={20} />
      )}

      <span style={{ flex: 1 }} />

      {showLocation ? (
        <span
          role="text"
          aria-label={`Location: ${AppConfig.location}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: Spacing.xs,
            minWidth: 0,
          }}>
          <Ion name="location" size={14} color={Brand.text} />
          <span
            style={{
              ...Typography.label,
              color: Brand.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
            {AppConfig.location}
          </span>
        </span>
      ) : null}

      {showBell ? (
        <PressableScale
          onPress={openNotifications}
          label={badge > 0 ? `Notifications, ${badge} unread` : 'Notifications'}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: Layout.minHitTarget,
            minHeight: Layout.minHitTarget,
            border: 'none',
            background: 'none',
            padding: 0,
            cursor: 'pointer',
          }}>
          <Ion name="notificationsOutline" size={21} color={Brand.text} />
          {badge > 0 ? (
            <span
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                minWidth: 14,
                height: 14,
                borderRadius: Radius.pill,
                paddingLeft: Spacing.xs,
                paddingRight: Spacing.xs,
                backgroundColor: Brand.accent,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...Typography.micro,
                color: Brand.onAccent,
              }}>
              {badge}
            </span>
          ) : null}
        </PressableScale>
      ) : null}

      {right}
    </header>
  );
}
