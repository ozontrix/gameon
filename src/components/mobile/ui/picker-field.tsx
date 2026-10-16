'use client';

/**
 * A read-only field that opens a picker — visually identical to {@link TextField}
 * so mixed forms line up, but it hands off to a sheet. The web twin of the app
 * `components/ui/picker-field.tsx`.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Ion } from './icons';
import { PressableScale } from './motion';

export function PickerField({
  /** Muted label rendered inside the field, above the value. */
  label,
  value,
  onPress,
  icon,
  /** Let the field share a row equally with a sibling. */
  grow = false,
  style,
}: {
  label: string;
  value: string;
  onPress: () => void;
  icon?: ReactNode;
  grow?: boolean;
  style?: CSSProperties;
}) {
  return (
    <PressableScale
      onPress={onPress}
      label={`${label}: ${value}`}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        minHeight: 48,
        width: '100%',
        borderRadius: Radius.md,
        border: `1px solid ${Brand.cardBorder}`,
        backgroundColor: Brand.backgroundElement,
        paddingLeft: Spacing.md,
        paddingRight: Spacing.md,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.sm,
        fontFamily: 'inherit',
        textAlign: 'left',
        ...(grow ? { flex: 1, minWidth: 0 } : null),
        ...style,
      }}>
      {icon ? <span style={{ display: 'inline-flex', flexShrink: 0 }}>{icon}</span> : null}

      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={{ ...Typography.caption, color: Brand.textMuted }}>{label}</span>
        <span
          style={{
            ...Typography.label,
            color: Brand.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
          {value}
        </span>
      </span>

      <Ion name="chevronDown" size={14} color={Brand.textMuted} />
    </PressableScale>
  );
}
