import { NextResponse } from 'next/server';
import { CancellationPolicyService, type CancellationAppliesTo } from '@/lib/services/cancellation-policy.service';

const APPLIES_TO: CancellationAppliesTo[] = ['booking', 'tournament', 'event'];

/** Public, unauthenticated: the refund tiers in force, for the policy table the app shows before a cancellation. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const param = searchParams.get('appliesTo');
    const appliesTo: CancellationAppliesTo = APPLIES_TO.includes(param as CancellationAppliesTo)
      ? (param as CancellationAppliesTo)
      : 'booking';

    const tiers = await CancellationPolicyService.listTiers(appliesTo);
    return NextResponse.json({ success: true, data: tiers });
  } catch (error) {
    console.error('Get Cancellation Policy Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
