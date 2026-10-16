'use client';

/**
 * A labelled fact: `🗓 Date — 24 May, Fri`. The backbone of the booking summary,
 * payment summary and tournament detail blocks. The web twin of the app
 * `components/ui/detail-row.tsx`.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Brand, Spacing, Typography } from '@/lib/mobile/theme';

const EMPHASIS: Record<string, CSSProperties> = {
  none: { color: Brand.text },
  accent: { color: Brand.accent },
  success: { color: Brand.success },
  danger: { color: Brand.danger },
};

export function DetailRow({
  label,
  value,
  icon,
  /** Render the dash separator between label and value, as the mockups do. */
  dash = true,
  /** Colour the value with the accent, for prices and IDs. */
  emphasis = 'none',
  style,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  dash?: boolean;
  emphasis?: 'none' | 'accent' | 'success' | 'danger';
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, ...style }}>
      {icon}
      <span style={{ ...Typography.caption, color: Brand.textSecondary, minWidth: 52 }}>
        {label}
      </span>
      {dash ? <span style={{ ...Typography.caption, color: Brand.textMuted }}>-</span> : null}
      <span
        style={{
          ...Typography.label,
          flex: 1,
          minWidth: 0,
          ...EMPHASIS[emphasis],
        }}>
        {value}
      </span>
    </div>
  );
}
