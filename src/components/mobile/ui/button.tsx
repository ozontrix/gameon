'use client';

/**
 * The app's call-to-action button — the web twin of
 * `gameon-multisports/src/components/ui/button.tsx`.
 *
 * `primary` — the solid orange CTA (Book Now, Pay Securely).
 * `secondary` — accent-outlined, on a dark surface (Book Another Slot).
 * `danger` — danger-outlined, for destructive actions (Cancel Booking, Logout).
 * `ghost` — label only, for inline actions (View All, Apply Code).
 */

import type { CSSProperties, ReactNode } from 'react';

import { Brand, Radius, Shadows, Spacing, Typography } from '@/lib/mobile/theme';
import { PressableScale } from './motion';
import { Spinner } from './skeleton';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading or trailing glyph. A node rather than a font name — see the note below. */
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  /** Stretch to the width of the parent. Sticky-footer CTAs use this. */
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  style?: CSSProperties;
};

/**
 * `sm` is 40 rather than 34 so it clears the 44pt target with its slop.
 *
 * Icons are nodes on the web rather than Ionicons names: the app's glyphs are
 * inline SVG here, so a call site passes the element it wants and the button
 * only decides its size and colour by wrapping it.
 */
const HEIGHTS: Record<ButtonSize, number> = { sm: 40, md: 44, lg: 52 };

const LABEL: Record<ButtonSize, CSSProperties> = {
  sm: Typography.label,
  md: Typography.bodyStrong,
  lg: Typography.button,
};

const TINTS: Record<ButtonVariant, string> = {
  primary: Brand.onAccent,
  secondary: Brand.accent,
  danger: Brand.danger,
  ghost: Brand.accent,
};

function variantStyle(variant: ButtonVariant): CSSProperties {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: Brand.accent,
        paddingLeft: Spacing.lg,
        paddingRight: Spacing.lg,
        ...Shadows.accent,
      };
    case 'secondary':
      return {
        backgroundColor: Brand.backgroundElement,
        border: `1px solid ${Brand.accent}`,
        paddingLeft: Spacing.lg,
        paddingRight: Spacing.lg,
      };
    case 'danger':
      return {
        backgroundColor: Brand.dangerSoft,
        border: `1px solid ${Brand.danger}`,
        paddingLeft: Spacing.lg,
        paddingRight: Spacing.lg,
      };
    case 'ghost':
      return { backgroundColor: 'transparent', paddingLeft: Spacing.sm, paddingRight: Spacing.sm };
  }
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled = false,
  loading = false,
  type = 'button',
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const tint = TINTS[variant];

  return (
    <PressableScale
      type={type}
      disabled={isDisabled}
      onPress={onPress}
      label={label}
      className="mobile-btn"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        height: HEIGHTS[size],
        borderRadius: Radius.lg,
        border: 'none',
        fontFamily: 'inherit',
        ...LABEL[size],
        ...variantStyle(variant),
        ...(fullWidth ? { width: '100%', alignSelf: 'stretch' } : null),
        color: isDisabled ? Brand.textMuted : tint,
        ...(isDisabled
          ? {
              backgroundColor: Brand.backgroundSelected,
              border: `1px solid ${Brand.cardBorder}`,
              boxShadow: 'none',
              cursor: 'default',
            }
          : null),
        ...style,
      }}>
      {loading ? (
        <Spinner size={size === 'lg' ? 20 : 16} color={tint} />
      ) : (
        <>
          {icon && iconPosition === 'left' ? icon : null}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </span>
          {icon && iconPosition === 'right' ? icon : null}
        </>
      )}
    </PressableScale>
  );
}
