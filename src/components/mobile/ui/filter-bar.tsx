'use client';

/**
 * The app's filter bar: a pinned "Filter" control on the left, then a
 * horizontally scrollable row of dimension chips ending in "Clear". The web
 * twin of the app `components/ui/filter-bar.tsx`.
 *
 * Only "Filter" is pinned. It opens every dimension at once, so it is the one
 * control that must stay reachable no matter how far the strip has scrolled;
 * everything else, "Clear" included, scrolls with the chips and leaves the strip
 * its full width.
 *
 * A grid of filter chips is the obvious layout and the wrong one on a phone:
 * six two-line chips in a bordered card cost ~195pt of vertical space, which
 * pushed the first result below the fold. One scrollable row costs 36pt.
 *
 * Each chip shows its dimension name until a value is chosen, then the value
 * itself, so the row stays readable without a separate label line.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Brand, Layout, Spacing, Typography } from '@/lib/mobile/theme';
import { Chip } from './chip';
import { Ion } from './icons';
import { PressableScale } from './motion';

/** One filter dimension in the bar. */
export type FilterBarItem = {
  key: string;
  /** Shown while nothing is chosen for this dimension. */
  label: string;
  /** Shown in place of the label once a value is chosen. */
  value?: string;
  icon?: ReactNode;
};

export function FilterBar({
  items,
  onSelect,
  onClearAll,
  activeCount,
  onOpenAll,
}: {
  items: FilterBarItem[];
  /** Opens the sheet for one dimension. */
  onSelect: (key: string) => void;
  onClearAll: () => void;
  activeCount: number;
  /** Adds a leading chip that opens every dimension in one sheet. */
  onOpenAll?: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: Spacing.sm,
        minHeight: Layout.minHitTarget,
      }}>
      {onOpenAll ? (
        <div
          style={{
            paddingRight: Spacing.sm,
            borderRight: `1px solid ${Brand.cardBorder}`,
            flexShrink: 0,
          }}>
          <Chip
            label="Filter"
            icon={<Ion name="optionsOutline" size={12} color={activeCount > 0 ? Brand.accent : Brand.text} />}
            count={activeCount > 0 ? activeCount : undefined}
            size="sm"
            variant="outline"
            selected={activeCount > 0}
            onPress={onOpenAll}
          />
        </div>
      ) : null}

      <div
        className="mobile-scroll"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: Spacing.sm,
          flex: 1,
          minWidth: 0,
          overflowX: 'auto',
          paddingRight: Spacing.xs,
        }}>
        {items.map((item) => (
          <Chip
            key={item.key}
            label={item.value ?? item.label}
            icon={item.icon}
            trailing="chevron"
            size="sm"
            variant="outline"
            selected={Boolean(item.value)}
            onPress={() => onSelect(item.key)}
          />
        ))}

        {activeCount > 0 ? (
          <PressableScale
            onPress={onClearAll}
            label="Clear all filters"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: Spacing.xs,
              paddingLeft: Spacing.sm,
              paddingRight: Spacing.sm,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}>
            <Ion name="refresh" size={14} color={Brand.accent} />
            <span style={{ ...Typography.caption, fontWeight: 700, color: Brand.accent }}>Clear</span>
          </PressableScale>
        ) : null}
      </div>
    </div>
  );
}

/** The bar's own container style, so a screen can pin it identically. */
export const FilterBarRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: Spacing.sm,
};
