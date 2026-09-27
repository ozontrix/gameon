import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middlewares/auth';
import { WalletService } from '@/lib/services/wallet.service';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** The caller's Points ledger, newest first — what the Wallet tab's history list reads. */
export async function GET(request: Request) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const parsed = listQuerySchema.safeParse({
        page: searchParams.get('page') ?? undefined,
        limit: searchParams.get('limit') ?? undefined,
      });
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
      }
      const { page, limit } = parsed.data;

      const { rows, total, hasMore } = await WalletService.listTransactions(user.id, page, limit);
      return NextResponse.json({ success: true, data: rows, page, total, hasMore });
    } catch (error) {
      console.error('Wallet Transactions Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
