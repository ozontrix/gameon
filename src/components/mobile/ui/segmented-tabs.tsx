'use client';

/**
 * An inset segmented control — the Upcoming / Ongoing / Past switcher on My
 * Bookings and the same pattern wherever a screen splits one list in three. The
 * web twin of the app `components/ui/segmented-tabs.tsx`.
 */

import type { CSSProperties } from 'react';

import { Brand, Layout, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Ion, type IonName } from './icons';
import { PressableScale } from './motion';

export type SegmentedOption<T extends string> = {
  key: T;
  label: string;
  icon?: IonName;
};

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (key: T) => void;
  style?: CSSProperties;
}) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: Spacing.xs,
        borderRadius: Radius.md,
        border: `1px solid ${Brand.cardBorder}`,
        backgroundColor: Brand.backgroundElement,
        padding: Spacing.xs,
        ...style,
      }}>
      {options.map((option) => {
        const active = option.key === value;
        const tint = active ? Brand.accent : Brand.textSecondary;
        return (
          <PressableScale
            key={option.key}
            onPress={() => onChange(option.key)}
            label={option.label}
            style={{
              flex: 1,
              minHeight: Layout.minHitTarget,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Spacing.sm,
              borderRadius: Radius.sm,
              border: 'none',
              backgroundColor: active ? Brand.accentSoft : 'transparent',
              color: tint,
              cursor: 'pointer',
              fontFamily: 'inherit',
              ...Typography.label,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}>
            {option.icon ? <Ion name={option.icon} size={14} color={tint} /> : null}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{option.label}</span>
          </PressableScale>
        );
      })}
    </div>
  );
}
