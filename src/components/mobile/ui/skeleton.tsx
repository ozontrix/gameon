'use client';

/**
 * Loading placeholders — the web twin of the handset app's
 * `components/ui/skeleton.tsx`, plus the spinner the button kit needs.
 *
 * The sweep is a soft gradient band rather than a pulsing opacity, because a
 * pulse reads as something blinking for attention while a sweep reads as work
 * in progress — which is what a skeleton is meant to say. The band's travel is
 * a CSS transform, so it runs off the main thread and keeps animating while the
 * JS that will replace it is busy.
 *
 * Anyone who has asked their device to reduce motion gets the resting block
 * with no sweep.
 */

import type { CSSProperties } from 'react';

import { Brand, Radius } from '@/lib/mobile/theme';

/** A circular progress ring. Size is the diameter in pixels. */
export function Spinner({ size = 22, color = Brand.accent }: { size?: number; color?: string }) {
  return (
    <svg
      className="mobile-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading">
      <circle cx="12" cy="12" r="9" stroke={color} strokeOpacity="0.25" strokeWidth="2.5" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  /** Corner radius; pass `Radius.pill` for an avatar. */
  radius?: number;
  style?: CSSProperties;
};

export function Skeleton({ width = '100%', height = 16, radius = Radius.sm, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: Brand.backgroundSelected,
        width,
        height,
        borderRadius: radius,
        ...style,
      }}>
      <div className="mobile-skeleton-band" />
    </div>
  );
}

/**
 * A stack of skeleton lines standing in for a paragraph. The last line is
 * shortened, which is what stops a block of them looking like a table.
 */
export function SkeletonText({
  lines = 3,
  lineHeight = 12,
  gap = 8,
  style,
}: {
  lines?: number;
  lineHeight?: number;
  gap?: number;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? '62%' : '100%'}
          radius={Radius.xs}
        />
      ))}
    </div>
  );
}
