'use client';

/**
 * The confirmation mark on the Booking Success screen — the web twin of the app
 * `components/payment/success-check.tsx`.
 *
 * Stamped rather than faded: the scale-and-rotate settles in one deliberate
 * motion, which is what makes a confirmation feel like an event instead of a
 * screen that appeared. The animation is in `mobile.css` (`.mobile-stamp`) and is
 * skipped entirely for anyone who has asked their device to reduce motion.
 */

import { Brand, Radius } from '@/lib/mobile/theme';
import { Ion } from '../ui';

export function SuccessCheck({ size = 104 }: { size?: number }) {
  return (
    <div className="mobile-stamp" style={{ display: 'flex', justifyContent: 'center' }}>
      <span
        style={{
          width: size,
          height: size,
          borderRadius: Radius.pill,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Brand.successSoft,
          border: `2px solid ${Brand.success}`,
        }}>
        <Ion name="checkmark" size={size * 0.46} color={Brand.success} />
      </span>
    </div>
  );
}
