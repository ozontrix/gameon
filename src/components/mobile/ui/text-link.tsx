'use client';

/**
 * An inline text action — "View All", "Clear All", "View Terms".
 *
 * Bare text with a click handler is only tappable across the glyphs themselves,
 * which for a short label is a target a few points tall. This wraps the label
 * in a 44pt-tall row, so a text link is as reliable to hit as a button without
 * looking like one. The web twin of the app `components/ui/text-link.tsx`.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Brand, Layout, Spacing, Typography } from '@/lib/mobile/theme';

export function TextLink({
  label,
  onPress,
  /** Trailing affordance, e.g. the chevron on a "View All". */
  icon,
  iconPosition = 'right',
  /** Text colour; defaults to the accent. */
  color = Brand.accent,
  size = 'md',
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  color?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const tint = disabled ? Brand.textMuted : color;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onPress}
      disabled={disabled}
      className="mobile-link"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Spacing.xs,
        minHeight: Layout.minHitTarget,
        justifyContent: 'center',
        border: 'none',
        background: 'none',
        padding: 0,
        fontFamily: 'inherit',
        cursor: disabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
        ...(size === 'sm' ? { ...Typography.caption, fontWeight: 700 } : Typography.bodyStrong),
        color: tint,
        ...style,
      }}>
      {icon && iconPosition === 'left' ? icon : null}
      {label}
      {icon && iconPosition === 'right' ? icon : null}
    </button>
  );
}
