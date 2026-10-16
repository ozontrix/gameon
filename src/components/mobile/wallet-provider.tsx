'use client';

/**
 * The signed-in player's GameOn Points — the web twin of the app
 * `context/wallet.tsx`.
 *
 * Points are money-adjacent, so the server is the only source: there is no
 * optimistic update anywhere here, and a failed read shows zero rather than a
 * stale figure. Keyed by the account it belongs to, so a different player
 * signing in never briefly sees the previous player's balance.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { api } from '@/lib/mobile/api-client';
import { useSession } from './session-provider';

/** How many ledger rows one page holds. */
const PAGE_SIZE = 20;

/** One row of the Points ledger, as `GET /user/transactions?filter=wallet` returns it. */
export type WalletLedgerEntry = {
  key: string;
  title: string;
  subtitle: string;
  amount: number;
  /** `+240 PTS` / `-1,200 PTS`, already signed for display. */
  signedAmount: string;
  date: string;
  kind: string;
};

/** `GET /user/wallet` — the balance a booking can draw on, plus lifetime totals. */
export type WalletSummary = { balance: number; totalEarned: number; totalUsed: number };

const EMPTY_SUMMARY: WalletSummary = { balance: 0, totalEarned: 0, totalUsed: 0 };

type WalletValue = {
  summary: WalletSummary;
  loading: boolean;
  error: string | null;
  entries: WalletLedgerEntry[];
  /** Every ledger row the server holds for this player, not just the loaded page. */
  total: number;
  hasMore: boolean;
  ledgerLoading: boolean;
  ledgerError: string | null;
  loadMore: () => Promise<void>;
  /** Reloads the balance and the first page of the ledger together. */
  refresh: () => Promise<void>;
};

const WalletContext = createContext<WalletValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { isGuest, user } = useSession();
  const userId = isGuest ? null : user?.id ?? null;

  // Keyed on the account, so signing in as someone else remounts this with clean
  // state and the previous player's balance can never show, not even for a frame.
  return (
    <WalletStore key={userId ?? 'guest'} userId={userId}>
      {children}
    </WalletStore>
  );
}

function WalletStore({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [summary, setSummary] = useState<WalletSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [entries, setEntries] = useState<WalletLedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  // Only the most recent request for each resource may commit its result, so a
  // slow reply cannot overwrite a newer one.
  const summaryTicket = useRef(0);
  const ledgerTicket = useRef(0);

  const loadSummary = useCallback(async () => {
    const ticket = (summaryTicket.current += 1);
    setLoading(true);
    setError(null);
    try {
      const res = (await api.get('/user/wallet')) as { data?: Partial<WalletSummary> };
      if (summaryTicket.current !== ticket) return;
      const data = res?.data ?? {};
      setSummary({
        balance: Number(data.balance ?? 0),
        totalEarned: Number(data.totalEarned ?? 0),
        totalUsed: Number(data.totalUsed ?? 0),
      });
    } catch (cause) {
      if (summaryTicket.current !== ticket) return;
      setSummary(EMPTY_SUMMARY);
      setError(cause instanceof Error ? cause.message : 'Could not load your wallet.');
    } finally {
      if (summaryTicket.current === ticket) setLoading(false);
    }
  }, []);

  const loadLedger = useCallback(async (page: number) => {
    const ticket = (ledgerTicket.current += 1);
    setLedgerLoading(true);
    setLedgerError(null);
    try {
      const res = (await api.get(
        `/user/transactions?filter=wallet&page=${page}&limit=${PAGE_SIZE}`,
      )) as { data?: WalletLedgerEntry[]; total?: number; hasMore?: boolean };
      if (ledgerTicket.current !== ticket) return;
      const rows = Array.isArray(res?.data) ? res.data : [];
      // Page 1 replaces; later pages append.
      setEntries((current) => (page === 1 ? rows : [...current, ...rows]));
      setTotal(Number(res?.total ?? 0));
      setHasMore(Boolean(res?.hasMore));
    } catch (cause) {
      if (ledgerTicket.current !== ticket) return;
      if (page === 1) setEntries([]);
      setLedgerError(cause instanceof Error ? cause.message : 'Could not load your Points history.');
    } finally {
      if (ledgerTicket.current === ticket) setLedgerLoading(false);
    }
  }, []);

  // Load when the account changes. In practice once per mount, because a change
  // of account remounts the component. Started on a microtask rather than inline:
  // a synchronous setState inside an effect is a cascading render, which the
  // React Compiler flags, and the request still goes out before the first paint.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      await Promise.all([loadSummary(), loadLedger(1)]);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, loadSummary, loadLedger]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    await Promise.all([loadSummary(), loadLedger(1)]);
  }, [userId, loadSummary, loadLedger]);

  const loadMore = useCallback(async () => {
    if (!userId || ledgerLoading || !hasMore) return;
    // Pages are counted from what is already held, so a refresh mid-scroll
    // cannot ask for the same page twice.
    await loadLedger(Math.floor(entries.length / PAGE_SIZE) + 1);
  }, [userId, ledgerLoading, hasMore, entries.length, loadLedger]);

  const value = useMemo<WalletValue>(
    () => ({
      summary,
      loading,
      error,
      entries,
      total,
      hasMore,
      ledgerLoading,
      ledgerError,
      loadMore,
      refresh,
    }),
    [
      summary,
      loading,
      error,
      entries,
      total,
      hasMore,
      ledgerLoading,
      ledgerError,
      loadMore,
      refresh,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

/** Reads the wallet. Throws outside {@link WalletProvider}. */
export function useWallet(): WalletValue {
  const value = useContext(WalletContext);
  if (!value) throw new Error('useWallet must be used inside a WalletProvider');
  return value;
}
