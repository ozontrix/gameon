import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middlewares/auth';
import { ReferralService } from '@/lib/services/referral.service';

/** The caller's own referral code, the current bonus amounts, and their stats. */
export async function GET(request: Request) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (_req, user) => {
    try {
      const summary = await ReferralService.getSummary(user.id);
      return NextResponse.json({ success: true, data: summary });
    } catch (error) {
      console.error('Referral Summary Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
