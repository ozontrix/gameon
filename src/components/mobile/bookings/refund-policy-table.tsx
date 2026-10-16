'use client';

/**
 * The cancellation refund table, built from the tiers the admin configured in
 * `GET /public/cancellation-policy` — never from hardcoded windows. The web twin of
 * the handset app's `components/bookings/refund-policy-table.tsx`.
 *
 * There is deliberately no reschedule column: the server models no reschedule
 * policy and the app cannot move a booking, so showing a rule nothing enforces
 * would be worse than showing none.
 */

import { Card, Ion } from '@/components/mobile/ui';
import {
  cancellationTone,
  cancellationWindowLabel,
  refundLabel,
  type CancellationTier,
} from '@/lib/mobile/constants/bookings';
import { Brand, Spacing, Typography } from '@/lib/mobile/theme';

const TONES = {
  success: Brand.success,
  warning: Brand.warning,
  danger: Brand.danger,
} as const;

export function RefundPolicyTable({
  tiers,
  /** The tier in force for this booking, highlighted. */
  activeMinHours,
}: {
  /** Largest notice period first, as the API returns them. */
  tiers: CancellationTier[];
  activeMinHours?: number;
}) {
  if (tiers.length === 0) return null;

  return (
    <Card padded={false}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: Spacing.sm,
          paddingLeft: Spacing.md,
          paddingRight: Spacing.md,
          paddingTop: Spacing.sm,
          paddingBottom: Spacing.sm,
          backgroundColor: Brand.backgroundSelected,
        }}>
        <span style={{ ...Typography.caption, color: Brand.textSecondary, fontWeight: 700, flex: 1.4 }}>
          Time before slot
        </span>
        <span style={{ ...Typography.caption, color: Brand.textSecondary, fontWeight: 700, flex: 1 }}>
          Refund
        </span>
      </div>

      {tiers.map((tier, index) => {
        const tint = TONES[cancellationTone(tier.refundPercent)];
        const active = tier.minHoursBefore === activeMinHours;
        return (
          <div
            key={tier.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: Spacing.sm,
              paddingLeft: Spacing.md,
              paddingRight: Spacing.md,
              paddingTop: Spacing.md,
              paddingBottom: Spacing.md,
              borderTop: `1px solid ${Brand.divider}`,
              backgroundColor: active ? Brand.accentSoft : 'transparent',
            }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: Spacing.xs,
                flex: 1.4,
                minWidth: 0,
              }}>
              <Ion
                name={active ? 'checkmarkCircle' : 'timeOutline'}
                size={12}
                color={tint}
              />
              <span
                style={{
                  ...Typography.caption,
                  color: Brand.text,
                  fontWeight: active ? 700 : 500,
                  flex: 1,
                }}>
                {cancellationWindowLabel(tiers, index)}
              </span>
            </span>
            <span style={{ ...Typography.caption, color: tint, fontWeight: 700, flex: 1 }}>
              {refundLabel(tier.refundPercent)}
            </span>
          </div>
        );
      })}
    </Card>
  );
}
