import { Brand, Spacing } from '@/lib/mobile/theme';
import { BrandLogo } from './BrandLogo';
import { Spinner } from './ui';

/**
 * What the auth screens show while the stored session is still being read.
 *
 * Without it a cold start lands on the login form for a moment before the
 * redirect to the dashboard fires, which reads as if the player had been signed
 * out.
 */
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
        background: Brand.background,
        minHeight: '100%',
      }}>
      <BrandLogo />
      <Spinner />
      <span style={{ color: Brand.textMuted, fontSize: 12 }}>Restoring your session…</span>
    </div>
  );
}
