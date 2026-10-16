'use client';

/**
 * The payment screen's reassurance marks — the web twin of the app
 * `components/payment/trust-strip.tsx`.
 *
 * Text pills, not gateway logos, and no PCI DSS badge: certification sits with
 * the gateway, not with GameOn, so claiming it here would be untrue.
 */

import { PAYMENT_GATEWAY_NAME, PAYMENT_TRUST_MARKS } from '@/lib/mobile/constants/payment';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Ion } from '../ui';

/** The small "Secure" flag beside the Payment heading. */
export function SecureBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Spacing.xs,
        borderRadius: Radius.pill,
        border: `1px solid ${Brand.success}`,
        backgroundColor: Brand.successSoft,
        paddingLeft: Spacing.sm,
        paddingRight: Spacing.sm,
        paddingTop: Spacing.xs,
        paddingBottom: Spacing.xs,
        flexShrink: 0,
      }}>
      <Ion name="lockClosed" size={12} color={Brand.success} />
      <span style={{ ...Typography.micro, color: Brand.success }}>SECURE</span>
    </span>
  );
}

export function TrustStrip() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        flexWrap: 'wrap',
      }}>
      <span style={{ ...Typography.caption, color: Brand.textMuted }}>
        Payments handled by {PAYMENT_GATEWAY_NAME}
      </span>
      {PAYMENT_TRUST_MARKS.map((mark) => (
        <span
          key={mark}
          style={{
            ...Typography.micro,
            color: Brand.textSecondary,
            borderRadius: Radius.xs,
            border: `1px solid ${Brand.cardBorder}`,
            paddingLeft: Spacing.sm,
            paddingRight: Spacing.sm,
            paddingTop: Spacing.xxs,
            paddingBottom: Spacing.xxs,
          }}>
          {mark}
        </span>
      ))}
    </div>
  );
}
