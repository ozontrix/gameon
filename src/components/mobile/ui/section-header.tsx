'use client';

/**
 * The heading above a section of content: an accent rule (or icon), the title,
 * and an optional "View All" link on the right. The web twin of the app
 * `components/ui/section-header.tsx`.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Ion, type IonName } from './icons';
import { PressableScale } from './motion';

export function SectionHeader({
  title,
  icon,
  onViewAll,
  viewAllLabel = 'View All',
  trailing,
  style,
}: {
  title: string;
  /** Leading glyph, shown in place of the accent rule when provided. */
  icon?: IonName;
  onViewAll?: () => void;
  viewAllLabel?: string;
  /** Anything else for the right-hand slot, instead of "View All". */
  trailing?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        ...style,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, minWidth: 0 }}>
        {icon ? (
          <Ion name={icon} size={16} color={Brand.accent} />
        ) : (
          <span
            style={{
              width: 4,
              height: 22,
              flexShrink: 0,
              borderRadius: Radius.xs,
              backgroundColor: Brand.accent,
            }}
          />
        )}
        <span style={{ ...Typography.sectionTitle, color: Brand.text, margin: 0 }}>{title}</span>
      </div>

      {trailing ??
        (onViewAll ? (
          <PressableScale
            onPress={onViewAll}
            label={`${viewAllLabel}: ${title}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: Spacing.xs,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              ...Typography.bodyStrong,
              color: Brand.accent,
              whiteSpace: 'nowrap',
            }}>
            {viewAllLabel}
            <Ion name="chevronForward" size={14} color={Brand.accent} />
          </PressableScale>
        ) : null)}
    </div>
  );
}
