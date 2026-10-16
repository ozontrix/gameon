'use client';

/**
 * A tinted callout for policy text, custom-booking notes and wallet hints — the
 * recurring "ⓘ …" block in the mockups. The web twin of the app
 * `components/ui/info-note.tsx`.
 */

import type { CSSProperties } from 'react';

import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Ion, type IonName } from './icons';

export type NoteTone = 'info' | 'accent' | 'success' | 'danger';

const TINTS: Record<NoteTone, string> = {
  info: Brand.info,
  accent: Brand.accent,
  success: Brand.success,
  danger: Brand.danger,
};

const SOFT: Record<NoteTone, string> = {
  info: Brand.infoSoft,
  accent: Brand.accentSoft,
  success: Brand.successSoft,
  danger: Brand.dangerSoft,
};

const DEFAULT_ICONS: Record<NoteTone, IonName> = {
  info: 'informationCircleOutline',
  accent: 'alertCircleOutline',
  success: 'checkmarkCircleOutline',
  danger: 'warningOutline',
};

export function InfoNote({
  title,
  body,
  tone = 'info',
  icon,
  style,
}: {
  /** Bold first line, e.g. "Policy Note". Omit for a single-paragraph note. */
  title?: string;
  body: string;
  tone?: NoteTone;
  icon?: IonName;
  style?: CSSProperties;
}) {
  const tint = TINTS[tone];
  return (
    <div
      style={{
        display: 'flex',
        gap: Spacing.sm,
        borderRadius: Radius.md,
        border: `1px solid ${tint}`,
        backgroundColor: SOFT[tone],
        padding: Spacing.md,
        ...style,
      }}>
      <Ion name={icon ?? DEFAULT_ICONS[tone]} size={15} color={tint} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: Spacing.xxs, minWidth: 0 }}>
        {title ? <span style={{ ...Typography.label, color: tint }}>{title}</span> : null}
        <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>{body}</span>
      </div>
    </div>
  );
}
