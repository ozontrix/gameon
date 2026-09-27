import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middlewares/auth';
import { WalletService } from '@/lib/services/wallet.service';

/** The caller's GameOn Points balance and lifetime earn/spend totals. */
export async function GET(request: Request) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (_req, user) => {
    try {
      const summary = await WalletService.getSummary(user.id);
      return NextResponse.json({ success: true, data: summary });
    } catch (error) {
      console.error('Wallet Summary Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
