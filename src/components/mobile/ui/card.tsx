'use client';

/**
 * The standard raised surface — the web twin of the handset app's
 * `components/ui/card.tsx`. Nearly every block in the mockups sits on one.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Brand, Radius, Spacing } from '@/lib/mobile/theme';
import { PressableScale } from './motion';

type CardProps = {
  children: ReactNode;
  /** Turn off to let a hero image or gallery bleed to the card's edges. */
  padded?: boolean;
  /** Makes the whole card a touch target. */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Draw the accent border, for the selected state in a set of cards. */
  selected?: boolean;
  style?: CSSProperties;
  className?: string;
};

export function Card({
  children,
  padded = true,
  onPress,
  accessibilityLabel,
  selected = false,
  style,
  className,
}: CardProps) {
  const base: CSSProperties = {
    backgroundColor: Brand.card,
    borderRadius: Radius.lg,
    border: `1px solid ${selected ? Brand.accent : Brand.cardBorder}`,
    overflow: 'hidden',
    ...(padded ? { padding: Spacing.md } : null),
    ...style,
  };

  if (!onPress) {
    return (
      <div className={className} style={base}>
        {children}
      </div>
    );
  }

  return (
    <PressableScale onPress={onPress} label={accessibilityLabel} style={base} className={className}>
      {children}
    </PressableScale>
  );
}

/** A hairline between two rows, for lists built outside a `Card`. */
export function Divider({ style }: { style?: CSSProperties }) {
  return <div style={{ height: 1, background: Brand.divider, width: '100%', ...style }} />;
}

/**
 * A divider-separated row inside a `Card`. Pass `last` to drop the trailing
 * rule on the final row of a list.
 */
export function CardRow({
  children,
  last = false,
  onPress,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  last?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: CSSProperties;
}) {
  const base: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    ...(last ? null : { borderBottom: `1px solid ${Brand.divider}` }),
    ...style,
  };

  if (!onPress) return <div style={base}>{children}</div>;

  return (
    <PressableScale onPress={onPress} label={accessibilityLabel} style={base}>
      {children}
    </PressableScale>
  );
}
