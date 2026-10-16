'use client';

/**
 * The header a pushed screen gets — a back affordance and a title.
 *
 * A guest reaching a screen that needs an account is sent back the same way,
 * which is why the back button is never conditional: there is always somewhere
 * to return to.
 */

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { Brand, Layout, Spacing, Typography } from '@/lib/mobile/theme';
import { ChevronLeftIcon } from './Icons';

export function TopBar({
  title,
  subtitle,
  trailing,
  onBack,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  /** Overrides the default one-step-back navigation. */
  onBack?: () => void;
}) {
  const router = useRouter();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: Spacing.md,
        minHeight: Layout.headerHeight,
      }}>
      <button
        type="button"
        aria-label="Go back"
        className="mobile-press"
        onClick={onBack ?? (() => router.back())}
        style={{
          width: Layout.iconButton,
          height: Layout.iconButton,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          border: `1px solid ${Brand.cardBorder}`,
          background: Brand.card,
          color: Brand.text,
          cursor: 'pointer',
        }}>
        <ChevronLeftIcon size={18} />
      </button>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={{ ...Typography.cardTitle, color: Brand.text }}>{title}</span>
        {subtitle ? (
          <span style={{ ...Typography.caption, color: Brand.textSecondary }}>{subtitle}</span>
        ) : null}
      </div>

      {trailing}
    </div>
  );
}
