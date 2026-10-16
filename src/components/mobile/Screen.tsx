'use client';

/**
 * The scrolling body of a screen.
 *
 * Every screen uses this rather than its own scroll container so the gutter,
 * the bottom padding that keeps the last card clear of the tab bar, and the
 * maximum width on a desktop browser are decided in one place.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Brand, Layout, MaxContentWidth, Spacing, Typography } from '@/lib/mobile/theme';

export function Screen({
  children,
  /** Extra space below the content, on top of the tab bar's own height. */
  bottomInset = 0,
  padded = true,
  style,
}: {
  children: ReactNode;
  bottomInset?: number;
  padded?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      className="mobile-scroll"
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
      <div
        style={{
          maxWidth: MaxContentWidth,
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: Spacing.lg,
          paddingTop: Spacing.lg,
          paddingBottom: Layout.tabBarHeight + Spacing.xl + bottomInset,
          paddingLeft: padded ? Spacing.lg : 0,
          paddingRight: padded ? Spacing.lg : 0,
          ...style,
        }}>
        {children}
      </div>
    </div>
  );
}

/** The one big title at the top of a screen, with optional supporting copy. */
export function ScreenTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: Spacing.md,
      }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xxs, minWidth: 0 }}>
        <h1 style={{ ...Typography.screenTitle, color: Brand.text, margin: 0 }}>{title}</h1>
        {subtitle ? (
          <p style={{ ...Typography.body, color: Brand.textSecondary, margin: 0 }}>{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
