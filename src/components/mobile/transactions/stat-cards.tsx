'use client';

/**
 * The two Points tiles above the transactions table — the web twin of the handset
 * app's `components/transactions/stat-cards.tsx`: what is spendable now, and what
 * has ever been earned.
 *
 * A read that has not come back shows zero rather than a stale figure, for the same
 * reason the wallet does: Points must never look spendable when we could not
 * confirm them.
 */

import { Card, Ion } from '@/components/mobile/ui';
import { useWallet } from '@/components/mobile/wallet-provider';
import { Brand, Spacing, Typography } from '@/lib/mobile/theme';

function StatCard({
  label,
  value,
  caption,
  icon,
}: {
  label: string;
  value: number;
  caption: string;
  icon: React.ReactNode;
}) {
  return (
    <Card
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: Spacing.md,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.lg,
      }}>
      <span
        style={{
          ...Typography.caption,
          color: Brand.textSecondary,
          fontWeight: 600,
          textAlign: 'center',
        }}>
        {label}
      </span>

      <span style={{ display: 'inline-flex', alignItems: 'center', gap: Spacing.sm }}>
        {icon}
        <span style={{ color: Brand.accent, fontSize: 24, fontWeight: 800, letterSpacing: 0.2 }}>
          {value.toLocaleString('en-IN')}
        </span>
        <span style={{ color: Brand.accent, fontSize: 14, fontWeight: 700 }}>PTS</span>
      </span>

      <span style={{ ...Typography.caption, color: Brand.textSecondary, textAlign: 'center' }}>
        {caption}
      </span>
    </Card>
  );
}

export function StatCards() {
  const { summary, loading } = useWallet();
  const value = (amount: number) => (loading ? 0 : amount);

  return (
    <div style={{ display: 'flex', gap: Spacing.md }}>
      <StatCard
        label="GameOn Points Balance"
        value={value(summary.balance)}
        caption="Available to use"
        icon={
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              border: `1.5px solid ${Brand.accent}`,
              backgroundColor: Brand.accentSoft,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <span style={{ color: Brand.accent, fontSize: 16, fontWeight: 800 }}>G</span>
          </span>
        }
      />
      <StatCard
        label="Lifetime Points Earned"
        value={value(summary.totalEarned)}
        caption="Total points earned"
        icon={<Ion name="walletOutline" size={22} color={Brand.accent} />}
      />
    </div>
  );
}
