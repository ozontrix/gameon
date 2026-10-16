'use client';

/**
 * The app's call-to-action button.
 *
 * Three weights, matching the handset build: `primary` is the one solid accent
 * block on a screen, `secondary` is a bordered surface for the second choice,
 * and `ghost` is for a quiet escape hatch inside a card. A button that is
 * working shows a spinner in place of its label and refuses further taps, which
 * is what stops a double-submit on a slow connection.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Brand, Layout, Radius, Shadows, Spacing, Typography } from '@/lib/mobile/theme';
import { Spinner } from './ui';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Shows a spinner and ignores taps while the action is in flight. */
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  type?: 'button' | 'submit';
  style?: CSSProperties;
};

function palette(variant: ButtonVariant): {
  background: string;
  border: string;
  color: string;
  style: CSSProperties;
} {
  switch (variant) {
    case 'primary':
      return {
        background: Brand.accent,
        border: Brand.accent,
        color: Brand.onAccent,
        style: Shadows.accent,
      };
    case 'secondary':
      return {
        background: Brand.card,
        border: Brand.cardBorder,
        color: Brand.text,
        style: {},
      };
    case 'danger':
      return {
        background: Brand.dangerSoft,
        border: Brand.danger,
        color: Brand.danger,
        style: {},
      };
    case 'ghost':
      return {
        background: 'transparent',
        border: 'transparent',
        color: Brand.textSecondary,
        style: {},
      };
  }
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  type = 'button',
  style,
}: ButtonProps) {
  const { background, border, color, style: extra } = palette(variant);
  const blocked = Boolean(disabled || loading);

  return (
    <button
      type={type}
      onClick={blocked ? undefined : onPress}
      disabled={blocked}
      className="mobile-press"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        width: '100%',
        minHeight: Layout.minHitTarget,
        padding: `${Spacing.sm}px ${Spacing.md}px`,
        borderRadius: Radius.pill,
        border: `1px solid ${border}`,
        background,
        color,
        fontFamily: 'inherit',
        ...Typography.button,
        ...extra,
        ...(blocked ? { opacity: 0.6, cursor: 'default' } : { cursor: 'pointer' }),
        ...style,
      }}>
      {loading ? <Spinner size={18} color={color} /> : icon}
      {loading ? null : label}
    </button>
  );
}
