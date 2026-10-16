'use client';

/**
 * The round sport badge and its name — the identity marker above a venue,
 * booking or event title throughout the mockups. The web twin of the app
 * `components/ui/sport-pill.tsx`.
 */

import type { CSSProperties } from 'react';

import { SportGlyph } from '@/components/mobile/sport-icons';
import { SPORT_LABELS, type SportKind } from '@/lib/mobile/constants/sports';
import { Brand, Radius, Spacing, SportColors, Typography } from '@/lib/mobile/theme';

export function SportPill({
  sport,
  /** Override the displayed name; defaults to the capitalised sport. */
  label,
  size = 'md',
  /** Hide the text and render the round badge alone. */
  iconOnly = false,
  style,
}: {
  sport: SportKind;
  label?: string;
  size?: 'sm' | 'md';
  iconOnly?: boolean;
  style?: CSSProperties;
}) {
  const diameter = size === 'sm' ? 18 : 22;
  const tint = SportColors[sport];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: Spacing.sm,
        ...style,
      }}>
      <span
        style={{
          width: diameter,
          height: diameter,
          borderRadius: Radius.pill,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tint,
          flexShrink: 0,
        }}>
        <SportGlyph sport={sport} size={diameter * 0.62} color={Brand.onAccent} />
      </span>
      {iconOnly ? null : (
        <span
          style={{
            ...(size === 'sm' ? { ...Typography.caption, fontWeight: 600 } : Typography.label),
            color: tint,
          }}>
          {label ?? SPORT_LABELS[sport]}
        </span>
      )}
    </span>
  );
}
