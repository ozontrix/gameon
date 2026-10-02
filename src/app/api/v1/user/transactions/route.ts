import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middlewares/auth';
import { TransactionService } from '@/lib/services/transaction.service';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  filter: z.enum(['all', 'booking', 'event', 'tournament', 'refund', 'earned', 'wallet']).default('all'),
});

export async function GET(request: Request) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    const params = new URL(req.url).searchParams;
    const parsed = querySchema.safeParse({
      page: params.get('page') ?? undefined,
      limit: params.get('limit') ?? undefined,
      filter: params.get('filter') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }
    try {
      const { page, limit, filter } = parsed.data;
      const { rows, total, hasMore } = await TransactionService.list(user.id, page, limit, filter);
      return NextResponse.json({ success: true, data: rows, page, total, hasMore }, {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    } catch (error) {
      console.error('Account Transactions Error:', error);
      return NextResponse.json({ success: false, error: 'Could not load your transactions.' }, { status: 500 });
    }
  });
}