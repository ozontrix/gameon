import { supabaseAdmin } from '../db/supabase';

export type TransactionFilter = 'all' | 'booking' | 'event' | 'tournament' | 'refund' | 'earned' | 'wallet';

export class TransactionService {
  static async list(userId: string, page: number, limit: number, filter: TransactionFilter) {
    const from = (page - 1) * limit;
    let query = supabaseAdmin
      .from('account_transactions')
      .select('id, category, created_at, title, subtitle, booking_id, amount, currency, points, reason, status, payment_reference, points_used', { count: 'exact' })
      .eq('user_id', userId);
    if (filter !== 'all') query = query.eq('category', filter);
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + limit - 1);
    if (error) throw error;

    const rows = (data ?? []).map((row) => ({
      id: row.id,
      category: row.category,
      createdAt: row.created_at,
      title: row.title,
      subtitle: row.subtitle,
      bookingId: row.booking_id,
      amount: row.amount === null ? null : Number(row.amount),
      currency: row.currency,
      points: row.points,
      reason: row.reason,
      status: row.status,
      paymentReference: row.payment_reference,
      pointsUsed: row.points_used,
    }));
    return { rows, total: count ?? 0, hasMore: from + rows.length < (count ?? 0) };
  }
}