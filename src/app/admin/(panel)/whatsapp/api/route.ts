import { NextResponse } from 'next/server';
import { getStaffSession } from '@/lib/admin/session';
import { inboxAccount, inboxContacts, inboxLeague, inboxMessages, InboxError, recordInboxConsent, sendInboxMessage } from '@/lib/whatsapp/inbox';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
function failure(error: unknown) {
  if (error instanceof InboxError) return json({ error: error.message }, error.status);
  console.error('[whatsapp-inbox] request failed');
  return json({ error: 'WhatsApp storage/service unavailable. Verify the inbox migration and server settings. If sending was attempted, inspect history before retrying.' }, 503);
}
export async function GET(request: Request) {
  const actor = await getStaffSession();
  if (actor?.role !== 'ADMIN') return json({ error: 'Admin access required.' }, 403);
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Math.min(100000, Number(params.get('page')) || 1));
  try {
    switch (params.get('op')) {
      case 'account': return json(await inboxAccount());
      case 'league': return json(await inboxLeague(Math.floor(page), params.get('q') ?? ''));
      case 'messages': {
        const phone = params.get('phone') ?? '';
        if (!/^91\d{10}$/.test(phone)) return json({ error: 'Invalid phone number.' }, 400);
        return json(await inboxMessages(phone, params.get('before') ?? undefined));
      }
      default: return json(await inboxContacts(Math.floor(page), params.get('q') ?? ''));
    }
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  const actor = await getStaffSession();
  if (actor?.role !== 'ADMIN') return json({ error: 'Admin access required.' }, 403);
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Same-origin request required.' }, 403);
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 32_000) return json({ error: 'Request too large.' }, 413);
    let data;
    try { data = JSON.parse(raw); } catch { return json({ error: 'Invalid JSON.' }, 400); }
    if (data?.op === 'consent') return json(await recordInboxConsent(data, actor));
    if (data?.op !== 'send') return json({ error: 'Unknown operation.' }, 400);
    return json(await sendInboxMessage(data, actor));
  } catch (error) { return failure(error); }
}