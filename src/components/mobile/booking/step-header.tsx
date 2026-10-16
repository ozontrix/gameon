'use client';

/**
 * A numbered step heading on the booking screen — "1. Choose Court" — with room
 * on the right for a glyph or a note. The web twin of the app
 * `components/booking/step-header.tsx`.
 */

import type { ReactNode } from 'react';

import { Brand, Spacing, Typography } from '@/lib/mobile/theme';

export function StepHeader({
  step,
  title,
  right,
}: {
  step: number;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
      }}>
      <span style={{ ...Typography.blockTitle, color: Brand.text }}>
        {step}. {title}
      </span>
      {right ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: Spacing.sm }}>{right}</span>
      ) : null}
    </div>
  );
}
