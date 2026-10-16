'use client';

/**
 * Transactions — `/app/accounts/transactions`. The web twin of the handset app's
 * `(tabs)/accounts/transactions.tsx`.
 *
 * This is the wider history: what the wallet shows a page of, with the filters the
 * server applies before pagination and the Points tiles above it. Payments are in
 * rupees and Points movements are in PTS, and the table keeps the two units apart
 * rather than adding them together.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { FilterChips } from '@/components/mobile/transactions/filter-chips';
import { StatCards } from '@/components/mobile/transactions/stat-cards';
import { TransactionTable } from '@/components/mobile/transactions/transaction-table';
import {
  AppHeader,
  Button,
  EmptyState,
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
import { REFUND_NOTE } from '@/lib/mobile/constants/bookings';
import {
  toHistoryTransaction,
  type AccountHistoryEntry,
  type AccountTransaction,
  type TxnFilter,
} from '@/lib/mobile/constants/transactions';
import { Brand, Spacing, Typography } from '@/lib/mobile/theme';
import { api } from '@/lib/mobile/api-client';

/** How many rows one page holds. */
const PAGE_SIZE = 20;

/**
 * The account history, one filter at a time.
 *
 * The reader lives here rather than in `useApi` because the screen accumulates
 * pages: "Load more" appends, while a change of filter starts again. Only the most
 * recent request may commit, so a slow page cannot land on top of a newer filter.
 */
function useTransactions(filter: TxnFilter) {
  const [rows, setRows] = useState<AccountTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ticket = useRef(0);
  const held = useRef<AccountTransaction[]>([]);

  const load = useCallback(
    async (page: number) => {
      const current = (ticket.current += 1);
      setLoading(true);
      setError(null);
      try {
        const res = (await api.get(
          `/user/transactions?filter=${filter}&page=${page}&limit=${PAGE_SIZE}`,
        )) as { data?: AccountHistoryEntry[]; total?: number; hasMore?: boolean };
        if (ticket.current !== current) return;
        const next = (res?.data ?? []).map(toHistoryTransaction);
        held.current = page === 1 ? next : [...held.current, ...next];
        setRows(held.current);
        setTotal(Number(res?.total ?? 0));
        setHasMore(Boolean(res?.hasMore));
      } catch (cause) {
        if (ticket.current !== current) return;
        if (page === 1) {
          held.current = [];
          setRows([]);
        }
        setError(cause instanceof Error ? cause.message : 'Could not load your transactions.');
      } finally {
        if (ticket.current === current) setLoading(false);
      }
    },
    [filter],
  );

  // Started on a microtask rather than inline: a synchronous setState inside an
  // effect is a cascading render, which the React Compiler flags.
  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      await load(1);
    })();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    await load(Math.floor(held.current.length / PAGE_SIZE) + 1);
  }, [loading, hasMore, load]);

  const refresh = useCallback(async () => {
    await load(1);
  }, [load]);

  return { rows, total, hasMore, loading, error, loadMore, refresh };
}

export default function TransactionsPage() {
  const { isGuest, user } = useSession();
  const { waiting } = useAccountGate();

  if (waiting) return <AuthWait />;

  if (isGuest || !user) {
    return (
      <Screen>
        <AppHeader variant="back" showBell={false} />
        <SignInGate
          icon="receiptOutline"
          title="Sign in to see your transactions"
          body="Your sports bookings, event tickets, tournament payments and Points activity appear here."
        />
      </Screen>
    );
  }

  // Keyed on the account, so a different player signing in never sees the previous
  // player's history.
  return <TransactionsContent key={user.id} />;
}

function TransactionsContent() {
  const [filter, setFilter] = useState<TxnFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const { rows, total, hasMore, loading, error, loadMore, refresh } = useTransactions(filter);
  const { refresh: refreshWallet } = useWallet();

  const firstLoad = loading && rows.length === 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshWallet()]);
    setRefreshing(false);
  };

  return (
    <Screen>
      <AppHeader
        variant="back"
        showBell={false}
        right={
          <button
            type="button"
            aria-label="Refresh my transactions"
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
          <span style={{ ...Typography.screenTitle, color: Brand.text }}>Transactions</span>
          <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>
            Sports bookings, event tickets, tournament payments and Points activity.
          </span>
        </div>

        <StatCards />
        <FilterChips active={filter} onChange={setFilter} />

        {firstLoad ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: Spacing.five }}>
            <Spinner />
          </div>
        ) : error && rows.length === 0 ? (
          <EmptyState
            icon="informationCircleOutline"
            title="Couldn't load your transactions"
            body={error}
            actionLabel="Try Again"
            onAction={() => void onRefresh()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="receiptOutline"
            title="No transactions yet"
            body="Completed payments and Points activity will appear here. Try another filter if needed."
          />
        ) : (
          <>
            <TransactionTable transactions={rows} />

            {error ? (
              <span
                role="alert"
                style={{ ...Typography.caption, color: Brand.danger, textAlign: 'center' }}>
                {error}
              </span>
            ) : null}

            {hasMore ? (
              <Button
                label={loading ? 'Loading…' : 'Load more'}
                variant="secondary"
                size="md"
                disabled={loading}
                onPress={() => void loadMore()}
                fullWidth
              />
            ) : (
              <span
                style={{ ...Typography.caption, color: Brand.textMuted, textAlign: 'center' }}>
                {total} {total === 1 ? 'entry' : 'entries'}
              </span>
            )}
          </>
        )}

        <InfoNote title="Policy Note" body={REFUND_NOTE} />
      </ScreenScroll>
    </Screen>
  );
}
