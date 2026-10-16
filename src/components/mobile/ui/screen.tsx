'use client';

/**
 * The outermost wrapper for every screen: fills the handset frame, paints the
 * brand background, and provides the scrolling body with the right clearance
 * for whatever fixed layer sits under it.
 *
 * The web twin of the app `components/ui/screen.tsx`. One difference: the safe
 * area is handled in CSS rather than measured in JS. The app asks
 * `react-native-safe-area-context` for the inset; a browser exposes the same
 * figure as `env(safe-area-inset-bottom)`, which can be composed into the
 * padding directly — so nothing re-renders when the inset changes.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Brand, Layout, Spacing } from '@/lib/mobile/theme';

/**
 * What fixed layer sits at the bottom of this screen, and therefore how much
 * clearance the scrolling content needs so nothing ends up hidden behind it.
 */
export type BottomLayer = 'tabBar' | 'footer' | 'none';

const SAFE_BOTTOM = 'env(safe-area-inset-bottom, 0px)';

/** Bottom padding that clears the screen's fixed bottom layer. */
export function useBottomClearance(layer: BottomLayer = 'none'): string {
  if (layer === 'none') return `calc(${SAFE_BOTTOM} + ${Spacing.lg}px)`;
  const height = layer === 'tabBar' ? Layout.tabBarHeight : Layout.footerHeight;
  return `calc(${SAFE_BOTTOM} + ${height}px + ${Spacing.lg}px)`;
}

export function Screen({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: Brand.background,
        position: 'relative',
        ...style,
      }}>
      {children}
    </div>
  );
}

export function ScreenScroll({
  children,
  /** Fixed layer at the bottom of the screen; drives the content clearance. */
  bottomLayer = 'none',
  /** Measured height of a bottom layer taller than the standard footer. */
  bottomInset,
  /** Apply the standard horizontal gutter. Turn off for edge-to-edge heroes. */
  gutter = true,
  /** Vertical rhythm between direct children. */
  gap = Spacing.lg,
  contentStyle,
  style,
}: {
  children: ReactNode;
  bottomLayer?: BottomLayer;
  bottomInset?: number;
  gutter?: boolean;
  gap?: number;
  contentStyle?: CSSProperties;
  style?: CSSProperties;
}) {
  const clearance = useBottomClearance(bottomLayer);
  const paddingBottom =
    bottomInset === undefined ? clearance : `calc(${SAFE_BOTTOM} + ${bottomInset + Spacing.lg}px)`;

  return (
    <div
      className="mobile-scroll"
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', ...style }}>
      <div
        style={{
          flexGrow: 1,
          paddingTop: Spacing.md,
          display: 'flex',
          flexDirection: 'column',
          gap,
          paddingBottom,
          ...(gutter ? { paddingLeft: Layout.gutter, paddingRight: Layout.gutter } : null),
          ...contentStyle,
        }}>
        {children}
      </div>
    </div>
  );
}
