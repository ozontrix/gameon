'use client';

/**
 * A boxed statistic. Used for the tournament overview strip, the transactions
 * balance pair and the wallet earned/used split. The web twin of the app
 * `components/ui/stat-tile.tsx`.
 *
 * The label is reserved at two lines: across the tournament's five-up strip
 * "Duration" takes one line and "Registration Ends" takes two, which otherwise
 * leaves the figures below them sitting at different heights.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { ReservedText } from './reserved-text';

const LABEL_LINE = 14;
const LABEL_LINES = 2;

const TONES: Record<string, string> = {
  accent: Brand.accent,
  success: Brand.success,
  danger: Brand.danger,
  neutral: Brand.text,
};

export function StatTile({
  /** Muted heading, e.g. "Start Date". */
  label,
  /** The figure or short fact, e.g. "18 May, 2024". */
  value,
  /** Optional third line, e.g. "Saturday" or "Available to use". */
  caption,
  icon,
  tone = 'accent',
  /** Let the tile share a row equally with its siblings. */
  grow = true,
  style,
}: {
  label: string;
  value: string;
  caption?: string;
  icon?: ReactNode;
  tone?: 'accent' | 'success' | 'danger' | 'neutral';
  grow?: boolean;
  style?: CSSProperties;
}) {
  const tint = TONES[tone];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: Spacing.xxs,
        borderRadius: Radius.md,
        border: `1px solid ${Brand.cardBorder}`,
        backgroundColor: Brand.backgroundElement,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md,
        paddingLeft: Spacing.sm,
        paddingRight: Spacing.sm,
        ...(grow ? { flex: 1, minWidth: 0 } : null),
        ...style,
      }}>
      {icon}
      <ReservedText
        lines={LABEL_LINES}
        lineHeight={LABEL_LINE}
        style={{
          ...Typography.caption,
          color: Brand.textSecondary,
          textAlign: 'center',
        }}>
        {label}
      </ReservedText>
      <span style={{ ...Typography.label, color: tint, textAlign: 'center' }}>{value}</span>
      {caption ? (
        <span style={{ ...Typography.caption, color: Brand.textMuted, textAlign: 'center' }}>
          {caption}
        </span>
      ) : null}
    </div>
  );
}
