'use client';

/**
 * GameOn Wallet — `/app/accounts/wallet`. The web twin of the handset app's
 * `(tabs)/accounts/wallet.tsx`: the Points balance, what it has ever done, the
 * recent ledger, and the way into the full history.
 *
 * Points are money-adjacent, so every figure here comes from `/user/wallet` through
 * the wallet provider — there is no optimistic arithmetic on this screen.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { TransactionTable } from '@/components/mobile/transactions/transaction-table';
import {
  AppHeader,
  Button,
  Card,
  InfoNote,
  Ion,
  Screen,
  ScreenScroll,
  SignInGate,
  Spinner,
} from '@/components/mobile/ui';
import { AuthWait } from '@/components/mobile/auth/auth-wait';
import { useAccountGate } from '@/components/mobile/use-auth-guard';
import { useSession } from '@/components/mobile/session-provider';
import { useWallet } from '@/components/mobile/wallet-provider';
import { toAccountTransaction } from '@/lib/mobile/constants/transactions';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';

/** How many ledger rows the wallet shows before sending the player to the history. */
const RECENT_ROWS = 5;

export default function WalletPage() {
  const router = useRouter();
  const { isGuest } = useSession();
  const { waiting } = useAccountGate();
  // Read before the guest gate below: hooks run in the same order on every render.
  const { summary, entries, loading, refresh } = useWallet();
  const [refreshing, setRefreshing] = useState(false);

  if (waiting) return <AuthWait />;

  if (isGuest) {
    return (
      <Screen>
        <AppHeader variant="back" showBell={false} />
        <SignInGate
          icon="walletOutline"
          title="Sign in for your GameOn Wallet"
          body="Earn Points on every booking and redeem them at checkout once you have an account."
        />
      </Screen>
    );
  }

  const recent = entries.slice(0, RECENT_ROWS).map(toAccountTransaction);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <Screen>
      <AppHeader
        variant="back"
        showBell={false}
        right={
          // The handset refreshes by pulling down; a browser has no such gesture.
          <button
            type="button"
            aria-label="Refresh my wallet"
            onClick={() => void onRefresh()}
            className="mobile-press"
            style={{
              width: 34,
              height: 34,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              opacity: refreshing ? 0.5 : 1,
            }}>
            <Ion name="refresh" size={18} color={Brand.text} />
          </button>
        }
      />

      <ScreenScroll gap={Spacing.lg}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
          <span style={{ ...Typography.screenTitle, color: Brand.text }}>GameOn Wallet</span>
          <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>
            Use your GameOn Points to book playgrounds and get exciting rewards.
          </span>
        </div>

        {/* The balance, and what the Points have ever done. */}
        <Card
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: Spacing.md,
            paddingTop: Spacing.lg,
            paddingBottom: Spacing.lg,
            borderColor: Brand.accent,
          }}>
          <span style={{ ...Typography.caption, color: Brand.textSecondary }}>
            GameOn Points Balance
          </span>

          <span style={{ display: 'inline-flex', alignItems: 'center', gap: Spacing.sm }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: Radius.pill,
                border: `1.5px solid ${Brand.accent}`,
                backgroundColor: Brand.accentSoft,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <span style={{ color: Brand.accent, fontSize: 18, fontWeight: 800 }}>G</span>
            </span>
            {loading ? (
              <Spinner size={20} />
            ) : (
              <span style={{ color: Brand.accent, fontSize: 30, fontWeight: 800 }}>
                {summary.balance.toLocaleString('en-IN')}
              </span>
            )}
            <span style={{ color: Brand.accent, fontSize: 15, fontWeight: 700 }}>PTS</span>
          </span>

          <span style={{ display: 'flex', gap: Spacing.five, flexWrap: 'wrap' }}>
            <Stat label="Lifetime earned" value={summary.totalEarned} />
            <Stat label="Lifetime used" value={summary.totalUsed} />
          </span>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <span style={{ ...Typography.sectionTitle, color: Brand.text }}>Recent Activity</span>

          {loading && entries.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: Spacing.md }}>
              <Spinner />
            </div>
          ) : (
            <TransactionTable transactions={recent} />
          )}

          <Button
            label="View all transactions"
            variant="secondary"
            size="md"
            onPress={() => router.push('/app/accounts/transactions')}
            fullWidth
          />
        </div>

        <InfoNote
          title="How Points work"
          body="You earn Points on completed bookings, and when you cancel inside the policy window the refund comes back to you as Points. Points are redeemed at checkout, against a court booking, for as much of the price as you choose."
        />
      </ScreenScroll>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ ...Typography.caption, color: Brand.textMuted }}>{label}</span>
      <span style={{ ...Typography.label, color: Brand.text }}>
        {value.toLocaleString('en-IN')} PTS
      </span>
    </span>
  );
}
