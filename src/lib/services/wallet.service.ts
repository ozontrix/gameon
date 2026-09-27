import { supabaseAdmin } from '../db/supabase';

export type WalletReason =
  | 'refund_credit'
  | 'refund_credit_release'
  | 'booking_redeem'
  | 'booking_redeem_release'
  | 'admin_adjustment'
  | 'referral_signup'
  | 'referral_bonus';

/** A failure the API can report as-is, with the HTTP status that fits it. */
export class WalletError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'WalletError';
  }
}

export type WalletTransaction = {
  id: string;
  points: number;
  balanceAfter: number;
  reason: WalletReason;
  bookingId: string | null;
  createdAt: string;
};

/**
 * GameOn Points. `wallet_transactions` is the ledger of record; `wallets` is
 * a cached read of it. Both are only ever written by the `wallet_adjust`
 * Postgres function — see its migration comment for why that's the one and
 * only writer.
 */
export class WalletService {
  /** 0 for a player who has never earned or spent a point. */
  static async getBalance(userId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data?.balance ?? 0;
  }

  static async getSummary(userId: string): Promise<{ balance: number; totalEarned: number; totalUsed: number }> {
    const [{ data: wallet, error: walletError }, { data: rows, error: txError }] = await Promise.all([
      supabaseAdmin.from('wallets').select('balance').eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('wallet_transactions').select('points').eq('user_id', userId),
    ]);
    if (walletError) throw walletError;
    if (txError) throw txError;

    let totalEarned = 0;
    let totalUsed = 0;
    for (const row of rows ?? []) {
      if (row.points > 0) totalEarned += row.points;
      else totalUsed += -row.points;
    }

    return { balance: wallet?.balance ?? 0, totalEarned, totalUsed };
  }

  static async listTransactions(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ rows: WalletTransaction[]; total: number; hasMore: boolean }> {
    const from = (page - 1) * limit;
    const { data, count, error } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id, points, balance_after, reason, booking_id, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);
    if (error) throw error;

    const rows = (data ?? []).map((row) => ({
      id: row.id,
      points: row.points,
      balanceAfter: row.balance_after,
      reason: row.reason as WalletReason,
      bookingId: row.booking_id,
      createdAt: row.created_at,
    }));

    return { rows, total: count ?? 0, hasMore: from + rows.length < (count ?? 0) };
  }

  /**
   * Credits (`points` > 0) or debits (`points` < 0) `userId`'s wallet.
   * Atomic and race-safe — see `wallet_adjust` — and throws {@link WalletError}
   * (409) rather than the raw Postgres error when a debit would overdraw.
   */
  static async adjust(userId: string, points: number, reason: WalletReason, bookingId?: string): Promise<number> {
    const { data, error } = await supabaseAdmin.rpc('wallet_adjust', {
      p_user_id: userId,
      p_points: points,
      p_reason: reason,
      p_booking_id: bookingId ?? null,
    });
    if (error) {
      if (error.code === '23514' && error.message?.includes('wallets_balance_check')) {
        throw new WalletError('Insufficient wallet balance.', 409);
      }
      throw error;
    }
    return data as number;
  }
}
