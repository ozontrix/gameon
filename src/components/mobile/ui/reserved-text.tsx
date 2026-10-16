'use client';

/**
 * Text that always occupies the same number of line boxes.
 *
 * In a row of tiles, letting copy decide its own height means no two tiles
 * match: at four across, "Easy Booking" takes one line and "Trusted Venues"
 * takes two, so nothing below them aligns. Reserving the space fixes the row
 * regardless of what the copy says.
 *
 * `-webkit-line-clamp` caps the maximum but not the minimum, which is why the
 * box height is set explicitly from the same number that clamps it.
 */

import type { CSSProperties } from 'react';

export function ReservedText({
  children,
  /** Line boxes to occupy, whether or not the copy fills them. */
  lines,
  /** Height of one line box. Must match the style's own `lineHeight`. */
  lineHeight,
  /** Centre a short label inside the reserve instead of top-aligning it. */
  center = false,
  style,
}: {
  children: string;
  lines: number;
  lineHeight: number;
  center?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: 'block',
        height: lineHeight * lines,
        lineHeight: `${lineHeight}px`,
        overflow: 'hidden',
        ...(center ? { display: 'flex', alignItems: 'center', justifyContent: 'center' } : null),
        ...style,
      }}>
      {children}
    </span>
  );
}
