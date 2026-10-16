'use client';

/**
 * A small status flag — ONGOING, UPCOMING, Completed, NEW, TOURNAMENT, or a
 * countdown such as "Ends in 2 Days".
 *
 * The web twin of `gameon-multisports/src/components/ui/badge.tsx`, including
 * the ink-on-solid foreground rule: every tone is a light colour, so ink beats
 * white on all of them.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';

export type BadgeTone = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: ReactNode;
  /** Solid fill (status flags such as ONGOING) versus a tinted soft pill. */
  solid?: boolean;
  /** Uppercase the label, as the status flags in the mockups do. */
  upper?: boolean;
  style?: CSSProperties;
};

const FILL: Record<BadgeTone, string> = {
  accent: Brand.accent,
  success: Brand.success,
  warning: Brand.warning,
  danger: Brand.danger,
  info: Brand.info,
  neutral: Brand.backgroundSelected,
};

const SOFT: Record<BadgeTone, string> = {
  accent: Brand.accentSoft,
  success: Brand.successSoft,
  warning: Brand.warningSoft,
  danger: Brand.dangerSoft,
  info: Brand.infoSoft,
  neutral: Brand.backgroundSelected,
};

const TINT: Record<BadgeTone, string> = {
  accent: Brand.accent,
  success: Brand.success,
  warning: Brand.warning,
  danger: Brand.danger,
  info: Brand.info,
  neutral: Brand.textSecondary,
};

const SOLID_FOREGROUND: Record<BadgeTone, string> = {
  accent: Brand.ink,
  success: Brand.ink,
  warning: Brand.ink,
  danger: Brand.ink,
  info: Brand.ink,
  neutral: Brand.text,
};

export function Badge({
  label,
  tone = 'accent',
  icon,
  solid = true,
  upper = false,
  style,
}: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: Spacing.xs,
        borderRadius: Radius.xs,
        padding: `${Spacing.xs}px ${Spacing.sm}px`,
        whiteSpace: 'nowrap',
        ...Typography.micro,
        backgroundColor: solid ? FILL[tone] : SOFT[tone],
        color: solid ? SOLID_FOREGROUND[tone] : TINT[tone],
        ...(solid ? null : { border: `1px solid ${TINT[tone]}` }),
        ...(upper ? { textTransform: 'uppercase' as const } : null),
        ...style,
      }}>
      {icon}
      {label}
    </span>
  );
}
