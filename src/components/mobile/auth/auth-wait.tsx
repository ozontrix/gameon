'use client';

/**
 * What the auth screens show while the stored session is still being read.
 *
 * Without it a cold start lands on the login form for a moment before the
 * redirect to the dashboard fires, which reads as if the player had been signed
 * out.
 */

import { Brand, Spacing, Typography } from '@/lib/mobile/theme';
import { Spinner } from '../ui';
import { BrandLogo } from './brand-logo';

export function AuthWait() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.lg,
        backgroundColor: Brand.background,
        minHeight: '100%',
      }}>
      <BrandLogo />
      <Spinner />
      <span style={{ ...Typography.caption, color: Brand.textMuted }}>
        Restoring your session…
      </span>
    </div>
  );
}
