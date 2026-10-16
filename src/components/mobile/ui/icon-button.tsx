'use client';

/**
 * An icon-only button whose touch target is guaranteed to reach the 44pt
 * platform minimum, whatever the glyph size.
 *
 * Icon buttons are where touch targets go wrong: the glyph is drawn at 12–20pt
 * and, without a padded container, that is the whole tappable area. This
 * primitive handles it — a 44pt minimum box — so no call site has to remember.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Brand, Layout, Radius } from '@/lib/mobile/theme';
import { PressableScale } from './motion';

type IconButtonProps = {
  children: ReactNode;
  /** Required — an icon alone tells a screen reader nothing. */
  accessibilityLabel: string;
  onPress: () => void;
  /** `plain` is borderless; `surface` sits on a filled circle. */
  variant?: 'plain' | 'surface';
  disabled?: boolean;
  style?: CSSProperties;
};

export function IconButton({
  children,
  accessibilityLabel,
  onPress,
  variant = 'plain',
  disabled = false,
  style,
}: IconButtonProps) {
  return (
    <PressableScale
      disabled={disabled}
      onPress={onPress}
      label={accessibilityLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: Layout.minHitTarget,
        minHeight: Layout.minHitTarget,
        borderRadius: Radius.pill,
        border: 'none',
        background: variant === 'surface' ? Brand.backgroundSelected : 'transparent',
        color: disabled ? Brand.textMuted : Brand.text,
        padding: 0,
        cursor: disabled ? 'default' : 'pointer',
        ...style,
      }}>
      <span style={{ display: 'inline-flex', pointerEvents: 'none' }}>{children}</span>
    </PressableScale>
  );
}
