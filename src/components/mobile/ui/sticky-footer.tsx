'use client';

/**
 * The pinned bottom action bar on the pushed screens — Book Now, Continue to
 * Confirm Booking, Pay Securely. Sits above the scroll and clears the device
 * safe area itself. The web twin of the app `components/ui/sticky-footer.tsx`.
 *
 * It is positioned against the handset frame rather than the viewport, so on a
 * desktop browser it stays inside the phone column instead of pinning to the
 * bottom of the window.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Brand, Layout, Shadows, Spacing } from '@/lib/mobile/theme';

export function StickyFooter({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: Layout.footerHeight,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingLeft: Layout.gutter,
        paddingRight: Layout.gutter,
        paddingTop: Spacing.md,
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${Spacing.md}px)`,
        backgroundColor: Brand.backgroundElement,
        borderTop: `1px solid ${Brand.cardBorder}`,
        ...Shadows.floating,
        zIndex: 12,
        ...style,
      }}>
      {children}
    </div>
  );
}
