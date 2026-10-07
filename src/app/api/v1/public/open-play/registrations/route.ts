import { NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/middlewares/rate-limiter';
import { openPlayIsClosed, OPEN_PLAY_DATE } from '@/lib/open-play/constants';
import { OpenPlayRegistrationSchema } from '@/lib/open-play/registration';
import { saveOpenPlayRegistration } from '@/lib/open-play/server';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  // Next's internal URL can use localhost even when the incoming Host is a public
  // hostname. Match the actual host too, without accepting an arbitrary origin.
  const url = new URL(request.url);
  const incomingOrigin = `${url.protocol}//${request.headers.get('host') || url.host}`;
  if ((origin && origin !== url.origin && origin !== incomingOrigin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ success: false, error: 'Please register from our website.' }, { status: 403, headers });
  }
  return withRateLimit(request, { limit: 8, windowMs: 15 * 60_000, keyPrefix: 'open-play-registration' }, async req => {
    if (openPlayIsClosed()) return NextResponse.json({ success: false, error: 'Registrations for October 18 have now closed.' }, { status: 410, headers });
    try {
      if (Number(req.headers.get('content-length')) > 6000) return NextResponse.json({ success: false, error: 'Your request is too long.' }, { status: 413, headers });
      const body = await req.text();
      if (body.length > 6000) return NextResponse.json({ success: false, error: 'Your request is too long.' }, { status: 413, headers });
      let input: unknown;
      try { input = JSON.parse(body); } catch { return NextResponse.json({ success: false, error: 'Please submit a valid registration.' }, { status: 400, headers }); }
      const parsed = OpenPlayRegistrationSchema.safeParse(input);
      if (!parsed.success) {
        const fields = Object.fromEntries(parsed.error.issues.map(issue => [issue.path[0], issue.message]));
        return NextResponse.json({ success: false, error: 'Please check the highlighted fields.', fields }, { status: 400, headers });
      }
      const result = await saveOpenPlayRegistration(parsed.data);
      return NextResponse.json({ success: true, ...result, eventDate: OPEN_PLAY_DATE }, { status: result.created ? 201 : 200, headers });
    } catch {
      return NextResponse.json({ success: false, error: 'We couldn’t save your registration. Please try again or call +91 74948 25740.' }, { status: 503, headers });
    }
  });
}