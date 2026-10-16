'use client';

/**
 * Shown when a filtered list comes back empty — so no screen ever renders a
 * blank gap where content is expected. The web twin of the app
 * `components/ui/empty-state.tsx`.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Ion, type IonName } from './icons';
import { Button } from './button';

export function EmptyState({
  icon = 'searchOutline',
  title,
  body,
  actionLabel,
  onAction,
  /** A node instead of a glyph name, for a sport badge or an illustration. */
  leading,
  style,
}: {
  icon?: IonName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  leading?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: Spacing.md,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.xl,
        paddingLeft: Spacing.lg,
        paddingRight: Spacing.lg,
        ...style,
      }}>
      <span
        style={{
          width: 58,
          height: 58,
          borderRadius: Radius.pill,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Brand.accentSoft,
          color: Brand.accent,
        }}>
        {leading ?? <Ion name={icon} size={26} color={Brand.accent} />}
      </span>

      <span style={{ ...Typography.blockTitle, color: Brand.text }}>{title}</span>

      {body ? (
        <span style={{ ...Typography.bodySmall, color: Brand.textSecondary, maxWidth: 300 }}>
          {body}
        </span>
      ) : null}

      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="secondary" size="md" onPress={onAction} />
      ) : null}
    </div>
  );
}
