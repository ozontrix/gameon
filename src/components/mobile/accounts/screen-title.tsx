'use client';

/**
 * The title block every Account sub-screen opens with — the web twin of the handset
 * app's `components/accounts/screen-title.tsx`.
 */

import { Brand, Spacing } from '@/lib/mobile/theme';

export function ScreenTitle({
  title,
  subtitle,
  updatedAt,
}: {
  title: string;
  subtitle?: string;
  updatedAt?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.one, paddingTop: Spacing.one }}>
      <span style={{ color: Brand.text, fontSize: 26, fontWeight: 800 }}>{title}</span>
      {subtitle ? (
        <span style={{ color: Brand.textSecondary, fontSize: 14, lineHeight: '20px' }}>
          {subtitle}
        </span>
      ) : null}
      {updatedAt ? (
        <span style={{ color: Brand.textMuted, fontSize: 13, marginTop: Spacing.one }}>
          {updatedAt}
        </span>
      ) : null}
    </div>
  );
}
