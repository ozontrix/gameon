'use client';

/**
 * The one chip in the app — the web twin of the handset app's
 * `components/ui/chip.tsx`. Covers every filter pill, sort control, preference
 * toggle and segmented option in the mockups: single-line or two-line, with an
 * optional leading icon, count bubble and trailing affordance.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Ion, type IonName } from './icons';
import { PressableScale } from './motion';

/** Trailing affordance: a picker chevron, a clear cross, or a selected tick. */
export type ChipTrailing = 'chevron' | 'clear' | 'check' | 'none';

/**
 * How the selected state reads. `fill` floods the chip with the accent (the
 * filter rows); `outline` keeps the dark surface and accents the border and
 * label (the court-preference toggles).
 */
export type ChipVariant = 'fill' | 'outline';

type ChipProps = {
  label: string;
  /** Muted line above the label, turning the chip into a two-line filter tile. */
  caption?: string;
  icon?: ReactNode;
  /** Count bubble after the label, as on the notification filters. */
  count?: number;
  trailing?: ChipTrailing;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
  variant?: ChipVariant;
  /** Let the chip stretch inside a row or grid instead of hugging its label. */
  grow?: boolean;
  style?: CSSProperties;
};

const TRAILING_ICONS: Record<Exclude<ChipTrailing, 'none'>, IonName> = {
  chevron: 'chevronDown',
  clear: 'close',
  check: 'checkmarkCircle',
};

export function Chip({
  label,
  caption,
  icon,
  count,
  trailing = 'none',
  selected = false,
  disabled = false,
  onPress,
  size = 'md',
  variant = 'fill',
  grow = false,
  style,
}: ChipProps) {
  const filled = selected && variant === 'fill';
  const tint = disabled
    ? Brand.textMuted
    : filled
      ? Brand.onAccent
      : selected
        ? Brand.accent
        : Brand.text;
  const accentTint = disabled ? Brand.textMuted : filled ? Brand.onAccent : Brand.accent;
  const iconSize = size === 'sm' ? 12 : 14;

  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.pill,
    border: `1px solid ${selected && !filled ? Brand.accent : Brand.cardBorder}`,
    backgroundColor: filled ? Brand.accent : selected ? Brand.accentSoft : Brand.backgroundElement,
    minHeight: caption ? undefined : size === 'sm' ? 36 : 40,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.md,
    paddingTop: caption ? Spacing.sm : Spacing.sm,
    paddingBottom: caption ? Spacing.sm : Spacing.sm,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    ...(caption ? { borderRadius: Radius.md } : null),
    ...(disabled ? { opacity: 0.5, cursor: 'default' } : { cursor: 'pointer' }),
    ...(grow ? { flex: 1 } : null),
    ...style,
  };

  const content = (
    <>
      {icon}

      {caption ? (
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: Spacing.xxs }}>
          <span
            style={{
              ...Typography.caption,
              color: filled ? Brand.onAccent : Brand.textMuted,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
            {caption}
          </span>
          <span style={{ ...Typography.label, color: tint, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </span>
        </span>
      ) : (
        <span
          style={{
            ...(size === 'sm' ? Typography.caption : Typography.label),
            ...(size === 'sm' ? { fontWeight: 600 } : null),
            color: tint,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
          {label}
        </span>
      )}

      {typeof count === 'number' ? (
        <span
          style={{
            minWidth: 16,
            height: 16,
            borderRadius: Radius.pill,
            paddingLeft: Spacing.xs,
            paddingRight: Spacing.xs,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: filled ? Brand.onAccent : Brand.accent,
            ...Typography.micro,
            color: filled ? Brand.accent : Brand.onAccent,
          }}>
          {count}
        </span>
      ) : null}

      {trailing !== 'none' ? (
        <Ion
          name={TRAILING_ICONS[trailing]}
          size={iconSize}
          color={trailing === 'check' ? accentTint : Brand.textMuted}
        />
      ) : null}
    </>
  );

  if (!onPress) return <span style={base}>{content}</span>;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      label={caption ? `${caption}: ${label}` : label}
      style={{ ...base, width: grow ? '100%' : undefined }}>
      {content}
    </PressableScale>
  );
}
